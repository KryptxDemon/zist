from datetime import datetime

from pydantic import BaseModel, Field


class QuoteBase(BaseModel):
    text: str = Field(..., min_length=1)
    speaker: str | None = None
    reference: str | None = None
    related_theme_id: str | None = None
    user_meaning: str | None = None
    ai_meaning: str | None = None
    is_bookmarked: bool = False


class QuoteCreate(QuoteBase):
    pass


class QuoteUpdate(BaseModel):
    text: str | None = None
    speaker: str | None = None
    reference: str | None = None
    related_theme_id: str | None = None
    user_meaning: str | None = None
    ai_meaning: str | None = None
    is_bookmarked: bool | None = None


class QuoteResponse(QuoteBase):
    id: str
    media_id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class QuoteListResponse(BaseModel):
    items: list[QuoteResponse]
    total: int
