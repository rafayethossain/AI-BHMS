# AI-BHMS

**AI-Buying House Management System** — A multi-tenant SERP for Bangladesh RMG (Ready-Made Garment) industry buying houses.

## Quick Start (Local Windows — no Docker needed)

The project runs fully on a local Windows machine. **No Docker, PostgreSQL, or Redis are required** — development uses SQLite and in-memory cache out of the box.

### Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.13+ (developed on 3.14) |
| Node.js | 22+ (developed on 25 LTS) |
| npm | bundled with Node.js |

### 1. Backend

```powershell
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Apply migrations
python manage.py migrate

# Seed: tenant + roles + admin superuser
python scripts/seed_dev.py

# Seed: full RBAC (8 roles with permissions)
python scripts/seed_rbac.py

# Seed: demo business data (buyers, factories, styles, POs, LCs, shipments)
python manage.py seed_demo_data

# Seed: one user per role for access-permission testing
python manage.py seed_role_users

# Run development server
python manage.py runserver 8000
```

> **Important:** Run all seed commands in this exact order. `seed_demo_data` and `seed_role_users` require the tenant and roles created by `seed_dev.py` + `seed_rbac.py`.

### 2. Frontend (new terminal)

```powershell
cd frontend
npm install
npm run dev
```

### 3. Open Browser

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **API Docs (Swagger):** http://localhost:8000/api/docs/
- **Admin:** http://localhost:8000/admin/

The Vite dev server proxies `/api` requests to the backend at `http://localhost:8000` automatically. Keep both terminals running.

#### Test User Credentials

Each role has a dedicated user for testing access permissions.

| Role | Email | Password | Permissions |
|------|-------|----------|-------------|
| Admin | admin@demo.com | admin123!@# | All 38 permissions (full access) |
| Manager | manager@demo.com | Manager123!@# | All modules view/create/edit + reporting |
| Merchandiser | merchandiser@demo.com | Merch123!@# | Merchandising CRUD, setup/commercial/reporting view |
| Production Manager | production@demo.com | Prod123!@#!@# | Production CRUD/approve, quality CRUD, merchandising/reporting view |
| Quality Manager | quality@demo.com | Quality123!@# | Quality CRUD/approve, production/reporting view |
| Commercial Manager | commercial@demo.com | Commerce123!@# | Commercial CRUD/approve, logistics CRUD, merchandising/reporting view |
| Shipping Manager | shipping@demo.com | Shipping123!@# | Logistics CRUD/approve, commercial/reporting view |
| Viewer | viewer@demo.com | Viewer123!@#!@# | Read-only access across all modules |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 6, Vite 8, Tailwind CSS 4 |
| Backend | Django 5.2, DRF, SimpleJWT |
| Database | SQLite (local dev, zero-config) / PostgreSQL (prod) |
| Cache | LocMem (local dev) / Redis (prod) |
| Auth | JWT + TOTP MFA |
| Task Queue | Celery + Redis (optional, not needed for local dev) |
| Containerization | Docker + Docker Compose (optional) |
| CI/CD | GitHub Actions |

## Project Structure

```
AI-BHMS/
├── backend/              # Django REST API
│   ├── apps/             # 13 Django apps (core, tenants, users, authentication, setup,
│   │                     #   merchandising, commercial, production, quality, logistics,
│   │                     #   reporting, monitoring, fabric)
│   ├── config/           # Settings (base, dev, test, prod)
│   ├── tests/            # 200+ tests
│   ├── Dockerfile        # Backend container (optional)
│   └── scripts/          # Seed data scripts
├── frontend/             # React SPA
│   ├── Dockerfile        # Frontend container (optional)
│   └── src/              # Pages, API, contexts
├── docs/                 # API documentation
│   └── api.md            # Full API reference
├── .github/workflows/    # CI/CD pipelines (optional)
│   └── ci.yml            # GitHub Actions workflow
├── docker-compose.yml    # Docker orchestration (optional)
├── PRD.md                # Product Requirements
├── master-backlog.md     # Sprint backlog + BHMS requirement tracker (116 stories + RQ-001..RQ-035)
├── data-model.md         # ER diagram & schema
├── api-design.md         # API endpoint design
├── business-rules.md     # Business rules
├── security-model.md     # Security model
├── workflow-diagrams.md  # Business workflows
├── module-specs.md       # Module specifications
├── uiux-guidelines.md    # UI/UX guidelines
├── ai-roadmap.md         # AI/ML roadmap
└── glossary.md           # Industry terminology
```

## Modules

