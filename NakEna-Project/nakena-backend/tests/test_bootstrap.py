from sqlalchemy import select
from pydantic import SecretStr

from app.core.bootstrap import seed_admin_user
from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import verify_password
from app.models import User


def test_admin_seeder_creates_admin_idempotently(client, monkeypatch):
    monkeypatch.setattr(settings, "admin_email", "seed-admin@example.com")
    monkeypatch.setattr(settings, "admin_password", SecretStr("SeedAdmin123"))

    with SessionLocal() as db:
        seed_admin_user(db, settings)
        seed_admin_user(db, settings)
        admin = db.scalar(select(User).where(User.email == "seed-admin@example.com"))
        assert admin is not None
        assert admin.role == "admin"
        assert admin.hashed_password != "SeedAdmin123"
        assert verify_password("SeedAdmin123", admin.hashed_password)


def test_admin_seeder_promotes_existing_user_without_changing_password(client, monkeypatch):
    from tests.conftest import register_and_login

    register_and_login(
        client,
        email="seed-admin@example.com",
        password="ExistingPass123",
        name="Existing",
    )
    monkeypatch.setattr(settings, "admin_email", "seed-admin@example.com")
    monkeypatch.setattr(settings, "admin_password", SecretStr("SeedAdmin123"))

    with SessionLocal() as db:
        seed_admin_user(db, settings)
        admin = db.scalar(select(User).where(User.email == "seed-admin@example.com"))
        assert admin is not None
        assert admin.role == "admin"
        assert verify_password("ExistingPass123", admin.hashed_password)


def test_admin_seeder_requires_both_credentials(client, monkeypatch):
    monkeypatch.setattr(settings, "admin_email", "seed-admin@example.com")
    monkeypatch.setattr(settings, "admin_password", None)
    with SessionLocal() as db:
        try:
            seed_admin_user(db, settings)
        except ValueError as error:
            assert "harus diisi bersama" in str(error)
        else:
            raise AssertionError("Partial admin credentials must fail explicitly")
