import bcrypt
import pytest
from sqlalchemy import select

from app.core.database import SessionLocal
from app.models import User
from tests.conftest import register_and_login


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_register_success_and_duplicate(client):
    body = {
        "email": "Ani@Example.com",
        "password": "Rahasia123",
        "full_name": "Ani",
        "role": "admin",
    }
    r = client.post("/auth/register", json=body)
    assert r.status_code == 201
    assert r.json()["email"] == "ani@example.com"
    assert "password" not in r.json() and "hashed_password" not in r.json()
    assert r.json()["role"] == "user"

    assert client.post("/auth/register", json=body).status_code == 409


def test_register_rejects_short_password(client):
    r = client.post("/auth/register", json={"email": "a@b.com", "password": "123", "full_name": "A"})
    assert r.status_code == 422


@pytest.mark.parametrize(
    "password",
    [
        "short1A",
        "lowercase123",
        "UPPERCASE123",
        "NoDigitsAa",
        "A" * 65,
    ],
)
def test_register_rejects_passwords_outside_policy(client, password):
    response = client.post(
        "/auth/register",
        json={"email": "strong@example.com", "password": password, "full_name": "Strong"},
    )
    assert response.status_code == 422


def test_register_rejects_password_equal_to_email_and_hashes_valid_password(client):
    email = "Admin123@example.com"
    assert client.post(
        "/auth/register",
        json={"email": email, "password": email, "full_name": "Admin"},
    ).status_code == 422

    response = client.post(
        "/auth/register",
        json={"email": email, "password": "StrongPass123", "full_name": "Admin"},
    )
    assert response.status_code == 201
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == email.lower()))
        assert user.hashed_password.startswith("$2")
        assert user.hashed_password != "StrongPass123"


def test_64_character_unicode_password_is_supported(client):
    password = "é" * 22 + "a" * 20 + "A" * 21 + "1"
    assert len(password) == 64
    response = client.post(
        "/auth/register",
        json={"email": "long-password@example.com", "password": password, "full_name": "Long"},
    )
    assert response.status_code == 201
    login = client.post(
        "/auth/login",
        json={"email": "long-password@example.com", "password": password},
    )
    assert login.status_code == 200


def test_legacy_bcrypt_password_hashes_remain_valid():
    legacy_hash = bcrypt.hashpw(b"LegacyPass123", bcrypt.gensalt()).decode("utf-8")
    from app.core.security import verify_password

    assert verify_password("LegacyPass123", legacy_hash)


def test_register_rejects_password_equal_to_username(client):
    password = "StrongPass123"
    response = client.post(
        "/auth/register",
        json={"email": "username@example.com", "password": password, "full_name": password},
    )
    assert response.status_code == 422


def test_login_wrong_password_and_unknown_email(client):
    register_and_login(client)
    r = client.post("/auth/login", json={"email": "budi@example.com", "password": "salah-banget"})
    assert r.status_code == 401
    r = client.post("/auth/login", json={"email": "tidakada@example.com", "password": "Rahasia123"})
    assert r.status_code == 401


def test_swagger_form_login(client):
    register_and_login(client)
    r = client.post("/auth/token", data={"username": "budi@example.com", "password": "Rahasia123"})
    assert r.status_code == 200
    assert r.json()["token_type"] == "bearer"


def test_protected_endpoint_requires_valid_token(client):
    assert client.get("/users/me").status_code == 401
    assert client.get("/users/me", headers={"Authorization": "Bearer token.palsu.xyz"}).status_code == 401

    headers = register_and_login(client)
    r = client.get("/users/me", headers=headers)
    assert r.status_code == 200
    assert r.json()["email"] == "budi@example.com"
