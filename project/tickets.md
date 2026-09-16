# Tickets -- ai_hackathon (Prefix: TICKET)

> Next ID: TICKET-035
> Next ID: TICKET-035 (028 and 029 are already reserved on remote branches)
> Next ID: TICKET-035
>
> **Deadline: 16:30 Europe/Brussels, 16 Sep 2026.** Build freeze ~15:00 → record 15:00–15:45 → upload + check + form by 16:15.
> Anything not demoable by 15:00 is a slide in the video, not a feature.
>
> Priority: **MVP** = on the critical path for the 3-min screen recording. **Stretch** = only if MVP is recordable.

## In Progress

### TICKET-013: Pitch video and submission
- **Type:** docs | **Priority:** MVP — hard deadline
- **Created:** 2026-09-16
- **Description:** 3-minute video (NL or EN), first frame = team name + "Challenge 1". Structure: 0:00–0:30 officer problem · 0:30–1:30 screen recording of the real flow (search → detail → evidence → log observation → approve → street overview → export) · 1:30–2:20 architecture, data, what is real vs mocked · 2:20–3:00 value, limits, reuse (other municipality). Upload to YouTube as public/unlisted, **open in a private window to verify no sign-in**, submit via Google Form (link in docs/challenge.md).
- **Times:** record by 15:45, uploaded and verified by 16:15, form submitted by 16:20.

## Backlog

### TICKET-032: Gemeentedashboard als startpagina — huidige data, statuswiel en uitbreidbare metrics
- **Type:** feat(dashboard) | **Priority:** Gepland; geen uitbreiding van de pitch-kritieke scope
- **Created:** 2026-09-16 | **Status:** Gescopeerd, implementatie niet gestart. Deze wijziging bevat uitsluitend ticketplanning.
- **Doel:** De ambtenaar ziet direct wat de app over de geselecteerde gemeente weet, hoeveel dossiers aandacht vragen en hoe volledig het bewijs is, en kan doorklikken naar de betrokken records. Eén gezamenlijk dashboard, later uit te breiden zonder aparte dashboards per databron.
- **Bevestigd door gebruiker:** Nieuwe startpagina per gemeente. Eerst scope en gaps uitwerken, nog niet bouwen. Een nog ontbrekend metrics-ticket komt later; dit blokkeert versie 1 niet.

#### Populatie en betekenis

- Standaard Schoten, typefilter **Alle records / Ondernemingen / Vestigingen**; hetzelfde filter geldt voor alle cijfers. In versie 1 alleen ondersteunde gemeenten tonen; een provinciebreed totaal en ondersteuning van nieuwe gemeenten vallen erbuiten.
- Teleenheid = uniek `records.nr` met het eigen KBO-adres in de gekozen gemeente, vervolgens het gekozen type. Gebruik `kbo_niscode` als gemeentecode waar beschikbaar; definieer een expliciete fallback op genormaliseerde gemeentenaam voor records zonder code. Een opgehaalde moederonderneming buiten de gemeente dient als beoordelingscontext en telt niet mee. Een opgehaalde lokale record telt eenmaal mee; nooit extra tellen door joins met bewijs, voorstellen of vestigingen.
- **Ingeladen records** is de juiste totaalnaam: ondernemingen en vestigingen kunnen dezelfde economische activiteit vertegenwoordigen. Toon de uitsplitsing; noem hun som niet het aantal unieke bedrijven. Het typefilter Vestigingen helpt lokale activiteit bekijken, maar de steekproef bevat niet noodzakelijk elke vestiging.
- **Register**, **beoordeling van activiteit**, **zekerheid** en **goedkeuring van voorstellen** zijn verschillende dimensies. Het wiel gebruikt uitsluitend `assessment.status`. Een bevestigde correctie maakt een bedrijf niet automatisch actief; de huidige goedkeuring herschrijft registergegevens niet.
- **Actief** betekent de actuele beoordeling volgens de bestaande regels, op basis van geregistreerde waarnemingen; geen nieuwe statuslogica of claim van recente, onafhankelijk geverifieerde activiteit. Toon: "Geen aangetoonde activiteit betekent niet dat een onderneming gesloten is."
- Elk percentage heeft de zichtbare gefilterde recordpopulatie als noemer, tenzij expliciet anders vermeld. `geen_onderneming` blijft meetellen in het recordtotaal en het wiel. Bij nul records: aantallen 0, percentages "—" en een lege toestand; een ontbrekende metric is `null`/"Nog niet beschikbaar", nooit 0.

