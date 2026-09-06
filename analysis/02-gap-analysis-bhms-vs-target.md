# BHMS vs target: Gap Analysis

> [!IMPORTANT]
> **SUPERSEDED — HISTORICAL REFERENCE ONLY (2026-08-03).** Kept for priority/dependency intent.
> Active tracking moved to [`master-backlog.md`](../master-backlog.md) Part 2
> (`RQ-###` requirements, workflow-ordered).

> **Date**: 2026-07-30
> **Methodology**: Deep comparison of the target buying-house reference 48-page manual vs current BHMS codebase (12 Django apps, 40+ models, 20+ frontend pages)
> **Existing Gaps (backlog)**: 6 items (US-003, US-016, US-053, US-091, US-108, US-015)
> **target-Identified Gaps**: 50+ new feature areas

---

## Priority Matrix

### P0 — Critical (Blocking operational parity)
*Must implement to compete with target*

| # | Gap | target Area | BHMS Gap | Impact | Effort | Dependencies |
|---|-----|---------|----------|--------|--------|-------------|
| G-01 | Fabric Management System | Fabric (8) | No fabric model, lab dip, bulk, tolerances, risk colors, supplier management | **HIGH** — core to garment business | 3-4 sprints | Models, new app? |
| G-02 | Trims & Labels Management | Trims (9) | No trim schedule, location, copy-from-order, price variance | **HIGH** — every order needs this | 2 sprints | Extend BOM |
| G-03 | Hit/Breakdown Management | Breakdown (7) | No hit numbers, delivery modes, factory transfers | **HIGH** — production planning basis | 2 sprints | Extend POItem |
| G-04 | Booking Schedule | Booking (11) | No weekly schedule, status flow, risk markers, notes system | **HIGH** — production tracking | 2-3 sprints | New model |
| G-05 | Spec/Fit Management | Spec (2) | No fit specs, measurement sheets, spec copying | **HIGH** — design→production handoff | 3-4 sprints | New app/models |
| G-06 | Job Request/Queue | Job Queue (4) | No job type system, work routing, queue management | **HIGH** — cross-department workflow | 2 sprints | New model, Celery |

### P1 — High (Important operational features)

| # | Gap | Area | Detail | Impact | Effort |
|---|------|------|--------|--------|--------|
| G-07 | Fabric Schedule | Fabric Schedule (12) | Role-based date tracking (sales→merch→planning→logistics) | HIGH | 2 sprints |
| G-08 | Order Manager / Critical Path | Order Mgr (13) | Per-order risk dashboard, weekly critical path review | HIGH | 2 sprints |
| G-09 | Dockets & Reconciliation | Dockets (15) | Shipping paperwork vs ordered, final hit reconciliation | HIGH | 2 sprints |
| G-10 | Debits Management | Debits (16) | Pro forma debits, compliance workflow, over-tolerance | MEDIUM | 1 sprint |
| G-11 | Order-Level Costing Enhancements | Costing Sheet (6) | 8 categories, 5 sheet types, exchange rates, line-item changes | MEDIUM | 1-2 sprints |
| G-12 | Design Costing Enhancements | Design Costing (3) | Patterned fabric options, size ratio, single-size watermark | MEDIUM | 1 sprint |

### P2 — Medium (Value-add differentiators)

| # | Gap | Area | Detail | Impact | Effort |
|---|------|------|--------|--------|--------|
| G-13 | Design Image Management | Design (1) | Main/range images, annotations, not-sold analysis | MEDIUM | 1-2 sprints |
| G-14 | Quick Lead Time Orders | Orders (5) | Yellow risk marking across all screens | LOW | 0.5 sprint |
| G-15 | Repeats Management | Orders (5) | Copy order with multi-department approval | MEDIUM | 1 sprint |
| G-16 | Stock Fabric Management | Orders (5) | Separate FN with meter tracking | MEDIUM | 1 sprint |
| G-17 | Sales Confirmation | Orders (5) | 48-hour dispute window workflow | MEDIUM | 1 sprint |
| G-18 | Fabric Issue Reporting | Fabric (8) | Monday.com-style factory claim form | LOW | 0.5 sprint |
| G-19 | Invoice Approval | Invoice (17) | Qty/date/price matching against target data | LOW | 1 sprint |
| G-20 | Compliance Audit | Compliance (19) | Weekly order review with 10 checklist items | LOW | 1-2 sprints |

### P3 — Low (Nice to have, future phase)

| # | Gap | Area | Detail | Impact | Effort |
|---|------|------|--------|--------|--------|
| G-21 | Gold Seal Tracking | Booking (11) | Sample sent/approval tracking | LOW | 0.5 sprint |
| G-22 | Snapshot Status Presets | Booking (11) | Pre-selected status options | LOW | 0.5 sprint |
| G-23 | China Office Fabric Role | Fabric (12) | Specific role for schedule management | LOW | — (process) |
| G-24 | Teams Integration | Comms (18) | Per-customer Teams channels | LOW | 1 sprint |
| G-25 | Auto Invoice Approval | Invoice (17) | target/accounts package integration | LOW | Future phase |

