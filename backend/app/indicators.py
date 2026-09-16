"""Three per-record activity lights: KBO (register), Google Maps (listing), e-facturatie (Peppol).

Pure functions over the record row, its parent and cached lookup payloads; no network here.
"""
import sqlite3
from datetime import date as _date

from .google_maps import load_places
from .indicator_cache import cache_get_many
from .links import enterprise_nr_of
from .peppol import obliged
from .scoring import VME, kbo_url, register_negative_reasons, snapshot_date

LEVEL_LABELS = {"groen": "Groen", "geel": "Geel", "rood": "Rood", "onbekend": "Onbekend"}
RECENT_DAYS = 183  # "last 6 months"


def _days_since(day: str) -> int:
    try:
        return (_date.today() - _date.fromisoformat(day[:10])).days
    except ValueError:
        return 10**6


def indicator(level: str, label: str, text: str, checked_at: str | None = None, url: str | None = None) -> dict:
    return {"level": level, "label": label, "text": text, "checked_at": checked_at, "url": url}


def _ar_mismatch(row: dict) -> str | None:
    kbo = " ".join(p for p in [row.get("kbo_street"), row.get("kbo_housenr")] if p)
    ar = " ".join(p for p in [row.get("ar_street"), row.get("ar_housenr")] if p)
    if not row.get("ar_street") or not row.get("ar_housenr"):
        return f"Adres niet gevonden in het Adressenregister ({kbo})"
    if row.get("kbo_street") != row.get("ar_street") or row.get("kbo_housenr") != row.get("ar_housenr"):
        return f"Adres wijkt af van het Adressenregister ({kbo} ≠ {ar})"
    return None


def kbo_indicator(row: dict, parent: dict | None) -> dict:
    checked, url = snapshot_date(row), kbo_url(row)
    own = register_negative_reasons(row)
    if own:
        return indicator("rood", "Register: niet actief", "; ".join(r["text"] for r in own), checked, url)
    is_est = row.get("record_type") == "establishment"
    if is_est and parent:
        pneg = register_negative_reasons(parent)
        if pneg:
            text = f"Moederonderneming {parent['nr']}: " + "; ".join(r["text"] for r in pneg)
            return indicator("rood", "Moederonderneming niet actief", text, checked, url)
    legal_form = (parent or {}).get("legal_form") if is_est else row.get("legal_form")
    if legal_form == VME:
        return indicator("geel", "Geen onderneming", "Vereniging van mede-eigenaars: geen handelsactiviteit", checked, url)
    if is_est and not parent:
        return indicator("geel", "Moederonderneming onbekend",
                         "Moederonderneming niet in dataset (zetel mogelijk elders); rechtstoestand niet gekend", checked, url)
    mismatch = _ar_mismatch(row)
    if mismatch:
        return indicator("geel", "Adres nazien", mismatch, checked, url)
    text = "Normale toestand, geen doorhaling, adres bevestigd door het Adressenregister"
    if is_est:
        text += ", moederonderneming in orde"
    return indicator("groen", "Register in orde", text, checked, url)


def _latest_maps_observation(evidence: list[dict] | None) -> dict | None:
    obs = [e for e in (evidence or []) if e.get("source") == "google_maps" and e.get("observed_at")]
    return max(obs, key=lambda e: (e["observed_at"], e.get("id") or 0)) if obs else None


def _observation_indicator(latest: dict) -> dict:
    date, url, what = latest["observed_at"], latest.get("url"), (latest.get("observation") or "").strip()
    text = f"Waarneming op Google Maps op {date}: {what}" if what else f"Waarneming op Google Maps op {date}"
    conclusion = latest.get("conclusion")
    if conclusion == "niet_actief":
        return indicator("rood", "Niet actief volgens Google Maps", text, date, url)
    if conclusion == "actief":
        if _days_since(date) <= RECENT_DAYS:
            return indicator("groen", "Recent actief op Google Maps", text, date, url)
        return indicator("geel", "Waarneming ouder dan 6 maanden", text, date, url)
    return indicator("geel", "Onduidelijk", text, date, url)


