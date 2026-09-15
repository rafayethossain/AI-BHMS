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
| REQ-p-002 | **Style detail** tabs: Overview (read-only design info), Versions, File Openings, POs, Line Items/BOM, **Sales Order report** (per version, PO rows with Fabric/Trims/Production/Delivery/Overall status pills + drill-down) | §6.1.1 | RQ-051 | P1 |
| REQ-p-003 | **Design sheet detail** (merged tech pack): sections header, images+annotations, material, fit specs, job requests, print page | §6.1 Tech Pack | — | P1 |
| REQ-p-004 | **Fit specs**: per-PO spec sets, copy-from-order, Set Current | §6.2.6 | RQ-011/012 | P1 |
| REQ-p-005 | **Job requests** queue + dashboard | §6.2.7 | RQ-024/025 | P1 |
| REQ-p-006 | **Design costing**: style-level single-piece cost, price ladder (discount/overhead/base/margin), approve/reject/set-live, Prepare PO Costing | §6.1.2 | RQ-013/014 | P1 |
| REQ-p-007 | **Sales Order report** print + xlsx (report block on Style detail) | §17 Reports | RQ-051 | P1 |

## B. Order lifecycle — File Opening / PO / BOM ($6.2)

| ID | Requirement | PRD | RQ | Phase |
|----|-------------|-----|----|-------|
| REQ-p-010 | **File openings** list + detail: styles, statuses, quick-lead + repeat marking, department approval workflow, POs| §5.1.2/5.1.3/6.2.2 | RQ-007..010 | P1 |
| REQ-p-011 | **Purchase orders** list (risk columns Fab/Trims/Labels/Tech/Overall) + detail (items, hits, lifecycle tabs, trail) | §6.2.1/6.2.5 | A3/B1/RQ-028 | P1 |
| REQ-p-012 | **BOM** list + detail: trims/labels/T&A schedule, copy-trims-from-order | §6.3.5 | RQ-021/022 | P1 |
| REQ-p-013 | **Costing** list + detail: sheet type, live tick, cost lines, ladder snapshot + PO totals | §6.2.1 | RQ-013 | P1 |
| REQ-p-014 | **Order Manager dashboard**: per-PO critical-path (no-ta/on-track/off-track/complete), weekly review print | §6.2.2 | RQ-028/G-08 | P1 |
| REQ-p-015 | **T&A**: list, detail milestones (Gantt), calendar, heatmap | §6.2.3 | — | P2 |
| REQ-p-016 | **Hit management** within PO (boxed/hanging, sea/air, breakdown) | §6.2.5 | RQ-010 | P1 |

## C. Commercial ($5.2 / $6.2.1 / Procurement)

| ID | Requirement | PRD | RQ | Phase |
|----|-------------|-----|----|-------|
| REQ-p-020 | **Sales confirmations** (48h), **sales contracts**, **proforma invoices** | §5.2 | RQ-007 | P2 |
| REQ-p-021 | **LC** list + detail with amendment workflow; **banks** master | §6.2.4 | — | P2 |
| REQ-p-022 | **Debit notes** + **invoice approvals** + dashboards | §6.2.9/§6.2.10 | RQ-027/035 | P2 |
| REQ-p-023 | **Fabric** master (categories, HTS, suppliers, mills), **RFQ**, **bookings**, **orders** incl. Fabric Schedule 16.2 (risk, dates, notes) | §6.3 | RQ-015..020 | P2 |
| REQ-p-024 | **Trims/labels** schedule + BOM status workflow | §6.3.5 | RQ-021 | P1 |

## D. Production & Quality

| ID | Requirement | PRD | RQ | Phase |
|----|-------------|-----|----|-------|
| REQ-p-030 | **Production** plans list, dashboard KPIs, factory portal, daily reports, order detail (daily production rows) | §6.4.1 | — | P2 |
| REQ-p-031 | **Quality** inspections (inline/final/pre-shipment), CAPA, quality dashboard (AQL, DHU) | §6.4.2/6.4.3/6.4.4 | — | P2 |
| REQ-p-032 | **Gold seals** + compliance audits | §6.4.2/6.4.3 | RQ-032/033 | P2 |

## E. Logistics

| ID | Requirement | PRD | RQ | Phase |
|----|-------------|-----|----|-------|
| REQ-p-040 | **Shipments** list + detail (docs, hits), dashboard, freight forwarders | §6.2.8 | — | P3 |
| REQ-p-041 | **Import/export recaps**, **forward order book**, **final hit reconciliations**, **supplier payments**, **cost reconcile** | §6.2.11+ | RQ-043..048 | P3 |
| REQ-p-042 | **Booking schedule** grid w/ inline edit, last-hit marker, snapshot | §6.2.8 | RQ-049/B8 | P3 |
| REQ-p-043 | **Dockets** + over-200m sales flag | §6.2.9 | RQ-026 | P3 |

## F. Reports, Setup, Help

| ID | Requirement | PRD | RQ | Phase |
|----|-------------|-----|----|-------|
| REQ-p-050 | **Summary reports** (sales summary, recap reports) + report builder/viewer/schedules | §17/18 | RQ-047 | P3 |
| REQ-p-051 | **Setup & admin** (tenant, offices, master data, users, roles, audit logs, health) | §7/§19/§22 | — | P3 |
| REQ-p-052 | **Help & onboarding** (help centre, release notes, tours) | §6.2.12 | RQ-050 | P3 |
| REQ-p-053 | **Dashboards**: main, executive, module KPIs | §18 | — | P1–P3 |

## Acceptance bar (all requirements)

Every requirement is met when its screen(s) render on mock data and every *planned* interaction of
that screen works per `standards.md`, with the app gates green and a `TRACKER.md` evidence line
citing this requirement ROW. Traceability is requirement → slice (PT-###) → test → evidence.