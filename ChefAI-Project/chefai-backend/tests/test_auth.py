from tests.conftest import register_and_login


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_register_success_and_duplicate(client):
    body = {"email": "Ani@Example.com", "password": "rahasia123", "full_name": "Ani"}
    r = client.post("/auth/register", json=body)
    assert r.status_code == 201
    assert r.json()["email"] == "ani@example.com"
    assert "password" not in r.json() and "hashed_password" not in r.json()
    assert r.json()["role"] == "user"

    assert client.post("/auth/register", json=body).status_code == 409


def test_register_rejects_short_password(client):
    r = client.post("/auth/register", json={"email": "a@b.com", "password": "123", "full_name": "A"})
    assert r.status_code == 422


def test_login_wrong_password_and_unknown_email(client):
    register_and_login(client)
    r = client.post("/auth/login", json={"email": "budi@example.com", "password": "salah-banget"})
    assert r.status_code == 401
    r = client.post("/auth/login", json={"email": "tidakada@example.com", "password": "rahasia123"})
    assert r.status_code == 401


def test_swagger_form_login(client):
    register_and_login(client)
    r = client.post("/auth/token", data={"username": "budi@example.com", "password": "rahasia123"})
    assert r.status_code == 200
    assert r.json()["token_type"] == "bearer"


def test_protected_endpoint_requires_valid_token(client):
    assert client.get("/users/me").status_code == 401
    assert client.get("/users/me", headers={"Authorization": "Bearer token.palsu.xyz"}).status_code == 401

    headers = register_and_login(client)
    r = client.get("/users/me", headers=headers)
    assert r.status_code == 200
    assert r.json()["email"] == "budi@example.com"
