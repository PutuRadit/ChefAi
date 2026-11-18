from datetime import date, datetime, time, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.database import get_db
from app.models import RecipeEntry, RecipeReview, Upload, User
from app.schemas.admin import AdminDashboardRead
from app.schemas.user import UserRead
from app.services.storage import StorageBackend, get_storage

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/dashboard", response_model=AdminDashboardRead)
def get_dashboard_data(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    today = datetime.now(timezone.utc).date()
    first_day = today - timedelta(days=6)
    cutoff = datetime.combine(first_day, time.min, tzinfo=timezone.utc)
    activity = {
        (first_day + timedelta(days=offset)).isoformat(): {
            "date": first_day + timedelta(days=offset),
            "users": 0,
            "recipes": 0,
        }
        for offset in range(7)
    }

    user_days = db.execute(
        select(func.date(User.created_at), func.count(User.id))
        .where(User.role == "user", User.created_at >= cutoff)
        .group_by(func.date(User.created_at))
    )
    for day, count in user_days:
        day_key = day.isoformat() if isinstance(day, date) else str(day)
        if day_key in activity:
            activity[day_key]["users"] = count

    recipe_days = db.execute(
        select(func.date(RecipeEntry.created_at), func.count(RecipeEntry.id))
        .where(RecipeEntry.is_history.is_(True), RecipeEntry.created_at >= cutoff)
        .group_by(func.date(RecipeEntry.created_at))
    )
    for day, count in recipe_days:
        day_key = day.isoformat() if isinstance(day, date) else str(day)
        if day_key in activity:
            activity[day_key]["recipes"] = count

    user_count = db.scalar(
        select(func.count(User.id)).where(User.role == "user")
    ) or 0
    recipe_count = db.scalar(
        select(func.count(RecipeEntry.id)).where(RecipeEntry.is_history.is_(True))
    ) or 0
    review_count = db.scalar(select(func.count(RecipeReview.id))) or 0
    upload_count = db.scalar(select(func.count(Upload.id))) or 0
    average_rating = db.scalar(select(func.avg(RecipeReview.rating))) or 0
    rating_counts = dict(
        db.execute(
            select(RecipeReview.rating, func.count(RecipeReview.id))
            .group_by(RecipeReview.rating)
        ).all()
    )
    recent_reviews = db.execute(
        select(
            RecipeReview.id,
            User.full_name,
            User.email,
            RecipeEntry.title,
            RecipeReview.rating,
            RecipeReview.comment,
            RecipeReview.created_at,
        )
        .join(User, User.id == RecipeReview.user_id)
        .join(RecipeEntry, RecipeEntry.id == RecipeReview.recipe_entry_id)
        .order_by(RecipeReview.created_at.desc(), RecipeReview.id.desc())
        .limit(20)
    )
    upload_status_counts = db.execute(
        select(Upload.status, func.count(Upload.id))
        .group_by(Upload.status)
        .order_by(Upload.status)
    )
    recent_uploads = db.execute(
        select(
            Upload.id,
            Upload.original_filename,
            Upload.status,
            User.full_name,
            User.email,
            Upload.created_at,
        )
        .join(User, User.id == Upload.user_id)
        .order_by(Upload.created_at.desc(), Upload.id.desc())
        .limit(20)
    )
    recent_recipes = db.execute(
        select(
            RecipeEntry.id,
            RecipeEntry.title,
            User.full_name,
            User.email,
            RecipeEntry.created_at,
        )
        .join(User, User.id == RecipeEntry.user_id)
        .where(RecipeEntry.is_history.is_(True))
        .order_by(RecipeEntry.created_at.desc(), RecipeEntry.id.desc())
        .limit(20)
    )

    return {
        "totals": {
            "users": user_count,
            "recipes": recipe_count,
            "reviews": review_count,
            "uploads": upload_count,
            "average_rating": round(float(average_rating), 1),
        },
        "daily_activity": list(activity.values()),
        "rating_distribution": [
            {"rating": rating, "count": rating_counts.get(rating, 0)}
            for rating in range(1, 6)
        ],
        "recent_reviews": [
            {
                "id": review_id,
                "user_name": user_name,
                "user_email": user_email,
                "recipe_title": recipe_title,
                "rating": rating,
                "comment": comment,
                "created_at": created_at,
            }
            for (
                review_id,
                user_name,
                user_email,
                recipe_title,
                rating,
                comment,
                created_at,
            ) in recent_reviews
        ],
        "upload_status_counts": [
            {"status": upload_status, "count": count}
            for upload_status, count in upload_status_counts
        ],
        "recent_uploads": [
            {
                "id": upload_id,
                "filename": filename,
                "status": upload_status,
                "user_name": user_name,
                "user_email": user_email,
                "created_at": created_at,
            }
            for (
                upload_id,
                filename,
                upload_status,
                user_name,
                user_email,
                created_at,
            ) in recent_uploads
        ],
        "recent_recipes": [
            {
                "id": recipe_id,
                "title": title,
                "user_name": user_name,
                "user_email": user_email,
                "created_at": created_at,
            }
            for recipe_id, title, user_name, user_email, created_at in recent_recipes
        ],
    }


@router.get("/uploads/{upload_id}/image")
def get_uploaded_image(
    upload_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
    storage: StorageBackend = Depends(get_storage),
):
    upload = db.get(Upload, upload_id)
    if upload is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Upload tidak ditemukan")
    if upload.content_type not in {"image/jpeg", "image/png"}:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Format gambar tidak didukung")
    try:
        image = storage.read(upload.storage_key)
    except FileNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File gambar tidak ditemukan") from exc
    return Response(
        content=image,
        media_type=upload.content_type,
        headers={
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.get("/users", response_model=list[UserRead])
def list_users(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    statement = (
        select(User)
        .order_by(User.created_at.desc(), User.id.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(db.scalars(statement))


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
    storage: StorageBackend = Depends(get_storage),
):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pengguna tidak ditemukan")
    if user.id == current_admin.id:
        raise HTTPException(status.HTTP_409_CONFLICT, "Admin tidak dapat menghapus akunnya sendiri")
    if user.role == "admin":
        raise HTTPException(status.HTTP_409_CONFLICT, "Akun admin tidak dapat dihapus dari halaman ini")

    for upload in user.uploads:
        storage.delete(upload.storage_key)

    db.delete(user)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
