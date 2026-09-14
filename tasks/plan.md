# Implementation Plan: Design Costing per Piece → PO Costing (reference "Cost Report — Live/Delivered")

## Overview
Extend the Style-level per-piece `DesignCosting` with the reference price **ladder** (customer
discount %, origin/UK overhead %, USD→GBP exchange rate → Base Cost / Selling Price / Margin $ / %),
then make `prepare_po_costing` snapshot that ladder + compute **PO-level totals** (per-piece × PO
quantity) on the order-level `Costing`. Confirmed scope: **Slice A + B** (Slice C — budget-vs-actual /
shipment variance / P&L by PI — is a follow-up). This closes the "single-piece costing → PO costing"
loop shown in the reference artifact (per-piece cost table feeding the PO cost report).

## Triage (AGENTS.md §2)
- PRIORITY: **P1** · TIER: Phase 4 — Costing (grows RQ-013 / RQ-014 / G-12 design-costing story).
- BLAST_RADIUS: **shared across the design-cost → order-cost path** (`DesignCosting` → `prepare_po_costing` → `Costing`), but contained in `apps/merchandising` only. No other app consumed; escalates to GATE_A + documented adjacency grep (no GATE_B).
- TRACE: RQ-013/RQ-014 + reference "Cost Report — Live/Delivered" → Slice A (per-piece ladder) → Slice B (PO totals) → tests (`test_design_costing_ladder.py`, extended `test_design_costing_prepare.py`, new `DesignCostingDetailPage.test.tsx`) → evidence in TDD_TRACKER.
- GATE_PLAN: backend targeted + owning-app `pytest apps/merchandising -q` + adjacency grep on `design-costings`/`costings` in `backend/tests`; frontend `tsc -b` + lint + full `vitest`.

## Ladder formula (user-confirmed: discount on selling)
For a design costing with `selling_price` set (None-guarded otherwise; legacy
`(target-total)/total` margin retained as fallback when `selling_price` is absent so existing
rows/tests keep behaving):
- `discount_amount = selling_price × customer_discount_pct / 100`
- `overhead_amount = total_cost × (origin_overhead_pct + uk_overhead_pct) / 100`
- `base_cost = total_cost + discount_amount + overhead_amount`
- `margin_amount = selling_price − base_cost`
- `margin_percent = margin_amount / selling_price × 100`
- `landed_cost (GBP) = total_cost × exchange_rate` (quantized 0.01; None until rate set)

Money quantized 0.01, margin_percent 2dp.

## Architecture Decisions
- **Snapshot onto Costing (user-confirmed):** `prepare_po_costing` copies ladder inputs +
  `selling_price` and freezes PO totals (`po_quantity`, `po_total_cost`, `po_base_cost`,
  `po_margin_amount`) at prepare time. The order-level `Costing` remains an independently-editable
  worksheet (RQ-013 behaviour intact); the design is the *source*, the PO is a *frozen snapshot*.
- **Backward-zero-break:** all new fields nullable / defaulted in one migration `0043`; existing
  `margin`/`target_price`/`margin_percent` semantics unchanged when the ladder is unused.
- **Properties not stored (design):** `base_cost`, `discount_amount`, `overhead_amount`,
  `margin_amount`, `landed_cost` are computed on `DesignCosting` (like the existing
  `margin_percent`). **Stored** on `Costing` at prepare time (snapshot semantics).
- **No new libraries.** Decimal math + existing `landed_cost` pattern.

## Task List

### Slice A — Per-piece price ladder
- **T1 — RED: ladder model/serializer tests** (`backend/apps/merchandising/tests/test_design_costing_ladder.py`)
  - Model properties: `discount_amount`, `overhead_amount`, `base_cost`, `margin_amount`,
    `margin_percent` (selling basis), `landed_cost`; None-guards when `selling_price`/rate absent;
    legacy margin fallback preserved.
  - Serializer: create/PATCH persists 5 ladder fields; derived fields exposed in response;
    validation rejects negative pct, pct > 100, zero/negative `selling_price`, non-positive
    `exchange_rate`.
  - Acceptance: new tests fail first (RED evidence in TDD_TRACKER).
