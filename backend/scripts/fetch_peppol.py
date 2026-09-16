"""Peppol (e-facturatie) registration check for every enterprise number in backend/data.db.

Usage:
  uv run python scripts/fetch_peppol.py            # every record (cached results < 7 days are skipped)
  uv run python scripts/fetch_peppol.py --street Paalstraat
  uv run python scripts/fetch_peppol.py --force    # ignore the cache

Free: one DNS lookup per enterprise number against the Peppol SML (no key, no rate limit). The Peppol
Directory enrichment (name, registration date) is rate-limited and therefore left to the detail page.
"""
import argparse
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import DB_PATH, apply_schema, connect  # noqa: E402
from app.links import enterprise_nr_of  # noqa: E402
from app.peppol import KIND, get_einvoice  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--street")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()
    apply_schema()
    conn = connect()
    sql, params = "SELECT * FROM records", []
    if args.street:
        sql, params = sql + " WHERE kbo_street = ? COLLATE NOCASE", [args.street]
    rows = [dict(r) for r in conn.execute(sql, params).fetchall()]
    nrs = sorted({e for e in (enterprise_nr_of(r) for r in rows) if e})
    if args.force:
        conn.execute(f"DELETE FROM indicator_cache WHERE kind = ? AND key IN ({','.join('?' * len(nrs))})", (KIND, *nrs))
        conn.commit()
    print(f"{DB_PATH}: {len(rows)} records → {len(nrs)} enterprise numbers")
    started, tally = time.monotonic(), {"registered": 0, "not_registered": 0, "unknown": 0}
    for i, nr in enumerate(nrs, 1):
        p = get_einvoice(conn, nr)
        tally["registered" if p.get("registered") else "unknown" if p.get("registered") is None else "not_registered"] += 1
        if i % 100 == 0:
            print(f"  {i}/{len(nrs)}…", flush=True)
    print(f"done in {time.monotonic() - started:.0f} s: {tally}")


if __name__ == "__main__":
    main()
