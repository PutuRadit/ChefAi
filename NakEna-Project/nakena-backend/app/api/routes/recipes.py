import json
import logging
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models import RecipeEntry, User
from app.schemas.recipe import RecipeEntryCreate, RecipeEntryRead

from app.schemas.recipe import GeneratedRecipe, RecipeRequest, RecipeResponse
from app.services.llm import (
    GeminiConfigurationError,
    GeminiResponseError,
    generate_recipe,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/recipes",
    tags=["recipes"]
)


@router.get("/history", response_model=list[RecipeEntryRead])
def recipe_history(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    stmt = (
        select(RecipeEntry)
        .where(RecipeEntry.user_id == current_user.id, RecipeEntry.is_history.is_(True))
        .order_by(RecipeEntry.created_at.desc())
        .limit(50)
    )
    return list(db.scalars(stmt))


@router.post("/history", response_model=RecipeEntryRead, status_code=status.HTTP_201_CREATED)
def save_recipe_history(
    payload: RecipeEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = RecipeEntry(
        id=uuid4().hex,
        user_id=current_user.id,
        title=payload.title.strip(),
        recipe_text=payload.recipe_text,
        ingredients=payload.ingredients,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/favorites", response_model=list[RecipeEntryRead])
def favorite_recipes(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    stmt = (
        select(RecipeEntry)
        .where(RecipeEntry.user_id == current_user.id, RecipeEntry.is_favorite.is_(True))
        .order_by(RecipeEntry.created_at.desc())
        .limit(100)
    )
    return list(db.scalars(stmt))


@router.post("/favorites", response_model=RecipeEntryRead, status_code=status.HTTP_201_CREATED)
def save_favorite_recipe(
    payload: RecipeEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(RecipeEntry).where(
        RecipeEntry.user_id == current_user.id,
        RecipeEntry.title == payload.title.strip(),
        RecipeEntry.is_favorite.is_(True),
    )
    entry = db.scalar(stmt)
    if entry is None:
        entry = db.scalar(
            select(RecipeEntry).where(
                RecipeEntry.user_id == current_user.id,
                RecipeEntry.title == payload.title.strip(),
                RecipeEntry.is_history.is_(True),
            )
        )
    if entry is None:
        entry = RecipeEntry(
            id=uuid4().hex,
            user_id=current_user.id,
            title=payload.title.strip(),
            recipe_text=payload.recipe_text,
            ingredients=payload.ingredients,
            is_history=False,
            is_favorite=True,
        )
        db.add(entry)
    else:
        entry.is_favorite = True
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/favorites/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_favorite_recipe(
    entry_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = db.get(RecipeEntry, entry_id)
    if entry is None or entry.user_id != current_user.id or not entry.is_favorite:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Resep favorit tidak ditemukan")
    entry.is_favorite = False
    db.commit()


@router.post("/generate", response_model=RecipeResponse)
def generate_recipe_endpoint(request: RecipeRequest):
    ingredients = ", ".join(request.ingredients)
    preferences = request.preferences or "Tidak ada"
    allergies = ", ".join(request.allergies) or "Tidak ada"

    prompt = f"""
Kamu adalah NakEna, asisten rekomendasi resep makanan.

Bahan yang tersedia:
{ingredients}

Preferensi pengguna:
{preferences}

Alergi pengguna:
{allergies}

Jumlah porsi:
{request.servings}

Kategori masakan yang wajib diikuti:
{request.category}

Buat tepat 3 pilihan resep yang berbeda, mudah dimasak, dan semuanya sesuai kategori tersebut.
Jangan menggabungkan kategori lain. Beri variasi nama dan cara memasak untuk setiap pilihan.
Balas hanya dengan JSON valid menggunakan format:
{{"recipes":[{{"title":"Nama resep","description":"Deskripsi singkat","recipe":"Rincian bahan, langkah memasak, waktu, dan tips penyajian"}}]}}

Jelaskan:
Di dalam field recipe untuk setiap pilihan, sertakan:
1. Bahan-bahan beserta takarannya
2. Langkah-langkah memasak
3. Waktu memasak
4. Tips penyajian

Pastikan resep tidak menggunakan bahan yang menyebabkan alergi pengguna.
Gunakan bahasa Indonesia yang mudah dipahami.
"""

    try:
        result = generate_recipe(prompt).strip()
        if result.startswith("```"):
            result = result.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        generated = json.loads(result)
        recipes = [GeneratedRecipe.model_validate(item) for item in generated["recipes"]]
        if len(recipes) != 3:
            raise ValueError("Gemini harus mengembalikan tepat 3 pilihan resep.")
        return RecipeResponse(success=True, recipe=recipes[0].recipe, recipes=recipes)
    except GeminiConfigurationError as error:
        logger.error("Gemini is not configured: %s", error)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error
    except GeminiResponseError as error:
        logger.error("Gemini returned an empty response: %s", error)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Gemini mengembalikan respons kosong. Coba lagi beberapa saat.",
        ) from error
    except (json.JSONDecodeError, KeyError, TypeError, ValidationError, ValueError) as error:
        logger.warning("Gemini returned invalid recipe data: %s", error)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Gemini tidak mengembalikan 3 resep dengan format yang benar. Silakan coba lagi.",
        ) from error
    except Exception as error:
        logger.exception("Gemini recipe generation failed")
        provider_status = getattr(error, "code", None) or getattr(error, "status_code", None)
        if provider_status == 429:
            message = "Kuota atau batas permintaan Gemini tercapai. Coba lagi nanti atau periksa kuota di Google AI Studio."
            error_status = status.HTTP_429_TOO_MANY_REQUESTS
        elif provider_status in (401, 403):
            message = "Gemini menolak akses. Periksa API key dan akses Gemini API untuk project tersebut."
            error_status = status.HTTP_502_BAD_GATEWAY
        elif provider_status == 404:
            message = f"Model Gemini '{settings.gemini_model}' tidak ditemukan atau tidak tersedia untuk API key ini."
            error_status = status.HTTP_502_BAD_GATEWAY
        elif provider_status == 503:
            message = "Semua model Gemini yang dicoba sedang sibuk. Tunggu sebentar lalu coba lagi."
            error_status = status.HTTP_503_SERVICE_UNAVAILABLE
        else:
            message = "Gagal menghubungi Gemini. Periksa koneksi internet dan detail error pada terminal backend."
            error_status = status.HTTP_502_BAD_GATEWAY
        raise HTTPException(
            status_code=error_status,
            detail=message,
        ) from error
