"""External evidence URLs for a record (Google Maps, Street View, KBO public search, NBB, web search)."""
from urllib.parse import quote


def enterprise_nr_of(row: dict) -> str | None:
    """The enterprise number to use for enterprise-level sources."""
    if row.get("record_type") == "establishment":
        return row.get("parent_nr")
    return row.get("nr")


def build_links(row: dict, display_name: str, address: str) -> dict:
    name_addr = quote(f"{display_name} {address}".strip())
    name_muni = quote(f"{display_name} {row.get('kbo_municipality') or ''}".strip())
    lat, lng = row.get("lat"), row.get("lng")
    ent = enterprise_nr_of(row)
    kbo_public = (
        f"https://kbopub.economie.fgov.be/kbopub/toonondernemingps.html?ondernemingsnummer={ent}&lang=nl"
        if ent else None
    )
    return {
        "google_maps_embed": f"https://maps.google.com/maps?q={name_addr}&output=embed",
        "google_maps": f"https://www.google.com/maps/search/?api=1&query={name_addr}",
        "street_view_embed": (
            f"https://maps.google.com/maps?q=&layer=c&cbll={lat},{lng}&cbp=11,0,0,0,0&output=svembed"
            if lat is not None and lng is not None else None
        ),
        "street_view": (
            f"https://www.google.com/maps/@?api=1&map_action=pano&viewpoint={lat},{lng}"
            if lat is not None and lng is not None else None
        ),
        "kbo_public": kbo_public,
        "kbo_public_embed": kbo_public,
        "kbo_establishments": (
            f"https://kbopub.economie.fgov.be/kbopub/vestiginglijst.html?ondernemingsnummer={ent}&lang=nl"
            if ent else None
        ),
        "nbb_consult": f"https://consult.cbso.nbb.be/consult-enterprise/{ent}" if ent else None,
        # RSZ / FOD Financiën: fiscal and social debts (inhoudingsplicht). Prefills the number; the
        # officer clicks "Controleren" (captcha-protected, so no automated lookup).
        "inhoudingsplicht_embed": f"https://www.checkinhoudingsplicht.be/?identificationnumber={ent}" if ent else None,
        "inhoudingsplicht": f"https://www.checkinhoudingsplicht.be/?identificationnumber={ent}" if ent else "https://www.checkinhoudingsplicht.be/",
        # Belgisch Staatsblad publications (oprichting, ontbinding, faillissement …). Not iframeable (frame-ancestors 'self').
        "staatsblad": f"https://www.ejustice.just.fgov.be/cgi_tsv/rech_res.pl?language=nl&btw={ent}" if ent else None,
        "web_search_embed": f"https://www.bing.com/search?q={name_muni}",
        "web_search": f"https://www.google.com/search?q={name_muni}",
    }
