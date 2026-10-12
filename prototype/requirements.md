# Prototype Requirements (mapped from PRD.md)

> The prototype's requirement surface, mapped 1:1 to the canonical `PRD.md` (v2.0, aligned to the
> implemented solution) and the `RQ-###` backlog where relevant. Each prototype slice in `ROADMAP.md`
> cites the requirement rows below. When prototype review changes a requirement, `scope.md` change
> log gets the delta and this doc is updated.

## How to read this

- **REQ-p-###** = prototype requirement (new numbering for this workstream).
- Column **PRD** = the canonical PRD section (e.g. §6.2.5 Hit Mgmt); **RQ** = backlog requirement
  id where one exists.

## A. Design & Technical ($6.1 Design/Tech-Pack)

| ID | Requirement | PRD | RQ | Phase |
|----|-------------|-----|----|-------|
| REQ-p-001 | Unified **Design register**: merged Styles + Design Sheets; grid w/ Live/Completed PO counts; card/grid toggle; fresh + copy-from-existing creation; per-column filters; xlsx export | §6.1.1 | A7 | P0 (slice seed) |
| REQ-p-002 | **Design detail** tabs (mirror Style detail): Overview, Sketches, Versions (each FN → opens its **commercial file**), Purchase Orders, Items, BOM, Design Images, Tech Packs, **Sales Order report** (per version, PO rows with Fabric/Trims/Production/Delivery/Overall status pills + drill-down); status-transition wizard; actions +Create PO, +Add Update, print; POs track under the version's FN | §6.1.1 | RQ-051 | P1 |
| REQ-p-003 | **Design sheet detail** (merged tech pack): sections header, **materials breakdown (items, trims, labels, accessories, other)**, images+annotations, fit specs, job requests, print page; shows tech-pack import progress per section | §6.1 Tech Pack | — | P1 |
| REQ-p-004 | **Fit specs**: per-PO spec sets, copy-from-order, Set Current | §6.2.6 | RQ-011/012 | P1 |
| REQ-p-005 | **Job requests** queue + dashboard | §6.2.7 | RQ-024/025 | P1 |
| REQ-p-006 | **Design costing** (per style + version): single-piece cost, price ladder (discount/overhead/base/margin), approve/reject/set-live; **version cost derives the PO-level costing ladder**, Prepare PO Costing | §6.1.2 | RQ-013/014 | P1 |
| REQ-p-007 | **Sales Order report** print + xlsx (report block on Style detail) | §17 Reports | RQ-051 | P1 |
| REQ-p-008 | **Tech-pack import wizard** (buyer PDF → extract → review/edit → Excel export → import): creates/links style, versions, items, BOM; Style detail Tech Packs tab shows per-section progress | §6.1 Tech Pack | RQ-036..042 (A7) | P1 |

## B. Order lifecycle — FN/version → PO / BOM ($6.2)

| ID | Requirement | PRD | RQ | Phase |
|----|-------------|-----|----|-------|
| REQ-p-010 | **File Number (FN) / version commercial file**: a design version opened as a commercial file carries the FN (no separate File Opening layer — FN rides the version); quick-lead + repeat marking, department approval workflow, stock-fabric flags (description + meters + allocations), notes, POs tracked under the FN | §5.1.2/5.1.3/6.2.2 | RQ-007..010 | P1 |
| REQ-p-011 | **Purchase orders** list (risk columns Fab/Trims/Labels/Tech/Overall) + detail tabs (Overview, Items, Production Data, Quality, Shipments, TA Milestones, BOM & Costing, History), status-transition wizard, amendments (AMD-), OrderJourney + StatusTimeline, +Add Item, +Add TA Milestone, trail | §6.2.1/6.2.5 | A3/B1/RQ-028 | P1 |
| REQ-p-012 | **BOM** list + detail: trims/labels/T&A schedule, copy-trims-from-order | §6.3.5 | RQ-021/022 | P1 |
| REQ-p-013 | **Costing** list + detail: sheet type, exchange rate, live tick, cost lines, **ladder snapshot derived from the version's design costing** + PO totals; Add Cost, Add Variant, **Create PO from Costing**, Export | §6.2.1 | RQ-013 | P1 |
| REQ-p-014 | **Order Manager dashboard**: per-PO critical-path (no-ta/on-track/off-track/complete), weekly review print | §6.2.2 | RQ-028/G-08 | P1 |
| REQ-p-015 | **T&A**: list, detail milestones (Gantt, Add Milestone), copy-to-new, calendar, heatmap, milestone alerts | §6.2.3 | — | P2 |
| REQ-p-016 | **Hit management** within PO (boxed/hanging, sea/air, breakdown) | §6.2.5 | RQ-010 | P1 |

> **Prototype delivery — PT-012** (Purchase Orders list + detail, ✅ VERIFIED GATE_A): the list ships the
> risk-label grid; the detail ships **Overview / Items / Hits / Amendments / History** (item + hit CRUD,
> amendment request/approve/reject, order trail). The target's remaining detail tabs — **Production Data,
> Quality, Shipments, TA Milestones, BOM & Costing** — the **status-transition wizard**, and the
> **OrderJourney / StatusTimeline** visualisations are **deferred** to later slices (PT-013+); the trail
> covers the lifecycle-history need for now. See `scope.md` 2026-10-12 change log for the delta.

