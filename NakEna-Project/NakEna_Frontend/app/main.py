"""FastAPI entry point for the NakEna web frontend.

This service serves HTML/CSS/JavaScript only. All data and AI operations are
handled by the separate NakEna backend API.
"""

import os
from html import escape
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

BASE_DIR = Path(__file__).resolve().parent.parent
TEMPLATES_DIR = BASE_DIR / "templates" / "nakena"
STATIC_DIR = BASE_DIR / "static"
API_BASE_URL = os.getenv("NAKENA_API_BASE_URL", "http://127.0.0.1:8000").rstrip("/")

app = FastAPI(title="NakEna Frontend", docs_url=None, redoc_url=None)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


def render_frontend(template_name: str) -> HTMLResponse:
    template_path = TEMPLATES_DIR / f"{template_name}.html"
    if not template_path.is_file():
        raise HTTPException(status_code=404, detail="Halaman tidak ditemukan")

    html = template_path.read_text(encoding="utf-8")
    integration_script = (
        f'<script src="/static/js/api.js?v=1" '
        f'data-api-base="{escape(API_BASE_URL, quote=True)}" defer></script>'
    )
    if "</body>" in html:
        html = html.replace("</body>", f"{integration_script}</body>", 1)
    else:
        html += integration_script
    return HTMLResponse(html)


@app.get("/", include_in_schema=False)
def home_page():
    return render_frontend("home")


@app.get("/login", include_in_schema=False)
@app.get("/login/", include_in_schema=False)
def login_page():
    return render_frontend("login")


@app.get("/register", include_in_schema=False)
@app.get("/register/", include_in_schema=False)
def register_page():
    return render_frontend("register")


@app.get("/scan", include_in_schema=False)
@app.get("/scan/", include_in_schema=False)
def scan_page():
    return render_frontend("scan")


@app.get("/scan/result", include_in_schema=False)
@app.get("/scan/result/", include_in_schema=False)
def scan_result_page():
    return render_frontend("detection_result")


@app.get("/recipes", include_in_schema=False)
@app.get("/recipes/", include_in_schema=False)
def recipes_page():
    return render_frontend("recipes")


@app.get("/recipes/{recipe_id}/guided-cooking/", include_in_schema=False)
def guided_cooking_page(recipe_id: int):
    return render_frontend("guided_cooking")


@app.get("/recipes/{recipe_id}/", include_in_schema=False)
def recipe_detail_page(recipe_id: int):
    return render_frontend("recipe_detail")


@app.get("/history", include_in_schema=False)
@app.get("/history/", include_in_schema=False)
def history_page():
    return render_frontend("history")


@app.get("/favorites", include_in_schema=False)
@app.get("/favorites/", include_in_schema=False)
def favorites_page():
    return render_frontend("favorites")


@app.get("/profile", include_in_schema=False)
@app.get("/profile/", include_in_schema=False)
def profile_page():
    return render_frontend("profile")


@app.get("/admin-dashboard", include_in_schema=False)
@app.get("/admin-dashboard/", include_in_schema=False)
def admin_dashboard_page():
    return render_frontend("admin_dashboard")


@app.get("/health", tags=["system"])
def health():
    return {"status": "ok", "service": "frontend"}
