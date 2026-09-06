# target Feature Inclusion: Implementation Roadmap

> [!IMPORTANT]
> **SUPERSEDED — HISTORICAL REFERENCE ONLY (2026-08-03).** Kept for estimation intent
> (story points per requirement). Active tracking moved to [`master-backlog.md`](../master-backlog.md)
> Part 2 (`RQ-###` requirements, workflow-ordered); do not use the phase/sprint numbers here for planning.

> **Approach**: TDD — write tests BEFORE any code
> **Principle**: Zero breaking changes to existing modules
> **Strategy**: New features in new models/apps first; extend existing models only with test coverage

---

## Phase 0: Foundation (Sprint 0 — 2 weeks)
*Pre-requisite for all target features*

### 0.1 — Celery Task Infrastructure
**Story target-000**: Enable async tasks for schedule management, debits, approvals
- **TDD**: Write test for task registration, task execution, error handling
- **Impact**: No breaking changes — new infrastructure
- **Models**: None
- **Est**: 3 points

### 0.2 — Risk Indicator System
**Story target-001**: Color-coded risk levels across all order modules
- **TDD**: Write test for RiskLevel model, transitions, default values
- **Model**: `RiskLevel` (setup app) with choices: none/amber/green/red/cyan
- **Extend**: Add `risk_level` FK to FileOpening, PurchaseOrder, Shipment
- **Impact**: New field on existing models — no behavior change
- **Est**: 5 points

### 0.3 — Standardized Notes System
**Story target-002**: Notes with author initials, date stamp, ownership
- **TDD**: Write test for Note model, author tracking, removal responsibility
- **Model**: `Note` (abstract) with `author`, `text`, `created_at`, `is_active`
- **Impact**: New model, no existing model changes
- **Est**: 3 points

### 0.4 — Supplier Pre-Approval Workflow
**Story target-003**: Finance-gated supplier/trim approval
- **TDD**: Write test for approval workflow, pre-approved list enforcement
- **Extend**: Add `is_approved`, `approved_by`, `approved_at` to Vendor model
- **Impact**: New fields, no behavior change for unapproved vendors yet
- **Est**: 3 points

**Phase 0 Total**: 14 points

---

## Phase 1: Core Manufacturing Workflows (Sprints 1-3 — 6 weeks)
*The "must-have" target features that unlock garment-specific workflows*

### Sprint 1: Fabric Management Foundation

#### 1.1 — Fabric Master Data
**Story target-004**: Fabric model with supplier, composition, width, category
- **TDD**: Test Fabric CRUD, supplier validation, composition validation
- **Model**: `Fabric` (setup app) with supplier, composition, width, category, is_active
- **Impact**: Net-new, zero breaking changes
- **Est**: 5 points

#### 1.2 — Fabric Tolerance Tables
**Story target-005**: Customer-specific fabric tolerance rules
- **TDD**: Test tolerance calculation by customer type and quantity
- **Model**: `FabricTolerance` with customer_type, qty_from, qty_to, tolerance_pct
- **Impact**: Net-new
- **Est**: 3 points

#### 1.3 — Fabric Order with Lab Dip/Bulk Tracking
**Story target-006**: Fabric PO with lab dip required/actual/approval, bulk approval, ETD/onboard
- **TDD**: Test fabric order lifecycle (raised→lab dip→bulk approval→onboard→cleared)
- **Model**: `FabricOrder` with supplier, lab_dip_required_date, lab_dip_actual, lab_dip_approved, bulk_approved, onboard_date, eta_date, clearance_date
- **Impact**: Net-new, linked to PurchaseOrder
- **Est**: 8 points

#### 1.4 — Fabric Risk & Schedule
**Story target-007**: Color risk on fabric orders, role-based date ownership
- **TDD**: Test risk transitions, role-based date editing permissions
- **Extend**: Add `risk_level` FK to FabricOrder; add `date_owner` field per date
- **Impact**: New fields, permission checks
- **Est**: 5 points

