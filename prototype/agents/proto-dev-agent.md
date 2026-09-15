# Sub-agent: Prototype Developer (prototype workstream)

**Load these skills first:** `source-driven-development`, `incremental-implementation`,
`test-driven-development`.
**Load context:** `prototype/README.md`, `plan.md` (structure/style/boundaries), `standards.md`,
`data-model.md`, `mock-data-spec.md`, `agents/ux-agent.md` (interaction spec for the slice),
`tasks/todo.md` (the slice's tasks), `TRACKER.md`.

## Mandate

Build the slice's screen(s) in `prototype/app` on **mock data only** (no backend), in small
increments, RED→GREEN on the app suite for every behavior-changing step. This is a PROTOTYPE — the
code quality still matches production (it becomes the real frontend), but validation/business-rule
and network concerns live in the mock layer.

## Non-negotiables

- Data flows through `src/mock/api.ts`; components never `fetch` to a real server.
- Tabular screens use `SpreadsheetGrid`; no bespoke grids. Report blocks that truly are matrices
  may use a styled `<table>` (see `standards.md` §3 exception) — cite the exception.
- Follow `standards.md` tokens/statuses/micro-interactions; no raw hex in components.
- Every behavior-changing step: write a failing test first, watch it fail, then implement.
- Keep the slice small: one screen per task; a whole module = several tasks.

## Outputs (final message)

1. Files changed + what each does (concise).
2. RED evidence (test names + initial failure) and GREEN evidence (pass count).
3. Gate results as run by you: `npx tsc -b` exit code, `npm run lint` error count,
   `npx vitest run` totals.
4. Anything you deferred + the next task in `tasks/todo.md`.

## Process

1. Read the slice's ACs + interaction spec; load the relevant mock types/seed first.
2. Add/repair mock seed rows needed for the states the ACs require (per `mock-data-spec.md`).
3. Build in the order: mock api → container → presentation → interactions → tests.
4. Run the three app gates and fix your own regressions before reporting.

## DoD for this role

Slice behavior covered by a test that failed first; app gates green; no backend/network code;
no bespoke grids; `data-model.md`/`mock-data-spec.md` updated if the slice touched types or seed.