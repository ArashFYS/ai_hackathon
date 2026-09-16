"""Municipality catalogue and street suggestions, with explicit loaded-data counts."""
import sqlite3
from fastapi import APIRouter, Depends
from ..db import get_db

router = APIRouter(prefix="/api/locations", tags=["locations"])

# Official province list checked 2026-09-16:
# https://www.vlaanderen.be/gemeenten-en-provincies/overzicht-van-vlaamse-steden-en-gemeenten
ANTWERP_MUNICIPALITIES = (
    "Aartselaar", "Antwerpen", "Arendonk", "Baarle-Hertog", "Balen", "Beerse", "Berlaar",
    "Boechout", "Bonheiden", "Boom", "Bornem", "Brasschaat", "Brecht", "Dessel", "Duffel",
    "Edegem", "Essen", "Geel", "Grobbendonk", "Heist-op-den-Berg", "Hemiksem", "Herentals",
    "Herenthout", "Herselt", "Hoogstraten", "Hove", "Hulshout", "Kalmthout", "Kapellen",
    "Kasterlee", "Kontich", "Laakdal", "Lier", "Lille", "Lint", "Malle", "Mechelen",
    "Meerhout", "Merksplas", "Mol", "Mortsel", "Niel", "Nijlen", "Olen", "Oud-Turnhout",
    "Putte", "Puurs-Sint-Amands", "Ranst", "Ravels", "Retie", "Rijkevorsel", "Rumst",
    "Schelle", "Schilde", "Schoten", "Sint-Katelijne-Waver", "Stabroek", "Turnhout",
    "Vorselaar", "Vosselaar", "Westerlo", "Wijnegem", "Willebroek", "Wommelgem",
    "Wuustwezel", "Zandhoven", "Zoersel",
)


@router.get("")
def location_options(conn: sqlite3.Connection = Depends(get_db)):
    counts = {row["city"]: row["count"] for row in conn.execute(
        "SELECT kbo_municipality AS city, COUNT(*) AS count FROM records GROUP BY kbo_municipality")}
    cities = [{"name": name, "count": counts.get(name, 0)} for name in ANTWERP_MUNICIPALITIES]
    cities.sort(key=lambda city: (-city["count"], city["name"]))
    streets = [dict(row) for row in conn.execute(
        "SELECT kbo_street AS street, kbo_municipality AS city, COUNT(*) AS count FROM records"
        " WHERE kbo_street IS NOT NULL AND kbo_municipality IS NOT NULL"
        " GROUP BY kbo_street, kbo_municipality ORDER BY kbo_street, kbo_municipality")]
    return {"cities": cities, "streets": streets, "province": "Antwerpen"}
