import os
from html import escape
from pathlib import Path

from fastapi import FastAPI, Request, UploadFile, File
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

BASE_DIR = Path(__file__).resolve().parent.parent
INTEGRATION_STATIC_DIR = BASE_DIR.parent / "nakena-backend" / "app" / "web" / "static"
API_BASE_URL = os.getenv("NAKENA_API_BASE_URL", "http://localhost:8000").rstrip("/")
app = FastAPI(title="NakEna")
app.mount("/static", StaticFiles(directory=INTEGRATION_STATIC_DIR), name="static")
templates = Jinja2Templates(directory=BASE_DIR / "templates")


def render(template: str, request: Request, **context):
    response = templates.TemplateResponse(
        request=request,
        name=f"nakena/{template}.html",
        context=context,
    )
    script = (
        f'<script src="/static/frontend.js" data-api-base="{escape(API_BASE_URL, quote=True)}" defer></script>'
    )
    html = response.body.decode("utf-8").replace("</body>", f"{script}</body>")
    return HTMLResponse(html, status_code=response.status_code)


@app.get("/")
def home(request: Request): return render("home", request)

@app.get("/login/")
def login(request: Request): return render("login", request)

@app.get("/register/")
def register(request: Request): return render("register", request)

@app.get("/scan/")
def scan(request: Request): return render("scan", request)

@app.post("/scan/analyze/")
async def analyze_scan(request: Request, image: UploadFile = File(...)):
    # TODO: simpan file dan panggil model YOLOv8 milik project kamu.
    # Untuk sementara, tampilkan halaman hasil analisis prototype.
    return RedirectResponse(url="/scan/result/", status_code=303)

@app.get("/scan/result/")
def scan_result(request: Request): return render("detection_result", request)

@app.get("/recipes/")
def recipes(request: Request): return render("recipes", request)

@app.get("/recipes/{recipe_id}/")
def recipe_detail(request: Request, recipe_id: int): return render("recipe_detail", request, recipe_id=recipe_id)

@app.get("/recipes/{recipe_id}/guided-cooking/")
def guided_cooking(request: Request, recipe_id: int): return render("guided_cooking", request, recipe_id=recipe_id)

@app.get("/history/")
def history(request: Request): return render("history", request)

@app.get("/favorites/")
def favorites(request: Request): return render("favorites", request)

@app.get("/profile/")
def profile(request: Request): return render("profile", request)

@app.get("/admin-dashboard/")
def admin_dashboard(request: Request): return render("admin_dashboard", request)
