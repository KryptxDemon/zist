import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.utils.time import utcnow


class ThemeConcept(Base):
    __tablename__ = "theme_concepts"

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

    title: Mapped[str] = mapped_column(String, nullable=False, index=True)

    summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    source_name: Mapped[str | None] = mapped_column(String, nullable=True)
    source_url: Mapped[str | None] = mapped_column(String, nullable=True)

    user_understanding: Mapped[str | None] = mapped_column(Text, nullable=True)

    saved_for_later: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        onupdate=utcnow,
    )

    # Relationships
    media = relationship("MediaItem", back_populates="themes")