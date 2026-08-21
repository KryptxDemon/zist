"""Pydantic schemas for the friend-request system."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel


FriendRequestStatus = Literal["pending", "accepted", "declined", "cancelled"]


class FriendRequestCreate(BaseModel):
    """Body for ``POST /friends/requests``."""

    recipient_id: str


class FriendRequestUser(BaseModel):
    """Lightweight user shape embedded inside a friend request."""

    id: str
    display_name: str
    avatar_url: str | None = None

    model_config = {"from_attributes": True}


class FriendRequestRead(BaseModel):
    """A friend request with both parties attached for the UI."""

    id: str
    requester_id: str
    recipient_id: str
    status: FriendRequestStatus
    created_at: datetime
    responded_at: datetime | None = None
    requester: FriendRequestUser | None = None
    recipient: FriendRequestUser | None = None

    model_config = {"from_attributes": True}


class FriendRequestListResponse(BaseModel):
    items: list[FriendRequestRead]
    total: int


class FriendListResponse(BaseModel):
    """List of mutual friends (users who have an accepted friend request)."""

    items: list[FriendRequestUser]
    total: int


class FriendMessageResponse(BaseModel):
    message: str
    request_id: str | None = None