from datetime import datetime

from pydantic import BaseModel, Field


class ThemeBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    summary: str | None = None
    source_name: str | None = None
    source_url: str | None = None
    user_understanding: str | None = None
    saved_for_later: bool = False


class ThemeCreate(ThemeBase):
    pass


class ThemeUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    summary: str | None = None
    source_name: str | None = None
    source_url: str | None = None
    user_understanding: str | None = None
    saved_for_later: bool | None = None


class ThemeResponse(ThemeBase):
    id: str
    media_id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ThemeListResponse(BaseModel):
    items: list[ThemeResponse]
    total: int


class TopThemeMediaResponse(BaseModel):
    id: str
    title: str
    type: str
    cover_url: str | None = None

    model_config = {"from_attributes": True}


class TopThemeResponse(BaseModel):
    title: str
    count: int
    latest_created_at: datetime
    summary: str | None = None
    media: TopThemeMediaResponse


class TopThemeListResponse(BaseModel):
    items: list[TopThemeResponse]
    total: int
