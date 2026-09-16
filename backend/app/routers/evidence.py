"""Officer-logged evidence ("Bewijs van activiteit")."""
import sqlite3
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ..db import get_db
from ..summaries import fetch_record, now_iso

router = APIRouter(prefix="/api/records", tags=["evidence"])

SOURCES = ("google_maps", "street_view", "website", "terreinbezoek", "kbo", "nbb", "andere")


class EvidenceIn(BaseModel):
    source: str = Field(min_length=1)
    url: str | None = None
    observation: str = Field(min_length=1)
    observed_activity: str | None = None
    conclusion: Literal["actief", "niet_actief", "onduidelijk"]
    observed_at: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    phone: str | None = None      # contact seen at the source (TICKET-025)
    email: str | None = None
    website: str | None = None


def _blank(v: str | None) -> str | None:
    v = (v or "").strip()
    return v or None


@router.post("/{nr}/evidence", status_code=201)
def add_evidence(nr: str, body: EvidenceIn, conn: sqlite3.Connection = Depends(get_db)):
    if not fetch_record(conn, nr):
        raise HTTPException(404, "Record niet gevonden")
    cur = conn.execute(
        "INSERT INTO evidence (record_nr, source, url, observation, observed_activity, conclusion, observed_at,"
        " created_at, phone, email, website) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (nr, body.source, body.url, body.observation, body.observed_activity, body.conclusion,
         body.observed_at, now_iso(), _blank(body.phone), _blank(body.email), _blank(body.website)),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM evidence WHERE id = ?", (cur.lastrowid,)).fetchone()
    return dict(row)
