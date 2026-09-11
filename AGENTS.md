# AGENTS.md — BHMS Orchestrator (Workflow Guide)

> **Role:** The single entry-point workflow guide for any agent (human or AI) working on BHMS.
> This file **orchestrates** the multi-role funnel — Business Analyst (BA), Product/Project Manager
> (PM), UI/UX, Dev, Tester, Docs Writer — and routes each discipline to the matching global skill.
> It is the top of the document map (see `master-backlog.md` → "Document Map").
>
> **North star:** Ship improvements to the buying-house product using the authoritative inputs
> (`PRD.md`, `REPLICATION_ROADMAP.md`, and the other domain docs listed below) — **without ever
> breaking the strict TDD (RED → GREEN → verify) approach.**

---

## 0. Read Me First (session startup sequence)

Before ANY task, load context in this order:

1. **This file** — workflow, roles, gates, DoD.
2. `REPLICATION_ROADMAP.md` — the primary execution plan (Workstream A grid layer, Workstream B domain
   gap-closure, slices A1–A6 / B1–B10, Definition of Done).
3. `PRD.md` — what the product must do (source of requirements truth).
4. `TDD_TRACKER.md` — current task-completion progress (status per slice; the live scoreboard; read the
   **latest entries first** — recent work sets the conventions for this session).
5. `master-backlog.md` — the consolidated backlog (`RQ-###` requirements, US story backlog) and its
   cross-references; find the next requirement / task.
6. Domain references as needed: `business-rules.md`, `data-model.md`, `api-design.md`,
   `security-model.md`, `glossary.md`, `uiux-guidelines.md`, `workflow-diagrams.md`, `module-specs.md`,
   `GAP_ANALYSIS.md` / `REQUIREMENTS_GAP_ANALYSIS.md` / `analysis/` (feature catalog & gap docs).
7. **Historical lessons** — read `lessons-learned.md` (retrospectives) BEFORE starting so past mistakes
   are not repeated. If the file does not exist yet, create it (see §6).
8. Only then: the referenced source code + its tests.

> The external reference product is **never named by its proper name** anywhere (docs, code, commits).
> Refer to it only as **"the target requirements"** / **"the reference manual"** / **"Excel-familiar
> desktop workflow."**

---

## 1. Operating Model — the Orchestrated Funnel

Every improvement moves through the roles below. Each role has a **mandate**, a **primary global
skill**, and **explicit outputs**. The agent playing the orchestrator decides which role(s) are
relevant to the current task and drives work through them *in dependency order* — always connecting the
dots **forward** (this decision enables what later?) and **backward** (what earlier decision/enabled
this?).



| # | Role | Mandate | Primary global skill(s) to load | Outputs |
|---|------|---------|--------------------------------|---------|
| 1 | **Business Analyst (BA)** | Turn gaps in the reference roadmap into precise, traceable requirements. | `spec-driven-development`, `api-and-interface-design`, `interview-me`, `idea-refine` | Requirement/user-story with acceptance criteria; `RQ-###` mapping; impact assessment |
| 2 | **Product / Project Manager (PM)** | Prioritise, sequence, estimate scope, plan parallel work. | `planning-and-task-breakdown`, `git-workflow-and-versioning`, `ci-cd-and-automation`, `shipping-and-launch` | Ordered task breakdown; roadmap/backlog updates; release readiness |
| 3 | **UI/UX** | Design accessible, responsive, Excel-familiar interfaces and interactions. | `frontend-ui-engineering`, `browser-testing-with-devtools` | Component/page; interaction spec; theme/contrast pass (light+dark) |
| 4 | **Dev** | Implement with source-grounded, idiomatic code; small incremental steps. | `source-driven-development`, `incremental-implementation`, `code-simplification`, `performance-optimization`, `security-and-hardening` | Code in RED→GREEN increments; no breaking changes |
| 5 | **Tester** | Prove behavior; maintain a green, meaningful suite. | `test-driven-development`,  `debugging-and-error-recovery`, `doubt-driven-development` | Failing-first test; full-suite green evidence; regression proof |
| 6 | **Docs Writer** | Record decisions, lessons, progress; keep the roadmap/tracker current. | `documentation-and-adrs`, `code-review-and-quality`, `deprecation-and-migration` | Updated `TDD_TRACKER.md`, `master-backlog.md`, `lessons-learned.md`, ADRs |

**Skill Activation — enable skills by role & phase (MANDATORY):** 


