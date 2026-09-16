# Tickets -- ai_hackathon (Prefix: TICKET)

> Next ID: TICKET-020
>
> **Deadline: 16:30 Europe/Brussels, 16 Sep 2026.** Build freeze ~15:00 → record 15:00–15:45 → upload + check + form by 16:15.
> Anything not demoable by 15:00 is a slide in the video, not a feature.
>
> Priority: **MVP** = on the critical path for the 3-min screen recording. **Stretch** = only if MVP is recordable.

## In Progress

### TICKET-005: Company lookup (search)
- **Type:** feat(search) | **Priority:** MVP
- **Created:** 2026-09-16
- **Description:** Search page in Dutch: by naam / commerciële naam, ondernemingsnummer, straat / adres. Results list shows type (onderneming / vestiging), address, status badge from TICKET-007. Link to detail page.
- **Done when:** typing "Paalstraat" or a trade name or a registry number returns the right rows.

### TICKET-006: Company detail page with enterprise ↔ establishment ↔ seat linkage
- **Type:** feat(detail) | **Priority:** MVP
- **Created:** 2026-09-16
- **Description:** Detail view for one record: register facts (names, rechtsvorm, rechtstoestand, start date, KBO address vs AR address, NACE if present). For an establishment: card for the parent enterprise — in dataset → link; parent municipality ≠ local → "zetel elders"; not in dataset → "moederonderneming niet in dataset" + fetch button (TICKET-012). For an enterprise: list its establishments in the dataset. Contact block: phone/email with whether it belongs to vestiging or zetel; if none → **"contactgegevens onbekend"**. Never invent values; show missing as missing.
- **Why:** the brief says explicitly "keep these records connected and make their relationship clear" — this is the domain trap.

### TICKET-007: Rule-based activity status, Zekerheid and reasons (no AI)
- **Type:** feat(score) | **Priority:** MVP
- **Created:** 2026-09-16
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

### TICKET-008: External evidence panel — minibrowser (iframes) + NBB data panel
- **Type:** feat(evidence) | **Priority:** MVP
- **Created:** 2026-09-16
- **Description:** Side panel on the detail page with tabs; each tab is an embedded view where the site allows framing, otherwise a native panel or a link-out. Verified 2026-09-16 with curl (no API keys, no billing):
  - **Google Maps (kaart, recensies, openingsuren):** iframe `https://maps.google.com/maps?q=<naam>+<adres>&output=embed` — redirects to `google.com/maps/embed?pb=…` which sends no X-Frame-Options ✔ embeddable
  - **Street View:** `output=svembed` redirects to an empty pb; try the `maps/embed?pb=!4v0!6m8!1m7!1s!2m2!1d<lat>!2d<lng>!3f0!4f0!5f0.75` form in the browser; fallback = link-out `google.com/maps/@?api=1&map_action=pano&viewpoint=<lat>,<lng>`
  - **KBO Public Search:** iframe `https://kbopub.economie.fgov.be/kbopub/toonondernemingps.html?ondernemingsnummer=<nr>&lang=nl` — no frame restriction ✔ embeddable; establishment list: `vestiginglijst.html?ondernemingsnummer=<nr>&lang=nl`
  - **NBB Balanscentrale (jaarrekeningen / "earnings"):** site sends `X-Frame-Options: SAMEORIGIN` → **not embeddable**, but its public JSON API works without a key (see TICKET-016, promoted to MVP). Link-out to `https://consult.cbso.nbb.be/consult-enterprise/<nr>` kept as "Open in NBB".
  - **Web search (eigen website):** DuckDuckGo html / Bing send no frame header ✔ embeddable
  Every tab shows "Bron · URL · Wat te controleren" and a "Open in nieuw venster" link. Sites that refuse to render inside the iframe fall back to the link.
- **Assumption:** the iframe approach is a demo convenience; some sites may block framing at runtime (consent screens). The officer's own observation is what gets recorded (TICKET-009).

### TICKET-009: Officer evidence log
- **Type:** feat(officer) | **Priority:** MVP
- **Created:** 2026-09-16
- **Description:** On the detail page the officer records an observation: bron (dropdown: Google Maps / Street View / website / terreinbezoek / KBO / NBB / andere), URL (optional), waarneming (free text), waargenomen activiteit (optional), datum (default today), conclusie (actief / niet actief / onduidelijk). Stored in `evidence`. Shown as "Bewijs van activiteit" with "Laatste waarneming". Feeds TICKET-007.

### TICKET-010: Proposals and officer approval (bevestigen / afwijzen)
- **Type:** feat(approval) | **Priority:** MVP
- **Created:** 2026-09-16
- **Description:** The tool generates **voorstellen** (e.g. "markeer als niet actief", "adres nazien", "vestiging ontbreekt") from TICKET-007 + evidence; the officer can also add a manual correction (field, current value, proposed value, reason). Each proposal has status open / bevestigd / afgewezen, decided_at. A "Goedgekeurde wijzigingen" page exports only approved changes (CSV/JSON) — that is "publication". Nothing leaves the tool without approval.
- **Why:** jury criterion 2 ("officer approval before publication") — not optional.

