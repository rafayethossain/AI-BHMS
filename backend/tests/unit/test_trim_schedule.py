"""
Tests for BOMItem Trim/Label Schedule (GC-008).
"""
from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.merchandising.models import BOM, BOMItem, Style, StyleVersion
from apps.setup.models import UOM, Buyer, Country, Currency, Factory, Vendor
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def trim_tenant(db):
    return Tenant.objects.create(
        name="Trim Test Co", slug="trim-test",
        schema_name="tenant_trim", status="active"
    )


@pytest.fixture
def trim_role(db, trim_tenant):
    role = Role.objects.create(tenant=trim_tenant, name="TrimAdmin", is_system=True)
    for mod in ["setup", "merchandising"]:
        for act in ["view", "create", "edit", "delete"]:
            perm, _ = Permission.objects.get_or_create(
                module=mod, action=act,
                defaults={"description": f"{mod}:{act}"}
            )
            RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def trim_user(db, trim_tenant, trim_role):
    user = User.objects.create_user(
        username="trimuser", email="trim@test.com",
        password="testpass123!@#", tenant=trim_tenant, status="active",
    )
    UserRole.objects.create(user=user, role=trim_role)
    return user


@pytest.fixture
def trim_client(api_client, trim_user):
    api_client.force_authenticate(user=trim_user)
    return api_client


@pytest.fixture
def seed_trim_data(db, trim_tenant, trim_user):
    country = Country.objects.create(tenant=trim_tenant, name="Test Country")
    buyer = Buyer.objects.create(tenant=trim_tenant, name="Trim Buyer", code="TB01", country=country)
    factory = Factory.objects.create(tenant=trim_tenant, name="Trim Factory", code="TF01", country=country)
    currency = Currency.objects.create(tenant=trim_tenant, name="USD", code="USD", symbol="$")
    uom = UOM.objects.create(tenant=trim_tenant, name="Meters", code="MTR")
    vendor = Vendor.objects.create(tenant=trim_tenant, name="Fabric Vendor", code="FV01", country=country)
    supplier = Vendor.objects.create(tenant=trim_tenant, name="Label Supplier", code="LS01", country=country)
    style = Style.objects.create(
        tenant=trim_tenant, style_number="STY-TRIM", name="Trim Style",
        buyer=buyer, created_by=trim_user,
    )
    sv = StyleVersion.objects.create(
        tenant=trim_tenant, style=style, version_number=1, status="active",
        created_by=trim_user,
    )
    bom = BOM.objects.create(
        tenant=trim_tenant, style_version=sv, name="Trim BOM",
        created_by=trim_user,
    )
    return {
        "tenant": trim_tenant, "user": trim_user, "buyer": buyer,
        "factory": factory, "currency": currency, "uom": uom,
        "vendor": vendor, "supplier": supplier,
        "style": style, "style_version": sv, "bom": bom,
    }


# ==================== Model Tests ====================

@pytest.mark.django_db
class TestBOMItemTrimFields:
    """Test the GC-008 trim/label fields on BOMItem model."""

    def test_default_trim_status(self, seed_trim_data):
        item = BOMItem.objects.create(
            tenant=seed_trim_data["tenant"],
            bom=seed_trim_data["bom"],
            category="Trim",
            item_name="Main Label",
            created_by=seed_trim_data["user"],
        )
        assert item.status == "TBC"
        assert item.ordered_qty is None
        assert item.delivered_qty is None
        assert item.supplier is None
        assert item.eta_date is None
        assert item.confirmed_date is None
        assert item.actual_date is None

    def test_create_with_all_trim_fields(self, seed_trim_data):
        eta = date.today() + timedelta(days=30)
        item = BOMItem.objects.create(
            tenant=seed_trim_data["tenant"],
            bom=seed_trim_data["bom"],
            category="Trim",
            item_name="Care Label",
            supplier=seed_trim_data["supplier"],
            ordered_qty=Decimal("5000"),
            delivered_qty=Decimal("2000"),
            eta_date=eta,
            confirmed_date=date.today(),
            actual_date=None,
            status="Partial",
            created_by=seed_trim_data["user"],
        )
        assert item.supplier == seed_trim_data["supplier"]
        assert item.ordered_qty == Decimal("5000")
        assert item.delivered_qty == Decimal("2000")
        assert item.eta_date == eta
        assert item.confirmed_date == date.today()
        assert item.actual_date is None
        assert item.status == "Partial"

    def test_str_method(self, seed_trim_data):
        item = BOMItem.objects.create(
            tenant=seed_trim_data["tenant"],
            bom=seed_trim_data["bom"],
            category="Trim", item_name="Zipper",
            created_by=seed_trim_data["user"],
        )
        assert str(item) == f"{seed_trim_data['bom'].name} - Zipper"

    def test_existing_item_without_trim_fields(self, seed_trim_data):
        item = BOMItem.objects.create(
            tenant=seed_trim_data["tenant"],
            bom=seed_trim_data["bom"],
            category="Fabric",
            item_name="Cotton Jersey",
            unit_price=Decimal("5.50"),
            consumption=Decimal("1.5"),
            created_by=seed_trim_data["user"],
        )
        fetched = BOMItem.objects.get(id=item.id)
        assert fetched.category == "Fabric"
        assert fetched.item_name == "Cotton Jersey"
        assert fetched.status == "TBC"
        assert fetched.ordered_qty is None
        assert fetched.delivered_qty is None
        assert fetched.supplier is None

    def test_trim_status_transitions(self, seed_trim_data):
        item = BOMItem.objects.create(
            tenant=seed_trim_data["tenant"],
            bom=seed_trim_data["bom"],
            category="Trim", item_name="Hang Tag",
            ordered_qty=Decimal("10000"),
            status="Ordered",
            created_by=seed_trim_data["user"],
        )
        assert item.status == "Ordered"
        item.status = "Partial"
        item.delivered_qty = Decimal("5000")
        item.save()
        item.refresh_from_db()
        assert item.status == "Partial"
        assert item.delivered_qty == Decimal("5000")
        item.status = "Completed"
        item.delivered_qty = Decimal("10000")
        item.actual_date = date.today()
        item.save()
        item.refresh_from_db()
        assert item.status == "Completed"
        assert item.delivered_qty == Decimal("10000")
        assert item.actual_date == date.today()


