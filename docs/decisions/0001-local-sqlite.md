# 0001. Use Local SQLite for MVP

## Status

Accepted

## Context

Kanu Ops needs persistent projects, branches, tasks, private notes, and activity logs. The first version should be easy to clone, run, and review without managed infrastructure.

## Decision

Use SQLite with `better-sqlite3` and a typed repository layer in `src/lib/db.ts`.

## Consequences

Positive:

- Local setup stays fast.
- Demo data can be seeded with one command.
- No hosted database credentials are needed.
- The schema stays visible in application code.

Negative:

- Hosted multi-user mode will need a database adapter change.
- Advanced migrations are manual for now.

Future path:

- Move repository functions behind an interface.
- Add Postgres implementation.
- Keep route handlers and UI unchanged.
