from functools import lru_cache
from io import BytesIO
from pathlib import Path

from PIL import Image
from ultralytics import YOLO

from app.core.config import settings
from app.schemas.detection import IngredientDetection


class ModelUnavailableError(RuntimeError):
    pass


# Indonesian names for model classes that are still in English or carry a
# note in brackets. Classes are never merged here: a class that has an
# Indonesian twin in the model (e.g. "Spinach" next to "Bayam") keeps its name.
DISPLAY_NAMES = {
    "Bawang (onion umum)": "Bawang",
    "Cabai (umum)": "Cabai",
    "Buncis (green beans)": "Buncis",
    "Blueberries": "Bluberi",
    "Cantaloupe": "Melon",
    "Chocolate": "Cokelat",
    "Dragon Fruit": "Buah Naga",
    "Goat Cheese": "Keju Kambing",
    "Heavy Cream": "Krim Kental",
    "Lime": "Jeruk Nipis",
    "Mint Leaves": "Daun Mint",
    "White Radish": "Lobak Putih",
    "White Rice": "Nasi Putih",
    "Zucchini": "Zukini",
}


def display_name(label: str) -> str:
    label = str(label).strip()
    return DISPLAY_NAMES.get(label, label)


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
        imgsz=800,
        # One object gets one label: without this, boxes of different classes
        # on the same item (e.g. Terong and Alpukat) are both kept.
        agnostic_nms=True,
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
            detections.append(
                IngredientDetection(
                    name=display_name(names[int(class_id)]),
                    confidence=float(confidence),
                    box=[float(value) for value in coordinates],
                )
            )
    return detections
