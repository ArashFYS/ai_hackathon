# frontend/ — React 19 + TypeScript + Vite + Tailwind v4

pnpm. Dev server on 5173; `/api/*` is proxied to the backend on 8010 (see `vite.config.ts`).
`pnpm tsc -b --noEmit` must pass. Keep files < 300 lines.

```
src/main.tsx          LanguageProvider + BrowserRouter
src/App.tsx           layout (header + nav + LanguageToggle) and routes
src/api.ts            typed fetch helpers for every backend endpoint (types mirror backend/CLAUDE.md)
src/labels.ts         language-aware label helpers for enum codes (statusLabel, sourceLabel, activitySectorLabel, …) — re-exported by api.ts
src/i18n/             index.tsx (LanguageProvider · useLang · useT · translate) · nl/{labels,ui}.ts · en/{labels,ui}.ts
src/pages/            Zoeken.tsx · Detail.tsx · Straat.tsx · Kaart.tsx · Goedgekeurd.tsx
src/components/       StatusBadge · ZekerheidBadge · ReasonsList · EvidencePanel (tabs + iframe minibrowser) ·
                      NbbPanel · EvidenceForm · ProposalList · RecordCard · LinkageCard · ActivitySelect (Activiteit dropdown from /api/activities)
                      NbbPanel · EvidenceForm · ProposalList · RecordCard · LinkageCard · ContactBlock
                      NbbPanel · EvidenceForm · ProposalList · RecordCard · LinkageCard ·
                      MissingEstablishmentForm (+ MissingRow: "Vestiging ontbreekt op dit adres" form and table row)
                      IndicatorLights (three traffic lights KBO · Maps · e-fact., captions via t(); TICKET-033)
```

Routes: `/` Dashboard · `/zoeken` Zoeken · `/record/:nr` Detail · `/straat` and `/straat/:street` Straatoverzicht · `/kaart?street=&status=` Kaart · `/goedgekeurd` Goedgekeurde wijzigingen.

## Province of Antwerp theme — TICKET-030
Visual restyle from `feat/TICKET-029-provincial-ui` merged on top of the i18n/feature set: `@theme` palette + semantic classes in `src/index.css` (`antwerp-app`, `site-header`/`site-brand`/`site-nav-link`/`site-footer`, `page-filters`, `results-table`/`address-group`, `record-layout`/`record-heading`/`detail-section`/`register-fields`/`address-comparison`, `source-browser`/`source-viewport`, `activity-status[data-status]`, `certainty-label[data-certainty]`), logo `public/provincie-antwerpen-logo.svg`. All text still goes through `t()`/`useT()` (NL default, EN toggle). `ConfidenceScore` and `mapLocation.ts` exist but are not wired in (the API supplies no numeric score; the minibrowser keeps the backend map links).

## Language / i18n — Dutch default, English toggle (TICKET-029)
No library. `src/i18n/nl/*.ts` is the source of truth (`labels.ts` = enum codes, `ui.ts` = everything else); `src/i18n/en/*.ts` mirrors it and is typed `Record<keyof typeof nl…, string>`, so a key missing in EN is a tsc error. `useT()` gives `t(key, vars?)` with `{name}` interpolation; `useLang()` gives `{ lang, setLang }`. Persisted in `localStorage.lang`, `<html lang>` follows. Default `nl`.
- **Add a string:** put `'area.name': 'Nederlandse tekst'` in `nl/ui.ts` (or `nl/labels.ts` for a backend code), the English in the same spot of `en/*.ts`, then `t('area.name')` in the component. Never a bare Dutch literal in JSX, `placeholder`, `title` or `aria-label`.
- **Backend codes** (status, certainty, source, kind, contact_status, sector…) go through the helpers in `labels.ts` (`statusLabel(lang, code)`, `activitySectorLabel(lang, sector, backendLabel)`, `registerLabel(lang, v)`…), never through the backend's `*_label` fields. `STATUS_CODES` replaces `Object.keys(STATUS_LABELS)`.
- **Left in Dutch on purpose** (backend free text, shown as delivered): reason sentences, `proposal_text`, `reason` on proposals, KBO register values (rechtsvorm, rechtstoestand, doorhalingsreden), NBB model / legal situation / note, `Contact.source`, `activity.source` other than `waarneming`. In EN the Beoordeling block shows "(brontekst in het Nederlands / source text in Dutch)". Dates stay ISO, numbers stay `nl-BE`.

