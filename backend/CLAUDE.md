# backend/ — FastAPI + SQLite

Python 3.13, FastAPI, stdlib `sqlite3` (no ORM), managed with `uv`. Port **8010**.

```
app/main.py        app, CORS, includes routers
app/db.py          connect() / get_db() dependency; DB at backend/data.db
app/schema.sql     tables: records, evidence, proposals (+ nbb_cache)
app/vkbo.py        VKBO property → row mapping, cleaning rules, upsert SQL
app/scoring.py     rule-based assessment (status + zekerheid + reasons) — NO AI
app/links.py       external evidence URLs for a record
app/nbb.py         NBB Balanscentrale public API client (+ cache)
app/env.py         loads backend/.env into os.environ (no dependency)
app/indicator_cache.py  generic cache (table indicator_cache) + monthly quota counter
app/indicators.py  the three traffic lights (KBO rule, Google Maps payload → light, Peppol payload → light)
app/google_places.py    Places API (New) Text Search, free-quota Pro fields only
app/peppol.py      Peppol SML DNS check + Directory enrichment
app/routers/       records.py · streets.py · evidence.py · proposals.py · nbb.py · indicators.py
scripts/import_data.py
```

Run: `uv run uvicorn app.main:app --reload --port 8010` · Import: `make import` (from repo root).
Test quickly with `curl localhost:8010/api/...`. Keep files < 300 lines; split routers rather than grow them.

## Data rules
- Registry numbers (`nr`, `parent_nr`) are TEXT with leading zeros. Never cast to int.
- `record_type` = `enterprise` (legal entity; carries `legal_status`, `legal_form`) or `establishment` (has `parent_nr`).
- Only 28/543 establishments have their parent in the DB. `parent` may be missing → say so, never invent.
- All external JSON parsed with `json.loads(text, strict=False)` (control chars in VKBO/NBB responses).
- Dutch strings for anything the UI shows verbatim (labels, reasons, proposal texts). English for code/comments.

## API contract (frontend depends on exactly this)

Shared shapes:
```
Assessment  { status: 'actief'|'ter_controle'|'waarschijnlijk_niet_actief'|'geen_onderneming',
              status_label: 'Actief'|'Ter controle'|'Waarschijnlijk niet actief'|'Geen onderneming',
              certainty: 'hoog'|'middel'|'laag', certainty_label: 'Hoog'|'Middel'|'Laag',
              register_label: 'Actief'|'Niet actief'|'—',        // what the register itself says
              reasons: [{ code, text, direction: 'negatief'|'positief'|'neutraal', weight: 'sterk'|'matig'|'zwak' }],
              proposal_text: string,                              // e.g. 'Geen actie', 'Ter controle: geen bewijs van activiteit'
              last_observed: 'YYYY-MM-DD'|null }
RecordSummary { nr, record_type, parent_nr, display_name, name, trade_name, legal_form, legal_status,
                address, kbo_street, kbo_housenr, kbo_box, kbo_postcode, kbo_municipality, lat, lng,
                phone, email, start_date, assessment: Assessment }
Evidence    { id, record_nr, source, url, observation, observed_activity, conclusion: 'actief'|'niet_actief'|'onduidelijk',
              observed_at, created_at }
Proposal    { id, record_nr, kind: 'status_change'|'address_check'|'missing_establishment'|'field_correction',
              field, current_value, proposed_value, reason, status: 'open'|'bevestigd'|'afgewezen', created_at, decided_at,
              record?: { display_name, address } }
Indicator   { level: 'groen'|'geel'|'rood'|'onbekend', label: string, text: string, checked_at: 'YYYY-MM-DD'|null, url: string|null }
            RecordSummary carries indicators: { kbo: Indicator, google_maps: Indicator, einvoice: Indicator }
Links       { google_maps_embed, google_maps, street_view_embed, street_view, kbo_public, kbo_public_embed,
              kbo_establishments, nbb_consult, inhoudingsplicht_embed, inhoudingsplicht, web_search_embed, web_search }
```

