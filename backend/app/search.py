"""Parameterized word/phrase matching for interactive record search."""
import re

FIELDS = ("name", "trade_name", "search_name", "kbo_street", "kbo_housenr",
          "kbo_postcode", "kbo_municipality", "nr", "parent_nr")
TYPE_WORDS = {
    "establishment": "establishment", "establishments": "establishment", "establishgment": "establishment",
    "vestiging": "establishment", "vestigingen": "establishment",
    "enterprise": "enterprise", "enterprises": "enterprise", "onderneming": "enterprise", "ondernemingen": "enterprise",
}


def search_clause(query: str, mode: str = "phrase", with_contacts: bool = False) -> tuple[str, list[str]]:
    query = query.strip()
    if not query:
        return "", []
    digits = re.sub(r"\D", "", query)
    is_identifier = bool(re.fullmatch(r"(?:BE\s*)?[\d.\s-]+", query, re.I)) and 9 <= len(digits) <= 10
    if is_identifier:
        clause = "(nr = ? OR parent_nr = ?" + (" OR contact_match(nr, ?)" if with_contacts else "") + ")"
        return clause, [digits.zfill(10)] * 2 + ([query] if with_contacts else [])
    is_phone = bool(re.fullmatch(r"[\d+\s()./-]+", query)) and len(digits) >= 3
    tokens = [(query, True)] if mode == "phrase" or is_phone else [
        (phrase or word.strip('"'), bool(phrase)) for phrase, word in re.findall(r'"([^"]+)"|(\S+)', query)
    ]
    explicit = any(not quoted and term.upper() in ("AND", "OR") for term, quoted in tokens)
    groups, params = [], []
    and_group = []
    for term, quoted in tokens:
        if not term:
            continue
        if explicit and not quoted and term.upper() in ("AND", "OR"):
            if term.upper() == "OR" and and_group:
                groups.append("(" + " AND ".join(and_group) + ")")
                and_group = []
            continue
        record_type = TYPE_WORDS.get(term.casefold()) if not quoted else None
        if record_type:
            predicate = "(record_type = ?)"
            params.append(record_type)
        else:
            escaped = term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            parts = [f"{field} LIKE ? ESCAPE '\\'" for field in FIELDS]
            params.extend([f"%{escaped}%"] * len(FIELDS))
            if with_contacts:
                parts.append("contact_match(nr, ?)")
                params.append(term)
            predicate = "(" + " OR ".join(parts) + ")"
        if explicit:
            and_group.append(predicate)
        else:
            groups.append(predicate)
    if and_group:
        groups.append("(" + " AND ".join(and_group) + ")")
    joiner = " OR " if explicit or mode == "or" else " AND "
    return "(" + joiner.join(groups) + ")" if groups else "", params