**Sprint 1 Total**: 21 points

---

### Sprint 2: Trims, Labels & Hits

#### 2.1 — Trim/Label Schedule
**Story target-008**: Full trim/label line item with supplier, quantity, delivered, ETA, status
- **TDD**: Test trim schedule CRUD, supplier enforcement, status transitions (TBC→Completed)
- **Extend**: BOMItem model with supplier_fk, ordered_qty, delivered_qty, eta_date, confirmed_date, actual_date, status (TBC/Completed)
- **Impact**: Extends existing model with new optional fields
- **Est**: 8 points

#### 2.2 — Trim/Label Copy From Order
**Story target-009**: Copy trim/label details from previous order
- **TDD**: Test copy with overwrite option, selective copy (detail/washcare)
- **Impact**: New service/action, no model changes
- **Est**: 5 points

#### 2.3 — Hit Management
**Story target-010**: Hit numbers per PO item, delivery mode, factory transfer
- **TDD**: Test hit creation, uniqueness per color, delivery mode choices
- **Model**: `Hit` with po_item, hit_number, colour, delivery_mode, factory_override, original_delivery_date, actual_delivery_date
- **Impact**: Net-new model linked to PurchaseOrderItem
- **Est**: 8 points

**Sprint 2 Total**: 21 points

---

### Sprint 3: Spec Management & Job Queue

#### 3.1 — Fit Specification System
**Story target-011**: Fit specs with measurement data per order
- **TDD**: Test fit spec CRUD, versioning, current-fit selection
- **Model**: `FitSpec` with order, version, fit_number (Dev/1st/2nd/etc.), measurements JSON, notes, images, is_current
- **Impact**: Net-new, linked to PurchaseOrder
- **Est**: 8 points

#### 3.2 — Fit Spec Copying
**Story target-012**: Copy fit spec from another order/style
- **TDD**: Test copy with full-style-number search, picks ticked spec
- **Impact**: New action on FitSpecViewSet
- **Est**: 5 points

#### 3.3 — Job Request/Queue System
**Story target-013**: Cross-department job requests (pattern, sample, 3D, mini-marker)
- **TDD**: Test job creation, type filtering, assignment, queue ordering
- **Model**: `JobRequest` with job_type, style, description, work_location, assigned_to, required_by_date, status, notes
- **Impact**: Net-new model, new app or in `core`
- **Est**: 8 points

#### 3.4 — Job Queue Dashboard
**Story target-014**: Dynamic queue view with filters, priority, history
- **TDD**: Test queue filtering, status aggregation, history endpoint
- **Impact**: New views/serializers + frontend
- **Est**: 5 points

**Sprint 3 Total**: 26 points

**Phase 1 Total**: 68 points (3 sprints)

---

## Phase 2: Production & Logistics (Sprints 4-5 — 4 weeks)

### Sprint 4: Booking Schedule & Fabric Schedule

#### 4.1 — Booking Schedule
**Story target-015**: Weekly booking schedule with status flow, risk, cut qty, garments ready
- **TDD**: Test schedule creation, status flow (Live→In Work→Delivered), risk markers
- **Model**: `BookingScheduleItem` with shipment, hit, status, cut_qty, garments_ready_qty, ex_factory_date, notes
- **Impact**: Net-new, linked to Shipment/Hit
- **Est**: 8 points

#### 4.2 — Gold Seal Tracking
**Story target-016**: Gold seal sample sent/approval dates
- **TDD**: Test gold seal lifecycle
- **Model**: `GoldSeal` with shipment, sent_date, approval_date, notes
- **Extend**: Shipment with gold_seal FK
- **Impact**: Net-new
- **Est**: 3 points

#### 4.3 — Fabric Schedule with Role Handoff
**Story target-017**: Role-based date chain (sales→merch→planning→logistics)
- **TDD**: Test date ownership, handoff triggers, permission enforcement
- **Extend**: FabricOrder with date ownership tracking fields
- **Impact**: Extends existing
- **Est**: 5 points