opencode ships **engineering workflow skills** installed globally at
`C:\Users\This PC\.config\opencode\skills\`. They are **workflows, not suggestions** — each encodes a
process a senior engineer follows, with an explicit verification step. A skill is **enabled by loading it
with the `skill` tool** available to this agent; it is NOT auto-applied. **Every agent MUST load a matching
skill before/during a task** (see `using-agent-skills`). Doing the *work* of a skill without loading it is
a process violation — it skips the skill's guardrails and verification.



---

## 2. Priority & Impact Analysis (connect the dots forward AND backward)

Before implementing anything, the orchestrator (with PM + BA) must answer:

**Backward (why this / what enables it):**
- Which `RQ-###` requirement /
- Which business rule (`business-rules.md`) and data-model entity (`data-model.md`) does it touch?
- Which existing screen/component/endpoint/test does it depend on or modify?
- What prior decision (ADRs, `lessons-learned.md`, past migrations) constrains it?

**Forward (what does this unlock / risk):**
- Which later slices depend on this one (e.g., A3 rollouts depend on A1 grid chrome)?
- What breaks if this is wrong (dependent screens, exports, RBAC, tenants, audits)?
- What is the blast radius of the change (shared `SpreadsheetGrid` vs one screen)?

**Triage output** — record a short impact note before coding:
- `PRIORITY` (P0/P1/P2) and `TIER` (from roadmap).
- `BLAST_RADIUS` (shared vs isolated).
- `TRACE` = the forward+backward path (Requirement → Slice → Task → Test → evidence).
- `GATE_PLAN` = which verify commands apply (frontend, backend, or both).


---

## 3. Non-Negotiable: Strict TDD (RED → GREEN → verify)

This is the system's guardrail and may **never** be broken. Every behavioral change ships through this
loop, going through the **Tester** and **Dev** roles together.

1. **RED** — write a test that expresses the desired behavior and watch it fail first. The failure is
   the evidence the behavior is not yet there. No implementation without a failing test.
2. **GREEN** — write the smallest implementation that makes the test pass, using the Dev + source
   skills. Do not over-build.
3. **VERIFY** — run the *real* project commands for the touched area per the **Scoped gate (GATE_A)**
   below; record the gate used. Full regression (GATE_B) is a milestone/release gate, not a per-task
   cost.

**Test environment caveats (trust but verify in the real browser):**
- jsdom **cannot** reproduce Tabulator module binding (`download` / `getModule` are `undefined` in
  jsdom even on `TabulatorFull`). jsdom failures there are an environment limitation, **not** proof of
  an app bug — supplement with a real-browser check (CDP / devtools MCP) for browser-dependent UI.
- Pure logic / data-transform helpers should be unit-tested in jsdom with a mocked Tabulator.

### Test gates: scoped per task, full regression only at milestones (the project's real gates)

Testing is gated in **two tiers**. A task is **VERIFIED** when the **Scoped gate** passes; the **Full
gate** is a release/milestone gate, NOT a per-task cost (the full backend suite is ~1746 tests / ~35 min
— running it on every isolated change burns time without catching anything the scoped gate misses).

**GATE_A / Scoped gate (default for every task)** — run only the impacted scope:

1. **Targeted** — the new/changed test file(s), RED→GREEN.
   ```
   # frontend (workdir: frontend)
   npx tsc -b        # must exit 0
   npm run lint      # oxlint — 0 errors (baseline warnings are pre-existing; do not chase them)
   npx vitest run    # full frontend suite (~2-3 min) — frontend is fast, always run it fully
   # backend (workdir: backend, using its venv)
   .\venv\Scripts\python.exe -m pytest <file(s)> -q
   ```
2. **Owning app** — the whole app that owns the changed model/endpoint/page (e.g. `apps\merchandising`,
   `apps\logistics`, `apps\quality`), to prove the change didn't break sibling views in the same app:
   ```
   .\venv\Scripts\python.exe -m pytest apps\<app> -q
   ```
3. **Cross-app adjacency** — find tests OUTSIDE the owning app that call the changed endpoints/models
   and run them. Discover via grep, then run the hits:
   ```
   rg -l "merchandising/styles/" backend/tests backend/apps --type py   # example for Style
   .\venv\Scripts\python.exe -m pytest <adjacency files> -q
   ```
   A change with **BLAST_RADIUS = isolated** (additive nullable model fields, private component) still
   needs steps 1–2; steps 3 only where the grep returns hits. A change touching a **shared** layer
   (`SpreadsheetGrid`, `client.ts` types, base serializers/viewsets) expands the adjacency search to
   every consumer and, if it spans apps, escalates to **GATE_B**.

**GATE_B / Full gate (milestone, release, or shared-blast-radius change)**
- Full backend suite, run detached/background so the session isn't blocked:
  ```
  .\venv\Scripts\python.exe -m pytest -q
  ```
- Evaluate against the **known env-failure allowlist** (pre-existing, NOT regressions — do not "fix"
  these): monitoring `health/run_checks/` 404 (route gap) / missing sample fixtures
  (`PDF Extract\Sample style doc.pdf`, `Extracted_2026-07-13 .xlsx`) / hard-coded not-sold date window /
  e2e lifecycle sharing the monitoring 404 / frontend `GuidedTour.test.tsx` `localStorage.clear is not a
  function` (jsdom env). A gate passes if **every failure is on this allowlist and the green count grew
  or stayed flat** vs. the last recorded baseline in TDD_TRACKER.

