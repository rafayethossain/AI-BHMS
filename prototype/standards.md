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
color ONLY as reinforcement (always pair with the text label; never color alone). Pill classes live
as Tailwind utilities in one shared `StatusPill` component:
`bg-emerald-500/15 text-emerald-700` (green) · `bg-amber-500/15 text-amber-700` (amber) ·
`bg-red-500/15 text-red-700` (red) · `bg-slate-100 text-slate-600` (none).

Typography and spacing follow `uiux-guidelines.md` §1.2/§1.3 (Inter, `--text-*` scale, 0.25rem
spacing scale). Use heading levels h1 (one per page) → h2 (section) → h3 (subsection).

Dark theme: provide a `[data-theme="dark"]` token override; the Tabular grid chrome (headers,
borders, frozen columns, row hover) must re-theme via `theme/tabulator.css`, not ad-hoc classes.

## 2. Layout & navigation

- **App shell** (PT-005): left module rail (Design, Merchandising, Commercial, Procurement,
  Production, Quality, Logistics, Reports, Setup/Admin, Help), top bar (module heading, search, theme
  toggle, mock-session chip). Mirrors the target frontend's nav grouping (Design is a single top-level
  entry with the register + costings + fit specs under it).
- **Page chrome**: standard padded container + title (same as target pages). Every page = header
  (title + optional primary action) + content.
- Responsive: 320 / 768 / 1024 / 1440 breakpoints; grids fall back to stacked rows below 768.

## 3. The grid layer — `SpreadsheetGrid` (shared, mandatory)

One Tabulator 6 wrapper under `src/components/SpreadsheetGrid/`. Every tabular screen uses it; never
scaffold a bespoke table when a grid is intended. The wrapper must supply (mirrors the target
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
  > Exception (documented): the Style-detail **Sales Order** report uses a styled `<table>` because
  > one row carries a per-cell color matrix; that is the *report block*, not a grid screen.
- **Empty state**: "No <entity> yet" + primary action; **loading**: skeleton rows; **error**:
  retry state (mock layer never errors by default, but the components must not crash on it).
- **jsdom caution**: Tabulator module binding (`download`/`getModule`, drag, selection) is NOT
  real in jsdom — jsdom tests assert the wrapper contract (props, callbacks, rendered toolbar)
  + pure helpers; real-browser CDP confirms export/drag/print.

## 4. Micro-interaction kit (PT-007; expand only via decision note)

Standard, reusable pieces that reviewers notice — build them once, apply everywhere:

1. **Status flip** — inline status dropdown on grid/detail flips the pill optimistically with a
   brief highlight pulse; undo toast on failure.
2. **Success feedback** — after add/edit/delete, a toast (auto-dismiss, 3s) + subtle row flash.
3. **Hover preview** — on master rows (PO, Shipment) a small popover with the 3 key fields
   (useful in heavy lists).
4. **Search-as-you-type** — grid search filters live with a debounce (120ms) + result count.
5. **Column chooser** — toggle columns; persisted to the mock session.
6. **Add/Edit modals** — consistent modal with focus trap, Esc close, primary button disabled until
   required fields valid, optimistic submit.
7. **Print** — Print button uses `window.print()`; the report area gets `@media print` styling
   (hide nav, expand content). xlsx uses grid `download("xlsx")`.
8. **Toggleable panels** — detail pages' collapsible sections animate height (no heavy libs).
9. **Empty/loading/error** skeletons everywhere (skeleton pulse, not spinners, for content).

Each micro-interaction must remain keyboard-accessible and work in light+dark.

## 5. Accessibility (WCAG 2.1 AA)

- Every interactive element keyboard-operable; modals trap focus and return it on close.
- `aria-label`/`role` where text is icon-only; status conveyed by text + colour (never colour alone).
- Contrast: 4.5:1 normal text, 3:1 large/UI. Focus rings visible in both themes.
- Tab through any screen with no traps; announce modal opens.

## 6. Do NOTs

- No purple/indigo gradients, rounded-everything cards, lorem-ipsum copy, oversized generic
  padding, or stock card grids — this is a dense Excel-familiar B2B tool, not a consumer app.
- No new grid libraries; no bespoke tables for grid screens (exception above only).
- No `any` in new code; no comments that restate the code.