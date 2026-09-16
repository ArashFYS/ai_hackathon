"""Minimal .env loader (backend/.env, gitignored): KEY=value lines, no quotes handling beyond stripping."""
import os
from pathlib import Path

_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


def load() -> None:
    if not _ENV_FILE.exists():
        return
    for line in _ENV_FILE.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


load()


def maps_embed_key() -> str | None:
    return os.environ.get("GOOGLE_MAPS_EMBED_KEY") or None
