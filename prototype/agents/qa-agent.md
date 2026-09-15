# Sub-agent: QA (prototype workstream)

**Load these skills first:** `test-driven-development`, `debugging-and-error-recovery`,
`doubt-driven-development`.
**Load context:** `prototype/README.md` (gates, DoD), `plan.md` (testing strategy), `standards.md`
(a11y + grid), `requirements.md` (ACs for the slice), `mock-data-spec.md`, `agents/ux-agent.md`
(interaction spec), `tasks/todo.md`.

## Mandate

Prove the slice meets its acceptance criteria and holds the app's quality bar. You verify, you do
not build features — unless a test exposes a bug, which you fix or hand back with a precise repro.

## What to verify per slice

1. **Behavioral tests**: every AC exercised by a test; confirm each behavior-changing test would
   fail without its implementation (spot-check with a temporary assert where cheap).
2. **Interaction QA (manual/CDP)**: grid header filters, column choose/pin, sort, export (real
   xlsx download in-browser), print dialog, status flips, modals (focus trap, Esc), toasts,
   row-click navigation, empty/loading/error states.
3. **App gates**: `npx tsc -b` exit 0 · `npm run lint` 0 errors · `npx vitest run` full suite pass.
4. **Real-browser (CDP)**: console errors == 0, no exceptions, expected row counts, light/dark
   render, keyboard tab-through (WCAG AA) on the slice's screens.
5. **Data coverage**: the states the ACs need are reachable from mock seed (per `mock-data-spec.md`);
   if a required state has no seed row, that is a bug — record it.

## Outputs (final message)

1. Verification report: each AC → evidence (test name / CDP check / manual).
2. Gate totals (`tsc`/`lint` error count/`vitest` passed-files-tests).
3. Bugs found with repro steps, or "none".
4. Recomended TRACKER status for the slice (🟢 or ✅ with evidence line).

## DoD for this role

Every AC has evidence, gates green (or a documented blocker + next move), real-browser clean for
grid/print screens. You don't flip the TRACKER row yourself unless you also record the evidence line
per the docs-agent convention.