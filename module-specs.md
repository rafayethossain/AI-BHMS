# Module Specifications
# BHMS - Buying House Management System

---

## Table of Contents

1. [System Administration](#1-system-administration)
2. [Master Data Management](#2-master-data-management)
3. [Order Management](#3-order-management)
4. [T&A Management](#4-ta-management)
5. [Costing Module](#5-costing-module)
6. [Commercial Module](#6-commercial-module)
7. [Production Module](#7-production-module)
8. [Quality Module](#8-quality-module)
9. [Logistics Module](#9-logistics-module)
10. [Inventory Module](#10-inventory-module)
11. [Finance Module](#11-finance-module)

---

## 1. System Administration

### 1.1 Authentication Module

| Attribute | Details |
|-----------|---------|
| **Module ID** | SYS-AUTH |
| **Purpose** | User authentication and session management |
| **Actors** | All users |
| **Priority** | Critical |

**Features:**
- Email/password login
- Multi-factor authentication (MFA)
- Single Sign-On (SSO) support
- Password reset via email
- Session management
- Login audit trail

**Business Rules:**
- Password must be 12+ characters
- Account locks after 5 failed attempts
- Sessions timeout after 30 minutes inactivity
- MFA required for admin users

### 1.2 User Management

| Attribute | Details |
|-----------|---------|
| **Module ID** | SYS-USER |
| **Purpose** | User CRUD and role assignment |
| **Actors** | Tenant Admin |
| **Priority** | Critical |

**Features:**
- User creation with approval
- Bulk user import (CSV)
- User profile management
- Role assignment
- User deactivation
- Activity logging

**Screens:**
| Screen | Description |
|--------|-------------|
| User List | Searchable, filterable user table |
| User Detail | Complete user profile |
| User Form | Create/edit user |
| Bulk Import | CSV upload wizard |

### 1.3 Role & Permission Management

| Attribute | Details |
|-----------|---------|
| **Module ID** | SYS-RBAC |
| **Purpose** | Role and permission management |
| **Actors** | Tenant Admin |
| **Priority** | Critical |

**Features:**
- Predefined role templates
- Custom role creation
- Module-level permissions
- Field-level permissions
- Role inheritance

**Permission Types:**
| Permission | Description |
|------------|-------------|
| View | Read access |
| Create | Create new records |
| Update | Modify existing records |
| Delete | Remove records |
| Approve | Approve workflows |
| Export | Export data |
| Import | Import data |
| Admin | Administrative actions |

---

## 2. Setup Data & Master Data Management

### 2.1 System Setup

| Attribute | Details |
|-----------|---------|
| **Module ID** | SYS-SETUP |
| **Purpose** | Configure system-wide settings |
| **Actors** | Tenant Admin |
| **Priority** | Critical |

**Tenant Information:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Company Name | Text | Yes | Legal name |
| Address | Text | Yes | Address |
| Phone | Phone | Yes | Contact |
| Email | Email | Yes | Contact |
| Logo | Image | No | Company logo |
| Timezone | Dropdown | Yes | Timezone |

**Office & Locations:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Office Code | Text | Yes | Unique code |
| Name | Text | Yes | Office name |
| Address | Text | Yes | Address |
| City | Text | Yes | City |
| Country | Dropdown | Yes | Country |
| Type | Dropdown | Yes | Head Office/Branch |
| Status | Dropdown | Yes | Active/Inactive |

**Audit & Access Log:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Timestamp | DateTime | Auto | When action occurred |
| User | Reference | Auto | Who performed action |
| Action | Text | Yes | What was done |
| Entity Type | Text | Yes | Which entity |
| Entity ID | UUID | Yes | Entity identifier |
| IP Address | Text | Auto | Client IP |
| User Agent | Text | Auto | Browser info |

### 2.2 Common Setup (Master Data)

| Attribute | Details |
|-----------|---------|
| **Module ID** | SYS-COMMON |
| **Purpose** | Manage common lookup data |
| **Actors** | Tenant Admin |
| **Priority** | Critical |

**Season Master:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Code | Text | Yes | Unique code |
| Name | Text | Yes | Season name |
| Start Date | Date | No | Season start |
| End Date | Date | No | Season end |
| Status | Dropdown | Yes | Active/Inactive |

**Product Category Master:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Code | Text | Yes | Unique code |
| Name | Text | Yes | Category name |
| Parent | Dropdown | No | Parent category |
| Status | Dropdown | Yes | Active/Inactive |

**Product Type Master:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Code | Text | Yes | Unique code |
| Name | Text | Yes | Type name |
| Category | Dropdown | Yes | Product category |
| Status | Dropdown | Yes | Active/Inactive |

**Product Department Master:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Code | Text | Yes | Unique code |
| Name | Text | Yes | Department name |
| Status | Dropdown | Yes | Active/Inactive |

**Compliance Document Type Master:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Code | Text | Yes | Unique code |
| Name | Text | Yes | Document type |
| Description | Text | No | Description |
| Validity Period | Number | No | Days |
| Status | Dropdown | Yes | Active/Inactive |

**Delivery Mode Master:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Code | Text | Yes | FOB, CIF, CM, etc. |
| Name | Text | Yes | Full name |
| Description | Text | No | Description |
| Status | Dropdown | Yes | Active/Inactive |

**Unit of Measurement (UOM) Master:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Code | Text | Yes | PCS, YDS, MTR, etc. |
| Name | Text | Yes | Full name |
| Status | Dropdown | Yes | Active/Inactive |

**Currency Master:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Code | Text | Yes | USD, BDT, EUR, etc. |
| Name | Text | Yes | Full name |
| Symbol | Text | Yes | $, €, etc. |
| Exchange Rate | Number | Yes | To base currency |
| Status | Dropdown | Yes | Active/Inactive |

**Department Master:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Code | Text | Yes | Unique code |
| Name | Text | Yes | Department name |
| Status | Dropdown | Yes | Active/Inactive |

**Designation Master:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Code | Text | Yes | Unique code |
| Name | Text | Yes | Designation name |
| Status | Dropdown | Yes | Active/Inactive |

**Payment Terms Master:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Code | Text | Yes | Unique code |
| Name | Text | Yes | Term name |
| Days | Number | Yes | Payment days |
| Description | Text | No | Description |
| Status | Dropdown | Yes | Active/Inactive |

**Country Master:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Code | Text | Yes | ISO code |
| Name | Text | Yes | Country name |
| Currency | Dropdown | Yes | Default currency |
| Status | Dropdown | Yes | Active/Inactive |

**Color Code Master:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Code | Text | Yes | Unique code |
| Name | Text | Yes | Color name |
| Hex Code | Text | Yes | #RRGGBB |
| Status | Dropdown | Yes | Active/Inactive |

### 2.3 Buyer Master

| Attribute | Details |
|-----------|---------|
| **Module ID** | MDM-BUYER |
| **Purpose** | Manage buyer information |
| **Actors** | Merchandiser, Admin |
| **Priority** | Critical |

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Code | Text | Yes | Unique buyer code |
| Name | Text | Yes | Buyer name |
| Contact Person | Text | No | Primary contact |
| Email | Email | No | Contact email |
| Phone | Phone | No | Contact phone |
| Address | Text | No | Address |
| Country | Dropdown | Yes | Country |
| Currency | Dropdown | Yes | Default currency |
| Payment Terms | Dropdown | Yes | Payment terms |
| Credit Limit | Number | No | Credit limit |
| Status | Dropdown | Yes | Active/Inactive |

**Validation Rules:**
- Code must be unique
- Email must be valid format
- Credit limit must be positive

### 2.2 Factory Master

| Attribute | Details |
|-----------|---------|
| **Module ID** | MDM-FACTORY |
| **Purpose** | Manage factory information |
| **Actors** | Merchandiser, Admin |
| **Priority** | Critical |

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Code | Text | Yes | Unique factory code |
| Name | Text | Yes | Factory name |
| Contact Person | Text | No | Primary contact |
| Email | Email | No | Contact email |
| Phone | Phone | No | Contact phone |
| Address | Text | No | Address |
| City | Text | No | City |
| Country | Dropdown | Yes | Country |
| Capacity | Number | No | Production capacity |
| Capacity Unit | Dropdown | No | Pieces/Dozens/Month |
| Factory Type | Dropdown | Yes | Knitting/Woven/Denim |
| Status | Dropdown | Yes | Active/Inactive |

### 2.3 Vendor Master

| Attribute | Details |
|-----------|---------|
| **Module ID** | MDM-VENDOR |
| **Purpose** | Manage vendor information |
| **Actors** | Procurement, Admin |
| **Priority** | High |

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Code | Text | Yes | Unique vendor code |
| Name | Text | Yes | Vendor name |
| Contact Person | Text | No | Primary contact |
| Email | Email | No | Contact email |
| Phone | Phone | No | Contact phone |
| Address | Text | No | Address |
| Product Categories | Multi-select | Yes | Categories supplied |
| Payment Terms | Dropdown | Yes | Payment terms |
| Lead Time | Number | No | Days |
| Rating | Rating | No | Performance rating |
| Status | Dropdown | Yes | Active/Inactive |

---

## 3. Order Management (Style → File Opening → PO)

### 3.1 Style Module

| Attribute | Details |
|-----------|---------|
| **Module ID** | MER-STYLE |
| **Purpose** | Manage style master and versions |
| **Actors** | Merchandiser, Manager |
| **Priority** | Critical |

**Style Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Style Number | Text | Yes | Unique style number |
| Name | Text | Yes | Style name |
| Description | Text | No | Description |
| Buyer | Dropdown | Yes | Buyer |
| Brand | Dropdown | No | Brand |
| Category | Dropdown | Yes | Product category |
| Type | Dropdown | Yes | Product type |
| Department | Dropdown | No | Product department |
| Season | Dropdown | Yes | Season |
| Status | Dropdown | Yes | Status |
| Current Version | Number | Auto | Latest version |

**Style Version Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Version Number | Number | Auto | V1, V2, V3... |
| Status | Dropdown | Yes | Status |
| Revision Notes | Text | No | Change notes |

### 3.2 File Opening Module

| Attribute | Details |
|-----------|---------|
| **Module ID** | MER-FILE |
| **Purpose** | Manage file openings linked to style versions |
| **Actors** | Merchandiser, Manager |
| **Priority** | Critical |

**File Opening Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| File Number | Auto | Yes | Auto-generated |
| Style | Dropdown | Yes | Style |
| Style Version | Dropdown | Yes | Version |
| Buyer | Dropdown | Yes | Buyer |
| Brand | Dropdown | No | Brand |
| Factory | Dropdown | Yes | Factory |
| File Date | Date | Yes | Opening date |
| Status | Dropdown | Yes | Status |

### 3.3 Purchase Order Module

| Attribute | Details |
|-----------|---------|
| **Module ID** | MER-PO |
| **Purpose** | Manage purchase orders per file opening |
| **Actors** | Merchandiser, Manager |
| **Priority** | Critical |

**PO Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| PO Number | Auto | Yes | Auto-generated |
| File Opening | Dropdown | Yes | File opening |
| Buyer | Dropdown | Yes | Buyer |
| Brand | Dropdown | No | Brand |
| Factory | Dropdown | Yes | Factory |
| PO Date | Date | Yes | PO date |
| Delivery Date | Date | Yes | Delivery date |
| Destination Country | Dropdown | Yes | Destination |
| Destination Port | Text | No | Port of discharge |
| Quantity | Number | Yes | Total quantity |
| Unit Price | Currency | Yes | Price per unit |
| Total Value | Currency | Auto | Calculated |
| Currency | Dropdown | Yes | Currency |
| Payment Terms | Dropdown | Yes | Payment terms |
| Delivery Mode | Dropdown | Yes | FOB/CIF/CM |
| Status | Dropdown | Yes | Status |

**PO Statuses:**
| Status | Description | Allowed Transitions |
|--------|-------------|---------------------|
| Draft | Initial state | Open, Cancelled |
| Open | Active PO | Confirmed, Cancelled |
| Confirmed | Confirmed | In Production |
| In Production | Being manufactured | Quality Check |
| Quality Check | Under inspection | Ready, Rework |
| Ready | Ready for shipment | Shipped |
| Shipped | Dispatched | Delivered |
| Delivered | Received by buyer | Closed |
| Cancelled | Cancelled | None |

**Screens:**
| Screen | Description |
|--------|-------------|
| Style List | Filterable style table |
| Style Detail | Complete style view with versions |
| File Opening List | File openings by style |
| PO List | POs by file opening |
| PO Detail | Complete PO view |
| PO Form | Create/edit PO |
| PO Import | Bulk PO import |

### 3.4 Purchase Order Items

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Color | Dropdown | Yes | Color |
| Size | Text | No | Size |
| Quantity | Number | Yes | Quantity |
| Unit Price | Currency | Yes | Price |

---

## 4. T&A Management (Per PO)

### 4.1 T&A Module

| Attribute | Details |
|-----------|---------|
| **Module ID** | MER-TA |
| **Purpose** | Time and action planning per PO |
| **Actors** | Merchandiser, Manager |
| **Priority** | Critical |

**T&A Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Purchase Order | Reference | Yes | Related PO |
| Status | Dropdown | Yes | Active/Completed |
| Delivery Date | Date | Yes | Final delivery |
| Critical Path | JSON | Auto | Calculated |

**Milestone Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Name | Text | Yes | Milestone name |
| Description | Text | No | Description |
| Planned Date | Date | Yes | Target date |
| Actual Date | Date | No | Completion date |
| Status | Dropdown | Yes | Status |
| Assigned To | User | Yes | Responsible person |
| Is Critical | Checkbox | No | Critical path |

**Standard Milestones:**
1. Order Confirmed
2. Pattern Making
3. Fabric Sourcing
4. Lab Dip Submission
5. Lab Dip Approved
6. Sample Development
7. Sample Approved
8. Bulk Fabric Order
9. Fabric Received
10. Trim Sourcing
11. Production Planning
12. Cutting Start
13. Sewing Start
14. Finishing Start
15. Quality Inspection
16. Packing Complete
17. Shipment Ready

---

## 5. Costing Module (Per PO)

### 5.1 Costing Module

| Attribute | Details |
|-----------|---------|
| **Module ID** | MER-COST |
| **Purpose** | PO costing management |
| **Actors** | Merchandiser, Commercial |
| **Priority** | High |

**Costing Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Purchase Order | Reference | Yes | Related PO |
| Version | Number | Auto | Version number |
| Status | Dropdown | Yes | Status |
| Target Price | Currency | No | Buyer target |
| Fabric Cost | Currency | Auto | Calculated |
| Trim Cost | Currency | Auto | Calculated |
| CM Cost | Currency | Yes | Manufacturing |
| Overhead Cost | Currency | Auto | Allocated |
| Total Cost | Currency | Auto | Sum |
| Margin | Percentage | Auto | Profit margin |

**Costing Workflow:**
1. Create new version
2. Add BOM items
3. Calculate costs
4. Compare with target
5. Submit for approval
6. Manager approval
7. Director approval (if needed)
8. Finalize version

---

### 5.2 Design Costing (Style-level single-piece cost)

Mirrors the PO-level Costing but is keyed to a **Style** (not a PO): one single-piece garment cost
per Style that serves as the source of truth for the "tech pack import → single-piece costing →
PO costing" flow. Approval lifecycle (`approve` / `reject` / `set_live`) gates whether it can be
pushed to an order.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Style | Reference | Yes | Related style |
| Version | Number | Auto | Version number (unique per style) |
| Status | Dropdown | Yes | Draft / Approved / Rejected / Live |
| Total Cost | Currency | Auto | Sum of cost lines (recomputed in `save()`) |
| Cost Lines | Table | Yes | Fabric / Trims / Labels / Making / Overheads categories |

**Per-Piece Price Ladder (ME-016):** the design costing also carries a selling-price decomposition
recomputed on save, mirroring the reference cost-report layout:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Selling Price | Currency | No | Proposed per-piece selling price |
| Customer Discount % | Percent | No | Discount applied to the **selling price** |
| Origin Overhead % | Percent | No | Origin-side overhead share of total cost |
| UK Overhead % | Percent | No | UK-side overhead share of total cost |
| Exchange Rate | Number | No | Rate used to derive the landed cost |
| Discount Amount | Currency | Auto | Selling × Discount% ÷ 100 |
| Overhead Amount | Currency | Auto | Total Cost × (Origin% + UK%) ÷ 100 |
| Base Cost | Currency | Auto | Total Cost + Discount + Overhead |
| Margin | Currency | Auto | Selling Price − Base Cost |
| Landed Cost | Currency | Auto | Total Cost × Exchange Rate |

**Ladder formulas (locked by tests):**
```
discount_amount  = selling_price × customer_discount_pct / 100
overhead_amount  = total_cost × (origin_overhead_pct + uk_overhead_pct) / 100
base_cost        = total_cost + discount_amount + overhead_amount
margin_amount    = selling_price − base_cost
landed_cost      = total_cost × exchange_rate
```

**Prepare PO Costing:** the `prepare_po_costing` action snapshots the ladder fields
(`customer_discount_pct`, `origin_overhead_pct`, `uk_overhead_pct`, `selling_price`,
`exchange_rate`) onto the derived order-level `Costing` and computes PO-level totals
(per-piece ladder × PO quantity): `po_total_cost`, `po_base_cost`, `po_margin_amount`
and `po_quantity`. If no ladder is set, only `total_cost` is carried.

---

## 6. Commercial Module

### 6.1 LC Management

| Attribute | Details |
|-----------|---------|
| **Module ID** | COM-LC |
| **Purpose** | Letter of Credit management |
| **Actors** | Commercial Manager |
| **Priority** | Critical |

**LC Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| LC Number | Text | Yes | LC reference |
| LC Type | Dropdown | Yes | Master/B2B |
| Buyer | Dropdown | Yes | Buyer |
| Order | Reference | No | Related order |
| Parent LC | Reference | No | For B2B |
| Bank | Dropdown | Yes | Issuing bank |
| Amount | Currency | Yes | LC amount |
| Currency | Dropdown | Yes | Currency |
| Issued Date | Date | No | Issue date |
| Expiry Date | Date | Yes | Expiry |
| Status | Dropdown | Yes | Status |
| Utilized Amount | Currency | Auto | Used amount |
| Balance | Currency | Auto | Remaining |

**LC Statuses:**
| Status | Description |
|--------|-------------|
| Draft | Initial state |
| Sent to Bank | Submitted |
| Received | LC received |
| Accepted | Bank accepted |
| Amended | Amendment processed |
| Utilized | Fully utilized |
| Expired | Past expiry |
| Cancelled | Cancelled |

---

## 7. Production Module

### 7.1 Production Planning

| Attribute | Details |
|-----------|---------|
| **Module ID** | PRO-PLAN |
| **Purpose** | Production planning |
| **Actors** | Production Manager |
| **Priority** | High |

**Plan Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Order | Reference | Yes | Related order |
| Factory | Dropdown | Yes | Factory |
| Plan Date | Date | Yes | Planning date |
| Start Date | Date | Yes | Production start |
| End Date | Date | Yes | Production end |
| Quantity | Number | Yes | Planned quantity |
| Status | Dropdown | Yes | Status |

### 7.2 Daily Production

| Attribute | Details |
|-----------|---------|
| **Module ID** | PRO-DAILY |
| **Purpose** | Daily production reporting |
| **Actors** | Factory User |
| **Priority** | High |

**Daily Report Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Factory | Dropdown | Yes | Factory |
| Order | Reference | Yes | Order |
| Date | Date | Yes | Report date |
| Line Number | Number | Yes | Production line |
| Target | Number | Yes | Target quantity |
| Actual | Number | Yes | Actual quantity |
| Passed | Number | Yes | Passed quantity |
| Rejected | Number | Auto | Rejected quantity |
| Efficiency | Percentage | Auto | Calculated |
| DHU | Percentage | Auto | Calculated |
| Manpower | Number | Yes | Workers |
| Working Hours | Number | Yes | Hours |

---

## 8. Quality Module

### 8.1 Inspection Module

| Attribute | Details |
|-----------|---------|
| **Module ID** | QAI-INSP |
| **Purpose** | Quality inspection management |
| **Actors** | QA Manager |
| **Priority** | High |

**Inspection Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Order | Reference | Yes | Order |
| Factory | Dropdown | Yes | Factory |
| Type | Dropdown | Yes | Inline/Final |
| Date | Date | Yes | Inspection date |
| Inspector | User | Yes | Inspector |
| AQL Level | Number | Yes | AQL standard |
| Sample Size | Number | Auto | Sample count |
| Passed | Number | Yes | Passed quantity |
| Rejected | Number | Yes | Failed quantity |
| Status | Dropdown | Yes | Status |

**Defect Types:**
| Category | Examples |
|----------|----------|
| Critical | Safety hazard, wrong size |
| Major | Open seam, stain, hole |
| Minor | Loose thread, label issue |

---

## 9. Logistics Module

### 9.1 Shipment Module

| Attribute | Details |
|-----------|---------|
| **Module ID** | LOG-SHIP |
| **Purpose** | Shipment management |
| **Actors** | Shipping Manager |
| **Priority** | High |

**Shipment Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Shipment Number | Auto | Yes | Auto-generated |
| Order | Reference | Yes | Order |
| LC | Reference | No | LC |
| Freight Forwarder | Dropdown | Yes | Forwarder |
| Shipping Line | Text | No | Line |
| Vessel | Text | No | Vessel name |
| Container Number | Text | No | Container |
| Container Size | Dropdown | No | 20/40/45 HC |
| Port of Loading | Text | Yes | POL |
| Port of Discharge | Text | Yes | POD |
| ETD | Date | Yes | Estimated departure |
| ETA | Date | Yes | Estimated arrival |
| Status | Dropdown | Yes | Status |

**Shipment Statuses:**
| Status | Description |
|--------|-------------|
| Booked | Space reserved |
| Document Pending | Awaiting docs |
| Document Ready | Docs complete |
| Container Loaded | Loaded |
| Gate In | Port received |
| Departed | Vessel sailed |
| In Transit | On the way |
| Arrived | At destination |
| Cleared | Customs cleared |
| Delivered | Final delivery |

---

## 10. Inventory Module

### 10.1 Stock Management

| Attribute | Details |
|-----------|---------|
| **Module ID** | INV-STOCK |
| **Purpose** | Inventory management |
| **Actors** | Warehouse Manager |
| **Priority** | High |

**Stock Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Item | Reference | Yes | Material |
| Warehouse | Dropdown | Yes | Location |
| Quantity | Number | Auto | Current stock |
| Allocated | Number | Auto | Allocated qty |
| Available | Number | Auto | Available qty |
| Unit | Dropdown | Yes | UOM |

**Stock Movements:**
| Movement Type | Description |
|---------------|-------------|
| Goods Receive | Stock in |
| Goods Issue | Stock out |
| Transfer | Between warehouses |
| Return | From production |
| Adjustment | Manual correction |

---

## 11. Finance Module

### 11.1 Chart of Accounts

| Attribute | Details |
|-----------|---------|
| **Module ID** | FIN-COA |
| **Purpose** | Account management |
| **Actors** | Finance Manager |
| **Priority** | Medium |

**Account Types:**
| Type | Description |
|------|-------------|
| Asset | Cash, Bank, Receivable |
| Liability | Payable, Loan |
| Equity | Capital, Retained Earnings |
| Revenue | Sales, Other Income |
| Expense | Cost, Overhead |

### 11.2 Voucher Management

| Attribute | Details |
|-----------|---------|
| **Module ID** | FIN-VOUCHER |
| **Purpose** | Transaction recording |
| **Actors** | Accountant |
| **Priority** | Medium |

**Voucher Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Voucher Number | Auto | Yes | Auto-generated |
| Type | Dropdown | Yes | Type |
| Date | Date | Yes | Transaction date |
| Reference Type | Text | No | Related entity |
| Reference ID | UUID | No | Entity ID |
| Debit | Currency | Yes | Debit amount |
| Credit | Currency | Yes | Credit amount |
| Status | Dropdown | Yes | Status |

---

*This document should be reviewed by Module Leads before implementation.*
