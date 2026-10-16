import os
import tempfile

# Harus diset SEBELUM app di-import
os.environ["SECRET_KEY"] = "test-secret-key-test-secret-key-1234567890"
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["UPLOAD_DIR"] = tempfile.mkdtemp(prefix="nakena-test-uploads-")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.core.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture()
def client():
    Base.metadata.create_all(bind=engine)
    yield TestClient(app)
    Base.metadata.drop_all(bind=engine)


def register_and_login(client, email="budi@example.com", password="rahasia123", name="Budi"):
    r = client.post("/auth/register", json={"email": email, "password": password, "full_name": name})
    assert r.status_code == 201, r.text
    r = client.post("/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}
