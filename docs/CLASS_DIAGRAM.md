# BHMS Class Diagram (UML)

> **Standard / Delivery-ready reference** — generated from the **actual implemented Django models**
> (live introspection of `backend/apps/*/models.py`, via `django.apps.get_models()`), not from the
> legacy design docs.
>
> - **Scope:** 87 domain models across 12 business apps (+ `core` abstract bases)
> - **Relationship source:** real `ForeignKey` / `OneToOneField` / `ManyToManyField` definitions
> - **Legend:**
>   - `--|>` : inheritance (extends abstract base)
>   - `-->`  : association (ForeignKey, many-to-one; `1..*` shown where significant)
>   - `o--`  : one-to-one
>   - `*--`  : many-to-many
>   - Implied on every `TenantModel` subclass (omitted from boxes for readability):
>     `id: UUID`, `tenant -> Tenant`, `created_at`, `updated_at`, `created_by -> User`, `is_active`

---

## 0. Foundation — Abstract Base Classes (`core`)

```mermaid
classDiagram
    class TimeStampedModel <<abstract>> {
        +UUID id
        +DateTime created_at
        +DateTime updated_at
        +ForeignKey created_by -> User
        +Boolean is_active
    }
    class TenantModel <<abstract>> {
        +ForeignKey tenant -> Tenant
    }
    class Note <<abstract>> {
        +TextField text
        +ForeignKey author -> User
        +property author_initials
    }
    TimeStampedModel <|-- TenantModel
    TenantModel <|-- Note
```

---

## 1. Tenancy & IAM (`tenants`, `users`, `authentication`)

```mermaid
classDiagram
    namespace tenants {
        class Tenant {
            +String name
            +String slug
            +String schema_name
            +String legal_name
            +TextField address
            +String phone
            +String email
            +String timezone
            +String currency
            +String status
            +String plan
            +Boolean is_active
        }
        class Office {
            +String code
            +String name
            +TextField address
            +String city
            +String country
            +String office_type
            +String phone
            +String email
            +String status
        }
    }
    namespace users {
        class User {
            +UUID id
            +String email
            +String phone
            +String designation
            +ForeignKey department -> Department
            +Boolean mfa_enabled
            +String status
            +IP last_login_ip
            +ManyToMany groups -> Group
            +ManyToMany user_permissions -> Permission
        }
        class PasswordHistory {
            +ForeignKey user -> User
            +String password_hash
        }
        class Role {
            +String name
            +TextField description
            +Boolean is_system
        }
        class UserRole {
            +ForeignKey user -> User
            +ForeignKey role -> Role
        }
        class Permission {
            +String module
            +String action
            +TextField description
        }
        class RolePermission {
            +ForeignKey role -> Role
            +ForeignKey permission -> Permission
        }
        class AuditLog {
            +String action
            +String entity_type
            +UUID entity_id
            +JSON old_values
            +JSON new_values
            +IP ip_address
        }
    }
    namespace authentication {
        class MFABackupCode {
            +ForeignKey user -> User
            +String code_hash
            +Boolean used
            +DateTime used_at
        }
        class MFASetupLog {
            +ForeignKey user -> User
            +String action
            +IP ip_address
        }
    }

    Tenant "1" --> "*" Office : tenant
    User "1" o-- "*" PasswordHistory
    User "1" *-- "*" UserRole
    Role "1" *-- "*" UserRole
    Role "1" *-- "*" RolePermission
    Permission "1" *-- "*" RolePermission
    User "1" --> "*" AuditLog : actor
```

> `User` extends Django's `AbstractUser` (auth) — `groups`/`user_permissions` are the standard auth
> M2M. It declares its own `tenant`, `created_at`/`updated_at`/`created_by`/`is_active` fields
> directly (it does **not** inherit `TimeStampedModel`). Note there are **two distinct `AuditLog`
> models**: `users.AuditLog` (auth/access audit) and `monitoring.AuditLog` (entity change log).

---

## 2. Master Data (`setup`)

