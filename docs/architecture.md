# Architecture

Kanu Ops is a focused full-stack application. The goal is to keep product flow understandable while showing real engineering boundaries.

## Domain Model

```text
Project
  Branch
    Task
      TaskComment
  ActivityLog
```

- `Project` groups work for a product or client initiative.
- `Branch` represents a delivery stream, feature branch, or focused objective.
- `Task` moves through the board states and carries priority, type, progress, and context.
- `TaskComment` stores private notes without cluttering the board.
- `ActivityLog` records important mutations for auditability.

## Request Flow

```text
React UI
  -> Route Handler
    -> Zod validator
      -> SQLite repository function
        -> Activity log write
          -> Workspace snapshot response
```

Mutations return a fresh workspace snapshot. That keeps the client state simple for MVP and makes all UI surfaces update from one source of truth.

## Persistence

SQLite is used through `better-sqlite3`. The schema is initialized at application startup with idempotent `CREATE TABLE IF NOT EXISTS` statements. This is deliberate for the first portfolio version:

- zero external services
- easy recruiter demo
- deterministic seed/reset scripts
- clear upgrade path to Postgres

For a hosted multi-user version, `src/lib/db.ts` can be replaced by a Postgres-backed repository without changing UI component contracts.

## UI Structure

The interface is dense and operational:

- left sidebar: projects, totals, quick project creation
- top workspace header: selected project and branch tabs
- branch analytics: task count, active/review/done split, notes, high-priority work
- board area: four-column kanban with drag-and-drop status changes
- board controls: task search plus priority and type filters
- right drawer: editable task detail, progress, notes, activity context

The app avoids a marketing landing page. First screen is the working product.

## API Surface

- `GET /api/workspace`
- `POST /api/projects`
- `POST /api/branches`
- `POST /api/tasks`
- `PATCH /api/tasks/:id`
- `POST /api/tasks/:id/comments`

Route handlers run on the Node.js runtime because SQLite native bindings are server-only.

## Tradeoffs

- No auth in MVP. Current mode is single-user local operations.
- Drag-and-drop currently changes status; explicit buttons stay as accessible fallback controls.
- Snapshot refresh after mutation is less efficient than optimistic patching, but simpler and safer at this stage.
