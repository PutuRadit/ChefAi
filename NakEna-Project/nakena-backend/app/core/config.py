from functools import lru_cache
from pathlib import Path

from pydantic import SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_ROOT / ".env",
        env_ignore_empty=True,
        extra="ignore",
    )

    app_name: str = "NakEna API"
    debug: bool = False

    database_url: str = "postgresql+psycopg2://nakena:nakena@localhost:5432/nakena"

    # Wajib diisi lewat environment / .env (tidak ada nilai default demi keamanan)
    secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    gemini_api_key: SecretStr | None = None
    gemini_model: str = "gemini-3.8-flash"
    yolo_model_path: Path = BACKEND_ROOT / "models" / "chefai_best.pt"
    yolo_confidence: float = 0.25

    cors_origins: list[str] = [
        "http://localhost:8001",
        "http://127.0.0.1:8001",
        "http://localhost:5173",
        "http://localhost:3000",
    ]

    upload_dir: str = "storage/uploads"
    max_upload_size_mb: int = 5
    upload_retention_days: int = 30

    @field_validator("secret_key")
    @classmethod
    def _secret_key_long_enough(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError("SECRET_KEY minimal 32 karakter")
        return v

    @field_validator("yolo_model_path")
    @classmethod
    def _resolve_yolo_model_path(cls, value: Path) -> Path:
        if value.is_absolute():
            return value
        return BACKEND_ROOT / value

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
