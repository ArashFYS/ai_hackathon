"""KBO Public Search page scraper: NACEBEL 2025 activities, contact details and status per record.

Establishment → toonvestigingps.html?vestigingsnummer=, enterprise → toonondernemingps.html?ondernemingsnummer=.
Public, no key. Result cached in indicator_cache (kind 'kbo_public', key = own nr) by the prefetch script
or POST /api/records/{nr}/kbo-public. Payload:
  { available: bool, url, status: str|None, snapshot_date: 'YYYY-MM-DD'|None, phone, email, website,
    activities: [{ code, title, kind: 'hoofd'|'neven', since: 'YYYY-MM-DD'|None, register: str|None }], note }
"""
import html
import re
import time

import httpx

from . import nacebel

BASE = "https://kbopub.economie.fgov.be/kbopub/"
HEADERS = {"User-Agent": "Mozilla/5.0 (vind-de-echte-ondernemingen; gemeentelijke controle)", "Accept-Language": "nl"}
_MONTHS = {m: i for i, m in enumerate(
    ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"], 1)}
_NO_DATA = "Geen gegevens opgenomen in KBO"


def page_url(row: dict) -> str:
    if row.get("record_type") == "establishment":
        return f"{BASE}toonvestigingps.html?vestigingsnummer={row['nr']}&lang=nl"
    return f"{BASE}toonondernemingps.html?ondernemingsnummer={row['nr']}&lang=nl"


def _text(fragment: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", fragment))).strip()


def _dutch_date(s: str | None) -> str | None:
    m = re.search(r"(\d{1,2}) (\w+) (\d{4})", s or "")
    if not m or m.group(2).lower() not in _MONTHS:
        return None
    return f"{m.group(3)}-{_MONTHS[m.group(2).lower()]:02d}-{int(m.group(1)):02d}"


def _field(page: str, label: str) -> str | None:
    """Value of a 'Label:' row (Telefoonnummer, E-mail, Webadres, Status …); None when KBO has no data.

    Multi-valued rows (several e-mails) are nested tables; the first value wins."""
    m = re.search(rf"<td[^>]*>\s*{re.escape(label)}\s*:?\s*</td>\s*<td[^>]*>(.*?)</td>\s*</tr>", page, re.S)
    if not m:
        return None
    raw = m.group(1)
    inner = re.findall(r"<td width=\"60%\">(.*?)</td>", raw, re.S)
    value = _text(inner[0] if inner else raw)
    value = re.sub(r"\bSinds \d{1,2} \w+ \d{4}.*$", "", value).strip()
    if not value or _NO_DATA in value:
        return None
    if re.fullmatch(r"[\d\s./+-]+", value) and set(re.sub(r"\D", "", value)) <= {"0"}:
        return None  # placeholder phone number "0000000000"
    return value


def _activities(page: str) -> list[dict]:
    """NACEBEL 2025 block only (the 2008 block follows and is skipped)."""
    start = page.find("Nacebel-code versie 2025")
    if start < 0:
        return []
    end = page.find("versie 2008", start)
    block = page[start:end if end > 0 else None]
    out = []
    for cell in re.findall(r"<td class=\"[QR]L\"[^>]*>(.*?)</td>", block, re.S):
        m = re.search(r"(Hoofdactiviteit|Nevenactiviteit|Hulpactiviteit).*?nace\.code=(\d+)", cell, re.S)
        if not m:
            continue
        code = m.group(2)
        text = _text(cell)
        desc = re.sub(r"^.*?\d{2}\.\d{3,5}\s*-\s*", "", text)
        desc = re.sub(r"\s*Sinds .*$", "", desc).strip()
        out.append({
            "code": code,
            "title": nacebel.title(code) or desc or None,
            "kind": "hoofd" if m.group(1) == "Hoofdactiviteit" else "neven",
            "since": _dutch_date(text),
        })
    return out


def parse_page(page: str, url: str) -> dict:
    snap = re.search(r"Toestand in de KBO databank op (\d{2})/(\d{2})/(\d{4})", page)
    status = _field(page, "Status van de vestigingseenheid") or _field(page, "Status van de entiteit") or _field(page, "Status")
    return {
        "available": True, "url": url,
        "status": status,
        "snapshot_date": f"{snap.group(3)}-{snap.group(2)}-{snap.group(1)}" if snap else None,
        "phone": _field(page, "Telefoonnummer"),
        "email": _field(page, "E-mail"),
        "website": _field(page, "Webadres"),
        "activities": _activities(page),
        "note": None,
    }


def fetch_live(row: dict, client: httpx.Client | None = None) -> tuple[dict, bool]:
    """(payload, cacheable). Network failure → available:false with a Dutch note, not cacheable."""
    url = page_url(row)
    try:
        c = client or httpx.Client(headers=HEADERS, timeout=15, follow_redirects=True)
        for attempt in (1, 2):  # the site occasionally serves an interstitial page; one retry fixes most
            r = c.get(url)
            if r.status_code == 200 and "Toestand in de KBO" in r.text:
                return parse_page(r.text, url), True
            time.sleep(1.0 * attempt)
        return {"available": False, "url": url, "note": f"KBO Public Search antwoordde met status {r.status_code}"}, False
    except httpx.HTTPError as e:
        return {"available": False, "url": url, "note": f"KBO Public Search niet bereikbaar ({type(e).__name__})"}, False


def main_activity(payload: dict | None) -> dict | None:
    """First Hoofdactiviteit (else first activity) of a cached payload."""
    acts = (payload or {}).get("activities") or []
    if not acts:
        return None
    return next((a for a in acts if a["kind"] == "hoofd"), acts[0])
