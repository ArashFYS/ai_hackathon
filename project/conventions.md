# Coding Conventions -- ai_hackathon

## General

- Prefer clarity over cleverness
- Functions should do one thing
- Name variables descriptively
- Keep files under 300 lines; split if larger

## Stack-Specific Conventions

<!-- The tech stack is not yet chosen. Fill in this section once it is decided
     (formatter, linter, test runner, dependency manager, directory layout). -->

- Stack: TBD
- Once chosen, record the decision in a new ADR under `docs/adr/` and update
  the Build / Test / Run section of `CLAUDE.md`

## Git

- **Branch naming:** `type/TICKET-NNN-short-description`
  - Types: feat, fix, chore, refactor, test, docs
- **Commit messages:** `type(scope): description (TICKET-NNN)`
  - One logical change per commit
  - Always include ticket ID
- **Branching:** Create a branch per ticket for non-trivial work

## Code Quality

- Re-read code before committing
- Check for: edge cases, error handling, naming clarity
- Keep dependencies minimal -- add only what's needed
