"""Google Maps listings per record (table google_maps_places): query building, matching, storage, orchestration.

Must not import summaries (summaries → indicators → google_maps).
"""
import json
import re
import sqlite3
import time
import unicodedata
from datetime import datetime, timezone

from .apify import (ACTOR_NAME, SYNC_MAX_QUERIES, actor_input, fetch_items, run_sync, start_run, wait_for_run)

MATCH_ADRES, MATCH_ADRES_ANDERE, MATCH_NAAM, MATCH_GEEN = "adres", "adres_andere_naam", "naam", "geen"
SCORE = {MATCH_ADRES: 3, MATCH_ADRES_ANDERE: 2, MATCH_NAAM: 1, MATCH_GEEN: 0}
NAME_STOPWORDS = {"bv", "bvba", "nv", "vzw", "cv", "cvba", "vof", "gcv", "comm", "v", "srl", "sa", "de", "het",
                  "een", "en", "van", "der", "the", "and"}
REVIEWER_FIELDS = ("name", "reviewerId", "reviewerUrl", "reviewerPhotoUrl", "reviewerNumberOfReviews", "isLocalGuide")
COLUMNS = ("record_nr", "match_quality", "search_string", "run_id", "scraped_at", "place_id", "title", "category",
           "categories", "address", "street", "city", "postal_code", "phone", "website", "emails", "phones", "social",
           "rating", "reviews_count", "permanently_closed", "temporarily_closed", "latest_review_at", "reviews",
           "opening_hours", "url", "image_url", "lat", "lng", "raw")
JSON_COLS = ("categories", "emails", "phones", "social", "reviews", "opening_hours")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _name(row: dict) -> str:
    return row.get("trade_name") or row.get("name") or row.get("short_name") or row.get("nr") or ""


def build_query(row: dict) -> str:
    """'<naam>, <straat> <nr>, <postcode> <gemeente>' — the actor echoes it as item.searchString."""
    street = " ".join(p for p in [row.get("kbo_street"), row.get("kbo_housenr")] if p)
    place = " ".join(p for p in [row.get("kbo_postcode"), row.get("kbo_municipality")] if p)
    return ", ".join(p for p in [_name(row).strip(), street, place] if p)


def _norm(s: str | None) -> str:
    """Lowercase ASCII words: accents stripped, emoji/punctuation become separators ("💈Kapsalon✂️schoten💈" → "kapsalon schoten")."""
    s = unicodedata.normalize("NFKD", s or "")
    s = "".join(ch if ch.isalnum() or unicodedata.category(ch) == "Mn" else " " for ch in s)
    return re.sub(r"\s+", " ", s.encode("ascii", "ignore").decode().lower()).strip()


def _housenr_tokens(housenr: str | None) -> set[str]:
    parts = [p for p in re.split(r"[-/ ]", _norm(housenr)) if p]
    out = set(parts)
    for p in parts:
        m = re.match(r"(\d+)", p)
        if m:
            out.add(m.group(1))
    return out


ADDRESS_CATEGORIES = {"gebouw", "building", "adres", "address", "bouwwerk", "straat", "street"}


def is_address_only(item: dict | None) -> bool:
    """Google returns the bare address (category 'Gebouw', title 'Paalstraat 9') when no business is listed."""
    if not item:
        return True
    if _norm(item.get("categoryName")) in ADDRESS_CATEGORIES:
        return True
    has_business = any(item.get(k) for k in ("phone", "website", "totalScore", "reviewsCount"))
    looks_like_address = bool(re.fullmatch(r"[a-z][a-z ]+ \d+[a-z]?", _norm(item.get("title"))))
    return looks_like_address and not has_business


def _address_ok(row: dict, item: dict) -> bool:
    hay = f"{_norm(item.get('street'))} {_norm(item.get('address'))}"
    street = _norm(row.get("kbo_street"))
    return bool(street and street in hay and set(hay.split()) & _housenr_tokens(row.get("kbo_housenr")))