#### 4.4 — Booking Ref Management
**Story target-018**: Booking reference with 14-day minimum requirement
- **TDD**: Test booking ref validation, 14-day alert
- **Extend**: Shipment with `booking_reference`, `booking_ref_required_date`
- **Impact**: New fields, alert logic
- **Est**: 3 points

**Sprint 4 Total**: 19 points

---

### Sprint 5: Order Manager & Dockets

#### 5.1 — Order Manager Dashboard
**Story target-019**: Per-order risk overview with fabric/labels/trims/technical status
- **TDD**: Test risk aggregation, color coding, completion-date ordering
- **Impact**: New view/serializer + frontend (no new models)
- **Est**: 8 points

#### 5.2 — Docket Management
**Story target-020**: Docket with contract pricing, fabric over-200m handling
- **TDD**: Test docket creation, over-200m notification trigger
- **Model**: `Docket` with shipment, contract_price, total_fabric_meters, notes
- **Impact**: Net-new, linked to Shipment
- **Est**: 5 points

#### 5.3 — Final Hit Reconciliation
**Story target-021**: Quantity vs docket check at final hit
- **TDD**: Test reconciliation calculation, >20-unit short debit trigger
- **Extend**: Shipment with `reconciled_at`, `reconciled_by`, `shortage_units`
- **Impact**: New fields/actions
- **Est**: 5 points

#### 5.4 — Shipping Paperwork Comparison
**Story target-022**: Shipped qty vs ordered qty analysis
- **TDD**: Test comparison calculation, garment producibility estimate
- **Impact**: New service, no model changes
- **Est**: 5 points

**Sprint 5 Total**: 23 points

**Phase 2 Total**: 42 points (2 sprints)

---

## Phase 3: Commercial & Quality (Sprints 6-7 — 4 weeks)

### Sprint 6: Debits, Invoice & Sales Confirmation

#### 6.1 — Debit Note System
**Story target-023**: Pro forma debits with compliance workflow
- **TDD**: Test debit creation, compliance email, over-tolerance enforcement
- **Model**: `DebitNote` with type, amount, reason, status (pro_forma/issued/paid), compliance_email_sent
- **Impact**: Net-new model in `commercial`
- **Est**: 8 points

#### 6.2 — Invoice Approval
**Story target-024**: Qty/date/price matching against target data
- **TDD**: Test invoice matching, mismatch alert, auto-approval flag
- **Extend**: Existing invoice concept or net-new `InvoiceApproval` model
- **Impact**: Net-new
- **Est**: 5 points

#### 6.3 — Sales Confirmation
**Story target-025**: 48-hour dispute window workflow
- **TDD**: Test confirmation creation, 48h timer, auto-acceptance
- **Model**: `SalesConfirmation` with order, sent_at, disputed_at, accepted_at
- **Impact**: Net-new
- **Est**: 5 points

#### 6.4 — Quick Lead Time Orders
**Story target-026**: Yellow risk marking with agreement workflow
- **TDD**: Test quick lead marking, cross-screen visibility, agreement recording
- **Extend**: FileOpening with `is_quick_lead`, `quick_lead_agreed_by` (JSON)
- **Impact**: Minimal
- **Est**: 3 points

**Sprint 6 Total**: 21 points

---

### Sprint 7: Stock Fabric, Repeats, Compliance Audit

#### 7.1 — Stock Fabric Management
**Story target-027**: Separate stock fabric FN with meter tracking
- **TDD**: Test stock fabric creation, meter allocation/reduction, balance tracking
- **Extend**: FileOpening with `is_stock_fabric`, `stock_fabric_description`, `total_meters`, `allocated_meters`, `balance_meters`, `stock_photo`
- **Impact**: Extends FileOpening model
- **Est**: 8 points

