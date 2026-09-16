"""Existing Kaart marker shape, shared with the municipal dashboard."""
import math

from .scoring import SCHOTEN_BBOX


def map_items(items: list[dict]) -> list[dict]:
    out = []
    for item in items:
        lat, lng = item.get("lat"), item.get("lng")
        if lat is None or lng is None or not math.isfinite(lat) or not math.isfinite(lng):
            continue
        if not (-90 <= lat <= 90 and -180 <= lng <= 180):
            continue
        inside = (SCHOTEN_BBOX["lat_min"] <= lat <= SCHOTEN_BBOX["lat_max"]
                  and SCHOTEN_BBOX["lng_min"] <= lng <= SCHOTEN_BBOX["lng_max"])
        out.append({
            **{key: item[key] for key in ("nr", "display_name", "record_type", "lat", "lng", "address")},
            **{key: item["assessment"][key] for key in ("status", "status_label", "certainty")},
            "outside_municipality": not inside,
        })
    return out