```mermaid
classDiagram
    namespace setup {
        class Season {
            +String code
            +String name
            +Date start_date
            +Date end_date
            +String status
        }
        class ProductCategory {
            +String code
            +String name
            +ForeignKey parent -> ProductCategory
            +String status
        }
        class ProductType {
            +String code
            +String name
            +ForeignKey category -> ProductCategory
            +String status
        }
        class ProductDepartment {
            +String code
            +String name
            +String status
        }
        class ComplianceDocumentType {
            +String code
            +String name
            +TextField description
            +Int validity_days
            +String status
        }
        class DeliveryMode {
            +String code
            +String name
            +TextField description
            +String status
        }
        class UOM {
            +String code
            +String name
            +String status
        }
        class Currency {
            +String code
            +String name
            +String symbol
            +Decimal exchange_rate
            +Boolean is_default
            +String status
        }
        class Department {
            +String code
            +String name
            +ForeignKey parent -> Department
            +TextField description
            +String status
        }
        class Designation {
            +String code
            +String name
            +ForeignKey department -> Department
            +TextField description
            +String status
        }
        class PaymentTerms {
            +String code
            +String name
            +Int days
            +TextField description
            +String status
        }
        class Country {
            +String code
            +String name
            +ForeignKey default_currency -> Currency
            +String status
        }
        class ColorCode {
            +String code
            +String name
            +String hex_code
            +String status
        }
        class Buyer {
            +String code
            +String name
            +String contact_person
            +String email
            +String phone
            +TextField address
            +ForeignKey country -> Country
            +ForeignKey currency -> Currency
            +ForeignKey payment_terms -> PaymentTerms
            +Decimal credit_limit
            +String status
        }
        class Brand {
            +ForeignKey buyer -> Buyer
            +String code
            +String name
            +String status
        }
        class Factory {
            +String code
            +String name
            +String contact_person
            +String email
            +String phone
            +TextField address
            +String city
            +ForeignKey country -> Country
            +Int capacity
            +String capacity_unit
            +String factory_type
            +String status
        }
        class Vendor {
            +String code
            +String name
            +String contact_person
            +String email
            +String phone
            +TextField address
            +String city
            +ForeignKey country -> Country
            +JSON product_categories
            +ForeignKey payment_terms -> PaymentTerms
            +Int lead_time_days
            +Decimal rating
            +String status
            +Boolean is_approved
            +ForeignKey approved_by -> User
            +DateTime approved_at
        }
        class RiskLevel {
            +String code
            +String name
            +String color
            +TextField description
            +Int sort_order
            +String status
        }
    }
    TimeStampedModel <|-- Season
    TimeStampedModel <|-- ProductCategory
    TimeStampedModel <|-- ProductType
    TimeStampedModel <|-- ProductDepartment
    TimeStampedModel <|-- ComplianceDocumentType
    TimeStampedModel <|-- DeliveryMode
    TimeStampedModel <|-- UOM
    TimeStampedModel <|-- Currency
    TimeStampedModel <|-- Department
    TimeStampedModel <|-- Designation
    TimeStampedModel <|-- PaymentTerms
    TimeStampedModel <|-- Country
    TimeStampedModel <|-- ColorCode
    TimeStampedModel <|-- Buyer
    TimeStampedModel <|-- Brand
    TimeStampedModel <|-- Factory
    TimeStampedModel <|-- Vendor
    TimeStampedModel <|-- RiskLevel

    ProductCategory "1" o-- "0..1" ProductType : category
    Department "1" o-- "0..1" Designation : department
    Country "1" o-- "0..1" Buyer : country
    Currency "1" o-- "0..1" Buyer : currency
    PaymentTerms "1" o-- "0..1" Buyer : payment_terms
    Buyer "1" --> "*" Brand
    Country "1" o-- "*" Factory
    Country "1" o-- "*" Vendor
    PaymentTerms "1" o-- "*" Vendor
    Department "1" o-- "*" User : users.department
```

> All classes above extend `TenantModel` (i.e., `TimeStampedModel` → `TenantModel`). Self-referencing
> hierarchies exist on `ProductCategory.parent` and `Department.parent`.

---

## 3. Merchandising (`merchandising`)

