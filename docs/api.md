# BHMS API Documentation

## Base URL

```
Development: http://localhost:8000/api/v1
Production:  https://api.bhms.com/v1
```

## Authentication

All endpoints require JWT authentication unless marked as public.

**Header:**
```
Authorization: Bearer {access_token}
```

### Login

```http
POST /api/v1/auth/login/
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access": "eyJhbGciOiJIUzI1NiIs...",
  "refresh": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

### Refresh Token

```http
POST /api/v1/auth/refresh/
Content-Type: application/json

{
  "refresh": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

## Setup Module

### Seasons

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/setup/seasons/` | List seasons |
| POST | `/api/v1/setup/seasons/` | Create season |
| GET | `/api/v1/setup/seasons/{id}/` | Get season |
| PUT | `/api/v1/setup/seasons/{id}/` | Update season |
| DELETE | `/api/v1/setup/seasons/{id}/` | Delete season |

### Buyers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/setup/buyers/` | List buyers |
| POST | `/api/v1/setup/buyers/` | Create buyer |
| GET | `/api/v1/setup/buyers/{id}/` | Get buyer |
| PUT | `/api/v1/setup/buyers/{id}/` | Update buyer |
| DELETE | `/api/v1/setup/buyers/{id}/` | Delete buyer |
| GET | `/api/v1/setup/buyers/{id}/brands/` | Get buyer brands |

### Brands

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/setup/brands/` | List brands |
| POST | `/api/v1/setup/brands/` | Create brand |
| GET | `/api/v1/setup/brands/{id}/` | Get brand |
| PUT | `/api/v1/setup/brands/{id}/` | Update brand |
| DELETE | `/api/v1/setup/brands/{id}/` | Delete brand |

### Factories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/setup/factories/` | List factories |
| POST | `/api/v1/setup/factories/` | Create factory |
| GET | `/api/v1/setup/factories/{id}/` | Get factory |
| PUT | `/api/v1/setup/factories/{id}/` | Update factory |
| DELETE | `/api/v1/setup/factories/{id}/` | Delete factory |

### Currencies

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/setup/currencies/` | List currencies |
| POST | `/api/v1/setup/currencies/` | Create currency |
| GET | `/api/v1/setup/currencies/{id}/` | Get currency |
| PUT | `/api/v1/setup/currencies/{id}/` | Update currency |
| DELETE | `/api/v1/setup/currencies/{id}/` | Delete currency |

### Countries

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/setup/countries/` | List countries |
| POST | `/api/v1/setup/countries/` | Create country |
| GET | `/api/v1/setup/countries/{id}/` | Get country |
| PUT | `/api/v1/setup/countries/{id}/` | Update country |
| DELETE | `/api/v1/setup/countries/{id}/` | Delete country |

### Product Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/setup/product-categories/` | List categories |
| POST | `/api/v1/setup/product-categories/` | Create category |
| GET | `/api/v1/setup/product-categories/{id}/` | Get category |
| PUT | `/api/v1/setup/product-categories/{id}/` | Update category |
| DELETE | `/api/v1/setup/product-categories/{id}/` | Delete category |

### Color Codes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/setup/color-codes/` | List colors |
| POST | `/api/v1/setup/color-codes/` | Create color |
| GET | `/api/v1/setup/color-codes/{id}/` | Get color |
| PUT | `/api/v1/setup/color-codes/{id}/` | Update color |
| DELETE | `/api/v1/setup/color-codes/{id}/` | Delete color |

### UOM (Unit of Measure)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/setup/uoms/` | List UOMs |
| POST | `/api/v1/setup/uoms/` | Create UOM |
| GET | `/api/v1/setup/uoms/{id}/` | Get UOM |
| PUT | `/api/v1/setup/uoms/{id}/` | Update UOM |
| DELETE | `/api/v1/setup/uoms/{id}/` | Delete UOM |

### Vendors

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/setup/vendors/` | List vendors |
| POST | `/api/v1/setup/vendors/` | Create vendor |
| GET | `/api/v1/setup/vendors/{id}/` | Get vendor |
| PUT | `/api/v1/setup/vendors/{id}/` | Update vendor |
| DELETE | `/api/v1/setup/vendors/{id}/` | Delete vendor |

### Payment Terms

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/setup/payment-terms/` | List payment terms |
| POST | `/api/v1/setup/payment-terms/` | Create payment term |
| GET | `/api/v1/setup/payment-terms/{id}/` | Get payment term |
| PUT | `/api/v1/setup/payment-terms/{id}/` | Update payment term |
| DELETE | `/api/v1/setup/payment-terms/{id}/` | Delete payment term |

### Delivery Modes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/setup/delivery-modes/` | List delivery modes |
| POST | `/api/v1/setup/delivery-modes/` | Create delivery mode |
| GET | `/api/v1/setup/delivery-modes/{id}/` | Get delivery mode |
| PUT | `/api/v1/setup/delivery-modes/{id}/` | Update delivery mode |
| DELETE | `/api/v1/setup/delivery-modes/{id}/` | Delete delivery mode |

### Import

```http
POST /api/v1/setup/import/?entity=buyers
Content-Type: multipart/form-data

file: buyers.csv
```

**Supported entities:** buyers, brands, factories, currencies, countries, seasons, vendors, color-codes, uoms, product-categories, payment-terms, delivery-modes, departments

---

## Merchandising Module

### Styles

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/merchandising/styles/` | List styles |
| POST | `/api/v1/merchandising/styles/` | Create style |
| GET | `/api/v1/merchandising/styles/{id}/` | Get style |
| PUT | `/api/v1/merchandising/styles/{id}/` | Update style |
| DELETE | `/api/v1/merchandising/styles/{id}/` | Delete style |
| POST | `/api/v1/merchandising/styles/{id}/transition/` | Transition status |
| POST | `/api/v1/merchandising/styles/{id}/upload-tech-pack/` | Upload tech pack |
| GET | `/api/v1/merchandising/styles/{id}/versions/` | Get versions |
| GET | `/api/v1/merchandising/styles/{id}/file_openings/` | Get file openings |

**Style Transition Flow:**
```
draft -> active -> approved -> in_production -> completed
         \-> cancelled
```

### Style Versions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/merchandising/style-versions/` | List versions |
| POST | `/api/v1/merchandising/style-versions/` | Create version |
| GET | `/api/v1/merchandising/style-versions/{id}/` | Get version |
| PUT | `/api/v1/merchandising/style-versions/{id}/` | Update version |
| DELETE | `/api/v1/merchandising/style-versions/{id}/` | Delete version |

### File Openings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/merchandising/file-openings/` | List file openings |
| POST | `/api/v1/merchandising/file-openings/` | Create file opening |
| GET | `/api/v1/merchandising/file-openings/{id}/` | Get file opening |
| PUT | `/api/v1/merchandising/file-openings/{id}/` | Update file opening |
| DELETE | `/api/v1/merchandising/file-openings/{id}/` | Delete file opening |
| GET | `/api/v1/merchandising/file-openings/{id}/purchase_orders/` | Get POs |

### Purchase Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/merchandising/purchase-orders/` | List POs |
| POST | `/api/v1/merchandising/purchase-orders/` | Create PO |
| GET | `/api/v1/merchandising/purchase-orders/{id}/` | Get PO |
| PUT | `/api/v1/merchandising/purchase-orders/{id}/` | Update PO |
| DELETE | `/api/v1/merchandising/purchase-orders/{id}/` | Delete PO |
| POST | `/api/v1/merchandising/purchase-orders/{id}/transition/` | Transition status |

**PO Transition Flow:**
```
draft -> confirmed -> in_production -> shipped -> delivered
         \-> cancelled
```

### BOMs (Bill of Materials)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/merchandising/boms/` | List BOMs |
| POST | `/api/v1/merchandising/boms/` | Create BOM with items |
| GET | `/api/v1/merchandising/boms/{id}/` | Get BOM |
| PUT | `/api/v1/merchandising/boms/{id}/` | Update BOM |
| DELETE | `/api/v1/merchandising/boms/{id}/` | Delete BOM |

### Costings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/merchandising/costings/` | List costings |
| POST | `/api/v1/merchandising/costings/` | Create costing |
| GET | `/api/v1/merchandising/costings/{id}/` | Get costing |
| PUT | `/api/v1/merchandising/costings/{id}/` | Update costing |
| DELETE | `/api/v1/merchandising/costings/{id}/` | Delete costing |
| POST | `/api/v1/merchandising/costings/{id}/approve/` | Approve costing |
| POST | `/api/v1/merchandising/costings/{id}/reject/` | Reject costing |
| GET | `/api/v1/merchandising/costings/{id}/export/` | Export CSV |

### T&A (Time & Action)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/merchandising/ta/` | List T&As |
| POST | `/api/v1/merchandising/ta/` | Create T&A |
| GET | `/api/v1/merchandising/ta/{id}/` | Get T&A |
| PUT | `/api/v1/merchandising/ta/{id}/` | Update T&A |
| GET | `/api/v1/merchandising/ta/{id}/milestones/` | Get milestones |
| POST | `/api/v1/merchandising/ta/{id}/milestones/` | Add milestone |
| GET | `/api/v1/merchandising/ta/calendar/` | Calendar view |

---

## Commercial Module

### Letters of Credit (LC)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/commercial/lcs/` | List LCs |
| POST | `/api/v1/commercial/lcs/` | Create LC |
| GET | `/api/v1/commercial/lcs/{id}/` | Get LC |
| PUT | `/api/v1/commercial/lcs/{id}/` | Update LC |
| DELETE | `/api/v1/commercial/lcs/{id}/` | Delete LC |
| POST | `/api/v1/commercial/lcs/{id}/amendments/` | Create amendment |
| GET | `/api/v1/commercial/lcs/{id}/utilization/` | Get utilization |

**LC Types:** master, b2b

**LC Status Flow:**
```
draft -> sent_to_bank -> received -> accepted -> utilized
                                \-> amended -> accepted
                                            \-> expired
                                            \-> cancelled
```

### LC Amendments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/commercial/lc-amendments/` | List amendments |
| POST | `/api/v1/commercial/lc-amendments/` | Create amendment |
| GET | `/api/v1/commercial/lc-amendments/{id}/` | Get amendment |
| PUT | `/api/v1/commercial/lc-amendments/{id}/` | Update amendment |
| DELETE | `/api/v1/commercial/lc-amendments/{id}/` | Delete amendment |

### Banks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/commercial/banks/` | List banks |
| POST | `/api/v1/commercial/banks/` | Create bank |
| GET | `/api/v1/commercial/banks/{id}/` | Get bank |
| PUT | `/api/v1/commercial/banks/{id}/` | Update bank |
| DELETE | `/api/v1/commercial/banks/{id}/` | Delete bank |

---

## Production Module

### Production Plans

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/production/plans/` | List plans |
| POST | `/api/v1/production/plans/` | Create plan |
| GET | `/api/v1/production/plans/{id}/` | Get plan |
| PUT | `/api/v1/production/plans/{id}/` | Update plan |
| DELETE | `/api/v1/production/plans/{id}/` | Delete plan |
| POST | `/api/v1/production/plans/{id}/start/` | Start plan |
| POST | `/api/v1/production/plans/{id}/complete/` | Complete plan |
| GET | `/api/v1/production/plans/{id}/export/` | Export CSV |
| GET | `/api/v1/production/plans/dashboard/` | Dashboard stats |

**Plan Status Flow:**
```
draft -> planned -> in_progress -> completed
```

### Daily Production

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/production/daily/` | List daily reports |
| POST | `/api/v1/production/daily/` | Create report |
| GET | `/api/v1/production/daily/{id}/` | Get report |
| PUT | `/api/v1/production/daily/{id}/` | Update report |
| DELETE | `/api/v1/production/daily/{id}/` | Delete report |
| POST | `/api/v1/production/daily/{id}/approve/` | Approve report |

**Auto-calculated fields:**
- `efficiency`: `(actual_quantity / target_quantity) * 100`
- `dhu`: `(rejected_quantity / actual_quantity) * 100`

---

## Quality Module

### Inspections

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/quality/inspections/` | List inspections |
| POST | `/api/v1/quality/inspections/` | Create inspection |
| GET | `/api/v1/quality/inspections/{id}/` | Get inspection |
| PUT | `/api/v1/quality/inspections/{id}/` | Update inspection |
| DELETE | `/api/v1/quality/inspections/{id}/` | Delete inspection |
| POST | `/api/v1/quality/inspections/{id}/start/` | Start inspection |
| POST | `/api/v1/quality/inspections/{id}/complete/` | Complete inspection |
| GET | `/api/v1/quality/inspections/{id}/export/` | Export CSV |

**Inspection Types:** inline, final, pre shipment

**Inspection Status Flow:**
```
pending -> in_progress -> passed (if reject_rate <= AQL)
                       -> failed (if reject_rate > AQL)
```

### Inspection Items

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/quality/inspection-items/` | List items |
| POST | `/api/v1/quality/inspection-items/` | Create item |
| GET | `/api/v1/quality/inspection-items/{id}/` | Get item |
| PUT | `/api/v1/quality/inspection-items/{id}/` | Update item |
| DELETE | `/api/v1/quality/inspection-items/{id}/` | Delete item |

**Severity Levels:** critical, major, minor

---

## Logistics Module

### Freight Forwarders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/logistics/freight-forwarders/` | List forwarders |
| POST | `/api/v1/logistics/freight-forwarders/` | Create forwarder |
| GET | `/api/v1/logistics/freight-forwarders/{id}/` | Get forwarder |
| PUT | `/api/v1/logistics/freight-forwarders/{id}/` | Update forwarder |
| DELETE | `/api/v1/logistics/freight-forwarders/{id}/` | Delete forwarder |

### Shipments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/logistics/shipments/` | List shipments |
| POST | `/api/v1/logistics/shipments/` | Create shipment |
| GET | `/api/v1/logistics/shipments/{id}/` | Get shipment |
| PUT | `/api/v1/logistics/shipments/{id}/` | Update shipment |
| DELETE | `/api/v1/logistics/shipments/{id}/` | Delete shipment |

**Container Sizes:** 20, 40, 40hc, 45

**Shipment Status Flow:**
```
booked -> document_pending -> document_ready -> container_loaded
  -> gate_in -> departed -> in_transit -> arrived -> cleared -> delivered
```

---

## Users Module

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users/` | List users |
| POST | `/api/v1/users/` | Create user |
| GET | `/api/v1/users/{id}/` | Get user |
| PUT | `/api/v1/users/{id}/` | Update user |
| DELETE | `/api/v1/users/{id}/` | Delete user |

### Roles

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users/roles/` | List roles |
| POST | `/api/v1/users/roles/` | Create role |
| GET | `/api/v1/users/roles/{id}/` | Get role |
| PUT | `/api/v1/users/roles/{id}/` | Update role |
| DELETE | `/api/v1/users/roles/{id}/` | Delete role |

### Permissions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users/permissions/` | List permissions |
| POST | `/api/v1/users/permissions/` | Create permission |
| GET | `/api/v1/users/permissions/{id}/` | Get permission |

---

## Monitoring Module

### Health Check (Public)

```http
GET /api/v1/monitoring/health/
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-15T10:30:00Z",
  "database": "ok"
}
```

### System Health (Authenticated)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/monitoring/health/` | List health checks |
| GET | `/api/v1/monitoring/health/{id}/` | Get health check |
| POST | `/api/v1/monitoring/health/run_checks/` | Run health checks |

### Audit Logs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/monitoring/audit-logs/` | List audit logs |
| GET | `/api/v1/monitoring/audit-logs/{id}/` | Get audit log |

**Actions:** create, update, delete, view, export, transition

### Alerts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/monitoring/alerts/` | List alerts |
| POST | `/api/v1/monitoring/alerts/` | Create alert |
| GET | `/api/v1/monitoring/alerts/{id}/` | Get alert |
| PUT | `/api/v1/monitoring/alerts/{id}/` | Update alert |
| DELETE | `/api/v1/monitoring/alerts/{id}/` | Delete alert |
| POST | `/api/v1/monitoring/alerts/{id}/resolve/` | Resolve alert |
| POST | `/api/v1/monitoring/alerts/{id}/mark_read/` | Mark as read |
| GET | `/api/v1/monitoring/alerts/summary/` | Alert summary |

**Alert Types:** info, warning, critical

**Alert Summary Response:**
```json
{
  "total": 10,
  "unread": 3,
  "unresolved": 5,
  "critical": 2,
  "warning": 3
}
```

---

## Query Parameters

All list endpoints support:

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | int | Page number |
| `page_size` | int | Items per page (max 100) |
| `search` | string | Search term |
| `ordering` | string | Sort field (prefix `-` for desc) |
| `format` | string | Export format (csv) |

### Filtering

Most endpoints support field-based filtering:

```
GET /api/v1/setup/buyers/?status=active
GET /api/v1/merchandising/styles/?buyer={uuid}
GET /api/v1/production/daily/?production_date=2026-03-01
GET /api/v1/quality/inspections/?inspection_type=inline&status=passed
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation Error",
  "details": {
    "field_name": ["This field is required."]
  }
}
```

### 401 Unauthorized
```json
{
  "detail": "Authentication credentials were not provided."
}
```

### 403 Forbidden
```json
{
  "detail": "You do not have permission to perform this action."
}
```

### 404 Not Found
```json
{
  "detail": "Not found."
}
```

### 405 Method Not Allowed
```json
{
  "detail": "Method \"POST\" not allowed."
}
```

---

## API Documentation

Interactive API documentation is available at:

- **Swagger UI:** http://localhost:8000/api/docs/
- **ReDoc:** http://localhost:8000/api/redoc/
- **OpenAPI Schema:** http://localhost:8000/api/schema/