## Status colours (Tailwind)
`actief` green · `ter_controle` amber · `waarschijnlijk_niet_actief` red · `geen_onderneming` gray. Zekerheid: hoog solid, middel outline, laag dashed/light.

## Signalen (IndicatorLights)
`record.indicators = { kbo, google_maps, einvoice }`, each `{ level, label, text, checked_at, url }`. Dots: groen `bg-green-500` · geel `bg-amber-400` · rood `bg-red-500` · onbekend `bg-gray-300`; captions KBO · Maps · e-fact. (EN: e-inv.) via `t('indicators.*')`, `label`/`text` stay backend Dutch like reason sentences; the `title` tooltip carries label + text so colour is never the only signal. Compact (row of dots) in the Zoeken and Straatoverzicht tables (column **Signalen**); `detailed` (one line per source with "gecontroleerd {date} · Controleer bron ↗") in the Detail Beoordeling block. Detail calls `getIndicators(nr)` on mount (live Peppol lookup, cached server-side) and swaps in the result; on failure the cached dots stay. Straatoverzicht has **Controleer straat** → `refreshStreetIndicators(street)` (busy text `t('street.checkBusy')`), then shows the counts and reloads. The Maps light has no Google API behind it: it reflects the latest logged observation with bron Google Maps (groen if actief within 6 months), so logging a waarneming on the detail page is what turns it on.

## Pages
- **Zoeken** — one search box (naam, ondernemingsnummer, straat), optional type/status/activiteit filters (URL params `type`, `status`, `activity`); results table: naam · type · adres · Activiteit (label + bron) · Register · Status badge · Zekerheid · Contact · Signalen; row → `/record/:nr`. Link to Straatoverzicht.
- **Detail** — two columns. Left: header (display_name, type badge, nr), Assessment block (status, zekerheid, **reasons list** — this is the "how did the tool decide" view), Register facts (rechtsvorm, rechtstoestand, startdatum, KBO adres vs AR adres side by side, NACE if any), **LinkageCard** (establishment → parent card with "zetel elders" / "moederonderneming niet in dataset" + "Haal op via VKBO" button calling fetch-parent; enterprise → list of its establishments), Contact block (phone/email or "contactgegevens onbekend"; note whether it belongs to vestiging or zetel), EvidenceForm + logged evidence list, Proposals with bevestigen/afwijzen buttons.
- **Zoeken** — one search box (naam, ondernemingsnummer, straat), optional type/status filters; results table: naam · type · adres · Register · Status badge · Zekerheid · Contact ("☎ register" / "☎ zetel" / "☎ waargenomen" / "—" from `contact_status`); row → `/record/:nr`. Link to Straatoverzicht.
- **Detail** — two columns. Left: header (display_name, type badge, nr), Assessment block (status, zekerheid, **reasons list** — this is the "how did the tool decide" view), Register facts (rechtsvorm, rechtstoestand, startdatum, KBO adres vs AR adres side by side, NACE if any), **LinkageCard** (establishment → parent card with "zetel elders" / "moederonderneming niet in dataset" + "Haal op via VKBO" button calling fetch-parent; enterprise → list of its establishments), Contact block (**ContactBlock**: table Waarde · Hoort bij · Bron · Datum · Link from `contacts`, badge from `contact_status`; empty → "contactgegevens onbekend" + hint to log a waarneming), EvidenceForm (+ optional Telefoon · E-mail · Website) + logged evidence list, Proposals with bevestigen/afwijzen buttons.
  Right (sticky): **EvidencePanel** = tabbed minibrowser. Tabs: Kaart & recensies (iframe google_maps_embed) · Street View (iframe street_view_embed; if it fails to render show the link) · KBO (iframe kbo_public_embed) · Jaarrekeningen (NbbPanel, native) · Website (iframe web_search_embed). Each tab has "Bron", "Wat te controleren" one-liner, and "Open in nieuw venster ↗" (the non-embed URL). Iframes: `sandbox` off, `referrerPolicy="no-referrer"`, height ~70vh.