```mermaid
classDiagram
    namespace merchandising {
        class Style {
            +String style_number
            +String name
            +TextField description
            +ForeignKey buyer -> Buyer
            +ForeignKey brand -> Brand
            +ForeignKey category -> ProductCategory
            +ForeignKey product_type -> ProductType
            +ForeignKey department -> ProductDepartment
            +ForeignKey season -> Season
            +File tech_pack
            +Image sketch_front
            +Image sketch_back
            +Image sketch_side
            +Image sketch_detail
            +Int current_version
            +String status
        }
        class StyleVersion {
            +ForeignKey style -> Style
            +Int version_number
            +TextField revision_notes
            +String status
        }
        class FileOpening {
            +String file_number
            +ForeignKey style -> Style
            +ForeignKey style_version -> StyleVersion
            +ForeignKey buyer -> Buyer
            +ForeignKey brand -> Brand
            +ForeignKey factory -> Factory
            +Date file_date
            +String status
            +TextField remarks
            +ForeignKey risk_level -> RiskLevel
            +Boolean is_quick_lead
            +JSON quick_lead_agreed_by
            +ForeignKey original_fn -> FileOpening
            +Boolean is_repeat
            +JSON repeat_approved_by
            +Boolean is_stock_fabric
            +Decimal total_meters
            +Decimal allocated_meters
            +Image stock_photo
        }
        class StockFabricAllocation {
            +ForeignKey stock -> FileOpening
            +ForeignKey allocated_to -> FileOpening
            +Decimal meters
            +Date allocated_date
            +TextField notes
        }
        class FileOpeningNote {
            +ForeignKey file_opening -> FileOpening
        }
        class PurchaseOrder {
            +String po_number
            +ForeignKey file_opening -> FileOpening
            +ForeignKey buyer -> Buyer
            +ForeignKey brand -> Brand
            +ForeignKey factory -> Factory
            +Date po_date
            +Date delivery_date
            +ForeignKey destination_country -> Country
            +String destination_port
            +Int quantity
            +Decimal unit_price
            +Decimal total_value
            +ForeignKey currency -> Currency
            +ForeignKey payment_terms -> PaymentTerms
            +ForeignKey delivery_mode -> DeliveryMode
            +String status
            +TextField remarks
            +ForeignKey risk_level -> RiskLevel
        }
        class POAmendment {
            +ForeignKey purchase_order -> PurchaseOrder
            +String amendment_number
            +String field_name
            +TextField old_value
            +TextField new_value
            +TextField reason
            +String status
            +ForeignKey approved_by -> User
            +DateTime approved_at
        }
        class PurchaseOrderItem {
            +ForeignKey purchase_order -> PurchaseOrder
            +ForeignKey color -> ColorCode
            +String size
            +Int quantity
            +Decimal unit_price
        }
        class Hit {
            +ForeignKey purchase_order -> PurchaseOrder
            +String hit_number
            +ForeignKey colour -> ColorCode
            +String delivery_mode
            +String delivery_type
            +ForeignKey factory_override -> Factory
            +Date original_delivery_date
            +Date actual_delivery_date
        }
        class FitSpec {
            +ForeignKey purchase_order -> PurchaseOrder
            +String fit_stage
            +Int version
            +JSON measurements
            +JSON images
            +TextField notes
            +Boolean is_current
        }
        class BOM {
            +ForeignKey style_version -> StyleVersion
            +String name
            +Int version
            +String status
        }
        class BOMItem {
            +ForeignKey bom -> BOM
            +String category
            +String item_name
            +TextField description
            +ForeignKey uom -> UOM
            +Decimal consumption
            +Decimal waste_percent
            +Decimal unit_price
            +ForeignKey vendor -> Vendor
            +ForeignKey supplier -> Vendor
            +Decimal ordered_qty
            +Decimal delivered_qty
            +Date eta_date
            +Date confirmed_date
            +Date actual_date
            +String status
        }
        class StyleItem {
            +ForeignKey style -> Style
            +String category
            +String item_name
            +TextField description
            +ForeignKey uom -> UOM
            +Decimal consumption
            +Decimal waste_percent
            +Decimal unit_price
            +ForeignKey vendor -> Vendor
            +Int sort_order
        }
        class DesignImage {
            +ForeignKey style -> Style
            +Image image
            +String role
            +String caption
            +String colourway
            +Int sort_order
            +Boolean is_main
        }
        class Costing {
            +ForeignKey purchase_order -> PurchaseOrder
            +ForeignKey bom -> BOM
            +Int version
            +String status
            +String sheet_type
            +Boolean is_live
            +Decimal exchange_rate
            +Decimal target_price
            +Decimal fabric_cost
            +Decimal trim_cost
            +Decimal cm_cost
            +Decimal overhead_cost
            +Decimal total_cost
            +Decimal margin
            +ForeignKey approved_by -> User
            +Boolean is_single_size
            +JSON size_ratio
            +Boolean confirmed
            +Boolean is_patterned
            +JSON patterned_fabric_options
        }
        class CostingLine {
            +ForeignKey costing -> Costing
            +String category
            +String description
            +Decimal unit_price
            +Decimal consumption
            +Boolean is_additional
            +String size_width
            +Int sort_order
        }
        class TA {
            +OneToOne purchase_order -> PurchaseOrder
            +String status
            +Date delivery_date
            +JSON critical_path
        }
        class TAMilestone {
            +ForeignKey ta -> TA
            +String name
            +TextField description
            +Date planned_date
            +Date actual_date
            +String status
            +ForeignKey assigned_to -> User
            +Boolean is_critical
            +Int sort_order
        }
        class JobRequest {
            +String job_number
            +String job_type
            +ForeignKey style -> Style
            +ForeignKey purchase_order -> PurchaseOrder
            +TextField description
            +String work_location
            +ForeignKey assigned_to -> User
            +Date required_by_date
            +Int priority
            +String status
            +TextField notes
        }
    }
    TimeStampedModel <|-- Style
    TimeStampedModel <|-- StyleVersion
    TimeStampedModel <|-- FileOpening
    TimeStampedModel <|-- StockFabricAllocation
    TenantModel <|-- FileOpeningNote
    TimeStampedModel <|-- PurchaseOrder
    TimeStampedModel <|-- POAmendment
    TimeStampedModel <|-- PurchaseOrderItem
    TimeStampedModel <|-- Hit
    TimeStampedModel <|-- FitSpec
    TimeStampedModel <|-- BOM
    TimeStampedModel <|-- BOMItem
    TimeStampedModel <|-- StyleItem
    TimeStampedModel <|-- DesignImage
    TimeStampedModel <|-- Costing
    TimeStampedModel <|-- CostingLine
    TimeStampedModel <|-- TA
    TimeStampedModel <|-- TAMilestone
    TimeStampedModel <|-- JobRequest

    Buyer "1" --> "*" Style
    Style "1" --> "*" StyleVersion
    Style "1" o-- "*" FileOpening : opened for
    StyleVersion "1" o-- "0..1" FileOpening
    FileOpening "1" o-- "*" FileOpeningNote
    FileOpening "1" o-- "*" StockFabricAllocation : stock
    FileOpening "1" o-- "0..1" FileOpening : original_fn
    FileOpening "1" o-- "0..1" PurchaseOrder : linked
    PurchaseOrder "1" --> "*" PurchaseOrderItem
    PurchaseOrder "1" --> "*" POAmendment
    PurchaseOrder "1" --> "*" Hit
    PurchaseOrder "1" o-- "0..1" FitSpec
    PurchaseOrder "1" o-- "0..1" TA
    PurchaseOrder "1" --> "*" Costing
    BOM "1" --> "*" BOMItem
    Style "1" --> "*" StyleItem
    Style "1" --> "*" DesignImage
    Costing "1" --> "*" CostingLine
    TA "1" --> "*" TAMilestone
    Style "1" --> "*" JobRequest
    Vendor "1" o-- "*" BOMItem : supplier
    UOM "1" o-- "*" BOMItem
    RiskLevel "1" o-- "*" FileOpening
    RiskLevel "1" o-- "*" PurchaseOrder
```

