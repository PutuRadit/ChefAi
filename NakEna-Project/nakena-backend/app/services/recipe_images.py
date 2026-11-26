"""Find and locally cache Pixabay food photos without blocking recipe generation."""

import hashlib
import json
import logging
import re
from collections import OrderedDict
from pathlib import Path
from threading import Lock
from time import monotonic, time
from urllib.error import URLError
from urllib.parse import urlencode, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

from app.core.config import settings

logger = logging.getLogger(__name__)
_cache = OrderedDict()
_lock = Lock()
_TTL = 24 * 60 * 60
_FAILURE_TTL = 60
_MAX_CACHE = 128
_MAX_IMAGE_BYTES = 8 * 1024 * 1024
_MAX_DOWNLOAD_ATTEMPTS = 4
_EXTENSIONS = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}


class _NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        return None


urlopen = build_opener(_NoRedirect()).open


def _has(text, words):
    return any(re.search(r"\b" + re.escape(word) + r"\b", text) for word in words)


def search_query(title: str, ingredients: str = "") -> str:
    """Use dish type and cooking method, not creative recipe suffixes."""
    title = re.sub(r"[^a-z0-9\s-]", " ", title.casefold())
    ingredients = ingredients.casefold()
    if "nasi goreng" in title:
        return "chicken fried rice" if _has(title, ("ayam", "chicken")) else "indonesian fried rice"
    if _has(title, ("mie goreng", "mi goreng")):
        return "fried noodles"
    for words, query in [
        (("omelet", "omelette", "telur dadar"), "vegetable omelette"),
        (("telur balado",), "spicy eggs"),
        (("sate", "satay"), "chicken satay"),
        (("rendang",), "beef rendang"),
        (("gado gado", "salad"), "vegetable salad"),
        (("pancake", "panekuk"), "pancakes"),
    ]:
        if _has(title, words):
            return query
    proteins = [
        (("ayam", "chicken"), "chicken"), (("sapi", "beef"), "beef"),
        (("udang", "shrimp"), "shrimp"), (("ikan", "fish"), "fish"),
        (("tempe", "tempeh"), "tempeh"), (("tahu", "tofu"), "tofu"),
        (("telur", "eggs"), "eggs"), (("jamur", "mushrooms"), "mushrooms"),
        (("kentang", "potato"), "potatoes"),
        (("sayur", "brokoli", "buncis", "wortel", "vegetables"), "vegetables"),
        (("nasi", "rice"), "rice"), (("mie", "mi", "noodles"), "noodles"),
    ]
    food = next((food for words, food in proteins if _has(title, words)), "")
    if not food:
        food = next((food for words, food in proteins if _has(ingredients, words)), "food")
    if _has(title, ("sup", "sop", "soto", "kuah", "soup")):
        query = food + " soup"
    elif _has(title, ("tumis", "tumisan", "stir fry")):
        query = food + " stir fry"
    elif _has(title, ("panggang", "bakar", "grilled")):
        query = "grilled " + food
    elif _has(title, ("goreng", "fried")):
        query = "fried " + food
    elif _has(title, ("kari", "gulai", "curry")):
        query = food + " curry"
    elif _has(title, ("kukus", "steamed")):
        query = "steamed " + food
    else:
        query = "cooked " + food
    if "bawang putih" in title and food not in ("rice", "noodles"):
        query = "garlic " + query
    return query


def _cache_dir() -> Path:
    return Path(settings.upload_dir).resolve() / "recipe_images"


def _asset_path(asset_key: str) -> Path | None:
    if not re.fullmatch(r"[a-f0-9]{64}\.(?:jpg|png|webp)", asset_key):
        return None
    return _cache_dir() / asset_key


def _empty(status, query):
    return {
        "status": status, "query": query, "source": "pixabay",
        "image_url": None, "asset_key": None, "alt": "",
        "photographer": "", "photo_url": "",
    }


def _get_bytes(url, *, limit):
    request = Request(url, headers={"User-Agent": "NakEna/1.0", "Accept": "application/json, image/*"})
    with urlopen(request, timeout=8) as response:
        content_type = response.headers.get("Content-Type", "").split(";", 1)[0].strip().lower()
        raw = response.read(limit + 1)
    if len(raw) > limit:
        raise ValueError("Pixabay response exceeded size limit")
    return content_type, raw


def _get_json(url):
    _, raw = _get_bytes(url, limit=2 * 1024 * 1024)
    return json.loads(raw)


def _safe_image_url(value):
    if not isinstance(value, str):
        return ""
    parts = urlsplit(value)
    allowed = (
        (parts.netloc == "pixabay.com" and parts.path.startswith("/get/"))
        or (parts.netloc == "cdn.pixabay.com" and parts.path.startswith("/photo/"))
    )
    return value if parts.scheme == "https" and allowed and not parts.username and not parts.password else ""


def _image_urls(hit):
    """Download URLs for one hit, best first.

    Cloudflare in front of pixabay.com/get/ answers server downloads with
    HTTP 429, while cdn.pixabay.com serves the same 640 px size: Pixabay
    documents swapping the size suffix of a CDN URL (_150 -> _640). The API's
    own image URLs stay as fallbacks.
    """
    urls = []
    preview = _safe_image_url(hit.get("previewURL"))
    if preview and urlsplit(preview).netloc == "cdn.pixabay.com" and "_150." in preview:
        urls.append(preview.replace("_150.", "_640.", 1))
    for field in ("webformatURL", "largeImageURL"):
        url = _safe_image_url(hit.get(field))
        if url and url not in urls:
            urls.append(url)
    return urls


