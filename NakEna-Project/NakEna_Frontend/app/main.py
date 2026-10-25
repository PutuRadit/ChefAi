import os
from html import escape
from pathlib import Path

from fastapi import FastAPI, Request, UploadFile, File
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

BASE_DIR = Path(__file__).resolve().parent.parent
TEMPLATES_DIR = BASE_DIR / "templates" / "nakena"
FRONTEND_ASSETS_DIR = BASE_DIR / "static" / "assets"
BACKEND_STATIC_DIR = (
    BASE_DIR.parent / "nakena-backend" / "app" / "web" / "static"
)
API_BASE_URL = os.getenv("NAKENA_API_BASE_URL", "http://127.0.0.1:8000").rstrip("/")

app = FastAPI(title="NakEna Frontend")
app.mount(
    "/static/assets",
    StaticFiles(directory=FRONTEND_ASSETS_DIR),
    name="frontend-assets",
)
app.mount(
    "/static",
    StaticFiles(directory=BACKEND_STATIC_DIR),
    name="integration-static",
)


def render(template_name: str) -> HTMLResponse:
    template_path = TEMPLATES_DIR / f"{template_name}.html"
    html = template_path.read_text(encoding="utf-8")
    integration_script = (
        f'<script src="/static/frontend.js?v=2" '
        f'data-api-base="{escape(API_BASE_URL, quote=True)}" defer></script>'
    )
    return HTMLResponse(html.replace("</body>", f"{integration_script}</body>"))


@app.get("/")
def home():
    return render("home")


@app.get("/login")
@app.get("/login/")
def login():
    return render("login")


@app.get("/register")
@app.get("/register/")
def register():
    return render("register")


@app.get("/scan")
@app.get("/scan/")
def scan():
    return render("scan")


@app.post("/scan/analyze/")
async def analyze_scan(request: Request, image: UploadFile = File(...)):
    return RedirectResponse(url="/scan/result/", status_code=303)


@app.get("/scan/result/")
def scan_result():
    return render("detection_result")


@app.get("/recipes/")
def recipes():
    return render("recipes")


@app.get("/recipes/{recipe_id}/")
def recipe_detail(recipe_id: int):
    return render("recipe_detail")


@app.get("/recipes/{recipe_id}/guided-cooking/")
def guided_cooking(recipe_id: int):
    return render("guided_cooking")


@app.get("/history/")
def history():
    return render("history")


@app.get("/favorites/")
def favorites():
    return render("favorites")


@app.get("/profile/")
def profile():
    return render("profile")


@app.get("/admin-dashboard/")
def admin_dashboard():
    return render("admin_dashboard")
