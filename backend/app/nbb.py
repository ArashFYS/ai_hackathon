"""NBB Balanscentrale public API client with a 1-day SQLite cache. Never raises: failures → available:false."""
import csv
import io
import json
import sqlite3
from datetime import date, datetime, timedelta, timezone

import httpx

BASE = "https://consult.cbso.nbb.be"
HEADERS = {"User-Agent": "Mozilla/5.0", "Accept": "application/json"}
RUBRICS = {"70": "omzet", "9900": "brutomarge", "9901": "bedrijfsresultaat", "9904": "winst_verlies",
           "10/15": "eigen_vermogen", "20/58": "balanstotaal", "1003": "vte"}
MAX_FIGURES = 3
CACHE_TTL = timedelta(days=1)
TIMEOUT = 10


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _empty(nr: str, note: str, available: bool = False, company: dict | None = None) -> dict:
    return {
        "available": available, "enterprise_nr": nr, "url": f"{BASE}/consult-enterprise/{nr}",
        "company": company, "deposits": [], "last_deposit_date": None, "months_since_last_deposit": None,
        "fetched_at": _now(), "note": note,
    }


def _company(client: httpx.Client, nr: str) -> dict | None:
    """None when the Balanscentrale does not know the enterprise (404)."""
    r = client.get(f"{BASE}/api/rs-consult/companies/{nr}/NL")
    if r.status_code == 404:
        return None
    r.raise_for_status()
    c = json.loads(r.text, strict=False)
    street = " ".join(p for p in [c.get("streetName"), c.get("streetNumber")] if p)
    if c.get("boxNumber"):
        street += f" bus {c['boxNumber']}"
    place = " ".join(p for p in [c.get("postalCode"), c.get("town")] if p)
    return {
        "name": c.get("name"), "legal_form": c.get("legalForm"), "legal_situation": c.get("legalSituation"),
        "legal_situation_date": c.get("legalSituationDate"), "address": ", ".join(p for p in [street, place] if p),
        "email": c.get("email"), "website": c.get("website"),
    }


def _deposits(client: httpx.Client, nr: str) -> list[dict]:
    r = client.get(f"{BASE}/api/rs-consult/published-deposits",
                   params={"page": 0, "size": 10, "enterpriseNumber": nr, "sort": "depositDate,desc"})
    r.raise_for_status()
    return json.loads(r.text, strict=False).get("content") or []


def _figures(client: httpx.Client, deposit_id: str) -> dict:
    figures = {v: None for v in RUBRICS.values()}
    try:
        r = client.get(f"{BASE}/api/external/broker/public/deposits/consult/csv/{deposit_id}")
        r.raise_for_status()
        for line in csv.reader(io.StringIO(r.text)):
            if len(line) >= 2 and line[0] in RUBRICS:
                try:
                    figures[RUBRICS[line[0]]] = float(line[1])
                except ValueError:
                    pass
    except Exception:  # figures are optional; the deposit list is still useful
        pass
    return figures


def _months_since(day: str | None) -> int | None:
    if not day:
        return None
    d, today = date.fromisoformat(day), date.today()
    return (today.year - d.year) * 12 + today.month - d.month


def fetch_live(nr: str) -> tuple[dict, bool]:
    """Returns (payload, cacheable). Network errors are not cacheable."""
    try:
        with httpx.Client(headers=HEADERS, timeout=TIMEOUT) as client:
            company = _company(client, nr)
            if company is None:
                return _empty(nr, "Niet gekend bij de Balanscentrale (bv. natuurlijk persoon, vereniging of "
                                  "vennootschap zonder neerleggingsplicht)"), True
            raw = _deposits(client, nr)
            deposits = []
            for i, d in enumerate(raw):
                did = d.get("id")
                deposits.append({
                    "id": did, "year": d.get("periodEndDateYear"),
                    "period_start": (d.get("periodStartDate") or "")[:10] or None,
                    "period_end": (d.get("periodEndDate") or "")[:10] or None,
                    "model": d.get("modelName"), "deposit_date": (d.get("depositDate") or "")[:10] or None,
                    "pdf_url": f"{BASE}/api/external/broker/public/deposits/pdf/{did}",
                    "figures": _figures(client, did) if i < MAX_FIGURES else {v: None for v in RUBRICS.values()},
                })
    except Exception as exc:
        return _empty(nr, f"Balanscentrale (NBB) niet bereikbaar: {type(exc).__name__}"), False
    last = max((d["deposit_date"] for d in deposits if d["deposit_date"]), default=None)
    months = _months_since(last)
    if deposits:
        note = f"{len(deposits)} neerlegging(en) gevonden; cijfers van de {min(len(deposits), MAX_FIGURES)} recentste."
        if months is not None and months > 18:
            note += f" Laatste neerlegging is {months} maanden geleden."
    else:
        note = "Gekend bij de Balanscentrale, maar geen neergelegde jaarrekeningen gevonden."
    payload = _empty(nr, note, available=True, company=company)
    payload.update({"deposits": deposits, "last_deposit_date": last, "months_since_last_deposit": months})
    return payload, True


def get_nbb(conn: sqlite3.Connection, nr: str) -> dict:
    row = conn.execute("SELECT fetched_at, payload FROM nbb_cache WHERE nr = ?", (nr,)).fetchone()
    if row:
        fetched = datetime.fromisoformat(row["fetched_at"])
        if datetime.now(timezone.utc) - fetched < CACHE_TTL:
            return json.loads(row["payload"], strict=False)
    payload, cacheable = fetch_live(nr)
    if cacheable:
        conn.execute("INSERT OR REPLACE INTO nbb_cache (nr, fetched_at, payload) VALUES (?, ?, ?)",
                     (nr, payload["fetched_at"], json.dumps(payload, ensure_ascii=False)))
        conn.commit()
    elif row:  # stale cache beats a network failure
        stale = json.loads(row["payload"], strict=False)
        stale["note"] = (stale.get("note") or "") + " (uit cache; NBB momenteel niet bereikbaar)"
        return stale
    return payload
