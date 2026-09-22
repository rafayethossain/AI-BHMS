# BHMS Business Workflow — Chain of Work (Canonical v2)

> Authoritative order-lifecycle document for the buying-house product. Source documents: `PRD.md`,
> `data-model.md`, `module-specs.md`, prototype `requirements.md` (REQ-p), `ROADMAP.md` (PT-###).
> Deltas vs the previous model are recorded here AND in `prototype/scope.md` change log. This doc
> supersedes the earlier mental model of the chain; it does NOT rewrite `PRD.md` — deltas are tracked
> until the dev implementation catches up.

## The chain in one line

Design (version + File Number) → Merchandising (buyer PO management) → Procurement (materials booking
& print) → Production → Quality → Logistics/Shipment → Commercial (payment) → Visibility (dashboards
& reports).

## 1. DESIGN — register, FN per version, costing, reports

- **Design register** (merged Styles + Design Sheets): created by user input OR imported via the
  tech-pack wizard; card/list toggle, per-column filters, xlsx export.
- **Materials breakdown per design**: items, trims, labels, **accessories, other** — the base the
  procurement POs are generated from.  (REQ-p-001/003)
- **Design sheet**: sketch annotation + design images + tech packs + material + fit specs + job
  requests; tech-pack import shows per-section progress.
- **Versions: a version opened as a commercial file carries the File Number (FN).** The FN is the
  commercial tracking key — all POs of that version are tracked under the FN; a version not yet
  opened has no FN. This replaces the separate File Opening layer (scope reduction, decision
  2026-09-15).
- **Version-wise design costing**: single-piece cost + price ladder
  (discount/overhead/base/margin), approve / reject / set-live; **derives the PO-level costing
  ladder** downstream.
- **Sales Order report** (per version): PO rows with Fabric/Trims/Production/Delivery/Overall
  status pills + drill-down.
- Status: `draft → active → in production → archived`.
- **Tech-pack import wizard**: buyer PDF → extract → review/edit → import (creates/links versions,
  items, BOM, materials breakdown).

Mapping: REQ-p-001, 002, 003, 006, 007, 008 · slices PT-006, 010, 016, 017.

## 2. MERCHANDISING — Buyer PO management (under the FN/version)

- Open the commercial file for a design version (= the FN): quick-lead / repeat marking, department
  approval workflow, stock-fabric flags, notes.
- **Create buyer PO** for the design version / FN → lifecycle `draft → open → confirmed →
  in_production → quality_check → ready → shipped → delivered (→ cancelled)`.
- **PO costing ladder** derived from the version's design costing + PO totals (sheet type, exchange
  rate, live tick); "Create PO from Costing" and "Prepare PO Costing" reuse the version cost.
