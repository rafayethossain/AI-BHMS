# Prototype Task Tracker — BHMS Interactive Prototype

> Companion to `ROADMAP.md` and `plan.md`. One row per prototype slice (PT-###).
> **Legend:** ⬜ not started · 🔴 RED written (failing test committed to intent) · 🟢 GREEN
> (implemented, gates pass for the slice) · ✅ VERIFIED (gates + evidence + traceability recorded).
> Read the **latest entries first** — recent work sets this session's conventions.

## Phase P0 — Foundation

| ID | Slice | Evidence | Status |
|----|-------|----------|--------|
| PT-001 | Vite + React 19 + TS 6 + Tailwind 4 + Tabulator 6 + Vitest + Oxlint scaffold | `npm run dev`/`build`/`test` green | 🟢 GREEN |
| PT-002 | Design tokens + light/dark theme (`theme/tokens.css`, `theme/tabulator.css`) | `theme/__tests__/gridTheme.test.ts` + `ThemeContext.test.tsx` (4); theme toggle re-checked live in the PT-005/PT-010c browser reviews | 🟢 GREEN (theme/shell tests are 4 of the 12 documented jsdom-env `localStorage.clear` failures on this machine — env, not app) |
| PT-003 | `SpreadsheetGrid` wrapper (toolbar, header filters, export, actions col, pagination) | `SpreadsheetGrid.test.tsx` (17 — incl. 2 new RED-first cases: rebuilt table must not be re-fed; a feed must wait for `tableBuilt`) + `SpreadsheetGridChrome.test.tsx` (wrapper/chrome contract, mocked Tabulator) + live `/design` grid checks | ✅ VERIFIED (GATE_A + full frontend suite) — the React-19 console `TypeError: Cannot read properties of null (reading 'verticalFillMode')` is **fixed** (stale `lastFedRef` seed → pre-`_create()` `setData`; + `tableBuilt` guard for in-build-window changes); see Latest entry |
| PT-004 | Mock service layer (`types.ts`/`seed.ts`/`db.ts`/`api.ts`) | `derive.test.ts` + `designDetail.test.ts` + `fitSpecs.test.ts` + DesignsPage/materials coverage; audited vs `mock-data-spec.md` | ✅ VERIFIED (GATE_A) |
| PT-005 | App shell: module rail + top bar + router + dashboard placeholder | `Layout.test.tsx` (4) + `App.test.tsx` (3) RED-first; gates: tsc 0 / lint 0 / vitest 18/18; browser review (theme toggle, dropdowns, placeholders) | ✅ VERIFIED (GATE_A) |
| PT-006 | Design register screen on grid (list, filter, add modal, view, print) | `DesignsPage.test.tsx` (28) RED-first + tsc 0 / lint 0 / vitest 59/59 + live `/design` review | ✅ VERIFIED (GATE_A) |
| PT-006a | Design Register responsive shell fix (fluid full-width container, responsive gutters, viewport-height grid; Dashboard reading-width cap centred) | `DesignsPage.test.tsx` (+3) + new `DashboardPage.test.tsx` (2) RED-first; gates: tsc 0 / lint 0 errors (24 baseline warnings) / vitest **195 passed / 12 pre-existing jsdom-env failures (17 files)** + CDP `/design` (shell `max-width: none`, grid fills content width, horizontal scroll intact) / `/dashboard` (cap centred) | ✅ VERIFIED (GATE_A) |
| PT-007 | Micro-interactions kit (status pill, hover preview, toasts, search-as-you-type) | `StatusPill.test.tsx` (10) + `HoverPreview.test.tsx` (5) + `useOptimistic.test.tsx` (4) RED-first; DesignsPage migrated to `useOptimistic`; gates: tsc 0 / lint 0 (19) / vitest 78/78 (9 files) + live `/design` HTTP 200 | ✅ VERIFIED (GATE_A) |
| **P0 Checkpoint** | dev render + gates green + real-browser clean + human review | — | ⬜ |

## Phase P1 — Core order lifecycle

| ID | Slice | Evidence | Status |
|----|-------|----------|--------|
| PT-010 | Design detail tabs (Overview, Sketches, Versions, File Openings, POs, Items, BOM, Design Images, Tech Packs, incl. Sales Order report block + status wizard) | `DesignDetailPage.test.tsx` (20) RED-first + derive/designDetail contract (35) + register entry test; gates: tsc 0 / lint 0 (22) / vitest **136/136 (12 files)** + live `/design` HTTP 200 | ✅ VERIFIED (GATE_A) |
| PT-010a | Design sheet print (print preview + Save-as-PDF) from register grid, view modal and detail header | `DesignSheetPrintPage.test.tsx` (13) + register row-menu/modal entries (2) + detail header entry (1) RED-first; gates: tsc 0 / lint 0 (24) / vitest **152/152 (13 files)** + live `/designs/REG-1001/print` HTTP 200 | ✅ VERIFIED (GATE_A) |
| PT-010b | Design register **single Actions menu** per row (View, Edit, Delete, Materials, Fit Specs, Job Description, Costings, Print Design Sheet, Sales Report); replaces the inline View/Edit/Delete buttons + separate ⋮ menu | `SpreadsheetGrid.test.tsx` (+4 contract/suppression) + `DesignsPage.test.tsx` (menu order/navigate/Escape/print/no-modal; all View·Edit·Delete paths re-routed) RED-first; gates: tsc 0 / lint 0 (24) / vitest **160/160 (13 files)** + live `/design` HTTP 200 | ✅ VERIFIED (GATE_A) |
| PT-010c | Design Materials page (standalone CRUD route `/designs/:designCode/materials` with table, Add/Edit/Delete modals, breadcrumb back, design header summary) | `DesignMaterialsPage.test.tsx` (16) RED-first; gates: tsc 0 / lint 0 (24) / vitest **177/177 (14 files)** + live `/designs/REG-1001/materials` HTTP 200 | ✅ VERIFIED (GATE_A) |
| PT-010d | Design **Fit Specs** page (standalone CRUD route `/designs/:designCode/fits` with table, Add/Edit/View/Delete modals, **Set Current** action, breadcrumb back, design header summary + current spec) | `DesignFitSpecsPage.test.tsx` (19) + `mock/__tests__/fitSpecs.test.ts` (6) RED-first; gates: tsc 0 / lint 0 (24) / vitest **190 passed / 12 pre-existing jsdom-env failures (16 files)** + real-browser CDP `/designs/REG-1001/fits` (4 rows, 0 console errors) | ✅ VERIFIED (GATE_A) |
| PT-010e | Design **Job Requests** page (standalone CRUD route `/designs/:designCode/jobs` with table, Add/Edit/View/Delete modals, **overdue** due-date marker, breadcrumb back, design header summary + open count) — also corrected the register Actions-menu label from "Job Description" to the target's **"Job Requests"** | `DesignJobsPage.test.tsx` (20) + `mock/__tests__/jobs.test.ts` (4) RED-first; `DesignsPage.test.tsx` menu-order assertion corrected ("Job Requests"); gates: tsc 0 / lint 0 errors (24 baseline warnings) / vitest **219 passed / 12 pre-existing jsdom-env failures (19 files)** + real-browser CDP `/designs/REG-1001/jobs` (4 rows, 0 console errors) | ✅ VERIFIED (GATE_A) |
| PT-010f | Design **Costings** page (standalone CRUD route `/designs/:designCode/costings` with table, Add/Edit/View/Delete modals, per-PO **Set Live** tick — mutually exclusive within a purchase order, computed **total cost + margin %**, breadcrumb back, design header summary + live count) | `DesignCostingsPage.test.tsx` (21) + `mock/__tests__/costings.test.ts` (5) RED-first; gates: tsc 0 / lint 0 errors (24 baseline warnings) / vitest **245 passed / 12 pre-existing jsdom-env failures (21 files)** + real-browser CDP `/designs/REG-1001/costings` (4 rows, modal contract, 0 console errors) | ✅ VERIFIED (GATE_A) |
| PT-011 | Design **version commercial file** — the v2 model (FN rides the version; **no separate File Opening layer**): sub-page `/designs/:designCode/versions/:versionId` with **Details**, **Quick Stats**, **Quick Lead** (department agreement, 4 parties), **Repeats** (department approvals + original FN), **Stock Fabric** (swatch description, total/allocated/balance meters, per-order allocations), **Notes** (+ Add Update); the version's POs under its FN on a **Purchase Orders** tab. Entry: Design detail → **Versions** tab (FN + "Open file →" links) and header **+ Add Update** → current version's file. Removed the redundant **File Openings** tab + the standalone `/file-openings` nav link | `pages/__tests__/VersionCommercialFilePage.test.tsx` (11) + `mock/__tests__/commercialFile.test.ts` (10) + `DesignDetailPage.test.tsx` (versions→file link + `+ Add Update` nav; File Openings tab removed) RED-first; gates: tsc 0 / lint 0 errors (25 warnings) / vitest **283 passed / 12 pre-existing jsdom-env failures (25 files)** + real-browser CDP `/designs/REG-1001/versions/design-01-v1` (flags Quick lead·Repeat·Stock fabric; quick-lead 1/4 agreed; stock 500/120/380; 0 console errors), `/designs/REG-1001/versions/design-01-v2` PO tab (3 POs), `/designs/REG-1001` (9 tabs, no File Openings, Versions→file links, 0 console errors) | ✅ VERIFIED (GATE_A) |
| PT-012 | Purchase Orders list + detail (lifecycle tabs: Overview / Items / Hits / Amendments / History; risk matrix; item + hit CRUD; amendment request/approve/reject; trail) | `PurchaseOrdersPage.test.tsx` (5) + `mock/__tests__/purchaseOrders.test.ts` (9) + `PurchaseOrderDetailPage.test.tsx` (11) + `mock/__tests__/poDetail.test.ts` (11) RED-first; gates: tsc 0 / lint 0 errors (25 baseline warnings) / vitest **319 passed / 12 pre-existing jsdom-env failures (29 files)** + real-browser CDP `/purchase-orders` (33 rows) and `/purchase-orders/PO-2025-0001` (5 tabs, item add, amendment approve, trail; caught + fixed a **duplicate-trail-key** bug; 0 console errors) | ✅ VERIFIED (GATE_A) |
| PT-013 | BOM list + detail | page tests | ⬜ |
| PT-014 | Costings list + detail (ladder + prepare PO costing + create PO) | page tests | ⬜ |
| PT-015 | Order Manager dashboard + weekly review print | page tests + CDP | ⬜ |
| PT-016 | Design **Sales Report** print page (standalone route `/designs/:designCode/sales-report` with print-optimized A4 layout, version selector, per-PO Fabric/Trims/Production/Delivery/Overall risk pills, rolled-up totals, **Print** + **CSV export**, drill-down to PO) | `DesignSalesReportPage.test.tsx` (11) + `pages/__tests__/salesReport.test.ts` (3) RED-first; gates: tsc 0 / lint 0 errors (24 baseline warnings) / vitest **259 passed / 12 pre-existing jsdom-env failures (23 files)** + real-browser CDP `/designs/REG-1004/sales-report` (11 rows, totals 17,050 / 62,925.00, version switch → empty state, 0 console errors) | ✅ VERIFIED (GATE_A) |
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

_None — **PT-012 Purchase Orders list + detail is ✅ VERIFIED (GATE_A)** (see Latest entry)._
Next up: **PT-013 BOM list + detail** (REQ-p-012 / RQ-021·022; PRD §6.3.5) — trims/labels/T&A schedule,
copy-trims-from-order. Triage not yet written; the slice's three sub-parts (BOM list grid, BOM detail
tabs, copy-from-order) will follow the PT-012 list→detail split if the same triage (P1, additive mock
rows, GATE_A) holds.

