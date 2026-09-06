"""
Tests: PurchaseOrder Order-List fields exposed by the serializer.

Mirrors the reference Order List / FN columns: FN (file number), Customer,
Style, Status, Original/Actual completion dates, overall Risk, Origin
(= destination country, per product decision).

Requires the serializer to surface:
  - file_number            (from the file opening)
  - style_number           (from the file opening's style)
  - actual_completion_date (latest hit actual_delivery_date)
  - destination_country_name is already exposed and is used as Origin.
"""
import pytest
from rest_framework.test import APIClient
from apps.tenants.models import Tenant
from apps.users.models import Role, UserRole, Permission, RolePermission
from apps.setup.models import (
    Buyer, Factory, Currency, Country, ColorCode,
)
from apps.merchandising.models import (
    Style, FileOpening, PurchaseOrder, Hit,
)

User = None
from django.contrib.auth import get_user_model
User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def po_tenant(db):
    return Tenant.objects.create(
        name="PO List Co", slug="po-list",
        schema_name="tenant_po_list", status="active"
    )


@pytest.fixture
def po_role(db, po_tenant):
    role = Role.objects.create(tenant=po_tenant, name="POAdmin", is_system=True)
    for mod in ["setup", "merchandising"]:
        for act in ["view", "create", "edit", "delete"]:
            perm, _ = Permission.objects.get_or_create(
                module=mod, action=act, defaults={"description": f"{mod}:{act}"}
            )
            RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def po_user(db, po_tenant, po_role):
    user = User.objects.create_user(
        username="pouser", email="po@test.com",
        password="testpass123!@#", tenant=po_tenant, status="active"
    )
    UserRole.objects.create(user=user, role=po_role)
    return user


@pytest.fixture
def po_client(api_client, po_user):
    login = api_client.post("/api/v1/auth/login/", {
        "email": "po@test.com", "password": "testpass123!@#"
    })
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
    return api_client


@pytest.fixture
def order_list_data(po_tenant):
    currency = Currency.objects.create(tenant=po_tenant, code="USD", name="US Dollar", symbol="$")
    country = Country.objects.create(tenant=po_tenant, code="DEU", name="Germany")
    buyer = Buyer.objects.create(tenant=po_tenant, code="ZR", name="Zara",
                                 country=country, currency=currency)
    factory = Factory.objects.create(tenant=po_tenant, code="F-001", name="Apex")
    color = ColorCode.objects.create(tenant=po_tenant, code="BLK", name="Black", hex_code="#000000")
    style = Style.objects.create(tenant=po_tenant, style_number="STY-7788", name="Linen Top", buyer=buyer)
    fo = FileOpening.objects.create(
        tenant=po_tenant, file_number="FO-1234", style=style, buyer=buyer,
        factory=factory, file_date="2026-01-10"
    )
    po = PurchaseOrder.objects.create(
        tenant=po_tenant, po_number="PO-5555", file_opening=fo,
        buyer=buyer, factory=factory, po_date="2026-01-15",
        delivery_date="2026-04-30", quantity=500, unit_price="12.50",
        total_value="6250.00", currency=currency, destination_country=country,
    )
    hit_late = Hit.objects.create(
        tenant=po_tenant, purchase_order=po, hit_number="HT-2",
        colour=color, original_delivery_date="2026-04-30",
        actual_delivery_date="2026-05-12",
    )
    return {"po": po, "hit_late": hit_late}


def test_order_list_exposes_fn_and_style(order_list_data, po_client):
    po = order_list_data["po"]
    resp = po_client.get("/api/v1/merchandising/purchase-orders/")
    assert resp.status_code == 200
    row = next(r for r in resp.data["results"] if r["id"] == str(po.id))
    assert row["po_number"] == "PO-5555"
    assert row["file_number"] == "FO-1234"
    assert row["style_number"] == "STY-7788"


def test_order_list_exposes_origin_as_destination_country(order_list_data, po_client):
    po = order_list_data["po"]
    resp = po_client.get("/api/v1/merchandising/purchase-orders/")
    assert resp.status_code == 200
    row = next(r for r in resp.data["results"] if r["id"] == str(po.id))
    assert row["destination_country_name"] == "Germany"
    assert row["destination_country"] is not None


def test_order_list_exposes_actual_completion_date_from_hits(order_list_data, po_client):
    po = order_list_data["po"]
    resp = po_client.get("/api/v1/merchandising/purchase-orders/")
    assert resp.status_code == 200
    row = next(r for r in resp.data["results"] if r["id"] == str(po.id))
    assert row["actual_completion_date"] == "2026-05-12"


def test_order_list_null_safe_when_no_file_opening(po_tenant, po_client):
    country = Country.objects.create(tenant=po_tenant, code="USA", name="United States")
    currency = Currency.objects.create(tenant=po_tenant, code="USD", name="US Dollar", symbol="$")
    buyer = Buyer.objects.create(tenant=po_tenant, code="HM", name="H&M", currency=currency)
    factory = Factory.objects.create(tenant=po_tenant, code="F-002", name="Delta")
    po = PurchaseOrder.objects.create(
        tenant=po_tenant, po_number="PO-9999", file_opening=None,
        buyer=buyer, factory=factory, po_date="2026-02-01",
        delivery_date="2026-06-01", quantity=100, unit_price="9.00",
        total_value="900.00", currency=currency, destination_country=country,
    )
    resp = po_client.get("/api/v1/merchandising/purchase-orders/")
    assert resp.status_code == 200
    row = next(r for r in resp.data["results"] if r["id"] == str(po.id))
    assert row["file_number"] is None
    assert row["style_number"] is None
    assert row["actual_completion_date"] is None
    assert row["destination_country_name"] == "United States"