def _name_ok(row: dict, item: dict) -> bool:
    """Half of the distinctive name words in the title, or one shared word of ≥ 5 letters (surname, brand)."""
    skip = NAME_STOPWORDS | set(_norm(row.get("kbo_municipality")).split())
    name_tokens = {w for w in _norm(_name(row)).split() if len(w) >= 2 and w not in skip}
    title_tokens = set(_norm(item.get("title")).split())
    shared = name_tokens & title_tokens
    if not name_tokens:
        return False
    return len(shared) / len(name_tokens) >= 0.5 or any(len(w) >= 5 for w in shared)


def match_quality(row: dict, item: dict | None) -> str:
    """adres = address and name agree · adres_andere_naam = address agrees, another name (other shop or unknown
    trade name) · naam = name agrees elsewhere · geen = neither, or an address-only result."""
    if is_address_only(item):
        return MATCH_GEEN
    addr, name = _address_ok(row, item), _name_ok(row, item)
    if addr and name:
        return MATCH_ADRES
    if addr:
        return MATCH_ADRES_ANDERE
    if name:
        return MATCH_NAAM
    return MATCH_GEEN


def assign_items(rows: list[dict], items: list[dict]) -> dict[str, dict | None]:
    """Best item per record nr. The actor returns each place once per run (under the first query that found
    it), so an item is offered to every record in the batch and goes to the best match; the record it was
    searched for wins ties. Records left without an item get None."""
    by_query = queries_for(rows)
    out: dict[str, dict | None] = {r["nr"]: None for r in rows}
    best: dict[str, int] = {r["nr"]: -1 for r in rows}
    for item in items:
        own = {r["nr"] for r in by_query.get(item.get("searchString") or "", [])}
        for r in rows:
            score = SCORE[match_quality(r, item)] * 2 + (1 if r["nr"] in own else 0)
            if score > best[r["nr"]] and (score >= 2 or r["nr"] in own):
                best[r["nr"]], out[r["nr"]] = score, item
    return out


def _reviews(item: dict) -> list[dict]:
    out = []
    for r in item.get("reviews") or []:
        out.append({"date": (r.get("publishedAtDate") or "")[:10] or None, "stars": r.get("stars"),
                    "text": (r.get("text") or "")[:500] or None})
    return out


def _strip_personal(item: dict) -> dict:
    raw = dict(item)
    raw["reviews"] = [{k: v for k, v in r.items() if k not in REVIEWER_FIELDS} for r in item.get("reviews") or []]
    raw.pop("images", None)
    return raw


def item_to_place(row: dict, item: dict | None, query: str, run_id: str | None, scraped_at: str) -> dict:
    mq = match_quality(row, item)
    it = item or {}
    reviews = _reviews(it) if item else []
    dates = [r["date"] for r in reviews if r["date"]]
    return {
        "record_nr": row["nr"], "match_quality": mq, "search_string": query, "run_id": run_id,
        "scraped_at": it.get("scrapedAt") or scraped_at, "place_id": it.get("placeId"), "title": it.get("title"),
        "category": it.get("categoryName"), "categories": it.get("categories") or [], "address": it.get("address"),
        "street": it.get("street"), "city": it.get("city"), "postal_code": it.get("postalCode"),
        "phone": it.get("phone"), "website": it.get("website"), "emails": it.get("emails") or [],
        "phones": it.get("phones") or [],
        "social": {k: it.get(k) or [] for k in ("instagrams", "facebooks", "linkedIns")},
        "rating": it.get("totalScore"), "reviews_count": it.get("reviewsCount"),
        "permanently_closed": 1 if it.get("permanentlyClosed") else 0,
        "temporarily_closed": 1 if it.get("temporarilyClosed") else 0,
        "latest_review_at": max(dates) if dates else None, "reviews": reviews,
        "opening_hours": it.get("openingHours") or [], "url": it.get("url"), "image_url": it.get("imageUrl"),
        "lat": (it.get("location") or {}).get("lat"), "lng": (it.get("location") or {}).get("lng"),
        "raw": _strip_personal(item) if item else None,
    }


def upsert_place(conn: sqlite3.Connection, place: dict) -> None:
    vals = [json.dumps(place[c], ensure_ascii=False) if c in JSON_COLS or c == "raw" else place[c] for c in COLUMNS]
    conn.execute(
        f"INSERT OR REPLACE INTO google_maps_places ({', '.join(COLUMNS)}) VALUES ({', '.join('?' * len(COLUMNS))})", vals
    )


