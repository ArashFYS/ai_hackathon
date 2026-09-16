import sqlite3
import unittest
from unittest.mock import patch

from app.routers.records import list_records
from app.search import search_clause


class SearchTests(unittest.TestCase):
    def setUp(self):
        self.conn = sqlite3.connect(":memory:")
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("""CREATE TABLE records (
            nr TEXT, parent_nr TEXT, name TEXT, trade_name TEXT, search_name TEXT,
            kbo_street TEXT, kbo_housenr TEXT, kbo_postcode TEXT, kbo_municipality TEXT,
            record_type TEXT, test_status TEXT, test_activity TEXT)""")
        rows = [
            ("0000000001", None, "Bakkerij De Roos", "", "", "Paalstraat", "7", "2900", "Schoten", "enterprise", "actief", "detailhandel"),
            ("0000000002", None, "Bloemen De Roos", "", "", "Eikenlei", "9", "2900", "Schoten", "enterprise", "ter_controle", "detailhandel"),
            ("0000000003", "0000000001", "Fiets Atelier", "", "", "Paalstraat", "12", "2900", "Schoten", "establishment", "ter_controle", "garages"),
            ("0000000004", None, "100%_exact", "", "", "Bosstraat", "2", "2900", "Schoten", "enterprise", "actief", "industrie"),
            ("0000000005", None, "100 percent exact", "", "", "Bosstraat", "4", "2900", "Schoten", "enterprise", "actief", "industrie"),
        ]
        self.conn.executemany("INSERT INTO records VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", rows)

    def tearDown(self):
        self.conn.close()

    def matches(self, q, mode="and"):
        clause, params = search_clause(q, mode)
        sql = "SELECT nr FROM records" + (" WHERE " + clause if clause else "")
        return {r[0] for r in self.conn.execute(sql, params)}

    def test_and_across_fields(self):
        self.assertEqual(self.matches("roos paalstraat"), {"0000000001"})

    def test_or_across_fields(self):
        self.assertEqual(self.matches("roos paalstraat", "or"), {"0000000001", "0000000002", "0000000003"})

    def test_quoted_phrase_and_incomplete_quote(self):
        self.assertEqual(self.matches('"De Roos" Paalstraat'), {"0000000001"})
        self.assertEqual(self.matches('"Roos'), {"0000000001", "0000000002"})

    def test_address_number_and_case(self):
        self.assertEqual(self.matches("PAALSTRAAT 12"), {"0000000003"})

    def test_formatted_identifier_and_parent(self):
        for q in ["BE 0000 000 001", "000.000.001"]:
            self.assertEqual(self.matches(q), {"0000000001", "0000000003"})

    def test_literal_wildcards_and_injection(self):
        self.assertEqual(self.matches("%_", "phrase"), {"0000000004"})
        self.assertEqual(self.matches("' OR 1=1 --", "phrase"), set())

    def test_blank_query(self):
        self.assertEqual(len(self.matches("   ")), 5)

    def test_explicit_operators_and_precedence(self):
        self.assertEqual(self.matches("roos AND Paalstraat OR Fiets"), {"0000000001", "0000000003"})
        self.assertEqual(self.matches("roos or Paalstraat"), {"0000000001", "0000000002", "0000000003"})
        self.assertEqual(self.matches("roos OR"), {"0000000001", "0000000002"})

    def test_quoted_operator_is_literal(self):
        self.assertEqual(self.matches('"OR"'), set())

    def test_type_keywords_and_boolean_scope(self):
        for word in ("establishment", "vestiging", "establishgment"):
            self.assertEqual(self.matches(word), {"0000000003"})
        self.assertEqual(self.matches("enterprise AND roos"), {"0000000001", "0000000002"})
        self.assertEqual(self.matches("establishment OR roos"), {"0000000001", "0000000002", "0000000003"})
        self.assertEqual(self.matches('"establishment"'), set())

    def test_mode_preserves_other_filters_and_counts_before_cap(self):
        def summarize(_conn, rows):
            return [{**r, "assessment": {"status": r["test_status"]},
                     "activity": {"sector": r["test_activity"], "sectors": [r["test_activity"]]}} for r in rows]
        with patch("app.routers.records.summarize_many", side_effect=summarize), patch("app.routers.records.known_contacts", return_value={}):
            result = list_records(q="roos paalstraat", mode="or", type="enterprise",
                                  status="actief", activity="detailhandel", limit=1, conn=self.conn)
            self.assertEqual([r["nr"] for r in result["items"]], ["0000000001"])
            result = list_records(q="roos", mode="and", limit=1, conn=self.conn)
            self.assertEqual(result["total"], 2)
            self.assertEqual(len(result["items"]), 1)


if __name__ == "__main__":
    unittest.main()
