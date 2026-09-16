# Tickets -- ai_hackathon (Prefix: TICKET)

> Next ID: TICKET-030
>
> **Deadline: 16:30 Europe/Brussels, 16 Sep 2026.** Build freeze ~15:00 → record 15:00–15:45 → upload + check + form by 16:15.
> Anything not demoable by 15:00 is a slide in the video, not a feature.
>
> Priority: **MVP** = on the critical path for the 3-min screen recording. **Stretch** = only if MVP is recordable.

## In Progress

### TICKET-029: Language toggle — Dutch default, English optional
- **Type:** feat(ui)
- **Created:** 2026-09-16
- **Description:** NL | EN toggle in the header. Dutch is the default and the officer-facing language (challenge requirement); English is for the jury/video. Frontend-only i18n: `src/i18n/` with `nl.ts` and `en.ts` dictionaries, a `LanguageProvider` + `useT()` hook, persisted in localStorage (`lang`), `<html lang>` updated. All static UI text (nav, headings, table columns, buttons, form labels, placeholders, hints, status/zekerheid/source/contact/activity labels, empty/loading/error states, minibrowser tab labels and "wat te controleren" texts) goes through `t()`. Backend-generated free text (reason sentences, proposal texts, register values, NBB model names) stays as delivered — in EN mode it is shown unchanged with a small note "(brontekst in het Nederlands / source text in Dutch)" on the Beoordeling block. The challenge vocabulary (Adres, Register, Bewijs van activiteit, Laatste waarneming, Zekerheid, Voorstel, bevestigen/afwijzen, contactgegevens onbekend) is translated literally in EN (Address, Register, Evidence of activity, Last observation, Certainty, Proposal, confirm/reject, contact details unknown).

### TICKET-028: README — features and how the tool works
- **Type:** docs
- **Created:** 2026-09-16
- **Description:** Rewrite README.md: problem, every feature (Zoeken, Straatoverzicht, Detail, minibrowser tabs, Goedgekeurd, Kaart), the rule table with sources, architecture, data sources, run instructions, data caveats, real vs. not, repo workflow.
### TICKET-013: Pitch video and submission
- **Type:** docs | **Priority:** MVP — hard deadline
- **Created:** 2026-09-16
- **Description:** 3-minute video (NL or EN), first frame = team name + "Challenge 1". Structure: 0:00–0:30 officer problem · 0:30–1:30 screen recording of the real flow (search → detail → evidence → log observation → approve → street overview → export) · 1:30–2:20 architecture, data, what is real vs mocked · 2:20–3:00 value, limits, reuse (other municipality). Upload to YouTube as public/unlisted, **open in a private window to verify no sign-in**, submit via Google Form (link in docs/challenge.md).
- **Times:** record by 15:45, uploaded and verified by 16:15, form submitted by 16:20.

## Backlog

### MVP — critical path (in build order)

### TICKET-026: Import KBO Open Data (activity.csv, contact.csv, establishment.csv)
- **Type:** feat(data) | **Priority:** Stretch (needs a free KBO Open Data account; dump is large)
- **Created:** 2026-09-16
- **Description:** Register at economie.fgov.be for KBO Open Data, download the monthly full dump, and import for the municipality: NACE activities and official contact data for every enterprise and establishment, plus all establishments of enterprises seated elsewhere. Fills TICKET-024 and TICKET-025 for ~100 % of rows. Record dump date as `observed_at` on the resulting reasons.

### TICKET-027: OpenStreetMap enrichment (phone, website, opening hours, shop type)
- **Type:** feat(evidence) | **Priority:** Stretch
- **Created:** 2026-09-16
- **Description:** "Zoek op OpenStreetMap" button on the detail page: Overpass query within ~60 m of the coordinates, fuzzy-match on name; on a hit create evidence rows (source `openstreetmap`, URL `https://www.openstreetmap.org/<type>/<id>`, observed_at = OSM `timestamp`) with phone/website/opening_hours and the `shop`/`amenity` tag as observed activity. Use a mirror list (overpass-api.de, overpass.kumi.systems) and a proper User-Agent. Verify coverage on Paalstraat first.

