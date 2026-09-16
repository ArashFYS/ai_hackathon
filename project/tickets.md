# Tickets -- ai_hackathon (Prefix: TICKET)

> Next ID: TICKET-043
>
> **Deadline: 16:30 Europe/Brussels, 16 Sep 2026.** Build freeze ~15:00 → record 15:00–15:45 → upload + check + form by 16:15.
> Anything not demoable by 15:00 is a slide in the video, not a feature.
>
> Priority: **MVP** = on the critical path for the 3-min screen recording. **Stretch** = only if MVP is recordable.

## In Progress

### TICKET-042: NACEBEL activities in the search table + social media source tab
- **Type:** feat(ui) | **Priority:** Stretch (demo polish)
- **Created:** 2026-09-16
- **Description:** (1) Zoeken results: show the KBO Public Search activities (Hoofd-/Nevenactiviteit, code, title, since) under the sector label in the activity column (first 3, "+N meer" toggle) and include them in the export. Data already ships in `RecordSummary.activity.activities`; the cache is filled with `scripts/prefetch_kbo_public.py --only kbo`. (2) "Bron raadplegen" gets a **Sociale media** placeholder entry: outbound search links to Facebook, Instagram and TikTok for the business name + municipality (`links.social_*`), no embed.
- **Branch:** `feat/TICKET-042-activities-social-tab`

### TICKET-038: Integrate reviewed UI, scoped live search/export and trustworthy maps
- **Type:** feat(integration) | **Created:** 2026-09-16
- **Base:** Merge latest main a2abe3a while preserving the reviewed detail layout, source selector, direct record map, aligned navigation and single-row live search.
- **Search/export:** Typed AND/OR, type intent, normalized email/phone lookup; sortable results; table/column/email/phone export limited to displayed record IDs and order. Include all locally cached upstream contact enrichment. Numeric scores and approval semantics are unchanged.
- **Map follow-up:** Reject unreliable coordinate points instead of plotting Schoten records near Paris; add typed city/street suggestions with municipality labels and honest loaded-data coverage.
- **History:** Local UI/search iterations used IDs 033/034 before discovering upstream independently used those IDs. This integration is tracked only as TICKET-038; upstream tickets 033–036 are retained.
- **Status:** Integrated latest main a2abe3a; ready for branch review. Another maintainer merges main.
- **Validation:** 20 backend tests pass, including upstream-enriched contact search/export, read-only selection scope, city filtering, bad-coordinate rejection and preserved snapped Street View. Frontend typecheck/build and map/export tests pass. Browser checks verified auto-detected establishment type (543 records), normalized phone search and a deduplicated clipboard list scoped to the two matching businesses, seven source choices, indicator colours, 67 city suggestions, street-with-city labels and honest empty-city coverage.
- **Coordinate evidence:** 36 original Schoten GeoJSON records share 49.2933354, 2.30668925; these source points are rejected, not rewritten. The official Schoten municipality envelope retains 964 plausible map points, including valid northern records rejected by the previous hard-coded envelope.

### TICKET-037: Staatsblad-publicaties ophalen — knop in het Staatsblad-tabblad, gemachtigde/boekhouder vinden
- **Type:** feat(staatsblad) | **Priority:** Stretch (contact route via the accountant)
- **Created:** 2026-09-16
- **Description:** Contacts are the hardest field. Every Staatsblad publication (Luik B) ends with who filed it — usually the accountancy firm holding a volmacht — and that firm is easy to reach online to ask for the company's phone number. The ejustice listing (`rech_res.pl?btw=`) is scrapeable (no captcha): date, rubric, article link and the "BEELD" PDF per publication. The PDFs are scanned images (JBIG2, even in 2022) with no text layer and there is no OCR on this machine, so automatic extraction of the gemachtigde is out of scope. v1: `app/staatsblad.py` fetches + parses the listing → `indicator_cache` kind `staatsblad` (key = enterprise nr); `POST /api/records/{nr}/staatsblad`; the Staatsblad tab gets a "Publicaties ophalen" button that lists the publications newest first, flags the ones likely to name the gemachtigde (ONTSLAGEN-BENOEMINGEN, STATUTEN, DIVERSEN, OPRICHTING, VOLMACHT), links the PDF, and explains the workflow to the officer. Jaarrekening rows (NBB pointers, no PDF) are dropped. Follow-ups: OCR (tesseract) or vision on the PDF to read the filer's name; `last_publication` as an activity signal in scoring; NBB deposit "externe accountant" block as a text alternative.
- **Branch:** `feat/TICKET-037-staatsblad-publicaties`

