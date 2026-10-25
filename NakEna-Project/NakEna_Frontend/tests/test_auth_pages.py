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
    assert "/static/frontend.js?v=2" in response.text


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
