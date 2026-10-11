# Prototype Scope — Full Product Surface

> **Definition of "full product surface":** every screen/module of the target frontend app, running
> on mock data, so the customer can review and re-approve the *whole* product before the dev team
> connects the backend. Features/attributes may be **changed** during prototype review — the change
> log below is where those deltas live.

## Modules in scope (map to `frontend` routes / PRD §14 screen inventory)

| Module | Screens | Phase |
|--------|---------|-------|
| Design | Design register (merged Styles+Design Sheets, **materials breakdown: items/trims/labels/accessories/other**), Design detail (Overview, Sketches, **Versions (each carries an FN)**, File Openings, Purchase Orders, Items, BOM, Design Images, Tech Packs, **Sales Order**), Design Sheet detail, Fit Specs, Job Requests, Design Costings, Tech-pack import wizard | P0/P1 |
| Merchandising | Buyer PO management under the **FN/version**: File Openings (FN) list + detail + notes, Purchase Orders list + detail + amendments + trail, BOMs list + detail, Costings list + detail (ladder derived from version costing), T&A list/detail/calendar/heatmap | P1/P2 |
| Commercial | Proforma Invoices, Sales Contracts, Sales Confirmations, LCs + amendments, Banks, Debit Notes, Invoice Approvals | P2 |
| Procurement | Fabric Categories, HTS Codes, Suppliers, Mills, **Materials POs + print** (fabric/trims/labels/accessories/other with terms & clauses), Bookings, Orders (incl. Fabric Schedule 16.2 / risk / handoff audit), Tolerances, Utilization, Dockets (grid view) | P2 |
| Production | Plans, Dashboard, Factory Portal, Daily Reports, Order Detail (line performance) | P2 |
| Quality | Inspections, CAPA, Quality Dashboard | P2 |
| Logistics | Shipments list/detail/dashboard, Freight Forwarders, Dockets, **Paperwork Comparison**, Import/Export Recaps, Forward Order book, Final Hit Reconciliations, Supplier Payments, Cost Reconcile | P3 |
| Reports | Summary reports (sales summary, recap reports), Report builder, schedules, viewer | P3 |
| Setup & Admin | Setup hub, Tenant, Offices, Master data (20 categories), Users, Roles, Audit logs, Health, Alerts | P3 |
| Help | Help Centre, release notes, onboarding/tours | P3 |
| Dashboards | Main dashboard (Tasks/Pipeline/Financials/Alerts), Executive dashboard, Order Manager (critical path, weekly review), Production/Quality/Shipment/T&A KPIs | P1/P2/P3 |

## Explicitly OUT (until backend wiring)

- Real authentication / JWT / RBAC enforcement (the shell uses a mock session; review login screen
  later)
- Real persistence/migrations (mock `db.ts` only)
- Real printer/export authoring (print uses browser print + `SpreadsheetGrid.download` with mock rows)
- Tenant-switching behaviour (single tenant shown; design may change later)

### Product features deferred — excluded from prototype scope (cannot creep in)

These are out of the implemented target surface too (PRD "not in scope") and must NOT appear as
prototype screens:

- **Finance module** (general ledger, receivables/payables sub-ledgers, cash/bank books)
- Full **inventory / GRN / WMS** (goods receiving, stock transfers, returns) — the prototype only
  demos stock-fabric allocation + utilisation views
- **SSO / OAuth**, **Elasticsearch / full-text search**, **GraphQL**
- **AI / ML** features, mobile offline syncing
- PO bulk-import wizard and accounting integrations

If review asks for any of these, record it as a decision note and re-plan — do not fold it into an
existing slice.

## Feature & attribute change log

Append a dated line whenever prototype review changes a feature, layout, attribute, or business rule
vs the canonical docs (`PRD.md` / `data-model.md` / `module-specs.md`). Format:

- **2026-09-15** — [Prototype workstream created; scope = full surface; prototype becomes the real
  frontend; mock `api.ts` is the API contract.] (decision note, see `agents/` + `scope.md`)
