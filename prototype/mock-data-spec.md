# Mock Data Specification

> What dummy data the prototype ships with (`app/src/mock/seed.ts`, resolved by `db.ts`,
> exposed by `api.ts`). The rules: **every status branch and every grid state must be reachable**
> in the demo, amounts/volume mirror the real demo seed, and dates are frozen to `2026-09-10` base.

## Principles

1. **Stateful coverage** — for every enum/status, at least one row sits in each state; risk derived
   payloads hit each branch (see `data-model.md` §2).
2. **Interconnected** — FKs resolve to real rows (Style→Version(FN)→PO→Items→Hits→DailyProd;
   PO→Costing; Shipment→BookingSchedule→Docket etc.). Clicking through detail pages always has data.
3. **Deterministic + frozen dates** — a `DEMO_FROZEN_BASE = "2026-09-10"`; overdue windows computed
   relative to it so "overdue" pills are real in the demo.
4. **Volumes** — tuned to show pagination (25 rows at page size 10) on list pages and modest
   details (3–8 rows on tabs), so reviewers see empty/loading/search behaviours on purpose-set lists
   as well.
5. **Copy** — no lorem ipsum: buyers (Nike Inc., Zara, Primark, Aldi, Addidas, Walmart, Costco),
   factories (Bangladesh mills), countries (Germany, USA, UK…), POs like `PO-2025-###`,
   files like `FO-2025-###`, styles `REG-1001..1010` / `DSD-1001..1005`.

## Entity volumes (initial seed)

| Entity | Rows | Notes |
|--------|------|-------|
| Styles / Designs (register) | 15 | REG-1001..1010 + DSD-1001..1005; mixed status; a few with 0 POs |
| StyleVersions | 20 | 1–2 per style; current_version link on style |
| Buyers | 7 | Nike Inc., Zara, Primark, Aldi, Addidas, Walmart, Costco |
| Factories | 5 | Bangladesh mills |
| FN / version commercial files (one per StyleVersion) | 17 | each version carries an FN; flags on v1 only unless noted — 3 quick-lead (1 dept agreed), 4 repeats (1 dept approved), stock fabric on 3 designs (REG-1001 both versions, REG-1007, DSD-1003 — 500m total / 120m allocated / 380m balance) |
| Purchase Orders | 12 | PO-2025-0001..0008 + PO-DEMO-01/02 + PO-PC-OVER/SHORT; all statuses incl. overdue |
| PO Items | ~40 | color/size/qty per PO |
| Hits | 18 | boxed/hanging, sea/air, some delivered |
| Costings | 8 | sheet types SL/VN/BD/CN/other; 1 live; lines fabric/trim/label/making/overhead |
| Design Costings | 5 | REG styles: 3 approved (ladder populated), 1 pending, 1 draft; 1 live per style |
| BOM items | 75 | trimmed categories w/ Ordered/TBC/Partial/Completed mix |
| Fit specs | 11 | `FitSpecification` per design+version; stages dev/1st/2nd/3rd/pp; exactly one `is_selected` (current) per design; REG-1001 has 4 |
| Job requests | 11 | `JobRequest` per design (REG-1001 ×4, REG-1002 ×2, REG-1004 ×3, REG-1005 ×1, DSD-1001 ×1; REG-1003 empty for the empty-state demo); job types pattern/sample/3d/mini_marker; priorities 1–4; statuses pending/in_progress/completed/cancelled; one **overdue** open job (due before the frozen base); `assigned_to` resolves to the `assigneeSeed` staff master |
| Costings (design-scoped) | 10 | `Costing` per design (REG-1001 ×4, REG-1002 ×2, REG-1004 ×3, REG-1005 ×1; REG-1003 empty); sheet types sl/vn/bd/cn/other; statuses draft/pending/approved/rejected; **one live sheet per purchase order** (REG-1001 lives V1 of PO-2025-0001); costs fabric/trim/cm/overhead + target price; **total + margin % computed in the page** |
| Sales report (derived) | — | **no seed** — computed per version from `designDetailSeed` POS (rows + rolled-up totals) for the print / CSV export page |
| Shipments | 6 | 9-stage flow, 8 doc types, incl. 1 past ETA no booking-ref (14-day alert demo) |
| Freight forwarders | 5 | linked to bookings/shipments |
| Booking schedule | 15 | live/in_work/delivered; last-hit marker; snapshot |
| Materials POs | 8 | fabric (2) / trims (2) / labels (2) / accessories (1) / other (1); terms & clauses; booking refs; draft/confirmed/partial/delivered |
| Fabric orders | 4 | draft/bulk_approved/delivered + risk levels (red w/ notes); one docket >200m sales |
| Fabric tolerances | 6 | customer_type × qty-band thresholds incl. a resolve case |
| Fabric utilization | 4 | 2 monthly + 2 quarterly cut/qty rows |
| Paperwork comparison | 8 | ordered vs shipped vs docket tolerance; over/short + covers-order cases |
| T&A rows | 8 | milestone sets: no-ta / on-track / off-track / complete |
| Quality | 6 inspections + 12 audits + 5 gold seals + 3 CAPA | pass/fail/pending mix |
| Production | 5 plans + daily rows | incl. one where output ≥ qty (green) and one partial (amber) |
| Commercial | 5 confirmations, 3 contracts, 5 PIs, 5 LCs + 3 amendments, 4 debits, 4 approvals | every status present |
| Logistics | 5 recaps, 4 forward orders, 4 reconciliation rows, 5 supplier payments, 4 cost reconciliations | statuses day-todate |
| Reports/Setup/Help | 4 saved reports, 7 report schedules, users+roles+audit rows, 3 release notes, 8 onboarding items | small |

