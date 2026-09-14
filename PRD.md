# Product Requirements Document (PRD)
# Buying House Management System (BHMS)
# Bangladesh Ready-Made Garment (RMG) Industry

---

| Field | Value |
|-------|-------|
| Document Title | Buying House Management System (BHMS) |
| Version | 2.0 — aligned to current solution |
| Status | Aligned to implemented solution (original was: Draft) |
| Last Updated | 2026-08-07 |
| Original Version | 1.0 (2024-01-15) — **preserved in full** below; v2.0 only adds status/alignment markers (§0) and Status columns |
| Classification | Confidential |
| Target Industry | Bangladesh RMG |

---

## Table of Contents

0. [Alignment to Current Solution (v2.0)](#0-alignment-to-current-solution-v20--2026-08-07)
1. [Executive Summary](#1-executive-summary)
2. [Product Vision](#2-product-vision)
3. [Business Goals](#3-business-goals)
4. [Stakeholder Analysis](#4-stakeholder-analysis)
5. [User Personas](#5-user-personas)
6. [Functional Requirements](#6-functional-requirements)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Module Specifications](#8-module-specifications)
9. [User Stories](#9-user-stories)
10. [Acceptance Criteria](#10-acceptance-criteria)
11. [Business Rules](#11-business-rules)
12. [Data Model Recommendations](#12-data-model-recommendations)
13. [API Recommendations](#13-api-recommendations)
14. [Screen Inventory](#14-screen-inventory)
15. [UI/UX Guidelines](#15-uiux-guidelines)
16. [Workflow Diagrams](#16-workflow-diagrams)
17. [Reporting Requirements](#17-reporting-requirements)
18. [Dashboard Specifications](#18-dashboard-specifications)
19. [Security Model](#19-security-model)
20. [Integration Strategy](#20-integration-strategy)
21. [Future AI Roadmap](#21-future-ai-roadmap)
22. [Development Roadmap](#22-development-roadmap)
23. [Release Plan](#23-release-plan)
24. [Risks & Assumptions](#24-risks--assumptions)
25. [Glossary](#25-glossary)

---

## 0. Alignment to Current Solution (v2.0 — 2026-08-07)

> **How to read this version.** Every requirement, table, and section of the original
> v1.0 PRD (2024-01-15) is **retained verbatim** below. v2.0 **adds** an alignment layer:
> a status marker per requirement group in §0.3, Status columns on the module summary
> (§8.1), technology stack (§22.1) and release plans (§23), and this §0 summary. Nothing
> original was deleted — items the product chose **not** to build are marked **Not built /
> Deferred**, not removed.

### 0.1 Implementation Status (verified 2026-08-07)

- **Backend**: Django 5.2 + DRF, 13 apps (`authentication, commercial, core, fabric,
  logistics, merchandising, monitoring, production, quality, reporting, setup, tenants,
  users`), SimpleJWT + TOTP MFA, Celery + Redis wired, drf-spectacular API schema,
  reportlab PDF, tenant isolation **fail-closed** (0.1), 1281 tests green.
- **Frontend**: React 19 + Vite 8 + TypeScript + Tailwind 4, 70+ routed pages covering
  every module below; BD localization (BDT default, Chattogram, `bd` costing sheet, Sonali Bank).
- **All 35 workflow requirements** (`master-backlog.md` Part 2, RQ-001…RQ-035) are
  **100% implemented, tested, and seeded**.
- **Not yet built (roadmap Phase 1+ / deferred)**: production stack & CD (1.1/1.2),
  PostgreSQL validation (1.3), role-first UX (1.4), report templates (1.5), alert
  producers (1.6), Finance module, SSO/OAuth, Elasticsearch, GRN/WMS inventory, AI.

### 0.2 Domain Lifecycle (as built)

```
Customer Inquiry → File Opening → PO (+ amendment) → BOM/Costing (BDT) → T&A →
Fabric & Trim Procurement → Production (plans, daily, factory portal) → Job Queue →
Quality (inspections, gold seal, compliance audit) → Commercial (LC 8-state, PI/SC/SCF,
invoice approval, debit note) → Logistics (booking schedule/ref, dockets, shipment,
final-hit reconciliation) → Order Manager & Dashboards (where-is-my-business-at-risk)
```

### 0.3 Requirement Status Map

Legend: ✅ Implemented · ⚠️ Partial (core exists, some depth missing) · ❌ Not built / Deferred.

#### System Administration (SA)
| ID | Requirement | Status |
|----|-------------|--------|
| SA-001 | Multi-factor authentication (TOTP + backup codes, `authentication/mfa_*`) | ✅ |
| SA-002 | SSO | ❌ Deferred |
| SA-003 | OAuth 2.0 / OpenID Connect | ❌ Deferred (SimpleJWT only) |
| SA-004 | Session management w/ timeout | ⚠️ JWT access/refresh + verify; no server-side session timer |
| SA-005 | Password policy enforcement | ⚠️ Django validators + change/reset flows; no explicit lockout policy |
| SA-006 | Account lockout after failures | ❌ Deferred |
| SA-007 | Login audit trail | ✅ `AuditLog` (`/admin/audit-logs`) |
| SA-008 | Device management | ❌ Deferred |
| SA-009 | IP whitelisting | ❌ Deferred |
| SA-010 | Predefined role templates | ✅ 6 roles + `seed_role_users` |
| SA-011 | Custom role creation | ✅ Roles page + RBAC |
| SA-012 | Module-level permissions | ✅ |
| SA-013 | Field-level permissions | ❌ Deferred |
| SA-014 | Action-level permissions (V/C/U/D/Approve/Export) | ✅ DRF + RBAC |
| SA-015 | Role inheritance | ❌ Deferred |
| SA-016 | Permission audit trail | ✅ |
| SA-017 | Tenant isolation | ✅ Row-level, **fail-closed** (0.1); missing/invalid `X-Tenant-ID` → 400/403 |
| SA-018 | Tenant-specific configs | ✅ `Tenant` (currency BDT, plan, offices) |
| SA-019 | Cross-tenant reporting (super admin) | ❌ Deferred |
| SA-020 | Tenant provisioning automation | ⚠️ Admin/ViewSet provisioning; self-serve wizard = roadmap 2.1 |
| SA-021 | Tenant backup/restore | ❌ Roadmap 1.1 (backup job) |
| SA-022 | User creation w/ approval workflow | ⚠️ Admin creates users; no approval gate |
| SA-023 | Bulk user import | ❌ Deferred |
| SA-024 | User deactivation/reactivation | ✅ |
| SA-025 | User profile management | ✅ |
| SA-026 | User activity logging | ✅ |
| SA-027 | Tenant company information | ✅ Tenant setup |
| SA-028 | Office/location management | ✅ |
| SA-029 | Department management | ✅ |
| SA-030 | Designation management | ✅ |
| SA-031 | Audit log viewing | ✅ |
| SA-032 | Access log viewing | ✅ (via AuditLog) |
| SA-033 | Season master | ✅ |
| SA-034 | Product category master | ✅ |
| SA-035 | Product type master | ✅ |
| SA-036 | Product department master | ✅ |
| SA-037 | Compliance document type master | ✅ |
| SA-038 | Delivery mode master (FOB/CIF/CM…) | ✅ |
| SA-039 | UOM master | ✅ |
| SA-040 | Currency master | ✅ (default BDT) |
| SA-041 | Payment terms master | ✅ (TT30, LC01…) |
| SA-042 | Country master | ✅ |
| SA-043 | Color code master | ✅ |

#### Master Data Management (MD)
| ID | Requirement | Status |
|----|-------------|--------|
| MD-001 | Buyer master w/ profile | ✅ (H&M, Zara, Primark, C&A, Decathlon, Target, Walmart, Costco, Aldi, Nike) |
| MD-002 | Buyer brand hierarchy | ✅ `Brand` → `Buyer` |
| MD-003 | Buyer compliance requirements | ⚠️ Compliance tracked per audit; buyer-level requirement set not explicit |
| MD-004 | Buyer payment terms | ✅ |
| MD-005 | Buyer-specific pricing | ⚠️ Currency + credit limit; price-list per buyer not built |
| MD-006 | Buyer document management | ❌ Deferred |
| MD-007 | Factory master w/ capacity | ✅ (incl. Mahmud Group, Chattogram) |
| MD-008 | Factory capability mapping | ⚠️ `factory_type` (knitting/woven); capability matrix not built |
| MD-009 | Factory compliance tracking | ⚠️ Via compliance audits |
| MD-010 | Factory performance history | ⚠️ Aggregated via risk/delivery; no dedicated history |
| MD-011 | Factory contact management | ⚠️ Basic contact fields |
| MD-012 | Vendor master | ✅ (Pacific Denim, Noman, Padma, Sadat, Stylo) |
| MD-013 | Vendor certification tracking | ⚠️ Approval + rating; certifications not built |
| MD-014 | Vendor performance scoring | ✅ `rating` |
| MD-015 | Vendor payment terms | ✅ |
| MD-016 | Vendor document management | ❌ Deferred |

#### Product Development / Style (PD)
| ID | Requirement | Status |
|----|-------------|--------|
| PD-001 | Style creation (unique number) | ✅ |
| PD-002 | Style versioning (V1, V2…) | ✅ |
| PD-003 | Tech pack per version | ✅ |
| PD-004 | BOM | ✅ (+ trim schedule, copy-from-order) |
| PD-005 | POM | ⚠️ Covered by FitSpec; dedicated POM not built |
| PD-006 | Sketch/image management | ✅ `DesignImage` (main/range/detail) |
| PD-007 | Revision history | ✅ |
| PD-008 | Style approval workflow | ✅ (incl. repeat/quick-lead approvals) |
| PD-009 | Style classification | ✅ |
| PD-010 | Style–Buyer mapping | ✅ |

#### Merchandising / Order Lifecycle (ME)
| ID | Requirement | Status |
|----|-------------|--------|
| ME-001 | File opening linked to style version | ✅ |
| ME-002 | File opening w/ buyer details | ✅ |
| ME-003 | PO per file | ✅ |
| ME-004 | Multiple POs per file (destinations/dates) | ✅ |
| ME-005 | PO amendment workflow | ✅ (`AMD-…` versioned) |
| ME-006 | Costing w/ versioning | ✅ (5 sheet types incl. BD, live tick) |
| ME-007 | Yield calculation | ⚠️ Partial (costing lines; yield engine not built) |
| ME-008 | BOM-based costing | ✅ |
| ME-015 | Design costing (style-level single-piece cost) | ✅ (`DesignCosting` per Style; approve/reject/set-live; **Prepare PO Costing** derives the order-level `Costing`) |
| ME-016 | Per-piece price ladder (discount + overhead decomposition) | ✅ (selling, customer discount %, origin % / UK % overhead, base cost, margin, landed cost × exchange rate; frozen snapshot carried onto the PO costing) |
| ME-009 | Sourcing management | ✅ (fabric RFQ/booking/order, vendors) |
| ME-010 | Material booking | ✅ |
| ME-011 | Work order generation | ⚠️ JobRequest/queue; formal work orders not built |
| ME-012 | T&A planning per PO | ✅ |
| ME-013 | T&A calendar view | ✅ |
| ME-014 | Critical path monitoring | ⚠️ Calendar + heatmap; auto critical-path not explicit |

#### Commercial & Banking (CB)
| ID | Requirement | Status |
|----|-------------|--------|
| CB-001 | Master LC | ✅ (8-state lifecycle) |
| CB-002 | Back-to-Back LC | ✅ |
| CB-003 | LC amendment tracking | ✅ |
| CB-004 | Sales contract | ✅ |
| CB-005 | Proforma Invoice generation | ✅ |
| CB-006 | Bank management | ✅ (Sonali Bank SONABDDH, Pubali — BD) |
| CB-007 | Financial exposure tracking | ⚠️ LC utilization/amounts; full exposure not built |
| CB-008 | LC utilization monitoring | ✅ |
| CB-009 | Shipment reconciliation | ✅ (final-hit reconciliation, paperwork comparison) |

#### Procurement (PR)
| ID | Requirement | Status |
|----|-------------|--------|
| PR-001 | Vendor RFQ management | ✅ FabricRFQ |
| PR-002 | Supplier comparison | ⚠️ RFQ list; comparison view not built |
| PR-003 | Purchase order management | ✅ (fabric + merchandising POs) |
| PR-004 | Material tracking | ✅ (fabric & trim schedules) |
| PR-005 | Work order management | ⚠️ JobRequest/queue |
| PR-006 | Delivery schedule tracking | ✅ |
| PR-007 | Vendor performance scoring | ✅ |

#### Inventory (IN)
| ID | Requirement | Status |
|----|-------------|--------|
| IN-001 | Goods receive | ⚠️ FabricOrder delivery state; no GRN document |
| IN-002 | Goods issue | ❌ Deferred |
| IN-003 | Returns management | ❌ Deferred |
| IN-004 | Transfer management | ❌ Deferred |
| IN-005 | Virtual stock allocation | ✅ `StockFabricAllocation` ledger |
| IN-006 | Fabric inventory | ⚠️ StockFabric + `FabricUtilization` + dockets (the standalone `FabricInventory` module was **removed** in 0.6 as dead weight) |
| IN-007 | Accessories inventory | ❌ Deferred (trim schedule only) |
| IN-008 | Warehouse management | ❌ Deferred |

#### Production (PO)
| ID | Requirement | Status |
|----|-------------|--------|
| PO-001 | Production planning | ✅ |
| PO-002 | Production monitoring | ✅ dashboard |
| PO-003 | Line performance tracking | ⚠️ Daily reports; line-level not built |
| PO-004 | Daily production reporting | ✅ |
| PO-005 | DHU tracking | ⚠️ Inspections; DHU metric not built |
| PO-006 | Efficiency calculation | ⚠️ FabricUtilization efficiency; production efficiency partial |
| PO-007 | Factory reporting portal | ✅ |

#### Quality (QA)
| ID | Requirement | Status |
|----|-------------|--------|
| QA-001 | Sampling management | ⚠️ Sample job requests + unsold analysis |
| QA-002 | Fitting management | ✅ FitSpec (dev/1st/2nd/3rd) |
| QA-003 | AQL inspection | ⚠️ Inspections page; AQL-specific not explicit |
| QA-004 | Technical approval workflow | ✅ |
| QA-005 | Lab dip management | ⚠️ FabricOrder `lab_dip` status |
| QA-006 | Test report management | ❌ Deferred |
| QA-007 | Corrective action tracking | ✅ |

#### Logistics (LG)
| ID | Requirement | Status |
|----|-------------|--------|
| LG-001 | Shipment booking | ✅ |
| LG-002 | Freight forwarder management | ✅ |
| LG-003 | Booking request workflow | ⚠️ Booking schedule/ref; formal request flow not built |
| LG-004 | Commercial document generation | ⚠️ GoldSeal, dockets, paperwork comparison |
| LG-005 | Packing list generation | ❌ Deferred |
| LG-006 | Invoice generation | ⚠️ Factory invoice approval; export invoice not built |
| LG-007 | Bill of Lading management | ⚠️ Docket + final-docket sales flag |
| LG-008 | Container tracking | ❌ Deferred |

#### Finance (FN) — module not built (roadmap Phase 2+)
| ID | Requirement | Status |
|----|-------------|--------|
| FN-001…006 | Chart of Accounts, Vouchers, Journal, Payments, Receivables, Cost centers | ❌ Not built |
| FN-007 | Profitability analysis | ⚠️ Margin/profit surfaced via Dashboard & Order Manager; no GL |
| FN-008 | Cost allocation | ❌ Not built |

#### Non-Functional (NFR) — status vs implementation
| ID | Requirement | Status |
|----|-------------|--------|
| NFR-001..006 | Performance targets (<2s page, <500ms API…) | ⚠️ Targets retained; not load-benchmarked |
| NFR-007..009 | Auto-scaling, DB sharding, CDN | ❌ Deferred |
| NFR-010 | Redis-based caching | ✅ Configured |
| NFR-011 | 99.9% uptime | ⚠️ Target (prod stack = roadmap 1.1) |
| NFR-012/013 | RTO <1h / RPO <5m | ❌ Deferred (backup job = 1.1) |
| NFR-014 | Automatic failover | ❌ Deferred |
| NFR-015 | Health monitoring | ✅ `/admin/health` + `monitoring` app |
| NFR-016 | Encryption at rest | ⚠️ Host-level only (no app-level TDE) |
| NFR-017 | TLS 1.3 in transit | ⚠️ Prod stack = 1.1 (dev is plain HTTP) |
| NFR-018 | Tenant-level data isolation | ✅ fail-closed (0.1) |
| NFR-019 | Audit logging | ✅ |
| NFR-020 | Quarterly pentest | ❌ Process not in place |
| NFR-021..024 | WCAG 2.1 AA, screen reader, keyboard, contrast | ⚠️ Accessible-oriented UI; no formal audit |
| NFR-025..027 | Tablet/mobile/touch responsive | ✅ Responsive Tailwind UI |
| NFR-028 | Offline capability | ❌ Deferred (Phase 2) |

### 0.4 Added Beyond the Original PRD (shipped in later sprints)

Gold Seal tracking, Compliance Audits (BSCI/WRAP/SCS), Final Hit Reconciliation,
Shipping Paperwork Comparison, Booking Schedule + Booking Reference (14-day alert),
Dockets + >200m sales flag, Debit Notes, Invoice Approval (5%/2% tolerance, >20-unit
debit rule), Fit Spec system + copying, Design Images, Not-Sold Analysis, Repeats,
Quick Lead-Time orders, Stock Fabric allocation, Fabric Utilization reports, Job
Request/Queue + dashboard, **Order Manager dashboard** ("where is my business at risk"),
risk-level + notes systems, supplier pre-approval, MFA, tenant isolation fail-closed,
BD localization, drf-spectacular API docs, and a 1281-test suite incl. a full-lifecycle e2e.

### 0.5 Deferred / Not Built (original PRD items carried as roadmap)

Finance module, Inventory (GRN/WMS/returns), SSO/OAuth, Elasticsearch, GraphQL, cursor
pagination / JSON:API, S3 storage, Prometheus/Grafana, AI/ML (per `ai-roadmap.md`),
mobile offline. Production stack + CD + PostgreSQL validation are Phase 1.1–1.3 of
`analysis/product-refinement-roadmap.md`.

### 0.6 Where to Verify

`master-backlog.md` Part 2 (RQ-001…035, all ✅ 100%), `analysis/product-refinement-roadmap.md`
(Phase 0 done; Phase 1 next), `docs/SALES_DEMO_SCRIPT.md`, `docs/api.md` (drf-spectacular),
`data-model.md`, and the running app (`http://localhost:5173`, demo users per role).

---

## 1. Executive Summary

### 1.1 Purpose

This Product Requirements Document (PRD) defines the complete specifications for a **Buying House Management System (BHMS)** - an enterprise-grade, cloud-native SaaS ERP solution designed specifically for the Bangladesh Ready-Made Garment (RMG) industry.

### 1.2 Problem Statement

Bangladesh's RMG sector, contributing over 80% of export earnings, operates with fragmented, manual processes:

| Problem | Impact |
|---------|--------|
| Excel-based tracking | Data silos, version conflicts, errors |
| Disconnected departments | Poor collaboration, delays |
| Manual T&A management | Missed deadlines, penalties |
| Paper-based LC management | Financial exposure, delays |
| No real-time visibility | Reactive decision-making |
| Inconsistent reporting | unreliable business intelligence |
| Duplicate data entry | Wasted resources, errors |

### 1.3 Proposed Solution

A centralized, multi-tenant, browser-based ERP platform that digitizes the complete buying house lifecycle:

```
Customer Inquiry → Order Management → Sourcing → Production → 
Quality → Shipment → Finance → Reconciliation → Analytics
```

### 1.4 Business Value

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Order Processing Time | 5-7 days | 1-2 days | 70% reduction |
| T&A Accuracy | 60-70% | 95%+ | 35% improvement |
| Costing Accuracy | 75-85% | 98%+ | 20% improvement |
| Delivery Performance | 65-75% | 90%+ | 25% improvement |
| Manual Data Entry | 100% | <10% | 90% reduction |
| Report Generation | 2-3 days | Real-time | 100% faster |

### 1.5 Scope

**In Scope:**
- Complete order lifecycle management
- Multi-company/multi-tenant support
- Commercial & LC management
- Production monitoring
- Quality management
- Logistics & shipment
- Financial accounting
- Executive dashboards
- Mobile-responsive design

**Out of Scope (Phase 1):**
- AI-driven recommendations (Phase 3)
- Advanced analytics (Phase 2)
- Third-party integrations (Phase 2)

---

## 2. Product Vision

### 2.1 Vision Statement

> "To become the operating system for Bangladesh's RMG buying houses - replacing fragmentation with intelligence, delays with agility, and uncertainty with visibility."

### 2.2 Product Principles

| Principle | Description |
|-----------|-------------|
| **Industry-First** | Built exclusively for RMG buying house workflows |
| **Simplicity** | Complex operations made simple through smart design |
| **Visibility** | Real-time insights at every level |
| **Compliance** | Built-in regulatory and buyer compliance |
| **Scalability** | From small buying houses to enterprise operations |
| **Security** | Bank-grade security for financial data |

### 2.3 Target Market

| Segment | Description | Users | Revenue Model |
|---------|-------------|-------|---------------|
| Small BH | 1-25 users | Small buying houses | Starter Plan |
| Medium BH | 26-100 users | Medium buying houses | Professional Plan |
| Enterprise BH | 100+ users | Large buying houses, trading companies | Enterprise Plan |
| Buying Offices | 10-50 users | International buying offices | Professional Plan |
| Trading Companies | 50-200 users | Multi-product trading | Enterprise Plan |

### 2.4 Success Metrics

| Category | Metric | Target |
|----------|--------|--------|
| Adoption | Monthly Active Users | 10,000+ by Year 2 |
| Engagement | Daily Usage per User | 4+ hours |
| Revenue | ARR | $5M by Year 2 |
| Retention | Annual Retention Rate | 90%+ |
| NPS | Net Promoter Score | 50+ |
| Performance | System Uptime | 99.9% |

---

## 3. Business Goals

### 3.1 Primary Goals

| Goal | Description | Measurement | Timeline |
|------|-------------|-------------|----------|
| G1 | Digitize 100% of buying house lifecycle | Zero manual processes | 18 months |
| G2 | Reduce order processing time | From 5-7 days to 1-2 days | 12 months |
| G3 | Improve delivery performance | From 65-75% to 90%+ | 18 months |
| G4 | Achieve 98%+ costing accuracy | Automated calculations | 12 months |
| G5 | Enable real-time production visibility | Live factory data | 12 months |
| G6 | Achieve 90% reduction in manual entry | Smart automation | 18 months |
| G7 | Support multi-company operations | Centralized management | 12 months |
| G8 | Enable executive decision support | AI-powered dashboards | 24 months |

### 3.2 Secondary Goals

| Goal | Description |
|------|-------------|
| Improve supplier collaboration | Portal for vendors |
| Enable mobile access | Responsive design |
| Reduce compliance violations | Automated tracking |
| Improve financial transparency | Real-time reporting |
| Enable data-driven decisions | Analytics & BI |

---

## 4. Stakeholder Analysis

### 4.1 Internal Stakeholders

| Stakeholder | Role | Interest | Influence | Strategy |
|-------------|------|----------|-----------|----------|
| Managing Director | Executive Sponsor | High | High | Regular updates, demos |
| CEO | Business Owner | High | High | Strategic alignment |
| COO | Operations Head | High | High | Process workshops |
| Merchandising Director | Module Owner | High | Medium | Weekly reviews |
| Commercial Director | Module Owner | High | Medium | Weekly reviews |
| IT Manager | Technical Liaison | Medium | High | Technical reviews |

### 4.2 External Stakeholders

| Stakeholder | Role | Interest | Strategy |
|-------------|------|----------|----------|
| Buyers | Customers | High | Feedback sessions |
| Factories | Suppliers | Medium | Training, portals |
| Vendors | Material Suppliers | Medium | Self-service portal |
| Auditors | Compliance | Low | Compliance features |

---

## 5. User Personas

### 5.1 Managing Director

| Attribute | Details |
|-----------|---------|
| **Name** | Abdul Rahman |
| **Age** | 55 |
| **Role** | Managing Director, Premium Garments Ltd |
| **Goals** | Business growth, profitability, buyer satisfaction |
| **Pain Points** | Lack of visibility, manual reports, delayed information |
| **KPIs** | Revenue, Profit Margin, On-time Delivery % |
| **System Usage** | Dashboard, Reports, Approvals |
| **Frequency** | Daily, 30-60 minutes |

**Quote:** *"I need to see everything in one place - orders, production, shipments, and profits. No more chasing people for reports."*

### 5.2 Merchandising Director

| Attribute | Details |
|-----------|---------|
| **Name** | Fatima Ahmed |
| **Age** | 42 |
| **Role** | Merchandising Director |
| **Goals** | On-time delivery, cost control, team efficiency |
| **Pain Points** | T&A delays, visibility gaps, communication issues |
| **KPIs** | On-time Delivery %, Costing Accuracy, Order Win Rate |
| **System Usage** | T&A, Orders, Production, Reports |
| **Frequency** | Throughout the day |

**Quote:** *"I need to know exactly where every order stands - from sampling to shipment - without calling ten people."*

### 5.3 Merchandiser

| Attribute | Details |
|-----------|---------|
| **Name** | Karim Hassan |
| **Age** | 28 |
| **Role** | Merchandiser |
| **Goals** | Meet deadlines, manage orders efficiently |
| **Pain Points** | Too many Excel files, manual updates, forgotten follow-ups |
| **KPIs** | Orders Managed, On-time Completion, Costing Accuracy |
| **System Usage** | Orders, T&A, Sourcing, Communication |
| **Frequency** | All day, 8+ hours |

**Quote:** *"I spend more time updating Excel than actually managing orders. I need a system that does the work for me."*

### 5.4 Commercial Manager

| Attribute | Details |
|-----------|---------|
| **Name** | Rashida Khan |
| **Age** | 35 |
| **Role** | Commercial Manager |
| **Goals** | LC management, bank compliance, shipment tracking |
| **Pain Points** | Paper-based LCs, reconciliation issues, deadline misses |
| **KPIs** | LC Utilization %, Shipment Accuracy, Payment Cycle Time |
| **System Usage** | LC Management, Banking, Shipment, Finance |
| **Frequency** | Throughout the day |

**Quote:** *"Managing 50+ LCs in Excel is a nightmare. I need one system to track everything."*

### 5.5 QA Manager

| Attribute | Details |
|-----------|---------|
| **Name** | Nasir Uddin |
| **Age** | 32 |
| **Role** | QA Manager |
| **Goals** | Quality standards, compliance, zero defects |
| **Pain Points** | Paper checklists, manual reporting, delayed feedback |
| **KPIs** | DHU Rate, Pass Rate, Compliance Score |
| **System Usage** | Quality, Inspections, Reports |
| **Frequency** | Daily, 4-6 hours |

**Quote:** *"I need to track quality at every stage - from fabric to finished goods - in real time."*

---

## 6. Functional Requirements

### 6.1 System Administration

#### 6.1.1 Authentication & Authorization

| ID | Requirement | Priority |
|----|-------------|----------|
| SA-001 | Multi-factor authentication (MFA) | High |
| SA-002 | Single Sign-On (SSO) support | High |
| SA-003 | OAuth 2.0 / OpenID Connect | High |
| SA-004 | Session management with timeout | High |
| SA-005 | Password policy enforcement | High |
| SA-006 | Account lockout after failed attempts | High |
| SA-007 | Login audit trail | High |
| SA-008 | Device management | Medium |
| SA-009 | IP whitelisting | Medium |

#### 6.1.2 Role-Based Access Control (RBAC)

| ID | Requirement | Priority |
|----|-------------|----------|
| SA-010 | Predefined role templates | High |
| SA-011 | Custom role creation | High |
| SA-012 | Module-level permissions | High |
| SA-013 | Field-level permissions | Medium |
| SA-014 | Action-level permissions (View, Create, Update, Delete, Approve, Export) | High |
| SA-015 | Role inheritance | Medium |
| SA-016 | Permission audit trail | High |

#### 6.1.3 Multi-Tenancy

| ID | Requirement | Priority |
|----|-------------|----------|
| SA-017 | Tenant isolation (database level) | High |
| SA-018 | Tenant-specific configurations | High |
| SA-019 | Cross-tenant reporting (super admin) | Medium |
| SA-020 | Tenant provisioning automation | High |
| SA-021 | Tenant data backup/restore | High |

#### 6.1.4 User Management

| ID | Requirement | Priority |
|----|-------------|----------|
| SA-022 | User creation with approval workflow | High |
| SA-023 | Bulk user import | Medium |
| SA-024 | User deactivation/reactivation | High |
| SA-025 | User profile management | High |
| SA-026 | User activity logging | High |

#### 6.1.5 Tenant & Organization Setup

| ID | Requirement | Priority |
|----|-------------|----------|
| SA-027 | Tenant company information | High |
| SA-028 | Office/location management | High |
| SA-029 | Department management | High |
| SA-030 | Designation management | High |
| SA-031 | Audit log viewing | High |
| SA-032 | Access log viewing | High |

#### 6.1.6 Common Setup (Master Data)

| ID | Requirement | Priority |
|----|-------------|----------|
| SA-033 | Season master (Spring, Summer, Fall, Winter) | High |
| SA-034 | Product category master | High |
| SA-035 | Product type master | High |
| SA-036 | Product department master | High |
| SA-037 | Compliance document type master | High |
| SA-038 | Delivery mode master (FOB, CIF, CM, etc.) | High |
| SA-039 | Unit of measurement (UOM) master | High |
| SA-040 | Currency master | High |
| SA-041 | Payment terms master | High |
| SA-042 | Country master | High |
| SA-043 | Color code master (status color codes) | High |

### 6.2 Master Data Management

#### 6.2.1 Buyer Management

| ID | Requirement | Priority |
|----|-------------|----------|
| MD-001 | Buyer master with complete profile | High |
| MD-002 | Buyer brand hierarchy | High |
| MD-003 | Buyer compliance requirements | High |
| MD-004 | Buyer payment terms | High |
| MD-005 | Buyer-specific pricing | High |
| MD-006 | Buyer document management | High |

#### 6.2.2 Factory Management

| ID | Requirement | Priority |
|----|-------------|----------|
| MD-007 | Factory master with capacity details | High |
| MD-008 | Factory capability mapping | High |
| MD-009 | Factory compliance tracking | High |
| MD-010 | Factory performance history | High |
| MD-011 | Factory contact management | High |

#### 6.2.3 Vendor Management

| ID | Requirement | Priority |
|----|-------------|----------|
| MD-012 | Vendor master with product categories | High |
| MD-013 | Vendor certification tracking | High |
| MD-014 | Vendor performance scoring | High |
| MD-015 | Vendor payment terms | High |
| MD-016 | Vendor document management | High |

### 6.3 Product Development (Style Management)

| ID | Requirement | Priority |
|----|-------------|----------|
| PD-001 | Style creation with unique style number | High |
| PD-002 | Style versioning (V1, V2, V3...) | High |
| PD-003 | Tech pack management per version | High |
| PD-004 | BOM (Bill of Materials) management | High |
| PD-005 | Point of Measurement (POM) | High |
| PD-006 | Sketch/image management | High |
| PD-007 | Revision history tracking | High |
| PD-008 | Style approval workflow | High |
| PD-009 | Style classification (Season, Category, Type) | High |
| PD-010 | Style-Buyer mapping | High |

**Style Hierarchy:**
```
Style (Master)
├── Version 1 (V1)
│   ├── Tech Pack V1
│   ├── BOM V1
│   └── Costing V1
├── Version 2 (V2)
│   ├── Tech Pack V2
│   ├── BOM V2
│   └── Costing V2
└── File Openings (Multiple)
    ├── File Opening 1 → POs (Multiple)
    │   ├── PO #1 (Destination A, Delivery Date X)
    │   ├── PO #2 (Destination B, Delivery Date Y)
    │   └── PO #3 (Destination C, Delivery Date Z)
    └── File Opening 2 → POs (Multiple)
        ├── PO #4 (Destination D, Delivery Date W)
        └── PO #5 (Destination E, Delivery Date V)
```

### 6.4 Merchandising (Order Lifecycle)

| ID | Requirement | Priority |
|----|-------------|----------|
| ME-001 | File opening linked to Style version | High |
| ME-002 | File opening with buyer details | High |
| ME-003 | Purchase Order (PO) management per file | High |
| ME-004 | Multiple POs per file (different destinations/dates) | High |
| ME-005 | PO amendment workflow | High |
| ME-006 | Costing management with versioning | High |
| ME-007 | Yield calculation | High |
| ME-008 | BOM-based costing | High |
| ME-009 | Sourcing management | High |
| ME-010 | Material booking | High |
| ME-011 | Work order generation | High |
| ME-012 | T&A planning per PO | High |
| ME-013 | T&A calendar view | High |
| ME-014 | Critical path monitoring | High |

**Order Lifecycle Flow:**
```
Style → File Opening → Purchase Order → Production → Shipment
  │         │              │
  │         │              ├── Destination A
  │         │              ├── Destination B
  │         │              └── Destination C
  │         │
  │         ├── File Opening 1
  │         └── File Opening 2
  │
  └── Version 1
      └── Version 2 (evolves over time)
```

### 6.5 Commercial & Banking

| ID | Requirement | Priority |
|----|-------------|----------|
| CB-001 | Master LC management | High |
| CB-002 | Back-to-Back LC creation | High |
| CB-003 | LC amendment tracking | High |
| CB-004 | Sales contract management | High |
| CB-005 | Proforma Invoice (PI) generation | High |
| CB-006 | Bank management | High |
| CB-007 | Financial exposure tracking | High |
| CB-008 | LC utilization monitoring | High |
| CB-009 | Shipment reconciliation | High |

### 6.6 Procurement

| ID | Requirement | Priority |
|----|-------------|----------|
| PR-001 | Vendor RFQ management | High |
| PR-002 | Supplier comparison | High |
| PR-003 | Purchase order management | High |
| PR-004 | Material tracking | High |
| PR-005 | Work order management | High |
| PR-006 | Delivery schedule tracking | High |
| PR-007 | Vendor performance scoring | High |

### 6.7 Inventory

| ID | Requirement | Priority |
|----|-------------|----------|
| IN-001 | Goods receive management | High |
| IN-002 | Goods issue management | High |
| IN-003 | Returns management | High |
| IN-004 | Transfer management | High |
| IN-005 | Virtual stock allocation | High |
| IN-006 | Fabric inventory | High |
| IN-007 | Accessories inventory | High |
| IN-008 | Warehouse management | Medium |

### 6.8 Production

| ID | Requirement | Priority |
|----|-------------|----------|
| PO-001 | Production planning | High |
| PO-002 | Production monitoring | High |
| PO-003 | Line performance tracking | High |
| PO-004 | Daily production reporting | High |
| PO-005 | DHU (Defective Hourly Unit) tracking | High |
| PO-006 | Efficiency calculation | High |
| PO-007 | Factory reporting portal | High |

### 6.9 Quality

| ID | Requirement | Priority |
|----|-------------|----------|
| QA-001 | Sampling management | High |
| QA-002 | Fitting management | High |
| QA-003 | AQL inspection | High |
| QA-004 | Technical approval workflow | High |
| QA-005 | Lab dip management | High |
| QA-006 | Test report management | High |
| QA-007 | Corrective action tracking | High |

### 6.10 Logistics

| ID | Requirement | Priority |
|----|-------------|----------|
| LG-001 | Shipment booking | High |
| LG-002 | Freight forwarder management | High |
| LG-003 | Booking request workflow | High |
| LG-004 | Commercial document generation | High |
| LG-005 | Packing list generation | High |
| LG-006 | Invoice generation | High |
| LG-007 | Bill of Lading management | High |
| LG-008 | Container tracking | High |

### 6.11 Finance

| ID | Requirement | Priority |
|----|-------------|----------|
| FN-001 | Chart of Accounts | High |
| FN-002 | Voucher management | High |
| FN-003 | Journal entries | High |
| FN-004 | Payment management | High |
| FN-005 | Receivable management | High |
| FN-006 | Cost center management | High |
| FN-007 | Profitability analysis | High |
| FN-008 | Cost allocation | High |

---

## 7. Non-Functional Requirements

### 7.1 Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-001 | Page load time | < 2 seconds |
| NFR-002 | API response time | < 500ms (95th percentile) |
| NFR-003 | Report generation | < 5 seconds |
| NFR-004 | Dashboard load time | < 3 seconds |
| NFR-005 | Concurrent users | 10,000+ |
| NFR-006 | Database queries | < 100ms |

### 7.2 Scalability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-007 | Horizontal scaling | Auto-scaling enabled |
| NFR-008 | Database sharding | Multi-region support |
| NFR-009 | CDN integration | Global content delivery |
| NFR-010 | Cache strategy | Redis-based caching |

### 7.3 Availability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-011 | System uptime | 99.9% |
| NFR-012 | RTO (Recovery Time Objective) | < 1 hour |
| NFR-013 | RPO (Recovery Point Objective) | < 5 minutes |
| NFR-014 | Failover mechanism | Automatic |
| NFR-015 | Health monitoring | Real-time |

### 7.4 Security

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-016 | Encryption at rest | AES-256 |
| NFR-017 | Encryption in transit | TLS 1.3 |
| NFR-018 | Data isolation | Tenant-level |
| NFR-019 | Audit logging | All critical operations |
| NFR-020 | Penetration testing | Quarterly |

### 7.5 Accessibility

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-021 | WCAG compliance | Level 2.1 AA |
| NFR-022 | Screen reader support | Yes |
| NFR-023 | Keyboard navigation | Full support |
| NFR-024 | Color contrast | 4.5:1 minimum |

### 7.6 Browser Support

| Browser | Version |
|---------|---------|
| Chrome | Latest 2 versions |
| Firefox | Latest 2 versions |
| Safari | Latest 2 versions |
| Edge | Latest 2 versions |

### 7.7 Mobile Responsiveness

| ID | Requirement |
|----|-------------|
| NFR-025 | Responsive design for tablets |
| NFR-026 | Mobile-optimized views |
| NFR-027 | Touch-friendly interfaces |
| NFR-028 | Offline capability (Phase 2) |

---

## 8. Module Specifications

See [module-specs.md](module-specs.md) for detailed module specifications.

### 8.1 Module Summary

| Module | Description | Priority | Phase | Status (v2.0) |
|--------|-------------|----------|-------|--------------|
| System Administration | Auth, RBAC, Multi-tenancy | Critical | MVP | ✅ Implemented (MFA, RBAC, fail-closed tenancy) |
| Master Data Management | Core business entities | Critical | MVP | ✅ Implemented |
| Merchandising | Order lifecycle, T&A | Critical | MVP | ✅ Implemented |
| Commercial & Banking | LC management | Critical | MVP | ✅ Implemented |
| Production | Planning & monitoring | High | MVP | ✅ Implemented |
| Quality | Inspection & compliance | High | MVP | ✅ Implemented |
| Logistics | Shipment management | High | MVP | ✅ Implemented |
| Inventory | Stock management | High | MVP | ⚠️ Partial (stock-fabric allocation; GRN/WMS deferred) |
| Procurement | Vendor management | High | Phase 2 | ⚠️ Partial (fabric/trim procurement built) |
| Finance | Accounting | High | Phase 2 | ❌ Not built (margin/exposure only in dashboards) |
| Reporting | Analytics & reports | High | Phase 2 | ✅ Implemented (SavedReport + ReportBuilder) |
| Dashboards | Executive views | Medium | Phase 2 | ✅ Implemented (Dashboard, Order Manager, Production, Quality, Shipment, T&A) |

---

## 9. User Stories

See [user-stories.md](user-stories.md) for complete user stories.

### 9.1 Sample User Stories

#### Order Management

| ID | Story | Priority |
|----|-------|----------|
| US-001 | As a Merchandiser, I want to create a new order so that I can track buyer requirements | Critical |
| US-002 | As a Merchandiser, I want to view T&A status so that I can monitor delivery timeline | Critical |
| US-003 | As a Merchandising Director, I want to view all orders by status so that I can prioritize work | High |
| US-004 | As a Merchandiser, I want to receive deadline alerts so that I don't miss critical dates | High |

#### Commercial

| ID | Story | Priority |
|----|-------|----------|
| US-005 | As a Commercial Manager, I want to create Master LC so that I can track buyer commitments | Critical |
| US-006 | As a Commercial Manager, I want to view LC utilization so that I can manage exposure | Critical |
| US-007 | As a Commercial Manager, I want to generate PI so that I can send to buyers | High |

#### Production

| ID | Story | Priority |
|----|-------|----------|
| US-008 | As a Factory User, I want to report daily production so that merchandisers have visibility | High |
| US-009 | As a QA Manager, I want to record inspection results so that quality is tracked | High |
| US-010 | As a Merchandising Director, I want to view production dashboard so that I can identify issues | High |

---

## 10. Acceptance Criteria

### 10.1 Order Creation

```gherkin
Feature: Order Creation

  Scenario: Create new order with valid data
    Given I am a logged-in Merchandiser
    When I navigate to Order Creation
    And I enter valid order details
    And I click Save
    Then the order should be created with status "Open"
    And I should see a success message
    And the order should appear in my order list

  Scenario: Create order with missing required fields
    Given I am a logged-in Merchandiser
    When I navigate to Order Creation
    And I leave required fields empty
    And I click Save
    Then I should see validation errors
    And the order should not be created

  Scenario: Create order with invalid quantity
    Given I am a logged-in Merchandiser
    When I navigate to Order Creation
    And I enter quantity as 0 or negative
    And I click Save
    Then I should see a validation error for quantity
```

### 10.2 T&A Planning

```gherkin
Feature: T&A Planning

  Scenario: Generate T&A from order
    Given I have an order with confirmed status
    When I generate T&A
    Then T&A milestones should be auto-calculated
    And delivery date should be set
    And critical path should be highlighted

  Scenario: Update T&A milestone
    Given I have an active T&A
    When I update a milestone date
    Then dependent milestones should be recalculated
    And changes should be logged
```

---

## 11. Business Rules

See [business-rules.md](business-rules.md) for complete business rules.

### 11.1 Summary

| Category | Rules |
|----------|-------|
| LC Management | Utilization limits, amendment tracking, expiry alerts |
| Costing | Version control, approval workflow, yield calculation |
| Production | Efficiency thresholds, DHU limits, capacity planning |
| Quality | AQL standards, compliance requirements, corrective actions |
| Shipment | Quantity validation, document requirements, tracking |
| Finance | Payment terms, allocation rules, reconciliation |

---

## 12. Data Model Recommendations

See [data-model.md](data-model.md) for complete data model.

### 12.1 Core Entities

```
Tenant ─┬─> User ─┬─> Role ─> Permission
        │         └─> AuditLog
        │
        ├─> Master Data
        │   ├─> Buyer ─┬─> Brand
        │   │           └─> BuyerCompliance
        │   ├─> Factory ─┬─> FactoryCapability
        │   │             └─> FactoryCompliance
        │   ├─> Vendor ─┬─> VendorCertification
        │   │            └─> VendorPerformance
        │   └─> Setup Data (Season, Category, Type, etc.)
        │
        ├─> Product Development
        │   └─> Style ─┬─> StyleVersion ─┬─> TechPack
        │               │                 ├─> BOM
        │               │                 └─> POM
        │               └─> FileOpening ─┬─> PurchaseOrder ─┬─> POItem
        │                               │                    ├─> T&A
        │                               │                    ├─> Costing
        │                               │                    └─> Shipment
        │                               └─> FileOpening
        │
        ├─> Commercial
        │   └─> LC ─┬─> LCItem
        │            └─> LCAmendment
        │
        └─> Operations
            ├─> GoodsReceipt
            ├─> ProductionPlan
            ├─> QualityInspection
            └─> Shipment ─┬─> PackingList
                           ├─> Invoice
                           └─> BillOfLading
```

---

## 13. API Recommendations

See [api-design.md](api-design.md) for complete API specifications.

### 13.1 API Standards

| Standard | Specification |
|----------|---------------|
| Protocol | REST (Phase 1), GraphQL (Phase 2) |
| Authentication | JWT + OAuth 2.0 |
| Versioning | URL-based (/api/v1/) |
| Pagination | Cursor-based |
| Rate Limiting | 1000 requests/minute |
| Response Format | JSON:API |

### 13.2 Core API Modules

| Module | Endpoints |
|--------|-----------|
| Auth | /api/v1/auth/* |
| Users | /api/v1/users/* |
| Orders | /api/v1/orders/* |
| T&A | /api/v1/ta/* |
| Commercial | /api/v1/commercial/* |
| Production | /api/v1/production/* |
| Quality | /api/v1/quality/* |
| Logistics | /api/v1/logistics/* |
| Finance | /api/v1/finance/* |

---

## 14. Screen Inventory

See [uiux-guidelines.md](uiux-guidelines.md) for complete screen specifications.

### 14.1 Screen Summary

| Module | Screens | Priority |
|--------|---------|----------|
| Dashboard | 6 | High |
| Orders | 8 | Critical |
| T&A | 4 | Critical |
| Commercial | 6 | High |
| Production | 5 | High |
| Quality | 5 | High |
| Logistics | 5 | High |
| Inventory | 4 | High |
| Reports | 10+ | High |
| Administration | 8 | High |

---

## 15. UI/UX Guidelines

See [uiux-guidelines.md](uiux-guidelines.md) for complete UI/UX specifications.

### 15.1 Design Principles

| Principle | Description |
|-----------|-------------|
| Clarity | Information hierarchy with clear visual cues |
| Efficiency | Minimize clicks, maximize productivity |
| Consistency | Unified design language across modules |
| Feedback | Immediate response to user actions |
| Accessibility | WCAG 2.1 AA compliance |

### 15.2 Design System

| Component | Specification |
|-----------|---------------|
| Typography | Inter (primary), system fonts (fallback) |
| Colors | Blue primary, neutral grays, semantic colors |
| Spacing | 4px grid system |
| Border Radius | 4px (small), 8px (medium), 12px (large) |
| Shadows | 3 levels (small, medium, large) |

---

## 16. Workflow Diagrams

See [workflow-diagrams.md](workflow-diagrams.md) for complete workflow diagrams.

### 16.1 Core Workflows

| Workflow | Description |
|----------|-------------|
| Order Lifecycle | From inquiry to delivery |
| T&A Process | Time and action planning |
| Costing Workflow | Cost calculation and approval |
| Procurement Workflow | Material sourcing and purchase |
| Commercial Workflow | LC and banking operations |
| Shipment Workflow | From booking to delivery |
| Production Workflow | Planning to completion |
| Approval Workflow | Multi-level approvals |

---

## 17. Reporting Requirements

### 17.1 Report Categories

| Category | Reports |
|----------|---------|
| Merchandising | Order summary, T&A status, style performance |
| Costing | Cost analysis, margin analysis, yield report |
| Production | Daily production, efficiency, DHU, capacity |
| Quality | Inspection summary, defect analysis, compliance |
| Shipment | Shipment status, container tracking, BL report |
| Commercial | LC utilization, exposure report, bank statement |
| Financial | P&L, balance sheet, cash flow, cost center |
| Executive | KPI dashboard, trend analysis, alerts |

---

## 18. Dashboard Specifications

See [dashboard-specs.md](dashboard-specs.md) for complete dashboard specifications.

### 18.1 Dashboard Summary

| Dashboard | Audience | Refresh Rate |
|-----------|----------|--------------|
| God Mode | MD/CEO | Real-time |
| Production | Operations | Hourly |
| Cost | Finance | Daily |
| Commercial | Commercial | Daily |
| Inventory | Warehouse | Hourly |
| Shipment | Logistics | Real-time |
| T&A Heatmap | Merchandising | Daily |
| Profitability | Executive | Daily |
| Factory Benchmark | Operations | Weekly |

---

## 19. Security Model

See [security-model.md](security-model.md) for complete security specifications.

### 19.1 Security Layers

```
┌─────────────────────────────────────────┐
│           Security Layers               │
├─────────────────────────────────────────┤
│ 1. Network Security (WAF, DDoS)        │
│ 2. Application Security (OWASP)        │
│ 3. Authentication (MFA, SSO)           │
│ 4. Authorization (RBAC)                │
│ 5. Data Security (Encryption)          │
│ 6. Audit (Logging, Monitoring)         │
└─────────────────────────────────────────┘
```

---

## 20. Integration Strategy

### 20.1 Phase 1 Integrations

| System | Type | Priority |
|--------|------|----------|
| Email (SMTP) | Notification | High |
| SMS Gateway | Alerts | Medium |
| File Storage (S3) | Documents | High |
| Payment Gateway | Financial | Medium |

### 20.2 Phase 2 Integrations

| System | Type | Priority |
|--------|------|----------|
| Banking APIs | LC/Payment | High |
| Customs System | Compliance | Medium |
| Shipping Lines | Tracking | Medium |
| ERP Systems | Data Sync | Low |

---

## 21. Future AI Roadmap

See [ai-roadmap.md](ai-roadmap.md) for complete AI specifications.

### 21.1 AI Capabilities

| Capability | Phase | Impact |
|------------|-------|--------|
| Predictive Costing | Phase 3 | Cost optimization |
| Production Forecasting | Phase 3 | Planning efficiency |
| Shipment Delay Prediction | Phase 3 | Proactive management |
| Vendor Risk Scoring | Phase 3 | Risk mitigation |
| Smart T&A Alerts | Phase 3 | Deadline management |
| AI Document Reader | Phase 4 | Automation |
| OCR for Tech Packs | Phase 4 | Data extraction |
| AI Copilot | Phase 5 | Productivity boost |

---

## 22. Development Roadmap

### 22.1 Technology Stack

| Layer | Technology | Status (v2.0) |
|-------|------------|--------------|
| Frontend | React.js + TypeScript | ✅ React 19 + Vite 8 + TypeScript 6 + Tailwind 4 |
| Backend | Django + DRF | ✅ Django 5.2 + DRF 3.15 |
| Database | PostgreSQL | ✅ Configured (dev uses SQLite; PG validation = Phase 1.3) |
| Cache | Redis | ✅ Configured (`RedisCache`) |
| Queue | Celery | ✅ Configured + tasks (`commercial`, `core`); beat producers = Phase 1.6 |
| Search | Elasticsearch | ❌ DRF `SearchFilter` used instead |
| Storage | AWS S3 | ❌ Local media storage |
| Hosting | AWS / Azure | ❌ Not deployed (Phase 1.1/1.2) |
| CI/CD | GitHub Actions | ⚠️ CI exists; CD = Phase 1.2 |
| Monitoring | Prometheus + Grafana | ❌ Django `monitoring` app + `/admin/health`; healthchecks = Phase 1.1 |

### 22.2 Development Phases

| Phase | Duration | Scope |
|-------|----------|-------|
| Phase 1 (MVP) | 6 months | Core modules |
| Phase 2 | 4 months | Advanced features |
| Phase 3 | 4 months | AI capabilities |
| Phase 4 | 3 months | Advanced AI |
| Phase 5 | 3 months | Enterprise features |

---

## 23. Release Plan

### 23.1 MVP Release (Phase 1)

| Feature | Status | Built (v2.0) |
|---------|--------|--------------|
| System Administration | Required | ✅ |
| Master Data Management | Required | ✅ |
| Order Management | Required | ✅ |
| T&A Management | Required | ✅ |
| Commercial & LC | Required | ✅ |
| Basic Production | Required | ✅ |
| Basic Quality | Required | ✅ |
| Basic Logistics | Required | ✅ |
| Basic Reports | Required | ✅ |
| Basic Dashboards | Required | ✅ |

### 23.2 Phase 2 Release

| Feature | Status | Built (v2.0) |
|---------|--------|--------------|
| Advanced Inventory | Required | ⚠️ Partial (stock-fabric allocation; GRN/WMS deferred) |
| Procurement Module | Required | ⚠️ Partial (fabric/trim procurement built) |
| Finance Module | Required | ❌ Deferred |
| Advanced Reports | Required | ⚠️ ReportBuilder shipped; KPI templates = Phase 1.5 |
| Advanced Dashboards | Required | ✅ Order Manager, Production, Quality, Shipment, T&A |
| Mobile Optimization | Required | ⚠️ Responsive UI; offline = deferred |

### 23.3 Phase 3+ Enterprise Release

| Feature | Status | Built (v2.0) |
|---------|--------|--------------|
| AI Capabilities | Planned | ❌ Deferred (per `ai-roadmap.md`) |
| Advanced Analytics | Planned | ❌ Deferred |
| Third-party Integrations | Planned | ⚠️ SMTP config only; no live integrations |
| Multi-language Support | Planned | ❌ Deferred |
| Advanced Compliance | Planned | ⚠️ Compliance audits shipped; advanced = deferred |

---

## 24. Risks & Assumptions

### 24.1 Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| User adoption resistance | High | High | Training, change management |
| Data migration complexity | Medium | High | Phased migration, validation |
| Integration challenges | Medium | Medium | Standard APIs, fallback options |
| Performance issues | Low | High | Load testing, optimization |
| Security breaches | Low | Critical | Security audits, monitoring |
| Scope creep | High | Medium | Strict change control |

### 24.2 Assumptions

| Assumption | Validity |
|------------|----------|
| Users have basic computer literacy | Must be validated |
| Internet connectivity is reliable | Must be validated |
| Buyers will adopt digital processes | Must be validated |
| Factories have basic IT infrastructure | Must be validated |
| Regulatory requirements are stable | Must be monitored |

---

## 25. Glossary

See [glossary.md](glossary.md) for complete glossary.

| Term | Definition |
|------|------------|
| BH | Buying House |
| RMG | Ready-Made Garment |
| LC | Letter of Credit |
| T&A | Time and Action |
| B2B LC | Back-to-Back Letter of Credit |
| PI | Proforma Invoice |
| BOM | Bill of Materials |
| POM | Point of Measurement |
| AQL | Acceptable Quality Level |
| DHU | Defective Hourly Unit |
| FOH | Factory Own House |
| CMT | Cut, Make, Trim |
| FOB | Free on Board |
| CM | Cost of Manufacturing |
| TD | Trading Department |

---

## Appendices

### Appendix A: Document References

| Document | Description |
|----------|-------------|
| [business-rules.md](business-rules.md) | Complete business rules |
| [data-model.md](data-model.md) | Database schema |
| [api-design.md](api-design.md) | API specifications |
| [uiux-guidelines.md](uiux-guidelines.md) | UI/UX design system |
| [security-model.md](security-model.md) | Security architecture |
| [workflow-diagrams.md](workflow-diagrams.md) | Process workflows |
| [module-specs.md](module-specs.md) | Detailed module specs |
| [ai-roadmap.md](ai-roadmap.md) | AI capabilities |
| [glossary.md](glossary.md) | Terminology |

### Appendix B: Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Director | | | |
| Business Analyst | | | |
| Solution Architect | | | |
| QA Lead | | | |
| Project Manager | | | |

---

*This document is confidential and intended for authorized recipients only.*
