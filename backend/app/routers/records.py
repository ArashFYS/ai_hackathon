"""Record search, detail and parent fetching."""
import json
import re
import sqlite3

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query

from .. import kbo_public
from ..contact import contact_status, contacts_for
from ..indicator_cache import cache_put
from ..db import get_db
from ..links import build_links, enterprise_nr_of
from ..indicators import load_indicator_cache
from ..scoring import SCHOTEN_BBOX
from ..summaries import (
    address_of, display_name, ensure_auto_proposals, fetch_evidence, fetch_record,
    cached_nbb, now_iso, summarize, summarize_many,
)
from ..vkbo import feature_to_row, upsert_sql

router = APIRouter(prefix="/api/records", tags=["records"])

VKBO_URL = "https://geo.api.vlaanderen.be/VKBO/ogc/features/v1/collections/Vkbo/items"


@router.get("")
def list_records(
    q: str | None = None,
    street: str | None = None,
    type: str | None = None,
    status: str | None = None,
    activity: str | None = None,
    limit: int = Query(50, ge=1, le=2000),
    conn: sqlite3.Connection = Depends(get_db),
):
    where, params = [], []
    if q:
        like = f"%{q.strip()}%"
        clause = ["name LIKE ?", "trade_name LIKE ?", "search_name LIKE ?", "kbo_street LIKE ?"]
        params += [like, like, like, like]
        digits = re.sub(r"\D", "", q)
        if 9 <= len(digits) <= 10:
            nr = digits.zfill(10)
            clause += ["nr = ?", "parent_nr = ?"]
            params += [nr, nr]
        where.append("(" + " OR ".join(clause) + ")")
    if street:
        where.append("kbo_street = ? COLLATE NOCASE")
        params.append(street)
    if type in ("enterprise", "establishment"):
        where.append("record_type = ?")
        params.append(type)
    sql = "SELECT * FROM records"
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY kbo_street, kbo_housenr, name"
    if not status and not activity:  # computed fields → filter in Python, so only limit in SQL when unused
        sql += " LIMIT ?"
        params.append(limit)
    rows = [dict(r) for r in conn.execute(sql, params).fetchall()]
    items = summarize_many(conn, rows)
    if status:
        items = [i for i in items if i["assessment"]["status"] == status]
    if activity:
        items = [i for i in items if i["activity"]["sector"] == activity]
    if status or activity:
        items = items[:limit]
    return {"items": items}


@router.get("/geo")
def list_geo(
    street: str | None = None,
    status: str | None = None,
    limit: int = Query(2000, ge=1, le=5000),
    conn: sqlite3.Connection = Depends(get_db),
):
    """Every record with coordinates, reduced to what the map needs (nr, name, status, lat/lng).
    `outside_municipality` flags points outside the Schoten bbox used in scoring."""
    where, params = ["lat IS NOT NULL", "lng IS NOT NULL"], []
    if street:
        where.append("kbo_street = ? COLLATE NOCASE")
        params.append(street)
    sql = "SELECT * FROM records WHERE " + " AND ".join(where) + " ORDER BY kbo_street, kbo_housenr, name"
    if not status:
        sql += " LIMIT ?"
        params.append(limit)
    rows = [dict(r) for r in conn.execute(sql, params).fetchall()]
    items = summarize_many(conn, rows)
    if status:
        items = [i for i in items if i["assessment"]["status"] == status][:limit]
    out = []
    for i in items:
        lat, lng = i["lat"], i["lng"]
        inside = (
            SCHOTEN_BBOX["lat_min"] <= lat <= SCHOTEN_BBOX["lat_max"]
            and SCHOTEN_BBOX["lng_min"] <= lng <= SCHOTEN_BBOX["lng_max"]
        )
        a = i["assessment"]
        out.append({
            "nr": i["nr"], "display_name": i["display_name"], "record_type": i["record_type"],
            "lat": lat, "lng": lng, "status": a["status"], "status_label": a["status_label"],
            "certainty": a["certainty"], "address": i["address"], "outside_municipality": not inside,
        })
    return {"items": out}