| Module | Status | Description |
|--------|--------|-------------|
| Authentication | Done | JWT login, MFA (TOTP), password reset |
| RBAC | Done | Roles, permissions, module-level access |
| Setup | Done | Master data (Buyers, Brands, Factories, etc.) |
| Merchandising | Done | Styles (w/ sketches), StyleItems (line items), File Openings, POs, BOMs, Costings, T&A |
| Commercial | Done | LC management, amendments, utilization, banks |
| Production | Done | Production plans, daily reports, efficiency tracking |
| Quality | Done | Quality inspections, defect tracking, AQL |
| Logistics | Done | Shipments, freight forwarders, tracking |
| Monitoring | Done | Health checks, audit logs, alerts |
| Reporting | Pending | Dashboards, analytics, AI insights |

## Features Built (Sprints 0-11)

| Feature | Sprint | Status |
|---------|--------|--------|
| JWT + MFA Authentication | 0-1 | Done |
| RBAC (Roles/Permissions) | 0-1 | Done |
| Multi-tenant Architecture | 0-1 | Done |
| Master Data CRUD (Buyers, Factories, etc.) | 2-3 | Done |
| Style Management (CRUD, sketches, tech packs) | 4 | Done |
| File Openings (CRUD, workflow) | 4 | Done |
| Purchase Orders (CRUD, line items, amendments) | 4-5 | Done |
| BOM Management (CRUD, items, activation) | 5 | Done |
| Costing Management (CRUD, approve/reject, BOM generation, export) | 5-6 | Done |
| T&A (milestones, calendar view, alerts) | 6 | Done |
| LC Management (Master/B2B, approve/accept/cancel, utilization) | 7-8 | Done |
| LC Amendments (create, approve/reject) | 7-8 | Done |
| Bank Management (CRUD) | 7-8 | Done |
| Production Plans & Daily Reports | 9 | Done |
| Quality Inspections & Defect Tracking | 9 | Done |
| Shipments & Freight Forwarders | 9 | Done |
| Health Checks, Audit Logs, Alerts | 10 | Done |
| Comprehensive Backend Tests (200+) | 11 | Done |
| Docker Configuration | 11 | Done |
| GitHub Actions CI/CD | 11 | Done |
| API Documentation | 11 | Done |
| DataTable with Pagination + Column Filters | 2-3 | Done |
| Searchable Dropdowns | 2-3 | Done |
| Toast Notifications | 2-3 | Done |
| CSV Export (PO, Costing, LC) | 6 | Done |
| Dark Theme UI | 2-3 | Done |

## Deployment

> **Note:** Not needed for local development on Windows. Docker and PostgreSQL are optional — skip this section unless you're deploying to a server.

### Docker (optional)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Run migrations
docker-compose exec backend python manage.py migrate

# Create superuser
docker-compose exec backend python manage.py createsuperuser

# Run tests
docker-compose exec backend python manage.py test
```

### Manual Deployment (Linux server)

```bash
# Backend
cd backend
pip install -r requirements.txt
python manage.py collectstatic
gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 4

# Frontend
cd frontend
npm run build
# Serve dist/ with nginx
```

## Running Tests

```bash
# Run all tests
cd backend
python manage.py test --verbosity=2

# Run specific app tests
python manage.py test apps.monitoring --verbosity=2
python manage.py test apps.production --verbosity=2
python manage.py test apps.quality --verbosity=2
python manage.py test apps.logistics --verbosity=2
python manage.py test apps.commercial --verbosity=2

# Run with pytest
python -m pytest tests/ -v
```

## API Endpoints

Full API documentation available at:
- [API Reference](docs/api.md) — Complete endpoint documentation
- Swagger UI: http://localhost:8000/api/docs/
- ReDoc: http://localhost:8000/api/redoc/

### Quick Reference

| Module | Base Endpoint |
|--------|---------------|
| Auth | `/api/v1/auth/` |
| Users | `/api/v1/users/` |
| Setup | `/api/v1/setup/` |
| Merchandising | `/api/v1/merchandising/` |
| Commercial | `/api/v1/commercial/` |
| Production | `/api/v1/production/` |
| Quality | `/api/v1/quality/` |
| Logistics | `/api/v1/logistics/` |
| Monitoring | `/api/v1/monitoring/` |

## Documentation

All project documentation is in the root directory:
- [PRD](PRD.md) — Product Requirements Document
- [Backlog](master-backlog.md) — Consolidated backlog (116 stories) + BHMS requirement tracker (RQ-001..RQ-035, workflow-ordered)
- [Data Model](data-model.md) — Database schema
- [API Design](api-design.md) — REST API endpoints
- [Business Rules](business-rules.md) — Industry-specific rules
- [API Reference](docs/api.md) — Full API documentation
