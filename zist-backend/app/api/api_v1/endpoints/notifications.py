"""Notification HTTP endpoints.

The frontend polls ``GET /notifications/unread-count`` to drive the bell badge
and ``GET /notifications`` to populate the dropdown / dedicated page.

Routes:

* ``GET    /notifications``            — paginated list for the current user
* ``GET    /notifications/unread-count``— integer count for the badge
* ``POST   /notifications/{id}/read``  — mark one notification as read
* ``POST   /notifications/read-all``   — mark every unread notification as read
* ``DELETE /notifications/{id}``       — delete one notification
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.notification import (
    NotificationListResponse,
    NotificationMessageResponse,
    NotificationUnreadCount,
)
from app.services import notification_service

router = APIRouter()


@router.get("/notifications", response_model=NotificationListResponse)
def list_notifications(
    page: int = 1,
    limit: int = 25,
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    page = max(1, page)
    limit = max(1, min(limit, 100))
    rows, total = notification_service.list_for_user(
        db,
        current_user.id,
        page=page,
        limit=limit,
        unread_only=unread_only,
    )
    return NotificationListResponse(items=rows, total=total, page=page, limit=limit)


@router.get("/notifications/unread-count", response_model=NotificationUnreadCount)
def unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = notification_service.unread_count(db, current_user.id)
    return NotificationUnreadCount(count=count)


@router.post("/notifications/{notification_id}/read", response_model=NotificationMessageResponse)
def mark_notification_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = notification_service.mark_read(db, current_user.id, notification_id)
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )
    db.commit()
    return NotificationMessageResponse(message="Notification marked as read")


@router.post("/notifications/read-all", response_model=NotificationMessageResponse)
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    updated = notification_service.mark_all_read(db, current_user.id)
    db.commit()
    return NotificationMessageResponse(message=f"Marked {updated} notifications as read")


@router.delete("/notifications/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notification(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deleted = notification_service.delete_notification(
        db, current_user.id, notification_id
    )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )
    db.commit()
    return None