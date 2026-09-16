"""Google Maps listing check via Places API (New) Text Search — free-quota (Pro) fields only.

Never request rating/reviews/opening hours: those move the call to a paid SKU. The light means
"listed on Google Maps at this address and not marked closed", not "recently active".
"""
import json
import os
import re
from datetime import datetime, timezone

import httpx

from .indicator_cache import bump_quota, get_or_fetch
from .summaries import address_of, display_name

KIND = "google_maps"
URL = "https://places.googleapis.com/v1/places:searchText"
FIELD_MASK = "places.id,places.displayName,places.formattedAddress,places.businessStatus,places.googleMapsUri,places.location"
MONTHLY_CAP = 4500
TIMEOUT = 10
ENV_KEY = "GOOGLE_MAPS_API_KEY"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _payload(note: str, *, found: bool = False, error: str | None = None, **extra) -> dict:
    return {
        "found": found, "place_id": None, "name": None, "formatted_address": None, "business_status": None,
        "url": None, "candidates": 0, "fetched_at": _now(), "note": note, "error": error, **extra,
    }


def _address_matches(formatted: str | None, street: str | None, housenr: str | None) -> bool:
    if not formatted or not street or not housenr:
        return False
    fa = formatted.lower()
    if street.lower() not in fa:
        return False
    parts = [p for p in re.split(r"[-/ ]", housenr.lower()) if p]
    return any(re.search(rf"(?<![\w]){re.escape(p)}(?![\w])", fa) for p in parts)


def _pick(places: list[dict], row: dict) -> dict | None:
    for place in places:
        if _address_matches(place.get("formattedAddress"), row.get("kbo_street"), row.get("kbo_housenr")):
            return place
    return None


def fetch_live(conn, row: dict) -> tuple[dict, bool]:
    key = os.environ.get(ENV_KEY)
    if not key:
        return _payload(f"Geen Google Maps API-sleutel geconfigureerd ({ENV_KEY} in backend/.env)", error="no_key"), False
    if bump_quota(conn, KIND) > MONTHLY_CAP:
        return _payload("Maandelijkse gratis quota van Google Places bereikt", error="quota"), False
    query = f"{display_name(row)} {address_of(row)}".strip()
    body: dict = {"textQuery": query, "languageCode": "nl", "regionCode": "BE", "maxResultCount": 3}
    if row.get("lat") is not None and row.get("lng") is not None:
        body["locationBias"] = {"circle": {"center": {"latitude": row["lat"], "longitude": row["lng"]}, "radius": 300.0}}
    headers = {"Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": FIELD_MASK}
    try:
        r = httpx.post(URL, json=body, headers=headers, timeout=TIMEOUT)
    except Exception as exc:
        return _payload(f"Google Places niet bereikbaar: {type(exc).__name__}", error="network"), False
    if r.status_code != 200:
        try:
            msg = json.loads(r.text, strict=False)["error"]["message"]
        except Exception:
            msg = r.text[:120]
        return _payload(f"Google Places antwoordde HTTP {r.status_code}: {msg}", error="http"), False
    places = json.loads(r.text, strict=False).get("places") or []
    place = _pick(places, row)
    if not place:
        tail = f" ({len(places)} kandidaten zonder adresmatch)" if places else ""
        return _payload("Geen Google Maps-vermelding gevonden op dit adres" + tail, candidates=len(places), query=query), True
    name = (place.get("displayName") or {}).get("text")
    return _payload(
        f"Gevonden op Google Maps: {name}", found=True, place_id=place.get("id"), name=name,
        formatted_address=place.get("formattedAddress"), business_status=place.get("businessStatus"),
        url=place.get("googleMapsUri"), candidates=len(places), query=query,
    ), True


def has_api_key() -> bool:
    return bool(os.environ.get(ENV_KEY))


def get_google_maps(conn, row: dict) -> dict:
    return get_or_fetch(conn, KIND, row["nr"], lambda: fetch_live(conn, row))