- **2026-09-15** — [Business workflow v2 (`business-workflow.md`): File Number (FN) rides the design
  version and replaces the File Opening layer; materials booking + print in scope (materials POs for
  fabric/trims/labels/accessories/other with terms & clauses); RFQ wind-up deferred to a later phase;
  accessories/other added to the design materials breakdown; PO-level costing ladder derived from the
  version's design costing.] (decisions log, `business-workflow.md`; landed in `requirements.md`,
  `data-model.md`, `mock-data-spec.md`, `ROADMAP.md`, `TRACKER.md`)
- **2026-09-16** — [Design module UI/UX conventions standardised for reuse (`standards.md` §5–§9):
  modal contract (`maxWidthClass`/`contentClassName` + `max-h-[75vh]` body scroll), form sectioning +
  master-data `<select>` rule (no free-text for typed masters), in-modal children data editor as a
  bordered table grid (sticky header, `overflow-auto max-h-[300px] min-h-[180px]`), both-axis scroll +
  minimum-height rule, token-covered status-pill palette (dark re-themes), and prototype test
  conventions (selectOptions, getAllByText, testTimeout 15000, jsdom layout limit, datalist lint).
  PT-007 (micro-interaction kit) implements the pill/hook/preview on this standard.] (prototype scope, `standards.md`, `PT-006/PT-007`)
- **2026-09-16** — [DSC: Micro-interactions kit (PT-007): `StatusPill` tokenized to `@theme` shades
  (`emerald-700` → `emerald-600`; never raw shades outside tokens.css) with label capitalised in code
  (no CSS `capitalize`-only), `pulse` prop, `data-testid` pass-through; new `HoverPreview` (opens on
  hover + keyboard focus, tooltip with title + label/value fields, stays open while hovered);
  new `useOptimistic` hook (apply patch → authoritative row on resolve → rollback + rethrow on
  reject) and `DesignsPage` migrated to it (cell edits + edit-save paths now roll back on failure
  with an error toast); `useOptimistic<T extends {id}>` takes `DesignCreateInput` directly (structural
  subset, no cast); lint regression fixed: the `load` `useCallback` deps now include the hook's
  `setItems`, `vi.fn` mocks get type params. Verified GATE_A (tsc 0 / lint 19 / vitest 78/78 / HTTP 200).] (prototype scope,
  `StatusPill.tsx` · `HoverPreview.tsx` · `useOptimistic.ts`, `PT-007`)