Endpoints (all under `/api`):
```
GET  /health
GET  /records?q=&street=&type=&status=&limit=50      → { items: RecordSummary[] }   q matches name/trade_name/search_name/street (LIKE, case-insensitive);
                                                         if q stripped of non-digits is 9–10 digits (officers paste '0448.335.384' or 'BE 0448 335 384'), zfill(10) and also match nr/parent_nr
GET  /records/{nr}                                     → { record: RecordSummary + every column of `records` except `raw`, parent: RecordSummary|null,
                                                           parent_in_dataset: bool, seat_elsewhere: bool,
                                                           establishments: RecordSummary[], evidence: Evidence[], proposals: Proposal[],
                                                           links: Links }
                                                         side effect: (re)generate open proposals from the assessment, idempotently
POST /records/{nr}/fetch-parent                        → RecordSummary  (VKBO API by Ondernemingsnr; 404 if not found)
GET  /records/{nr}/indicators                          → { kbo, google_maps, einvoice }   live Google Maps + Peppol lookups (cached), KBO recomputed
POST /streets/{street}/indicators/refresh              → { street, records, kbo: {groen,geel,rood,onbekend}, google_maps: {...}, einvoice: {...}, has_api_key, seconds }
                                                         sequential lookups for every record in the street (demo pre-fill); 404 "Straat niet gevonden"
GET  /records/{nr}/nbb                                 → { available: bool, enterprise_nr, url, company: {name, legal_form, legal_situation, legal_situation_date, address}|null,
                                                           deposits: [{ id, year, period_start, period_end, model, deposit_date, pdf_url,
                                                                        figures: { omzet, brutomarge, bedrijfsresultaat, winst_verlies, eigen_vermogen, balanstotaal, vte } }],
                                                           last_deposit_date, months_since_last_deposit, fetched_at, note }
POST /records/{nr}/evidence  body {source,url?,observation,observed_activity?,conclusion,observed_at}  → Evidence
POST /records/{nr}/proposals body {kind,field?,current_value?,proposed_value?,reason}                 → Proposal
GET  /streets                                          → [{ street, count }]  sorted by count desc
GET  /streets/{street}                                 → { street, addresses: [{ address, housenr, lat, lng, records: RecordSummary[] (+ last_evidence: Evidence|null, open_proposal: Proposal|null) }] }
GET  /proposals?status=open|bevestigd|afgewezen        → Proposal[] (with record)
POST /proposals/{id}/decide  body {status:'bevestigd'|'afgewezen'}  → Proposal
GET  /proposals/export?format=csv|json                 → only status='bevestigd' rows; CSV download
```

## Scoring rules (`scoring.py`) — deterministic, every reason is shown
Evaluate in order; first "sterk negatief" fixes the status, later rules only add reasons.
1. `legal_status` set and ≠ "Normale toestand" → `waarschijnlijk_niet_actief`, hoog. Reason "Rechtstoestand: {legal_status}".
2. `address_strike_date` set → `waarschijnlijk_niet_actief`, hoog. "Adres ambtshalve doorgehaald op {date}".
3. `exofficio_strike_start` set and no `exofficio_strike_end` → `waarschijnlijk_niet_actief`, hoog. "Ambtshalve doorhaling sinds {date}".
4. `legal_form` = "Vereniging van Mede-eigenaars" → `geen_onderneming`, hoog. "Vereniging van mede-eigenaars: geen handelsactiviteit".
5. Establishment whose parent is in DB and parent hits rule 1–3 → inherit `waarschijnlijk_niet_actief`, hoog. "Moederonderneming {nr}: {reason}".
6. Establishment whose parent is not in DB → reason neutraal "Moederonderneming niet in dataset (zetel mogelijk elders)"; certainty capped at laag unless evidence.
7. `ar_street` and `kbo_street` both set and differ → zwak negatief "Adres wijkt af van het Adressenregister ({kbo} ≠ {ar})".
8. lat/lng outside Schoten bbox (lat 51.22–51.29, lng 4.44–4.56) → zwak negatief "Coördinaten liggen buiten Schoten".
9. No phone and no email → zwak "Geen contactgegevens in het register".
10. Evidence (latest by observed_at): `actief` → `actief`, hoog, positief "Bewijs: {source} {date}: {observation}"; `niet_actief` → `waarschijnlijk_niet_actief`, hoog; `onduidelijk` → `ter_controle`, middel.
    **Conflict:** register sterk-negatief (rule 1–3/5) but latest evidence `actief` → `ter_controle`, middel, reason "Tegenstrijdig: register zegt niet actief, waarneming zegt actief". Evidence never silently overrides the register.