## Guaranteed demo scenarios (the "story" reviewers click)

- **Design register**: 15 rows; filter "Live" shows approved+active; card/list toggle; New Design
  fresh + copy-from-existing; xlsx export works (real-browser).
- **Style detail → Sales Order tab**: pick REG-1004 → 11 PO rows; fabric red (sticky), delivered
  green, overdue red; drill-down to PO.
- **Fit specs**: open a design's Fit Specs page (register Actions menu → Fit Specs) → REG-1001 shows
  four specs across v1/v2 with one current; **Set Current** moves the marker; add/edit/view/delete.
- **Job requests**: open a design's Job Requests page (register Actions menu → Job Requests) → REG-1001
  shows four jobs across every type with the open count; the overdue open job's due date is flagged red;
  add/edit/view/delete; REG-1003 shows the empty state.
- **Design costings**: open a design's Costings page (register Actions menu → Costings) → REG-1001 shows
  four sheets across the sheet types and statuses with the live sheet ticked; totals and margins are
  computed; **Set Live** moves the tick within a purchase order (one live per PO); add/edit/view/delete;
  REG-1003 shows the empty state.
- **Sales report**: open a design's Sales Report page (register Actions menu → Sales Report) → REG-1004
  prints 11 PO rows with the five per-area risk pills and rolled-up totals; switching to a non-current
  version shows the empty state; **Print** (`window.print()`) and **Export** (client-side CSV) both work.
- **PO detail**: the detail page (`/purchase-orders/:poNumber`) renders five tabs — **Overview** (details +
  a Fab/Trims/Prod/Deliv/Overall **risk matrix** + Open Design / Open File drill-downs), **Items** (line items
  split from the design's items so they cover the PO quantity **exactly**; add/edit/delete), **Hits**
  (boxed/hanging, sea/air; add/edit/delete), **Amendments** (**every PO has exactly 3** — requested /
  approved / rejected by construction, so Approve/Reject is always demoable), and **History** (the trail
  timeline). Any item/hit/amendment mutation appends a trail event. Delivered PO vs in-production PO have
  different derived statuses/risk. Example: **PO-2025-0001** = REG-1001 / FO-2025-102 (open, 1,000 units,
  4 item rows, risk On Track ×1 / At Risk ×2 / No Status ×2).
- **PO list**: register-wide grid of **33 POs** aggregating every design's POs, with the five risk-label
  columns + status; search/group/export; row click → detail.
- **Order Manager**: critical path complete + on-track + off-track rows; weekly review print.
- **Booking schedule**: inline-edit a cut qty, last-hit row highlighted, snapshot columns.
- **Tech-pack import wizard**: run the 3-step flow on a design (upload → extract/review → write
  through) → creates/links style + version + items + BOM; Style detail Tech Packs tab shows section
  progress (REQ-p-008).
- **Shipping paperwork comparison**: rows with ordered vs shipped vs docket tolerance; over/short
  cases; covers-order flag (REQ-p-044).
- **Fabric tolerances + utilization**: a customer × qty-band case that resolves; monthly and
  quarterly utilization grids (REQ-p-025).
- **Freight forwarders**: CRUD + bookings linked to shipment detail.
- **Materials booking + print**: from a design version's materials breakdown + PO, generate
  materials POs (fabric/trims/labels/accessories/other) and print with terms & clauses (REQ-p-023).
- **Version commercial file (FN)**: the FN rides the design version (no separate File Opening layer) — open a
  version's commercial file from the Design detail **Versions** tab (or header **+ Add Update**) → quick-lead
  **/repeat + department approvals + stock-fabric flags + notes** → the version's **POs roll up under the FN**
  (REQ-p-010). One commercial file per version (17 total).
- **Dockets over-200m**: a docket above the sales threshold shows the red flag + notification.
- **Setup / audit / health**: master-data rows in 20 categories, action-coloured audit log rows, one
  degraded health check.
- **Invoice approval rules**: one >20-unit and one 5%/2% tolerance case for Approve/Reject.
- **Empty/loading states**: one list (e.g. LCs) pre-filtered to show "No rows yet" + the search
  box query surfacing the empty state without a reload.

## Editing the mock

- Seed lives in `app/src/mock/seed.ts` (typed by `types.ts`); `db.ts` clones it per app load and
  applies the mock mutations (add/edit/delete/status). `api.ts` exports `getList/get/ create /
  update/remove/action` with a ~120ms latency and a `resetDb()` helper for tests.
- New seed data for a module must be added in the same slice that ships that module's first screen,
  and must satisfy the coverage rules above — flag any exception in the slice's evidence note.
- **Seeded vs pushed ids must not share a namespace.** Seeded child rows (e.g. the PO detail layer's
  `${poNumber}-item-N` / `-hit-N` / `-amd-N` / `-trail-N`) are namespaced by the parent number; rows
  **pushed by a mutation** use a distinct, globally-unique prefix (`po-item-` / `po-hit-` / `po-amd-` /
  `po-trail-`). Never mint a pushed id with the seeded pattern (`${poNumber}-trail-N`) — it collides with
  the seed and produces **duplicate React keys** on every append (invisible to jsdom assertions, visible
  in the browser console). This is guarded by a RED-first id-uniqueness test.
- Tests never depend on mutable seed state: fixtures in `src/tests/` build their own data.