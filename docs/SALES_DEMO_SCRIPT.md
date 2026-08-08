# BHMS Sales Demo Script — Merchandiser Walkthrough

> **Phase 0.7** — a rehearsed, screen-by-screen demo for BD buying-house clients.
> Every screen below is a real route, backed by `seed_demo_data.py --demo-frozen-dates`.
> Total runtime ≈ 45–50 minutes. The Order Manager dashboard (Act 2) is the **anchor** of the demo.

---

## 0. Prerequisites & Setup (before the client arrives — 15 min)

```bash
# 1) Reset + seed with FROZEN dates so every number is stable and reproducible
cd backend
python manage.py flush --no-input
python manage.py migrate
python manage.py seed_setup --tenant default          # master data + roles (if not already done)
python manage.py seed_demo_data --tenant default --clear --demo-frozen-dates
python manage.py seed_role_users --clear              # demo users per role

# 2) Start servers
python manage.py runserver 127.0.0.1:8000             # backend
npm run dev                                           # frontend (http://localhost:5173)
```

- **Frozen dates**: all seeded dates are pinned to `2026-08-01` (`DEMO_FROZEN_BASE_DATE`). The demo
  shows the same numbers regardless of when it is run. Do **not** re-seed during the demo.
- **Browser hygiene**: open the demo in an Incognito/private window so it starts clean (no stale tokens).
- **Credentials** (email + password): `merchandiser@demo.com / Merch123!@#` (primary), `admin@demo.com / admin123!@#` (backup/admin talk).
- **Console check**: DevTools → Console must show **zero** errors before starting.

---

## 1. The 4 Embarrassment Risks — Closure Status

| # | Risk (would embarrass in front of a client) | Phase | Status |
|---|---|---|---|
| 1 | **Cross-tenant leakage** — a wrong tenant's orders/buyers visible | 0.1 | ✅ Closed: tenant isolation is fail-closed; invalid/missing `X-Tenant-ID` → 400/403; missing-tenant querysets return `.none()`; cross-tenant 403 tests green |
| 2 | **Dead / empty UI** — nav links to retired modules (FabricInventory, ReportSchedule, Alert, executive dashboard) | 0.3 + 0.6 | ✅ Closed: dead routes, pages, nav entries and `getSummary` removed; `/dashboard/summary/` is the single KPI source |
| 3 | **Stale / hardcoded demo dates** — LC expiry stuck in 2025, delivery dates that expire, hardcoded `localhost:5173` redirect | 0.4 | ✅ Closed: all seeded dates relative; `--demo-frozen-dates` pins them; `/` redirects to `settings.FRONTEND_URL` |
| 4 | **Non-BD localization** — USD default, "Chittagong", Sri Lanka costing sheet, Deutsche Bank | 0.5 | ✅ Closed: currency default `BDT`, "Chattogram", costing `sheet_type` default `bd`, Sonali Bank as LC-issuing bank |

> DoD gate behind all of this: **1281 tests green** (focused + full suite), `makemigrations --check` clean, ruff clean, `tsc` + `vite build` pass.

---

## 2. The Walkthrough (≈ 45 min)

### Act 0 — Landing & Login (2 min)
1. Open `http://localhost:5173` → you are redirected correctly (never a hardcoded address).
2. Log in as `merchandiser@demo.com / Merch123!@#`.
3. **Say**: "This is a single system for a buying house — one login, every department in one place."

### Act 1 — Dashboard: the Money Story (5 min) — `/dashboard`
- KPI row (Total orders, open, delivered) + **risk/alert banners** (danger → watch → info).
- **Say**: "Top of screen = where the money and the risk live. Everything below is clickable drill-down."
- Click one alert → lands in the right module (proof the alert is live data, not a static card).

### Act 2 — Order Manager: "Where Is My Business at Risk?" (7 min) — `/order-manager`
- Summary cards: Total Orders · Open · Delivered · **At Risk** · **Watch** · **On Track** · **Pending Debits** · **Overdue Jobs**.
- **Say**: "This is the screen a merchandiser opens every morning."
- Use the **risk filter** (At Risk / Watch / On Track) and the buyer + status filters.
- Open `PO-DEMO-01` (open, delivery already overdue, has a pending pattern job `JOB-DEMO-01`) vs `PO-DEMO-02` (delivered, clean).
- **Say**: "Two orders, same tenant, opposite stories — the system tells you which one needs you today."

### Act 3 — Purchase Order Lifecycle (6 min) — `/purchase-orders`, `/purchase-orders/:id/trail`
- List `PO-2025-0001 … PO-2025-0008` with buyer, factory, BDT value, status (draft → open → confirmed → in_production → ready).
- Open a PO detail → **Order Trail** tab (`/purchase-orders/:id/trail`).
- **Say**: "Every change is captured — who, when, what. No more WhatsApp history hunting."
- On the PO detail, show the amendment `AMD-1001` (delivery pushed +90 days, "Customer requested delivery push").
- **Say**: "Amendments are tracked against the order, not lost in email."

