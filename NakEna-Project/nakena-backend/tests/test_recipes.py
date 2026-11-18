import json

from tests.conftest import register_and_login


def test_recipe_generation_supports_five_new_exclusive_options(client, monkeypatch):
    headers = register_and_login(client)
    prompts = []

    def fake_generate_recipe(prompt):
        prompts.append(prompt)
        return json.dumps({
            "recipes": [
                {"title": f"Menu alternatif {number}", "description": "Praktis", "recipe": f"Resep {number}"}
                for number in range(1, 6)
            ],
        })

    monkeypatch.setattr("app.api.routes.recipes.generate_recipe", fake_generate_recipe)

    response = client.post(
        "/recipes/generate",
        headers=headers,
        json={
            "ingredients": ["nasi", "telur"],
            "category": "Rumahan",
            "count": 5,
            "exclude_titles": ["Nasi Telur pertama", "Nasi Telur kedua"],
        },
    )

    assert response.status_code == 200
    assert len(response.json()["recipes"]) == 5
    assert "tepat 5 pilihan resep baru" in prompts[0]
    assert "Nasi Telur pertama" in prompts[0]
    assert "Nasi Telur kedua" in prompts[0]


def test_recipe_generation_rejects_repeated_excluded_titles(client, monkeypatch):
    headers = register_and_login(client)
    monkeypatch.setattr(
        "app.api.routes.recipes.generate_recipe",
        lambda prompt: json.dumps({
            "recipes": [
                {"title": "RESEP-SEBELUMNYA!", "description": "Sama", "recipe": "Resep 1"},
                {"title": "Alternatif dua", "description": "Baru", "recipe": "Resep 2"},
                {"title": "Alternatif tiga", "description": "Baru", "recipe": "Resep 3"},
                {"title": "Alternatif empat", "description": "Baru", "recipe": "Resep 4"},
                {"title": "Alternatif lima", "description": "Baru", "recipe": "Resep 5"},
            ],
        }),
    )

    response = client.post(
        "/recipes/generate",
        headers=headers,
        json={
            "ingredients": ["telur"],
            "count": 5,
            "exclude_titles": ["Resep sebelumnya"],
        },
    )

    assert response.status_code == 502
    assert "5 resep unik" in response.json()["detail"]


