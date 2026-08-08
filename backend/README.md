# BHMS Backend

Django REST Framework backend for the Buying House Management System.

## Prerequisites

- Python 3.13+ (developed on 3.14)
- pip

> **Note:** SQLite is used for local development — **no PostgreSQL or Redis required**. Dev settings (`config.settings.development`) use SQLite + in-memory cache automatically.

## Quick Start

```powershell
# From project root
cd AI-BHMS/backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Apply migrations
python manage.py migrate

# Seed data — run in this exact order
python scripts/seed_dev.py                  # tenant + roles + admin superuser
python scripts/seed_rbac.py                 # full RBAC (8 roles with permissions)
python manage.py seed_demo_data             # demo business data (buyers, styles, POs, LCs, shipments)
python manage.py seed_role_users            # one user per role for permission testing

# Run development server
python manage.py runserver 8000
```

Server runs at `http://localhost:8000`

## Login Credentials

| User | Email | Password |
|------|-------|----------|
| Admin | admin@demo.com | admin123!@# |

## API Login

```bash
curl -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"admin123!@#"}'
```

## Running Tests

```bash
# Run all tests
python -m pytest tests/ -v

# Run specific test module
python -m pytest tests/unit/test_merchandising_api.py -v

# Run with coverage
python -m pytest tests/ --cov=apps --cov-report=term-missing
```

## Project Structure

```
backend/
├── config/                  # Project configuration
│   ├── settings/
│   │   ├── base.py          # Base settings (production)
│   │   ├── development.py   # Dev settings (SQLite + LocMem cache)
│   │   └── test.py          # Test settings (SQLite in-memory)
│   ├── urls.py
│   └── wsgi.py
├── apps/                    # Django apps
│   ├── core/                # Utilities, permissions, pagination
│   ├── tenants/             # Multi-tenancy
│   ├── users/               # User management, RBAC
│   ├── authentication/      # JWT auth, MFA, password reset
│   ├── setup/               # Master data (Buyers, Brands, etc.)
│   ├── merchandising/       # Styles, StyleItems, POs, BOMs, Costings, T&A
│   ├── commercial/          # LC management
│   ├── production/          # Production tracking
│   ├── quality/             # Quality inspection
│   ├── logistics/           # Shipment management
│   ├── reporting/           # Reports & dashboards
│   ├── monitoring/          # Health checks, audit logs
│   └── fabric/              # Fabric booking, RFQ, mills
├── tests/                   # Test suite
│   └── unit/                # Unit tests
├── scripts/                 # Seed data scripts
├── manage.py
└── requirements.txt
```

## Tech Stack

- **Django 5.2** + **DRF 3.15+**
- **SQLite** (local dev, zero-config) / **PostgreSQL** (production)
- **LocMem Cache** (local dev) / **Redis** (production)
- **JWT** authentication (SimpleJWT)
- **TOTP MFA** (pyotp)
- **CSV/Excel import** (openpyxl)
- **drf-spectacular** API docs (`/api/docs/` Swagger, `/api/redoc/` ReDoc)
