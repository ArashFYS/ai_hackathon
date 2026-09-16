"""Proposed changes: create (manual / missing establishment), list, decide, export confirmed rows."""
import csv
import io
import sqlite3
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from ..db import get_db
from ..selection import RecordFilters, read_snapshot, select_records
from ..summaries import address_of, fetch_record, now_iso, proposal_with_record

router = APIRouter(prefix="/api", tags=["proposals"])

KINDS = ("status_change", "address_check", "missing_establishment", "field_correction")
EXPORT_COLS = ["id", "record_nr", "display_name", "address", "kind", "field", "current_value",
               "proposed_value", "reason", "status", "created_at", "decided_at",
               "observed_name", "observed_activity", "source", "source_url", "observed_at"]


class ProposalIn(BaseModel):
    kind: Literal["status_change", "address_check", "missing_establishment", "field_correction"]
    field: str | None = None
    current_value: str | None = None
    proposed_value: str | None = None
    reason: str = Field(min_length=1)


class MissingIn(BaseModel):
    """A business the officer saw at an address, but which has no KBO record there."""
    street: str = Field(min_length=1)
    housenr: str = Field(min_length=1)
    box: str | None = None
    postcode: str = Field(min_length=1)
    municipality: str = Field(min_length=1)
    observed_name: str = Field(min_length=1)
    observed_activity: str | None = None
    source: Literal["google_maps", "street_view", "terreinbezoek", "website", "andere"]
    source_url: str | None = None
    observed_at: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    reason: str = Field(min_length=1)


class DecisionIn(BaseModel):
    status: Literal["bevestigd", "afgewezen"]


def _get(conn: sqlite3.Connection, pid: int) -> dict:
    row = conn.execute("SELECT * FROM proposals WHERE id = ?", (pid,)).fetchone()
    if not row:
        raise HTTPException(404, "Voorstel niet gevonden")
    return proposal_with_record(conn, dict(row))


@router.post("/records/{nr}/proposals", status_code=201)
def add_proposal(nr: str, body: ProposalIn, conn: sqlite3.Connection = Depends(get_db)):
    if not fetch_record(conn, nr):
        raise HTTPException(404, "Record niet gevonden")
    cur = conn.execute(
        "INSERT INTO proposals (record_nr, kind, field, current_value, proposed_value, reason, status, created_at)"
        " VALUES (?, ?, ?, ?, ?, ?, 'open', ?)",
        (nr, body.kind, body.field, body.current_value, body.proposed_value, body.reason, now_iso()),
    )
    conn.commit()
    return _get(conn, cur.lastrowid)


@router.post("/proposals/missing", status_code=201)
def add_missing_establishment(body: MissingIn, conn: sqlite3.Connection = Depends(get_db)):
    """kind='missing_establishment', record_nr=NULL: the observed name is the proposed value."""
    address = address_of({
        "kbo_street": body.street.strip(), "kbo_housenr": body.housenr.strip(), "kbo_box": (body.box or "").strip() or None,
        "kbo_postcode": body.postcode.strip(), "kbo_municipality": body.municipality.strip(),
    })
    cur = conn.execute(
        "INSERT INTO proposals (record_nr, kind, field, current_value, proposed_value, reason, status, created_at,"
        " address, observed_name, observed_activity, source, source_url, observed_at)"
        " VALUES (NULL, 'missing_establishment', NULL, NULL, ?, ?, 'open', ?, ?, ?, ?, ?, ?, ?)",
        (body.observed_name.strip(), body.reason.strip(), now_iso(), address, body.observed_name.strip(),
         (body.observed_activity or "").strip() or None, body.source, (body.source_url or "").strip() or None,
         body.observed_at),
    )
    conn.commit()
    return _get(conn, cur.lastrowid)


@router.get("/proposals/export")
def export_proposals(format: Literal["csv", "json"] = "json", conn: sqlite3.Connection = Depends(get_db)):
    rows = [proposal_with_record(conn, dict(r)) for r in conn.execute(
        "SELECT * FROM proposals WHERE status = 'bevestigd' ORDER BY decided_at, id"
    ).fetchall()]
    if format == "json":
        return rows
    buf = io.StringIO()
    writer = csv.writer(buf, delimiter=";")
    writer.writerow(EXPORT_COLS)
    for p in rows:
        writer.writerow([p.get(c) if p.get(c) is not None else "" for c in EXPORT_COLS])
    return StreamingResponse(
        iter(["﻿" + buf.getvalue()]), media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="bevestigde_voorstellen.csv"'},
    )


@router.get("/proposals")
def list_proposals(
    status: str | None = Query(None), municipality: str | None = None,
    type: Literal["enterprise", "establishment"] | None = None, activity: str | None = None,
    linked: bool | None = None, conn: sqlite3.Connection = Depends(get_db),
):
    sql, params = "SELECT * FROM proposals", []
    if status:
        sql += " WHERE status = ?"
        params.append(status)
    sql += " ORDER BY id DESC"
    with read_snapshot(conn):
        selected = None
        if municipality or type or activity:
            selected = {i["nr"] for i in select_records(conn, RecordFilters(municipality=municipality, type=type, activity=activity))}
        return [proposal_with_record(conn, dict(r)) for r in conn.execute(sql, params)
                if (selected is None or r["record_nr"] in selected)
                and (linked is None or (r["record_nr"] is not None) == linked)]


@router.post("/proposals/{pid}/decide")
def decide_proposal(pid: int, body: DecisionIn, conn: sqlite3.Connection = Depends(get_db)):
    _get(conn, pid)
    conn.execute("UPDATE proposals SET status = ?, decided_at = ? WHERE id = ?", (body.status, now_iso(), pid))
    conn.commit()
    return _get(conn, pid)
