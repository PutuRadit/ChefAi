import json
import logging
import re
import unicodedata
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_regular_user
from app.core.config import settings
from app.core.database import get_db
from app.models import RecipeEntry, RecipeReview, User
from app.schemas.recipe import RecipeEntryCreate, RecipeEntryRead

from app.schemas.recipe import GeneratedRecipe, RecipeRequest, RecipeResponse
from app.schemas.recipe_review import RecipeReviewCreate, RecipeReviewRead
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


def normalize_recipe_title(title: str) -> str:
    normalized = unicodedata.normalize("NFKD", title).casefold()
    return re.sub(r"[\W_]+", "", normalized)


@router.get("/history", response_model=list[RecipeEntryRead])
def recipe_history(
    db: Session = Depends(get_db), current_user: User = Depends(require_regular_user)
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
    current_user: User = Depends(require_regular_user),
):
    entry = RecipeEntry(
        id=uuid4().hex,
        user_id=current_user.id,
        title=payload.title.strip(),
        recipe_text=payload.recipe_text,
        ingredients=payload.ingredients,
        is_history=False,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.post("/history/complete", response_model=RecipeEntryRead, status_code=status.HTTP_201_CREATED)
def create_completed_recipe_history(
    payload: RecipeEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_regular_user),
):
    entry = RecipeEntry(
        id=uuid4().hex,
        user_id=current_user.id,
        title=payload.title.strip(),
        recipe_text=payload.recipe_text,
        ingredients=payload.ingredients,
        is_history=True,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.post("/history/{entry_id}/complete", response_model=RecipeEntryRead)
def complete_recipe_history(
    entry_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_regular_user),
):
    entry = db.get(RecipeEntry, entry_id)
    if entry is None or entry.user_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Resep tidak ditemukan")
    if not entry.is_history:
        entry.is_history = True
        entry.created_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(entry)
    return entry


@router.post(
    "/history/{entry_id}/review",
    response_model=RecipeReviewRead,
)
def save_recipe_review(
    entry_id: str,
    payload: RecipeReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_regular_user),
):
    entry = db.get(RecipeEntry, entry_id)
    if entry is None or entry.user_id != current_user.id or not entry.is_history:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Resep riwayat tidak ditemukan")

    review = db.scalar(
        select(RecipeReview).where(RecipeReview.recipe_entry_id == entry_id)
    )
    if review is None:
        review = RecipeReview(
            id=uuid4().hex,
            user_id=current_user.id,
            recipe_entry_id=entry_id,
            rating=payload.rating,
            comment=payload.comment,
        )
        db.add(review)
    else:
        if review.user_id != current_user.id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Ulasan tidak ditemukan")
        review.rating = payload.rating
        review.comment = payload.comment

    db.commit()
    db.refresh(review)
    return review


@router.get("/favorites", response_model=list[RecipeEntryRead])
def favorite_recipes(
    db: Session = Depends(get_db), current_user: User = Depends(require_regular_user)
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
    current_user: User = Depends(require_regular_user),
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
            )
            .order_by(RecipeEntry.created_at.desc())
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
    current_user: User = Depends(require_regular_user),
):
    entry = db.get(RecipeEntry, entry_id)
    if entry is None or entry.user_id != current_user.id or not entry.is_favorite:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Resep favorit tidak ditemukan")
    entry.is_favorite = False
    db.commit()


@router.post("/generate", response_model=RecipeResponse)
def generate_recipe_endpoint(
    request: RecipeRequest,
    _: User = Depends(require_regular_user),
):
    ingredients = ", ".join(request.ingredients)
    preferences = request.preferences or "Tidak ada"
    allergies = ", ".join(request.allergies) or "Tidak ada"
    excluded_titles = {normalize_recipe_title(title) for title in request.exclude_titles if title.strip()}
    excluded_list = "\n".join(f"- {title}" for title in request.exclude_titles if title.strip())
    if not excluded_list:
        excluded_list = "Tidak ada"

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

Judul resep yang sudah pernah ditampilkan dan tidak boleh diulang:
{excluded_list}

Buat tepat {request.count} pilihan resep baru yang berbeda satu sama lain, mudah dimasak, dan semuanya sesuai kategori tersebut.
Jangan menggabungkan kategori lain. Beri variasi nama dan cara memasak untuk setiap pilihan.
Jangan gunakan kembali judul atau variasi kecil dari judul yang dikecualikan.
Balas hanya dengan JSON valid menggunakan format:
{{"recipes":[{{"title":"Nama resep","description":"Deskripsi singkat","recipe":"Rincian bahan, langkah memasak, waktu, dan tips penyajian"}}]}}

Di dalam field recipe untuk setiap pilihan, gunakan bagian "Bahan-bahan:", "Langkah-langkah memasak:", "Waktu memasak:", dan "Tips penyajian:".
Pada bagian bahan, tulis jumlah porsi dan takaran setiap bahan dengan satuan jelas (gram, ml, butir, siung, sendok teh, atau sendok makan). Pisahkan bahan utama dan bumbu bila membantu.
Pada langkah memasak:
- Buat 6 sampai 10 langkah bernomor, berurutan, dan cukup rinci agar pemula dapat mengikuti.
- Mulai dari mencuci dan memotong bahan (sebut bentuk/ukuran potongan), lalu menghaluskan atau menyiapkan bumbu bila diperlukan, menyiapkan alat/panaskan wajan, memasak, dan penyajian.
- Satu langkah berisi satu pekerjaan utama; jangan menggabungkan banyak tahap yang seharusnya dilakukan terpisah.
- Sebut bahan dan takaran yang dimasukkan pada langkah terkait dengan satuan jelas, misalnya "masukkan 1 sdm kecap manis dan 1/2 sdt garam".
- Setiap langkah harus berakhir dengan satu perkiraan durasi dalam tanda kurung dengan format "(± 3 menit)". Gunakan durasi berbeda yang masuk akal untuk pekerjaan itu; tahap memotong atau menghaluskan biasanya beberapa menit, sedangkan merebus/ungkep dapat lebih lama. Jangan tulis rentang atau lebih dari satu durasi dalam satu langkah.
Sertakan perkiraan total waktu memasak dan tips penyajian.

Pastikan resep tidak menggunakan bahan yang menyebabkan alergi pengguna.
Gunakan bahasa Indonesia yang mudah dipahami.
"""

    try:
        result = generate_recipe(prompt).strip()
        if result.startswith("```"):
            result = result.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        generated = json.loads(result)
        recipes = [GeneratedRecipe.model_validate(item) for item in generated["recipes"]]
        if len(recipes) != request.count:
            raise ValueError(f"Gemini harus mengembalikan tepat {request.count} pilihan resep.")
        seen_titles = set()
        for recipe in recipes:
            normalized_title = normalize_recipe_title(recipe.title)
            if normalized_title in excluded_titles or normalized_title in seen_titles:
                raise ValueError("Gemini mengembalikan judul resep yang berulang.")
            seen_titles.add(normalized_title)
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
            detail=f"Gemini tidak mengembalikan {request.count} resep unik dengan format yang benar. Silakan coba lagi.",
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
