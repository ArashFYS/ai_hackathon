"""External evidence URLs for a record (Google Maps, Street View, KBO public search, NBB, web search)."""
import os
from urllib.parse import quote

from .geography import coordinate_issue


def maps_embed_key() -> str | None:
    """Google Maps Platform key from backend/.env (TICKET-041); None → keyless embed, no Places button."""
    return os.environ.get("GOOGLE_MAPS_EMBED_KEY") or None


def enterprise_nr_of(row: dict) -> str | None:
    """The enterprise number to use for enterprise-level sources."""
    if row.get("record_type") == "establishment":
        return row.get("parent_nr")
    return row.get("nr")


def build_links(row: dict, display_name: str, address: str, streetview: dict | None = None) -> dict:
    """`streetview` = cached app.streetview payload (point on the record's street + heading), or None."""
    name_addr = quote(f"{display_name} {address}".strip())
    name_muni = quote(f"{display_name} {row.get('kbo_municipality') or ''}".strip())
    lat, lng = row.get("lat"), row.get("lng")
    heading = 0
    if streetview and streetview.get("available"):  # TICKET-036: snap to the street, face the address
        lat, lng, heading = streetview["lat"], streetview["lng"], streetview["heading"]
    if coordinate_issue({**row, "lat": lat, "lng": lng}) is not None:
        lat, lng = None, None
    ent = enterprise_nr_of(row)
    kbo_public = (
        f"https://kbopub.economie.fgov.be/kbopub/toonondernemingps.html?ondernemingsnummer={ent}&lang=nl"
        if ent else None
    )
    return {
        # TICKET-038: with a Maps Embed API key the place panel (phone, website, hours) renders in-tab;
        # without one, the keyless embed only shows the mini-card.
        "google_maps_embed": (
            f"https://www.google.com/maps/embed/v1/place?key={maps_embed_key()}&q={name_addr}&language=nl"
            if maps_embed_key() else f"https://maps.google.com/maps?q={name_addr}&output=embed"
        ),
        "google_maps": f"https://www.google.com/maps/search/?api=1&query={name_addr}",
        # TICKET-038: browser-side Places API (New) Text Search; the key is referrer-restricted, so exposing it is by design.
        "google_places_key": maps_embed_key(),
        "google_places_query": f"{display_name} {address}".strip(),
        "street_view_embed": (
            f"https://maps.google.com/maps?q=&layer=c&cbll={lat},{lng}&cbp=11,{heading},0,0,0&output=svembed"
            if lat is not None and lng is not None else None
        ),
        "street_view": (
            f"https://www.google.com/maps/@?api=1&map_action=pano&viewpoint={lat},{lng}&heading={heading}"
            if lat is not None and lng is not None else f"https://www.google.com/maps/search/?api=1&query={quote(address)}"
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
        # TICKET-042: social media placeholder — outbound searches for the business name + municipality.
        # None of these embed; Instagram may bounce to a login page when logged out.
        "social_facebook": f"https://www.facebook.com/search/top?q={name_muni}",
        "social_instagram": f"https://www.instagram.com/explore/search/keyword/?q={name_muni}",
        "social_tiktok": f"https://www.tiktok.com/search?q={name_muni}",
    }
