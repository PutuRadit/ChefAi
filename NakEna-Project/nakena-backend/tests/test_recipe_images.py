"""Offline Pixabay integration checks; no real credentials or API requests."""

import io
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import URLError
from urllib.parse import parse_qs, urlsplit

os.environ.setdefault("SECRET_KEY", "image-test-key-image-test-key-1234567890")

from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.api.deps import require_regular_user
from app.api.routes import recipe_images as recipe_images_route
from app.api.routes.recipe_images import router
from app.models import User
from app.services import recipe_images as images


JPEG = b"\xff\xd8\xff" + b"test-image-data"


class FakeResponse(io.BytesIO):
    def __init__(self, data, content_type):
        super().__init__(data)
        self.headers = {"Content-Type": content_type}


def hit(**overrides):
    value = {
        "id": 1234,
        "type": "photo",
        "tags": "chicken, food, garlic, fried",
        "webformatURL": "https://pixabay.com/get/test_640.jpg",
        "pageURL": "https://pixabay.com/photos/garlic-fried-chicken-1234/",
        "user": "Test Chef",
    }
    value.update(overrides)
    return value


class RecipeImageTests(unittest.TestCase):
    def setUp(self):
        self.previous = images.settings.pixabay_api_key
        self.temp_dir = tempfile.TemporaryDirectory()
        self.previous_upload_dir = images.settings.upload_dir
        images.settings.pixabay_api_key = SecretStr("offline-test-key")
        images.settings.upload_dir = self.temp_dir.name
        images._cache.clear()

    def tearDown(self):
        images.settings.pixabay_api_key = self.previous
        images.settings.upload_dir = self.previous_upload_dir
        images._cache.clear()
        self.temp_dir.cleanup()

    def test_dish_queries_use_method_and_main_ingredient(self):
        self.assertEqual(images.search_query("Ayam Goreng Bawang Putih Simple"), "garlic fried chicken")
        self.assertEqual(images.search_query("Tumis Ayam Bawang Putih"), "garlic chicken stir fry")
        self.assertEqual(images.search_query("Sup Brokoli", "ayam, garam"), "vegetables soup")
        self.assertEqual(images.search_query("Nasi Goreng Ayam"), "chicken fried rice")
        self.assertEqual(images.search_query("Omelet Sayur"), "vegetable omelette")

    def test_missing_key_does_not_contact_provider(self):
        images.settings.pixabay_api_key = None
        with patch.object(images, "_get_json") as request:
            self.assertEqual(images.find_recipe_image("Ayam Goreng")["status"], "disabled")
            request.assert_not_called()

    def test_food_photo_is_downloaded_locally_and_cached(self):
        with patch.object(images, "_get_json", return_value={"hits": [hit()]}) as request, patch.object(
            images, "_get_bytes", return_value=("image/jpeg", JPEG)
        ) as download:
            result = images.find_recipe_image("Ayam Goreng Bawang Putih")
            second = images.find_recipe_image("Ayam Goreng Bawang Putih Gurih")
        self.assertEqual(result, second)
        self.assertEqual(request.call_count, 1)
        self.assertEqual(download.call_count, 1)
        self.assertEqual(result["source"], "pixabay")
        self.assertIsNone(result["image_url"])
        self.assertEqual(result["photographer"], "Test Chef")
        self.assertEqual(result["photo_url"], hit()["pageURL"])
        self.assertEqual((Path(self.temp_dir.name) / "recipe_images" / result["asset_key"]).read_bytes(), JPEG)
        query = parse_qs(urlsplit(request.call_args.args[0]).query)
        self.assertEqual(query["key"], ["offline-test-key"])
        self.assertEqual(query["q"], ["garlic fried chicken"])
        self.assertEqual(query["category"], ["food"])
        self.assertEqual(query["image_type"], ["photo"])
        self.assertEqual(query["safesearch"], ["true"])
        self.assertEqual(query["orientation"], ["horizontal"])
        self.assertNotIn("offline-test-key", json.dumps(result))

    def test_persistent_cache_prevents_api_requests_after_memory_cache_is_cleared(self):
        with patch.object(images, "_get_json", return_value={"hits": [hit()]}), patch.object(
            images, "_get_bytes", return_value=("image/jpeg", JPEG)
        ):
            result = images.find_recipe_image("Ayam Goreng")
        images._cache.clear()
        with patch.object(images, "_get_json") as request:
            second = images.find_recipe_image("Ayam Goreng")
        request.assert_not_called()
        self.assertEqual(result, second)

    def test_non_food_categories_non_photos_and_untrusted_urls_are_rejected(self):
        unsafe_hits = [
            hit(type="illustration"),
            hit(webformatURL="https://example.invalid/food.jpg"),
            hit(pageURL="https://example.invalid/photos/food"),
        ]
        with patch.object(images, "_get_json", return_value={"hits": unsafe_hits}) as request:
            result = images.find_recipe_image("Ayam goreng")
        self.assertEqual(result["status"], "not_found")
        request.assert_called_once()

    def test_empty_and_provider_errors_are_optional(self):
        for response in [{"hits": []}, URLError("network unavailable")]:
            with self.subTest(response=response):
                images._cache.clear()
                side_effect = response if isinstance(response, Exception) else response
                with patch.object(images, "_get_json", side_effect=side_effect):
                    result = images.find_recipe_image("Ayam goreng")
                self.assertIsNone(result["image_url"])
                self.assertIn(result["status"], ("not_found", "unavailable"))

    def test_invalid_image_bytes_are_not_served(self):
        with patch.object(images, "_get_json", return_value={"hits": [hit()]}), patch.object(
            images, "_get_bytes", return_value=("image/jpeg", b"not an image")
        ):
            result = images.find_recipe_image("Ayam goreng")
        self.assertEqual(result["status"], "not_found")

    def test_api_key_is_not_logged_or_returned_to_frontend(self):
        with patch.object(images, "urlopen", return_value=FakeResponse(b'{"hits":[]}', "application/json")) as request:
            images._get_json("https://pixabay.com/api/?key=private-test-value&q=rice")
        actual = request.call_args.args[0]
        self.assertIn("private-test-value", actual.full_url)
        self.assertNotIn("private-test-value", json.dumps(images._empty("disabled", "rice")))
        self.assertEqual(request.call_args.kwargs["timeout"], 8)
        self.assertIsNone(images._NoRedirect().redirect_request(None, None, 302, "", {}, "https://example.invalid"))

    def test_route_requires_user_and_serves_local_images(self):
        app = FastAPI()
        app.include_router(router)
        with TestClient(app) as client:
            self.assertEqual(client.get("/recipes/image", params={"title": "Ayam goreng"}).status_code, 401)
            app.dependency_overrides[require_regular_user] = lambda: User(
                id=1,
                email="chef@example.com",
                full_name="Chef",
                hashed_password="unused",
                role="user",
            )
            self.assertEqual(client.get("/recipes/image").status_code, 422)
            with patch.object(recipe_images_route, "find_recipe_image", return_value={
                **images._empty("ok", "fried chicken"),
                "status": "ok",
                "asset_key": "a" * 64 + ".jpg",
                "photo_url": hit()["pageURL"],
            }):
                Path(self.temp_dir.name, "recipe_images").mkdir()
                Path(self.temp_dir.name, "recipe_images", "a" * 64 + ".jpg").write_bytes(JPEG)
                response = client.get("/recipes/image", params={"title": "Ayam goreng"})
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json()["source"], "pixabay")
                self.assertTrue(response.json()["image_url"].endswith("/recipes/image/assets/" + "a" * 64 + ".jpg"))
                image_response = client.get(response.json()["image_url"])
                self.assertEqual(image_response.status_code, 200)
                self.assertEqual(image_response.content, JPEG)
                self.assertEqual(image_response.headers["cache-control"], "public, max-age=86400")
            self.assertEqual(client.get("/recipes/image/assets/invalid").status_code, 404)
            app.dependency_overrides.clear()


if __name__ == "__main__":
    unittest.main()
