"""Rule-based activity assessment for a KBO record. Deterministic, no AI.

Rules are evaluated in order; the first "sterk negatief" rule fixes the status,
later rules only add reasons. Every reason is returned so the UI can show them.
"""

SCHOTEN_BBOX = {"lat_min": 51.22, "lat_max": 51.29, "lng_min": 4.44, "lng_max": 4.56}
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


def _reason(code: str, text: str, direction: str, weight: str) -> dict:
    return {"code": code, "text": text, "direction": direction, "weight": weight}


def register_negative_reasons(row: dict) -> list[dict]:
    """Rules 1-3: the register itself says the record is not active."""
    reasons = []
    legal_status = row.get("legal_status")
    if legal_status and legal_status != NORMAL_STATUS:
        reasons.append(_reason("rechtstoestand", f"Rechtstoestand: {legal_status}", "negatief", "sterk"))
    if row.get("address_strike_date"):
        reasons.append(_reason(
            "adres_doorgehaald",
            f"Adres ambtshalve doorgehaald op {row['address_strike_date']}", "negatief", "sterk"))
    if row.get("exofficio_strike_start") and not row.get("exofficio_strike_end"):
        reasons.append(_reason(
            "ambtshalve_doorhaling",
            f"Ambtshalve doorhaling sinds {row['exofficio_strike_start']}", "negatief", "sterk"))
    return reasons


def latest_evidence(evidence: list[dict] | None) -> dict | None:
    if not evidence:
        return None
    return max(evidence, key=lambda e: (e.get("observed_at") or "", e.get("id") or 0))


def assess(row: dict, parent: dict | None = None, evidence: list[dict] | None = None) -> dict:
    """Return the Assessment dict for `row` (a `records` row as dict)."""
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
        reasons.append(_reason("vme", "Vereniging van mede-eigenaars: geen handelsactiviteit", "negatief", "sterk"))
        if status is None:
            status, certainty = "geen_onderneming", "hoog"

    # Rules 5-6: parent enterprise
    parent_unknown = False
    if is_establishment:
        if parent is not None:
            for r in register_negative_reasons(parent):
                reasons.append(_reason(
                    "moeder_" + r["code"], f"Moederonderneming {parent['nr']}: {r['text']}", "negatief", "sterk"))
                if status is None:
                    status, certainty = "waarschijnlijk_niet_actief", "hoog"
                register_negative = True
        else:
            parent_unknown = True
            reasons.append(_reason(
                "moeder_onbekend", "Moederonderneming niet in dataset (zetel mogelijk elders)", "neutraal", "zwak"))

    # Rule 7: address differs from the Flemish address register
    kbo_street, ar_street = row.get("kbo_street"), row.get("ar_street")
    if kbo_street and ar_street and kbo_street != ar_street:
        address_issue = True
        reasons.append(_reason(
            "adres_afwijking", f"Adres wijkt af van het Adressenregister ({kbo_street} ≠ {ar_street})",
            "negatief", "zwak"))

    # Rule 8: coordinates outside Schoten
    lat, lng = row.get("lat"), row.get("lng")
    if lat is not None and lng is not None and not (
        SCHOTEN_BBOX["lat_min"] <= lat <= SCHOTEN_BBOX["lat_max"]
        and SCHOTEN_BBOX["lng_min"] <= lng <= SCHOTEN_BBOX["lng_max"]
    ):
        address_issue = True
        reasons.append(_reason("buiten_schoten", "Coördinaten liggen buiten Schoten", "negatief", "zwak"))

    # Rule 9: no contact data
    has_contact = bool(row.get("phone") or row.get("email"))
    if not has_contact:
        reasons.append(_reason("geen_contact", "Geen contactgegevens in het register", "negatief", "zwak"))

    # Rule 10: officer evidence (latest observation wins)
    latest = latest_evidence(evidence)
    last_observed = latest.get("observed_at") if latest else None
    if latest:
        conclusion = latest.get("conclusion")
        text = f"Bewijs: {latest.get('source')} {latest.get('observed_at')}: {latest.get('observation')}"
        if conclusion == "actief":
            if register_negative:
                reasons.append(_reason("bewijs_actief", text, "positief", "sterk"))
                reasons.append(_reason(
                    "tegenstrijdig", "Tegenstrijdig: register zegt niet actief, waarneming zegt actief",
                    "neutraal", "sterk"))
                status, certainty = "ter_controle", "middel"
            else:
                reasons.append(_reason("bewijs_actief", text, "positief", "sterk"))
                status, certainty = "actief", "hoog"
        elif conclusion == "niet_actief":
            reasons.append(_reason("bewijs_niet_actief", text, "negatief", "sterk"))
            if status is None:
                status, certainty = "waarschijnlijk_niet_actief", "hoog"
        else:
            reasons.append(_reason("bewijs_onduidelijk", text, "neutraal", "matig"))
            if status is None:
                status, certainty = "ter_controle", "middel"

    # Rule 11: nothing decisive
    if status is None:
        reasons.append(_reason(
            "enkel_register", "Enkel registergegevens, nog geen bewijs van activiteit", "neutraal", "zwak"))
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
