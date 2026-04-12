from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, model_validator


class VocabBase(BaseModel):
    word: str = Field(..., min_length=1, max_length=200)
    part_of_speech: str | None = None
    definition: str | None = None
    example_sentence: str | None = None
    where_found: str | None = None
    tags: list[str] = Field(default_factory=list)
    user_sentence: str | None = None
    memory_tip: str | None = None
    is_learned: bool = False


class VocabCreate(VocabBase):
    pass


class VocabUpdate(BaseModel):
    word: str | None = None
    part_of_speech: str | None = None
    definition: str | None = None
    example_sentence: str | None = None
    where_found: str | None = None
    tags: list[str] | None = None
    user_sentence: str | None = None
    memory_tip: str | None = None
    is_learned: bool | None = None


class VocabResponse(VocabBase):
    id: str
    media_id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def normalize_tags(cls, value: Any):
        if isinstance(value, dict):
            tags = value.get("tags")
            if tags is None:
                value["tags"] = []
                return value
            if isinstance(tags, str):
                value["tags"] = [tag.strip() for tag in tags.split(",") if tag.strip()]
            return value
        tags = getattr(value, "tags", None)
        if tags is None:
            value.tags = []
            return value
        if isinstance(tags, str):
            value.tags = [tag.strip() for tag in tags.split(",") if tag.strip()]
        return value


class VocabListResponse(BaseModel):
    items: list[VocabResponse]
    total: int
    page: int | None = None
    limit: int | None = None
