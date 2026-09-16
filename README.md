# Vind de echte ondernemingen

**Challenge 1 — "Find the Real Businesses"** · ns2agi hackathon, Province of Antwerp · 16 September 2026

A tool for local economy officers (*lokale economie*) that puts the business register next to public evidence and lets the officer decide which businesses are actually active. Built on the Schoten sample of the KBO register. Officer-facing UI in Dutch. **No AI in the product** — every conclusion is a list of reasons the officer can read, each with its source, register field, date and a link to verify it.

> Full challenge brief: [docs/challenge.md](docs/challenge.md) · Pitch script: [docs/video-script.md](docs/video-script.md)

## The problem it solves

The federal register (KBO) lists companies that stopped trading long ago as active, buries real shops under apartment co-owner associations and dormant registrations, and misses businesses that are visibly open. Officers cross-check by hand in Excel, Google and street visits. This tool does the cross-checking on one screen and keeps the officer in control: **nothing leaves the tool until the officer confirms it**.

## What it does (features as of today)

### 1. Zoeken — find a record
Search by name, trade name, ondernemingsnummer (`0448.335.384`, `BE 0448 335 384` and `0448335384` all work) or street. Filter on type (onderneming / vestiging), status and activity. Every result shows what the register says, the tool's status and how sure it is.

### 2. Straatoverzicht — one street, one screen
Pick a street (Paalstraat has the most records) and see every record grouped by address with exactly the columns officers asked for:

**Adres · Onderneming / vestiging · Register · Bewijs van activiteit · Laatste waarneming · Zekerheid · Voorstel · Bevestigen / Afwijzen**

Establishments are marked *(vestiging)*, with *zetel elders* when the registered seat is in another municipality, and *moederonderneming niet in dataset* when the parent is unknown. A business the officer sees on the street but that is not in the register can be added with **"Vestiging ontbreekt op dit adres"** and goes through the same approval flow.

### 3. Detail — the record, the reasons, the evidence
- **Beoordeling:** status (*Actief · Ter controle · Waarschijnlijk niet actief · Geen onderneming*), Zekerheid (*Hoog · Middel · Laag*), the proposal, and **"Waarom?"** — the ordered list of reasons. Each reason shows *Bron · veld · datum · Controleer bron ↗*.
- **Registergegevens:** rechtsvorm, rechtstoestand, dates, KBO address next to the Flemish address-register address (differences are flagged), NACE activity when present, strike-off (doorhaling) details.
- **Onderneming ↔ vestiging:** an establishment shows its parent enterprise (or fetches it live from the Flemish VKBO API with *Haal op via VKBO*); an enterprise lists its establishments. Legal status, bankruptcy and dissolution live on the enterprise and are inherited by its establishments.
- **Contact:** phone / e-mail / website with *hoort bij* (vestiging or zetel), source and date; otherwise **"contactgegevens onbekend"** — never an invented value.
- **Bewijs van activiteit:** the officer logs an observation (bron, URL, wat gezien, waargenomen activiteit, conclusie, datum, optionally a phone/website seen). The latest observation feeds the assessment; a register that says "niet actief" against an observation that says "actief" yields *Ter controle — tegenstrijdig*, never a silent override.
- **Voorstellen:** proposals generated from the assessment (*Markeer als niet actief*, *Adres nazien*, *Uitsluiten: geen onderneming*) plus manual corrections, each with **Bevestigen / Afwijzen**.

### 4. The minibrowser — public evidence, no API keys, no billing
A tabbed panel next to the record that embeds the source itself (or opens it in a new window when the site refuses framing):

| Tab | Source | What the officer checks |
|---|---|---|
| Kaart & recensies | Google Maps (embed) | reviews, opening hours, photos, whether the business appears at this address |
| Street View | Google Street View (embed) | signboard, facade, vacancy |
| KBO | KBO Public Search (embed) | activities, establishments, status |
| Jaarrekeningen | **NBB Balanscentrale public API** (native panel) | last filing date, omzet, brutomarge, winst/verlies, eigen vermogen, VTE, PDF |
| Inhoudingsplicht | checkinhoudingsplicht.be (embed, prefilled) | fiscal and social debts (RSZ · FOD Financiën · RSVZ) |
| Website | web search (embed) | own website, contact data, recent posts |

### 5. Goedgekeurde wijzigingen — the only exit
A list of confirmed (and rejected / open) proposals and **Exporteer CSV / JSON** — the export contains *bevestigd* rows only. That is "publication".

