# BHMS Product-Refinement Roadmap — Client-Delivery Readiness

> **Purpose**: Deep analysis + fully traceable roadmap to refine BHMS before client delivery / sales demos.
> **Audience**: Product owner, Chief of Staff orchestration.
> **Date**: 2026-08-06 · **Base**: `master-backlog.md` (35/35 RQ ✅, 1126 tests green), `graphify-out/` knowledge graph, `lessons-learned.md`, `analysis/redundancy-overlap-audit.md`.
> **Traceability convention**: every roadmap task cites `RQ-###` / `US-###` (backlog), `📊 <graph node>` (knowledge graph), `📝 <lessons-learned section>`.

---

## 0. Executive Summary

BHMS is **functionally complete against the target-manual bar** — all 35 RQ requirements are done, 100% tested (1126 green), seeded end-to-end, with production-grade auth (JWT + MFA), ~75 frontend pages, and excellent demo data. **Do not build more features before delivery.** The path to client readiness is:

1. **Harden what exists** — tenant isolation is the one true production blocker (📊 `TenantMiddleware`); Hit colour needs referential integrity (RQ-010).
2. **Cut dead weight** — `FabricInventory` (two parallel inventory systems), `Alert` (no producer), `ReportSchedule` (no worker), orphan `/dashboard/executive`, duplicated dashboard KPI endpoint.
3. **Make it client/end-user oriented** — onboarding flow, role-first home screens, BD localization polish, a rehearsed demo script.
4. **Productize deployment** — gunicorn/nginx, non-debug, real secrets, CI/CD, PostgreSQL verification.

**Verdict on the headline question (Hit vs Line Items): do NOT merge the entities.** Hit is the colour-level *production commitment* (target-010 system key `hit_number + colour`); `PurchaseOrderItem` is the colour×size *contract line*. They were already reparented/decoupled once (migration `0016`). What *is* redundant is `Hit.colour` as free text — fix it to an FK (P0), don't merge models. Details in §3.

---

## 1. Where BHMS Stands Today (Evidence Base)

### 1.1 Workflow completeness (from `master-backlog.md` Part 2)
All 10 stages complete: Foundation (RQ-001..004) → Style & Design (RQ-005/006) → Order Intake FO & PO (RQ-007..010) → Technical/Spec (RQ-011/012) → Costing (RQ-013/014) → Procurement (RQ-015..023) → Production & Job Queue (RQ-024..028) → Shipment & Logistics (RQ-029..031) → Quality & Compliance (RQ-032/033) → Commercial & Finance (RQ-034/035). **834 stage-tests + 1126 canonical suite green.**

### 1.2 Architectural hubs (📊 graph god-nodes)
`FileOpening` (109 edges) > `useToast()` (105) > `Style` (101) > `PurchaseOrder` (99) > `StyleVersion` (93) > `Buyer` (92) > `Factory` (89) > `Currency`/`Country` (86). **The domain spine is Style → FileOpening → PurchaseOrder**; every other module is an attachment point. Any change to these four entities (or to the shared `TenantModel`) has maximum blast radius — treat them as frozen public contracts for the delivery phase.

### 1.3 Role → module map (from `frontend/src/components/Layout.tsx` + demo users)
- **Merchandiser**: Styles, File Openings, POs, BOMs, Costings, Fit Specs, Job Requests, T&A (List/Calendar/Heatmap), Fabric (11 pages).
- **Production**: Plans, Daily Reports, Order Manager, Factory Portal, Production Dashboard.
- **Quality**: Inspections, Corrective Actions, Gold Seals, Compliance Audit, Quality Dashboard.
- **Logistics**: Shipments, Booking Schedule, Freight Forwarders, Paperwork Comparison, Final Hit Reconciliation.
- **Commercial**: PIs, LCs, Sales Contracts, Sales Confirmations, Debit Notes, Invoice Approvals, Banks.
- **Admin**: Setup, Users, Roles, Audit Logs, Health, Alerts.
- **All**: Reports (Dashboard/Builder/Schedules), Help Center, Executive Dashboard.

---

## 2. Feature Connections & Impact (for safe refinement)

### 2.1 The PO state machine is the heart (📝 lessons-learned §"State Management")
`draft → confirmed → in_production → quality_check → ready → shipped → delivered → cancelled`. On **confirm**: T&A auto-created + PI + Sales Contract auto-generated. Attached to PO: Costing, FitSpec, Hit, BOM, SalesConfirmation, InvoiceApproval, DebitNote, ComplianceAudit, ProductionPlan, JobRequest, Shipment(s), Reconciliations.

