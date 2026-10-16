from tests.conftest import register_and_login


def test_preferences_default_empty(client):
    headers = register_and_login(client)
    r = client.get("/users/me/preferences", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert data["allergies"] == [] and data["diet"] is None


def test_put_then_patch_preferences(client):
    headers = register_and_login(client)
    r = client.put(
        "/users/me/preferences",
        headers=headers,
        json={
            "diet": " Vegetarian ",
            "allergies": ["Kacang", "kacang", " Udang "],
            "staple_ingredients": ["garam", "minyak"],
            "default_servings": 2,
            "default_difficulty": "easy",
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["diet"] == "vegetarian"
    assert data["allergies"] == ["kacang", "udang"]  # dinormalisasi + dedup

    # PATCH hanya mengubah field yang dikirim
    r = client.patch("/users/me/preferences", headers=headers, json={"default_servings": 4})
    assert r.status_code == 200
    data = r.json()
    assert data["default_servings"] == 4
    assert data["allergies"] == ["kacang", "udang"]
    assert data["staple_ingredients"] == ["garam", "minyak"]


def test_preferences_validation(client):
    headers = register_and_login(client)
    assert client.put("/users/me/preferences", headers=headers, json={"default_difficulty": "extreme"}).status_code == 422
    assert client.put("/users/me/preferences", headers=headers, json={"default_servings": 0}).status_code == 422
    assert client.put("/users/me/preferences", headers=headers, json={"allergies": None}).status_code == 422


def test_preferences_are_per_user(client):
    a = register_and_login(client, email="a@example.com")
    b = register_and_login(client, email="b@example.com")
    client.put("/users/me/preferences", headers=a, json={"allergies": ["telur"]})
    assert client.get("/users/me/preferences", headers=b).json()["allergies"] == []


def test_update_profile_name(client):
    headers = register_and_login(client)
    r = client.patch("/users/me", headers=headers, json={"full_name": "  Budi Santoso "})
    assert r.status_code == 200 and r.json()["full_name"] == "Budi Santoso"
