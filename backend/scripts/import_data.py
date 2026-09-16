"""Import VKBO GeoJSON into backend/data.db.

Usage:
  uv run python scripts/import_data.py ../data/raw/schoten-kbo-1000-2026-09-07.geojson
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import DB_PATH, apply_schema, connect  # noqa: E402
from app.vkbo import feature_to_row, upsert_sql  # noqa: E402


def main(path: str) -> None:
    # strict=False: the VKBO API embeds raw control characters in some strings
    data = json.loads(Path(path).read_text(encoding="utf-8"), strict=False)
    features = data["features"]
    apply_schema()  # creates the tables on a fresh DB, migrates an older one in place
    conn = connect()
    # the starter files are a dated snapshot: use its retrieval date, not the import time
    meta_path = Path(path).with_name("source-metadata.json")
    snapshot = None
    if meta_path.exists():
        snapshot = (json.loads(meta_path.read_text()).get("retrieved_on") or "")[:10] or None
    rows = [feature_to_row(f, source="starter-geojson", fetched_at=snapshot) for f in features]
    conn.executemany(upsert_sql(), rows)
    conn.commit()
    total, ent, est = conn.execute(
        "SELECT COUNT(*), SUM(record_type='enterprise'), SUM(record_type='establishment') FROM records"
    ).fetchone()
    print(f"{DB_PATH}: {total} records ({ent} enterprises, {est} establishments)")


if __name__ == "__main__":
    main(sys.argv[1])
