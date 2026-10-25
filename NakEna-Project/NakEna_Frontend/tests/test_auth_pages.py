from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)
INTEGRATION_SCRIPT = (
    Path(__file__).resolve().parents[2]
    / "nakena-backend"
    / "app"
    / "web"
    / "static"
    / "frontend.js"
)
APPLICATION_PATHS = [
    "/",
    "/scan/",
    "/scan/result/",
    "/recipes/",
    "/recipes/1/",
    "/recipes/1/guided-cooking/",
    "/history/",
    "/favorites/",
    "/profile/",
    "/admin-dashboard/",
]


@pytest.mark.parametrize("path", ["/login/", "/register/"])
def test_auth_page_renders_with_backend_integration(path):
    response = client.get(path)

    assert response.status_code == 200
    assert 'data-api-base="http://127.0.0.1:8000"' in response.text
    assert "/static/frontend.js?v=4" in response.text


@pytest.mark.parametrize("path", APPLICATION_PATHS)
def test_application_pages_render(path):
    response = client.get(path)

    assert response.status_code == 200
    assert "/static/frontend.js" in response.text


def test_successful_auth_redirects_to_application_pages_by_default():
    integration_script = INTEGRATION_SCRIPT.read_text(encoding="utf-8")

    assert 'next : "/scan/"' in integration_script
    assert 'window.location.assign("/scan/")' in integration_script
    assert "document.currentScript?.dataset.apiBase" in integration_script
    assert "fetch(`${apiBaseUrl}${path}`" in integration_script


def test_detection_page_does_not_show_seeded_ingredients():
    response = client.get("/scan/result/")

    assert response.status_code == 200
    assert 'id="submitFormBtn" type="submit"' in response.text
    assert 'onclick="window.location.assign(\'/recipes/\')"' not in response.text
    assert 'id="ingredientsListContainer"></div>' in response.text
    assert 'id="ingredientItemTemplate"' in response.text
    assert "Telur Ayam" not in response.text
    assert "Tomat Segar" not in response.text
    assert "Bawang Merah" not in response.text
    assert "96% Cocok" not in response.text


def test_profile_page_does_not_expose_demo_account_values():
    response = client.get("/profile/")

    assert response.status_code == 200
    assert 'data-user-name></h1>' in response.text
    assert "Rian Pratama" not in response.text
    assert "rian.pratama@kuliner.com" not in response.text
    assert "secretpassword123" not in response.text


@pytest.mark.parametrize(
    "path",
    [
        "/static/frontend.js",
        "/static/assets/mascottt.png",
        "/static/assets/recipe-1.jpg",
    ],
)
def test_frontend_serves_integration_script_and_design_assets(path):
    response = client.get(path)

    assert response.status_code == 200
