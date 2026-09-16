# ADR-002: Stack — FastAPI + SQLite backend, React/Vite frontend

**Date:** 2026-09-16
**Status:** accepted
**Ticket:** TICKET-003

## Context

Hackathon with a same-day deadline (16:30). The deliverable is a 3-minute screen recording of an officer-facing tool; a working demo is a bonus. We need a stack the team can move fast in, with a real database for the KBO sample, deterministic (non-AI) scoring logic, and a UI polished enough to record.

## Decision

- **Backend:** Python 3.13, FastAPI, `sqlite3` from the standard library (no ORM). Dependencies managed with `uv`. Runs on port **8010** (8000 is used by another local project).
- **Database:** a single SQLite file `backend/data.db` (gitignored), created by the import script. Registry numbers stored as TEXT.
- **Frontend:** React 19 + TypeScript on Vite, Tailwind CSS v4, `react-router-dom`. Package manager `pnpm`. Dev server on 5173 proxies `/api` to the backend.
- **No AI in the product.** Activity status is rule-based and every reason is shown to the officer.
- **External evidence is link-outs**, not embeds (no Google Maps API key).
- **UI language:** Dutch, using the vocabulary from the challenge's worked example.

## Consequences

- Two processes in dev (`make dev` runs both); frontend build can later be served statically by FastAPI if a single deployable is needed.
- No migrations tooling; schema lives in `backend/app/schema.sql` and is applied by the import script.
- Scoring logic is auditable and demoable but only as good as the register signals plus officer-logged evidence.
