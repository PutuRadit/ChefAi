from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import RecipeEntry, User
from app.schemas.recipe import RecipeEntryCreate, RecipeEntryRead

from app.schemas.recipe import RecipeRequest, RecipeResponse
from app.services.llm import generate_recipe

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

Buat satu rekomendasi resep yang mudah dimasak.
Jelaskan:
1. Nama makanan
2. Deskripsi singkat
3. Bahan-bahan
4. Langkah-langkah memasak
5. Waktu memasak
6. Tips penyajian

Pastikan resep tidak menggunakan bahan yang menyebabkan alergi pengguna.
Gunakan bahasa Indonesia yang mudah dipahami.
"""

    try:
        result = generate_recipe(prompt)

        return RecipeResponse(
            success=True,
            recipe=result
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Gagal membuat rekomendasi resep: {str(error)}"
        )
