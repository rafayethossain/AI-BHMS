# Data Model
# BHMS - Buying House Management System

---

## Table of Contents

1. [Entity Relationship Overview](#1-entity-relationship-overview)
2. [Core Entities](#2-core-entities)
3. [Master Data Entities](#3-master-data-entities)
4. [Merchandising Entities](#4-merchandising-entities)
5. [Commercial Entities](#5-commercial-entities)
6. [Production Entities](#6-production-entities)
7. [Quality Entities](#7-quality-entities)
8. [Logistics Entities](#8-logistics-entities)
9. [Finance Entities](#9-finance-entities)
10. [Indexing Strategy](#10-indexing-strategy)

---

## 1. Entity Relationship Overview

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
│      ├─> Style ──┬──> TechPack ──> TechPackRevision                  │    │
│      │           ├──> BOM ──> BOMItem                                 │    │
│      │           └──> POM                                             │    │
│      │                                                                 │    │
│      ├─> Order ──┬──> OrderItem                                      │    │
│      │           ├──> Costing ──> CostingItem                        │    │
│      │           ├──> TA (Time & Action) ──> TAMilestone             │    │
│      │           └──> Shipment ──┬──> PackingList                    │    │
│      │                          ├──> Invoice                         │    │
│      │                          └──> BillOfLading                    │    │
│      │                                                                 │    │
│      ├─> PurchaseOrder ──┬──> POItem                                 │    │
│      │                   └──> GoodsReceipt ──> GoodsReceiptItem      │    │
│      │                                                                 │    │
│      ├─> LC ──┬──> LCItem                                            │    │
│      │        └──> LCAmendment                                       │    │
│      │                                                                 │    │
│      ├─> Inventory ──┬──> StockMovement                              │    │
│      │               └──> VirtualStock                               │    │
│      │                                                                 │    │
│      ├─> Production ──┬──> ProductionPlan                            │    │
│      │                ├──> DailyProduction                           │    │
│      │                └──> LinePerformance                           │    │
│      │                                                                 │    │
│      └─> Finance ──┬──> ChartOfAccounts                              │    │
│                    ├──> Voucher ──> VoucherItem                      │    │
│                    └──> JournalEntry                                 │    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Entities

### 2.1 Tenant

```sql
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    database_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    plan VARCHAR(50) DEFAULT 'starter',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);
```

### 2.2 User

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    designation VARCHAR(100),
    department VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    last_login TIMESTAMP,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(tenant_id, email)
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
```

### 2.3 Role

```sql
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(tenant_id, name)
);

CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    role_id UUID NOT NULL REFERENCES roles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    UNIQUE(user_id, role_id)
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    UNIQUE(module, action)
);

CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id),
    permission_id UUID NOT NULL REFERENCES permissions(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);
```

### 2.4 Audit Log

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
```

---

## 3. Master Data Entities

### 3.1 Buyer

```sql
CREATE TABLE buyers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    country_id UUID REFERENCES countries(id),
    currency_id UUID REFERENCES currencies(id),
    payment_terms_id UUID REFERENCES payment_terms(id),
    credit_limit DECIMAL(15,2),
    status VARCHAR(20) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(tenant_id, code)
);

CREATE INDEX idx_buyers_tenant ON buyers(tenant_id);
CREATE INDEX idx_buyers_code ON buyers(code);
CREATE INDEX idx_buyers_status ON buyers(status);
```

### 3.2 Brand

```sql
CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    buyer_id UUID NOT NULL REFERENCES buyers(id),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(tenant_id, code)
);

CREATE INDEX idx_brands_tenant ON brands(tenant_id);
CREATE INDEX idx_brands_buyer ON brands(buyer_id);
```

### 3.3 Factory

```sql
CREATE TABLE factories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    country_id UUID REFERENCES countries(id),
    capacity INT,
    capacity_unit VARCHAR(50),
    factory_type VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(tenant_id, code)
);

CREATE INDEX idx_factories_tenant ON factories(tenant_id);
CREATE INDEX idx_factories_code ON factories(code);
CREATE INDEX idx_factories_status ON factories(status);
```

### 3.4 Vendor

```sql
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    country_id UUID REFERENCES countries(id),
    product_categories TEXT[],
    payment_terms_id UUID REFERENCES payment_terms(id),
    lead_time_days INT,
    rating DECIMAL(3,2),
    status VARCHAR(20) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(tenant_id, code)
);

CREATE INDEX idx_vendors_tenant ON vendors(tenant_id);
CREATE INDEX idx_vendors_code ON vendors(code);
CREATE INDEX idx_vendors_status ON vendors(status);
```

### 3.5 Style

```sql
CREATE TABLE styles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    buyer_id UUID NOT NULL REFERENCES buyers(id),
    brand_id UUID REFERENCES brands(id),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES product_categories(id),
    type_id UUID REFERENCES product_types(id),
    season_id UUID REFERENCES seasons(id),
    status VARCHAR(20) DEFAULT 'draft',
    version INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(tenant_id, code)
);

CREATE INDEX idx_styles_tenant ON styles(tenant_id);
CREATE INDEX idx_styles_buyer ON styles(buyer_id);
CREATE INDEX idx_styles_code ON styles(code);
CREATE INDEX idx_styles_status ON styles(status);
```

### 3.6 Product Category

```sql
CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    parent_id UUID REFERENCES product_categories(id),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(tenant_id, code)
);

CREATE INDEX idx_product_categories_tenant ON product_categories(tenant_id);
```

---

## 4. Merchandising Entities

### 4.1 Style

```sql
CREATE TABLE styles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    style_number VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    buyer_id UUID NOT NULL REFERENCES buyers(id),
    brand_id UUID REFERENCES brands(id),
    category_id UUID REFERENCES product_categories(id),
    type_id UUID REFERENCES product_types(id),
    department_id UUID REFERENCES product_departments(id),
    season_id UUID REFERENCES seasons(id),
    tech_pack VARCHAR(500),
    sketch_front VARCHAR(500),
    sketch_back VARCHAR(500),
    sketch_side VARCHAR(500),
    sketch_detail VARCHAR(500),
    status VARCHAR(20) DEFAULT 'draft',
    current_version INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(tenant_id, style_number)
);

CREATE INDEX idx_styles_tenant ON styles(tenant_id);
CREATE INDEX idx_styles_buyer ON styles(buyer_id);
CREATE INDEX idx_styles_style_number ON styles(style_number);
CREATE INDEX idx_styles_status ON styles(status);
```

### 4.2 Style Version

```sql
CREATE TABLE style_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    style_id UUID NOT NULL REFERENCES styles(id),
    version_number INT NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    revision_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    UNIQUE(style_id, version_number)
);

CREATE INDEX idx_style_versions_tenant ON style_versions(tenant_id);
CREATE INDEX idx_style_versions_style ON style_versions(style_id);
```

### 4.3 File Opening

```sql
CREATE TABLE file_openings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    file_number VARCHAR(50) NOT NULL,
    style_id UUID NOT NULL REFERENCES styles(id),
    style_version_id UUID NOT NULL REFERENCES style_versions(id),
    buyer_id UUID NOT NULL REFERENCES buyers(id),
    brand_id UUID REFERENCES brands(id),
    factory_id UUID NOT NULL REFERENCES factories(id),
    file_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'open',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(tenant_id, file_number)
);

CREATE INDEX idx_file_openings_tenant ON file_openings(tenant_id);
CREATE INDEX idx_file_openings_style ON file_openings(style_id);
CREATE INDEX idx_file_openings_buyer ON file_openings(buyer_id);
CREATE INDEX idx_file_openings_factory ON file_openings(factory_id);
CREATE INDEX idx_file_openings_status ON file_openings(status);
```

### 4.4 Purchase Order (PO)

```sql
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    po_number VARCHAR(50) NOT NULL,
    file_opening_id UUID NOT NULL REFERENCES file_openings(id),
    buyer_id UUID NOT NULL REFERENCES buyers(id),
    brand_id UUID REFERENCES brands(id),
    factory_id UUID NOT NULL REFERENCES factories(id),
    po_date DATE NOT NULL,
    delivery_date DATE NOT NULL,
    destination_country_id UUID REFERENCES countries(id),
    destination_port VARCHAR(255),
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_value DECIMAL(15,2) NOT NULL,
    currency_id UUID REFERENCES currencies(id),
    payment_terms_id UUID REFERENCES payment_terms(id),
    delivery_mode VARCHAR(50),
    status VARCHAR(20) DEFAULT 'open',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(tenant_id, po_number)
);

CREATE INDEX idx_purchase_orders_tenant ON purchase_orders(tenant_id);
CREATE INDEX idx_purchase_orders_file_opening ON purchase_orders(file_opening_id);
CREATE INDEX idx_purchase_orders_buyer ON purchase_orders(buyer_id);
CREATE INDEX idx_purchase_orders_factory ON purchase_orders(factory_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_delivery_date ON purchase_orders(delivery_date);
```

### 4.5 Purchase Order Item

```sql
CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id),
    color_id UUID NOT NULL REFERENCES colors(id),
    size VARCHAR(50),
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_purchase_order_items_po ON purchase_order_items(purchase_order_id);
```

### 4.6 T&A

```sql
CREATE TABLE tas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id),
    status VARCHAR(20) DEFAULT 'active',
    delivery_date DATE NOT NULL,
    critical_path JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    UNIQUE(purchase_order_id)
);

CREATE INDEX idx_tas_tenant ON tas(tenant_id);
CREATE INDEX idx_tas_po ON tas(purchase_order_id);
CREATE INDEX idx_tas_status ON tas(status);
```

### 4.7 T&A Milestone

```sql
CREATE TABLE ta_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ta_id UUID NOT NULL REFERENCES tas(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    planned_date DATE NOT NULL,
    actual_date DATE,
    status VARCHAR(20) DEFAULT 'pending',
    assigned_to UUID REFERENCES users(id),
    is_critical BOOLEAN DEFAULT FALSE,
    sort_order INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_ta_milestones_ta ON ta_milestones(ta_id);
CREATE INDEX idx_ta_milestones_status ON ta_milestones(status);
```

### 4.8 Costing

```sql
CREATE TABLE costings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id),
    version INT DEFAULT 1,
    status VARCHAR(20) DEFAULT 'draft',
    target_price DECIMAL(10,2),
    fabric_cost DECIMAL(10,2),
    trim_cost DECIMAL(10,2),
    cm_cost DECIMAL(10,2),
    overhead_cost DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    margin DECIMAL(5,2),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_costings_tenant ON costings(tenant_id);
CREATE INDEX idx_costings_po ON costings(purchase_order_id);
CREATE INDEX idx_costings_version ON costings(version);
```

### 4.9 BOM

```sql
CREATE TABLE boms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    style_version_id UUID NOT NULL REFERENCES style_versions(id),
    name VARCHAR(255) NOT NULL,
    version INT DEFAULT 1,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    UNIQUE(style_version_id, version)
);

CREATE TABLE bom_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bom_id UUID NOT NULL REFERENCES boms(id),
    category VARCHAR(50) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    uom_id UUID REFERENCES uoms(id),
    consumption DECIMAL(10,4),
    waste_percent DECIMAL(5,2),
    unit_price DECIMAL(10,2),
    vendor_id UUID REFERENCES vendors(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_boms_tenant ON boms(tenant_id);
CREATE INDEX idx_boms_style_version ON boms(style_version_id);
CREATE INDEX idx_bom_items_bom ON bom_items(bom_id);
```

---

## 5. Commercial Entities

### 5.1 LC (Letter of Credit)

```sql
CREATE TABLE lcs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    lc_number VARCHAR(50) NOT NULL,
    lc_type VARCHAR(20) NOT NULL,
    buyer_id UUID REFERENCES buyers(id),
    order_id UUID REFERENCES orders(id),
    parent_lc_id UUID REFERENCES lcs(id),
    bank_id UUID REFERENCES banks(id),
    amount DECIMAL(15,2) NOT NULL,
    currency_id UUID REFERENCES currencies(id),
    issued_date DATE,
    expiry_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    utilized_amount DECIMAL(15,2) DEFAULT 0,
    balance_amount DECIMAL(15,2) GENERATED ALWAYS AS (amount - utilized_amount) STORED,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(tenant_id, lc_number)
);

CREATE INDEX idx_lcs_tenant ON lcs(tenant_id);
CREATE INDEX idx_lcs_buyer ON lcs(buyer_id);
CREATE INDEX idx_lcs_order ON lcs(order_id);
CREATE INDEX idx_lcs_status ON lcs(status);
CREATE INDEX idx_lcs_expiry ON lcs(expiry_date);
```

### 5.2 LC Amendment

```sql
CREATE TABLE lc_amendments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lc_id UUID NOT NULL REFERENCES lcs(id),
    amendment_number INT NOT NULL,
    amount_change DECIMAL(15,2),
    expiry_date_change DATE,
    quantity_change INT,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_lc_amendments_lc ON lc_amendments(lc_id);
```

### 5.3 Bank

```sql
CREATE TABLE banks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    swift_code VARCHAR(20),
    address TEXT,
    contact_person VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(tenant_id, code)
);

CREATE INDEX idx_banks_tenant ON banks(tenant_id);
```

---

## 6. Production Entities

### 6.1 Production Plan

```sql
CREATE TABLE production_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    order_id UUID NOT NULL REFERENCES orders(id),
    factory_id UUID NOT NULL REFERENCES factories(id),
    plan_date DATE NOT NULL,
    start_date DATE,
    end_date DATE,
    quantity INT NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_production_plans_tenant ON production_plans(tenant_id);
CREATE INDEX idx_production_plans_order ON production_plans(order_id);
CREATE INDEX idx_production_plans_factory ON production_plans(factory_id);
```

### 6.2 Daily Production

```sql
CREATE TABLE daily_productions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    factory_id UUID NOT NULL REFERENCES factories(id),
    order_id UUID NOT NULL REFERENCES orders(id),
    production_date DATE NOT NULL,
    line_number INT,
    target_quantity INT,
    actual_quantity INT,
    passed_quantity INT,
    rejected_quantity INT,
    efficiency DECIMAL(5,2),
    dhu DECIMAL(5,2),
    manpower INT,
    working_hours DECIMAL(5,2),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_daily_productions_tenant ON daily_productions(tenant_id);
CREATE INDEX idx_daily_productions_factory ON daily_productions(factory_id);
CREATE INDEX idx_daily_productions_order ON daily_productions(order_id);
CREATE INDEX idx_daily_productions_date ON daily_productions(production_date);
```

---

## 7. Quality Entities

### 7.1 Inspection

```sql
CREATE TABLE inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    order_id UUID NOT NULL REFERENCES orders(id),
    factory_id UUID NOT NULL REFERENCES factories(id),
    inspection_type VARCHAR(50) NOT NULL,
    inspection_date DATE NOT NULL,
    inspector_id UUID REFERENCES users(id),
    aql_level DECIMAL(3,1),
    sample_size INT,
    passed_quantity INT,
    rejected_quantity INT,
    status VARCHAR(20) DEFAULT 'pending',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_inspections_tenant ON inspections(tenant_id);
CREATE INDEX idx_inspections_order ON inspections(order_id);
CREATE INDEX idx_inspections_factory ON inspections(factory_id);
CREATE INDEX idx_inspections_status ON inspections(status);
```

### 7.2 Inspection Item

```sql
CREATE TABLE inspection_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id UUID NOT NULL REFERENCES inspections(id),
    defect_type VARCHAR(100) NOT NULL,
    defect_count INT NOT NULL,
    severity VARCHAR(20),
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inspection_items_inspection ON inspection_items(inspection_id);
```

---

## 8. Logistics Entities

### 8.1 Shipment

```sql
CREATE TABLE shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    shipment_number VARCHAR(50) NOT NULL,
    order_id UUID NOT NULL REFERENCES orders(id),
    lc_id UUID REFERENCES lcs(id),
    freight_forwarder_id UUID REFERENCES freight_forwarders(id),
    shipping_line VARCHAR(255),
    vessel_name VARCHAR(255),
    voyage_number VARCHAR(50),
    container_number VARCHAR(50),
    container_size VARCHAR(20),
    port_of_loading VARCHAR(255),
    port_of_discharge VARCHAR(255),
    etd DATE,
    eta DATE,
    atd DATE,
    ata DATE,
    status VARCHAR(20) DEFAULT 'booked',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(tenant_id, shipment_number)
);

CREATE INDEX idx_shipments_tenant ON shipments(tenant_id);
CREATE INDEX idx_shipments_order ON shipments(order_id);
CREATE INDEX idx_shipments_lc ON shipments(lc_id);
CREATE INDEX idx_shipments_status ON shipments(status);
```

### 8.2 Freight Forwarder

```sql
CREATE TABLE freight_forwarders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(tenant_id, code)
);

CREATE INDEX idx_freight_forwarders_tenant ON freight_forwarders(tenant_id);
```

---

## 9. Finance Entities

### 9.1 Chart of Accounts

```sql
CREATE TABLE chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    parent_id UUID REFERENCES chart_of_accounts(id),
    is_group BOOLEAN DEFAULT FALSE,
    currency_id UUID REFERENCES currencies(id),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(tenant_id, code)
);

CREATE INDEX idx_chart_of_accounts_tenant ON chart_of_accounts(tenant_id);
CREATE INDEX idx_chart_of_accounts_type ON chart_of_accounts(account_type);
```

### 9.2 Voucher

```sql
CREATE TABLE vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    voucher_number VARCHAR(50) NOT NULL,
    voucher_type VARCHAR(50) NOT NULL,
    voucher_date DATE NOT NULL,
    reference_type VARCHAR(100),
    reference_id UUID,
    total_debit DECIMAL(15,2) NOT NULL,
    total_credit DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    remarks TEXT,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    UNIQUE(tenant_id, voucher_number)
);

CREATE TABLE voucher_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_id UUID NOT NULL REFERENCES vouchers(id),
    account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
    debit DECIMAL(15,2) DEFAULT 0,
    credit DECIMAL(15,2) DEFAULT 0,
    description TEXT,
    cost_center_id UUID REFERENCES cost_centers(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vouchers_tenant ON vouchers(tenant_id);
CREATE INDEX idx_vouchers_type ON vouchers(voucher_type);
CREATE INDEX idx_vouchers_date ON vouchers(voucher_date);
CREATE INDEX idx_voucher_items_voucher ON voucher_items(voucher_id);
CREATE INDEX idx_voucher_items_account ON voucher_items(account_id);
```

---

## 10. Indexing Strategy

### 10.1 Indexing Principles

| Principle | Description |
|-----------|-------------|
| Primary Keys | UUID for all entities |
| Foreign Keys | Index all foreign key columns |
| Common Filters | Index frequently filtered columns |
| Date Columns | Index date columns used in range queries |
| Composite Indexes | Create composite indexes for common query patterns |
| Partial Indexes | Use partial indexes for filtered queries |

### 10.2 Performance Considerations

| Consideration | Recommendation |
|---------------|----------------|
| Connection Pooling | Use connection pooling (PgBouncer) |
| Read Replicas | Use read replicas for reporting |
| Partitioning | Partition large tables by tenant or date |
| Archival | Archive old data to separate tables |
| Caching | Cache frequently accessed data in Redis |

---

*This data model should be reviewed by Database Architect before implementation.*
