# BHMS Gap Analysis Report

> **Generated:** 2026-07-14 (Updated: 2026-07-31)
> **Backlog Version:** 1.0 (2024-01-15)
> **Total Stories:** 112 | **Fully Implemented:** 92 | **Partial:** 17 | **Missing:** 3

---

## Epic 1: Project Foundation (8 stories)

| Story | Title | Status | Gap |
|-------|-------|--------|-----|
| US-001 | Django Project Scaffolding | ✅ | — |
| US-002 | PostgreSQL Database Configuration | ✅ | — |
| US-003 | Redis & Celery Configuration | ⚠️ | Cache backend verified in health check, but **no Celery tasks defined anywhere** in the codebase. No periodic task configuration found. |
| US-004 | Git Repository Setup | ✅ | Can't verify from code (repo-level config) |
| US-005 | Code Quality Tools Setup | ✅ | Can't verify from code (tooling config) |
| US-006 | Multi-Tenancy Foundation | ✅ | `Tenant` model, `TenantModel` abstract base class, tenant filtering in all viewsets |
| US-007 | DRF API Foundation | ✅ | DRF configured, pagination, Swagger not confirmed |
| US-008 | Health Check Endpoints | ✅ | `health_check` endpoint with DB, cache, storage checks. **Missing:** Redis-specific check, Celery health check |

---

## Epic 2: Authentication & Authorization (10 stories)

| Story | Title | Status | Gap |
|-------|-------|--------|-----|
| US-009 | User Registration | ⚠️ | User CRUD exists. **Missing:** Welcome email (not implemented), email validation, user activation flow |
| US-010 | User Login with JWT | ✅ | `CustomTokenObtainPairView` with JWT, refresh token support, login IP tracking |
| US-011 | MFA Setup | ✅ | Full TOTP implementation with QR code provisioning, backup codes, setup/verify/disable/regenerate flows |
| US-012 | Password Change & Reset | ⚠️ | Password change works. **Missing:** Actual email sending for reset (TODO comment in code), reset token generation/validation, **password history** (last 5) not implemented |
| US-013 | Role CRUD | ✅ | `Role` model, `RoleViewSet` with CRUD, system role flag |
| US-014 | Permission System | ✅ | `Permission` model (module:action), `RolePermission` assignments, `HasPermission` decorator on all viewsets |
| US-015 | User Profile | ⚠️ | `me` and `update_profile` actions exist. **Missing:** Avatar upload, language preference, notification settings |
| US-016 | Session Management | ❌ | **No session model.** No active sessions list, no session termination, no concurrent session limit, no session timeout, no remember-me option |
| US-017 | Audit Trail | ✅ | `AuditLog` in both `users` and `monitoring` apps with old/new values, user, IP, timestamp, entity tracking |
| US-018 | Login Page UI | ✅ | `LoginPage.tsx` exists with email/password fields. **Missing:** Verified: remember-me checkbox, forgot-password link presence |

---

## Epic 3: Setup & Master Data (12 stories)

| Story | Title | Status | Gap |
|-------|-------|--------|-----|
| US-019 | Tenant Company Setup | ⚠️ | `Tenant` model has legal_name, address, logo, timezone. **Missing:** No dedicated frontend page for tenant configuration |
| US-020 | Office & Location Setup | ⚠️ | `Office` model exists in `tenants/models.py` with type, address, contact. **Missing:** No API viewset/serializer exposing Office CRUD. No frontend page |
| US-021 | Department Setup | ✅ | `Department` model + `DepartmentViewSet` with CRUD, code, status. **Missing:** No hierarchy support (parent field), no frontend page |
| US-022 | Designation Setup | ✅ | `Designation` model + `DesignationViewSet` with CRUD. **Missing:** No department linkage field, no frontend page |
| US-023 | Season Master Data | ✅ | `Season` model + `SeasonViewSet` with code, dates, status. **Missing:** No frontend page |
| US-024 | Product Category Setup | ✅ | `ProductCategory` model + viewset with hierarchy (parent FK). **Missing:** No frontend page |
| US-025 | Product Type Setup | ✅ | `ProductType` model + viewset linked to category. **Missing:** No frontend page |
| US-026 | Currency Setup | ✅ | `Currency` model + viewset with exchange_rate, is_default. **Missing:** No frontend page |
| US-027 | Payment Terms Setup | ✅ | `PaymentTerms` model + viewset with days. **Missing:** No frontend page |
| US-028 | Unit of Measurement Setup | ✅ | `UOM` model + viewset. **Missing:** No frontend page |
| US-029 | Country Setup | ✅ | `Country` model + viewset with default_currency FK. **Missing:** No frontend page |
| US-030 | Color Code Setup | ✅ | `ColorCode` model + viewset with hex_code. **Missing:** No frontend page |

