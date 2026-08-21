"""Friend request data model.

A friend request represents an explicit invitation from one user to another
that must be accepted before the two users become mutual friends. This sits
alongside the simpler one-way ``UserFollow`` model which is used for the
follow graph in the feed.

States:

* ``pending`` — created by ``requester_id``, awaiting action by ``recipient_id``
* ``accepted`` — recipient has approved the request; both users are friends
* ``declined`` — recipient has rejected the request (terminal)
* ``cancelled`` — requester has rescinded their own request (terminal)

Only one row per ``(requester_id, recipient_id)`` pair is allowed while the
request is in flight (status = pending). Accepting or declining removes the
pending row, so a fresh request can be sent later.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.utils.time import utcnow


class FriendRequest(Base):
    __tablename__ = "friend_requests"
    __table_args__ = (
        UniqueConstraint(
            "requester_id",
            "recipient_id",
            name="uq_friend_request_pair",
        ),
    )

    id: Mapped[str] = mapped_column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )

    requester_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    recipient_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    status: Mapped[str] = mapped_column(
        String, nullable=False, default="pending"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )

    responded_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    requester = relationship(
        "User",
        foreign_keys=[requester_id],
    )

    recipient = relationship(
        "User",
        foreign_keys=[recipient_id],
    )