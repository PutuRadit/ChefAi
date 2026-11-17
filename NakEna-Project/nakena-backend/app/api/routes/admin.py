from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.database import get_db
from app.models import User
from app.schemas.user import UserRead
from app.services.storage import StorageBackend, get_storage

router = APIRouter(prefix="/admin", tags=["admin"])


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
