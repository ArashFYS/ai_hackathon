"""SQLite connection helpers. The database file lives in backend/data.db (gitignored)."""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "data.db"
SCHEMA_PATH = Path(__file__).resolve().parent / "schema.sql"

# Columns added to `proposals` after the first release (TICKET-020); added in place on older DBs.
PROPOSAL_EXTRA_COLS = ("address", "observed_name", "observed_activity", "source", "source_url", "observed_at")


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


def _migrate_proposals(conn: sqlite3.Connection, schema: str) -> None:
    """Make `proposals.record_nr` nullable and add the missing_establishment columns, keeping rows.

    SQLite cannot drop NOT NULL, so an old table is renamed, recreated from schema.sql and copied.
    Idempotent: a table that already has the new shape is left alone.
    """
    cols = {r["name"]: dict(r) for r in conn.execute("PRAGMA table_info(proposals)").fetchall()}
    if not cols:
        return
    if cols["record_nr"]["notnull"] == 1:
        conn.executescript(
            "DROP INDEX IF EXISTS idx_proposals_record;"  # indexes follow the renamed table and keep their names
            "DROP INDEX IF EXISTS idx_proposals_status;"
            "ALTER TABLE proposals RENAME TO proposals_old;"
        )
        conn.executescript(schema)  # recreates `proposals` (new shape) + its indexes
        new_cols = [r["name"] for r in conn.execute("PRAGMA table_info(proposals)").fetchall()]
        keep = ", ".join(c for c in new_cols if c in cols)  # includes id: proposal ids survive
        conn.execute(f"INSERT INTO proposals ({keep}) SELECT {keep} FROM proposals_old")
        conn.execute("DROP TABLE proposals_old")
        conn.commit()
        return
    for c in PROPOSAL_EXTRA_COLS:
        if c not in cols:
            conn.execute(f"ALTER TABLE proposals ADD COLUMN {c} TEXT")
    conn.commit()


def apply_schema() -> None:
    """Create any missing tables/indexes (schema.sql is IF NOT EXISTS-safe) and migrate old tables."""
    schema = SCHEMA_PATH.read_text()
    conn = connect()
    try:
        conn.executescript(schema)
        _add_missing_columns(conn, "evidence", {"phone": "TEXT", "email": "TEXT", "website": "TEXT"})
        conn.commit()
        _migrate_proposals(conn, schema)
    finally:
        conn.close()


def _add_missing_columns(conn: sqlite3.Connection, table: str, columns: dict[str, str]) -> None:
    """ALTER TABLE ADD COLUMN for columns added after the table was first created."""
    existing = {r["name"] for r in conn.execute(f"PRAGMA table_info({table})").fetchall()}
    for name, ddl in columns.items():
        if name not in existing:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}")
