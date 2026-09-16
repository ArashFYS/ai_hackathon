"""Belgisch Staatsblad (Bijlagen bij het Belgisch Staatsblad — Rechtspersonen) listing scraper.

`rech_res.pl?btw=<enterprise nr>` is public, no captcha; one publication per list item with date, rubric,
article link and (for most non-jaarrekening rows) the "BEELD" PDF. The PDFs are scanned images without a
text layer, so the officer reads them: the end of Luik B names who filed the deed — usually the
boekhoudkantoor holding a volmacht, an easy route to a phone number for the company.
Cached in indicator_cache (kind 'staatsblad', key = enterprise nr) by POST /api/records/{nr}/staatsblad. Payload:
  { available: bool, url, last_publication: 'YYYY-MM-DD'|None, count: int,
    publications: [{ date: 'YYYY-MM-DD'|'YYYY', rubric: str|None, pdf_url, article_url, likely_gemachtigde: bool }],
    note: str|None }
"""
import html
import re

import httpx

BASE = "https://www.ejustice.just.fgov.be"
HEADERS = {"User-Agent": "Mozilla/5.0 (vind-de-echte-ondernemingen; gemeentelijke controle)", "Accept-Language": "nl"}
MAX_PUBLICATIONS = 40
# Rubrics whose deed (Luik B) normally carries the name of the gemachtigde / indiener.
_GEMACHTIGDE_RUBRICS = ("VOLMACHT", "ONTSLAGEN", "BENOEMINGEN", "STATUTEN", "DIVERSEN", "OPRICHTING")
_DATE_LINE = re.compile(r"^(\d{4}(?:-\d{2}-\d{2})?) / ")


def listing_url(ent_nr: str) -> str:
    return f"{BASE}/cgi_tsv/rech_res.pl?language=nl&btw={ent_nr}"


def _text(fragment: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", fragment))).strip()


def _publication(block: str, href: str) -> dict | None:
    lines = [_text(l) for l in block.split("<br>")]
    lines = [l for l in lines if l]
    date_idx = next((i for i, l in enumerate(lines) if _DATE_LINE.match(l)), None)
    if date_idx is None:
        return None
    date = _DATE_LINE.match(lines[date_idx]).group(1)
    rubric = lines[date_idx - 1] if date_idx >= 3 else None  # lines[0]=address, [1]=nr; rubric only when present
    if rubric and rubric.upper().startswith("ME. -"):
        return None  # jaarrekening pointer: NBB has it, and there is no PDF here
    pdf = re.search(r'href="(/(?:tsv_pdf|mopdf)/[^"]+)"[^>]*>\s*BEELD', block)
    up = (rubric or "").upper()
    return {
        "date": date,
        "rubric": rubric,
        "pdf_url": f"{BASE}{pdf.group(1)}" if pdf else None,
        "article_url": f"{BASE}/cgi_tsv/{html.unescape(href)}",
        "likely_gemachtigde": any(k in up for k in _GEMACHTIGDE_RUBRICS),
    }


def parse_listing(page: str, url: str) -> dict:
    if "Geen tekst komt overeen" in page:
        return {"available": False, "url": url, "last_publication": None, "count": 0, "publications": [],
                "note": "Geen publicaties in het Staatsblad (natuurlijke persoon of geen rechtspersoon)."}
    pubs = []
    for m in re.finditer(r'<a href="([^"]+)" class="list-item--title">(.*?)</a>', page, re.S):
        p = _publication(m.group(2), m.group(1))
        if p:
            pubs.append(p)
    pubs.sort(key=lambda p: p["date"], reverse=True)
    total = len(pubs)
    pubs = pubs[:MAX_PUBLICATIONS]
    note = "Enkel de eerste resultatenpagina van het Staatsblad." if total > MAX_PUBLICATIONS else None
    return {"available": bool(pubs), "url": url, "last_publication": pubs[0]["date"] if pubs else None,
            "count": total, "publications": pubs, "note": note}


def fetch_live(ent_nr: str, client: httpx.Client | None = None) -> tuple[dict, bool]:
    """(payload, cacheable). Not cacheable when ejustice is unreachable."""
    url = listing_url(ent_nr)
    try:
        c = client or httpx.Client(timeout=20, headers=HEADERS, follow_redirects=True)
        r = c.get(url)
        if client is None:
            c.close()
        r.raise_for_status()
        page = r.content.decode("cp1252", errors="replace")
    except httpx.HTTPError as e:
        return {"available": False, "url": url, "last_publication": None, "count": 0, "publications": [],
                "note": f"Staatsblad niet bereikbaar ({type(e).__name__})."}, False
    return parse_listing(page, url), True
