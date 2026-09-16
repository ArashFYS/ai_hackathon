"""Street overview: records grouped per address ("Straatoverzicht")."""
import re
import sqlite3

from fastapi import APIRouter, Depends, HTTPException

from ..db import get_db
from ..summaries import ensure_auto_proposals, load_context, proposal_with_record, summarize

router = APIRouter(prefix="/api/streets", tags=["streets"])


def housenr_key(housenr: str | None) -> tuple:
    """Natural sort: numeric prefix first, then the remaining text ('133-135', '35A')."""
    if not housenr:
        return (10**9, "")
    m = re.match(r"\d+", housenr)
    return (int(m.group()) if m else 10**9, housenr)


@router.get("")
def list_streets(conn: sqlite3.Connection = Depends(get_db)):
    rows = conn.execute(
        "SELECT kbo_street AS street, COUNT(*) AS count FROM records"
        " WHERE kbo_street IS NOT NULL GROUP BY kbo_street ORDER BY count DESC, street"
    ).fetchall()
    return [dict(r) for r in rows]


@router.get("/{street}")
def street_detail(street: str, conn: sqlite3.Connection = Depends(get_db)):
    rows = [dict(r) for r in conn.execute(
        "SELECT * FROM records WHERE kbo_street = ? COLLATE NOCASE", (street,)
    ).fetchall()]
    if not rows:
        raise HTTPException(404, "Straat niet gevonden")
    parents, evidence = load_context(conn, rows)
    items = {}
    for r in rows:  # assess first so auto-proposals exist before we look up open ones
        items[r["nr"]] = summarize(r, parents.get(r.get("parent_nr")), evidence.get(r["nr"], []))
        ensure_auto_proposals(conn, r, items[r["nr"]]["assessment"])
    nrs = [r["nr"] for r in rows]
    open_props: dict[str, dict] = {}
    for i in range(0, len(nrs), 500):
        chunk = nrs[i:i + 500]
        for p in conn.execute(
            f"SELECT * FROM proposals WHERE status = 'open' AND record_nr IN ({','.join('?' * len(chunk))})"
            " ORDER BY id", chunk,
        ).fetchall():
            open_props.setdefault(p["record_nr"], dict(p))

    groups: dict[str, dict] = {}
    for r in rows:
        ev = evidence.get(r["nr"], [])
        item = items[r["nr"]]
        item["last_evidence"] = ev[0] if ev else None
        item["open_proposal"] = open_props.get(r["nr"])
        key = r.get("kbo_housenr") or ""
        g = groups.setdefault(key, {
            "address": " ".join(p for p in [r.get("kbo_street"), key] if p),
            "housenr": r.get("kbo_housenr"), "lat": r.get("lat"), "lng": r.get("lng"), "records": [],
        })
        g["records"].append(item)
    addresses = sorted(groups.values(), key=lambda g: housenr_key(g["housenr"]))
    for g in addresses:
        g["records"].sort(key=lambda i: (i.get("kbo_box") or "", i["display_name"].lower()))
    # businesses seen at an address on this street that have no KBO record there (TICKET-020)
    missing = [proposal_with_record(conn, dict(p)) for p in conn.execute(
        "SELECT * FROM proposals WHERE status = 'open' AND kind = 'missing_establishment'"
        " AND address LIKE ? ORDER BY id", (rows[0]["kbo_street"] + " %",),
    ).fetchall()]
    return {"street": rows[0]["kbo_street"], "addresses": addresses, "missing": missing}