11. No sterk-negatief rule and no evidence → `ter_controle`, laag (middel if phone or email present). Reason neutraal "Enkel registergegevens, nog geen bewijs van activiteit".
`register_label`: "Niet actief" if rule 1–3 hit, "—" for geen_onderneming, else "Actief".
`proposal_text`: waarschijnlijk_niet_actief → "Markeer als niet actief"; geen_onderneming → "Uitsluiten uit overzicht (geen onderneming)"; ter_controle → "Ter controle: geen bewijs van activiteit"; actief → "Geen actie". Address mismatch adds "; adres nazien".
Optional (if time): make `proposals.record_nr` nullable and add `address TEXT` so a `missing_establishment` proposal ("Vestiging ontbreekt op dit adres") can be created from Straatoverzicht for a business that is not in the register — the jury's third worked-example row.
Auto-proposals from the assessment (idempotent — skip if an open or decided proposal with same kind+proposed_value exists): status_change for niet actief / geen onderneming; address_check for rule 7/8.

## External links (`links.py`)
```
google_maps_embed   https://maps.google.com/maps?q={name} {address}&output=embed            (iframe OK, no key)
google_maps         https://www.google.com/maps/search/?api=1&query={name} {address}
street_view_embed   https://www.google.com/maps/embed?pb=!4v0!6m8!1m7!1s!2m2!1d{lat}!2d{lng}!3f0!4f0!5f0.75   (may not render; frontend falls back)
street_view         https://www.google.com/maps/@?api=1&map_action=pano&viewpoint={lat},{lng}
kbo_public / kbo_public_embed  https://kbopub.economie.fgov.be/kbopub/toonondernemingps.html?ondernemingsnummer={enterprise_nr}&lang=nl  (iframe OK)
kbo_establishments  https://kbopub.economie.fgov.be/kbopub/vestiginglijst.html?ondernemingsnummer={enterprise_nr}&lang=nl
nbb_consult         https://consult.cbso.nbb.be/consult-enterprise/{enterprise_nr}   (NOT iframeable)
inhoudingsplicht_embed / inhoudingsplicht  https://www.checkinhoudingsplicht.be/?identificationnumber={enterprise_nr}  (iframe OK; prefills the number; lookup is captcha-protected → officer clicks "Controleren"; RSZ/FOD Financiën/RSVZ fiscal & social debts)
web_search_embed    https://html.duckduckgo.com/html/?q={name} {municipality}          (iframe OK)
web_search          https://www.google.com/search?q={name} {municipality}
```
`enterprise_nr` = the record's own nr for enterprises, `parent_nr` for establishments. URL-encode with `urllib.parse.quote`.

