"""Rule-based activity assessment for a KBO record. Deterministic, no AI.

Rules are evaluated in order; the first "sterk negatief" rule fixes the status,
later rules only add reasons. Every reason is returned so the UI can show them.
"""

from .geography import SCHOTEN_BBOX
NORMAL_STATUS = "Normale toestand"
VME = "Vereniging van Mede-eigenaars"

STATUS_LABELS = {
    "actief": "Actief",
    "ter_controle": "Ter controle",
    "waarschijnlijk_niet_actief": "Waarschijnlijk niet actief",
    "geen_onderneming": "Geen onderneming",
}
CERTAINTY_LABELS = {"hoog": "Hoog", "middel": "Middel", "laag": "Laag"}
PROPOSAL_TEXTS = {
    "waarschijnlijk_niet_actief": "Markeer als niet actief",
    "geen_onderneming": "Uitsluiten uit overzicht (geen onderneming)",
    "ter_controle": "Ter controle: geen bewijs van activiteit",
    "actief": "Geen actie",
}


KBO_PUBLIC = "https://kbopub.economie.fgov.be/kbopub"
SRC_KBO = "KBO (via VKBO, Digitaal Vlaanderen)"
SRC_AR = "Vlaams Adressenregister (via VKBO)"
SRC_NBB = "NBB Balanscentrale"
EVIDENCE_SOURCE_LABELS = {
    "google_maps": "Google Maps", "street_view": "Google Street View", "website": "Website",
    "terreinbezoek": "Terreinbezoek", "kbo": "KBO Public Search", "nbb": "NBB Balanscentrale", "andere": "Andere bron",
}


def _reason(code: str, text: str, direction: str, weight: str, *, source: str | None = None,
            field: str | None = None, observed_at: str | None = None, url: str | None = None) -> dict:
    """A reason always says where it comes from: source, register field, date and a link to verify."""
    return {"code": code, "text": text, "direction": direction, "weight": weight,
            "source": source, "field": field, "observed_at": observed_at, "url": url}


def kbo_url(row: dict) -> str:
    if row.get("record_type") == "establishment":
        return f"{KBO_PUBLIC}/toonvestigingps.html?vestigingsnummer={row['nr']}&lang=nl"
    return f"{KBO_PUBLIC}/toonondernemingps.html?ondernemingsnummer={row['nr']}&lang=nl"


def snapshot_date(row: dict) -> str | None:
    """Date of the register snapshot this row came from."""
    return (row.get("fetched_at") or "")[:10] or None


def _kbo(row: dict, field: str) -> dict:
    return {"source": SRC_KBO, "field": field, "observed_at": snapshot_date(row), "url": kbo_url(row)}


def register_negative_reasons(row: dict) -> list[dict]:
    """Rules 1-3: the register itself says the record is not active."""
    reasons = []
    legal_status = row.get("legal_status")
    if legal_status and legal_status != NORMAL_STATUS:
        reasons.append(_reason("rechtstoestand", f"Rechtstoestand: {legal_status}", "negatief", "sterk",
                               **_kbo(row, "Rechtstoestand")))
    if row.get("address_strike_date"):
        reasons.append(_reason(
            "adres_doorgehaald",
            f"Adres ambtshalve doorgehaald op {row['address_strike_date']}"
            + (f" ({row['address_strike_reason']})" if row.get("address_strike_reason") else ""),
            "negatief", "sterk", **_kbo(row, "Datum_adresdoorhaling")))
    if row.get("exofficio_strike_start") and not row.get("exofficio_strike_end"):
        reasons.append(_reason(
            "ambtshalve_doorhaling",
            f"Ambtshalve doorhaling sinds {row['exofficio_strike_start']}"
            + (f" ({row['exofficio_strike_reason']})" if row.get("exofficio_strike_reason") else ""),
            "negatief", "sterk", **_kbo(row, "Begindat_ambtsh_doorhaling")))
    return reasons


def latest_evidence(evidence: list[dict] | None) -> dict | None:
    if not evidence:
        return None
    return max(evidence, key=lambda e: (e.get("observed_at") or "", e.get("id") or 0))


