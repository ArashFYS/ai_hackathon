# Challenge 01: Find the Real Businesses

> Source: https://ap.ns2agi.com/challenges/challenge-1-right-service-first-time
> Captured 2026-09-16 (TICKET-002). This is the authoritative brief for the project.

**Summary:** Help local economy officers understand which businesses are active locally and what needs checking.
**Audience:** Local economy officers (Province of Antwerp)
**Format:** 3-minute pitch video; working demo optional
**Duration:** 6h 30m

---

## ⚠️ Deadline

**16:30 Europe/Brussels, 16 September 2026.** Late submissions are not accepted.

Submit a **publicly accessible YouTube link** via the Google Form:
https://docs.google.com/forms/d/e/1FAIpQLSeqs2xIbsuPM4ddiuov11qoehQfs3mn9ZECKnKCjKAHzXYYGA/viewform

---

## Problem

Business-register records do not always show which shops, services and other businesses are operating on the ground. Local economy officers spend time comparing records with websites, maps and street observations. They need a useful overview with evidence they can check.

### Officer context

Municipalities lack a reliable view of the businesses actually active on their territory. The federal business register — the KBO (Kruispuntbank van Ondernemingen) — lists companies that stopped trading long ago as active, misses shops that are visibly open, and buries the local economy under dormant registrations and side activities. One municipality of about 20,000 residents counted roughly 33,000 register entries. Officers fill the gaps with street visits, Google searches and paid data brokers.

> "One of our biggest problems is simply knowing which businesses are actually active in our municipality."
> — a local economy officer in the province

### Personas

- **Marleen** — Cross-checks records by hand, in Excel, between emails. Outreach can miss new shops or reach businesses that have closed.
- **Tom** — Pays a commercial data provider to fill the gap and pulls the results into his own database. He wants to compare public sources and see how the tool reached its conclusion.

Local economy officers are available as mentors and sit on the jury.

## Mission

Build a tool for officers that brings business information and public evidence together. Show what is known, what may have changed and what remains uncertain. Distinguish and connect local establishments, their enterprise record and registered seat, which may be elsewhere. Let the officer inspect the evidence, correct records and approve proposed changes before publication.

### Enterprise vs. establishment (critical domain distinction)

- **Enterprise (onderneming)** — the legal entity: a company, association or sole trader with a registry number. Legal status, bankruptcy and dissolution are recorded here. Identifies the organisation behind local activity and the appropriate contact.
- **Establishment unit (vestigingseenheid)** — a physical place where that enterprise operates (shop, office, workshop). Helps officers understand local activity.
- One enterprise can have several establishments in different municipalities; its registered seat and contact may be elsewhere.
- In the starter data, establishments link to their parent enterprise via `Ondernemingsnr_maatsch_zetel`.
- **Keep these records connected and make their relationship clear.**

## Success criteria (jury judges on exactly these three)

1. **Reliable business data** — Find missing or inaccurate records, flag potentially inactive entries, and enrich the data with evidence and confidence.
2. **Useful and trustworthy for officers** — Make records easy to find, inspect and correct, with officer approval before publication.
3. **Fresh and reusable** — Show how the data stays up to date and how the approach adapts to another municipality or province.

## Worked example (optional, from the brief — uses the officer's language)

| Adres | Onderneming / vestiging | Register | Bewijs van activiteit | Laatste waarneming | Zekerheid | Voorstel |
|---|---|---|---|---|---|---|
| Voorbeeldstraat 12 | Bakkerij Voorbeeld (vestiging) | Actief | Website actief; openingsuren op kaartdienst bevestigd | 2026-09-05 | Hoog | Geen actie |
| Voorbeeldstraat 14 | Adviesbureau Voorbeeld (vestiging, zetel elders) | Actief | Geen website, geen vermelding, geen recente vergunning | — | Laag | Ter controle: mogelijk niet meer actief |
| Voorbeeldstraat 20 | Kapsalon Voorbeeld (niet in register op dit adres) | — | Uithangbord en recensies vermelden dit adres | 2026-09-05 | Middel | Nazicht: vestiging ontbreekt of adres verkeerd |

