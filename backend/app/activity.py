"""Activity (sector) of a record: NACE 2-digit → Dutch sector, or officer-observed activity by keyword.

Sources, in order: VKBO nace_rsz → nace_vat → KBO Public Search main activity (cached, TICKET-035)
→ latest officer observation (keyword) → onbekend. Descriptions come from the NACEBEL 2025 list when known.
"""
from . import nacebel
from .kbo_public import main_activity

# NACE 2-digit prefix → (sector_key, Dutch label). Codes in the DB are 5-digit strings ("86230").
_SECTOR_DEFS: list[tuple[list[str], str, str]] = [
    (["47"], "detailhandel", "Detailhandel"),
    (["56"], "horeca", "Horeca"),
    (["86"], "zorg", "Gezondheidszorg"),
    (["96"], "persoonlijke_diensten", "Persoonlijke diensten (kapsalons, schoonheid…)"),
    (["45"], "garages", "Garages en autohandel"),
    (["68"], "vastgoed", "Vastgoed"),
    (["41", "42", "43"], "bouw", "Bouw"),
    (["69", "70", "71", "73", "74"], "zakelijke_diensten", "Zakelijke diensten"),
    (["85"], "onderwijs", "Onderwijs"),
    (["94"], "verenigingen", "Verenigingen"),
    (["84", "88"], "overheid_welzijn", "Overheid en welzijn"),
    ([f"{n:02d}" for n in range(10, 34)], "industrie", "Industrie"),
    (["46"], "groothandel", "Groothandel"),
    ([f"{n:02d}" for n in range(49, 54)], "transport", "Transport en logistiek"),
    (["62", "63"], "ict", "ICT"),
    (["64", "65", "66"], "financieel", "Financiële diensten"),
]

SECTORS: dict[str, tuple[str, str]] = {
    prefix: (key, label) for prefixes, key, label in _SECTOR_DEFS for prefix in prefixes
}
OVERIGE = ("overige", "Overige")
ONBEKEND = ("onbekend", "Onbekend")

# Every sector key → label (for /api/activities and the UI).
SECTOR_LABELS: dict[str, str] = {key: label for _, key, label in _SECTOR_DEFS}
SECTOR_LABELS[OVERIGE[0]] = OVERIGE[1]
SECTOR_LABELS[ONBEKEND[0]] = ONBEKEND[1]

# Officer-observed activity text (lowercase contains) → NACE 2-digit prefix. First hit wins, in this order.
KEYWORDS: list[tuple[list[str], str]] = [
    (["kapsalon", "kapper", "schoonheid", "nagel"], "96"),
    (["bakkerij", "slager", "winkel", "boetiek", "apotheek", "supermarkt", "kledij"], "47"),
    (["restaurant", "café", "cafe", "bar", "frituur", "brasserie", "pizzeria", "snack"], "56"),
    (["tandarts", "dokter", "huisarts", "kine", "psycholoog"], "86"),
    (["garage", "carwash", "bandencentrale"], "45"),
    (["immo", "vastgoed"], "68"),
    (["aannemer", "bouw", "schrijnwerk", "loodgieter", "elektricien", "dakwerk"], "43"),
]


def sector_for_nace(code: str | None) -> tuple[str, str]:
    """(sector_key, label) for a NACE code; unknown prefix → overige, empty → onbekend."""
    code = (code or "").strip()
    if not code:
        return ONBEKEND
    return SECTORS.get(code[:2], OVERIGE)


def nace_for_text(text: str | None) -> str | None:
    """NACE 2-digit prefix for a free-text observed activity, or None if no keyword matches."""
    t = (text or "").lower()
    if not t:
        return None
    for words, prefix in KEYWORDS:
        if any(w in t for w in words):
            return prefix
    return None


def activity_of(row: dict, evidence: list[dict], kbo_public: dict | None = None) -> dict:
    """Activity of a record: KBO (RSZ) → KBO (BTW) → KBO Public Search → latest observed activity → onbekend.

    `evidence` is expected sorted latest-first (observed_at DESC, id DESC); `kbo_public` is the cached
    KBO Public Search payload for this record (or None).
    Returns {"sector", "label", "source", "nace", "description", "activities", "sectors"}; `activities` lists every
    NACEBEL 2025 activity known from KBO Public Search (may be empty) and `sectors` every sector key the record
    belongs to (primary + one per KBO activity) — the activity filter matches on any of them (TICKET-042).
    """
    acts = (kbo_public or {}).get("activities") or []
    return _with_sectors(_primary(row, evidence, kbo_public, acts), acts)


def _with_sectors(activity: dict, acts: list[dict]) -> dict:
    sectors = [activity["sector"]] + [sector_for_nace(a.get("code"))[0] for a in acts]
    unique = list(dict.fromkeys(sectors))
    if len(unique) > 1:
        unique = [k for k in unique if k != ONBEKEND[0]]
    return {**activity, "sectors": unique}


def _primary(row: dict, evidence: list[dict], kbo_public: dict | None, acts: list[dict]) -> dict:
    for col, source in (("nace_rsz", "KBO (RSZ)"), ("nace_vat", "KBO (BTW)")):
        code = (row.get(col) or "").strip()
        if code:
            key, label = sector_for_nace(code)
            return {"sector": key, "label": label, "source": source, "nace": code,
                    "description": row.get(f"{col}_desc") or nacebel.title(code), "activities": acts}
    main = main_activity(kbo_public)
    if main:
        key, label = sector_for_nace(main["code"])
        return {"sector": key, "label": label, "source": "KBO (publiek)", "nace": main["code"],
                "description": main.get("title") or nacebel.title(main["code"]), "activities": acts}
    for ev in evidence:
        text = (ev.get("observed_activity") or "").strip()
        if not text:
            continue
        prefix = nace_for_text(text)
        if prefix:
            key, label = SECTORS[prefix]
            return {"sector": key, "label": label, "source": "waarneming", "nace": prefix, "description": text,
                    "activities": acts}
        break  # only the latest observation with an activity counts
    return {"sector": ONBEKEND[0], "label": ONBEKEND[1], "source": None, "nace": None, "description": None,
            "activities": acts}
