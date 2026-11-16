"""Offline Unsplash integration checks; no real credentials or API requests."""

import io
import json
import os
import unittest
from unittest.mock import patch
from urllib.error import URLError
from urllib.parse import parse_qs, urlsplit

os.environ.setdefault("SECRET_KEY", "image-test-key-image-test-key-1234567890")

from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.api.routes.recipe_images import router
from app.services import recipe_images as images


def photo():
    return {
        "id": "test-photo",
        "alt_description": "Garlic fried chicken on a plate",
        "urls": {"regular": "https://images.unsplash.com/test-photo?w=1080&ixid=test"},
        "user": {"name": "Test Photographer", "links": {"html": "https://unsplash.com/@test"}},
        "links": {
            "html": "https://unsplash.com/photos/test-photo",
            "download_location": "https://api.unsplash.com/photos/test-photo/download?ixid=test",
        },
    }


class RecipeImageTests(unittest.TestCase):
    def setUp(self):
        self.previous = images.settings.unsplash_access_key
        images.settings.unsplash_access_key = SecretStr("offline-test-key")
        images._cache.clear()

    def tearDown(self):
        images.settings.unsplash_access_key = self.previous
        images._cache.clear()

    def test_dish_queries_use_method_and_main_ingredient(self):
        self.assertEqual(images.search_query("Ayam Goreng Bawang Putih Simple"), "garlic fried chicken")
        self.assertEqual(images.search_query("Tumis Ayam Bawang Putih"), "garlic chicken stir fry")
        self.assertEqual(images.search_query("Sup Brokoli", "ayam, garam"), "vegetables soup")
        self.assertEqual(images.search_query("Nasi Goreng Ayam"), "chicken fried rice")
        self.assertEqual(images.search_query("Omelet Sayur"), "vegetable omelette")

    def test_missing_key_does_not_contact_provider(self):
        images.settings.unsplash_access_key = None
        with patch.object(images, "_get_json") as request:
            self.assertEqual(images.find_recipe_image("Ayam Goreng")["status"], "disabled")
            request.assert_not_called()

    def test_success_hotlinks_credits_tracks_and_caches(self):
        with patch.object(images, "_get_json", side_effect=[{"results": [photo()]}, {"url": "unused"}]) as request:
            result = images.find_recipe_image("Ayam Goreng Bawang Putih")
            second = images.find_recipe_image("Ayam Goreng Bawang Putih Gurih")
        self.assertEqual(result, second)
        self.assertEqual(request.call_count, 2)
        self.assertEqual(result["image_url"], photo()["urls"]["regular"])
        self.assertEqual(result["photographer"], "Test Photographer")
        self.assertEqual(parse_qs(urlsplit(result["photo_url"]).query)["utm_source"], ["nakena"])
        self.assertIn("utm_medium=referral", result["photographer_url"])
        self.assertEqual(request.call_args_list[1].args[0], photo()["links"]["download_location"])
        self.assertNotIn("offline-test-key", json.dumps(result))
        query = parse_qs(urlsplit(request.call_args_list[0].args[0]).query)
        self.assertEqual(query["orientation"], ["landscape"])
        self.assertEqual(query["query"], ["garlic fried chicken"])

    def test_empty_and_provider_errors_are_optional(self):
        for response in [{"results": []}, URLError("network unavailable")]:
            with self.subTest(response=response):
                images._cache.clear()
                with patch.object(images, "_get_json", side_effect=response if isinstance(response, Exception) else [response]):
                    result = images.find_recipe_image("Ayam goreng")
                self.assertIsNone(result["image_url"])
                self.assertIn(result["status"], ("not_found", "unavailable"))

    def test_failed_tracking_does_not_attach_untracked_photo(self):
        with patch.object(images, "_get_json", side_effect=[{"results": [photo()]}, URLError("tracking failed")]):
            self.assertEqual(images.find_recipe_image("Ayam goreng")["status"], "unavailable")

    def test_invalid_hosts_are_rejected_before_tracking(self):
        item = photo()
        item["links"]["download_location"] = "https://example.invalid/photos/test/download"
        with patch.object(images, "_get_json", return_value={"results": [item]}) as request:
            self.assertEqual(images.find_recipe_image("Ayam goreng")["status"], "not_found")
            self.assertEqual(request.call_count, 1)

    def test_failed_search_is_cached_briefly(self):
        with patch.object(images, "_get_json", side_effect=URLError("network unavailable")) as request:
            images.find_recipe_image("Ayam goreng")
            images.find_recipe_image("Ayam goreng")
            self.assertEqual(request.call_count, 1)

    def test_credentials_are_only_in_authorization_header(self):
        with patch.object(images, "urlopen", return_value=io.BytesIO(b'{"results":[]}')) as request:
            images._get_json("https://api.unsplash.com/search/photos?query=rice", "private-test-value")
        actual = request.call_args.args[0]
        self.assertEqual(actual.get_header("Authorization"), "Client-ID private-test-value")
        self.assertNotIn("private-test-value", actual.full_url)
        self.assertEqual(request.call_args.kwargs["timeout"], 5)
        self.assertIsNone(images._NoRedirect().redirect_request(None, None, 302, "", {}, "https://example.invalid"))

    def test_route_works_for_guest_and_validates_title(self):
        app = FastAPI()
        app.include_router(router)
        with TestClient(app) as client:
            self.assertEqual(client.get("/recipes/image").status_code, 422)
            self.assertEqual(client.get("/recipes/image", params={"title": "a" * 201}).status_code, 422)
            images.settings.unsplash_access_key = None
            response = client.get("/recipes/image", params={"title": "Ayam goreng"})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["status"], "disabled")
            images.settings.unsplash_access_key = SecretStr("offline-test-key")
            with patch.object(images, "_get_json", side_effect=[{"results": [photo()]}, {"url": "unused"}]):
                response = client.get("/recipes/image", params={"title": "Ayam goreng"})
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json()["source"], "unsplash")
                self.assertTrue(response.json()["image_url"].startswith("https://images.unsplash.com/"))


if __name__ == "__main__":
    unittest.main()
