# API Design
# BHMS - Buying House Management System

---

## Table of Contents

1. [API Standards](#1-api-standards)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [Common Patterns](#3-common-patterns)
4. [Module APIs](#4-module-apis)
5. [Error Handling](#5-error-handling)
6. [Webhooks](#6-webhooks)

---

## 1. API Standards

### 1.1 Base URL

```
Production:  https://api.bhms.com/v1
Staging:     https://api-staging.bhms.com/v1
Development: http://localhost:8000/api/v1
```

### 1.2 Versioning

| Strategy | Description |
|----------|-------------|
| URL-based | `/api/v1/`, `/api/v2/` |
| Header | `Accept-Version: v1` |

### 1.3 Request Format

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Accept | application/json |
| Authorization | Bearer {token} |
| X-Tenant-ID | {tenant_id} |
| X-Request-ID | {uuid} |

### 1.4 Response Format

```json
{
  "success": true,
  "data": {},
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 100,
    "total_pages": 5
  },
  "links": {
    "self": "/api/v1/orders?page=1",
    "next": "/api/v1/orders?page=2",
    "prev": null
  }
}
```

### 1.5 Pagination

| Parameter | Default | Max | Description |
|-----------|---------|-----|-------------|
| page | 1 | - | Page number |
| per_page | 20 | 100 | Items per page |
| cursor | - | - | Cursor for cursor-based pagination |

### 1.6 Filtering

```
GET /api/v1/orders?status=open&buyer_id=123&delivery_date_from=2024-01-01
```

| Filter Type | Syntax | Example |
|-------------|--------|---------|
| Equality | `field=value` | `status=open` |
| Greater than | `field_from=value` | `quantity_from=100` |
| Less than | `field_to=value` | `quantity_to=500` |
| Date range | `field_from=date&field_to=date` | `delivery_date_from=2024-01-01` |
| Search | `search=text` | `search=premium` |
| Sort | `sort=field` | `sort=-created_at` |

---

## 2. Authentication & Authorization

### 2.1 Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/auth/login | User login |
| POST | /api/v1/auth/logout | User logout |
| POST | /api/v1/auth/refresh | Refresh token |
| POST | /api/v1/auth/forgot-password | Request password reset |
| POST | /api/v1/auth/reset-password | Reset password |
| POST | /api/v1/auth/verify-mfa | Verify MFA code |

### 2.2 Login Request/Response

**Request:**
```json
POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "password123",
  "tenant_slug": "premium-garments"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "Bearer",
    "expires_in": 1800,
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "roles": ["merchandiser"]
    }
  }
}
```

---

## 3. Common Patterns

### 3.1 List Resources

```
GET /api/v1/{resource}
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | int | Page number |
| per_page | int | Items per page |
| search | string | Search term |
| sort | string | Sort field (prefix - for desc) |
| fields | string | Fields to include |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "order_number": "ORD-2024-001",
      "status": "open",
      "buyer": {
        "id": "uuid",
        "name": "H&M"
      },
      "quantity": 5000,
      "delivery_date": "2024-06-15",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 100,
    "total_pages": 5
  }
}
```

### 3.2 Get Single Resource

```
GET /api/v1/{resource}/{id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "order_number": "ORD-2024-001",
    "status": "open",
    "buyer": {
      "id": "uuid",
      "name": "H&M",
      "code": "HM-001"
    },
    "items": [],
    "t_and_a": {},
    "costing": {},
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

### 3.3 Create Resource

```
POST /api/v1/{resource}
```

**Request:**
```json
{
  "buyer_id": "uuid",
  "style_id": "uuid",
  "quantity": 5000,
  "unit_price": 12.50,
  "delivery_date": "2024-06-15",
  "items": [
    {
      "color_id": "uuid",
      "size": "M",
      "quantity": 1000
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "order_number": "ORD-2024-001",
    "status": "open",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "message": "Order created successfully"
}
```

### 3.4 Update Resource

```
PUT /api/v1/{resource}/{id}      # Full update
PATCH /api/v1/{resource}/{id}    # Partial update
```

**Request:**
```json
{
  "status": "confirmed",
  "delivery_date": "2024-06-20"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "confirmed",
    "updated_at": "2024-01-15T11:00:00Z"
  },
  "message": "Order updated successfully"
}
```

### 3.5 Delete Resource

```
DELETE /api/v1/{resource}/{id}
```

**Response (204):**
```json
{
  "success": true,
  "message": "Resource deleted successfully"
}
```

---

## 4. Module APIs

### 4.1 Orders API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/orders | List orders |
| GET | /api/v1/orders/{id} | Get order details |
| POST | /api/v1/orders | Create order |
| PUT | /api/v1/orders/{id} | Update order |
| PATCH | /api/v1/orders/{id}/status | Update order status |
| DELETE | /api/v1/orders/{id} | Delete order |
| POST | /api/v1/orders/{id}/confirm | Confirm order |
| POST | /api/v1/orders/{id}/cancel | Cancel order |
| GET | /api/v1/orders/{id}/items | Get order items |
| POST | /api/v1/orders/{id}/items | Add order item |
| GET | /api/v1/orders/{id}/t-and-a | Get T&A |
| GET | /api/v1/orders/{id}/costing | Get costing |

### 4.2 T&A API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/ta | List T&As |
| GET | /api/v1/ta/{id} | Get T&A details |
| POST | /api/v1/ta | Create T&A |
| PUT | /api/v1/ta/{id} | Update T&A |
| GET | /api/v1/ta/{id}/milestones | Get milestones |
| POST | /api/v1/ta/{id}/milestones | Add milestone |
| PUT | /api/v1/ta/milestones/{id} | Update milestone |
| GET | /api/v1/ta/calendar | Get calendar view |
| GET | /api/v1/ta/critical-path | Get critical path |

### 4.3 Commercial API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/commercial/lcs | List LCs |
| GET | /api/v1/commercial/lcs/{id} | Get LC details |
| POST | /api/v1/commercial/lcs | Create LC |
| PUT | /api/v1/commercial/lcs/{id} | Update LC |
| POST | /api/v1/commercial/lcs/{id}/amendments | Create amendment |
| GET | /api/v1/commercial/lcs/{id}/utilization | Get utilization |
| GET | /api/v1/commercial/exposure | Get financial exposure |
| GET | /api/v1/commercial/banks | List banks |
| POST | /api/v1/commercial/banks | Create bank |

### 4.4 Production API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/production/plans | List production plans |
| GET | /api/v1/production/plans/{id} | Get plan details |
| POST | /api/v1/production/plans | Create plan |
| PUT | /api/v1/production/plans/{id} | Update plan |
| GET | /api/v1/production/daily | List daily production |
| POST | /api/v1/production/daily | Report daily production |
| GET | /api/v1/production/efficiency | Get efficiency report |
| GET | /api/v1/production/dhu | Get DHU report |

### 4.5 Quality API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/quality/inspections | List inspections |
| GET | /api/v1/quality/inspections/{id} | Get inspection details |
| POST | /api/v1/quality/inspections | Create inspection |
| PUT | /api/v1/quality/inspections/{id} | Update inspection |
| POST | /api/v1/quality/inspections/{id}/items | Add inspection item |
| GET | /api/v1/quality/compliance | Get compliance status |

### 4.6 Logistics API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/logistics/shipments | List shipments |
| GET | /api/v1/logistics/shipments/{id} | Get shipment details |
| POST | /api/v1/logistics/shipments | Create shipment |
| PUT | /api/v1/logistics/shipments/{id} | Update shipment |
| PATCH | /api/v1/logistics/shipments/{id}/status | Update status |
| GET | /api/v1/logistics/shipments/{id}/tracking | Get tracking |

### 4.7 Inventory API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/inventory/stock | Get stock levels |
| POST | /api/v1/inventory/goods-receive | Receive goods |
| POST | /api/v1/inventory/goods-issue | Issue goods |
| POST | /api/v1/inventory/transfer | Transfer stock |
| GET | /api/v1/inventory/movements | Get stock movements |

### 4.8 Finance API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/finance/accounts | List chart of accounts |
| GET | /api/v1/finance/vouchers | List vouchers |
| POST | /api/v1/finance/vouchers | Create voucher |
| POST | /api/v1/finance/vouchers/{id}/approve | Approve voucher |
| GET | /api/v1/finance/journal | Get journal entries |
| GET | /api/v1/finance/profitability | Get profitability report |

---

## 5. Error Handling

### 5.1 Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The given data was invalid.",
    "details": {
      "quantity": ["Quantity must be greater than 0"],
      "delivery_date": ["Delivery date must be in the future"]
    }
  },
  "request_id": "uuid"
}
```

### 5.2 HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | OK - Success |
| 201 | Created - Resource created |
| 204 | No Content - Success (no body) |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource conflict |
| 422 | Unprocessable Entity - Validation error |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |

### 5.3 Error Codes

| Code | Description |
|------|-------------|
| VALIDATION_ERROR | Input validation failed |
| AUTHENTICATION_REQUIRED | Login required |
| INSUFFICIENT_PERMISSIONS | No access |
| RESOURCE_NOT_FOUND | Resource not found |
| DUPLICATE_RESOURCE | Resource already exists |
| BUSINESS_RULE_VIOLATION | Business rule violated |
| RATE_LIMIT_EXCEEDED | Too many requests |
| INTERNAL_ERROR | Server error |

---

## 6. Webhooks

### 6.1 Webhook Events

| Event | Description |
|-------|-------------|
| order.created | New order created |
| order.confirmed | Order confirmed |
| order.status_changed | Order status changed |
| ta.milestone_completed | T&A milestone completed |
| ta.milestone_overdue | T&A milestone overdue |
| lc.created | New LC created |
| lc.expiring_soon | LC expiring within 7 days |
| shipment.booked | Shipment booked |
| shipment.dispatched | Shipment dispatched |
| production.daily_reported | Daily production reported |
| quality.inspection_failed | Inspection failed |

### 6.2 Webhook Payload

```json
{
  "event": "order.confirmed",
  "timestamp": "2024-01-15T10:30:00Z",
  "tenant_id": "uuid",
  "data": {
    "order_id": "uuid",
    "order_number": "ORD-2024-001",
    "status": "confirmed",
    "confirmed_by": "uuid"
  }
}
```

---

*This API design should be reviewed by API Architect before implementation.*