#### Metrics voor versie 1

| Onderdeel / Nederlands label | Definitie en bron | Gebruik / beperking |
|---|---|---|
| Kerncijfer: Ingeladen records | Aantal unieke `records.nr` in de gekozen populatie; subtelling `record_type` | Omvang van de beschikbare data, geen volledige gemeentetelling |
| Kerncijfers: Actief / Ter controle | Aantal records met respectievelijk `assessment.status=actief` / `ter_controle` | Zelfde beoordeling en populatie als wiel en resultatenlijst |
| Kerncijfer: Met waarneming | Unieke records met ten minste één `evidence`-rij, aantal en aandeel | Bewijsdekking; ook onduidelijke waarnemingen tellen mee, geen bewijs van juistheid of recentheid |
| Statuswiel: Beoordeling van activiteit | Exact vier categorieën: Actief, Ter controle, Waarschijnlijk niet actief, Geen onderneming; aantal en percentage | Eén record in één segment; categorieën tellen op tot het totaal |
| Datakwaliteit: Zekerheid | Aantallen Hoog / Middel / Laag uit dezelfde beoordeling | Apart van status tonen; hoge zekerheid kan ook op inactiviteit slaan |
| Datakwaliteit: Moederonderneming niet in dataset | Vestigingen waarvan `parent_nr` niet in de volledige database gevonden wordt | Noemer expliciet alle vestigingen binnen de selectie; geen ontbrekende ouders afleiden uit alleen de gemeenteselectie |
| Werkvoorraad: Opgeslagen voorstellen | Aantal `proposals.id` per open / bevestigd / afgewezen, gekoppeld aan records in de selectie | Meerdere voorstellen per record mogelijk; geen percentage "bedrijven afgehandeld" en geen claim dat alle nodige controles zijn opgeslagen |

#### Pagina en interactie

- Bovenaan **Gemeenteoverzicht — Schoten**, gemeenteselectie waar zinvol, typefilter, bron en dekking. Daarna vier kerncijfers (records, actief, ter controle, met waarneming), het statuswiel met leesbare legenda, een compact blok datakwaliteit en opgeslagen voorstellen met doorkliks. Geen trendgrafieken of grote lege placeholderkaarten.
- Wiel als donut met recordtotaal in het midden; vaste statusvolgorde en bestaande kleuren groen/oranje/rood/grijs. Legenda toont altijd alle vier categorieën, ook bij nul. Aantallen zijn leidend; percentages afronden op één decimaal en een eventuele afrondingsafwijking verklaren.
- Klik op een status, kerncijfer of datakwaliteitsgroep opent de exacte gefilterde recordlijst; voorstellen openen de lijst met dezelfde gemeente/type/status. URL bewaart filters, terugnavigatie herstelt ze. Legenda/doorkliks werken met toetsenbord; tekst en aantallen blijven bruikbaar zonder kleur of hover. Op smalle schermen stapelen de blokken.
- Routevoorstel: `/` wordt dashboard, `/zoeken` blijft de werkplek voor zoeken. Werk interne teruglinks bij en behoud bestaande zoeklinks `/?q=…`, `/?type=…` en `/?status=…` via een expliciete compatibiliteitsroute/redirect; gebruik andere dashboardfilterparameters om die links te onderscheiden. Stem styling/navigatie af met de lopende UI-branch van TICKET-029.
- Alle zichtbare tekst in het Nederlands. Toon afzonderlijke laad-, fout-, lege en niet-beschikbare toestanden. Een fout mag geen nulcijfers tonen. Na een waarneming, voorstelbesluit of ouder-ophaling worden de betrokken gegevens bij terugkeer opnieuw geladen; geen automatische externe bronophaling bij het openen van het dashboard.

