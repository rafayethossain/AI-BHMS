# Prototype UI/UX + Tabulator + Grid Standards

> The single design authority for the prototype. Derived from `uiux-guidelines.md`, the target
> frontend's component patterns, and Tabulator 6 behaviour. Everything in `app/` follows this —
> deviations need a decision note in `scope.md`.

## 1. Design tokens (theme/tokens.css)

Copy the canonical palette from `uiux-guidelines.md` §1.1 (primary blue `#3b82f6` scale, neutral
slate scale, semantic success/warning/error/info) PLUS the status palette:

| Token | Value | Used for |
|-------|-------|----------|
| `--success` / green | `#22c55e` | completed, delivered, confirmed, within tolerance |
| `--warning` / amber | `#f59e0b` | in-progress, partial, amber risk |
| `--error` / red | `#ef4444` | cancelled, overdue, rejected, red risk |
| `--info` / blue | `#3b82f6` | open, draft-highlight, links |
| `--status-on-hold` / slate | `#64748b` | none / no status / TBC |
| `--status-open` | `#3b82f6` | open/draft areas |

**Risk = semantic:** risk payloads carry `{code, label, color, numeric}` — render risk with the
color ONLY as reinforcement (always pair with the text label; never color alone). Pills use ONE
shared `StatusPill` component (§4) and **must use only `@theme`-covered shades** (the 300/400/500/600
scale in `tokens.css`) so the class re-themes in dark mode automatically — never a raw Tailwind shade
absent from `tokens.css` (e.g. `emerald-700` stayed static and lost contrast in dark). Canonical pill
classes: `bg-emerald-500/15 text-emerald-600` (green) · `bg-amber-400/15 text-amber-600` (amber) ·
`bg-red-300/15 text-red-400` (red) · `bg-slate-100 text-muted dark:bg-slate-800` (none/fallback).

Typography and spacing follow `uiux-guidelines.md` §1.2/§1.3 (Inter, `--text-*` scale, 0.25rem
spacing scale). Use heading levels h1 (one per page) → h2 (section) → h3 (subsection).

Dark theme: provide a `[data-theme="dark"]` token override; the Tabular grid chrome (headers,
borders, frozen columns, row hover) must re-theme via `components/SpreadsheetGrid.theme.css`, not
ad-hoc classes.

## 2. Layout & navigation

- **App shell** (PT-005): left module rail (Design, Merchandising, Commercial, Procurement,
  Production, Quality, Logistics, Reports, Setup/Admin, Help), top bar (module heading, search, theme
  toggle, mock-session chip). Mirrors the target frontend's nav grouping (Design is a single top-level
  entry with the register + costings + fit specs under it).
- **Page chrome**: standard container + title (same as target pages). Every page = header (title +
  optional primary action) + content. The page container carries `data-testid="page-container"` so the
  shell contract is assertable in jsdom (which cannot measure width).
- **Page container width (responsive)** — a fixed `max-w-*` cap that is **left-anchored** leaves dead
  white space on the right on displays wider than the cap (the Design-Register defect):
  - **Data / list / grid pages** (registers, list+detail, report screens) are **fluid full width**:
    `w-full p-4 sm:p-6`. **Never** cap a tabular page with `max-w-*`; wide grids scroll horizontally and
    must not be squeezed or capped.
  - **Non-tabular summary / content pages** (e.g. the Dashboard card grid, print sheets) MAY cap to a
    reading width, but must **centre** it (`mx-auto`) so the leftover space is symmetric — never
    left-anchored.
  - **Gutters scale**: `p-4` up to the `sm:` breakpoint, `p-6` at `sm:` and above — never one fixed
    large gutter.
- Responsive: 320 / 768 / 1024 / 1440 breakpoints; grids fall back to stacked rows below 768; a
  full-height list grid sizes to the viewport (`height="max(320px, calc(100vh - 320px))"`) instead of a
  fixed pixel height, so it uses the available space without overflowing short screens.

## 3. The grid layer — `SpreadsheetGrid` (shared, mandatory)

