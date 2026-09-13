# Master Backlog � BHMS (Buying House Management System)

> **Purpose**: Single consolidated backlog for BHMS. Merges the original 116-story product backlog with the BHMS requirement sequence (formerly tracked as "target gaps" � now fully BHMS requirements) and the Part 3 feature sequence (Style Tech-Pack Import & Processing). Any agent starting work MUST read this first, then follow the cross-references.
> **Last merged**: 2026-07-31 (backlog.md + master-backlog.md consolidated into this file)
> **Reframed**: 2026-08-03 � target gap framing retired; all items are BHMS requirements (`RQ-###` IDs, workflow-ordered in Part 2)
> **Part 3 added**: 2026-08-10 � Style Tech-Pack Import & Processing (RQ-036 ? RQ-042, P0, TDD roadmap)
> **Part 3 complete**: 2026-08-11 � all 7 requirements delivered (7/7, 100%), 123 backend tests + tsc/oxlint/build gates

## Document Map

```
AGENTS.md (workflow guide)
  +-- master-backlog.md ? YOU ARE HERE (single backlog)
        +-- PRD.md (product requirements � what to build)
        +-- analysis/ (historical target-vs-BHMS analysis � superseded by Part 2 sequence)
        +-- business-rules.md (domain rules)
        +-- data-model.md (schema reference)
        +-- api-design.md (API standards)
        +-- ../lessons-learned.md (retrospectives � read BEFORE starting)
```

### Agent Startup Sequence

Before ANY task:
1. Read `AGENTS.md` � workflow, roles, DoD
2. Read `version-manifest.json` � version compatibility
3. Read `master-backlog.md` � find next requirement (Part 2 sequence), check cross-references
4. Read `lessons-learned.md` � avoid past mistakes
5. Read referenced source files � understand requirements
6. Write tests (TDD) � green before implementation
7. Implement � zero breaking changes
8. Seed data � add demo data
9. Run full test suite � verify no regressions
10. Update `lessons-learned.md` � document what was learned

---

## Part 1: Product Backlog (US Stories)

Original 116-story backlog across 14 epics. Every requirement's live status and the workflow-ordered execution sequence live in Part 2.

# Product Backlog
# BHMS - Buying House Management System

---

| Field | Value |
|-------|-------|
| Document Title | Product Backlog |
| Version | 1.0 |
| Last Updated | 2024-01-15 |
| Sprint Duration | 2 weeks |
| Velocity (Est.) | 40-50 points/sprint |

---

## Table of Contents

