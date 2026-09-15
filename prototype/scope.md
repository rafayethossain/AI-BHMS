# Prototype Scope — Full Product Surface

> **Definition of "full product surface":** every screen/module of the target frontend app, running
> on mock data, so the customer can review and re-approve the *whole* product before the dev team
> connects the backend. Features/attributes may be **changed** during prototype review — the change
> log below is where those deltas live.

## Modules in scope (map to `frontend` routes / PRD §14 screen inventory)

| Module | Screens | Phase |
|--------|---------|-------|
| Design | Design register (merged Styles+Design Sheets), Style detail (Overview, Versions, File Openings, POs, BOM, **Sales Order**), Design Sheet detail, Fit Specs, Job Requests, Design Costings, Tech-pack import | P0/P1 |
| Merchandising | File Openings list+detail, Purchase Orders list+detail+trail, BOMs list+detail, Costings list+detail, T&A list/detail/calendar/heatmap | P1/P2 |
| Commercial | Proforma Invoices, Sales Contracts, Sales Confirmations, LCs + amendments, Banks, Debit Notes, Invoice Approvals | P2 |
| Procurement | Fabric Categories, HTS Codes, Suppliers, Mills, RFQs, Bookings, Orders (incl. Fabric Schedule 16.2 / risk) | P2 |
| Production | Plans, Dashboard, Factory Portal, Daily Reports, Order Detail | P2 |
| Quality | Inspections, CAPA, Quality Dashboard | P2 |
| Logistics | Shipments list/detail/dashboard, Freight Forwarders, Dockets, Import/Export Recaps, Forward Order book, Final Hit Reconciliations, Supplier Payments, Cost Reconcile | P3 |
| Reports | Summary reports (sales summary, recap reports), Report builder, schedules, viewer | P3 |
| Setup & Admin | Setup hub, Tenant, Offices, Master data, Users, Roles, Audit logs, Health, Alerts | P3 |
| Help | Help Centre, release notes, onboarding/tours | P3 |
| Dashboards | Main dashboard, Executive dashboard, Order Manager (critical path, weekly review) | P1/P2/P3 |

## Explicitly OUT (until backend wiring)

- Real authentication / JWT / RBAC enforcement (the shell uses a mock session; review login screen
  later)
- Real persistence/migrations (mock `db.ts` only)
- Real printer/export authoring (print uses browser print + `SpreadsheetGrid.download` with mock rows)
- Tenant-switching behaviour (single tenant shown; design may change later)

## Feature & attribute change log

Append a dated line whenever prototype review changes a feature, layout, attribute, or business rule
vs the canonical docs (`PRD.md` / `data-model.md` / `module-specs.md`). Format:

- **2026-09-15** — [Prototype workstream created; scope = full surface; prototype becomes the real
  frontend; mock `api.ts` is the API contract.] (decision note, see `agents/` + `scope.md`)

Future entries follow this template:

- `YYYY-MM-DD — <module>: <what changed> | decision note ref | tracker slice`

## Open decisions

1. Login screen: mock or deferred? (default defer — reviewers land on the shell directly)
2. Report print size per report type.
3. Any attributes the customer wants added/removed per module — record here as they surface.

## Decision notes (ADRs for the prototype)

Decision notes are recorded in `docs/decisions/` once decisions are settled; this section only
links them. (Create `docs/decisions/` on first decision.)