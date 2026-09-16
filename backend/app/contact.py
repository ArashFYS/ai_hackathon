"""Contact details (phone / email / website) per record, each with owner, source and date.

Contact = { kind: 'phone'|'email'|'website', value, belongs_to: 'vestiging'|'zetel',
            source: str, observed_at: 'YYYY-MM-DD'|None, url: str|None }
"""
import re

from .scoring import kbo_url, snapshot_date

SRC_REGISTER = "KBO (via VKBO)"
SRC_PARENT = "KBO (via VKBO) — moederonderneming"
SRC_NBB = "NBB Balanscentrale"
SRC_KBO_PUBLIC = "KBO Public Search"
SRC_PEPPOL = "Peppol Directory"
SOURCE_LABELS = {
    "google_maps": "Google Maps", "street_view": "Street View", "website": "Website",
    "terreinbezoek": "Terreinbezoek", "kbo": "KBO", "nbb": "NBB",
    "inhoudingsplicht": "Check Inhoudingsplicht", "andere": "Andere",
}
KINDS = ("phone", "email", "website")


def _contact(kind: str, value: str, belongs_to: str, source: str, observed_at: str | None, url: str | None) -> dict:
    return {"kind": kind, "value": value.strip(), "belongs_to": belongs_to, "source": source,
            "observed_at": observed_at, "url": url}


def _normalize(kind: str, value: str) -> str:
    v = value.strip().lower()
    if kind == "phone":
        return re.sub(r"\D", "", v)
    if kind == "website":
        v = re.sub(r"^https?://", "", v).removeprefix("www.").rstrip("/")
    return v


def _register_contacts(row: dict, belongs_to: str, source: str) -> list[dict]:
    out = []
    for kind in ("phone", "email"):
        if (row.get(kind) or "").strip():
            out.append(_contact(kind, row[kind], belongs_to, source, snapshot_date(row), kbo_url(row)))
    return out


def _evidence_contacts(evidence: list[dict]) -> list[dict]:
    out = []
    for ev in evidence or []:
        label = SOURCE_LABELS.get(ev.get("source") or "", ev.get("source") or "Andere")
        for kind in KINDS:
            if (ev.get(kind) or "").strip():
                out.append(_contact(kind, ev[kind], "vestiging", f"Waargenomen via {label}",
                                    ev.get("observed_at"), ev.get("url")))
    return out


def _nbb_contacts(nbb: dict | None) -> list[dict]:
    company = (nbb or {}).get("company") or {}
    out = []
    for kind in ("email", "website"):
        if (company.get(kind) or "").strip():
            out.append(_contact(kind, company[kind], "zetel", SRC_NBB,
                                (nbb.get("fetched_at") or "")[:10] or None, nbb.get("url")))
    return out


def _kbo_public_contacts(kbo_public: dict | None, belongs_to: str) -> list[dict]:
    """Phone / e-mail / website scraped from the record's own KBO Public Search page (TICKET-035)."""
    if not kbo_public or not kbo_public.get("available"):
        return []
    return [_contact(kind, kbo_public[kind], belongs_to, SRC_KBO_PUBLIC, kbo_public.get("snapshot_date"),
                     kbo_public.get("url"))
            for kind in KINDS if (kbo_public.get(kind) or "").strip()]


def _peppol_contacts(einvoice: dict | None) -> list[dict]:
    """Business-card contacts from the cached Peppol Directory enrichment (zetel level)."""
    d = (einvoice or {}).get("directory") or {}
    date = ((einvoice or {}).get("fetched_at") or "")[:10] or None
    url = (einvoice or {}).get("url")
    out = []
    for c in d.get("contacts") or []:
        for kind in ("phone", "email"):
            if (c.get(kind) or "").strip():
                out.append(_contact(kind, c[kind], "zetel", SRC_PEPPOL, date, url))
    out += [_contact("website", w, "zetel", SRC_PEPPOL, date, url) for w in d.get("websites") or [] if w]
    return out


def contacts_for(row: dict, parent: dict | None, evidence: list[dict], nbb: dict | None = None,
                 kbo_public: dict | None = None, einvoice: dict | None = None) -> list[dict]:
    """Every known contact for a record, deduped on (kind, normalized value); vestiging first, newest first."""
    is_est = row.get("record_type") == "establishment"
    found = _register_contacts(row, "vestiging" if is_est else "zetel", SRC_REGISTER)
    found += _kbo_public_contacts(kbo_public, "vestiging" if is_est else "zetel")
    if is_est and not found and parent:
        found += _register_contacts(parent, "zetel", SRC_PARENT)
    found += _evidence_contacts(evidence)
    found += _nbb_contacts(nbb)
    found += _peppol_contacts(einvoice)

    seen: set[tuple[str, str]] = set()
    unique = []
    for c in found:
        key = (c["kind"], _normalize(c["kind"], c["value"]))
        if key in seen or not key[1]:
            continue
        seen.add(key)
        unique.append(c)
    unique.sort(key=lambda c: c["observed_at"] or "", reverse=True)
    unique.sort(key=lambda c: 0 if c["belongs_to"] == "vestiging" else 1)
    return unique


def contact_status(contacts: list[dict]) -> str:
    """'register' | 'zetel' | 'waargenomen' | 'onbekend' — first matching source, in that order."""
    sources = {c["source"] for c in contacts}
    if SRC_REGISTER in sources or SRC_KBO_PUBLIC in sources:
        return "register"
    if SRC_PARENT in sources:
        return "zetel"
    if any(s.startswith("Waargenomen via") for s in sources):
        return "waargenomen"
    return "onbekend"