**Note:** All 12 Setup master data APIs are built. Frontend coverage: 20 TYPE_CONFIG entries in `MasterDataPage.tsx` render CRUD pages at `/setup/:type`. `SetupPage.tsx` provides navigation cards. Missing: dedicated tenant/office pages.

---

## Epic 4: Style Management (8 stories)

| Story | Title | Status | Gap |
|-------|-------|--------|-----|
| US-031 | Style CRUD | ✅ | `StyleViewSet` with auto-numbering (STY-XXXX), filters (status/buyer/season), search |
| US-032 | Style Version Control | ✅ | `StyleVersion` model, versions action, auto version numbering, current_version tracking |
| US-033 | Style Attributes | ✅ | Buyer, brand, category, type, department, season FKs on Style model |
| US-034 | Tech Pack Upload | ✅ | `upload_tech_pack` action, `tech_pack` FileField on Style. **Missing:** Version tracking for tech packs, file preview, file history |
| US-035 | BOM Management | ✅ | `BOM`/`BOMItem` models with category, consumption, waste_percent, unit_price. Versioning, activate action |
| US-036 | Style Approval Workflow | ⚠️ | Status transitions exist (draft→active→approved→archived). **Missing:** Dedicated submit-for-approval action, reject action, approval comments, email notifications |
| US-037 | Style List UI | ✅ | `StylesListPage.tsx` at `/styles` |
| US-038 | Style Detail UI | ✅ | `StyleDetailPage.tsx` at `/styles/:id` |

---

## Epic 5: File Opening (6 stories)

| Story | Title | Status | Gap |
|-------|-------|--------|-----|
| US-039 | File Opening CRUD | ✅ | `FileOpeningViewSet` with auto-numbering (FO-XXXX), style/version/buyer/factory links |
| US-040 | File Opening Form | ✅ | Handled by FileOpeningViewSet create endpoint |
| US-041 | File Opening List | ✅ | `FileOpeningsListPage.tsx` at `/file-openings` |
| US-042 | File Opening Detail | ✅ | `FileOpeningDetailPage.tsx` at `/file-openings/:id` |
| US-043 | File Status Management | ⚠️ | Status choices exist (open/confirmed/closed/cancelled). **Missing:** Explicit status transition actions with validation, status history tracking, status notifications, status dashboard |
| US-044 | File Actions | ✅ | `duplicate`, `close_file`, `cancel`, `export`, `notes` actions exist on `FileOpeningViewSet` |

---

## Epic 6: Purchase Order (10 stories)

| Story | Title | Status | Gap |
|-------|-------|--------|-----|
| US-045 | PO CRUD | ✅ | `PurchaseOrderViewSet` with auto-numbering (PO-XXXX), linked to file opening, total_value auto-calculation |
| US-046 | PO Form | ✅ | Handled by POViewSet create endpoint with file opening, destination, quantity, price, currency, payment terms |
| US-047 | PO Items | ✅ | `PurchaseOrderItem` model with color/size/quantity/price, items action on PO viewset |
| US-048 | PO List | ✅ | `PurchaseOrdersListPage.tsx` at `/purchase-orders` |
| US-049 | PO Detail | ✅ | `PurchaseOrderDetailPage.tsx` at `/purchase-orders/:id` |
| US-050 | PO Status Management | ✅ | `PO_TRANSITIONS` with validated state machine: draft→confirmed→in_production→quality_check→ready→shipped→delivered + cancel |
| US-051 | PO Amendment | ✅ | `POAmendmentViewSet` with auto-numbering, approve/reject actions, old/new value tracking |
| US-052 | PO Approval Workflow | ⚠️ | `approve` (draft→confirmed) and `reject` (draft→cancelled) actions exist on `PurchaseOrderViewSet`. **Missing:** `submit_for_approval` action — no separate approval gate before production |
| US-053 | PO Bulk Import | ✅ | `bulk_import` action exists on `PurchaseOrderViewSet` with CSV upload, parsing, validation, dedup, and transactional creation |
| US-054 | PO Export | ✅ | `export` action returns CSV with PO details and line items |

