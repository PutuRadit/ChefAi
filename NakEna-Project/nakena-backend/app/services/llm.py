from google import genai

from app.core.config import settings


def generate_recipe(prompt: str) -> str:
    if not settings.gemini_api_key:
        raise ValueError("GEMINI_API_KEY belum ditemukan di file .env")

    client = genai.Client(api_key=settings.gemini_api_key.get_secret_value())

    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=prompt
    )

    return response.text