## NBB client (`nbb.py`) — verified 2026-09-16, no key
```
GET https://consult.cbso.nbb.be/api/rs-consult/companies/{nr}/NL
GET https://consult.cbso.nbb.be/api/rs-consult/published-deposits?page=0&size=10&enterpriseNumber={nr}&sort=depositDate,desc
GET https://consult.cbso.nbb.be/api/external/broker/public/deposits/consult/csv/{depositId}   → lines "rubric","value"
PDF: https://consult.cbso.nbb.be/api/external/broker/public/deposits/pdf/{depositId}
```
Send `User-Agent: Mozilla/5.0` and `Accept: application/json`. Rubric → figure: `70` omzet · `9900` brutomarge · `9901` bedrijfsresultaat · `9904` winst_verlies · `10/15` eigen_vermogen · `20/58` balanstotaal · `1003` vte. Missing rubric → null. Fetch figures for at most the 3 most recent deposits (sequential, 10 s timeout each). Cache the whole response JSON in table `nbb_cache(nr TEXT PRIMARY KEY, fetched_at TEXT, payload TEXT)`; refresh if older than 1 day. Any network failure → `available:false` with a Dutch `note`, never a 500.

## VKBO client (`vkbo.py`)
`https://geo.api.vlaanderen.be/VKBO/ogc/features/v1/collections/Vkbo/items?f=application/json&limit=1000&filter=<cql2>&filter-lang=cql2-text`
Filters: `Ondernemingsnr='{nr}'` (fetch parent) · `KBO_Gemeente='{gemeente}'` (import another municipality; page with `&startIndex=`). Insert with `source='vkbo-api'`.

## Activity indicators (`indicators.py`) — three lights per record, additive to the assessment
List endpoints (`/records`, `/streets/{street}`) never hit the network: they read `indicator_cache` (any age) and show `onbekend` when nothing is cached. Live lookups only via `/records/{nr}/indicators` and the street refresh. Indicators never feed `assess()`.

**KBO** (`kbo_indicator(row, parent)`, pure, reuses `scoring.register_negative_reasons`), in order: own rule 1–3 hit → rood · parent (in DB) hits 1–3 → rood · VME → geel · establishment whose parent is not in DB → geel · KBO≠AR or AR missing → geel · else groen. `url` = KBO public page, `checked_at` = register snapshot date.

**Google Maps** (`google_places.py`, key `GOOGLE_MAPS_API_KEY` in `backend/.env`, loaded by `env.py`). POST `https://places.googleapis.com/v1/places:searchText`, headers `X-Goog-Api-Key`, `X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.businessStatus,places.googleMapsUri,places.location` — **Pro fields only; never add rating/reviews/opening hours (paid SKU)**. Body `{textQuery: "<display_name> <address>", languageCode: nl, regionCode: BE, maxResultCount: 3, locationBias: circle 300 m around lat/lng}`. A candidate matches only if `formattedAddress` contains the KBO street and a whole-token part of the house number. rood = `CLOSED_PERMANENTLY` · groen = `OPERATIONAL` match · geel = no match / `CLOSED_TEMPORARILY` / status missing · onbekend = no key, HTTP or network error, quota guard. Monthly counter in `indicator_cache` (kind `quota`, key `google_maps:YYYY-MM`), refuses above 4500. Cache kind `google_maps`, key = record nr, TTL 30 days; errors are never cached.

**E-facturatie** (`peppol.py`). Participant id = `0208:<ondernemingsnummer>` only (enterprise nr; `links.enterprise_nr_of`). SML DNS: host = `base32(sha256(pid.lower())).rstrip('=').lower() + ".iso6523-actorid-upis.edelivery.tech.ec.europa.eu"`; `socket.getaddrinfo` → exists (`EAI_NODATA`: NAPTR only) = registered, `EAI_NONAME` = not registered, else onbekend (not cached). Sanity-resolves `edelivery.tech.ec.europa.eu` first. groen = registered (detail page adds Peppol Directory name + regDate; the Directory is rate-limited, so only `with_directory=True` there) · rood = not registered · geel = not registered but legal form not obliged (vereniging, stichting, maatschap, openbare instelling). Cache kind `einvoice`, key = enterprise nr, TTL 7 days. `url` = Peppol Directory public search.
