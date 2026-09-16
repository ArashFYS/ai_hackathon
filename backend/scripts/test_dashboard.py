"""Dashboard invariants and drilldown parity, using an isolated SQLite database.

Run from backend: python -m unittest discover -s scripts -p 'test_dashboard.py'
"""
import json
import sqlite3
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient
from app.db import get_db
from app.main import app


class DashboardTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:', check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self.db.executescript((Path(__file__).parents[1] / 'app/schema.sql').read_text())
        app.dependency_overrides[get_db] = lambda: self.db
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()
        self.client.close()
        self.db.close()

    def record(self, nr, **values):
        row = dict(nr=nr, record_type='enterprise', name=nr, kbo_municipality='Schoten',
                   kbo_niscode='11040', kbo_street='Teststraat', lat=51.25, lng=4.5,
                   source='starter-geojson', fetched_at='2026-09-07', raw='{}') | values
        self.db.execute(f"INSERT INTO records ({','.join(row)}) VALUES ({','.join('?' * len(row))})", list(row.values()))

    def get(self, path):
        response = self.client.get('/api/' + path)
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_complete_counts_readonly_and_pagination(self):
        for i in range(2105):
            self.record(str(i).zfill(10), record_type='establishment' if i % 2 else 'enterprise')
        self.db.commit()
        self.db.execute('PRAGMA query_only = ON')
        with patch('httpx.get', side_effect=AssertionError('No external calls')):
            data = self.get('dashboard?municipality=11040')
        self.assertEqual(data['total'], 2105)
        for key in ('types', 'statuses', 'certainty', 'contacts'):
            self.assertEqual(sum(data[key].values()), 2105)
        self.assertEqual(sum(s['count'] for s in data['sectors']), 2105)
        self.assertEqual(len(data['map']), 2105)
        page = self.get('records?municipality=11040&limit=100&offset=2100')
        self.assertEqual((page['total'], len(page['items'])), (2105, 5))
        for status, count in data['statuses'].items():
            self.assertEqual(self.get(f'records?municipality=11040&status={status}')['total'], count)

    def test_parent_context_evidence_and_proposals_do_not_duplicate(self):
        self.record('parent', kbo_municipality='Antwerpen', kbo_niscode='11002', phone='123')
        self.record('local', record_type='establishment', parent_nr='parent')
        self.record('fallback', kbo_niscode=None, kbo_municipality=' schoten ')
        for _ in range(2):
            self.db.execute("INSERT INTO evidence(record_nr, source, observation, observed_activity, conclusion, observed_at, created_at) VALUES ('local','website','Open','restaurant','actief','2026-09-15','2026-09-15')")
            self.db.execute("INSERT INTO proposals(record_nr,kind,reason,status,created_at) VALUES ('local','address_check','Check','open','2026-09-15')")
        self.db.execute("INSERT INTO proposals(record_nr,kind,reason,status,created_at) VALUES (NULL,'missing_establishment','Check','open','2026-09-15')")
        self.db.commit()
        data = self.get('dashboard?municipality=11040')
        self.assertEqual(data['total'], 2)
        self.assertEqual(data['with_evidence'], 1)
        self.assertEqual(data['contacts']['zetel'], 1)
        self.assertEqual(data['missing_parents'], 0)
        self.assertEqual(data['proposals']['open'], 2)
        self.assertEqual(data['unlinked_proposals_all_municipalities'], 1)
        self.assertEqual(len(self.get('proposals?municipality=11040&status=open')), 2)
        self.assertEqual(len(self.get('proposals?linked=false')), 1)
        self.assertEqual(self.get('records?municipality=11040&has_evidence=true')['total'], 1)
        for sector in data['sectors']:
            self.assertEqual(self.get(f"records?municipality=11040&activity={sector['sector']}")['total'], sector['count'])
        self.assertFalse(data['provenance']['complete_municipality'])
        self.assertEqual(data['provenance']['retrieved_from'], '2026-09-07')

    def test_cached_nbb_is_consistent_and_contacts_stay_separate(self):
        self.record('company')
        payload = {'available': True, 'company': {'legal_situation': 'Faillissement'}, 'fetched_at': '2026-09-16', 'contacts': []}
        self.db.execute('INSERT INTO nbb_cache VALUES (?,?,?)', ('company', '2026-09-16', json.dumps(payload)))
        self.db.commit()
        data = self.get('dashboard')
        summary = self.get('records')['items'][0]
        detail = self.get('records/company')['record']
        street = self.get('streets/Teststraat')['addresses'][0]['records'][0]
        geo = self.get('records/geo')['items'][0]
        self.assertEqual(summary['assessment'], detail['assessment'])
        self.assertEqual(summary['assessment'], street['assessment'])
        self.assertEqual(summary['assessment']['status'], geo['status'])
        self.assertEqual(data['statuses'][geo['status']], 1)
        self.assertEqual(data['contacts']['onbekend'], 1)

    def test_kbo_public_enrichment_keeps_scoped_dashboard_and_detail_in_sync(self):
        self.record('local')
        self.record('outside', kbo_municipality='Antwerpen', kbo_niscode='11002')
        payload = {'available': True, 'phone': '123', 'snapshot_date': '2026-09-16',
                   'activities': [{'code': '56111', 'title': 'Restaurant', 'kind': 'hoofd', 'since': None}]}
        for nr in ('local', 'outside'):
            self.db.execute('INSERT INTO indicator_cache VALUES (?,?,?,?)',
                            ('kbo_public', nr, '2026-09-16', json.dumps(payload)))
        self.db.commit()
        self.db.execute('PRAGMA query_only = ON')
        with patch('httpx.get', side_effect=AssertionError('No network')), \
             patch('app.kbo_public.fetch_live', side_effect=AssertionError('No enrichment fetch')):
            data = self.get('dashboard?municipality=Schoten&activity=horeca')
            options = self.get('activities?municipality=Schoten&type=enterprise')
            result = self.get('records?municipality=Schoten&activity=horeca&contact=register')
        self.assertEqual(data['total'], 1)
        self.assertEqual(data['contacts']['register'], 1)
        self.assertEqual(data['certainty']['middel'], 1)
        self.assertEqual([(s['sector'], s['count']) for s in options], [('horeca', 1)])
        self.assertEqual(result['total'], 1)
        self.assertEqual(result['items'][0]['activity']['source'], 'KBO (publiek)')
        self.db.execute('PRAGMA query_only = OFF')
        detail = self.get('records/local')['record']
        self.assertEqual(result['items'][0]['assessment'], detail['assessment'])
        self.assertEqual(result['items'][0]['activity'], detail['activity'])
        self.assertEqual(self.client.get('/api/nacebel?q=restaurant').status_code, 200)
        self.assertEqual(self.client.post('/api/records/absent/kbo-public').status_code, 404)

    def test_empty_and_filters(self):
        data = self.get('dashboard')
        self.assertEqual(data['total'], 0)
        self.assertEqual(data['map'], [])
        self.assertIsNone(data['provenance']['retrieved_from'])
        self.record('missing', record_type='establishment', parent_nr='absent', lat=None)
        self.db.commit()
        self.assertEqual(self.get('records?municipality=Schoten&parent_missing=true')['total'], 1)
        self.assertEqual(self.get('dashboard?type=enterprise')['total'], 0)
        self.assertEqual(self.get('dashboard?activity=nonexistent')['total'], 0)
        self.assertEqual(self.get('dashboard')['map'], [])
        self.assertEqual(self.client.get('/api/dashboard?type=invalid').status_code, 422)


if __name__ == '__main__':
    unittest.main()
