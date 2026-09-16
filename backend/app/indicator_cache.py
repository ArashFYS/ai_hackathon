"""Generic cache for external indicator lookups (table indicator_cache), same pattern as nbb.get_nbb."""
import json
import sqlite3
from datetime import datetime, timedelta, timezone
from typing import Callable

CACHE_TTL = {"einvoice": timedelta(days=7)}
FetchLive = Callable[[], tuple[dict, bool]]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def cache_get(conn: sqlite3.Connection, kind: str, key: str) -> tuple[dict, str] | None:
    """(payload, fetched_at) regardless of age, or None."""
    row = conn.execute(
        "SELECT fetched_at, payload FROM indicator_cache WHERE kind = ? AND key = ?", (kind, key)
    ).fetchone()
    return (json.loads(row["payload"], strict=False), row["fetched_at"]) if row else None


def cache_put(conn: sqlite3.Connection, kind: str, key: str, payload: dict) -> None:
    payload["fetched_at"] = _now()
    conn.execute(
        "INSERT OR REPLACE INTO indicator_cache (kind, key, fetched_at, payload) VALUES (?, ?, ?, ?)",
        (kind, key, payload["fetched_at"], json.dumps(payload, ensure_ascii=False)),
    )
    conn.commit()


def cache_get_many(conn: sqlite3.Connection, kind: str, keys: list[str]) -> dict[str, dict]:
    """Cached payloads by key, any age (lists show stale values rather than nothing)."""
    out: dict[str, dict] = {}
    for i in range(0, len(keys), 500):
        chunk = keys[i:i + 500]
        ph = ",".join("?" * len(chunk))
        for row in conn.execute(
            f"SELECT key, payload FROM indicator_cache WHERE kind = ? AND key IN ({ph})", (kind, *chunk)
        ):
            out[row["key"]] = json.loads(row["payload"], strict=False)
    return out



def get_or_fetch(conn: sqlite3.Connection, kind: str, key: str, fetch_live: FetchLive) -> dict:
    """Fresh cache hit → cached; else fetch; cacheable → store; stale cache beats a failed fetch."""
    hit = cache_get(conn, kind, key)
    if hit:
        payload, fetched_at = hit
        if datetime.now(timezone.utc) - datetime.fromisoformat(fetched_at) < CACHE_TTL[kind]:
            return payload
    payload, cacheable = fetch_live()
    if cacheable:
        cache_put(conn, kind, key, payload)
        return payload
    if hit:
        stale = hit[0]
        stale["note"] = (stale.get("note") or "") + " (uit cache; bron momenteel niet bereikbaar)"
        return stale
    return payload