### TICKET-041: Google Maps contact details in the Kaart tab (Maps Embed API place mode + Places API (New) Text Search)
- **Type:** feat(links) | **Priority:** Stretch (contact: phone / website / hours visible in-tab)
- **Created:** 2026-09-16
- **Description:** The keyless `output=embed` only renders the mini-card (name, address, reviews). The Maps Embed API `place` mode ($0, but the key needs a billed Cloud project) renders the full place panel with phone, website and opening hours inside the iframe. `links.py` uses `https://www.google.com/maps/embed/v1/place?key=…&q=<name address>&language=nl` when `GOOGLE_MAPS_EMBED_KEY` is set (read from `backend/.env`, gitignored; tiny loader in `app/env.py`), otherwise falls back to the keyless embed. Restrict the key to HTTP referrers + Maps Embed API + Places API (New). The place card still hides phone/website, so a button "Contactgegevens ophalen uit Google Maps" (`GooglePlacesPanel.tsx`) calls Places API (New) Text Search from the browser (referrer-restricted key, exposed via `links.google_places_key`) and shows phone, website, hours, status, rating with source + date; the officer logs it as an observation. The button lives under the cached Apify listing on the detail page ("Controleer met actuele Google-gegevens") and flags per field whether the live value matches, differs from or is new vs. Apify. (The Maps light itself comes from main's Apify scrape, TICKET-039/040.)
- **Branch:** `feat/TICKET-041-google-places` (into PR #12)

### TICKET-035: KBO Public Search enrichment (NACEBEL 2025 activities + contact) and NACEBEL 2025 code list
- **Type:** feat(data) | **Priority:** MVP (fills activity for ~all rows; official contact source)
- **Created:** 2026-09-16
- **Description:** Only 86/1006 rows carry a NACE code and 54 a phone in the VKBO sample. The KBO Public Search pages (`toonvestigingps.html?vestigingsnummer=` / `toonondernemingps.html?ondernemingsnummer=`) list every NACEBEL 2025 activity (Hoofd-/Nevenactiviteit, since date), phone / e-mail / website and the entity status, with the register snapshot date in the footer. `app/kbo_public.py` fetches + parses one page, cached in `indicator_cache` (kind `kbo_public`, key = own nr). `app/nacebel.py` loads the official NACEBEL 2025 list (`app/data/nacebel_2025.csv`, from NACEBEL_2025.xlsx) for canonical Dutch titles at any level. `activity_of()` falls through to the KBO-public main activity (source `KBO (publiek)`), `contacts_for()` adds KBO-public phone/e-mail/website (source `KBO (publieke opzoeking)`). `scripts/prefetch_kbo_public.py` pre-fills the cache for the whole DB; `POST /api/records/{nr}/kbo-public` refreshes one record. `GET /api/nacebel?q=` searches the list.
- **Branch:** `feat/TICKET-035-kbo-public-enrichment`

### TICKET-036: Street View opens on the wrong street / faces north
- **Type:** fix(evidence)
- **Created:** 2026-09-16
- **Description:** Record coordinates are the Adressenregister position "afgeleid van object" (parcel/building), so Google picks the nearest pano — for deep or corner parcels that is another street (Gelmelenstraat 204 opened on "1 Merelstraat") — and `cbp=11,0,...` always looks north. Fix: Wegenregister (geo.api.vlaanderen.be, OGC Features `Wegsegment`) segments in a small bbox whose left/right street name matches the record's street → nearest point on the street as `cbll`, heading = bearing street point → address point. Cached (`indicator_cache` kind `streetview`) by the prefetch script; falls back to the old URL when nothing is cached.
- **Branch:** `feat/TICKET-035-kbo-public-enrichment` (same PR)


### TICKET-013: Pitch video and submission
- **Type:** docs | **Priority:** MVP — hard deadline
- **Created:** 2026-09-16
- **Description:** 3-minute video (NL or EN), first frame = team name + "Challenge 1". Structure: 0:00–0:30 officer problem · 0:30–1:30 screen recording of the real flow (search → detail → evidence → log observation → approve → street overview → export) · 1:30–2:20 architecture, data, what is real vs mocked · 2:20–3:00 value, limits, reuse (other municipality). Upload to YouTube as public/unlisted, **open in a private window to verify no sign-in**, submit via Google Form (link in docs/challenge.md).
- **Times:** record by 15:45, uploaded and verified by 16:15, form submitted by 16:20.

## Backlog

### TICKET-032: Gemeentedashboard als startpagina — status, sectoren en datadekking
- **Type:** feat(dashboard) | **Priority:** Gepland; geen uitbreiding van de pitch-kritieke scope
- **Created / Rescoped:** 2026-09-16 | **Status:** In Progress — geïmplementeerd op `feat/TICKET-032-dashboard`; gereed voor PR-review.
- **Doel en gebruikerskeuze:** Eén overzicht als nieuwe startpagina per gemeente, eerst Schoten: actuele ingeladen data netjes presenteren, statusverdeling tonen en naar dossiers doorklikken. Herscope op de daadwerkelijk gepullde `main` (`062d0ca`); de dashboardopzet blijft behouden. Toekomstige metrics later op dezelfde pagina aansluiten.

**Wat nu al bestaat en wordt hergebruikt**

- TICKET-024 is geïmplementeerd: `activity_of()`, `RecordSummary.activity`, `/api/activities` en sectorfilter op Zoeken/Straat. Een sectorverdeling op het dashboard hoeft niet op TICKET-026 te wachten; betere dekking wel.
- TICKET-025 is geïmplementeerd: contactvelden bij waarnemingen, `contacts_for()`, `RecordSummary.contact_status` en ContactBlock met eigenaar/bron/datum. Basiscontactdekking is nu beschikbaar, zonder nieuwe verrijking.
- TICKET-020 is geïmplementeerd: meldingen van ontbrekende vestigingen met `record_nr=NULL`, voorstellen en export. Die meldingen zijn geen geregistreerde records en hebben nog geen apart opgeslagen gemeentecode/type.
- TICKET-014 en TICKET-029 zijn geïmplementeerd: Kaart bestaat; de huidige UI heeft Nederlands als standaard en een Engelse taalwissel via `useT()`/`useLang()`. Hergebruik die navigatie, labels en vertalingen. De provinciale visuele stijl is inmiddels geïntegreerd via TICKET-030; hergebruik die bestaande stijl, zonder nieuw herontwerp.

**Eerste oplevering: huidige data op één pagina**

| Blok | Inhoud en definitie | Gedrag / beperking |
|---|---|---|
| Kop en filters | Gemeenteoverzicht — Schoten; type Alle records / Ondernemingen / Vestigingen en bestaande sectorcodes, inclusief onbekend | Eén selectie voor alle recordmetrics; geen nieuwe gemeente-import of provinciebreed totaal |
| Selectie en prioriteiten | Selectietotaal en typesamenstelling één keer; drie kaarten: Ter controle, Actief beoordeeld en Met waarneming | Geen nulkaart voor uitgesloten recordtypes. Waarnemingen en beoordelingen hebben een eigen betekenis; geen bewezen telling van werkelijke activiteit. |
| Statuswiel | Omschakelbare donut Activiteiten / Status met Actief / Ter controle / Waarschijnlijk niet actief / Geen onderneming; totaal in het midden, aantal en percentage in vaste legenda | Bestaande kleuren en codes; alle vier categorieën zichtbaar, ook bij nul; legenda en kerncijfers klikken naar de exacte recordselectie |
| Sectoren | Activiteitendonut met aanklikbare legenda volgens `activity_of()` (KBO RSZ → BTW → KBO Public Search-cache → laatste ingevulde waargenomen activiteit met herkend trefwoord → onbekend), met expliciet aandeel onbekend | Alle sectoren behoren tot hetzelfde gefilterde totaal; geen tweede classificatie. Bij gekozen sector toont het blok alleen die selectie; filter wissen herstelt het overzicht |
| Datadekking | Compacte aantallen/aandelen voor zekerheid Hoog/Middel/Laag, ontbrekende moeder bij vestigingen en contactstatus register/zetel/waargenomen/onbekend | Zekerheid is geen numerieke score. Contactstatus volgt bestaande bronprioriteit; NBB-contacten tellen niet mee. Toon dit als contactdekking uit register/waarnemingen, niet als alle beschikbare contactmogelijkheden |
| Opgeslagen voorstellen | Aantal voorstelrijen open/bevestigd/afgewezen die via `record_nr` aan de geselecteerde records gekoppeld zijn | Meerdere voorstellen per record mogelijk; tel afzonderlijke werkitems. Noem het geen volledige controlevoorraad en toon expliciet dat meldingen zonder registerkoppeling buiten deze gefilterde telling vallen |
| Bron en dekking | Bron, ophaaldatum of datumbereik en vermelding Deelbestand — niet alle records van de gemeente | Starterbestand opgehaald 07-09-2026; exacte federale KBO-peildatum onbekend. Geen importtijd of berekentijd presenteren als laatste controle |

**Telregels en betekenis**

- Populatie = unieke `records.nr` met eigen KBO-adres in de gekozen gemeente, daarna type- en sectorfilter. Gebruik `kbo_niscode` met expliciete fallback op genormaliseerde gemeentenaam. Moeders buiten de gemeente blijven beoordelingscontext, maar tellen niet mee. Geen dubbele records door joins met ouders, bewijs of voorstellen.
- De som van ondernemingen en vestigingen heet **Ingeladen records**, niet unieke bedrijven. Het wiel gebruikt `assessment.status`; Register, Zekerheid en voorstelgoedkeuring blijven afzonderlijk. Bevestiging herschrijft het register of de beoordeling niet. Toon: "Geen aangetoonde activiteit betekent niet dat een onderneming gesloten is."
- Recordpercentages delen door het zichtbare gefilterde totaal, inclusief Geen onderneming. Ontbrekende moeders delen uitsluitend door de geselecteerde vestigingen en worden opgezocht in de volledige database. Voorstellen zijn aantallen, geen percentage afgehandelde bedrijven. Sectortotalen en contactstatussen tellen elk op tot het recordtotaal.
- Nulrecords → aantallen 0, percentages "—" en lege toestand. Niet-beschikbare metrics → `null`/Nog niet beschikbaar; een fout is geen nul. Rond percentages op één decimaal af, aantallen zijn leidend. Geen automatische externe bronophaling of voorstelcreatie door dashboardlezen.

**Benodigd werk en nog bestaande gaps — bij implementatie oplossen**

- Plan één read-only aggregatie-endpoint, bijvoorbeeld `GET /api/dashboard?municipality=<code>&type=<type>&activity=<sector>`, met gedeelde scope, totalen, blokken en bron/dekkingsmetadata. Tel over alle geselecteerde records in één consistente databaseleesstand, onafhankelijk van de 100 zoekresultaten en API-limieten. `/api/activities` telt nu over de hele database; hergebruik de classificatie, maar voeg scope toe voordat die tellingen/filteropties het dashboard voeden. Leg de scope van sectoropties vast: gemeente/type, zodat een sectorfilter niet zijn eigen alternatieven verwijdert.
- Voor doorkliks ontbreekt nog gemeente-/bewijs-/zekerheid-/ouder-/contactfiltering en een betrouwbaar resultaat-totaal op Zoeken; bestaande `type`, `status` en `activity` hergebruiken. Voorstellen hebben alleen statusfiltering en de pagina bewaart die nog niet in de URL: voeg selectie en URL-herstel toe. Meldingen zonder `record_nr` nooit stilzwijgend via een inner join laten verdwijnen uit een als totaal gelabelde teller; bied een apart gelabelde, ongefilterde link naar de bestaande voorstellenpagina waar die meldingen zichtbaar blijven, zonder gemeentelijk aantal te suggereren.
- `summarize_many()` geeft nog geen NBB-cache aan de beoordeling door, Detail wel. Gebruik dezelfde cachecontext voor dashboard, lijst, straat, kaart en detail; hergebruik `assess()`, geen nieuwe scoreformule of netwerkcalls. Contactstatus volgt juist de bestaande lijstdefinitie zonder NBB; dat is een expliciete afzonderlijke metric, geen reden om NBB-statussignalen te negeren.
- `/` wordt dashboard, Zoeken verhuist naar `/zoeken`; behoud oude zoeklinks met `q`, `type`, `status` én `activity` via compatibiliteitsrouting. Gebruik aparte dashboard-URL-parameters zodat filters niet onbedoeld naar Zoeken leiden. Werk teruglinks bij en behoud `/kaart`, `/straat` en `/goedgekeurd`. Alle nieuwe UI-teksten en toegankelijke labels in beide bestaande woordenboeken; Nederlands blijft standaard.
- Legenda/doorkliks werken met toetsenbord, aantallen zijn leesbaar zonder kleur/hover, blokken stapelen op mobiel. Herlaad na wijzigingen bij terugkeer. Opgeslagen voorstellen ontstaan deels bij dossier-/straatbezoek en kunnen verouderen: behoud de feitelijke teller en de beperking; herstel van voorstelgeldigheid is afzonderlijk werk, niet onderdeel van dashboardberekeningen.

**Latere uitbreiding; geen blokkade voor versie 1**

- TICKET-026/027 verhogen sector-/contactdekking via KBO Open Data en OpenStreetMap; hun import/verrijking niet opnieuw bouwen. TICKET-012/018: gemeentepaging/importbeheer en bronhistoriek (paging ontbreekt nog in de huidige importer). TICKET-016: financiële aggregaties pas na aparte definities voor unieke ondernemingen, vergelijkbare boekjaren en lokale toerekening; moederomzet/VTE nooit per vestiging optellen.
- Een afzonderlijk toekomstig metrics-ticket is ook op gepullde main niet aanwezig. Later koppelen zoals door gebruiker toegestaan: numerieke score/drempels, trends, recente-controledefinitie, productiviteit en gemeentelijke telling van ongekoppelde meldingen. Die laatste vereist betrouwbare gestructureerde gemeentegegevens/backfill; waarnemingsouderdom vereist datumvalidatie. De huidige TICKET-029 is de taalwissel, geen backendscore-ticket. Nieuwe blokken voegen getypeerde velden toe met definitie, bron, datum, noemer en beschikbaarheid; geen generieke widgetbouwer nodig.

**Acceptatie voor uitvoering**

- [ ] Startpagina en doorkliks werken met dezelfde gemeente/type/sector; oude zoeklinks en NL/EN blijven bruikbaar. Wiel, sectoren en contactstatussen tellen elk op tot het gefilterde recordtotaal; het totaal bij doorklik klopt ook boven 100 en 2.000 records.
- [ ] Test dubbel bewijs/voorstellen, beide recordtypes, een moeder buiten de gemeente, onbekende sector/contacten, sector uit een waarneming en alle nul-/fouttoestanden. Ongekoppelde meldingen blijven apart van registerrecords en hun uitsluiting is zichtbaar bij de voorstelmetric.
- [ ] Nieuwe waarneming werkt status/bewijs/sector/contactdekking consequent bij; tegenstrijdig bewijs volgt bestaande regels. Goedkeuring wijzigt uitsluitend voorstelmetrics. Controleer gelijke beoordelingen bij aanwezige NBB-cache en de bewust NBB-vrije contactstatus.
- [ ] Aggregatie doet geen writes of externe calls; bron/deelbestand/noemers zijn zichtbaar. Relevante tel-/filtertests, frontendtypecheck en controle van toetsenbord/mobiele weergave slagen. Geen hardgecodeerde live aantallen.

- **Implementatie-aanvulling:** Compacte kop met handelingsadvies bij ontbrekende waarnemingen. Prioriteitskaarten en statuswiel bovenaan; bestaande Leaflet-kaart naast aanklikbare balken voor ontbrekende waarneming/sector/contact. Datadekking en voorstellen volgen onderaan. Groepen met ontbrekende informatie overlappen; een niet-toepasselijke sector- of moederfilter wordt niet getoond.
- **Integriteitscontrole:** Alle 1.000 geïmporteerde registernummers komen overeen met het bronbestand; totalen en status/contact/zekerheid/sectordoorkliks gecontroleerd voor alle records, ondernemingen en vestigingen. Dit is een deelbestand met 0 waarnemingen en 919 onbekende sectoren. Geen uitspraak dat er 0 werkelijk actieve ondernemingen zijn. Zie `docs/dashboard-data-review.md`.
- **Leesbaarheid:** Geen interne scrollbar in de legenda; vier statusrijen altijd zichtbaar, overige activiteiten uitklapbaar. Grotere kerncijfers en consistente, gescheiden aantallen/percentages in wiel, status, datadekking en voorstellen.
- **Visuele feedback:** Status is standaard in het wiel; onbekende activiteit krijgt een zichtbare kleur, eerste legendapositie en expliciet aantal/aandeel. Kleine sectoren behouden hun segment.
- **Integratie met main:** KBO Public Search-verrijking en NACEBEL-routes behouden; gemeentelijk gescopeerde aggregaties gebruiken dezelfde verrijkte samenvattingen als detail en zoeken. Regressietest controleert sector/contact/zekerheid uit de cache zonder netwerkcalls.
- **Oplevering:** Dashboard, gedeelde kaart, doorklikfilters en paginering geïmplementeerd. Vier backendtests geslaagd (inclusief 2.105 records, dubbele waarnemingen/voorstellen, ontbrekende moeder, NBB-cachepariteit en alleen-lezen). Productiebuild en bestaande kaarttest geslaagd. Browsercontrole: gemeente/type/sector, echte totalen en kaart zichtbaar.



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

### TICKET-040: Commit the SQLite database with all collected data
- **Type:** chore(data)
- **Created:** 2026-09-16 | **Completed:** 2026-09-16
- **Description:** `backend/data.db` is now versioned (removed from .gitignore; the `-wal`/`-shm` side files stay ignored) so a checkout carries everything the demo needs without re-running imports or paying Apify again: 1,309 KBO records (starter sample + parents fetched from VKBO), 964 Peppol SML results, 212 Google Maps listings scraped via Apify (all of Paalstraat + one batch of other streets, ≈ $0.85), 3 Apify run records, 10 auto-proposals. `make import` remains the way to rebuild from scratch. The file is ≈ 5 MB and changes on every run: commit it deliberately, not with every code change.
- **Branch:** `data/TICKET-040-committed-database` | **Commits:** `598c5fa`

### TICKET-039: Bulk Peppol (e-facturatie) check for every record — commits tagged TICKET-036 (id later reused on main)
- **Type:** feat(score)
- **Created:** 2026-09-16 | **Completed:** 2026-09-16
- **Description:** `scripts/fetch_peppol.py` (Makefile `peppol`) runs the Peppol SML DNS check for every enterprise number in the database (or one street), storing results in `indicator_cache` so the e-fact. light is filled on every list and detail page without waiting for a street refresh. Free, no key; cached results younger than 7 days are skipped unless `--force`. Directory enrichment stays lazy on the detail page.
- **Branch:** `feat/TICKET-035-apify-google-maps` | **Commits:** `77b8843`

### TICKET-038: Google Maps data via Apify (compass/crawler-google-places) — commits tagged TICKET-035 (id later reused on main)
- **Type:** feat(maps) | **Priority:** Stretch (demo value: real listing, reviews, open/closed status, contacts)
- **Created:** 2026-09-16 | **Completed:** 2026-09-16
- **Description:** Pull the Google Maps listing per KBO record through the Apify actor `compass/crawler-google-places`: one query per record ("<naam>, <straat> <nr>, <postcode> <gemeente>", 1 place, language nl, contacts add-on for e-mail/website, 3 newest reviews, no reviewer personal data). Stored in `google_maps_places` (+ `apify_runs`), matched on address (`adres`) or name (`naam`), else `geen`. Drives the Google Maps light (permanent gesloten → rood, tijdelijk gesloten → geel, recensie ≤ 6 maanden → groen, vermeld zonder recente recensie → geel, niet gevonden → geel; a newer officer observation wins). Phone / e-mails / website appear in the contacts list with source "Google Maps (via Apify)". Detail page gets a Google Maps card (status, rating, reviews, openingsuren, link, "Ophalen via Apify"); Straatoverzicht gets "Google Maps ophalen (Apify)". Script `scripts/fetch_google_maps.py` (--street / --nr / --all, batches of 100, --dry-run, offline --from-json), Makefile `google-maps`, token `APIFY_TOKEN` in `backend/.env` (loader `app/env.py`). ≈ $0.0075 per searched record.
- **Out of scope:** feeding the light into `assess()`; periodic re-scrapes; photos.
- **Done when:** the offline fixture fills rows without a token and the light/contacts/card show them; with a token `POST /api/records/{nr}/google-maps/refresh` returns a real listing; list endpoints stay network-free.
- **Branch:** `feat/TICKET-035-apify-google-maps` | **Commits:** `fd84c40..043a77d`

### TICKET-033: Activiteitsindicatoren — KBO / Google Maps / e-facturatie (Peppol) traffic lights (merge of Wolfgang's TICKET-028 branch)
- **Type:** feat(score) | **Priority:** Stretch (demo value: three sources at a glance)
- **Created:** 2026-09-16 | **Completed:** 2026-09-16
- **Description:** Every record carries `indicators: { kbo, google_maps, einvoice }`, each `{ level: groen|geel|rood|onbekend, label, text, checked_at, url }`. KBO light is a pure rule on the register (rood on dissolution/faillissement/doorhaling, groen only when every register signal is clean incl. AR address match and a clean parent, geel otherwise). Google Maps light = latest officer-logged evidence with source `google_maps` (see TICKET-034; no Google API). E-facturatie light = Peppol SML DNS check on `0208:<ondernemingsnummer>` (groen registered, rood not registered, geel when the legal form is not obliged), enriched with the Peppol Directory on the detail page. Results cached in `indicator_cache`; list endpoints are cache-only. New endpoints `GET /api/records/{nr}/indicators` and `POST /api/streets/{street}/indicators/refresh`. UI: "Signalen" column (three dots) in Zoeken and Straatoverzicht, detailed block in Beoordeling, "Controleer straat" button. Merged onto the themed i18n main: `IndicatorLights` captions/tooltips go through `t('indicators.*')` (NL + EN), the Straat/Zoeken tables keep the Activiteit/Contact columns and the missing-establishment rows (colSpan 9), `summarize(..., cached=)` sits next to `activity` and `contact_status`.
- **Out of scope:** feeding these signals into `assess()` reasons/proposals; map view; whole-dataset refresh.
- **Done when:** Paalstraat rows show three dots; LILLYWORLD (0448335384) is rood/rood; a registered BV is groen for e-fact.; without any key Maps is onbekend and nothing 500s.
- **Branch:** `feat/TICKET-033-activity-indicators` (was `feat/TICKET-028-activity-indicators`, `45952d8`) | **Commits:** `dc4ad25` (merge)

### TICKET-034: Remove the Google Places API; Google Maps light from logged observations
- **Type:** refactor(score)
- **Created:** 2026-09-16 | **Completed:** 2026-09-16
- **Description:** The Places API needs a billed Google Cloud project, so it is removed (google_places.py, env loader, .env.example, quota counter). The Google Maps light now derives from officer-logged evidence with source `google_maps`: groen when the latest such observation concludes actief within the last 6 months, rood when it concludes niet actief, geel when onduidelijk or older than 6 months, onbekend when nothing is logged. Peppol light unchanged. Was Wolfgang's TICKET-029 on the same branch (`d578eed`); re-numbered because 028/029 were already taken on main.
- **Branch:** `feat/TICKET-033-activity-indicators` | **Commits:** `d578eed` (merged via TICKET-033)

### TICKET-030: Province of Antwerp visual theme merged onto main
- **Type:** feat(ui)
- **Created:** 2026-09-16 | **Completed:** 2026-09-16
- **Description:** Teammate restyle (branch feat/TICKET-029-provincial-ui, based on an older main) merged on top of the i18n + feature set: brand palette, logo, semantic layout classes, data-status badges. Kept: NL/EN toggle, Kaart, activity filter, contact block, missing establishment, provenance. Dropped from the restyle: hardcoded English strings, removal of leaflet.
- **Commits:** `cc54849` (merge, feat/TICKET-030-provincial-theme)

### TICKET-028: README — features and how the tool works
- **Type:** docs
- **Created:** 2026-09-16 | **Completed:** 2026-09-16
- **Description:** Rewrite README.md: problem, every feature (Zoeken, Straatoverzicht, Detail, minibrowser tabs, Goedgekeurd, Kaart), the rule table with sources, architecture, data sources, run instructions, data caveats, real vs. not, repo workflow.
- **Commits:** `bb50043` (via chore/integrate-r2)

### TICKET-029: Language toggle — Dutch default, English optional
- **Type:** feat(ui)
- **Created:** 2026-09-16 | **Completed:** 2026-09-16
- **Description:** NL | EN toggle in the header. Dutch is the default and the officer-facing language (challenge requirement); English is for the jury/video. Frontend-only i18n: `src/i18n/` with `nl.ts` and `en.ts` dictionaries, a `LanguageProvider` + `useT()` hook, persisted in localStorage (`lang`), `<html lang>` updated. All static UI text (nav, headings, table columns, buttons, form labels, placeholders, hints, status/zekerheid/source/contact/activity labels, empty/loading/error states, minibrowser tab labels and "wat te controleren" texts) goes through `t()`. Backend-generated free text (reason sentences, proposal texts, register values, NBB model names) stays as delivered — in EN mode it is shown unchanged with a small note "(brontekst in het Nederlands / source text in Dutch)" on the Beoordeling block. The challenge vocabulary (Adres, Register, Bewijs van activiteit, Laatste waarneming, Zekerheid, Voorstel, bevestigen/afwijzen, contactgegevens onbekend) is translated literally in EN (Address, Register, Evidence of activity, Last observation, Certainty, Proposal, confirm/reject, contact details unknown).
- **Commits:** `560087e`, `d6ed076` (merge), `1d9a5ce` (document.title)

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
