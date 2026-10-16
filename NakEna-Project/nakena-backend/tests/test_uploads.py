import io

from PIL import Image

from tests.conftest import register_and_login


def make_image(fmt="JPEG", size=(64, 48)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", size, "red").save(buf, format=fmt)
    return buf.getvalue()


def post_file(client, headers, content, filename="foto.jpg", content_type="image/jpeg"):
    return client.post("/uploads", headers=headers, files={"file": (filename, content, content_type)})


def test_upload_requires_auth(client):
    assert post_file(client, {}, make_image()).status_code == 401


def test_upload_jpeg_and_png_ok(client):
    headers = register_and_login(client)
    r = post_file(client, headers, make_image("JPEG"))
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["width"] == 64 and body["height"] == 48
    assert body["status"] == "uploaded"
    assert "storage_key" not in body

    r = post_file(client, headers, make_image("PNG"), "foto.png", "image/png")
    assert r.status_code == 201
    assert r.json()["content_type"] == "image/png"


def test_upload_rejects_wrong_type_and_fake_image(client):
    headers = register_and_login(client)
    assert post_file(client, headers, b"hello", "a.txt", "text/plain").status_code == 415
    # content-type bohong, isi bukan gambar
    assert post_file(client, headers, b"bukan gambar", "a.png", "image/png").status_code == 400
    # GIF valid tapi tidak diizinkan walau content-type diklaim jpeg
    assert post_file(client, headers, make_image("GIF"), "a.jpg", "image/jpeg").status_code == 415
    assert post_file(client, headers, b"", "a.jpg", "image/jpeg").status_code == 400


def test_upload_too_large(client, monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "max_upload_size_mb", 0)  # semua file > 0 byte ditolak
    headers = register_and_login(client)
    assert post_file(client, headers, make_image()).status_code == 413


def test_uploads_are_private_and_deletable(client):
    a = register_and_login(client, email="a@example.com")
    b = register_and_login(client, email="b@example.com")
    upload_id = post_file(client, a, make_image()).json()["id"]

    assert client.get(f"/uploads/{upload_id}", headers=a).status_code == 200
    assert client.get(f"/uploads/{upload_id}", headers=b).status_code == 404
    assert client.delete(f"/uploads/{upload_id}", headers=b).status_code == 404
    assert len(client.get("/uploads", headers=a).json()) == 1
    assert client.get("/uploads", headers=b).json() == []

    assert client.delete(f"/uploads/{upload_id}", headers=a).status_code == 204
    assert client.get(f"/uploads/{upload_id}", headers=a).status_code == 404