def test_recipe_generation_uses_llm_service(client, monkeypatch):
    headers = register_and_login(client)
    prompts = []

    def fake_generate_recipe(prompt):
        prompts.append(prompt)
        return (
            '{"recipes":['
            '{"title":"Nasi Telur 1","description":"Praktis","recipe":"Resep 1"},'
            '{"title":"Nasi Telur 2","description":"Hangat","recipe":"Resep 2"},'
            '{"title":"Nasi Telur 3","description":"Gurih","recipe":"Resep 3"}'
            ']}'
        )

    monkeypatch.setattr("app.api.routes.recipes.generate_recipe", fake_generate_recipe)

    response = client.post(
        "/recipes/generate",
        headers=headers,
        json={
            "ingredients": ["nasi", "telur"],
            "preferences": "halal",
            "allergies": ["kacang"],
            "servings": 2,
            "category": "Tumisan",
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "recipe": "Resep 1",
        "recipes": [
            {"title": "Nasi Telur 1", "description": "Praktis", "recipe": "Resep 1"},
            {"title": "Nasi Telur 2", "description": "Hangat", "recipe": "Resep 2"},
            {"title": "Nasi Telur 3", "description": "Gurih", "recipe": "Resep 3"},
        ],
    }
    assert len(prompts) == 1
    assert "nasi, telur" in prompts[0]
    assert "kacang" in prompts[0]
    assert "Tumisan" in prompts[0]
    assert "6 sampai 10 langkah bernomor" in prompts[0]
    assert "memotong bahan (sebut bentuk/ukuran potongan)" in prompts[0]
    assert "sendok makan" in prompts[0]
    assert "(± 3 menit)" in prompts[0]


def test_recipe_generation_rejects_malformed_llm_response(client, monkeypatch):
    headers = register_and_login(client)
    monkeypatch.setattr("app.api.routes.recipes.generate_recipe", lambda prompt: "bukan json")

    response = client.post(
        "/recipes/generate",
        headers=headers,
        json={"ingredients": ["telur"], "category": "Kuah Hangat"},
    )

    assert response.status_code == 502
    assert "format yang benar" in response.json()["detail"]


def test_recipe_generation_reports_gemini_quota_errors(client, monkeypatch):
    headers = register_and_login(client)
    class QuotaError(Exception):
        code = 429

    def fail_generation(prompt):
        raise QuotaError("provider detail")

    monkeypatch.setattr("app.api.routes.recipes.generate_recipe", fail_generation)

    response = client.post(
        "/recipes/generate",
        headers=headers,
        json={"ingredients": ["telur"]},
    )

    assert response.status_code == 429
    assert "Kuota" in response.json()["detail"]
    assert "provider detail" not in response.json()["detail"]


def test_recipe_generation_reports_unavailable_model(client, monkeypatch):
    headers = register_and_login(client)
    class ModelNotFoundError(Exception):
        code = 404

    def fail_generation(prompt):
        raise ModelNotFoundError("provider detail")

    monkeypatch.setattr("app.api.routes.recipes.generate_recipe", fail_generation)

    response = client.post(
        "/recipes/generate",
        headers=headers,
        json={"ingredients": ["telur"]},
    )

    assert response.status_code == 502
    assert "Model Gemini" in response.json()["detail"]
    assert "provider detail" not in response.json()["detail"]


def test_recipe_generation_reports_all_models_busy(client, monkeypatch):
    headers = register_and_login(client)
    class ServiceUnavailableError(Exception):
        code = 503

    def fail_generation(prompt):
        raise ServiceUnavailableError("provider detail")

    monkeypatch.setattr("app.api.routes.recipes.generate_recipe", fail_generation)

    response = client.post(
        "/recipes/generate",
        headers=headers,
        json={"ingredients": ["telur"]},
    )

    assert response.status_code == 503
    assert "sedang sibuk" in response.json()["detail"]
    assert "provider detail" not in response.json()["detail"]


def test_recipe_history_and_favorites_are_user_owned(client):
    headers = register_and_login(client, email="chef@example.com")
    other_headers = register_and_login(client, email="other@example.com")
    recipe = {
        "title": "Tumis Tomat",
        "recipe_text": "Tumis bawang, masukkan tomat, lalu sajikan.",
        "ingredients": ["tomat", "bawang"],
    }

    created = client.post("/recipes/history", headers=headers, json=recipe)
    assert created.status_code == 201
    entry_id = created.json()["id"]
    assert client.get("/recipes/history", headers=headers).json()[0]["title"] == "Tumis Tomat"
    assert client.get("/recipes/history", headers=other_headers).json() == []

    favorite = client.post("/recipes/favorites", headers=headers, json=recipe)
    assert favorite.status_code == 201
    favorite_id = favorite.json()["id"]
    assert client.get("/recipes/favorites", headers=headers).json()[0]["is_favorite"] is True
    assert client.get("/recipes/favorites", headers=other_headers).json() == []
    assert client.delete(f"/recipes/favorites/{favorite_id}", headers=other_headers).status_code == 404
    assert client.delete(f"/recipes/favorites/{favorite_id}", headers=headers).status_code == 204
    assert client.get("/recipes/favorites", headers=headers).json() == []
    assert client.get("/recipes/history", headers=headers).json()[0]["id"] == entry_id


def test_recipe_review_is_owner_scoped_and_can_be_updated(client):
    headers = register_and_login(client, email="review-owner@example.com")
    other_headers = register_and_login(client, email="review-other@example.com")
    recipe = client.post(
        "/recipes/history",
        headers=headers,
        json={"title": "Sup Sayur", "recipe_text": "Rebus sayuran.", "ingredients": ["wortel"]},
    ).json()
    entry_id = recipe["id"]

    created = client.post(
        f"/recipes/history/{entry_id}/review",
        headers=headers,
        json={"rating": 5, "comment": "  Enak dan mudah dibuat.  "},
    )

    assert created.status_code == 200
    assert created.json()["recipe_entry_id"] == entry_id
    assert created.json()["rating"] == 5
    assert created.json()["comment"] == "Enak dan mudah dibuat."

    updated = client.post(
        f"/recipes/history/{entry_id}/review",
        headers=headers,
        json={"rating": 4, "comment": "Cukup praktis."},
    )
    assert updated.status_code == 200
    assert updated.json()["id"] == created.json()["id"]
    assert updated.json()["rating"] == 4
    assert updated.json()["comment"] == "Cukup praktis."
    history = client.get("/recipes/history", headers=headers).json()
    assert history[0]["review"]["id"] == updated.json()["id"]
    assert history[0]["review"]["rating"] == 4

    unauthorized = client.post(
        f"/recipes/history/{entry_id}/review",
        headers=other_headers,
        json={"rating": 1},
    )
    assert unauthorized.status_code == 404


def test_recipe_review_requires_login_and_valid_rating(client):
    headers = register_and_login(client, email="review-rating@example.com")
    saved = client.post(
        "/recipes/history",
        headers=headers,
        json={"title": "Telur Dadar", "recipe_text": "Goreng telur.", "ingredients": ["telur"]},
    ).json()
    endpoint = f"/recipes/history/{saved['id']}/review"

    assert client.post(endpoint, json={"rating": 5}).status_code == 401
    assert client.post(endpoint, headers=headers, json={"rating": 6}).status_code == 422
