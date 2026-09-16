# Notes -- ai_hackathon

> Claude's scratch pad for cross-session observations. Updated by `/project-update`.

## Observations

<!-- /project-update appends observations here -->

- 2026-09-16: Challenge brief captured in docs/challenge.md. Hard deadline 16:30 Brussels same day. Primary deliverable is the video; demo is a bonus.
- **Data gotcha:** empty cells in both CSV and GeoJSON are a single space `' '`, not `''`/null. Strip before testing emptiness. Placeholder dates `1900-01-01T00:00:00Z` / `9999-12-31T00:00:00Z` mean unset.
- Data profile (2026-09-16): 457 enterprises (all `Rechtspersoon`) / 543 establishments. `Rechtstoestand`: 422 "Normale toestand", ~35 in ontbinding/vereffening/faillissement (register-level inactive signal). `Rechtsvorm`: 121 VZW, 105 **Vereniging van Mede-eigenaars** (apartment co-owner associations — not real businesses; classic "buried local economy" noise), 81 BV. Phone filled 53, email 73. `Datum_stopzetting` never set in sample. 15 rows have a real `Datum_adresdoorhaling` (address struck off — strong inactive signal). 32 rows where AR_straat ≠ KBO_Straat. GeoJSON has `JAARREK_URL_NBB` (NBB annual accounts link) for enterprises — a free public evidence source.
- Starter data (Schoten KBO sample) is in data/raw/. Only 28/543 establishments have their parent enterprise in the sample; the VKBO OGC API (see source-metadata.json) can fetch parents/other municipalities.

## Open Questions

<!-- Things to discuss with the user -->

- ~~Which tech stack?~~ Decided 2026-09-16: FastAPI + SQLite + React/Vite (ADR-002).
- Port 8000 on this machine is occupied by another local project (quarterly-RAG); backend uses 8010.
