from datetime import datetime

from pydantic import BaseModel, Field

from app.utils.enums import FeedPostType, FeedVisibility


class FeedPostCreate(BaseModel):
    post_type: FeedPostType
    content_id: str
    caption: str | None = None
    visibility: FeedVisibility = FeedVisibility.global_


class FeedPostResponse(BaseModel):
    id: str
    user_id: str
    post_type: FeedPostType
    content_id: str
    caption: str | None = None
    visibility: FeedVisibility
    created_at: datetime
    updated_at: datetime
    author_name: str
    author_avatar: str | None = None
    likes_count: int = 0
    is_liked: bool = False
    is_saved: bool = False


class FeedListResponse(BaseModel):
    items: list[FeedPostResponse]
    total: int
    page: int
    limit: int


class FeedToggleResponse(BaseModel):
    message: str
    active: bool
    count: int = Field(default=0)