- **T2 — GREEN: models + migration + serializer** (models.py `DesignCosting` + `DesignCostingLine`
  untouched, `serializers.py`, new `migrations/0043_designcosting_ladder.py`)
  - Add `customer_discount_pct`, `origin_overhead_pct`, `uk_overhead_pct` (Decimal 5,2 def 0),
    `exchange_rate` (12,6 null), `selling_price` (10,2 null) to `DesignCosting`.
  - Add derived properties + extend `margin_percent` (fallback path). Expose new fields on
    `DesignCostingSerializer` + validations.
- **T3 — Frontend: ladder block + client** (`frontend/src/api/client.ts`,
  `frontend/src/pages/DesignCostingDetailPage.tsx`, new
  `frontend/src/pages/__tests__/DesignCostingDetailPage.test.tsx`)
  - Extend `DesignCosting` type; add `updateDesignCosting` PATCH.
  - Detail page "Landed / Price Ladder" block: 5 editable inputs (PATCH) + readouts Base Cost,
    Margin $, Margin %, landed GBP.
  - New page test (RED first).
- **CHECKPOINT A:** targeted + owning-app backend pytest, full frontend suite green.

### Slice B — PO costing totals from design
- **T4 — RED: prepare-action ladder + PO totals tests** (extend
  `backend/apps/merchandising/tests/test_design_costing_prepare.py`)
  - Ladder fields + `selling_price` copied onto `Costing`.
  - `po_quantity` frozen to `purchase_order.quantity`; `po_total_cost = total_cost × po_quantity`;
    `po_base_cost` / `po_margin_amount` ×quantity (None when `selling_price` unset).
  - Tenant/status/duplicate guards unchanged.
- **T5 — GREEN: order-level snapshot** (models.py `Costing`, `prepare_po_costing` in
  `views.py`, `CostingSerializer`, same migration `0043`)
  - Add the 5 ladder fields + `selling_price` + `po_quantity` + `po_total_cost` +
    `po_base_cost` + `po_margin_amount` to `Costing`; copy at prepare.
  - Expose ladder + PO totals on `CostingSerializer` (per-piece and PO-level readouts).
- **CHECKPOINT B:** owning-app `pytest apps/merchandising -q` + adjacency grep hits green;
  frontend `tsc -b` / lint / vitest green.

### Docs / completion
- **T6 — Traceability:** `TDD_TRACKER.md` entry (gate evidence + RED→GREEN), `master-backlog.md`
  Addendum (RQ-013/RQ-014), `lessons-learned.md` entry.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| `margin_percent` semantics change breaks existing consumers | Med | Keep legacy fallback when `selling_price` unset; existing tests still pass |
| PO qty 0 / negative at prepare | Low | PO totals quantized from quantity as-is; guard negative → 0 in snapshot |
| `prepare_po_costing` copies widen | Med | Ladder copy added inside existing create + explicit new snapshot fields; duplicate-guard intact |
| Missing frontend create/edit path for design costings (client has no create/update) | Low | Scope is Detail-page PATCH only (T3 adds `updateDesignCosting`) |

## Open Questions
- None blocking Shice A+B. (Follow-up C: budget-vs-actual + shipment variance + P&L per PI —
  needs its own BA pass.)

## Verification Checklist
- Every new/changed test failed first (RED) then passed (GREEN).
- Slice A: `.\venv\Scripts\python.exe -m pytest apps/merchandising/tests/test_design_costing_ladder.py -q` green.
- Slice B: `prepare` suite green; `pytest apps/merchandising -q` (owning app) green; adjacency hits green.
- Frontend: `npx tsc -b` exit 0, `npm run lint` 0 errors, `npx vitest run` full green.
- Docs updated; no migration breakage (single `0043`).