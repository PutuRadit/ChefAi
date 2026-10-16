from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

Difficulty = Literal["easy", "medium", "hard"]  # frontend: Mudah / Menengah / Sulit

MAX_ITEMS = 30
MAX_ITEM_LEN = 50


def _normalize_list(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for raw in values:
        item = raw.strip().lower()
        if not item:
            continue
        if len(item) > MAX_ITEM_LEN:
            raise ValueError(f"Setiap item maksimal {MAX_ITEM_LEN} karakter")
        if item not in seen:
            seen.add(item)
            result.append(item)
    return result


def _normalize_text(v: str | None) -> str | None:
    if v is None:
        return None
    v = v.strip().lower()
    return v or None


class PreferenceIn(BaseModel):
    """Dipakai untuk PUT (ganti semua) dan PATCH (hanya field yang dikirim)."""

    diet: str | None = Field(default=None, max_length=50)
    allergies: list[str] = Field(default_factory=list, max_length=MAX_ITEMS)
    staple_ingredients: list[str] = Field(default_factory=list, max_length=MAX_ITEMS)
    default_max_cook_minutes: int | None = Field(default=None, ge=5, le=600)
    default_difficulty: Difficulty | None = None
    default_servings: int | None = Field(default=None, ge=1, le=20)
    preferred_cuisine: str | None = Field(default=None, max_length=50)

    @field_validator("allergies", "staple_ingredients")
    @classmethod
    def _lists(cls, v: list[str]) -> list[str]:
        return _normalize_list(v)

    @field_validator("diet", "preferred_cuisine")
    @classmethod
    def _texts(cls, v: str | None) -> str | None:
        return _normalize_text(v)


class PreferenceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    diet: str | None
    allergies: list[str]
    staple_ingredients: list[str]
    default_max_cook_minutes: int | None
    default_difficulty: Difficulty | None
    default_servings: int | None
    preferred_cuisine: str | None
    updated_at: datetime