### TICKET-011: Street overview grouped by address (hero demo screen)
- **Type:** feat(overview) | **Priority:** MVP
- **Created:** 2026-09-16
- **Description:** Pick a street (default Paalstraat, 35 rows) → table grouped by address with the brief's exact columns: **Adres · Onderneming / vestiging · Register · Bewijs van activiteit · Laatste waarneming · Zekerheid · Voorstel** and per-row bevestigen / afwijzen. Filter by status. This is the jury's worked example, made real.

### TICKET-012: Freshness and reuse via VKBO API
- **Type:** feat(freshness) | **Priority:** MVP (small)
- **Created:** 2026-09-16
- **Description:** (a) "Haal moederonderneming op" button: fetch a missing parent by `Ondernemingsnr` from `https://geo.api.vlaanderen.be/VKBO/ogc/features/v1/collections/Vkbo/items?f=application/json&filter=Ondernemingsnr='<nr>'&filter-lang=cql2-text` and insert it (✔ verified working). (b) Import script accepts `--gemeente <naam>` and pages through `startIndex` (✔ verified with Brasschaat). Record `fetched_at` on every row. This is the "fresh and reusable" story: swap the municipality filter, re-run.

### TICKET-016: NBB annual-accounts panel from the public consult API
- **Type:** feat(earnings) | **Priority:** MVP (promoted — verified working without a key)
- **Created:** 2026-09-16
- **Description:** Backend endpoint `/api/records/{nr}/nbb` that calls NBB's public API (as used by consult.cbso.nbb.be, verified 2026-09-16):
  - `GET https://consult.cbso.nbb.be/api/rs-consult/companies/<nr>/NL` → name, address, legalForm, legalSituation + date
  - `GET https://consult.cbso.nbb.be/api/rs-consult/published-deposits?page=0&size=10&enterpriseNumber=<nr>&sort=depositDate,desc` → filed annual accounts (periodStartDate/EndDate, modelName, depositDate, id)
  - `GET https://consult.cbso.nbb.be/api/external/broker/public/deposits/consult/csv/<depositId>` → full accounts as `"rubric","value"` rows. Key rubrics: `70` omzet · `9900` brutomarge · `9901` bedrijfswinst/verlies · `9904` winst/verlies boekjaar · `10/15` eigen vermogen · `20/58` balanstotaal · `1003` gemiddeld personeel (VTE)
  - PDF of a deposit: `/api/external/broker/public/deposits/pdf/<depositId>` (link-out; sends X-Frame-Options DENY)
  - Parse JSON with `strict=False` (responses contain control chars). Cache per nr in SQLite (`nbb_cache`) with fetched_at. For establishments use the parent enterprise number.
  Frontend panel "Jaarrekeningen (NBB)": table of last 5 filings with year, model, omzet/brutomarge, winst/verlies, eigen vermogen, VTE; "laatste neerlegging" date. Rule for TICKET-007: vennootschap with no filing in > 24 months → Ter controle; `legalSituation` ≠ Normale toestand → mirror KBO signal.
- **Out of scope today:** any "earnings vs expected footfall" analysis.

### TICKET-013: Pitch video and submission
- **Type:** docs | **Priority:** MVP — hard deadline
- **Created:** 2026-09-16
- **Description:** 3-minute video (NL or EN), first frame = team name + "Challenge 1". Structure: 0:00–0:30 officer problem · 0:30–1:30 screen recording of the real flow (search → detail → evidence → log observation → approve → street overview → export) · 1:30–2:20 architecture, data, what is real vs mocked · 2:20–3:00 value, limits, reuse (other municipality). Upload to YouTube as public/unlisted, **open in a private window to verify no sign-in**, submit via Google Form (link in docs/challenge.md).
- **Times:** record by 15:45, uploaded and verified by 16:15, form submitted by 16:20.

## Backlog

### MVP — critical path (in build order)

### Stretch — only after MVP is recordable

### TICKET-014: Map view
- **Type:** feat(map) | **Priority:** Stretch
- **Created:** 2026-09-16
- **Description:** Leaflet + OpenStreetMap tiles (no key) with records coloured by status; click → detail. Flags the "few points well outside Schoten".

### TICKET-015: Google Maps / Street View embeds and reviews
- **Type:** feat(evidence) | **Priority:** Stretch — needs a Google Maps API key
- **Created:** 2026-09-16
- **Description:** Replace link-outs with Maps Embed API iframes (place + streetview modes; free tier, key required). Google reviews need Places API + billing — likely stays a link-out.

### TICKET-017: Sector-specific review sources (horeca)
- **Type:** feat(evidence) | **Priority:** Stretch
- **Created:** 2026-09-16
- **Description:** When NACE / observed activity is horeca, add TripAdvisor search link (`https://www.tripadvisor.com/Search?q=<naam>+<gemeente>`) and similar per-sector referrals.

### TICKET-018: CSV / GeoJSON upload UI
- **Type:** feat(data) | **Priority:** Stretch
- **Created:** 2026-09-16
- **Description:** Browser upload of a VKBO export instead of running the import script; reuses TICKET-004 parser.

### TICKET-019: Belgisch Staatsblad link
- **Type:** feat(evidence) | **Priority:** Stretch
- **Created:** 2026-09-16
- **Description:** `ejustice.just.fgov.be/cgi_tsv/tsv_rech.pl?btw=<nr>` returned HTTP 500 on 2026-09-16; find a working publication-search URL before adding.

## Done

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
