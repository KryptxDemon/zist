"""Friend request business logic.

The friend-request system is intentionally distinct from the simpler one-way
``UserFollow`` model that powers the feed's visibility filter:

* ``UserFollow`` is a unilateral action: ``A`` follows ``B``, ``B`` may or may
  not follow ``A`` back.
* ``FriendRequest`` is a bilateral action: ``A`` invites ``B``, ``B`` must
  accept for them to become mutual friends.

Both can coexist. Existing code that uses ``UserFollow`` continues to work
unchanged.

State machine:

    pending  --(recipient accepts)-->  accepted
    pending  --(recipient declines)-> declined   (terminal)
    pending  --(requester cancels)-->  cancelled (terminal)
    accepted --(either party removes)-> (row deleted, no longer friends)

Only one ``pending`` row is allowed per ``(requester_id, recipient_id)`` pair
because of the database-level unique constraint. Accepting/declining/cancelling
deletes the row, which frees the pair to send a fresh request later.
"""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.friend import FriendRequest
from app.models.user import User
from app.services import notification_service


def _get_active_request(
    db: Session, requester_id: str, recipient_id: str
) -> FriendRequest | None:
    return (
        db.query(FriendRequest)
        .filter(
            FriendRequest.requester_id == requester_id,
            FriendRequest.recipient_id == recipient_id,
            FriendRequest.status == "pending",
        )
        .first()
    )


def _attach_users(db: Session, request: FriendRequest) -> FriendRequest:
    """Ensure ``requester`` / ``recipient`` relationships are populated.

    Calling code is expected to access these attributes for response shaping.
    """

    if request.requester_id:
        request.requester = (
            db.query(User).filter(User.id == request.requester_id).first()
        )
    if request.recipient_id:
        request.recipient = (
            db.query(User).filter(User.id == request.recipient_id).first()
        )
    return request


def send_request(db: Session, requester: User, recipient_id: str) -> FriendRequest:
    """Create a new pending friend request."""

    if recipient_id == requester.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot send a friend request to yourself",
        )

    recipient = (
        db.query(User)
        .filter(User.id == recipient_id, User.is_active.is_(True))
        .first()
    )
    if not recipient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipient not found",
        )

    # Reverse direction check (recipient already requested us) — accept the
    # existing request implicitly rather than creating a duplicate pair.
    reverse = _get_active_request(db, recipient_id, requester.id)
    if reverse:
        # Treat the existing incoming request as auto-accepted on response.
        reverse.status = "accepted"
        from app.utils.time import utcnow

        reverse.responded_at = utcnow()
        db.flush()
        notification_service.create_notification(
            db,
            recipient_id=requester.id,
            actor_id=recipient.id,
            type="friend_accepted",
            message=f"{recipient.display_name} accepted your friend request",
            data={
                "friend_id": recipient.id,
                "friend_request_id": reverse.id,
            },
        )
        db.commit()
        db.refresh(reverse)
        return _attach_users(db, reverse)

    existing = _get_active_request(db, requester.id, recipient_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Friend request already pending",
        )

    # Already friends? Check for any accepted request between the two users.
    already_friends = (
        db.query(FriendRequest)
        .filter(
            FriendRequest.status == "accepted",
            or_(
                (FriendRequest.requester_id == requester.id)
                & (FriendRequest.recipient_id == recipient_id),
                (FriendRequest.requester_id == recipient_id)
                & (FriendRequest.recipient_id == requester.id),
            ),
        )
        .first()
    )
    if already_friends:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You are already friends with this user",
        )

    request = FriendRequest(
        requester_id=requester.id,
        recipient_id=recipient_id,
        status="pending",
    )
    db.add(request)
    db.flush()

    notification_service.create_notification(
        db,
        recipient_id=recipient_id,
        actor_id=requester.id,
        type="friend_request",
        message=f"{requester.display_name} sent you a friend request",
        data={
            "friend_request_id": request.id,
            "requester_id": requester.id,
        },
    )

    db.commit()
    db.refresh(request)
    return _attach_users(db, request)


def accept_request(
    db: Session, request_id: str, current_user: User
) -> FriendRequest:
    request = db.query(FriendRequest).filter(FriendRequest.id == request_id).first()
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Friend request not found"
        )
    if request.recipient_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the recipient can accept this request",
        )
    if request.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Request is already {request.status}",
        )

    from app.utils.time import utcnow

    request.status = "accepted"
    request.responded_at = utcnow()

    notification_service.create_notification(
        db,
        recipient_id=request.requester_id,
        actor_id=current_user.id,
        type="friend_accepted",
        message=f"{current_user.display_name} accepted your friend request",
        data={
            "friend_id": current_user.id,
            "friend_request_id": request.id,
        },
    )

    db.commit()
    db.refresh(request)
    return _attach_users(db, request)


