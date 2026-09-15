# Prototype Task Tracker — BHMS Interactive Prototype

> Companion to `ROADMAP.md` and `plan.md`. One row per prototype slice (PT-###).
> **Legend:** ⬜ not started · 🔴 RED written (failing test committed to intent) · 🟢 GREEN
> (implemented, gates pass for the slice) · ✅ VERIFIED (gates + evidence + traceability recorded).
> Read the **latest entries first** — recent work sets this session's conventions.

## Phase P0 — Foundation

| ID | Slice | Evidence | Status |
|----|-------|----------|--------|
| PT-001 | Vite + React 19 + TS 6 + Tailwind 4 + Tabulator 6 + Vitest + Oxlint scaffold | `npm run dev`/`build`/`test` green | 🟢 GREEN |
| PT-002 | Design tokens + light/dark theme (`theme/tokens.css`, `theme/tabulator.css`) | ThemeContext toggle + token smoke test | ⬜ |
| PT-003 | `SpreadsheetGrid` wrapper (toolbar, header filters, export, actions col, pagination) | `SpreadsheetGrid.test.tsx` (wrapper contract, mocked Tabulator) + CDP export check | ⬜ |
| PT-004 | Mock service layer (`types.ts`/`seed.ts`/`db.ts`/`api.ts`) | api/seed unit tests + coverage audit vs `mock-data-spec.md` | ⬜ |
| PT-005 | App shell: module rail + top bar + router + dashboard placeholder | `Layout.test.tsx` (nav) | ⬜ |
| PT-006 | Design register screen on grid (list, filter, add modal, view, print) | `DesignsPage.test.tsx` + CDP | ⬜ |
| PT-007 | Micro-interactions kit (status pill, hover preview, toasts, search-as-you-type) | kit component tests | ⬜ |
| **P0 Checkpoint** | dev render + gates green + real-browser clean + human review | — | ⬜ |

## Phase P1 — Core order lifecycle

| ID | Slice | Evidence | Status |
|----|-------|----------|--------|
| PT-010 | Style detail tabs (incl. Sales Order report block) | `StyleDetailPage.test.tsx` | ⬜ |
| PT-011 | File Openings list + detail | page tests + CDP | ⬜ |
| PT-012 | Purchase Orders list + detail (+ trail) | page tests + CDP | ⬜ |
| PT-013 | BOM list + detail | page tests | ⬜ |
| PT-014 | Costings list + detail (ladder + prepare PO costing) | page tests | ⬜ |
| PT-015 | Order Manager dashboard + weekly review print | page tests + CDP | ⬜ |
| PT-016 | Sales Order report print + xlsx | report block tests + CDP | ⬜ |
| **P1 Checkpoint** | end-to-end lifecycle demoable; human review | — | ⬜ |

## Phase P2 — Supporting workflows

| ID | Slice | Evidence | Status |
|----|-------|----------|--------|
| PT-020 | T&A (list/detail/calendar/heatmap) | page tests | ⬜ |
| PT-021 | Commercial (LC, PI, contracts, confirmations, banks) | page tests | ⬜ |
| PT-022 | Debits + invoice approvals + dashboards | page tests | ⬜ |
| PT-023 | Procurement (fabric master, RFQ, bookings, orders, schedule) | page tests + CDP | ⬜ |
| PT-024 | Production (plans, daily, portal, dashboard) | page tests + CDP | ⬜ |
| PT-025 | Quality (inspections, CAPA, dashboard, gold seals, audits) | page tests | ⬜ |
| **P2 Checkpoint** | all secondary modules demoable; human review | — | ⬜ |

## Phase P3 — Logistics, reports, setup

| ID | Slice | Evidence | Status |
|----|-------|----------|--------|
| PT-030 | Logistics (shipments, dockets, recaps, forward orders, reconciliations, payments, cost reconcile) | page tests + CDP | ⬜ |
| PT-031 | Booking schedule grid (inline edit, last-hit) | page tests | ⬜ |
| PT-032 | Summary reports + report builder/viewer/schedules | page tests + CDP print/export | ⬜ |
| PT-033 | Setup & admin (tenant, offices, master data, users, roles, audit, health) | page tests | ⬜ |
| PT-034 | Help & onboarding | page tests | ⬜ |
| **P3 Checkpoint** | full route surface reachable; human review | — | ⬜ |

## Phase P4 — Polish, QA & delivery

| ID | Slice | Evidence | Status |
|----|-------|----------|--------|
| PT-040 | Full interaction QA pass (every action kind) | QA checklist in evidence | ⬜ |
| PT-041 | A11y + keyboard + light/dark sweep | axe/CDP check | ⬜ |
| PT-042 | Performance pass (grid volumes, virtualization) | CDP timing | ⬜ |
| PT-043 | Mock-data coverage audit | vs `mock-data-spec.md` | ⬜ |
| PT-044 | Handoff pack for dev team | docs + app packaged, review sign-off | ⬜ |

---

## In-progress (current slice)

- **PT-006 (Design register)** — in progress this session after P0 scaffold. [Blockers: none]

## Latest entries

- **2026-09-15 — PT-001 seed scaffold** — `prototype/app` created (Vite 8, React 19, TS 6, Tailwind
  4, Tabulator 6, Vitest, Oxlint); workstream docs shipped in `prototype/`. GATE: app gates green
  (see evidence line in PT-001 when run).