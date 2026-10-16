from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app import models  # noqa: F401
from app.api.routes import auth, recipes, uploads, users
from app.core.config import settings
from app.core.database import Base, engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Sementara: membuat tabel otomatis saat aplikasi dijalankan.
    # Nantinya dapat diganti menggunakan Alembic.
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.app_name,
    debug=settings.debug,
    lifespan=lifespan
)

web_dir = Path(__file__).parent / "web"
frontend_dir = Path(__file__).resolve().parents[2] / "NakEna_Frontend"
frontend_templates_dir = frontend_dir / "templates" / "nakena"
app.mount("/static", StaticFiles(directory=web_dir / "static"), name="static")


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth.router)
app.include_router(users.router)
app.include_router(uploads.router)
app.include_router(recipes.router)


def render_frontend(request: Request, template_name: str, **context):
    html = (frontend_templates_dir / f"{template_name}.html").read_text(encoding="utf-8")
    html = html.replace("</body>", '<script src="/static/frontend.js" defer></script></body>')
    return HTMLResponse(html)


@app.get("/", include_in_schema=False)
def home_page(request: Request):
    return render_frontend(request, "home")


@app.get("/login", include_in_schema=False)
@app.get("/login/", include_in_schema=False)
def login_page(request: Request):
    return render_frontend(request, "login")


@app.get("/register", include_in_schema=False)
@app.get("/register/", include_in_schema=False)
def register_page(request: Request):
    return render_frontend(request, "register")


@app.get("/scan/", include_in_schema=False)
def scan_page(request: Request):
    return render_frontend(request, "scan")


@app.get("/scan/result/", include_in_schema=False)
def scan_result_page(request: Request):
    return render_frontend(request, "detection_result")


@app.get("/recipes/", include_in_schema=False)
def recipes_page(request: Request):
    return render_frontend(request, "recipes")


@app.get("/recipes/{recipe_id}/", include_in_schema=False)
def recipe_detail_page(request: Request, recipe_id: int):
    return render_frontend(request, "recipe_detail", recipe_id=recipe_id)


@app.get("/recipes/{recipe_id}/guided-cooking/", include_in_schema=False)
def guided_cooking_page(request: Request, recipe_id: int):
    return render_frontend(request, "guided_cooking", recipe_id=recipe_id)


@app.get("/history/", include_in_schema=False)
def history_page(request: Request):
    return render_frontend(request, "history")


@app.get("/favorites/", include_in_schema=False)
def favorites_page(request: Request):
    return render_frontend(request, "favorites")


@app.get("/profile/", include_in_schema=False)
def profile_page(request: Request):
    return render_frontend(request, "profile")


@app.get("/admin-dashboard/", include_in_schema=False)
def admin_dashboard_page(request: Request):
    return render_frontend(request, "admin_dashboard")


@app.get("/health", tags=["system"])
def health():
    return {"status": "ok"}
