"""Find illustrative food photos without blocking recipe generation."""

import hashlib
import json
import logging
import re
from collections import OrderedDict
from threading import Lock
from time import monotonic
from urllib.error import URLError
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

from app.core.config import settings

logger = logging.getLogger(__name__)
_cache = OrderedDict()
_lock = Lock()
_TTL = 6 * 60 * 60
_FAILURE_TTL = 60
_MAX_CACHE = 128


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


def _url(value, host, prefix="/"):
    if not isinstance(value, str):
        return ""
    parts = urlsplit(value)
    if parts.scheme != "https" or parts.netloc != host or not parts.path.startswith(prefix):
        return ""
    return value


def _referral(value):
    parts = urlsplit(value)
    params = dict(parse_qsl(parts.query, keep_blank_values=True))
    params.update(utm_source="nakena", utm_medium="referral")
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(params), parts.fragment))


def _get_json(url, key):
    request = Request(url, headers={
        "Authorization": "Client-ID " + key,
        "Accept-Version": "v1",
        "User-Agent": "NakEna/1.0",
    })
    with urlopen(request, timeout=5) as response:
        raw = response.read(2 * 1024 * 1024 + 1)
    if len(raw) > 2 * 1024 * 1024:
        raise ValueError("Unsplash response exceeded size limit")
    return json.loads(raw)


def _empty(status, query):
    return {
        "status": status, "query": query, "source": "unsplash",
        "image_url": None, "alt": "", "photographer": "",
        "photographer_url": "", "photo_url": "",
    }


def _lookup(query, key):
    url = "https://api.unsplash.com/search/photos?" + urlencode({
        "query": query, "orientation": "landscape", "per_page": 6,
        "order_by": "relevant", "content_filter": "high",
    })
    payload = _get_json(url, key)
    candidates = []
    for photo in payload.get("results", []):
        if not isinstance(photo, dict):
            continue
        image_url = _url(photo.get("urls", {}).get("regular"), "images.unsplash.com")
        user = photo.get("user") or {}
        profile = _url(user.get("links", {}).get("html"), "unsplash.com", "/@")
        photo_url = _url(photo.get("links", {}).get("html"), "unsplash.com", "/photos/")
        download = _url(photo.get("links", {}).get("download_location"), "api.unsplash.com", "/photos/")
        if not (image_url and profile and photo_url and urlsplit(download).path.endswith("/download") and user.get("name")):
            continue
        text = str(photo.get("alt_description") or "") + " " + str(photo.get("description") or "")
        score = sum(word in text.casefold() for word in query.split())
        candidates.append((score, photo, image_url, profile, photo_url, download))
    if not candidates:
        return _empty("not_found", query)
    _, photo, image_url, profile, photo_url, download = max(candidates, key=lambda item: item[0])
    # Register the image assignment using Unsplash's returned download endpoint.
    # This is tracking only; the image remains hotlinked to the returned CDN URL.
    _get_json(download, key)
    return {
        "status": "ok", "query": query, "source": "unsplash",
        "image_url": image_url,
        "alt": str(photo.get("alt_description") or "Foto ilustrasi hidangan")[:300],
        "photographer": str(photo["user"]["name"])[:120],
        "photographer_url": _referral(profile), "photo_url": _referral(photo_url),
    }


def find_recipe_image(title: str, ingredients: str = "") -> dict:
    query = search_query(title, ingredients)
    secret = settings.unsplash_access_key
    if not secret or not secret.get_secret_value().strip():
        return _empty("disabled", query)
    key = secret.get_secret_value().strip()
    identity = hashlib.sha256(key.encode()).hexdigest()[:16]
    cache_key = (identity, query)
    # Single-flight requests avoid spending the demo quota on duplicate lookups.
    with _lock:
        now = monotonic()
        cached = _cache.get(cache_key)
        if cached and cached[0] > now:
            _cache.move_to_end(cache_key)
            return dict(cached[1])
        try:
            result = _lookup(query, key)
        except (URLError, OSError, ValueError, TypeError, AttributeError, KeyError) as error:
            logger.warning(
                "Unsplash lookup failed (%s, HTTP %s)",
                type(error).__name__, getattr(error, "code", "-"),
            )
            result = _empty("unavailable", query)
        lifetime = _TTL if result["status"] == "ok" else _FAILURE_TTL
        _cache[cache_key] = (monotonic() + lifetime, result)
        _cache.move_to_end(cache_key)
        while len(_cache) > _MAX_CACHE:
            _cache.popitem(last=False)
        return dict(result)
