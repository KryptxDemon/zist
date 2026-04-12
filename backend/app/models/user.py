import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

class UserFollow(Base):
    __tablename__ = "user_follows"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    follower_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE")
    )

    following_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE")
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )

    follower = relationship(
        "User",
        foreign_keys=[follower_id],
        back_populates="following",
    )

    following = relationship(
        "User",
        foreign_keys=[following_id],
        back_populates="followers",
    )


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )

    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)

    hashed_password: Mapped[str] = mapped_column(String, nullable=False)

    display_name: Mapped[str] = mapped_column(String, nullable=False)

    avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)

    bio: Mapped[str | None] = mapped_column(String, nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    media_items = relationship("MediaItem", back_populates="user", cascade="all, delete")
    posts = relationship("FeedPost", back_populates="user", cascade="all, delete")
    quiz_attempts = relationship("QuizAttempt", back_populates="user", cascade="all, delete")

    followers = relationship(
        "UserFollow",
        foreign_keys="[UserFollow.following_id]",
        back_populates="following",
        cascade="all, delete",
    )

    following = relationship(
        "UserFollow",
        foreign_keys="[UserFollow.follower_id]",
        back_populates="follower",
        cascade="all, delete",
    )