**GATE_PLAN (from §2 triage)** must record WHICH tier applies before coding; default to GATE_A and
escalate only when §2 analysis shows shared blast radius or multi-app reach.

**Time budget for thin air (what each gate typically costs):** targeted ~1–3 min · owning app ~2–7 min ·
frontend full suite ~2–3 min · GATE_B ~35 min. If a task starts exceeding ~10 min of back-end test time
on a scoped change, stop and re-check the scope rather than letting the suite balloon.

---

## 4. Traceability (the dotted line that must not break)

Every deliverable maps 1:1 through this chain:

```
PRD / business-rules / data-model
        │  (BA requirement, RQ-###)
        ▼
REPLICATION_ROADMAP (slice A1–A6 / B1–B10)
        │  (PM sequence + priority)
        ▼
master-backlog (task)  ──►  TDD_TRACKER (slice status row)
        │
        ▼
Test (RED) ──► Code (GREEN) ──► Verify (real commands green)
        │
        ▼
lessons-learned.md  +  ADRs (record what was learned/decided)
```

Guardrails on traceability:
- No work ships without a **failing-first test** and the target `RQ-###` + business rule cited.
- No conflicting rule; ERD/model fields aligned; migration present where schema changes.
- RBAC + tenant isolation respected on every data endpoint; audit/notes behaviour applied where
  relevant; export/print + light/dark theme verified where UI.
- **Connect forward and backward** at each step: when you finish a slice, update the downstream
  scoreboard (TDD_TRACKER) and check whether an upstream doc (roadmap/PRD) needs refinement.

---

## 5. Progress & Task-Completion Updates

After any slice or task completes or its status changes, the **Docs Writer** role **must** update:

1. `TDD_TRACKER.md` — flip the slice status row (`⬜` → `🔴` → `🟢` → `✅ VERIFIED`) with test evidence.
   Note: a slice is `✅ VERIFIED` only when the **Scoped gate (GATE_A)** passes and traceability is
   cited; record WHICH gate was used. If the task escalated to **GATE_B**, cite the full-suite count and
   the allowlist check.
2. `master-backlog.md` — mark the task/`RQ-###` status; keep "Current Open Work" current.
3. `lessons-learned.md` — append a dated retrospective entry (see §6).

- Keep **exactly one** idea of "in progress" at a time; do not batch status flips that haven't been
  verified.
- If a step stalls (tests red, blocker, partial), leave it in-progress and record the blocker + a
  concrete next-move in the tracker rather than marking it done.

---

## 6. Lessons & Decisions Registry

Maintain `lessons-learned.md` at the repository root (create it if absent). Each entry is short and
dated. Include: what happened / what went wrong or well / what to do differently / linked slice or
requirement. Use `documentation-and-adrs` for architectural decisions that need an ADR (these go in
`docs/` or a dedicated ADR folder, and are **cited** in the tracker).

> Do not duplicate lessons already recorded; read `lessons-learned.md` at session start so work is not
> repeated or regressed.

---

## 7. Definition of Done (from REPLICATION_ROADMAP §6)

A task is **done** when *all* of the following hold — omit none:
- [ ] Behavior covered by a test that **failed first** (RED→GREEN verified).
- [ ] **Scoped gate (GATE_A) green** with the real commands — frontend `tsc -b` / `lint` / `vitest`;
      backend targeted + owning-app + documented adjacency `pytest`. GATE_B only where §2/§3 escalation
      requires it, with the full-suite count + allowlist cited.
- [ ] Target requirement + business rule cited; no conflicting rule.
- [ ] ERD/model fields aligned; migration present where schema changes.
- [ ] RBAC + tenant isolation respected on every data endpoint.
- [ ] Audit / notes behaviour applied where relevant.
- [ ] Export/print + light/dark theme verified where UI.
- [ ] No TODOs left in scope; no duplicated logic.
- [ ] Lessons/decision recorded; roadmap + tracker updated.

---

## 8. Guardrails

- **Never break TDD:** no Red-only or implementation-without-test; always end on a verified state.
- **No product name** of the external reference product in any doc, code, or commit. Instead use
  "target requirements" / "reference manual" / "Excel-familiar desktop workflow."
- **Neutral, English-only terminology** in docs and code.
- **Don't add libraries** unless strictly required and justified in an ADR/impact note.
- **Scope discipline:** keep one task focused; connect dots forward/backward but don't expand scope
  silently — escalate via a decision note.
- **Match repo conventions** and the existing component patterns (e.g., the reusable
  `SpreadsheetGrid` wrapper is the shared grid layer; prefer migrating to it over adding bespoke grids).
- **Commit discipline:** only commit when asked; stage only intended files; never commit secrets.
