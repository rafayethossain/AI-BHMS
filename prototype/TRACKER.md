# Prototype Task Tracker — BHMS Interactive Prototype

> Companion to `ROADMAP.md` and `plan.md`. One row per prototype slice (PT-###).
> **Legend:** ⬜ not started · 🔴 RED written (failing test committed to intent) · 🟢 GREEN
> (implemented, gates pass for the slice) · ✅ VERIFIED (gates + evidence + traceability recorded).
> Read the **latest entries first** — recent work sets this session's conventions.

## Phase P0 — Foundation

| ID | Slice | Evidence | Status |
|----|-------|----------|--------|
| PT-001 | Vite + React 19 + TS 6 + Tailwind 4 + Tabulator 6 + Vitest + Oxlint scaffold | `npm run dev`/`build`/`test` green | 🟢 GREEN |
| PT-002 | Design tokens + light/dark theme (`theme/tokens.css`, `theme/tabulator.css`) | ThemeContext toggle + token smoke test | ⬜ |
| PT-003 | `SpreadsheetGrid` wrapper (toolbar, header filters, export, actions col, pagination) | `SpreadsheetGrid.test.tsx` (wrapper contract, mocked Tabulator) + CDP export check | ⬜ |
| PT-004 | Mock service layer (`types.ts`/`seed.ts`/`db.ts`/`api.ts`) | api/seed unit tests + coverage audit vs `mock-data-spec.md` | ⬜ |
| PT-005 | App shell: module rail + top bar + router + dashboard placeholder | `Layout.test.tsx` (4) + `App.test.tsx` (3) RED-first; gates: tsc 0 / lint 0 / vitest 18/18; browser review (theme toggle, dropdowns, placeholders) | ✅ VERIFIED (GATE_A) |
| PT-006 | Design register screen on grid (list, filter, add modal, view, print) | `DesignsPage.test.tsx` (28) RED-first + tsc 0 / lint 0 / vitest 59/59 + live `/design` review | ✅ VERIFIED (GATE_A) |
| PT-007 | Micro-interactions kit (status pill, hover preview, toasts, search-as-you-type) | `StatusPill.test.tsx` (10) + `HoverPreview.test.tsx` (5) + `useOptimistic.test.tsx` (4) RED-first; DesignsPage migrated to `useOptimistic`; gates: tsc 0 / lint 0 (19) / vitest 78/78 (9 files) + live `/design` HTTP 200 | ✅ VERIFIED (GATE_A) |
| **P0 Checkpoint** | dev render + gates green + real-browser clean + human review | — | ⬜ |

## Phase P1 — Core order lifecycle

| ID | Slice | Evidence | Status |
|----|-------|----------|--------|
| PT-010 | Design detail tabs (Overview, Sketches, Versions, File Openings, POs, Items, BOM, Design Images, Tech Packs, incl. Sales Order report block + status wizard) | `DesignDetailPage.test.tsx` (20) RED-first + derive/designDetail contract (35) + register entry test; gates: tsc 0 / lint 0 (22) / vitest **136/136 (12 files)** + live `/design` HTTP 200 | ✅ VERIFIED (GATE_A) |
| PT-010a | Design sheet print (print preview + Save-as-PDF) from register grid, view modal and detail header | `DesignSheetPrintPage.test.tsx` (13) + register row-menu/modal entries (2) + detail header entry (1) RED-first; gates: tsc 0 / lint 0 (24) / vitest **152/152 (13 files)** + live `/designs/REG-1001/print` HTTP 200 | ✅ VERIFIED (GATE_A) |
| PT-010b | Design register **single Actions menu** per row (View, Edit, Delete, Materials, Fit Specs, Job Description, Costings, Print Design Sheet, Sales Report); replaces the inline View/Edit/Delete buttons + separate ⋮ menu | `SpreadsheetGrid.test.tsx` (+4 contract/suppression) + `DesignsPage.test.tsx` (menu order/navigate/Escape/print/no-modal; all View·Edit·Delete paths re-routed) RED-first; gates: tsc 0 / lint 0 (24) / vitest **160/160 (13 files)** + live `/design` HTTP 200 | ✅ VERIFIED (GATE_A) |
| PT-010c | Design Materials page (standalone CRUD route `/designs/:designCode/materials` with table, Add/Edit/Delete modals, breadcrumb back, design header summary) | `DesignMaterialsPage.test.tsx` (16) RED-first; gates: tsc 0 / lint 0 (24) / vitest **177/177 (14 files)** + live `/designs/REG-1001/materials` HTTP 200 | ✅ VERIFIED (GATE_A) |
| PT-011 | FN/version commercial file list + detail | page tests + CDP | ⬜ |
| PT-012 | Purchase Orders list + detail (+ amendments, trail) | page tests + CDP | ⬜ |
| PT-013 | BOM list + detail | page tests | ⬜ |
| PT-014 | Costings list + detail (ladder + prepare PO costing + create PO) | page tests | ⬜ |
| PT-015 | Order Manager dashboard + weekly review print | page tests + CDP | ⬜ |
| PT-016 | Sales Order report print + xlsx | report block tests + CDP | ⬜ |
| PT-017 | Tech-pack import wizard + style progress panel (REQ-p-008) | wizard page tests + CDP | ⬜ |
| **P1 Checkpoint** | end-to-end lifecycle demoable; human review | — | ⬜ |

## Phase P2 — Supporting workflows

| ID | Slice | Evidence | Status |
|----|-------|----------|--------|
| PT-020 | T&A (list/detail/calendar/heatmap) | page tests | ⬜ |
| PT-021 | Commercial (LC, PI, contracts, confirmations, banks) | page tests | ⬜ |
| PT-022 | Debits + invoice approvals + dashboards | page tests | ⬜ |
| PT-023 | Procurement (fabric master, materials POs + print, bookings, orders, schedule, handoffs, tolerances, utilization; RFQ deferred) | page tests + CDP | ⬜ |
| PT-024 | Production (plans, daily, portal, dashboard) | page tests + CDP | ⬜ |
| PT-025 | Quality (inspections, CAPA, dashboard, gold seals, audits) | page tests | ⬜ |
| **P2 Checkpoint** | all secondary modules demoable; human review | — | ⬜ |

## Phase P3 — Logistics, reports, setup

| ID | Slice | Evidence | Status |
|----|-------|----------|--------|
| PT-030 | Logistics (shipments 9-stage, dockets, paperwork comparison, recaps, forward orders, reconciliations, payments, cost reconcile) | page tests + CDP | ⬜ |
| PT-031 | Booking schedule grid (inline edit, last-hit) | page tests | ⬜ |
| PT-032 | Summary reports + report builder/viewer/schedules | page tests + CDP print/export | ⬜ |
| PT-033 | Setup & admin (tenant, offices, master data, users, roles, audit, health) | page tests | ⬜ |
| PT-034 | Help & onboarding | page tests | ⬜ |
| **P3 Checkpoint** | full route surface reachable; human review | — | ⬜ |

## Phase P4 — Polish, QA & delivery

| ID | Slice | Evidence | Status |
|----|-------|----------|--------|
| PT-040 | Full interaction QA pass (every action kind) | QA checklist in evidence | ⬜ |
| PT-041 | A11y + keyboard + light/dark sweep | axe/CDP check | ⬜ |
| PT-042 | Performance pass (grid volumes, virtualization) | CDP timing | ⬜ |
| PT-043 | Mock-data coverage audit | vs `mock-data-spec.md` | ⬜ |
| PT-044 | Handoff pack for dev team | docs + app packaged, review sign-off | ⬜ |

---

## In-progress (current slice)

- **PT-010b (Design register single Actions menu)** — ✅ VERIFIED (GATE_A); see Latest entries. Next slices (menu destinations, "menu first, then pages"): PT-010c Materials page, PT-010d Fit Specs page, PT-010e Job Description (Job Requests) page, PT-010f Costings page — each a standalone route `/designs/:designCode/{materials|fits|jobs|costings}` with seeded mock entities + tests.

## Latest entries

- **2026-09-21 — PT-010c Materials add/edit modal standardized to the shared `Modal` contract (GATE_A)** —
  the standalone Materials page's hand-rolled `<dialog>` form was replaced with the shared `Modal`
  (`standards.md` §5): **centered** via `fixed inset-0 flex items-center justify-center`, standard
  data-entry width `max-w-2xl`, scrollable body `max-h-[75vh] overflow-y-auto pr-1` with the header +
  footer pinned so **all 10 input fields stay visible/reachable** at any viewport height (previously the
  whole form — including the footer — scrolled as one, hiding fields + actions on short screens), plus
  the full a11y contract the raw `<dialog>` lacked: `aria-modal="true"`, focus trap, **Esc close,
  backdrop-click close, and a ✕ `Close dialog` button** (the old dialog also ignored the inherited
  `Button` styling quirks of native `<dialog>` margins). Per §6, **Type is now a master-data `<select>`**
  (Cloth/Trims/Interfacing/Lining/Thread/Others, default Cloth) instead of free-text-with-datalist; Unit
  already was a select. Form gets the standard `Material Information` section header. The **Delete
  confirmation** was converted to the shared `Modal` too (standard footer, ✕, Esc/backdrop close).
  RED-first: `DesignMaterialsPage.test.tsx` **+7** (aria-modal + centered + max-w-2xl panel; Close button
  dismisses; Escape closes; backdrop click closes; scrollable body under pinned header/footer + all
  labels present + section header; Type/Unit master-data selects; delete confirm contract). Gates:
  `npx tsc -b` 0, `npm run lint` 0 errors (**24 warnings**, baseline held), `npx vitest run`
  **177/177 (14 files)** (was 170), live `/designs/REG-1001/materials`: real-browser CDP — panel centered
  (ΔX 8 px = scrollbar, ΔY 0), fits viewport, 10 labelled inputs, Esc closes, theme toggle keeps the
  modal open and it re-themes light→dark, **0 console warnings**. Lesson: never hand-roll a `<dialog>`
  for a modal when `components/Modal.tsx` exists — the shared contract (focus trap, Esc/backdrop/✕,
  `aria-modal`, scrollable body with pinned header/footer) is the standard; the raw `<dialog>` default
  `margin: auto` also made the "centered" claim layout-dependent.

- **2026-09-17 — PT-010b Design register single Actions menu VERIFIED (GATE_A)** — the register grid now
  exposes **one "Actions" trigger per row** (replacing the inline blue View / amber Edit / red Delete text
  buttons **and** the separate ⋮ menu). `SpreadsheetGrid` `actionColumn` now renders the trigger and its menu
  merges the standard **View / Edit / Delete** items with the page-supplied `rowActions`, in order
  `View · Edit · Delete · Materials · Fit Specs · Job Description · Costings · Print Design Sheet · Sales
  Report` (Delete marked `variant: 'danger'`, rendered red). Menu is
  keyboard-accessible (`role="menu"` / `role="menuitem"`, focus-first-on-open, ArrowUp/Down wrap, Escape
  closes and refocuses the trigger) and `aria-haspopup`/`aria-expanded` are maintained. `DesignsPage` supplies
  `Materials`, `Fit Specs`, `Job Description`, `Costings`, `Print Design Sheet`, `Sales Report`; each
  navigates to its **own standalone route** — `/designs/:designCode/{materials|fits|jobs|costings|print|sales-report}`.
  Destinations are per-row pages (single-screen provision); per the user's decision the menu ships **first**
  and those pages follow in PT-010c…f (until then an unbuilt route renders the `Layout` placeholder).
  **Follow-up fix (same slice):** the Actions trigger must open the popup **without** also opening the row's
  view dialog. In a real browser Tabulator fires `cellClick` **and** `rowClick` for the same gesture, so the
  menu opened *underneath* the view modal (the jsdom fake fired only one, hiding the bug); the grid's
  `rowClick` handler now ignores clicks whose target is inside `[data-grid-action]` (`SpreadsheetGrid.tsx`),
  and the `DesignsPage` fake was changed to fire **both** events like the real library so the regression is
  covered. **Second follow-up (same slice):** the popup was still **unreadable because the grid clipped it** —
  Tabulator cells/rows establish an `overflow: hidden` stacking context, so an in-cell absolute menu slid
  *under* neighbouring cells/rows. The menu is now rendered **standard popover style**: created in
  `document.body` with `position: fixed` (z-index 65, above the grid and the layout dropdown, below the
  modal at 70 / toast at 100), positioned from the trigger's `getBoundingClientRect()` and flipped up /
  clamped to the viewport when it would overflow; item actions are wired directly (no cell-click
  round-trip), and it closes on outside `mousedown`, page scroll, window resize, Escape, or item pick
  (auto-removed on grid teardown).
  RED-first: `SpreadsheetGrid.test.tsx` +4 (single `__actions` column, no `__rowmenu`, present when
  `actionColumn` **or** `rowActions`, rowClick suppression on action controls); `DesignsPage.test.tsx` +6
  (ordered all-items menu, Actions-open-does-not-open-dialog, body-level-layer/no-`.tabulator-cell`-clip,
  standalone-route navigation, Escape close, print) and every existing View/Edit/Delete test re-routed
  through the menu (removed inline action selectors). Gates: `npx tsc -b` 0, `npm run lint` 0 errors
  (**24 warnings**, baseline held — bare `vi.fn()` in a new test briefly raised it; typed instead),
  `npx vitest run` **161/161 (13 files)**, live `/design` HTTP 200. Lessons: items inside a `role="menu"`
  expose **`role="menuitem"`** (not `button`) to testing-library queries; **`rowClick` fires alongside
  `cellClick` in real Tabulator — a fake that fires only one masks the interaction bug**; **Tabulator cells
  clip absolutely-positioned children, so any in-grid popover must be portaled to `document.body` with
  fixed positioning** (jsdom can't see clipping, so assert the menu's parent is `document.body`); `React`
  was not imported (JSX runtime is automatic); the merged-items resolver must be read from a `WeakMap`
  captured at open time (not recomputed by index) so the standard + custom mix stays stable.
- **2026-09-17 — PT-010a Design sheet print VERIFIED (GATE_A)** — new bare route
  `/designs/:designCode/print` (`DesignSheetPrintPage.tsx`, registered **outside** the `Layout` shell so no
  rail/top-bar prints) replicating the target `frontend` sheet: BHMS badge + "Design Sheet" header, buyer
  (emerald) + design code panels, **File = current version FN** (`FO-2025-102` for REG-1001) and
  JS-capitalised status; 9 design-info fields (Issue Date/Block/Version/Size/Designer/Issuer/Length/
  Description/Note); Sketch (image or "No sketch uploaded"); **Material Breakdown** table
  (Type · Description/Code · Location · Supplier · Colour · W/Size · Qty · Unit) with **tick-to-include**
  filtering and a recomputed running total (REG-1001 → 5.42; ticking only SANDWASH LINEN → 1.67),
  "No material items" empty state; print footer + timestamp. **Preview** toggle hides the toolbar
  actions and shows "Exit Preview"; **Print** calls `window.print()` (browser Save-as-PDF); `@page A4` +
  `.no-print` + white `.print-area` on grey `#eef2f7` surround. Entry points: register grid **⋮ row-actions
  menu** ("Print Design Sheet" via `SpreadsheetGrid.rowActions`), register **view-modal footer** link, and
  the detail **header** link (replaces the raw `window.print()` button). RED-first:
  `DesignSheetPrintPage.test.tsx` (13) failed on the missing module; +2 register entry tests +1 detail
  entry test. Gates: `npx tsc -b` 0, `npm run lint` 0 errors (**24 warnings** — +2 same-class
  `set-state-in-effect` as the detail page), `npx vitest run` **152/152 (13 files)**, live
  `/designs/REG-1001/print` HTTP 200. Deviations: Fit Specs section omitted (prototype data model has no
  fit-spec entity) and material col `Match` → `Unit`. Lessons: seed `size` is **`S–XL` with an en-dash
  (U+2013)** — copy the exact glyph (terminals render it as a hyphen, which cost a failed test); capitalise
  status in JS, not CSS-only; toast assertions (`Design created/updated/deleted`) need a 5000 ms budget
  under full-suite parallel load — two pre-existing PT-006 create tests flaked once the print suite added
  parallel load (module is fast alone, red only in the full run).
- **2026-09-16 — PT-010 Design detail VERIFIED (GATE_A)** — `/designs/:designCode` page with **10 tabs**:
  Overview (design info `dl` + design-level Sales Order risk row + **status wizard** Draft→Active→
  Archived with optimistic `updateDesign` + toasts), Sketches, Versions (FN numbers, flags, Current
  badge), File Openings, Purchase Orders (View PO drill-down links), Items, BOM (category/status
  badges), Design Images, Tech Packs (per-section import progress), **Sales Order report block**
  (version selector + per-PO Fabric/Trims/Production/Delivery/Overall risk matrix + Open drill-down;
  REG-1004 → 11 PO rows, red fabric + overdue row, delivered green row). Entry point is **additive**:
  register quick-view modal kept, footer gains "Open full design" → navigates to the detail page
  (PT-006's 29 register tests untouched except MemoryRouter wrap for the new `useNavigate`).
  RED-first: `DesignDetailPage.test.tsx` (20 tests across 10 tab describes + shell) failed on missing
  module before implementation; `App.test.tsx` gained a `/designs/REG-1001` route test; register
  gained a navigate test. Decision note: detail tabs render styled **report-block tables** (ReportTable),
  not `SpreadsheetGrid` — read-only reports are covered by the §3 SO-report exception and jsdom can't
  assert Tabulator rows; grid stays for list screens. Gates: `npx tsc -b` 0, `npm run lint` 0 errors
  (22 baseline warnings — +3 new files), `npx vitest run` **136/136 (12 files)**, live `/design`
  HTTP 200. Lessons: status string values (e.g. version `approved`) need a `StatusPill` map entry
  (added `approved`); `DesignRegisterRow` isn't assignable to `Record<string, unknown>` without an
  index signature — type `OverviewTab` props with the concrete row type + `keyof`; `mock-data-spec.md`
  lists ~12 POs across the register but REG-1004 detail carries 11 (guaranteed demo) — documented
  deviation. Header "+Create File Opening / +Create PO / +Add Update" render and toast in this slice;
  their full behavior is owned by PT-011/PT-012.
- **2026-09-16 — PT-007 Micro-interactions kit VERIFIED (GATE_A)** — three kit components landed:
  **`StatusPill`** tokenized to `@theme`-covered shades (emerald-300–600, blue-300/600, amber-400/600,
  teal-300/400, purple-400/600, red-300/400, slate-100/dark:surface-800 fallback) — `emerald-700`
  removed (static color broke dark mode); label text capitalized at render time (was relying on
  `capitalize` CSS, which left raw textContent lowercase); new `pulse` prop + `data-testid` pass-
  through. **`HoverPreview`**: `relative inline-block` wrapper; opens on `mouseEnter`/`focus`, closes
  on `mouseLeave`/`blur`; tooltip popover (role tooltip, z-30, border-surface, shadow-xl) with title
  + label/value pairs; preview stays open when hovered; no `pointer-events-none` needed (hover stays
  open over the popover because it's a descendant). **`useOptimistic` hook**: applies partial patch
  immediately, replaces with authoritative row on resolve, rolls back + rethrows on reject; inserts
  new row when id wasn't present. `DesignsPage` migrated: both `handleCellEdited` and `handleSave`
  (edit path) now call `optimistic()` → rollback on failure; create path still uses `createDesign` +
  full `load()`. RED-first: 19 kit tests failed before implementation (4 missing-file, 4 StatusPill
  class/label + 2 new mocks + 1 exhaustive-deps lint). Gates: `npx tsc -b` 0, `npm run lint` 0
  errors (19 baseline warnings — added 2 `vi.fn` type-param warnings in test + 1 exhaustive-deps
  from hook swap, then fixed both to stay flat at 19), `npx vitest run` **78/78 (9 files)**, live
  `/design` HTTP 200. Lessons: StatusPill label should capitalize in code (not rely on CSS `capitalize`
  class) so screen-reader textContent and test queries match; `useOptimistic<T extends {id}>` works
  with `DesignCreateInput` (structural subset) without cast; when a hook's `setItems` is not the
  raw `useState` setter, exhaustive-deps requires adding it to the dependency array.
- **2026-09-16 — PT-006 Design register VERIFIED (GATE_A)** — register grid (list/filter/add/
  view/edit/delete/export/print chrome) + **New Design modal** (full Design Information: Style Type/
  Category/Buyer/Issuer as `<select>`s keyed from seed masters, Block/Designer/Status/Issue Date/Size/
  Length, Description + Design Notes side-by-side, Sketch, **Materials Breakdown grid editor** with
  "Add material" → new row in a bordered table grid, per-row ✕ remove) + **view modal** (no longer
  clipped: `max-w-3xl`, `max-h-[75vh] overflow-y-auto`, materials as a scrollable table). Materials
  sections in BOTH modals get both-axis scroll + `min-h-[180px]` for stable input area. RED-first:
  `DesignsPage.test.tsx` 28 tests across 6 describes (register, view modal, materials breakdown,
  creation, edit, materials-grid UI/UX, dropdown/scroll) — new suites failed before implementation
  (4 grid tests, then 2 dropdown/scroll tests, then 1 both-axis/min-height test), 2 legacy create
  tests migrated from `user.type` to `selectOptions` (selects ignore keyboard). Gates: `npx tsc -b`
  0, `npm run lint` 0 errors (19 baseline warnings), `npx vitest run` **59/59 (6 files)**, live
  `/design` HTTP 200 + browser-reviewed. CDP pass deferred (devtools MCP down). Lessons: vitest
  `testTimeout: 15000` in `vite.config.ts` (Edit modal renders 6 material rows → 5s default timed out
  under full-suite load); `userEvent.type` is a no-op on `<select>` — use `selectOptions`;
  `getBoundingClientRect()` returns 0 in jsdom (assert structure, not layout); `<datalist>` option
  trips `jsx-a11y/control-has-associated-label` — `// oxlint-disable-next-line` (back to 19 baseline
  warnings); duplicate texts (BLACK in 2 material rows) → `getAllByText`.
- **2026-09-15 — PT-005 app shell VERIFIED (GATE_A)** — `ThemeContext` (ported 1:1 from target
  `frontend`, `.dark` class + `bhms-theme` storage), `Layout` (module rail mirroring target nav,
  theme toggle, mobile menu), router shell (`/`→`/dashboard`, unbuilt → placeholder), dashboard
  placeholder with module cards. RED-first: `Layout.test.tsx` (4) + `App.test.tsx` (3). Gates:
  `npx tsc -b` 0, `npm run lint` 0 errors, `npx vitest run` 18/18. Browser review approved incl.
  theme toggle persistence. Lesson: prototype `npm install` needs `--legacy-peer-deps`
  (npm 11.4.2 arborist `edgesOut` crash) + explicit `@testing-library/dom@^10.4.1` devDep.
- **2026-09-15 — PT-001 scaffold gates green** — first real gate run on `prototype/app`:
  `tsc -b` 0 / `lint` 0 / `vitest` 18/18 (11 grid + 7 shell). Tabulator pinned `^5.6.1`
  (+ types `^6.3.6`) mirrors target `frontend`.
- **2026-09-15 — PT-001 seed scaffold** — `prototype/app` created (Vite 8, React 19, TS 6, Tailwind
  4, Tabulator 6, Vitest, Oxlint); workstream docs shipped in `prototype/`. GATE: app gates green
  (see evidence line in PT-001 when run).
- **2026-09-15 — Business workflow v2** — `business-workflow.md` canonicalized: FN rides the version,
  materials booking + print in scope (materials POs + terms/clauses), RFQ deferred, accessories/other
  added to the materials breakdown, PO ladder derived from version costing. Docs updated:
  `requirements.md`, `data-model.md`, `scope.md`, `mock-data-spec.md`, `ROADMAP.md`.