The officer ticks **bevestigen** or **afwijzen** per row; only confirmed changes leave the tool.

**Optional contact view:** When the officer opens a business, show an available phone/email, whether it belongs to the local establishment or central office, a clickable source and when it was checked. If the contact is at a central office elsewhere, show how it connects to the local establishment and enterprise. If no contact is known, display **"contactgegevens onbekend"** rather than inventing details. No specific contact fields are mandatory; make missing or uncertain details visible.

## Constraints

- Municipality/region must be inside the **Province of Antwerp**
- Free choice of data sources and tools; starter materials are optional; RAG is one possible approach
- Video in **Dutch or English** only
- **Officer-facing answers and interface text in Dutch**
- Judges must be able to watch the video without signing in or requesting access
- Put team name and challenge number on the first frame
- Explain which parts work and which are mocked or unfinished

## Deliverables

1. One three-minute pitch video (Dutch or English) uploaded to YouTube
2. Publicly accessible link submitted via Google Form by 16:30 Brussels, 16 Sep 2026
3. Explain: officer workflow, how it was built, its limitations
4. Working demo — optional bonus (link, test account, or laptop at the table)

### Suggested video structure

| Time | Cover | Tips |
|---|---|---|
| 0:00–0:30 | The officer's problem | Who the officer is, what they need to do, the problem they face |
| 0:30–1:30 | The workflow and the evidence | Screen recording of the real flow: question in, result out |
| 1:30–2:20 | How it was built | Architecture, tools, data used; what is real and what is mocked |
| 2:20–3:00 | Value, limits, and reuse | How it helps the officer, current limits, adapting to another municipality/province |

### Before-you-submit checklist

- Open the YouTube link in a private browser window; it must play without sign-in
- Every team submits a video; there is no live-pitch round for every team
- Upload and check before 16:30
- Clear audio, readable screen text

---

## Data provided

Files are in `data/raw/` (checksums verified against source-metadata.json).

| File | Description |
|---|---|
| `schoten-kbo-1000-2026-09-07.csv` | 1,000 rows · 30 selected register fields plus longitude/latitude · **start here** |
| `schoten-kbo-1000-2026-09-07.geojson` | Same 1,000 records as the unchanged API response: all fields (incl. phone, e-mail, cessation dates where present) and point geometry (WGS 84) |
| `source-metadata.json` | Provenance: dataset, publisher, retrieval date, source URL, licence, attribution, row counts, next-page link |

**Origin:** Real records from Digitaal Vlaanderen's public VKBO service (*VKBO ondernemingen en vestigingseenheden V3*), which republishes the federal KBO register enriched with addresses from the Flemish address register. Filter: municipality = Schoten. Retrieved 7 September 2026.

**API (for freshness / other municipalities):**
`https://geo.api.vlaanderen.be/VKBO/ogc/features/v1/collections/Vkbo/items?f=application/json&limit=1000&filter=KBO_Gemeente='Schoten'&filter-lang=cql2-text` — OGC Features API, paged with `startIndex`. Swap the `KBO_Gemeente` filter for another municipality.

### Column guide (CSV)

