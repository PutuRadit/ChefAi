import os
import logging
from datetime import timedelta
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models import Upload, User
from app.models.user import utcnow
from app.schemas.detection import IngredientDetectionResponse
from app.schemas.upload import UploadRead
from app.services.detection import ModelUnavailableError, detect_ingredients
from app.services.images import InvalidImageError, UnsupportedImageError, sanitize_image
from app.services.storage import StorageBackend, get_storage

router = APIRouter(prefix="/uploads", tags=["uploads"])

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png"}
logger = logging.getLogger(__name__)


def _get_owned_upload(db: Session, user: User, upload_id: str) -> Upload:
    upload = db.get(Upload, upload_id)
    # 404 (bukan 403) agar keberadaan upload milik orang lain tidak terbongkar
    if upload is None or upload.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Upload tidak ditemukan")
    return upload


@router.post("", response_model=UploadRead, status_code=status.HTTP_201_CREATED)
def upload_image(
    file: UploadFile = File(..., description="Foto bahan makanan (JPEG/PNG)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage: StorageBackend = Depends(get_storage),
):
    """Menerima foto bahan makanan (multipart/form-data, field `file`).
    Deteksi YOLO belum dijalankan di sini; upload hanya disimpan dengan status `uploaded`."""
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Hanya JPEG atau PNG yang diterima")

    limit = settings.max_upload_size_bytes
    data = file.file.read(limit + 1)
    if len(data) > limit:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            f"Ukuran file maksimal {settings.max_upload_size_mb} MB",
        )
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "File kosong")

    try:
        image = sanitize_image(data)
    except UnsupportedImageError as exc:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, str(exc))
    except InvalidImageError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))

    upload_id = uuid4().hex
    key = f"{current_user.id}/{upload_id}{image.extension}"
    storage.save(key, image.content)

    now = utcnow()
    record = Upload(
        id=upload_id,
        user_id=current_user.id,
        storage_key=key,
        original_filename=(os.path.basename(file.filename or "") or "foto")[:255],
        content_type=image.content_type,
        size_bytes=len(image.content),
        width=image.width,
        height=image.height,
        created_at=now,
        expires_at=now + timedelta(days=settings.upload_retention_days),
    )
    db.add(record)
    try:
        db.commit()
    except Exception:
        db.rollback()
        storage.delete(key)  # jangan tinggalkan file yatim
        raise
    db.refresh(record)
    return record


@router.post("/{upload_id}/detect", response_model=IngredientDetectionResponse)
def detect_uploaded_image(
    upload_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage: StorageBackend = Depends(get_storage),
):
    upload = _get_owned_upload(db, current_user, upload_id)
    try:
        detections = detect_ingredients(storage.read(upload.storage_key))
    except ModelUnavailableError as exc:
        logger.exception("YOLO model unavailable for upload %s", upload_id)
        upload.status = "failed"
        db.commit()
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Model deteksi bahan tidak tersedia. Periksa YOLO_MODEL_PATH dan instal dependensi ultralytics.",
        ) from exc
    except Exception as exc:
        logger.exception("Ingredient detection failed for upload %s", upload_id)
        upload.status = "failed"
        db.commit()
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "Foto gagal diproses oleh model deteksi.",
        ) from exc

    ingredients = list(dict.fromkeys(detection.name for detection in detections))
    detection_status = "detected" if ingredients else "no_detections"
    upload.status = detection_status
    db.commit()
    return IngredientDetectionResponse(
        upload_id=upload.id,
        status=detection_status,
        ingredients=ingredients,
        detections=detections,
    )


@router.get("", response_model=list[UploadRead])
def list_uploads(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = (
        select(Upload)
        .where(Upload.user_id == current_user.id)
        .order_by(Upload.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(db.scalars(stmt))


@router.get("/{upload_id}", response_model=UploadRead)
def get_upload(
    upload_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _get_owned_upload(db, current_user, upload_id)


@router.delete("/{upload_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_upload(
    upload_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage: StorageBackend = Depends(get_storage),
):
    """Pengguna bisa menghapus fotonya sendiri sebelum masa retensi habis."""
    upload = _get_owned_upload(db, current_user, upload_id)
    storage.delete(upload.storage_key)
    db.delete(upload)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
