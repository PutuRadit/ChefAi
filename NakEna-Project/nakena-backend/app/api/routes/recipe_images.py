from fastapi import APIRouter, Query

from app.services.recipe_images import find_recipe_image

router = APIRouter(prefix="/recipes", tags=["recipe-images"])


@router.get("/image")
def recipe_image(
    title: str = Query(..., min_length=1, max_length=200),
    ingredients: str = Query(default="", max_length=2000),
) -> dict[str, str | None]:
    """Optional illustration lookup; recipe generation remains independent."""
    return find_recipe_image(title, ingredients)