### Stretch — only after MVP is recordable

### TICKET-017: Sector-specific review sources (horeca)
- **Type:** feat(evidence) | **Priority:** Stretch
- **Created:** 2026-09-16
- **Description:** When NACE / observed activity is horeca, add TripAdvisor search link (`https://www.tripadvisor.com/Search?q=<naam>+<gemeente>`) and similar per-sector referrals.

### TICKET-018: CSV / GeoJSON upload UI
- **Type:** feat(data) | **Priority:** Stretch
- **Created:** 2026-09-16
- **Description:** Browser upload of a VKBO export instead of running the import script; reuses TICKET-004 parser.

## Done

### TICKET-019: Belgisch Staatsblad link
- **Type:** feat(evidence) | **Priority:** Stretch
- **Created:** 2026-09-16 | **Completed:** 2026-09-16
- **Description:** `ejustice.just.fgov.be/cgi_tsv/tsv_rech.pl?btw=<nr>` returned HTTP 500 on 2026-09-16; find a working publication-search URL before adding.
- **Outcome:** working URL is `cgi_tsv/rech_res.pl?language=nl&btw=<nr>` (verified: 3 publications for Tene Quod Bene). Site sends `frame-ancestors 'self'` → link-out tab "Staatsblad" in the minibrowser.

### TICKET-015: Google Maps / Street View embeds and reviews
- **Type:** feat(evidence) | **Priority:** Stretch — needs a Google Maps API key
- **Created:** 2026-09-16 | **Completed:** 2026-09-16 (superseded)
- **Description:** Replace link-outs with Maps Embed API iframes (place + streetview modes; free tier, key required). Google reviews need Places API + billing — likely stays a link-out.
- **Outcome:** not needed — Google Maps (`output=embed`) and Street View (`output=svembed`) render inside the minibrowser without an API key (TICKET-008). Google reviews stay inside the embedded map; Places API not used.

### TICKET-023: "Inhoudingsplicht" tab — fiscal and social debts check
- **Type:** feat(evidence)
- **Created:** 2026-09-16 | **Completed:** 2026-09-16
- **Description:** Add https://www.checkinhoudingsplicht.be (RSZ · FOD Financiën · RSVZ) as a minibrowser tab. Verified: no frame restrictions, `?identificationnumber=<nr>` prefills the enterprise number; the lookup is captcha-protected so it stays a click for the officer (no automated calls). Evidence source option "Check Inhoudingsplicht".
- **Commits:** `cd81619 (merged 1c9d9b6)`

### TICKET-021: Provenance on every reason (source, field, date, verify link) + NBB signal in the assessment
- **Type:** feat(score)
- **Created:** 2026-09-16 | **Completed:** 2026-09-16
- **Description:** A reason is not just a sentence: every entry in `assessment.reasons` carries `source` (KBO via VKBO · Vlaams Adressenregister · VKBO geometrie · NBB Balanscentrale · officer observation), `field` (the register field, e.g. `Rechtstoestand`, `Datum_adresdoorhaling`), `observed_at` (snapshot date of the register row, or the observation date) and `url` (KBO Public Search page of the enterprise or establishment, NBB consult page, officer-supplied URL). Starter rows are stamped with the real snapshot date (2026-09-07 from source-metadata.json) instead of import time. The detail assessment also reads the cached NBB payload: last filing > 24 months → negatief; NBB legal situation ≠ Normale toestand → sterk negatief (second, independent source). UI shows "Bron · veld · datum · Controleer bron ↗" under each reason. Also fixes an intermittent 500 (`check_same_thread`).
- **Commits:** `5990fbe (merged 1c9d9b6)`

