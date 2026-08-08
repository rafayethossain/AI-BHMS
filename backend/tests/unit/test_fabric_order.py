"""
Tests for FabricOrder model + API (GC-006).
"""
import pytest
from decimal import Decimal
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.tenants.models import Tenant
from apps.users.models import Role, UserRole, Permission, RolePermission
from apps.setup.models import Country
from apps.fabric.models import FabricCategory, FabricSupplier, FabricOrder

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def fo_tenant(db):
    tenant = Tenant.objects.create(
        name="Fabric Test Co", slug="fabric-test",
        schema_name="tenant_fabric", status="active",
    )
    return tenant


@pytest.fixture
def fo_role(db, fo_tenant):
    role = Role.objects.create(tenant=fo_tenant, name="FabricMgr", is_system=True)
    for mod in ["fabric"]:
        for act in ["view", "create", "edit", "delete"]:
            perm, _ = Permission.objects.get_or_create(
                module=mod, action=act,
                defaults={"description": f"{mod}:{act}"}
            )
            RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def fo_user(db, fo_tenant, fo_role):
    user = User.objects.create_user(
        username="fabricuser", email="fabric@test.com",
        password="testpass123!@#", tenant=fo_tenant, status="active",
        first_name="Fabric", last_name="User",
    )
    UserRole.objects.create(user=user, role=fo_role)
    return user


@pytest.fixture
def fo_client(api_client, fo_user):
    api_client.force_authenticate(user=fo_user)
    return api_client


@pytest.fixture
def fabric_category(fo_tenant):
    return FabricCategory.objects.create(
        tenant=fo_tenant, code="COT", name="Cotton",
    )


@pytest.fixture
def fabric_supplier(fo_tenant):
    return FabricSupplier.objects.create(
        tenant=fo_tenant, code="SUP-001", name="Test Fabric Supplier",
    )


@pytest.fixture
def seed_order(fo_tenant, fabric_supplier, fabric_category):
    order = FabricOrder.objects.create(
        tenant=fo_tenant,
        order_number="FO-2026-0001",
        supplier=fabric_supplier,
        fabric_category=fabric_category,
        quantity_meters=Decimal("5000.00"),
        unit_price=Decimal("2.50"),
        status="draft",
    )
    order.total_price = order.quantity_meters * order.unit_price
    order.save(update_fields=["total_price"])
    return order


# ==================== Model Tests ====================

@pytest.mark.django_db
class TestFabricOrderModel:
    def test_create_order(self, fo_tenant, fabric_supplier, fabric_category, fo_user):
        order = FabricOrder.objects.create(
            tenant=fo_tenant,
            order_number="FO-2026-0001",
            supplier=fabric_supplier,
            fabric_category=fabric_category,
            quantity_meters=Decimal("5000.00"),
            unit_price=Decimal("2.50"),
            total_price=Decimal("12500.00"),
            status="draft",
            created_by=fo_user,
        )
        assert order.order_number == "FO-2026-0001"
        assert order.supplier == fabric_supplier
        assert order.quantity_meters == Decimal("5000.00")
        assert order.total_price == Decimal("12500.00")
        assert order.status == "draft"

    def test_order_str(self, seed_order):
        assert str(seed_order) == "FO-2026-0001"

    def test_default_status_draft(self, fo_tenant, fabric_supplier, fabric_category):
        order = FabricOrder.objects.create(
            tenant=fo_tenant, order_number="FO-2026-0002",
            supplier=fabric_supplier, fabric_category=fabric_category,
            quantity_meters=Decimal("1000"), unit_price=Decimal("3.00"),
        )
        assert order.status == "draft"

    def test_lab_dip_tracking(self, fo_tenant, fabric_supplier, fabric_category):
        from django.utils import timezone
        order = FabricOrder.objects.create(
            tenant=fo_tenant, order_number="FO-2026-0003",
            supplier=fabric_supplier, fabric_category=fabric_category,
            quantity_meters=Decimal("1000"), unit_price=Decimal("3.00"),
            lab_dip_required_date=timezone.now().date(),
            lab_dip_actual_date=timezone.now().date(),
            lab_dip_approval_date=timezone.now().date(),
            lab_dip_notes="Approved after 2nd submission",
        )
        assert order.lab_dip_required_date is not None
        assert order.lab_dip_approval_date is not None
        assert order.lab_dip_notes == "Approved after 2nd submission"

    def test_bulk_approval(self, fo_tenant, fabric_supplier, fabric_category, fo_user):
        from django.utils import timezone
        order = FabricOrder.objects.create(
            tenant=fo_tenant, order_number="FO-2026-0004",
            supplier=fabric_supplier, fabric_category=fabric_category,
            quantity_meters=Decimal("1000"), unit_price=Decimal("3.00"),
            bulk_approved_date=timezone.now().date(),
            bulk_approved_by=fo_user,
        )
        assert order.bulk_approved_date is not None
        assert order.bulk_approved_by == fo_user

    def test_logistics_dates(self, fo_tenant, fabric_supplier, fabric_category):
        from django.utils import timezone
        order = FabricOrder.objects.create(
            tenant=fo_tenant, order_number="FO-2026-0005",
            supplier=fabric_supplier, fabric_category=fabric_category,
            quantity_meters=Decimal("1000"), unit_price=Decimal("3.00"),
            onboard_date=timezone.now().date(),
            eta_date=timezone.now().date() + __import__("datetime").timedelta(days=30),
            clearance_date=timezone.now().date() + __import__("datetime").timedelta(days=35),
        )
        assert order.onboard_date is not None
        assert order.eta_date is not None
        assert order.clearance_date is not None


