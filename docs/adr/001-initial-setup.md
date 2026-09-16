# ADR-001: Initial project setup and tooling

**Date:** 2026-09-16
**Status:** accepted
**Ticket:** TICKET-001

## Context

ai_hackathon is an AI-powered business trust score checker built for a hackathon. The project is starting from an empty repository, and the tech stack has not yet been chosen. Even without a stack, the team wants structured project management from day one so that work stays traceable under hackathon time pressure.

## Decision

- Adopt a ticket-based workflow managed in `project/tickets.md`, using the `TICKET` prefix.
- Use Claude Code as the primary development assistant, guided by `CLAUDE.md`.
- Enforce the workflow with hooks: a Claude Code PreToolUse hook (`.claude/hooks/enforce-ticket.sh`) blocks edits to non-meta files without an active ticket, and a git `commit-msg` hook requires a ticket ID in every commit message.
- Defer the tech stack decision. A follow-up ADR (002) should record the stack once it is chosen.

## Consequences

- All code edits are tracked via tickets, and every commit is linked to a ticket ID.
- Project structure, conventions, and decisions are documented from the first commit.
- Stack-specific conventions, build/test/run commands, and `.gitignore` sections remain placeholders until the stack is decided.
