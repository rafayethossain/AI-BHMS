# BHMS Interactive Prototype — Workstream

> **Status:** ACTIVE · **Owner:** Product/UX (prototype phase) · **Delivery:** Dev team (backend wiring later)
>
> **North star:** Design the **full product surface** as an interactive, high-fidelity prototype on
> mock data — every screen, every grid interaction, every micro-interaction tested and approved —
> **before any backend work**. The prototype **matures into the real frontend**: the mock service
> layer is later swapped for the real API without redoing the UI.

---

## Why this workstream exists

The main repo ships features via strict TDD (RED→GREEN→verify, backend gates). That is correct for
production code but **slow for surfacing product decisions**. This workstream inverts the order:

1. **Design & test the UI first** on dummy data (Tabulator grid, add/view/edit, status flows,
   report print/export, micro-interactions, light/dark theme).
2. **Whatever changes** (features, attributes, layout) is decided here cheaply — no backend code
   is invested in decisions that may flip.
3. **Ship the approved prototype** to the dev team as the interaction spec; they wire the backend
   underneath and it becomes the live frontend.

---

## Quick start

```powershell
# prototype/app
npm install
npm run dev            # http://localhost:5173  (mock data only, NO backend)
npm run test           # vitest          (interaction/unit suite)
npm run lint           # oxlint
npm run build          # tsc -b && vite build
```

No backend, no database, no auth server — every page reads from `src/mock/` (see
`docs/mock-data-spec.md`).

---

## Document map

| Document | Purpose |
|----------|---------|
| `README.md` | This file — entry point, quick start, conventions |
| `ROADMAP.md` | Phases P0–P4, slice grid (PT-###), Definition of Done for a prototype slice |
| `plan.md` | The implementation plan: commands, project structure, code style, testing strategy, boundaries |
| `TRACKER.md` | Slice status scoreboard (⬜ → 🔴 → 🟢 → ✅) with evidence — read the latest entries first |
| `scope.md` | Prototype scope: modules in/out, feature & attribute change log, open questions |
| `standards.md` | UI/UX + Tabulator + grid standards (tokens, spacing, a11y, grid chrome, micro-interactions) |
| `requirements.md` | Prototype requirements mapped from `PRD.md` (RQ-###), user stories, acceptance criteria |
| `data-model.md` | Prototype-facing entity/field model that the mock data must satisfy |
| `mock-data-spec.md` | Dummy-data specification: entities, volumes, statuses, relationships, edge cases |
| `agents/` | Ready-made sub-agent prompts (BA, PM, UX, prototyper, QA, docs) for this workstream |
| `app/` | The standalone Vite + React + Tabulator + Tailwind + Vitest prototype |
| `tasks/` | Active task checklists (`todo.md`) for the slice in progress |

Canonical source docs (authoritative, at repo root): `PRD.md`, `business-rules.md`, `data-model.md`,
`api-design.md`, `uiux-guidelines.md`, `module-specs.md`, `workflow-diagrams.md`, `glossary.md`,
`master-backlog.md`. The prototype copies the *relevant* content into its own docs so it is
self-contained for the dev team; when the two disagree, the prototype docs win **for the prototype
phase only** and the delta goes to `scope.md → "Feature & attribute change log"`.

---

## How a slice works (mini-workflow)

Every prototype slice (PT-###) moves through the same funnel, mirroring the main repo's roles but
scoped to **UI first, mock data only**:

1. **BA** — turn the PRD/module into a prototype requirement + acceptance criteria (`requirements.md`).
2. **PM** — order slices (ROADMAP), sequence, checkpoints.
3. **UX/Dev** — build the screen in `app/` on mock data, with all interactions, following
   `standards.md`. RED→GREEN on the app's own test suite first (micro-interaction proven by a test
   that failed before implementation).
4. **QA** — run the app's gates: `tsc -b`, `lint`, `vitest`, real-browser CDP check for grid/print
   behaviour, light+dark, keyboard/a11y.
5. **Docs** — flip the slice in `TRACKER.md`, record lessons + decision notes, keep `scope.md`
   change log current.

> This mini-workflow is the prototype's **own** definition of TDD. The repo-wide "no backend code
> without a failing backend test" constraint does not apply *inside* the prototype app — the
> prototype has no backend. Every prototype task still ends on a verified state (gates green), and
> any behavior-changing slice starts with a failing test.

---

## Guardrails (prototype-specific)

- **No backend calls.** Every data read/write goes through `src/mock/` — the service API mirrors the
  eventual REST endpoints so the swap to the real API is a drop-in.
- **No extra libraries.** React 19, Tabulator 6, Tailwind 4, Vitest, React Router — if a feature
  seems to need a new dependency, write it in the shell's patterns first (`standards.md` §Design
  constraints) and only escalate with a decision note.
- **Grid = `SpreadsheetGrid`.** The shared Tabulator wrapper is the only grid layer. No bespoke
  grids on new screens (mirror of the main repo's convention).
- **Micro-interactions are first-class.** Delay/stagger, hover/preview popovers, optimisitic status
  flips, drag reorder, inline edit confirmations — each screen's slices call these out explicitly.
- **External reference product is never named** — say "the target requirements" / "reference manual"
  / "Excel-familiar desktop workflow".
- **Commit only when asked**; only push when asked.

---

## Definition of Done — a prototype slice

- [ ] Screen/layout built on `src/mock/` data following `standards.md` (no backend).
- [ ] All planned interactions + micro-interactions present and exercised.
- [ ] Behavior covered by an app test that **failed first** (RED→GREEN) where behavior-changing.
- [ ] App gates green: `npx tsc -b` exit 0 · `npm run lint` 0 errors · `npx vitest run` pass.
- [ ] Where grid/print/export: real-browser check (CDP) with 0 console errors & no exceptions.
- [ ] Light + dark theme pass; keyboard-accessible (WCAG AA) for interactive elements.
- [ ] `TRACKER.md` flipped to ✅ with evidence; lessons/decision note recorded; `scope.md` change
      log current; `ROADMAP.md` forward-link noted.