@router.get("/{nr}")
def record_detail(nr: str, conn: sqlite3.Connection = Depends(get_db)):
    row = fetch_record(conn, nr)
    if not row:
        raise HTTPException(404, "Record niet gevonden")
    parent = fetch_record(conn, row["parent_nr"]) if row.get("parent_nr") else None
    evidence = fetch_evidence(conn, nr)
    nbb = cached_nbb(conn, row)
    cached = load_indicator_cache(conn, [row] + ([parent] if parent else []))
    record = summarize(row, parent, evidence, full=True, nbb=nbb, cached=cached)
    ensure_auto_proposals(conn, row, record["assessment"])
    place = cached["google_maps"].get(nr)
    contacts = contacts_for(row, parent, evidence, nbb, kbo_public=cached["kbo_public"].get(nr),
                            einvoice=cached["einvoice"].get(enterprise_nr_of(row)), place=place)

    parent_summary = None
    if parent:
        parent_summary = summarize(parent, None, fetch_evidence(conn, parent["nr"]), cached=cached)
    seat_elsewhere = bool(
        parent and (parent.get("kbo_municipality") or "").lower() != (row.get("kbo_municipality") or "").lower()
    )
    est_rows = [dict(r) for r in conn.execute(
        "SELECT * FROM records WHERE parent_nr = ? AND nr != ? ORDER BY kbo_street, kbo_housenr", (nr, nr)
    ).fetchall()] if row["record_type"] == "enterprise" else []
    proposals = [dict(p) for p in conn.execute(
        "SELECT * FROM proposals WHERE record_nr = ? ORDER BY id DESC", (nr,)
    ).fetchall()]
    return {
        "record": record,
        "parent": parent_summary,
        "parent_in_dataset": parent is not None,
        "seat_elsewhere": seat_elsewhere,
        "establishments": summarize_many(conn, est_rows),
        "evidence": evidence,
        "proposals": proposals,
        "links": build_links(row, display_name(row), address_of(row), cached["streetview"].get(nr)),
        "kbo_public": cached["kbo_public"].get(nr),
        "contacts": contacts,
        "contact_status": contact_status(contacts),
        "google_maps": place,
    }


@router.post("/{nr}/fetch-parent")
def fetch_parent(nr: str, conn: sqlite3.Connection = Depends(get_db)):
    row = fetch_record(conn, nr)
    if not row:
        raise HTTPException(404, "Record niet gevonden")
    parent_nr = row.get("parent_nr")
    if not parent_nr:
        raise HTTPException(400, "Dit record is een onderneming en heeft geen moederonderneming")
    existing = fetch_record(conn, parent_nr)
    if existing:
        return summarize(existing, None, fetch_evidence(conn, parent_nr))
    params = {
        "f": "application/json", "limit": "10",
        "filter": f"Ondernemingsnr='{parent_nr}'", "filter-lang": "cql2-text",
    }
    try:
        resp = httpx.get(VKBO_URL, params=params, timeout=20, headers={"Accept": "application/json"})
        resp.raise_for_status()
        data = json.loads(resp.text, strict=False)
    except Exception as exc:  # network / parse failure
        raise HTTPException(502, f"VKBO-dienst niet bereikbaar: {exc}") from exc
    features = data.get("features") or []
    if not features:
        raise HTTPException(404, f"Moederonderneming {parent_nr} niet gevonden in de VKBO-dienst (zetel mogelijk buiten Vlaanderen)")
    parent_row = feature_to_row(features[0], source="vkbo-api", fetched_at=now_iso())
    conn.execute(upsert_sql(), parent_row)
    conn.commit()
    stored = fetch_record(conn, parent_row["nr"])
    return summarize(stored, None, [])


@router.post("/{nr}/kbo-public")
def refresh_kbo_public(nr: str, conn: sqlite3.Connection = Depends(get_db)):
    """Live fetch of the record's KBO Public Search page (activities, contact, status); cached (TICKET-035)."""
    row = fetch_record(conn, nr)
    if not row:
        raise HTTPException(404, "Record niet gevonden")
    payload, ok = kbo_public.fetch_live(row)
    if ok:
        cache_put(conn, "kbo_public", nr, payload)
    return payload
