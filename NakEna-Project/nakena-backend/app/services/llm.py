import logging

from google import genai
from google.genai import types

from app.core.config import settings

logger = logging.getLogger(__name__)

FALLBACK_MODELS = ("gemini-3.1-flash-lite", "gemini-2.5-flash-lite", "gemini-2.5-flash")


class GeminiConfigurationError(RuntimeError):
    pass


class GeminiResponseError(RuntimeError):
    pass


class GeminiUnavailableError(RuntimeError):
    pass


def generate_recipe(prompt: str) -> str:
    if not settings.gemini_api_key:
        raise GeminiConfigurationError("GEMINI_API_KEY belum diatur di file .env backend.")

    client = genai.Client(api_key=settings.gemini_api_key.get_secret_value())

    models = list(dict.fromkeys((settings.gemini_model, *FALLBACK_MODELS)))
    last_error = None
    response = None
    for index, model in enumerate(models):
        try:
            response = client.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(response_mime_type="application/json"),
            )
            break
        except Exception as error:
            last_error = error
            provider_status = getattr(error, "code", None) or getattr(error, "status_code", None)
            if provider_status not in (404, 503) or index == len(models) - 1:
                raise
            logger.warning(
                "Gemini model %s returned HTTP %s; trying fallback model %s",
                model,
                provider_status,
                models[index + 1],
            )

    if response is None:
        raise GeminiUnavailableError("Semua model Gemini yang dicoba sedang tidak tersedia.") from last_error

    if not response.text:
        raise GeminiResponseError("Gemini mengembalikan respons kosong.")
    return response.text
