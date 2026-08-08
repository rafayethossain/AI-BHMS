# BHMS Frontend

React + TypeScript frontend for the Buying House Management System.

## Prerequisites

- Node.js 22+
- npm

## Quick Start

```bash
# From project root
cd AI-BHMS/frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

Frontend runs at `http://localhost:5173` and proxies API requests to `http://localhost:8000`.

> **Important:** Both backend and frontend must be running simultaneously. Start the backend first (see `backend/README.md` — SQLite, no PostgreSQL/Redis needed), then run the frontend. If the backend is not running, the frontend loads but API calls fail.

## Login Credentials

| User | Email | Password |
|------|-------|----------|
| Admin | admin@demo.com | admin123!@# |

## Available Routes (49)

### Authentication
| Path | Page | Description |
|------|------|-------------|
| `/login` | LoginPage | Login form with JWT + OTP |

### Dashboards
| Path | Page | Description |
|------|------|-------------|
| `/dashboard` | DashboardPage | Main dashboard with summary cards |
| `/dashboard/executive` | ExecutiveDashboardPage | Executive overview with KPIs |

### Merchandising — Styles
| Path | Page | Description |
|------|------|-------------|
| `/styles` | StylesListPage | Styles CRUD list with DataTable |
| `/styles/:id` | StyleDetailPage | Style detail with tabs (Overview, Versions, File Openings, POs, Line Items, BOM) |

### Merchandising — File Openings
| Path | Page | Description |
|------|------|-------------|
| `/file-openings` | FileOpeningsListPage | File openings list |
| `/file-openings/:id` | FileOpeningDetailPage | File opening detail with POs, styles |

### Merchandising — Purchase Orders
| Path | Page | Description |
|------|------|-------------|
| `/purchase-orders` | PurchaseOrdersListPage | POs list with status filters |
| `/purchase-orders/:id` | PurchaseOrderDetailPage | PO detail with lifecycle tabs |
| `/purchase-orders/:id/trail` | OrderTrailPage | Full PO lifecycle audit trail |

### Merchandising — Technical & BOM
| Path | Page | Description |
|------|------|-------------|
| `/boms` | BOMsListPage | Bills of Materials list |
| `/boms/:id` | BOMDetailPage | BOM detail with line items |
| `/costings` | CostingsListPage | Costing sheets list |
| `/costings/:id` | CostingDetailPage | Costing breakdown by component |

### Merchandising — T&A
| Path | Page | Description |
|------|------|-------------|
| `/tas` | TAsListPage | T&A schedules list |
| `/tas/:id` | TADetailPage | T&A detail with milestone Gantt |
| `/tas/calendar` | TACalendarPage | T&A calendar view |
| `/tas/heatmap` | TAHeatmapPage | T&A heatmap for workload analysis |

### Commercial
| Path | Page | Description |
|------|------|-------------|
| `/pis` | ProformaInvoicesPage | Proforma Invoices list |
| `/scs` | SalesContractsPage | Sales Contracts list |
| `/lcs` | LCsListPage | Letters of Credit list |
| `/lcs/:id` | LCDetailPage | LC detail with amendment workflow |
| `/banks` | BanksListPage | Bank master data |

### Production
| Path | Page | Description |
|------|------|-------------|
| `/production` | ProductionPlansPage | Production planning list |
| `/production/dashboard` | ProductionDashboardPage | Production KPIs dashboard |
| `/production/portal` | FactoryPortalPage | Factory data entry portal |
| `/production/daily` | DailyReportsPage | Daily production reports |
| `/production/:id` | ProductionDetailPage | Production order detail |

### Quality
| Path | Page | Description |
|------|------|-------------|
| `/quality` | InspectionsPage | Inspections list (Inline/Final/Pre-shipment) |
| `/quality/dashboard` | QualityDashboardPage | Quality KPIs (AQL, DHU, efficiency) |
| `/quality/caps` | CorrectiveActionsPage | CAPA management |

