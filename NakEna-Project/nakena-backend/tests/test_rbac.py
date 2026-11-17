from io import BytesIO

from PIL import Image

from app.core.database import SessionLocal
from app.models import User
from tests.conftest import register_and_login


def _promote_to_admin(headers, client):
    user_id = client.get("/users/me", headers=headers).json()["id"]
    with SessionLocal() as db:
        db.get(User, user_id).role = "admin"
        db.commit()
    return headers


def _image_file():
    image = BytesIO()
    Image.new("RGB", (4, 4), "red").save(image, format="PNG")
    return {"file": ("photo.png", image.getvalue(), "image/png")}


def test_guest_gets_401_for_user_and_admin_apis(client):
    requests = [
        ("post", "/uploads", {"files": _image_file()}),
        ("post", "/uploads/guest/detect", {"files": _image_file()}),
        ("post", "/recipes/generate", {"json": {"ingredients": ["tomat"]}}),
        ("get", "/recipes/history", {}),
        ("get", "/recipes/favorites", {}),
        ("get", "/recipes/image?title=Sup%20Tomat", {}),
        ("get", "/admin/users", {}),
    ]
    for method, path, kwargs in requests:
        response = getattr(client, method)(path, **kwargs)
        assert response.status_code == 401, (method, path, response.text)


def test_admin_is_forbidden_from_user_features_and_user_is_forbidden_from_admin_api(client):
    user_headers = register_and_login(client, email="regular@example.com")
    admin_headers = _promote_to_admin(
        register_and_login(client, email="admin@example.com"), client
    )

    user_requests = [
        ("post", "/uploads", {"files": _image_file()}),
        ("post", "/uploads/guest/detect", {"files": _image_file()}),
        ("post", "/recipes/generate", {"json": {"ingredients": ["tomat"]}}),
        ("get", "/recipes/history", {}),
        ("get", "/recipes/favorites", {}),
        ("get", "/recipes/image?title=Sup%20Tomat", {}),
        ("get", "/users/me/preferences", {}),
    ]
    for method, path, kwargs in user_requests:
        response = getattr(client, method)(path, headers=admin_headers, **kwargs)
        assert response.status_code == 403, (method, path, response.text)

    assert client.get("/admin/users", headers=user_headers).status_code == 403
    assert client.get("/admin/users", headers=admin_headers).status_code == 200


def test_public_registration_cannot_create_admin_and_password_login_works(client):
    response = client.post(
        "/auth/register",
        json={
            "email": "new-user@example.com",
            "password": "StrongPass123",
            "full_name": "New User",
            "role": "admin",
        },
    )
    assert response.status_code == 201
    assert response.json()["role"] == "user"
    login = client.post(
        "/auth/login",
        json={"email": "new-user@example.com", "password": "StrongPass123"},
    )
    assert login.status_code == 200
