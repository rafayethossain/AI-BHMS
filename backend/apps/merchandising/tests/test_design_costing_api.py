"""
API tests for the Style-level DesignCosting endpoints (RQ-013 / G-12).

Exposes CRUD over `DesignCosting` (tenant-scoped, RBAC-guarded) plus the
`prepare_po_costing` action that derives a PurchaseOrder Costing from the
design cost.
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.merchandising.models import DesignCosting, Style
from apps.setup.models import Buyer, Country
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


@pytest.fixture
def tenant():
    return Tenant.objects.create(
        name="DC API Co", slug="dc-api",
        schema_name="tenant_dc_api", status="active"
    )


@pytest.fixture
def role(tenant):
    role = Role.objects.create(tenant=tenant, name="DesignAdmin", is_system=True)
    for mod in ["setup", "merchandising"]:
        for act in ["view", "create", "edit", "delete"]:
            perm, _ = Permission.objects.get_or_create(
                module=mod, action=act,
                defaults={"description": f"{mod}:{act}"}
            )
            RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def user(tenant, role):
    user = User.objects.create_user(
        username="dcapiusr", email="dcapi@test.com",
        password="testpass123!@#", tenant=tenant, status="active",
    )
    UserRole.objects.create(user=user, role=role)
    return user


@pytest.fixture
def client(tenant, user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.fixture
def seed(tenant, user):
    country = Country.objects.create(tenant=tenant, name="DC API Country", code="DCA")
    buyer = Buyer.objects.create(tenant=tenant, name="DC API Buyer", code="DCA01", country=country)
    style = Style.objects.create(tenant=tenant, style_number="STY-DCA", name="DC API Style", buyer=buyer, created_by=user)
    return {"tenant": tenant, "user": user, "style": style, "buyer": buyer}


@pytest.mark.django_db
class TestDesignCostingAPI:
    def test_list_is_empty(self, client, seed):
        resp = client.get("/api/v1/merchandising/design-costings/")
        assert resp.status_code == 200
        assert resp.json()["count"] == 0

    def test_create_sets_tenant_and_total(self, client, seed):
        resp = client.post("/api/v1/merchandising/design-costings/", {
            "style": str(seed["style"].id),
            "version": 1,
            "fabric_cost": "10.00",
            "trim_cost": "2.50",
            "cm_cost": "5.00",
            "overhead_cost": "1.25",
        }, format="json")
        assert resp.status_code == 201, resp.content
        data = resp.json()
        assert data["total_cost"] == "18.75"
        assert data["style_number"] == "STY-DCA"

    def test_list_scoped_to_tenant(self, client, seed):
        other = Tenant.objects.create(name="Other", slug="other-dc2", schema_name="tenant_other_dc2", status="active")
        DesignCosting.objects.create(tenant=other, style=_style_for(other, seed["user"]), version=1, created_by=seed["user"])
        client.post("/api/v1/merchandising/design-costings/", {"style": str(seed["style"].id), "version": 1}, format="json")
        resp = client.get("/api/v1/merchandising/design-costings/")
        assert resp.status_code == 200
        rows = resp.json()["results"]
        assert all(r["style_number"] == "STY-DCA" for r in rows)
        assert len(rows) == 1

    def test_duplicate_version_returns_400(self, client, seed):
        client.post("/api/v1/merchandising/design-costings/", {"style": str(seed["style"].id), "version": 1}, format="json")
        resp = client.post("/api/v1/merchandising/design-costings/", {"style": str(seed["style"].id), "version": 1}, format="json")
        assert resp.status_code == 400


def _style_for(tenant, user):
    from apps.setup.models import Country
    country = Country.objects.create(tenant=tenant, name="Other Country", code="OCT")
    buyer = Buyer.objects.create(tenant=tenant, name="Other Buyer", code="OB01", country=country)
    return Style.objects.create(tenant=tenant, style_number="STY-OTH", name="Other Style", buyer=buyer, created_by=user)
