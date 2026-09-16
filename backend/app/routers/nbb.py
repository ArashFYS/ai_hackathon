"""Annual accounts (NBB Balanscentrale) for a record's enterprise."""
import sqlite3

from fastapi import APIRouter, Depends, HTTPException

from ..db import get_db
from ..links import enterprise_nr_of
from ..nbb import get_nbb
from ..summaries import fetch_record

router = APIRouter(prefix="/api/records", tags=["nbb"])


@router.get("/{nr}/nbb")
def record_nbb(nr: str, conn: sqlite3.Connection = Depends(get_db)):
    row = fetch_record(conn, nr)
    if not row:
        raise HTTPException(404, "Record niet gevonden")
    enterprise_nr = enterprise_nr_of(row)
    if not enterprise_nr:
        return {"available": False, "enterprise_nr": None, "url": None, "company": None, "deposits": [],
                "last_deposit_date": None, "months_since_last_deposit": None, "fetched_at": None,
                "note": "Geen ondernemingsnummer gekend voor dit record"}
    return get_nbb(conn, enterprise_nr)