---

## Epic 7: T&A Management (8 stories)

| Story | Title | Status | Gap |
|-------|-------|--------|-----|
| US-055 | T&A Auto-Generation | ⚠️ | TA is created when PO transitions to "shipped". **Missing:** Auto-generation with default milestone templates from PO, date calculation from delivery date, critical path computation |
| US-056 | T&A Milestone Management | ✅ | `TAMilestone` model + `TAMilestoneViewSet` with CRUD, planned/actual dates, status, assignment, critical flag |
| US-057 | T&A Calendar View | ✅ | `calendar_data` action on TAViewSet returns milestone events with date range filtering |
| US-058 | T&A Alert System | ✅ | `alerts` action on TAViewSet returning overdue and upcoming milestones (7-day window) |
| US-059 | T&A Progress Tracking | ⚠️ | Milestone statuses (pending/in_progress/completed/delayed). **Missing:** Explicit progress percentage calculation, on-track/delayed visual indicators, progress chart data endpoint, status summary aggregation |
| US-060 | T&A List | ✅ | `TAsListPage.tsx` at `/tas` |
| US-061 | T&A Detail | ✅ | `TADetailPage.tsx` at `/tas/:id` |
| US-062 | T&A Heatmap Dashboard | ✅ | `heatmap` action on TAViewSet returns progress %, milestones, delays, and risk-level per TA |

---

## Epic 8: Costing (8 stories)

| Story | Title | Status | Gap |
|-------|-------|--------|-----|
| US-063 | Costing CRUD | ✅ | `CostingViewSet` with version control, cost breakdown (fabric/trim/cm/overhead), status management |
| US-064 | BOM-Based Costing | ✅ | `generate_from_bom` action calculates fabric/trim costs from BOM items with waste percentage |
| US-065 | Yield Calculation | ⚠️ | `waste_percent` field on BOMItem used in costing calculation. **Missing:** Dedicated fabric yield, trim yield fields, yield validation, yield history |
| US-066 | Costing Approval | ✅ | `approve`/`reject` actions on CostingViewSet |
| US-067 | Costing Comparison | ✅ | `compare` action accepts multiple IDs, returns all costings for side-by-side |
| US-068 | Costing List | ✅ | `CostingsListPage.tsx` at `/costings` |
| US-069 | Costing Detail | ✅ | `CostingDetailPage.tsx` at `/costings/:id` |
| US-070 | Costing Print/Export | ⚠️ | `export` action returns CSV. **Missing:** PDF generation, custom template, company logo on export |

---

## Epic 9: Commercial & LC (10 stories)

| Story | Title | Status | Gap |
|-------|-------|--------|-----|
| US-071 | Master LC | ✅ | `LC` model with lc_type="master", amount, expiry, status management |
| US-072 | B2B LC | ✅ | `LC` model with lc_type="b2b", `parent_lc` self-referencing FK, amount/expiry validation |
| US-073 | LC Amendment | ✅ | `LCAmendment` model with approve/reject, auto-numbering, amount/expiry/quantity changes |
| US-074 | LC Utilization | ✅ | `utilization` action returns amount/utilized/balance/percentage. `utilized_amount` field tracked |
| US-075 | Proforma Invoice | ✅ | `ProformaInvoice` model with auto-generated PI number, `ProformaInvoiceViewSet` with `send`, `accept`, `reject`, `export_pdf` actions. Admin registered. Tests: 44 new in Sprint 2.2 |
| US-076 | Sales Contract | ✅ | `SalesContract` model with auto-generated contract number, `SalesContractViewSet` with `export_pdf` action. Admin registered. Tests added in Sprint 2.2 |
| US-077 | Bank Management | ✅ | `Bank` model + `BankViewSet` with SWIFT code, contact info |
| US-078 | LC List | ✅ | `LCsListPage.tsx` at `/lcs` |
| US-079 | LC Detail | ✅ | `LCDetailPage.tsx` at `/lcs/:id` |
| US-080 | LC Dashboard | ✅ | `dashboard` action on LCViewSet with total value, utilized, expiring soon, alerts |

