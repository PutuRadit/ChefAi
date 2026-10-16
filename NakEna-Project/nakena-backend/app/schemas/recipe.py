from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class RecipeRequest(BaseModel):
    ingredients: list[str] = Field(
        ...,
        min_length=1,
        description="Daftar bahan makanan yang tersedia"
    )
    preferences: str | None = Field(
        default=None,
        description="Preferensi makanan pengguna"
    )
    allergies: list[str] = Field(
        default_factory=list,
        description="Daftar alergi pengguna"
    )
    servings: int = Field(
        default=2,
        ge=1,
        le=20,
        description="Jumlah porsi"
    )


class RecipeResponse(BaseModel):
    success: bool
    recipe: str


class RecipeEntryCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    recipe_text: str = Field(default="", max_length=20000)
    ingredients: list[str] = Field(default_factory=list, max_length=30)


class RecipeEntryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    recipe_text: str
    ingredients: list[str]
    is_favorite: bool
    created_at: datetime
