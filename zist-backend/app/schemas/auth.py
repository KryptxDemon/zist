from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    display_name: str = Field(..., min_length=2, max_length=100)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class AuthUserResponse(BaseModel):
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

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    user: AuthUserResponse
    tokens: TokenResponse


class DisplayNameAvailabilityResponse(BaseModel):
    display_name: str
    available: bool
    suggestions: list[str] = []


class GoogleAuthStartResponse(BaseModel):
    auth_url: str