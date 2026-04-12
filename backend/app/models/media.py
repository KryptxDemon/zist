import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class MediaItem(Base):
    __tablename__ = "media_items"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(String, nullable=False)

    type: Mapped[str] = mapped_column(
        String, nullable=False
    )  # movie | tv | book | documentary | podcast | game

    year: Mapped[int | None] = mapped_column(nullable=True)

    creator: Mapped[str | None] = mapped_column(String, nullable=True)

    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    cover_url: Mapped[str | None] = mapped_column(String, nullable=True)

    external_source: Mapped[str | None] = mapped_column(String, nullable=True)
    external_id: Mapped[str | None] = mapped_column(String, nullable=True)

    status: Mapped[str] = mapped_column(
        String, default="planned"
    )  # planned | in-progress | completed

    rating: Mapped[int | None] = mapped_column(nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    user = relationship("User", back_populates="media_items")

    themes = relationship(
        "ThemeConcept",
        back_populates="media",
        cascade="all, delete-orphan",
    )

    facts = relationship(
        "FactItem",
        back_populates="media",
        cascade="all, delete-orphan",
    )

    vocab_items = relationship(
        "VocabItem",
        back_populates="media",
        cascade="all, delete-orphan",
    )

    quotes = relationship(
        "QuoteItem",
        back_populates="media",
        cascade="all, delete-orphan",
    )

    quiz_attempts = relationship(
        "QuizAttempt",
        back_populates="media",
        cascade="all, delete-orphan",
    )