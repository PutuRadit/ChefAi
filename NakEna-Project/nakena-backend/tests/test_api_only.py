import pytest


@pytest.mark.parametrize(
    "path",
    [
        "/login/",
        "/register/",
        "/scan/",
        "/scan/result/",
        "/recipes/",
        "/recipes/1/",
        "/recipes/1/guided-cooking/",
        "/history/",
        "/favorites/",
        "/profile/",
        "/admin-dashboard/",
        "/static/frontend.js",
    ],
)
def test_frontend_pages_and_assets_are_not_served_by_api(client, path):
    response = client.get(path)
    assert response.status_code == 404


def test_api_root_returns_service_info(client):
    response = client.get("/")

    assert response.status_code == 200
    assert response.json()["service"]
    assert response.json()["docs"] == "/docs"
    assert response.json()["health"] == "/health"


@pytest.mark.parametrize("origin", ["http://localhost:8001", "http://127.0.0.1:8001"])
def test_frontend_origin_is_allowed_by_cors(client, origin):
    response = client.options(
        "/auth/login",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
