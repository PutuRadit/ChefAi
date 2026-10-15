from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import User, UserPreference
from app.schemas.preference import PreferenceIn, PreferenceRead
from app.schemas.user import UserRead, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserRead)
def read_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserRead)
def update_me(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.full_name is not None:
        current_user.full_name = payload.full_name
    db.commit()
    db.refresh(current_user)
    return current_user


def _get_or_create_preference(db: Session, user: User) -> UserPreference:
    pref = user.preference
    if pref is None:
        pref = UserPreference(user_id=user.id)
        db.add(pref)
        db.flush()
    return pref


@router.get("/me/preferences", response_model=PreferenceRead)
def read_preferences(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    pref = _get_or_create_preference(db, current_user)
    db.commit()
    db.refresh(pref)
    return pref


@router.put("/me/preferences", response_model=PreferenceRead)
def replace_preferences(
    payload: PreferenceIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mengganti seluruh preferensi. Field yang tidak dikirim kembali ke nilai kosong."""
    pref = _get_or_create_preference(db, current_user)
    for field, value in payload.model_dump().items():
        setattr(pref, field, value)
    db.commit()
    db.refresh(pref)
    return pref


@router.patch("/me/preferences", response_model=PreferenceRead)
def update_preferences(
    payload: PreferenceIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mengubah sebagian preferensi: hanya field yang dikirim yang berubah."""
    pref = _get_or_create_preference(db, current_user)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(pref, field, value)
    db.commit()
    db.refresh(pref)
    return pref
