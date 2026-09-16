"""Turn `records` rows into RecordSummary dicts (with assessment) and manage auto-proposals."""
import json
import sqlite3
from datetime import datetime, timezone

from .activity import activity_of
from .contact import contact_status, contacts_for
from .geography import coordinate_issue
from .indicators import indicators_for, load_indicator_cache
from .scoring import assess

SUMMARY_COLS = [
    "nr", "record_type", "parent_nr", "name", "trade_name", "legal_form", "legal_status",
    "kbo_street", "kbo_housenr", "kbo_box", "kbo_postcode", "kbo_municipality", "lat", "lng",
    "phone", "email", "start_date", "source", "fetched_at", "kbo_niscode",
]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def display_name(row: dict) -> str:
    return row.get("trade_name") or row.get("name") or row.get("short_name") or row.get("nr") or ""


def address_of(row: dict) -> str:
    street = " ".join(p for p in [row.get("kbo_street"), row.get("kbo_housenr")] if p)
    if row.get("kbo_box"):
        street += f" bus {row['kbo_box']}"
    place = " ".join(p for p in [row.get("kbo_postcode"), row.get("kbo_municipality")] if p)
    return ", ".join(p for p in [street, place] if p)


def fetch_record(conn: sqlite3.Connection, nr: str) -> dict | None:
    row = conn.execute("SELECT * FROM records WHERE nr = ?", (nr,)).fetchone()
    return dict(row) if row else None


def fetch_evidence(conn: sqlite3.Connection, nr: str) -> list[dict]:
    rows = conn.execute(
        "SELECT * FROM evidence WHERE record_nr = ? ORDER BY observed_at DESC, id DESC", (nr,)
    ).fetchall()
    return [dict(r) for r in rows]


def _chunked_in(conn: sqlite3.Connection, sql: str, keys: list[str]) -> list[sqlite3.Row]:
    out: list[sqlite3.Row] = []
    for i in range(0, len(keys), 500):
        chunk = keys[i:i + 500]
        out.extend(conn.execute(sql.format(ph=",".join("?" * len(chunk))), chunk).fetchall())
    return out


def load_context(conn: sqlite3.Connection, rows: list[dict]) -> tuple[dict, dict, dict]:
    """Batch-load parents, evidence and cached indicator payloads for many rows.

    Returns (parents_by_nr, evidence_by_nr, indicator_cache). No network."""
    parent_nrs = sorted({r["parent_nr"] for r in rows if r.get("parent_nr")})
    parents = {}
    if parent_nrs:
        for p in _chunked_in(conn, "SELECT * FROM records WHERE nr IN ({ph})", parent_nrs):
            parents[p["nr"]] = dict(p)
    nrs = [r["nr"] for r in rows]
    evidence: dict[str, list[dict]] = {}
    if nrs:
        for e in _chunked_in(
            conn, "SELECT * FROM evidence WHERE record_nr IN ({ph}) ORDER BY observed_at DESC, id DESC", nrs
        ):
            evidence.setdefault(e["record_nr"], []).append(dict(e))
    cached = load_indicator_cache(conn, rows + list(parents.values()))
    return parents, evidence, cached


def cached_nbb(conn: sqlite3.Connection, row: dict) -> dict | None:
    """Balanscentrale payload from cache only (no network) for the record's enterprise."""
    nr = row.get("parent_nr") if row.get("record_type") == "establishment" else row.get("nr")
    if not nr:
        return None
    hit = conn.execute("SELECT payload FROM nbb_cache WHERE nr = ?", (nr,)).fetchone()
    return json.loads(hit["payload"], strict=False) if hit else None


def load_nbb_context(conn: sqlite3.Connection, rows: list[dict]) -> dict:
    """Batch-load the same cached annual-account evidence used by the detail view."""
    nrs = sorted({r.get("parent_nr") if r["record_type"] == "establishment" else r["nr"] for r in rows} - {None})
    return {r["nr"]: json.loads(r["payload"], strict=False) for r in _chunked_in(
        conn, "SELECT nr, payload FROM nbb_cache WHERE nr IN ({ph})", nrs
    )}