> `FileOpening` is the domain hub: it connects a `Style`/`StyleVersion` to a `Buyer`, `Factory`,
> and risk profile, and supports **quick-lead**, **repeat** and **stock-fabric** sourcing variants.
> `Note` (core) is the base for `FileOpeningNote`.

---

## 4. Fabric Management (`fabric`)

```mermaid
classDiagram
    namespace fabric {
        class FabricCategory {
            +String code
            +String name
            +ForeignKey parent -> FabricCategory
            +TextField description
        }
        class HTSCode {
            +String code
            +TextField description
            +ForeignKey fabric_category -> FabricCategory
            +Decimal duty_rate
        }
        class FabricSupplier {
            +String code
            +String name
            +ForeignKey vendor -> Vendor
            +String contact_person
            +String email
            +String phone
            +ForeignKey country -> Country
            +Int lead_time_days
            +Decimal moq_meters
            +Boolean is_mill
            +TextField notes
        }
        class FabricMill {
            +String code
            +String name
            +ForeignKey country -> Country
            +String city
            +Int capacity_meters_month
            +Decimal rating
            +String certification
            +TextField notes
        }
        class RFQ {
            +String rfq_number
            +ForeignKey supplier -> FabricSupplier
            +String status
            +TextField notes
            +DateTime closed_at
        }
        class RFQLineItem {
            +ForeignKey rfq -> RFQ
            +ForeignKey fabric_category -> FabricCategory
            +Decimal quantity_meters
            +Decimal target_price
            +TextField notes
        }
        class RFQResponse {
            +ForeignKey rfq -> RFQ
            +ForeignKey supplier -> FabricSupplier
            +Date response_date
            +Date valid_until
            +TextField notes
        }
        class RFQResponseItem {
            +ForeignKey response -> RFQResponse
            +ForeignKey line_item -> RFQLineItem
            +Decimal quoted_price
            +Decimal available_qty_meters
            +Int lead_days
            +TextField notes
        }
        class FabricBooking {
            +String booking_number
            +ForeignKey supplier -> FabricSupplier
            +ForeignKey fabric_category -> FabricCategory
            +Decimal quantity_meters
            +String status
            +ForeignKey origin_country -> Country
            +Date expected_delivery
            +Date actual_delivery
            +TextField notes
        }
        class FabricOrder {
            +String order_number
            +ForeignKey supplier -> FabricSupplier
            +ForeignKey fabric_category -> FabricCategory
            +Decimal quantity_meters
            +Decimal unit_price
            +Decimal total_price
            +String status
            +Date lab_dip_required_date
            +Date lab_dip_actual_date
            +Date lab_dip_approval_date
            +TextField lab_dip_notes
            +Date bulk_approved_date
            +ForeignKey bulk_approved_by -> User
            +Date onboard_date
            +Date eta_date
            +Date clearance_date
            +TextField notes
            +ForeignKey risk_level -> RiskLevel
            +TextField risk_notes
            +JSON date_owners
        }
        class FabricTolerance {
            +String customer_type
            +Decimal qty_from
            +Decimal qty_to
            +Decimal tolerance_pct
        }
        class FabricScheduleHandoff {
            +ForeignKey order -> FabricOrder
            +String date_key
            +String from_role
            +String to_role
            +String trigger
            +ForeignKey handed_off_by -> User
            +DateTime handed_off_at
            +TextField notes
        }
        class FabricUtilization {
            +ForeignKey order -> FabricOrder
            +String period
            +Decimal received_meters
            +Decimal used_meters
            +Decimal wasted_meters
            +Decimal damaged_meters
            +TextField notes
            +ForeignKey recorded_by -> User
            +DateTime recorded_at
        }
    }
    TimeStampedModel <|-- FabricCategory
    TimeStampedModel <|-- HTSCode
    TimeStampedModel <|-- FabricSupplier
    TimeStampedModel <|-- FabricMill
    TimeStampedModel <|-- RFQ
    TimeStampedModel <|-- RFQLineItem
    TimeStampedModel <|-- RFQResponse
    TimeStampedModel <|-- RFQResponseItem
    TimeStampedModel <|-- FabricBooking
    TimeStampedModel <|-- FabricOrder
    TimeStampedModel <|-- FabricTolerance
    TimeStampedModel <|-- FabricScheduleHandoff
    TimeStampedModel <|-- FabricUtilization

    FabricCategory "1" o-- "0..1" HTSCode
    FabricCategory "1" o-- "*" RFQLineItem
    FabricCategory "1" o-- "*" FabricOrder
    Vendor "1" o-- "0..1" FabricSupplier
    FabricSupplier "1" --> "*" RFQ
    RFQ "1" --> "*" RFQLineItem
    RFQ "1" --> "*" RFQResponse
    RFQResponse "1" --> "*" RFQResponseItem
    RFQLineItem "1" o-- "*" RFQResponseItem
    FabricSupplier "1" --> "*" FabricBooking
    FabricSupplier "1" --> "*" FabricOrder
    FabricOrder "1" --> "*" FabricScheduleHandoff
    FabricOrder "1" --> "*" FabricUtilization
    RiskLevel "1" o-- "*" FabricOrder
```

