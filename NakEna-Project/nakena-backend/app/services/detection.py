from functools import lru_cache
from io import BytesIO
from pathlib import Path

from PIL import Image
from ultralytics import YOLO

from app.core.config import settings
from app.schemas.detection import IngredientDetection


class ModelUnavailableError(RuntimeError):
    pass


@lru_cache(maxsize=1)
def _load_model(model_path: str) -> YOLO:
    path = Path(model_path)
    if not path.is_file():
        raise ModelUnavailableError(f"Model deteksi tidak ditemukan: {path}")
    try:
        return YOLO(str(path))
    except Exception as exc:
        raise ModelUnavailableError("Model deteksi gagal dimuat") from exc


def detect_ingredients(image_data: bytes) -> list[IngredientDetection]:
    model = _load_model(str(settings.yolo_model_path))
    with Image.open(BytesIO(image_data)) as image:
        source = image.convert("RGB")

    results = model.predict(
        source=source,
        conf=settings.yolo_confidence,
        verbose=False,
    )

    detections: list[IngredientDetection] = []
    for result in results:
        if result.boxes is None:
            continue
        names = result.names
        for class_id, confidence, coordinates in zip(
            result.boxes.cls.tolist(),
            result.boxes.conf.tolist(),
            result.boxes.xyxy.tolist(),
        ):
            label = names[int(class_id)]
            detections.append(
                IngredientDetection(
                    name=str(label).strip(),
                    confidence=float(confidence),
                    box=[float(value) for value in coordinates],
                )
            )
    return detections
