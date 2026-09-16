"""Belgisch Staatsblad publications for a record (enterprise level), cached in indicator_cache."""
import sqlite3

from fastapi import APIRouter, Depends, HTTPException

from .. import staatsblad
from ..db import get_db
from ..indicator_cache import cache_get, cache_put
from ..links import enterprise_nr_of
from ..summaries import fetch_record

router = APIRouter(tags=["staatsblad"])


@router.post("/api/records/{nr}/staatsblad")
def refresh_staatsblad(nr: str, conn: sqlite3.Connection = Depends(get_db)) -> dict:
    row = fetch_record(conn, nr)
    if not row:
        raise HTTPException(404, "Record niet gevonden")
    ent = enterprise_nr_of(row)
    if not ent:
        return {"available": False, "url": None, "last_publication": None, "count": 0, "publications": [],
                "note": "Geen ondernemingsnummer gekend voor dit record."}
    payload, ok = staatsblad.fetch_live(ent)
    if ok:
        cache_put(conn, "staatsblad", ent, payload)
        return payload
    hit = cache_get(conn, "staatsblad", ent)
    if hit:
        stale = hit[0]
        stale["note"] = (stale.get("note") or "") + " (uit cache; bron momenteel niet bereikbaar)"
        return stale
    return payload
