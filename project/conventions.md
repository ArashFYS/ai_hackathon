# Coding Conventions -- ai_hackathon

## General

- Prefer clarity over cleverness
- Functions should do one thing
- Name variables descriptively
- Keep files under 300 lines; split if larger

## Stack-Specific Conventions

- **Backend (`backend/`):** FastAPI app in `app/`, one router per resource in `app/routers/`, plain `sqlite3` with `sqlite3.Row`, schema in `app/schema.sql`. Deps via `uv add`. Scripts in `scripts/`.
- **Frontend (`frontend/`):** pages in `src/pages/`, shared components in `src/components/`, API client in `src/api.ts`. Tailwind utility classes, no CSS files beyond `index.css`. `pnpm tsc -b --noEmit` must pass.
- **Data rules:** registry numbers are TEXT; a single space `' '` in source data means NULL; `1900-01-01` / `9999-12-31` mean NULL.
- **Language:** all officer-facing UI text in Dutch; code, comments and commit messages in English. Use the brief's vocabulary: Adres · Register · Bewijs van activiteit · Laatste waarneming · Zekerheid (Hoog/Middel/Laag) · Voorstel · bevestigen/afwijzen · contactgegevens onbekend.
- **No AI in the product:** status logic is deterministic and every reason is displayed.

## Git

- **Branch naming:** `type/TICKET-NNN-short-description`
  - Types: feat, fix, chore, refactor, test, docs
- **Commit messages:** `type(scope): description (TICKET-NNN)`
  - One logical change per commit
  - Always include ticket ID
- **Branching:** one branch per ticket, always — `type/TICKET-NNN-short-description` off `main`. **Never push to main**; every change reaches main through a PR (pre-push hook enforces this).

## Code Quality

- Re-read code before committing
- Check for: edge cases, error handling, naming clarity
- Keep dependencies minimal -- add only what's needed