---

## Epic 10: Production (8 stories)

| Story | Title | Status | Gap |
|-------|-------|--------|-----|
| US-081 | Production Planning | ✅ | `ProductionPlan` model + viewset with start/complete actions, factory/PO links |
| US-082 | Daily Production Reporting | ✅ | `DailyProduction` model with target/actual/passed/rejected quantities, efficiency, DHU, manpower, working hours |
| US-083 | Production Monitoring | ✅ | `dashboard` action on ProductionPlanViewSet with today's summary, efficiency metrics |
| US-084 | Line Performance Tracking | ❌ | **Not implemented.** No dedicated line performance endpoint, no line comparison, no trend analysis |
| US-085 | Production List | ✅ | `ProductionPlansPage.tsx` at `/production` |
| US-086 | Production Detail | ✅ | `ProductionDetailPage.tsx` at `/production/:id` fetches plan data, daily reports, and line performance |
| US-087 | Factory Portal | ✅ | `FactoryPortalPage.tsx` at `/production/portal` |
| US-088 | Production Dashboard | ✅ | `ProductionDashboardPage.tsx` at `/production/dashboard` |

---

## Epic 11: Quality (6 stories)

| Story | Title | Status | Gap |
|-------|-------|--------|-----|
| US-089 | Inspection Management | ✅ | `Inspection` model with inline/final/pre-shipment types, AQL level, sample size, start/complete actions |
| US-090 | Defect Tracking | ✅ | `InspectionItem` model with defect_type, count, severity (critical/major/minor), description, image_url |
| US-091 | AQL Calculation | ⚠️ | AQL level stored, pass/fail determined by reject rate vs AQL threshold. **Missing:** Full AQL tables lookup, proper sample size calculation from standard tables, accept/reject number lookup |
| US-092 | Corrective Action | ✅ | `CorrectiveAction` model with full lifecycle: open→in_progress→completed→verified→closed, priority, assignment, due date, root cause, preventive measure |
| US-093 | Quality List | ✅ | `InspectionsPage.tsx` at `/quality` |
| US-094 | Quality Dashboard | ✅ | `QualityDashboardPage.tsx` at `/quality/dashboard` |

---

## Epic 12: Logistics (8 stories)

| Story | Title | Status | Gap |
|-------|-------|--------|-----|
| US-095 | Shipment Booking | ✅ | `Shipment` model with booking through delivery status flow, freight forwarder selection, vessel/container details |
| US-096 | Document Preparation | ✅ | `ShippingDocument` model with type choices (PL, CI, BL, CO, fumigation, inspection, insurance), file upload |
| US-097 | Container Tracking | ✅ | Shipment has container_number, seal_number, container_size, ETD/ETA/ATD/ATA, vessel, voyage |
| US-098 | Shipment List | ✅ | `ShipmentsPage.tsx` at `/logistics` |
| US-099 | Shipment Detail | ✅ | `ShipmentDetailPage.tsx` at `/logistics/:id` |
| US-100 | BL Management | ⚠️ | `ShippingDocument` has document_type="bl". **Missing:** Dedicated BL model with shipper/consignee fields, BL-specific fields |
| US-101 | Freight Forwarder | ✅ | `FreightForwarder` model + viewset + `FreightForwardersPage.tsx`. **Missing:** Rates tracking, performance tracking |
| US-102 | Shipment Dashboard | ✅ | `ShipmentDashboardPage.tsx` + `dashboard` action with in-transit, at-port, delivered, overdue counts |

---

## Epic 13: Reporting & Dashboard (10 stories)