def _safe_page_url(value):
    if not isinstance(value, str):
        return ""
    parts = urlsplit(value)
    if parts.scheme != "https" or parts.netloc != "pixabay.com" or not parts.path.startswith("/"):
        return ""
    return value


def _is_image(content_type, data):
    return (
        (content_type == "image/jpeg" and data.startswith(b"\xff\xd8\xff"))
        or (content_type == "image/png" and data.startswith(b"\x89PNG\r\n\x1a\n"))
        or (
            content_type == "image/webp"
            and len(data) >= 12
            and data.startswith(b"RIFF")
            and data[8:12] == b"WEBP"
        )
    )


def _persist_metadata(cache_path, result):
    payload = {**result, "expires_at": time() + _TTL}
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = cache_path.with_suffix(".tmp")
    temporary_path.write_text(json.dumps(payload), encoding="utf-8")
    temporary_path.replace(cache_path)


def _read_persisted(cache_path, query):
    try:
        payload = json.loads(cache_path.read_text(encoding="utf-8"))
        if payload.get("expires_at", 0) <= time() or payload.get("query") != query:
            return None
        asset_key = payload.get("asset_key")
        if asset_key:
            asset_path = _asset_path(asset_key)
            if asset_path is None or not asset_path.is_file():
                return None
        return {key: payload[key] for key in _empty("", query)}
    except (OSError, ValueError, TypeError, KeyError):
        return None


def _lookup(query, api_key, cache_path):
    url = "https://pixabay.com/api/?" + urlencode({
        "key": api_key,
        "q": query,
        "lang": "en",
        "image_type": "photo",
        "orientation": "horizontal",
        "category": "food",
        "safesearch": "true",
        "per_page": 10,
    })
    payload = _get_json(url)
    hits = payload.get("hits", []) if isinstance(payload, dict) else []
    candidates = []
    for hit in hits:
        if not isinstance(hit, dict) or hit.get("type") != "photo":
            continue
        image_urls = _image_urls(hit)
        page_url = _safe_page_url(hit.get("pageURL"))
        if image_urls and page_url:
            tags = str(hit.get("tags") or "").casefold()
            score = sum(1 for word in query.split() if word.casefold() in tags)
            candidates.append((score, hit, image_urls, page_url))
    if not candidates:
        result = _empty("not_found", query)
        _persist_metadata(cache_path, result)
        return result

    candidates.sort(key=lambda candidate: candidate[0], reverse=True)
    downloads = [
        (hit, image_url, page_url)
        for _, hit, image_urls, page_url in candidates
        for image_url in image_urls
    ][:_MAX_DOWNLOAD_ATTEMPTS]
    last_error = None
    for hit, image_url, page_url in downloads:
        # One refused or broken download must not cost the whole recipe its
        # photo: try the next URL or candidate instead.
        try:
            content_type, image_data = _get_bytes(image_url, limit=_MAX_IMAGE_BYTES)
        except (URLError, OSError, ValueError) as error:
            last_error = error
            logger.info(
                "Pixabay image download failed (%s, HTTP %s); trying the next one",
                type(error).__name__, getattr(error, "code", "-"),
            )
            continue
        extension = _EXTENSIONS.get(content_type)
        if not extension or not _is_image(content_type, image_data):
            continue
        asset_key = hashlib.sha256(image_url.encode("utf-8")).hexdigest() + "." + extension
        asset_path = _asset_path(asset_key)
        asset_path.parent.mkdir(parents=True, exist_ok=True)
        asset_path.write_bytes(image_data)
        result = {
            "status": "ok",
            "query": query,
            "source": "pixabay",
            "image_url": None,
            "asset_key": asset_key,
            "alt": str(hit.get("tags") or "Foto ilustrasi hidangan")[:300],
            "photographer": str(hit.get("user") or "Kontributor Pixabay")[:120],
            "photo_url": page_url,
        }
        _persist_metadata(cache_path, result)
        return result
    if last_error is not None:
        # Every download was refused: a temporary problem, so report it as
        # unavailable (retried after a minute) instead of caching "not_found"
        # for a whole day.
        raise last_error
    result = _empty("not_found", query)
    _persist_metadata(cache_path, result)
    return result


def find_recipe_image(title: str, ingredients: str = "") -> dict:
    query = search_query(title, ingredients)
    secret = settings.pixabay_api_key
    if not secret or not secret.get_secret_value().strip():
        return _empty("disabled", query)
    api_key = secret.get_secret_value().strip()
    identity = hashlib.sha256(api_key.encode()).hexdigest()[:16]
    cache_identity = hashlib.sha256(f"{identity}:{query}".encode()).hexdigest()
    cache_key = (identity, query)
    cache_path = _cache_dir() / f"{cache_identity}.json"
    with _lock:
        now = monotonic()
        cached = _cache.get(cache_key)
        if cached and cached[0] > now:
            _cache.move_to_end(cache_key)
            return dict(cached[1])
        persisted = _read_persisted(cache_path, query)
        if persisted is not None:
            _cache[cache_key] = (now + _TTL, persisted)
            _cache.move_to_end(cache_key)
            return dict(persisted)
        try:
            result = _lookup(query, api_key, cache_path)
        except (URLError, OSError, ValueError, TypeError, AttributeError, KeyError) as error:
            logger.warning(
                "Pixabay lookup failed (%s, HTTP %s)",
                type(error).__name__, getattr(error, "code", "-"),
            )
            result = _empty("unavailable", query)
        lifetime = _FAILURE_TTL if result["status"] == "unavailable" else _TTL
        _cache[cache_key] = (monotonic() + lifetime, result)
        _cache.move_to_end(cache_key)
        while len(_cache) > _MAX_CACHE:
            _cache.popitem(last=False)
        return dict(result)
