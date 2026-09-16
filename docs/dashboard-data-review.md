# Dashboard data review — TICKET-032

Checked 16 September 2026 against the isolated dashboard preview database and the supplied Schoten GeoJSON, retrieved 7 September 2026. These counts describe that snapshot; they are not hardcoded in the UI.

| Selection | Records | To review | Assessed active | Probably inactive | No enterprise | With observation | Unknown sector |
|---|---:|---:|---:|---:|---:|---:|---:|
| All | 1,000 | 789 | 0 | 106 | 105 | 0 | 919 |
| Enterprises | 457 | 254 | 0 | 98 | 105 | 0 | 439 |
| Establishments | 543 | 535 | 0 | 8 | 0 | 0 | 480 |

## Reconciliation

- All 1,000 distinct database registry numbers match the raw GeoJSON set. No duplicated record numbers.
- Every record has its own municipality Schoten / NIS 11040. Enterprises and establishments are separate records, not 1,000 unique businesses.
- Type, status, certainty, contact and sector groups each sum to the same filtered total. Status/contact/certainty/sector record-list totals reconcile for all records and each record type.
- The database has zero recorded observations and no cached NBB responses. Active assessment requires an observation supporting activity under the existing rules. Zero active assessments does not mean zero operating businesses.
- 919 records lack both NACE codes; with no observed activities, the API likewise reports 919 unknown sectors. This is too incomplete to infer the sector mix of Schoten.
- 914 records have unknown contact status. 86 have register contacts; parent and observation categories are zero in this snapshot.
- 515 of 543 establishments have a parent outside the loaded dataset (94.8%). All 543 have a parent number. The denominator is establishments, and parents are searched in the full database.
- All 1,000 points have valid coordinate ranges; 60 fall outside the existing rough Schoten bounding box. This is not an exact municipal boundary or proof of a wrong address.
- Foreign-key check returned no violations. Proposal rows are separate work items and can arise during dossier visits; they are not a complete review backlog.

## Presentation decisions

The first view shows the selected total once, then review workload, active assessments and observation coverage. It no longer displays an excluded record type as a zero KPI. The empty-observation message tells the officer what to do and limits interpretation of zero activity.

Status remains the default wheel. All four status rows are visible; extra sectors expand without nested scrolling. Unknown sector coverage is stated explicitly. Counts and percentages use separate, aligned numeric columns.

Missing-information bars link to actionable subsets and explicitly overlap. An unknown-sector link is omitted when a different sector is selected, preventing a zero-count link from escaping the filter. Parent coverage is omitted for enterprise-only selections. Dates remain source retrieval dates, not verification dates.

## Limits

`source-metadata.json` identifies the first 1,000 records as a partial extract. The exact federal KBO snapshot date and full municipal population are unknown. This review reconciles software counts with available inputs; it does not verify businesses in the real world or validate the existing classification rules against independent ground truth.
