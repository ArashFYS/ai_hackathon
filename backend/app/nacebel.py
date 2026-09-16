"""Official NACEBEL 2025 code list (app/data/nacebel_2025.csv, from FOD Economie NACEBEL_2025.xlsx).

Levels: 1 = sectie (letter), 2 = afdeling (2 digits), 3 = groep, 4 = klasse, 5 = subklasse (5 digits).
KBO shows codes as "63.920" or "73.11005"; the DB stores "63920". Lookups strip dots.
"""
import csv
from functools import lru_cache
from pathlib import Path

CSV_PATH = Path(__file__).parent / "data" / "nacebel_2025.csv"

# Section letter → range of 2-digit divisions (NACE Rev. 2.1 structure).
_SECTIONS = [
    ("A", 1, 3), ("B", 5, 9), ("C", 10, 33), ("D", 35, 35), ("E", 36, 39), ("F", 41, 43), ("G", 46, 47),
    ("H", 49, 53), ("I", 55, 56), ("J", 58, 60), ("K", 61, 63), ("L", 64, 66), ("M", 68, 68), ("N", 69, 75),
    ("O", 77, 82), ("P", 84, 84), ("Q", 85, 85), ("R", 86, 88), ("S", 90, 93), ("T", 94, 96), ("U", 97, 98),
    ("V", 99, 99),
]


def normalize(code: str | None) -> str:
    return (code or "").replace(".", "").replace(" ", "").strip()


@lru_cache(maxsize=1)
def _table() -> dict[str, tuple[int, str]]:
    out: dict[str, tuple[int, str]] = {}
    with open(CSV_PATH, encoding="utf-8", newline="") as f:
        for r in csv.DictReader(f):
            out[normalize(r["code"])] = (int(r["level"]), r["title_nl"])
    return out


def title(code: str | None) -> str | None:
    """Dutch title of the longest known prefix of `code` (subclass → class → group → division), or None."""
    c = normalize(code)
    t = _table()
    for n in (7, 5, 4, 3, 2):
        if len(c) >= n and c[:n] in t:
            return t[c[:n]][1]
    return None


def section_of(code: str | None) -> tuple[str, str] | None:
    """(letter, title) of the NACE section a code belongs to."""
    c = normalize(code)
    if len(c) < 2 or not c[:2].isdigit():
        return None
    d = int(c[:2])
    for letter, lo, hi in _SECTIONS:
        if lo <= d <= hi:
            return letter, _table().get(letter, (1, ""))[1]
    return None


def describe(code: str | None) -> dict | None:
    """{ code, title, division, division_title, section, section_title } or None for unknown codes."""
    c = normalize(code)
    if not c or title(c) is None:
        return None
    sec = section_of(c)
    return {
        "code": c, "title": title(c),
        "division": c[:2], "division_title": _table().get(c[:2], (2, None))[1],
        "section": sec[0] if sec else None, "section_title": sec[1] if sec else None,
    }


def search(q: str, limit: int = 20) -> list[dict]:
    """Codes whose code or title contains `q` (case-insensitive); most specific levels first."""
    ql = q.strip().lower()
    if not ql:
        return []
    hits = [(lvl, code, t) for code, (lvl, t) in _table().items() if ql in code or ql in t.lower()]
    hits.sort(key=lambda h: (h[1].startswith(normalize(ql)) is False, -h[0], h[1]))
    return [{"code": code, "level": lvl, "title": t} for lvl, code, t in hits[:limit]]