- **2026-09-16** — [DSC: Term "style detail" = "design detail" everywhere (user directive): PT-010 is
  the **design detail** page; `DesignDetailPage.tsx` + tab components under `pages/designDetail/`
  replace the planned `StyleDetailPage`; PT-017 "Style detail progress panel" renamed to "Design
  detail progress panel".] (terminology decision, `ROADMAP.md`, `TRACKER.md`)
- **2026-09-16** — [DSC: Detail-page tabs render **report blocks** (`ReportTable`) instead of
  `SpreadsheetGrid` — read-only report rows carry per-cell data/model matrices; jsdom cannot assert
  Tabulator rows; grid remains mandatory for interactive list screens. Authorised §3 exception
  extended from the Sales Order report to all read-only detail tabs.] (decision note, `standards.md`,
  `PT-010`)
- **2026-09-16** — [DSC: PT-010 entry is additive to the register: the PT-006 quick-view modal stays,
  its footer gains "Open full design" → `/designs/:designCode` (register tests only wrapped in
  `MemoryRouter` for the new `useNavigate`). Header actions "+Create File Opening / +Create PO /
  +Add Update" render + toast in this slice; behaviour owned by PT-011/PT-012.] (decision note,
  `DesignsPage.tsx` · `DesignDetailPage.tsx`, `PT-010`)
- **2026-09-16** — [Mock-data deviation (documented): `mock-data-spec.md` lists ~12 POs across the
  register, but `REG-1004`'s detail seed carries exactly **11** POs to guarantee the Sales Order
  demo (red fabric, delivered green, overdue non-delivered rows). `detailSeed.ts` is the authority
  for detail POs.] (evidence note, `detailSeed.ts`, `mock-data-spec.md`, `PT-010`)

- **2026-09-17** — [DSC: **Design sheet print** (PT-010a) — bare route `/designs/:designCode/print`
  registered **outside** the app `Layout` so no rail/top-bar chrome prints; uses the browser
  `window.print()` dialog for Save-as-PDF with `@page A4`, a `.no-print` toolbar, and a fixed white
  `.print-area` sheet on a grey `#eef2f7` surround (stays light even in dark theme). Standard sheet =
  header (BHMS badge + "Design Sheet", buyer + design-code panels, File = current version FN,
  capitalised status) → 9 design-info fields → Sketch (image / placeholder) → Material Breakdown
  (tick-to-include + running total; "No material items" empty state) → print footer. **Preview** toggle
  hides the toolbar actions. Entry points: register grid **⋮ row-actions menu**, register view-modal
  footer, and detail header (the raw `window.print()` button was removed). Deviations: the target's Fit
  Specs section is omitted (no fit-spec entity in the mock model) and the material `Match` column is
  `Unit`. Verified GATE_A (`tsc -b` 0 / lint 0 errors (24 warnings) / `vitest` 152/152 (13 files) /
  live `/designs/REG-1001/print` HTTP 200).] (prototype scope,
  `DesignSheetPrintPage.tsx` · `DesignsPage.tsx` · `DesignDetailPage.tsx` · `App.tsx`, `PT-010a`)

- **2026-09-17** — [DSC: **Design register single Actions menu** (PT-010b) — the register grid now shows one
  **"Actions"** trigger per row instead of the inline View/Edit/Delete buttons plus the separate ⋮ menu. The
  shared `SpreadsheetGrid` action column renders the trigger and its menu merges the standard View/Edit/Delete
  items with the page-supplied `rowActions`, ordered `View · Edit · Delete · Materials · Fit Specs · Job
  Description · Costings · Print Design Sheet · Sales Report` (Delete is
  `variant: 'danger'`, rendered red); it is keyboard-accessible (`role="menu"`/`role="menuitem"`,
  focus-first-on-open, ArrowUp/Down wrap, Escape closes + refocuses the trigger, `aria-haspopup`/
  `aria-expanded`). `DesignsPage` supplies Materials, Fit Specs, Job Description, Costings, Print Design Sheet
  and Sales Report, each navigating to its **own standalone route**
  `/designs/:designCode/{materials|fits|jobs|costings|print|sales-report}` — a single-screen provision for all
  users; per the user's decision the menu ships first and those pages follow (PT-010c…f). The Actions trigger
  opens the popup only — the grid's `rowClick` handler now ignores clicks on `[data-grid-action]` controls so
  the row's view dialog no longer opens together with (and on top of) the menu (real Tabulator fires
  `cellClick` **and** `rowClick`; the jsdom fake fired only one, which hid it). The popup is rendered
  **standard popover style** — portaled to `document.body` with `position: fixed` and viewport-flipped/clamped
  from the trigger's bounding rect, because Tabulator cells clip absolutely-positioned children (the menu was
  otherwise unreadable under neighbouring cells); it closes on outside click, scroll, resize, Escape, or item
  pick. The top navbar is
  unchanged. Verified GATE_A (`tsc -b` 0 / lint 0 errors (24 warnings) / `vitest` 161/161 (13 files) / live
  `/design` HTTP 200).] (prototype scope, `SpreadsheetGrid.tsx` · `SpreadsheetGrid.theme.css` ·
   `DesignsPage.tsx`, `PT-010b`)

