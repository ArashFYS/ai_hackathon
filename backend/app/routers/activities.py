"""Activity (sector) counts over all records, for the "Activiteit" filter."""
import sqlite3

from fastapi import APIRouter, Depends

from ..activity import SECTOR_LABELS, activity_of
from ..db import get_db
from ..summaries import load_context

router = APIRouter(prefix="/api/activities", tags=["activities"])


@router.get("")
def list_activities(conn: sqlite3.Connection = Depends(get_db)):
    """[{ sector, label, count }] over all records; sorted by count desc, `onbekend` last."""
    rows = [dict(r) for r in conn.execute("SELECT * FROM records").fetchall()]
    _, evidence, cached = load_context(conn, rows)
    counts: dict[str, int] = {}
    for r in rows:
        sector = activity_of(r, evidence.get(r["nr"], []), cached["kbo_public"].get(r["nr"]))["sector"]
        counts[sector] = counts.get(sector, 0) + 1
    out = [{"sector": s, "label": SECTOR_LABELS.get(s, s), "count": n} for s, n in counts.items()]
    out.sort(key=lambda a: (a["sector"] == "onbekend", -a["count"], a["label"]))
    return out