### TICKET-024: Filter on activity (sector) in Zoeken and Straatoverzicht
- **Type:** feat(search) | **Priority:** MVP (small)
- **Created:** 2026-09-16 | **Completed:** 2026-09-16
- **Data reality:** the starter data has a NACE activity for only 81/1000 rows (`NACE_hoofdact_RSZ`); the VAT activity is empty for every row. So the filter must be honest: most rows are "Activiteit onbekend" until enriched.
- **Backend:** `GET /api/records?activity=<sector>`; `GET /api/activities` → `[{ sector, label, count }]`. Sector = NACE 2-digit → Dutch label (47 Detailhandel · 56 Horeca · 86 Gezondheidszorg · 96 Persoonlijke diensten (kapsalons…) · 45 Garages · 68 Vastgoed · 41–43 Bouw · 69–70 Zakelijke diensten · 85 Onderwijs · 94 Verenigingen · overige · onbekend). Sources, in priority order: `nace_rsz` → `nace_vat` → latest officer-observed activity (`evidence.observed_activity`, free text mapped by keyword: kapsalon→96, bakkerij→47, restaurant/café→56 …) → `onbekend`. Each record gets `activity: { sector, label, source: 'KBO (RSZ)'|'KBO (BTW)'|'waarneming'|null }`.
- **Frontend:** "Activiteit" dropdown next to Type/Status on Zoeken and on Straatoverzicht; activity label + source shown in the results table and in Registergegevens.
- **Enrichment path (the real fix):** KBO Open Data (economie.fgov.be, free account, monthly full dump) ships `activity.csv` with NACE codes for every enterprise **and establishment** → import by `EntityNumber`. That would fill the sector for ~all rows. Track as TICKET-026.
- **Commits:** `b93d7e0` (branch `feat/TICKET-024-activity-filter`, PR into main)

### TICKET-025: Contact (phone / email / website) per company, with source and date
- **Type:** feat(detail) | **Priority:** MVP (small) + follow-ups
- **Created:** 2026-09-16 | **Completed:** 2026-09-16
- **Data reality:** VKBO gives a phone for 53/1000 rows and an e-mail for 73. No establishment in the sample has a parent with a phone in the dataset. The brief: show the number, whether it belongs to the local establishment or the central office, a clickable source and when it was checked; otherwise "contactgegevens onbekend".
- **Today (this ticket, done):**
  1. Contact block shows every known contact as a row: *waarde · hoort bij (vestiging / zetel) · bron · datum · link*. Register phone/email → bron "KBO (via VKBO)", datum = snapshot date, link = KBO Public Search.
  2. Establishment without contact → fall back to the parent enterprise's contact labelled **"zetel"** (fetch via VKBO if missing — TICKET-012 button).
  3. Officer-observed contact: `evidence` gets optional `phone`, `email`, `website` columns; EvidenceForm gets the three fields ("Contact gezien op Google Maps / website"). Shown in the Contact block as "waargenomen via {bron} op {datum}" with the URL.
  4. `RecordSummary.contact_status`: `register` | `zetel` | `waargenomen` | `onbekend` — filterable later.
- **Follow-ups (how we get more numbers, ranked):**
  - **KBO Open Data `contact.csv`** (official, TEL/EMAIL/WEB per enterprise and establishment; free account) → TICKET-026. Best complete source.
  - **OpenStreetMap via Overpass** (free, no key): `phone`/`contact:phone`/`website`/`opening_hours` tags for shops near the coordinates matched by name; store as evidence with source "OpenStreetMap" + object URL + OSM timestamp. Coverage unverified (Overpass timed out during the check on 2026-09-16) → TICKET-027.
  - NBB company record (`email`, `website`) — already fetched in the NBB panel; surface when present.
  - Not: Google Places (key + billing), scraping Google Maps / Gouden Gids (terms of use).

- **Commits:** `027cf3d, 21a5226` (branch `feat/TICKET-025-contact-source`; Done-move commit follows)

