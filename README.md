# Vind de echte ondernemingen

**Challenge 1 — "Find the Real Businesses"** · ns2agi hackathon, Province of Antwerp · 16 September 2026

A tool for local economy officers (*lokale economie*) that puts the business register next to public evidence and lets the officer decide which businesses are actually active. Built on the Schoten sample of the KBO register. Officer-facing UI in Dutch (English toggle available). **No AI in the product** — every conclusion is a list of reasons the officer can read, each with its source, register field, date and a link to verify it.

> Full challenge brief: [docs/challenge.md](docs/challenge.md) · Pitch script: [docs/video-script.md](docs/video-script.md)

## The problem it solves

The federal register (KBO) lists companies that stopped trading long ago as active, buries real shops under apartment co-owner associations and dormant registrations, and misses businesses that are visibly open. Officers cross-check by hand in Excel, Google and street visits. This tool does the cross-checking on one screen and keeps the officer in control: **nothing leaves the tool until the officer confirms it**.

## What it does (features as of today)

### 1. Gemeenteoverzicht — the start page
A municipal dashboard for Schoten: total records by type (onderneming / vestiging), three priority cards (*Ter controle*, *Actief beoordeeld*, *Met waarneming*), a status donut and a sector donut (NACEBEL activities), plus a data-quality block: records with / without an observation, contact-data status, certainty distribution and establishments whose parent is missing. Every number, legend entry and card is a link to the exact record selection behind it — the dashboard and the search list are computed from the same query, so they never disagree.

### 2. Zoeken — find a record
Live search (300 ms debounce) by name, trade name, ondernemingsnummer (`0448.335.384`, `BE 0448 335 384` and `0448335384` all work), street, e-mail or phone; typed AND/OR and type words (*vestiging*, *onderneming*). Filter on type, status and activity (matches any KBO activity, not only the main one). Results show the register data, the NACEBEL activities from KBO Public Search (first 3, "+N meer"), the tool's status, certainty and the three indicator lights. Columns sort locally. **Export** the displayed selection as table, chosen columns, e-mail list or phone list — scoped to exactly the rows on screen, in the same order (2,000-row cap, disclosed in the UI).

### 3. Straatoverzicht — one street, one screen
Pick a street (Paalstraat has the most records) and see every record grouped by address with exactly the columns officers asked for:

**Adres · Onderneming / vestiging · Register · Bewijs van activiteit · Laatste waarneming · Zekerheid · Voorstel · Bevestigen / Afwijzen**

Establishments are marked *(vestiging)*, with *zetel elders* when the registered seat is in another municipality, and *moederonderneming niet in dataset* when the parent is unknown. A business the officer sees on the street but that is not in the register can be added with **"Vestiging ontbreekt op dit adres"** and goes through the same approval flow. One button fetches the Google Maps listings for the whole street (Apify, see below).

