"""Notification data model.

A notification is a short message rendered to a specific user in response to
something another user did (sent a friend request, accepted a friend request,
liked or commented on a feed post, …). Notifications are intentionally
generic: ``type`` discriminates the event class and ``data`` carries any
structured payload the frontend needs to render a rich link.

Notifications are not delivered in real time over a websocket. The frontend
polls ``/notifications/unread-count`` (and ``/notifications``) on an interval.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.utils.time import utcnow


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        Index(
            "ix_notifications_recipient_created",
            "recipient_id",
            "created_at",
        ),
    )

    id: Mapped[str] = mapped_column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )

    # The user who **receives** this notification. Indexes target this column
    # because every query is "show me MY recent notifications".
    recipient_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # The user who **triggered** this notification. ``None`` is allowed for
    # system-generated events (for example, a future digest).
    actor_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # Event discriminator, e.g. ``friend_request``, ``friend_accepted``,
    # ``post_like``, ``post_comment``.
    type: Mapped[str] = mapped_column(String, nullable=False)

    # Free-text short summary for clients that don't customise rendering.
    message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Optional structured payload (post_id, friend_request_id, comment_id, …).
    # Stored as JSONB on Postgres, plain TEXT on SQLite (for tests).
    data: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, index=True
    )

    actor = relationship(
        "User",
        foreign_keys=[actor_id],
    )