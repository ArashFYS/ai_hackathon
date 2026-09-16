"""Read-only contact lookup shared by search and export."""
import re
import sqlite3

from .contact import contacts_for
from .summaries import cached_nbb, load_context


def known_contacts(conn: sqlite3.Connection, rows: list[dict]) -> dict[str, list[dict]]:
    parents, evidence = load_context(conn, rows)
    cache = {}

    def nbb(row):
        key = row.get("parent_nr") or row["nr"]
        if key not in cache:
            cache[key] = cached_nbb(conn, row)
        return cache[key]

    result = {}
    for row in rows:
        parent = parents.get(row.get("parent_nr"))
        contacts = contacts_for(row, parent, evidence.get(row["nr"], []), nbb(row))
        if parent:
            contacts += contacts_for(parent, None, [], nbb(parent))
        result[row["nr"]] = contacts
    return result


def phone_digits(value: str) -> str:
    digits = re.sub(r"\D", "", value)
    if digits.startswith("00"):
        digits = digits[2:]
    if digits.startswith("32") and len(digits) in (10, 11):
        digits = "0" + digits[2:]
    return digits


def contact_matches(contacts: list[dict], term: str) -> bool:
    normalized = term.strip().casefold()
    phone = phone_digits(term) if re.fullmatch(r"[\d+\s()./-]+", term) else ""
    return any(
        normalized in c["value"].casefold()
        or (c["kind"] == "phone" and len(phone) >= 3 and phone in phone_digits(c["value"]))
        for c in contacts if c.get("value")
    )