### TICKET-014: Map view
- **Type:** feat(map) | **Priority:** Stretch
- **Created:** 2026-09-16 | **Completed:** 2026-09-16
- **Description:** Leaflet + OpenStreetMap tiles (no key) with records coloured by status; click → detail. Flags the "few points well outside Schoten". `/kaart` page + `GET /api/records/geo`; "Buiten Schoten: N" button fits the map to the mis-geocoded points (60/1000 outside the scoring bbox, one near Paris).
- **Commits:** `08ee0f7`

### TICKET-020: "Vestiging ontbreekt op dit adres" — record a business that is not in the register
- **Type:** feat(approval) | **Priority:** MVP (small, ~20 min)
- **Created:** 2026-09-16 | **Completed:** 2026-09-16
- **Why:** the jury's worked example has three rows; the third is *Kapsalon Voorbeeld (niet in register op dit adres)* — a shop the officer sees on the street or on Google Maps that has no KBO record at that address. Today the tool can only act on records that exist. Without this, "find missing records" (success criterion 1) is only half covered.
- **Backend**
  - `schema.sql`: `proposals.record_nr` becomes nullable; add `address TEXT` (free-text address the officer saw), `observed_name TEXT`, `source TEXT`, `source_url TEXT`, `observed_at TEXT`. Existing rows unaffected (ALTER TABLE ADD COLUMN; for the NOT NULL → nullable change recreate the table in `apply_schema()` only if the old constraint is present, or simply accept that a fresh `make import` rebuilds it).
  - `POST /api/proposals/missing` body `{ street, housenr, box?, postcode, municipality, observed_name, observed_activity?, source, source_url?, observed_at, reason }` → creates a proposal with `kind='missing_establishment'`, `record_nr=NULL`, `proposed_value=observed_name`, `current_value=NULL`, `address=<formatted>`, status `open`. Returns Proposal (with `record: null`, `address` filled).
  - `GET /api/streets/{street}` gains `missing: Proposal[]` — open `missing_establishment` proposals whose `address` starts with that street, so the row shows up in the overview.
  - `GET /api/proposals` and `/export` include these rows; `display_name` = `observed_name`, `address` from the proposal.
  - `proposal_with_record()` must tolerate `record_nr IS NULL`.
- **Frontend**
  - Straatoverzicht: button **"Vestiging ontbreekt op dit adres"** at the top (and per address-group header). Opens an inline form prefilled with the street (and house number when opened from a group): *Huisnummer · Naam zoals waargenomen · Waargenomen activiteit · Bron (Google Maps / Street View / Terreinbezoek / Website / Andere) · URL · Datum waarneming · Toelichting*. Submit → POST → reload.
  - The resulting row renders in the table exactly like the jury example: **Adres** = the address · **Onderneming / vestiging** = `observed_name` + "(niet in register op dit adres)" · **Register** = "—" · **Bewijs van activiteit** = reason · **Laatste waarneming** = observed_at · **Zekerheid** = "Middel" (fixed) · **Voorstel** = "Nazicht: vestiging ontbreekt of adres verkeerd" · Bevestigen / Afwijzen.
  - Goedgekeurd: rows with `record: null` show `observed_name` and the proposal's address, no detail link.
- **Done when:** on Paalstraat, adding "Kapsalon Voorbeeld" at nr 20 with bron Street View shows the third-example row; bevestigen moves it to Goedgekeurd and into the CSV export with kind `missing_establishment`.
- **Out of scope:** matching the observed name against records on nearby addresses (nice-to-have suggestion: "Lijkt op … op nr 22").
- **Commits:** `45b175a, e231b16`

### TICKET-022: Branch-per-ticket policy, no pushes to main
- **Type:** chore
- **Created:** 2026-09-16 | **Completed:** 2026-09-16
- **Description:** Non-negotiable rule in CLAUDE.md and conventions.md: every ticket on its own branch, main only via PR. `.claude/hooks/pre-push` refuses pushes to main.
- **Commits:** (this branch)

