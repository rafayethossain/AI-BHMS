# Data Model
# BHMS - Buying House Management System

> **Status marker (2026-09-13):** this document was reconciled against the actual code
> (`backend/apps/*/models.py`, introspected from the live dev DB). Detailed sections §2–§10
> describe **implemented** models only. Entities that exist only in the target ER diagram
> (§1) but have **no model yet** are collected in §11 (Planned / target-only). The diagram in
> §1 remains the target view.

---

## Table of Contents

1. [Entity Relationship Overview](#1-entity-relationship-overview)
2. [Core Entities](#2-core-entities)
3. [Setup / Master Data Entities](#3-setup--master-data-entities)
4. [Merchandising Entities](#4-merchandising-entities)
5. [Fabric Entities](#5-fabric-entities)
6. [Commercial Entities](#6-commercial-entities)
7. [Production Entities](#7-production-entities)
8. [Quality Entities](#8-quality-entities)
9. [Logistics Entities](#9-logistics-entities)
10. [Monitoring, Reporting & Help Entities](#10-monitoring-reporting--help-entities)
11. [Planned (Target-Only) Entities](#11-planned-target-only-entities)
12. [Indexing Strategy](#12-indexing-strategy)

---

## 1. Entity Relationship Overview

The diagram below is the **target/aspirational ER view** of the product. Not every node
exists in code yet — the status legend under the diagram marks each entity as
**implemented** (model exists in `backend/apps`) or **planned** (target-only, no model
yet). See §2–§10 for the implemented models and §11 for the planned ones.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            BHMS Entity Relationships                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Tenant ──────────────────────────────────────────────────────────────┐    │
│      │                                                                 │    │
│      ├─> User ──> Role ──> Permission                                 │    │
│      │                                                                 │    │
│      ├─> Buyer ──┬──> Brand                                           │    │
│      │           └──> BuyerCompliance                                 │    │
│      │                                                                 │    │
│      ├─> Factory ──┬──> FactoryCapability                             │    │
│      │             └──> FactoryCompliance                             │    │
│      │                                                                 │    │
│      ├─> Vendor ──┬──> VendorCertification                           │    │
│      │            └──> VendorPerformance                              │    │
│      │                                                                 │    │
│      ├─> Style/Design ──┬──> TechPack ──> TechPackRevision            │    │
│      │                  ├──> Material Breakdown                       │    │
│      │                  ├──> Fit Specification                        │    │
│      │                  ├──> Sketch Annotation                        │    │
│      │                  ├──> Job Request                              │    │
│      │                  └──> Style Costing                            │    │
│      │                                                                 │    │
│      ├─> Order ──┬──> OrderItem                                      │    │
│      │           ├──> Costing ──> CostingItem                        │    │
│      │           ├──> TA ──> TAMilestone                             │    │
│      │           └──> Shipment ──┬──> PackingList                    │    │
│      │                          ├──> Invoice                         │    │
│      │                          └──> BillOfLading                    │    │
│      │                                                                 │    │
│      ├─> PurchaseOrder ──┬──> POItem (Fabric/Materials/Access.)      │    │
│      │                   └──> GoodsReceipt ──> GoodsReceiptItem      │    │
│      │                                                                 │    │
│      ├─> LC ──┬──> LCItem                                            │    │
│      │        └──> LCAmendment                                       │    │
│      │                                                                 │    │
│      ├─> Inventory ──┬──> StockMovement                              │    │
│      │               └──> VirtualStock                               │    │
│      │                                                                 │    │
│      ├─> Production ──┬──> ProductionPlan                            │    │
│      │                ├──> DailyLineProduction                       │    │
│      │                └──> Daily Line Quality ──> Batch or AQL Audit │    │
│      │                                                                 │    │
│      └─> Finance ──┬──> ChartOfAccounts                              │    │
│                    ├──> Voucher ──> VoucherItem                      │    │
│                    └──> JournalEntry                                 │    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Implemented vs planned legend

| Diagram entity | Status | Implementation (app.model, populated as of 2026-09-13) |
|----------------|--------|-------------------------------------------------------|
| Tenant | ✅ implemented | `tenants.tenant` |
| Office | ✅ implemented | `tenants.office` |
| User | ✅ implemented | `users.user` (roles via `users.userrole`; MFA via `authentication.mfabackupcode` / `authentication.mfasetuplog`) |
| Role / Permission | ✅ implemented | `users.role`, `users.permission`, `users.rolepermission` |
| Audit log | ✅ implemented | `users.auditlog` (auth change-audit) + `monitoring.auditlog` (entity audit) |
| Buyer / Brand | ✅ implemented | `setup.buyer`, `setup.brand` |
| BuyerCompliance | 🟡 planned | no model yet; `setup.compliancedocumenttype` is only the document-type list |
| Factory | ✅ implemented | `setup.factory` |
| FactoryCapability / FactoryCompliance | 🟡 planned | no models yet |
| Vendor | ✅ implemented | `setup.vendor` |
| VendorCertification / VendorPerformance | 🟡 planned | no models yet |
| Style / Design | ✅ implemented | `merchandising.style`, `merchandising.styleversion`, `merchandising.designimage` |
| TechPack | ✅ implemented | `merchandising.styletechpack` (PDF/Excel upload + extraction) |
| TechPackRevision | 🟡 planned | no dedicated revision model; style versioning is `styleversion` |
| Material Breakdown | ✅ implemented | `merchandising.bom` → `merchandising.bomitem` (+ `merchandising.styleitem`) |
| Fit Specification | ✅ implemented | `merchandising.fitspecification` + `merchandising.fitimage` (design-level); `merchandising.fitspec` (PO-level) |
| Sketch Annotation | ✅ implemented | `merchandising.designsheet.sketch_annotations` + `designimage` |
| Job Request | ✅ implemented | `merchandising.jobrequest` (PO-level), `merchandising.designjobrequest` (design-level) |
| Style Costing | ✅ implemented | `merchandising.designcosting` → `merchandising.designcostingline` |
| Order / OrderItem | 🔶 mapped | no `Order` table; the commercial order = `merchandising.purchaseorder` → `purchaseorderitem` |
| Costing / CostingItem | ✅ implemented | `merchandising.costing` → `costingline` (PO-level) |
| TA / TAMilestone | ✅ implemented | `merchandising.ta` → `merchandising.tamilestone` |
| Shipment | ✅ implemented | `logistics.shipment` (+ `bookingscheduleitem`, `docket`) |
| PackingList / Invoice / BillOfLading | 🟡 partial | no dedicated models; `logistics.shippingdocument` stores typed docs (document_type), invoicing workflow via `commercial.proformainvoice` / `invoiceapproval` / `debitnote` |
| PurchaseOrder | ✅ implemented | `merchandising.purchaseorder` + `poamendment` |
| POItem (booking) | ✅ implemented | `merchandising.purchaseorderitem`; fabric booking = `fabric.fabricbooking` / `fabric.fabricorder`; materials/accessories tracked via `bomitem` (ordered/delivered/eta) |
| GoodsReceipt → GoodsReceiptItem | 🟡 planned | no models yet; delivery quantities land on `bomitem.delivered_qty`, `fabricorder.actual_arrival_date` |
| LC / LCAmendment | ✅ implemented | `commercial.lc`, `commercial.lcamendment` |
| LCItem | 🟡 planned | no model yet; LC links to PO and tracks amount / utilized_amount directly |
| Inventory / StockMovement / VirtualStock | 🟡 planned | no inventory app; stock-fabric handled via `merchandising.fileopening` (`is_stock_fabric`) + `merchandising.stockfabricallocation` |
| ProductionPlan | ✅ implemented | `production.productionplan` |
| DailyLineProduction | ✅ implemented | `production.dailyproduction` (per-line via `line_number`) |
| Daily Line Quality → Batch or AQL Audit | 🔶 partial | AQL = `quality.inspection` + `inspectionitem`; `quality.correctiveaction`, `goldseal`, `complianceaudit` exist; no batch-quality model |
| Finance (ChartOfAccounts / Voucher / VoucherItem / JournalEntry) | 🟡 planned | no finance app or models yet (see §11) |

**Reading the diagram:** branches that point to planned nodes (BuyerCompliance,
FactoryCompliance, GoodsReceipt, LCItem, Inventory/VirtualStock, Finance, and the
PackingList/Invoice/BillOfLading trio) are target-only today — the surrounding
workflows exist but the leaf models do not.

---

## 2. Core Entities

All domain tables derive from `core.TimeStampedModel` (adds `created_at`, `updated_at`,
`is_active`, `created_by`) and, unless noted, from `core.TenantModel` (adds `tenant` FK).
Primary keys are UUIDs.

### 2.1 Tenant — `tenants.tenant`

| Field | Type | Notes |
|-------|------|-------|
| name, slug, schema_name, legal_name | string | tenant identity; slug unique |
| address, phone, email, logo | string / file | corporate contact |
| timezone, currency, status, plan | string | plan: starter/…; status: active/… |
| is_active | bool | soft-deactivate a tenant |

Children: `Office`, all `User`s, and every tenant-scoped domain model.

### 2.2 Office — `tenants.office`

FK: `tenant`. Fields: `code`, `name`, `address`, `city`, `country`, `office_type`,
`phone`, `email`, `status`. HQ/regional/warehouse offices used for reporting splits.

### 2.3 User — `users.user`

FK: `tenant`, `department` (setup), `created_by`. Standard Django `AbstractUser`
(`username`, `password`, `email`, `first/last_name`, `is_staff`, `is_superuser`) plus
`phone`, `designation`, `mfa_enabled`, `mfa_secret`, `status`, `last_login_ip`.

Roles are many-to-many through `UserRole(user, role, created_by)`. Password history in
`users.passwordhistory(user, password_hash)` (prevents password reuse). MFA state in
`authentication.mfabackupcode(user)` + `authentication.mfasetuplog(user)`.

### 2.4 Role & Permission — `users.role`, `users.permission`, `users.rolepermission`

| Model | Fields | Purpose |
|-------|--------|---------|
| role | `tenant`, `name`, `description`, `is_system` | named role per tenant; unique (tenant, name) |
| permission | `module`, `action`, `description` | capability catalog (module×action), global |
| userrole | `user`, `role`, `created_by` | grants a role to a user; unique (user, role) |
| rolepermission | `role`, `permission` | grants permissions to a role; unique (role, permission) |

### 2.5 Audit Log — `users.auditlog` + `monitoring.auditlog`

Two audit tables exist:

| Table | FK | Distinguishing fields | Purpose |
|-------|----|-----------------------|---------|
| `users.auditlog` | `tenant`, `user` | `entity_type`, `entity_id`, `old_values`, `new_values` (JSON) | change-audit of auth/user entities |
| `monitoring.auditlog` | `tenant`, `user` | `entity_type`, `entity_id`, `entity_name`, `action`, `description`, `old_value`, `new_value`, `ip_address`, `user_agent` | general entity change-audit consumed by monitoring screens |

### 2.6 Note & core bases — `core.note`

Generic tenant-scoped notes base class (`text`, `author`); subsystem-specific notes
specialise it, e.g. `merchandising.fileopeningnote` (FK `file_opening`, `text`, `author`).

---

## 3. Setup / Master Data Entities

Every table below is a `TenantModel` with `code`+`name` and `status`, unique per
`(tenant, code)`.

| Entity (`setup.*`) | FK | Notable fields |
|--------------------|----|----------------|
| season | — | code, name, start_date, end_date, status |
| productcategory | parent ↻ self | code, name, status (tree via parent) |
| producttype | category → productcategory | code, name, status |
| productdepartment | — | code, name, status |
| compliancedocumenttype | — | code, name, description, validity_days, status |
| deliverymode | — | code, name, description, status (e.g. FOB/CIF/CM) |
| uom | — | code, name, status (pcs, dz, kg, m …) |
| currency | — | code, name, symbol, exchange_rate, is_default, status |
| country | default_currency → currency | code, name, status |
| colorcode | — | code, name, hex_code, status |
| department | parent ↻ self | code, name, status, description (org structure) |
| designation | department → department | code, name, description, status |
| paymentterms | — | code, name, days, description, status |
| buyer | country, currency, payment_terms | code, name, contact_person, email, phone, address, credit_limit, status, notes |
| brand | buyer → buyer | code, name, status |
| factory | country | code, name, contact_person, email, phone, address, city, capacity, capacity_unit, factory_type, status, notes |
| vendor | country, payment_terms, approved_by(user) | code, name, contact_person, email, phone, address, city, product_categories, lead_time_days, rating, status, notes, is_approved, approved_at |
| risklevel | — | code, name, color, description, sort_order, status (risk bands for FN/PO/shipments) |

---

## 4. Merchandising Entities

### 4.1 Style — `merchandising.style`

FK: `buyer`, `brand`, `category`(productcategory), `product_type`, `department`
(productdepartment), `season`.

Design-detail fields: `style_number` (unique/tenant), `name`, `description`, `tech_pack`
(upload), `sketch_front/back/side/detail`, `current_version`, `status`, plus TechPack-sheet
fields: `block`, `based_on`, `relationship`, `designer`, `pattern_cutter`, `issuer`,
`cloth_code`, `size`, `length`, `issue_date`, `risk_date`, `pattern_request_date`,
`design_note`.

Children: `styleversion`, `fileopening`, `styleitem`, `designimage`, `designcosting`,
`jobrequest`, `styletechpack`.

### 4.2 Style Version — `merchandising.styleversion`

FK: `style`. Fields: `version_number`, `revision_notes`, `status`. Unique `(style,
version_number)`. Children: `fileopening`, `bom`.

### 4.3 File Opening (`FN`) — `merchandising.fileopening`

FK: `style`, `style_version`, `buyer`, `brand`, `factory`, `risk_level`, `original_fn`
(self, for repeats). Fields: `file_number` (unique/tenant), `file_date`, `status`, `remarks`,
`is_quick_lead` (+ `quick_lead_agreed_by`), `is_repeat` (+ `repeat_approved_by`),
`is_stock_fabric`, `stock_fabric_description`, `total_meters`, `allocated_meters`,
`stock_photo`. Children: `repeats`, `stock_allocations`, `notes`, `purchase_orders`.

### 4.4 Stock Fabric Allocation — `merchandising.stockfabricallocation`

FK: `stock`(fileopening), `allocated_to`(fileopening). Fields: `meters`, `allocated_date`,
`notes`. Tracks metres of stock fabric moved between FNs.

### 4.5 File Opening Note — `merchandising.fileopeningnote`

Specialises `core.Note`. FK: `file_opening`, `author`. Fields: `text`.

### 4.6 Purchase Order — `merchandising.purchaseorder`

FK: `file_opening`, `buyer`, `brand`, `factory`, `destination_country`, `currency`,
`payment_terms`, `delivery_mode`, `risk_level`. One-to-one reverse: `ta`. Fields:
`po_number` (unique/tenant), `po_date`, `delivery_date`, `destination_port`, `quantity`,
`unit_price`, `total_value`, `status`, `remarks`.

Children: `poamendment`, `purchaseorderitem`, `hit`, `fitspec`, `costing`,
`jobrequest`, and (cross-app) all `commercial.*`, `production.*`, `quality.*`,
`logistics.*` rows that reference the PO.

### 4.7 PO Amendment — `merchandising.poamendment`

FK: `purchase_order`, `approved_by`. Fields: `amendment_number`, `field_name`, `old_value`,
`new_value`, `reason`, `status`, `approved_at`.

### 4.8 Purchase Order Item — `merchandising.purchaseorderitem`

FK: `purchase_order`, `color`. Fields: `size`, `quantity`, `unit_price`. Colour×size
contract line of the PO.

### 4.9 Hit — `merchandising.hit`

FK: `purchase_order`, `colour`(colorcode), `factory_override`(optional factory). Fields:
`hit_number`, `delivery_mode` (boxed/hanging), `delivery_type` (sea/air/air-paid),
`original_delivery_date`, `actual_delivery_date`. Colour-level production commitment used
by booking schedule.

### 4.10 Fit Spec (PO-level) — `merchandising.fitspec`

FK: `purchase_order`. Fields: `fit_stage`, `version`, `measurements` (JSON), `notes`,
`is_current`. Children: `fitimage`.

### 4.11 BOM / BOM Item — `merchandising.bom`, `merchandising.bomitem`

`bom`: FK `style_version`. Fields: `name`, `version`, `status`.

`bomitem`: FK `bom`, `uom`, `vendor`, `supplier`(vendor). Fields: `category`,
`item_name`, `description`, `consumption`, `waste_percent`, `unit_price`, `ordered_qty`,
`delivered_qty`, `eta_date`, `confirmed_date`, `actual_date`, `status`, `location`,
`colour`, `width_size`, `match`. The `ordered/delivered/eta` fields double as the
materials/accessories **booking & goods-receipt tracking** (target `GoodsReceipt`).

### 4.12 Style Item — `merchandising.styleitem`

FK: `style`, `uom`, `vendor`. Fields: `category`, `item_name`, `description`,
`consumption`, `waste_percent`, `unit_price`, `sort_order`. Style-level material list;
seeds BOM items.

### 4.13 Design Image — `merchandising.designimage`

FK: `style`. Fields: `image`, `role` (sketch/layout/…) , `caption`, `colourway`,
`sort_order`, `is_main`.

### 4.14 Costing (PO-level) — `merchandising.costing` + `costingline`

`costing` FK: `purchase_order`, `bom`, `approved_by`, `confirmed_by`. Fields: `version`,
`status`, `sheet_type`, `is_live`, `exchange_rate`, `target_price`, `fabric_cost`,
`trim_cost`, `cm_cost`, `overhead_cost`, `total_cost`, `margin`, `approved_at`, `notes`,
`is_single_size`, `size_ratio`, `confirmed`, `confirmed_at`, `is_patterned`,
`patterned_fabric_options`.

Design-costing ladder **snapshot** (frozen at `prepare_po_costing` time, all defaulted:
`0` or `null=True`): `customer_discount_pct`, `origin_overhead_pct`, `uk_overhead_pct`,
`selling_price`. PO-level computed totals: `po_quantity`, `po_total_cost`, `po_base_cost`,
`po_margin_amount`. The serializer exposes computed method fields `discount_amount`,
`overhead_amount`, `base_cost`, `margin_amount` (per-piece ladder values carried from the
snapshot).

`costingline` FK: `costing`, `approved_by`. Fields: `category`, `description`,
`unit_price`, `consumption`, `is_additional`, `original_description`, `approved_at`,
`size_width`, `sort_order`.

### 4.15 Design Costing (Style-level) — `merchandising.designcosting` + `designcostingline`

`designcosting` FK: `style`, `approved_by`. Fields mirror `costing` (`version`, `status`,
`sheet_type`, `is_live`, `target_price`, `fabric_cost`, `trim_cost`, `cm_cost`, `overhead_cost`,
`total_cost`, `margin`, `approved_at`, `notes`, `is_single_size`, `size_ratio`, `confirmed`,
`is_patterned`, `patterned_fabric_options`) plus the **price-ladder** source fields:
`customer_discount_pct`, `origin_overhead_pct`, `uk_overhead_pct`, `selling_price`,
`exchange_rate`. Ladder decomposes in `save()` to `discount_amount`, `overhead_amount`,
`base_cost`, `margin_amount`, `landed_cost`. `designcostingline` has no approval fields; fields
mirror `costingline`.

### 4.16 T&A / T&Milestone — `merchandising.ta` + `merchandising.tamilestone`

`ta` FK: `purchase_order`. Fields: `status`, `delivery_date`, `critical_path` (JSON).
`tamilestone` FK: `ta`, `assigned_to`. Fields: `name`, `description`, `planned_date`,
`actual_date`, `status`, `is_critical`, `sort_order`.

### 4.17 Job Request — `merchandising.jobrequest`

FK: `style`, `purchase_order`, `assigned_to`. Fields: `job_number`, `job_type`,
`description`, `work_location`, `required_by_date`, `priority`, `status`, `notes`.

### 4.18 TechPack — `merchandising.styletechpack`

FK: `style`, `product_type`, `buyer`, `design_sheet`. Fields: `techpack_number`,
`source_pdf`, `excel_file`, `status`, `extracted_data` (JSON), `errors`, `warnings`,
plus the full TechPack-sheet block: `issue_date`, `block`, `based_on`, `relationship`,
`style_number`, `size`, `designer`, `pattern_cutter`, `issuer`, `cloth_code`, `length`,
`sketch`, `description`, `note`, `style_code`, `contains`, `risk_date`,
`pattern_request_date`, `sketch_image`, `sketch_thumbnail`, `other_images`,
`notes_initials`, `notes_date`.

### 4.19 Design Sheet — `merchandising.designsheet`

FK: `tech_pack`(styletechpack). Fields: `status`, `sketch_annotations`, `layout_order`.
Children: `fitspecification`, `designjobrequest`. This is the "Sketch Annotation" node.

### 4.20 Fit Specification (design-level) — `merchandising.fitspecification` + `fitimage`

`fitspecification` FK: `design_sheet`. Fields: `fit_number`, `fit_date`, `description`,
`notes`, `is_selected`. `fitimage` FK: `fit_spec`, fields: `image`, `caption`, `order`.

### 4.21 Design Job Request — `merchandising.designjobrequest`

FK: `design_sheet`, `allocated_to`. Fields: `job_type`, `required_by`, `work_location`,
`no_of_garments`, `notes`, `status`.

---

## 5. Fabric Entities

| Entity (`fabric.*`) | FK | Notable fields |
|---------------------|----|----------------|
| fabriccategory | parent ↻ self | code, name, description (tree) |
| htscode | fabric_category | code, description, duty_rate |
| fabricsupplier | vendor(setup), country | code, name, contact_person, email, phone, lead_time_days, moq_meters, is_mill, notes |
| fabricmill | country | code, name, city, capacity_meters_month, rating, certification, notes |
| rfq | supplier(fabricsupplier) | rfq_number, status, notes, closed_at |
| rfqlineitem | rfq, fabric_category | quantity_meters, target_price, notes |
| rfqresponse | rfq, supplier | response_date, valid_until, notes |
| rfqresponseitem | response, line_item | quoted_price, available_qty_meters, lead_days, notes |
| fabricbooking | supplier, fabric_category, origin_country | booking_number, quantity_meters, status, expected_delivery, actual_delivery, notes |
| fabricorder | supplier, fabric_category, bulk_approved_by, risk_level | order_number, quantity_meters, unit_price, total_price, status, lab_dip_required/actual/approval_date, lab_dip_notes, bulk_approved_date/notes, strike_off_*.date, onboard_date, eta_date, actual_arrival_date, paperwork_date, clearance_date, notes, risk_notes, date_owners |
| fabrictolerance | — | customer_type, qty_from, qty_to, tolerance_pct |
| fabricschedulehandoff | order(fabricorder), handed_off_by | date_key, from_role, to_role, trigger, handed_off_at, notes |
| fabricutilization | order(fabricorder), recorded_by | period, received_meters, used_meters, wasted_meters, damaged_meters, notes, recorded_at |

The fabric module implements the "POItem → Fabric Booking" branch: booking/order lifecycle
from RFQ through lab-dip/strike-off approval, bulk approval, shipment and utilization.

---

## 6. Commercial Entities

| Entity (`commercial.*`) | FK | Notable fields |
|-------------------------|----|----------------|
| forwardorder | buyer, factory, purchase_order | month, quantity, unit_cost, total_cost, service_pct, service_charge, in_hand_units, status, remarks |
| lc | buyer, purchase_order, parent_lc(self), bank, currency | lc_number (unique/tenant), lc_type, amount, issued_date, expiry_date, status, utilized_amount, remarks |
| lcamendment | lc, approved_by | amendment_number, amount_change, expiry_date_change, quantity_change, reason, status, approved_at |
| bank | — | code, name, swift_code, address, contact_person, phone, email, status |
| proformainvoice | purchase_order, buyer, lc | pi_number, amount, currency, issued_date, validity_date, status, remarks |
| salescontract | purchase_order, buyer, payment_terms | contract_number, contract_date, total_amount, currency, delivery_terms, status, remarks |
| salesconfirmation | purchase_order, buyer | confirmation_number, sent_at, disputed_at, accepted_at, status, dispute_reason, auto_accepted, remarks |
| debitnote | purchase_order, invoice_approval, reconciliation(finalhitreconciliation), currency, raised_by | debit_number (unique/tenant), debit_type, party_type, debited_party, amount, shortage_units, tolerance_pct, reason, status, compliance_email, compliance_email_sent, email_sent_at, raised_at, issued_at, paid_at, notes |
| invoiceapproval | purchase_order, currency, debit_note, approved_by, rejected_by | invoice_number, invoice_type, invoice_date, quantity, unit_price, amount, status, rejection_reason, approved_at, rejected_at, notes |

Note: `lc` has no `lcitem` — it links the PO directly and tracks `amount` +
`utilized_amount` (target `LCItem` is planned, §11).

---

## 7. Production Entities

### 7.1 Production Plan — `production.productionplan`

FK: `purchase_order`, `factory`. Fields: `plan_date`, `start_date`, `end_date`,
`quantity`, `status`, `remarks`.

### 7.2 Daily Production — `production.dailyproduction` (aligns to DailyLineProduction)

FK: `purchase_order`, `factory`. Fields: `production_date`, `line_number`,
`target_quantity`, `actual_quantity`, `passed_quantity`, `rejected_quantity`,
`efficiency`, `dhu`, `manpower`, `working_hours`, `status`.

---

## 8. Quality Entities

| Entity (`quality.*`) | FK | Notable fields |
|----------------------|----|----------------|
| inspection | purchase_order, factory, inspector | inspection_type, inspection_date, aql_level, sample_size, passed_quantity, rejected_quantity, status, remarks |
| inspectionitem | inspection | defect_type, defect_count, severity, description, image_url |
| correctiveaction | inspection, assigned_to, verified_by | title, description, root_cause, corrective_measure, preventive_measure, due_date, completed_date, priority, status, verified_at |
| goldseal | shipment(logistics) | status, sent_date, approval_date, notes |
| complianceaudit | purchase_order | week_start, efficiency_rate, fabric_paperwork_status, dockets_status, fabric_utilisation_status, factory_invoice_status, fabric_rating_status, recon_costed_vs_actual_status, final_hits_status, notes |

`inspection`/`inspectionitem` implement the "Batch or AQL Audit" node of the target
diagram; weekly factory-gate compliance is `complianceaudit` + `goldseal`.

---

## 9. Logistics Entities

| Entity (`logistics.*`) | FK | Notable fields |
|------------------------|----|----------------|
| freightforwarder | — | code, name, contact_person, email, phone, address, country, notes |
| shipment | purchase_order, factory, freight_forwarder, risk_level | shipment_number (unique/tenant), mode, status, booking_date, booking_reference, booking_ref_required_date, etd, eta, atd, ata, port_of_loading, port_of_discharge, vessel_name, voyage_number, container_number, seal_number, container_size, quantity, weight_kg, cbm, marks, remarks |
| bookingscheduleitem | shipment, hit, risk_level | status, cut_qty, garments_ready_qty, ex_factory_date, ex_factory_notes, week_ending, notes, snapshot_date, snapshot_data |
| shippingdocument | shipment | document_type, document_number, document_date, file, notes (typed: packing list / invoice / B/L / …) |
| docket | shipment | docket_number, contract_price, date_raised, delivery_date, total_fabric_meters, unused_fabric_meters, is_final, sales_notified, sales_notified_at, notes |
| importrecap | supplier(vendor), factory | s_c_number, invoice_value, item_category, quantity, rolls_bales, container, bl_hawb, mode, lc_foc, vessel, pcd_date, etd_date, eta_date, atb_date, unstuffed_date, in_house_date, agent, docs_received, status, remarks |
| exportrecap | purchase_order, factory, forwarder | fob_no, s_c_number, factory_invoice(+date), customer_invoice(+date), quantity, fob_value, cmpt_value, cost_value, service_pct, ex_factory_date, mode, hbl, on_board_date, eta_date, container, bl_number, courier, factory_pay_terms, factory_amount, factory_due_date, factory_paid_date, customer_pay_terms, customer_received_amount, customer_due_date, customer_payment_date, remarks |
| finalhitreconciliation | shipment, schedule_item, reconciled_by | docket_quantity, shipped_quantity, shortage_units, reasons_evident, notes, status, reconciled_at; child `debitnote` |
| supplierpayment | supplier(vendor), purchase_order, lc, released_by | payment_ref, invoice_no, fn_ref, allocated_amount, amount, currency, payment_date, due_date, payment_method, released, released_at, remarks |
| costreconciliation | purchase_order, export_recap, costing, reconciled_by | factory_inv_amount/qty, planning_cm_amount/qty, factory_inv_per_unit, planning_cm_per_unit, saving_loss_per_unit, saving_loss_total, is_mismatch, status, notes, reconciled_at |

`shippingdocument.document_type` currently carries the packing-list / invoice /
bill-of-lading artifacts; dedicated models are planned (§11).

---

## 10. Monitoring, Reporting & Help Entities

| Entity | FK | Notable fields |
|--------|----|----------------|
| `monitoring.auditlog` | tenant, user | entity_type, entity_id, entity_name, action, description, ip_address, user_agent, old_value, new_value |
| `monitoring.systemhealth` | tenant | service, status, response_time_ms, message, checked_at |
| `monitoring.alert` | tenant, resolved_by | alert_type, service, title, message, entity_type, entity_id, is_read, is_resolved, resolved_at |
| `reporting.savedreport` | tenant | name, report_type, description, config (JSON), is_scheduled |
| `help.tourcompletion` | user, tenant | tour_id, completed_at |
| `help.onboardingchecklistitem` | user, tenant | item_key, completed, completed_at |
| `help.releasenote` | (no tenant) | version, title, body, released_at, is_published |

---

## 11. Planned (Target-Only) Entities

These entities appear in the §1 target ER diagram but have **no model or app yet** as of
2026-09-13. They are intentionally listed here (tagged **planned**) so the documentation
shows both current and target state. When any of these ships, move it to the matching
implemented section and update the §1 legend.

### 11.1 Finance (new app, target-only)
| Entity | Relation | Notes |
|--------|----------|-------|
| ChartOfAccounts | tenant | coded account tree; `code`, `name`, `account_type`, `parent`, `is_group` |
| Voucher → VoucherItem | tenant | `voucher_number`, `voucher_type`, `total_debit`, `total_credit`; items = account × debit/credit |
| JournalEntry | tenant | posting trail derived from vouchers |
Today monetary tracking lives in the commercial module (`lc`, `proformainvoice`,
`salescontract`, `debitnote`, `invoiceapproval`, `supplierpayment`,
`costreconciliation`) and per-entity amount fields (`purchaseorder`, `costing`,
`designcosting`).

### 11.2 Inventory
| Entity | Relation | Notes |
|--------|----------|-------|
| Inventory / StockMovement / VirtualStock | tenant | stock ledger with movements; virtual stock for pre-allocated stock-fabric |
Today stock-fabric is modelled by `merchandising.fileopening` (`is_stock_fabric`,
`total_meters`, `allocated_meters`) + `merchandising.stockfabricallocation`. A
standalone inventory app is not present.

### 11.3 Procurement receipts
| Entity | Relation | Notes |
|--------|----------|-------|
| GoodsReceipt → GoodsReceiptItem | purchase_order | PO receiving with item lines |
Receipt quantities are currently tracked on `bomitem.delivered_qty` / `fabricorder` lifecycle fields rather than a dedicated receipt model.

### 11.4 LC composition
| Entity | Notes |
|--------|-------|
| LCItem | itemized line items under an LC; today `commercial.lc` links the PO directly |

### 11.5 Shipment documents
| Entity | Notes |
|--------|-------|
| PackingList / Invoice / BillOfLading | would replace/augment `logistics.shippingdocument` typed-doc rows |

### 11.6 Compliance registries
| Entity | Notes |
|--------|-------|
| BuyerCompliance | per-buyer compliance doc registry |
| FactoryCapability / FactoryCompliance | per-factory capability + compliance registry |
| VendorCertification / VendorPerformance | per-vendor certification + performance ledger |
`setup.compliancedocumenttype` exists as the type list only.

### 11.7 Design revision
| Entity | Notes |
|--------|-------|
| TechPackRevision | explicit techpack revision history; today versioning is `styleversion` |

### 11.8 Production / quality lineage
| Entity | Notes |
|--------|-------|
| Batch or AQL Audit (line-quality batch) | AQL is implemented as `quality.inspection`; a batch/line-quality ledger is not |
| LinePerformance (as separate from DailyProduction) | per-line KPI roll-ups are computed, not stored |

---

## 12. Indexing Strategy

### 12.1 Indexing Principles

| Principle | Description |
|-----------|-------------|
| Primary Keys | UUID for all entities |
| Foreign Keys | Index all foreign key columns |
| Common Filters | Index frequently filtered columns |
| Date Columns | Index date columns used in range queries |
| Composite Indexes | Create composite indexes for common query patterns |
| Partial Indexes | Use partial indexes for filtered queries |

### 12.2 Performance Considerations

| Consideration | Recommendation |
|---------------|----------------|
| Connection Pooling | Use connection pooling (PgBouncer) |
| Read Replicas | Use read replicas for reporting |
| Partitioning | Partition large tables by tenant or date |
| Archival | Archive old data to separate tables |
| Caching | Cache frequently accessed data in Redis |

---

*This data model is continuously reconciled against `backend/apps/*/models.py`. The §1
ER diagram is the target view; §2–§10 are implemented; §11 is planned/target-only.*