### 4. Detail — the record, the reasons, the evidence
- **Signalen:** three traffic lights — **KBO** (register flags), **Google Maps** (listing open / closed / recent review, or the officer's own observation), **E-facturatie** (Peppol registration, with whether the company is obliged to be registered). Each light says what was checked, when, and links to the source.
- **Beoordeling:** status (*Actief · Ter controle · Waarschijnlijk niet actief · Geen onderneming*), Zekerheid (*Hoog · Middel · Laag*), the proposal, and **"Waarom?"** — the ordered list of reasons. Each reason shows *Bron · veld · datum · Controleer bron ↗*.
- **Registergegevens:** rechtsvorm, rechtstoestand, dates, KBO address next to the Flemish address-register address (differences are flagged), NACEBEL 2025 activities (hoofd-/nevenactiviteit, code, since) from the KBO Public Search page, strike-off (doorhaling) details. **"Ophalen uit KBO Public Search"** refreshes one record live.
- **Onderneming ↔ vestiging:** an establishment shows its parent enterprise (or fetches it live from the Flemish VKBO API with *Haal op via VKBO*); an enterprise lists its establishments. Legal status, bankruptcy and dissolution live on the enterprise and are inherited by its establishments.
- **Contact:** phone / e-mail / website with *hoort bij* (vestiging or zetel), source and date — merged from KBO, KBO Public Search, NBB, Peppol Directory, the Google Maps listing and officer observations; otherwise **"contactgegevens onbekend"** — never an invented value.
- **Google Maps (Apify):** the scraped listing for this record — open / tijdelijk gesloten / permanent gesloten / niet gevonden, rating, newest reviews, opening hours, phone, website — with a match badge (same address, other name at this address, name elsewhere) and a live comparison against the Google Places card.
- **Bewijs van activiteit:** the officer logs an observation (bron, URL, wat gezien, waargenomen activiteit, conclusie, datum, optionally a phone/website seen). The latest observation feeds the assessment; a register that says "niet actief" against an observation that says "actief" yields *Ter controle — tegenstrijdig*, never a silent override.
- **Voorstellen:** proposals generated from the assessment (*Markeer als niet actief*, *Adres nazien*, *Uitsluiten: geen onderneming*) plus manual corrections, each with **Bevestigen / Afwijzen**.

### 5. Bron raadplegen — public evidence, no billing by default
A source picker next to the record that embeds the source itself (or opens it in a new window when the site refuses framing):

| Source | What it is | What the officer checks |
|---|---|---|
| Kaart & recensies | Google Maps embed; with an optional key: place card + "Contactgegevens ophalen" (Places API) | listing at this address, reviews, hours, phone, website |
| Street View | Google Street View, snapped to the record's own street via the Wegenregister and facing the address | signboard, facade, vacancy |
| KBO | KBO Public Search (embed) | activities, establishments, status |
| Jaarrekeningen | **NBB Balanscentrale public API** (native panel) | last filing date, omzet, brutomarge, winst/verlies, eigen vermogen, VTE, PDF |
| Inhoudingsplicht | checkinhoudingsplicht.be (embed, prefilled) | fiscal and social debts (RSZ · FOD Financiën · RSVZ) |
| Staatsblad | ejustice listing, fetched on demand (native panel) | publications newest first; deeds likely to name the gemachtigde / boekhouder are flagged, PDF linked |
| Website | web search (embed) | own website, contact data, recent posts |
| Sociale media | outbound searches on Facebook, Instagram, TikTok | recent posts, opening hours |

### 6. Goedgekeurde wijzigingen — the only exit
A list of confirmed (and rejected / open) proposals and **Exporteer CSV / JSON** — the export contains *bevestigd* rows only. That is "publication".

### 7. Kaart
All records on an OpenStreetMap map, coloured by status, filterable by municipality, street and status. Records whose source coordinates are unreliable (36 Schoten rows share one point near Paris) are rejected, not plotted.

## How the status is decided (no AI)

Deterministic rules, evaluated in order; the first strong register signal fixes the status, later rules add reasons. Every reason carries its provenance.

| # | Rule | Source |
|---|---|---|
| 1 | `Rechtstoestand` ≠ "Normale toestand" (faillissement, ontbinding, vereffening) → waarschijnlijk niet actief, Hoog | KBO via VKBO |
| 2 | Address struck off ex officio (`Datum_adresdoorhaling`) → waarschijnlijk niet actief, Hoog | KBO |
| 3 | Ex-officio strike-off running (`ambtsh_doorhaling`) → waarschijnlijk niet actief, Hoog | KBO |
| 4 | `Rechtsvorm` = Vereniging van Mede-eigenaars → geen onderneming | KBO |
| 5 | Establishment inherits rules 1–3 from its parent enterprise | KBO (parent) |
| 6 | Parent not in dataset → certainty capped at Laag | KBO |
| 7 | KBO street ≠ address-register street → address uncertainty | Vlaams Adressenregister |
| 8 | Coordinates outside the municipality → address uncertainty | VKBO geometry |
| 9 | No phone / e-mail in the register → weak signal | KBO |
| 10 | Latest officer observation: actief / niet actief / onduidelijk. Conflict with the register → Ter controle, *tegenstrijdig* | officer, dated, with URL |
| 12 | Last annual account filed > 24 months ago → negative; NBB legal situation ≠ normal → strong negative (independent second source) | NBB Balanscentrale |
| 11 | Nothing decisive → Ter controle, Laag (Middel if contact data exists) | — |

The three indicator lights (KBO · Google Maps · E-facturatie) are shown next to the status but are **not** part of the rule engine: they are signals for the officer, and only the officer's logged observation enters the assessment (rule 10).

Proposals are generated from the outcome and are idempotent; only an officer's *bevestigen* makes a change exportable.

## Architecture

```
data/raw/           Schoten KBO sample (VKBO GeoJSON + CSV + provenance), unchanged
backend/            Python 3.13 · FastAPI · SQLite (stdlib sqlite3, no ORM) · port 8010
  data.db             committed database: register + every collected lookup (see Data notes)
  app/scoring.py      rule engine → status, zekerheid, reasons with provenance
  app/indicators.py   the three lights (KBO · Google Maps · e-facturatie), pure functions over cached data
  app/summaries.py    RecordSummary builder, auto-proposals
  app/selection.py    one record query shared by search, dashboard, streets, map and export
  app/contact.py      contacts_for(): merge contact data from every source, with owner/source/date
  app/activity.py     sector of a record (KBO RSZ → BTW → KBO Public Search → observation → onbekend)
  app/links.py        external evidence URLs (embed + open-in-new-window variants)
  app/kbo_public.py   KBO Public Search page scraper (NACEBEL activities, phone/e-mail/website, status)
  app/nbb.py          NBB Balanscentrale public API client + 1-day cache
  app/peppol.py       Peppol SML (DNS) registration check + Peppol Directory
  app/staatsblad.py   Belgisch Staatsblad publication listing scraper
  app/streetview.py   Street View anchor snapped to the street (Wegenregister)
  app/google_maps.py  Google Maps listings via Apify: build query, match, store  ·  app/apify.py REST client
  app/vkbo.py         VKBO mapping + live API (fetch parent, import another municipality)
  app/routers/        records · activities · streets · evidence · proposals · nbb · indicators · dashboard · nacebel · staatsblad · google_maps
  scripts/            import_data · prefetch_kbo_public · fetch_peppol · fetch_google_maps · test_dashboard
frontend/           React 19 · TypeScript · Vite · Tailwind v4 · port 5173 (proxies /api)
  src/pages/          Dashboard · Zoeken · Detail · Straat · Goedgekeurd · Kaart
  src/components/     EvidencePanel (source picker) · IndicatorLights · NbbPanel · StaatsbladPanel · GoogleMapsCard · GooglePlacesPanel
                      ReasonsList · EvidenceForm · ProposalList · LinkageCard · ContactBlock · SearchExport · Dashboard* …
  src/i18n/           nl (source of truth) + en, `useT()` / `useLang()`
```

Data sources — all public; everything works without a key, two optional keys add extras:
- **VKBO** (Digitaal Vlaanderen) — the federal KBO enriched with the Flemish address register; OGC Features API, filterable by `KBO_Gemeente` → the same tool works for any municipality. Missing parent enterprises are fetched live.
- **KBO Public Search** (FOD Economie) — embedded per record, and scraped (politely, cached) for NACEBEL 2025 activities, contact data and status.
- **NBB Balanscentrale** — `consult.cbso.nbb.be` public consult API: company status, all filed annual accounts, key figures per filing.
- **Peppol SML / Directory** — one DNS lookup per enterprise number tells whether it is registered for e-invoicing (mandatory for most Belgian companies since 2026); the Directory adds name and registration date.
- **Belgisch Staatsblad** (ejustice) — publication listing per enterprise; PDFs are scanned images, the officer reads them.
- **Wegenregister** (Digitaal Vlaanderen, OGC Features) — road segments used to aim Street View at the right street.
- **Check Inhoudingsplicht** (RSZ · FOD Financiën · RSVZ) — prefilled, officer clicks (captcha-protected).
- **Google Maps / Street View** — keyless embeds for the officer. Optional `GOOGLE_MAPS_EMBED_KEY` (Maps Embed API + Places API (New), referrer-restricted) enables the place card and contact lookup. Optional `APIFY_TOKEN` enables scraping the listing per record through the Apify actor `compass/crawler-google-places` (open / tijdelijk / permanent gesloten, rating, 3 newest reviews, opening hours, phone, e-mail, website; ≈ $0.01 per record; no reviewer personal data is stored).
- **OpenStreetMap** tiles for the map.

## Run it

Prerequisites: [uv](https://docs.astral.sh/uv/) (Python 3.13) and [pnpm](https://pnpm.io/) (Node 20+). `backend/data.db` is committed with all collected data, so the app runs out of the box.

```bash
cd frontend && pnpm install && cd ..
make dev            # backend on :8010 + frontend on :5173 → open http://localhost:5173
make test           # backend unit tests + frontend typecheck, map and export checks
```

Or separately: `make backend` (`cd backend && uv run uvicorn app.main:app --reload --port 8010`) · `make frontend` (`cd frontend && pnpm dev`). API docs at http://localhost:8010/docs.

Optional keys: `cp backend/.env.example backend/.env` and set `APIFY_TOKEN` and/or `GOOGLE_MAPS_EMBED_KEY`.

Rebuilding or extending the data (all optional — the results are already in `data.db`):

| Command | What it does | Cost |
|---|---|---|
| `make import` | rebuild the register part from `data/raw/*.geojson` (lookups and officer data are kept) | free |
| `make kbo-public ARGS="--street Paalstraat"` | scrape KBO Public Search pages + Street View anchors into the cache (`--only kbo\|streetview`, `--force`) | free, 0.3 s/page |
| `make peppol ARGS="--street Paalstraat"` | Peppol registration check for every enterprise number (`--force`) | free, DNS only |
| `make google-maps ARGS="--street Paalstraat --dry-run"` | Google Maps listings via Apify (`--nr …`, `--all`, `--from-json` for offline testing, `--from-run` to re-map a finished run) | ≈ $0.0075 per query, needs `APIFY_TOKEN` |

Without `ARGS` the prefetch scripts cover the whole database; cached results are skipped unless `--force`.
Other municipality: fetch from the VKBO API with the `KBO_Gemeente` filter (see `backend/CLAUDE.md`, VKBO client).

## Data notes (read before trusting a number)

- Sample = first 1,000 records of Schoten (457 enterprises, 543 establishments), snapshot 7 Sep 2026; not the full register. `data.db` holds 1,309 records: the sample plus 309 parent enterprises fetched live from the VKBO API (some with their seat outside Schoten).
- Collected so far (in `data.db`): KBO Public Search pages for 1,081 records, Peppol checks for 964 enterprise numbers, Google Maps listings for 212 records (Paalstraat and other demo streets), NBB figures on demand.
- Register activity codes are sparse (RSZ code on 81 rows, VAT code on none); the NACEBEL activities shown come from the KBO Public Search cache. Register phone on 53 rows, e-mail on 73 — contact coverage grows through KBO Public Search, Peppol, NBB and Google Maps.
- 36 sample rows share one bogus coordinate (49.29, 2.31 — near Paris); they are rejected on the map, not corrected.
- Empty cells are a single space; `1900-01-01` / `9999-12-31` are placeholders — both are normalised on import.
- Licence: Modellicentie Gratis Hergebruik v1.0 · *"publieke KBO gegevens, verrijkt met adressen uit het Vlaamse Adressenregister."*

## What is real and what is not

Real: register data, the rule engine, indicator lights, evidence log, approval gate and export, KBO / Google / Inhoudingsplicht embeds, NBB figures from the live API, VKBO live fetch, KBO Public Search scrape, Peppol DNS check, Staatsblad listing, Apify Google Maps listings, dashboard from live counts. Not (yet): reading the Staatsblad PDFs (scanned images, no OCR), KBO Open Data bulk import, user accounts, multi-user database.

## Working on the repo

Ticket-driven: every change has a ticket in [project/tickets.md](project/tickets.md), lives on its own branch `type/TICKET-NNN-description`, and reaches `main` through a pull request (a `pre-push` hook refuses pushes to main). See [CLAUDE.md](CLAUDE.md) and the per-area guides `backend/CLAUDE.md`, `frontend/CLAUDE.md`, `data/CLAUDE.md`.
