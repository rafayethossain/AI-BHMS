# Prototype Data Model (mock contract)

> The entity/field surface the prototype's mock data (`app/src/mock/`) must satisfy. Derived from the
> canonical `data-model.md`; this IS the frozen contract the dev team will implement server-side.
> **No new schema is invented here** — if prototype review changes a field, record it in `scope.md`
> change log and update this doc, then `mock/types.ts`.
>
> Conventions: all entities carry `id` (string), `tenant` (single demo tenant), `status` where the
> domain has one, ISO dates (`YYYY-MM-DD`), and `revision_notes`. Amounts are strings (two decimals)
> to mirror decimal money. FKs are represented by nested objects `{ id, label }` in list payloads
> (the UI usually needs the label directly).

## 1. Core chain (Design version/FN → PO)

```
Style ── StyleVersion (version_number, fn_number [File Number], buyer→, revision_notes, status,
        commercial file: is_quick_lead, quick_lead_agreed_by, is_repeat, original_fn→,
        repeat_approved_by, departments approvals, stock fabric flags)
   │      └── FileOpeningNote (author, action, note, milestone_date)
   │      └── JobRequest (number, job_type, priority, dates, triggers→)
   └── PurchaseOrder (po_number, version/fn→, buyer→, factory→, currency→,
        quantity, unit_price, total_value, delivery_date [TOD], status,
        statuses: risk per area + sales-order pipeline statuses)
        │      └── POAmendment (amendment_number AMD-, fields diff, statuses, doc, action trail)
        ├── PurchaseOrderItem (color→, size, qty)
        ├── Hit (hit_number, colour, delivery dates, boxed/hanging, sea/air, actual_delivery_date)
        ├── Costing (sheet_type, exchange_rate, live_tick, cost_lines[],
        │           ladder derived from the version's design costing + PO totals)
        ├── TAMilestone (ta_number, line/item/color, dates, colour/sequence flags, open/done/na)
        ├── DailyProduction (date, produced, machine, operator, remarks)
        └── Shipment link (many-to-many via shipment_po over 9-stage flow)
```

**PO status enum** (drives lifecycle tabs): `draft | open | confirmed | in_production |
quality_check | ready | shipped | delivered | cancelled`.

**FN / commercial-file status enum** (carried on StyleVersion): `draft | open | approved |
in_production | delivered | cancelled` (plus quick-lead/repeat approval states).

**Style/Design status**: `active | archived | in production | draft` (+ design-sheet lifecycle transitions).

## 2. Risk & Sales-Order status payloads

```ts
type RiskPayload = { code: 'none'|'green'|'amber'|'red'; label: string; color: string; numeric: 0|1|2|3 }
type SalesOrderStatuses = { fabric; trims; production; delivery; overall }  // each RiskPayload
```

Derivation rules (canonical, copied from the shipped RQ-051 implementation):
- **Fabric**: file-opening fabric risk (delivered→green, in_work→amber, sticky red→red; no items→none).
- **Trims & Accessories**: BOM items in trim categories — all `Completed`→green, any
  `Ordered | TBC | Partial`→amber, none→none.
- **Production**: PO `delivered|ready|shipped|quality_check`→green; `in_production` with
  `daily_production + garment schedule ≥ quantity`→green else amber; `draft|open|cancelled`→none.
- **Delivery**: `delivered|ready|shipped`→green; overdue (today > `delivery_date` and not
  delivered) →red; else amber when a future TOD exists; `draft|open|cancelled` or no TOD→none.
- **Overall**: max of the four.

Mock must include rows that hit EVERY branch (see `mock-data-spec.md`).

## 3. Supporting modules (field lists kept at mock/types.ts)

- **Design**: `StyleTechPack` (import status, per-section progress: sketches, design images, tech
  packs, fit specs, job requests, materials), `DesignSheet` (header, sketch, material breakdown incl.
  accessories/other, fit_specs, images, job_requests), `FitSpecification` (+ `FitImage`),
  `DesignJobRequest` (job_type/priority), `StyleItem` (colour/size/colour-ways). `StyleVersion`
  carries `fn_number` + the commercial-file attributes (quick-lead/repeat/approvals/stock flags).