One Tabulator wrapper at `src/components/SpreadsheetGrid.tsx` (+ `SpreadsheetGrid.theme.css`). Every
tabular screen uses it; never scaffold a bespoke table when a grid is intended. The wrapper must supply (mirrors the target
wrapper — copy and adapt its chrome):

- **Toolbar**: title + search + column picker + pinned-column toggle + export (xlsx) + pagination
  (page size = 10/25/50/All) + a "Refresh" mock-replays action.
- **Header filters**: per-column text/select filters (select options derived from column values).
- **Sorting** on every column; **pinning** (first column); **frozen** Actions column on the right.
- **Action column**: Open (view detail), Edit, Copy/Repeat (where the target has it), Status/Set
  current (where relevant), Delete (with confirm). Action icons + labels per target patterns.
- **Row behaviour**: `rowClick` → navigate to detail; double click edits where the target allows.
- **Status/risk cells**: rendered via `StatusPill` formatter (color + label). Colored cells are
  achieved through Tabulator column **formatters returning cell CSS** (this is why flat
  `SpreadsheetGrid` columns work for single-cell status; do NOT hand-roll a plain `<table>` for
  grid screens).
  > **Authorised exception (PT-010 decision):** read-only **report blocks** — the design detail
  > page tabs (Overview, Sketches, Versions, File Openings, POs, Items, BOM, Design Images, Tech
  > Packs) and the **Sales Order report** (per-PO Fabric/Trims/Production/Delivery/Overall color
  > matrix) use the styled semantic `ReportTable` component. Rationale: a report row carries
  > per-cell data/model matrices; jsdom cannot assert Tabulator rows; the grid stays mandatory for
  > interactive *list screens* (register, list+detail pages).
- **Empty state**: "No <entity> yet" + primary action; **loading**: skeleton rows; **error**:
  retry state (mock layer never errors by default, but the components must not crash on it).
- **jsdom caution**: Tabulator module binding (`download`/`getModule`, drag, selection) is NOT
  real in jsdom — jsdom tests assert the wrapper contract (props, callbacks, rendered toolbar)
  + pure helpers; real-browser CDP confirms export/drag/print.

## 4. Micro-interaction kit (governed; expand via decision note)

Standard, reusable pieces that reviewers notice — build them once, apply everywhere. Ships as shared
components/hooks in `src/components/` with their own suites; any new screen consumes these, never a
bespoke re-build (that would duplicate logic):

1. **`StatusPill`** — the single status/risk pill (token-covered shades, §1). Optional `pulse` for
   optimistic flips, label = `risk.label` or value with `_`→space, `value.toLowerCase()` picks the map.
2. **`useOptimistic` hook** — optimistic local row updates with rollback: apply the patch immediately,
   run the server call, keep on success / revert the row + rethrow on failure (caller shows a toast).
3. **`HoverPreview`** — small popover over a row/card with 3–4 key fields on hover **and** keyboard
   focus (a11y): `fields: {label, value}[]` + optional `title`.
4. **Success feedback** — after add/edit/delete, a toast (auto-dismiss, 3s) + subtle row flash.
5. **Search-as-you-type** — grid search filters live with a debounce (120ms) + result count.
6. **Column chooser** — toggle columns; persisted to the mock session.
7. **Add/Edit modals** — `Modal` contract per §5; primary button disabled until required fields
   valid (`canSubmit`), optimistic submit.
8. **Print** — Print button uses `window.print()`; the report area gets `@media print` styling
   (hide nav, expand content). xlsx uses grid `download("xlsx")`.
9. **Toggleable panels** — detail pages' collapsible sections animate height (no heavy libs).
10. **Empty/loading/error** skeletons everywhere (skeleton pulse, not spinners, for content).

Each micro-interaction must remain keyboard-accessible and work in light+dark.

---

## 5. Modal contract (`components/Modal.tsx`)

ONE shared `Modal` — focus trap (Tab loop), Esc close, backdrop-click close, header (title + ✕
`aria-label="Close dialog"`), optional right-aligned footer. Two props tune every layout:

- **`maxWidthClass`** — dialog width (`max-w-lg` default). Data-entry modals widen:
  `max-w-2xl` (full Design Information), `max-w-3xl` (read-heavy view/detail), `max-w-4xl`
  (form + child data editor). Tune ONLY this prop; never add inline widths to children.