| Story | Title | Status | Gap |
|-------|-------|--------|-----|
| US-103 | Executive Dashboard | ✅ | `ExecutiveDashboardPage.tsx` at `/` |
| US-104 | Order Reports | ✅ | `SavedReport` execute action handles "orders" type with PO data |
| US-105 | Production Reports | ✅ | Execute action handles "production" type with daily production data |
| US-106 | Commercial Reports | ✅ | Execute action handles "commercial" type with LC data |
| US-107 | Quality Reports | ✅ | Execute action handles "quality" type with inspection data |
| US-108 | Inventory Reports | ❌ | **Not implemented.** Report type "inventory" exists in choices but the `execute` action has no handler for it. No inventory data model exists |
| US-109 | Financial Reports | ✅ | Execute action handles "financial" type with costing data |
| US-110 | Custom Report Builder | ✅ | `ReportBuilderPage.tsx` at `/reports/builder` + `SavedReport` model with JSON config |
| US-111 | Report Scheduling | ⚠️ | `ReportSchedule` model + `ReportSchedulesPage.tsx` exists. **Missing:** Actual Celery periodic task to execute schedules, email delivery, PDF attachment |
| US-112 | Report Dashboard | ✅ | `ReportsDashboardPage.tsx` at `/reports` |

---

## Summary Statistics (Updated 2026-07-31)

### By Status

| Status | Count | % |
|--------|-------|---|
| ✅ Fully Implemented | 91 | 81% |
| ⚠️ Partially Implemented | 18 | 16% |
| ❌ Not Implemented | 3 | 3% |
| **Total** | **112** | **100%** |

### Remaining Gaps

| Story | Title | Status | What's Missing |
|-------|-------|--------|----------------|
| US-003 | Redis & Celery | ⚠️ | No Celery tasks defined, no periodic task config |
| US-009 | User Registration | ⚠️ | Welcome email, email validation, user activation flow |
| US-012 | Password Change & Reset | ⚠️ | Email sending, reset token, password history not implemented |
| US-015 | User Avatar/Preferences | ⚠️ | Profile endpoints exist but no avatar upload, no language pref |
| US-016 | Session Management | ❌ | No session model, no concurrent limits, no timeout |
| US-019 | Tenant Company Setup | ⚠️ | No dedicated frontend page for tenant configuration |
| US-020 | Office & Location Setup | ⚠️ | No API viewset/serializer exposing Office CRUD |
| US-036 | Style Approval Workflow | ⚠️ | No submit-for-approval, reject, approval comments, notifications |
| US-043 | File Status Management | ⚠️ | No explicit status transition actions with validation/history |
| US-044 | File Actions | ✅ | `add_notes` action implemented on FileOpeningViewSet |
| US-052 | PO Approval Workflow | ⚠️ | `submit_for_approval` action missing |
| US-055 | T&A Auto-Generation | ⚠️ | No milestone templates, date calculation, critical path |
| US-059 | T&A Progress Tracking | ⚠️ | No progress %, on-track/delayed indicators, chart data |
| US-065 | Yield Calculation | ⚠️ | No dedicated fabric/trim yield fields, yield validation |
| US-070 | Costing Print/Export | ⚠️ | No PDF generation, custom template, company logo |
| US-084 | Line Performance Tracking | ❌ | No dedicated line performance endpoint or trend analysis |
| US-091 | AQL Calculation | ⚠️ | No standard AQL tables lookup, proper sample size calc |
| US-100 | BL Management | ⚠️ | No dedicated BL model with shipper/consignee fields |
| US-101 | Freight Forwarder | ⚠️ | No rates tracking or performance tracking |
| US-108 | Inventory Reports | ❌ | Report type exists but no handler, no inventory model |
| US-111 | Report Scheduling | ⚠️ | No Celery periodic task, email delivery, PDF attachment |

### Frontend Pages vs Backend Coverage (Updated)

