"""Detection post-processing checks with a fake YOLO model; no weights are loaded."""

import os
from io import BytesIO
from pathlib import Path

import pytest
import yaml
from PIL import Image

os.environ.setdefault("SECRET_KEY", "detection-test-key-detection-test-key-123456")

from app.services import detection


class FakeTensor(list):
    def tolist(self):
        return list(self)


class FakeBoxes:
    def __init__(self, rows):
        self.cls = FakeTensor(row[0] for row in rows)
        self.conf = FakeTensor(row[1] for row in rows)
        self.xyxy = FakeTensor(row[2] for row in rows)


class FakeResult:
    def __init__(self, names, rows):
        self.names = names
        self.boxes = FakeBoxes(rows)


class FakeModel:
    def __init__(self, names, rows):
        self.result = FakeResult(names, rows)
        self.calls = []

    def predict(self, **kwargs):
        self.calls.append(kwargs)
        return [self.result]


def jpeg_bytes():
    buffer = BytesIO()
    Image.new("RGB", (32, 32), "white").save(buffer, format="JPEG")
    return buffer.getvalue()


def test_predict_uses_class_agnostic_nms(monkeypatch):
    model = FakeModel({0: "Telur"}, [(0, 0.9, [1, 2, 3, 4])])
    monkeypatch.setattr(detection, "_load_model", lambda path: model)
    detections = detection.detect_ingredients(jpeg_bytes())
    assert model.calls[0]["agnostic_nms"] is True
    assert model.calls[0]["conf"] == detection.settings.yolo_confidence
    assert [item.name for item in detections] == ["Telur"]


def test_english_and_bracketed_labels_get_indonesian_names(monkeypatch):
    names = {0: "Bawang (onion umum)", 1: "White Rice", 2: "Spinach", 3: "Bayam"}
    rows = [(0, 0.8, [0, 0, 1, 1]), (1, 0.7, [0, 0, 1, 1]), (2, 0.6, [0, 0, 1, 1]), (3, 0.5, [0, 0, 1, 1])]
    monkeypatch.setattr(detection, "_load_model", lambda path: FakeModel(names, rows))
    detected = [item.name for item in detection.detect_ingredients(jpeg_bytes())]
    # Spinach keeps its own name: classes are renamed, never merged.
    assert detected == ["Bawang", "Nasi Putih", "Spinach", "Bayam"]


def test_display_names_match_model_classes_without_collisions():
    data_yaml = Path(__file__).resolve().parents[3] / "Yolo Training" / "NakEna_YOLO_Gabungan_Model" / "dataset_data.yaml"
    if not data_yaml.is_file():
        pytest.skip("Laporan training YOLO tidak tersedia di checkout ini")
    classes = yaml.safe_load(data_yaml.read_text(encoding="utf-8"))["names"]
    assert set(detection.DISPLAY_NAMES) <= set(classes)
    shown = [detection.display_name(name) for name in classes]
    assert len(shown) == len(set(shown)), "dua kelas berbeda tidak boleh tampil dengan nama yang sama"
