"""Google Maps listings via Apify: refresh one record or every record in a street. Reads are embedded in record_detail."""
import sqlite3

from fastapi import APIRouter, Depends, HTTPException

from ..apify import ApifyError
from ..db import get_db
from ..google_maps import fetch_place, scrape_records
from ..scoring import VME
from ..summaries import fetch_record

router = APIRouter(tags=["google_maps"])


def _raise(exc: ApifyError) -> None:
    raise HTTPException(409 if "APIFY_TOKEN" in str(exc) else 502, str(exc)) from exc


@router.post("/api/records/{nr}/google-maps/refresh")
def refresh_record(nr: str, conn: sqlite3.Connection = Depends(get_db)) -> dict:
    row = fetch_record(conn, nr)
    if not row:
        raise HTTPException(404, "Record niet gevonden")
    try:
        scrape_records(conn, [row], f"nr:{nr}")
    except ApifyError as exc:
        _raise(exc)
    return fetch_place(conn, nr)


@router.post("/api/streets/{street}/google-maps/refresh")
def refresh_street(street: str, conn: sqlite3.Connection = Depends(get_db)) -> dict:
    rows = [dict(r) for r in conn.execute(
        "SELECT * FROM records WHERE kbo_street = ? COLLATE NOCASE AND legal_form IS NOT ?", (street, VME)
    ).fetchall()]
    if not rows:
        raise HTTPException(404, "Straat niet gevonden")
    try:
        res = scrape_records(conn, rows, f"street:{rows[0]['kbo_street']}")
    except ApifyError as exc:
        _raise(exc)
    return {"street": rows[0]["kbo_street"], **{k: res[k] for k in ("searched", "found", "closed", "seconds")}}
