"""Fetch Google Maps listings for KBO records through the Apify actor compass/crawler-google-places.

Usage:
  uv run python scripts/fetch_google_maps.py --street Paalstraat
  uv run python scripts/fetch_google_maps.py --nr 2347620526 0740562732
  uv run python scripts/fetch_google_maps.py --all [--batch 100]
  uv run python scripts/fetch_google_maps.py --street Paalstraat --dry-run          # queries + cost estimate, no network
  uv run python scripts/fetch_google_maps.py --from-json scripts/samples/apify-google-maps-sample.json   # offline
  uv run python scripts/fetch_google_maps.py --street Paalstraat --from-run I6fNc5wYRPrnWTbDW            # re-map a finished run (free)

Needs APIFY_TOKEN in backend/.env (except --dry-run / --from-json). Records that already have a
google_maps_places row are skipped unless --force.
"""
import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.apify import ACTOR_NAME, COST_PER_QUERY_USD, ApifyError, actor_input, fetch_items, get_run, start_run, wait_for_run  # noqa: E402
from app.db import DB_PATH, apply_schema, connect  # noqa: E402
from app.env import load_dotenv  # noqa: E402
from app.google_maps import queries_for, store_items  # noqa: E402
from app.scoring import VME  # noqa: E402


def select_rows(conn, args) -> list[dict]:
    if args.nr:
        ph = ",".join("?" * len(args.nr))
        sql, params = f"SELECT * FROM records WHERE nr IN ({ph})", list(args.nr)
    elif args.street:
        sql, params = "SELECT * FROM records WHERE kbo_street = ? COLLATE NOCASE AND legal_form IS NOT ?", [args.street, VME]
    else:
        sql, params = "SELECT * FROM records WHERE legal_form IS NOT ?", [VME]
    rows = [dict(r) for r in conn.execute(sql + " ORDER BY kbo_street, kbo_housenr, nr", params).fetchall()]
    if not args.force:
        done = {r[0] for r in conn.execute("SELECT record_nr FROM google_maps_places").fetchall()}
        skipped = [r for r in rows if r["nr"] in done]
        rows = [r for r in rows if r["nr"] not in done]
        if skipped:
            print(f"{len(skipped)} records already scraped, skipped (use --force to redo)")
    return rows


def from_json(conn, rows, path: Path) -> None:
    items = json.loads(path.read_text(encoding="utf-8"), strict=False)
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    run = {"run_id": f"file:{path.name}", "actor": ACTOR_NAME, "started_at": now, "finished_at": now,
           "status": "FILE", "scope": f"file:{path.name}", "cost_usd": None}
    res = store_items(conn, rows, items, run, only_present=True)
    print(f"{path.name}: {len(items)} items → {res}")


def from_run(conn, rows, run_id: str, scope: str) -> None:
    run = {**get_run(run_id), "scope": scope}
    items = fetch_items(run["dataset_id"])
    res = store_items(conn, rows, items, run, only_present=True)
    print(f"run {run_id}: {len(items)} items → {res}")


def live(conn, rows, batch: int, scope: str) -> None:
    """Start every batch at once (Apify queues what its memory limit cannot run yet), then wait and store
    each. A TIMED-OUT run still yields its partial dataset; records without an item stay unscraped so a
    later run picks them up."""
    by_query = queries_for(rows)
    queries = list(by_query)
    chunks = [queries[i:i + batch] for i in range(0, len(queries), batch)]
    runs: list[tuple[int, list[str], dict | None]] = []
    for i, chunk in enumerate(chunks, 1):
        try:
            run = start_run(actor_input(chunk))
            print(f"batch {i}/{len(chunks)}: run {run['run_id']} started ({len(chunk)} queries)", flush=True)
            runs.append((i, chunk, run))
        except ApifyError as exc:
            print(f"batch {i}/{len(chunks)} kon niet starten: {exc}", flush=True)
            runs.append((i, chunk, None))
    for i, chunk, run in runs:
        if run is None:
            continue
        chunk_rows = [r for q in chunk for r in by_query[q]]
        try:
            run = {**run, **wait_for_run(run["run_id"]), "scope": f"{scope}:batch {i}/{len(chunks)}"}
            items = fetch_items(run["dataset_id"])
        except ApifyError as exc:
            print(f"batch {i}/{len(chunks)} mislukt: {exc}", flush=True)
            continue
        res = store_items(conn, chunk_rows, items, run, only_present=True)
        print(f"batch {i}/{len(chunks)}: {run['status']} {res}, cost ${run.get('cost_usd') or 0:.3f}", flush=True)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--street")
    g.add_argument("--nr", nargs="+")
    g.add_argument("--all", action="store_true")
    ap.add_argument("--batch", type=int, default=100)
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--from-json", type=Path)
    ap.add_argument("--from-run", help="Apify run id whose dataset is re-mapped (no new scrape)")
    args = ap.parse_args()
    load_dotenv()
    apply_schema()
    conn = connect()
    if args.from_json or args.from_run:
        args.force = True
    rows = select_rows(conn, args)
    queries = queries_for(rows)
    scope = f"nr:{','.join(args.nr)}" if args.nr else f"street:{args.street}" if args.street else "all"
    print(f"{DB_PATH}: {len(rows)} records → {len(queries)} unique queries, ≈ ${len(queries) * COST_PER_QUERY_USD:.2f}")
    if args.dry_run:
        for q in queries:
            print("  ", q)
        return
    if args.from_json:
        from_json(conn, rows, args.from_json)
        return
    if args.from_run:
        from_run(conn, rows, args.from_run, scope)
        return
    if not rows:
        return
    live(conn, rows, args.batch, scope)


if __name__ == "__main__":
    main()