# ==================== API Tests ====================

@pytest.mark.django_db
class TestFabricOrderAPI:
    def test_list_orders_empty(self, fo_client):
        response = fo_client.get("/api/v1/fabric/orders/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["results"] == []

    def test_create_order(self, fo_client, fabric_supplier, fabric_category):
        response = fo_client.post("/api/v1/fabric/orders/", {
            "supplier": str(fabric_supplier.id),
            "fabric_category": str(fabric_category.id),
            "quantity_meters": "5000.00",
            "unit_price": "2.50",
        })
        assert response.status_code == status.HTTP_201_CREATED, f"Create failed: {response.data}"
        data = response.data
        assert data["quantity_meters"] == "5000.00"
        assert data["unit_price"] == "2.5000"
        assert data["status"] == "draft"

    def test_create_sets_order_number(self, fo_client, fabric_supplier, fabric_category):
        response = fo_client.post("/api/v1/fabric/orders/", {
            "supplier": str(fabric_supplier.id),
            "fabric_category": str(fabric_category.id),
            "quantity_meters": "3000.00",
            "unit_price": "3.00",
        })
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["order_number"].startswith("FO-")

    def test_retrieve_order(self, fo_client, seed_order):
        response = fo_client.get(f"/api/v1/fabric/orders/{seed_order.id}/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["order_number"] == "FO-2026-0001"

    def test_list_returns_orders(self, fo_client, seed_order):
        response = fo_client.get("/api/v1/fabric/orders/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) >= 1

    def test_update_order(self, fo_client, seed_order):
        response = fo_client.patch(
            f"/api/v1/fabric/orders/{seed_order.id}/",
            {"notes": "Updated notes"},
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["notes"] == "Updated notes"

    def test_delete_order(self, fo_client, seed_order):
        response = fo_client.delete(f"/api/v1/fabric/orders/{seed_order.id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_requires_auth(self, api_client, seed_order):
        api_client.force_authenticate(user=None)
        response = api_client.get("/api/v1/fabric/orders/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_lab_dip_status_transition(self, fo_client, seed_order, fo_tenant):
        from django.utils import timezone
        order_id = seed_order.id
        response = fo_client.post(f"/api/v1/fabric/orders/{order_id}/record_lab_dip/", {
            "lab_dip_actual_date": str(timezone.now().date()),
            "lab_dip_approval_date": str(timezone.now().date()),
            "lab_dip_notes": "Approved",
        })
        assert response.status_code == status.HTTP_200_OK, f"lab_dip failed: {response.data}"
        assert response.data["lab_dip_approval_date"] == str(timezone.now().date())

    def test_approve_bulk_action(self, fo_client, seed_order, fo_user, fo_tenant):
        from django.utils import timezone
        response = fo_client.post(f"/api/v1/fabric/orders/{seed_order.id}/approve_bulk/", {})
        assert response.status_code == status.HTTP_200_OK, f"approve_bulk failed: {response.data}"
        assert response.data["bulk_approved_date"] is not None

    def test_reject_invalid_transition(self, fo_client, seed_order):
        response = fo_client.post(f"/api/v1/fabric/orders/{seed_order.id}/ship/", {})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