- **2026-09-17** — [DSC: **Design Materials page** (PT-010c) — standalone CRUD route
  `/designs/:designCode/materials` for browsing and managing per-design materials. Page renders a
  header with Back link, design code/buyer/style_type, item count + total quantity, and "+ Add
  Material" button; a plain HTML table listing all `DesignMaterial` fields (Type, Description, Code,
  Location, Supplier, Colour, W/Size, Qty, Unit, Notes) with Edit/Delete per row; and two modals —
  `MaterialFormModal` (native `<dialog>`, add/edit with datalist type selector, required description)
  and delete confirmation (native `<dialog>`). DB + API layers gained `getDesignByCode`,
  `getDesignMaterials`, `addMaterial`, `updateMaterial`, `deleteMaterial`; seed provides 6 items for
  REG-1001, 6 for REG-1002, 0 for REG-0103. Verified GATE_A (`tsc -b` 0 / lint 0 errors (24
  warnings) / `vitest` 170/170 (14 files) / live `/designs/REG-1001/materials` HTTP 200).] (prototype
  scope, `DesignMaterialsPage.tsx` · `db.ts` · `api.ts` · `App.tsx`, `PT-010c`)

- **2026-09-21** — [DSC: **Design Fit Specs page** (PT-010d) — standalone CRUD route
  `/designs/:designCode/fits` (register Actions menu → Fit Specs) for a design's fit specifications.
  Header shows the design code/buyer/style_type, spec count and the **current** spec; a plain HTML table
  lists **Fit # · Stage · Version · Fit Date · Current · Description · Measurements · Notes** with
  per-row actions **View · Edit · Set Current · Delete** (register action order; Set Current only on
  non-current rows). Follows `standards.md` §5–§9: `FitSpecFormModal` uses the shared `Modal`
  (`max-w-2xl`, scrollable body `max-h-[75vh]`, section header, **Stage + Version as master-data
  `<select>`s**), a read-only **View** modal (`max-w-3xl`), and a Delete confirmation (`max-w-sm`).
  New mock entity **`FitSpec`** (`types.ts`) + `fitSpecSeed` (11 rows; exactly one `is_selected` per
  design) + `db.ts`/`api.ts` store with mutually-exclusive selection (`setCurrentFitSpec`); added
  `getDesignVersions`. Deviations: `FitImage` (child images on the backend model) is out of scope for
  this slice; `purchase_order` scoping (target page) is represented by `version_number` instead.
  Verified GATE_A (`tsc -b` 0 / lint 0 errors (24 warnings) / `vitest` 190 passed, 12 pre-existing
  jsdom-env failures / real-browser CDP `/designs/REG-1001/fits` 0 console errors).] (prototype
  scope, `DesignFitSpecsPage.tsx` · `StatusPill.tsx` · `seed.ts` · `db.ts` · `api.ts` · `types.ts` ·
  `App.tsx`, `PT-010d`)

- **2026-10-11** — [FIX: **shared `SpreadsheetGrid` React-19 console crash** — fixed the dev-only
  `TypeError: Cannot read properties of null (reading 'verticalFillMode')` that kept PT-003 at 🟢.
  Root cause: `new TabulatorFull(...)` defers `_create()` (which assigns the row renderer) to a
  `setTimeout`; the grid rebuilds its instance on every `data` change, but the data-sync effect's
  "already fed" seed (`lastFedRef`) was only set at hook-init, so after a rebuild it re-fed the fresh
  instance with `setData` in the same commit — before `_create()` — and `adjustTableSize` threw. Fix:
  seed `lastFedRef.current = gridData` in the mount effect after construction (the constructor already
  loaded that data); plus a `tableBuilt` guard so an in-build-window filter/data change waits for the
  build instead of throwing. RED-first `SpreadsheetGrid.test.tsx` +2 cases (rebuilt table gets **0**
  external `setData` calls; a feed defers until `tableBuilt`); gates: `tsc -b` 0 / lint 0 errors (24
  baseline warnings) / full `vitest` 261 passed, 12 pre-existing jsdom-env failures (23 files) / CDP
  `/design` console errors 1 → 0, grid intact (16 rows), racing + settled-filter checks clean. Shared
  layer → full frontend suite run. **Promotes PT-003 to ✅.**] (prototype scope, `SpreadsheetGrid.tsx` ·
  `SpreadsheetGrid.test.tsx`, `PT-003`)