> RFQ workflow: `RFQ` → `RFQLineItem` ↔ `RFQResponse` → `RFQResponseItem` (per-line quotes).

---

## 5. Commercial & Finance (`commercial`)

```mermaid
classDiagram
    namespace commercial {
        class LC {
            +String lc_number
            +String lc_type
            +ForeignKey buyer -> Buyer
            +ForeignKey purchase_order -> PurchaseOrder
            +ForeignKey parent_lc -> LC
            +ForeignKey bank -> Bank
            +Decimal amount
            +ForeignKey currency -> Currency
            +Date issued_date
            +Date expiry_date
            +String status
            +Decimal utilized_amount
            +TextField remarks
        }
        class LCAmendment {
            +ForeignKey lc -> LC
            +Int amendment_number
            +Decimal amount_change
            +Date expiry_date_change
            +Int quantity_change
            +TextField reason
            +String status
            +ForeignKey approved_by -> User
            +DateTime approved_at
        }
        class Bank {
            +String code
            +String name
            +String swift_code
            +TextField address
            +String contact_person
            +String phone
            +String email
            +String status
        }
        class ProformaInvoice {
            +String pi_number
            +ForeignKey purchase_order -> PurchaseOrder
            +ForeignKey buyer -> Buyer
            +ForeignKey lc -> LC
            +Decimal amount
            +String currency
            +Date issued_date
            +Date validity_date
            +String status
            +TextField remarks
        }
        class SalesContract {
            +String contract_number
            +ForeignKey purchase_order -> PurchaseOrder
            +ForeignKey buyer -> Buyer
            +Date contract_date
            +Decimal total_amount
            +String currency
            +ForeignKey payment_terms -> PaymentTerms
            +String delivery_terms
            +String status
            +TextField remarks
        }
        class SalesConfirmation {
            +String confirmation_number
            +ForeignKey purchase_order -> PurchaseOrder
            +ForeignKey buyer -> Buyer
            +DateTime sent_at
            +DateTime disputed_at
            +DateTime accepted_at
            +String status
            +TextField dispute_reason
            +Boolean auto_accepted
            +TextField remarks
        }
        class DebitNote {
            +String debit_number
            +String debit_type
            +String party_type
            +String debited_party
            +ForeignKey purchase_order -> PurchaseOrder
            +ForeignKey reconciliation -> FinalHitReconciliation
            +Decimal amount
            +ForeignKey currency -> Currency
            +Decimal shortage_units
            +Decimal tolerance_pct
            +TextField reason
            +String status
            +String compliance_email
            +Boolean compliance_email_sent
            +ForeignKey raised_by -> User
            +DateTime raised_at
            +DateTime issued_at
            +DateTime paid_at
        }
        class InvoiceApproval {
            +String invoice_number
            +String invoice_type
            +ForeignKey purchase_order -> PurchaseOrder
            +Date invoice_date
            +Decimal quantity
            +Decimal unit_price
            +Decimal amount
            +ForeignKey currency -> Currency
            +String status
            +TextField rejection_reason
            +OneToOne debit_note -> DebitNote
            +ForeignKey approved_by -> User
            +DateTime approved_at
            +ForeignKey rejected_by -> User
            +DateTime rejected_at
        }
    }
    TimeStampedModel <|-- LC
    TimeStampedModel <|-- LCAmendment
    TimeStampedModel <|-- Bank
    TimeStampedModel <|-- ProformaInvoice
    TimeStampedModel <|-- SalesContract
    TimeStampedModel <|-- SalesConfirmation
    TimeStampedModel <|-- DebitNote
    TimeStampedModel <|-- InvoiceApproval

    LC "1" --> "*" LCAmendment
    LC "1" o-- "0..1" LC : parent_lc
    Bank "1" o-- "*" LC
    LC "1" o-- "0..1" ProformaInvoice
    PurchaseOrder "1" o-- "0..1" ProformaInvoice
    PurchaseOrder "1" o-- "0..1" SalesContract
    PurchaseOrder "1" o-- "0..1" SalesConfirmation
    PurchaseOrder "1" o-- "*" DebitNote
    PurchaseOrder "1" o-- "*" InvoiceApproval
    FinalHitReconciliation "1" o-- "*" DebitNote
    DebitNote "1" o-- "0..1" InvoiceApproval : debit_note
```