def assess(row: dict, parent: dict | None = None, evidence: list[dict] | None = None,
           nbb: dict | None = None) -> dict:
    """Return the Assessment dict for `row` (a `records` row as dict).

    `nbb` is the cached Balanscentrale payload for the enterprise (never fetched here)."""
    reasons: list[dict] = []
    status: str | None = None
    certainty: str | None = None
    register_negative = False
    is_establishment = row.get("record_type") == "establishment"
    address_issue = False

    # Rules 1-3: own register flags
    own_negative = register_negative_reasons(row)
    if own_negative:
        reasons.extend(own_negative)
        status, certainty, register_negative = "waarschijnlijk_niet_actief", "hoog", True

    # Rule 4: association of co-owners is not a business
    if row.get("legal_form") == VME:
        reasons.append(_reason("vme", "Vereniging van mede-eigenaars: geen handelsactiviteit", "negatief", "sterk",
                               **_kbo(row, "Rechtsvorm")))
        if status is None:
            status, certainty = "geen_onderneming", "hoog"

    # Rules 5-6: parent enterprise
    parent_unknown = False
    if is_establishment:
        if parent is not None:
            for r in register_negative_reasons(parent):
                reasons.append(_reason(
                    "moeder_" + r["code"], f"Moederonderneming {parent['nr']}: {r['text']}", "negatief", "sterk",
                    source=r["source"], field=r["field"], observed_at=r["observed_at"], url=r["url"]))
                if status is None:
                    status, certainty = "waarschijnlijk_niet_actief", "hoog"
                register_negative = True
        else:
            parent_unknown = True
            reasons.append(_reason(
                "moeder_onbekend", "Moederonderneming niet in dataset (zetel mogelijk elders)", "neutraal", "zwak",
                source=SRC_KBO, field="Ondernemingsnr_maatsch_zetel", observed_at=snapshot_date(row),
                url=f"{KBO_PUBLIC}/toonondernemingps.html?ondernemingsnummer={row.get('parent_nr')}&lang=nl"))

    # Rule 7: address differs from the Flemish address register
    kbo_street, ar_street = row.get("kbo_street"), row.get("ar_street")
    if kbo_street and ar_street and kbo_street != ar_street:
        address_issue = True
        reasons.append(_reason(
            "adres_afwijking", f"Adres wijkt af van het Adressenregister ({kbo_street} ≠ {ar_street})",
            "negatief", "zwak", source=SRC_AR, field="KBO_Straat / AR_straat", observed_at=snapshot_date(row),
            url=kbo_url(row)))

    # Rule 8: coordinates outside Schoten
    lat, lng = row.get("lat"), row.get("lng")
    if lat is not None and lng is not None and not (
        SCHOTEN_BBOX["lat_min"] <= lat <= SCHOTEN_BBOX["lat_max"]
        and SCHOTEN_BBOX["lng_min"] <= lng <= SCHOTEN_BBOX["lng_max"]
    ):
        address_issue = True
        reasons.append(_reason("buiten_schoten", "Coördinaten liggen buiten Schoten", "negatief", "zwak",
                               source="VKBO geometrie", field="longitude / latitude", observed_at=snapshot_date(row),
                               url=f"https://www.google.com/maps/search/?api=1&query={lat},{lng}"))

    # Rule 9: no contact data
    has_contact = bool(row.get("phone") or row.get("email"))
    if not has_contact:
        reasons.append(_reason("geen_contact", "Geen contactgegevens in het register", "negatief", "zwak",
                               **_kbo(row, "Telefoonnummer / Email")))

    # Rule 10: officer evidence (latest observation wins)
    latest = latest_evidence(evidence)
    last_observed = latest.get("observed_at") if latest else None
    if latest:
        conclusion = latest.get("conclusion")
        src_label = EVIDENCE_SOURCE_LABELS.get(latest.get("source"), latest.get("source"))
        text = f"Waarneming ({src_label}): {latest.get('observation')}"
        prov = {"source": f"{src_label} — waarneming ambtenaar", "field": None,
                "observed_at": latest.get("observed_at"), "url": latest.get("url")}
        if conclusion == "actief":
            if register_negative:
                reasons.append(_reason("bewijs_actief", text, "positief", "sterk", **prov))
                reasons.append(_reason(
                    "tegenstrijdig", "Tegenstrijdig: register zegt niet actief, waarneming zegt actief",
                    "neutraal", "sterk", source="Vergelijking register ↔ waarneming"))
                status, certainty = "ter_controle", "middel"
            else:
                reasons.append(_reason("bewijs_actief", text, "positief", "sterk", **prov))
                status, certainty = "actief", "hoog"
        elif conclusion == "niet_actief":
            reasons.append(_reason("bewijs_niet_actief", text, "negatief", "sterk", **prov))
            if status is None:
                status, certainty = "waarschijnlijk_niet_actief", "hoog"
        else:
            reasons.append(_reason("bewijs_onduidelijk", text, "neutraal", "matig", **prov))
            if status is None:
                status, certainty = "ter_controle", "middel"

    # Rule 12: annual accounts at the National Bank (only from cache; a company that stopped filing is a signal)
    if nbb and nbb.get("available") and nbb.get("company"):
        nbb_prov = {"source": SRC_NBB, "observed_at": (nbb.get("fetched_at") or "")[:10] or None, "url": nbb.get("url")}
        last, months = nbb.get("last_deposit_date"), nbb.get("months_since_last_deposit")
        if last and months is not None:
            if months > 24:
                reasons.append(_reason(
                    "nbb_geen_recente_neerlegging",
                    f"Laatste jaarrekening neergelegd op {last} ({months} maanden geleden)", "negatief", "matig",
                    field="published-deposits", **nbb_prov))
                if status is None:
                    status, certainty = "ter_controle", "middel"
            else:
                reasons.append(_reason(
                    "nbb_recente_neerlegging",
                    f"Jaarrekening neergelegd op {last} ({months} maanden geleden)", "positief", "matig",
                    field="published-deposits", **nbb_prov))
        situation = (nbb.get("company") or {}).get("legal_situation")
        if situation and situation != NORMAL_STATUS:
            reasons.append(_reason(
                "nbb_rechtstoestand", f"Balanscentrale: {situation}"
                + (f" ({(nbb['company'].get('legal_situation_date'))})" if nbb["company"].get("legal_situation_date") else ""),
                "negatief", "sterk", field="legalSituation", **nbb_prov))
            if status is None:
                status, certainty, register_negative = "waarschijnlijk_niet_actief", "hoog", True

    # Rule 11: nothing decisive
    if status is None:
        reasons.append(_reason(
            "enkel_register", "Enkel registergegevens, nog geen bewijs van activiteit", "neutraal", "zwak",
            source=SRC_KBO, observed_at=snapshot_date(row), url=kbo_url(row)))
        status, certainty = "ter_controle", ("middel" if has_contact else "laag")

    # Rule 6 cap: parent unknown, no evidence and no decisive register rule → certainty at most laag
    if parent_unknown and not latest and status == "ter_controle":
        certainty = "laag"

    if register_negative:
        register_label = "Niet actief"
    elif status == "geen_onderneming":
        register_label = "—"
    else:
        register_label = "Actief"

    proposal_text = PROPOSAL_TEXTS[status]
    if any(r["code"] == "tegenstrijdig" for r in reasons):
        proposal_text = "Ter controle: register en waarneming spreken elkaar tegen"
    elif any(r["code"] == "bewijs_onduidelijk" for r in reasons):
        proposal_text = "Ter controle: waarneming onduidelijk, opnieuw nakijken"
    if address_issue:
        proposal_text += "; adres nazien"

    return {
        "status": status,
        "status_label": STATUS_LABELS[status],
        "certainty": certainty,
        "certainty_label": CERTAINTY_LABELS[certainty],
        "register_label": register_label,
        "reasons": reasons,
        "proposal_text": proposal_text,
        "last_observed": last_observed,
    }