def _place_indicator(p: dict) -> dict:
    """From a scraped listing (google_maps_places via Apify) that matched the record."""
    checked, url, title = (p.get("scraped_at") or "")[:10] or None, p.get("url"), p.get("title")
    hint = " — adres wijkt af van het KBO-adres, nazien" if p.get("match_quality") == "naam" else ""
    if p.get("match_quality") == "adres_andere_naam":
        return indicator("geel", "Andere naam op dit adres",
                         f'Google Maps vermeldt "{title}" op dit adres, niet de geregistreerde naam: andere zaak of onbekende handelsnaam, nazien',
                         checked, url)
    if p.get("permanently_closed"):
        return indicator("rood", "Permanent gesloten volgens Google Maps", f'"{title}" staat als permanent gesloten{hint}', checked, url)
    if p.get("temporarily_closed"):
        return indicator("geel", "Tijdelijk gesloten volgens Google Maps", f'"{title}" staat als tijdelijk gesloten{hint}', checked, url)
    latest, n, score = p.get("latest_review_at"), p.get("reviews_count") or 0, p.get("rating")
    stats = f"{score}★, {n} recensies" if score is not None else f"{n} recensies"
    if latest and _days_since(latest) <= RECENT_DAYS:
        return indicator("groen", "Recent actief op Google Maps", f"Recensie op Google Maps op {latest} ({stats}){hint}", checked, url)
    return indicator("geel", "Vermeld op Google Maps", f'"{title}" vermeld op Google Maps, laatste recensie {latest or "geen"} ({stats}){hint}', checked, url)


def google_maps_indicator(evidence: list[dict] | None, place: dict | None = None) -> dict:
    """Scraped listing first; an officer observation newer than the scrape wins; else evidence; else onbekend."""
    obs = _latest_maps_observation(evidence)
    found = bool(place and place.get("match_quality") != "geen" and place.get("title"))
    if found and not (obs and obs["observed_at"] > (place.get("scraped_at") or "")[:10]):
        return _place_indicator(place)
    if obs:
        return _observation_indicator(obs)
    if place:
        return indicator("geel", "Niet gevonden op Google Maps", f'Geen vermelding gevonden voor "{place.get("search_string")}"',
                         (place.get("scraped_at") or "")[:10] or None, None)
    return indicator("onbekend", "Nog niet opgehaald", "Nog niet opgehaald via Apify; log een waarneming of klik \"Ophalen via Apify\"")


def einvoice_indicator(payload: dict | None, row: dict, parent: dict | None) -> dict:
    ent = enterprise_nr_of(row)
    if not ent:
        return indicator("onbekend", "Geen ondernemingsnummer", "Geen ondernemingsnummer bekend")
    if payload is None or payload.get("registered") is None:
        text = payload.get("note") if payload else "Nog niet gecontroleerd op Peppol"
        return indicator("onbekend", "Niet gecontroleerd", text or "Nog niet gecontroleerd op Peppol",
                         (payload or {}).get("fetched_at", "")[:10] or None, (payload or {}).get("url"))
    checked, url, pid = (payload.get("fetched_at") or "")[:10] or None, payload.get("url"), payload.get("participant_id")
    legal_form = (parent or {}).get("legal_form") if row.get("record_type") == "establishment" else row.get("legal_form")
    must = obliged(legal_form)
    if payload["registered"]:
        text = f"Peppol-deelnemer {pid}"
        d = payload.get("directory") or {}
        if d.get("name") or d.get("reg_date"):
            text += f" ({d.get('name') or 'naam onbekend'}, sinds {d.get('reg_date') or 'datum onbekend'})"
        return indicator("groen", "Geregistreerd op Peppol", text, checked, url)
    if must is False:
        return indicator("geel", "Niet op Peppol", f"Niet geregistreerd op Peppol ({pid}) — niet verplicht voor {legal_form}", checked, url)
    text = f"Niet geregistreerd op Peppol onder ondernemingsnummer {pid}; verplicht sinds 1 januari 2026 voor btw-plichtige ondernemingen"
    return indicator("rood", "Niet op Peppol", text, checked, url)


def build_indicators(row: dict, parent: dict | None, evidence: list[dict] | None, einvoice: dict | None,
                     place: dict | None = None) -> dict:
    return {
        "kbo": kbo_indicator(row, parent),
        "google_maps": google_maps_indicator(evidence, place),
        "einvoice": einvoice_indicator(einvoice, row, parent),
    }


def load_indicator_cache(conn: sqlite3.Connection, rows: list[dict]) -> dict[str, dict[str, dict]]:
    """Cached payloads for many rows: {"einvoice": {enterprise_nr: payload}, "google_maps": {nr: place}}. No network."""
    ents = sorted({e for e in (enterprise_nr_of(r) for r in rows) if e})
    nrs = sorted({r["nr"] for r in rows})
    return {
        "einvoice": cache_get_many(conn, "einvoice", ents) if ents else {},
        "google_maps": load_places(conn, nrs) if nrs else {},
    }


def indicators_for(row: dict, parent: dict | None, evidence: list[dict] | None, cached: dict | None) -> dict:
    c = cached or {}
    return build_indicators(row, parent, evidence, c.get("einvoice", {}).get(enterprise_nr_of(row)),
                            c.get("google_maps", {}).get(row["nr"]))