> `InvoiceApproval.debit_note` is a **one-to-one**; a rejected invoice may create a linked
> `DebitNote`. `DebitNote.reconciliation` ties shortages to `FinalHitReconciliation` (logistics).

---

## 6. Production (`production`)

```mermaid
classDiagram
    namespace production {
        class ProductionPlan {
            +ForeignKey purchase_order -> PurchaseOrder
            +ForeignKey factory -> Factory
            +Date plan_date
            +Date start_date
            +Date end_date
            +Int quantity
            +String status
            +TextField remarks
        }
        class DailyProduction {
            +ForeignKey factory -> Factory
            +ForeignKey purchase_order -> PurchaseOrder
            +Date production_date
            +Int line_number
            +Int target_quantity
            +Int actual_quantity
            +Int passed_quantity
            +Int rejected_quantity
            +Decimal efficiency
            +Decimal dhu
            +Int manpower
            +Decimal working_hours
            +String status
        }
    }
    TimeStampedModel <|-- ProductionPlan
    TimeStampedModel <|-- DailyProduction

    PurchaseOrder "1" o-- "*" ProductionPlan
    Factory "1" o-- "*" ProductionPlan
    PurchaseOrder "1" --> "*" DailyProduction
    Factory "1" --> "*" DailyProduction
```

---

## 7. Quality & Compliance (`quality`)

