# Buying-House Management System — Replication & Tabulator-Integration Roadmap

> **Type:** Rebaselined roadmap (August 2026)
> **Scope:** Close every gap between the target buying-house requirements and the current BHMS,
> while adopting **Tabulator** as the standard spreadsheet-grade grid layer (Excel-familiar UX).
> **Language/terminology:** English only, neutral names — the external reference product is never
> named by its proper name in docs, code, or commits. Refer to it only as "the target requirements"
> / "the reference manual" / "Excel-familiar desktop workflow."
> **Method:** Strict TDD (RED → GREEN → verify) for every behavioral change; incremental, test-driven
> migration of list screens to the Tabulator grid.

---

## 1. Goal

Transform BHMS from a feature-rich but form-centric web app into one whose primary interaction
paradigm is an **Excel-familiar, spreadsheet-grade grid** (Tabulator) that mirrors how buying-house
staff already work in spreadsheets and the legacy desktop system — while closing remaining functional
gaps in master data, design, orders, costing, fabric/trims/labels, planning, logistics, finance,
reporting, and risk.

The two workstreams are:
1. **Grid-layer modernization (Tabulator):** make the reusable grid the default for *every* list and
   schedule screen, with the reference's Excel parities (inline edit, column show/hide, pin, drag-group,
   header filters, quick search, export, print-with-tick, pagination/All).
2. **Domain gap-closure:** deliver any target behavior not yet present, mapped 1:1 to traceable
   requirements and business rules.

---

## 2. Current State (verified August 2026)

BHMS already covers a large fraction of the target surface on a **Django 5.2 + DRF + React 19 + Vite**
stack. Confirmed present (full or near-full CRUD):

| Domain | Status in BHMS | Key existing modules |
|---|---|---|
| Multi-tenant / offices / users / roles / RBAC / audit | **Present** | `tenants, users, core`; JWT+mfa, dual audit, `HasPermission` |
| Master data | **Present** | `setup` app: Season, ProductCategory/Type/Dept, Country, Currency, Buyer, Brand, Factory, Vendor, DeliveryMode, UOM, PaymentTerms, RiskLevel… |
| Design module | **Present (rich)** | Style, StyleVersion, StyleItem, StyleTechPack, DesignImage, DesignSheet, FitSpecification/FitImage, DesignJobRequest, techpack extract/import/excel pipeline |
| Order / FN | **Present (richest)** | FileOpening (quick-lead, repeat, stock-fabric), PurchaseOrder state machine, Hit breakdown, POAmendment, FitSpec |
| Costing | **Present** | Costing + CostingLine (versioning, set_live/confirm/approve, compare, export), BOM + BOMItem |
| Fabric / Trims / Labels | **Present (+ risk engine)** | FabricCategory, HTSCode, FabricSupplier/Mill, RFQ, FabricBooking/Order, FabricTolerance, FabricUtilization; risk policy embedded in FabricOrder |
| Planning | **Partial** | TA + TAMilestone, JobRequest (dashboard/queue/unsold), ProductionPlan + DailyProduction |
| Logistics | **Present** | Shipment (state machine), FreightForwarder, ShippingDocument, BookingScheduleItem, Docket, FinalHitReconciliation, PaperworkComparisonService |
| Finance / Commercial | **Present** | LC + LCAmendment, Bank, ProformaInvoice, SalesContract, SalesConfirmation, DebitNote, InvoiceApproval |
| Quality | **Present** | Inspection, CorrectiveAction, GoldSeal, ComplianceAudit |
| Reporting | **Partial** | SavedReport (execute + CSV export; lightweight) |
| Risk engine | **Distributed** | Embedded in FabricOrder / Order Manager / tolerances; **no standalone engine** |

### Current grid layer
- `frontend/src/components/SpreadsheetGrid.tsx` — a **Tabulator** wrapper (inline edit, groupBy,
  context menu, header triggers, clipboard, history, xlsx export). Used by the Design Sheet material grid.
- `frontend/src/components/DataTable.tsx` — a plain HTML-table grid used by many list screens
  (DesignSheets list, and others) with sort/filter/pagination but **no** Excel-grade features.
- `frontend/src/components/SpreadsheetGrid.tsx` currently covers only a subset of the reference
  GcGrid surface.

---

## 3. Gap Analysis vs Target Requirements

Legend: ✅ present · 🟡 partial (needs work) · ⬜ missing.

