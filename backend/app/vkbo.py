"""Mapping from VKBO (Digitaal Vlaanderen) feature properties to our `records` row.

Source quirks handled here:
- a single space ' ' means "not set"
- 1900-01-01 and 9999-12-31 are placeholder dates
- registry numbers are text and keep their leading zeros
"""
import json
from datetime import datetime, timezone

PLACEHOLDER_DATES = {"1900-01-01", "9999-12-31"}

# our column -> VKBO property
FIELD_MAP = {
    "nr": "Ondernemingsnr",
    "parent_nr": "Ondernemingsnr_maatsch_zetel",
    "name": "Maatschappelijke_naam",
    "trade_name": "Commerciele_naam",
    "short_name": "Afgekorte_naam",
    "search_name": "Zoeknaam",
    "entity_type": "Type_onderneming",
    "legal_form": "Rechtsvorm",
    "legal_status": "Rechtstoestand",
    "registration_date": "Datum_inschrijving",
    "start_date": "Startdatum",
    "cessation_date": "Datum_stopzetting",
    "cessation_reason": "Reden_stopzetting",
    "closing_date": "Datum_afsluiting",
    "exofficio_strike_start": "Begindat_ambtsh_doorhaling",
    "exofficio_strike_end": "Einddat_ambtsh_doorhaling",
    "exofficio_strike_reason": "Reden_ambtsh_doorhaling",
    "kbo_street": "KBO_Straat",
    "kbo_housenr": "KBO_Huisnr",
    "kbo_box": "KBO_Busnr",
    "kbo_postcode": "KBO_Postcode",
    "kbo_municipality": "KBO_Gemeente",
    "kbo_niscode": "KBO_NISCODE",
    "address_strike_date": "Datum_adresdoorhaling",
    "address_strike_reason": "Reden_adresdoorhaling",
    "ar_street": "AR_straat",
    "ar_housenr": "AR_huisnr",
    "ar_box": "AR_busnr",
    "ar_postcode": "AR_postcode",
    "phone": "Telefoonnummer",
    "email": "Email",
    "nace_vat": "NACE_hoofdact_BTW",
    "nace_vat_desc": "Omschrijving_hoofdact_BTW",
    "nace_rsz": "NACE_hoofdact_RSZ",
    "nace_rsz_desc": "Omschrijving_hoofdact_RSZ",
    "staff_class": "Personeelsklasse",
    "nbb_url": "JAARREK_URL_NBB",
}
DATE_FIELDS = {k for k in FIELD_MAP if k.endswith("_date") or k.endswith("_start") or k.endswith("_end")}


def clean(value):
    """Normalise a raw VKBO value: blanks and placeholders become None."""
    if value is None:
        return None
    if isinstance(value, str):
        value = value.strip()
        if value == "":
            return None
    return value


def clean_date(value):
    value = clean(value)
    if value is None:
        return None
    day = str(value)[:10]
    return None if day in PLACEHOLDER_DATES else day


def feature_to_row(feature: dict, source: str, fetched_at: str | None = None) -> dict:
    props = feature.get("properties", feature)
    row = {}
    for col, prop in FIELD_MAP.items():
        raw = props.get(prop)
        row[col] = clean_date(raw) if col in DATE_FIELDS else clean(raw)
    row["nr"] = str(row["nr"]).zfill(10)
    if row["parent_nr"]:
        row["parent_nr"] = str(row["parent_nr"]).zfill(10)
    row["record_type"] = "establishment" if row["parent_nr"] else "enterprise"
    geom = feature.get("geometry") or {}
    coords = geom.get("coordinates") or [None, None]
    row["lng"], row["lat"] = coords[0], coords[1]
    row["source"] = source
    row["fetched_at"] = fetched_at or datetime.now(timezone.utc).isoformat(timespec="seconds")
    row["raw"] = json.dumps(props, ensure_ascii=False)
    return row


UPSERT_SQL = None


def upsert_sql() -> str:
    global UPSERT_SQL
    if UPSERT_SQL is None:
        cols = list(FIELD_MAP) + ["record_type", "lat", "lng", "source", "fetched_at", "raw"]
        placeholders = ", ".join(f":{c}" for c in cols)
        updates = ", ".join(f"{c}=excluded.{c}" for c in cols if c != "nr")
        UPSERT_SQL = (
            f"INSERT INTO records ({', '.join(cols)}) VALUES ({placeholders}) "
            f"ON CONFLICT(nr) DO UPDATE SET {updates}"
        )
    return UPSERT_SQL