- **2026-10-11** — [DSC: **Design Sales Report print page** (PT-016) — standalone print route
  `/designs/:designCode/sales-report` (register Actions menu → Sales Report), the print + export
  counterpart of the PT-010 Design detail *Sales Order* tab. A4 print sheet (reuses the
  `DesignSheetPrintPage` pattern: `no-print` sticky toolbar + `@page`/`@media print` rules) with header
  (BHMS badge + title, Version, PO count), **Buyer** + **Design** panels, a `PO Number · Qty · Unit
  Price · Value · Fabric · Trims · Production · Delivery · Overall · Delivery Date` table using the
  shared `StatusPill` risk payloads, a rolled-up **Total** qty + value row, and a timestamped footer.
  Toolbar actions: Back to design, Version `<select>`, **Export** (client-side CSV via the pure
  `pages/salesReport.ts` helpers `summarizeSalesReport` / `buildSalesReportCsv` / `downloadTextFile`,
  Blob + anchor — **no new library**), **Print** (`window.print()`), **Preview** toggle. Rows drill down
  to the purchase order. **No new seed** — derives from `designDetailSeed` (POS sit on the current
  version; a non-current version shows the empty state). Verified GATE_A (`tsc -b` 0 / lint 0 errors (24
  warnings) / `vitest` 259 passed, 12 pre-existing jsdom-env failures / real-browser CDP
  `/designs/REG-1004/sales-report` 11 rows, totals 17,050 / 62,925.00, version switch → empty, 0 console
  errors).] (prototype scope, `DesignSalesReportPage.tsx` · `salesReport.ts` · `App.tsx`, `PT-016`)

- **2026-10-11** — [DSC: **Design Costings page** (PT-010f) — standalone CRUD route
  `/designs/:designCode/costings` (register Actions menu → Costings) for a design's per-PO costing
  sheets. Header shows the design code/buyer/style_type, the costing count and the **live** count; a
  plain HTML table lists **PO # · V · Sheet · Fabric · Trim · CM · Overhead · Total · Margin · Status ·
  Live** with per-row actions **View · Edit · Set Live · Delete** (register action order). Follows
  `standards.md` §5–§9: `CostingFormModal` uses the shared `Modal` (`max-w-2xl`, scrollable body
  `max-h-[75vh]`, section headers **Costing Information** + **Cost Breakdown**, **Purchase Order / Sheet
  Type / Status as master-data `<select>`s**, live **Total cost + Margin** summary), a read-only **View**
  modal (`max-w-3xl`), and a Delete confirmation (`max-w-sm`). **Total cost** = fabric + trims + CM +
  overheads; **Margin %** = (target − total) / target. **Set Live** ticks one live sheet per purchase
  order (mutually exclusive within the PO). New mock entity **`Costing`** (`types.ts`) + `costingSeed`
  (10 rows across REG-1001/1002/1004/1005; REG-1003 empty) + `db.ts`/`api.ts` store
  (`getDesignCostings`/`addCosting`/`updateCosting`/`deleteCosting`/`setLiveCosting`) + additive
  `StatusPill` tokens (`rejected`/`live`). Deviations: statuses use the prototype's derived labels
  (`Pending`) to match the shared `StatusPill`, not the backend verbose "Pending Approval"; cost/target
  amounts are demo strings, not stored decimals. Verified GATE_A (`tsc -b` 0 / lint 0 errors (24
  warnings) / `vitest` 245 passed, 12 pre-existing jsdom-env failures / real-browser CDP
  `/designs/REG-1001/costings` 0 console errors).] (prototype scope, `DesignCostingsPage.tsx` ·
  `StatusPill.tsx` · `seed.ts` · `db.ts` · `api.ts` · `types.ts` · `App.tsx`, `PT-010f`)

