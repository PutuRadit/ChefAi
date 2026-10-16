from fastapi import APIRouter, HTTPException

from app.schemas.recipe import RecipeRequest, RecipeResponse
from app.services.llm import generate_recipe

router = APIRouter(
    prefix="/recipes",
    tags=["recipes"]
)


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
