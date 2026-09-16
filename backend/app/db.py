"""SQLite connection helpers. The database file lives in backend/data.db (gitignored)."""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "data.db"


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)  # FastAPI may hand the dependency to another worker thread
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def get_db():
    """FastAPI dependency: one connection per request."""
    conn = connect()
    try:
        yield conn
    finally:
        conn.close()

SCHEMA_PATH = Path(__file__).resolve().parent / "schema.sql"


def apply_schema() -> None:
    """Create any missing tables/indexes (schema.sql is IF NOT EXISTS-safe)."""
    conn = connect()
    try:
        conn.executescript(SCHEMA_PATH.read_text())
        _add_missing_columns(conn, "evidence", {"phone": "TEXT", "email": "TEXT", "website": "TEXT"})
        conn.commit()
    finally:
        conn.close()


def _add_missing_columns(conn: sqlite3.Connection, table: str, columns: dict[str, str]) -> None:
    """ALTER TABLE ADD COLUMN for columns added after the table was first created."""
    existing = {r["name"] for r in conn.execute(f"PRAGMA table_info({table})").fetchall()}
    for name, ddl in columns.items():
        if name not in existing:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}")
