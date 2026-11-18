from datetime import datetime, timedelta, timezone
from io import BytesIO

from PIL import Image
from sqlalchemy import select

from app.core.database import SessionLocal
from app.models import RecipeEntry, RecipeReview, Upload, User
from app.services.storage import get_storage
from tests.conftest import register_and_login


def _promote_to_admin(client, headers):
    user_id = client.get("/users/me", headers=headers).json()["id"]
    with SessionLocal() as db:
        db.get(User, user_id).role = "admin"
        db.commit()
    return user_id


def test_admin_user_listing_requires_admin_and_hides_password_hash(client):
    regular_headers = register_and_login(client, email="regular@example.com")
    admin_headers = register_and_login(client, email="admin@example.com")
    _promote_to_admin(client, admin_headers)

    assert client.get("/admin/users", headers=regular_headers).status_code == 403

    response = client.get("/admin/users", headers=admin_headers)
    assert response.status_code == 200
    assert {user["email"] for user in response.json()} == {
        "admin@example.com",
        "regular@example.com",
    }
    assert all("hashed_password" not in user for user in response.json())


def test_admin_dashboard_analytics_includes_activity_and_recent_reviews(client):
    user_headers = register_and_login(
        client,
        email="reviewer@example.com",
        name="Ayu Reviewer",
    )
    admin_headers = register_and_login(client, email="admin@example.com")
    _promote_to_admin(client, admin_headers)
    user_id = client.get("/users/me", headers=user_headers).json()["id"]

    with SessionLocal() as db:
        recipe = RecipeEntry(
            id="analytics-recipe",
            user_id=user_id,
            title="Sup Sayur",
            recipe_text="Masak sayur.",
            ingredients=["wortel"],
        )
        recipe.review = RecipeReview(
            id="analytics-review",
            user_id=user_id,
            rating=5,
            comment="Enak dan mudah dibuat.",
        )
        db.add_all(
            [
                recipe,
                Upload(
                    id="analytics-upload",
                    user_id=user_id,
                    storage_key="analytics-upload.png",
                    original_filename="sayur.png",
                    content_type="image/png",
                    size_bytes=64,
                    width=4,
                    height=4,
                    status="detected",
                    expires_at=datetime.now(timezone.utc) + timedelta(days=1),
                ),
            ]
        )
        db.commit()

    assert client.get("/admin/dashboard", headers=user_headers).status_code == 403

    response = client.get("/admin/dashboard", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["totals"] == {
        "users": 1,
        "recipes": 1,
        "reviews": 1,
        "uploads": 1,
        "average_rating": 5.0,
    }
    today = datetime.now(timezone.utc).date().isoformat()
    today_activity = next(day for day in data["daily_activity"] if day["date"] == today)
    assert today_activity["users"] == 1
    assert today_activity["recipes"] == 1
    assert data["rating_distribution"] == [
        {"rating": 1, "count": 0},
        {"rating": 2, "count": 0},
        {"rating": 3, "count": 0},
        {"rating": 4, "count": 0},
        {"rating": 5, "count": 1},
    ]
    review = data["recent_reviews"][0]
    assert review["id"] == "analytics-review"
    assert review["user_name"] == "Ayu Reviewer"
    assert review["user_email"] == "reviewer@example.com"
    assert review["recipe_title"] == "Sup Sayur"
    assert review["rating"] == 5
    assert review["comment"] == "Enak dan mudah dibuat."
    assert data["upload_status_counts"] == [{"status": "detected", "count": 1}]
    assert data["recent_uploads"][0]["filename"] == "sayur.png"
    assert data["recent_uploads"][0]["user_email"] == "reviewer@example.com"
    assert data["recent_recipes"][0]["title"] == "Sup Sayur"
    assert data["recent_recipes"][0]["user_email"] == "reviewer@example.com"


def test_admin_can_preview_upload_images_but_regular_users_cannot(client):
    user_headers = register_and_login(client, email="image-owner@example.com")
    admin_headers = register_and_login(client, email="image-admin@example.com")
    _promote_to_admin(client, admin_headers)

    image = BytesIO()
    Image.new("RGB", (4, 4), "orange").save(image, format="PNG")
    upload_response = client.post(
        "/uploads",
        headers=user_headers,
        files={"file": ("ingredients.png", image.getvalue(), "image/png")},
    )
    assert upload_response.status_code == 201
    upload_id = upload_response.json()["id"]

    assert client.get(
        f"/admin/uploads/{upload_id}/image",
        headers=user_headers,
    ).status_code == 403
    image_response = client.get(
        f"/admin/uploads/{upload_id}/image",
        headers=admin_headers,
    )
    assert image_response.status_code == 200
    assert image_response.headers["content-type"] == "image/png"
    assert image_response.headers["cache-control"] == "private, no-store"
    assert image_response.content.startswith(b"\x89PNG\r\n\x1a\n")


def test_admin_can_delete_regular_user_and_related_data(client):
    admin_headers = register_and_login(client, email="admin@example.com")
    user_headers = register_and_login(client, email="delete@example.com")
    _promote_to_admin(client, admin_headers)
    user_id = client.get("/users/me", headers=user_headers).json()["id"]

    image = BytesIO()
    Image.new("RGB", (4, 4), "red").save(image, format="PNG")
    upload_response = client.post(
        "/uploads",
        headers=user_headers,
        files={"file": ("ingredients.png", image.getvalue(), "image/png")},
    )
    assert upload_response.status_code == 201
    upload_id = upload_response.json()["id"]
    storage = get_storage()
    with SessionLocal() as db:
        upload = db.get(Upload, upload_id)
        stored_path = storage._path(upload.storage_key)
    assert stored_path.is_file()

    with SessionLocal() as db:
        recipe = RecipeEntry(
            id="recipe-for-delete",
            user_id=user_id,
            title="Resep",
            recipe_text="Langkah",
            ingredients=["tomat"],
        )
        recipe.review = RecipeReview(
            id="review-for-delete",
            user_id=user_id,
            rating=4,
            comment="Enak",
        )
        db.add(recipe)
        db.commit()

    response = client.delete(f"/admin/users/{user_id}", headers=admin_headers)
    assert response.status_code == 204
    assert not stored_path.exists()
    assert client.get("/admin/users", headers=admin_headers).json()
    with SessionLocal() as db:
        assert db.get(User, user_id) is None
        assert db.get(Upload, upload_id) is None
        assert db.scalar(select(RecipeEntry).where(RecipeEntry.user_id == user_id)) is None
        assert db.scalar(select(RecipeReview).where(RecipeReview.user_id == user_id)) is None


def test_admin_cannot_delete_self_or_another_admin(client):
    first_headers = register_and_login(client, email="admin-one@example.com")
    second_headers = register_and_login(client, email="admin-two@example.com")
    first_id = _promote_to_admin(client, first_headers)
    second_id = _promote_to_admin(client, second_headers)

    self_delete = client.delete(f"/admin/users/{first_id}", headers=first_headers)
    other_admin_delete = client.delete(f"/admin/users/{second_id}", headers=first_headers)

    assert self_delete.status_code == 409
    assert other_admin_delete.status_code == 409
