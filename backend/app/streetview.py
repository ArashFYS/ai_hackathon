"""Street View anchor for a record: nearest point on the record's own street + heading towards the address.

Record coordinates are the Adressenregister position "afgeleid van object" (parcel/building), so Google's
nearest pano may sit on another street and cbp=…,0,… faces north. The Wegenregister (Digitaal Vlaanderen,
OGC API Features, no key) gives road segments with left/right street names; we snap to the matching street.
Cached in indicator_cache (kind 'streetview', key = nr) by scripts/prefetch_kbo_public.py; build_links
falls back to the raw coordinates when nothing is cached.
Payload: { available, lat, lng, heading, street, distance_m, note }
"""
import math

import httpx

WEGSEGMENT_URL = "https://geo.api.vlaanderen.be/Wegenregister/ogc/features/v1/collections/Wegsegment/items"
HEADERS = {"User-Agent": "vind-de-echte-ondernemingen/0.1"}
BBOX_DEG = 0.0012  # ≈ 130 m north-south, ≈ 85 m east-west


def _to_xy(lat: float, lng: float, lat0: float) -> tuple[float, float]:
    """Local metres (equirectangular) around lat0."""
    k = 111_320.0
    return (lng * k * math.cos(math.radians(lat0)), lat * k)


def _nearest_on_segment(p, a, b):
    ax, ay = a; bx, by = b; px, py = p
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return a
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return (ax + t * dx, ay + t * dy)


def _bearing(from_xy, to_xy) -> float:
    dx, dy = to_xy[0] - from_xy[0], to_xy[1] - from_xy[1]
    return (math.degrees(math.atan2(dx, dy)) + 360) % 360


def _norm(s: str | None) -> str:
    return " ".join((s or "").lower().split())


def compute(row: dict, client: httpx.Client | None = None) -> tuple[dict, bool]:
    """(payload, cacheable)."""
    lat, lng = row.get("lat"), row.get("lng")
    street = row.get("ar_street") or row.get("kbo_street")
    if lat is None or lng is None or not street:
        return {"available": False, "note": "Geen coördinaten of straatnaam"}, True
    try:
        c = client or httpx.Client(headers=HEADERS, timeout=15)
        r = c.get(WEGSEGMENT_URL, params={
            "f": "application/json", "limit": 100,
            "bbox": f"{lng - BBOX_DEG},{lat - BBOX_DEG},{lng + BBOX_DEG},{lat + BBOX_DEG}",
        })
        r.raise_for_status()
        feats = r.json().get("features", [])
    except (httpx.HTTPError, ValueError) as e:
        return {"available": False, "note": f"Wegenregister niet bereikbaar ({type(e).__name__})"}, False

    want = _norm(street)
    p = _to_xy(lat, lng, lat)
    best = None  # (dist, xy)
    for f in feats:
        props = f.get("properties", {})
        if want not in (_norm(props.get("linkerstraatnaam")), _norm(props.get("rechterstraatnaam"))):
            continue
        coords = f.get("geometry", {}).get("coordinates") or []
        pts = [_to_xy(y, x, lat) for x, y in coords]
        for a, b in zip(pts, pts[1:]):
            q = _nearest_on_segment(p, a, b)
            d = math.dist(p, q)
            if best is None or d < best[0]:
                best = (d, q)
    if best is None:
        return {"available": False, "note": f"Geen wegsegment '{street}' binnen ~100 m in het Wegenregister"}, True
    d, q = best
    k = 111_320.0
    return {
        "available": True,
        "lat": round(q[1] / k, 7), "lng": round(q[0] / (k * math.cos(math.radians(lat))), 7),
        "heading": round(_bearing(q, p)), "street": street, "distance_m": round(d, 1), "note": None,
    }, True
