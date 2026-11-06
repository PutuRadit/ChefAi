from pathlib import Path
import re

import pytest
from fastapi.testclient import TestClient

from app.main import TEMPLATES_DIR, STATIC_DIR, app

client = TestClient(app)

PAGE_ROUTES = {
    "/": "home",
    "/login/": "login",
    "/register/": "register",
    "/scan/": "scan",
    "/scan/result/": "detection_result",
    "/recipes/": "recipes",
    "/recipes/1/": "recipe_detail",
    "/recipes/1/guided-cooking/": "guided_cooking",
    "/history/": "history",
    "/favorites/": "favorites",
    "/profile/": "profile",
    "/admin-dashboard/": "admin_dashboard",
}


@pytest.mark.parametrize(("path", "template"), PAGE_ROUTES.items())
def test_application_pages_render(path, template):
    response = client.get(path)
    assert response.status_code == 200
    assert f"/static/css/pages/{template}.css" in response.text


@pytest.mark.parametrize("page", [path.stem for path in TEMPLATES_DIR.glob("*.html")])
def test_templates_do_not_contain_inline_css_or_javascript(page):
    html = (TEMPLATES_DIR / f"{page}.html").read_text(encoding="utf-8")
    assert not re.search(r"<style\b", html, re.I)
    inline_scripts = re.findall(r"<script\b([^>]*)>(.*?)</script\s*>", html, re.I | re.S)
    assert all(re.search(r"\bsrc\s*=", attrs, re.I) for attrs, _ in inline_scripts)


def test_login_has_no_prefilled_demo_credentials():
    response = client.get("/login/")
    assert response.status_code == 200
    assert 'id="id_email"' in response.text
    assert 'id="id_password"' in response.text
    assert "dapur.chef@kuliner.com" not in response.text
    assert "rahasiaDapur123" not in response.text


def test_detection_page_does_not_show_seeded_ingredients_or_redirect_button():
    response = client.get("/scan/result/")
    assert response.status_code == 200
    assert "Telur Ayam" not in response.text
    assert "Tomat Segar" not in response.text
    assert "Bawang Merah" not in response.text
    assert "96% Cocok" not in response.text
    assert "onclick=\"window.location.assign('/recipes/')\"" not in response.text


def test_profile_page_does_not_expose_demo_account_values():
    response = client.get("/profile/")
    assert response.status_code == 200
    assert "Rian Pratama" not in response.text
    assert "rian.pratama@kuliner.com" not in response.text
    assert "secretpassword123" not in response.text


def test_page_css_and_javascript_files_exist():
    for template_path in TEMPLATES_DIR.glob("*.html"):
        page = template_path.stem
        assert (STATIC_DIR / "css" / "pages" / f"{page}.css").is_file()
        config_file = STATIC_DIR / "js" / "pages" / f"{page}.config.js"
        assert config_file.is_file()


def test_design_assets_are_served():
    for asset in ["assets/mascottt.png", "assets/recipe-1.jpg"]:
        response = client.get(f"/static/{asset}")
        assert response.status_code == 200


def test_extracted_css_and_javascript_are_served():
    for template_path in TEMPLATES_DIR.glob("*.html"):
        page = template_path.stem
        assert client.get(f"/static/css/pages/{page}.css").status_code == 200
        assert client.get(f"/static/js/pages/{page}.config.js").status_code == 200
        page_script = STATIC_DIR / "js" / "pages" / f"{page}.js"
        if page_script.is_file():
            assert client.get(f"/static/js/pages/{page}.js").status_code == 200


def test_api_integration_script_is_loaded_from_frontend_static():
    response = client.get("/login/")
    assert '/static/js/api.js?v=1' in response.text
    script_response = client.get('/static/js/api.js?v=1')
    assert script_response.status_code == 200
    assert 'data-api-base' in response.text


def test_no_unresolved_git_conflict_markers_remain():
    files = list(TEMPLATES_DIR.glob("*.html")) + [STATIC_DIR / "js" / "api.js"]
    for file_path in files:
        content = file_path.read_text(encoding="utf-8")
        assert not re.search(r"^(<<<<<<<|=======|>>>>>>>)", content, re.M)


def test_legacy_duplicate_template_directory_is_not_present():
    assert not (TEMPLATES_DIR.parent.parent / "app" / "web").exists()
