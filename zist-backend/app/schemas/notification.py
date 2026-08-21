"""Pydantic schemas for the notification system."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel


NotificationType = Literal[
    "friend_request",
    "friend_accepted",
    "post_like",
    "post_comment",
]


class NotificationActor(BaseModel):
    """Lightweight actor shape embedded in a notification."""

    id: str
    display_name: str
    avatar_url: str | None = None

    model_config = {"from_attributes": True}


class NotificationRead(BaseModel):
    id: str
    type: NotificationType
    message: str | None = None
    data: dict | None = None
    read: bool
    created_at: datetime
    actor: NotificationActor | None = None

    model_config = {"from_attributes": True}


class NotificationListResponse(BaseModel):
    items: list[NotificationRead]
    total: int
    page: int
    limit: int


class NotificationUnreadCount(BaseModel):
    count: int


class NotificationMessageResponse(BaseModel):
    message: str