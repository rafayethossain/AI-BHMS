# BHMS User Journey & Experience Improvement Plan

> **Goal:** Transform BHMS from a collection of isolated modules into a connected, guided, visual system where users always know where they are, what happened before, and what comes next.
>
> **Principle:** All existing functionality stays intact. We ADD, not REPLACE.

---

## Phase 1: Order Journey Tracker (Core Experience)

**Why:** The #1 UX gap — users have no visual map of where an order sits in the lifecycle. They must mentally stitch together Style → FO → PO → Production → Shipment across 5+ pages.

### 1.1 Order Journey Component (Reusable)
A horizontal progress stepper component that shows the full lifecycle:

```
Style → File Opening → PO → BOM → Costing → T&A → Production → Quality → Shipment → Payment
```

- Each step shows: icon, label, status (done/active/pending/error)
- Clickable — navigates to the detail page for that step
- Greyed out if not yet reached, green if completed, blue if active
- Shows count badges (e.g., "3 POs" on File Opening step)

**Files to create/modify:**
- `frontend/src/components/OrderJourney.tsx` — NEW reusable component
- `frontend/src/pages/StyleDetailPage.tsx` — Add journey at top
- `frontend/src/pages/FileOpeningDetailPage.tsx` — Add journey at top
- `frontend/src/pages/PurchaseOrderDetailPage.tsx` — Add journey at top
- `backend/apps/merchandising/views.py` — New endpoint `GET /styles/{id}/journey/` returning aggregated status across all linked entities

### 1.2 Status Transition Wizard
When a user transitions an entity, show a visual wizard:

- Step 1: Current status → Step 2: New status → Step 3: What this triggers
- e.g., "Confirming PO will: create T&A plan, enable production planning, unlock costing"
- Confirmation dialog with checklist of side effects

**Files to modify:**
- `frontend/src/components/StatusTransitionWizard.tsx` — NEW
- All `transition` buttons across pages — wrap with wizard

### 1.3 "What's Next" Sidebar
On every detail page, show a contextual sidebar:

- **If style is draft:** "Next: Open a file for this style →"
- **If PO is confirmed:** "Next: Create BOM, Generate Costing, Start production plan →"
- **If shipment is booked:** "Next: Upload shipping documents, Track vessel →"
- Shows warnings if prerequisites are missing

**Files to create/modify:**
- `frontend/src/components/WhatsNext.tsx` — NEW contextual sidebar
- All detail pages — add sidebar

---

## Phase 2: Connected Data & Smart Defaults

**Why:** Users re-enter the same data across modules. Smart defaults reduce friction.

### 2.1 Auto-Generate Commercial Documents from PO
When PO is confirmed, auto-create:
- Proforma Invoice (with pre-filled items, quantities, prices from PO)
- Sales Contract (with pre-filled terms)
- User reviews and submits, instead of creating from scratch

**Files to modify:**
- `backend/apps/merchandising/views.py` — Add PI/SC auto-creation on PO confirm
- `backend/apps/commercial/models.py` — Ensure PI/SC can reference PO items
- `frontend/src/pages/PurchaseOrderDetailPage.tsx` — Add "Generate PI" / "Create SC" buttons

### 2.2 Cross-Module Linked Data
On PO detail, show linked entities with live status:

```
┌─────────────────────────────────────────────────┐
│ PO-1018 — Link Garments Ltd                      │
│                                                   │
│ Style: ST-001 "Summer Tee"     [Status: Active]  │
│ File Opening: FO-1017          [Status: Open]     │
│ T&A: 6/9 milestones done       [Status: Active]   │
│ BOM: v2 (active)               [3 items]          │
│ Costing: v1 approved           [$12.50/unit]      │
│ Production Plan: PP-003        [In Progress]       │
│ Quality: 2/3 inspections pass  [Status: Active]    │
│ Shipment: SH-002               [Status: Booked]    │
│ PI: PI-005                     [Status: Accepted]  │
│ SC: SC-003                     [Status: Active]    │
└─────────────────────────────────────────────────┘
```

**Files to modify:**
- `backend/apps/merchandising/views.py` — New `GET /purchase-orders/{id}/linked/` endpoint
- `frontend/src/pages/PurchaseOrderDetailPage.tsx` — Add linked entities panel

### 2.3 Smart Defaults in Forms
When creating entities, auto-fill from parent:
- PO creation: pre-fill buyer, factory, currency, payment terms from File Opening
- BOM creation: pre-fill style version from PO's file opening
- Production Plan: pre-fill factory, quantity from PO
- PI creation: pre-fill all fields from PO

**Files to modify:**
- All `create` modals/forms — add smart default logic
- `frontend/src/components/SearchableSelect.tsx` — Pre-select logic

---

## Phase 3: Dashboard Overhaul

**Why:** Current dashboard shows generic KPIs. Users need actionable, role-based views.

### 3.1 Role-Based Dashboard Tabs
Replace single dashboard with tabbed view:

