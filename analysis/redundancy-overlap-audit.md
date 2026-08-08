# BHMS Redundancy & Overlap Audit

**Scope**: Read-only analysis of redundant, overlapping, or unnecessary features across the BHMS codebase, prioritised by business value for a Bangladesh apparel buying house.
**Date**: 2026-08-06
**Method**: Static analysis of `backend/apps/**` + `frontend/src/**`, cross-referenced against `master-backlog.md` (RQ/GC requirements) and the GC Manual gap analyses in `analysis/`.

---

## Executive Summary

The codebase is **intentionally feature-rich**: most models map 1:1 to GC Manual requirements (RQ-010 Hits, RQ-021 Booking Schedule, RQ-027 Final Hit Reconciliation, RQ-031 Paperwork Comparison, etc.). Genuine **redundancy is concentrated in six places**:

1. **`Hit` vs `PurchaseOrderItem`** — the business entities are distinct and must BOTH stay, but `Hit.colour` (free-text) duplicates `PurchaseOrderItem.color` (FK → `setup.ColorCode`) with no referential integrity. **Primary finding.**
2. **Two executive-dashboard KPI endpoints** compute the same numbers from the same models.
3. **`fabric.FabricInventory` is a manual register with zero links to the real stock-fabric flow** (`FileOpening.is_stock_fabric` + `StockFabricAllocation`), and even the "inventory" report ignores it.
4. **The Reports app (`SavedReport`/`ReportSchedule`)** is a flat-dump wrapper over the same filterable list pages; its scheduling feature has **no worker** and can never fire.
5. **`monitoring.Alert` has no producer code** — it is a manual record table, not an alerting system.
6. **Three unlinked scheduling structures** exist for the same order: `TAMilestone`, `BookingScheduleItem`, `ProductionPlan`.

Plus a naming collision (`delivery_mode`) and an unreachable page (`/dashboard/executive`).

---

## 1. PRIMARY: Is `Hit` duplicative of `PurchaseOrderItem`?

### Verdict: **NO as a business entity — KEEP both. But the implementation overlaps in three concrete ways that should be fixed before client delivery.**

### Why both must exist (business reality)

- `PurchaseOrderItem` is the **commercial contract line** at colour×size granularity: `purchase_order`, `color` (FK → `setup.ColorCode`), `size`, `quantity`, `unit_price` — `backend/apps/merchandising/models.py:400-414`.
- `Hit` is the **production commitment per colour** (aggregate across all sizes of that colour), carrying the *production system key* used by the factory: `hit_number` + `colour` — `backend/apps/merchandising/models.py:427-461`. This is a GC requirement (GC-010 "Breakdown Tab", §6.2.5), not an artifact.
- The codebase **already went through this exact refactor**: migration `backend/apps/merchandising/migrations/0016_hit_reparent_to_purchase_order.py` reparented `Hit` from `po_item` to `purchase_order` and deduplicated on `(tenant, purchase_order, colour)`. The backlog records it: *"Sprint 2.6 — Hit model; Sprint 2.10 — reparented to PO (was PO item)"* — `master-backlog.md:3394`.
- The original gap analysis proposed putting hit fields **on** `PurchaseOrderItem` (`analysis/02-gap-analysis-bhms-vs-gc.md:122`), but the implemented shape (separate PO-child model) is the better design. **Do not re-merge** — merging would require either duplicating sizes per hit or losing colour-level execution tracking.
- `Hit` is load-bearing across the pipeline:
  - `logistics.BookingScheduleItem.hit` FK — `backend/apps/logistics/models.py:189`.
  - Delivered booking item → auto-raises `FinalHitReconciliation` (GC-021) — `backend/apps/logistics/views.py:272-277`.
  - `FinalHitReconciliation` (per delivered hit, >20-unit shortage ⇒ debit) — `backend/apps/logistics/models.py:303-365`.
  - Frontend: `BookingSchedulePage` hit column (`frontend/src/pages/BookingSchedulePage.tsx:145`), hits API `frontend/src/api/client.ts:1525-1533`, `PurchaseOrderDetailPage` hit tab.

### Concrete overlap #1 — Colour has no referential integrity (HIGH)

| | `Hit.colour` | `PurchaseOrderItem.color` |
|---|---|---|
| Definition | `CharField(max_length=100)` free text — `merchandising/models.py:439` | FK → `setup.ColorCode` — `merchandising/models.py:405` |
| Master data | none (typos create phantom colours) | `setup.ColorCode` code/name/hex — `backend/apps/setup/models.py:300` |
| Uniqueness | `(tenant, purchase_order, colour)` — `models.py:458` | n/a (colour×size) |

