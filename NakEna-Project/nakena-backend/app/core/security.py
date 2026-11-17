from datetime import datetime, timedelta, timezone
from functools import lru_cache
import hashlib

import bcrypt
import jwt

from app.core.config import settings


def hash_password(password: str) -> str:
    password_bytes = hashlib.sha256(password.encode("utf-8")).hexdigest().encode("ascii")
    return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        stored_hash = hashed.encode("utf-8")
        raw_password = password.encode("utf-8")
        if len(raw_password) <= 72 and bcrypt.checkpw(raw_password, stored_hash):
            return True
        password_bytes = hashlib.sha256(raw_password).hexdigest().encode("ascii")
        return bcrypt.checkpw(password_bytes, stored_hash)
    except ValueError:
        # Hash rusak atau format bcrypt tidak dikenali.
        return False


@lru_cache
def dummy_hash() -> str:
    """Hash palsu untuk menyamakan waktu respons login saat email tidak ditemukan."""
    return hash_password("nakena-dummy-password")


def create_access_token(subject: int | str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(subject),
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> str | None:
    """Mengembalikan subject (user id) bila token valid, selain itu None."""
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.jwt_algorithm],
            options={"require": ["exp", "sub"]},
        )
    except jwt.PyJWTError:
        return None
    sub = payload.get("sub")
    return sub if isinstance(sub, str) else None