# ==================== API Tests ====================

@pytest.mark.django_db
class TestBOMItemTrimScheduleAPI:
    """Test the trim/label schedule API endpoints."""

    def test_list_includes_trim_fields(self, trim_client, seed_trim_data):
        BOMItem.objects.create(
            tenant=seed_trim_data["tenant"],
            bom=seed_trim_data["bom"],
            category="Trim", item_name="Hang Tag",
            supplier=seed_trim_data["supplier"],
            created_by=seed_trim_data["user"],
        )
        response = trim_client.get("/api/v1/merchandising/bom-items/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) >= 1
        item = response.data["results"][0]
        assert item["status"] == "TBC"
        assert item["supplier_name"] == "Label Supplier"
        assert "supplier" in item
        assert "ordered_qty" in item
        assert "delivered_qty" in item
        assert "eta_date" in item
        assert "confirmed_date" in item
        assert "actual_date" in item

    def test_create_with_trim_fields(self, trim_client, seed_trim_data):
        eta = (date.today() + timedelta(days=30)).isoformat()
        response = trim_client.post("/api/v1/merchandising/bom-items/", {
            "bom": str(seed_trim_data["bom"].id),
            "category": "Trim",
            "item_name": "Size Label",
            "supplier": str(seed_trim_data["supplier"].id),
            "ordered_qty": "10000",
            "eta_date": eta,
            "status": "Ordered",
        }, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["status"] == "Ordered"
        assert response.data["supplier_name"] == "Label Supplier"
        assert float(response.data["ordered_qty"]) == 10000.0

    def test_update_trim_status(self, trim_client, seed_trim_data):
        item = BOMItem.objects.create(
            tenant=seed_trim_data["tenant"],
            bom=seed_trim_data["bom"],
            category="Trim", item_name="Price Ticket",
            ordered_qty=Decimal("5000"),
            status="Ordered",
            created_by=seed_trim_data["user"],
        )
        response = trim_client.patch(f"/api/v1/merchandising/bom-items/{item.id}/", {
            "status": "Partial",
            "delivered_qty": "2500",
            "actual_date": date.today().isoformat(),
        }, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "Partial"
        assert float(response.data["delivered_qty"]) == 2500.0

    def test_filter_by_trim_status(self, trim_client, seed_trim_data):
        BOMItem.objects.create(
            tenant=seed_trim_data["tenant"],
            bom=seed_trim_data["bom"],
            category="Trim", item_name="Item A",
            status="Ordered", created_by=seed_trim_data["user"],
        )
        BOMItem.objects.create(
            tenant=seed_trim_data["tenant"],
            bom=seed_trim_data["bom"],
            category="Trim", item_name="Item B",
            status="Completed", created_by=seed_trim_data["user"],
        )
        response = trim_client.get(
            "/api/v1/merchandising/bom-items/?status=Completed"
        )
        assert response.status_code == status.HTTP_200_OK
        for r in response.data["results"]:
            assert r["status"] == "Completed"

    def test_create_without_trim_fields(self, trim_client, seed_trim_data):
        response = trim_client.post("/api/v1/merchandising/bom-items/", {
            "bom": str(seed_trim_data["bom"].id),
            "category": "Fabric",
            "item_name": "Cotton Jersey",
            "unit_price": "5.50",
            "consumption": "1.5",
        }, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["item_name"] == "Cotton Jersey"
        assert response.data["status"] == "TBC"
        assert response.data["ordered_qty"] is None

    def test_invalid_status_rejected(self, trim_client, seed_trim_data):
        response = trim_client.post("/api/v1/merchandising/bom-items/", {
            "bom": str(seed_trim_data["bom"].id),
            "category": "Trim",
            "item_name": "Badge",
            "status": "InvalidStatus",
        }, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_auth_required(self, db, seed_trim_data):
        client = APIClient()
        response = client.get("/api/v1/merchandising/bom-items/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