### Act 4 — BOM & Costing (5 min) — `/boms`, `/costings`
- BOM detail: trim items with supplier + price + scheduled/required dates.
- Costing detail: **BDT**, sheet type **BD**, currency conversions.
- **Say**: "Costed the way a BD buying house costs — BDT default, BD sheet format."
- Show the fabric/trim tolerance rules if time allows (fabric app, Act 7).

### Act 5 — Technical & Time & Action (4 min) — `/tas`, `/tas/calendar`, `/tas/heatmap`
- T&A list → **Calendar** view (upcoming dates) → **Heatmap** (overdue clusters).
- **Say**: "Every milestone of every order on one calendar. Red = already overdue."

### Act 6 — Commercial: LC & Documents (7 min) — `/lcs`, `/pis`, `/scs`, `/sales-confirmations`, `/debit-notes`, `/invoice-approvals`
- **LC list**: `LC-2025-001 … LC-2025-005` issued by **Sonali Bank Ltd** (SONABDDH) and Pubali — issued/expiry relative to the frozen base date.
- Open an LC → amendments (amount/expiry/quantity) with reasons.
- **Say**: "Eight-state LC lifecycle, amendments versioned — and the bank is a real BD bank."
- PI → Sales Contract → Sales Confirmation flow (numbers: `PI-2025-…`, `SC-2025-…`, `SCF-2025-…`).
- **Invoice Approvals**: matching invoice (`IA-2025-001` match), mismatch (`IA-2025-002`, reason "price"), over-tolerance (`IA-2025-003` linked to debit `DN-2025-001`), approved/signed off (`IA-2025-004`).
- **Say**: "5%/2% tolerance rules, over-tolerance >20-unit debit rule — applied automatically."

### Act 7 — Fabric (4 min) — `/fabric/orders`, `/fabric/utilizations`, `/fabric/dockets`
- Fabric orders, HTS codes, tolerances, utilization, dockets.
- **Say**: "Fabric is where margins are won or lost — it's tracked here, order by order."

### Act 8 — Logistics (6 min) — `/logistics`, `/logistics/dashboard`, `/logistics/booking-schedule`, `/logistics/reconciliations`
- Shipment list → **Shipment Dashboard** (ETA / status).
- **Booking Schedule**: per-week booking vs capacity.
- **Final Hit Reconciliation** and >200m final-docket sales flag.
- **Say**: "From order to port to container — POD for BD is Chattogram."

### Act 9 — Quality & Compliance (4 min) — `/quality`, `/quality/dashboard`, `/quality/gold-seals`, `/quality/compliance-audits`
- Inspections, corrective actions, gold seals (sent dates shown), compliance audits.
- **Say**: "BSCI / WRAP / SCS audits tracked with the supplier evidence."

### Act 10 — Production (4 min) — `/production`, `/production/dashboard`, `/production/portal`, `/production/daily`
- Production plans, **Factory Portal** (self-serve for the factory), daily reports.

### Act 11 — Reports & Help (2 min) — `/reports`, `/help`
- Reports dashboard + builder; Help page with guided tours + glossary.
- **Say**: "Training is built in — guided tours and a glossary, no manual needed."

### Act 12 — Admin close (2 min) — `/admin/health`, `/admin/audit-logs`
- Health page (live) + audit logs.
- **Say**: "Every action is logged — you can always answer 'who changed it and when'."

---

## 3. Talking Points Bank (BD Buying-House Lens)

- **BDT-first**: currency default BDT, costings in BDT, `bd` sheet type.
- **Chattogram port** as POD; factories incl. Mahmud Group (Chattogram), Ha-Meem, Square, Epyllion.
- **BD banks**: Sonali Bank (SONABDDH) and Pubali as LC-issuing banks.
- **Compliance**: BSCI / WRAP / SCS audit tracking.
- **LC-heavy payment**: 8-state LC lifecycle + versioned amendments.
- **Tolerance rules**: 5%/2% (Primark/Penney's), over-tolerance >20-unit debit rule, >200m final-docket sales flag.
- **The money story**: Order Manager dashboard = "where is my business at risk" — lead with it.

---

## 4. Failure-Mode Notes (if something goes wrong)

| Symptom | Action |
|---|---|
| Login fails | Use **email** (not username); clear localStorage / use Incognito; check backend on `:8000` and vite proxy on `:5173`. |
| Numbers look off | You re-seeded during the demo — stop; restart Act 0 from the frozen seed. |
| Page shows spinner forever | DevTools → Console/Network; confirm backend running; a refresh usually clears it. |
| Empty module list | Confirm you seeded with `--clear --demo-frozen-dates` for the **same** tenant slug. |
| Console errors | Fix before the demo — the walkthrough is rehearsed against **zero** console errors. |

---

## 5. Post-Demo

1. Log out (clears tokens).
2. Close the Incognito window.
3. Stop servers (`Ctrl+C` on both). The SQLite DB retains the frozen snapshot for re-runs.

---

## 6. Rehearsal Gate

- [ ] Frozen seed ran clean with **zero** errors.
- [ ] Full walkthrough executed with **zero** console errors.
- [ ] Both demo accounts (`merchandiser`, `admin`) log in.
- [ ] Order Manager, PO trail, LC + amendment, invoice approval + debit, shipment dashboard all rendered from live data.
- [ ] Timing kept under ~50 min.