| Columns | Meaning |
|---|---|
| `Ondernemingsnr` | Registry number of this record — enterprise or establishment unit. **Keep as text** (leading zeros) |
| `Ondernemingsnr_maatsch_zetel` | Registry number of the parent enterprise; filled for establishment units, blank for legal entities |
| `Type_onderneming` · `Rechtsvorm` · `Rechtstoestand` | Entity type, legal form, legal status; filled for legal entities only |
| `Maatschappelijke_naam` · `Commerciele_naam` · `Afgekorte_naam` | Official name, trade name, abbreviated name |
| `KBO_Straat` · `KBO_Huisnr` · `KBO_Busnr` · `KBO_Postcode` · `KBO_Gemeente` | Address as recorded in the register |
| `AR_straat` · `AR_huisnr` · `AR_busnr` · `AR_postcode` | Address matched to the Flemish address register; compare with KBO address, check missing/inconsistent values |
| `NACE_hoofdact_BTW` · `Omschrijving_hoofdact_BTW` · `NACE_hoofdact_RSZ` · `Omschrijving_hoofdact_RSZ` | Main activity codes/descriptions (VAT and social-security); mostly empty |
| `Personeelsklasse` | Employee size class; mostly empty |
| `Datum_inschrijving` · `Startdatum` | Registration date and start date |
| `longitude` · `latitude` | Point coordinates from the GeoJSON (WGS 84) |

Full CSV header: `UIDN, OIDN, Ondernemingsnr, Maatschappelijke_naam, Commerciele_naam, Afgekorte_naam, Ondernemingsnr_maatsch_zetel, Type_onderneming, Rechtsvorm, Rechtstoestand, KBO_Straat, KBO_Huisnr, KBO_Busnr, KBO_Postcode, KBO_Gemeente, AR_straat, AR_huisnr, AR_busnr, AR_postcode, NACE_hoofdact_BTW, NACE_versie_BTW, Omschrijving_hoofdact_BTW, Aantal_hoofdact_BTW, NACE_hoofdact_RSZ, NACE_Versie_RSZ, Omschrijving_hoofdact_RSZ, Aantal_Hoofdact_RSZ, Personeelsklasse, Datum_inschrijving, Startdatum, longitude, latitude`

**GeoJSON adds**, among others: `Zoeknaam`, `Telefoonnummer`, `Email`, `KBO_NISCODE`, `Datum_stopzetting`, `Datum_afsluiting`, and fields about ex officio deregistration (`ambtsh_doorhaling`) and address deregistration.

### Known data limitations

- **Partial sample:** first 1,000 records of a paged response — not the complete register of Schoten, and not a list of 1,000 verified active businesses.
- **Mixed table:** 457 legal entities + 543 establishment units in one table. Establishments carry their parent enterprise number in `Ondernemingsnr_maatsch_zetel`; legal status is recorded on legal entities only.
- **Import registry identifiers as text** — spreadsheets strip leading zeros.
- **Activity fields are sparse:** VAT activity code empty for every row; RSZ activity code exists for 81 rows.
- **Most parent enterprises are outside the sample:** only 28 of the 543 establishments have their parent among these 1,000 rows.
- **Some coordinates need validation:** a few points fall well outside Schoten.
- **Placeholder dates:** in the GeoJSON, `1900-01-01` and `9999-12-31` mean "not set" / "open-ended", not real dates.
- **No exact federal KBO snapshot date;** publisher notes a 1–3 day lag behind the federal register.

### External sources

Maps, business listings, permit records, websites — may need their own account, key or agreement. None are supplied with the pack.

### Licence and attribution

- Licence: [Modellicentie Gratis Hergebruik v1.0](https://data.vlaanderen.be/id/licentie/modellicentie-gratis-hergebruik/v1.0) (covers the KBO sample only)
- Attribution: *"publieke KBO gegevens, verrijkt met adressen uit het Vlaamse Adressenregister."*
- Catalogue: [VKBO ondernemingen en vestigingseenheden V3](https://www.vlaanderen.be/datavindplaats/catalogus/vkbo-ondernemingen-en-vestigingseenheden-v3)

## Suggested getting-started (optional, from the brief)

- **0–10 min — Load and look.** Import the CSV with registry numbers as text. Split rows into enterprises and establishments. Note which columns are actually filled.
- **10–20 min — Pick one street.** **Paalstraat** has the most records in the sample (35). List its records, group by address, mark what you can and cannot tell from the register alone.
- **20–35 min — Compare with one public source.** Take 5–10 records and check them against a map service, business listings, or the business's own website. Record: source, observation, observation date.
