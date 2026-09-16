"""SQLite connection helpers. The database file lives in backend/data.db (gitignored)."""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "data.db"


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
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
        conn.commit()
    finally:
        conn.close()
