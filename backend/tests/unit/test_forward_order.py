"""
RQ-048 (B7): Forward Order / Order In-hand book tests.

Target requirements (reference manual Forward Order / Order In-hand book):
a monthly forward book tracking committed order quantity and cost for a buyer
per factory, carrying a service charge % (default 3%) applied to the total
cost, plus an in-hand tracked quantity and an order status; expose a monthly
forward report grouped by month/buyer with qty/cost/service-charge totals.
"""
from datetime import date
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.commercial.models import ForwardOrder
from apps.merchandising.models import PurchaseOrder
from apps.setup.models import Buyer, Factory
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def fo_tenant(db):
    return Tenant.objects.create(
        name="Forward Co", slug="forward-co",
        schema_name="tenant_fo", status="active"
    )


@pytest.fixture
def fo_tenant2(db):
    return Tenant.objects.create(
        name="Forward Co 2", slug="forward-co-2",
        schema_name="tenant_fo_2", status="active"
    )


def _make_role(tenant, name, perms):
    role = Role.objects.create(tenant=tenant, name=name, is_system=True)
    for module, action in perms:
        perm, _ = Permission.objects.get_or_create(
            module=module, action=action, defaults={"description": f"{module}:{action}"}
        )
        RolePermission.objects.create(role=role, permission=perm)
    return role


def _make_user(tenant, role, username):
    user = User.objects.create_user(
        username=username, email=f"{username}@test.com",
        password="testpass123!@#", tenant=tenant, status="active"
    )
    UserRole.objects.create(user=user, role=role)
    return user


@pytest.fixture
def editor_client(api_client, fo_tenant):
    role = _make_role(
        fo_tenant, "FoEditor",
        [(m, a) for m in ("commercial", "setup", "merchandising")
         for a in ("view", "create", "edit", "delete")],
    )
    user = _make_user(fo_tenant, role, "fo_editor")
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def viewer_client(api_client, fo_tenant):
    role = _make_role(
        fo_tenant, "FoViewer",
        [(m, a) for m in ("commercial", "setup", "merchandising")
         for a in ("view",)],
    )
    user = _make_user(fo_tenant, role, "fo_viewer")
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def nocomm_client(api_client, fo_tenant):
    role = _make_role(fo_tenant, "NoCommercial", [("setup", "view")])
    user = _make_user(fo_tenant, role, "fo_nocomm")
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def buyer_a(fo_tenant):
    return Buyer.objects.create(tenant=fo_tenant, code="B-FO-A", name="Zara Kids")


@pytest.fixture
def buyer_b(fo_tenant):
    return Buyer.objects.create(tenant=fo_tenant, code="B-FO-B", name="H&M Basics")


@pytest.fixture
def factory_x(fo_tenant):
    return Factory.objects.create(tenant=fo_tenant, code="F-FO-X", name="Apex Knitwears")


@pytest.fixture
def factory_y(fo_tenant):
    return Factory.objects.create(tenant=fo_tenant, code="F-FO-Y", name="Vanguard Sweaters")


def _po(fo_tenant, buyer, factory, number):
    return PurchaseOrder.objects.create(
        tenant=fo_tenant, po_number=number,
        buyer=buyer, factory=factory, po_date=date(2026, 1, 1),
        delivery_date=date(2026, 6, 1), quantity=1000,
        unit_price=Decimal("5.00"), total_value=Decimal("5000.00"),
    )


@pytest.fixture
def seed_po(fo_tenant, buyer_a, factory_x):
    return _po(fo_tenant, buyer_a, factory_x, "PO-FO-100")


def _base():
    return "/api/v1/commercial/forward-orders"


def _payload(fo_tenant, buyer, factory, po=None, **kwargs):
    payload = {
        "month": "2026-09-01",
        "buyer": str(buyer.id),
        "factory": str(factory.id),
        "purchase_order": str(po.id) if po else None,
        "quantity": "1000",
        "unit_cost": "3.00",
        "service_pct": "3.00",
        "in_hand_units": "0",
        "status": "draft",
        "remarks": "Forward commitment for Sep.",
    }
    payload.update(kwargs)
    return payload


class TestForwardOrderModel:
    def test_defaults_and_service_charge(self, fo_tenant, seed_po):
        fwd = ForwardOrder.objects.create(
            tenant=fo_tenant, purchase_order=seed_po,
            buyer=seed_po.buyer, factory=seed_po.factory,
            month=date(2026, 9, 1),
            quantity=Decimal("1000"), unit_cost=Decimal("3.00"),
        )
        assert fwd.total_cost == Decimal("3000.00")
        assert fwd.service_pct == Decimal("3.00")
        assert fwd.service_charge == Decimal("90.00")
        assert fwd.status == "draft"
        assert fwd.in_hand_units == Decimal("0")

    def test_custom_service_pct_computes_charge(self, fo_tenant, seed_po):
        fwd = ForwardOrder.objects.create(
            tenant=fo_tenant, purchase_order=seed_po,
            buyer=seed_po.buyer, factory=seed_po.factory,
            month=date(2026, 10, 1),
            quantity=Decimal("2000"), unit_cost=Decimal("5.00"),
            service_pct=Decimal("5.00"),
        )
        assert fwd.total_cost == Decimal("10000.00")
        assert fwd.service_charge == Decimal("500.00")

    def test_recompute_on_save(self, fo_tenant, seed_po):
        fwd = ForwardOrder.objects.create(
            tenant=fo_tenant, purchase_order=seed_po,
            buyer=seed_po.buyer, factory=seed_po.factory,
            month=date(2026, 9, 1),
            quantity=Decimal("500"), unit_cost=Decimal("2.00"),
        )
        fwd.quantity = Decimal("1000")
        fwd.save()
        fwd.refresh_from_db()
        assert fwd.total_cost == Decimal("2000.00")
        assert fwd.service_charge == Decimal("60.00")


