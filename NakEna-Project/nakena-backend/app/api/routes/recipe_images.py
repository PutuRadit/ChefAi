from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse

from app.api.deps import require_regular_user
from app.models import User
from app.services.recipe_images import _asset_path, find_recipe_image

router = APIRouter(prefix="/recipes", tags=["recipe-images"])


@router.get("/image")
def recipe_image(
    request: Request,
    title: str = Query(..., min_length=1, max_length=200),
    ingredients: str = Query(default="", max_length=2000),
    _: User = Depends(require_regular_user),
) -> dict[str, str | None]:
    """Optional illustration lookup; recipe generation remains independent."""
    result = find_recipe_image(title, ingredients)
    if result["status"] == "ok" and result["asset_key"]:
        result["image_url"] = str(request.url_for(
            "recipe_image_asset",
            asset_key=result["asset_key"],
        ))
    return result


@router.get("/image/assets/{asset_key}", name="recipe_image_asset", include_in_schema=False)
def recipe_image_asset(asset_key: str) -> FileResponse:
    """Serve locally cached Pixabay images; browser image elements cannot send bearer tokens."""
    path = _asset_path(asset_key)
    if path is None or not path.is_file():
        raise HTTPException(status_code=404, detail="Foto tidak ditemukan")
    media_type = {
        ".jpg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
    }.get(Path(asset_key).suffix)
    if media_type is None:
        raise HTTPException(status_code=404, detail="Foto tidak ditemukan")
    return FileResponse(path, media_type=media_type, headers={"Cache-Control": "public, max-age=86400"})