def summarize(row: dict, parent: dict | None, evidence: list[dict], full: bool = False,
              nbb: dict | None = None, cached: dict | None = None) -> dict:
    """RecordSummary; with full=True every column except `raw` is included.

    `cached` = load_indicator_cache() result; without it the Peppol light is 'onbekend'."""
    base = {k: v for k, v in row.items() if k != "raw"} if full else {k: row.get(k) for k in SUMMARY_COLS}
    base["has_evidence"] = bool(evidence)
    base["display_name"] = display_name(row)
    base["address"] = address_of(row)
    base["location_valid"] = coordinate_issue(row) is None
    base["location_issue"] = coordinate_issue(row)
    kbo_public = (cached or {}).get("kbo_public", {}).get(row["nr"])
    # Scoring rules 9/11 look at register contact; a phone/e-mail scraped from the record's own KBO page
    # is register data too, so let assess() see it (TICKET-035).
    scored = dict(row)
    for kind in ("phone", "email"):
        if not (scored.get(kind) or "").strip() and (kbo_public or {}).get(kind):
            scored[kind] = kbo_public[kind]
    base["assessment"] = assess(scored, parent, evidence, nbb)
    base["activity"] = activity_of(row, evidence, kbo_public)
    base["contact_status"] = contact_status(contacts_for(row, parent, evidence, kbo_public=kbo_public))  # NBB not counted
    base["indicators"] = indicators_for(row, parent, evidence, cached)
    if row.get("record_type") == "establishment":
        base["parent_in_dataset"] = parent is not None
        # seat is "elsewhere" when the parent is known and sits in another municipality
        base["seat_elsewhere"] = bool(
            parent and (parent.get("kbo_municipality") or "") != (row.get("kbo_municipality") or "")
        )
        base["parent_display_name"] = display_name(parent) if parent else None
    return base


def summarize_many(conn: sqlite3.Connection, rows: list[dict]) -> list[dict]:
    parents, evidence, cached = load_context(conn, rows)
    nbb = load_nbb_context(conn, rows)
    return [summarize(
        r, parents.get(r.get("parent_nr")), evidence.get(r["nr"], []), cached=cached,
        nbb=nbb.get(r.get("parent_nr") if r["record_type"] == "establishment" else r["nr"]),
    ) for r in rows]


def ensure_auto_proposals(conn: sqlite3.Connection, row: dict, assessment: dict) -> None:
    """Idempotently create open proposals implied by the assessment."""
    wanted = []
    status = assessment["status"]
    if status in ("waarschijnlijk_niet_actief", "geen_onderneming"):
        strong = [r["text"] for r in assessment["reasons"] if r["weight"] == "sterk" and r["direction"] == "negatief"]
        wanted.append({
            "kind": "status_change", "field": "status",
            "current_value": "Actief in KBO", "proposed_value": status,
            "reason": "; ".join(strong) or assessment["status_label"],
        })
    addr_reasons = [r for r in assessment["reasons"] if r["code"] in ("adres_afwijking", "buiten_schoten")]
    if addr_reasons:
        ar = " ".join(p for p in [row.get("ar_street"), row.get("ar_housenr")] if p)
        wanted.append({
            "kind": "address_check", "field": "address",
            "current_value": address_of(row), "proposed_value": ar or "coördinaten nazien",
            "reason": "; ".join(r["text"] for r in addr_reasons),
        })
    for w in wanted:
        exists = conn.execute(
            "SELECT 1 FROM proposals WHERE record_nr = ? AND kind = ? AND proposed_value IS ?",
            (row["nr"], w["kind"], w["proposed_value"]),
        ).fetchone()
        if exists:
            continue
        conn.execute(
            "INSERT INTO proposals (record_nr, kind, field, current_value, proposed_value, reason, status, created_at)"
            " VALUES (?, ?, ?, ?, ?, ?, 'open', ?)",
            (row["nr"], w["kind"], w["field"], w["current_value"], w["proposed_value"], w["reason"], now_iso()),
        )
    conn.commit()


def proposal_with_record(conn: sqlite3.Connection, p: dict) -> dict:
    """Attach `record` (None when record_nr is NULL, e.g. missing_establishment) plus a uniform
    top-level `display_name` / `address`: the record's when linked, else the observed name/address."""
    row = fetch_record(conn, p["record_nr"]) if p.get("record_nr") else None
    p["record"] = {"display_name": display_name(row), "address": address_of(row)} if row else None
    p["display_name"] = display_name(row) if row else (p.get("observed_name") or "")
    if row and not p.get("address"):
        p["address"] = address_of(row)
    return p
