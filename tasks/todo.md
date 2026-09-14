# Todo — Design Costing per Piece → PO Costing (Slices A + B)

GATE_PLAN: GATE_A (targeted → owning-app `apps/merchandising` → adjacency grep). Commands:
- backend (venv): `.\venv\Scripts\python.exe -m pytest <file> -q` · `... -m pytest apps\merchandising -q`
- frontend: `npx tsc -b` · `npm run lint` · `npx vitest run`

## Slice A — Per-piece price ladder
- [ ] T1 RED: `backend/apps/merchandising/tests/test_design_costing_ladder.py` — model ladder properties + serializer persistence/validation (fail first)
- [ ] T2 GREEN: `DesignCosting` fields + derived properties + `margin_percent` fallback (models.py:786) + `DesignCostingSerializer` (serializers.py:674) + `migrations/0043_designcosting_ladder.py`
- [ ] T3 frontend: `client.ts` extend `DesignCosting` + add `updateDesignCosting`; `DesignCostingDetailPage.tsx` ladder block; new `__tests__/DesignCostingDetailPage.test.tsx` (RED first)
- [ ] CHECKPOINT A: targeted + owning-app backend green; `tsc -b`/lint/vitest green

## Slice B — PO costing totals from design
- [ ] T4 RED: extend `backend/apps/merchandising/tests/test_design_costing_prepare.py` — ladder carry + po_quantity/po totals snapshot
- [ ] T5 GREEN: `Costing` fields (models.py:657) + `prepare_po_costing` copy (views.py:3108) + `CostingSerializer` (serializers.py:571); same migration 0043
- [ ] CHECKPOINT B: owning-app `pytest apps\merchandising -q` + adjacency grep on `design-costings`/`costings` in backend/tests green; frontend gates green

## Docs / completion
- [ ] T6: `TDD_TRACKER.md` (gate evidence + RED→GREEN), `master-backlog.md` Addendum (RQ-013/RQ-014), `lessons-learned.md` entry

## Follow-up (not in this pass)
- Slice C: budget-vs-actual, shipment variance, profit/loss by PI reference ("Delivered" variant).