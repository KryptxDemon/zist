from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    id: str
    email: EmailStr
    display_name: str
    avatar_url: str | None = None
    bio: str | None = None
    is_active: bool
    created_at: datetime

    model_config = {
        "from_attributes": True
    }


class UserPublic(BaseModel):
    id: str
    display_name: str
    avatar_url: str | None = None
    bio: str | None = None
    is_active: bool
    created_at: datetime
    followers_count: int = 0
    following_count: int = 0
    media_count: int = 0

    model_config = {
        "from_attributes": True
    }


class UserUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=2, max_length=100)
    avatar_url: str | None = None
    bio: str | None = Field(default=None, max_length=500)


class FollowResponse(BaseModel):
    message: str
    follower_id: str
    following_id: str


class UserListResponse(BaseModel):
    items: list[UserPublic]
    total: int
    page: int
    limit: int