- **`contentClassName`** — applied to the `p-4` body div. When content may exceed the viewport,
  pass `max-h-[75vh] overflow-y-auto pr-1` so the dialog NEVER spans past the screen with
  header/footer lost (this is the "modal overlaps the resolution" fix).

## 6. Form & master-data select conventions

- **Sectioning**: split long forms with `<h3>` section headers + `<hr className="border-border-subtle">`
  dividers (e.g. New Design: `Design Code` → `Design Information` → `Description`/`Design Notes`
  → `Sketch` → `Materials Breakdown`). One header per group.
- **Compact field grid**: short fields sit in `grid grid-cols-1 sm:grid-cols-2 gap-3` (label above
  input, `text-xs`); two textareas pair side-by-side under one section.
- **Master-data selects**: any field backed by master data (Style Type, Category, Buyer, Issuer,
  Status) is a `<select>` — NEVER free text. Options derive from the seed/loaded masters; the first
  option is a placeholder `<option value="">Select …</option>` and `canSubmit` requires a real value.
- **Labels**: visible `<label>` whose text equals the test selector (`getByLabelText`). Field order
  follows the domain sheet, not alphabetical.

## 7. In-modal data editor grid (materials-breakdown pattern)

When a modal edits a list of child rows (materials / items / trims), render them as a **bordered
table grid**, never stacked cards:

- Wrapper: `border border-input-border rounded-lg overflow-auto max-h-[300px] min-h-[180px]` +
  `data-testid="…-scroll"`.
- Sticky header: `<thead className="sticky top-0 bg-surface-alt z-10">`; row `data-testid` per row.
- Cell inputs: `w-full min-w-[110px] bg-transparent px-1.5 py-1 text-xs text-heading
  focus:bg-surface focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded` (borderless,
  grid-like cells).
- Per-row remove: icon button `✕` with `aria-label="Remove …"`; an "Add …" primary button appends an
  empty row; rows live in local state and persist on save.

## 8. Scroll & minimum-height rules

- **Both-axis scroll**: data/list containers use `overflow-auto` (never only `overflow-x-auto`) so
  wide AND tall grids both scroll within a fixed box.
- **Height cap**: `max-h` ~`300px` so dense grids never push the dialog off-screen (pair with the
  modal `max-h-[75vh]` rule, §5).
- **Minimum height**: `min-h-[180px]` on data-entry/list boxes so a 1–2 row table still reads as a
  defined input area (better visual + easier targeting).

## 9. Test conventions (prototype suite)

- Modals/form selects: `user.selectOptions(within(dialog).getByLabelText('Field'), value)` —
  `user.type` is a no-op on `<select>`.
- Repeated cell values (e.g. `BLACK` in two material rows): `getAllByText`; `getByText`/`findByText`
  throw on multiple matches.
- Heavy modals raise per-file time: global `testTimeout: 15000` in `vite.config.ts` (the 5s default
  flakes once edit forms render six child rows under full-suite load).
- jsdom cannot compute layout: `getBoundingClientRect()` returns 0 — assert structure (testids +
  className), never pixels.
- `<datalist>` `<option>` trips `jsx-a11y/control-has-associated-label`: suppress that line with
  `// oxlint-disable-next-line jsx-a11y/control-has-associated-label`.
- Lint baseline: 0 errors / 19 warnings; do not chase the warnings.

## 10. Accessibility (WCAG 2.1 AA)

- Every interactive element keyboard-operable; modals trap focus and return it on close.
- `aria-label`/`role` where text is icon-only; status conveyed by text + colour (never colour alone).
- Contrast: 4.5:1 normal text, 3:1 large/UI. Focus rings visible in both themes.
- Tab through any screen with no traps; announce modal opens.

## 11. Do NOTs

- No purple/indigo gradients, rounded-everything cards, lorem-ipsum copy, oversized generic
  padding, or stock card grids — this is a dense Excel-familiar B2B tool, not a consumer app.
- No new grid libraries; no bespoke tables for grid screens (exception above only).
- No `any` in new code; no comments that restate the code.