---

## BCG Matrix (Impact vs Feasibility)

```
IMPACT (HIGH)
  ↑
  │  G-01 ● Fabric Mgmt        G-03 ● Hit Mgmt
  │  G-02 ● Trims/Labels       G-05 ● Spec Mgmt
  │  G-06 ● Job Queue          
  │                             G-07 ● Fabric Schedule
  │  G-04 ● Booking Schedule   G-08 ● Order Manager
  │                             G-09 ● Dockets/Recon
  │
  │  G-11 ● Costing Enhance    G-12 ● Design Costing
  │  G-13 ● Design Images      G-10 ● Debits
  │  G-15 ● Repeats            G-14 ● Quick Lead
  │  G-16 ● Stock Fabric       G-17 ● Sales Confirm
  │
  │  G-19 ● Invoice Approve    G-18 ● Fabric Issue
  │  G-20 ● Compliance Audit   G-21 ● Gold Seal
  │  G-22 ● Snapshot           G-23 ● China Role
  │  G-24 ● Teams Integration  
  │                             G-25 ● Auto Invoice
  └───────────────────────────────────────────────→
  LOW FEASIBILITY                   HIGH FEASIBILITY
```

---

## New Models Required (vs Extending Existing)

### Net-New Models (need new Django app or tables)

| Model | Purpose | App | Priority |
|-------|---------|-----|----------|
| `Fabric` | Fabric master data (supplier, composition, width) | `merchandising` or new `materials` app | P0 |
| `FabricOrder` | Fabric PO with lab dip, bulk, onboard tracking | `merchandising` | P0 |
| `TrimLabel` | Trim/label line items with location, supplier, schedule | `merchandising` | P0 |
| `Hit` | Production hit (color+size group), delivery mode, factory | `merchandising` | P0 |
| `FitSpec` | Fit specification with measurements per order | `merchandising` or new `technical` app | P0 |
| `FitSpecVersion` | Versioned fit specs (Dev, 1st, 2nd, etc.) | `merchandising` | P0 |
| `JobRequest` | Job queue item with type, location, assignee | `core` | P0 |
| `BookingSchedule` | Weekly booking with status, risk, notes | `logistics` | P0 |
| `GoldSeal` | Gold seal tracking per order | `quality` | P2 |
| `DebitNote` | Debit management with compliance workflow | `commercial` | P1 |
| `FabricUtilization` | Monthly fabric utilization report | `reporting` | P1 |
| `FabricTolerance` | Customer-specific tolerance tables | `setup` | P0 |
| `SalesConfirmation` | Sales confirmation with 48h timer | `commercial` | P1 |
| `ComplianceAudit` | Weekly audit checklist per order | `monitoring` | P1 |

### Existing Models to Extend

| Model | New Fields | Priority |
|-------|------------|----------|
| `Style` | `image_main`, `image_range`, `block_reference`, `garment_type` | P1 |
| `StyleVersion` | `measurements` (JSON), `spec_data` (JSON), `is_current_fit` | P0 |
| `BOMItem` | `location_on_garment`, `supplier_fk`, `eta_date`, `confirmed_date`, `actual_date`, `status` (TBC/Completed) | P0 |
| `Costing` | `cost_category` (choice: 1-8), `exchange_rate`, `is_single_size`, `size_ratio`, `patterned_fabric_options` | P1 |
| `PurchaseOrderItem` | `hit_number`, `delivery_mode` (boxed/hanging), `factory_transfer`, `delivery_type` (sea/air/air-paid) | P0 |
| `FileOpening` | `country_suffix` (VN/SL/R), `is_stock_fabric`, `is_quick_lead`, `original_fn` (for repeats) | P1 |
| `Supplier` / `Vendor` | `is_fabric_supplier`, `is_trim_supplier`, `pre_approved`, `approval_date` | P1 |
| `Shipment` | `booking_reference`, `cut_quantity`, `garments_ready_qty`, `ex_factory_date`, `ex_factory_notes`, `snapshot_status` | P0 |
| `DailyProduction` | `garments_packed_qty`, `gold_seal_sent_date`, `gold_seal_approved_date` | P1 |
| `Inspection` | `aql_reject_count`, `aql_accept_count` (for standard tables lookup) | P1 |
| `Factory` | `location_type` (factory/office), `country_suffix` | P1 |

---

## Cross-Cutting Concerns

| Area | Current BHMS | target Pattern | Action |
|------|-------------|------------|--------|
| **Risk Indicators** | None | Color-coded (Green→Amber→Red→Cyan) per order/sub-area | Add `RiskLevel` model or JSON field on order |
| **Notes System** | Plain text fields | Initials + date prefix, responsible for removal, snapshot presets | Standardize across models |
| **Role-Based Date Ownership** | None | Sales→Merch→Planning→Logistics handshake chain | Add date ownership tracking |
| **Approval Workflows** | Basic approve/reject | Multi-step (submit→dept check→final) | Enhance state machine pattern |
| **Supplier Pre-Approval** | Free-text vendor | Drop-down only, finance-gated | Add `is_approved` + approval workflow |
