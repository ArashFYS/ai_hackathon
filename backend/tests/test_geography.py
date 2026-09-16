from pathlib import Path
import sqlite3
import unittest

from app.geography import coordinate_issue
from app.links import build_links
from app.routers.locations import ANTWERP_MUNICIPALITIES, location_options
from app.routers.records import list_geo


class GeographyTests(unittest.TestCase):
    def test_paris_point_is_rejected_and_northern_schoten_is_retained(self):
        self.assertEqual(coordinate_issue({"kbo_municipality": "Schoten", "lat": 49.2933354, "lng": 2.30668925}), "outside_expected_area")
        self.assertIsNone(coordinate_issue({"kbo_municipality": "Schoten", "lat": 51.30106723, "lng": 4.54136719}))
        self.assertEqual(coordinate_issue({"kbo_municipality": "Schoten", "lat": None, "lng": None}), "invalid_coordinates")

    def test_bad_streetview_does_not_link_to_france(self):
        row = {"nr": "0409801145", "record_type": "enterprise", "kbo_municipality": "Schoten", "lat": 49.2933354, "lng": 2.30668925}
        links = build_links(row, "Playground", "Sint-Maria-ten-Boslei ZN, 2900 Schoten")
        self.assertIsNone(links["street_view_embed"])
        self.assertNotIn("49.2933354", links["street_view"])

    def test_snapped_streetview_from_upstream_is_kept(self):
        row = {"nr": "2300676484", "record_type": "establishment", "parent_nr": "0744825386", "kbo_municipality": "Schoten", "lat": 51.27033844, "lng": 4.53454983}
        links = build_links(row, "Example", "Acaciadreef 7", {"available": True, "lat": 51.2704, "lng": 4.5346, "heading": 123})
        self.assertIn("heading=123", links["street_view"])
        self.assertIn("51.2704,4.5346", links["street_view"])

    def test_city_filter_and_coverage(self):
        conn = sqlite3.connect(":memory:")
        conn.row_factory = sqlite3.Row
        conn.executescript((Path(__file__).parents[1] / "app/schema.sql").read_text())
        conn.executemany(
            """INSERT INTO records(nr,record_type,name,kbo_street,kbo_municipality,lat,lng,source,fetched_at,raw)
               VALUES (?,'enterprise','Example','Kerkstraat',?,?,?,'test','2026-09-16','{}')""",
            [("0000000001", "Schoten", 51.27, 4.53), ("0000000002", "Schoten", 49.2933354, 2.30668925),
             ("0000000003", "Antwerpen", 51.22, 4.4)],
        )
        result = list_geo(city="schoten", street="Kerkstraat", limit=2000, conn=conn)["items"]
        self.assertEqual(len(result), 2)
        self.assertEqual(sum(item["location_valid"] for item in result), 1)
        options = location_options(conn)
        self.assertEqual(len(ANTWERP_MUNICIPALITIES), 67)
        self.assertEqual({item["city"] for item in options["streets"]}, {"Schoten", "Antwerpen"})
        self.assertEqual(next(item["count"] for item in options["cities"] if item["name"] == "Brasschaat"), 0)
        conn.close()


if __name__ == "__main__":
    unittest.main()