### 3.1 Grid-layer gaps (Tabulator adoption)
| Target capability (Excel parity) | BHMS now | Plan |
|---|---|---|
| Reusable grid is the default for all lists | 🟡 DataTable used in many screens | Migrate every list/schedule to the Tabulator grid |
| Per-column header filter row (toggleable) | 🟡 | Add to grid + toolbar |
| Inline editing with save-on-tab-out & `onCellUpdate` contract | 🟡 | Standardize `onCellUpdate(row, field, value, old)`; each screen commits |
| Column chooser (show/hide) + persistence | 🟡 | Add chooser + persist prefs |
| Pin/freeze columns | 🟡 add | `frozen` from column metadata |
| Group-by via header menu + group chip bar | 🟡 | Header menu "Group by this column"; chips |
| Quick search (multi-field) + per-field + clear | 🟡 | Filter bar with Search/Clear/collapse |
| Include Archive toggle | 🟡 per-screen | Global filter param |
| Export Excel (risk encoded numerically) | ✅ xlsx | Ensure hidden numeric export for risk |
| Print with per-row tick selection | 🟡 | `PrintWithTickDialog` |
| Pagination + "All" rows-per-page | ✅ | Grid-wide |
| Row actions menu (Open, Set Status, Copy, Repeat) | 🟡 | Additive `rowActions`/`onRowAction` |
| Light **and** Dark themes, token-driven, on the grid | 🟡 | Token CSS for Tabulator popups/theme |
| Notes with initials/date auto-fill | ✅ NotesPanel exists | Standardize per tab |

### 3.2 Domain gaps
| Area | Target behavior missing / partial | Tier |
|---|---|---|
| **Risk engine (standalone)** | Centralized compute of Fabric/Trims/Label/Technical + Design risk, max-of-areas headline, numeric Excel encoding, colour+label rendering, cyan last-hit marker | High |
| **Import Recap** | Fabric/trims inbound tracking: PCD/ETD/ETA/ATB/Unstuffed/In-house, docs workflow, LC/FOC, vessel, agent, status | High |
| **Export Recap** | Per-hit landed economics: FOB, CMPT, cost value, service %, forwarder, HBL, on-board/ETA, container, BL + payment-to-factory & payment-from-customer pipeline (due/overdue) | High |
| **Supplier payment pipeline** | SP log, due pivot by supplier×month, To-be-released statuses, release workflow | Medium |
| **Debits workflow** | Pro-forma → formal, compliance flow, over-tolerance auto-flag | Medium |
| **Final Hit Reconciliation** | qty vs docket, >20 short → debit, fabric utilisation monthly | ✅/align |
| **Cost update / reconcile** | Factory Inv (MP) vs Planning CM → Saving/Loss per unit & total | Medium |
| **Sales Summary / Import-Export Recap reports** | Code/Invoice/FN/FOB/qty/price/hit; per-buyer/factory sums | Medium |
| **Forward Order / Order In-hand book** | Monthly qty, cost, 3% service charge | Low |
| **Booking / Fabric Schedule** | Weekly editable `*` columns, snapshot, cyan marker | 🟡 align |
| **Stock Fabric own-FN** | Swatch photo (TBC), conversion/reduction, blank completion, customer commitment | 🟡 present, align |
| **Help & onboarding** | Guided tour (first-login, role tours), Help Centre (FAQ, workflows, glossary), data-backed content | 🟡 GuidedTour exists; expand |
| **Tolerances enforcement** | Over/under over-tolerance → debit flag (Primark 2% vs other 5%, fur/kids/elastane) | 🟡 partial |

---

## 4. Workstream A — Tabulator Grid Layer (incremental, TDD)

Each step is a Red→Green slice on the grid component and one migrated list screen.

| Step | Scope | Approach |
|---|---|---|
| **A1** | Upgrade reusable Tabulator grid: per-column header filters, inline-edit contract, column chooser, pin, group-by header menu + chips, toolbar (Search/Clear/Archive/columns/export/print) | Extend `SpreadsheetGrid` with test-first helpers in `gcGridColumns.ts`; unit-test pure parts in jsdom (mocked Tabulator) |
| **A2** | Migrate first list screen — `DesignSheetsListPage` — from `DataTable` to the grid (TDD) | Red: feature test; Green: swap component + columns |
| **A3** | Rolaloadout of the grid to remaining list screens (Styles, BOMs, Costings, PurchaseOrders, Shipments, LCs, Debits, FabricBookings, FitSpecs, JobRequests, …) | One screen per slice, each with a feature test; remove `DataTable` usage once last consumer migrates |
| **A4** | Print-with-tick dialog + Excel-numeric-risk export wired into the grid | Component + integration test |
| **A5** | Token-driven light/dark theming for Tabulator (headers, popups, grouped rows, risk colours) | CSS tokens + snapshot/browser check |
| **A6** | Row actions menu (Open / section / Set Status / Copy / Repeat) additive on the grid | Reuse existing `rowActions` pattern |
| **A7** | Design module IA: regroup Design-facing list screens under a top-level **Design** module (Styles, Design Sheets, Tech Pack Import, Fit Specs, Job Requests, Costings); Merchandising keeps File Openings / POs / BOMs | `Layout.tsx` nav + `Layout.test.tsx`; no route/API changes |

