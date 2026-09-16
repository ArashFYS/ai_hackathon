"""Pre-fill indicator_cache with KBO Public Search pages (kind kbo_public) and Street View anchors (kind streetview).

Usage: uv run python scripts/prefetch_kbo_public.py [--street Paalstraat] [--only kbo|streetview] [--force]
Sequential, polite (0.3 s between KBO pages). Existing cache entries are skipped unless --force.
"""
import argparse
import sys
import time
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import kbo_public, streetview  # noqa: E402
from app.db import connect  # noqa: E402
from app.indicator_cache import cache_get, cache_put  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--street")
    ap.add_argument("--only", choices=["kbo", "streetview"])
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()
    conn = connect()
    sql, params = "SELECT * FROM records", []
    if args.street:
        sql += " WHERE kbo_street = ? COLLATE NOCASE"
        params.append(args.street)
    rows = [dict(r) for r in conn.execute(sql + " ORDER BY kbo_street, kbo_housenr", params)]
    kbo_client = httpx.Client(headers=kbo_public.HEADERS, timeout=15, follow_redirects=True)
    sv_client = httpx.Client(headers=streetview.HEADERS, timeout=15)
    done = {"kbo": 0, "streetview": 0}
    t0 = time.time()
    for i, row in enumerate(rows, 1):
        if args.only != "streetview" and (args.force or not cache_get(conn, "kbo_public", row["nr"])):
            payload, ok = kbo_public.fetch_live(row, kbo_client)
            if ok:
                cache_put(conn, "kbo_public", row["nr"], payload)
                done["kbo"] += 1
            else:
                print("kbo", row["nr"], payload.get("note"), flush=True)
            time.sleep(0.3)
        if args.only != "kbo" and (args.force or not cache_get(conn, "streetview", row["nr"])):
            payload, ok = streetview.compute(row, sv_client)
            if ok:
                cache_put(conn, "streetview", row["nr"], payload)
                done["streetview"] += 1
            else:
                print("streetview", row["nr"], payload.get("note"), flush=True)
        if i % 25 == 0:
            print(f"{i}/{len(rows)} {done} {time.time() - t0:.0f}s", flush=True)
    print(f"done {done} in {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
