"""Read-only, complete municipal aggregates from the same records as search."""
import sqlite3
from collections import Counter
from dataclasses import replace

from fastapi import APIRouter, Depends

from ..activity import SECTOR_LABELS
from ..db import get_db
from ..geo import map_items
from ..scoring import STATUS_LABELS, CERTAINTY_LABELS
from ..selection import RecordFilters, filter_records, read_snapshot, select_records
from ..summaries import now_iso

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def sector_counts(items: list[dict]) -> list[dict]:
    counts = Counter(item["activity"]["sector"] for item in items)
    return sorted(
        [{"sector": key, "label": SECTOR_LABELS.get(key, key), "count": n} for key, n in counts.items()],
        key=lambda item: (item["sector"] == "onbekend", -item["count"], item["sector"]),
    )


@router.get("")
def dashboard(filters: RecordFilters = Depends(), conn: sqlite3.Connection = Depends(get_db)):
    # Only Schoten is supported by the current scoring boundary and starter import.
    filters = replace(filters, municipality=filters.municipality or "Schoten")
    with read_snapshot(conn):
        options_items = select_records(conn, replace(filters, activity=None))
        items = filter_records(options_items, filters)
        selected = {item["nr"] for item in items}
        statuses = Counter(item["assessment"]["status"] for item in items)
        certainty = Counter(item["assessment"]["certainty"] for item in items)
        contacts = Counter(item["contact_status"] for item in items)
        types = Counter(item["record_type"] for item in items)
        proposals = Counter()
        unlinked = 0
        for proposal in conn.execute("SELECT record_nr, status FROM proposals"):
            if proposal["record_nr"] in selected:
                proposals[proposal["status"]] += 1
            elif proposal["record_nr"] is None:
                unlinked += 1
        dates = sorted({item["fetched_at"][:10] for item in items if item.get("fetched_at")})
        sources = Counter(item["source"] for item in items)
        municipalities = [
            {"code": row["code"] or row["name"], "name": row["name"]}
            for row in conn.execute(
                "SELECT max(NULLIF(trim(kbo_niscode), '')) AS code, min(trim(kbo_municipality)) AS name"
                " FROM records WHERE trim(kbo_municipality) = 'Schoten' COLLATE NOCASE"
                " GROUP BY lower(trim(kbo_municipality))"
            )
        ]
        name = next((m["name"] for m in municipalities if filters.municipality in (m["code"], m["name"])), filters.municipality)
        return {
            "scope": {"municipality": filters.municipality, "name": name, "type": filters.type, "activity": filters.activity},
            "municipalities": municipalities,
            "total": len(items),
            "types": {key: types[key] for key in ("enterprise", "establishment")},
            "statuses": {key: statuses[key] for key in STATUS_LABELS},
            "certainty": {key: certainty[key] for key in CERTAINTY_LABELS},
            "contacts": {key: contacts[key] for key in ("register", "zetel", "waargenomen", "onbekend")},
            "with_evidence": sum(item["has_evidence"] for item in items),
            "missing_parents": sum(item["record_type"] == "establishment" and not item.get("parent_in_dataset") for item in items),
            "sectors": sector_counts(items), "sector_options": sector_counts(options_items),
            "proposals": {key: proposals[key] for key in ("open", "bevestigd", "afgewezen")},
            "unlinked_proposals_all_municipalities": unlinked,
            "map": map_items(items),
            "provenance": {
                "retrieved_from": dates[0] if dates else None, "retrieved_to": dates[-1] if dates else None,
                "sources": dict(sources), "complete_municipality": False if sources.get("starter-geojson") else None,
                "registry_snapshot_date": None, "computed_at": now_iso(),
            },
        }