def record_run(conn: sqlite3.Connection, run: dict) -> None:
    conn.execute(
        "INSERT OR REPLACE INTO apify_runs (run_id, actor, started_at, finished_at, status, scope, searched, places, cost_usd)"
        " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (run["run_id"], run.get("actor") or ACTOR_NAME, run.get("started_at") or _now(), run.get("finished_at"),
         run.get("status") or "SUCCEEDED", run["scope"], run["searched"], run["places"], run.get("cost_usd")),
    )


def place_to_api(row) -> dict | None:
    if row is None:
        return None
    p = dict(row)
    for c in JSON_COLS:
        p[c] = json.loads(p[c], strict=False) if p.get(c) else ([] if c != "social" else {})
    p.pop("raw", None)
    p["permanently_closed"] = bool(p.get("permanently_closed"))
    p["temporarily_closed"] = bool(p.get("temporarily_closed"))
    found = p["match_quality"] != MATCH_GEEN and bool(p.get("title"))
    p["status"] = ("niet_gevonden" if not found else "permanent_gesloten" if p["permanently_closed"]
                   else "tijdelijk_gesloten" if p["temporarily_closed"] else "open")
    return p


def fetch_place(conn: sqlite3.Connection, nr: str) -> dict | None:
    return place_to_api(conn.execute("SELECT * FROM google_maps_places WHERE record_nr = ?", (nr,)).fetchone())


def load_places(conn: sqlite3.Connection, nrs: list[str]) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for i in range(0, len(nrs), 500):
        chunk = nrs[i:i + 500]
        for r in conn.execute(
            f"SELECT * FROM google_maps_places WHERE record_nr IN ({','.join('?' * len(chunk))})", chunk
        ):
            out[r["record_nr"]] = place_to_api(r)
    return out


def queries_for(rows: list[dict]) -> dict[str, list[dict]]:
    """Records sharing a query (enterprise + establishment at one address) cost one search."""
    out: dict[str, list[dict]] = {}
    for r in rows:
        out.setdefault(build_query(r), []).append(r)
    return out


def store_items(conn: sqlite3.Connection, rows: list[dict], items: list[dict], run: dict, only_present: bool = False) -> dict:
    """Upsert one place row per record from actor items (matched on searchString); records the run."""
    queries = queries_for(rows)
    present = {it.get("searchString") for it in items}
    assigned = assign_items(rows, items)
    scraped_at = run.get("finished_at") or _now()
    found = closed = searched = 0
    for query, recs in queries.items():
        if only_present and query not in present and all(assigned.get(r["nr"]) is None for r in recs):
            continue  # partial file/run: leave records this data says nothing about untouched
        searched += 1
        for r in recs:
            place = item_to_place(r, assigned.get(r["nr"]), query, run.get("run_id"), scraped_at)
            upsert_place(conn, place)
            if place["match_quality"] != MATCH_GEEN:
                found += 1
                closed += place["permanently_closed"] or place["temporarily_closed"]
    run = {**run, "searched": searched, "places": len(items)}
    record_run(conn, run)
    conn.commit()
    return {"searched": searched, "found": found, "closed": closed}


def scrape_records(conn: sqlite3.Connection, rows: list[dict], scope: str) -> dict:
    """Run the actor for these records (sync ≤ 50 queries, else async + polling) and store the results."""
    started = time.monotonic()
    queries = list(queries_for(rows))
    inp = actor_input(queries)
    if len(queries) <= SYNC_MAX_QUERIES:
        items = run_sync(inp)
        run = {"run_id": f"sync-{_now()}", "status": "SUCCEEDED", "started_at": _now(), "finished_at": _now(),
               "scope": scope, "cost_usd": None}
    else:
        run = start_run(inp)
        run = {**run, **wait_for_run(run["run_id"]), "scope": scope}
        items = fetch_items(run["dataset_id"])
    res = store_items(conn, rows, items, run)
    return {**res, "run_id": run["run_id"], "status": run["status"], "seconds": round(time.monotonic() - started, 1)}