- **2026-10-11** — [DSC: **Design Job Requests page** (PT-010e) — standalone CRUD route
  `/designs/:designCode/jobs` (register Actions menu → Job Requests) for a design's cross-department
  job requests. Header shows the design code/buyer/style_type, job count and the **open** count; a plain
  HTML table lists **Job # · Type · PO # · Assigned · Due · Priority · Status · Description** with
  per-row actions **View · Edit · Delete** (register action order). Follows `standards.md` §5–§9:
  `JobRequestFormModal` uses the shared `Modal` (`max-w-2xl`, scrollable body `max-h-[75vh]`, section
  headers **Job Information** + **Details**, **Type/Priority/Status/Purchase Order/Assigned To as
  master-data `<select>`s**), a read-only **View** modal (`max-w-3xl`), and a Delete confirmation
  (`max-w-sm`). New mock entity **`JobRequest`** (`types.ts`) + `jobRequestSeed` (11 rows) +
  `assigneeSeed` staff master + `db.ts`/`api.ts` store (`getDesignJobRequests`/`addJobRequest`/
  `updateJobRequest`/`deleteJobRequest` + new `getDesignPOs`) + additive `StatusPill` tokens
  (`pending`/`in_progress`/`completed`). An **overdue** marker highlights a non-terminal job whose
  `required_by_date` is before the frozen `DEMO_TODAY`. **Fidelity correction:** the PT-010b register
  menu labelled this destination "Job Description"; the target nav calls it **"Job Requests"**, so the
  menu label + page title were aligned. Deviations: `assigned_to` is a prototype staff-name master
  (`assigneeSeed`) instead of the target `users` FK. Verified GATE_A (`tsc -b` 0 / lint 0 errors (24
  warnings) / `vitest` 219 passed, 12 pre-existing jsdom-env failures / real-browser CDP
  `/designs/REG-1001/jobs` 0 console errors).] (prototype scope, `DesignJobsPage.tsx` · `DesignsPage.tsx` ·
  `StatusPill.tsx` · `seed.ts` · `db.ts` · `api.ts` · `types.ts` · `App.tsx`, `PT-010e`)

- **2026-10-11** — [UI/UX fix (register responsiveness): the **Design Register** shell used
  `p-6 max-w-7xl` — `max-w-7xl` is a hard 1280px cap and, with no `mx-auto`, it anchored **left**, so on
  displays wider than 1280px the whole page (grid included) stopped at 1280px and left **unintended
  white space on the right** of the data grid. Root cause = the arbitrary max-width cap, **not**
  Tabulator (`fitData` fills the host width and scrolls horizontally). The register container is now
  **fluid full width** with responsive gutters (`w-full p-4 sm:p-6`, `data-testid="page-container"`) and
  the register grid sizes to the viewport (`height="max(320px, calc(100vh - 320px))"`, was a fixed
  `480`). The same defect class on the **Dashboard** (`p-6 max-w-6xl`, left-anchored) is now
  `mx-auto w-full max-w-6xl p-4 sm:p-6` — a non-tabular summary page keeps its reading-width cap but
  must **centre** it. New rule recorded in `standards.md` §2.] (prototype scope, `standards.md` §2 ·
  `DesignsPage.tsx` · `DashboardPage.tsx`)

Future entries follow this template:

- `YYYY-MM-DD — <module>: <what changed> | decision note ref | tracker slice`

## Open decisions

1. Login screen: mock or deferred? (default defer — reviewers land on the shell directly)
2. Report print size per report type.
3. Any attributes the customer wants added/removed per module — record here as they surface.

## Decision notes (ADRs for the prototype)

Decision notes are recorded in `docs/decisions/` once decisions are settled; this section only
links them. (Create `docs/decisions/` on first decision.)