```mermaid
classDiagram
    namespace quality {
        class Inspection {
            +ForeignKey purchase_order -> PurchaseOrder
            +ForeignKey factory -> Factory
            +String inspection_type
            +Date inspection_date
            +ForeignKey inspector -> User
            +Decimal aql_level
            +Int sample_size
            +Int passed_quantity
            +Int rejected_quantity
            +String status
            +TextField remarks
        }
        class InspectionItem {
            +ForeignKey inspection -> Inspection
            +String defect_type
            +Int defect_count
            +String severity
            +TextField description
            +URL image_url
        }
        class CorrectiveAction {
            +ForeignKey inspection -> Inspection
            +String title
            +TextField description
            +TextField root_cause
            +TextField corrective_measure
            +TextField preventive_measure
            +ForeignKey assigned_to -> User
            +Date due_date
            +Date completed_date
            +String priority
            +String status
            +ForeignKey verified_by -> User
            +DateTime verified_at
        }
        class GoldSeal {
            +ForeignKey shipment -> Shipment
            +String status
            +Date sent_date
            +Date approval_date
            +TextField notes
        }
        class ComplianceAudit {
            +ForeignKey purchase_order -> PurchaseOrder
            +Date week_start
            +Decimal efficiency_rate
            +String fabric_paperwork_status
            +String dockets_status
            +String fabric_utilisation_status
            +String factory_invoice_status
            +String fabric_rating_status
            +String recon_costed_vs_actual_status
            +String final_hits_status
            +TextField notes
        }
    }
    TimeStampedModel <|-- Inspection
    TimeStampedModel <|-- InspectionItem
    TimeStampedModel <|-- CorrectiveAction
    TimeStampedModel <|-- GoldSeal
    TimeStampedModel <|-- ComplianceAudit

    PurchaseOrder "1" --> "*" Inspection
    Factory "1" o-- "*" Inspection
    Inspection "1" --> "*" InspectionItem
    Inspection "1" --> "*" CorrectiveAction
    PurchaseOrder "1" o-- "*" ComplianceAudit
    Shipment "1" o-- "0..1" GoldSeal
```

> `ComplianceAudit` aggregates the 8 weekly status checks (fabric paperwork, dockets,
> utilisation, factory invoice, fabric rating, recon vs actual, final hits).

---

## 8. Logistics (`logistics`)

```mermaid
classDiagram
    namespace logistics {
        class FreightForwarder {
            +String name
            +String code
            +String contact_person
            +String email
            +String phone
            +TextField address
            +String country
            +TextField notes
        }
        class Shipment {
            +String shipment_number
            +ForeignKey purchase_order -> PurchaseOrder
            +ForeignKey factory -> Factory
            +ForeignKey freight_forwarder -> FreightForwarder
            +String mode
            +String status
            +Date booking_date
            +String booking_reference
            +Date booking_ref_required_date
            +Date etd
            +Date eta
            +Date atd
            +Date ata
            +String port_of_loading
            +String port_of_discharge
            +String vessel_name
            +String voyage_number
            +String container_number
            +String seal_number
            +String container_size
            +Decimal quantity
            +Decimal weight_kg
            +Decimal cbm
            +TextField marks
            +TextField remarks
            +ForeignKey risk_level -> RiskLevel
        }
        class BookingScheduleItem {
            +ForeignKey shipment -> Shipment
            +ForeignKey hit -> Hit
            +String status
            +Decimal cut_qty
            +Decimal garments_ready_qty
            +Date ex_factory_date
            +TextField ex_factory_notes
            +ForeignKey risk_level -> RiskLevel
            +Date week_ending
            +TextField notes
        }
        class ShippingDocument {
            +ForeignKey shipment -> Shipment
            +String document_type
            +String document_number
            +Date document_date
            +File file
            +TextField notes
        }
        class Docket {
            +String docket_number
            +ForeignKey shipment -> Shipment
            +Decimal contract_price
            +Date date_raised
            +Date delivery_date
            +Decimal total_fabric_meters
            +Decimal unused_fabric_meters
            +Boolean is_final
            +Boolean sales_notified
            +DateTime sales_notified_at
            +TextField notes
        }
        class FinalHitReconciliation {
            +ForeignKey shipment -> Shipment
            +ForeignKey schedule_item -> BookingScheduleItem
            +Decimal docket_quantity
            +Decimal shipped_quantity
            +Decimal shortage_units
            +Boolean reasons_evident
            +TextField notes
            +String status
            +DateTime reconciled_at
            +ForeignKey reconciled_by -> User
        }
    }
    TimeStampedModel <|-- FreightForwarder
    TimeStampedModel <|-- Shipment
    TimeStampedModel <|-- BookingScheduleItem
    TimeStampedModel <|-- ShippingDocument
    TimeStampedModel <|-- Docket
    TimeStampedModel <|-- FinalHitReconciliation

    PurchaseOrder "1" --> "*" Shipment
    FreightForwarder "1" o-- "*" Shipment
    Shipment "1" --> "*" BookingScheduleItem
    Hit "1" o-- "*" BookingScheduleItem
    Shipment "1" --> "*" ShippingDocument
    Shipment "1" --> "*" Docket
    Shipment "1" --> "*" FinalHitReconciliation
    BookingScheduleItem "1" o-- "*" FinalHitReconciliation
    RiskLevel "1" o-- "*" Shipment
    RiskLevel "1" o-- "*" BookingScheduleItem
```