- **Straatoverzicht** — street picker (from `/streets`, Paalstraat default), then table grouped by address with columns exactly: **Adres · Onderneming / vestiging · Register · Bewijs van activiteit · Laatste waarneming · Zekerheid · Signalen · Voorstel · [bevestigen] [afwijzen]** (buttons act on the open_proposal; disabled if none). Status filter and Activiteit filter (`?activity=` on the street endpoint). Row name links to detail. Button **Controleer straat** → `refreshStreetIndicators(street)` (TICKET-033).
- **Straatoverzicht** — street picker (from `/streets`, Paalstraat default), then table grouped by address with columns exactly: **Adres · Onderneming / vestiging · Register · Bewijs van activiteit · Laatste waarneming · Zekerheid · Voorstel · [bevestigen] [afwijzen]** (buttons act on the open_proposal; disabled if none). Status filter. Row name links to detail.
- **Kaart** — Leaflet + OSM tiles (`/api/records/geo`), CircleMarkers coloured by status, popup → detail; filters Straat/Status; "Buiten Schoten: N" button fits the map to the mis-geocoded points.
- **Straatoverzicht** — street picker (from `/streets`, Paalstraat default), then table grouped by address with columns exactly: **Adres · Onderneming / vestiging · Register · Bewijs van activiteit · Laatste waarneming · Zekerheid · Voorstel · [bevestigen] [afwijzen]** (buttons act on the open_proposal; disabled if none). Status filter. Row name links to detail. Button **"Vestiging ontbreekt op dit adres"** (top + per address group) opens MissingEstablishmentForm → `POST /proposals/missing`; the street's `missing` proposals render as rows "{observed_name} (niet in register op dit adres) · Register — · reason · observed_at · Middel · Nazicht: vestiging ontbreekt of adres verkeerd", merged into the matching house-number group.
- **Goedgekeurd** — table of proposals with status bevestigd (and a toggle to see afgewezen/open), "Exporteer CSV" and "Exporteer JSON" buttons hitting `/api/proposals/export`. Explain in one line: "Alleen bevestigde wijzigingen verlaten de tool."

## NbbPanel
Calls `/api/records/{nr}/nbb`. Shows company (naam, rechtsvorm, rechtstoestand + datum), "Laatste neerlegging: {date} ({months} maanden geleden)", table of deposits: Boekjaar · Model · Omzet · Brutomarge · Winst/verlies · Eigen vermogen · VTE · PDF ↗. Numbers formatted `nl-BE` EUR, null → "—". If `available:false` show the `note` and the "Open in NBB ↗" link. Loading and error states in Dutch.


## Dashboard — TICKET-032
`/` is the municipal dashboard. URL scope: `gemeente`, `soort`, `sector` (default Schoten).
Legacy root query links using q/type/status/activity/street redirect to `/zoeken` preserving filters.
`pages/Dashboard.tsx` calls one aggregate endpoint; `DashboardChart` toggles sector/status distributions,
`DashboardCoverage` shows observation/contact/certainty/parent coverage and saved proposals.
`BusinessMap` shares the actual Leaflet renderer with Kaart. All percentages use the selected total;
missing parents use selected establishments. No historical sparklines or invented counts.
Dutch/English labels in `i18n/{nl,en}/dashboard.ts`. Empty/loading/error states are distinct.
Search has exact totals and 100-row pagination. `ScopeChips` exposes dashboard drilldown filters.
Kaart preserves municipality/type/sector; proposals preserve status and scope in the URL, with a
separate all-municipality view for unlinked reports. Return to dashboard or window focus refreshes data.
