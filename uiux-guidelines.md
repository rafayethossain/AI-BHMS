# UI/UX Guidelines
# BHMS - Buying House Management System

---

## Table of Contents

1. [Design System](#1-design-system)
2. [Layout & Navigation](#2-layout--navigation)
3. [Components](#3-components)
4. [Screen Specifications](#4-screen-specifications)
5. [Responsive Design](#5-responsive-design)
6. [Accessibility](#6-accessibility)

---

## 1. Design System

### 1.1 Color Palette

```css
:root {
  /* Primary */
  --primary-50: #eff6ff;
  --primary-100: #dbeafe;
  --primary-200: #bfdbfe;
  --primary-300: #93c5fd;
  --primary-400: #60a5fa;
  --primary-500: #3b82f6;  /* Primary Blue */
  --primary-600: #2563eb;
  --primary-700: #1d4ed8;

  /* Neutral */
  --neutral-50: #f8fafc;
  --neutral-100: #f1f5f9;
  --neutral-200: #e2e8f0;
  --neutral-300: #cbd5e1;
  --neutral-400: #94a3b8;
  --neutral-500: #64748b;
  --neutral-600: #475569;
  --neutral-700: #334155;
  --neutral-800: #1e293b;
  --neutral-900: #0f172a;

  /* Semantic */
  --success: #22c55e;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #3b82f6;

  /* Status Colors */
  --status-open: #3b82f6;
  --status-confirmed: #22c55e;
  --status-in-progress: #f59e0b;
  --status-completed: #22c55e;
  --status-cancelled: #ef4444;
  --status-on-hold: #64748b;
}
```

### 1.2 Typography

```css
:root {
  /* Font Families */
  --font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'Fira Code', 'Consolas', monospace;

  /* Font Sizes */
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */
  --text-4xl: 2.25rem;   /* 36px */

  /* Font Weights */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;

  /* Line Heights */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;
}
```

### 1.3 Spacing

```css
:root {
  --space-0: 0;
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
}
```

### 1.4 Border Radius

```css
:root {
  --radius-none: 0;
  --radius-sm: 0.25rem;   /* 4px */
  --radius-md: 0.5rem;    /* 8px */
  --radius-lg: 0.75rem;   /* 12px */
  --radius-xl: 1rem;      /* 16px */
  --radius-full: 9999px;
}
```

### 1.5 Shadows

```css
:root {
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
}
```

---

## 2. Layout & Navigation

### 2.1 Main Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Header (64px)                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Logo    [Search Bar]           [Notifications] [User Menu] ││
│  └─────────────────────────────────────────────────────────────┘│
├────────────┬────────────────────────────────────────────────────┤
│            │                                                    │
│  Sidebar   │  Main Content Area                                 │
│  (256px)   │  ┌──────────────────────────────────────────────┐  │
│            │  │ Breadcrumb                                    │  │
│  ┌──────┐  │  │                                               │  │
│  │ Menu │  │  │  Page Content                                 │  │
│  │      │  │  │                                               │  │
│  │ ──── │  │  │                                               │  │
│  │      │  │  │                                               │  │
│  └──────┘  │  │                                               │  │
│            │  └──────────────────────────────────────────────┘  │
│            │                                                    │
├────────────┴────────────────────────────────────────────────────┤
│  Footer (48px)                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Sidebar Navigation

```
┌─────────────────────────────┐
│  ▼ Dashboard                │
│  ─────────────────────────  │
│  ▼ Merchandising            │
│    • Orders                 │
│    • T&A                    │
│    • Costing                │
│    • Styles                 │
│  ─────────────────────────  │
│  ▼ Commercial               │
│    • LC Management          │
│    • Banks                  │
│    • Exposure               │
│  ─────────────────────────  │
│  ▼ Production               │
│    • Planning               │
│    • Daily Reports          │
│    • Efficiency             │
│  ─────────────────────────  │
│  ▼ Quality                  │
│    • Inspections            │
│    • Compliance             │
│  ─────────────────────────  │
│  ▼ Logistics                │
│    • Shipments              │
│    • Tracking               │
│  ─────────────────────────  │
│  ▼ Inventory                │
│    • Stock                  │
│    • Movements              │
│  ─────────────────────────  │
│  ▼ Reports                  │
│  ▼ Settings                 │
└─────────────────────────────┘
```

### 2.3 Header

| Element | Position | Description |
|---------|----------|-------------|
| Logo | Left | Brand logo, 40px height |
| Search | Center | Global search bar |
| Notifications | Right | Bell icon with count badge |
| User Menu | Right | Avatar + name dropdown |

---

## 3. Components

### 3.1 Buttons

| Type | Usage | Style |
|------|-------|-------|
| Primary | Main actions | Blue fill |
| Secondary | Alternate actions | Gray fill |
| Outline | Tertiary actions | Blue border |
| Ghost | Text actions | No border |
| Danger | Destructive actions | Red fill |
| Success | Positive actions | Green fill |

### 3.2 Forms

| Component | Description |
|-----------|-------------|
| Text Input | Standard text field |
| Text Area | Multi-line text |
| Select | Dropdown selection |
| Multi-Select | Multiple selections |
| Date Picker | Calendar date selection |
| Time Picker | Time selection |
| File Upload | File upload area |
| Checkbox | Boolean selection |
| Radio | Single selection |
| Toggle | On/Off switch |

### 3.3 Tables

```
┌─────────────────────────────────────────────────────────────────┐
│  Table Header                                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ □  │ Order #  │ Buyer │ Status │ Delivery │ Actions       ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ □  │ ORD-001  │ H&M   │ Open   │ Jun 15   │ [Edit] [View]││
│  │ □  │ ORD-002  │ Zara  │ Conf.  │ Jun 20   │ [Edit] [View]││
│  │ □  │ ORD-003  │ Nike  │ Open   │ Jun 25   │ [Edit] [View]││
│  └─────────────────────────────────────────────────────────────┘│
│  Pagination: [← 1 2 3 ... 10 →]                                │
└─────────────────────────────────────────────────────────────────┘
```

### 3.4 Cards

```
┌─────────────────────────────┐
│  Card Header                │
│  Title              [Menu]  │
├─────────────────────────────┤
│  Card Content               │
│                             │
│  • Item 1: Value            │
│  • Item 2: Value            │
│  • Item 3: Value            │
│                             │
├─────────────────────────────┤
│  Card Footer                │
│  [Action 1]    [Action 2]   │
└─────────────────────────────┘
```

### 3.5 Status Badges

| Status | Color | Icon |
|--------|-------|------|
| Draft | Gray | ○ |
| Open | Blue | ○ |
| Confirmed | Green | ○ |
| In Progress | Yellow | ○ |
| Completed | Green | ✓ |
| Cancelled | Red | ✗ |
| On Hold | Gray | ⏸ |

### 3.6 Modal Dialogs

```
┌─────────────────────────────────────────────┐
│  Modal Header                    [Close]     │
├─────────────────────────────────────────────┤
│                                             │
│  Modal Content                              │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ Form Fields                         │   │
│  └─────────────────────────────────────┘   │
│                                             │
├─────────────────────────────────────────────┤
│  Modal Footer                               │
│            [Cancel]    [Save]               │
└─────────────────────────────────────────────┘
```

---

## 4. Screen Specifications

### 4.1 Dashboard

**Purpose:** Executive overview of key metrics

**Layout:**
- Top: KPI cards (4-6 metrics)
- Middle: Charts (2-3 charts)
- Bottom: Recent activity, alerts

**Components:**
| Section | Content |
|---------|---------|
| KPI Cards | Orders, Shipments, Revenue, Efficiency |
| Charts | Order trend, Production efficiency, Shipment status |
| Activity | Recent updates, Approvals pending |
| Alerts | Overdue milestones, LC expiry, Quality issues |

### 4.2 Orders List

**Purpose:** View and manage all orders

**Layout:**
- Top: Filters, Search, Actions
- Middle: Data table
- Bottom: Pagination

**Filters:**
| Filter | Type | Options |
|--------|------|---------|
| Status | Multi-select | Open, Confirmed, In Progress, Completed |
| Buyer | Multi-select | All buyers |
| Factory | Multi-select | All factories |
| Delivery Date | Date range | From, To |
| Search | Text | Order number, style name |

**Columns:**
| Column | Width | Sortable |
|--------|-------|----------|
| Checkbox | 40px | No |
| Order # | 120px | Yes |
| Buyer | 150px | Yes |
| Style | 150px | Yes |
| Quantity | 100px | Yes |
| Value | 120px | Yes |
| Delivery Date | 120px | Yes |
| Status | 100px | No |
| Actions | 100px | No |

### 4.3 Order Detail

**Purpose:** View and manage single order

**Layout:**
- Top: Order header with status
- Middle: Tabs (Details, Items, T&A, Costing, Shipment)
- Bottom: Activity log

**Tabs:**
| Tab | Content |
|-----|---------|
| Details | Order information, Buyer, Factory |
| Items | Order items with colors, sizes, quantities |
| T&A | Time & Action timeline |
| Costing | Cost breakdown, version history |
| Shipment | Shipment details, tracking |

### 4.4 T&A Calendar

**Purpose:** Visual timeline of milestones

**Layout:**
- Left: Order list
- Right: Calendar/Gantt view

**Components:**
| Section | Content |
|---------|---------|
| Order List | Filterable list of orders |
| Timeline | Visual milestone timeline |
| Milestones | Draggable milestone cards |
| Critical Path | Highlighted critical milestones |

### 4.5 LC Management

**Purpose:** Manage Letters of Credit

**Layout:**
- Top: LC summary cards
- Middle: LC list with filters
- Bottom: LC details panel

**Summary Cards:**
| Card | Value |
|------|-------|
| Total LCs | Count |
| Active LCs | Count |
| Expiring Soon | Count (7 days) |
| Total Value | Currency amount |

---

## 5. Responsive Design

### 5.1 Breakpoints

| Breakpoint | Width | Target |
|------------|-------|--------|
| Mobile | < 640px | Phones |
| Tablet | 640px - 1024px | Tablets |
| Desktop | > 1024px | Desktop/Laptop |
| Large | > 1280px | Large monitors |

### 5.2 Responsive Behavior

| Component | Mobile | Tablet | Desktop |
|-----------|--------|--------|---------|
| Sidebar | Hidden (hamburger) | Collapsed | Expanded |
| Table | Card view | Horizontal scroll | Full table |
| Forms | Stack vertically | 2 columns | 3 columns |
| Charts | Full width | Half width | Third width |

---

## 6. Accessibility

### 6.1 WCAG 2.1 AA Compliance

| Requirement | Implementation |
|-------------|----------------|
| Color Contrast | 4.5:1 minimum for text |
| Keyboard Navigation | Full tab support |
| Screen Reader | ARIA labels on all elements |
| Focus Indicators | Visible focus states |
| Alt Text | Alt text for all images |
| Form Labels | Labels for all form inputs |

### 6.2 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl + K | Global search |
| Ctrl + S | Save current form |
| Ctrl + N | Create new record |
| Escape | Close modal |
| Tab | Next field |
| Shift + Tab | Previous field |

---

*This document should be reviewed by UI/UX Designer before implementation.*
