"""Import VKBO GeoJSON into backend/data.db.

Usage:
  uv run python scripts/import_data.py ../data/raw/schoten-kbo-1000-2026-09-07.geojson
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import DB_PATH, connect  # noqa: E402
from app.vkbo import feature_to_row, upsert_sql  # noqa: E402

SCHEMA = Path(__file__).resolve().parent.parent / "app" / "schema.sql"


def main(path: str) -> None:
    # strict=False: the VKBO API embeds raw control characters in some strings
    data = json.loads(Path(path).read_text(encoding="utf-8"), strict=False)
    features = data["features"]
    conn = connect()
    conn.executescript(SCHEMA.read_text())
    rows = [feature_to_row(f, source="starter-geojson") for f in features]
    conn.executemany(upsert_sql(), rows)
    conn.commit()
    total, ent, est = conn.execute(
        "SELECT COUNT(*), SUM(record_type='enterprise'), SUM(record_type='establishment') FROM records"
    ).fetchone()
    print(f"{DB_PATH}: {total} records ({ent} enterprises, {est} establishments)")


if __name__ == "__main__":
    main(sys.argv[1])
