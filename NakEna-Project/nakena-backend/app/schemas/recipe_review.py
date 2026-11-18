from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class RecipeReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: str | None = Field(default=None, max_length=1000)

    @field_validator("comment")
    @classmethod
    def normalize_comment(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None


class RecipeReviewRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    recipe_entry_id: str
    rating: int
    comment: str | None
    created_at: datetime
    updated_at: datetime