### TICKET-005: Company lookup (search)
- **Type:** feat(search) | **Priority:** MVP
- **Created:** 2026-09-16 | **Completed:** 2026-09-16
- **Description:** Search page in Dutch: by naam / commerciële naam, ondernemingsnummer, straat / adres. Results list shows type (onderneming / vestiging), address, status badge from TICKET-007. Link to detail page.
- **Done when:** typing "Paalstraat" or a trade name or a registry number returns the right rows.
- **Commits:** `128ea94, 196ccbe`

### TICKET-006: Company detail page with enterprise ↔ establishment ↔ seat linkage
- **Type:** feat(detail) | **Priority:** MVP
- **Created:** 2026-09-16 | **Completed:** 2026-09-16
- **Description:** Detail view for one record: register facts (names, rechtsvorm, rechtstoestand, start date, KBO address vs AR address, NACE if present). For an establishment: card for the parent enterprise — in dataset → link; parent municipality ≠ local → "zetel elders"; not in dataset → "moederonderneming niet in dataset" + fetch button (TICKET-012). For an enterprise: list its establishments in the dataset. Contact block: phone/email with whether it belongs to vestiging or zetel; if none → **"contactgegevens onbekend"**. Never invent values; show missing as missing.
- **Why:** the brief says explicitly "keep these records connected and make their relationship clear" — this is the domain trap.
- **Commits:** `128ea94, 196ccbe`

### TICKET-007: Rule-based activity status, Zekerheid and reasons (no AI)
- **Type:** feat(score) | **Priority:** MVP
- **Created:** 2026-09-16 | **Completed:** 2026-09-16
- **Description:** Deterministic scoring that outputs **status** (Actief / Ter controle / Waarschijnlijk niet actief / Geen onderneming) + **Zekerheid** (Hoog / Middel / Laag) + an ordered **list of reasons** shown in the UI. Every reason is a row the officer can read (Tom persona: "see how the tool reached its conclusion"). Register-only signals:
  - `Rechtstoestand` ≠ "Normale toestand" (ontbinding / vereffening / faillissement) → niet actief, Hoog
  - `Datum_adresdoorhaling` set (address struck off ex officio) → niet actief, Hoog
  - `Rechtsvorm` = "Vereniging van Mede-eigenaars" → Geen onderneming (apartment co-owners, not a business)
  - AR address ≠ KBO address → address uncertainty (−)
  - Coordinates outside municipality bbox → address uncertainty (−)
  - Parent enterprise not in dataset → status unknown (Laag) until fetched
  - Parent enterprise status inherited by establishment
  - No phone / email / website → weak (−)
  - Registered activity (NACE) vs officer-observed activity mismatch → Ter controle
  Officer-logged evidence (TICKET-009) moves status/Zekerheid up or down; latest observation date shown as "Laatste waarneming".
- **Note:** this is what the user calls the "trust score". Present it as status + Zekerheid + reasons, not a bare number — the brief says show uncertainty rather than invent it.
- **Commits:** `128ea94`

### TICKET-008: External evidence panel — minibrowser (iframes) + NBB data panel
- **Type:** feat(evidence) | **Priority:** MVP
- **Created:** 2026-09-16 | **Completed:** 2026-09-16
- **Description:** Side panel on the detail page with tabs; each tab is an embedded view where the site allows framing, otherwise a native panel or a link-out. Verified 2026-09-16 with curl (no API keys, no billing):
  - **Google Maps (kaart, recensies, openingsuren):** iframe `https://maps.google.com/maps?q=<naam>+<adres>&output=embed` — redirects to `google.com/maps/embed?pb=…` which sends no X-Frame-Options ✔ embeddable
  - **Street View:** `output=svembed` redirects to an empty pb; try the `maps/embed?pb=!4v0!6m8!1m7!1s!2m2!1d<lat>!2d<lng>!3f0!4f0!5f0.75` form in the browser; fallback = link-out `google.com/maps/@?api=1&map_action=pano&viewpoint=<lat>,<lng>`
  - **KBO Public Search:** iframe `https://kbopub.economie.fgov.be/kbopub/toonondernemingps.html?ondernemingsnummer=<nr>&lang=nl` — no frame restriction ✔ embeddable; establishment list: `vestiginglijst.html?ondernemingsnummer=<nr>&lang=nl`
  - **NBB Balanscentrale (jaarrekeningen / "earnings"):** site sends `X-Frame-Options: SAMEORIGIN` → **not embeddable**, but its public JSON API works without a key (see TICKET-016, promoted to MVP). Link-out to `https://consult.cbso.nbb.be/consult-enterprise/<nr>` kept as "Open in NBB".
  - **Web search (eigen website):** DuckDuckGo html / Bing send no frame header ✔ embeddable
  Every tab shows "Bron · URL · Wat te controleren" and a "Open in nieuw venster" link. Sites that refuse to render inside the iframe fall back to the link.