**Impact rule for roadmap**: any task touching PO/FileOpening/Style or `TenantModel` requires the full lifecycle test (`backend/apps/core/tests/test_full_lifecycle.py`) + the 44-test RBAC matrix as regression gate. This is the single most fragile surface in the product.

### 2.2 Cross-app FK map (from redundancy audit + graph)
`PurchaseOrder` ← {merchandising: Costing/FitSpec/Hit/BOM/POAmendment; commercial: SalesConfirmation/PI/SC/LC/DebitNote/InvoiceApproval; quality: ComplianceAudit/GoldSeal; production: ProductionPlan; logistics: Shipment→{Docket, BookingScheduleItem→FinalHitReconciliation}}.
`FileOpening` ← {PO, Repeats (self-FK), StockFabricAllocation, FileOpeningNote, Quick-Lead}.
`Shipment` ← {GoldSeal, Docket, BookingScheduleItem, FinalHitReconciliation, DebitNote.reconciliation}.
**Refinement implication**: `BookingScheduleItem` is the shared node between production, logistics, and commercial (hit → reconciliation → debit) — the strongest argument to keep Hit as a first-class entity (§3).

---

## 3. Redundant / Unnecessary Features (Keep / Merge / Remove)

Full evidence: `analysis/redundancy-overlap-audit.md`. Verified in source today.

### 3.1 PRIMARY — HIT vs LINE ITEMS (your question)

**Answer: Keep both. Do not merge. Fix the overlap.**

| | `PurchaseOrderItem` | `Hit` |
|---|---|---|
| Business meaning | Contract line, colour×size | Production commitment per colour (whole PO) |
| Key | `color` FK + `size` | `hit_number` + `colour` (target system key) |
| Location | `merchandising/models.py:400` | `merchandising/models.py:427` |
| Consumed by | PO, Costing, BOM | `BookingScheduleItem` (logistics/models.py:189), `FinalHitReconciliation` (logistics/models.py:303), DebitNote (commercial/models.py:300), PO hit tab |

Why not merge:
1. **Different granularity** — a hit spans all size lines of a colour; merging into `PurchaseOrderItem` would require duplicating size rows per hit or losing colour-level execution tracking.
2. **Already refactored once** — `0016_hit_reparent_to_purchase_order.py` moved Hit from `po_item` to `purchase_order` (deduped by colour). Re-merging would reverse a deliberate, tested decision (📝 Sprint 2.10 — "validate FK granularity during BA analysis").
3. **Load-bearing in the money loop** — FinalHitReconciliation → >20-unit-short → DebitNote; BookingScheduleItem → delivered trigger → reconciliation (RQ-027/034). Deleting/merging Hit breaks RQ-029, RQ-027, RQ-034, RQ-035 traceability.

**What IS redundant and must be fixed (P0)**: `Hit.colour` is free-text `CharField` while `PurchaseOrderItem.color` is an FK to `setup.ColorCode` — no referential integrity, typos create phantom colours. The seed derives hit colours from PO items (`seed_demo_data.py:2075`), proving the colour set is not independent.
- **Fix**: `Hit.colour` → FK `setup.ColorCode` + serializer-level validate "colour must be one of the PO's item colours". Migration + serializer; no UI change.
- Also: rename `Hit.delivery_mode` → `packing_mode` (collides with `setup.DeliveryMode` = FOB/CIF; `models.py:440`); align `Hit.delivery_type` (sea/air) with `Shipment.mode` (`logistics/models.py:44`) or document it as the production-planning copy.
- 📊 `Hit` node; 📝 Sprint 2.6 + Sprint 2.10 lessons; 📝 "model the real parent before building a UI".

### 3.2 Keep-as-is but document (informational, no code change)
- **O5 — Three scheduling structures**: `TAMilestone` (merchandising), `BookingScheduleItem` (logistics), `ProductionPlan` (production) all carry "when does this order move". Not removable (each is a target requirement) — document the intentional gap in the client handover so expectations stay honest.
- **O6 — Change-audit trio**: `AuditLog` (middleware), `OrderTrail` (PO join view), `POAmendment`/`LCAmendment`/`InvoiceApproval` (workflow gates). Keep all; cross-link Trail ↔ Audit Logs pages.
- **O7 — PI vs SalesContract**: closest commercial pair (both one-per-PO, amount/currency/status). **Ask the client** whether they issue both; do not merge blind.

