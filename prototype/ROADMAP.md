# Prototype Roadmap — Full Product Surface

> Companion to `plan.md` (how) and `TRACKER.md` (status). Phase P0 is the runnable shell; every slice
> after it is a vertical UI slice on mock data. Slices are **PT-###** (prototype tasks), tracked in
> `TRACKER.md` and `tasks/todo.md`.

## Why phases are ordered this way

1. **P0** proves the shell + grid chrome + mock service pattern on ONE module (Design register) —
   the foundation everything else reuses.
2. **P1** covers the buying-house **core order lifecycle** (the highest-value flow reviewers test
   first): Design → File Opening → PO → BOM/Trims → Costing → Order Manager.
3. **P2** covers **supporting modules** that stack on the same patterns but have their own
   workflows: Commercial (LC, PI, Sales Contract/Confirmation, Debits, Invoice Approvals),
   Procurement (Fabric), Production, Quality.
4. **P3** covers **Logistics + Reports + Setup/Admin/Help** — heaviest on grid export, print
   report pages, dashboards, and master-data CRUD.
5. **P4** is the **polish + delivery** gate: full-surface review, theme/a11y sweep, interaction
   QA, and packaging for the dev team handoff.

## Phase P0 — Foundation (runnable shell)

- [ ] PT-001 App scaffold: Vite + React 19 + TS 6 + Tailwind 4 + Tabulator 6 + Vitest + Oxlint
- [ ] PT-002 Design tokens + light/dark theme (`theme/`) + semantic status palette
- [ ] PT-003 `SpreadsheetGrid` wrapper (Tabulator chrome re-export, export, header filters, actions)
- [ ] PT-004 Mock service layer + seed data (Design register slice first)
- [ ] PT-005 App shell: module nav (Layout), router, dashboard placeholder
- [ ] PT-006 Design register screen on grid (list + filter + add modal + view detail + print)
- [ ] PT-007 Micro-interactions kit: status pill, hover preview, optimistic interactions
- **Checkpoint**: `npm run dev` renders a full Design-register flow on mock data; gates green;
  real-browser CDP clean; human review.

## Phase P1 — Core order lifecycle

- [ ] PT-010 Style detail (tabs: Overview, Versions, File Openings, POs, BOM, Sales Order report)
- [ ] PT-011 File Openings list + detail (quick lead, repeat, departments, POs)
- [ ] PT-012 Purchase Orders list + detail (lifecycle tabs, items, hits, trailing, risk)
- [ ] PT-013 BOM list + detail (trims/labels/T&A, copy-from-order)
- [ ] PT-014 Costing list + detail (cost lines, live tick, design-costing ladder, prepare PO costing)
- [ ] PT-015 Order Manager dashboard (critical path, weekly review print)
- [ ] PT-016 Shipment-level Sales Order report (design version report print + xlsx)
- **Checkpoint**: end-to-end order lifecycle demoable on mock data with all major interactions;
  human review.

## Phase P2 — Supporting workflows

- [ ] PT-020 T&A (list, detail milestones, calendar, heatmap)
- [ ] PT-021 Commercial (LC + amendments, banks, proforma invoices, sales contracts/confirmations)
- [ ] PT-022 Debits & invoice approvals + dashboards
- [ ] PT-023 Procurement (fabric categories/HTS/suppliers/mills/RFQ/bookings/orders + schedule)
- [ ] PT-024 Production (plans, daily reports, factory portal, dashboard, detail)
- [ ] PT-025 Quality (inspections, CAPA, quality dashboard)
- **Checkpoint**: all secondary modules demoable; human review.

## Phase P3 — Logistics, reports, setup

- [ ] PT-030 Logistics (shipments, detail, dashboard, forwarders, dockets, recaps)
- [ ] PT-031 Supplier payments + cost reconcile (grid + pivot + release workflow)
- [ ] PT-032 Summary reports (sales summary, recap reports) + report builder/viewer/schedules
- [ ] PT-033 Setup & admin (tenant, offices, master data, users, roles, audit logs, health)
- [ ] PT-034 Help & onboarding (help centre, release notes, tours)
- **Checkpoint**: full route surface reachable on mock data; human review.

## Phase P4 — Polish, QA & delivery

- [ ] PT-040 Full interaction QA pass (every action kind: add/view/edit/delete/status/export/print/search/filter/sort/column-choose/pin)
- [ ] PT-041 Accessibility + keyboard + light/dark sweep across all screens
- [ ] PT-042 Performance pass (grid data volumes, virtualization, tab switching)
- [ ] PT-043 Mock-data coverage audit vs `mock-data-spec.md` (every status/edge case demoable)
- [ ] PT-044 Handoff pack: updated `requirements.md`, `standards.md`, `data-model.md`, this roadmap,
        `TRACKER.md`, agent prompts, and the app — signed off for the dev team to connect the backend.

## Slice dependency rules

- P0 must land before any other slice (shell + grid + mock patterns).
- `SpreadsheetGrid` and micro-interaction kit changes are shared-blast-radius: land as standalone
  slices and re-run the full app suite.
- P1 order follows the product narrative; P2/P3 are independent of each other and can parallelise
  across agents once PT-003/PT-005 patterns exist.
- A new PT number is minted per slice in `TRACKER.md`; keep exactly one slice in progress.

## Definition of Done — a prototype slice

See `README.md` §"Definition of Done". Every slice ends ✅ VERIFIED with real gates + evidence
recorded in `TRACKER.md`.