- **Assumption:** the iframe approach is a demo convenience; some sites may block framing at runtime (consent screens). The officer's own observation is what gets recorded (TICKET-009).
- **Commits:** `196ccbe, 92b4072`

### TICKET-009: Officer evidence log
- **Type:** feat(officer) | **Priority:** MVP
- **Created:** 2026-09-16 | **Completed:** 2026-09-16
- **Description:** On the detail page the officer records an observation: bron (dropdown: Google Maps / Street View / website / terreinbezoek / KBO / NBB / andere), URL (optional), waarneming (free text), waargenomen activiteit (optional), datum (default today), conclusie (actief / niet actief / onduidelijk). Stored in `evidence`. Shown as "Bewijs van activiteit" with "Laatste waarneming". Feeds TICKET-007.
- **Commits:** `128ea94, 196ccbe`

### TICKET-010: Proposals and officer approval (bevestigen / afwijzen)
- **Type:** feat(approval) | **Priority:** MVP
- **Created:** 2026-09-16 | **Completed:** 2026-09-16
- **Description:** The tool generates **voorstellen** (e.g. "markeer als niet actief", "adres nazien", "vestiging ontbreekt") from TICKET-007 + evidence; the officer can also add a manual correction (field, current value, proposed value, reason). Each proposal has status open / bevestigd / afgewezen, decided_at. A "Goedgekeurde wijzigingen" page exports only approved changes (CSV/JSON) — that is "publication". Nothing leaves the tool without approval.
- **Why:** jury criterion 2 ("officer approval before publication") — not optional.
- **Commits:** `128ea94, 196ccbe`

### TICKET-011: Street overview grouped by address (hero demo screen)
- **Type:** feat(overview) | **Priority:** MVP
- **Created:** 2026-09-16 | **Completed:** 2026-09-16
- **Description:** Pick a street (default Paalstraat, 35 rows) → table grouped by address with the brief's exact columns: **Adres · Onderneming / vestiging · Register · Bewijs van activiteit · Laatste waarneming · Zekerheid · Voorstel** and per-row bevestigen / afwijzen. Filter by status. This is the jury's worked example, made real.
- **Commits:** `128ea94, 196ccbe`

### TICKET-012: Freshness and reuse via VKBO API
- **Type:** feat(freshness) | **Priority:** MVP (small)
- **Created:** 2026-09-16 | **Completed:** 2026-09-16
- **Description:** (a) "Haal moederonderneming op" button: fetch a missing parent by `Ondernemingsnr` from `https://geo.api.vlaanderen.be/VKBO/ogc/features/v1/collections/Vkbo/items?f=application/json&filter=Ondernemingsnr='<nr>'&filter-lang=cql2-text` and insert it (✔ verified working). (b) Import script accepts `--gemeente <naam>` and pages through `startIndex` (✔ verified with Brasschaat). Record `fetched_at` on every row. This is the "fresh and reusable" story: swap the municipality filter, re-run.
- **Commits:** `128ea94, 196ccbe`

