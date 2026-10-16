from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
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


@app.get("/", include_in_schema=False)
def home_page():
    return FileResponse(web_dir / "home.html")


@app.get("/login", include_in_schema=False)
def login_page():
    return FileResponse(web_dir / "login.html")


@app.get("/health", tags=["system"])
def health():
    return {"status": "ok"}
