from datetime import datetime

from pydantic import BaseModel, Field

from app.utils.enums import FactCategory


class FactBase(BaseModel):
    category: FactCategory
    content: str = Field(..., min_length=1)
    source_name: str | None = None
    source_url: str | None = None
    display_order: int = 0


class FactCreate(FactBase):
    pass


class FactUpdate(BaseModel):
    category: FactCategory | None = None
    content: str | None = None
    source_name: str | None = None
    source_url: str | None = None
    display_order: int | None = None


class FactResponse(FactBase):
    id: str
    media_id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FactListResponse(BaseModel):
    items: list[FactResponse]
    total: int