### TICKET-016: NBB annual-accounts panel from the public consult API
- **Type:** feat(earnings) | **Priority:** MVP (promoted — verified working without a key)
- **Created:** 2026-09-16 | **Completed:** 2026-09-16
- **Description:** Backend endpoint `/api/records/{nr}/nbb` that calls NBB's public API (as used by consult.cbso.nbb.be, verified 2026-09-16):
  - `GET https://consult.cbso.nbb.be/api/rs-consult/companies/<nr>/NL` → name, address, legalForm, legalSituation + date
  - `GET https://consult.cbso.nbb.be/api/rs-consult/published-deposits?page=0&size=10&enterpriseNumber=<nr>&sort=depositDate,desc` → filed annual accounts (periodStartDate/EndDate, modelName, depositDate, id)
  - `GET https://consult.cbso.nbb.be/api/external/broker/public/deposits/consult/csv/<depositId>` → full accounts as `"rubric","value"` rows. Key rubrics: `70` omzet · `9900` brutomarge · `9901` bedrijfswinst/verlies · `9904` winst/verlies boekjaar · `10/15` eigen vermogen · `20/58` balanstotaal · `1003` gemiddeld personeel (VTE)
  - PDF of a deposit: `/api/external/broker/public/deposits/pdf/<depositId>` (link-out; sends X-Frame-Options DENY)
  - Parse JSON with `strict=False` (responses contain control chars). Cache per nr in SQLite (`nbb_cache`) with fetched_at. For establishments use the parent enterprise number.
  Frontend panel "Jaarrekeningen (NBB)": table of last 5 filings with year, model, omzet/brutomarge, winst/verlies, eigen vermogen, VTE; "laatste neerlegging" date. Rule for TICKET-007: vennootschap with no filing in > 24 months → Ter controle; `legalSituation` ≠ Normale toestand → mirror KBO signal.
- **Out of scope today:** any "earnings vs expected footfall" analysis.
- **Commits:** `128ea94, 196ccbe, 92b4072`

### TICKET-004: SQLite schema and starter-data import
- **Type:** feat(data) | **Priority:** MVP
- **Created:** 2026-09-16 | **Completed:** 2026-09-16
- **Description:** Single `records` table mirroring the GeoJSON properties (superset of the CSV) with `record_type` = `enterprise` | `establishment`, `parent_nr` (from `Ondernemingsnr_maatsch_zetel`), `lat`, `lng`. Plus `evidence` and `proposals` tables (see TICKET-009/010). Import script reads `data/raw/*.geojson` (it has phone/email/doorhaling fields the CSV lacks).
- **Rules:** registry numbers stay text (leading zeros); a single space `' '` → NULL; `1900-01-01` / `9999-12-31` → NULL; use `strict=False` JSON parsing (API responses contain control chars).
- **Assumption:** import is a script, not an upload UI (upload UI = TICKET-018).
- **Done when:** `records` has 1000 rows, 457 enterprises / 543 establishments; a query for Paalstraat returns 35.
- **Commits:** `6facd3e`

### TICKET-003: Choose stack and scaffold app
- **Type:** chore | **Priority:** MVP
- **Created:** 2026-09-16 | **Completed:** 2026-09-16
- **Description:** Decide the stack (full-stack web app + SQLite), scaffold the project, write ADR-002, fill in CLAUDE.md Build/Test/Run, conventions.md stack section, .gitignore. One command to run locally.
- **Done when:** `npm run dev` (or equivalent) serves a Dutch-language empty shell page; ADR-002 committed.
- **Commits:** `d82fd38`

### TICKET-002: Document challenge brief and import starter data
- **Type:** docs
- **Created:** 2026-09-16 | **Completed:** 2026-09-16
- **Description:** Capture the full "Find the Real Businesses" challenge brief in docs/challenge.md; download the Schoten KBO starter data (CSV, GeoJSON, source-metadata.json) into data/raw/ and verify checksums.
- **Commits:** `ff6dd14`, `d75b7fa`

### TICKET-001: Project initialization
- **Type:** chore
- **Created:** 2026-09-16 | **Completed:** 2026-09-16
- **Description:** Set up project scaffolding with ticket-based workflow
- **Commits:** `9d5a067`