class TestForwardOrderAPI:
    def test_create_computes_display_fields(self, editor_client, fo_tenant, seed_po):
        resp = editor_client.post(
            f"{_base()}/", _payload(fo_tenant, seed_po.buyer, seed_po.factory, seed_po),
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        body = resp.data
        assert body["buyer_name"] == "Zara Kids"
        assert Decimal(body["total_cost"]) == Decimal("3000.00")
        assert Decimal(body["service_charge"]) == Decimal("90.00")
        assert body["po_number"] == "PO-FO-100"
        assert body["tenant"] == fo_tenant.id

    def test_list_and_search_by_po(self, editor_client, fo_tenant, buyer_a, factory_x, seed_po):
        ForwardOrder.objects.create(
            tenant=fo_tenant, purchase_order=seed_po, buyer=buyer_a, factory=factory_x,
            month=date(2026, 9, 1),
            quantity=Decimal("1000"), unit_cost=Decimal("3.00"),
        )
        resp = editor_client.get(_base()+"/", {"search": "PO-FO-100"})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1
        assert resp.data["results"][0]["po_number"] == "PO-FO-100"

    def test_filter_by_status_and_month(self, editor_client, fo_tenant, buyer_a, factory_x, seed_po):
        ForwardOrder.objects.create(
            tenant=fo_tenant, purchase_order=seed_po, buyer=buyer_a, factory=factory_x,
            month=date(2026, 9, 1),
            quantity=Decimal("1000"), unit_cost=Decimal("3.00"), status="confirmed",
        )
        resp = editor_client.get(_base()+"/", {"status": "confirmed"})
        assert resp.data["count"] == 1
        assert resp.data["results"][0]["status"] == "confirmed"

    def test_monthly_forward_action(self, editor_client, fo_tenant, buyer_a, buyer_b, factory_x, factory_y):
        a = ForwardOrder.objects.create(
            tenant=fo_tenant, buyer=buyer_a, factory=factory_x,
            month=date(2026, 9, 1),
            quantity=Decimal("1000"), unit_cost=Decimal("3.00"),
        )
        ForwardOrder.objects.create(
            tenant=fo_tenant, buyer=buyer_a, factory=factory_y,
            month=date(2026, 9, 1),
            quantity=Decimal("2000"), unit_cost=Decimal("4.00"),
        )
        ForwardOrder.objects.create(
            tenant=fo_tenant, buyer=buyer_b, factory=factory_x,
            month=date(2026, 10, 1),
            quantity=Decimal("500"), unit_cost=Decimal("2.00"),
        )
        resp = editor_client.get(f"{_base()}/monthly_forward/")
        assert resp.status_code == status.HTTP_200_OK
        rows = {r["month"]: r for r in resp.data["results"]}
        sep = rows["2026-09-01"]
        assert sep["count"] == 2
        assert Decimal(sep["quantity"]) == Decimal("3000.00")
        assert Decimal(sep["total_cost"]) == Decimal("11000.00")
        assert Decimal(sep["service_charge"]) == Decimal("330.00")
        assert a.total_cost == Decimal("3000.00")

    def test_update(self, editor_client, fo_tenant, buyer_a, factory_x):
        fwd = ForwardOrder.objects.create(
            tenant=fo_tenant, buyer=buyer_a, factory=factory_x,
            month=date(2026, 9, 1),
            quantity=Decimal("1000"), unit_cost=Decimal("3.00"),
        )
        resp = editor_client.patch(
            f"{_base()}/{fwd.id}/", {"quantity": "2000"}, format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        fwd.refresh_from_db()
        assert fwd.total_cost == Decimal("6000.00")

    def test_viewer_cannot_create(self, viewer_client, fo_tenant, seed_po):
        resp = viewer_client.post(
            f"{_base()}/", _payload(fo_tenant, seed_po.buyer, seed_po.factory, seed_po),
            format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_no_commercial_permission_cannot_list(self, nocomm_client):
        resp = nocomm_client.get(_base()+"/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_cross_tenant_isolation(self, viewer_client, fo_tenant2, buyer_a, factory_x, api_client):
        other = Tenant.objects.create(
            name="Other Co", slug="other-fo", schema_name="tenant_ofo", status="active"
        )
        role = _make_role(
            other, "OtherViewer",
            [(m, a) for m in ("commercial", "setup", "merchandising")
             for a in ("view",)],
        )
        user = _make_user(other, role, "other_fo_viewer")
        api_client.force_authenticate(user=user)
        ob = Buyer.objects.create(tenant=other, code="B-OT", name="Other Buyer")
        of = Factory.objects.create(tenant=other, code="F-OT", name="Other Factory")
        other_fwd = ForwardOrder.objects.create(
            tenant=other, buyer=ob, factory=of,
            month=date(2026, 9, 1),
            quantity=Decimal("100"), unit_cost=Decimal("2.00"),
        )
        auth = {"HTTP_X_TENANT_ID": str(other.id)}
        resp = api_client.get(_base()+"/", **auth)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1
        assert resp.data["results"][0]["id"] == str(other_fwd.id)