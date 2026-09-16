"""Google Places API (New) Text Search, server-side, for the Google Maps light (TICKET-038).

The key is referrer-restricted (browser use); the server sends the same origin as Referer. Cached in
indicator_cache kind 'places' (key = own nr, 7 days). Payload:
  { found: bool, name, address, phone, website, status: 'OPERATIONAL'|'CLOSED_TEMPORARILY'|'CLOSED_PERMANENTLY'|None,
    rating, rating_count, hours: [str], url, query, note }
"""
import json

import httpx

from .env import maps_embed_key
from .indicator_cache import CACHE_TTL, get_or_fetch
from datetime import timedelta

KIND = "places"
CACHE_TTL[KIND] = timedelta(days=7)
ENDPOINT = "https://places.googleapis.com/v1/places:searchText"
REFERER = "http://localhost:5173/"
FIELDS = ",".join(f"places.{f}" for f in (
    "displayName", "formattedAddress", "nationalPhoneNumber", "websiteUri",
    "regularOpeningHours.weekdayDescriptions", "rating", "userRatingCount", "businessStatus", "googleMapsUri"))


def enabled() -> bool:
    return maps_embed_key() is not None


def _empty(query: str, note: str | None, found: bool = False) -> dict:
    return {"found": found, "name": None, "address": None, "phone": None, "website": None, "status": None,
            "rating": None, "rating_count": None, "hours": [], "url": None, "query": query, "note": note}


def fetch_live(query: str) -> tuple[dict, bool]:
    key = maps_embed_key()
    if not key:
        return _empty(query, "Geen Google-sleutel geconfigureerd"), False
    try:
        r = httpx.post(ENDPOINT, timeout=15, content=json.dumps(
            {"textQuery": query, "languageCode": "nl", "regionCode": "BE", "pageSize": 1}),
            headers={"Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": FIELDS,
                     "Referer": REFERER})
        r.raise_for_status()
        places = json.loads(r.text, strict=False).get("places") or []
    except httpx.HTTPError as e:
        return _empty(query, f"Google Places niet bereikbaar ({type(e).__name__})"), False
    if not places:
        return _empty(query, "Geen Google Maps-vermelding gevonden"), True
    p = places[0]
    return {
        "found": True,
        "name": (p.get("displayName") or {}).get("text"),
        "address": p.get("formattedAddress"),
        "phone": p.get("nationalPhoneNumber"),
        "website": p.get("websiteUri"),
        "status": p.get("businessStatus"),
        "rating": p.get("rating"),
        "rating_count": p.get("userRatingCount"),
        "hours": (p.get("regularOpeningHours") or {}).get("weekdayDescriptions") or [],
        "url": p.get("googleMapsUri"),
        "query": query,
        "note": None,
    }, True


def get_places(conn, nr: str, query: str) -> dict:
    return get_or_fetch(conn, KIND, nr, lambda: fetch_live(query))