#### 7.2 — Repeats Management
**Story target-028**: Create repeat from original FN with multi-department approval
- **TDD**: Test repeat creation, department approval gates, original FN linking
- **Extend**: FileOpening with `original_fn` FK (self-referencing), `is_repeat`
- **Impact**: Self-referencing FK, new workflow
- **Est**: 5 points

#### 7.3 — Compliance Audit
**Story target-029**: Weekly order review with 10-point checklist
- **TDD**: Test audit creation, checklist scoring, weekly schedule
- **Model**: `ComplianceAudit` with order, week_start, scores (10 fields), overall_pass
- **Impact**: Net-new model in `monitoring`
- **Est**: 5 points

#### 7.4 — Fabric Utilization & Monthly Reports
**Story target-030**: Monthly fabric utilization analysis with damged/unusable tracking
- **TDD**: Test utilization calculation, report generation
- **Model**: `FabricUtilization` with FabricOrder FK, used_meters, wasted_meters, damaged_meters, efficiency_pct
- **Impact**: Net-new
- **Est**: 5 points

**Sprint 7 Total**: 23 points

**Phase 3 Total**: 44 points (2 sprints)

---

## Phase 4: Costing & Design Polish (Sprint 8 — 2 weeks)

### 8.1 — Order-Level Costing Enhancements
**Story target-031**: 8 cost categories, 5 sheet types, exchange rate, line-item changes
- **TDD**: Test category enforcement, sheet type filtering, landed cost calculation
- **Extend**: Costing model with `cost_category`, `sheet_type`, `exchange_rate`, `is_single_size`, `size_ratio`
- **Impact**: Extends existing
- **Est**: 8 points

### 8.2 — Design Costing: Pattern Options
**Story target-032**: 4 patterned fabric options, single-size watermark, size ratio
- **TDD**: Test pattern option calculation, watermark overlay logic, ratio input validation
- **Extend**: Costing with `patterned_fabric_options` JSON, `single_size_watermark` bool
- **Impact**: Extends existing
- **Est**: 5 points

### 8.3 — Design Image Management
**Story target-033**: Main/range image roles, annotations, unsold analysis
- **TDD**: Test image role assignment, annotation overlay, unsold query
- **Extend**: Style with `image_main`, `image_range` fields; new `StyleAnnotation` model
- **Impact**: Extends Style + net-new annotation model
- **Est**: 5 points

### 8.4 — Not Sold Analysis
**Story target-034**: Quarterly unsold styles report from samples
- **TDD**: Test unsold query, date range filtering, Job Queue integration
- **Impact**: New report type
- **Est**: 3 points

**Sprint 8 Total**: 21 points

---

## Summary

| Phase | Sprints | Points | Key Deliverables |
|-------|---------|--------|-----------------|
| Phase 0: Foundation | 1 | 14 | Celery, Risk, Notes, Supplier Approval |
| Phase 1: Core Mfg | 3 | 68 | Fabric System, Trims/Labels, Hits, Specs, Job Queue |
| Phase 2: Prod/Logistics | 2 | 42 | Booking Schedule, Fabric Schedule, Order Manager, Dockets |
| Phase 3: Commercial/QA | 2 | 44 | Debits, Invoice Approval, Sales Confirmation, Compliance |
| Phase 4: Costing/Design | 1 | 21 | Costing Enhancements, Design Images, Not Sold Analysis |
| **TOTAL** | **9** | **189** | **30 new stories (target-000 → target-034)** |

### Total Sprint Plan: 9 sprints (18 weeks)

---

## Zero-Breaking-Change Strategy

1. **New models → new apps or tables**: Fabric, FitSpec, JobRequest, BookingSchedule, DebitNote, GoldSeal — all net-new, won't affect existing code
2. **Existing model extensions**: Add nullable fields with defaults — zero migration issues
3. **New views/serializers**: Separate from existing viewsets — no endpoint changes
4. **Frontend**: New pages under new routes — existing routes unchanged
5. **Test-first**: Every story includes unit + integration tests before implementation code
6. **Feature flags**: Major workflow changes behind `FeatureFlag` model for staged rollout