### 6. Kaart
All records on an OpenStreetMap map, coloured by status, filterable by street and status; flags the few coordinates that fall outside the municipality.

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

Proposals are generated from the outcome and are idempotent; only an officer's *bevestigen* makes a change exportable.

## Architecture

```
data/raw/           Schoten KBO sample (VKBO GeoJSON + CSV + provenance), unchanged
backend/            Python 3.13 · FastAPI · SQLite (stdlib sqlite3, no ORM) · port 8010
  app/scoring.py      rule engine → status, zekerheid, reasons with provenance
  app/summaries.py    RecordSummary builder, auto-proposals
  app/links.py        external evidence URLs (embed + open-in-new-window variants)
  app/nbb.py          NBB Balanscentrale public API client + 1-day cache
  app/vkbo.py         VKBO mapping + live API (fetch parent, import another municipality)
  app/routers/        records · streets · evidence · proposals · nbb
frontend/           React 19 · TypeScript · Vite · Tailwind v4 · port 5173 (proxies /api)
  src/pages/          Zoeken · Detail · Straat · Goedgekeurd · Kaart
  src/components/     EvidencePanel (minibrowser) · NbbPanel · ReasonsList · EvidenceForm · ProposalList · LinkageCard …
```

Data sources — all public, no keys:
- **VKBO** (Digitaal Vlaanderen) — the federal KBO enriched with the Flemish address register; OGC Features API, filterable by `KBO_Gemeente` → the same tool works for any municipality.
- **KBO Public Search** (FOD Economie) — embedded per enterprise / establishment.
- **NBB Balanscentrale** — `consult.cbso.nbb.be` public consult API: company status, all filed annual accounts, key figures per filing.
- **Check Inhoudingsplicht** (RSZ · FOD Financiën · RSVZ) — prefilled, officer clicks (captcha-protected).
- **Google Maps / Street View** — embedded views for the officer, plus (optional) the listing per record scraped through the Apify actor `compass/crawler-google-places`: open / tijdelijk / permanent gesloten, rating, 3 newest reviews, opening hours, phone, e-mail, website. Needs `APIFY_TOKEN` in `backend/.env`, ≈ $0.01 per record; no reviewer personal data is stored.
- **OpenStreetMap** tiles for the map.

## Run it

```bash
make import      # optional: backend/data.db is committed with all collected data (KBO, Peppol, Google Maps via Apify); this rebuilds the register part from data/raw/*.geojson
make google-maps ARGS="--street Paalstraat"   # optional: Google Maps listings via Apify (cp backend/.env.example backend/.env, set APIFY_TOKEN); --dry-run shows queries + cost
make dev         # backend on :8010 + frontend on :5173
```
Or separately: `cd backend && uv run uvicorn app.main:app --reload --port 8010` · `cd frontend && pnpm dev`.
Other municipality: fetch from the VKBO API with the `KBO_Gemeente` filter (see `backend/CLAUDE.md`, VKBO client).

## Data notes (read before trusting a number)

- Sample = first 1,000 records of Schoten (457 enterprises, 543 establishments), snapshot 7 Sep 2026; not the full register.
- Only 28 of 543 establishments have their parent in the sample — the tool fetches missing parents live.
- Activity codes are sparse (RSZ code on 81 rows, VAT code on none); phone on 53 rows, e-mail on 73.
- Empty cells are a single space; `1900-01-01` / `9999-12-31` are placeholders — both are normalised on import.
- Licence: Modellicentie Gratis Hergebruik v1.0 · *"publieke KBO gegevens, verrijkt met adressen uit het Vlaamse Adressenregister."*

## What is real and what is not

Real: register data, the rule engine, evidence log, approval gate and export, KBO / Google / Inhoudingsplicht embeds, NBB figures from the live API, VKBO live fetch. Not (yet): KBO Open Data import for full activity and contact coverage (needs a free account), OpenStreetMap contact enrichment, user accounts, multi-user database.

## Working on the repo

Ticket-driven: every change has a ticket in [project/tickets.md](project/tickets.md), lives on its own branch `type/TICKET-NNN-description`, and reaches `main` through a pull request (a `pre-push` hook refuses pushes to main). See [CLAUDE.md](CLAUDE.md) and the per-area guides `backend/CLAUDE.md`, `frontend/CLAUDE.md`, `data/CLAUDE.md`.