## C. Commercial ($5.2 / $6.2.1 / Procurement)

| ID | Requirement | PRD | RQ | Phase |
|----|-------------|-----|----|-------|
| REQ-p-020 | **Sales confirmations** (48h), **sales contracts**, **proforma invoices** | §5.2 | RQ-007 | P2 |
| REQ-p-021 | **LC** list + detail with amendment workflow; **banks** master | §6.2.4 | — | P2 |
| REQ-p-022 | **Debit notes** (types/parties/statuses, over-tolerance flag) + **invoice approvals** (5%/2% tolerance + >20-unit rule, Approve/Reject, compliance email) + dashboards | §6.2.9/§6.2.10 | RQ-027/035 | P2 |
| REQ-p-023 | **Fabric** master (categories, HTS, suppliers, mills), **bookings**, **materials POs** for fabric/trims/labels/accessories/other (generated from the BOM/materials breakdown, set terms & clauses, print), **orders** incl. Fabric Schedule 16.2 (risk, lab-dip/strike-off/onboard/offers/actual dates, owners, handoff audit) | §6.3 | RQ-015..020 | P2 |
| REQ-p-024 | **Trims/labels** schedule + BOM status workflow | §6.3.5 | RQ-021 | P1 |
| REQ-p-025 | **Fabric tolerances** (customer_type × qty-band thresholds), **fabric utilization** reports (monthly/quarterly), **dockets** over-200m sales flag (docket grid/detail stays in Logistics) | §6.3.5 | — | P2 |

> **Deferred this phase (decision 2026-09-15):** RFQ wind-up (draft/sent/responded/closed/cancelled
> + vendor quotes) — see `business-workflow.md` decisions log #3.

## D. Production & Quality

| ID | Requirement | PRD | RQ | Phase |
|----|-------------|-----|----|-------|
| REQ-p-030 | **Production** plans list, dashboard KPIs, factory portal, daily reports (machine/operator/remarks), order detail KPIs + **line performance bars**, Start/Complete actions | §6.4.1 | — | P2 |
| REQ-p-031 | **Quality** inspections (inline/final/pre-shipment), CAPA, quality dashboard (AQL, DHU) | §6.4.2/6.4.3/6.4.4 | — | P2 |
| REQ-p-032 | **Gold seals** + compliance audits | §6.4.2/6.4.3 | RQ-032/033 | P2 |

## E. Logistics

| ID | Requirement | PRD | RQ | Phase |
|----|-------------|-----|----|-------|
| REQ-p-040 | **Shipments** list + detail (9-stage status flow, 8 document types, hits), dashboard, freight forwarders | §6.2.8 | — | P3 |
| REQ-p-041 | **Import/export recaps**, **forward order book**, **final hit reconciliations**, **supplier payments**, **cost reconcile** | §6.2.11+ | RQ-043..048 | P3 |
| REQ-p-042 | **Booking schedule** grid w/ inline edit, last-hit marker, snapshot | §6.2.8 | RQ-049/B8 | P3 |
| REQ-p-043 | **Dockets** + over-200m sales flag | §6.2.9 | RQ-026 | P3 |
| REQ-p-044 | **Shipping paperwork comparison** (ordered vs shipped vs docket tolerance, covers-order status) | §6.2.9 | RQ-031 | P3 |

## F. Reports, Setup, Help

| ID | Requirement | PRD | RQ | Phase |
|----|-------------|-----|----|-------|
| REQ-p-050 | **Summary reports** (6 quick-report cards, sales summary, recap reports), **saved reports** (Run/Edit/Delete/Schedule), builder wizard, viewer w/ filters, CSV export | §17/18 | RQ-047 | P3 |
| REQ-p-051 | **Setup & admin**: setup hub, tenant, offices, **master data (20 categories**: brands, risk levels, compliant doc types, delivery modes, departments, designations, product departments, …), **users** (MFA flag, role mapping, active/inactive/suspended), **roles** (module-grouped permission checkboxes), **audit logs** (action-coloured), **health run checks** | §7/§19/§22 | — | P3 |
| REQ-p-052 | **Help & onboarding** (help centre, release notes, tours) | §6.2.12 | RQ-050 | P3 |
| REQ-p-053 | **Dashboards**: main (Tasks/Pipeline/Financials/Alerts tabs, alert banner), executive, Order Manager (critical path + weekly review), Production, Quality, Shipment, T&A calendar/heatmap | §18 | — | P1–P3 |

## Acceptance bar (all requirements)

Every requirement is met when its screen(s) render on mock data and every *planned* interaction of
that screen works per `standards.md`, with the app gates green and a `TRACKER.md` evidence line
citing this requirement ROW. Traceability is requirement → slice (PT-###) → test → evidence.