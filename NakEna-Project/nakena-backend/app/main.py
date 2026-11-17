"""FastAPI application entry point for the NakEna API.

The frontend is served independently by ../NakEna_Frontend on port 8001.
This service exposes JSON endpoints only.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models  # noqa: F401 - register SQLAlchemy models
from app.api.routes import admin, auth, recipe_images, recipes, uploads, users
from app.core.config import settings
from app.core.bootstrap import seed_admin_user
from app.core.database import Base, SessionLocal, engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_admin_user(db, settings)
    yield


app = FastAPI(
    title=settings.app_name,
    debug=settings.debug,
    lifespan=lifespan,
)

# Keep the bundled frontend reachable when an older .env overrides the
# default origin list. Retain any other origins configured by the project.
frontend_origins = (
    "http://127.0.0.1:8001",
    "http://localhost:8001",
)
cors_origins = list(dict.fromkeys([*settings.cors_origins, *frontend_origins]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(users.router)
app.include_router(uploads.router)
app.include_router(recipes.router)
app.include_router(recipe_images.router)


@app.get("/", tags=["system"])
def service_info():
    return {
        "service": settings.app_name,
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health", tags=["system"])
def health():
    return {"status": "ok"}
