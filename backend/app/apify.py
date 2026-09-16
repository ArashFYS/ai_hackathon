"""Apify HTTP client for the Google Maps Scraper actor (compass/crawler-google-places).

Needs APIFY_TOKEN (backend/.env). Raises ApifyError with a Dutch note on any failure; never touches the DB.
"""
import json
import os
import time
from datetime import datetime, timezone

import httpx

BASE = "https://api.apify.com/v2"
ACTOR = "compass~crawler-google-places"
ACTOR_NAME = "compass/crawler-google-places"
SYNC_MAX_QUERIES = 50
SYNC_TIMEOUT = 300          # Apify's cap for run-sync
POLL_SECONDS = 5
RUN_TIMEOUT_SECS = 900      # bounds cost of an async run
COST_PER_QUERY_USD = 0.0075  # place + contacts add-on + 3 reviews, free plan


class ApifyError(Exception):
    """The message is Dutch and safe to show in the UI."""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def token() -> str | None:
    return os.environ.get("APIFY_TOKEN") or None


def _token() -> str:
    t = token()
    if not t:
        raise ApifyError("APIFY_TOKEN ontbreekt in backend/.env")
    return t


def actor_input(queries: list[str]) -> dict:
    """One place per query, Dutch, contacts add-on, 3 newest reviews, no reviewer personal data."""
    return {
        "searchStringsArray": queries, "maxCrawledPlacesPerSearch": 1, "language": "nl",
        "scrapeContacts": True, "maxReviews": 3, "reviewsSort": "newest",
        "scrapeReviewsPersonalData": False, "skipClosedPlaces": False, "scrapePlaceDetailPage": False,
    }


def _request(method: str, path: str, *, params: dict | None = None, body: dict | None = None, timeout: float = 60) -> dict | list:
    params = {"token": _token(), **(params or {})}
    try:
        r = httpx.request(method, f"{BASE}{path}", params=params, json=body, timeout=timeout,
                          headers={"Accept": "application/json"})
    except Exception as exc:
        raise ApifyError(f"Apify niet bereikbaar: {type(exc).__name__}") from exc
    if r.status_code >= 400:
        try:
            msg = json.loads(r.text, strict=False)["error"]["message"]
        except Exception:
            msg = r.text[:120]
        raise ApifyError(f"Apify antwoordde HTTP {r.status_code}: {msg}")
    return json.loads(r.text, strict=False) if r.text else {}


def _run_info(data: dict) -> dict:
    return {
        "run_id": data.get("id"), "dataset_id": data.get("defaultDatasetId"), "status": data.get("status"),
        "started_at": data.get("startedAt") or _now(), "finished_at": data.get("finishedAt"),
        "cost_usd": data.get("usageTotalUsd"),
    }


def start_run(inp: dict) -> dict:
    data = _request("POST", f"/acts/{ACTOR}/runs", params={"timeout": RUN_TIMEOUT_SECS}, body=inp)
    return _run_info(data.get("data") or {})


def get_run(run_id: str) -> dict:
    return _run_info((_request("GET", f"/actor-runs/{run_id}") or {}).get("data") or {})


def wait_for_run(run_id: str, timeout: int = RUN_TIMEOUT_SECS + 60, poll: int = POLL_SECONDS) -> dict:
    deadline = time.monotonic() + timeout
    while True:
        info = get_run(run_id)
        if info["status"] not in ("READY", "RUNNING"):
            if info["status"] != "SUCCEEDED":
                raise ApifyError(f"Apify-run {run_id} mislukt (status {info['status']})")
            return info
        if time.monotonic() > deadline:
            raise ApifyError(f"Apify-run {run_id} duurt te lang (status {info['status']})")
        time.sleep(poll)


def fetch_items(dataset_id: str) -> list[dict]:
    items = _request("GET", f"/datasets/{dataset_id}/items", params={"clean": "true", "format": "json"}, timeout=120)
    return items if isinstance(items, list) else []


def run_sync(inp: dict, timeout: int = SYNC_TIMEOUT) -> list[dict]:
    """Blocks until the actor finishes (≤ SYNC_TIMEOUT s); returns the dataset items."""
    items = _request("POST", f"/acts/{ACTOR}/run-sync-get-dataset-items",
                     params={"timeout": timeout}, body=inp, timeout=timeout + 30)
    return items if isinstance(items, list) else []