1. [Epic Overview](#1-epic-overview)
2. [Epic 1: Project Foundation](#2-epic-1-project-foundation)
3. [Epic 2: Authentication & Authorization](#3-epic-2-authentication--authorization)
4. [Epic 3: Setup & Master Data](#4-epic-3-setup--master-data)
5. [Epic 4: Style Management](#5-epic-4-style-management)
6. [Epic 5: File Opening](#6-epic-5-file-opening)
7. [Epic 6: Purchase Order](#7-epic-6-purchase-order)
8. [Epic 7: T&A Management](#8-epic-7-ta-management)
9. [Epic 8: Costing](#9-epic-8-costing)
10. [Epic 9: Commercial & LC](#10-epic-9-commercial--lc)
11. [Epic 10: Production](#11-epic-10-production)
12. [Epic 11: Quality](#12-epic-11-quality)
13. [Epic 12: Logistics](#13-epic-12-logistics)
14. [Epic 13: Reporting & Dashboard](#14-epic-13-reporting--dashboard)
15. [Sprint Planning](#15-sprint-planning)
16. [Story Points Guide](#16-story-points-guide)

---

## 1. Epic Overview

| Epic | Name | Priority | Stories | Total Points | Sprint |
|------|------|----------|---------|--------------|--------|
| E1 | Project Foundation | Must Have | 8 | 34 | S0 |
| E2 | Authentication & Authorization | Must Have | 10 | 42 | S1 |
| E3 | Setup & Master Data | Must Have | 12 | 48 | S1-S2 |
| E4 | Style Management | Must Have | 8 | 36 | S2 |
| E5 | File Opening | Must Have | 6 | 28 | S3 |
| E6 | Purchase Order | Must Have | 10 | 48 | S3-S4 |
| E7 | T&A Management | Must Have | 8 | 38 | S4 |
| E8 | Costing | Should Have | 8 | 36 | S5 |
| E9 | Commercial & LC | Must Have | 10 | 44 | S5-S6 |
| E10 | Production | Should Have | 8 | 34 | S6-S7 |
| E11 | Quality | Should Have | 6 | 26 | S7 |
| E12 | Logistics | Should Have | 8 | 34 | S8 |
| E13 | Reporting & Dashboard | Could Have | 10 | 40 | S8-S9 |
| E14 | Foundation Requirements | Must Have | 4 | 14 | S0 |
| **Total** | | | **116** | **492** | |

---

## 2. Epic 1: Project Foundation

### E1.1 Django Project Setup

| Field | Value |
|-------|-------|
| **Story ID** | US-001 |
| **Title** | Django Project Scaffolding |
| **Priority** | Must Have |
| **Story Points** | 5 |
| **Sprint** | S0 |

**As a** developer
**I want** a properly configured Django project
**So that** I can start building features

**Acceptance Criteria:**
- [ ] Django project created with DRF
- [ ] Project structure follows clean architecture
- [ ] Settings configured for development
- [ ] Environment variables setup
- [ ] Requirements file created

**Tasks:**
| Task | Hours | Assignee |
|------|-------|----------|
| Create Django project | 2 | Developer |
| Configure DRF | 2 | Developer |
| Setup environment config | 1 | Developer |
| Create project structure | 2 | Developer |
| Setup logging | 1 | Developer |

---

### E1.2 Database Setup

| Field | Value |
|-------|-------|
| **Story ID** | US-002 |
| **Title** | PostgreSQL Database Configuration |
| **Priority** | Must Have |
| **Story Points** | 3 |
| **Sprint** | S0 |

**As a** developer
**I want** PostgreSQL database configured
**So that** I can store application data

**Acceptance Criteria:**
- [ ] PostgreSQL installed locally
- [ ] Database created for development
- [ ] Django settings configured
- [ ] Connection pooling setup
- [ ] Database migrations work

**Tasks:**
| Task | Hours | Assignee |
|------|-------|----------|
| Install PostgreSQL | 1 | Developer |
| Create dev database | 1 | Developer |
| Configure Django settings | 1 | Developer |
| Test connection | 1 | Developer |

---

### E1.3 Redis & Celery Setup

| Field | Value |
|-------|-------|
| **Story ID** | US-003 |
| **Title** | Redis & Celery Configuration |
| **Priority** | Must Have |
| **Story Points** | 3 |
| **Sprint** | S0 |

**As a** developer
**I want** Redis and Celery configured
**So that** I can handle caching and async tasks

**Acceptance Criteria:**
- [ ] Redis installed locally
- [ ] Celery configured
- [ ] Cache backend working
- [ ] Task queue functional
- [ ] Periodic tasks support

**Tasks:**
| Task | Hours | Assignee |
|------|-------|----------|
| Install Redis | 1 | Developer |
| Configure Celery | 2 | Developer |
| Setup cache backend | 1 | Developer |
| Test async tasks | 1 | Developer |

---

### E1.4 Git Repository

| Field | Value |
|-------|-------|
| **Story ID** | US-004 |
| **Title** | Git Repository Setup |
| **Priority** | Must Have |
| **Story Points** | 2 |
| **Sprint** | S0 |

**As a** developer
**I want** Git repository configured
**So that** I can version control code

**Acceptance Criteria:**
- [ ] GitHub repository created
- [ ] .gitignore configured
- [ ] README created
- [ ] Branch strategy defined
- [ ] Initial commit made

**Tasks:**
| Task | Hours | Assignee |
|------|-------|----------|
| Create GitHub repo | 0.5 | Developer |
| Configure .gitignore | 0.5 | Developer |
| Create README | 1 | Developer |
| Initial commit | 0.5 | Developer |

---

### E1.5 Linting & Code Quality

| Field | Value |
|-------|-------|
| **Story ID** | US-005 |
| **Title** | Code Quality Tools Setup |
| **Priority** | Must Have |
| **Story Points** | 2 |
| **Sprint** | S0 |

**As a** developer
**I want** linting and formatting tools configured
**So that** code quality is maintained

**Acceptance Criteria:**
- [ ] Ruff configured
- [ ] Black configured
- [ ] isort configured
- [ ] Pre-commit hooks setup
- [ ] VS Code settings shared

**Tasks:**
| Task | Hours | Assignee |
|------|-------|----------|
| Configure Ruff | 0.5 | Developer |
| Configure Black | 0.5 | Developer |
| Setup pre-commit | 1 | Developer |
| Create VS Code settings | 0.5 | Developer |

---

### E1.6 Multi-Tenancy Architecture

| Field | Value |
|-------|-------|
| **Story ID** | US-006 |
| **Title** | Multi-Tenancy Foundation |
| **Priority** | Must Have |
| **Story Points** | 8 |
| **Sprint** | S0 |

**As a** system
**I want** multi-tenancy architecture
**So that** multiple companies can use the system

**Acceptance Criteria:**
- [ ] Tenant model created
- [ ] Tenant middleware implemented
- [ ] Tenant context automatically set
- [ ] Database schema isolation
- [ ] Tenant data filtering works

**Tasks:**
| Task | Hours | Assignee |
|------|-------|----------|
| Create Tenant model | 2 | Developer |
| Implement middleware | 3 | Developer |
| Create tenant context | 2 | Developer |
| Test tenant isolation | 2 | Developer |

---

### E1.7 API Foundation

| Field | Value |
|-------|-------|
| **Story ID** | US-007 |
| **Title** | DRF API Foundation |
| **Priority** | Must Have |
| **Story Points** | 5 |
| **Sprint** | S0 |

**As a** developer
**I want** DRF API foundation setup
**So that** I can build REST APIs

**Acceptance Criteria:**
- [ ] DRF configured
- [ ] API versioning setup (/api/v1/)
- [ ] Pagination configured
- [ ] Filtering configured
- [ ] API documentation (Swagger)

**Tasks:**
| Task | Hours | Assignee |
|------|-------|----------|
| Configure DRF | 2 | Developer |
| Setup API versioning | 1 | Developer |
| Configure pagination | 1 | Developer |
| Setup Swagger | 1 | Developer |

---

### E1.8 Health Check & Monitoring

| Field | Value |
|-------|-------|
| **Story ID** | US-008 |
| **Title** | Health Check Endpoints |
| **Priority** | Should Have |
| **Story Points** | 3 |
| **Sprint** | S0 |

**As a** developer
**I want** health check endpoints
**So that** I can monitor application status

**Acceptance Criteria:**
- [ ] Health check endpoint (/health/)
- [ ] Database health check
- [ ] Redis health check
- [ ] Celery health check
- [ ] Readiness probe

**Tasks:**
| Task | Hours | Assignee |
|------|-------|----------|
| Create health check view | 2 | Developer |
| Add DB health check | 1 | Developer |
| Add Redis health check | 1 | Developer |
| Test endpoints | 1 | Developer |

---

## 3. Epic 2: Authentication & Authorization

### E2.1 User Registration

| Field | Value |
|-------|-------|
| **Story ID** | US-009 |
| **Title** | User Registration |
| **Priority** | Must Have |
| **Story Points** | 5 |
| **Sprint** | S1 |

**As a** admin
**I want** to create user accounts
**So that** employees can access the system

**Acceptance Criteria:**
- [ ] User creation endpoint
- [ ] Email validation
- [ ] Password policy enforcement
- [ ] Welcome email sent
- [ ] User activation flow

---

### E2.2 User Login

| Field | Value |
|-------|-------|
| **Story ID** | US-010 |
| **Title** | User Login with JWT |
| **Priority** | Must Have |
| **Story Points** | 5 |
| **Sprint** | S1 |

**As a** user
**I want** to login with email/password
**So that** I can access the system

**Acceptance Criteria:**
- [ ] Login endpoint
- [ ] JWT token generation
- [ ] Refresh token support
- [ ] Token expiration
- [ ] Login audit trail

---

### E2.3 Multi-Factor Authentication

| Field | Value |
|-------|-------|
| **Story ID** | US-011 |
| **Title** | MFA Setup |
| **Priority** | Should Have |
| **Story Points** | 8 |
| **Sprint** | S1 |

**As a** user
**I want** to enable MFA
**So that** my account is more secure

**Acceptance Criteria:**
- [ ] TOTP setup
- [ ] QR code generation
- [ ] Backup codes
- [ ] MFA verification
- [ ] MFA reset flow

---

### E2.4 Password Management

| Field | Value |
|-------|-------|
| **Story ID** | US-012 |
| **Title** | Password Change & Reset |
| **Priority** | Must Have |
| **Story Points** | 5 |
| **Sprint** | S1 |

**As a** user
**I want** to change/reset my password
**So that** I can maintain account security

**Acceptance Criteria:**
- [ ] Password change endpoint
- [ ] Current password verification
- [ ] Password reset via email
- [ ] Reset token expiration
- [ ] Password history (last 5)

---

### E2.5 Role Management

| Field | Value |
|-------|-------|
| **Story ID** | US-013 |
| **Title** | Role CRUD |
| **Priority** | Must Have |
| **Story Points** | 5 |
| **Sprint** | S1 |

**As a** admin
**I want** to manage roles
**So that** I can control access permissions

**Acceptance Criteria:**
- [ ] Role list/create/update/delete
- [ ] Role assignment to users
- [ ] System roles (Admin, Manager, User)
- [ ] Custom role creation
- [ ] Role description

---

### E2.6 Permission Management

| Field | Value |
|-------|-------|
| **Story ID** | US-014 |
| **Title** | Permission System |
| **Priority** | Must Have |
| **Story Points** | 8 |
| **Sprint** | S1 |

**As a** admin
**I want** granular permissions
**So that** I can control what users can do

**Acceptance Criteria:**
- [ ] Module-level permissions
- [ ] Action-level permissions (CRUD)
- [ ] Permission assignment to roles
- [ ] Permission checking decorator
- [ ] Field-level permissions (Phase 2)

---

### E2.7 User Profile

| Field | Value |
|-------|-------|
| **Story ID** | US-015 |
| **Title** | User Profile Management |
| **Priority** | Should Have |
| **Story Points** | 3 |
| **Sprint** | S1 |

**As a** user
**I want** to manage my profile
**So that** my information is up to date

**Acceptance Criteria:**
- [ ] View profile
- [ ] Update profile
- [ ] Upload avatar
- [ ] Change language preference
- [ ] Notification settings

---

### E2.8 Session Management

| Field | Value |
|-------|-------|
| **Story ID** | US-016 |
| **Title** | Session Management |
| **Priority** | Should Have |
| **Story Points** | 3 |
| **Sprint** | S1 |

**As a** admin
**I want** to manage user sessions
**So that** I can control access

**Acceptance Criteria:**
- [ ] Active sessions list
- [ ] Session termination
- [ ] Concurrent session limit
- [ ] Session timeout (30 min)
- [ ] Remember me option

---

### E2.9 Audit Logging

| Field | Value |
|-------|-------|
| **Story ID** | US-017 |
| **Title** | Audit Trail |
| **Priority** | Must Have |
| **Story Points** | 5 |
| **Sprint** | S1 |

**As a** admin
**I want** to track all changes
**So that** I can maintain compliance

**Acceptance Criteria:**
- [ ] Log all CRUD operations
- [ ] Store old/new values
- [ ] Track user, IP, timestamp
- [ ] Audit log viewing
- [ ] Export audit logs

---

### E2.10 Login Page UI

| Field | Value |
|-------|-------|
| **Story ID** | US-018 |
| **Title** | Login Page Design |
| **Priority** | Must Have |
| **Story Points** | 3 |
| **Sprint** | S1 |

**As a** user
**I want** a clean login page
**So that** I can easily access the system

**Acceptance Criteria:**
- [ ] Responsive design
- [ ] Company logo
- [ ] Email/password fields
- [ ] Remember me checkbox
- [ ] Forgot password link

---

## 4. Epic 3: Setup & Master Data

### E3.1 Tenant Setup

| Field | Value |
|-------|-------|
| **Story ID** | US-019 |
| **Title** | Tenant Company Setup |
| **Priority** | Must Have |
| **Story Points** | 5 |
| **Sprint** | S2 |

**As a** admin
**I want** to configure my company
**So that** the system reflects my organization

**Acceptance Criteria:**
- [ ] Company information form
- [ ] Logo upload
- [ ] Address management
- [ ] Contact information
- [ ] Timezone settings

---

### E3.2 Office Management

| Field | Value |
|-------|-------|
| **Story ID** | US-020 |
| **Title** | Office & Location Setup |
| **Priority** | Must Have |
| **Story Points** | 5 |
| **Sprint** | S2 |

**As a** admin
**I want** to manage offices
**So that** I can track multiple locations

**Acceptance Criteria:**
- [ ] Office list/create/update
- [ ] Office types (HQ, Branch)
- [ ] Address management
- [ ] Contact information
- [ ] Office status

---

### E3.3 Department Management

| Field | Value |
|-------|-------|
| **Story ID** | US-021 |
| **Title** | Department Setup |
| **Priority** | Must Have |
| **Story Points** | 3 |
| **Sprint** | S2 |

**As a** admin
**I want** to manage departments
**So that** I can organize employees

**Acceptance Criteria:**
- [ ] Department list/create/update
- [ ] Department hierarchy
- [ ] Department codes
- [ ] Department status
- [ ] Department description

---

### E3.4 Designation Management

| Field | Value |
|-------|-------|
| **Story ID** | US-022 |
| **Title** | Designation Setup |
| **Priority** | Must Have |
| **Story Points** | 3 |
| **Sprint** | S2 |

**As a** admin
**I want** to manage designations
**So that** I can define job titles

**Acceptance Criteria:**
- [ ] Designation list/create/update
- [ ] Designation codes
- [ ] Designation status
- [ ] Designation description
- [ ] linked to departments

---

### E3.5 Season Master

| Field | Value |
|-------|-------|
| **Story ID** | US-023 |
| **Title** | Season Master Data |
| **Priority** | Must Have |
| **Story Points** | 2 |
| **Sprint** | S2 |

**As a** admin
**I want** to manage seasons
**So that** I can track seasonal collections

**Acceptance Criteria:**
- [ ] Season list/create/update
- [ ] Season codes
- [ ] Season dates
- [ ] Season status
- [ ] Season description

---

### E3.6 Product Category Master

| Field | Value |
|-------|-------|
| **Story ID** | US-024 |
| **Title** | Product Category Setup |
| **Priority** | Must Have |
| **Story Points** | 3 |
| **Sprint** | S2 |

**As a** admin
**I want** to manage product categories
**So that** I can classify products

**Acceptance Criteria:**
- [ ] Category list/create/update
- [ ] Category hierarchy
- [ ] Category codes
- [ ] Category status
- [ ] Category description

---

### E3.7 Product Type Master

| Field | Value |
|-------|-------|
| **Story ID** | US-025 |
| **Title** | Product Type Setup |
| **Priority** | Must Have |
| **Story Points** | 2 |
| **Sprint** | S2 |

**As a** admin
**I want** to manage product types
**So that** I can further classify products

**Acceptance Criteria:**
- [ ] Type list/create/update
- [ ] Type linked to category
- [ ] Type codes
- [ ] Type status
- [ ] Type description

---

### E3.8 Currency Master

| Field | Value |
|-------|-------|
| **Story ID** | US-026 |
| **Title** | Currency Setup |
| **Priority** | Must Have |
| **Story Points** | 2 |
| **Sprint** | S2 |

**As a** admin
**I want** to manage currencies
**So that** I can handle multi-currency transactions

**Acceptance Criteria:**
- [ ] Currency list/create/update
- [ ] Currency codes (USD, BDT, EUR)
- [ ] Exchange rates
- [ ] Default currency
- [ ] Currency status

---

### E3.9 Payment Terms Master

| Field | Value |
|-------|-------|
| **Story ID** | US-027 |
| **Title** | Payment Terms Setup |
| **Priority** | Must Have |
| **Story Points** | 2 |
| **Sprint** | S2 |

**As a** admin
**I want** to manage payment terms
**So that** I can define payment conditions

**Acceptance Criteria:**
- [ ] Payment terms list/create/update
- [ ] Terms codes
- [ ] Payment days
- [ ] Terms description
- [ ] Terms status

---

### E3.10 UOM Master

| Field | Value |
|-------|-------|
| **Story ID** | US-028 |
| **Title** | Unit of Measurement Setup |
| **Priority** | Must Have |
| **Story Points** | 2 |
| **Sprint** | S2 |

**As a** admin
**I want** to manage UOMs
**So that** I can standardize measurements

**Acceptance Criteria:**
- [ ] UOM list/create/update
- [ ] UOM codes (PCS, YDS, MTR)
- [ ] UOM names
- [ ] UOM status
- [ ] UOM description

---

### E3.11 Country Master

| Field | Value |
|-------|-------|
| **Story ID** | US-029 |
| **Title** | Country Setup |
| **Priority** | Must Have |
| **Story Points** | 2 |
| **Sprint** | S2 |

**As a** admin
**I want** to manage countries
**So that** I can track locations

**Acceptance Criteria:**
- [ ] Country list/create/update
- [ ] Country codes (ISO)
- [ ] Country names
- [ ] Default currency
- [ ] Country status

---

### E3.12 Color Code Master

| Field | Value |
|-------|-------|
| **Story ID** | US-030 |
| **Title** | Color Code Setup |
| **Priority** | Should Have |
| **Story Points** | 2 |
| **Sprint** | S2 |

**As a** admin
**I want** to manage color codes
**So that** I can use consistent colors

**Acceptance Criteria:**
- [ ] Color list/create/update
- [ ] Color codes
- [ ] Hex codes
- [ ] Color status
- [ ] Status color mapping

---

## 5. Epic 4: Style Management

### E4.1 Style CRUD

| Field | Value |
|-------|-------|
| **Story ID** | US-031 |
| **Title** | Style Management |
| **Priority** | Must Have |
| **Story Points** | 8 |
| **Sprint** | S3 |

**As a** merchandiser
**I want** to manage styles
**So that** I can track product designs

**Acceptance Criteria:**
- [ ] Style list with filters
- [ ] Style create/edit form
- [ ] Style number auto-generation
- [ ] Style status management
- [ ] Style search

---

### E4.2 Style Versioning

| Field | Value |
|-------|-------|
| **Story ID** | US-032 |
| **Title** | Style Version Control |
| **Priority** | Must Have |
| **Story Points** | 5 |
| **Sprint** | S3 |

**As a** merchandiser
**I want** to version styles
**So that** I can track design evolution

**Acceptance Criteria:**
- [ ] Version list per style
- [ ] Create new version
- [ ] Version notes
- [ ] Version comparison
- [ ] Current version tracking

---

### E4.3 Style Attributes

| Field | Value |
|-------|-------|
| **Story ID** | US-033 |
| **Title** | Style Classification |
| **Priority** | Must Have |
| **Story Points** | 3 |
| **Sprint** | S3 |

**As a** merchandiser
**I want** to classify styles
**So that** I can organize products

**Acceptance Criteria:**
- [ ] Buyer assignment
- [ ] Brand assignment
- [ ] Category assignment
- [ ] Type assignment
- [ ] Season assignment

---

### E4.4 Tech Pack Management

| Field | Value |
|-------|-------|
| **Story ID** | US-034 |
| **Title** | Tech Pack Upload |
| **Priority** | Should Have |
| **Story Points** | 5 |
| **Sprint** | S3 |

**As a** merchandiser
**I want** to upload tech packs
**So that** I can store design documents

**Acceptance Criteria:**
- [ ] File upload (PDF, images)
- [ ] Version tracking
- [ ] File preview
- [ ] Download capability
- [ ] File history

---

### E4.5 BOM Management

| Field | Value |
|-------|-------|
| **Story ID** | US-035 |
| **Title** | Bill of Materials |
| **Priority** | Must Have |
| **Story Points** | 8 |
| **Sprint** | S3 |

**As a** merchandiser
**I want** to manage BOMs
**So that** I can track material requirements

**Acceptance Criteria:**
- [ ] BOM list/create/update
- [ ] BOM items (fabric, trim, accessory)
- [ ] Consumption calculation
- [ ] Waste percentage
- [ ] BOM versioning

---

### E4.6 Style Approval

| Field | Value |
|-------|-------|
| **Story ID** | US-036 |
| **Title** | Style Approval Workflow |
| **Priority** | Should Have |
| **Story Points** | 5 |
| **Sprint** | S3 |

**As a** manager
**I want** to approve styles
**So that** quality is maintained

**Acceptance Criteria:**
- [ ] Submit for approval
- [ ] Approve/reject
- [ ] Comments
- [ ] Email notification
- [ ] Status tracking

---

### E4.7 Style List UI

| Field | Value |
|-------|-------|
| **Story ID** | US-037 |
| **Title** | Style List Page |
| **Priority** | Must Have |
| **Story Points** | 3 |
| **Sprint** | S3 |

**As a** merchandiser
**I want** a style list page
**So that** I can view all styles

**Acceptance Criteria:**
- [ ] Responsive table
- [ ] Filters (buyer, season, status)
- [ ] Sort columns
- [ ] Pagination
- [ ] Quick actions

---

### E4.8 Style Detail UI

| Field | Value |
|-------|-------|
| **Story ID** | US-038 |
| **Title** | Style Detail Page |
| **Priority** | Must Have |
| **Story Points** | 3 |
| **Sprint** | S3 |

**As a** merchandiser
**I want** a style detail page
**So that** I can view style information

**Acceptance Criteria:**
- [ ] Style information
- [ ] Version history
- [ ] Related file openings
- [ ] Quick actions
- [ ] BOM summary

---

## 6. Epic 5: File Opening

### E5.1 File Opening CRUD

| Field | Value |
|-------|-------|
| **Story ID** | US-039 |
| **Title** | File Opening Management |
| **Priority** | Must Have |
| **Story Points** | 5 |
| **Sprint** | S4 |

**As a** merchandiser
**I want** to manage file openings
**So that** I can track order processing

**Acceptance Criteria:**
- [ ] File list/create/update
- [ ] File number auto-generation
- [ ] Link to style version
- [ ] Buyer/factory assignment
- [ ] File status management

---

### E5.2 File Opening Form

| Field | Value |
|-------|-------|
| **Story ID** | US-040 |
| **Title** | File Opening Form |
| **Priority** | Must Have |
| **Story Points** | 3 |
| **Sprint** | S4 |

**As a** merchandiser
**I want** a file opening form
**So that** I can create new files

**Acceptance Criteria:**
- [ ] Style selection
- [ ] Version selection
- [ ] Buyer auto-fill
- [ ] Factory selection
- [ ] Validation

---

### E5.3 File Opening List

| Field | Value |
|-------|-------|
| **Story ID** | US-041 |
| **Title** | File Opening List |
| **Priority** | Must Have |
| **Story Points** | 3 |
| **Sprint** | S4 |

**As a** merchandiser
**I want** a file opening list
**So that** I can view all files

**Acceptance Criteria:**
- [ ] Filterable table
- [ ] Status filters
- [ ] Search by file number
- [ ] Quick actions
- [ ] Pagination

---

### E5.4 File Opening Detail

| Field | Value |
|-------|-------|
| **Story ID** | US-042 |
| **Title** | File Opening Detail |
| **Priority** | Must Have |
| **Story Points** | 3 |
| **Sprint** | S4 |

**As a** merchandiser
**I want** a file detail page
**So that** I can view file information

**Acceptance Criteria:**
- [ ] File information
- [ ] Linked style/version
- [ ] Related POs
- [ ] Status history
- [ ] Quick actions

---

### E5.5 File Opening Status

| Field | Value |
|-------|-------|
| **Story ID** | US-043 |
| **Title** | File Status Management |
| **Priority** | Must Have |
| **Story Points** | 3 |
| **Sprint** | S4 |

**As a** merchandiser
**I want** to manage file status
**So that** I can track progress

**Acceptance Criteria:**
- [ ] Status transitions
- [ ] Status validation
- [ ] Status history
- [ ] Status notifications
- [ ] Status dashboard

---

### E5.6 File Opening Actions

| Field | Value |
|-------|-------|
| **Story ID** | US-044 |
| **Title** | File Actions |
| **Priority** | Should Have |
| **Story Points** | 3 |
| **Sprint** | S4 |

**As a** merchandiser
**I want** to perform file actions
**So that** I can manage files efficiently

**Acceptance Criteria:**
- [ ] Duplicate file
- [ ] Close file
- [ ] Cancel file
- [ ] Add notes
- [ ] Export file

---

## 7. Epic 6: Purchase Order

### E6.1 PO CRUD

| Field | Value |
|-------|-------|
| **Story ID** | US-045 |
| **Title** | Purchase Order Management |
| **Priority** | Must Have |
| **Story Points** | 8 |
| **Sprint** | S4-S5 |

**As a** merchandiser
**I want** to manage purchase orders
**So that** I can track orders

**Acceptance Criteria:**
- [ ] PO list/create/update
- [ ] PO number auto-generation
- [ ] Link to file opening
- [ ] Multiple POs per file
- [ ] PO status management

---

### E6.2 PO Form

| Field | Value |
|-------|-------|
| **Story ID** | US-046 |
| **Title** | PO Creation Form |
| **Priority** | Must Have |
| **Story Points** | 5 |
| **Sprint** | S5 |

**As a** merchandiser
**I want** a PO creation form
**So that** I can create new POs

**Acceptance Criteria:**
- [ ] File opening selection
- [ ] Destination fields
- [ ] Quantity/price fields
- [ ] Delivery date
- [ ] Currency/payment terms

---

### E6.3 PO Items

| Field | Value |
|-------|-------|
| **Story ID** | US-047 |
| **Title** | PO Line Items |
| **Priority** | Must Have |
| **Story Points** | 5 |
| **Sprint** | S5 |

**As a** merchandiser
**I want** to manage PO items
**So that** I can track colors/sizes

**Acceptance Criteria:**
- [ ] Add/remove items
- [ ] Color selection
- [ ] Size entry
- [ ] Quantity per item
- [ ] Price per item

---

### E6.4 PO List

| Field | Value |
|-------|-------|
| **Story ID** | US-048 |
| **Title** | PO List Page |
| **Priority** | Must Have |
| **Story Points** | 3 |
| **Sprint** | S5 |

**As a** merchandiser
**I want** a PO list page
**So that** I can view all POs

**Acceptance Criteria:**
- [ ] Filterable table
- [ ] Status filters
- [ ] Date range filter
- [ ] Search
- [ ] Export

---

### E6.5 PO Detail

| Field | Value |
|-------|-------|
| **Story ID** | US-049 |
| **Title** | PO Detail Page |
| **Priority** | Must Have |
| **Story Points** | 3 |
| **Sprint** | S5 |

**As a** merchandiser
**I want** a PO detail page
**So that** I can view PO information

**Acceptance Criteria:**
- [ ] PO information
- [ ] Line items
- [ ] Status history
- [ ] Related documents
- [ ] Quick actions

---

### E6.6 PO Status

| Field | Value |
|-------|-------|
| **Story ID** | US-050 |
| **Title** | PO Status Management |
| **Priority** | Must Have |
| **Story Points** | 3 |
| **Sprint** | S5 |

**As a** merchandiser
**I want** to manage PO status
**So that** I can track progress

**Acceptance Criteria:**
- [ ] Status transitions
- [ ] Status validation
- [ ] Status history
- [ ] Notifications
- [ ] Dashboard

---

### E6.7 PO Amendment

| Field | Value |
|-------|-------|
| **Story ID** | US-051 |
| **Title** | PO Amendment |
| **Priority** | Must Have |
| **Story Points** | 5 |
| **Sprint** | S5 |

**As a** merchandiser
**I want** to amend POs
**So that** I can handle changes

**Acceptance Criteria:**
- [ ] Amendment request
- [ ] Reason documentation
- [ ] Approval workflow
- [ ] Amendment history
- [ ] Audit trail

---

### E6.8 PO Approval

| Field | Value |
|-------|-------|
| **Story ID** | US-052 |
| **Title** | PO Approval Workflow |
| **Priority** | Should Have |
| **Story Points** | 5 |
| **Sprint** | S5 |

**As a** manager
**I want** to approve POs
**So that** I can control orders

**Acceptance Criteria:**
- [ ] Submit for approval
- [ ] Approve/reject
- [ ] Comments
- [ ] Email notification
- [ ] Status tracking

---

### E6.9 PO Import

| Field | Value |
|-------|-------|
| **Story ID** | US-053 |
| **Title** | PO Bulk Import |
| **Priority** | Could Have |
| **Story Points** | 5 |
| **Sprint** | S5 |

**As a** merchandiser
**I want** to import POs
**So that** I can save time

**Acceptance Criteria:**
- [ ] CSV upload
- [ ] Template download
- [ ] Validation
- [ ] Error reporting
- [ ] Import summary

---

### E6.10 PO Export

| Field | Value |
|-------|-------|
| **Story ID** | US-054 |
| **Title** | PO Export |
| **Priority** | Should Have |
| **Story Points** | 3 |
| **Sprint** | S5 |

**As a** merchandiser
**I want** to export POs
**So that** I can share data

**Acceptance Criteria:**
- [ ] Excel export
- [ ] PDF export
- [ ] Filtered export
- [ ] Custom columns
- [ ] Download

---

## 8. Epic 7: T&A Management

### E7.1 T&A Generation

| Field | Value |
|-------|-------|
| **Story ID** | US-055 |
| **Title** | T&A Auto-Generation |
| **Priority** | Must Have |
| **Story Points** | 5 |
| **Sprint** | S5-S6 |

**As a** merchandiser
**I want** T&A generated from PO
**So that** I can plan delivery

**Acceptance Criteria:**
- [ ] Auto-generate from PO
- [ ] Default milestones
- [ ] Date calculation
- [ ] Critical path
- [ ] Milestone templates

---

### E7.2 T&A Milestones

| Field | Value |
|-------|-------|
| **Story ID** | US-056 |
| **Title** | T&A Milestone Management |
| **Priority** | Must Have |
| **Story Points** | 5 |
| **Sprint** | S6 |

**As a** merchandiser
**I want** to manage milestones
**So that** I can track progress

**Acceptance Criteria:**
- [ ] Add/remove milestones
- [ ] Set dates
- [ ] Assign owners
- [ ] Mark complete
- [ ] Milestone dependencies

---

### E7.3 T&A Calendar

| Field | Value |
|-------|-------|
| **Story ID** | US-057 |
| **Title** | T&A Calendar View |
| **Priority** | Should Have |
| **Story Points** | 5 |
| **Sprint** | S6 |

**As a** merchandiser
**I want** a calendar view
**So that** I can visualize timeline

**Acceptance Criteria:**
- [ ] Calendar display
- [ ] Milestone markers
- [ ] Color coding
- [ ] Filter by PO/style
- [ ] Print view

---

### E7.4 T&A Alerts

| Field | Value |
|-------|-------|
| **Story ID** | US-058 |
| **Title** | T&A Alert System |
| **Priority** | Must Have |
| **Story Points** | 5 |
| **Sprint** | S6 |

**As a** merchandiser
**I want** T&A alerts
**So that** I don't miss deadlines

**Acceptance Criteria:**
- [ ] 3-day reminder
- [ ] Due date alert
- [ ] Overdue escalation
- [ ] Email notifications
- [ ] Dashboard alerts

---

### E7.5 T&A Progress

| Field | Value |
|-------|-------|
| **Story ID** | US-059 |
| **Title** | T&A Progress Tracking |
| **Priority** | Must Have |
| **Story Points** | 3 |
| **Sprint** | S6 |

**As a** merchandiser
**I want** to track T&A progress
**So that** I can monitor delivery

**Acceptance Criteria:**
- [ ] Progress percentage
- [ ] On-track indicator
- [ ] Delayed indicator
- [ ] Progress chart
- [ ] Status summary

---

### E7.6 T&A List

| Field | Value |
|-------|-------|
| **Story ID** | US-060 |
| **Title** | T&A List Page |
| **Priority** | Must Have |
| **Story Points** | 3 |
| **Sprint** | S6 |

**As a** merchandiser
**I want** a T&A list
**So that** I can view all T&As

**Acceptance Criteria:**
- [ ] Filterable table
- [ ] Status filters
- [ ] Date filters
- [ ] Search
- [ ] Sort options

---

### E7.7 T&A Detail

| Field | Value |
|-------|-------|
| **Story ID** | US-061 |
| **Title** | T&A Detail Page |
| **Priority** | Must Have |
| **Story Points** | 3 |
| **Sprint** | S6 |

**As a** merchandiser
**I want** a T&A detail page
**So that** I can view T&A information

**Acceptance Criteria:**
- [ ] T&A information
- [ ] Milestone list
- [ ] Progress chart
- [ ] History
- [ ] Quick actions

---

### E7.8 T&A Heatmap

| Field | Value |
|-------|-------|
| **Story ID** | US-062 |
| **Title** | T&A Heatmap Dashboard |
| **Priority** | Could Have |
| **Story Points** | 5 |
| **Sprint** | S6 |

**As a** manager
**I want** a T&A heatmap
**So that** I can see critical areas

**Acceptance Criteria:**
- [ ] Color-coded view
- [ ] Delay highlighting
- [ ] Filter by buyer/factory
- [ ] Drill-down
- [ ] Print view

---

## 9. Epic 8: Costing

### E8.1 Costing CRUD

| Field | Value |
|-------|-------|
| **Story ID** | US-063 |
| **Title** | Costing Management |
| **Priority** | Should Have |
| **Story Points** | 8 |
| **Sprint** | S6-S7 |

**As a** merchandiser
**I want** to manage costings
**So that** I can track costs

**Acceptance Criteria:**
- [ ] Costing list/create/update
- [ ] Version control
- [ ] Status management
- [ ] Link to PO
- [ ] Cost breakdown

---

### E8.2 BOM-Based Costing

| Field | Value |
|-------|-------|
| **Story ID** | US-064 |
| **Title** | BOM-Based Costing |
| **Priority** | Should Have |
| **Story Points** | 5 |
| **Sprint** | S7 |

**As a** merchandiser
**I want** costing from BOM
**So that** I can calculate costs accurately

**Acceptance Criteria:**
- [ ] Import BOM items
- [ ] Calculate fabric cost
- [ ] Calculate trim cost
- [ ] Calculate CM cost
- [ ] Add overhead

---

### E8.3 Yield Calculation

| Field | Value |
|-------|-------|
| **Story ID** | US-065 |
| **Title** | Yield Calculation |
| **Priority** | Should Have |
| **Story Points** | 3 |
| **Sprint** | S7 |

**As a** merchandiser
**I want** yield calculation
**So that** I can estimate consumption

**Acceptance Criteria:**
- [ ] Fabric yield
- [ ] Trim yield
- [ ] Waste percentage
- [ ] Yield validation
- [ ] Yield history

---

### E8.4 Costing Approval

| Field | Value |
|-------|-------|
| **Story ID** | US-066 |
| **Title** | Costing Approval |
| **Priority** | Should Have |
| **Story Points** | 5 |
| **Sprint** | S7 |

**As a** manager
**I want** to approve costings
**So that** costs are controlled

**Acceptance Criteria:**
- [ ] Submit for approval
- [ ] Approve/reject
- [ ] Comments
- [ ] Email notification
- [ ] Status tracking

---

### E8.5 Costing Comparison

| Field | Value |
|-------|-------|
| **Story ID** | US-067 |
| **Title** | Costing Comparison |
| **Priority** | Could Have |
| **Story Points** | 5 |
| **Sprint** | S7 |

**As a** merchandiser
**I want** to compare costings
**So that** I can choose best option

**Acceptance Criteria:**
- [ ] Side-by-side comparison
- [ ] Version comparison
- [ ] Factory comparison
- [ ] Export comparison
- [ ] Highlight differences

---

### E8.6 Costing List

| Field | Value |
|-------|-------|
| **Story ID** | US-068 |
| **Title** | Costing List Page |
| **Priority** | Should Have |
| **Story Points** | 3 |
| **Sprint** | S7 |

**As a** merchandiser
**I want** a costing list
**So that** I can view all costings

**Acceptance Criteria:**
- [ ] Filterable table
- [ ] Status filters
- [ ] Search
- [ ] Sort options
- [ ] Export

---

### E8.7 Costing Detail

| Field | Value |
|-------|-------|
| **Story ID** | US-069 |
| **Title** | Costing Detail Page |
| **Priority** | Should Have |
| **Story Points** | 3 |
| **Sprint** | S7 |

**As a** merchandiser
**I want** a costing detail page
**So that** I can view costing information

**Acceptance Criteria:**
- [ ] Costing information
- [ ] Cost breakdown
- [ ] Version history
- [ ] Approval status
- [ ] Quick actions

---

### E8.8 Costing Print

| Field | Value |
|-------|-------|
| **Story ID** | US-070 |
| **Title** | Costing Print/Export |
| **Priority** | Could Have |
| **Story Points** | 3 |
| **Sprint** | S7 |

**As a** merchandiser
**I want** to print costings
**So that** I can share with buyers

**Acceptance Criteria:**
- [ ] PDF generation
- [ ] Custom template
- [ ] Company logo
- [ ] Cost breakdown
- [ ] Download

---

## 10. Epic 9: Commercial & LC

### E9.1 Master LC

| Field | Value |
|-------|-------|
| **Story ID** | US-071 |
| **Title** | Master LC Management |
| **Priority** | Must Have |
| **Story Points** | 8 |
| **Sprint** | S7-S8 |

**As a** commercial manager
**I want** to manage Master LCs
**So that** I can track buyer commitments

**Acceptance Criteria:**
- [ ] LC list/create/update
- [ ] LC number tracking
- [ ] Amount tracking
- [ ] Expiry management
- [ ] Status management

---

### E9.2 B2B LC

| Field | Value |
|-------|-------|
| **Story ID** | US-072 |
| **Title** | Back-to-Back LC |
| **Priority** | Must Have |
| **Story Points** | 5 |
| **Sprint** | S8 |

**As a** commercial manager
**I want** to create B2B LCs
**So that** I can issue to vendors

**Acceptance Criteria:**
- [ ] Link to Master LC
- [ ] Amount validation
- [ ] Expiry validation
- [ ] Utilization tracking
- [ ] Status management

---

### E9.3 LC Amendment

| Field | Value |
|-------|-------|
| **Story ID** | US-073 |
| **Title** | LC Amendment |
| **Priority** | Must Have |
| **Story Points** | 5 |
| **Sprint** | S8 |

**As a** commercial manager
**I want** to amend LCs
**So that** I can handle changes

**Acceptance Criteria:**
- [ ] Amendment request
- [ ] Amount change
- [ ] Expiry change
- [ ] Approval workflow
- [ ] Amendment history

---

### E9.4 LC Utilization

| Field | Value |
|-------|-------|
| **Story ID** | US-074 |
| **Title** | LC Utilization Tracking |
| **Priority** | Must Have |
| **Story Points** | 5 |
| **Sprint** | S8 |

**As a** commercial manager
**I want** to track LC utilization
**So that** I can manage exposure

**Acceptance Criteria:**
- [ ] Utilization calculation
- [ ] Balance tracking
- [ ] Over-utilization alert
- [ ] Under-utilization alert
- [ ] Utilization report

---

### E9.5 Proforma Invoice

| Field | Value |
|-------|-------|
| **Story ID** | US-075 |
| **Title** | PI Generation |
| **Priority** | Must Have |
| **Story Points** | 5 |
| **Sprint** | S8 |

**As a** commercial manager
**I want** to generate PIs
**So that** I can send to buyers

**Acceptance Criteria:**
- [ ] PI generation
- [ ] PDF export
- [ ] Email sending
- [ ] PI tracking
- [ ] Version control

---

### E9.6 Sales Contract

| Field | Value |
|-------|-------|
| **Story ID** | US-076 |
| **Title** | Sales Contract Management |
| **Priority** | Should Have |
| **Story Points** | 5 |
| **Sprint** | S8 |

**As a** commercial manager
**I want** to manage sales contracts
**So that** I can track agreements

**Acceptance Criteria:**
- [ ] Contract creation
- [ ] Terms management
- [ ] Approval workflow
- [ ] Contract tracking
- [ ] PDF export

---

### E9.7 Bank Management

| Field | Value |
|-------|-------|
| **Story ID** | US-077 |
| **Title** | Bank Setup |
| **Priority** | Should Have |
| **Story Points** | 3 |
| **Sprint** | S8 |

**As a** admin
**I want** to manage banks
**So that** I can track banking partners

**Acceptance Criteria:**
- [ ] Bank list/create/update
- [ ] SWIFT code
- [ ] Contact information
- [ ] Bank status
- [ ] Bank notes

---

### E9.8 LC List

| Field | Value |
|-------|-------|
| **Story ID** | US-078 |
| **Title** | LC List Page |
| **Priority** | Must Have |
| **Story Points** | 3 |
| **Sprint** | S8 |

**As a** commercial manager
**I want** an LC list
**So that** I can view all LCs

**Acceptance Criteria:**
- [ ] Filterable table
- [ ] Status filters
- [ ] Date filters
- [ ] Search
- [ ] Export

---

### E9.9 LC Detail

| Field | Value |
|-------|-------|
| **Story ID** | US-079 |
| **Title** | LC Detail Page |
| **Priority** | Must Have |
| **Story Points** | 3 |
| **Sprint** | S8 |

**As a** commercial manager
**I want** an LC detail page
**So that** I can view LC information

**Acceptance Criteria:**
- [ ] LC information
- [ ] Utilization details
- [ ] Amendment history
- [ ] Related documents
- [ ] Quick actions

---

### E9.10 LC Dashboard

| Field | Value |
|-------|-------|
| **Story ID** | US-080 |
| **Title** | LC Dashboard |
| **Priority** | Should Have |
| **Story Points** | 5 |
| **Sprint** | S8 |

**As a** commercial manager
**I want** an LC dashboard
**So that** I can see LC status

**Acceptance Criteria:**
- [ ] Total LC value
- [ ] Utilized amount
- [ ] Balance amount
- [ ] Expiring soon
- [ ] Alerts

---

## 11. Epic 10: Production

### E10.1 Production Planning

| Field | Value |
|-------|-------|
| **Story ID** | US-081 |
| **Title** | Production Planning |
| **Priority** | Should Have |
| **Story Points** | 5 |
| **Sprint** | S8-S9 |

**As a** production manager
**I want** to plan production
**So that** I can allocate resources

**Acceptance Criteria:**
- [ ] Plan creation
- [ ] Line assignment
- [ ] Date scheduling
- [ ] Quantity planning
- [ ] Status management

---

### E10.2 Daily Production

| Field | Value |
|-------|-------|
| **Story ID** | US-082 |
| **Title** | Daily Production Reporting |
| **Priority** | Should Have |
| **Story Points** | 5 |
| **Sprint** | S9 |

**As a** factory user
**I want** to report daily production
**So that** merchandisers have visibility

**Acceptance Criteria:**
- [ ] Daily report form
- [ ] Quantity entry
- [ ] Efficiency calculation
- [ ] DHU calculation
- [ ] Status update

---

### E10.3 Production Monitoring

| Field | Value |
|-------|-------|
| **Story ID** | US-083 |
| **Title** | Production Monitoring |
| **Priority** | Should Have |
| **Story Points** | 5 |
| **Sprint** | S9 |

**As a** production manager
**I want** to monitor production
**So that** I can identify issues

**Acceptance Criteria:**
- [ ] Real-time dashboard
- [ ] Efficiency tracking
- [ ] Target vs actual
- [ ] Alerts
- [ ] Reports

---

### E10.4 Line Performance

| Field | Value |
|-------|-------|
| **Story ID** | US-084 |
| **Title** | Line Performance Tracking |
| **Priority** | Should Have |
| **Story Points** | 3 |
| **Sprint** | S9 |

**As a** production manager
**I want** to track line performance
**So that** I can optimize

**Acceptance Criteria:**
- [ ] Line efficiency
- [ ] Line comparison
- [ ] Trend analysis
- [ ] Target tracking
- [ ] Reports

---

### E10.5 Production List

| Field | Value |
|-------|-------|
| **Story ID** | US-085 |
| **Title** | Production List Page |
| **Priority** | Should Have |
| **Story Points** | 3 |
| **Sprint** | S9 |

**As a** production manager
**I want** a production list
**So that** I can view all production

**Acceptance Criteria:**
- [ ] Filterable table
- [ ] Status filters
- [ ] Date filters
- [ ] Search
- [ ] Export

---

### E10.6 Production Detail

| Field | Value |
|-------|-------|
| **Story ID** | US-086 |
| **Title** | Production Detail Page |
| **Priority** | Should Have |
| **Story Points** | 3 |
| **Sprint** | S9 |

**As a** production manager
**I want** a production detail page
**So that** I can view production information

**Acceptance Criteria:**
- [ ] Production information
- [ ] Daily reports
- [ ] Efficiency chart
- [ ] Status history
- [ ] Quick actions

---

### E10.7 Factory Portal

| Field | Value |
|-------|-------|
| **Story ID** | US-087 |
| **Title** | Factory Reporting Portal |
| **Priority** | Could Have |
| **Story Points** | 8 |
| **Sprint** | S9 |

**As a** factory user
**I want** a reporting portal
**So that** I can submit reports

**Acceptance Criteria:**
- [ ] Simplified interface
- [ ] Daily report form
- [ ] Bulk entry
- [ ] History
- [ ] Mobile friendly

---

### E10.8 Production Dashboard

| Field | Value |
|-------|-------|
| **Story ID** | US-088 |
| **Title** | Production Dashboard |
| **Priority** | Should Have |
| **Story Points** | 5 |
| **Sprint** | S9 |

**As a** production manager
**I want** a production dashboard
**So that** I can see production status

**Acceptance Criteria:**
- [ ] Daily summary
- [ ] Efficiency metrics
- [ ] Target tracking
- [ ] Alerts
- [ ] Trends

---

## 12. Epic 11: Quality

### E11.1 Inspection Management

| Field | Value |
|-------|-------|
| **Story ID** | US-089 |
| **Title** | Quality Inspection |
| **Priority** | Should Have |
| **Story Points** | 5 |
| **Sprint** | S9-S10 |

**As a** QA manager
**I want** to manage inspections
**So that** quality is maintained

**Acceptance Criteria:**
- [ ] Inspection creation
- [ ] Type selection (Inline/Final)
- [ ] AQL level
- [ ] Sample size
- [ ] Status management

---

### E11.2 Defect Tracking

| Field | Value |
|-------|-------|
| **Story ID** | US-090 |
| **Title** | Defect Recording |
| **Priority** | Should Have |
| **Story Points** | 3 |
| **Sprint** | S10 |

**As a** QA manager
**I want** to record defects
**So that** I can track quality issues

**Acceptance Criteria:**
- [ ] Defect types
- [ ] Defect count
- [ ] Severity levels
- [ ] Image upload
- [ ] Comments

---

### E11.3 AQL Calculation

| Field | Value |
|-------|-------|
| **Story ID** | US-091 |
| **Title** | AQL Calculation |
| **Priority** | Should Have |
| **Story Points** | 3 |
| **Sprint** | S10 |

**As a** QA manager
**I want** AQL calculation
**So that** I can determine pass/fail

**Acceptance Criteria:**
- [ ] AQL tables
- [ ] Sample size calculation
- [ ] Accept/reject criteria
- [ ] Auto calculation
- [ ] Result display

---

### E11.4 Corrective Action

| Field | Value |
|-------|-------|
| **Story ID** | US-092 |
| **Title** | Corrective Action |
| **Priority** | Should Have |
| **Story Points** | 5 |
| **Sprint** | S10 |

**As a** QA manager
**I want** to track corrective actions
**So that** issues are resolved

**Acceptance Criteria:**
- [ ] Action creation
- [ ] Assignment
- [ ] Due date
- [ ] Status tracking
- [ ] Follow-up

---

### E11.5 Quality List

| Field | Value |
|-------|-------|
| **Story ID** | US-093 |
| **Title** | Quality List Page |
| **Priority** | Should Have |
| **Story Points** | 3 |
| **Sprint** | S10 |

**As a** QA manager
**I want** a quality list
**So that** I can view all inspections

**Acceptance Criteria:**
- [ ] Filterable table
- [ ] Status filters
- [ ] Date filters
- [ ] Search
- [ ] Export

---

### E11.6 Quality Dashboard

| Field | Value |
|-------|-------|
| **Story ID** | US-094 |
| **Title** | Quality Dashboard |
| **Priority** | Could Have |
| **Story Points** | 5 |
| **Sprint** | S10 |

**As a** QA manager
**I want** a quality dashboard
**So that** I can see quality status

**Acceptance Criteria:**
- [ ] Inspection summary
- [ ] Defect trends
- [ ] DHU tracking
- [ ] Alerts
- [ ] Reports

---

## 13. Epic 12: Logistics

### E12.1 Shipment Booking

| Field | Value |
|-------|-------|
| **Story ID** | US-095 |
| **Title** | Shipment Booking |
| **Priority** | Should Have |
| **Story Points** | 5 |
| **Sprint** | S10-S11 |

**As a** shipping manager
**I want** to book shipments
**So that** I can arrange delivery

**Acceptance Criteria:**
- [ ] Booking creation
- [ ] Freight forwarder selection
- [ ] Vessel details
- [ ] Container info
- [ ] Status management

---

### E12.2 Document Preparation

| Field | Value |
|-------|-------|
| **Story ID** | US-096 |
| **Title** | Shipping Documents |
| **Priority** | Should Have |
| **Story Points** | 5 |
| **Sprint** | S11 |

**As a** shipping manager
**I want** to prepare documents
**So that** shipment is cleared

**Acceptance Criteria:**
- [ ] Packing list
- [ ] Commercial invoice
- [ ] Certificate of origin
- [ ] PDF generation
- [ ] Document tracking

---

### E12.3 Container Tracking

| Field | Value |
|-------|-------|
| **Story ID** | US-097 |
| **Title** | Container Tracking |
| **Priority** | Should Have |
| **Story Points** | 3 |
| **Sprint** | S11 |

**As a** shipping manager
**I want** to track containers
**So that** I know shipment status

**Acceptance Criteria:**
- [ ] Container number
- [ ] ETD/ETA
- [ ] Status updates
- [ ] Location tracking
- [ ] Alerts

---

### E12.4 Shipment List

| Field | Value |
|-------|-------|
| **Story ID** | US-098 |
| **Title** | Shipment List Page |
| **Priority** | Should Have |
| **Story Points** | 3 |
| **Sprint** | S11 |

**As a** shipping manager
**I want** a shipment list
**So that** I can view all shipments

**Acceptance Criteria:**
- [ ] Filterable table
- [ ] Status filters
- [ ] Date filters
- [ ] Search
- [ ] Export

---

### E12.5 Shipment Detail

| Field | Value |
|-------|-------|
| **Story ID** | US-099 |
| **Title** | Shipment Detail Page |
| **Priority** | Should Have |
| **Story Points** | 3 |
| **Sprint** | S11 |

**As a** shipping manager
**I want** a shipment detail page
**So that** I can view shipment information

**Acceptance Criteria:**
- [ ] Shipment information
- [ ] Container details
- [ ] Documents
- [ ] Status history
- [ ] Quick actions

---

### E12.6 BL Management

| Field | Value |
|-------|-------|
| **Story ID** | US-100 |
| **Title** | Bill of Lading |
| **Priority** | Should Have |
| **Story Points** | 3 |
| **Sprint** | S11 |

**As a** shipping manager
**I want** to manage BLs
**So that** I can track ownership

**Acceptance Criteria:**
- [ ] BL creation
- [ ] BL number
- [ ] Shipper/consignee
- [ ] BL status
- [ ] PDF export

---

### E12.7 Freight Forwarder

| Field | Value |
|-------|-------|
| **Story ID** | US-101 |
| **Title** | Freight Forwarder Setup |
| **Priority** | Should Have |
| **Story Points** | 3 |
| **Sprint** | S11 |

**As a** admin
**I want** to manage freight forwarders
**So that** I can track shipping partners

**Acceptance Criteria:**
- [ ] Forwarder list/create/update
- [ ] Contact information
- [ ] Rates
- [ ] Performance tracking
- [ ] Status management

---

### E12.8 Shipment Dashboard

| Field | Value |
|-------|-------|
| **Story ID** | US-102 |
| **Title** | Shipment Dashboard |
| **Priority** | Could Have |
| **Story Points** | 5 |
| **Sprint** | S11 |

**As a** shipping manager
**I want** a shipment dashboard
**So that** I can see shipment status

**Acceptance Criteria:**
- [ ] Shipment summary
- [ ] ETD/ETA view
- [ ] Delayed shipments
- [ ] Alerts
- [ ] Trends

---

## 14. Epic 13: Reporting & Dashboard

### E13.1 Executive Dashboard

| Field | Value |
|-------|-------|
| **Story ID** | US-103 |
| **Title** | Executive Dashboard |
| **Priority** | Could Have |
| **Story Points** | 8 |
| **Sprint** | S11-S12 |

**As a** executive
**I want** an executive dashboard
**So that** I can see business overview

**Acceptance Criteria:**
- [ ] KPI summary
- [ ] Order status
- [ ] Shipment status
- [ ] Financial summary
- [ ] Alerts

---

### E13.2 Order Reports

| Field | Value |
|-------|-------|
| **Story ID** | US-104 |
| **Title** | Order Reports |
| **Priority** | Could Have |
| **Story Points** | 5 |
| **Sprint** | S12 |

**As a** manager
**I want** order reports
**So that** I can analyze orders

**Acceptance Criteria:**
- [ ] Order summary
- [ ] Order aging
- [ ] Status distribution
- [ ] Export to Excel
- [ ] PDF generation

---

### E13.3 Production Reports

| Field | Value |
|-------|-------|
| **Story ID** | US-105 |
| **Title** | Production Reports |
| **Priority** | Could Have |
| **Story Points** | 5 |
| **Sprint** | S12 |

**As a** production manager
**I want** production reports
**So that** I can analyze production

**Acceptance Criteria:**
- [ ] Daily production
- [ ] Efficiency report
- [ ] DHU report
- [ ] Factory comparison
- [ ] Export

---

### E13.4 Commercial Reports

| Field | Value |
|-------|-------|
| **Story ID** | US-106 |
| **Title** | Commercial Reports |
| **Priority** | Could Have |
| **Story Points** | 5 |
| **Sprint** | S12 |

**As a** commercial manager
**I want** commercial reports
**So that** I can analyze LCs

**Acceptance Criteria:**
- [ ] LC utilization
- [ ] Exposure report
- [ ] Bank statement
- [ ] Export
- [ ] PDF generation

---

### E13.5 Quality Reports

| Field | Value |
|-------|-------|
| **Story ID** | US-107 |
| **Title** | Quality Reports |
| **Priority** | Could Have |
| **Story Points** | 3 |
| **Sprint** | S12 |

**As a** QA manager
**I want** quality reports
**So that** I can analyze quality

**Acceptance Criteria:**
- [ ] Inspection summary
- [ ] Defect analysis
- [ ] Compliance report
- [ ] Export
- [ ] PDF generation

---

### E13.6 Inventory Reports

| Field | Value |
|-------|-------|
| **Story ID** | US-108 |
| **Title** | Inventory Reports |
| **Priority** | Could Have |
| **Story Points** | 3 |
| **Sprint** | S12 |

**As a** warehouse manager
**I want** inventory reports
**So that** I can analyze stock

**Acceptance Criteria:**
- [ ] Stock summary
- [ ] Stock movement
- [ ] Aging report
- [ ] Export
- [ ] PDF generation

---

### E13.7 Financial Reports

| Field | Value |
|-------|-------|
| **Story ID** | US-109 |
| **Title** | Financial Reports |
| **Priority** | Could Have |
| **Story Points** | 5 |
| **Sprint** | S12 |

**As a** finance manager
**I want** financial reports
**So that** I can analyze finances

**Acceptance Criteria:**
- [ ] P&L statement
- [ ] Balance sheet
- [ ] Cash flow
- [ ] Cost center
- [ ] Export

---

### E13.8 Custom Reports

| Field | Value |
|-------|-------|
| **Story ID** | US-110 |
| **Title** | Custom Report Builder |
| **Priority** | Won't Have |
| **Story Points** | 8 |
| **Sprint** | Future |

**As a** manager
**I want** to build custom reports
**So that** I can get specific insights

**Acceptance Criteria:**
- [ ] Report builder UI
- [ ] Field selection
- [ ] Filter options
- [ ] Grouping
- [ ] Export

---

### E13.9 Report Scheduler

| Field | Value |
|-------|-------|
| **Story ID** | US-111 |
| **Title** | Report Scheduling |
| **Priority** | Won't Have |
| **Story Points** | 5 |
| **Sprint** | Future |

**As a** manager
**I want** to schedule reports
**So that** I receive them automatically

**Acceptance Criteria:**
- [ ] Schedule setup
- [ ] Email delivery
- [ ] PDF attachment
- [ ] Frequency options
- [ ] Manage schedules

---

### E13.10 Report Dashboard

| Field | Value |
|-------|-------|
| **Story ID** | US-112 |
| **Title** | Report Dashboard |
| **Priority** | Could Have |
| **Story Points** | 5 |
| **Sprint** | S12 |

**As a** manager
**I want** a report dashboard
**So that** I can access all reports

**Acceptance Criteria:**
- [ ] Report categories
- [ ] Favorite reports
- [ ] Recent reports
- [ ] Search
- [ ] Quick access

---

## 15. Sprint Planning

### Sprint 0: Foundation (2 weeks)

| Story ID | Story | Points |
|----------|-------|--------|
| US-001 | Django Project Scaffolding | 5 |
| US-002 | PostgreSQL Database Configuration | 3 |
| US-003 | Redis & Celery Configuration | 3 |
| US-004 | Git Repository Setup | 2 |
| US-005 | Code Quality Tools Setup | 2 |
| US-006 | Multi-Tenancy Foundation | 8 |
| US-007 | DRF API Foundation | 5 |
| US-008 | Health Check Endpoints | 3 |
| **Total** | | **31** |

**Sprint Goal:** Project setup with multi-tenancy foundation

---

### Sprint 1: Auth & Setup (2 weeks)

| Story ID | Story | Points |
|----------|-------|--------|
| US-009 | User Registration | 5 |
| US-010 | User Login with JWT | 5 |
| US-011 | MFA Setup | 8 |
| US-012 | Password Change & Reset | 5 |
| US-013 | Role CRUD | 5 |
| US-014 | Permission System | 8 |
| US-015 | User Profile Management | 3 |
| US-016 | Session Management | 3 |
| US-017 | Audit Trail | 5 |
| US-018 | Login Page Design | 3 |
| **Total** | | **50** |

**Sprint Goal:** Complete authentication and authorization system

---

### Sprint 2: Master Data (2 weeks)

| Story ID | Story | Points |
|----------|-------|--------|
| US-019 | Tenant Company Setup | 5 |
| US-020 | Office & Location Setup | 5 |
| US-021 | Department Setup | 3 |
| US-022 | Designation Setup | 3 |
| US-023 | Season Master Data | 2 |
| US-024 | Product Category Setup | 3 |
| US-025 | Product Type Setup | 2 |
| US-026 | Currency Setup | 2 |
| US-027 | Payment Terms Setup | 2 |
| US-028 | Unit of Measurement Setup | 2 |
| US-029 | Country Setup | 2 |
| US-030 | Color Code Setup | 2 |
| **Total** | | **33** |

**Sprint Goal:** All setup masters configured

---

### Sprint 3: Style Management (2 weeks)

| Story ID | Story | Points |
|----------|-------|--------|
| US-031 | Style Management | 8 |
| US-032 | Style Version Control | 5 |
| US-033 | Style Classification | 3 |
| US-034 | Tech Pack Upload | 5 |
| US-035 | Bill of Materials | 8 |
| US-036 | Style Approval Workflow | 5 |
| US-037 | Style List Page | 3 |
| US-038 | Style Detail Page | 3 |
| **Total** | | **40** |

**Sprint Goal:** Complete style management with versioning

---

### Sprint 4: File Opening & PO Start (2 weeks)

| Story ID | Story | Points |
|----------|-------|--------|
| US-039 | File Opening Management | 5 |
| US-040 | File Opening Form | 3 |
| US-041 | File Opening List | 3 |
| US-042 | File Opening Detail | 3 |
| US-043 | File Status Management | 3 |
| US-044 | File Actions | 3 |
| US-045 | Purchase Order Management | 8 |
| **Total** | | **28** |

**Sprint Goal:** File opening complete, PO started

---

### Sprint 5: PO & T&A (2 weeks)

| Story ID | Story | Points |
|----------|-------|--------|
| US-046 | PO Creation Form | 5 |
| US-047 | PO Line Items | 5 |
| US-048 | PO List Page | 3 |
| US-049 | PO Detail Page | 3 |
| US-050 | PO Status Management | 3 |
| US-051 | PO Amendment | 5 |
| US-052 | PO Approval Workflow | 5 |
| US-053 | PO Bulk Import | 5 |
| US-054 | PO Export | 3 |
| **Total** | | **37** |

**Sprint Goal:** Complete PO management

---

### Sprint 6: T&A & Costing Start (2 weeks)

| Story ID | Story | Points |
|----------|-------|--------|
| US-055 | T&A Auto-Generation | 5 |
| US-056 | T&A Milestone Management | 5 |
| US-057 | T&A Calendar View | 5 |
| US-058 | T&A Alert System | 5 |
| US-059 | T&A Progress Tracking | 3 |
| US-060 | T&A List Page | 3 |
| US-061 | T&A Detail Page | 3 |
| US-062 | T&A Heatmap Dashboard | 5 |
| **Total** | | **34** |

**Sprint Goal:** Complete T&A management

---

### Sprint 7: Costing & Commercial Start (2 weeks)

| Story ID | Story | Points |
|----------|-------|--------|
| US-063 | Costing Management | 8 |
| US-064 | BOM-Based Costing | 5 |
| US-065 | Yield Calculation | 3 |
| US-066 | Costing Approval | 5 |
| US-067 | Costing Comparison | 5 |
| US-068 | Costing List Page | 3 |
| US-069 | Costing Detail Page | 3 |
| US-070 | Costing Print/Export | 3 |
| **Total** | | **35** |

**Sprint Goal:** Complete costing module

---

### Sprint 8: Commercial & LC (2 weeks)

| Story ID | Story | Points |
|----------|-------|--------|
| US-071 | Master LC Management | 8 |
| US-072 | Back-to-Back LC | 5 |
| US-073 | LC Amendment | 5 |
| US-074 | LC Utilization Tracking | 5 |
| US-075 | PI Generation | 5 |
| US-076 | Sales Contract Management | 5 |
| US-077 | Bank Setup | 3 |
| US-078 | LC List Page | 3 |
| US-079 | LC Detail Page | 3 |
| US-080 | LC Dashboard | 5 |
| **Total** | | **47** |

**Sprint Goal:** Complete commercial and LC management

---

### Sprint 9: Production & Quality (2 weeks)

| Story ID | Story | Points |
|----------|-------|--------|
| US-081 | Production Planning | 5 |
| US-082 | Daily Production Reporting | 5 |
| US-083 | Production Monitoring | 5 |
| US-084 | Line Performance Tracking | 3 |
| US-085 | Production List Page | 3 |
| US-086 | Production Detail Page | 3 |
| US-087 | Factory Reporting Portal | 8 |
| US-088 | Production Dashboard | 5 |
| **Total** | | **37** |

**Sprint Goal:** Complete production module

---

### Sprint 10: Quality & Logistics Start (2 weeks)

| Story ID | Story | Points |
|----------|-------|--------|
| US-089 | Quality Inspection | 5 |
| US-090 | Defect Recording | 3 |
| US-091 | AQL Calculation | 3 |
| US-092 | Corrective Action | 5 |
| US-093 | Quality List Page | 3 |
| US-094 | Quality Dashboard | 5 |
| US-095 | Shipment Booking | 5 |
| US-096 | Shipping Documents | 5 |
| US-097 | Container Tracking | 3 |
| **Total** | | **37** |

**Sprint Goal:** Complete quality, start logistics

---

### Sprint 11: Logistics & Reporting Start (2 weeks)

| Story ID | Story | Points |
|----------|-------|--------|
| US-098 | Shipment List Page | 3 |
| US-099 | Shipment Detail Page | 3 |
| US-100 | Bill of Lading | 3 |
| US-101 | Freight Forwarder Setup | 3 |
| US-102 | Shipment Dashboard | 5 |
| US-103 | Executive Dashboard | 8 |
| **Total** | | **25** |

**Sprint Goal:** Complete logistics, start reporting

---

### Sprint 12: Reporting (2 weeks)

| Story ID | Story | Points |
|----------|-------|--------|
| US-104 | Order Reports | 5 |
| US-105 | Production Reports | 5 |
| US-106 | Commercial Reports | 5 |
| US-107 | Quality Reports | 3 |
| US-108 | Inventory Reports | 3 |
| US-109 | Financial Reports | 5 |
| US-110 | Custom Report Builder | 8 |
| US-111 | Report Scheduling | 5 |
| US-112 | Report Dashboard | 5 |
| **Total** | | **44** |

**Sprint Goal:** Complete reporting module

---

## 16. Story Points Guide

| Points | Description | Time (hrs) |
|--------|-------------|------------|
| 1 | Trivial | 1-2 |
| 2 | Simple | 2-4 |
| 3 | Small | 4-8 |
| 5 | Medium | 8-16 |
| 8 | Large | 16-24 |
| 13 | Extra Large | 24-40 |
| 21 | Epic | 40+ |

---

## 15. Epic 14: Foundation Requirements (formerly target Foundation � Sprint 0)

> **Note**: Original planned story titles below (target-004..target-007 were later scoped into the fabric app � see Part 2, RQ-015..RQ-018). Current scope/status is authoritative in Part 2.

### RQ-001 � Celery Task Infrastructure (formerly target-000)

| Field | Value |
|-------|-------|
| **Story ID** | RQ-001 (formerly target-000) |
| **Title** | Celery Task Infrastructure |
| **Priority** | Must Have |
| **Story Points** | 3 |
| **Sprint** | S0 |

**As a** developer
**I want** Celery task infrastructure with base task patterns
**So that** I can handle async operations for foundation features

**Acceptance Criteria:**
- [ ] Celery app configured in `config/celery.py`
- [ ] Base task class with retry, logging, error handling
- [ ] Debug and health check tasks available
- [ ] All tasks registered and discoverable
- [ ] Test coverage for task execution and configuration

**Tasks:**
| Task | Hours | Assignee |
|------|-------|----------|
| Create Celery app config | 2 | Developer |
| Create base task patterns | 2 | Developer |
| Write tests | 2 | Developer |

---

### RQ-003 � Risk Indicator System (formerly target-001)

| Field | Value |
|-------|-------|
| **Story ID** | RQ-003 (formerly target-001) |
| **Title** | Risk Indicator System |
| **Priority** | Must Have |
| **Story Points** | 5 |
| **Sprint** | S0 |

**As a** merchandiser
**I want** color-coded risk levels on orders
**So that** I can quickly identify at-risk shipments

**Acceptance Criteria:**
- [ ] RiskLevel model with code, name, color, sort_order
- [ ] RiskLevel CRUD via API (`/api/v1/setup/risk-levels/`)
- [ ] `risk_level` FK on FileOpening, PurchaseOrder, Shipment
- [ ] All new fields nullable � zero breaking changes
- [ ] Seed data: none, green, amber, red, cyan
- [ ] Test coverage for model, FK, and uniqueness

**Tasks:**
| Task | Hours | Assignee |
|------|-------|----------|
| Create RiskLevel model + migration | 2 | Developer |
| Extend FO/PO/Shipment with risk_level FK | 2 | Developer |
| Create ViewSet + Serializer + URL | 1 | Developer |
| Add seed data | 1 | Developer |
| Write tests | 2 | Developer |

---

### RQ-002 � Standardized Notes System (formerly target-002)

| Field | Value |
|-------|-------|
| **Story ID** | RQ-002 (formerly target-002) |
| **Title** | Standardized Notes System |
| **Priority** | Must Have |
| **Story Points** | 3 |
| **Sprint** | S0 |

**As a** merchandiser
**I want** to add notes with author tracking to file openings
**So that** I can communicate context with accountability

**Acceptance Criteria:**
- [ ] Abstract Note model in core with author, text, is_active
- [ ] Concrete FileOpeningNote model in merchandising
- [ ] Note.author_initials property for display
- [ ] Soft-delete via is_active flag
- [ ] Test coverage for abstract enforcement, CRUD, ordering

**Tasks:**
| Task | Hours | Assignee |
|------|-------|----------|
| Create abstract Note model in core | 1 | Developer |
| Create FileOpeningNote concrete model | 1 | Developer |
| Create migration | 1 | Developer |
| Write tests | 2 | Developer |

---

### RQ-004 � Supplier Pre-Approval Workflow (formerly target-003)

| Field | Value |
|-------|-------|
| **Story ID** | RQ-004 (formerly target-003) |
| **Title** | Supplier Pre-Approval Workflow |
| **Priority** | Must Have |
| **Story Points** | 3 |
| **Sprint** | S0 |

**As a** finance manager
**I want** to approve suppliers before they can be used
**So that** only vetted vendors are engaged

**Acceptance Criteria:**
- [ ] `is_approved`, `approved_by`, `approved_at` fields on Vendor
- [ ] Default `is_approved=False` � unapproved by default
- [ ] Vendor serializer exposes approval fields + `approved_by_name`
- [ ] All new fields nullable � zero breaking changes
- [ ] Test coverage for approval lifecycle and filtering

**Tasks:**
| Task | Hours | Assignee |
|------|-------|----------|
| Extend Vendor model with approval fields | 1 | Developer |
| Create migration | 1 | Developer |
| Update Vendor serializer | 1 | Developer |
| Write tests | 2 | Developer |

---

### RQ-015 � Fabric Categories & HTS Codes (formerly target-004)

| Field | Value |
|-------|-------|
| **Story ID** | RQ-015 (formerly target-004) |
| **Title** | Fabric Categories & HTS Codes |
| **Priority** | Must Have |
| **Story Points** | 8 |
| **Sprint** | S1 |

**As a** merchandiser
**I want** to manage fabric categories and HTS codes
**So that** I can classify fabrics and track customs duties

**Acceptance Criteria:**
- [ ] FabricCategory model with hierarchy (parent FK), unique code per tenant, active by default
- [ ] HTSCode model with optional category FK, duty_rate, unique code per tenant
- [ ] Both models are `TenantModel` with tenant isolation
- [ ] Full CRUD via REST API (`/api/v1/fabric/categories/`, `/api/v1/fabric/hts-codes/`)
- [ ] ViewSets with pagination, search, and permission checks
- [ ] Seed data for 12 categories (hierarchy depth 2) and 8 HTS codes

---

### target-005 � Fabric Supplier & Mill Management (historical � consolidated into RQ-015 fabric app)

| Field | Value |
|-------|-------|
| **Story ID** | target-005 (historical) |
| **Title** | Fabric Supplier & Mill Management |
| **Priority** | Must Have |
| **Story Points** | 5 |
| **Sprint** | S1 |

**As a** merchandiser
**I want** to manage fabric suppliers and mills
**So that** I can track vendor details and mill capacity/ratings

**Acceptance Criteria:**
- [ ] FabricSupplier model with optional vendor link, country, is_mill flag, MOQ
- [ ] FabricMill model with capacity, rating, certification, country
- [ ] Both with unique code per tenant, active by default
- [ ] Full CRUD via REST API (`/api/v1/fabric/suppliers/`, `/api/v1/fabric/mills/`)
- [ ] ViewSets with pagination, search, and permission checks
- [ ] All new FKs nullable � zero breaking changes
- [ ] Seed data for 7 suppliers and 6 mills

---

### target-006 � Fabric Supplier RFQ Workflow (historical � consolidated into RQ-015 fabric app)

| Field | Value |
|-------|-------|
| **Story ID** | target-006 (historical) |
| **Title** | Fabric Supplier RFQ Workflow |
| **Priority** | Must Have |
| **Story Points** | 5 |
| **Sprint** | S1 |

**As a** merchandiser
**I want** to send RFQs to fabric suppliers and collect responses
**So that** I can compare pricing and lead times

**Acceptance Criteria:**
- [ ] RFQ model with status lifecycle (draft ? sent ? responded ? closed ? cancelled)
- [ ] RFQLineItem model with fabric_category FK, quantity_meters, target_price
- [ ] RFQResponse model (multiple suppliers per RFQ)
- [ ] RFQResponseItem model with quoted_price, available_qty, lead_days
- [ ] Full CRUD via REST API for all 4 entities
- [ ] ViewSets with pagination and permission checks
- [ ] Seed data for 5 RFQs with line items

---

### target-007 � Fabric Inventory/Booking System (historical � consolidated into RQ-015 fabric app)

| Field | Value |
|-------|-------|
| **Story ID** | target-007 (historical) |
| **Title** | Fabric Inventory/Booking System |
| **Priority** | Must Have |
| **Story Points** | 3 |
| **Sprint** | S1 |

**As a** merchandiser
**I want** to track fabric inventory and bookings
**So that** I can manage stock levels and scheduled deliveries

**Acceptance Criteria:**
- [ ] FabricBooking model with status workflow (pending ? booked ? confirmed ? in_transit ? delivered ? cancelled)
- [ ] FabricInventory model with available_quantity computed property
- [ ] Full CRUD via REST API (`/api/v1/fabric/bookings/`, `/api/v1/fabric/inventory/`)
- [ ] ViewSets with pagination, search, and permission checks
- [ ] Seed data for 5 bookings and 6 inventory records

---

## 16. Sprint Planning (Updated)

### Sprint 0: Foundation + Requirements (2 weeks)

| Story ID | Story | Points |
|----------|-------|--------|
| US-001 | Django Project Scaffolding | 5 |
| US-002 | PostgreSQL Database Configuration | 3 |
| US-003 | Redis & Celery Configuration | 3 |
| US-004 | Git Repository Setup | 2 |
| US-005 | Code Quality Tools Setup | 2 |
| US-006 | Multi-Tenancy Foundation | 8 |
| US-007 | DRF API Foundation | 5 |
| US-008 | Health Check Endpoints | 3 |
| RQ-001 | Celery Task Infrastructure (formerly target-000) | 3 |
| RQ-003 | Risk Indicator System (formerly target-001) | 5 |
| RQ-002 | Standardized Notes System (formerly target-002) | 3 |
| RQ-004 | Supplier Pre-Approval Workflow (formerly target-003) | 3 |
| **Total** | | **45** |

**Sprint Goal:** Project setup with multi-tenancy foundation + foundation requirements (RQ-001..RQ-004)

---

### Sprint 1: Fabric Management Foundation (2 weeks)

| Story ID | Story | Points |
|----------|-------|--------|
| RQ-015 | Fabric Master Data (formerly target-004) | 8 |
| RQ-016 | Fabric Tolerance Tables (formerly target-005) | 5 |
| RQ-017 | Fabric Order � Lab Dip/Bulk (formerly target-006) | 5 |
| RQ-018 | Fabric Risk & Schedule (formerly target-007) | 3 |
| **Total** | | **21** |

**Status:** ? **Complete** � All 40 tests passing (31 model + 9 API), full CRUD via REST API, `fabric` app with 10 models, seeded in `seed_demo_data.py`.

**Sprint Goal:** Fabric management foundation with categories, suppliers, RFQ workflow, and inventory/booking.

---

| Points | Description | Time (hrs) |
|--------|-------------|------------|
| 1 | Trivial | 1-2 |
| 2 | Simple | 2-4 |
| 3 | Small | 4-8 |
| 5 | Medium | 8-16 |
| 8 | Large | 16-24 |
| 13 | Extra Large | 24-40 |
| 21 | Epic | 40+ |

---

*This backlog should be reviewed and refined each sprint planning session.*

---

## Part 2: BHMS Requirement Sequence (workflow-ordered)

> BHMS is the complete solution. The items below are **BHMS requirements** (formerly framed as "target gaps").
> Requirements are ordered **chronologically by business workflow** (`workflow-diagrams.md`), so they can be executed sequentially top-to-bottom.
> **RQ-###** is the primary ID; the former **target-0XX** is kept inline for traceability to tests/migrations/lessons.

### Legend
| Symbol | Meaning |
|--------|---------|
| ? 100% | Fully implemented, tested, seeded |
| ? In Progress | Implementation in current sprint |
| ? Pending | Planned, not started |
| ? Not Started | No story assigned |

### RQ ? target Traceability (35 requirements)

| RQ-ID | Former target | Requirement | Workflow Stage |
|-------|-----------|-------------|----------------|
| RQ-001 | target-000 | Celery Task Infrastructure | 1 � Foundation & Cross-Cutting |
| RQ-002 | target-002 | Standardized Notes System | 1 � Foundation & Cross-Cutting |
| RQ-003 | target-001 | Risk Indicator System | 1 � Foundation & Cross-Cutting |
| RQ-004 | target-003 | Supplier Pre-Approval | 1 � Foundation & Cross-Cutting |
| RQ-005 | target-033 | Design Image Management | 2 � Style & Design |
| RQ-006 | target-034 | Not Sold Analysis | 2 � Style & Design |
| RQ-007 | target-025 | Sales Confirmation (48h) | 3 � Order Intake (FO & PO) |
| RQ-008 | target-026 | Quick Lead Time Orders | 3 � Order Intake (FO & PO) |
| RQ-009 | target-028 | Repeats Management | 3 � Order Intake (FO & PO) |
| RQ-010 | target-010 | Hit Management / Breakdown | 3 � Order Intake (FO & PO) |
| RQ-011 | target-011 | Fit Specification System | 4 � Technical / Spec |
| RQ-012 | target-012 | Fit Spec Copying | 4 � Technical / Spec |
| RQ-013 | target-031 | Order-Level Costing Enhancements | 5 � Costing |
| RQ-014 | target-032 | Design Costing (Pattern Options) | 5 � Costing |
| RQ-015 | target-004 | Fabric Master Data | 6 � Procurement (Fabric & Trims) |
| RQ-016 | target-005 | Fabric Tolerance Tables | 6 � Procurement (Fabric & Trims) |
| RQ-017 | target-006 | Fabric Order (Lab Dip/Bulk) | 6 � Procurement (Fabric & Trims) |
| RQ-018 | target-007 | Fabric Risk & Schedule | 6 � Procurement (Fabric & Trims) |
| RQ-019 | target-027 | Stock Fabric Management | 6 � Procurement (Fabric & Trims) |
| RQ-020 | target-017 | Fabric Schedule (Role Handoff) | 6 � Procurement (Fabric & Trims) |
| RQ-021 | target-008 | Trim/Label Schedule | 6 � Procurement (Fabric & Trims) |
| RQ-022 | target-009 | Trim/Label Copy From Order | 6 � Procurement (Fabric & Trims) |
| RQ-023 | target-030 | Fabric Utilization Reports | 6 � Procurement (Fabric & Trims) |
| RQ-024 | target-013 | Job Request/Queue | 7 � Production & Job Queue |
| RQ-025 | target-014 | Job Queue Dashboard | 7 � Production & Job Queue |
| RQ-026 | target-020 | Docket Management | 7 � Production & Job Queue |
| RQ-027 | target-021 | Final Hit Reconciliation | 7 � Production & Job Queue |
| RQ-028 | target-019 | Order Manager Dashboard | 7 � Production & Job Queue |
| RQ-029 | target-015 | Booking Schedule | 8 � Shipment & Logistics |
| RQ-030 | target-018 | Booking Ref Management | 8 � Shipment & Logistics |
| RQ-031 | target-022 | Shipping Paperwork Comparison | 8 � Shipment & Logistics |
| RQ-032 | target-016 | Gold Seal Tracking | 9 � Quality & Compliance |
| RQ-033 | target-029 | Compliance Audit | 9 � Quality & Compliance |
| RQ-034 | target-023 | Debit Note System | 10 � Commercial & Finance |
| RQ-035 | target-024 | Invoice Approval | 10 � Commercial & Finance |
| RQ-043 | — (new) | Import Recap | 8 � Shipment & Logistics |
| RQ-044 | — (new) | Export Recap | 8 � Shipment & Logistics |
| RQ-045 | — (new) | Supplier Payment (due pivot + release workflow) | 8 � Shipment & Logistics |
| RQ-046 | — (new) | Cost update/reconcile (Factory Inv vs Planning CM) | 8 � Shipment & Logistics |
| RQ-047 | — (new) | Sales Summary + Import/Export Recap reports (aggregation per buyer/factory) | 8 � Shipment & Logistics |
| RQ-048 | — (new) | Forward Order / Order In-hand book (monthly qty, cost, 3% service charge) | 8 � Shipment & Logistics |

---

### Stage 1: Foundation & Cross-Cutting (RQ-001 ? RQ-004) 4/4 ? 100%

| Item | Requirement (formerly target) | Backlog Story | PRD Ref | Status | Tests | Seed Data | Lessons |
|------|---------------------------|---------------|---------|--------|-------|-----------|---------|
| RQ-001 | Celery Task Infrastructure (target-000) | US-003 | �7.2 Async Processing | ? 100% | 5 | N/A | Sprint 2 � Celery app creation |
| RQ-002 | Standardized Notes System (target-002) | US-015 | �6.2.3 Notes | ? 100% | 13 | Notes per FO | Sprint 2 � Note abstract model |
| RQ-003 | Risk Indicator System (target-001) | US-053 | �6.2.4 Risk Mgmt | ? 100% | 9 | 5 risk levels | Sprint 2 � RiskLevel CRUD |
| RQ-004 | Supplier Pre-Approval (target-003) | US-091 | �3.4 Vendor | ? 100% | 5 | Vendor approval | Sprint 2 � Vendor approval fields |

**Stage 1 total**: 4 items, 32 tests ?

---

### Stage 2: Style & Design (RQ-005 ? RQ-006) 2/2 ? 100%

> RQ-005 sits beside Style Management (Epic 4) and Style Information � before File Opening / PO.

| Item | Requirement (formerly target) | Backlog Story | PRD Ref | Status | Tests | Seed Data | Lessons |
|------|---------------------------|---------------|---------|--------|-------|-----------|---------|
| RQ-005 | Design Image Management (target-033) | � | �6.1.1 Design | ? 100% | 16 + 3 seed | Main/range/detail image per style � child of Style, nested API `/styles/{id}/design_images/`, managed in Style screen | RQ-005 � DesignImage model (Sprint 2 add-on) |
| RQ-006 | Not Sold Analysis (target-034) | � | �6.1.1 Design | ? 100% | 17 + 3 seed | Completed sample job per style; styles with a FileOpening are "sold", rest "not sold" � action `/job-requests/unsold_analysis/` | RQ-006 � analytic action (Sprint 2 add-on) |

**Stage 2 total**: 2 items, 39 tests ?

---

### Stage 3: Order Lifecycle � File Opening & PO (RQ-007 ? RQ-010) 3/4 ?

| Item | Requirement (formerly target) | Backlog Story | PRD Ref | Status | Tests | Seed Data | Lessons |
|------|---------------------------|---------------|---------|--------|-------|-----------|---------|
| RQ-007 | Sales Confirmation (48h) (target-025) | � | �5.2 Sales | ? 100% | 29 + 3 seed | 5 confirmations (draft/sent �2 incl. 1 overdue/disputed/accepted) � `SalesConfirmation` in commercial, linked to PO + Buyer | RQ-007 � SalesConfirmation model + 48h Celery auto-accept |
| RQ-008 | Quick Lead Time Orders (target-026) | � | �5.1.2 Orders | ? 100% | 20 + 3 seed | 2 quick lead file openings (1 fully agreed, 1 partial) � `is_quick_lead` + `quick_lead_agreed_by` on FileOpening | RQ-008 � FileOpening quick lead marking + agreement workflow |
| RQ-009 | Repeats Management (target-028) | � | �5.1.3 Repeats | ? 100% | 22 + 3 seed | 2 repeat file openings (1 fully approved by technical+trims, 1 partial) � `original_fn` self-FK + `is_repeat` + `repeat_approved_by` on FileOpening | RQ-009 � FileOpening repeat creation + department approval workflow |
| RQ-010 | Hit Management / Breakdown (target-010) | � | �6.2.5 Hit Mgmt | ? 100% | 16 + 4 seed | Hits per PO colour (boxed/hanging, sea/air) � child of PO, nested API `/purchase-orders/{id}/hits/`, managed in PO screen | Sprint 2.6 � Hit model; Sprint 2.10 � reparented to PO (was PO item) |

**Stage 3 total**: 4 items, 100 tests ?

---

### Stage 4: Technical / Specification (RQ-011 ? RQ-012) 2/2 ? 100%

| Item | Requirement (formerly target) | Backlog Story | PRD Ref | Status | Tests | Seed Data | Lessons |
|------|---------------------------|---------------|---------|--------|-------|-----------|---------|
| RQ-011 | Fit Specification System (target-011) | � | �6.2.6 Spec Mgmt | ? 100% | 16 + 4 seed | Per-PO specs (dev/1st/2nd/3rd) with one current | Sprint 2.8 � FitSpec model |
| RQ-012 | Fit Spec Copying (target-012) | � | �6.2.6 Spec Mgmt | ? 100% | 14 | copy-from-order action copies ticked spec across orders | Sprint 2.9 � Fit Spec Copying |

---

### Stage 5: Costing (RQ-013 ? RQ-014) 2/2 ? 100%

| Item | Requirement (formerly target) | Backlog Story | PRD Ref | Status | Tests | Seed Data | Lessons |
|------|---------------------------|---------------|---------|--------|-------|-----------|---------|
| RQ-013 | Order-Level Costing Enhancements (target-031) | � | �6.2.1 Costing | ? 100% | 24 | 8 costings across 5 sheet types (SL/VN/BD/CN/other), 1 live tick, 4 with GBP exchange rate, 5 cost lines each (Fabric/Trims/Labels/Making/Overheads) | RQ-013 � Costing sheet type + live tick + costing lines |
| RQ-014 | Design Costing (Pattern Options) (target-032) | � | �6.1.2 Design Costing | ? 100% | 22 | First 8 POs' costings gain design fields (single-size watermark �1, patterned striped+match-point, sizes & ratio, confirmed ticks) � `is_single_size`, `size_ratio`, `confirmed`, `is_patterned`/`patterned_fabric_options`, notes, `size_width` on lines | RQ-014 � Design Costing: pattern options + single-size watermark |

> **2026-09-04 — Style-level Design Costing added (RQ-013 / G-12 design-costing gap):** new `DesignCosting` +
> `DesignCostingLine` models (migration `0034_designcosting_designcostingline`) keyed to **Style** (not PO),
> `DesignCostingSerializer`/`DesignCostingViewSet` (`design-costings` path; RBAC + tenant-scoped; `approve`/`reject`/
> `set_live` + `prepare_po_costing` action that derives an order-level `Costing` and copies cost lines from the
> approved single-piece cost). Frontend: `DesignCostingsListPage`/`DesignCostingDetailPage` (incl. "Prepare PO
> Costing" → navigates to the new `/costings/:id`). VERIFIED: backend 17/17 (model 7, API 4, prepare 6) + adjacency
> 30/30; tsc 0, lint 0 errors, vitest 298/298; live smoke create/prepare/guard 200/201/400. This closes the
> "tech pack import → single-piece costing → PO costing" design narrative; the order-level `Costing` remains
> PO-scoped (RQ-013/014).

---

### Stage 6: Procurement � Fabric & Trims (RQ-015 ? RQ-023) 9/9 ?

| Item | Requirement (formerly target) | Backlog Story | PRD Ref | Status | Tests | Seed Data | Lessons |
|------|---------------------------|---------------|---------|--------|-------|-----------|---------|
| RQ-015 | Fabric Master Data (target-004) | US-075 | �6.3 Materials | ? 100% | 59 (10 models) + 4 seed | 12 categories (depth-2: 3 roots + 9 children), 8 HTS codes linked to categories with duty rates | RQ-015 � Fabric master viewsets + docket reports |
| RQ-016 | Fabric Tolerance Tables (target-005) | � | �6.3.3 Tolerances | ? 100% | 33 + 3 seed | 7 target bands (Primark/Other/Fur) | RQ-016 � FabricTolerance model + tolerance_for resolver |
| RQ-017 | Fabric Order � Lab Dip/Bulk (target-006) | � | �6.3.2 Fabric PO | ? 100% | 17 | 3 orders (draft/bulk_approved/delivered) | Sprint 2.4 � FabricOrder model |
| RQ-018 | Fabric Risk & Schedule (target-007) | � | �6.3.4 Fabric Schedule | ? 100% | 36 + 3 seed | 3 risk-assigned orders (draft?none, bulk_approved?red w/ notes, delivered?green) � `risk_level` FK + `date_owners` + risk policy chain | RQ-018 � FabricOrder risk FK + schedule owner chain |
| RQ-019 | Stock Fabric Management (target-027) | � | �6.3.1 Fabric | ? 100% | 25 + 3 seed | 2 stock fabric FOs (FO-2025-008 with allocation, FO-2025-009 full balance) � `is_stock_fabric` + `total_meters`/`allocated_meters` + `StockFabricAllocation` ledger | RQ-019 � Stock fabric FN + meter allocation ledger |
| RQ-020 | Fabric Schedule � Role Handoff (target-017) | � | �6.3.4 Fabric Schedule | ? 100% | 28 + 3 seed | 5 handoffs per approved order (sales?merch?planning + lab_dip) � `FabricScheduleHandoff` audit log + auto triggers | RQ-020 � FabricScheduleHandoff + owner chain handoff |
| RQ-021 | Trim/Label Schedule (target-008) | US-035 (BOM) | �6.3.5 Trims | ? 100% | 12 + 6 seed | 55 BOM items (Ordered/Partial/Completed) | Sprint 2.5 � BOMItem trim fields |
| RQ-022 | Trim/Label Copy From Order (target-009) | � | �6.3.5 Trims | ? 100% | 18 + 3 seed | Per-style BOMs with trims support copy-trims demo | Sprint 2.7 � copy-trims service/action |
| RQ-023 | Fabric Utilization Reports (target-030) | � | �6.3.6 Fabric Reports | ? 100% | 33 + 3 seed | 2 docket-stage records (FO-2026-1002/1003 across 2 periods) � `FabricUtilization` (final vs actual rating, excess, efficiency) + monthly/quarterly reports | RQ-023 � FabricUtilization + docket reports |

---

### Stage 7: Production & Job Queue (RQ-024 ? RQ-028) 5/5 ? 100%

| Item | Requirement (formerly target) | Backlog Story | PRD Ref | Status | Tests | Seed Data | Lessons |
|------|---------------------------|---------------|---------|--------|-------|-----------|---------|
| RQ-024 | Job Request/Queue (target-013) | � | �6.2.7 Job Queue | ? 100% | 20 | 22 job requests (pattern/sample/3d/mini_marker, priority, status) | Sprint 2.10 � JobRequest model + queue |
| RQ-025 | Job Queue Dashboard (target-014) | � | �6.2.7 Job Queue | ? 100% | 18 | `/job-requests/dashboard/` total/by-status/by-type/by-priority/overdue/due-this-week/unassigned | Sprint 2.10 � dashboard action + UI |
| RQ-026 | Docket Management (target-020) | � | �6.2.9 Dockets | ? 100% | 22 + 3 seed | 4 dockets (DK-2025-001..004; DK-2025-003 final, 265 m unused ? over-200 m sales flag) � `Docket` in logistics linked to Shipment + contract price/date raised/delivery + over-200 m sales notification | RQ-026 � Docket + over-200 m sales trigger |
| RQ-027 | Final Hit Reconciliation (target-021) | � | �6.2.9 Dockets | ? 100% | 26 + 3 seed | reconciliations per delivered hit (first 2 debited � 45 units short ? over-20-unit debit rule; next 2 reconciled clean; rest pending) � `FinalHitReconciliation` in logistics linked to Shipment/Hit, auto-raised on delivered transition | RQ-027 � Final Hit Reconciliation + &gt;20-unit debit trigger |
| RQ-028 | Order Manager Dashboard (target-019) | � | �6.2.2 Order Mgr | ? 100% | 27 + 3 seed | 2 order-manager demo rows (PO-DEMO-01 overdue open + overdue job ? risk/red; PO-DEMO-02 delivered + approved gold seal + clean reconciliation ? ok/green) � `order_manager` aggregate action on PurchaseOrderViewSet, read-mostly, no new models | RQ-028 � Order Manager dashboard (aggregate, no new models) |

---

### Stage 8: Shipment & Logistics (RQ-029 ? RQ-031 + RQ-043 + RQ-044 + RQ-045 + RQ-046 + RQ-047 + RQ-048 + RQ-049 + RQ-050) 11/11 ?

| Item | Requirement (formerly target) | Backlog Story | PRD Ref | Status | Tests | Seed Data | Lessons |
|------|---------------------------|---------------|---------|--------|-------|-----------|---------|
| RQ-029 | Booking Schedule (target-015) | � | �6.2.8 Booking | ? 100% | 17 + 2 seed | 21 weekly schedule items (live/in_work/delivered, cut qty, garments ready, ex-factory, risk) � `BookingScheduleItem` in logistics, linked to Shipment/Hit | Sprint 4 � BookingScheduleItem model + status flow + risk |
| RQ-030 | Booking Ref Management (target-018) | � | �6.2.8 Booking | ? 100% | 22 + 3 seed | 2 booking-ref demo shipments (SHP-2025-002 filled `BRF-2025-1184` ? ok; SHP-2025-004 past ETA no ref ? 14-day alert) � `booking_reference` + `booking_ref_required_date` on Shipment, auto-derived ETA-14 days | RQ-030 � Booking Ref + 14-day alert |
| RQ-031 | Shipping Paperwork Comparison (target-022) | � | �6.2.9 Dockets | ? 100% | 20 + 4 seed | 2 dedicated scenario POs � `PO-PC-OVER` (2000 ordered / 2160 shipped / 2400 m docket ? 8% over-tolerance, covers order) and `PO-PC-SHORT` (5000 ordered / 5000 shipped / 300 m docket ? cannot cover) � `PaperworkComparisonService` in `logistics.services` | RQ-031 � Paperwork Comparison |
| RQ-043 | Import Recap (new gap) | ✅ | ✅8 Logistics | ✅ Done | test_import_recap.py + page test | 3 inbound rows demo | RQ-043 � ImportRecap model + CRUD + grid + export |
| RQ-044 | Export Recap (new gap) | ✅ | ✅8 Logistics | ✅ Done | test_export_recap.py + page test | 3 outbound rows demo | RQ-044 ✅ ExportRecap model + CRUD + grid + payment pipelines |
| RQ-045 | Supplier Payment (new gap) | ✅ | ✅8 Logistics | ✅ Done | test_supplier_payment.py + SupplierPaymentsPage.test.tsx | 3 payment rows demo | RQ-045 ✅ SupplierPayment model + CRUD + due_pivot + release + grid |
| RQ-046 | Cost update/reconcile (new gap) | ✅ | ✅8 Logistics | ✅ Done | test_cost_reconcile.py + CostReconcilePage.test.tsx | 3 recon rows demo | RQ-046 ✅ CostReconciliation model + CRUD + compare + resolve + grid |
| RQ-047 | Sales Summary + Import/Export Recap reports (new gap) | ✅ | ✅8 Logistics | ✅ Done | test_summary_reports.py + SummaryReportsPage.test.tsx | 3 export + 3 import recap rows demo | RQ-047 ✅ sales_summary + recap_summary report actions + summary-reports page |
| RQ-048 | Forward Order / Order In-hand book (new gap) | ✅ | ✅8 Logistics | ✅ Done | test_forward_order.py + ForwardOrderPage.test.tsx | 3 forward-order rows demo (confirmed/in_production/draft) | RQ-048 ✅ ForwardOrder model + computed total_cost/service_charge + CRUD + monthly_forward action + forward-order-book page |
| RQ-049 | Booking + Fabric Schedule alignment (new gap, B8 parts 1-3) | ⏳ P1-3 | ✅8.2.8 Booking | ✍️ Done (16.2 dates/notes closed; 16.2 tolerance=B10, risk display & 16.3 Order Manager pending) | test_booking_schedule.py (23) + test_fabric_schedule.py (38) + BookingSchedulePage.test.tsx (7) + FabricOrdersPage.test.tsx (1) | 21 weekly schedule items demo (live/in_work/delivered) | RQ-049 ✅ BookingSchedulePage on SpreadsheetGrid with `*`-editable inline columns + last-hit marker + `is_last_hit` + server-captured snapshot (migration 0015); FabricOrder gained strike-off x3 + actual arrival + paperwork + bulk-approval notes (migration 0008) w/ GC ownership (arrival/paperwork=logistics); vitest 272/272, adjacency 124, live smoke |
| RQ-050 | Help & Onboarding (new gap, B9) | ✅ | ✅ Help Centre | ✍️ Done | test_help_models.py (17) + test_help_api.py (13) + OnboardingChecklist.test.tsx (6) + ReleaseNotesTab.test.tsx (4) + HelpPage.test.tsx (4) + GuidedTour.test.tsx (4) | help app demo (3 models) | RQ-050 ✅ new `help` app: TourCompletion / OnboardingChecklistItem / ReleaseNote (migration 0001) + `/api/v1/help/` (tenant-scoped, RBAC) + frontend Onboarding checklist (8 items, progress bar, toggle) + Release Notes tab + Help Centre glossary search (37 terms) + GuidedTour `complete()` records completion; backend adjacency 96/96, vitest 293/293 (44 files), tsc 0, lint 0 |

---

### Stage 9: Quality & Compliance (RQ-032 ? RQ-033) 2/2 ?

| Item | Requirement (formerly target) | Backlog Story | PRD Ref | Status | Tests | Seed Data | Lessons |
|------|---------------------------|---------------|---------|--------|-------|-----------|---------|
| RQ-032 | Gold Seal Tracking (target-016) | � | �6.4.2 Quality | ? 100% | 20 + 3 seed | 1 gold seal per shipment (status rotates pending/sent/approved/rejected) � `GoldSeal` in quality, linked to Shipment | Sprint 4 � GoldSeal model + lifecycle + frontend page |
| RQ-033 | Compliance Audit (target-029) | � | �6.4.3 Compliance | ? 100% | 31 | 16 weekly audits (pass/fail/pending + 3-warning scenario) � `ComplianceAudit` in quality, linked to PO | Sprint 5 � ComplianceAudit model + weekly_overview/export + frontend page |

---

### Stage 10: Commercial & Finance (RQ-034 ? RQ-035) 2/2 ??

| Item | Requirement (formerly target) | Backlog Story | PRD Ref | Status | Tests | Seed Data | Lessons |
|------|---------------------------|---------------|---------|--------|-------|-----------|---------|
| RQ-034 | Debit Note System (target-023) | � | �6.2.10 Debits | ? 100% | 34 + 4 seed | 4 debit notes (DN-2025-001 pro forma over-tolerance / 002 issued fabric shortage / 003 paid trims shortage / 004 final-hit shortage linked to a >20-unit-short reconciliation) | RQ-034 � Debit Note lifecycle + compliance workflow |
| RQ-035 | Invoice Approval (target-024) | � | �6.2.11 Invoices | ? 100% | 43 + 5 seed | 4 invoice approvals (IA-2025-001 matching fabric / 002 mismatched trimmings / 003 over-tolerance fabric linked to DN-2025-001 / 004 approved factory invoice signed off by planner) | RQ-035 � Invoice Approval (target-024) |

---

## Overall Progress (by workflow stage)

| Stage | Items | Complete | In Progress | Pending | Tests |
|-------|-------|----------|-------------|---------|-------|
| 1 � Foundation & Cross-Cutting | 4 | 4 (100%) | 0 | 0 | 32 |
| 2 � Style & Design | 2 | 2 (100%) | 0 | 0 | 39 |
| 3 � Order Intake (FO & PO) | 4 | 4 (100%) | 0 | 0 | 95 |
| 4 � Technical / Spec | 2 | 2 (100%) | 0 | 0 | 34 |
| 5 � Costing | 2 | 2 (100%) | 0 | 0 | 46 |
| 6 � Procurement (Fabric & Trims) | 9 | 9 (100%) | 0 | 0 | 286 |
| 7 � Production & Job Queue | 5 | 5 (100%) | 0 | 0 | 122 |
| 8 � Shipment & Logistics | 3 | 3 (100%) | 0 | 0 | 88 |
| 9 � Quality & Compliance | 2 | 2 (100%) | 0 | 0 | 54 |
| 10 � Commercial & Finance | 2 | 2 (100%) | 0 | 0 | 86 |
| **Total** | **35** | **35 (100%)** | **0** | **0** | **834** |

> Tests count only fully-implemented items. RQ-015's app-level tests live in `apps/fabric/tests.py` (run separately from the canonical `tests/` suite); the canonical `python -m pytest tests` suite is **1126 green**.

---

## Part 2 Addendum — Design Module IA (A7, 2026-09-01)

Per the reference manual's **Design** module taxonomy (`05-UI-UX.md` §4), the Design-facing list screens
are regrouped under a dedicated top-level **Design** navigation module. All underlying features were
already present (RQ-005 Design Image Mgmt, RQ-006 Not Sold Analysis, RQ-014 Design Costing, tech-pack
import Part 3 RQ-036–042); this is purely an information-architecture regroup — no route/API/schema
changes.

**Design module:** Styles · Design Sheets · Tech Pack Import · Fit Specs · Job Requests · Costings
**Merchandising (remaining):** File Openings · Purchase Orders · BOMs
Sketch annotation + Material Breakdown stay inside Design Sheet detail (`/design-sheets/:id`).

*Per-slice feature mapping as requested:*

| Requested Design feature | BHMS screen | Route |
|---|---|---|
| Styles | `StylesListPage` + `StyleDetailPage` | `/styles` |
| Design sheets | `DesignSheetsListPage` + `DesignSheetPage` | `/design-sheets` |
| Design sheet import (= BHMS tech-sheet import) | `TechPackImportWizardPage` | `/styles/techpack-import` |
| Sketch annotation | `DesignSheetSketch` (annotate + save `saveDesignSheetAnnotations`) | `/design-sheets/:id` |
| Material Breakdown | `DesignSheetMaterial` (`material_items` grid: Cloth/Trims/Interfacing/Lining) | `/design-sheets/:id` |
| Fits specification | `FitSpecsPage` (+ `DesignSheetPage` fit tabs) | `/fit-specs` |
| Job request | `JobRequestsPage` (+ `DesignJobRequest`) | `/jobs` |
| Design costing | `DesignCostingsListPage` + `DesignCostingDetailPage` (**Style-level** single-piece cost, incl. **Prepare PO Costing** → order-level `Costing`); order-level **Design Costing** panel stays on `CostingDetailPage` | `/design-costings` (+ `/costings`) |

---

### RQ-006 Done (formerly target-034)
- Backend: `unsold_analysis` action on `JobRequestViewSet` (`/job-requests/unsold_analysis/`) � analytic query grouping **completed `sample` JobRequests** by style within a date period (default last 90 days), marking styles with a `FileOpening` as "sold" and the rest "not sold"; supports `start_date`/`end_date`/`status` (sold/not_sold) query params; returns `period`, `summary` (total_samples / styles_sampled / sold / not_sold) and per-style `results` (style_id, style_number, style_name, buyer_name, sample_count, has_file, not_sold, main_image)
- Seed: `_seed_unsold_analysis_data()` � one completed sample job per style (job numbers `JOB-9xxxx`), `created_at` backdated within the last 90 days; sold/not-sold mix driven by existing seeded FileOpenings
- Tests: `test_not_sold.py` (17) + `TestSeedNotSoldAnalysis` (3) � full suite **576 passed**, 0 failures (556 baseline + 20)
- Frontend: `UnsoldAnalysisRow` / `UnsoldAnalysisResponse` types + `merchApi.getUnsoldAnalysis(params)`; JobRequestsPage new **"Not Sold"** view � date-range + status filters, summary cards (completed samples / styles sampled / sold / not sold) and per-style results table with main-image thumbnail
- tsc clean, oxlint 0 errors, vite build succeeded

---

### RQ-007 Done (formerly target-025)
- Backend: `SalesConfirmation` model (`commercial`, TenantModel) with auto `SCF-` confirmation number, FK PO + Buyer, `sent_at`/`disputed_at`/`accepted_at`, `auto_accepted`, `dispute_reason`, `DISPUTE_WINDOW_HOURS = 48`, lifecycle `draft ? sent ? disputed|accepted` with `send()`/`window_elapsed()`/`auto_accept_overdue()`; migration `0004_salesconfirmation.py`
- API: `/api/v1/commercial/sales-confirmations/` CRUD + actions `send/`, `dispute/` (reason required), `accept/` (detail) + `auto_accept/` + `dashboard/` (list); tenant-scoped, `commercial:*` permission guarded
- Celery: `auto_accept_sales_confirmations` task in `apps/commercial/tasks.py` (autodiscovered) returning `{"auto_accepted": N}` � sweeps sent confirmations past the 48h window
- Seed: `_seed_sales_confirmations()` � 5 confirmations (draft / sent�2 incl. one 72h overdue / disputed / auto-accepted)
- Tests: `test_sales_confirmation.py` (29) + `TestSeedCommercialData` sales-confirmation tests (3) � full suite **608 passed**, 0 failures (576 baseline + 32)
- Frontend: `SalesConfirmation`/`SalesConfirmationDashboard` types + `commercialApi` methods; new SalesConfirmationsPage (dashboard cards, list, create/edit modal, Send/Dispute/Accept lifecycle actions, dispute-reason modal, Auto-Accept Overdue button); route `/sales-confirmations` + Commercial nav item
- tsc clean, oxlint 0 errors, vite build succeeded

---

### RQ-008 Done (formerly target-026)
- Backend: `FileOpening` extended (additive) with `is_quick_lead` (bool) + `quick_lead_agreed_by` (JSON list) + `QUICK_LEAD_PARTIES = [sales, buying, customer, technical, planning, merchandising]` + `quick_lead_agreement_complete`/`missing_agreements` properties + `add_agreement(party)`/`unmark_quick_lead()` methods; migration `0018_fileopening_is_quick_lead_and_more.py`
- API: `/api/v1/merchandising/file-openings/{id}/quick_lead/` + `unmark_quick_lead/` + `agree_quick_lead/` (POST `{party}`) + `quick_lead_status/` (GET); new actions permission-guarded (`merchandising:edit` / `:view`); `is_quick_lead` added to filterset for cross-screen filtering; serializer exposes quick-lead computed fields
- Seed: `_seed_quick_lead_data()` � 2 quick lead file openings (1 fully agreed by all 6 parties, 1 partially agreed)
- Tests: `test_quick_lead_time.py` (20) + `TestSeedQuickLead` (3) � full suite **631 passed**, 0 failures (608 baseline + 23)
- Frontend: `FileOpening` type extended + `merchApi` mark/unmark/agree/status methods; FileOpeningsListPage yellow **QL** badge + Quick Lead filter toggle; FileOpeningDetailPage yellow Quick Lead section (mark/unmark, party agreement checklist with agree buttons, completion indicator)
- tsc clean, oxlint 0 errors, vite build succeeded

---

### RQ-018 Done (formerly target-007)
- Backend: `FabricOrder` extended (additive) with `risk_level` FK (setup.RiskLevel, SET_NULL) + `risk_notes` (Text) + `date_owners` (JSONField, per-date role overrides) + `effective_owner(date_key)` (clearance=logistics; lab_dip=sales?merchandising after bulk; onboard/eta=sales?merchandising after dip?planning after bulk; `date_owners` overrides win) + `effective_owners()` + `recompute_risk()` (none?amber once bulk+onboard approved, red sticky for over-tolerance/issue, green when cleared/delivered; no-op without RiskLevel rows) + `apply_risk_policy()` (persists recomputed policy to FK); lifecycle actions `record_lab_dip`/`approve_bulk`/`ship`/`deliver` now call `apply_risk_policy()`; migration `0004_fabricorder_date_owners_fabricorder_risk_level_and_more.py`
- API: `FABRIC_PERMS` += `risk_status` (view) + `set_risk`/`recompute_risk`/`update_schedule_dates` (edit); `risk_level` filterset; serializer exposes `risk_level`/`risk_level_code`/`risk_level_name`/`risk_notes`/`date_owners`/`effective_owners`; actions `risk_status/` (GET � policy code + effective owners), `set_risk/` (POST `{risk_level, risk_notes}`, 400 missing/invalid/cross-tenant), `recompute_risk/` (POST), `update_schedule_dates/` (POST `{dates}` � validates against `SCHEDULE_DATE_KEYS`, enforces role ownership via `user.user_roles` ? 403 wrong owner)
- Seed: `_seed_fabric_risk_data()` � draft?none, bulk_approved?red w/ risk_notes, delivered?green via `apply_risk_policy`; `counts["fabric_risk"]`
- Tests: `test_fabric_risk.py` (36) + `TestSeedFabricRisk` (3) � full suite **759 passed**, 0 failures (720 baseline + 39)
- Frontend: `FabricOrder` risk fields + `FabricRiskStatus` type + `fabricApi` getRiskStatus/setRisk/recomputeRisk/updateScheduleDates; FabricOrdersPage risk badge column + **Risk & Schedule** modal (policy + current risk, date-owner chain, set risk level + notes, recompute, schedule date editor)
- tsc clean, oxlint 0 errors, vite build succeeded

---

### RQ-020 Done (formerly target-017)
- Backend: net-new `FabricScheduleHandoff` model (`fabric`, TenantModel) � audit log (order FK, date_key, from_role, to_role, trigger dip_approved/bulk_approved/manual, handed_off_by user FK, handed_off_at, notes); migration `0005_fabricschedulehandoff.py`; `FabricOrder` += `OWNER_CHAIN` (lab_dip: sales?merchandising; onboard/eta: sales?merchandising?planning; clearance: logistics) + `next_owner(date_key, role)` + `schedule_handoff(date_key, from_role, to_role, by_user, trigger, notes)` (atomic: writes `date_owners` override + handoff row, ValueError on unknown key/invalid transition) + `handoff_on_dip_approval(user)` (onboard/eta sales?merchandising) + `handoff_on_bulk_approval(user)` (onboard/eta merchandising?planning + lab_dip sales?merchandising) � both idempotent (only fire when the current effective owner is the expected role)
- API: `FABRIC_PERMS` += `schedule_status` (view) + `handoff_schedule` (edit); `record_lab_dip`/`approve_bulk` now fire the auto-handoff triggers before mutating status (idempotent, additive); new actions `schedule_status/` (GET � order_number, date_owners, effective_owners, handoff history) + `handoff_schedule/` (POST `{date_key, notes}` � owner-gated 403, final-owner/invalid-key 400, returns order + handoff); **China office assist**: `china_office` role (space-normalized) may update/hand off any date key in `update_schedule_dates` and `handoff_schedule`
- Seed: `_seed_fabric_schedule_data()` � replays the full chain (sales?merch?planning on onboard/eta + lab_dip) for the bulk_approved and delivered orders (5 handoffs each), draft untouched; `counts["fabric_schedule"]`; cascade-clean via FabricOrder delete
- Tests: `test_fabric_schedule.py` (28) + `TestSeedFabricSchedule` (3) � full suite **790 passed**, 0 failures (759 baseline + 31)
- Frontend: `FabricScheduleHandoff`/`FabricScheduleStatus` types + `fabricApi` getScheduleStatus/handoffSchedule; FabricOrdersPage Risk & Schedule modal gains **Role Handoff** section (per-date owner + "Hand off to next role" button, note field, handoff history list)
- tsc clean, oxlint 0 errors, vite build succeeded

---

### RQ-023 Done (formerly target-030)
- Backend: net-new `FabricUtilization` model (`fabric`, TenantModel) � `order` FK + `period` (YYYY-MM, unique per tenant+order+period) + `received_meters`/`used_meters`/`wasted_meters`/`damaged_meters` (MinValueValidator 0) + notes/recorded_by/recorded_at; computed quantities (never stored): `ordered_meters` (from order), `over_under_meters`/`over_under_pct` (final rating vs actual rating), `accounted_meters`, `excess_meters` (received - used - wasted - damaged), `efficiency_pct` (used � received) � all Decimal-coerced and quantized to 2dp; migration `0006_fabricutilization.py`
- API: `FabricUtilizationViewSet` at `/api/v1/fabric/utilizations/` (CRUD, `fabric:*` mapped, select_related order/supplier/category to avoid N+1) + `monthly_summary/` (GET, optional `period` defaults to current month � aggregated summary + serialized rows) + `quarterly_mill_report/` (GET `year`+`quarter` 1-4, 400 on invalid/missing � grouped by supplier/mill with orders_count, over/under %, efficiency %, excess); `FABRIC_PERMS` += `monthly_summary`/`quarterly_mill_report` ? `fabric:view`
- Seed: `_seed_fabric_utilization_data()` � 2 docket-stage records (FO-2026-1002 prev month final-rating reconciliation, FO-2026-1003 current month excess-at-docket) ? 2-period monthly report + 2-mill quarterly report; `counts["fabric_utilization"]`
- Tests: `test_fabric_utilization.py` (33) + `TestSeedFabricUtilization` (3) � full suite **826 passed**, 0 failures (790 baseline + 36)
- Frontend: `FabricUtilization`/`FabricUtilizationSummary`/`MonthlySummary`/`QuarterlyMillReport` types + `fabricApi` getUtilizations/create/update/delete/getMonthlySummary/getQuarterlyMillReport; new FabricUtilizationPage (monthly summary cards + period loader, quarterly mill performance table + year/quarter loader, utilization records table with computed columns + create-record modal + delete); route `/fabric/utilizations` + Fabric nav item
- tsc clean, oxlint 0 errors, vite build succeeded

---

## RQ-034 Done (formerly target-023) ?

- TDD: net-new `tests/unit/test_debit_note.py` (34) � red first (missing model/endpoint), green after implementation; covers model (pro-forma default, `str`, amount/shortage validators, per-tenant unique debit_number, `issue()`/`mark_paid()` lifecycle + illegal-state guards, full lifecycle, default tolerance 5.00) and API (401 unauthenticated, create with auto `DN-�` number + PO/buyer/currency lookups, requires-reason 400, zero-amount 400, list filters by status/debit_type, PO-number search, retrieve read-only display fields, update amount, status read-only via CRUD, `issue/` + `mark_paid/` actions + illegal-state 400, dashboard summary, CSV export, tenant isolation) and integration (RQ-027 final-hit >20-unit-short reconciliation ? `requires_debit` flag ? linked debit; RQ-031 over-tolerance candidates via `PaperworkComparisonService` with the target 2% Primark/Penney vs 5% default rule)
- Backend: net-new `DebitNote` model (`commercial` app, TenantModel, migration `0005_debitnote.py`) � FK `purchase_order` (? merchandising.PurchaseOrder) + optional `reconciliation` (? logistics.FinalHitReconciliation, SET_NULL � the >20-unit-short trigger) + `debit_type` (5 target choices) + `party_type` (factory/fabric_supplier/trim_supplier/other) + `debited_party` + `amount` (Min 0.01) + `currency` (? setup.Currency) + `shortage_units` + `tolerance_pct` (default 5.00) + `reason` + `status` (pro_forma/issued/paid) + compliance workflow fields (`compliance_email` default `compliance@bhms.local`, `compliance_email_sent`, `email_sent_at`) + `raised_by`/`raised_at`/`issued_at`/`paid_at`/`notes`; `unique_together` tenant+debit_number; `issue()` (pro_forma ? issued, stamps compliance email send) + `mark_paid()` (issued ? paid, senior finance)
- API: `DebitNoteViewSet` at `/api/v1/commercial/debit-notes/` (CRUD, tenant-scoped via `request.tenant`, `commercial:*` permission mapped, search debit_number/PO/debited_party/reason, filters status/debit_type/party_type) + `issue/` (POST detail � compliance send) + `mark_paid/` (POST detail) + `pending_over_tolerance/` (GET list � debit candidates reusing the RQ-031 `PaperworkComparisonService`, target 5%/2% tolerance) + `dashboard/` (GET list � total/by-status/total_value/compliance emails sent/pending value) + `export/` (GET CSV); serializer exposes `po_number`/`buyer_name`/`reconciliation_number`/`currency_code`/`*_display`/`raised_by_name`; debit_number/status/compliance/audit fields read-only; admin registered
- target manual anchors (�6.2.10 / �16 Debits Management, p44): debits MUST be raised as soon as the issue is confirmed; pro forma until details confirmed, then formally issued from the compliance mail address cc'ing the raiser; managed by senior finance until paid; over-tolerance threshold 5% default, 2% for Primark/Penney's; anything over 20 units short on final hits must be debited unless reasons evident
- Seed: `_seed_debit_notes()` in `seed_demo_data.py` � 4 deterministic debit notes (DN-2025-001 pro forma over-tolerance, DN-2025-002 issued fabric shortage, DN-2025-003 paid trims shortage, DN-2025-004 final-hit shortage linked to the first >20-unit-short `FinalHitReconciliation` from the RQ-027 seed, amount derived from its `shortage_units`); cleared in `_clear_data`; `counts["debit_notes"]`; idempotent on re-runs (re-stamps lifecycle state)
- Tests: `test_debit_note.py` (34) + `TestSeedDebitNotes` (4) � full suite **1078 passed**, 0 failures (1074 baseline + 4 seed); ruff clean on `apps/commercial/` + seed + test files (pre-existing `pdf_utils.py` import warnings and the auto-generated-migration header warning untouched)
- Frontend: `DebitNote`/`DebitNoteDashboard`/`OverToleranceCandidate` types + `commercialApi` getDebitNotes/get/create/update/delete/issueDebitNote/markDebitNotePaid/getPendingOverTolerance/getDebitNotesDashboard/exportDebitNotes; new DebitNotesPage (6 summary cards total/pro-forma/issued/paid/compliance-emails/open-value, over-tolerance debit banner with per-candidate **Create Debit** prefill, status filter pills, register table with debit/PO/buyer/type/amount/currency/status badge/compliance-sent/raised-by + Issue (pro forma ? compliance send) / Mark Paid (issued ? senior finance) / Edit / Delete, create/edit modal with PO picker + type + party + amount + currency + shortage units + tolerance % + reason + notes, CSV export); route `/debit-notes` + "Debit Notes" Commercial nav item
- tsc clean, oxlint 0 errors, vite build succeeded

---

## RQ-033 Done (formerly target-029) ?

- TDD: net-new `tests/unit/test_compliance_audit.py` (31) � red first (`ImportError: cannot import name 'ComplianceAudit'`), green after implementing model/API; covers model (8-item checklist keys, week normalization to Monday, efficiency threshold 85.00 ? mini-marker pass/fail/na, `fail_count`/`overall_pass`/`reviewed`, `warning_count` capped at 3 + `warning_label`, tenant scoping) and API (unauthenticated 401, CRUD, filters by PO/week/result pass|fail|pending, efficiency range validation 400, `weekly_overview/` default + week param + pending orders + checklist keys, `export/` CSV header/rows, 403 permission, tenant isolation)
- Backend: net-new `ComplianceAudit` model (`quality` app, TenantModel, migration `0006_complianceaudit.py`) � FK `purchase_order` + `week_start` (DB-indexed, `unique_together` tenant+PO+week, `week_start_for()` normalizes to Monday) + `efficiency_rate` Decimal(5,2) 0�100 (blank ? mini-marker `na`; `>= 85.00` ? `pass`, else `fail`; `EFFICIENCY_THRESHOLD = Decimal("85.00")`) + 7 stored status fields (`fabric_paperwork`/`dockets`/`fabric_utilisation`/`factory_invoice`/`fabric_rating`/`recon_costed_vs_actual`/`final_hits`, each pass/fail/na) + `notes`; `CHECKLIST_ITEMS` lists all 8 keys+labels, `STORED_ITEM_KEYS` excludes derived `mini_marker_efficiency`; read-only properties `mini_marker_efficiency_status` (Decimal-coerced for direct `.create()`), `efficiency_met`, `status_for(key)`, `fail_count`, `overall_pass` (fail_count == 0), `reviewed`, `warning_count` (consecutive failing weekly audits for tenant+PO ordered `-week_start`, capped 3), `warning_label`
- API: `ComplianceAuditViewSet` at `/api/v1/quality/compliance-audits/` (CRUD, `quality:view/create/edit/delete` mapped, select_related PO/buyer/file_opening/style, `result` filter param fail/pass/pending via `Case/When` annotations) + `weekly_overview/` (GET � `{week_start, threshold, checklist, summary:{total_orders/audited/pass/fail/incomplete/pending}, pending_orders, results}`, total orders = tenant POs excluding cancelled) + `export/` (GET � CSV with PO/buyer/style/delivery/week/efficiency + 8 checklist columns + fail_count/overall_pass/warning_count/notes, Content-Disposition `compliance_audits_{week}.csv`); serializer exposes `po_number`/`buyer_name`/`po_status`/`style_number`/`delivery_date` + computed read-only fields
- target manual anchors (�6.4.3, p47): 8 weekly review items; mini-marker efficiency must be above 85%; 3-warning policy � consecutive failing weekly audits ? 2 warnings ? 3rd = dismissal, capped at 3
- Seed: `_seed_compliance_audits()` � 16 audits across the first 12 POs (8-week pass/fail/pending cycle + PO-1014/PO-1015 with 3 consecutive failing weeks demonstrating 1st?2nd?3rd warning); `counts["compliance_audits"]`; cleared in `_clear_data`
- Tests: `test_compliance_audit.py` (31) � full suite **1040 passed**, 0 failures (1009 baseline + 31), 64.12s; ruff clean on `apps/quality/` + test file
- Frontend: `ComplianceAudit*` interfaces + `qualityApi` getComplianceAudits/get/create/update/delete/getComplianceWeeklyOverview/exportComplianceAudits; new ComplianceAuditsPage (weekly overview summary cards total/audited/pass/fail/not-reviewed/pending, week picker defaulting to current Monday, result filter, dynamic 8-checklist status matrix with pass/fail/na badges + efficiency %, overall + warning badges, CSV export, create/edit modal with PO picker + efficiency-rate input + 7 status selects, delete confirm, not-yet-audited orders panel); route `/quality/compliance-audits` + "Compliance Audit" Quality nav item
- tsc clean, oxlint 0 errors, vite build succeeded

---

## RQ-035 Done (formerly target-024) ?

- TDD: net-new `tests/unit/test_invoice_approval.py` (43) � red first (`ImportError: cannot import name 'InvoiceApproval'`), green after implementing model/API; covers model (pending default, `str`, matching � exact match, quantity over/under/within tolerance vs the target 5% default and 2% Primark/Penney's rule, price/amount/date mismatch, multiple mismatch reasons, `tolerance_pct` reusing the RQ-031 `PaperworkComparisonService`, `is_match`/`match_status`/`mismatch_reasons`/`auto_approval_eligible`, amount/quantity MinValueValidators, per-tenant unique invoice_number, `approve()`/`reject()` lifecycle + illegal-state `ValueError`, `raise_debit()` creating a linked RQ-034 pro-forma `DebitNote` only for over-tolerance invoices with variance�price amount, full lifecycle) and API (401, create with auto `INV-�` number + PO/buyer/currency lookups + computed fields, requires-PO 400, retrieve computed fields, filters by status/invoice_type/match, PO-number search, `approve/` + `reject/` (reason required) + `raise_debit/` (400 when not over-tolerance) actions, dashboard summary, CSV export, tenant isolation) and integration (over-tolerance invoice ? linked debit via RQ-034; tolerance derived from RQ-031 service)
- Backend: net-new `InvoiceApproval` model (`commercial` app, TenantModel, migration `0006_invoiceapproval.py`) � FK `purchase_order` (required) + `invoice_type` (fabric/trimmings/factory, default fabric) + `invoice_date` + `quantity`/`unit_price`/`amount` (each Min 0.01) + `currency` (? setup.Currency, SET_NULL) + `status` (pending/approved/rejected) + `rejection_reason` + OneToOne `debit_note` (? RQ-034 DebitNote, SET_NULL � the over-tolerance debit link) + `approved_by`/`approved_at`/`rejected_by`/`rejected_at`/`notes`; `unique_together` tenant+invoice_number; computed `tolerance_pct` (reuses RQ-031 service so the 5%/2% rule is single-sourced), `quantity_variance(_pct)`, `over_tolerance`, `quantity_matches`/`price_matches`/`amount_matches` (amount == qty�price)/`date_matches` (invoice_date = PO delivery date), `is_match`, `match_status` (match/over_tolerance/mismatch), `mismatch_reasons`, `auto_approval_eligible` (exact matches � the future accounts-package auto-approval flag, no actual auto-approve); lifecycle `approve(user)` (planner signs off ? accounts) + `reject(reason, user)` (reason required) + `raise_debit(user)` (pro-forma debit with variance�unit_price, 5%/2% tolerance, linked)
- API: `InvoiceApprovalViewSet` at `/api/v1/commercial/invoice-approvals/` (CRUD, tenant-scoped via `request.tenant`, `commercial:*` permission mapped, search invoice_number/PO/notes, filters status/invoice_type/purchase_order + computed `match` filter param) + `approve/` (POST detail) + `reject/` (POST detail, `rejection_reason` required 400) + `raise_debit/` (POST detail � creates and returns the RQ-034 `DebitNote`, 400 when not over-tolerance) + `dashboard/` (GET � total/by-status/over_tolerance/auto_approval_eligible) + `export/` (GET CSV incl. match_status/over_tolerance/debit_number); serializer exposes `po_number`/`buyer_name`/`currency_code`/`*_display`/`approved_by_name`/`rejected_by_name`/`debit_number` + computed read-only fields; `purchase_order` required via `extra_kwargs`; admin registered (with a `match_status` column)
- target manual anchors (�6.2.11 / �17 Invoice Approvals, p44): "Quantity � Date � Price must match the information on target. Over-tolerance fabric quantities should have debit raised corresponding." (p44) and planners initially sign off the factory invoice then hand over to accounts (p40); auto-approvals with the accounts package are a future enhancement � implemented as the `auto_approval_eligible` flag only
- Seed: `_seed_invoice_approvals()` in `seed_demo_data.py` � 4 deterministic invoice approvals (IA-2025-001 matching fabric / 002 mismatched trimmings price / 003 over-tolerance fabric linked to the seeded DN-2025-001 pro forma debit / 004 approved factory invoice signed off by the reviewer), amounts derived from the PO quantity/unit_price so match states stay deterministic; cleared in `_clear_data` (before DebitNote); `counts["invoice_approvals"]`; idempotent on re-runs (re-stamps match state + approval stamps)
- Tests: `test_invoice_approval.py` (43) + `TestSeedInvoiceApprovals` (5) � full suite **1126 passed**, 0 failures (1078 baseline + 48); ruff clean on `apps/commercial/` + seed + test files (pre-existing `pdf_utils.py` import warnings and the auto-generated-migration header warning untouched)
- Frontend: `InvoiceApproval`/`InvoiceApprovalDashboard` types + `commercialApi` getInvoiceApprovals/get/create/update/delete/approveInvoice/rejectInvoice/raiseDebitForInvoice/getInvoiceApprovalsDashboard/exportInvoiceApprovals; new InvoiceApprovalsPage (6 summary cards total/pending/approved/rejected/over-tolerance/auto-approve-ready, status + match filter pills, register table with invoice#/PO/buyer/type/amount/currency/match badge/status badge/invoice-date + Approve (planner sign-off ? accounts) / Reject (reason modal) / Raise Debit (over-tolerance only, shows linked debit #) / Edit / Delete, create/edit modal with PO + invoice type + date + quantity/unit-price/amount + currency + notes, CSV export); route `/invoice-approvals` + "Invoice Approvals" Commercial nav item
- tsc clean, oxlint 0 errors (pre-existing-pattern `exhaustive-deps` warnings), vite build succeeded

---

## RQ-014 Done (formerly target-032) ?

- TDD: net-new `tests/unit/test_design_costing.py` (22) � red first (22 failing on missing model fields/actions), green after backend; covers model (4 `PATTERN_OPTIONS`, `is_single_size` default + `single_size_watermark` property, `size_ratio`/`patterned_fabric_options` defaults, `confirmed` default, `size_width` default), Design Costing API (create with design fields, watermark serialized, `size_width` writable, `is_single_size`/`is_patterned`/`confirmed` filters, patterned-option validation, size-ratio validation, `confirm/` action, `pattern_amendment/` action, auth). Test client defaults to JSON (`default_format = "json"`) so nested `size_ratio`/`patterned_fabric_options` reach the serializer as real JSON (DRF multipart would stringify them ? "Value must be valid JSON.")
- Backend: `Costing` extended (additive, migration `0022_costing_confirmed_costing_confirmed_at_and_more.py`) with `notes` (Text), `is_single_size` (bool, default False), `size_ratio` (JSON list of `{size, ratio}`), `confirmed`/`confirmed_by`/`confirmed_at` (audit trail mirroring approval), `is_patterned` (bool), `patterned_fabric_options` (JSON subset of the 4 `PATTERN_OPTIONS`), + `single_size_watermark` property (= `is_single_size`); `CostingLine` += `size_width` (CharField) � the costing-schedule size/width column
- API: `CostingSerializer` exposes the new fields (`single_size_watermark` read-only) + validation (options must be from the 4 known values; `is_patterned` requires =1 option; non-patterned rejects options; `size_ratio` entries need a non-empty size + positive ratio); `filterset_fields` += `is_single_size`/`is_patterned`/`confirmed`; new actions on `CostingViewSet` (both `merchandising:edit`): `POST /costings/{id}/confirm/` (ticks confirmed + user/date) and `POST /costings/{id}/pattern_amendment/` (`{note}` required) which creates the next costing version for the same PO carrying design options + lines forward, fresh `draft`/`not live`/`not confirmed`, amendment recorded in notes � enforcing "a pattern amendment MUST request a new costing"
- target manual anchors: "If it's a patterned fabric, there are 4 additional options to have the costing done accurately" / "if you do require a single size costing, please ensure it's stated" / "A single size watermark will show over the image, as this should not be used for production purposes" / "It is important to state the sizes and ratio each time you request a costing update" / "Only tick the confirmed box, once you have this confirmed with the customer" / "you will need to ensure the size/width column is filled in" / "if a pattern amendment is being requested, you MUST request a new costing the same time"
- **Assumption (documented)**: the target manual does not enumerate the 4 patterned-fabric options; implemented as `PATTERN_OPTIONS = [striped, checked, one_way, match_point]` (industry-standard pattern-match types) � swap the labels in `models.py`/`serializers.py`/frontend if the manual is later clarified
- Seed: `seed_all_modules.py` Costing block now deterministically applies design fields to the first 8 POs' costings (idempotent write-if-differs � fills pre-existing rows too): single-size watermark on 3, patterned striped+match-point on 4, sizes & ratio (S/M/L 1:2:2 or single M), confirmed ticks on 2, notes, `size_width` "58 in" on fabric/trim lines
- Tests: `test_design_costing.py` (22) � full suite **1009 passed** (987 baseline + 22); ruff clean on all touched files (black not a project gate � repo-wide formatting is non-black)
- Frontend: `CostingLine` += `size_width`, `Costing` += `SizeRatioEntry`/design fields, `merchApi` += updateCosting/confirmCosting/patternAmendmentCosting; CostingDetailPage new **Design Costing** panel (notes box, single-size toggle + red watermark overlay over the style design image, sizes & ratio editor with add/remove, patterned-fabric toggle + 4-option checkboxes, Confirm-with-Customer button + confirmed badge with user/date, Pattern Amendment button ? note prompt ? new costing, Save Design ? PATCH) + `size_width` column on the cost-lines table + Single Size/Patterned/Confirmed header badges; CostingsListPage new **Design** badges column (single-size/patterned/confirmed)
- tsc clean, oxlint 0 errors (pre-existing-pattern `exhaustive-deps` warnings), vite build succeeded

---

## RQ-013 Done (formerly target-031) ?

- TDD: extended `tests/unit/test_costing.py` to 24 tests � red first (`ImportError: cannot import name 'CostingLine'`), green after backend; covers model (8 categories, 5 sheet types, `sl` default, landed-cost conversion + None, line totals, additional-line clean), Costing API (create with sheet_type/rate, `sl`/live defaults, sheet_type + is_live filters, `set_live` untoggle, nested lines, auth), CostingLine API (create, invalid category, additional validation, is_additional filter, update, approve additional / reject non-additional, auth, tenant scoping)
- Backend: `Costing` extended (additive, migration `0021_costing_exchange_rate_costing_is_live_and_more.py`) with `sheet_type` (5 choices: sl/vn/bd/cn/other, default `sl`), `is_live` (default True � the ticked live sheet), `exchange_rate` (GBP per 1 USD, nullable) + `landed_cost` property (`total_cost * rate`, quantized, None without rate); net-new `CostingLine` (TenantModel) � `costing` FK `related_name="lines"`, `category` (8 choices), `description`, `unit_price`, `consumption`, `line_total` property, `is_additional`, `original_description`, `approved_by`/`approved_at`, `sort_order`; `clean()` rejects additional lines without an original description
- API: `CostingSerializer` exposes `sheet_type`/`sheet_type_label`/`is_live`/`exchange_rate`/`landed_cost` + nested read-only `lines` (`line_total`, `category_label`, `approved_by_name`); `filterset_fields` += `sheet_type`, `is_live`; `POST /api/v1/merchandising/costings/{id}/set_live/` (untoggles other sheets for the same PO/tenant, `merchandising:edit`); net-new `CostingLineViewSet` at `costing-lines` (CRUD + `category`/`is_additional` filters + `POST /costing-lines/{id}/approve/` only for additional lines); export CSV adds sheet type/live/rate/landed cost + cost-lines block
- Seed: `seed_all_modules.py` Costing block � 8 costings across the 5 sheet types, first live, alternating `0.79` exchange rate, 5 cost lines each (plus the pre-existing row set)
- Tests: `test_costing.py` (24) � full suite **987 passed** (963 baseline + 24); ruff clean
- Frontend: `Costing`/`CostingLine` types + `merchApi` setLiveCosting/getCostingLines/createCostingLine/approveCostingLine; CostingsListPage Sheet column + Live badge + sheet_type filter; CostingDetailPage sheet type/live badge, Set-as-Live button, exchange rate + landed cost (GBP), cost-lines table (category/unit price/consumption/line total, amber Additional rows with matching original description) + Add Additional Cost form + per-line Approve button for pending additional costs
- tsc clean, oxlint 0 errors, vite build succeeded

---

## RQ-031 Done (formerly target-022) ?

- TDD: net-new `tests/unit/test_paperwork_comparison.py` (20) � red first (missing `logistics.services` module), green after service + endpoint; covers tolerance selection, per-PO comparison, tenant aggregation/sort, docket meter input, producibility, API auth/permission/tenant scoping
- Backend: net-new `apps/logistics/services/paperwork_comparison.py` � `PaperworkComparisonService` with `TOLERANCE_PCT_DEFAULT = 5.00`, `TOLERANCE_PCT_DISCOUNT_RETAILERS = 2.00` (Primark / J.C. Penney by buyer-name substring), `SHIPPED_STATUSES`; `tolerance_pct_for_buyer()` + `_fabric_consumption_per_garment()` (active BOMs, `category__iexact="fabric"`) + `compare_po()` + `compare_tenant()` (sorted by absolute variance desc, summary counts) � shipped qty = non-cancelled shipped-status `Shipment.quantity` sum, shipped fabric meters = `Docket.total_fabric_meters` sum, producible = `meters // consumption`
- API: `GET /api/v1/logistics/shipments/paperwork_comparison/` � `paperwork_comparison` action on `ShipmentViewSet`, `logistics:view` permission, returns `{count, summary:{checked, over_tolerance_count, cannot_cover_count}, results}`; tenant scoping via `request.tenant`
- Seed: `_seed_paperwork_comparison_data()` � 2 dedicated scenario POs (`PO-PC-OVER` 8% over-tolerance covering order, `PO-PC-SHORT` cannot cover), each with own shipment + docket; registered in `handle()` after `order_manager_demo`; `TestSeedPaperworkComparison` (4) + `TestSeedDockets::test_seed_creates_dockets` updated to assert 6 dockets
- Tests: `test_paperwork_comparison.py` (20) + seed (4) � full suite **963 passed** (939 baseline + 24; the one pre-existing docket-count assertion was fixed to expect 6), ruff clean
- Frontend: `PaperworkComparisonRow` / `PaperworkComparison` types + `logisticsApi.getPaperworkComparison()`; new PaperworkComparisonPage at `/paperwork-comparison` � summary cards (checked / over-tolerance / cannot-cover), all/over/short filter, comparison table, row click ? PO detail; route + "Paperwork Comparison" Logistics nav item
- tsc clean, oxlint 0 errors, vite build succeeded

---

## RQ-030 Done (formerly target-018) ?

- TDD: net-new `tests/unit/test_booking_ref.py` (22) � red first (`TypeError: Shipment() got unexpected keyword arguments: 'booking_reference'`), green after fields + save derivation + alert endpoint
- Backend: `Shipment` extended (additive, migration `0010_shipment_booking_ref_required_date_and_more.py`) with `booking_reference` (CharField, logistics-managed) + `booking_ref_required_date` (DateField, auto-derived = `eta - 14 days` via `BOOKING_REF_MIN_DAYS = 14`; re-derives when ETA moves while the stored value is still the derived default; a manual override is always respected); `booking_ref_status` property (`ok`/`na`/`due`) + `booking_ref_alerts()` classmethod (blank ref past the deadline)
- API: `ShipmentSerializer` exposes `booking_ref_status` (read-only); `booking_reference`/`booking_ref_required_date` writable via standard CRUD; new `GET /api/v1/logistics/shipments/booking_ref_alerts/` (list action, `logistics:view`, tenant-scoped, `{count, results}`); `booking_reference` added to search + `export/` CSV rows
- target manual anchors: "Booking Ref is managed by logistics. This must be filled in 14 days minimum before the actual date" (L1306) / "never blank from 2 weeks before the delivery date" (L1187). Anchor date = shipment ETA (the delivery/arrival date logistics manages)
- Seed: `_seed_booking_ref_data()` � runs after `_seed_shipments()`: `SHP-2025-002` filled `BRF-2025-1184` (ok), `SHP-2025-004` past-ETA with no ref (surfaces on the 14-day alert); `counts["booking_ref"]`
- Tests: `test_booking_ref.py` (22) + `TestSeedBookingRef` (3) � full suite **939 passed**, 0 failures (914 baseline + 25); ruff-clean on all touched files
- Frontend: `Shipment` type extended (booking_reference/booking_ref_required_date/booking_ref_status) + `logisticsApi.getBookingRefAlerts()`; ShipmentsPage gains a **Booking References Due** action banner (inline fill + Save, clears on success), a Booking Ref column with OK/N/A/DUE badge, and booking-ref fields in the create/edit modal (no new route � booking ref is a shipment attribute)
- tsc clean, oxlint 0 errors (70 pre-existing-pattern `exhaustive-deps` warnings), vite build succeeded

---

## RQ-028 Done (formerly target-019) ?

- TDD: net-new `tests/unit/test_order_manager.py` (27) � red first (25 failures: `AttributeError`/404 on missing `order_manager` endpoint), green after implementing serializer + aggregate action
- Backend: `OrderManagerSerializer` in `apps/merchandising/serializers.py` + `order_manager` action + module-level `order_manager_summary(results)` helper in `apps/merchandising/views.py` on `PurchaseOrderViewSet` � `GET /api/v1/merchandising/purchase-orders/order_manager/`, `detail=False`, `url_path="order_manager"`, permission `merchandising:view`, tenant-scoped, `prefetch_related` on buyer / file_opening__style / job_requests / fit_specs / shipments__dockets / shipments__schedule_items / shipments__reconciliations / shipments__gold_seals
- API contract: response `{summary: {...}, results: [...]}` (NOT DRF paginated). Filters: `status` (exact), `buyer` (buyer_id), `q` (po_number / buyer__name / file_opening__file_number / file_opening__style__style_number icontains), `risk` (post-compute ok/watch/risk). Rows sorted `delivery_date, po_number`. Row shape: po_id, po_number, file_number, buyer_name, style_number, delivery_date, quantity, status, status_label, production{total,open,overdue,completed}, technical{fit_stage,fit_stage_label}, logistics{shipments_total,delivered,in_transit,delivered_pct}, dockets{total,final_raised,over_limit_pending}, reconciliation{pending_debits,shortage_units}, schedule{items_total,items_delivered,delivered_pct}, gold_seal{status,status_label}, risk{level,flags}
- Risk model (test-verified): `risk` flags = overdue completion (delivery_date past while not delivered/cancelled), overdue production jobs, pending debits, over-limit final dockets not sales-notified; else `watch` flags = open production jobs, schedule <100% delivered, fit stage not `pp`, gold seal not approved; else `ok`. `pending_debits` counts reconciliations where `requires_debit and status != "debited"`; `over_limit_pending` = `is_final and unused_fabric_meters > 200 and not sales_notified`; current-fit derivation = first `is_current` fit_spec else first fit_spec
- Seed: `_seed_order_manager_demo()` � runs AFTER `_seed_gold_seals()` (ordering matters � gold-seal seeder touches every shipment). Deterministic rows: `PO-DEMO-01` (open, delivery_date today-30d, job `JOB-DEMO-01` pending/overdue ? risk/red) and `PO-DEMO-02` (delivered, `SHP-DEMO-01` delivered, one delivered `BookingScheduleItem`, approved `GoldSeal`, reconciled `FinalHitReconciliation` ? ok/green). Reuses first existing Buyer/Factory/Currency/FileOpening/style � no new Styles/FOs (existing seed tests assert unsold-analysis jobs == styles count and every job has JOB prefix); `counts["order_manager_demo"]`
- Tests: `test_order_manager.py` (27) + `TestSeedOrderManager` (3) � full suite **914 passed**, 0 failures (881 baseline + 33); ruff-clean on views/serializers/tests/seed
- Frontend: `OrderManagerDashboard` + tile/risk/row types + `merchApi.getOrderManager(params)` in `src/api/client.ts`; new `OrderManagerDashboardPage.tsx` (8 summary chips, search/buyer/status/risk filters, per-order table with risk chip + flags, PO/file, buyer/style, completion date, status badge, qty, production open/overdue, fit stage, logistics %, dockets final/over-limit, debits, schedule %, gold-seal badge; row click ? `/purchase-orders/{po_id}`); route `/order-manager` + "Order Manager" nav item under the **Production** group in `Layout.tsx`
- tsc clean, oxlint 0 errors (1 pre-existing-pattern `exhaustive-deps` warning from the new page's `useEffect` deps), vite build succeeded

- G-08 Critical Path enhancement (2026-09-04, TDD entry #44): `OrderManagerSerializer` row now includes a
  `critical_path` block derived from the T&A critical path (`TAMilestone`) - `has_ta`, `status`
  (`no-ta`/`on-track`/`off-track`/`complete`), `milestones_total`/`milestones_completed`/`milestones_delayed`,
  `critical_milestones_total`/`critical_milestones_completed`, and `next_milestone`
  (`name`/`planned_date`/`is_critical`/`days_until`). Off-track = any delayed OR overdue-critical milestone.
  Added `ta__milestones` to the Order Manager `prefetch_related` (N+1 fix). First pytest-style Order Manager
  coverage (`apps/merchandising/tests/test_order_manager_critical_path.py`, 6). Backend adjacency 56/56
  (merchandising + logistics + core). 16.3 UI critical-path strip + weekly-review print VERIFIED (2026-09-05,
  TDD entry #49); Still open: milestone->area mapping (fabric/trims/labels/technical) - deferred, needs
  milestone area data from the backend.

---

## RQ-027 Done (formerly target-021) ?

- TDD: net-new `tests/unit/test_final_hit_reconciliation.py` (26) � red first via `ImportError: cannot import name 'FinalHitReconciliation'`; green after implementing model/API/trigger (collection blocked on nonexistent model)
- Backend: net-new `FinalHitReconciliation` model (`logistics` app, TenantModel, migration `0009_finalhitreconciliation.py`) � FK `shipment` ? `Shipment` (`related_name="reconciliations"`, unique per tenant+shipment) + optional `schedule_item` FK ? `BookingScheduleItem` (SET_NULL) + `docket_quantity`/`shipped_quantity`/`shortage_units` (Decimal, `shortage_units` auto-recomputed on `save()` = docket - shipped, min 0) + `reasons_evident` (bool) + `notes` + `status` (pending/reconciled/debited/waived) + `reconciled_at`/`reconciled_by` (? users.User, SET_NULL); properties `is_short` (shortage > 0) + `requires_debit` (shortage > 20 units � target: anything over 20 units short must be debited unless reasons evident) + `reconcile(shipped_quantity=None, user=None)` stamps reconciled + returns `(shortage, requires_debit)`
- Trigger: `BookingScheduleItemViewSet.transition` now raises a reconciliation when an item moves to `delivered` **and** has a hit (`get_or_create` per tenant+shipment, refresh schedule_item + docket/shipped quantities from the PO/shipment) � target manual L1301 "In Work ? Delivered once the last hit is delivered triggers final hit reconciliation"; invalid/other transitions never create records
- API: `FinalHitReconciliationViewSet` at `/api/v1/logistics/reconciliations/` (CRUD, tenant-scoped, `logistics:*` permission mapped, search shipment/PO, filterset shipment/status/reasons_evident) + `reconcile/` (POST detail, optional `shipped_quantity`, stamps reconciled) + `mark_debited/` (POST detail, 400 if already waived) + `waive/` (POST detail `{reasons_evident, notes}`) + `over_limit/` (GET list � pending records requiring debit); serializer exposes `shipment_number`, `po_number`, `schedule_item_id`, `reconciled_by_name`, `status_label`, `is_short`, `requires_debit`; shortage_units/reconciled_at/reconciled_by read-only
- Seed: `_seed_final_hit_reconciliations()` � runs after `_seed_booking_schedule`, one reconciliation per delivered hit (first 2 debited at 45 units short ? over-20-unit debit demo, next 2 reconciled clean, rest pending); `counts["final_hit_reconciliations"]`
- Tests: `test_final_hit_reconciliation.py` (26) + `TestSeedFinalHitReconciliation` (3) � full suite **881 passed**, 0 failures (855 baseline + 29); ruff-clean on all touched files (new migration import-sorted too)
- Frontend: `FinalHitReconciliation` type + `logisticsApi` getReconciliations/get/create/update/delete/reconcileHit/markDebited/waiveReconciliation/getOverLimitReconciliations; new FinalHitReconciliationsPage (over-20-unit debit action banner with Reconcile / Raise Debit buttons, reconciliation register table with docket/shipped/shortage/debit/status/reconciled-by, status badges pending/reconciled/debited/waived, create/edit modal with delivered-shipment picker, waive modal with evident-reasons + notes, delete confirm); route `/logistics/reconciliations` + Logistics nav item
- tsc clean, oxlint 0 errors (1 pre-existing-pattern `exhaustive-deps` warning), vite build succeeded

---

## RQ-026 Done (formerly target-020) ?

- TDD: net-new `tests/unit/test_docket.py` (22) � red first via `ImportError: cannot import name 'Docket'`; green after implementing model/API (collection blocked on nonexistent Docket model)
- Backend: net-new `Docket` model (`logistics` app, TenantModel, migration `0008_docket.py`) � FK `shipment` ? `logistics.Shipment` (`related_name="dockets"`) + `docket_number` (unique per tenant, auto `DK-XXXXXXXX` on create) + `contract_price`/`total_fabric_meters`/`unused_fabric_meters` (Decimal) + `date_raised`/`delivery_date` (Date) + `is_final` (bool) + `sales_notified`/`sales_notified_at` + `notes`; property `requires_sales_notification` = `is_final AND unused_fabric_meters > 200` (target: fabric over 200 m unusable after the final docket must go to sales � Debbie & Palones) + `notify_sales()` method; ordering `-created_at`
- API: `DocketViewSet` at `/api/v1/logistics/dockets/` (CRUD, tenant-scoped, `logistics:*` permission mapped, search by docket/shipment/PO, filterset shipment/is_final/sales_notified) + `send_to_sales/` (POST detail, idempotent � 400 on already-notified, records `sales_notified_at`) + `over_limit/` (GET list � dockets where `requires_sales_notification`); serializer exposes `shipment_number`, `po_number`, `requires_sales_notification`; docket_number/sales_notified read-only
- Seed: `_seed_dockets()` � 4 dockets (DK-2025-001..004) against seeded shipments with contract price/date raised/delivery date/fabric meters; DK-2025-003 is the final docket with 265 m unused ? over-200 m sales flag (seeded note + `requires_sales_notification` true); `counts["dockets"]`
- Tests: `tests/unit/test_docket.py` (22) + `TestSeedDockets` (3) � full suite **855 passed**, 0 failures (830 baseline + 25); ruff-clean on all touched files
- Frontend: `Docket` type + `logisticsApi` getDockets/getDocket/create/update/delete/sendDocketToSales/getOverLimitDockets; new DocketsPage (over-200 m action banner with Notify Sales button, docket register table with contract price/date raised/delivery/total & unused meters/final flag/sales-notified status, create/edit modal with shipment picker, delete confirm); route `/fabric/dockets` + Fabric nav item
- tsc clean, oxlint 0 errors, vite build succeeded

---

## RQ-015 Done (formerly target-004) � closes Stage 6 at 9/9 ?

- RQ-015 (Fabric Master Data) was already implemented across Sprint 1 (10 models, full REST CRUD, seeded, 7 frontend pages). This closure added the missing test coverage + seed verification to reach 100% DoD:
- TDD: net-new `TestHTSCodeAPI` (create/list/filter-by-category/search/auth-required), `TestFabricMillAPI` (create/list/search), `TestRFQLineItemAPI` (create/list/filter-by-rfq) in `apps/fabric/tests.py` � 11 tests locking in the AC "ViewSets with pagination, search, permission checks" for the three endpoints that had model tests but no API tests (48 ? **59 passing** in that file)
- Seed: `TestSeedFabricMasterData` (4) in `tests/unit/test_seed_data.py` � asserts 12 categories with depth-2 hierarchy (3 roots + 9 children, unique codes), 8 HTS codes all linked to categories with positive duty rates; canonical suite **826 ? 830 green**
- Cleanup: ruff `--fix` import sorting across `apps/fabric/tests.py` + removed 2 unused vars (F841) � touched files now ruff-clean (repo-wide pre-existing errors untouched)
- Frontend: no changes needed � all 7 master-data pages (Categories, HTS, Suppliers, Mills, RFQs, Bookings, Inventory) already routed and in the Fabric nav; tsc + oxlint (0 errors) + vite build pass

### RQ-016 Done (formerly target-005)
- Backend: net-new `FabricTolerance` model (`fabric` app, TenantModel) with `customer_type` (primark/other/fur), `qty_from`/`qty_to` (Decimal, open-ended when qty_to null), `tolerance_pct` (Decimal), unique per tenant+customer_type+qty_from; `tolerance_meters(quantity)` (qty � pct/100) + `tolerance_for(customer_type, quantity)` classmethod (inclusive qty_from..qty_to match, open-ended upper bound); migration `0003_fabrictolerance.py`
- API: `/api/v1/fabric/tolerances/` CRUD (tenant-scoped, `fabric:*` permission mapped) + `tolerance_for/` list action (GET `{customer_type, quantity}`, 400 on invalid type/missing/invalid quantity, 200 with `tolerance_pct`/`tolerance_meters` null when no band matches); `customer_type` + `is_active` filters; serializer exposes `customer_type_display`
- Seed: `_seed_fabric_tolerance_data()` � 7 target bands exactly as the manual: Primark 0.01�2999 �5% / 3001�4999 �3% / 5000+ �2%; Other 0.01�4999 �5% / 5000�9999 �3% / 10000+ �2%; Fur flat �2%
- Tests: `test_fabric_tolerance.py` (33) + `TestSeedFabricTolerance` (3) � full suite **720 passed**, 0 failures (684 baseline + 36)
- Frontend: `FabricTolerance` type + `fabricApi` getTolerances/create/update/delete/resolveTolerance methods; new FabricTolerancesPage (CRUD table with customer-type band columns + Tolerance Calculator panel calling `tolerance_for/` and showing �% and �metres); route `/fabric/tolerances` + Fabric nav item
- tsc clean, oxlint 0 errors, vite build succeeded

### RQ-019 Done (formerly target-027)
- Backend: `FileOpening` extended (additive) with `is_stock_fabric` (bool) + `stock_fabric_description` (Text) + `total_meters` (Decimal) + `allocated_meters` (Decimal, default 0) + `stock_photo` (ImageField, swatch replaces sketch) + `stock_balance_meters` property + `mark_as_stock_fabric(description, total_meters)` (ValueError if already stock) + `allocate_stock(allocated_to, meters, notes)` (validates stock flag, positive meters, self-target, balance; transactional ledger row + balance reduction); net-new `StockFabricAllocation` model (FK stock FN + FK allocated_to FN, meters, allocated_date, notes � "detailing the file numbers and how many meters allocated"); migration `0020_fileopening_allocated_meters_and_more.py`
- API: `/api/v1/merchandising/file-openings/{id}/mark_as_stock_fabric/` (POST `{stock_fabric_description, total_meters}`) + `allocate_stock/` (POST `{allocated_to, meters, notes}`, 400 on missing/invalid/non-stock/insufficient balance) + `stock_status/` (GET incl. allocations list); new actions permission-guarded (`merchandising:edit` / `:view`); `is_stock_fabric` added to filterset; serializer exposes stock fields + nested `stock_allocations` (prefetch_related to avoid N+1)
- Seed: `_seed_stock_fabric_data()` � 2 stock fabric FOs (FO-2025-008 with a 200m allocation, FO-2025-009 full 1000m balance)
- Tests: `test_stock_fabric.py` (25) + `TestSeedStockFabric` (3) � full suite **684 passed**, 0 failures (656 baseline + 28)
- Frontend: `FileOpening` type + `StockFabricAllocation` type + `merchApi` markAsStockFabric/allocateStock/getStockStatus methods; FileOpeningsListPage sky **STK** badge + Stock Fabric filter toggle; FileOpeningDetailPage sky Stock Fabric section (mark-as-stock-fabric modal, total/allocated/balance cards, allocate modal, allocations list, swatch photo, STOCK FABRIC header badge)
- tsc clean, oxlint 0 errors, vite build succeeded

---

### RQ-009 Done (formerly target-028)
- Backend: `FileOpening` extended (additive) with `original_fn` (nullable self-FK, SET_NULL, related_name `repeats`) + `is_repeat` (bool) + `repeat_approved_by` (JSON list) + `REPEAT_APPROVAL_PARTIES = [technical, trims]` + `original_fn_number`/`repeat_approval_complete`/`missing_repeat_approvals` properties + `create_repeat()` (copies style/version/buyer/brand/factory/file_date, status `open`, remarks `Repeat of {fn}`, assigns new `FO-` number) + `add_repeat_approval(party)` (ValueError on non-repeat/unknown party, dedupes) + `next_file_number(tenant)` classmethod (`FO-{N+1:04d}`, re-based) reused by `perform_create`; migration `0019_fileopening_is_repeat_fileopening_original_fn_and_more.py`
- API: `/api/v1/merchandising/file-openings/{id}/create_repeat/` (POST) + `approve_repeat/` (POST `{party}`, 400 on missing/invalid party or non-repeat) + `repeat_status/` (GET); new actions permission-guarded (`merchandising:create` / `:edit` / `:view`); `is_repeat` added to filterset; serializer exposes `original_fn` (string), `original_fn_number`, `is_repeat`, `repeat_approved_by`, `repeat_approval_complete`, `missing_repeat_approvals`
- Seed: `_seed_repeat_data()` � 2 repeat file openings (1 fully approved by both parties, 1 partial)
- Tests: `test_repeats.py` (22) + `TestSeedRepeats` (3) � full suite **656 passed**, 0 failures (631 baseline + 25)
- Frontend: `FileOpening` type extended + `merchApi` createRepeat/approveRepeat/getRepeatStatus methods; FileOpeningsListPage violet **RPT** badge + Repeats filter toggle; FileOpeningDetailPage violet Repeats section (create-repeat on open non-repeats, department confirmation checklist with buttons, completion indicator, REPEAT header badge)
- tsc clean, oxlint 0 errors, vite build succeeded

---

### RQ-005 Done (formerly target-033)
- Backend: `DesignImage` model (`merchandising`, FK Style, roles main/range/colourway/detail, `is_main` unique-main-per-style constraint) + `DesignImageSerializer` (`main_image` exposed on Style) + `DesignImageViewSet` (CRUD + `set_main` action + style filter + tenant scoping) + admin + migration `0017_designimage.py` + nested action `/styles/{id}/design_images/`
- Seed: `_seed_design_images()` � main/range/detail per style (Pillow-generated PNG)
- Tests: `test_design_image.py` (16) + `TestSeedDesignImages` (3) � full suite 556 passed, 0 failures
- Frontend: `DesignImage` type + merchApi methods + StyleDetailPage "Design Images" tab (upload/set-main/delete/preview) + StylesListPage thumbnails (list + grid via `main_image`)
- tsc clean, vite build succeeded

---

---

## Part 3: Feature Sequence � Style Tech-Pack Import & Processing (RQ-036 ? RQ-042)

> **Added**: 2026-08-10 � **Priority**: P0 (next active feature stream)
> **Business need**: Buyer style documents arrive as PDFs. BHMS must extract the PDF to a two-sheet Excel (matching the buyer's workbook), allow a merchandiser to correct/complete it manually, then import the corrected Excel as Style + Tech-Pack + BOM data. Tech-pack progress is tracked as the task advances.
> **Source artifacts** (do NOT delete � they are the golden fixtures):
> - `PDF Extract/Sample style doc.pdf` � "CCL DESIGN SHEET", 1 page (header fields + BOM table)
> - `PDF Extract/Extracted_2026-07-13 .xlsx` � two sheets: `Design Infromation` (14 header fields) + `BOM` (8 columns)
> **Libraries** (free, pure-Python, Python 3.14-safe; registered in `version-manifest.json` �document_processing + `backend/requirements.txt`): `pdfplumber` (PDF text/tables), `openpyxl` (XLSX read/write).
> **Hard constraint**: zero breaking changes. Net-new models + additive nullable fields only; the canonical test baseline (**1126 green**) must stay green after every requirement.

### Feature Flow (whole-product view)

```
Buyer sends style PDF
        ?
[1] Upload PDF     ?  POST /merchandising/styles/techpack/extract/     (pdfplumber)
        ?
[2] Extract        ?  Design Infromation (14 fields) + BOM (8 cols) ? JSON preview
        ?
[3] Download Excel ?  GET /merchandising/styles/techpack/{id}/excel/  (openpyxl � matches sample workbook)
        ?   (manual correction/typing in Excel � accuracy)
[4] Upload Excel   ?  POST /merchandising/styles/techpack/import/     (openpyxl read + validate)
        ?
[5] Persist        ?  Style (source PDF attached to existing `tech_pack` field) + StyleItems + BOM v1 + BOMItems
        ?
[6] Track          ?  StyleTechPack.status: draft ? extracted ? in_progress ? completed
        ?
[7] Consume        ?  StyleDetailPage tech-pack panel ? FileOpening ? Costing ? existing lifecycle
```

### Integration Points (connect the dots)

| Existing artifact | Connection |
|-------------------|-----------|
| `merchandising.Style` | Created/updated on import; `style_number` unique per tenant � existing style is updated, not duplicated |
| `merchandising.StyleVersion` | Import creates StyleVersion v1 (revision note = source PDF name) |
| `merchandising.StyleItem` | Material template rows created from the BOM sheet (category, item_name, consumption, vendor) |
| `merchandising.BOM` + `BOMItem` | BOM v1 created per style; `BOMItem` gains additive fields `location`, `colour`, `width_size`, `match` (RQ-041) |
| `setup.Buyer` / `setup.Vendor` / `setup.UOM` | Name lookups on import � same tolerant pattern as `PurchaseOrderViewSet.bulk_import` (list available options on miss) |
| `bulk_import` action pattern | Multipart file-upload actions live on the viewset, `MultiPartParser`, `merchandising:create`/`:edit` permission guards |
| Frontend `merchApi` + `StylesListPage`/`StyleDetailPage` | New TechPack wizard route, API client methods, tech-pack progress panel on style detail |

### Legend (same as Part 2)
| Symbol | Meaning |
|--------|---------|
| ? 100% | Fully implemented, tested, seeded |
| ? In Progress | Implementation in current sprint |
| ? Pending | Planned, not started |
| ? Not Started | No story assigned |

### RQ ? Traceability (7 requirements)

| RQ-ID | Requirement | Priority | Workflow Stage |
|-------|-------------|----------|----------------|
| RQ-036 | Style Tech-Pack PDF Extraction Service (CCL Design Sheet) | P0 | 1 � Extraction Foundations |
| RQ-037 | Tech-Pack Excel Generation Service (two-sheet .xlsx) | P0 | 1 � Extraction Foundations |
| RQ-038 | Tech-Pack Excel Import Service (validate ? Style/BOM payload) | P0 | 1 � Extraction Foundations |
| RQ-039 | StyleTechPack model + progress lifecycle | P0 | 2 � Persistence & API |
| RQ-040 | Tech-Pack Processing API (extract / excel / import) | P0 | 2 � Persistence & API |
| RQ-041 | BOMItem additive fields (location / colour / width_size / match) | P0 | 2 � Persistence & API |
| RQ-042 | Frontend Tech-Pack Import wizard + style detail progress panel | P0 | 3 � Frontend |

---

### Stage 1: Extraction Foundations (RQ-036 ? RQ-038) 3/3 ? 100%

| Item | Requirement | Backlog Story | PRD Ref | Status | Tests | Seed Data | Lessons |
|------|-------------|---------------|---------|--------|-------|-----------|---------|
| RQ-036 | PDF Extraction Service | � | �6.1.1 Design | ? Done (2026-08-10) | 34 (was ~20) | Golden fixture = `PDF Extract/Sample style doc.pdf` | RQ-036 � pdfplumber header + table parse |
| RQ-037 | Excel Generation Service | � | �6.1.1 Design | ? Done (2026-08-10) | 16 (was ~15) | Golden fixture = `PDF Extract/Extracted_2026-07-13 .xlsx` | RQ-037 � openpyxl two-sheet export |
| RQ-038 | Excel Import Service | � | �6.1.1 Design | ? Done (2026-08-10) | 18 (was ~18) | Build workbook in test via RQ-037 | RQ-038 � tolerant Excel row parse |

**Stage 1 total**: 3 items, 68 tests ?

---

### Stage 2: Persistence & API (RQ-039 ? RQ-041) 3/3 ? 100%

| Item | Requirement | Backlog Story | PRD Ref | Status | Tests | Seed Data | Lessons |
|------|-------------|---------------|---------|--------|-------|-----------|---------|
| RQ-039 | StyleTechPack model + lifecycle | � | �6.1.1 Design | ? Done (2026-08-10) | 19 (was ~14) | 2 tech-packs (draft + completed) via seed | RQ-039 � progress state machine |
| RQ-040 | Tech-Pack Processing API | � | �6.1.1 Design | ? Done (2026-08-11) | 28 (was ~22 planned) | Multipart upload fixtures | RQ-040 � viewset actions, no new URLs |
| RQ-041 | BOMItem additive fields | � | �6.3.5 Trims | ? Done (2026-08-11) | 8 | Extend BOM seed rows | RQ-041 � additive nullable columns |

**Stage 2 total**: 3 items, 55 tests ?

---

### Stage 3: Frontend (RQ-042) 1/1 ? 100%

| Item | Requirement | Backlog Story | PRD Ref | Status | Tests | Seed Data | Lessons |
|------|-------------|---------------|---------|--------|-------|-----------|---------|
| RQ-042 | Tech-Pack Import wizard + progress panel | � | �6.1.1 Design | ? Done (2026-08-11) | tsc clean, oxlint 0, vite build | Uses RQ-039 seeds | RQ-042 � 3-step wizard + detail panel |

---

## Overall Progress (Part 3)

| Stage | Items | Complete | In Progress | Pending |
|-------|-------|----------|-------------|---------|
| 1 � Extraction Foundations | 3 | 3 | 0 | 0 |
| 2 � Persistence & API | 3 | 3 | 0 | 0 |
| 3 � Frontend | 1 | 1 | 0 | 0 |
| **Total** | **7** | **7 (100%)** | **0** | **0** |

> **Part 3 is complete** � the tech-pack import & processing stream (RQ-036 ? RQ-042) is fully delivered: 123 backend tests across the 6 techpack files (34 PDF / 16 Excel-gen / 18 Excel-import / 19 model / 28 API / 8 BOMItem), plus the frontend wizard + detail-panel gates (tsc / oxlint / vite build).
> **Next action**: close the last 3 product-backlog gaps so the backlog reaches 100% � US-016 (Session Management, Must Have � auth/security), US-084 (Line Performance, backend endpoint exists but no dedicated page/permission-mapping/tests), US-108 (Inventory Reports, can build on the existing `fabric.FabricInventory`/`FabricBooking` models � GAP_ANALYSIS.md is stale on this point). Full-suite regression gate: `python -m pytest tests` (latest green baseline **1150 + Part 3 additions**, minus 7 pre-existing monitoring-API failures) must stay green after each RQ.

---

## Part 3 Detailed Specifications (TDD)

### RQ-036 � Style Tech-Pack PDF Extraction Service (CCL Design Sheet) ? Done (2026-08-10)

**Intent**: parse a buyer style PDF into a structured, validated DTO � the header fields + the BOM table � exactly matching the sample workbook's values (see `PDF Extract/Sample style doc.pdf` ? `Extracted_2026-07-13 .xlsx`).

**TDD (red ? green)** � net-new `backend/tests/unit/test_techpack_pdf.py` (~20):
- Header extraction: `issue_date` (`22/Mar/2022` ? `2022-03-22`), `block` (`59073T`), `based_on` (`59073T`), `customer` (`DOTTI`), `style_number` (`67741T`), `size` (`10`), `designer` (`Emmi.Huynh`), `pattern_cutter` (`HAI`), `issuer` (`Clone`), `cloth_code` (`SANDWASH LINEN LXeKn-g5t2h9`), `length` (`0`), `description` (`565235 LB LIZZIE WIDE LEG PANT`)
- Note/instruction block reconstruction (multi-line, unordered text ? ordered note string; golden = the note column value)
- BOM table extraction: 6 rows, columns `type / description_code / location / supplier / colour / width_size / qty / match`
  - Row 1 ? `Cloth / SANDWASH LINEN XK-529 / MAIN / ALICE- / BLACK / 132 CM / 1.67`
  - Row 2 ? `Trims / BUTTON 4 HOLES FV9757 / W/B / FOURSEASONS / BROWN / 24 LN / 2`
  - Row 3 ? `Trims / NYLON ZIPPER / FRONT FLY / YKK / DTM / #3/17 CM / 1`
  - Row 4 ? `Trims / ELASTIC BAND P701 / BACK WAIST / KT TRIMS / BLACK / 5 CM / 0.47`
  - Row 5 ? `Interfacing / FUSING 2012 / AS PER PATTERN / THANH PHONG / BLACK / 150 CM / 0.12`
  - Row 6 ? `Lining / POLY COTTON / POCKET BAG / DOAN KET / DTM / 145 CM / 0.16`
- Error handling: non-PDF input, empty page, missing table (no crash ? structured warnings), multi-page docs (first page only, documented)
- Determinism: same PDF ? identical DTO every run

**Backend design**:
- `apps/merchandising/techpack/__init__.py` + `apps/merchandising/techpack/pdf_parser.py`
- `@dataclass TechPackBOMRow` and `@dataclass TechPackDesignInfo` (frozen, with `to_dict()`)
- `class StyleTechPackParser` with `parse(pdf_bytes | file) -> TechPackDocument` (header via pdfplumber `extract_text` keyword scan; BOM via `extract_table`/`find_tables` with header `Type/Description-Code/Location/Supplier/Colour/W-Size/Qty/Match`)
- Pure functions only � no Django model dependency (unit-testable without DB)
- ruff-clean; `import type` discipline not applicable (Python)

**Acceptance criteria**: `parse()` returns the golden values above for the sample PDF; bad input raises `ValueError` or returns `errors` list, never crashes; no existing code touched.

---

### RQ-037 � Tech-Pack Excel Generation Service (two-sheet .xlsx) ? Done (2026-08-10)

**Intent**: serialize a `TechPackDocument` into the exact two-sheet workbook layout of the sample (`Design Infromation` + `BOM`) so the merchandiser can edit it in Excel and re-upload.

**TDD (red ? green)** � net-new `backend/tests/unit/test_techpack_excel.py` (~15):
- Two sheets, exact titles `Design Infromation` and `BOM`
- Sheet 1 header row matches sample exactly (`Issue Date / Block / Based On / Customer / Style Number / Size / Designer / Pattern Cutter / Issuer / Cloth Code / Length / Sketch / Description / Note`) � preserve sample's `Design Infromation` spelling for compatibility
- Sheet 2 header row matches sample (`Type / Description/ Code / Location / Supplier / Colour / Width/Size / Qty / Match`) � `Match` column present but empty in sample
- Date cells written as real dates (openpyxl `datetime`), qty as numbers
- Round-trip: RQ-037 output ? openpyxl read ? equals the RQ-036 DTO
- Bytes in-memory (`BytesIO`), no file-system writes in unit tests

**Backend design**:
- `apps/merchandising/techpack/excel_export.py` � `write_techpack_workbook(doc) -> BytesIO` via `openpyxl.Workbook`; named styles reusing the project dark-theme conventions where applicable
- Row/cell formatting kept minimal (headers bold, column widths) � fidelity to sample layout first

**Acceptance criteria**: generated workbook opens in Excel without repair prompts; sheet/header fidelity byte-compared to the sample structure; sample file itself stays untouched (golden fixture).

---

### RQ-038 � Tech-Pack Excel Import Service ? Done (2026-08-10)

**Intent**: parse an uploaded (possibly hand-edited) Excel workbook back into a `TechPackDocument` payload, tolerating empty cells, reordered/renamed columns (substring match), and extra rows.

**TDD (red ? green)** � net-new `backend/tests/unit/test_techpack_excel_import.py` (18):
- Valid workbook (built in-test by RQ-037) ? correct DTO
- Header row detection by keyword (e.g. `style` in "Style Number"), not fixed position
- Missing BOM sheet ? structured error
- Decimal/date coercion: `1.67` ? Decimal, `22/Mar/2022` string ? date
- Empty `Match` column ? empty string, not error
- Duplicate style-number handling surfaced to caller (flag, not fail)

**Backend design**:
- `apps/merchandising/techpack/excel_import.py` � `parse_techpack_workbook(file) -> TechPackDocument` via `openpyxl.load_workbook(..., data_only=True)`; shared column-mapping helpers in `techpack/columns.py`
- Keyword matching prefers the **longest** matching keyword per header cell � `issue` must not steal the `Issuer` column (`issue` ? `issuer`); `desc` fallback added for renamed `Description` columns
- Note cell preserves its line breaks (`_clean_note`), so the multi-line PDF note round-trips verbatim

**Acceptance criteria**: the sample `Extracted_2026-07-13 .xlsx` parses losslessly into the RQ-036 DTO; robust to common user edits. ? all � 18 tests, lint clean, techpack + merchandising batch 75 passed.

---

### RQ-039 � StyleTechPack model + progress lifecycle ? Done (2026-08-10)

**Intent**: persist each tech-pack processing task with its source PDF, extraction payload, generated Excel, and a progress state � the "updated as the task progresses" requirement.

**TDD (red ? green)** � net-new `backend/tests/unit/test_style_techpack.py` (19, was ~14):
- Model defaults / `__str__`; per-tenant unique `techpack_number` (`TP-�`)
- FK `style` nullable until import links it; `source_pdf`, `excel_file`, `extracted_data` (JSONField), `errors` (JSONField list)
- Lifecycle `draft ? extracted ? in_progress ? completed` with guarded transitions (`mark_extracted()`, `mark_in_progress()`, `complete()`, illegal transition ? `ValueError`)
- Tenancy: cross-tenant isolation

**Backend design**:
- Net-new `StyleTechPack(TenantModel)` in `apps/merchandising/models.py` + migration `0025_styletechpack.py`
- Design-sheet fields stored normalized on the model (`issue_date`, `block`, `based_on`, `customer`, `style_number`, `size`, `designer`, `pattern_cutter`, `issuer`, `cloth_code`, `length`, `sketch`, `description`, `note`) � the raw JSON is kept in `extracted_data` for re-import/preview
- `style` FK `SET_NULL` (keeps audit row if style deleted), `related_name="tech_packs"`; nested `Status` TextChoices (`draft/extracted/in_progress/completed`)
- `next_techpack_number(tenant)` mirrors the `FileOpening.next_file_number` scan-max pattern (`TP-1001`, `TP-1002`, �)
- Seeded via `seed_style_data.py` (1 draft + 1 completed tech-pack, linked to the first style); the seed clear-block now deletes `StyleTechPack` (FK is SET_NULL so it must be explicit)

**Acceptance criteria**: zero changes to `Style`/`StyleVersion`/`BOM`; baseline tests green. ? all � 19 tests, ruff clean, merchandising+techpack regression 129 passed.

---

### RQ-040 � Tech-Pack Processing API ? Done (2026-08-11)

**Intent**: the three endpoints that drive the flow � extract (PDF ? JSON + saved StyleTechPack), download Excel, import (Excel ? Style + StyleItems + BOM v1 + BOMItems).

**TDD (red ? green)** � net-new `backend/tests/unit/test_techpack_api.py` (~22), following `test_bulk_import.py` style (`APITestCase`, `force_authenticate`, `HTTP_X_TENANT_ID`):
- `POST /merchandising/styles/techpack/extract/` (multipart `file` PDF) ? 200 `{techpack, data, excel_download_url}`; no file ? 400; non-PDF ? 400
- `GET /merchandising/styles/techpack/{id}/excel/` ? `200` `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` download
- `POST /merchandising/styles/techpack/import/` (multipart `file` xlsx) ? creates `Style` (existing `style_number` updated, new created), `StyleVersion` v1, `StyleItems` from BOM rows, `BOM` v1 + `BOMItems`; attaches source PDF to `Style.tech_pack`; sets `StyleTechPack.status=completed`; returns created style id + counts
- Buyer/Vendor/UOM name lookups tolerant (miss ? row-level error with available names, matching `bulk_import`); transaction rollback on fatal error
- Permission guards: `merchandising:view` / `:create` / `:edit` mapped per action; tenant isolation; 401 unauthenticated

**Backend design**:
- Actions on `StyleViewSet` (`extract_techpack`, `techpack_excel`, `import_techpack`), `parser_classes=[MultiPartParser]`, `required_permissions` extended
- Import orchestration in `apps/merchandising/services.py` (or `techpack/import_service.py`): create/update Style (buyer lookup ? `setup.Buyer`; description ? `Style.description`; source PDF ? `tech_pack`), create StyleVersion v1, create `StyleItem`s (category = BOM `type`, item_name = description/code, consumption = qty, vendor = supplier lookup), create BOM v1 (`unique_together` style_version+version) + `BOMItem`s (RQ-041 fields)
- `excel_download_url` served via the same viewset action; generated Excel persisted to `StyleTechPack.excel_file` on extract

**Acceptance criteria**: full happy path through the API creates a Style with line items + BOM; re-import of same style updates, never duplicates; all baseline tests green.

---

### RQ-041 � BOMItem additive fields ? Done (2026-08-11)

**Intent**: carry the design-sheet BOM columns that the current `BOMItem` cannot express: `Location`, `Colour`, `Width/Size`, `Match`.

**TDD (red ? green)** � extend `backend/tests/unit/test_bom.py` (or net-new `test_bomitem_techpack.py`, ~8):
- New nullable fields exist; default empty; serialized on `BOMItemSerializer`; admin columns updated
- Import service populates them from the Excel (RQ-040 integration test asserts values)

**Backend design**:
- `BOMItem` += `location` (CharField blank), `colour` (CharField blank), `width_size` (CharField blank), `match` (CharField blank) � all nullable/blank, migration `0014_bomitem_techpack_fields.py` (next number after 0013/0024 in merchandising chain)
- `BOMItemSerializer` exposes them read/write; `BOM` admin list display extended

**Acceptance criteria**: purely additive � no existing BOM test changes meaningfully; baseline green.

---

### RQ-042 � Frontend Tech-Pack Import wizard ? Done (2026-08-11)

**Intent**: the merchandiser-facing UI � upload PDF ? review extraction ? download Excel ? upload corrected Excel ? style created; plus a progress panel on `StyleDetailPage`.

**TDD-equivalent gates**: `tsc` clean, `oxlint` 0 errors, `vite build` succeeds � same gates as every shipped RQ.

**Frontend design**:
- New route `/styles/techpack-import` + "Tech Pack Import" merchandising nav item; 3-step wizard component (`TechPackImportWizard`)
  - Step 1 � drop/upload PDF (`merchApi.extractTechPack`) ? show extracted JSON preview (design info cards + BOM table) + "Download Excel" button (`merchApi.downloadTechPackExcel` ? blob save, matching existing CSV-export blob pattern)
  - Step 2 � upload the edited `.xlsx` (`merchApi.importTechPack`) ? show validation result
  - Step 3 � success screen with created/updated style link + tech-pack number + status badge
- `StyleDetailPage` gains a **Tech Pack** panel: source PDF download link, status badge, issue/designer/block info, BOM item count � reflects `StyleTechPack.status` so progress is visible as the task advances
- `merchApi` + `client.ts` types (`StyleTechPack`, `TechPackExtraction`, `TechPackImportResult`); reuse `SearchableSelect` for buyer/vendor lookups only if the wizard adds manual entry
- Follows Vite 8 Rolldown rule: type-only imports MUST use `import type { ... }`

**Acceptance criteria**: wizard end-to-end with the two sample artifacts creates a style; progress panel reflects status; tsc/oxlint/build green.

---

## RQ-040 Done (Tech-Pack Processing API) ?

- TDD: net-new `tests/unit/test_techpack_api.py` (**28**) � red first (missing actions), green after implementing viewset actions; covers extract (multipart PDF ? 200 `{techpack, data, excel_download_url}`, 400 no-file / non-PDF, draft?extracted status), excel download (GET blob `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`), import (multipart xlsx ? Style created-or-updated + StyleVersion v1 + StyleItems from BOM rows + BOM v1 + BOMItems + `Style.tech_pack` source PDF + status?completed; re-import of same `style_number` updates never duplicates; buyer/vendor/uom tolerant lookups; tenant isolation; 401 unauth; `merchandising:*` permission guards), plus the `upload-tech-pack` detail action and the **`GET /styles/{id}/tech_packs/`** list action (`merchandising:view`)
- Backend: 4 actions on `StyleViewSet` � `upload-tech-pack` (detail, multipart `tech_pack`), `techpack/extract` (collection, pdfplumber parse + `StyleTechPack` create + excel persisted to `excel_file`), `techpack/excel` (collection GET `?techpack=<id>` blob), `techpack/import` (collection, orchestrated by `apps/merchandising/techpack/import_service.py`); `parser_classes=[MultiPartParser]`; `required_permissions` mapped per action; serializer exposes the full `StyleTechPack` shape (`id, techpack_number, style, status, source_pdf_url, excel_url, bom_items_count, issue_date, block, based_on, customer, style_number, size, designer, pattern_cutter, issuer, cloth_code, length, sketch, description, note, errors, warnings, created_at, updated_at`)
- Acceptance: full happy path through the API creates a Style with line items + BOM; re-import updates the same style; baseline stays green ? � 28 tests, ruff clean (pre-existing views.py lines 2878/2986 untouched), merchandising+techpack regression **477 passed / 0 failures**

---

## RQ-041 Done (BOMItem additive fields) ?

- TDD: net-new `tests/unit/test_bomitem_techpack.py` (**8**) � new nullable fields exist, default empty, serialized read/write on `BOMItemSerializer`, populated by the RQ-040 import from the design-sheet BOM columns
- Backend: `BOMItem` += `location` / `colour` / `width_size` / `match` (CharField, null/blank/default `""`, migration `0026_bomitem_techpack_fields`); `BOMItemSerializer` exposes them; BOM admin `list_display` extended; `techpack/import_service.py` populates them from the Excel rows
- Acceptance: purely additive � no existing BOM test changed meaningfully ? � 8 tests, ruff clean, regression green

---

## RQ-042 Done (Frontend wizard + progress panel) ?

- `merchApi` + `client.ts`: `StyleTechPack`, `TechPackExtraction`, `TechPackImportResult`, `TechPackDocument` types + `extractTechPack` / `downloadTechPackExcel` (blob save) / `importTechPack` / `getStyleTechPacks` / `uploadTechPack` methods � multipart via `FormData` + `Content-Type: multipart/form-data` header (same convention as `createDesignImage`/`bulk_import`)
- New route `/styles/techpack-import` + "Tech Pack Import" merchandising nav item; **TechPackImportWizardPage** 3-step wizard � Step 1 drop/upload PDF ? extracted JSON preview (design-info cards + BOM table mirroring `TechPackDocument.to_dict()`) + Download Excel; Step 2 upload the edited `.xlsx` ? validation result; Step 3 success screen with created/updated style link + tech-pack number + status badge
- `StyleDetailPage` gains a **Tech Packs** tab/panel � status badge (draft/extracted/in_progress/completed), `techpack_number`, source PDF + workbook links, issue date / style number / designer / block grid, description/note, errors list, BOM-item count, and an "Import Tech Pack" link to the wizard
- Follows the Vite 8 / Rolldown rule (type-only imports use `import type { ... }`) ? � tsc clean, oxlint 0 errors (pre-existing `exhaustive-deps` warnings only), vite build succeeded

---

## Part 3 Agent Handoff Order

1. **RQ-036** PDF parser (pure functions, golden tests) ? 2. **RQ-037** Excel writer (round-trip) ? 3. **RQ-038** Excel reader ? 4. **RQ-039** model + lifecycle ? 5. **RQ-041** BOMItem fields ? 6. **RQ-040** API (depends on 036-039+041) ? 7. **RQ-042** frontend (depends on 040).
> Regression gate after every RQ: `python -m pytest tests` (baseline 1126 green). Update `lessons-learned.md` per requirement.

---

## Agent Handoff Checklist

When picking up a new requirement from the Next Action list:

1. [ ] Read this master backlog row � understand the requirement, PRD ref, estimated effort
2. [ ] Read `lessons-learned.md` � check for past sprints that touched related code
3. [ ] Read `analysis/01-feature-catalog.md` � historical target reference (requirement intent)
4. [ ] Read `analysis/02-gap-analysis-bhms-vs-target.md` � historical priority and dependencies
5. [ ] Read `analysis/03-implementation-roadmap.md` � historical sprint plan and est
6. [ ] Check Part 1 above � if a backlog story already exists for this requirement
7. [ ] Read `PRD.md` � understand the product requirements
8. [ ] Read existing code � inspect repository pattern before creating
9. [ ] Write tests first (TDD) � then implement
10. [ ] Add seed data � demo data must flow end-to-end
11. [ ] Run full test suite � zero breaking changes
12. [ ] Update `lessons-learned.md` � capture what was learned, what could be improved

---

## Part 4 Addendum — A3 PurchaseOrders Order-List columns + seed data (2026-09-02)

**Backward trace (what enables / drives this):**
- Reference **Order List** columns per PRD §5.3.1 (FN, Customer, Style, Status, Original/Actual completion
  dates, Risk Fabric/Labels/Trims/Technical/Overall, Date Range, Origin). Gap recorded in
  `REQUIREMENTS_GAP_ANALYSIS.md`: Order List 7 features / 1 in roadmap / 6 missing (14%).
- Sits in the **Order Intake (FO & PO)** stage (RQ-007..010); the "Actual completion date" value is owned by
  **RQ-010 Hit Management** (`Hit` model), `PurchaseOrder` (RQ-007/008/009) supplies FN/Style/Status.
- Implemented on the **A3 PurchaseOrders** grid slice (shared `SpreadsheetGrid`; `TDD_TRACKER` row updated).

**Implementation (DEV, additive read-only, no migration):**
- Backend: `PurchaseOrderSerializer` gained null-safe `SerializerMethodField`s — `file_number` (`FO-####`),
  `style_number`, `actual_completion_date` = max(`Hit.actual_delivery_date` across hits) as ISO date string.
  Tests: `backend/tests/unit/test_po_order_list_fields.py` (RED 3 fail/1 pass → GREEN 4/4).
- Frontend: `PurchaseOrder` type + PO grid columns **PO # | FN | Style | Factory | Buyer | Risk | Delivery |
  Actual | Qty | Value | Origin | Status** (`—` fallbacks). Tests: `PurchaseOrdersListPage.test.tsx` (7/7).
- User decision: **Origin = destination country** (`destination_country_name`); **FN = human `file_number`**
  (e.g. `FO-1015`), not the `file_opening` UUID technical key.

**Forward (what this unlocks / gates):**
- **B1 risk engine** (gated separately): the 5 per-area risk color columns (Fabric/Labels/Trims/Technical/
  Design) + overall risk are Workstream B, not part of this slice. Overall `risk_level` column kept for now.
- Later Order-List parity work: Date Range filter, per-area risk display, "quick lead time" flagging.
- Seed data now demonstrates end-to-end: `seed_all_modules.py` §5.5 creates **45 Hits** (one per PO colour);
  shipped/delivered POs get `actual_delivery_date = delivery_date + 7d` → the **Actual** column shows real
  dates (CDP-verified: PO-1015 → `2027-03-26`), in-flight POs stay `—` (null-safe path intact).

**Verification:** targeted backend 4/4, frontend vitest 7/7, `tsc -b` exit 0, oxlint 0 errors (71 warnings),
full frontend 226/226, real-browser CDP `/purchase-orders` GREEN (15 rows, 12 column titles, 0 browser
errors). Scoresheet: `TDD_TRACKER` A3 PurchaseOrders row + evidence #22.

## Part 5 Addendum — B1 Standalone risk engine (2026-09-02)

**Backward trace (what enables / drives this):**
- Reference **Risk Management System** (reference manual §15): per-area risk — Fabric / Trims / Labels /
  Technical (+ Design), progression None → Amber → Green → Red (Yellow = awareness flag). §15.3 **overall =
  HIGHEST single area** with `risk_order {NONE:0, GREEN:1, AMBER:2, YELLOW:3, RED:4}` (Excel-familiar numeric
  export). §15.4 **Order List = 5 color columns** (Fabric, Trims, Labels, Technical, Overall).
- Sits in **Order Intake (FO & PO)** (RQ-007..010) touching `PurchaseOrder`, `Hit` (RQ-010), BOM (RQ-014),
  Fit Spec (RQ-021), plus setup `RiskLevel` and the existing `FabricOrder` recompute/risk-policy chain (RQ-018).
- Supersedes the Part 4 gating note: the per-area risk columns replace the interim single "Risk" column.
- Unblocked before remaining A3 `DataTable` consumers per AGENTS §2 priority (P0 > **B1–B3** > A3 > B4–B10);
  B1 has no dependency on un-migrated grid pages.

**Implementation (DEV, additive, no migration):**
- Backend: new pure module `apps/merchandising/risk_engine.py` — `RISK_ORDER`/`RISK_COLORS`/
  `TRIMS_CATEGORIES`, `risk_payload`, `overall_risk`, `compute_order_risk(po)` deriving child-data risk:
  fabric ← PO→shipments→schedule_items (item `risk_level` code `red` sticky, `delivered`→green,
  `in_work`→amber); trims ← BOM items category {Trim, Trims, Accessories} vendor-assignment
  (no vendor→amber, all assigned→green); labels ← BOM items containing "label" (same vendor rule);
  technical ← current FitSpec stage (none→none, pre-PP→amber, PP→green); **overall = max**. Exposed via
  `PurchaseOrderSerializer` as read-only `risk` dict. Tests: `backend/tests/unit/test_risk_engine.py`
  (RED 1 fail → GREEN 12/12); targeted regressions 109/109 green.
- Frontend: `OrderRisk`/`RiskPayload` types in `src/api/client.ts`; PO grid columns now
  **PO # | FN | Style | Factory | Buyer | Fab | Trims | Labels | Tech | Overall | Delivery | Actual | Qty |
  Value | Origin | Status** (`—` for none). Tests: `PurchaseOrdersListPage.test.tsx` 10/10.
- Colour rendering (colored dot + glyph per cell) deliberately deferred to a token/formatter pass — the
  established flat-column trade-off (same as role pins in A3 Users).

**Forward (what this unlocks / gates):**
- RiskBadge on PO detail + Booking Schedule cyan last-hit marker (B8) can re-use `risk_engine` helpers.
- Numeric `risk.numeric` payload ready for A4 Excel numeric-risk export.
- Next: remaining A3 consumers, then A4/A6, then B3 Export Recap (B2 Import Recap GREEN — full backend
  suite + CDP pending for ✅ VERIFIED).

**Verification:** backend 12/12 + targeted 109/109 green; frontend 10/10, `tsc -b` exit 0, oxlint 0 errors
(71 warnings), full frontend 229/229; real-browser CDP `/purchase-orders` GREEN (15 rows, 16 column titles
incl. 5 risk columns, PO-1015 → Fab `—`/Trims Green/Labels Green/Tech `—`/Overall Green, 0 errors). Dev
backend restarted (`--noreload` stale process). Scoresheet: `TDD_TRACKER` B1 row + evidence #24.

## Part 6 Addendum — A6 Row actions menu on SpreadsheetGrid (2026-09-04)

**Backward trace (what enables / drives this):**
- Roadmap **A6** — "Row actions menu (Open / Set Status / Copy / Repeat) additive on the grid." Shared grid-layer
  capability delivered via the `rowActions` prop on the reusable `SpreadsheetGrid` (the A3 grid layer all list
  screens migrated to).
- Builds on the existing imperative `actionFormatter`/`cellClick` pattern, the `SpreadsheetMenuItem`
  (label/disabled/action) type, `rowContextMenu`'s return contract, and the token-driven `SpreadsheetGrid.theme.css`
  (A5 light/dark).

**Implementation (DEV, additive + default-off, frontend only):**
- New optional `rowActions?: (row) => SpreadsheetMenuItem[]` prop on `SpreadsheetGrid`. When provided, a per-row
  `__rowmenu` column renders a **Row actions** (⋯) toggle; clicking it opens an absolute-positioned dropdown of the
  returned items; clicking an item fires `item.action(row)` and closes the menu; `disabled` items are rendered
  disabled and never fire. Row identity is captured in the formatter via a `WeakMap` keyed on the wrapper so dispatch
  always gets the exact source row (robust to row/cell indexing across columns).
- Token-driven menu CSS added to `SpreadsheetGrid.theme.css` (A5-compatible; theming follows site light/dark tokens).
- Tests: `SpreadsheetGridChrome.test.tsx` A6 suite (5) — column present when `rowActions` set / absent when omitted
  (additive, default-off) / toggle opens menu + calls `rowActions(row)` / menu item dispatch with correct row /
  disabled items don't fire / menu closes after selection. RED 5 fail → GREEN 5/5.

**Forward (what this unlocks / gates):**
- Every `SpreadsheetGrid` consumer (Styles, BOMs, Costings, POs, Design Costings, …) can now add a compact per-row
  menu with zero per-screen bespoke code.
- Natural host for the upcoming **A4** print-with-tick + Excel numeric-risk export entry points.
- Unblocks the **A3 `DataTable` removal tail** (last consumers can consolidate behind the shared grid).

**Verification:** targeted `SpreadsheetGridChrome.test.tsx` 21/21 (16 pre-existing + 5 new); `tsc -b` exit 0;
oxlint 0 errors (79 warnings, codebase-wide exhaustive-deps convention); full frontend vitest **304/304 (45 files)**.
Scoresheet: `TDD_TRACKER` A6 row → ✅ VERIFIED + evidence #46.

## Part 7 Addendum — A4 Print-with-tick + Excel numeric-risk export (2026-09-04)

**Backward trace (what enables / drives this):**
- Roadmap **A4** — "Print-with-tick + Excel numeric-risk export wired into the grid." Two additive, default-off
  capabilities on the shared `SpreadsheetGrid` (the A3/A6 grid layer).
- Reuses the existing `exportable`/`handleExport` xlsx `download` path (A1 chrome), the component's established
  modal/menu interaction patterns, the token-driven `SpreadsheetGrid.theme.css` (A5), and the B1
  `RiskPayload.numeric` payload that this export was designed for.

**Implementation (DEV, additive + default-off, frontend only):**
- New optional props on `SpreadsheetGrid`: `numericExport?: (row) => Record<string, unknown>` — when the grid is
  `exportable`, the Excel export first writes rows transformed by `numericExport` to the table, downloads `.xlsx`,
  then restores the original rows in `finally` (grid data untouched afterwards). `printable?: boolean` +
  `printTitle?: string` — a **Print** toolbar button opens a print-with-tick modal (`data-testid="print-tick-dialog"`)
  listing current rows/columns with a per-row tick checkbox and a **Print rows** action that calls `window.print()`.
- PO list op-in (`PurchaseOrdersListPage`): `numericExport` maps the `risk_*` display-label columns back to
  `Number(risk[area].numeric)` (0–4; 0 when absent/`none`), and `printable`/`printTitle="Purchase Orders"` enable the
  print tick-sheet.
- Tests: `SpreadsheetGridChrome.test.tsx` A4 suite (5) — numeric transform applied to the exported data / export
  unchanged without the prop / Print button appears when `printable` / dialog lists rows with tick checkboxes + title /
  dialog Print triggers `window.print()`. RED 4 fail → GREEN 5/5.
- Decision recorded: A4 scope question (numeric-only / print-only / both) went unanswered, so both sub-features
  shipped — independent, additive, default-off.

**Forward (what this unlocks / gates):**
- The PO list (B1 risk consumer) now exports true 0–4 risk numbers instead of colored labels and prints a tick-sheet
  of the current rows; risk-score/export workflows can reuse `numericExport`, and the dialog is a model for future
  print-with-notes end-of-day sheets.
- Completes the **Workstream A grid chrome** set (A1–A7 except the A3 `DataTable` removal tail, which can now
  consolidate behind the shared grid).
- Next: **A3 `DataTable` removal tail** (grep "no consumers" → tsc), then Workstream B domain gaps.

**Verification:** targeted `SpreadsheetGridChrome.test.tsx` 26/26 (16 pre-existing + 5 A6 + 5 A4) +
`PurchaseOrdersListPage.test.tsx` 10/10; `tsc -b` exit 0; oxlint 0 errors (79 warnings, codebase-wide
exhaustive-deps convention); full frontend vitest **309/309 (45 files, +5 A4)**.
Scoresheet: `TDD_TRACKER` A4 row → ✅ VERIFIED + evidence #47.

---

## Part 8 Addendum — DS-01 Design builder Phase 1: content-block reordering (2026-09-04)

**Backward trace (what enables / drives this):**
- User observation: the design page should let a designer build a tech-pack layout like a content-block
  document (sketch, material, fit specs, images, job requests) rather than a fixed page. Chosen scope:
  **Phase 1 only — block reordering** (no canvas/drag-pixel layout, no floating images, no new libraries).
- Serves the **target-requirements tech-pack builder** narrative behind PRD **PD-003** (tech pack per version,
  HIGH) and gap refs `REQUIREMENTS_GAP_ANALYSIS` 1.6 block reference / 21.5 column reordering; builds on the
  RQ-036–042 DesignSheet/tech-pack infrastructure and the `sketch_annotations` JSONField precedent
  (migration `0031`).

**Implementation (TDD, backend + frontend, isolated blast radius):**
- Backend: `DesignSheet.layout_order` JSONField (`merchandising/models.py`) with `BLOCK_KEYS`
  (`header/sketch/material/fit_specs/images/job_requests`), `save()` default = full list, `clean()` exact-set
  guard; migration `0035_designsheet_layout_order`. `DesignSheetSerializer.layout_order` writable with
  exact-set validation (400 on unknown keys / non-list) + `to_representation` fallback so GET always returns
  a full order. RBAC/tenant isolation unchanged — reuses `DesignSheetViewSet` ModelViewSet PATCH
  (`merchandising:edit`).
- Frontend: `DesignSheet.layout_order` type + `merchApi.updateDesignSheet(id, { layout_order })` PATCH;
  `DesignSheetPage` renders the six blocks in persisted order, each wrapped with **Move up / Move down**
  controls (disabled at the edges), optimistically persisted via PATCH.
- Tests: backend `test_design_sheet_api.py::TestDesignSheetLayoutOrder` (4) — default full list / writable +
  round-trip / unknown block → 400 / non-list → 400 (RED 4 fail → GREEN 4/4). Frontend block-layout suite
  (5) — render in persisted order / default fallback / move-up PATCH / move-down PATCH / edge-disable
  (RED 5 fail → GREEN 5/5).
- Test-authoring corrections (not implementation bugs): the reorder test initially used a non-existent
  `cover` block (validator correctly 400s) and clicked a block already at index 0; both fixtures realigned
  to valid adjacent swaps.

**Forward (what this unlocks / gates):**
- Persisted block order is the first control a designer has over tech-pack structure; WYSIWYG print parity
  (`DesignSheetPrintPage`), a future cover block, and per-version layout snapshots (PD-002/PD-007) all render
  the exact saved arrangement.
- Next queued P0: **16.3 Order Manager critical-path UI strip + weekly-review print** (G-08 forward).

**Verification:** backend adjacency **80/80** (all `test_design_sheet_*.py` suites); `tsc -b` exit 0; oxlint
0 errors (79 warnings); full frontend vitest **314/314 (45 files, +5)**.
Scoresheet: `TDD_TRACKER` DS-01 row → ✅ VERIFIED + evidence #48.

## Part 9 Addendum - 16.3 Order Manager critical-path UI strip + Weekly Review print (2026-09-05)

**Slices covered (RQ-028 / PRD ME-014, G-08 forward):**
1. Critical-path strip column on `OrderManagerDashboardPage` - per-PO status chip
   (`no-ta`→"No T&A" / `on-track` / `off-track` / `complete`), `completed/total` milestone progress with
   delayed count, and the next milestone (name, `critical` marker, `in Nd` / `Nd late`).
2. Weekly Review print dialog (A4 print-with-tick pattern) - per-PO tick checkboxes default-on with CP status
   shown, `Print (n)` action count → `window.print()`.

**Impact analysis:** PRIORITY P0 / TIER roadmap 16.3 / BLAST_RADIUS isolated (page + client type, frontend
only; no backend change) / GATE_PLAN frontend (`tsc -b`, oxlint, vitest).
Backward: consumes the G-08 `OrderManagerSerializer.critical_path` block (TDD entry #44) and mirrors the A4
print-with-tick dialog (`SpreadsheetGridChrome`). Forward: delivers the P0 "where is my business at risk"
daily/weekly review surface; milestone→area mapping (fabric/trims/labels/technical) remains a separate
follow-up that needs milestone area data from the backend.

**Traceability:** PRD ME-014 Critical path monitoring (HIGH) → RQ-028 Order Manager dashboard → G-08
`critical_path` payload → `OrderManagerCriticalPath`/`OrderManagerNextMilestone` types + strip column +
weekly-review dialog → 5 RED→GREEN tests in `OrderManagerDashboardPage.test.tsx`.

**What changed:**
- `src/api/client.ts`: added `OrderManagerCriticalPath` + `OrderManagerNextMilestone` interfaces and
  `critical_path` on `OrderManagerRow`.
- `src/pages/OrderManagerDashboardPage.tsx`: `CP_STATUS_META` (label + chip token per status), Critical Path
  table column (header after Schedule; empty-state colSpan 13→14), `Weekly Review` toolbar button,
  `reviewOpen`/`ticks` state, dialog (`data-testid="weekly-review-dialog"`, tick rows + CP status,
  `Print ({selectedCount})` → `window.print()`), `toggleTick` default-on un-tick model.
- `src/pages/__tests__/OrderManagerDashboardPage.test.tsx` (new): fixture `makeRow`/`cp` helpers with the full
  `OrderManagerRow` surface (mocks `Layout`, `useToast`, `merchApi.getOrderManager`, `setupApi.getBuyers`,
  `MemoryRouter`). RED: 5 tests failed first (no strip/dialog). GREEN: 5/5.

**Test-authoring lesson carried forward from A6/DS-01:** dialog assertions scope to
`within(getByTestId('weekly-review-dialog'))` where needed; `window.print` is spied via
`vi.spyOn(window, 'print')`.

**Verification:** RED 5 fail → GREEN 5/5; `tsc -b` exit 0; oxlint 0 errors (79 pre-existing warnings);
full frontend vitest **319/319 (46 files, +5)**;
Scoresheet: `TDD_TRACKER` 16.3 row → ✅ VERIFIED + evidence #49.

## Part 10 Addendum - A3 ProductionPlansPage DataTable → SpreadsheetGrid (2026-09-05)

**Slices covered (roadmap Workstream A3, Excel-familiar grid default):**
1. Migrated `ProductionPlansPage` from `DataTable` → `SpreadsheetGrid` (Planning module list).
2. Grid now owns toolbar search, per-column header filters, column chooser, pagination (25/page), Excel
   export and print-with-tick for the Production Plans register.

**Impact analysis:** PRIORITY P1 (grid rollout tier) / TIER A3 / BLAST_RADIUS isolated (one page + new
test; no API/route/shared-component change) / GATE_PLAN frontend only.
Backward: follows the established A3 pattern (DocketsPage, PurchaseOrdersListPage) — fetch-all with
`page_size: 10000`, client-side grid chrome; reuses `productionApi` unchanged and `ProductionPlan` fields.
Forward: shrinks the DataTable consumer set toward the A3 tail "Remove DataTable once last consumer
migrates" (~20 consumers remain); the Planning module list gains Excel parity.

**Traceability:** Replication goal (grid as default list surface) → A3 rollouts → ProductionPlansPage
migration → 5 RED→GREEN tests in `ProductionPlansPage.test.tsx`.

**What changed:**
- `src/pages/ProductionPlansPage.tsx`: imports `SpreadsheetGrid` + `SpreadsheetColumn`; columns PO # /
  Factory / Plan Date / Quantity (right) / Status; `gridData` mapping (`status._ → space`,
  `quantity.toLocaleString()`); removed server-side list state (search/page/sort/filters/`handleSort`) and
  `STATUS_COLORS`; `getPlans({ page_size: '10000' })`; grid wired with `title`/`toolbar`/`exportable`/
  `printable`/`columnChooser`/`paginationSize 25`/`actionColumn` + `onAdd`/`onEdit`/`onDelete`; New Plan +
  Edit modal + delete-confirm unchanged.
- `src/pages/__tests__/ProductionPlansPage.test.tsx` (new): mirrors the migrated-page test harness
  (mock `Layout`, `useToast`, `productionApi`/`setupApi`/`merchApi`, capture SpreadsheetGrid props).
  RED: 5 tests failed first. GREEN: 5/5.

**Test-authoring note:** the page's mount effect also loads `setupApi.getFactories` and
`merchApi.getPOs` (dropdown data) — all three mocked APIs must resolve in `beforeEach`, or the effect
throws `Cannot read properties of undefined (reading 'then')`.

**Verification:** RED 5 fail → GREEN 5/5; `tsc -b` exit 0; oxlint 0 errors (79 pre-existing warnings);
full frontend vitest **324/324 (47 files, +5)**;
Scoresheet: `TDD_TRACKER` A3 ProductionPlans row → ✅ VERIFIED + evidence #50.

## Part 11 Addendum - A3 FabricOrdersPage DataTable → SpreadsheetGrid (2026-09-05)

**Slices covered (roadmap Workstream A3, Excel-familiar grid default):**
1. Migrated `FabricOrdersPage` from `DataTable` → `SpreadsheetGrid` (Fabric module order register).
2. Grid now owns toolbar search, per-column header filters, column chooser and pagination (10/page);
   the page keeps its existing `getOrders({ page_size: 200 })` fetch and its New Order / Edit /
   Risk & Schedule modals.
3. The B8/16.2 schedule editor (strike-off required/approval, actual arrival, paperwork + role
   ownership) previously opened via the DataTable "Risk" row button — now exposed through the A6 Row
   Actions menu as **"Risk & Schedule"**.

**Impact analysis:** PRIORITY P1 (grid rollout tier) / TIER A3 / BLAST_RADIUS isolated (one page +
rewired test; no API/route/shared-component change) / GATE_PLAN frontend only.
Backward: follows the established A3 pattern (DocketsPage, PurchaseOrdersListPage, ProductionPlansPage);
reuses `fabricApi` (getOrders/createOrder/updateOrder/deleteOrder) unchanged; removes the page-local
`STATUS_COLORS` badge map and the server-side search/page slice (search/page/filtered/pagedData),
keeping `RISK_COLORS` for the modal chips. Forward: preserves the 16.2 schedule flow (tested in the
rewritten suite) and shrinks the DataTable consumer set toward the A3 tail "Remove DataTable once last
consumer migrates" (~19 consumers remain).

**Traceability:** Replication goal (grid as default list surface) → A3 rollouts → FabricOrdersPage
migration → 5 RED→GREEN tests in `FabricOrdersPage.test.tsx` (grid chrome + 16.2 editor retained).

**What changed:**
- `src/pages/FabricOrdersPage.tsx`: swapped `DataTable`+`Column`+`STATUS_COLORS` for
  `SpreadsheetGrid`+`SpreadsheetColumn`; columns Order # / Supplier / Category / Qty (m) / Total /
  Status / Risk / ETA with header filters on text columns; `gridData` mapping (`status._ → space`,
  `total_price` → `$` formatted, `risk_level_name || risk_level_code || 'none'`); removed
  search/page/filtered/pagedData state; `actionColumn` `onAdd` (New Order)/`onEdit` (Edit modal)/
  `onDelete` (confirm) + `rowActions` → **"Risk & Schedule"** (`openRisk`); modals unchanged.
- `src/pages/__tests__/FabricOrdersPage.test.tsx` (rewritten): migrated-page harness (mock `Layout`,
  `useToast`, SpreadsheetGrid gridCapture, clientMock re-exporting `FABRIC_ORDER_STATUSES`); keeps the
  16.2 assertions (Strike-Off Required / Approval, Actual Arrival, Paperwork, heading "Risk & Schedule").
  RED: 5 tests failed first. GREEN: 5/5.

**Test-authoring notes:** direct grid-callback invocations (onEdit/rowActions-action) must be wrapped in
`act(...)`, else React throws on the unhandled state updates; the client mock must re-export the
`FABRIC_ORDER_STATUSES` constant because the Edit modal reads it at render time.

**Verification:** RED 5 fail → GREEN 5/5; `tsc -b` exit 0; oxlint 0 errors (79 pre-existing warnings);
full frontend vitest **328/328 (47 files, net +4 with the rewritten FabricOrders test)**;
Scoresheet: `TDD_TRACKER` A3 FabricOrders row → ✅ VERIFIED + evidence #51.

---

## Part 12 Addendum — Design module: unified Design register grid (2026-09-06)

**Task status:** ✅ Completed. TDD RED→GREEN→verify; seed data added; docs updated.

**What and why:** The Design module showed two separate lists (Styles, Design Sheets) under the
top-level Design dropdown. Per request, these merge into a single **Design** menu entry pointing at a
new **Design Register** grid (the "target-requirement" Excel-familiar register surface) with 15
columns, while every existing BHMS screen/route/data stays intact (old `/styles` and `/design-sheets`
list pages and all detail/print routes remain).

**Column mapping (grid):**
Design=`style_name||style_code` · Style Code · Style Type (new field) · Based on · Status (`_`→space
label) · Department · Designer · Risk Date (new field) · Contains (new field) · Live Orders ·
Completed Orders · Pattern Request Date (new field) · Annotation (`sketch_annotations` count → "N
marks") · Notes · Sketch. Live vs Completed split:`LIVE_PO_STATUSES` = open/confirmed /
in_production / quality_check / ready / shipped; `COMPLETED_PO_STATUSES` = delivered; draft/cancelled
excluded; counts are per-style via `PurchaseOrder`.
`file_opening__style` (tenant-scoped).

**Impact analysis:** PRIORITY P1 / TIER A7 (IA) + A3 (grid surface) / BLAST_RADIUS isolated for the
page; additive backend fields are nullable so no existing consumer changes / GATE_PLAN frontend +
backend.
Backward: continues the A3 grid pattern; reuses `DesignSheetSerializer` and the existing
`getDesignSheets` endpoint with the new computed fields; placeholder fallbacks (`—`) keep grid rows
readable when seeded data or fields are empty. Forward: unlocks the register as the single Design
surface; old list pages remain reachable via their own routes.

**What changed (backend):**
- `StyleTechPack` (+ 4 nullable fields): `style_type`, `contains`, `risk_date`, `pattern_request_date`
  (migration `0036_styletechpack_contains_and_more.py`, applied).
- `apps/merchandising/design_register.py` (new): LIVE/COMPLETED status sets + `order_counts_for_style`.
- `DesignSheetSerializer`: added `style_name`, `department`, `style_type`, `contains`, `risk_date`,
  `pattern_request_date`, `live_orders_count`, `completed_orders_count`.
- `management/commands/seed_design_register.py` (new, idempotent): REG-1001..REG-1005 designs with POs
  so Live/Completed counts are non-zero; run on the dev DB.
- `tests/unit/test_design_register.py` (new): 5 tests, RED→GREEN 5/5 (unique PO `file_number`
  required for the UNIQUE (tenant, file_number) constraint).

**What changed (frontend):**
- `src/pages/DesignsPage.tsx` (new): SpreadsheetGrid with the 15 columns (Live/Completed right-aligned),
  `title="Design Register"`, `paginationSize={20}`, export/print/column-chooser, row click → the
  existing `/design-sheets/:id` detail page.
- `Layout.tsx`: Design dropdown now shows **Design** (`/design`) · Tech Pack Import · Fit Specs · Job
  Requests · Design Costings · Costings (Styles and Design Sheets removed from nav).
- `App.tsx`: `/design` route (+ import); `client.ts` `DesignSheet` type extended.
- Tests: `DesignsPage.test.tsx` (5) + `Layout.test.tsx` updated (merged-menu + Merchandising scoped to
  the dropdown panel, since the top-level "Design" button text pollutes whole-doc queries).

**Verification:** frontend `tsc -b` 0; oxlint 0 errors (81 warnings — 2 new exhaustive-deps
convention warnings); vitest **334/334 (48 files, +6)**, targeted 10/10 GREEN. Backend full suite:
**1680 passed / 8 failed** with `test_techpack_excel_import.py` ignored (missing external workbook,
env-only). The 8 failures were proven **pre-existing** by re-running them with all this task's changes
stashed (same 8 fail: `/api/v1/monitoring/health/run_checks/` 404 route gap + an auth test expecting
401, and `test_not_sold` date-range now stale because hard-coded `2026-08-03` end-date precedes
today's date window). Scoresheet: `TDD_TRACKER` evidence #52 -> ✅ VERIFIED. Seed note: seed command
output must stay ASCII (cp1252 `UnicodeEncodeError` on `✓`).

---

## Part 13 Addendum — Design register grid/list view toggle + modern cards (2026-09-06)

**Task status:** ✅ Completed. RED→GREEN→verify; frontend only.

**What and why:** Review feedback: the merged Design register lost the grid/list interaction that the
Styles list had always offered. Restored it — the register keeps the Tabulator grid as the default
(list) view with a header toggle, and offers a **card grid view** that renders one modern card per
design relying on the shared `EntityCard` (the site's card language used by Styles/FileOpenings —
`rounded-xl` surface, border, emerald hover, status pill, metrics footer) following uiux-guidelines
3.4/3.5.

**What changed:**
- `src/pages/DesignsPage.tsx`: `view: 'grid' | 'list'` state (default `list`), `CardListToggle` in the
  header, card branch mapping register rows onto `EntityCard` (`sketch_url` image, `style_name ||
  style_code` title, `designer · department` subtitle, status badge, pattern-request date, Live /
  Completed metrics, View -> `/design-sheets/:id`), empty state when no designs.
- `src/components/EntityCard.tsx`: `CardListToggle` buttons now expose `aria-label` ("Grid view"/"List
  view") + `aria-pressed` (a11y; no consumer behaviour change).
- `src/pages/__tests__/DesignsPage.test.tsx`: +4 tests (toggle defaults to list, card grid mapping
  incl. image/date/metrics/url, card quick-action navigation, toggle back to list).

**Verification:** RED 4 fail -> GREEN 9/9; Styles/FileOpenings adjacency 19/19; `tsc -b` 0; oxlint 0
errors (81 warnings); vitest **338/338 (48 files, +4)**; Vite smoke `GET /design` 200.
Scoresheet: `TDD_TRACKER` A7 register row + evidence #53.

**Follow-up (2026-09-06, evidence #54):** card grid made **smaller and compact** — additive
`compact` prop on the shared `EntityCard` (image `h-44`->`h-24`, padding `p-4`->`p-3`, tighter
metric/action gutters + `text-xs` metric values; default off so Styles/FileOpenings unchanged);
DesignsPage passes `compact` and uses `xl:grid-cols-4 gap-3`. New `EntityCard.test.tsx` (2) +
DesignsPage compact assertion; RED 2 fail -> GREEN 21/21 targeted; vitest **340/340 (49 files)**;
tsc 0; lint 0 errors.
## Part 14 Addendum — Design register “New Design” (fresh + copy-from-existing) creation (2026-09-06)

**Task status:** ✅ Completed. RED→GREEN→verify; backend + frontend.

**What and why:** The unified Design register could list/filter designs but had no way to *start* a new
one. Target checklist B.1 calls for "Style relationship (based on another)", "Include/exclude
annotations on copy" and "Copy from base/another style". This delivers a **“+ New Design”** flow that
initialises a design sheet in two modes:
- **Fresh**: brand-new design from the init form (Garments Type, Style Reference, Relationship, Block
  Reference, Description). No annotations/notes carry over. Relationship defaults to *New*.
- **Copy From Existing**: clone a source sheet's technical header + sketch into a new sheet + tech
  pack; `based_on` records the source tech-pack number. Relationship defaults to *Based on*. Sketch
  annotations are copied only when **Include Annotation** is ticked, the note only when **Include
  Notes** is ticked.

**What changed:**
- `backend (models.py)` — `StyleTechPack.relationship` (based_on / na / recut / new, default `new`),
  migration **`0037`**.
- `backend (serializers.py)` — `DesignInitSerializer` (mode, source, init-form fields, include flags);
  `DesignSheetSerializer` exposes `relationship`.
- `backend (views.py)` — `DesignSheetViewSet.init` action (`POST /design-sheets/init/`,
  `merchandising:create`): fresh + copy modes, tenant-scoped source lookup, atomic
  techpack+sheet creation, sketch image/thumbnail linked when copying.
- `frontend (client.ts)` — `initDesignSheet` + `DesignSheet.relationship`.
- `frontend (components/NewDesignModal.tsx)` — mode toggle, source picker (prefills the form from the
  chosen design), init-form fields, include-annotation/notes checkboxes, Create Design.
- `frontend (pages/DesignsPage.tsx)` — “+ New Design” header button, “Relationship” register column +
  row mapping (Based on / NA / Recut / New), empty-state create button, modal wiring
  (create → toast → navigate to the new sheet).

**Verification:** backend RED 14 (405) → GREEN 14 + 79 adjacency = **93 passed**; migration 0037
applied to dev DB; frontend RED 6 → GREEN targeted 13/13; `tsc -b` 0; oxlint 0 errors (82 warnings,
baseline 81 + existing DesignsPage catch); vitest **344/344 (49 files, +4)**; Vite 200.
Scoresheet: `TDD_TRACKER` evidence #55.

### Part 14 Revision — typed setup picks + auto unique Style Code (2026-09-06)

User feedback redefined the creation form. Still ✅ Completed; schema + UI revised:

- **Garments Type** — now a **searchable dropdown backed by the `setup.ProductType` master**, stored as
  a typed FK on `StyleTechPack.product_type` (division: no free text). Same sourcing decision for
  **Buyer** → `StyleTechPack.buyer` FK; `customer` name is derived from the chosen buyer (Client/Buyer
  aligned). Copy mode derives Garments Type readonly from the source (new versioning is implicit — each
  copy is a fresh sheet + tech pack with a new file number).
- **Style Reference** — hidden from the form; never taken from the client. Fresh → blank; copy →
  derived readonly from the source.
- **Style Code** — new auto-generated unique identification number `StyleTechPack.style_code`
  (`DS-####`, generated by `next_style_code()` parallel to `next_techpack_number`), shown read-only in
  the modal. Distinct from the linked Style number; the register "Style Code" column shows it with a
  display fallback to the linked Style's `style_number` for legacy rows.
- **Relationship** — auto-set and hidden: fresh forces `new`, copy forces `based_on` (server-enforced).
- **Copy source** — searchable select keyed by Style Code; Garments Type / Style Reference /
  Relationship readonly; Buyer stays selectable (server falls back to the source buyer when omitted).
- **Schema** — `StyleTechPack.product_type` FK + `buyer` FK + `style_code`, migration **`0038`**
  (applied to dev DB). Tenant-scoped validation for typed IDs (foreign product_type/buyer → 400);
  `buyer_name` serializer falls back Style → techpack buyer → customer.

**Verification (rework):** backend `test_design_sheet_init.py` reworked to the new contract (+2
buyer_name/product_type_name assertions) — RED 5 fail + 5 errors → GREEN **16/16**; adjacency
**95/95** (init + register/sheet/material-grid/fit-spec-copy/API). Frontend `DesignsPage.test.tsx`
reworked (setupApi.getTypes/getBuyers mocks) — RED 2 fail → GREEN targeted **13/13**; `tsc -b` 0;
oxlint 0 errors (81 warnings, baseline); vitest **344/344 (49 files)**. Scoresheet: `TDD_TRACKER`
evidence #56.

## Part 15 Addendum — Design register: Buyer column, systematic per-column filters, backend xlsx export (2026-09-06)

**Task status:** ✅ Completed. RED→GREEN→verify; backend + frontend.

**What and why:** The unified Design register grid had a broken Excel download (frontend `table.download`
requires a SheetJS runtime that isn't shipped) and was not systematically searchable per column. This
slice: (a) adds the **Buyer** column (buyer_display_name: style.buyer → techpack.buyer → customer),
(b) makes every column filterable — **dropdown** (`list`) where the value set is bounded (Buyer, Style
Type, Relationship, Status, Department), **free-text** (`input`) elsewhere (Design, Style Code, Based on,
Designer, Contains), and **date** filters for Risk Date / Pattern Request Date (comma-separated OR tokens,
`YYYY-MM-DD`, `YYYY-MM`, `YYYY`), and (c) replaces the broken client-side download with a real
**server-generated xlsx** streamed as a blob download.

**What changed:**
- `backend (models.py)` — `StyleTechPack.buyer_display_name()` (style.buyer → techpack.buyer → customer).
- `backend (serializers.py)` — `DesignSheetSerializer.get_buyer_name` delegates to `buyer_display_name()`.
- `backend (views.py)` — `DesignSheetViewSet.export` action `GET /design-sheets/export/` (openpyxl, sheet
  "Design Register", 25 columns mirroring the grid + Live/Completed orders); `required_permissions["export"]
  = "merchandising:view"`; `get_queryset` select_related extended (tech_pack__buyer, tech_pack__product_type,
  tech_pack__style__department).
- `frontend (components/gridFilters.ts)` — NEW pure `matchDateFilter` (comma-separated OR; empty → all;
  row normalized to its date part; prefix match on `YYYY`/`YYYY-MM`/`YYYY-MM-DD`).
- `frontend (components/SpreadsheetGrid.tsx)` — `headerFilterType: 'input'|'list'|'date'` (date → input +
  `headerFilterFunc: matchDateFilter`); global search recomputes `gridData` over the full `allGridData`
  (finds rows on other pages); `handleExport` falls back to CSV when `window.XLSX` is absent and honours a
  new `onExport` override.
- `frontend (pages/DesignsPage.tsx)` — **Buyer** column after Style Code (`field:'buyer'`, list filter),
  per-column `headerFilterType` (list: buyer/style_type/relationship/status/department; input:
  design/style_code/based_on/designer/contains; date: risk_date/pattern_request_date + `headerFilter:
  true`), `onExport` streams the backend blob (download + toast + exporting guard).
- `frontend (api/client.ts)` — `exportDesignSheets()` (`responseType: 'blob'`).

**Verification:** backend RED 1 fail (404) → GREEN **34/34** (export 2 + init 16 + design image 16);
frontend RED 17 fail → GREEN targeted **51/51**; `tsc -b` 0; oxlint 0 errors (81 warnings, baseline);
vitest **356/356 (50 files)**. Live smoke: export 200, `application/vnd.openxmlformats-officedocument.
spreadsheetml.sheet`, attachment `design_register.xlsx` (6680 bytes); parsed live workbook — 25 headers,
Buyer at index 3, rows DS-1001 → Addidas, DS-1002 → Aldi. Browser check of filters + Export left to a human
smoke (no browser MCP this session). Scoresheet: `TDD_TRACKER` evidence #57.

### Part 15 Revision — list-column header filters fixed (browser smoke follow-up)

Same status (✅ Completed); the **list-column filters (Buyer, Status, etc.) never matched rows** in the
browser. Two root causes in Tabulator 5.6: the List module ignores `listValues` (it reads
`values`/`valuesURL`/`valuesLookup` only → empty dropdown), and Tabulator filters only the one page given
to it → picks could never match other pages. Fix in `SpreadsheetGrid`:
- Column config now passes `headerFilterParams.values` (distinct values over the full dataset via
  `listValuesByField`) and a no-op `headerFilterFunc` so Tabulator never double-filters.
- ALL header filtering is computed in React over `allGridData` (list = exact match, input = substring,
  date = `matchDateFilter`), reconciled from Tabulator via the `dataFiltered` event +
  `getHeaderFilterValue(field)` (clear button included).
- Grid data updates flow through `table.setData()` instead of a full re-initialization, so typed filter
  text and pagination survive; on rebuild, filter values are restored via `setHeaderFilterValue`.
- Verification: RED 10 fail → GREEN 35/35 (SpreadsheetGridChrome); `tsc -b` 0; oxlint 0 errors (81
  warnings baseline); vitest **360/360 (50 files)**. Dev servers live (5173/8000) for a browser refresh of
  `/design`.

## Part 15 Addendum 2 — Design register product-master alignment: drop `style_type`, surface Product Category (2026-09-08)

**Task status:** ✅ Completed. RED→GREEN→verify; backend + frontend.

**What and why:** User asked to "connect necessary" setup entities and "remove unnecessary" ones. The
register's **Style Type** column read the free-text `StyleTechPack.style_type`, while the authoritative
`setup.ProductType` FK already existed and was set at init/copy — the two could diverge, and Product
Category (`ProductType.category.name`) was never surfaced. Decision (user pick): **drop `style_type`
entirely**; ProductType FK is the single source of truth (legacy rows without a product_type show blank);
Department continues via `Style.department` (already correct).

**What changed:**
- Backend: `style_type` CharField removed (`models.py` + `migrations/0039`); `serializers.py` adds
  `product_category_name = CharField(source="tech_pack.product_type.category.name", read_only=True,
  default="")` and swaps `style_type` → `product_category_name` in Meta.fields; `views.py` init no longer
  computes `garments_type`, export headers/rows use `tp.product_type.name` +
  `tp.product_type.category.name`; `seed_design_register.py` links each register `style_type` key to
  ProductCategory (Apparel/Knitwear/Outerwear) + ProductType (Jogger/Tee/Polo/Jacket) FKs.
- Frontend: `DesignsPage.tsx` Style Type column ← `product_type_name`, new **Category** column ←
  `product_category_name`; `NewDesignModal.tsx` copy-mode Garments Type ← `source.product_type_name`;
  `client.ts` DesignSheet type drops `style_type?`, adds `product_category_name?`.
- Tests: `test_design_register.py`/`test_design_sheet_export.py` assert Product Type / Product Category
  and no `style_type`; `test_design_sheet_init.py` fixtures/asserts switched to `product_type`.
- Verification: RED 2 fail → backend **23/23** + frontend **16/16**; `tsc -b` 0; oxlint 0 errors
  (baseline); vitest **362/362 (50 files)**; full backend **1715 passed / 9 pre-existing env-failures**
  (monitoring 404 `health/run_checks/` route, missing techpack-excel sample xlsx, not-sold date-range; none
  touch the touched symbols). Dev DB migrated (`merchandising.0039`), :8000 restarted.

## Part 15 Addendum 3 — Design register attribute-list revision: drop `Contains` column, add `production` status (2026-09-08)

**Task status:** ✅ Completed. RED→GREEN→verify; backend + frontend.

**What and why:** User re-supplied the register attribute list with two deltas: the **Contains** column
is removed from the register (the tech-pack contents string stays on the model / tech-pack exports but
is no longer a register column), and **`production`** joins the design-sheet lifecycle
(`new / rejected / closed / production / archived`).

**What changed:**
- Backend: `DesignSheet.Status.PRODUCTION = "production"` (`models.py`); `contains` removed from
  `DesignSheetSerializer` fields and from the register-export headers/rows (`views.py`).
- Frontend: `DesignsPage.tsx` drops the Contains column and maps `production`; `designSheetFields.ts`
  `DESIGN_SHEET_STATUSES`/`STATUS_LABELS` add `production`; `DesignSheetHeader.tsx` + `EntityCard.tsx`
  add a production status style; `DesignSheetsListPage.tsx` label map updated; `client.ts` drops
  `contains?`.
- Verification: RED 3 fail → backend **54/54 targeted** + frontend **16/16**; `tsc -b` 0; oxlint 0 errors
  (baseline); vitest **362/362 (50 files)**; full backend regression expected only in the 9 pre-existing
  environment failures.

## Part 15 Addendum 4 — Merged scope: Design Information editable on the design-sheet detail (2026-09-10)

**Task status:** ✅ Completed. RED→GREEN→verify; backend + frontend.

**What and why:** The Style detail page (`/styles/:id`) gained an editable Design Information section, but
the user's workspace is the **merged Design Register** (`/design` → row click → `/design-sheets/:id`).
Since Style and Design are one scope, the design-sheet detail is the register entry for the linked
**Style**: its Design Information now mirrors the Style (single source of truth) with the imported
tech-pack snapshot as fallback, and the header carries the same Edit/Save UI (Based On read-only,
Relationship dropdown, date pickers, Design Note textarea) that PATCHes the Style and refetches.

**What changed:**
- Backend: `DesignSheetSerializer.to_representation` overrides the design-info keys from the linked Style
  when non-empty (`block/based_on/relationship/customer/size/designer/pattern_cutter/issuer/cloth_code/
  length/description` + `note ← style.design_note`; dates `issue_date/risk_date/pattern_request_date` via
  `isoformat()`), leaving the tech-pack field sources as fallback for blank Style values / unlinked
  sheets. Unlinked `style_id` stays `None` (falsy).
- Frontend: `DesignSheetHeader.tsx` gains Edit/Save/Cancel with the StyleDetailPage field-type rules
  (from `designSheetFields.ts`: `RELATIONSHIP_LABELS`, `RELATIONSHIP_OPTIONS`, and
  `relationship`/`risk_date`/`pattern_request_date` added to the read grid). Save PATCHes
  `/merchandising/styles/{style_id}/` (text → `""` on clear, dates → `null`) then refetches the sheet;
  no Edit button when no Style is linked.
- Tests: `test_design_sheet_api.py` `TestDesignSheetDesignInfoFromStyle` (+4: detail/list mirror someone
  Style PATCH, tech-pack fallback, unlinked fallback); `DesignSheetHeader.test.tsx` (+4 edit-flow tests).
- Verification: backend RED 3 fail → GREEN **4/4** + design-sheet adjacency **124/124** + owning app
  **51/51**; frontend RED → GREEN **9/9**; `tsc -b` 0; oxlint 0 errors (baseline); vitest **366/370 (4
  pre-existing GuidedTour localStorage env failures)**. GATE_A — serializer change is shared, so every
  `DesignSheetSerializer` consumer's tests were run; full 1746-test backend regression deferred as a
  milestone gate.

**Follow-up (same day, same Addendum) — every register entry editable, Style-linked or not.**
Fresh "New Design" init creates sheets with an **unlinked** tech-pack (`style=None` when no source), yet
the Edit UI was gated on `style_id` — so freshly-created register entries could not be saved. Added a
write path:
- Backend: `PATCH /merchandising/design-sheets/{id}/design-info/` (`DesignSheetViewSet.design_info`,
  perm `merchandising:edit`) writes the design-info fields onto the linked Style when present (single
  source of truth) and onto the tech-pack otherwise (`design_note` → `note`; dates → `null` on clear,
  text → `""`; `relationship` validated against `new/based_on/na/recut`). Class constants
  `DESIGN_INFO_FIELDS` / `DESIGN_INFO_DATES` / `DESIGN_INFO_RELATIONSHIPS`.
- Frontend: the header now **always** shows Edit (read-only hint removed); `handleSave` routes every
  save through `merchApi.updateDesignSheetDesignInfo` (the merged endpoint decides the target);
  `client.ts` gains `updateDesignSheetDesignInfo(id, data)`.
- Tests: backend `TestDesignSheetDesignInfoWrite` (+4, all failed first on the missing route); frontend
  header tests re-targeted to the merged endpoint (2 failed first — no Edit for unlinked sheets).
- Verification: backend targeted **8/8** + `test_design_sheet_api.py` **37/37** + adjacency **44/44**
  + owning app **51/51**; frontend **10/10**; `tsc -b` 0; oxlint 0 errors (baseline); vitest
  **367/370 (GATE_A, allowlist only)**. Home-screen path `/design` → `/design-sheets/:id` → Edit on any
  sheet (e.g., TP-1003) → Save persists to the tech-pack (unlinked) or the Style (linked).

**Follow-up 3 (same Addendum) — save-500 fix + Customer as Setup→Buyer dropdown.**
User-reported on the always-editable form: (1) the Update button failed for Style-linked sheets — root
cause: the `design-info` action wrote date strings verbatim onto the model, and the
`DesignSheetSerializer` Style-mirror called `.isoformat()` on them → `'str' object has no attribute
'isoformat'` (500) on every linked save. Fixed with date coercion in the action
(`_coerce_design_date`, 400 on malformed, `''`→`null`) + a defensive serializer date guard.
Live-verified HTTP 200 on TP-1002 (dates ISO; cleared dates null). (2) `Customer` is now a dropdown
of **Setup→Buyer** names (`setupApi.getBuyers`, alphabetic, legacy value preserved, `''` clears the
field). Verification: backend `test_design_sheet_api.py` **38/38** + adjacency **44/44** + owning app
**51/51**; frontend header **12/12**, `tsc -b` 0, lint 0 errors, vitest **369/373 (allowlist only)**.

**Follow-up 4 (same Addendum) — blank-relationship 400 + Style-page Customer dropdown.**
Browser feedback: "updated name is not storing". Root cause: the always-editable header sends every
field and its Relationship select offers "—"; when relationship was empty the `design-info` action
rejected `""` with `Invalid relationship` (400) and NO field persisted. Fix: `''` is now a valid clear
(still rejects unknown non-empty values). Also unified the **Style detail** page's Design Information:
Customer was a free text input → now the same Setup→Buyer dropdown (preselected, alphabetised, legacy
value preserved). Verification: backend blank-relationship RED→GREEN (6/6, live HTTP 200 + clear);
`StyleDetailPage.test.tsx` RED→GREEN; real-browser: style page `isSelect:true`, `API PERSISTED
customer:Lidl`; design-sheet API + e2e **45/45**, owning app **51/51**; frontend `tsc -b` 0, lint 0
errors, vitest **370/374 (allowlist only)**.

**Follow-up 2 (same Addendum) — always-editable Design Information, no toggle.**
User feedback after follow-up 1: even with the (fresh) code live, the toggle was still not discoverable —
"no visible save button, no field editable". The Edit/Save toggle was removed entirely: the Design
Information card on the design-sheet detail now renders the 14 fields as **always-enabled inputs** with a
prominent **"Update Design Information"** primary button (and a Discard button that re-syncs the form
from the latest sheet). The form re-syncs from the `sheet` prop via `useEffect` after a save-refetch.
Same `design-info` endpoint and field-kind payload split (text → `""`, dates → `null`) as follow-up 1.
Tests rewritten to the always-editable contract (6 failed first), targeted **10/10**; `tsc -b` 0; lint 0
errors (baseline); vitest **367/370 (allowlist only)**.

## Part 15 Addendum 5 — Merged scope close-out: register reflects editable Customer + duplicate Style surfaces removed (2026-09-11)

**Task status:** ✅ Completed. RED→GREEN→verify; frontend only.

**What and why:** Two close-out items after Addendum 4. (1) User reported the **register** did not
reflect the Customer edit made on the design-sheet detail — the grid mapped `buyer_name` (the immutable
tech-pack snapshot FK) instead of the merged editable `customer`; the list response already carried the
updated value via `DesignSheetSerializer.to_representation`, so it was purely a frontend mapping bug.
(2) The Style surface still duplicated Design: extra list pages/routes and a Style detail page that
re-hosted the Design Information editor. Chose one register (`/design`), one edit surface
(`/design-sheets/:id`).

**What changed:**
- `DesignsPage.tsx`: column renamed **Buyer → Customer**, mapped `customer: o.customer || o.buyer_name
  || '—'`, subtitle → "Design sheets across the buying house". (No backend change — serializer already
  merged the field for both endpoints.)
- Style surface close-out: `/styles` and `/design-sheets` routes → `<Navigate to="/design" replace />`;
  `StylesListPage` and `DesignSheetsListPage` (and their test suites) deleted; `StyleDetailPage` demoted
  to a read-only dossier (kept its unique deep tabs: Versions, Line Items, BOM, Tech Packs, Sketches —
  not present on the design sheet) with an **Open in Design** action mapping `style_id → sheet id` via
  `getDesignSheets`, falling back to `/design` when unlinked.
- Tests: `DesignsPage.test.tsx` Customer-column/merged-mapping (RED first — column still Buyer);
  `StyleDetailPage.test.tsx` rewritten (read-only, Open in Design navigation + fallback, RED first).
- Verification: frontend `tsc -b` 0; oxlint 0 errors (baseline warnings only); vitest **361 passed / 4
  pre-existing GuidedTour jsdom failures (allowlist)**. GATE_A — frontend-only, no backend gate.

---

## Part 15 Addendum 6 — Buyer/Customer concept merge: single `Setup.Buyer` source of truth
(DS-1002, 2026-09-11)

The duplicated `buyer` + `customer` concepts (Adidas buyer vs Decathlon customer) collapse to **one
Buyer field** app-wide. Style-pack imports store the pack's Customer text into `buyer`; "Customer" is
removed as a label/app field; Buyer is the single source of truth.

- **Contract (user decisions):** style pack wins — a resolved pack customer overrides an existing
  chosen buyer on extract/import; master data required — non-empty unresolvable pack customer → 400
  (no auto-create); `design-info` PATCH accepts `buyer` as a tenant-scoped **Buyer UUID (FK id)**; the
  old `customer` text key is removed. Extract ordering fixed: buyer resolution runs BEFORE techpack
  creation (was: techpack created first, 400 left an orphan).
- Backend: `techpack/buyer_resolve.py` (`resolve_buyer_by_name`, case-insensitive); `Style.customer` +
  `StyleTechPack.customer` removed + `buyer_display_name()`; migration `0041_buyer_merge.py`
  (pack `customer` → `buyer` backfill + RemoveField ×2); serializers drop `customer`, design-sheet
  adds read-only `buyer_id`; views extract/import/design-info/init/copy updated; seed command uses
  `buyer=buyers[0]`. DTO carrier `customer` in `columns.py`/`excel_export.py`/`pdf_parser.py`/
  `import_service.py` left untouched so Excel round-trips survive.
- Frontend: `client.ts` types drop `customer`; `DesignSheetHeader` Buyer = id-based `<select>` of
  `setupApi.getBuyers` (sends `buyer: <uuid>`, keeps legacy current value as an option); customer row
  removed from `designSheetFields.ts` + import-wizard fields; `DesignsPage` + `StyleDetailPage` show
  `buyer_name`.
- Tests: new `tests/unit/test_buyer_merge.py` (13, RED first) + legacy design-sheet/techpack/style
  suites reworked (customer → buyer; techpack fixture "DOTTI"). Scoped gate: backend **109/109**;
  frontend `tsc -b` 0; oxlint 0 errors; vitest **358 passed / 4 pre-existing GuidedTour jsdom failures
  (allowlist)** (5 suites RED→GREEN, net new id-select test). GATE_A — merchandising-scoped +
  full frontend suite.

---

## Part 15 Addendum 7 — Design-sheet print page: modern compact redesign + BHMS branding (2026-09-11)

User feedback on the print/PDF view: standardise to a modern software design sheet, compact layout,
emphasise Buyer and Style, and remove the legacy "CARMEL APPARELS" wordmark — the footer (and page at
large) should say only **BHMS**.

- Frontend: `DesignSheetPrintPage.tsx` rewritten — white paper on soft slate surround; header leads
  with a BHMS emerald badge + "Design Sheet" title and right-aligned File/status line; **Buyer**
  (emerald) and **Style** (slate) as two emphasised `text-xl` bold cards (`print-buyer-name` /
  `print-style-code`); Design Information as a compact 2-column label/value `<dl>`; denser Fit Specs /
  Material tables (`text-xs`, `py-1`, `bg-slate-50` headers); footer "BHMS — Design Sheet" + `© <year>
  BHMS` + printed timestamp (Carmel removed).
- Tests: `DesignSheetPrintPage.test.tsx` — buyer/style emphasis assertion + no-Carmel check on the
  header; footer test renamed to BHMS-branded/no-Carmel/time+year. RED first (2 failed on the old
  layout). Targeted **15/15**.
- Verification: frontend `tsc -b` 0; oxlint 0 errors (baseline warnings only); vitest **358 passed /
  4 pre-existing GuidedTour jsdom failures (allowlist)**. GATE_A — isolated frontend-only page.

---

## Part 15 Addendum 8 — Design register grid: Style Type + Category editable dropdowns (2026-09-11)

User request: the register grid columns **Design / Style Type / Category** must be available for
inline update ("plain text input field or dropdown where appropriate") with the updated information
stored. "Design" (style name) was already inline-editable + persisted via
`updateStyle(styleId, { name })`; this closes the gap for the two master-data columns.

- Read path (backend): `DesignSheetSerializer.to_representation` served `product_type_name` /
  `product_category_name` from the stale `tech_pack.product_type` snapshot even when the linked Style
  had its own FKs — Style edits never surfaced in the register. Added the Style-preferred merge already
  used for `buyer`: linked-Style `product_type_id`/`product_type_name`, and `product_category_name` =
  Style.category → Style.product_type.category → techpack snapshot.
- Write path (frontend): `DesignsPage.tsx` loads `setupApi.getTypes()` + `setupApi.getCategories()`;
  Style Type and Category columns are `select` editors keyed by master name; `handleCellEdited` maps the
  chosen name → master id and PATCHes the linked Style (`updateStyle(styleId, { product_type })` /
  `{ category }`), then updates the row optimistically (same toast/err handling as the Design column).
- Tests: backend 3 new (2 register-read RED-first + 1 write-path proof) → targeted **28/28**, adjacency
  **98/98**, owning app **51/51**; frontend 3 new DesignsPage tests RED-first → `tsc -b` 0, oxlint 0
  errors (baseline), vitest **361 passed + 4 allowlisted / 365**.
- **GATE_A: VERIFIED.** No schema change (Style already owns both FKs; `StyleSerializer` already
  writable) — no migration.

## Part 15 Addendum 9 - Material Breakdown grid: full standard-grid behaviour on the design-sheet detail (2026-09-13)

User request: material rows on `/design-sheets/:id` must behave like the standard data-list grid —
Column filters, add, update, delete all working (previously only right-click delete; Add silently
no-oped on an empty grid / missing BOM; supplier edits were dropped).

Backward: continues the DS-01 design-sheet detail work + the shared `SpreadsheetGrid` pattern (A3):
centralized grid chrome (`toolbar`/`exportable`/`printable`/`columnChooser`/`paginationSize`,
per-column header filters, `actionColumn`), client-side vendor master list (setup `Buyer`/Vendor, the
A7 buyer-merge source of truth), and the existing `PATCH /bom-items/{id}/` write path. Forward:
closes the last design-sheet detail gap against the "Excel-familiar desktop workflow"; the new
`material-add` action mirrors the auto-create BOM/version pattern of the reference manual and unblocks
any future template-driven row inserts.

- Backend: `POST /api/v1/merchandising/design-sheets/{id}/material-add/` (new `material_add` action on
  `DesignSheetViewSet`, `required_permissions["material_add"] = "merchandising:create"`). Resolves
  style → style_version (draft v1 autocreated when missing) → BOM (active preferred else latest; draft
  `version = max+1` autocreated and named when missing) → creates `BOMItem` (defaults `category=
  "Others"`, `item_name="New Item"`) and returns the grid-shape row (201); 400 when the sheet has no
  linked style. `get_material_items` refactored onto shared `material_item_grid_row(item, bom)`
  helper (serializers.py) — behaviour identical, no consumer change. Raw-create FK gotcha: pass
  `uom_id`/`vendor_id`/`supplier_id` attribute-name forms, not UUID strings. No schema change — no
  migration.
- Frontend: `DesignSheetMaterial.tsx` — new `supplierOptions`/`loading` props, per-column
  `headerFilter`/`headerFilterType`, supplier `editor:'select'` keyed by vendor name, `toolbar` +
  Undo/Redo/"+ Add Item", `actionColumn` delete, export/print/column-chooser, `paginationSize: 20`,
  `loading`, group-by type + clipboard/history preserved. `DesignSheetPage.tsx` — loads vendors via
  `setupApi.getVendors({ page_size: '10000' })`; `handleMaterialEdit` maps supplier name → vendor id
  (unknown names no-op); `handleMaterialAdd(row?)` always calls `merchApi.addMaterialItem(sheet.id,
  payload)` (no `bom_id` client-side dependency) then refetches; client.ts gained `addMaterialItem`
  (`createBOMItem` retained — BOMDetailPage consumer).
- Tests: backend RED-first 5 new (`TestMaterialAddAction`) → targeted **10/10**, owning app **51/51**,
  adjacency **13/13** (trim-schedule + core lifecycle — both hit bom-items); frontend RED-first
  rewrites/extensions (DesignSheetMaterial 5, DesignSheetPage 4-ish) → `tsc -b` 0, oxlint 0 errors
  (baseline), vitest **371 passed / 371**.
- **GATE_A: VERIFIED.** New DB writes only via runtime auto-create (version/BOM); no migration.

## Part 15 Addendum 10 - Design-sheet demo data: Design Information + Material Breakdown rows (2026-09-13)

User request: 4-5 sample records so the design-sheet detail page (`/design-sheets/:id`) shows real
data in the **Design Information** block and the **Material Breakdown** grid.

- Backend: new idempotent `seed_design_sheet_demo` management command
  (`backend/apps/merchandising/management/commands/seed_design_sheet_demo.py`, optional
  `--tenant <slug>`). Creates 5 demo designs (DSD-1001..1005, realistic apparel): Style →
  StyleVersion v1 (active) → StyleTechPack with the full design-info field set (block / based-on /
  relationship / designer / pattern-cutter / issuer / cloth-code / size / length / issue-date /
  risk-date / pattern-request-date / note + buyer FK) → DesignSheet (per-sample status), plus an
  active BOM v1 per sheet carrying 5 `BOMItem` rows mapped to grid fields (type / location /
  supplier / colour / width_size / qty / match) and resolved against Vendor masters
  (FOURSEASONS / ALICE- / NEW SUP). Idempotent via `get_or_create` keys — safe to re-run.
- Tests: RED-first 4 in `tests/unit/test_seed_design_sheet_demo.py` — 4-5 sheets created; each sheet
  detail returns populated design info + a 4-5-row `material_items` grid in full row shape with
  supplier name and positive qty; re-run is idempotent. Targeted **4/4** + adjacency **10/10**
  (material grid). **GATE_A: VERIFIED.** No schema change — no migration.
- Run live against the dev DB: 5 sheets, 5 material rows each; data visible on the design-sheet
  detail pages.

---

## Part 15 Addendum 11 - Fit Specs + Job Requests grids on the design sheet detail (2026-09-13)

User request: the Fit Specs and Job Requests sections on `/design-sheets/:id` should behave like the
Material Breakdown grid - full add/update/delete + standard grid chrome, keeping the domain activity.

- Frontend only (no backend change): both sections now render through the shared `SpreadsheetGrid`.
- **Fit Specs**: columns Fit Spec / Selected (check mark) / Fit Date / Description / Notes / Photos;
  inline cell edits PATCH the spec (`updateFitSpecification`), action-column + context-menu delete
  (`deleteFitSpecification`), selection now uses the safe `selectFitSpecification` action (clears the
  previous selected spec first - the old raw `is_selected` PATCH could trip the unique-selected
  constraint). Saved images gallery for the selected spec, Copy from Base / Copy from Another Style
  pickers, and the auto-numbered add form are preserved.
- **Job Requests**: columns Job Type / Required By / Work Location / No. of Garments (sum) /
  Allocated To / Status / Notes with friendly label editors; cell edits map back to domain keys (user
  name -> `allocated_to` id, status/job-type label -> key) and PATCH `updateDesignJobRequest`;
  action-column + context-menu delete (`deleteDesignJobRequest`); create form preserved.
- Tests: RED-first rewrites of `DesignSheetFitSpecs.test.tsx` (23) + `DesignSheetJobRequests.test.tsx`
  (13) + `DesignSheetPage.test.tsx` (27) against the mocked grid - RED 22-fail verified via
  stash/run/pop, then GREEN **63/63**. Full suite **387/387** (`tsc -b` 0, lint 0 errors).
  **GATE_A: VERIFIED** (frontend only - backend endpoints already covered by
  `test_design_sheet_api.py` / `test_design_sheet_e2e_flows.py`).

---

*This is the single source of truth for the BHMS backlog and requirement status (workflow-ordered). Reframed: 2026-08-03*