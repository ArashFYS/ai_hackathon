"""Proposed changes: create (manual), list, decide, export confirmed rows."""
import csv
import io
import json
import sqlite3
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from ..db import get_db
from ..summaries import fetch_record, now_iso, proposal_with_record

router = APIRouter(prefix="/api", tags=["proposals"])

KINDS = ("status_change", "address_check", "missing_establishment", "field_correction")
EXPORT_COLS = ["id", "record_nr", "display_name", "address", "kind", "field", "current_value",
               "proposed_value", "reason", "status", "created_at", "decided_at"]


class ProposalIn(BaseModel):
    kind: Literal["status_change", "address_check", "missing_establishment", "field_correction"]
    field: str | None = None
    current_value: str | None = None
    proposed_value: str | None = None
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
        rec = p.get("record") or {}
        writer.writerow([
            p["id"], p["record_nr"], rec.get("display_name", ""), rec.get("address", ""), p["kind"],
            p["field"] or "", p["current_value"] or "", p["proposed_value"] or "", p["reason"],
            p["status"], p["created_at"], p["decided_at"] or "",
        ])
    return StreamingResponse(
        iter(["﻿" + buf.getvalue()]), media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="bevestigde_voorstellen.csv"'},
    )


@router.get("/proposals")
def list_proposals(status: str | None = Query(None), conn: sqlite3.Connection = Depends(get_db)):
    sql, params = "SELECT * FROM proposals", []
    if status:
        sql += " WHERE status = ?"
        params.append(status)
    sql += " ORDER BY id DESC"
    return [proposal_with_record(conn, dict(r)) for r in conn.execute(sql, params).fetchall()]


@router.post("/proposals/{pid}/decide")
def decide_proposal(pid: int, body: DecisionIn, conn: sqlite3.Connection = Depends(get_db)):
    _get(conn, pid)
    conn.execute("UPDATE proposals SET status = ?, decided_at = ? WHERE id = ?", (body.status, now_iso(), pid))
    conn.commit()
    return _get(conn, pid)
