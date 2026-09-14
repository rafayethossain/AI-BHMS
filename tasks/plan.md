# Spec: Design-Version Sales Order Report (RQ-051)

## Objective

Build a read-only **Sales Order** report per design version that lists every Purchase Order placed under that version (across all its file openings), showing destinations, sizes, quantities, customer delivery date (TOD), and **color-coded pipeline statuses** for Fabric, Trims & Accessories, Production, Delivery, and Overall. Drill-down: clicking a PO row navigates to the PO detail page.

**Who:** Merchandiser / sales viewing a design on the Design Register (`/design`) → detail page → Sales Order tab.
**Success:** Opening the Sales Order tab on a design version shows all its POs with live-derived color-coded area statuses that update from child data (fabric bookings, BOM trim progress, production plan/daily production, delivery dates). Row click navigates to `/purchase-orders/:id`.
**Why now:** POs currently only appear per-file-opening or as a flat style-level list; there is no per-design-version sales picture with color-coded pipeline progress.

## Tech Stack

- Backend: Django 5 + DRF (existing `merchandising` app)
- Frontend: React 18 + TypeScript + Tailwind (existing `StyleDetailPage.tsx`)
- No new model, no migration — all computed from existing data

## Commands

```
# Backend targeted test
cd backend
.\venv\Scripts\python.exe -m pytest apps\merchandising\tests\test_sales_order.py -q

# Backend owning-app regression
.\venv\Scripts\python.exe -m pytest apps\merchandising -q

# Frontend
cd frontend
npx tsc -b
npm run lint
npx vitest run
```

## Project Structure

```
backend/apps/merchandising/
  models.py           # Style, StyleVersion, FileOpening, PurchaseOrder, PurchaseOrderItem, Hit, BOMItem
  serializers.py      # PurchaseOrderSerializer (existing, reuse risk engine pattern)
  views.py            # StyleVersionViewSet (add @action sales_order)
  sales_order.py      # NEW — pure status derivation module (fabric/trims/production/delivery/overall)
  risk_engine.py      # EXISTING — reuse RISK_ORDER/RISK_COLORS/risk_payload for color encoding
  tests/
    test_sales_order.py  # NEW — unit + API tests for sales_order endpoint + status derivation

frontend/src/pages/
  StyleDetailPage.tsx  # MODIFY — add 'sales_order' tab + SalesOrderTab component

frontend/src/api/
  client.ts           # MODIFY — add merchApi.getStyleVersionSalesOrder() type + function
```

## Code Style

- Backend pure functions: `compute_sales_order_statuses(po) -> dict[str, RiskPayload]` in `sales_order.py`, no side effects, no DB writes.
- Frontend: styled `<table>` (not SpreadsheetGrid — grid columns are flat and cannot express per-cell background colors; see lessons learned). Tailwind classes for status cells.
- Naming: `sales_order` snake_case; `SalesOrderTab` PascalCase; `RISK_COLORS` reused from `risk_engine.py`.

## Testing Strategy

- Backend: pytest, `apps/merchandising/tests/test_sales_order.py`
  - Unit tests for `compute_sales_order_statuses` (fabric/trims/production/delivery/overall derivation per PO)
  - API test for `StyleVersionViewSet.sales_order` action (returns correct POs for a version, status payloads present)
  - Edge cases: PO with no BOM → trims none; PO with no shipment → fabric none; PO delivered → delivery green; overdue → red
- Frontend: Vitest, `StyleDetailPage.test.tsx` (extend existing)
  - Sales Order tab renders version dropdown + PO table
  - Click PO row navigates to `/purchase-orders/:id`
  - Status cells render correct Tailwind classes per status code
- Gate: GATE_A (targeted → owning-app → adjacency)

## Boundaries

- **Always:** Run `tsc -b` + lint + vitest before commit; follow existing RiskPayload interface; reuse RISK_COLORS; tenant-scoped queries; RBAC `merchandising:view`.
- **Ask first:** Any new model field, any shared component change (SpreadsheetGrid), any new library.
- **Never:** Commit secrets; add a new model when computation suffices; break existing PO list/detail consumers; use the product's proper name.

## Success Criteria

- [ ] `GET /api/v1/merchandising/style-versions/{id}/sales_order/` returns per-PO rows with status payloads (5 areas + overall)
- [ ] Status derivation module is pure (no DB writes) and unit-tested for all area × status combinations
- [ ] Sales Order tab on `StyleDetailPage` renders a styled table with color-coded status cells
- [ ] Version dropdown defaults to latest version; selecting a version fetches that version's POs
- [ ] Clicking a PO row navigates to `/purchase-orders/:id`
- [ ] Color palette matches `RISK_COLORS` (none=gray #6b7280, green=#16a34a, amber=#d97706, red=#dc2626)
- [ ] All existing tests remain green (no regression in merchandising adjacency)
- [ ] No new migration, no new model, no shared component change

## Status Derivation Rules

### Fabric (reuse risk_engine pattern)
- Source: `BookingScheduleItem` via PO → shipments → schedule_items
- Delivered → green; in_work → amber; risk_level red (sticky) → red; no items → none

### Trims & Accessories (merged)
- Source: `BOMItem` via PO → file_opening → style_version → boms → items
- Filter: category in {Trim, Trims, Accessories}
- Status field (`BOMItem.status`): Completed → green; Ordered/Partial → amber; TBC → amber if vendor assigned, none if no items

### Production
- Source: `PO.status` + `DailyProduction` (actual_quantity sum) + `BookingScheduleItem` (cut_qty, garments_ready_qty)
- Delivered/Ready → green; in_production/quality_check with actual >= ordered → green; in_production with actual > 0 → amber; draft/open → none

### Delivery
- Source: `PO.status` + `PO.delivery_date` (TOD) + `Hit.actual_delivery_date` (max)
- PO delivered → green; shipped → green; in_production/quality_check + not overdue → amber; overdue (today > delivery_date + not delivered/shipped) → red; no delivery_date → none

### Overall
- Max of all area risk_orders (same as risk_engine `overall_risk`)

## Open Questions

1. **"Other relevant information"** — user mentioned "other" as a sixth area. v1 includes Overall as the sixth. If additional areas (e.g., T&A critical path, commercial docs) are needed, they become a follow-on slice.
2. **Export/print** — out of scope for v1; follow-on slice can add xlsx export + print-with-tick (A4 pattern).
3. **Create PO from Sales Order** — out of scope for v1; existing PO creation via FileOpening detail page is the current flow.