- **Merchandising**: `POAmendment` (AMD-###, statuses, field diffs, action trail), `TAMilestone`
  (ta_number, po→, line, item, colour, milestone_date, due_date, first_milestone flags,
  statuses open/done/na), `FileOpeningNote`, `JobRequest` (number, job_type, priority, dates,
  reassignment/alert triggers). `Costing.ladder` is **derived** from the version's design costing
  + PO totals.
- **Commercial**: `SalesConfirmation` (status: draft/sent/disputed/accepted, 48h window),
  `SalesContract`, `ProformaInvoice`, `LC` (+ `LCAmendment`), `Bank`, `DebitNote` (over-tolerance
  flag), `InvoiceApproval`.
- **Procurement**: `FabricCategory`, `FabricHTSCode` (duty), `FabricSupplier` (+ `FabricMill`),
  `FabricBooking`, `MaterialsPO` (type: fabric/trims/labels/accessories/other; generated from the
  BOM/materials breakdown; terms & clauses; booking reference; schedule lines; print template;
  status draft/confirmed/partial/delivered) + `MaterialsPOItem`, `FabricOrder` (risk_level,
  strike-off×3, actual arrival, paperwork/bulk notes, schedule handoffs), `FabricScheduleHandoff`
  (audit of date-owner handoffs), `FabricTolerance` (customer_type × qty-band thresholds),
  `FabricUtilization` (monthly/quarterly cut/qty), `StockFabricAllocation`, `BOMItem` (categories:
  trims, labels, accessories, other; status Ordered/TBC/Partial/Completed). *RFQ entity retained but
  deferred* (see `business-workflow.md` decisions log #3).
- **Production**: `ProductionPlan`, `DailyProduction`, factory portal rows.
- **Quality**: `Inspection` (inline/final/pre-shipment) + `InspectionItem` rows, `ComplianceAudit`
  (weekly 8-item), `GoldSeal` (pending/sent/approved/rejected), `CorrectiveAction`.
- **Logistics**: `Shipment` (eta, booking_reference, booking_ref_required_date), `FreightForwarder`,
  `Docket`, `ImportRecap`, `ExportRecap`, `ForwardOrder`, `FinalHitReconciliation`,
  `ShippingPaperworkComparison` (ordered/shipped/docket qty + tolerance, covers_order),
  `SupplierPayment`, `CostReconciliation`, `BookingScheduleItem` (live/in_work/delivered, cut_qty,
  garments_ready, ex-factory, is_last_hit, snapshot).
- **Reports/Setup/Help**: saved reports, report schedules; tenant/office/master-data rows (20
  categories: brands, risk levels, compliant doc types, delivery modes, departments, designations,
  product departments, …); users/roles/audit-log/health; `ReleaseNote`, `OnboardingChecklistItem`,
  `TourCompletion`.

### Status enums used beyond the core chain

- **Shipment**: `draft | booking | booked | picked_up | in_transit | at_port | on_water | arrived |
  cleared | delivered` (+ cancelled). Documents: 8 types per shipment.
- **LC**: `draft | issued | confirmed_received | amended | accepted | utilized | closed` (+
  nomination/transfer annotation).
- **Job request**: job types (style creation, costing, tech pack, fabric, knitting, dyeing,
  laundering, screen print, alternate source, embroidery, sampling, price negotiation, legal) with
  priorities `high | medium | low`.
- **Invoice approval**: `pending | approved | rejected` with 5%/2% tolerance and >20-unit rules.

## 4. Demo dimensions (see `mock-data-spec.md` for exact volumes)

~15 designs (REG-1001..1010 + DSD-1001..1005), ~20 versions (1–2 per style; ~9 opened as FN
commercial files), ~12 POs across statuses, 18 hits, 75 BOM items (incl. accessories/other), 5 design costings (with ladder),
5+ PO costings (ladder derived), 8 materials POs (fabric/trims/labels/accessories/other), 4 fabric
orders (one >200m docket), 6 shipments (9-stage flow, 8 doc types), 5 freight forwarders, tolerance
+ utilization rows, booking-schedule rows, quality/production/commercial rows sufficient to exercise
every status and every risk branch. Amounts formatted as strings with 2 decimals. All dates ISO.