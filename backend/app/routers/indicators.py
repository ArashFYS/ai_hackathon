"""Live (cached) Peppol lookups: one record, or every record in a street (demo pre-fill)."""
import time

from fastapi import APIRouter, Depends, HTTPException

from ..db import get_db
from ..indicators import build_indicators
from ..links import enterprise_nr_of
from ..peppol import get_einvoice
from ..summaries import fetch_evidence, fetch_record

router = APIRouter(tags=["indicators"])


def _lookup(conn, row: dict, with_directory: bool) -> dict:
    parent = fetch_record(conn, row["parent_nr"]) if row.get("parent_nr") else None
    ent = enterprise_nr_of(row)
    ei = get_einvoice(conn, ent, with_directory=with_directory) if ent else None
    return build_indicators(row, parent, fetch_evidence(conn, row["nr"]), ei)


@router.get("/api/records/{nr}/indicators")
def record_indicators(nr: str, conn=Depends(get_db)) -> dict:
    row = fetch_record(conn, nr)
    if not row:
        raise HTTPException(404, "Record niet gevonden")
    return _lookup(conn, row, with_directory=True)


@router.post("/api/streets/{street}/indicators/refresh")
def refresh_street_indicators(street: str, conn=Depends(get_db)) -> dict:
    rows = [dict(r) for r in conn.execute(
        "SELECT * FROM records WHERE kbo_street = ? COLLATE NOCASE", (street,)
    ).fetchall()]
    if not rows:
        raise HTTPException(404, "Straat niet gevonden")
    started = time.monotonic()
    tally = {k: {"groen": 0, "geel": 0, "rood": 0, "onbekend": 0} for k in ("kbo", "google_maps", "einvoice")}
    for row in rows:
        ind = _lookup(conn, row, with_directory=False)
        for k in tally:
            tally[k][ind[k]["level"]] += 1
    return {"street": street, "records": len(rows), **tally, "seconds": round(time.monotonic() - started, 1)}