### 3.3 Remove / retire (dead or disconnected — verified)
| # | Item | Evidence | Action |
|---|---|---|---|
| R1 | `fabric.FabricInventory` | Manual register; nothing links to it; the inventory *report* ignores it (`reporting/views.py`). Real stock flow = `FileOpening.is_stock_fabric` + `StockFabricAllocation` (RQ-019). | Remove model/viewset/page `/fabric/inventory` + nav item, OR wire dockets→on-hand. Recommended: remove (P1). |
| R2 | `monitoring.Alert` | `Alert.objects.create` only in tests — zero producers. Real alerting = T&A overdue banner. | Add producers (T&A overdue, booking-ref, compliance warnings) OR remove page/nav. Recommended: add producers (P2). |
| R3 | `ReportSchedule` | `CELERY_BEAT_SCHEDULER=DatabaseScheduler` but **no worker task**; `core/tasks.py` has none. Schedules can never fire. | Remove `ReportSchedule` + page + `/reports/schedules`, keep `SavedReport`; OR wire a Celery worker. Recommended: remove until scheduler exists (P1). |
| R4 | `/dashboard/executive` | Route exists (`App.tsx:106`), **not in nav** (`Layout.tsx`). Orphan. | Link it or delete; only keep if R5 consolidation keeps two dashboards (P2). |
| R5 | Duplicate KPI endpoint | `/api/v1/dashboard/summary/` (core) vs `/monitoring/health/summary/` (monitoring) compute same KPIs for two pages. | Consolidate on `/dashboard/summary/` (richer), retire the monitoring one (P1). |
| R6 | Reports = flat dumps | `SavedReport.execute` = 500-row dump per type duplicating filterable list pages. | Cut to CSV-export per list page; keep builder only if productized (P2). |

### 3.4 Importance matrix (drives roadmap priority)
| Tier | Modules | Business reason (BD buying house) |
|---|---|---|
| **T1 core spine** | Styles, File Openings, POs, BOM/Costing, T&A, Fabric (procurement), Production follow-up, Quality/Inspection, Shipments/Booking, Commercial (LC/PI/SC) | The order-to-cash spine. Every BD sale is won or lost here. |
| **T2 target differentiators** | Hits (RQ-010), Fit Specs (011/012), Job Queue (024/025), Fabric Risk & Schedule (018/020), Stock Fabric (019), Booking Schedule (029), Dockets (026), Reconciliation (027), Order Manager (028), Paperwork Comparison (031), Gold Seal (032), Compliance Audit (033), Debit Notes (034), Invoice Approvals (035), Sales Confirmation 48h (007), Repeats (009), Quick Lead (008) | Hard-won target-manual parity — this is the **competitive story** for the demo. Protect, don't cut. |
| **T3 support** | Setup/master data, Users/Roles, Health, Audit Logs, Help Center | Enabler, low demo value. |
| **T4 candidate cut/merge** | FabricInventory (R1), Alert (R2), ReportSchedule (R3), ExecutiveDashboard (R4/R5), duplicate summary endpoint (R5) | Dead or duplicate; remove before delivery. |

---

## 4. Client & End-User Orientation (BD Buying-House Lens)

