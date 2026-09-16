# frontend/ — React 19 + TypeScript + Vite + Tailwind v4

pnpm. Dev server on 5173; `/api/*` is proxied to the backend on 8010 (see `vite.config.ts`).
`pnpm tsc -b --noEmit` must pass. Keep files < 300 lines.

```
src/main.tsx          BrowserRouter
src/App.tsx           layout (header + nav) and routes
src/api.ts            typed fetch helpers for every backend endpoint (types mirror backend/CLAUDE.md)
src/pages/            Zoeken.tsx · Detail.tsx · Straat.tsx · Kaart.tsx · Goedgekeurd.tsx
src/components/       StatusBadge · ZekerheidBadge · ReasonsList · EvidencePanel (tabs + iframe minibrowser) ·
                      NbbPanel · EvidenceForm · ProposalList · RecordCard · LinkageCard · ActivitySelect (Activiteit dropdown from /api/activities)
                      NbbPanel · EvidenceForm · ProposalList · RecordCard · LinkageCard · ContactBlock
```

Routes: `/` Zoeken · `/record/:nr` Detail · `/straat` and `/straat/:street` Straatoverzicht · `/kaart?street=&status=` Kaart · `/goedgekeurd` Goedgekeurde wijzigingen.

## Language and vocabulary — officer-facing text is Dutch
Use the challenge's own words: **Adres · Onderneming / vestiging · Register · Bewijs van activiteit · Laatste waarneming · Zekerheid (Hoog / Middel / Laag) · Voorstel · bevestigen / afwijzen · contactgegevens onbekend · zetel elders · moederonderneming niet in dataset**.
Never show an invented value: missing → "onbekend" or "—".

## Status colours (Tailwind)
`actief` green · `ter_controle` amber · `waarschijnlijk_niet_actief` red · `geen_onderneming` gray. Zekerheid: hoog solid, middel outline, laag dashed/light.

## Pages
- **Zoeken** — one search box (naam, ondernemingsnummer, straat), optional type/status/activiteit filters (URL params `type`, `status`, `activity`); results table: naam · type · adres · Activiteit (label + bron) · Register · Status badge · Zekerheid; row → `/record/:nr`. Link to Straatoverzicht.
- **Detail** — two columns. Left: header (display_name, type badge, nr), Assessment block (status, zekerheid, **reasons list** — this is the "how did the tool decide" view), Register facts (rechtsvorm, rechtstoestand, startdatum, KBO adres vs AR adres side by side, NACE if any), **LinkageCard** (establishment → parent card with "zetel elders" / "moederonderneming niet in dataset" + "Haal op via VKBO" button calling fetch-parent; enterprise → list of its establishments), Contact block (phone/email or "contactgegevens onbekend"; note whether it belongs to vestiging or zetel), EvidenceForm + logged evidence list, Proposals with bevestigen/afwijzen buttons.
- **Zoeken** — one search box (naam, ondernemingsnummer, straat), optional type/status filters; results table: naam · type · adres · Register · Status badge · Zekerheid · Contact ("☎ register" / "☎ zetel" / "☎ waargenomen" / "—" from `contact_status`); row → `/record/:nr`. Link to Straatoverzicht.
- **Detail** — two columns. Left: header (display_name, type badge, nr), Assessment block (status, zekerheid, **reasons list** — this is the "how did the tool decide" view), Register facts (rechtsvorm, rechtstoestand, startdatum, KBO adres vs AR adres side by side, NACE if any), **LinkageCard** (establishment → parent card with "zetel elders" / "moederonderneming niet in dataset" + "Haal op via VKBO" button calling fetch-parent; enterprise → list of its establishments), Contact block (**ContactBlock**: table Waarde · Hoort bij · Bron · Datum · Link from `contacts`, badge from `contact_status`; empty → "contactgegevens onbekend" + hint to log a waarneming), EvidenceForm (+ optional Telefoon · E-mail · Website) + logged evidence list, Proposals with bevestigen/afwijzen buttons.
  Right (sticky): **EvidencePanel** = tabbed minibrowser. Tabs: Kaart & recensies (iframe google_maps_embed) · Street View (iframe street_view_embed; if it fails to render show the link) · KBO (iframe kbo_public_embed) · Jaarrekeningen (NbbPanel, native) · Website (iframe web_search_embed). Each tab has "Bron", "Wat te controleren" one-liner, and "Open in nieuw venster ↗" (the non-embed URL). Iframes: `sandbox` off, `referrerPolicy="no-referrer"`, height ~70vh.
- **Straatoverzicht** — street picker (from `/streets`, Paalstraat default), then table grouped by address with columns exactly: **Adres · Onderneming / vestiging · Register · Bewijs van activiteit · Laatste waarneming · Zekerheid · Voorstel · [bevestigen] [afwijzen]** (buttons act on the open_proposal; disabled if none). Status filter and Activiteit filter (`?activity=` on the street endpoint). Row name links to detail.
- **Straatoverzicht** — street picker (from `/streets`, Paalstraat default), then table grouped by address with columns exactly: **Adres · Onderneming / vestiging · Register · Bewijs van activiteit · Laatste waarneming · Zekerheid · Voorstel · [bevestigen] [afwijzen]** (buttons act on the open_proposal; disabled if none). Status filter. Row name links to detail.
- **Kaart** — Leaflet + OSM tiles (`/api/records/geo`), CircleMarkers coloured by status, popup → detail; filters Straat/Status; "Buiten Schoten: N" button fits the map to the mis-geocoded points.
- **Goedgekeurd** — table of proposals with status bevestigd (and a toggle to see afgewezen/open), "Exporteer CSV" and "Exporteer JSON" buttons hitting `/api/proposals/export`. Explain in one line: "Alleen bevestigde wijzigingen verlaten de tool."

## NbbPanel
Calls `/api/records/{nr}/nbb`. Shows company (naam, rechtsvorm, rechtstoestand + datum), "Laatste neerlegging: {date} ({months} maanden geleden)", table of deposits: Boekjaar · Model · Omzet · Brutomarge · Winst/verlies · Eigen vermogen · VTE · PDF ↗. Numbers formatted `nl-BE` EUR, null → "—". If `available:false` show the `note` and the "Open in NBB ↗" link. Loading and error states in Dutch.
