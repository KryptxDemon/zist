import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class VocabItem(Base):
    __tablename__ = "vocab_items"

    id: Mapped[str] = mapped_column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    media_id: Mapped[str] = mapped_column(
        ForeignKey("media_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    word: Mapped[str] = mapped_column(String, nullable=False, index=True)
    part_of_speech: Mapped[str | None] = mapped_column(String, nullable=True)
    definition: Mapped[str | None] = mapped_column(Text, nullable=True)
    example_sentence: Mapped[str | None] = mapped_column(Text, nullable=True)
    where_found: Mapped[str | None] = mapped_column(String, nullable=True)
    tags: Mapped[str | None] = mapped_column(Text, nullable=True)
    user_sentence: Mapped[str | None] = mapped_column(Text, nullable=True)
    memory_tip: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_learned: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    media = relationship("MediaItem", back_populates="vocab_items")
