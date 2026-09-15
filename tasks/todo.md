# Tasks: Design-Version Sales Order Report (RQ-051)

## Task 1: Backend status derivation module (sales_order.py)

**Description:** Create a pure, side-effect-free module `apps/merchandising/sales_order.py` that computes per-PO area statuses (Fabric, Trims & Accessories, Production, Delivery, Overall) from existing child data. No DB writes. Reuses `RISK_ORDER` / `RISK_COLORS` / `risk_payload` from `risk_engine.py`.

**Acceptance criteria:**
- [x] `compute_sales_order_statuses(po)` returns a dict with keys: fabric, trims, production, delivery, overall — each a `risk_payload` dict
- [x] Fabric derivation: reuses risk engine (delivered→green, in_work→amber, risk_level red→red, no items→none)
- [x] Trims+Acc derivation: BOMItem via file_opening→style_version→boms→items; category in `TRIMS_CATEGORIES`; all Completed→green, any Ordered/Partial/TBC→amber, no items→none
- [x] Production derivation: PO status delivered→green; ready/shipped/quality_check→green; in_production with actual+garments_ready ≥ quantity→green else amber; draft/open/cancelled→none
- [x] Delivery derivation: PO delivered/shipped/ready→green; overdue (today > delivery_date and not delivered/shipped)→red; future TOD→amber; draft/open/cancelled→none; no delivery_date→none
- [x] Overall: max risk_order of all areas
- [x] Unit tests cover all area × status combinations + edge cases (no BOM, no shipment, no daily production)

**Verification:**
- `.\venv\Scripts\python.exe -m pytest apps\merchandising\tests\test_sales_order.py -q` → all pass
- `.\venv\Scripts\python.exe -m pytest apps\merchandising -q` → no regressions

**Dependencies:** None

**Files likely touched:**
- `backend/apps/merchandising/sales_order.py` (NEW)
- `backend/apps/merchandising/tests/test_sales_order.py` (NEW)

**Estimated scope:** S (2 files)

---

## Task 2: Backend sales_order API endpoint

**Description:** Add a `@action(detail=True, methods=["get"])` named `sales_order` on `StyleVersionViewSet` that queries all POs for the version's file openings and returns per-PO rows with area statuses from Task 1.

**Acceptance criteria:**
- [x] `GET /api/v1/merchandising/style-versions/{id}/sales_order/` returns a list of PO rows
- [x] Each row includes: `id`, `po_number`, `file_number`, `buyer_name`, `factory_name`, `destination_country_name`, `delivery_date` (TOD), `quantity`, `unit_price`, `total_value`, `items`, and `sales_statuses` (area status dict from Task 1). (`hits` deliberately excluded — row drill-down lands on the full PO)
- [x] Only returns POs belonging to the specified style version (via file_opening→style_version)
- [x] RBAC: `merchandising:view` permission required (registered in `required_permissions`)
- [x] API test: POs for a version are returned with correct status payloads; unrelated POs are excluded

**Verification:**
- `.\venv\Scripts\python.exe -m pytest apps\merchandising\tests\test_sales_order.py -q` (add API tests to same file)
- `.\venv\Scripts\python.exe -m pytest apps\merchandising -q` → no regressions

**Dependencies:** Task 1

**Files likely touched:**
- `backend/apps/merchandising/views.py` (add @action to StyleVersionViewSet)
- `backend/apps/merchandising/tests/test_sales_order.py` (add API tests)

**Estimated scope:** S (2 files)

---

## Task 3: Frontend client type + API function

**Description:** Add the `SalesOrderRow` TypeScript type and `merchApi.getStyleVersionSalesOrder()` function to the API client.

**Acceptance criteria:**
- [x] `SalesOrderRow` / `SalesOrderStatuses` types defined in `client.ts` with all fields from the API response
- [x] `getStyleVersionSalesOrder(versionId)` added to `merchApi`
- [x] `npx tsc -b` exits 0

**Verification:**
- `npx tsc -b` → exit 0

