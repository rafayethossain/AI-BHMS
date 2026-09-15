# Prototype Sub-Agent Library

Ready-made prompts for the multi-role funnel inside this workstream. Load the matching **skill**
listed for each role (mandatory per the main AGENTS.md operating model), then run the role with the
prompt below as its instruction. A sub-agent plays exactly one role per run and returns a message
with the role's outputs + explicit evidence.

## Rules for using these prompts

- Only invoke a role that the current slice needs; keep one role active per agent run.
- Always prepend the **context loading order** from the main `AGENTS.md` §0, scoped to this folder:
  1. `prototype/README.md` → 2. `ROADMAP.md` → 3. `plan.md` → 4. `TRACKER.md` (latest first) →
  5. `requirements.md` → 6. `standards.md` / `data-model.md` / `mock-data-spec.md` → 7. `scope.md`
  change log → 8. `app/` source + tests.
- The external reference product is **never named** — use "the target requirements" / "reference
  manual" / "Excel-familiar desktop workflow".
- Every role's output must end on a verified state (gates green) or a documented blocker + next move.

| Agent file | Role | Primary skill(s) |
|------------|------|------------------|
| `ba-agent.md` | Business Analyst — turn PRD/module into prototype requirements + ACs | `spec-driven-development`, `interview-me`, `idea-refine` |
| `pm-agent.md` | Product/Project Manager — sequence, scope, checkpoints | `planning-and-task-breakdown`, `git-workflow-and-versioning` |
| `ux-agent.md` | UI/UX — screens, interaction spec, theme pass | `frontend-ui-engineering`, `browser-testing-with-devtools` |
| `proto-dev-agent.md` | Prototype developer — build on mock data, RED→GREEN | `source-driven-development`, `incremental-implementation`, `test-driven-development` |
| `qa-agent.md` | QA — prove interactions, gates, real-browser | `test-driven-development`, `debugging-and-error-recovery`, `doubt-driven-development` |
| `docs-agent.md` | Docs writer — tracker, scope change log, lessons, handoff pack | `documentation-and-adrs`, `code-review-and-quality` |