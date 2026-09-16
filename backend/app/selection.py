"""Shared record selection for counts, search, map and proposal drilldowns."""
import re
import sqlite3
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Literal

from .summaries import summarize_many


@dataclass
class RecordFilters:
    municipality: str | None = None
    type: Literal["enterprise", "establishment"] | None = None
    activity: str | None = None
    status: Literal["actief", "ter_controle", "waarschijnlijk_niet_actief", "geen_onderneming"] | None = None
    certainty: Literal["hoog", "middel", "laag"] | None = None
    contact: Literal["register", "zetel", "waargenomen", "onbekend"] | None = None
    has_evidence: bool | None = None
    parent_missing: bool | None = None
    q: str | None = None
    street: str | None = None


@contextmanager
def read_snapshot(conn: sqlite3.Connection):
    """SQLite SELECTs otherwise run outside a shared transaction."""
    own_transaction = not conn.in_transaction
    if own_transaction:
        conn.execute("BEGIN")
    try:
        yield
    finally:
        if own_transaction:
            conn.rollback()


def select_records(conn: sqlite3.Connection, filters: RecordFilters) -> list[dict]:
    where, params = [], []
    if filters.municipality:
        value = filters.municipality.strip()
        names = [r[0] for r in conn.execute(
            "SELECT DISTINCT kbo_municipality FROM records WHERE kbo_niscode = ?", (value,)
        ) if r[0]]
        clause = ["kbo_niscode = ?", "trim(kbo_municipality) = ? COLLATE NOCASE"]
        params.extend([value, value])
        for name in names:
            clause.append("(NULLIF(trim(kbo_niscode), '') IS NULL AND trim(kbo_municipality) = ? COLLATE NOCASE)")
            params.append(name.strip())
        where.append("(" + " OR ".join(clause) + ")")
    if filters.type:
        where.append("record_type = ?")
        params.append(filters.type)
    if filters.street:
        where.append("kbo_street = ? COLLATE NOCASE")
        params.append(filters.street)
    if filters.q:
        like = f"%{filters.q.strip()}%"
        clause = ["name LIKE ?", "trade_name LIKE ?", "search_name LIKE ?", "kbo_street LIKE ?"]
        params.extend([like] * 4)
        digits = re.sub(r"\D", "", filters.q)
        if 9 <= len(digits) <= 10:
            clause.extend(["nr = ?", "parent_nr = ?"])
            params.extend([digits.zfill(10)] * 2)
        where.append("(" + " OR ".join(clause) + ")")
    sql = "SELECT * FROM records"
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY kbo_street, kbo_housenr, name, nr"
    rows = [dict(r) for r in conn.execute(sql, params)]
    return filter_records(summarize_many(conn, rows), filters)


def filter_records(items: list[dict], filters: RecordFilters) -> list[dict]:
    def matches(item):
        assessment = item["assessment"]
        missing = item["record_type"] == "establishment" and not item.get("parent_in_dataset")
        return (
            (not filters.activity or item["activity"]["sector"] == filters.activity)
            and (not filters.status or assessment["status"] == filters.status)
            and (not filters.certainty or assessment["certainty"] == filters.certainty)
            and (not filters.contact or item["contact_status"] == filters.contact)
            and (filters.has_evidence is None or item["has_evidence"] == filters.has_evidence)
            and (filters.parent_missing is None or missing == filters.parent_missing)
        )
    return [item for item in items if matches(item)]
