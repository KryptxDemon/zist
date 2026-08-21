"""Notification business logic.

The notification system is intentionally simple: write rows, let the frontend
poll for unread count + the most recent N rows. There is no websocket fanout.

Design notes:

* ``create_notification`` never raises. Notification delivery is best-effort:
  a failure to record a notification must not break the user-facing action
  that triggered it (like, comment, friend request accept, …). The caller is
  responsible for committing the surrounding transaction; if the surrounding
  transaction rolls back, the notification row is rolled back with it.

* Recent-window deduplication: for noisy event types (``post_like`` in
  particular) we don't want to create a second notification for the same
  ``(recipient, actor, type, entity)`` within a short window (60 seconds). The
  most recent matching row is just refreshed in place so the user's badge
  count stays accurate.

* No real-time push. The frontend polls ``/notifications/unread-count`` on a
  short interval and refetches the panel on focus.
"""

from __future__ import annotations

from datetime import timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.user import User
from app.utils.time import utcnow


# Window during which a repeat notification for the same logical event is
# merged into the most recent row instead of creating a new one.
_DEDUP_WINDOW = timedelta(seconds=60)

# Notification types that should be deduped against the most recent row.
_DEDUP_TYPES = {"post_like"}


def create_notification(
    db: Session,
    *,
    recipient_id: str,
    type: str,
    actor_id: str | None = None,
    message: str | None = None,
    data: dict[str, Any] | None = None,
) -> Notification | None:
    """Persist a new notification. Never raises.

    Returns the created (or refreshed) notification row, or ``None`` if the
    caller asked us to suppress the event (for example, notifying a user
    about their own action).
    """

    # Don't notify users about their own actions.
    if actor_id is not None and actor_id == recipient_id:
        return None

    try:
        if type in _DEDUP_TYPES and data:
            entity_keys = {
                "post_id",
                "comment_id",
                "friend_request_id",
                "friend_id",
            }
            entity_filters = [
                getattr(Notification, key) == data[key]
                for key in entity_keys
                if key in data
            ]
            if entity_filters:
                cutoff = utcnow() - _DEDUP_WINDOW
                existing = (
                    db.query(Notification)
                    .filter(
                        Notification.recipient_id == recipient_id,
                        Notification.actor_id == actor_id,
                        Notification.type == type,
                        Notification.created_at >= cutoff,
                        *entity_filters,
                    )
                    .order_by(Notification.created_at.desc())
                    .first()
                )
                if existing:
                    existing.message = message or existing.message
                    if data:
                        existing.data = {**(existing.data or {}), **data}
                    existing.read = False
                    existing.created_at = utcnow()
                    db.flush()
                    return existing

        row = Notification(
            recipient_id=recipient_id,
            actor_id=actor_id,
            type=type,
            message=message,
            data=data,
        )
        db.add(row)
        db.flush()
        return row
    except Exception:
        # Best-effort delivery — never break the calling action.
        db.rollback()
        return None


def list_for_user(
    db: Session,
    user_id: str,
    *,
    page: int = 1,
    limit: int = 25,
    unread_only: bool = False,
) -> tuple[list[Notification], int]:
    query = db.query(Notification).filter(Notification.recipient_id == user_id)
    if unread_only:
        query = query.filter(Notification.read.is_(False))

    total = query.count()
    rows = (
        query.order_by(Notification.created_at.desc())
        .offset(max(0, (page - 1) * limit))
        .limit(limit)
        .all()
    )

    actor_ids = {row.actor_id for row in rows if row.actor_id}
    actors: dict[str, User] = {}
    if actor_ids:
        actors = {
            user.id: user
            for user in db.query(User).filter(User.id.in_(actor_ids)).all()
        }
    for row in rows:
        if row.actor_id:
            row.actor = actors.get(row.actor_id)

    return rows, total


def unread_count(db: Session, user_id: str) -> int:
    return (
        db.query(Notification)
        .filter(
            Notification.recipient_id == user_id,
            Notification.read.is_(False),
        )
        .count()
    )


def mark_read(db: Session, user_id: str, notification_id: str) -> Notification | None:
    row = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.recipient_id == user_id,
        )
        .first()
    )
    if not row:
        return None
    row.read = True
    db.flush()
    return row


def mark_all_read(db: Session, user_id: str) -> int:
    rows = (
        db.query(Notification)
        .filter(
            Notification.recipient_id == user_id,
            Notification.read.is_(False),
        )
        .all()
    )
    for row in rows:
        row.read = True
    db.flush()
    return len(rows)


def delete_notification(db: Session, user_id: str, notification_id: str) -> bool:
    row = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.recipient_id == user_id,
        )
        .first()
    )
    if not row:
        return False
    db.delete(row)
    db.flush()
    return True