def decline_request(
    db: Session, request_id: str, current_user: User
) -> FriendRequest:
    request = db.query(FriendRequest).filter(FriendRequest.id == request_id).first()
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Friend request not found"
        )
    if request.recipient_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the recipient can decline this request",
        )
    if request.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Request is already {request.status}",
        )

    from app.utils.time import utcnow

    request.status = "declined"
    request.responded_at = utcnow()
    db.commit()
    db.refresh(request)
    return _attach_users(db, request)


def cancel_request(
    db: Session, request_id: str, current_user: User
) -> FriendRequest:
    request = db.query(FriendRequest).filter(FriendRequest.id == request_id).first()
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Friend request not found"
        )
    if request.requester_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the requester can cancel this request",
        )
    if request.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Request is already {request.status}",
        )

    from app.utils.time import utcnow

    request.status = "cancelled"
    request.responded_at = utcnow()
    db.commit()
    db.refresh(request)
    return _attach_users(db, request)


def unfriend(db: Session, current_user: User, other_user_id: str) -> None:
    """Remove an accepted friendship in either direction."""

    if other_user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot unfriend yourself",
        )

    accepted = (
        db.query(FriendRequest)
        .filter(
            FriendRequest.status == "accepted",
            or_(
                (FriendRequest.requester_id == current_user.id)
                & (FriendRequest.recipient_id == other_user_id),
                (FriendRequest.requester_id == other_user_id)
                & (FriendRequest.recipient_id == current_user.id),
            ),
        )
        .first()
    )
    if not accepted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not friends with this user",
        )
    db.delete(accepted)
    db.commit()


def list_incoming(db: Session, user_id: str) -> list[FriendRequest]:
    rows = (
        db.query(FriendRequest)
        .filter(
            FriendRequest.recipient_id == user_id,
            FriendRequest.status == "pending",
        )
        .order_by(FriendRequest.created_at.desc())
        .all()
    )
    for row in rows:
        _attach_users(db, row)
    return rows


def list_outgoing(db: Session, user_id: str) -> list[FriendRequest]:
    rows = (
        db.query(FriendRequest)
        .filter(
            FriendRequest.requester_id == user_id,
            FriendRequest.status == "pending",
        )
        .order_by(FriendRequest.created_at.desc())
        .all()
    )
    for row in rows:
        _attach_users(db, row)
    return rows


def list_friends(db: Session, user_id: str) -> list[User]:
    """Return every user ``user_id`` is currently mutual friends with."""

    accepted = (
        db.query(FriendRequest)
        .filter(FriendRequest.status == "accepted")
        .filter(
            or_(
                FriendRequest.requester_id == user_id,
                FriendRequest.recipient_id == user_id,
            )
        )
        .all()
    )

    friend_ids: set[str] = set()
    for row in accepted:
        other = (
            row.recipient_id
            if row.requester_id == user_id
            else row.requester_id
        )
        friend_ids.add(other)

    if not friend_ids:
        return []

    return (
        db.query(User)
        .filter(User.id.in_(friend_ids), User.is_active.is_(True))
        .order_by(User.display_name.asc())
        .all()
    )


def get_relationship(
    db: Session, current_user_id: str, other_user_id: str
) -> dict:
    """Return a small dictionary describing how the two users relate.

    Shape::

        {
            "state": "none" | "outgoing_pending" | "incoming_pending" | "friends",
            "request_id": str | None,
            "requester_id": str | None,
            "recipient_id": str | None,
        }
    """

    if current_user_id == other_user_id:
        return {
            "state": "self",
            "request_id": None,
            "requester_id": None,
            "recipient_id": None,
        }

    pending = (
        db.query(FriendRequest)
        .filter(
            FriendRequest.status == "pending",
            or_(
                (FriendRequest.requester_id == current_user_id)
                & (FriendRequest.recipient_id == other_user_id),
                (FriendRequest.requester_id == other_user_id)
                & (FriendRequest.recipient_id == current_user_id),
            ),
        )
        .first()
    )
    if pending:
        if pending.requester_id == current_user_id:
            return {
                "state": "outgoing_pending",
                "request_id": pending.id,
                "requester_id": pending.requester_id,
                "recipient_id": pending.recipient_id,
            }
        return {
            "state": "incoming_pending",
            "request_id": pending.id,
            "requester_id": pending.requester_id,
            "recipient_id": pending.recipient_id,
        }

    accepted = (
        db.query(FriendRequest)
        .filter(
            FriendRequest.status == "accepted",
            or_(
                (FriendRequest.requester_id == current_user_id)
                & (FriendRequest.recipient_id == other_user_id),
                (FriendRequest.requester_id == other_user_id)
                & (FriendRequest.recipient_id == current_user_id),
            ),
        )
        .first()
    )
    if accepted:
        return {
            "state": "friends",
            "request_id": accepted.id,
            "requester_id": accepted.requester_id,
            "recipient_id": accepted.recipient_id,
        }

    return {
        "state": "none",
        "request_id": None,
        "requester_id": None,
        "recipient_id": None,
    }