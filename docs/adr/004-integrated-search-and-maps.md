# ADR-004: Integrated search, contact export and location validation

Ticket: TICKET-038
Date: 2026-09-16
Base: main a2abe3a (including the Staatsblad publication panel and backend)

## Preserved upstream functionality

Keep KBO Public Search and NACEBEL enrichment, Peppol/Maps/KBO indicators, source
refresh actions, missing-establishment proposals, NL/EN language switching and
the street-snapped Street View implementation. Search and contact export include
the same locally cached KBO and Peppol enrichment as the detail workflow. Bulk
search/export itself does not initiate remote lookups or approval actions.

## Search and export

The single-row search supports live input, AND/OR (AND precedence), quoted phrases,
type terms, formatted registry identifiers, email fragments and normalized phone
numbers. Other filters intersect with the query. A simple conjunctive type intent
is reflected in the Type selector. Columns sort the displayed records locally.

CSV and clipboard output use the same displayed record IDs, columns and ordering.
Users choose the full table, custom columns, unique emails or unique phones.
Contacts include related head-office contacts, observations and local enrichment
cache. Duplicate emails ignore case; phone comparisons normalize punctuation and
Belgian international prefixes. Unknown contacts are never invented.

Displayed results are capped at 2,000. The UI reports the total before the cap and
explicitly warns that export contains only the displayed rows if the cap is hit.
Spreadsheet formula prefixes are escaped in CSV and clipboard output. This is
record-data export, not publication of proposed corrections; approved-change
export remains separate and unchanged.

## Why the source map showed France

The unmodified Schoten starter GeoJSON contains 36 records at exactly
latitude 49.2933354, longitude 2.30668925. For example, record 0409801145,
Speelplein Sinte-Lutgardis-Hofke, has KBO address Sint-Maria-ten-Boslei ZN,
2900 Schoten but that French geometry; its address-register house number and
postcode are missing. This strongly suggests a source fallback/failed geocoding,
not a French business location. The prior UI plotted those points even while
flagging them, and offered a button that fitted the viewport around the outliers.

Reject implausible points from map markers and viewport fitting. Keep the records
and original coordinates intact and list them for review. Missing or rejected
coordinates also do not produce a detail pin or a coordinate-based Street View
link; the fallback is an explicit address search, never a guessed business pin.

Replace the too-small Schoten rectangle with the official municipality envelope:
https://geo.api.vlaanderen.be/geolocation/Location?q=Schoten&type=Municipality
Retrieved 2026-09-16. The envelope is a plausibility check, not a municipal polygon
test or address-level verification. Coordinates for municipalities without a
configured validated envelope remain flagged rather than claimed as verified.

## City and street suggestions

Municipality names use the 67-entry provincial list published at:
https://www.vlaanderen.be/gemeenten-en-provincies/overzicht-van-vlaamse-steden-en-gemeenten
Checked 2026-09-16. Street suggestions are drawn from loaded records and include
their municipality. City suggestions disclose loaded record counts. A city without
loaded business data shows an explicit coverage message and no invented records.
The current local sample contains 1,000 Schoten records; 964 pass the coordinate
plausibility check and 36 are retained in the location-review list.

## Validation

- Backend: py -3.14 -m unittest discover -s tests -v (run from backend/).
- Frontend: pnpm build, pnpm test:map, pnpm test:table.
- Browser: search/filter/sort, automatic type intent, scoped phone clipboard,
  source selection, upstream indicators, map pins, city/street suggestions,
  and empty city coverage. Existing SQLite records and observations preserved.
