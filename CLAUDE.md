# ai_hackathon

Hackathon entry for **Challenge 01: Find the Real Businesses** (ns2agi, Province of Antwerp). A tool for local economy officers to determine which KBO-registered businesses are actually active in their municipality — combining register data with dated public evidence, confidence markers, and officer approval before any correction is published.

**Full brief:** [docs/challenge.md](docs/challenge.md) — read this first.
**Deadline:** 16:30 Europe/Brussels, 16 Sep 2026 — 3-min YouTube pitch video via Google Form. Demo is an optional bonus.
**Officer-facing UI text must be in Dutch.**

**Stack:** TBD (not yet chosen)

## File Structure

<!-- Auto-updated by /project-update. Do not edit manually. -->
```
./.claude/hooks/enforce-ticket.sh
./.claude/settings.json
./.gitignore
./CLAUDE.md
./data/raw/schoten-kbo-1000-2026-09-07.csv
./data/raw/schoten-kbo-1000-2026-09-07.geojson
./data/raw/source-metadata.json
./docs/adr/001-initial-setup.md
./docs/challenge.md
./docs/notes.md
./project/conventions.md
./project/tickets.md
./README.md
```

## Build / Test / Run

<!-- Update these after setting up the stack -->
- **Build:** `TODO`
- **Test:** `TODO`
- **Run:** `TODO`

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
| Claim ticket | Move to "In Progress", write ID to `.claude/active-ticket` |
| Work | All edits are linked to the active ticket |
| Complete | Commit with ticket ID, move to "Done", record commit hash, clear `.claude/active-ticket` |

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

### Branch naming

```
type/TICKET-NNN-short-description
```

Examples: `feat/TICKET-003-user-login`, `fix/TICKET-004-null-response`