### Logistics
| Path | Page | Description |
|------|------|-------------|
| `/logistics` | ShipmentsPage | Shipments list |
| `/logistics/:id` | ShipmentDetailPage | Shipment detail with docs |
| `/logistics/dashboard` | ShipmentDashboardPage | Logistics KPIs dashboard |
| `/logistics/forwarders` | FreightForwardersPage | Freight forwarder master data |

### Reports
| Path | Page | Description |
|------|------|-------------|
| `/reports` | ReportsDashboardPage | Reports dashboard |
| `/reports/builder` | ReportBuilderPage | Custom report builder |
| `/reports/schedules` | ReportSchedulesPage | Scheduled report management |
| `/reports/:type` | ReportViewerPage | Report viewer by type |

### Setup & Admin
| Path | Page | Description |
|------|------|-------------|
| `/setup` | SetupPage | System setup hub |
| `/setup/tenant` | TenantSetupPage | Tenant configuration |
| `/setup/offices` | OfficeManagementPage | Office/branch management |
| `/setup/:type` | MasterDataPage | Master data management (colors, sizes, etc.) |
| `/admin/users` | UsersPage | User management |
| `/admin/roles` | RolesPage | Role & permission management |
| `/admin/audit-logs` | AuditLogsPage | System audit trail |
| `/admin/health` | HealthPage | System health monitoring |
| `/admin/alerts` | AlertsPage | System alerts |

### Help
| Path | Page | Description |
|------|------|-------------|
| `/help` | HelpPage | User guide & documentation |

## Tech Stack

- **React 19** + **TypeScript 6**
- **Vite 8** (Rolldown bundler) + **@vitejs/plugin-react 6**
- **Tailwind CSS 4** (CSS-first config via `@tailwindcss/vite`)
- **React Router 7** (routing)
- **Axios** (HTTP client with JWT interceptors)
- **Oxlint** (linting, replaces ESLint)

## Project Structure

```
frontend/
├── src/
│   ├── api/
│   │   └── client.ts              # Axios instance + API functions
│   ├── components/
│   │   ├── DataTable.tsx           # Reusable table with pagination/sorting/filters
│   │   ├── SearchableSelect.tsx    # Async searchable FK dropdown
│   │   ├── ErrorBoundary.tsx       # React error boundary
│   │   ├── StatusBadge.tsx         # Status badge component
│   │   ├── Toast.tsx               # Toast notification
│   │   └── ToastContainer.tsx      # Toast container
│   ├── contexts/
│   │   ├── AuthContext.tsx          # Auth state + JWT management
│   │   ├── ThemeContext.tsx         # Dark/light theme toggle (localStorage)
│   │   └── ToastContext.tsx         # Toast notification context
│   ├── pages/                      # 49 page components (see routes above)
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── StylesListPage.tsx
│   │   ├── StyleDetailPage.tsx
│   │   ├── PurchaseOrdersListPage.tsx
│   │   ├── PurchaseOrderDetailPage.tsx
│   │   └── ... (49 total)
│   ├── App.tsx                     # Router setup with all routes
│   ├── main.tsx                    # Entry point
│   └── index.css                   # Tailwind imports + semantic CSS variables
├── index.html
├── vite.config.ts                  # Vite config with API proxy + Tailwind plugin
├── tsconfig.json
├── tsconfig.app.json
└── package.json
```

## Build

```bash
npm run build    # Output in dist/
npm run preview  # Preview production build
```

## Key Patterns

- **SearchableSelect** for all foreign-key dropdowns (passes `page_size: '500'`)
- **DataTable** for all list pages (pagination, column filtering, sorting)
- **Theme context** with CSS custom properties (`bg-page`, `text-heading`, `border-border`)
- **Flash-prevention script** in `index.html` to prevent white flash on dark mode
- **Toast notifications** on every create/update/delete/status transition
- **TypeScript `import type { ... }`** required for all type-only imports (Rolldown requirement)