### 4.1 Business context that must shape the product story
- **Roles that will use it**: merchandiser (primary), buying/sales, technical, planning, production, quality, logistics, accounts. Each needs a **role-first home screen**, not a giant nav.
- **BD specifics to showcase**: BDT currency, **Chattogram port** as POD, BD banks (Pubali/Sonali), compliance audits (BSCI/WRAP/SCS), LC-heavy payment (8-state LC + amendments), 5%/2% tolerance rules (Primark/Penney's), final-hit >20-unit debit rule, >200m final-docket sales flag.
- **The money story**: LC utilization, PO profit, buyer/factory profitability (already on Dashboard) — lead demos with the **Order Manager dashboard** (RQ-028) as the "where is my business at risk" screen.

### 4.2 Localization polish (quick wins, visible to BD clients)
1. ~~`Tenant.currency` default USD → **BDT** (`tenants/models.py`).~~ (done 2026-08-07: default `"BDT"`, migration `tenants/0003_alter_tenant_currency`)
2. ~~**"Chittagong" vs "Chattogram"** inconsistent across seeds — pick one (Chattogram, per modern BD usage).~~ (done 2026-08-07: normalized all seed/test/script/doc occurrences to `Chattogram`; `seed_lifecycle` already used it)
3. ~~Costing sheet-type default `sl` (Sri Lanka) → align to BD (`bd`) as default for BD tenants (`0021_costing...` migration).~~ (done 2026-08-07: model default `"bd"`, new migration `merchandising/0024_alter_costing_sheet_type`, `test_costing` asserts `bd`)
4. ~~LC bank seed: swap Deutsche Bank → a BD LC-issuing bank for a pure-BD pitch.~~ (done 2026-08-07: Deutsche Bank → Sonali Bank Ltd (`SONA`/`SONABDDH`, Dhaka); Pubali already seeded)

### 4.3 End-user orientation gaps (from business-context deep-dive)
- **No self-service tenant onboarding** — tenants provisioned via admin/ViewSet only. For enterprise SaaS this is acceptable, but document it and (P2) add a guided "Set up my company" wizard with the seed package.
- **Reporting is a shell for clients** — no fixed KPI report templates ("monthly order report", "buyer-wise shipment status", "factory efficiency trend"). Dashboards cover the need today; productize templates in the post-delivery phase.
- **Role-first UX** — define per-role landing dashboards and trim nav by permission so a merchandiser doesn't see LC banks. The RBAC model supports it (`user.user_roles`); the UI doesn't use it yet.
- **Help/tour already strong** (GuidedTour, HelpPage, glossary) — keep, extend with role-specific tour scripts.

---

## 5. Production / Deployment Readiness (delivery blocker, not a feature gap)

| Gap | Evidence | Fix |
|---|---|---|
| Dev-only stack | `docker-compose.yml`: `runserver`, `DEBUG=1`, fallback secret | gunicorn/nginx image, `DEBUG=0`, env secrets, healthchecks |
| CI only, no CD | `.github/workflows/ci.yml` = lint+test+build | add CD workflow + container registry |
| SQLite-not-tested | tests use in-memory SQLite (📝 lessons) | run full suite + a smoke run on PostgreSQL before delivery |
| **Tenant isolation risk** | middleware: missing `X-Tenant-ID` → falls back to **first active tenant**; invalid header → `request.tenant=None` and some viewsets return `.all()` (e.g. `reporting`) | **fail-closed**: no header/unknown tenant → 400/403; force `get_queryset().none()` on missing tenant (📊 `TenantMiddleware`). **This is the #1 pre-demo fix.** |
| Doc drift | `api-design.md`, `data-model.md`, `frontend/README.md` stale (📝 "documentation" lessons); `deployment.md` Python 3.14 vs Dockerfile 3.11 | refresh from actual code / drf-spectacular schema |

---

## 6. Traceable Roadmap (phases → tasks → traceability)

> Each task: **Trace =** RQ / backlog story / 📊 graph node / 📝 lesson / audit item (R# or O#). DoD per AGENTS.md: TDD, seed, zero breaking changes, docs, gates (`ruff`, `tsc`, `vite build`, full `pytest tests`).

### Phase 0 — Demo-Proof the Product (≈ 2 sprints; DO THIS BEFORE ANY SALES DEMO)
| # | Task | Trace | Priority |
|---|---|---|---|
| 0.1 | **Tenant isolation fail-closed**: middleware rejects missing/invalid tenant; viewsets with `tenant=None` return `.none()`; add cross-tenant 403 tests | 📊 `TenantMiddleware`; 📝 "Multi-Tenancy" + US-006 | **P0** |
| 0.2 | **Hit.colour → FK `ColorCode`** + validate colour ∈ PO items; data-clean seed values | RQ-010 (target-010); 📊 `Hit`; 📝 Sprint 2.6/2.10; audit 1a | **P0** |
| 0.3 | ~~**Consolidate dashboard KPI** on `/dashboard/summary/`; retire `/monitoring/health/summary/`; link or delete `/dashboard/executive`~~ | audit O1/R4/R5; 📊 `DashboardSummaryView` | P1 |
| 0.4 | ~~**Demo hardening**: fix `root_redirect` hardcoded `:5173`; make seeded milestone/ETA dates relative-or-rebasable; add `seed_demo_data --demo-frozen-dates` option~~ *(done 2026-08-07: `FRONTEND_URL` setting + redirect; LC expiry → days-offset, PO amendment delivery relative; `--demo-frozen-dates` pins to `date(2026,8,1)`; frozen test added; full suite green)* | business-context §4.2/§5; 📝 seed lessons | P1 |
| 0.5 | **BD localization**: currency default BDT, Chattogram naming, `bd` costing default, BD LC bank | business-context §4.2 | P1 |
| 0.6 | **Dead-weight removal**: remove `FabricInventory` (R1), `ReportSchedule`+page (R3) — keep `SavedReport`; remove `Alert` page or add producers (R2) | audit R1/R2/R3 | P1 |
| 0.7 | ~~**Write the Sales Demo Script** (merchandiser walkthrough in §4.1) + fix the 4 embarrassment risks~~ *(done 2026-08-07: `docs/SALES_DEMO_SCRIPT.md` — 12-act merchandiser walkthrough grounded in real routes/seed rows, BD talking-points bank, failure-mode notes; 4 embarrassment risks all closed by 0.1/0.3/0.4/0.5/0.6 and verified; frozen seed + e2e rehearsal of every live endpoint green)* | business-context §4 | P1 |

### Phase 1 — Client-Readiness Hardening (≈ 2–3 sprints)
| # | Task | Trace | Priority |
|---|---|---|---|
| 1.1 | **Production stack**: gunicorn/nginx Dockerfile, `DEBUG=0`, real secrets via env, healthchecks, backup job | 📝 "deployment"; `deployment.md` | P0 |
| 1.2 | **CD workflow**: GitHub Actions deploy + Postgres smoke test; fix `deployment.md` version inconsistency | `.github/workflows/ci.yml` | P1 |
| 1.3 | **PostgreSQL validation**: run full suite + lifecycle test against Postgres; fix SQLite-vs-PG issues | 📝 "testing"; US-002 | P1 |
| 1.4 | **Role-first UX**: per-role landing dashboard + nav pruning by `user.user_roles` | US-006; RBAC lessons; business-context §4.3 | P2 |
| 1.5 | **Reports productization-lite**: fixed KPI report templates (monthly orders, buyer-wise shipment, factory efficiency) backed by existing data; CSV export | US-108..112; audit O3/R6 | P2 |
| 1.6 | **Alert producers**: T&A overdue, booking-ref due, compliance 3-warning → real `Alert` rows; add Celery beat entry + worker for these + existing 48h auto-accept | RQ-007, RQ-025, RQ-030, RQ-033; audit R2 | P2 |

### Phase 2 — Client & End-User Orientation (≈ 2 sprints)
| # | Task | Trace | Priority |
|---|---|---|---|
| 2.1 | **Tenant onboarding wizard** (admin-gated): create tenant, seed master data, create admin user, first-tenant health-check | US-006; tenants app | P2 |
| 2.2 | **Role-specific Guided Tours** + HelpPage per-module for the 6 roles; merchandiser-first | business-context §4.3 | P2 |
| 2.3 | **Client question backlog** (resolve with 1–2 BD buying-house owners): PI vs SC both issued? fabric inventory needed at all? fixed report templates? | audit O7; business-context | P2 |
| 2.4 | **Doc reconciliation pass**: regenerate `api-design.md` from drf-spectacular, fix `data-model.md` (purchase_orders not orders), refresh `frontend/README.md` routes | 📝 "documentation"; US-007 | P2 |
| 2.5 | **Cross-link change-audit**: OrderTrail ↔ AuditLogs; document scheduling trio gap (O5) in client handover | audit O5/O6 | P3 |

### Phase 3 — Post-Delivery & Productization (deferred, off critical path)
| # | Task | Trace | Priority |
|---|---|---|---|
| 3.1 | Full reporting engine (schedules + worker + email) — only after a real scheduler exists | US-110/111 | P3 |
| 3.2 | Unify the three scheduling structures (T&A / Booking / ProductionPlan) behind one order-timeline concept | audit O5 | P3 |
| 3.3 | `Hit.delivery_mode`→`packing_mode` rename + `delivery_type` alignment (cosmetic, batch with a migration window) | audit 1b/1c | P3 |
| 3.4 | Self-service multi-tenant signup (SaaS model) | US-006 | P4 |
| 3.5 | AI/ML roadmap (ai-roadmap.md) — deferred by design | ai-ml.md | P4 |

---

## 7. Readiness Gate (Definition of "Client-Ready")

- [x] 0.1 tenant isolation fail-closed + cross-tenant tests green
      (done 2026-08-06: middleware + queryset fail-closed; `TENANT_HEADER_REQUIRED=True` in prod; frontend sends `X-Tenant-ID`; 1291 tests green)
- [x] 0.2 Hit colour FK integrity done, seed clean, no phantom colours
      (done 2026-08-06: `Hit.colour` FK → `ColorCode` (migration 0023 w/ backfill), colour ∈ PO items validated, `colour_name` exposed; seed + frontend dropdown updated)
- [x] 0.6 dead-weight removal shipped (no FabricInventory/ReportSchedule/Alert dead UI)
      (done 2026-08-06: removed `FabricInventory` model/viewset/route/page/nav (mig 0007); removed `ReportSchedule` model/viewset/route/page/nav (mig 0003, kept `SavedReport`); removed Alerts CRUD page/nav only — backend `monitoring.Alert` kept for planned 1.6 producers; e2e/scripts updated; 1280 tests green)
- [ ] 1.1/1.2 production stack + CD verified on a clean machine (`docker compose up` → seeded → login)
- [ ] Full `pytest tests` green against PostgreSQL; `ruff`, `tsc`, `vite build` clean
- [ ] Demo script rehearsed end-to-end with **zero** console errors and frozen dates
- [x] BD localization (BDT, Chattogram, BD bank) consistent
      (done 2026-08-07: `Tenant.currency` default BDT (tenants/0003); costing `sheet_type` default `bd` (merchandising/0024); `Chittagong`→`Chattogram` normalized across seeds/tests/scripts/docs; Deutsche→Sonali Bank in LC seed; focused 179 + full suite 1280 green)
- [x] 0.3 dashboard KPI consolidated on `/dashboard/summary/`
      (done 2026-08-07: retired `SystemHealthViewSet.summary` (`/monitoring/health/summary/`); deleted orphan `ExecutiveDashboardPage` + route + `getSummary`/`DashboardSummary` from client.ts + HelpPage entry; e2e probe removed; `/dashboard/summary/` kept (richer) and probed; full suite 1280 green, tsc/vite clean)
- [x] 0.4 demo hardening shipped (`root_redirect` uses `FRONTEND_URL`; seeded dates relative/rebasable; `--demo-frozen-dates` pin to `date(2026,8,1)`)
      (done 2026-08-07: `FRONTEND_URL` setting in base.py + redirect use; LC expiry as days-offset, PO amendment delivery relative; `--demo-frozen-dates` flag sets `self.today`/`self.now`; new `TestSeedFrozenDates` test; full suite green)
- [x] 0.7 Sales Demo Script written (merchandiser walkthrough; 4 embarrassment risks closed)
      (done 2026-08-07: `docs/SALES_DEMO_SCRIPT.md` — 12 acts, real routes + seed rows, BD talking points, failure modes, rehearsal gate; embarrassment risks #1 tenant isolation (0.1), #2 dead UI (0.3/0.6), #3 stale/hardcoded dates+redirect (0.4), #4 non-BD localization (0.5) all verified closed; frozen seed + e2e probe of every live endpoint green. Manual live-browser rehearsal checklist lives in the doc's §6 Rehearsal Gate.)
- [ ] Demo script rehearsed end-to-end with **zero** console errors and frozen dates
      (blocked on: one live-browser pass by a human/demo owner using the §6 checklist; backend endpoints + frozen seed already verified by e2e/full suite)
- [ ] Docs refreshed (api-design, data-model, frontend README, deployment)
- [ ] Client question backlog (2.3) answered with the owner

---

## 8. Traceability Index

| Deliverable | Where |
|---|---|
| Master backlog (RQ/US status, authority) | `AI-BHMS/master-backlog.md` |
| Full redundancy & overlap audit (evidence w/ file:line) | `AI-BHMS/analysis/redundancy-overlap-audit.md` |
| BHMS knowledge graph (query/explain/path) | `AI-BHMS/graphify-out/` (`graph.html`, `graph.json`, `GRAPH_REPORT.md`) |
| Retrospectives / lessons | `AI-BHMS/../lessons-learned.md` |
| Client & business-readiness analysis | business-context deep-dive (summarized in §4–§5) |
| Roadmap (this document) | `AI-BHMS/analysis/product-refinement-roadmap.md` |

*Refine with the owner each sprint; keep RQ-IDs as the anchor so every task stays traceable to the backlog and the graph.*
