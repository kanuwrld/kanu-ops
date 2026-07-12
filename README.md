# Kanu Ops

Solo-founder operations console for projects, branches, task boards, private notes, and activity logs.

Kanu Ops is built as a portfolio-grade product slice: small enough to review quickly, but complete enough to show data modeling, API boundaries, UI discipline, and documentation.

## Why This Exists

Solo builders often run several projects at once. Each project has branches of work, delivery goals, review states, and private implementation notes. Generic task trackers can feel heavy for that loop.

Kanu Ops focuses on one workflow:

```text
project -> branch -> kanban task -> private note -> activity log
```

## Features

- Project sidebar with health, progress, branch, and task counts
- Branch-focused workspace for goals and delivery progress
- Dense kanban board with `Open`, `In work`, `Review`, and `Done`
- Fast task creation without leaving board context
- Task drawer with status controls, progress, metadata, and private notes
- SQLite-backed activity log for project, branch, task, and note events
- Typed repository layer that keeps database access out of React components
- Seed/reset scripts for fast local demo setup

## Tech Stack

- Next.js App Router
- React and TypeScript
- Tailwind CSS
- Node.js route handlers
- SQLite via `better-sqlite3`
- Zod request validation

## Architecture

```text
src/app/page.tsx                server entry, reads workspace snapshot
src/components/ops-console.tsx  interactive product UI
src/app/api/*                   route handlers for mutations and snapshot reads
src/lib/db.ts                   SQLite schema, repository functions, activity logging
src/lib/validators.ts           request validation
src/lib/types.ts                shared domain types
scripts/*                       local database seed/reset utilities
docs/*                          architecture and decisions
```

Read more in [docs/architecture.md](docs/architecture.md).

## Local Setup

```bash
npm install
npm run db:reset
npm run dev
```

Open `http://localhost:3000`.

## Scripts

```bash
npm run dev        # start local app
npm run build      # production build
npm run lint       # lint source
npm run typecheck  # TypeScript check
npm run check      # lint + typecheck + build
npm run db:seed    # seed demo workspace
npm run db:reset   # reset SQLite database and seed demo data
```

## Roadmap

- Drag-and-drop task ordering
- Project-level milestones and delivery dates
- GitHub repository sync for branch/task context
- Optional auth layer for hosted multi-user mode
- FastAPI microservice for project analytics and release-risk scoring

## Portfolio Notes

This repo intentionally avoids overbuilding. Scope stays sharp: clear domain model, useful interface, isolated persistence, validation, logs, docs, and CI.
