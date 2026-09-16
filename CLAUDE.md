# ai_hackathon

Hackathon entry for **Challenge 01: Find the Real Businesses** (ns2agi, Province of Antwerp). A tool for local economy officers to determine which KBO-registered businesses are actually active in their municipality — combining register data with dated public evidence, confidence markers, and officer approval before any correction is published.

**Full brief:** [docs/challenge.md](docs/challenge.md) — read this first.
**Deadline:** 16:30 Europe/Brussels, 16 Sep 2026 — 3-min YouTube pitch video via Google Form. Demo is an optional bonus.
**UI text is English per the reviewed TICKET-029 design. Official names, source data, addresses and observations retain their original language.** The original event language requirement remains documented in docs/challenge.md.

**Stack:** Python 3.13 + FastAPI + SQLite (backend, port 8010) · React 19 + TypeScript + Vite + Tailwind v4 (frontend, port 5173). See [ADR-002](docs/adr/002-stack.md).

## File Structure

<!-- Auto-updated by /project-update. Do not edit manually. -->
```
./.claude/hooks/enforce-ticket.sh
./.claude/hooks/pre-push
./.claude/settings.json
./.gitignore
./CLAUDE.md
./Makefile
./AGENTS.md -> CLAUDE.md
./backend/CLAUDE.md              # backend contract: API, scoring rules, external URLs
./backend/app/main.py
./backend/app/db.py
./backend/app/schema.sql
./backend/app/vkbo.py            # VKBO mapping + API client
./backend/app/scoring.py         # rule-based assessment (no AI)
./backend/app/links.py           # external evidence URLs
./backend/app/nbb.py             # NBB Balanscentrale public API client
./backend/app/summaries.py
./backend/app/routers/{records,streets,evidence,proposals,nbb}.py
./backend/scripts/import_data.py
./backend/pyproject.toml
./frontend/CLAUDE.md             # pages, components, Dutch vocabulary
./frontend/src/api.ts            # typed client mirroring backend contract
./frontend/src/pages/{Zoeken,Detail,Straat,Goedgekeurd}.tsx
./frontend/src/components/
./frontend/src/App.tsx
./data/CLAUDE.md
./docs/video-script.md
./data/raw/schoten-kbo-1000-2026-09-07.csv
./data/raw/schoten-kbo-1000-2026-09-07.geojson
./data/raw/source-metadata.json
./docs/adr/001-initial-setup.md
./docs/adr/002-stack.md
./docs/challenge.md
./docs/notes.md
./project/conventions.md
./project/tickets.md
./README.md
```

## Build / Test / Run

<!-- Update these after setting up the stack -->
- **Run both:** `make dev` (backend on :8010, frontend on :5173 with `/api` proxied)
- **Backend only:** `cd backend && uv run uvicorn app.main:app --reload --port 8010`
- **Frontend only:** `cd frontend && pnpm dev`
- **Import data:** `make import` (loads `data/raw/*.geojson` into `backend/data.db`)
- **Typecheck frontend:** `cd frontend && pnpm tsc -b --noEmit`
- **Test:** none yet

## Per-area guides

Each architecture piece has its own `CLAUDE.md` (with an `AGENTS.md` symlink): [backend/CLAUDE.md](backend/CLAUDE.md), [frontend/CLAUDE.md](frontend/CLAUDE.md), [data/CLAUDE.md](data/CLAUDE.md). The backend one is the API contract.

## Coding Conventions

See [project/conventions.md](project/conventions.md) for detailed conventions.

## Architecture Decisions

See [docs/adr/](docs/adr/) for architecture decision records.

## CRITICAL RULES

### Every edit MUST be linked to a ticket

Before making ANY code change:

1. Check `project/tickets.md` for an existing ticket, or create one
2. Move the ticket to "In Progress" in tickets.md
3. Write the ticket ID to `.claude/active-ticket`:
   ```bash
   echo "TICKET-NNN" > .claude/active-ticket
   ```
4. Make your edits
5. Commit with the ticket ID in the message:
   ```
   type(scope): description (TICKET-NNN)
   ```
6. Move ticket to "Done" in tickets.md, record the commit hash
7. Clear the active ticket:
   ```bash
   echo "" > .claude/active-ticket
   ```

**If you find yourself editing code without a ticket, STOP. Create the ticket first. This is non-negotiable.**

### Every ticket lives on its own branch — NEVER push to main

**Non-negotiable.** `main` only moves through pull requests.

1. Before the first edit for a ticket: `git checkout -b type/TICKET-NNN-short-description main`
2. Commit on that branch (ticket ID in every message), push **the branch**: `git push -u origin type/TICKET-NNN-short-description`
3. Open a PR into `main`; the PR title carries the ticket ID. Merge happens in the PR, never locally.
4. After merge: `git checkout main && git pull`, delete the branch, move the ticket to Done with the merge commit.

This applies to meta files too (CLAUDE.md, tickets.md, ADRs): they change on a branch and arrive on main via PR.
A `pre-push` hook refuses pushes to main; install it once per clone: `cp .claude/hooks/pre-push .git/hooks/pre-push && chmod +x .git/hooks/pre-push`.
**If you are on `main` and about to edit, STOP and create the branch first.**

### Meta files are exempt from ticket enforcement

These files can be edited without an active ticket:
- `project/tickets.md`
- `CLAUDE.md`
- `project/conventions.md`
- `docs/notes.md`
- `docs/adr/*`
- `.claude/active-ticket`
- `.claude/settings.json`
- `.claude/settings.local.json`
- `.gitignore`

### Ticket workflow

| Step | Action |
|------|--------|
| Pick up work | Find or create ticket in `project/tickets.md` |
| Claim ticket | Move to "In Progress", write ID to `.claude/active-ticket`, `git checkout -b type/TICKET-NNN-desc main` |
| Work | All edits are linked to the active ticket |
| Complete | Commit with ticket ID, push the branch, open a PR; after merge move to "Done", record commit hash, clear `.claude/active-ticket` |

### Commit message format

```
type(scope): description (TICKET-NNN)
```

Types: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`

Examples:
```
feat(auth): implement login flow (TICKET-003)
fix(api): handle null response (TICKET-004)
chore: update dependencies (TICKET-005)
```

### Branch naming (one branch per ticket, PR into main)

```
type/TICKET-NNN-short-description
```

Examples: `feat/TICKET-003-user-login`, `fix/TICKET-004-null-response`