> `BookingScheduleItem` links each shipment line to a `Hit`; `FinalHitReconciliation` compares
> docket vs shipped quantity and feeds shortage-driven `DebitNote`s in commercial.

---

## 9. Monitoring & Reporting (`monitoring`, `reporting`)

```mermaid
classDiagram
    namespace monitoring {
        class AuditLog {
            +String entity_type
            +String entity_id
            +String entity_name
            +String action
            +TextField description
            +ForeignKey user -> User
            +IP ip_address
            +TextField user_agent
            +JSON old_value
            +JSON new_value
        }
        class SystemHealth {
            +String service
            +String status
            +Int response_time_ms
            +TextField message
            +DateTime checked_at
        }
        class Alert {
            +String alert_type
            +String service
            +String title
            +TextField message
            +String entity_type
            +String entity_id
            +Boolean is_read
            +Boolean is_resolved
            +ForeignKey resolved_by -> User
            +DateTime resolved_at
        }
    }
    namespace reporting {
        class SavedReport {
            +String name
            +String report_type
            +TextField description
            +JSON config
            +Boolean is_scheduled
            +ForeignKey created_by -> User
        }
    }
    TimeStampedModel <|-- AuditLog
    TimeStampedModel <|-- SystemHealth
    TimeStampedModel <|-- Alert
    TimeStampedModel <|-- SavedReport
    User "1" o-- "*" Alert : resolved_by
```

---

## Appendix A — Model Inventory (by app)

| App | Models | Count |
|-----|--------|-------|
| `core` | `TimeStampedModel`, `TenantModel`, `Note` *(abstract)* | 3 |
| `tenants` | `Tenant`, `Office` | 2 |
| `users` | `User`, `PasswordHistory`, `Role`, `UserRole`, `Permission`, `RolePermission`, `AuditLog` | 7 |
| `authentication` | `MFABackupCode`, `MFASetupLog` | 2 |
| `setup` | `Season`, `ProductCategory`, `ProductType`, `ProductDepartment`, `ComplianceDocumentType`, `DeliveryMode`, `UOM`, `Currency`, `Department`, `Designation`, `PaymentTerms`, `Country`, `ColorCode`, `Buyer`, `Brand`, `Factory`, `Vendor`, `RiskLevel` | 18 |
| `merchandising` | `Style`, `StyleVersion`, `FileOpening`, `StockFabricAllocation`, `FileOpeningNote`, `PurchaseOrder`, `POAmendment`, `PurchaseOrderItem`, `Hit`, `FitSpec`, `BOM`, `BOMItem`, `StyleItem`, `DesignImage`, `Costing`, `CostingLine`, `TA`, `TAMilestone`, `JobRequest` | 19 |
| `fabric` | `FabricCategory`, `HTSCode`, `FabricSupplier`, `FabricMill`, `RFQ`, `RFQLineItem`, `RFQResponse`, `RFQResponseItem`, `FabricBooking`, `FabricOrder`, `FabricTolerance`, `FabricScheduleHandoff`, `FabricUtilization` | 13 |
| `commercial` | `LC`, `LCAmendment`, `Bank`, `ProformaInvoice`, `SalesContract`, `SalesConfirmation`, `DebitNote`, `InvoiceApproval` | 8 |
| `production` | `ProductionPlan`, `DailyProduction` | 2 |
| `quality` | `Inspection`, `InspectionItem`, `CorrectiveAction`, `GoldSeal`, `ComplianceAudit` | 5 |
| `logistics` | `FreightForwarder`, `Shipment`, `BookingScheduleItem`, `ShippingDocument`, `Docket`, `FinalHitReconciliation` | 6 |
| `monitoring` | `AuditLog`, `SystemHealth`, `Alert` | 3 |
| `reporting` | `SavedReport` | 1 |
| **Total (business models)** | | **86** |

---

*Generated from live Django model introspection. Regenerate after model changes with:*
`python manage.py shell -c "from django.apps import apps; [print(m.__module__, m.__name__) for app in apps.get_app_configs() for m in app.get_models()]"`