**Dependencies:** Task 2 (API contract defined)

**Files likely touched:**
- `frontend/src/api/client.ts`

**Estimated scope:** XS (1 file)

---

## Task 4: Frontend SalesOrderTab component

**Description:** Add a "Sales Order" tab to `StyleDetailPage` that renders a version dropdown and a styled `<table>` with color-coded status cells for each PO. Clicking a PO row navigates to `/purchase-orders/:id`.

**Acceptance criteria:**
- [x] `Tab` type in `StyleDetailPage.tsx` includes `'sales_order'`
- [x] Sales Order tab renders a version dropdown (default: current/latest version)
- [x] Selecting a version calls `getStyleVersionSalesOrder()` and renders a `<table>` with columns: PO #, File, Buyer, Factory, Destination, Qty, Total, TOD (Cust. Del.), Fabric, Trims, Production, Delivery, Overall
- [x] Status cells use Tailwind classes: `bg-emerald-500/15 text-emerald-700` (green), `bg-amber-500/15 text-amber-700` (amber), `bg-red-500/15 text-red-700` (red), `bg-slate-100 text-slate-500` (none)
- [x] Clicking a PO row navigates to `/purchase-orders/:id`
- [x] Tests: tab renders, version dropdown works (default latest + refetch on change), PO table renders with status colors, row click navigates, empty state

**Verification:**
- `npx tsc -b` → exit 0
- `npm run lint` → 0 errors
- `npx vitest run` → all pass (no regression)
- Manual: open a design → Sales Order tab → version dropdown → POs with colored status cells

**Dependencies:** Task 3

**Files likely touched:**
- `frontend/src/pages/StyleDetailPage.tsx`
- `frontend/src/pages/__tests__/StyleDetailPage.test.tsx`

**Estimated scope:** M (2 files)

---

## Task 5: Integration, verification + docs

**Description:** Verify the full end-to-end flow: dev DB seed data, backend endpoint returns POs with statuses, frontend renders the Sales Order tab. Update TDD_TRACKER, master-backlog, lessons-learned. Apply dev DB migrations if needed.

**Acceptance criteria:**
- [x] GATE_A passes: targeted 24/24 → owning-app (merchandising) 103/103 → adjacency (`test_merchandising_api.py`) 35/35
- [x] No new schema — statuses are computed live from existing children (PO / BOMItem / booking schedule / DailyProduction); no migrations to apply
- [x] Dev-DB live smoke: `GET /api/v1/merchandising/style-versions/{id}/sales_order/` returns 200 with PO rows + status payloads (17 rows across REG-1004/DSD-1002; fabric red sticky override, delivered green, etc. verified live)
- [ ] Real-browser check of the Sales Order tab with colored status cells (manual step — jsdom covers logic, pills are plain Tailwind classes; needs a browser session on http://localhost:5173/designs → any STY/REG design → Sales Order tab)
- [x] Dev-DB data chain repaired: `seed_demo_data` leaves `FileOpening.style_version` null → PO → version link broken; backfilled all 9 FileOpenings to their style's version 1 (dev-only one-off, no app code change)
- [x] TDD_TRACKER updated with entry #74 (RQ-051)
- [x] master-backlog updated with RQ-051 row
- [x] lessons-learned entry added

**Verification:**
- Backend targeted + owning-app + adjacency all green
- Frontend `tsc -b`, lint, vitest all green
- Live smoke on dev DB confirms the report renders

**Dependencies:** Tasks 1-4

**Files likely touched:**
- `TDD_TRACKER.md`
- `master-backlog.md`
- `lessons-learned.md`

**Estimated scope:** S (docs + verification)

---

## Checkpoint: After Task 5
- [x] All tests pass (GATE_A green)
- [ ] Sales Order tab renders on a real design version with color-coded statuses (manual/live — dev servers not running this session)
- [x] No regression in existing merchandising/design tests
- [x] TDD_TRACKER, master-backlog, lessons-learned updated
- [ ] Ready for commit (pending user go-ahead)