- **T&A** (merchandiser's critical-path tool, nested here): milestone Gantt per PO, Add Milestone,
  copy-to-new, calendar, heatmap, milestone alerts.
- **Order Manager**: critical-path review (no-ta / on-track / off-track / complete), weekly review
  print.
- **PO detail**: items, hits (boxed/hanging, sea/air), amendments (AMD-), trail/audit, status
  wizard; risk pillars Fab/Trims/Labels/Tech/Overall cascade to the Style Sales-Order report.

Mapping: REQ-p-010, 011, 013, 014, 015, 016 · slices PT-011, 012, 014, 015.

## 3. PROCUREMENT — Materials booking & print

- From the design version's materials breakdown + PO, **generate materials POs** for
  fabric / trims / labels / accessories / other, each with **set terms & clauses** (delivery,
  payment/credit, bank, validity), quantity + schedule lines, booking references.
- **Print the materials POs** (printer-friendly templates) — the merchandiser signs and sends them
  to suppliers.
- Fabric bookings → **schedule** (Fabric Schedule 16.2: lab-dip, strike-off, onboard,
  offer/actual dates, owners, handoff audit, risk level).
- **Tolerances, utilization** (monthly/quarterly), dockets with over-200m sales flag.
- **Deferred**: RFQ wind-up (vendor quotes, draft/sent/responded/closed/cancelled) — considered in
  a later phase (decision 2026-09-15).

Mapping: REQ-p-023, 024, 025 · slice PT-023.

## 4. PRODUCTION

Production plans → KPI dashboard → factory portal → daily reports (machine/operator/remarks) →
order detail with line performance bars (Start/Complete actions). (REQ-p-030 · PT-024)

## 5. QUALITY

Inline / final / pre-shipment inspections → quality dashboard (AQL, DHU) → CAPA → gold seals →
compliance audits (weekly 8-item). (REQ-p-031/032 · PT-025)

## 6. LOGISTICS / SHIPMENT

Booking schedule (inline edit, last-hit, snapshot) → shipment 9-stage flow (`draft → booking →
booked → picked_up → in_transit → at_port → on_water → arrived → cleared → delivered`, cancelled
allowed; 8 document types) → dockets (over-200m flag) → paperwork comparison → import/export recaps
→ forward order book → final hit reconciliations → supplier payments → cost reconcile.
(REQ-p-040, 041, 042, 043, 044 · PT-030/031)

## 7. COMMERCIAL — Payment (parallel money track — retained, not dropped)

Proforma invoice → sales confirmation (48h) → sales contract; LC + amendments (+ banks); debit
notes; invoice approvals (5%/2% tolerance, >20-unit rule, Approve/Reject, compliance email);
supplier payments link back to the money flow. (REQ-p-020, 021, 022 · PT-021/022)

## 8. VISIBILITY / CONTROL

Dashboards (main Tasks/Pipeline/Financials/Alerts, executive, Order Manager, Production, Quality,
Shipment, T&A) → summary + recap reports (builder/viewer/schedules, CSV/xlsx) → audit logs →
health checks → help centre / tours. (REQ-p-050, 051, 052, 053 · PT-032/033/034)

---

## Decisions log (2026-09-15)

1. **File Number (FN) rides the version.** Each design version carries one FN; all POs of that
   version track under it. Removes the separate File Opening layer (old `FileOpening` entity
   attributes merge onto the version commercial file). Scope reduced; PO roll-up per version is 1:N.
2. **Materials booking & print in scope.** Materials POs for fabric/trims/labels/accessories/other
   with set terms & clauses + print templates. New capability — spec it as a real requirement
   (candidate RQ-052; confirm against the reference manual during spec).
3. **RFQ deferred** to a later phase. Bookings/orders proceed directly in this phase.
4. **Accessories / other** added to the design-level materials breakdown (beyond trims/labels).
5. **PO-level costing ladder derived** from the version-wise design costing + PO totals.

## Deltas vs v1 (and where they land)

| Area | v1 (before) | v2 (now) | Lands in |
|------|-------------|----------|----------|
| File / FN | `FileOpening` separate; FN on FO; FO→PO | FN on version; PO under version/FN | `data-model.md` §1, `requirements.md` REQ-p-010, `ROADMAP.md` PT-011 |
| Supplier docs | BOM statuses only (Ordered/TBC/Partial/Completed) | Materials POs + terms/clauses + print | `requirements.md` REQ-p-023, `data-model.md` §3, `ROADMAP.md` PT-023 |
| Materials classes | trims, labels | + accessories, other (design breakdown) | REQ-p-003, §3 Procurement |
| RFQ | Fabric RFQ + quotes (P2) | deferred | REQ-p-023 (reworded), scope change log |
| Costing | design cost + PO cost separate | PO ladder derived from version cost | REQ-p-006/013, `data-model.md` |
| T&A / PO costing placement | standalone chain stages | nested under Merchandising | chain §2 |

## Backward / forward links

- **Backward**: nothing ships without a design version → FN → buyer PO; materials POs need the
  version's materials breakdown; PO risk depends on materials statuses, production progress,
  and delivery date vs today.
- **Forward**: PO status drives the Style Sales-Order pipeline; shipment stage drives dockets,
  recaps, final hit reconciliation; invoice approval closes the money track.

## Traceability

Chain stage → REQ-p row → slice PT-### → test → evidence (see `prototype/TDD` conventions and
`prototype/TRACKER.md`). Any change to this doc must also update `prototype/scope.md` change log and
the affected `requirements.md` / `data-model.md` / `ROADMAP.md` rows.