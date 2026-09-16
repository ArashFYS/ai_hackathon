"""E-invoicing (Peppol) registration check for an enterprise number.

Authoritative test = Peppol SML DNS: the participant hostname exists (NAPTR record) when the
enterprise is registered, NXDOMAIN when it is not. No key, no rate limit. The Peppol Directory
(JSON, rate-limited) only adds the published name and registration date.
"""
import base64
import hashlib
import json
import re
import shutil
import socket
import subprocess
from datetime import datetime, timezone
from urllib.parse import quote

import httpx

from .indicator_cache import get_or_fetch, cache_put, cache_get

KIND = "einvoice"
SML_ZONE = "iso6523-actorid-upis.edelivery.tech.ec.europa.eu"
SANITY_HOST = "edelivery.tech.ec.europa.eu"
DIRECTORY_URL = "https://directory.peppol.eu/search/1.0/json"
DIRECTORY_PUBLIC = "https://directory.peppol.eu/public/locale-nl_NL/menuitem-search?q="
HEADERS = {"User-Agent": "Mozilla/5.0", "Accept": "application/json"}
TIMEOUT = 10
NOT_OBLIGED_MARKERS = ("vereniging", "stichting", "zonder rechtspersoonlijkheid", "openbare instelling")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def participant_id(enterprise_nr: str) -> str:
    """Belgian KBO scheme only (user decision): 0208:<ondernemingsnummer>."""
    return f"0208:{enterprise_nr}"


def sml_hostname(pid: str) -> str:
    digest = hashlib.sha256(pid.lower().encode("utf-8")).digest()
    return base64.b32encode(digest).decode("ascii").rstrip("=").lower() + "." + SML_ZONE


def name_exists(host: str) -> bool | None:
    """True = name exists (registered), False = NXDOMAIN, None = resolver trouble."""
    try:
        socket.getaddrinfo(host, None)
        return True
    except socket.gaierror as exc:
        if exc.errno == socket.EAI_NONAME:
            return False
        if exc.errno == getattr(socket, "EAI_NODATA", -5):
            return True  # name exists, only NAPTR records
        return None


def smp_url(host: str) -> str | None:
    """SMP address from the NAPTR record via dig, when available. Cosmetic only."""
    if not shutil.which("dig"):
        return None
    try:
        out = subprocess.run(["dig", "+short", "NAPTR", host], capture_output=True, text=True, timeout=5).stdout
    except (OSError, subprocess.SubprocessError):
        return None
    m = re.search(r"!(https?://[^!]+)!", out)
    return m.group(1) if m else None


def obliged(legal_form: str | None) -> bool | None:
    """None when the legal form is unknown; False for associations, foundations, public bodies, maatschappen."""
    if not legal_form:
        return None
    lf = legal_form.lower()
    return not any(marker in lf for marker in NOT_OBLIGED_MARKERS)


def _directory(client: httpx.Client, pid: str) -> dict | None:
    r = client.get(DIRECTORY_URL, params={"participant": f"iso6523-actorid-upis::{pid}"})
    r.raise_for_status()
    data = json.loads(r.text, strict=False)
    for match in data.get("matches") or []:
        for ent in match.get("entities") or []:
            names = ent.get("name") or []
            return {"name": names[0].get("name") if names else None, "reg_date": ent.get("regDate"),
                    # business-card contacts (rarely filled, but free when present)
                    "contacts": [{"name": c.get("name"), "phone": c.get("phone"), "email": c.get("email")}
                                 for c in (ent.get("contacts") or [])],
                    "websites": list(ent.get("websites") or [])}
    return None


def _payload(nr: str, pid: str, registered: bool | None, note: str, **extra) -> dict:
    return {
        "enterprise_nr": nr, "participant_id": pid, "registered": registered, "sml_host": sml_hostname(pid),
        "smp_url": None, "directory": None, "directory_checked": False,
        "url": DIRECTORY_PUBLIC + quote(nr), "fetched_at": _now(), "note": note, **extra,
    }


def fetch_live(nr: str, with_directory: bool = False) -> tuple[dict, bool]:
    pid = participant_id(nr)
    if name_exists(SANITY_HOST) is not True:
        return _payload(nr, pid, None, "Peppol-controle mislukt: DNS niet bereikbaar"), False
    exists = name_exists(sml_hostname(pid))
    if exists is None:
        return _payload(nr, pid, None, "Peppol-controle mislukt: DNS-fout"), False
    if not exists:
        return _payload(nr, pid, False, f"Niet geregistreerd op Peppol onder {pid}"), True
    p = _payload(nr, pid, True, f"Geregistreerd op Peppol als {pid}", smp_url=smp_url(sml_hostname(pid)))
    if with_directory:
        _enrich(p)
    return p, True


def _enrich(p: dict) -> None:
    """Add Peppol Directory name/regDate in place; failures leave directory_checked False."""
    try:
        with httpx.Client(headers=HEADERS, timeout=TIMEOUT) as client:
            p["directory"] = _directory(client, p["participant_id"])
        p["directory_checked"] = True
    except Exception:
        p["directory"] = None


def get_einvoice(conn, nr: str, with_directory: bool = False) -> dict:
    payload = get_or_fetch(conn, KIND, nr, lambda: fetch_live(nr, with_directory))
    if with_directory and payload.get("registered") and not payload.get("directory_checked") and cache_get(conn, KIND, nr):
        _enrich(payload)
        if payload["directory_checked"]:
            cache_put(conn, KIND, nr, payload)
    return payload