- **My Tasks** — Entities needing my action (pending approvals, overdue milestones, incomplete inspections)
- **Pipeline** — Visual pipeline of orders through lifecycle (funnel/bar chart)
- **Financials** — Revenue vs cost, pending payments, margin by PO
- **Alerts** — Overdue items, quality issues, shipment delays

**Files to modify:**
- `frontend/src/pages/DashboardPage.tsx` — Major rewrite with tabs
- `backend/apps/core/urls.py` — New `/dashboard/summary/` endpoint with richer data

### 3.2 Pipeline Visualization
A horizontal pipeline chart showing:

```
Styles: 24  →  FO: 18  →  PO: 12  →  In Production: 8  →  Shipped: 5
                    ↓ dropped: 6      ↓ pending: 4
```

Each stage is a clickable bar. Numbers are live. Click to filter list pages.

**Files to modify:**
- `frontend/src/pages/DashboardPage.tsx` — Add pipeline component
- `backend` — New aggregated pipeline endpoint

### 3.3 Financial Dashboard
New section showing:
- Total revenue (from accepted PIs)
- Total cost (from approved costings)
- Profit margin per PO
- Outstanding payments
- LC utilization vs total

**Files to modify:**
- `backend/apps/reporting/views.py` — New financial report type
- `frontend/src/pages/DashboardPage.tsx` — Financial tab

---

## Phase 4: Visual Polish & Micro-Interactions

**Why:** Small UX improvements that dramatically increase perceived quality.

### 4.1 Entity Cards with Status Pills
Replace plain table rows with rich cards for key entities:

- Each card shows: entity code, name, status pill (colored), key metric, date
- Hover reveals quick actions (view, edit, transition)
- Cards support grid/list toggle

**Files to modify:**
- `frontend/src/components/EntityCard.tsx` — NEW reusable card
- Key list pages — offer card view toggle

### 4.2 Status History Timeline
On every detail page, show a timeline of status changes:

```
Jul 13 — Created by Admin User
Jul 14 — Status: Draft → Open (by Admin User)
Jul 15 — Status: Open → Confirmed (by Admin User)
         → T&A created with 9 milestones
         → Production planning unlocked
```

**Files to modify:**
- `frontend/src/components/StatusTimeline.tsx` — NEW
- All detail pages — add timeline tab or section
- `backend` — Ensure audit log tracks status transitions with metadata

### 4.3 Quick Actions FAB
A floating action button on list pages:

- "+" opens a radial menu: "Create New Style", "Open File", "Create PO", etc.
- Context-aware: on PO list, offers "Bulk Status Update"
- Reduces clicks for common actions

**Files to modify:**
- `frontend/src/components/QuickActions.tsx` — NEW
- All list pages — add FAB

### 4.4 Empty State Improvements
Replace generic "No data" with contextual empty states:

- PO list empty: "No purchase orders yet. Start by creating a Style → File Opening → PO"
- Include illustration/icon, description, and primary action button
- Show checklist of prerequisites

**Files to modify:**
- All list pages with empty states — improve with guided messaging

---

## Phase 5: Order Trail & Audit Journey

**Why:** Users need to see the complete history of an order, not just current status.

### 5.1 Order Trail Page
New page showing complete chronological trail of an order:

```
PO-1018 Journey:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Jul 1  — Style ST-001 created
Jul 2  — File Opening FO-1017 opened (factory: Link Garments)
Jul 3  — PO-1018 created (qty: 5000 pcs, $12.50/pc)
Jul 3  — BOM v1 created (3 items)
Jul 3  — Costing v1 generated ($11.80/unit, margin 5.6%)
Jul 4  — Costing v1 APPROVED
Jul 4  — PO status: Draft → Open
Jul 5  — T&A created (9 milestones)
Jul 6  — PI-005 created ($62,500)
Jul 7  — PI-005 SENT to buyer
Jul 8  — PI-005 ACCEPTED
Jul 8  — PO status: Open → Confirmed
Jul 10 — Production Plan PP-003 created
Jul 12 — Shipment SH-002 booked (ETD: Jul 20)
...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Files to create/modify:**
- `frontend/src/pages/OrderTrailPage.tsx` — NEW page
- `frontend/src/App.tsx` — Add route
- `backend/apps/merchandising/views.py` — New `GET /purchase-orders/{id}/trail/` endpoint
- `backend/apps/monitoring/models.py` — Ensure AuditLog captures all transitions
- Layout.tsx — Add to navigation

### 5.2 Export Trail as PDF
Allow users to export the order trail as a formatted PDF for reporting.

**Files to modify:**
- `backend` — New endpoint for PDF generation (using reportlab or weasyprint)
- `frontend` — Add "Export Trail" button

---

## Phase 6: Financial Visibility & Profit Tracking

**Why:** Buying houses live and die by margins. Currently there's no way to see profit across orders.

### 6.1 PO-Level Profit Calculator
On PO detail, show:
- Revenue (from PI/SC)
- Cost (from Costing)
- Gross margin
- Breakdown: Fabric cost + Trim cost + CM + Overhead = Total Cost
- Revenue - Total Cost = Profit
- Margin %

**Files to modify:**
- `backend/apps/merchandising/views.py` — New `GET /purchase-orders/{id}/profit/` endpoint
- `frontend/src/pages/PurchaseOrderDetailPage.tsx` — New "Financials" tab

### 6.2 Profit Summary Dashboard
New dashboard view:
- Total revenue vs total cost across all POs
- Profit by buyer
- Profit by factory
- Profit trend over time
- Top/bottom margin POs

**Files to modify:**
- `frontend/src/pages/DashboardPage.tsx` — Financial section
- `backend/apps/reporting/views.py` — Financial aggregation

### 6.3 Payment Tracking
Track payments against POs:
- Payment status per PO (unpaid, partial, paid)
- Payment received date
- Outstanding balance
- LC utilization vs PO value

**Files to modify:**
- `backend/apps/commercial/models.py` — Add payment tracking fields to PI/LC
- `frontend` — Payment status display

---

## Phase 7: Onboarding & Help System

**Why:** New users need guidance. Currently zero onboarding.

### 7.1 Guided Tour
Interactive step-by-step tour for first-time users:
- "This is the Dashboard — your command center"
- "Start here: Create a Style"
- "Next: Open a File for this Style"
- Use react-joyride or similar library

**Files to create/modify:**
- `frontend/src/components/GuidedTour.tsx` — NEW
- `frontend/src/pages/DashboardPage.tsx` — Trigger tour on first login

### 7.2 Contextual Tooltips
Hover-help on key terms:
- "File Opening" → "A file opening links a style to a buyer and factory"
- "BOM" → "Bill of Materials defines all components needed for production"
- "AQL" → "Acceptable Quality Level — the maximum defect rate allowed"

**Files to modify:**
- `frontend/src/components/Tooltip.tsx` — NEW
- All forms and detail pages — add tooltips to labels

### 7.3 Help Center Page
New page with:
- Getting Started guide
- Module-by-module walkthrough
- FAQ
- Glossary of garment industry terms

**Files to create/modify:**
- `frontend/src/pages/HelpPage.tsx` — NEW
- `frontend/src/App.tsx` — Add route
- `Layout.tsx` — Add help link

---

## Implementation Priority

| Phase | Priority | Effort | Impact | Dependencies |
|-------|----------|--------|--------|--------------|
| **1. Order Journey Tracker** | P0 | High | Very High | None |
| **2. Connected Data** | P0 | Medium | Very High | Phase 1 |
| **3. Dashboard Overhaul** | P1 | Medium | High | Phase 2 |
| **4. Visual Polish** | P1 | Medium | Medium | None |
| **5. Order Trail** | P1 | Medium | High | Audit logging |
| **6. Financial Visibility** | P2 | High | High | Phase 2 |
| **7. Onboarding** | P2 | Low | Medium | None |

### Recommended Execution Order

```
Phase 1.1 → Phase 2.2 → Phase 2.3 → Phase 1.3 → Phase 1.2
    ↓
Phase 2.1 → Phase 5.1 → Phase 3.1 → Phase 3.2
    ↓
Phase 4.1 → Phase 4.2 → Phase 4.3 → Phase 4.4
    ↓
Phase 6.1 → Phase 6.2 → Phase 6.3
    ↓
Phase 7.1 → Phase 7.2 → Phase 7.3
```

---

## Sprint Breakdown

### Sprint 13: Order Journey + Smart Defaults
- [ ] OrderJourney stepper component
- [ ] Add journey to Style, FO, PO detail pages
- [ ] Journey endpoint on backend
- [ ] Smart defaults in PO creation
- [ ] Linked entities panel on PO detail

### Sprint 14: What's Next + Transitions
- [ ] WhatsNext sidebar component
- [ ] StatusTransitionWizard component
- [ ] Add to all detail pages
- [ ] Auto-generate PI/SC from PO

### Sprint 15: Dashboard Overhaul
- [ ] Role-based dashboard tabs (My Tasks, Pipeline, Financials)
- [ ] Pipeline visualization
- [ ] Financial dashboard
- [ ] Backend aggregated endpoints

### Sprint 16: Order Trail + Visual Polish
- [ ] OrderTrail page + backend endpoint
- [ ] StatusTimeline component
- [ ] EntityCard component + card view toggle
- [ ] QuickActions FAB
- [ ] Empty state improvements

### Sprint 17: Financial Visibility
- [ ] PO profit calculator
- [ ] Profit summary dashboard
- [ ] Payment tracking model + UI
- [ ] LC utilization display

### Sprint 18: Onboarding + Polish
- [ ] Guided tour
- [ ] Contextual tooltips
- [ ] Help center page
- [ ] Final QA and cross-browser testing

---

## Technical Notes

- All new frontend components go in `frontend/src/components/`
- All new pages go in `frontend/src/pages/`
- Backend endpoints follow existing DRF patterns
- Reuse existing semantic tokens for all new UI (no hard-coded colors)
- All new components must work in both light and dark themes
- All list components must use DataTable with pagination
- All select components must use SearchableSelect
- Toast notifications on all user actions
- No breaking changes to existing API contracts
