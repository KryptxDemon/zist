"""Friend request HTTP endpoints.

Routes:

* ``POST /friends/requests``              — send a friend request
* ``GET  /friends/requests``              — list incoming + outgoing pending requests
* ``POST /friends/requests/{id}/accept``  — recipient accepts
* ``POST /friends/requests/{id}/decline`` — recipient declines
* ``POST /friends/requests/{id}/cancel``  — requester cancels
* ``DELETE /friends/{user_id}``           — unfriend an existing friend
* ``GET  /friends``                       — list the current user's mutual friends
* ``GET  /friends/relationship/{user_id}`` — describe relationship to another user
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.friend import (
    FriendListResponse,
    FriendMessageResponse,
    FriendRequestCreate,
    FriendRequestListResponse,
    FriendRequestRead,
    FriendRequestUser,
)
from app.services import friend_service

router = APIRouter()


@router.post("/friends/requests", response_model=FriendRequestRead, status_code=status.HTTP_201_CREATED)
def send_friend_request(
    payload: FriendRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return friend_service.send_request(db, current_user, payload.recipient_id)


@router.get("/friends/requests", response_model=FriendRequestListResponse)
def list_friend_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    incoming = friend_service.list_incoming(db, current_user.id)
    outgoing = friend_service.list_outgoing(db, current_user.id)
    items = incoming + outgoing
    return FriendRequestListResponse(items=items, total=len(items))


@router.get("/friends/requests/incoming", response_model=FriendRequestListResponse)
def list_incoming_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = friend_service.list_incoming(db, current_user.id)
    return FriendRequestListResponse(items=items, total=len(items))


@router.get("/friends/requests/outgoing", response_model=FriendRequestListResponse)
def list_outgoing_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = friend_service.list_outgoing(db, current_user.id)
    return FriendRequestListResponse(items=items, total=len(items))


@router.post("/friends/requests/{request_id}/accept", response_model=FriendRequestRead)
def accept_friend_request(
    request_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return friend_service.accept_request(db, request_id, current_user)


@router.post("/friends/requests/{request_id}/decline", response_model=FriendRequestRead)
def decline_friend_request(
    request_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return friend_service.decline_request(db, request_id, current_user)


@router.post("/friends/requests/{request_id}/cancel", response_model=FriendRequestRead)
def cancel_friend_request(
    request_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return friend_service.cancel_request(db, request_id, current_user)


@router.delete("/friends/{user_id}", response_model=FriendMessageResponse)
def unfriend(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    friend_service.unfriend(db, current_user, user_id)
    return FriendMessageResponse(message="Friend removed")


@router.get("/friends", response_model=FriendListResponse)
def list_friends(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    users = friend_service.list_friends(db, current_user.id)
    items = [
        FriendRequestUser(
            id=u.id, display_name=u.display_name, avatar_url=u.avatar_url
        )
        for u in users
    ]
    return FriendListResponse(items=items, total=len(items))


@router.get("/friends/relationship/{user_id}")
def relationship_with(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    other = (
        db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first()
    )
    if not other:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return friend_service.get_relationship(db, current_user.id, user_id)