---

## 5. Workstream B — Domain Gap-Closure (TDD), priority-ordered

Traceability: every deliverable maps to a target requirement + business rule (BR). No work ships
without a failing test first and the project's real verify commands green.

### B1 — Risk engine (High)
- Standalone risk service: compute per-area risk (Fabric/Trims/Label/Technical/Design) from child
  data; overall = max; numeric encoding (green/amber/yellow/red/cyan + last-hit cyan); colour+label
  output.
- API on Order/FN + Fabric/Trims/Label tabs.
- Frontend `RiskBadge` (exists) used across list + detail; risk column shows colour + label.

### B2 — Import Recap (High)
- Model + CRUD: supplier/vendor, factory, s/c no, invoice value, item category, qty, rolls/bales,
  container, B/L–HAWB, mode (Sea/Air), LC/FOC, vessel; milestones PCD/ETD/ETA/ATB/Unstuffed/In-house;
  agent, docs workflow, status, remarks.
- Screen = Tabulator grid; export to Excel.

### B3 — Export Recap (High)
- Model + CRUD: identifiers (FN, PO, style, buyer, factory, FOB no, Carmel/Factory invoice + dates,
  s/c), quantities, FOB/CMPT/cost values + service %, logistics (ex-factory, mode, forwarder, HBL,
  on-board/ETA, container, BL, courier), **payment-to-factory** and **payment-from-customer** pipeline
  (terms, due date, received, overdue).
- Screen = Tabulator grid; export.

### B4 — Supplier payment + Due (Medium)
- SP log CRUD, invoice value allocation by FN, due pivot by supplier×month, To-be-released statuses,
  release workflow + report.

### B5 — Cost update / reconcile (Medium)
- Compare Factory Inv (MP) vs Planning CM; Saving/Loss per unit & total by order/invoice qty; flag
  mismatch; report.

### B6 — Sales Summary + Import/Export Recap reports (Medium)
- Aggregation reports per buyer/factory.

### B7 — Forward Order / Order In-hand book (Low)
- Monthly forward book with qty/cost/service %; Order Tracker view.

### B8 — Booking / Fabric Schedule alignment (Medium)
- Weekly schedule with `*`-editable columns, snapshot consistency, cyan last-hit marker, ex-factory
  notes/date; fabric schedule lab-dip/onboard/arrival + ownership handover.

### B9 — Help & onboarding (Medium)
- First-login tour + role tours; Help Centre (FAQ, workflows, glossary, unified search); glossary
  links; release notes; data-backed + versioned + tenant-scoped content.

### B10 — Tolerances enforcement (Medium)
- Central tolerance engine (fabric/order over-under; Primark/Penney's vs Other tiers, fur/kids/elastane
  overrides); over-tolerance → debit flag surfaced on reconciliation.

---

## 6. Definition of Done (every task)

- Behavior covered by a test that failed first (RED→GREEN verified).
- Full suite passes with the project's real commands (backend pytest; frontend `tsc -b`, `npm run
  lint`, `npx vitest run`).
- Target requirement + business rule cited; no conflicting rule.
- ERD/model fields aligned; migration present where schema changes.
- RBAC + tenant isolation respected on every data endpoint.
- Audit / notes behavior applied where relevant.
- Export/print + light/dark theme verified where UI.
- No TODOs left in scope; no duplicated logic.
- Lessons/decision recorded; roadmap + tracker updated.

---

## 7. First Shipment (this session)

1. **Rebaselined roadmap** (this doc), nameless.
2. **Grid slice A1 start → A2:** upgrade the reusable Tabulator grid with header filters + inline-edit
   contract + column chooser, and **migrate `DesignSheetsListPage` from `DataTable` to the grid** — TDD.

---

*Companion docs:* `master-backlog.md` (task tracker), `PRD.md` (BHMS product requirements),
`DESIGN_SHEET_CONNECTION_PLAN.md`, `DESIGN_SHEET_DAILY_TASKS.md`, `analysis/` (feature catalog & gap docs).
