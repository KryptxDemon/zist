from datetime import datetime
from pydantic import BaseModel, Field, field_validator

from app.utils.enums import MediaStatus, MediaType


# ---------- Base ----------

class MediaBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    type: MediaType
    year: int | None = None
    creator: str | None = None
    description: str | None = None
    cover_url: str | None = None
    tags: list[str] = Field(default_factory=list)
    external_source: str | None = None
    external_id: str | None = None
    status: MediaStatus = MediaStatus.planned
    rating: int | None = Field(default=None, ge=1, le=10)

    @field_validator("tags", mode="before")
    @classmethod
    def normalize_tags(cls, value):
        if value is None:
            return []
        if isinstance(value, str):
            return [tag.strip() for tag in value.split(",") if tag.strip()]
        return [str(tag).strip() for tag in value if str(tag).strip()]


# ---------- Create ----------

class MediaCreate(MediaBase):
    pass


# ---------- Update ----------

class MediaUpdate(BaseModel):
    title: str | None = None
    type: MediaType | None = None
    year: int | None = None
    creator: str | None = None
    description: str | None = None
    cover_url: str | None = None
    tags: list[str] | None = None
    status: MediaStatus | None = None
    rating: int | None = Field(default=None, ge=1, le=10)


# ---------- Response ----------

class MediaResponse(MediaBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True
    }


# ---------- List (pagination) ----------

class MediaListResponse(BaseModel):
    items: list[MediaResponse]
    total: int
    page: int
    limit: int