#### Gaps die vóór of tijdens implementatie moeten worden opgelost

- **Volledigheid en datums:** De starterset is de eerste 1.000 records, opgehaald op 07-09-2026; de exacte federale KBO-peildatum is onbekend. Toon "Deelbestand — niet alle records van de gemeente". Scheid bronophaaldatum, waarnemingsdatum en berekentijd; presenteer `fetched_at`/importtijd niet als laatste controle. Bij gemengde bronnen/dates toon die dekking, geen enkele datum alsof alles toen is gecontroleerd.
- **Tellen over alle data:** Geen telling uit de eerste 100 zoekresultaten of een andere paginalimiet. Plan een eigen read-only aggregatie-endpoint, bijvoorbeeld `GET /api/dashboard?municipality=<code>&type=<type>`, dat de volledige lokale selectie verwerkt. De huidige zoek- en voorstellen-API mist gemeente-/dekkingfilters; plan gemeente, aanwezigheid van waarneming, zekerheid en ontbrekende ouder als benodigde doorklikfilters, plus een betrouwbaar resultaat-totaal.
- **Consistente beoordeling:** `summarize_many()` geeft nu geen NBB-cache door; Detail doet dit wel. Dashboard, Zoeken, Straat en Detail moeten dezelfde beoordelingscontext gebruiken, inclusief aanwezige cache, zonder netwerkcalls en zonder een tweede scoreformule. Regelwijzigingen zelf blijven bij TICKET-021; cacheleeftijd en gewijzigde regels mogen niet stilzwijgend als nieuwe waarneming gelden.
- **Eerlijke werkvoorraad:** `ensure_auto_proposals()` wordt aangeroepen bij dossier-/straatbezoek. Het aantal opgeslagen open voorstellen hangt dus af van bezochte dossiers en is geen volledige controlevoorraad. Gebruik "Ter controle" als primaire actieteller; dashboardlezen mag geen voorstellen aanmaken. Verouderde automatische voorstellen en herbeoordeling bij goedkeuring vragen apart herstelwerk, niet verhullen als actuele adviezen.
- **Bewijs en historiek:** Er is geen gevalideerde definitie van "recent gecontroleerd", geen snapshots voor groei/trends en geen stabiele auditgeschiedenis voor doorlooptijd/productiviteit. `observed_at` wordt nu alleen op tekstvorm gevalideerd; invalid/future dates moeten apart aangepakt worden voordat ouderdomsmetrics worden ingevoerd. Versie 1 meet uitsluitend aanwezigheid van waarnemingen en de actuele beoordeling.
- **Uitbreidbaar zonder framework:** Eén getypeerd antwoord met scope, totaal, status-/zekerheidsaantallen, bewijsdekking, voorstellen en bron/dekkingsmetadata; nieuwe secties later additief. Iedere latere metric beschrijft definitie, teleenheid, noemer, bron, datum, beschikbaarheid en doorklikfilter. Geen generieke widgetbouwer, nieuwe analyticsdatabase of periodieke jobs voor versie 1.

#### Latere aansluitingen en scopegrens