The seed command **derives hit colours directly from the PO's item colours** — `backend/apps/setup/management/commands/seed_demo_data.py:2075-2118` — proving the colour set is not independent. The gap analysis even calls colour the "system key" (`analysis/01-gc-feature-catalog.md:110`), so it cannot drift from master data.

**Recommendation**: make `Hit.colour` a `ForeignKey` to `setup.ColorCode` (mirroring `PurchaseOrderItem.color`) with a `validate` on create restricting hits to the PO's item colours. Data-clean the existing free-text values against `ColorCode`. This is a migration + serializer change, no UI change (both already render `colour`).

### Concrete overlap #2 — `Hit.delivery_type` duplicates `Shipment.mode` (MEDIUM)

`Hit.delivery_type` = `sea`/`air` only — `merchandising/models.py:422-424`. `Shipment.MODE_CHOICES` = sea/air/road/rail/multi — `backend/apps/logistics/models.py:44`, applied at `models.py:72`. The shipment that eventually carries a hit (via `BookingScheduleItem`) already records the true mode.

**Recommendation**: keep the field for the production screen (GC requires per-hit sea/air for the breakdown tab) but treat `Shipment.mode` as the source of truth at execution; drop the extra `HitDeliveryType` choices or widen them to match `Shipment.MODE_CHOICES` so values can't disagree.

### Concrete overlap #3 — `Hit.delivery_mode` naming collision (LOW, but confusing)

`Hit.delivery_mode` = **boxed/hanging** packing mode — `merchandising/models.py:417-420, 440-442`. `setup.DeliveryMode` = **FOB/CIF/CM commercial terms** — `backend/apps/setup/models.py:130`; `PurchaseOrder.delivery_mode` FK → it — `merchandising/models.py:338`. Two different concepts sharing one field name; any reader/analyst (and any future AI agent) will conflate them.

**Recommendation**: rename the `Hit` field to `packing_mode` (GC calls it "Boxed/Hanging delivery mode"). Keeps the concept, kills the collision.

### Blast radius (if you touch Hit)

- `backend/apps/logistics/models.py:189` (`BookingScheduleItem.hit`), `logistics/views.py:222-277` (search by `hit__colour` / `hit__hit_number`, delivered trigger), `logistics/serializers.py:61` (`hit_colour = source="hit.colour"`).
- `backend/apps/merchandising/views.py:1987-2044` (HitViewSet, auto `HIT-####` numbering), `serializers.py:208` (HitSerializer), `urls.py:35` (nested route).
- `backend/apps/setup/management/commands/seed_demo_data.py:2075-2118`.
- `frontend/src/api/client.ts:303-307, 1525-1533`, `BookingSchedulePage.tsx:145`, `PurchaseOrderDetailPage.tsx` (hit tab).
- `FinalHitReconciliation` + `DebitNote.reconciliation` — `commercial/models.py:300-307`.

