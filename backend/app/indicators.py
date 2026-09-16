"""Three per-record activity lights: KBO (register), Google Maps (listing), e-facturatie (Peppol).

Pure functions over the record row, its parent and cached lookup payloads; no network here.
"""
import sqlite3

from .indicator_cache import cache_get_many
from .links import enterprise_nr_of
from .peppol import obliged
from .scoring import VME, kbo_url, register_negative_reasons, snapshot_date

LEVEL_LABELS = {"groen": "Groen", "geel": "Geel", "rood": "Rood", "onbekend": "Onbekend"}


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


def google_maps_indicator(payload: dict | None) -> dict:
    if payload is None:
        return indicator("onbekend", "Niet gecontroleerd", "Nog niet opgezocht op Google Maps")
    checked = (payload.get("fetched_at") or "")[:10] or None
    if payload.get("error"):
        return indicator("onbekend", "Controle mislukt", payload.get("note") or "Google Maps niet bereikbaar", checked)
    if not payload.get("found"):
        return indicator("geel", "Geen vermelding", payload.get("note") or "Geen Google Maps-vermelding op dit adres", checked)
    name, status, url = payload.get("name"), payload.get("business_status"), payload.get("url")
    suffix = " (vermelding, geen recensies gecontroleerd)"
    if status == "CLOSED_PERMANENTLY":
        return indicator("rood", "Permanent gesloten", f"Google Maps: {name} staat als permanent gesloten", checked, url)
    if status == "OPERATIONAL":
        return indicator("groen", "Vermeld als open", f"Vermeld op Google Maps als open: {name}{suffix}", checked, url)
    label = "Tijdelijk gesloten" if status == "CLOSED_TEMPORARILY" else "Status onbekend"
    return indicator("geel", label, f"Google Maps: {name}, status {status or 'onbekend'}{suffix}", checked, url)


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


def build_indicators(row: dict, parent: dict | None, google_maps: dict | None, einvoice: dict | None) -> dict:
    return {
        "kbo": kbo_indicator(row, parent),
        "google_maps": google_maps_indicator(google_maps),
        "einvoice": einvoice_indicator(einvoice, row, parent),
    }


def load_indicator_cache(conn: sqlite3.Connection, rows: list[dict]) -> dict[str, dict[str, dict]]:
    """Cached payloads for many rows: {"google_maps": {nr: payload}, "einvoice": {enterprise_nr: payload}}."""
    nrs = sorted({r["nr"] for r in rows})
    ents = sorted({e for e in (enterprise_nr_of(r) for r in rows) if e})
    return {
        "google_maps": cache_get_many(conn, "google_maps", nrs) if nrs else {},
        "einvoice": cache_get_many(conn, "einvoice", ents) if ents else {},
    }


def indicators_for(row: dict, parent: dict | None, cached: dict | None) -> dict:
    c = cached or {}
    return build_indicators(
        row, parent, c.get("google_maps", {}).get(row["nr"]), c.get("einvoice", {}).get(enterprise_nr_of(row))
    )
