from pydantic import BaseModel, Field


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
