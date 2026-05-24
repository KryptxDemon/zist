from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    id: str
    email: EmailStr
    display_name: str
    first_name: str | None = None
    last_name: str | None = None
    avatar_url: str | None = None
    bio: str | None = None
    website_url: str | None = None
    instagram_url: str | None = None
    x_url: str | None = None
    github_url: str | None = None
    linkedin_url: str | None = None
    youtube_url: str | None = None
    is_active: bool
    created_at: datetime
    email_verified: bool = False

    model_config = {
        "from_attributes": True
    }


class UserPublic(BaseModel):
    id: str
    display_name: str
    first_name: str | None = None
    last_name: str | None = None
    avatar_url: str | None = None
    bio: str | None = None
    website_url: str | None = None
    instagram_url: str | None = None
    x_url: str | None = None
    github_url: str | None = None
    linkedin_url: str | None = None
    youtube_url: str | None = None
    is_active: bool
    created_at: datetime
    email_verified: bool = False
    followers_count: int = 0
    following_count: int = 0
    media_count: int = 0

    model_config = {
        "from_attributes": True
    }


class UserUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=2, max_length=100)
    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    avatar_url: str | None = None
    bio: str | None = Field(default=None, max_length=500)
    website_url: str | None = Field(default=None, max_length=255)
    instagram_url: str | None = Field(default=None, max_length=255)
    x_url: str | None = Field(default=None, max_length=255)
    github_url: str | None = Field(default=None, max_length=255)
    linkedin_url: str | None = Field(default=None, max_length=255)
    youtube_url: str | None = Field(default=None, max_length=255)


class FollowResponse(BaseModel):
    message: str
    follower_id: str
    following_id: str


class UserListResponse(BaseModel):
    items: list[UserPublic]
    total: int
    page: int
    limit: int