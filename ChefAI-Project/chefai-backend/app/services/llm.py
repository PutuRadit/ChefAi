import os
from dotenv import load_dotenv
from google import genai

load_dotenv()


def generate_recipe(prompt: str) -> str:
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise ValueError("GEMINI_API_KEY belum ditemukan di file .env")

    client = genai.Client(api_key=api_key)

    response = client.models.generate_content(
        model=os.getenv("GEMINI_MODEL", "gemini-3.6-flash"),
        contents=prompt
    )

    return response.text
