from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    dummy_hash,
    hash_password,
    verify_password,
)
from app.models import User, UserPreference
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.schemas.user import UserRead

router = APIRouter(prefix="/auth", tags=["auth"])


def _authenticate(db: Session, email: str, password: str) -> User:
    user = db.scalar(select(User).where(User.email == email.strip().lower()))
    # Selalu verifikasi hash agar waktu respons tidak membocorkan keberadaan email
    password_ok = verify_password(password, user.hashed_password if user else dummy_hash())
    if user is None or not password_ok or not user.is_active:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Email atau password salah",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def _token_for(user: User) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(user.id),
        expires_in=settings.access_token_expire_minutes * 60,
    )


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    email = payload.email.lower()
    if db.scalar(select(User.id).where(User.email == email)) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email sudah terdaftar")

    user = User(
        email=email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        preference=UserPreference(),  # baris preferensi kosong, diisi lewat /users/me/preferences
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:  # dua request register bersamaan dengan email sama
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Email sudah terdaftar")
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Login untuk frontend (body JSON)."""
    return _token_for(_authenticate(db, payload.email, payload.password))


@router.post("/token", response_model=TokenResponse, include_in_schema=True)
def login_form(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login versi form-data, khusus tombol Authorize di Swagger UI.
    Isi `username` dengan email."""
    return _token_for(_authenticate(db, form.username, form.password))
