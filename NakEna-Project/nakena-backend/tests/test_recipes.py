from tests.conftest import register_and_login


def test_recipe_generation_uses_llm_service(client, monkeypatch):
    prompts = []

    def fake_generate_recipe(prompt):
        prompts.append(prompt)
        return "Nasi telur"

    monkeypatch.setattr("app.api.routes.recipes.generate_recipe", fake_generate_recipe)

    response = client.post(
        "/recipes/generate",
        json={
            "ingredients": ["nasi", "telur"],
            "preferences": "halal",
            "allergies": ["kacang"],
            "servings": 2,
        },
    )

    assert response.status_code == 200
    assert response.json() == {"success": True, "recipe": "Nasi telur"}
    assert len(prompts) == 1
    assert "nasi, telur" in prompts[0]
    assert "kacang" in prompts[0]


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
