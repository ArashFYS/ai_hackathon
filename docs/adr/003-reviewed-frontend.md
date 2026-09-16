# ADR-003: Reviewed provincial frontend

Date: 2026-09-16
Ticket: TICKET-029
Status: Accepted for branch review

## Decision

Integrate local UI version 5, reviewed by the user. The application interface is
English; official names, addresses, original register data and officer observations
retain their original language. This follows the user's explicit design decision;
the event's original Dutch-language requirement is still recorded in docs/challenge.md.

Use the Province of Antwerp identity with an unchanged official logo on white:
https://www.provincieantwerpen.be/themes/custom/provant_base/logo.svg?v=4
Its colours supply the red/burgundy accents. This remains a hackathon concept,
not an official provincial service.

Reduce card framing, use one native source selector for all six existing sources,
and give status labels equal 176 x 40 px dimensions with no accent stripe.
The confidence-score field shows "Not available": no number, score scale,
thresholds or score/manual-review precedence has been specified by the backend.
Do not infer numeric values from the existing qualitative confidence categories.

Pin valid record coordinates on Google Maps. If coordinates are missing or invalid,
use a clearly labelled address-only search; with no address either, show no map.
Retain coordinate/address warnings and the separate existing business/reviews search.
A register pin does not independently verify current business occupancy.

## Validation

Run frontend typecheck, production build and `pnpm test:map`. Local browser checks
covered all screens, search/filter behavior, all six source choices, the visible
map pin and uniform 176 x 40 px labels with zero left borders.

Earlier UI variants remain saved separately on the review machine. They are not
bundled into the application or repository.
