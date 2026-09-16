import json
from pathlib import Path
import sqlite3
import unittest

from app.contact_selection import contact_matches, phone_digits
from app.routers.record_contacts import ContactSelection, selected_contacts
from app.routers.records import list_records


class ContactSelectionTests(unittest.TestCase):
    def setUp(self):
        self.conn = sqlite3.connect(":memory:")
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript((Path(__file__).parents[1] / "app/schema.sql").read_text())
        self.conn.executemany(
            """INSERT INTO records(nr, parent_nr, record_type, name, phone, email, source, fetched_at, raw)
               VALUES (?,?,?,?,?,?,'test','2026-09-16','{}')""",
            [
                ("0000000001", None, "enterprise", "Office", "+32 3 664 93 04", "Office@example.org"),
                ("0000000002", "0000000001", "establishment", "Shop", "0470 12 34 56", "shop@example.org"),
                ("0000000003", None, "enterprise", "Unrelated", None, "unrelated@example.org"),
            ],
        )
        self.conn.execute(
            """INSERT INTO evidence(record_nr, source, observation, conclusion, observed_at, created_at, email, phone)
               VALUES ('0000000002','website','Contact page','onduidelijk','2026-09-16','2026-09-16','observed@example.org','0471/22.33.44')"""
        )
        self.conn.execute(
            "INSERT INTO nbb_cache VALUES ('0000000001','2026-09-16',?)",
            (json.dumps({"company": {"email": "cached@example.org"}, "fetched_at": "2026-09-16", "url": "https://example.org"}),),
        )

    def tearDown(self):
        self.conn.close()

    def test_only_selected_records_with_all_known_contacts(self):
        changes = self.conn.total_changes
        result = selected_contacts(ContactSelection(numbers=["0000000002"]), self.conn)["contacts"]
        self.assertEqual(set(result), {"0000000002"})
        values = {contact["value"] for contact in result["0000000002"]}
        self.assertTrue({"Office@example.org", "shop@example.org", "observed@example.org", "cached@example.org"} <= values)
        self.assertNotIn("unrelated@example.org", values)
        self.assertEqual(self.conn.total_changes, changes, "contact export must be read-only")
        self.assertEqual(self.conn.execute("SELECT COUNT(*) FROM proposals").fetchone()[0], 0)

    def test_email_search_including_parent_observed_and_cached(self):
        for q in ["OFFICE@EXAMPLE.ORG", "observed@example.org", "cached@example.org"]:
            result = list_records(q=q, mode="and", type="establishment", limit=100, conn=self.conn)
            self.assertEqual([row["nr"] for row in result["items"]], ["0000000002"])

    def test_phone_search_with_formatting_and_country_code(self):
        for q in ["03 664 93 04", "+32 3 664 93 04", "0471 22 33 44", "0470123456"]:
            result = list_records(q=q, mode="and", type="establishment", limit=100, conn=self.conn)
            self.assertEqual([row["nr"] for row in result["items"]], ["0000000002"])

    def test_phone_normalization_and_combined_search(self):
        self.assertEqual(phone_digits("0032 3 664 93 04"), "036649304")
        self.assertTrue(contact_matches([{"kind": "phone", "value": "+32 470 12 34 56"}], "0470123456"))
        result = list_records(q="Shop AND observed@example.org", mode="and", limit=100, conn=self.conn)
        self.assertEqual(result["total"], 1)

    def test_upstream_enriched_contacts_are_searchable_and_exportable(self):
        self.conn.execute("INSERT INTO indicator_cache(kind,key,fetched_at,payload) VALUES ('kbo_public','0000000002','2026-09-16',?)",
                          (json.dumps({"available": True, "email": "enriched@example.org"}),))
        self.conn.execute("INSERT INTO indicator_cache(kind,key,fetched_at,payload) VALUES ('einvoice','0000000001','2026-09-16',?)",
                          (json.dumps({"directory": {"contacts": [{"email": "peppol@example.org"}]}}),))
        for email in ("enriched@example.org", "peppol@example.org"):
            result = list_records(q=email, mode="and", type="establishment", limit=100, conn=self.conn)
            self.assertEqual(result["total"], 1)
        contacts = selected_contacts(ContactSelection(numbers=["0000000002"]), self.conn)["contacts"]["0000000002"]
        self.assertTrue({"enriched@example.org", "peppol@example.org"} <= {contact["value"] for contact in contacts})


if __name__ == "__main__":
    unittest.main()