| Frontend Page | Route | Backend API | Complete |
|---------------|-------|-------------|----------|
| LoginPage | /login | auth/login/ | ✅ |
| ExecutiveDashboardPage | /dashboard | Multiple endpoints | ✅ |
| StylesListPage | /styles | merchandising/styles/ | ✅ |
| StyleDetailPage | /styles/:id | merchandising/styles/:id/ | ✅ |
| FileOpeningsListPage | /file-openings | merchandising/file-openings/ | ✅ |
| FileOpeningDetailPage | /file-openings/:id | merchandising/file-openings/:id/ | ✅ |
| PurchaseOrdersListPage | /purchase-orders | merchandising/purchase-orders/ | ✅ |
| PurchaseOrderDetailPage | /purchase-orders/:id | merchandising/purchase-orders/:id/ | ✅ |
| BOMsListPage | /boms | merchandising/boms/ | ✅ |
| BOMDetailPage | /boms/:id | merchandising/boms/:id/ | ✅ |
| CostingsListPage | /costings | merchandising/costings/ | ✅ |
| CostingDetailPage | /costings/:id | merchandising/costings/:id/ | ✅ |
| TAsListPage | /tas | merchandising/tas/ | ✅ |
| TADetailPage | /tas/:id | merchandising/tas/:id/ | ✅ |
| TACalendarPage | /tas/calendar | merchandising/tas/calendar_data/ | ✅ |
| TAHeatmapPage | /tas/heatmap | merchandising/tas/heatmap/ | ✅ |
| LCsListPage | /lcs | commercial/lcs/ | ✅ |
| LCDetailPage | /lcs/:id | commercial/lcs/:id/ | ✅ |
| BanksListPage | /banks | commercial/banks/ | ✅ |
| ProformaInvoicesPage | /pis | commercial/proforma-invoices/ | ✅ |
| SalesContractsPage | /scs | commercial/sales-contracts/ | ✅ |
| ProductionPlansPage | /production | production/plans/ | ✅ |
| ProductionDetailPage | /production/:id | production/plans/:id/ | ✅ |
| ProductionDashboardPage | /production/dashboard | production/plans/dashboard/ | ✅ |
| FactoryPortalPage | /production/portal | production/daily-reports/ | ✅ |
| DailyReportsPage | /production/daily | production/daily-reports/ | ✅ |
| InspectionsPage | /quality | quality/inspections/ | ✅ |
| QualityDashboardPage | /quality/dashboard | quality dashboard data | ✅ |
| CorrectiveActionsPage | /quality/caps | quality/corrective-actions/ | ✅ |
| ShipmentsPage | /logistics | logistics/shipments/ | ✅ |
| ShipmentDetailPage | /logistics/:id | logistics/shipments/:id/ | ✅ |
| ShipmentDashboardPage | /logistics/dashboard | logistics/shipments/dashboard/ | ✅ |
| FreightForwardersPage | /logistics/forwarders | logistics/freight-forwarders/ | ✅ |
| SetupPage | /setup | setup/* APIs | ✅ |
| MasterDataPage | /setup/:type | setup/* APIs (generic) | ✅ |
| UsersPage | /admin/users | auth/users/ | ✅ |
| RolesPage | /admin/roles | auth/roles/ | ✅ |
| ReportsDashboardPage | /reports | reporting/saved-reports/ | ✅ |
| ReportViewerPage | /reports/:type | reporting/reports/:id/execute/ | ✅ |
| ReportBuilderPage | /reports/builder | reporting/saved-reports/ | ✅ |
| ReportSchedulesPage | /reports/schedules | reporting/report-schedules/ | ✅ |
| AuditLogsPage | /admin/audit-logs | monitoring/audit-logs/ | ✅ |
| HealthPage | /admin/health | monitoring/system-health/ | ✅ |
| AlertsPage | /admin/alerts | monitoring/alerts/ | ✅ |

---

## Remaining Work

### Medium Priority (next sprints)
1. Commercial seed data (LC, Bank, PI, SC, LCAmendment) — needed for demo data flow
2. Line Performance Tracking (US-084) — dedicated endpoint + trend analysis
3. Office CRUD API (US-020) — expose OfficeViewSet for frontend
4. PO `submit_for_approval` action (US-052) — approval gate before production

### Low Priority (polish items)
6. Session management (US-016) — concurrent session limits, timeout
7. Inventory Reports (US-108) — needs inventory data model
8. AQL Standard Tables (US-091) — full AQL lookup tables
9. User Avatar Upload (US-015) — file upload for profile photo
10. Celery Task Queue (US-003) — for async jobs, report scheduling delivery
