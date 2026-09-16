"""Activity options scoped to municipality and record type."""
import sqlite3
from fastapi import APIRouter, Depends
from ..db import get_db
from ..selection import RecordFilters, read_snapshot, select_records
from .dashboard import sector_counts

router = APIRouter(prefix="/api/activities", tags=["activities"])

@router.get("")
def list_activities(municipality: str | None = None, type: str | None = None, conn: sqlite3.Connection = Depends(get_db)):
    with read_snapshot(conn):
        return sector_counts(select_records(conn, RecordFilters(municipality=municipality, type=type)))
