import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.utils.time import utcnow


class AICache(Base):
    __tablename__ = "ai_cache"

    id: Mapped[str] = mapped_column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )

    # Deterministic lookup key, e.g.:
    # "themes:tmdb:157336" or "themes:title:interstellar:2014"
    cache_key: Mapped[str] = mapped_column(
        String,
        unique=True,
        index=True,
        nullable=False,
    )

    media_title: Mapped[str] = mapped_column(String, index=True, nullable=False)
    external_id: Mapped[str | None] = mapped_column(String, index=True, nullable=True)
    content_type: Mapped[str] = mapped_column(String, default="movie")

    # JSON-encoded payload of generated items, e.g. [{"title": ..., "summary": ...}]
    data: Mapped[str] = mapped_column(Text, nullable=False)

    model_used: Mapped[str | None] = mapped_column(String, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        onupdate=utcnow,
    )