| Bestaand / toekomstig ticket | Aansluiting op hetzelfde dashboard; niet in versie 1 bouwen |
|---|---|
| TICKET-024 sectoren + TICKET-026 KBO Open Data | Sectorverdeling en sectorfilter met expliciete categorie onbekend en brondekking; starterdata heeft slechts 81/1.000 records met een NACE-code |
| TICKET-025 contact + TICKET-026/027 verrijking | Contactdekking per bron, vestiging versus zetel en waargenomen contact; geen telefoon/e-mail of ontbrekende activiteit verzinnen |
| TICKET-016 NBB + TICKET-021 beoordeling | Mogelijke NBB-dekking; financiële totalen pas na aparte scope over unieke ondernemingen, boekjaren, ontbrekende waarden en lokale toerekening. Omzet/VTE van één moeder nooit optellen voor elke vestiging |
| TICKET-029 UI / toekomstige numerieke score | De UI-branch noemt een nog niet beschikbare confidence-score en toekomstige drempels. Versie 1 gebruikt Hoog/Middel/Laag; geen verzonnen numerieke score of gemiddelde. Later de backenddefinitie en verhouding tot handmatige beoordeling afstemmen |
| TICKET-020 ontbrekende vestigingen | Afzonderlijke meldingen en werkvoorraad met eigen adres/gemeente; niet meetellen als geregistreerd bedrijf zolang geen registerrecord is gekoppeld |
| TICKET-012/018 import en toekomstige metrics | Datasetdekking, verversing, historiek en nieuwe gemeenteselecties later aansluiten. Gemeentepaging is op de onderzochte main nog niet aanwezig ondanks de Done-beschrijving van TICKET-012 |

- **Nog open:** Geen afzonderlijk metrics-ticket gevonden na remote-fetch en controle van `main` en de integratiebranch. Op instructie van de gebruiker behandelen we dit als toekomstig werk; later het exacte ticket koppelen en de metricdefinities afstemmen. Geen nieuwe targets, trends, sector-/contactverrijking, financiële aggregaties, kaarten of publicatieacties in deze eerste scope.

#### Acceptatie voor de latere implementatie

- [ ] Dashboard is de Nederlandse startpagina per ondersteunde gemeente; Zoeken, bestaande links en terugnavigatie blijven werken. Alle blokken gebruiken dezelfde selectie en teldefinities.
- [ ] Onafhankelijke telling over alle geselecteerde records = som van wielsegmenten = resultaat-totaal bij doorklik. Ook testen met meer dan 100 én 2.000 records, dubbele joins, beide recordtypes en een moeder buiten de gemeente.
- [ ] Referentie zonder waarnemingen/NBB op starterdata: 1.000 records (457 ondernemingen, 543 vestigingen), Actief 0, Ter controle 789, Waarschijnlijk niet actief 106, Geen onderneming 105; Met waarneming 0. Dit is een reproduceerbare fixture, geen vast te coderen productwaarde.
- [ ] Nieuwe waarneming verandert beoordeling en bewijsdekking consequent; meerdere waarnemingen tellen één record. Tegenstrijdig bewijs blijft conform bestaande regels Ter controle. Goedkeuring verandert alleen voorstelmetrics; meerdere voorstellen blijven afzonderlijke werkitems.
- [ ] Lege selectie, nulsegmenten, ontbrekende ouders, niet-beschikbare metrics en API-fouten zijn leesbaar en toegankelijk. Bron, deelbestand, noemer en statusbetekenis zijn zichtbaar zonder tooltip.
- [ ] Aggregatie gebruikt één consistente databaseleesstand, verricht geen externe calls of writes en hergebruikt de scorelogica. Controleer gelijke beoordelingen tussen lijst, straat en detail met aanwezige NBB-cache; frontendtypecheck en relevante tel-/filtertests slagen.
- **Onderbouwing scope:** `docs/challenge.md`, `data/raw/source-metadata.json`, `backend/app/{schema.sql,scoring.py,summaries.py}`, routers en frontend op main `991ff3e`. Read-only controle van de lokale database op 16-09-2026 bevestigt bovenstaande statusaantallen, 515 ontbrekende ouders, 0 waarnemingen en 7 opgeslagen open voorstellen; dit laatste is veranderlijke werkstaat, geen acceptatiebaseline. Tickets 024/025 hebben al implementatiewerk op andere branches, maar niet op deze onderzochte main; controleer de merge-status bij uitvoering opnieuw.

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
