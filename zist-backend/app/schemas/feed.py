from datetime import datetime
from typing import Any

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
    comments_count: int = 0
    content: dict[str, Any] | None = None
    media_title: str | None = None


class FeedListResponse(BaseModel):
    items: list[FeedPostResponse]
    total: int
    page: int
    limit: int


class FeedToggleResponse(BaseModel):
    message: str
    active: bool
    count: int = Field(default=0)


class FeedCommentCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=2000)


class FeedCommentResponse(BaseModel):
    id: str
    post_id: str
    user_id: str
    body: str
    created_at: datetime
    author_name: str
    author_avatar: str | None = None


class FeedCommentListResponse(BaseModel):
    items: list[FeedCommentResponse]
    total: int


class ShareableContentItem(BaseModel):
    id: str
    media_id: str
    media_title: str
    label: str
    post_type: FeedPostType


class ShareableContentResponse(BaseModel):
    themes: list[ShareableContentItem]
    vocab: list[ShareableContentItem]
    quotes: list[ShareableContentItem]