## Latest entries

- **2026-10-12 — PT-012 Purchase Orders list + detail VERIFIED (GATE_A)** — the Merchandising order-lifecycle
  surface, split into **PT-012a list** (`/purchase-orders`) + **PT-012b detail** (`/purchase-orders/:poNumber`)
  under one tracker row (PT-012c trail needed no separate slice — the trail is the detail's History tab).
  **012a:** a register-wide grid aggregating **every design's** POs (33 rows) from the single source of truth
  — `db.getPurchaseOrders` walks `designs × details[...].pos` and maps each through a new pure helper
  `mock/purchaseOrders.ts` (`destinationFor`/`originFor`/`addDays`/`poDateFor`/`actualDeliveryFor`/`riskLabel`/
  `poStatusLabel`/`toPurchaseOrderRow`) that derives the 5 risk labels (Fab/Trims/Prod/Deliv/Overall) from the
  existing `derivePoStatuses`, plus status, search, group/export grid chrome and a row-click → detail. Risk is
  shown as **text labels** (the reference pre-formats risk labels; `SpreadsheetGrid` has no cell formatters).
  **012b:** the detail page — header (back link, PO #, status pill, FN · design · style type · buyer · factory)
  + 5 tabs **Overview** (details grid + risk matrix + Open Design / Open File drill-downs), **Items**
  (`ReportTable` + Add/Edit/Delete with a shared `Modal`), **Hits** (boxed/hanging · sea/air + Add/Edit/Delete),
  **Amendments** (request + Approve/Reject on `requested` rows only), **History** (the trail timeline). Children
  are seeded deterministically per PO by `mock/poDetail.ts` (`poItemsFor`/`poHitsFor`/`poAmendmentsFor`/
  `poTrailFor`); **every PO gets exactly 3 amendments** (requested / approved / rejected by construction) so
  Approve/Reject is always demoable and tests are deterministic; items cover the PO quantity exactly. New
  mutable `poChildren` store in `db.ts` (`getPurchaseOrderDetail` + item/hit CRUD + `requestAmendment`/
  `approveAmendment`/`rejectAmendment`), each CRUD action **appending a trail event**; `api.ts` mirrors all of
  them. **RED-first:** `mock/__tests__/purchaseOrders.test.ts` (list) + `PurchaseOrdersPage.test.tsx` (5) + the
  two detail suites `mock/__tests__/poDetail.test.ts` + `PurchaseOrderDetailPage.test.tsx`. **A real bug the browser caught that jsdom missed:** pushed trail events used the **same id namespace**
  as the seeded events (`${poNumber}-trail-N`) → **duplicate React keys** on every CRUD append (0 in tests,
  visible in the console). Fixed by giving pushed events the `po-trail-` namespace (consistent with the
  `po-item-`/`po-hit-`/`po-amd-` pushed-id convention) and guarded by a **new RED-first uniqueness test**
  (`keeps every child id unique …`). **Gates:** `npx tsc -b` 0, `npm run lint` **0 errors / 25 warnings**
  (baseline held — an initial new `set-state-in-effect` warning was removed by moving the load into an async
  effect with a `cancelled` guard), `npx vitest run` **319 passed / 12 failed (29 files)** — the 12 are the
  documented jsdom-env `window.localStorage.clear is not a function` allowlist (`Layout`/`ThemeContext`/`App`);
  green grew 297 → 319. **Real-browser CDP:** `/purchase-orders` 33 rows with correct risk labels, row click →
  `/purchase-orders/PO-2025-0001`; detail renders the 5 tabs, Overview risk matrix (On Track ×1 / At Risk ×2 /
  No Status ×2) + drill-down links, Items 4 quantity-covering rows, item add → 5th row + summary bump,
  amendments exactly one Approve/Reject, approve → status flips to Approved, History trail appends the
  line-item + amendment events in order, **0 console errors** after the key fix.

- **2026-10-12 — PT-011 Design version commercial file VERIFIED (GATE_A)** — **plan correction first:** the
  earlier reading of PT-011 as a *separate cross-design "File Openings" module* was wrong. Per
  `business-workflow.md` v2 §1 + the decisions log, **the FN rides the design version and replaces the separate
  File Opening layer** — a style/design is created directly to order, so there is no extra file-opening entity;
  the commercial file *is* the version. The half-built `/file-openings` module (a cross-design register) was
  **reverted** before rebuilding. Rebuilt the v2 way: a **version commercial-file sub-page** at
  `/designs/:designCode/versions/:versionId`, reached from the Design detail **Versions** tab and the header
  **+ Add Update** action. Content: **Details** (FN, design, buyer, factory, version, dates, qty, unit price) +
  **Quick Stats** (PO count); **Quick Lead** panel (mark/unmark + per-department **Agree** — misleading/unmarking
  clears agreements — over the canonical 4 parties merchandising/production/quality/commercial); **Repeats**
  panel (create a repeat of the FN + per-department **Confirm Repeat** approvals); **Stock Fabric** panel
  (mark with swatch **description** + **total meters**, then **Allocate Meters** to a destination file — shows
  total / allocated / **balance** and the allocation list); **Notes** (`+ Add Update` appends a dated
  author/action/note row); and a **Purchase Orders** tab listing the version's POs **under its FN** (status pill,
  factory, delivery, qty, value, drill-down). **Mock layer:** new mutable `details: Record<string, DesignDetailCore>`
  in `db.ts` (reads routed through it; `resetDb` re-clones) so actions persist and **reflect back on the Design
  detail Versions tab**; new pure helper module `mock/commercialFile.ts` (`COMMERCIAL_FILE_PARTIES`,
  `splitParties`/`joinParties`/`missingParties`, `flagLabels`, `allocatedMeters`, `toCommercialFile`); additive
  `DesignFileOpening` stock fields (`stock_description?`, `total_meters?`, `allocations?`) + new `StockAllocation`
  / `StockAllocationInput` / `CommercialFileDetail` types; `db.ts`/`api.ts` actions
  (`getCommercialFile`, `setQuickLead`, `agreeQuickLead`, `createRepeat`, `approveRepeat`, `setStockFabric`,
  `allocateStock`, `addCommercialFileNote`). **Integration:** Design detail **File Openings tab removed** (was
  redundant with Versions, which now carries the FN→file links), the header **+ Create File Opening** button
  removed (no separate layer), **+ Add Update** now navigates to the current version's file; the standalone
  **`/file-openings` nav link removed** (Merchandising = Purchase Orders + BOMs) and the Dashboard module card
  repointed to `/purchase-orders`. **RED-first:** `mock/__tests__/commercialFile.test.ts` (10) +
  `pages/__tests__/VersionCommercialFilePage.test.tsx` (11) + `DesignDetailPage.test.tsx` updates (renders **9**
  tabs; a Versions→`Open file →` link test; a `+ Add Update` navigation test). Two initial page-test reds were
  **test-expectation bugs, not app bugs** (the repeat list starts at *Merchandising*, not *Production*; the stock
  description renders as one sentence, so match by regex). **Gates:** `npx tsc -b` 0, `npm run lint` **0 errors /
  25 warnings** (baseline 24; +1 matching the established `set-state-in-effect` list-load pattern — the new
  spacer-`<th>` label warning was fixed with an `sr-only` label), `npx vitest run` **283 passed / 12 failed
  (25 files)** — the 12 are the documented jsdom-env `window.localStorage.clear is not a function` allowlist
  (`Layout`/`ThemeContext`/`App`); green grew 261 → 283. **Real-browser CDP:** `/designs/REG-1001/versions/design-01-v1`
  header `Commercial File FO-2025-101` + flags, quick-lead **Agreed: 1/4** with Agree on Production/Quality/
  Commercial, stock **500 / 120 / 380**; `/designs/REG-1001/versions/design-01-v2` PO tab → **3 POs** with status
  pills; `/designs/REG-1001` → **9 tabs** (no File Openings), Versions tab FN + `Open file →` → the file routes;
  **0 console errors** on both pages.

- **2026-10-11 — `SpreadsheetGrid` React-19 console error FIXED → PT-003 promoted to ✅ (GATE_A + full frontend suite)** —
  the long-tracked dev-only console `TypeError: Cannot read properties of null (reading 'verticalFillMode')` in
  the shared grid is fixed at the root. **Root cause (confirmed in the Tabulator source):** `new TabulatorFull(...)`
  does *not* build the table synchronously — it defers `this._create()` (which runs `rowManager.initialize()`, the
  call that assigns `renderer`) to a `setTimeout` "to allow event bindings immediately after the constructor"
  (`tabulator_esm.js` ~27155). Any `setData(...)` before that timer runs reaches `RowManager._wipeElements →
  adjustTableSize` with `this.renderer === null` and throws. The grid **rebuilds** its Tabulator instance whenever
  `data` changes (the mount effect deps include `allGridData`), and the data-sync effect's "already fed" seed
  (`lastFedRef`) was only set at hook-init — so after a rebuild it was **stale**, and the effect re-fed the new
  data in the *same commit* as construction, i.e. pre-`_create()`. That is why `/design` logged exactly **one**
  error: the empty→loaded data swap after the async mock fetch. (Not StrictMode-specific: StrictMode's
  mount/unmount/mount just makes the same rebuild path fire on mount; the bug reproduces on any data change.)
  **Fix:** (a) after `tableRef.current = table` in the mount effect, set `lastFedRef.current = gridData` — the
  constructor already loaded that exact data, so the sync effect must not re-feed it; genuinely new data
  (search/filter/pagination changes that don't rebuild) still flows through `setData`. (b) **Hardening for the
  residual race:** if a data/filter change lands inside the build window (`table.initialized === false`), the
  sync effect now waits for `tableBuilt` before feeding — verified in-browser by setting a header filter in the
  same tick as a grid rebuild (previously threw once; now **0 errors across 4 racing runs**). A normal filter on
  a settled grid still filters (16 → 2 rows, 0 errors). **RED-first (2 cases):** *"does not re-feed data to a
  table that was just rebuilt with the new data"* (mount `data=[]` → rerender `data=rows`; the rebuilt instance
  gets **0** external `setData` calls) failed `expected 1 to be 0`; and *"defers a data feed until the table is
  built when a filter changes in the build window"* (grid-search change before `tableBuilt`; asserts
  `setDataBeforeBuilt === false` then the feed lands after build) failed `expected true to be false` with the
  guard disabled. The test harness was extended so the constructor's internal initial load is distinct from
  *external* `setData` calls (mirroring Tabulator's `_loadInitialData`) and so the fake defers `tableBuilt`.
  **Gates:** `npx tsc -b` 0, `npm run lint` **0 errors / 24 warnings** (baseline held; no new warnings),
  `npx vitest run` **261 passed / 12 failed (23 files)** — the 12 are the documented jsdom-env
  `window.localStorage.clear is not a function` allowlist (`Layout`/`ThemeContext`/`App`); green grew 259 → 261
  (the SpreadsheetGrid file 15 → 17). **Real-browser CDP `/design`:** console errors **1 → 0**, grid intact
  (**16 rows / 304 cells**), no page overflow; racing + settled-filter checks clean. Because `SpreadsheetGrid` is
  a **shared** layer, this ran the full frontend suite as the escalation (not just the owning file). Watch-out:
  the jsdom `FakeTabulator` cannot reproduce the real crash, so the unit tests guard the *mechanism* while the
  browser checks prove the *symptom is gone* — keep both.

- **2026-10-11 — PT-016 Design Sales Report print page VERIFIED (GATE_A)** — the last unbuilt design
  register Actions-menu destination: a standalone, print-optimised report at
  `/designs/:designCode/sales-report`. Mirrors the PT-010 Design detail *Sales Order* tab (same
  per-version PO matrix) but as an A4 print sheet: header (BHMS badge + title, Version, PO count) with
  **Buyer** + **Design** panels, a `PO Number · Qty · Unit Price · Value · Fabric · Trims · Production ·
  Delivery · Overall · Delivery Date` table using the shared `StatusPill` risk payloads
  (`On Track`/`At Risk`/`Delayed or Overdue`/`No Status`), a rolled-up **Total** qty + value row, and a
  footer with a printed timestamp. No new seed — the report derives from the existing
  `designDetailSeed` (POS live on the current version; a non-current version shows the empty state).
  Reuses the `DesignSheetPrintPage` print pattern: `no-print` sticky toolbar (Back to design, Version
  `<select>`, **Export**, **Print**, **Preview** toggle) + `@page A4` / `@media print` rules; **Print**
  calls `window.print()`, **Export** builds a CSV client-side via a small pure helper
  (`pages/salesReport.ts`: `summarizeSalesReport`, `buildSalesReportCsv`, `downloadTextFile` — Blob +
  anchor, **no new library**; the shared grid still falls back to CSV when SheetJS is absent). Rows
  drill down to the PO. RED-first: `DesignSalesReportPage.test.tsx` (11) +
  `pages/__tests__/salesReport.test.ts` (3). Gates: `npx tsc -b` 0, `npm run lint` 0 errors (**24
  warnings**, baseline held — new files warning-free after removing a sync `setState`-in-effect and
  labelling the empty spacer cells), `npx vitest run` **259 passed / 12 failed (23 files)** — the 12 are
  the **pre-existing jsdom-env** `window.localStorage.clear is not a function` failures
  (`Layout`/`ThemeContext`/`App`), matching the documented allowlist (green grew 245 → 259); real-browser
  CDP `/designs/REG-1004/sales-report`: **11 rows**, totals **17,050 / 62,925.00**, version `v2` default,
  switching to `v1` → 0 rows + "No purchase orders on this version", no page overflow, **0 console
  errors**. Watch-out caught here: a **half-updated `App.tsx`** served by the dev server (new import but
  no route → catch-all placeholder) — force a re-transform by touching the file and confirm the route is
  in the *served* module before browser-verifying.

- **2026-10-11 — PT-010f Design Costings page VERIFIED (GATE_A)** — new standalone CRUD route
  `/designs/:designCode/costings` (register Actions menu → Costings) on the PT-010e Job Requests
  pattern: header (Back, `<code> — Costings`, buyer · style_type · **N costings** · **Live: <n>**), a
  table of `PO # · V · Sheet · Fabric · Trim · CM · Overhead · Total · Margin · Status · Live ·
  Actions`, and the full **add / edit / view / delete** approach — `CostingFormModal` (shared `Modal`,
  **`max-w-2xl`**, scrollable body `max-h-[75vh] overflow-y-auto pr-1`, section headers `Costing
  Information` + `Cost Breakdown`, **Purchase Order / Sheet Type / Status as master-data `<select>`s**,
  a live **Total cost + Margin** summary), a **read-only View** modal (`max-w-3xl`), and a Delete
  confirmation (`max-w-sm`). Per-row actions in register order `View · Edit · Set Live · Delete`
  (right-aligned). New mock entity **`Costing`** (`types.ts`: `CostingSheetType` sl/vn/bd/cn/other,
  `CostingStatus` draft/pending/approved/rejected) + `costingSeed` (REG-1001 ×4, REG-1002 ×2,
  REG-1004 ×3, REG-1005 ×1 = 10; REG-1003 empty for the empty-state demo; **one live sheet per
  design**) + `db.ts`/`api.ts` store (`getDesignCostings`, `addCosting`, `updateCosting`,
  `deleteCosting`, **`setLiveCosting`** — mutually exclusive within a purchase order only) + additive
  `StatusPill` tokens (`rejected`, `live`). **Total cost** = fabric + trims + CM + overheads (rounded to
  2dp); **Margin %** = (target − total) / target. Status labels follow the prototype's derived-label
  convention (`Pending`, not the backend verbose "Pending Approval") to stay consistent with
  `StatusPill` and the Jobs page. RED-first: `DesignCostingsPage.test.tsx` (21) +
  `mock/__tests__/costings.test.ts` (5). Gates: `npx tsc -b` 0, `npm run lint` 0 errors (**24
  warnings**, baseline held — none from new files), `npx vitest run` **245 passed / 12 failed (21
  files)** — the 12 are the **pre-existing jsdom-env** `window.localStorage.clear is not a function`
  failures (`Layout`/`ThemeContext`/`App`), matching the documented allowlist (green grew 219 → 245);
  real-browser CDP `/designs/REG-1001/costings`: 4 rows (totals 8.50/8.95/7.85/9.70, margins
  32.0/28.4/28.6/7.6%), live marker on V1 only, `Set Live` only on non-live rows, shell `max-width:
  none` full width, no page overflow, modal contract confirmed (aria-modal, centered, `max-w-2xl`,
  section headers, scroll body, PO/Sheet/Status selects), **0 console errors**.

- **2026-10-11 — PT-010e Design Job Requests page VERIFIED (GATE_A)** — new standalone CRUD route
  `/designs/:designCode/jobs` (register Actions menu → Job Requests) mirroring the PT-010d Fit Specs page:
  header (Back, `<code> — Job Requests`, buyer · style_type · N jobs · **Open: <n>**), a table of
  `Job # · Type · PO # · Assigned · Due · Priority · Status · Description · Actions`, and the full
  **add / edit / view / delete** approach — `JobRequestFormModal` (shared `Modal`, **`max-w-2xl`**,
  scrollable body `max-h-[75vh] overflow-y-auto pr-1`, section headers `Job Information` + `Details`,
  **Type/Priority/Status/Purchase Order/Assigned To as master-data `<select>`s**), a **read-only View**
  modal (`max-w-3xl`), and a Delete confirmation (`max-w-sm`). Per-row actions in register order
  `View · Edit · Delete` (right-aligned). **Fidelity correction:** the PT-010b register Actions menu
  labelled this destination "Job Description" — the target nav calls it **"Job Requests"**
  (`frontend/src/components/Layout.tsx`, `DesignSheetJobRequests.tsx`), so the menu label + page title
  were aligned to "Job Requests" (`DesignsPage.tsx` + `DesignsPage.test.tsx`). New mock entity
  **`JobRequest`** (`types.ts`: `JobType` pattern/sample/3d/mini_marker, `JobPriority` 1–4,
  `JobStatus` pending/in_progress/completed/cancelled) + `jobRequestSeed` (REG-1001 ×4, REG-1002 ×2,
  REG-1004 ×3, REG-1005 ×1, DSD-1001 ×1 = 11; REG-1003 empty for the empty-state demo) +
  `assigneeSeed` staff master + `db.ts`/`api.ts` store (`getDesignJobRequests`, `addJobRequest`,
  `updateJobRequest`, `deleteJobRequest`, new **`getDesignPOs`**) + additive `StatusPill` tokens
  (`pending`/`in_progress`/`completed`). An **overdue** marker (`data-overdue="true"`, red text) renders
  when a non-terminal job's `required_by_date` is before the frozen `DEMO_TODAY` (2026-09-10).
  RED-first: `DesignJobsPage.test.tsx` (20) + `mock/__tests__/jobs.test.ts` (4). Gates: `npx tsc -b` 0,
  `npm run lint` 0 errors (**24 warnings**, baseline held — none from new files), `npx vitest run`
  **219 passed / 12 failed (19 files)** — the 12 are the **pre-existing jsdom-env**
  `window.localStorage.clear is not a function` failures (`Layout`/`ThemeContext`/`App`), matching the
  documented allowlist (green grew 195 → 219); real-browser CDP `/designs/REG-1001/jobs`: 4 rows, header
  `REG-1001 — Job Requests` / `4 jobs` / `Open: 2`, overdue flag on `2026-06-20` only, shell
  `max-width: none` full width, no page horizontal overflow, **0 console errors**.

- **2026-10-11 — PT-006a Design Register responsive shell VERIFIED (GATE_A)** — the register page shell
  was `p-6 max-w-7xl`: `max-w-7xl` is a hard 1280px cap and, with no `mx-auto`, it anchored left, so on
  displays wider than 1280px the whole page (grid included) stopped at 1280px and left an unintended
  band of white space on the right. Root cause = the arbitrary max-width cap, **not** Tabulator
  (`fitData` fills the host width and scrolls horizontally). Fix: the register container is now fluid
  full width with responsive gutters (`w-full p-4 sm:p-6`, `data-testid="page-container"`) and the
  register grid sizes to the viewport (`height="max(320px, calc(100vh - 320px))"`, was a fixed `480`).
  The same defect class existed on the **Dashboard** (`p-6 max-w-6xl`, left-anchored) → now
  `mx-auto w-full max-w-6xl p-4 sm:p-6` (non-tabular summary page: cap kept but centred). New rule
  recorded in `standards.md` §2. RED-first: `DesignsPage.test.tsx` +3 (no `max-w-`, `w-full`,
  `p-4`/`sm:p-6`, viewport grid height) and a new `DashboardPage.test.tsx` (2: centred cap, responsive
  gutters). Gates: `npx tsc -b` 0, `npm run lint` 0 errors (**24 warnings**, baseline held), `npx vitest
  run` **195 passed / 12 pre-existing jsdom-env `localStorage.clear` failures (17 files)** (was 190
  passed; green count grew, allowlist unchanged); real-browser CDP `/design` — shell `max-width: none`,
  shell width = viewport, grid fills the content width with horizontal scroll intact; `/dashboard` —
  cap `1152px` centred (left == right). Files: `standards.md` §2 · `DesignsPage.tsx` ·
  `DashboardPage.tsx` · `DesignsPage.test.tsx` · `DashboardPage.test.tsx`.

- **2026-09-21 — PT-010d Design Fit Specs page VERIFIED (GATE_A)** — new standalone CRUD route
  `/designs/:designCode/fits` (reached from the register Actions menu → Fit Specs) mirroring the PT-010c
  Materials page: header (Back, `<code> — Fit Specs`, buyer · style_type · N specs · **Current: <fit #>**),
  a table of `Fit # · Stage · Version · Fit Date · Current · Description · Measurements · Notes · Actions`,
  and the full **add / edit / view / delete** approach — `FitSpecFormModal` (shared `Modal`,
  **`max-w-2xl`**, scrollable body `max-h-[75vh] overflow-y-auto pr-1`, section header `Fit Specification`,
  **Stage + Version as master-data `<select>`s**), a **read-only View** modal (`max-w-3xl`), and a Delete
  confirmation (`max-w-sm`). Per-row actions in register order `View · Edit · Set Current · Delete`
  (right-aligned); **Set Current** renders only on non-current rows and shows an emerald **Current**
  `StatusPill` (additive `current` token). New mock entity **`FitSpec`** (`types.ts`) + `fitSpecSeed`
  (REG-1001 ×4, REG-1002 ×2, REG-1004 ×3, REG-1005 ×1, DSD-1001 ×1 = 11; exactly one `is_selected` per
  design; REG-1003 empty for the empty-state demo) + `db.ts`/`api.ts` store (`getDesignFitSpecs`,
  `getDesignVersions`, `addFitSpec`, `updateFitSpec`, `deleteFitSpec`, `setCurrentFitSpec`; selection is
  mutually exclusive). RED-first: `DesignFitSpecsPage.test.tsx` (19) + `mock/__tests__/fitSpecs.test.ts`
  (6). Gates: `npx tsc -b` 0, `npm run lint` 0 errors (**24 warnings**, baseline held — none from new
  files), `npx vitest run` **190 passed / 12 failed (16 files)** — the 12 are the **pre-existing jsdom-env**
  `window.localStorage.clear is not a function` failures (`Layout`/`ThemeContext`/`App`), reproduced
  identically on a `git stash`ed clean tree and matching the documented allowlist class; real-browser CDP
  `/designs/REG-1001/fits`: 4 rows, all 9 headers, actions present, Add modal centered (ΔX/ΔY 0) `max-w-2xl`
  scrollable with Stage/Version selects, View modal read-only `max-w-3xl`, Set Current moves the marker,
  **0 console errors**. Lessons: prototype mock calls use `setTimeout(120)` — in a **background/hidden
  browser tab** timers are throttled hard, so CDP reads right after a click can show stale state (re-read
  rather than assume a bug); mock unit tests should import the **sync `db`** layer (the `api` layer is
  promise-wrapped) unless the test `await`s.

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