**Recommended action**: keep entity + auto-numbering; fix colour integrity (Overlap #1) before seeding/demoing to clients; optionally rename `delivery_mode` and align `delivery_type`. **Do not delete `Hit`.**

---

## 2. Secondary findings (cross-feature scan)

### O1 — Two dashboard KPI endpoints compute the same things (HIGH)

- `core/views.py:51` `DashboardSummaryView` → `/api/v1/dashboard/summary/` (`core/urls.py:9`). Consumed by `DashboardPage` via `getRichSummary` — `frontend/src/api/client.ts:2023-2037`.
- `monitoring/views.py:133-165` `SystemHealthViewSet.summary` → `/api/v1/monitoring/health/summary/`. Consumed by `ExecutiveDashboardPage` via `getSummary` — `frontend/src/api/client.ts:2021`.

Both aggregate PO-by-status, shipment in-transit/delivered, inspection counts, and LC exposure from the same models. Two endpoints, two pages, one concept.

**Recommendation**: consolidate on `DashboardSummaryView` (it is richer — `core/views.py:74-132` includes pipeline, financials, tasks). Retire `SystemHealthViewSet.summary` and point `ExecutiveDashboardPage` at `/dashboard/summary/` (or delete the page — see P1).

### O2 — `FabricInventory` vs FileOpening stock-fabric system: two parallel inventory systems (HIGH)

- `fabric.FabricInventory` (`backend/apps/fabric/models.py:212-236`): supplier + category + `quantity_on_hand`/`quantity_reserved`/`location`. **Nothing links to it** — no FK from POs, FileOpenings, Bookings, or Orders; the only writers are its own CRUD ViewSet (`fabric/views.py:160-162`), admin, tests, and seeds (`seed_demo_data.py:1870`).
- The real stock-fabric flow lives on `FileOpening`: `is_stock_fabric`, `total_meters`, `allocated_meters` (`merchandising/models.py:113-116`), `mark_as_stock_fabric()` (`models.py:227-262`), and `StockFabricAllocation` (`merchandising/models.py:273`) with allocation maths and a dedicated endpoint (`merchandising/views.py:499-506`).
- Tellingly, the Reports "inventory" report aggregates **PO + BOMItem** and never touches `FabricInventory` — `backend/apps/reporting/views.py:139-153`.

**Recommendation**: `FabricInventory` is demo furniture with no business flow. Either (a) wire it into the fabric order/docket flow so received meters update on-hand, or (b) **remove it** (model, ViewSet, page `/fabric/inventory`, nav item `Layout.tsx:49`) and let the FileOpening stock system carry inventory. Option (b) is lower effort and safer pre-delivery.

### O3 — Reports app duplicates list pages; scheduling is dead code (HIGH)

- `SavedReport` + 7 report types — `backend/apps/reporting/models.py:8-36`; `execute` builds a flat 500-row dump per type — `backend/apps/reporting/views.py:44-153`. Every type duplicates a filterable list page that already exists (POs, DailyProduction, LCs, Inspections, Costings).
- `ReportSchedule` (`reporting/models.py:39`) has **no worker**: no Celery beat entry in `settings/base.py:216` (only the database scheduler), and `core/tasks.py` contains only `debug_task`/`health_check_task`. A `next_run` in the DB is cosmetic — schedules can never fire.

**Recommendation**: before client delivery, either cut Reports to a single CSV-export action per list page, or keep only `SavedReport` (manual "save my filters") and **remove `ReportSchedule` + `ReportSchedulesPage` + `/reports/schedules`** until a scheduler exists.

### O4 — `monitoring.Alert`: no producer (MEDIUM)

`Alert` (`backend/apps/monitoring/models.py:75-110`) is written by exactly one thing in production code: the CRUD `AlertViewSet` (`monitoring/views.py:168`). Every other `Alert.objects.create` lives in tests (`monitoring/tests.py`). Nothing raises alerts on risk/tolerance/reconciliation events — the real "alerting" is the T&A overdue banner (`frontend/src/components/Layout.tsx:349-365` via `getTAAlerts`).

**Recommendation**: either add producers (T&M milestones overdue, shipment ETD/ETA, compliance-audit warnings) or remove the Alerts page/nav item. As-is it invites users to type alerts that nothing will trigger.

### O5 — Three unlinked scheduling structures per order (MEDIUM)

- `TAMilestone` (per PO, planned/actual dates, owner, critical flag) — `merchandising/models.py:775-802`.
- `BookingScheduleItem` (per hit/shipment, week-ending, cut/ready qty, risk) — `logistics/models.py:170-215`.
- `ProductionPlan` (per PO/factory, dates, qty, status) — `production/models.py:9-37`.

None references the others; all three carry overlapping "when does this order move" data and the DashboardSummary "tasks" section only reads `TAMilestone` (`core/views.py:135-150`). **Not removable** — each serves a GC requirement — but the report should note the intentional gap so the client doesn't expect them to reconcile. Lowest-risk action: leave as-is, document.

### O6 — Fragmented change-audit story (MEDIUM)

`AuditLogMiddleware` already records every `POST/PUT/PATCH/DELETE` on `/api/v1/` with old/new JSON — `backend/apps/monitoring/middleware.py:13`. On top of it sit per-entity change records: `POAmendment` (`merchandising/models.py:371`), `LCAmendment` (`commercial/models.py:59`), `CostingLine.is_additional` + `original_description` approvals (`merchandising/models.py:728-748`), `FabricScheduleHandoff` (`fabric/models.py:439-468`), `InvoiceApproval` (`commercial/models.py:380`). And `PurchaseOrderViewSet.trail` (`merchandising/views.py:1209`) re-derives a timeline by **joining `AuditLog`** with related-model events (`views.py:1386-1391`).

The amendments/CAPs/approvals are genuine **workflow** entities (approval gates, reasons) — keep them. The duplication is only in the *view*: `OrderTrailPage` and `AuditLogsPage` both render "who changed what, when". Recommend keeping both but cross-linking (trail already shows audit rows; add a link through to the audit log page).

### O7 — Commercial documents overlap (LOW, informational)

`SalesConfirmation` (GC-025 48h dispute window — `commercial/models.py:192-256`), `ProformaInvoice` (`models.py:116-151`), `SalesContract` (`models.py:154-189`), and `LC` (`models.py:14-56`) all key on PO+buyer+amount+currency+status. `SalesConfirmation` (48h workflow) and `LC` (banking) are distinct. **PI vs SalesContract are the closest pair** (both one-per-PO, both record amount/currency/status) — worth a client question: does this buying house issue both, or is one of them GC drift? **Do not merge** without business confirmation.

### O8 — Delivery-mode & delivery-type vocabulary (covered in §1, #2/#3)

Same names across different domains (`Hit.delivery_mode` packing vs `setup.DeliveryMode` FOB/CIF) — rename/align as above.

---

## 3. Unreachable / orphan UI

| Page | Route | Reachable from nav? | Notes |
|---|---|---|---|
| `ExecutiveDashboardPage` | `/dashboard/executive` — `App.tsx:106` | **No** — only via HelpPage links (`HelpPage.tsx:27`) | Nav has only `/dashboard` (`Layout.tsx:246`). Delete it or link it; keep only if O1 consolidation keeps two dashboards. |
| `TenantSetupPage` | `/setup/tenant` — `App.tsx:144` | No (nested) | Reachable from SetupPage presumably; fine. |
| `OfficeManagementPage` | `/setup/offices` — `App.tsx:145` | No (nested) | Same. |

All other 60+ pages have nav entries (`Layout.tsx:17-116`) and routes (`App.tsx:104-175`). No orphaned API endpoints of note — the dead weight is `reporting` scheduling (O3) and `Alert` (O4).

---

## 4. Recommendation summary

| # | Area | Verdict | Priority | Effort |
|---|------|---------|----------|--------|
| 1 | `Hit` entity vs `POItem` | **Keep both**; do not merge | — | — |
| 1a | `Hit.colour` → FK to `ColorCode` + create-time validation | Fix | **P0** | M |
| 1b | `Hit.delivery_mode` → `packing_mode` (rename) | Fix | P2 | S |
| 1c | `Hit.delivery_type` vs `Shipment.mode` | Align or drop type | P2 | S |
| O1 | Duplicate dashboard endpoints | Merge onto `/dashboard/summary/` | P1 | S |
| O2 | `FabricInventory` disconnected | Wire up or remove | P1 | M |
| O3 | Reports = flat dumps; `ReportSchedule` dead | Cut to exports; remove schedules | P1 | M |
| O4 | `monitoring.Alert` no producer | Add producers or remove | P2 | M |
| O5 | T&A / Booking / ProductionPlan scheduling | Leave; document gap | P3 | S |
| O6 | Trail vs AuditLog vs amendments | Keep; cross-link views | P3 | S |
| O7 | PI vs SalesContract | Ask client; don't merge blind | P2 | S |
| P1 | `/dashboard/executive` orphan | Link or delete | P2 | S |

**Suggested pre-delivery sprint**: 1a → O1 → O3 → O2 → P1 → 1b/1c (≈2 sprint-equivalents, mostly backend migrations + small frontend tweaks, all backwards-compatible or additive).

---

## Appendix — evidence index

- Hit model/fields: `backend/apps/merchandising/models.py:427-461`; choices `417-424`
- Hit auto-numbering + nested context: `backend/apps/merchandising/views.py:1987-2044`
- Hit reparent migration: `backend/apps/merchandising/migrations/0016_hit_reparent_to_purchase_order.py`; backlog note `master-backlog.md:3394`
- POItem fields: `backend/apps/merchandising/models.py:400-414`; `ColorCode` `backend/apps/setup/models.py:300`
- Seeds derive hit colours from PO items: `backend/apps/setup/management/commands/seed_demo_data.py:2075-2118`
- `BookingScheduleItem.hit`: `backend/apps/logistics/models.py:170-215` (FK at `:189`); delivered trigger `backend/apps/logistics/views.py:272-277`; serializer `hit_colour` `backend/apps/logistics/serializers.py:61`
- `FinalHitReconciliation`: `backend/apps/logistics/models.py:303-365`; `DebitNote.reconciliation` `backend/apps/commercial/models.py:300-307`
- Dashboards: `backend/apps/core/views.py:51` + `core/urls.py:9` vs `backend/apps/monitoring/views.py:133-165`; consumers `frontend/src/api/client.ts:2021-2037`
- Fabric inventory: `backend/apps/fabric/models.py:212-236`; stock fabric `merchandising/models.py:113-116, 227-262, 273`; inventory report ignores it `backend/apps/reporting/views.py:139-153`
- Reports scheduling dead: `backend/apps/reporting/models.py:8-36`; `reporting/views.py:44-153, 284-286`; no beat entry `settings/base.py:216`; `core/tasks.py`
- Alert no producer: `backend/apps/monitoring/models.py:75-110`; `monitoring/views.py:168`; producers only in tests `monitoring/tests.py`
- Trail vs AuditLog: `merchandising/views.py:1209, 1386-1391`; `monitoring/middleware.py:13`
- Scheduling trio: `merchandising/models.py:775-802`; `logistics/models.py:170-215`; `production/models.py:9-37`
- Nav/routes: `frontend/src/components/Layout.tsx:17-116`; `frontend/src/App.tsx:104-175`
