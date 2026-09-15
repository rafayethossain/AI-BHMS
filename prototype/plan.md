# Prototype Implementation Plan

> The "how" for building the interactive prototype. Pair with `ROADMAP.md` (what/when) and
> `standards.md` (design rules). This is the spec every agent and the dev team operate against.

## Objective

Build a high-fidelity, interactive prototype of the **full BHMS product surface** (see `scope.md`)
that runs **entirely on mock data**, exercising every planned interaction — Tabulator data grid
(chrome, edit, export), add/view/edit flows, status workflows, report print/export, dashboards, and
**micro-interactions** — then hand the approved prototype to the dev team so they connect the
backend. The prototype **becomes the real frontend**; the mock service is the API contract.

## Tech stack (locked)

| Concern | Choice |
|---------|--------|
| Framework | React 19 + TypeScript 6 (strict) |
| Bundler / dev server | Vite 8 (Rolldown), `@vitejs/plugin-react` |
| Styling | Tailwind CSS 4 (CSS-first via `@tailwindcss/vite`), semantic CSS variables |
| Grid | Tabulator 6 via a single shared `SpreadsheetGrid` wrapper (+ `react-tabulator`) |
| Routing | React Router 7 (same route map as the target frontend) |
| Data | In-app mock service layer (`src/mock/`) — NO axios/backend calls in prototype |
| Tests | Vitest 4 + jsdom + Testing Library; real-browser CDP for grid/print |
| Lint | Oxlint (0 errors) |

## Commands (prototype/app)

```powershell
npm install          # install deps
npm run dev          # start Vite dev server on :5173 (mock data only)
npm run test         # vitest run (full app suite)
npm run lint         # oxlint
npm run build        # tsc -b && vite build
npx tsc -b           # type check only
```

## Project structure (prototype/app)

```
app/
├── index.html
├── package.json
├── vite.config.ts            # react + tailwind plugins, vitest config
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── .oxlintrc.json
├── src/
│   ├── main.tsx              # entry: router + theme provider
│   ├── App.tsx               # module shell + route table (mirrors target routes)
│   ├── theme/
│   │   ├── tokens.css        # design tokens (colors, spacing, type) + dark/light
│   │   └── tabulator.css     # Tabulator light/dark theme overrides
│   ├── components/
│   │   ├── SpreadsheetGrid/  # THE shared Tabulator wrapper (chrome + export + actions)
│   │   ├── StatusPill/
│   │   ├── Modal/  Drawer/  Toast/  Confirm/
│   │   └── PageChrome/        # page header, toolbar, empty/loading/error states
│   ├── mock/
│   │   ├── types.ts          # entity types (the future API contract)
│   │   ├── seed.ts           # dummy data per entity (see mock-data-spec.md)
│   │   ├── db.ts             # in-memory store with latency simulation
│   │   └── api.ts            # async functions mirroring REST endpoints
│   ├── pages/                 # one folder per module+screen
│   └── tests/                 # app-level test setup + shared fixtures
```

## Code style

- Components are co-located (component + its test + types together), split below ~200 lines.
- `import type { ... }` for all type-only imports (Rolldown requirement).
- Semantic Tailwind tokens (`bg-surface`, `text-primary`, `border-default`) + semantic status
  classes; **no raw hex in components** (hex lives in `theme/tokens.css`).
- Container/presentation split for data-bound screens: page fetches from `mock/api.ts`, dumb
  components render.
- Micro-interactions expressed as small focused components/hooks (see `standards.md` §Micro-interaction kit).
- No `any`; no unused vars (tsc strict + oxlint enforce). No comments unless they explain a non-obvious
  decision.

## Testing strategy

- **Vitest + jsdom** for: pure helpers, reducers, mock API resolvers, component interactions
  (clicks open modals, status flips, search filters, empty/error states). Tabulator module binding is
  real in the browser only — jsdom tests use a mock or assert on the wrapper's contract.
- **Real-browser (CDP / devtools MCP)** for anything grid-runtime dependent: export/download,
  drag/row-actions, print dialogs — assert `console.errors == 0`, no exceptions, rendered row counts.
- Every behavior-changing slice starts with a **failing test** (RED), then the implementation
  (GREEN), then the app gates. This mirrors the repo TDD rule but is scoped to the app.

## Boundaries (Always / Ask first / Never)

**Always**
- Run `npx tsc -b`, `npm run lint`, `npm run test` before declaring a slice done.
- Follow `standards.md` (tokens, spacing, status semantics, a11y, grid conventions).
- Keep routes identical to the target frontend route map (so backend wiring is a drop-in).
- Keep mock `api.ts` signatures REST-shaped (GET list, GET detail, POST create, PATCH update, action).

**Ask first**
- Adding a new dependency (justify in a decision note; prefer shell patterns).
- Changing a route path or a shared component consumed by other slices (blast radius).
- Expanding mock-data scope beyond `mock-data-spec.md` without a tracked note.
- Changing design tokens/status semantics (shared across every screen).

**Never**
- Call a backend/network API from the prototype (no `axios`, no `fetch` to :8000).
- Duplicate grid behaviour outside `SpreadsheetGrid`.
- Break TDD on the app suite (RED not proven = slice not done).
- Name the external reference product (use "the target requirements" / "reference manual").

## Success criteria (prototype phase complete)

- Every slice in `ROADMAP.md` P0–P4 is ✅ VERIFIED in `TRACKER.md` with real gates + evidence.
- Every planned interaction kind (grid chrome incl. export/print, add/view/edit/delete, status
  workflows, search/filter/sort/pin/choose columns, micro-interactions) is exercised on at least one
  approved screen, and at most fully on the core lifecycle.
- Light/dark + a11y sweep green on the full surface.
- `requirements.md`, `standards.md`, `data-model.md`, `mock-data-spec.md`, `ROADMAP.md`, `TRACKER.md`
  and the app are packaged (handoff pack) and approved for the dev team to connect the backend.

## Risks & mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Prototype drifts from eventual API shape → backend rework | High | Mock `api.ts` mirrors REST contract; `data-model.md` is the frozen contract; review at PT-044 |
| Tabulator version drift vs current frontend | Med | Pin Tabulator 6 + react-tabulator versions; wrapper isolates the library |
| Slipping into backend-thinking (validation/DB constraints) in UI | Med | Boundaries "Never call backend"; mock layer resolves everything |
| Micro-interactions balloon scope per screen | Med | Kit-first (PT-007) + per-slice explicit list; anything new = decision note |
| Parallel agents diverge on conventions | Med | `standards.md` + `SpreadsheetGrid` + agent prompts in `agents/`; shared-blast-radius slices kept sequential |

## Open questions (tracked in `scope.md` too)

1. Auth/login screen — mock or deferred until backend wiring? (default: deferred; shell uses a
   mock session so reviewers skip login)
2. Which attributes change per module as a result of review? Logged in `scope.md` change log.
3. Report print format for each report type (A4 vs A3 landscape) — confirm in P3 review.