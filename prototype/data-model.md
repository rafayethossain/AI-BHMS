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

## 1. Core chain (Design → File Opening → PO)

```
Style ── StyleVersion (version_number, revision_notes, status)
   │
   └── FileOpening (file_number, style→, style_version→, buyer→, status,
        is_quick_lead, quick_lead_agreed_by, is_repeat, original_fn→, repeat_approved_by,
        departments approvals, stock fabric flags)
          │
          └── PurchaseOrder (po_number, file_opening→, buyer→, factory→, currency→,
               quantity, unit_price, total_value, delivery_date [TOD], status,
               statuses: risk per area + sales-order pipeline statuses)
                  ├── PurchaseOrderItem (color→, size, qty)
                  ├── Hit (hit_number, colour, delivery dates, boxed/hanging, sea/air, actual_delivery_date)
                  ├── Costing (sheet_type, exchange_rate, live_tick, cost_lines[])
                  └── DailyProduction (date, produced, machine, operator, remarks)
```

**PO status enum** (drives lifecycle tabs): `draft | open | confirmed | in_production |
quality_check | ready | shipped | delivered | cancelled`.

**FileOpening status enum**: `draft | open | approved | in_production | delivered | cancelled` (plus
quick-lead/repeat approval states).

**Style/Design status**: `active | archived | draft` (+ design-sheet lifecycle transitions).

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

- **Commercial**: `SalesConfirmation` (status: draft/sent/disputed/accepted, 48h window),
  `SalesContract`, `ProformaInvoice`, `LC` (+ `LCAmendment`), `Bank`, `DebitNote` (over-tolerance
  flag), `InvoiceApproval`.
- **Procurement**: `FabricCategory`, `FabricHTSCode` (duty), `FabricSupplier`, `FabricMill`,
  `FabricRFQ` (+ lines + vendor quotes), `FabricBooking`, `FabricOrder` (risk_level,
  strike-off×3, actual arrival, paperwork/bulk notes, schedule handoffs), `BOMItem` (
  Ordered/TBC/Partial/Completed).
- **Production**: `ProductionPlan`, `DailyProduction`, factory portal rows.
- **Quality**: `Inspection` (inline/final/pre-shipment), `ComplianceAudit` (weekly 8-item),
  `GoldSeal` (pending/sent/approved/rejected), `CorrectiveAction`.
- **Logistics**: `Shipment` (eta, booking_reference, booking_ref_required_date), `Docket`,
  `ImportRecap`, `ExportRecap`, `ForwardOrder`, `FinalHitReconciliation`, `SupplierPayment`,
  `CostReconciliation`, `BookingScheduleItem` (live/in_work/delivered, cut_qty, garments_ready,
  ex-factory, is_last_hit, snapshot).
- **Reports/Setup/Help**: saved reports, report schedules; tenant/office/master-data rows;
  users/roles/audit-log/health; `ReleaseNote`, `OnboardingChecklistItem`, `TourCompletion`.

## 4. Demo dimensions (see `mock-data-spec.md` for exact volumes)

~15 designs (REG-1001..1010 + DSD-1001..1005), versions 1..2, ~9 file openings, ~12 POs across
statuses, 18 hits, 75 BOM items, 5 design costings (with ladder), 5+ costings, 5 shipments,
booking-schedule rows, quality/production/commercial rows sufficient to exercise every status and
every risk branch. Amounts formatted as strings with 2 decimals. All dates ISO.