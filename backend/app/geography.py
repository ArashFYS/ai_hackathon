"""Conservative location checks. Raw source coordinates are never overwritten."""
import math

# Official Digitaal Vlaanderen municipality envelope, checked 2026-09-16:
# https://geo.api.vlaanderen.be/geolocation/Location?q=Schoten&type=Municipality
# An envelope is a plausibility check, not proof of address-level accuracy.
SCHOTEN_BBOX = {
    "lat_min": 51.23539901119171, "lat_max": 51.30411583625305,
    "lng_min": 4.455271473162822, "lng_max": 4.553037930161057,
}


def coordinate_issue(row: dict) -> str | None:
    lat, lng = row.get("lat"), row.get("lng")
    if not isinstance(lat, (float, int)) or not isinstance(lng, (float, int)):
        return "invalid_coordinates"
    if not math.isfinite(lat) or not math.isfinite(lng) or abs(lat) > 90 or abs(lng) > 180:
        return "invalid_coordinates"
    if (row.get("kbo_municipality") or "").strip().casefold() != "schoten":
        return "unverified_municipality"
    if not (SCHOTEN_BBOX["lat_min"] <= lat <= SCHOTEN_BBOX["lat_max"]
            and SCHOTEN_BBOX["lng_min"] <= lng <= SCHOTEN_BBOX["lng_max"]):
        return "outside_expected_area"
    return None
