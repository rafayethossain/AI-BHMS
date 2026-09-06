"""
RQ-045 (B4): Supplier Payment + Due tests.

Target requirements (reference manual Supplier Payment / SP log): SP log CRUD,
invoice-value allocation by FN, due pivot by supplierxmonth, to-be-released
statuses, and a release workflow. Exposed as CRUD + due_pivot/release actions on
a Tabulator grid.
"""
from datetime import date
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.commercial.models import LC
from apps.logistics.models import SupplierPayment
from apps.merchandising.models import PurchaseOrder
from apps.setup.models import Buyer, Vendor
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def pay_tenant(db):
    return Tenant.objects.create(
        name="Supplier Payment Co", slug="supplier-payment",
        schema_name="tenant_sp", status="active"
    )


@pytest.fixture
def pay_tenant2(db):
    return Tenant.objects.create(
        name="Supplier Payment Co 2", slug="supplier-payment-2",
        schema_name="tenant_sp_2", status="active"
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
def pay_editor_client(api_client, pay_tenant):
    role = _make_role(
        pay_tenant, "PayAdmin",
        [(m, a) for m in ("logistics", "setup", "commercial", "merchandising")
         for a in ("view", "create", "edit", "delete")],
    )
    user = _make_user(pay_tenant, role, "pay_editor")
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def pay_viewer_client(api_client, pay_tenant):
    role = _make_role(
        pay_tenant, "PayViewer",
        [(m, a) for m in ("logistics", "setup", "commercial", "merchandising")
         for a in ("view",)],
    )
    user = _make_user(pay_tenant, role, "pay_viewer")
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def pay_nolog_client(api_client, pay_tenant):
    role = _make_role(pay_tenant, "NoLogistics", [("setup", "view")])
    user = _make_user(pay_tenant, role, "pay_nolog")
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def seed_vendor(pay_tenant):
    return Vendor.objects.create(tenant=pay_tenant, code="V-SP-1", name="Zenith Fabrics")


@pytest.fixture
def seed_factory(pay_tenant):
    from apps.setup.models import Factory
    return Factory.objects.create(tenant=pay_tenant, code="F-SP-1", name="Apex Knitwears")


@pytest.fixture
def seed_buyer(pay_tenant):
    return Buyer.objects.create(tenant=pay_tenant, code="B-SP-1", name="Test Buyer")


@pytest.fixture
def seed_po(pay_tenant, seed_buyer, seed_factory):
    po = PurchaseOrder.objects.create(
        tenant=pay_tenant, po_number="PO-SP-100",
        buyer=seed_buyer, factory=seed_factory, po_date=date(2026, 1, 1),
        delivery_date=date(2026, 6, 1), quantity=1000,
        unit_price=Decimal("5.00"), total_value=Decimal("5000.00"),
    )
    return po


def _payload(pay_tenant, vendor, po, **kwargs):
    payload = {
        "supplier": str(vendor.id) if vendor else None,
        "purchase_order": str(po.id) if po else None,
        "payment_ref": "SP-2026-001",
        "invoice_no": "SP-INV-100",
        "fn_ref": "FO-2026-0100",
        "allocated_amount": "5000.00",
        "amount": "5000.00",
        "currency": "USD",
        "payment_date": "2026-07-15",
        "due_date": "2099-08-15",
        "payment_method": "TT",
        "remarks": "Fabric settlement for PO-SP-100.",
    }
    payload.update(kwargs)
    return payload


def _base():
    return "/api/v1/logistics/supplier-payments"


class TestSupplierPaymentModel:
    def test_model_and_defaults(self, pay_tenant, seed_vendor, seed_po):
        sp = SupplierPayment.objects.create(
            tenant=pay_tenant, supplier=seed_vendor, purchase_order=seed_po,
            payment_ref="SP-DEF-1",
        )
        assert sp.id is not None
        assert sp.amount == Decimal("0.00")
        assert sp.allocated_amount == Decimal("0.00")
        assert not sp.released
        assert sp.released_by is None

    def test_payment_status_properties(self, pay_tenant, seed_vendor, seed_po):
        released = SupplierPayment.objects.create(
            tenant=pay_tenant, supplier=seed_vendor, purchase_order=seed_po,
            payment_ref="SP-REL", released=True, due_date=date(2020, 1, 1),
        )
        assert released.payment_status == "released"

        pending = SupplierPayment.objects.create(
            tenant=pay_tenant, supplier=seed_vendor, purchase_order=seed_po,
            payment_ref="SP-PEND", due_date=date(2099, 1, 1),
        )
        assert pending.payment_status == "to_be_released"

        overdue = SupplierPayment.objects.create(
            tenant=pay_tenant, supplier=seed_vendor, purchase_order=seed_po,
            payment_ref="SP-OD", due_date=date(2020, 1, 1),
        )
        assert overdue.payment_status == "overdue"


class TestSupplierPaymentAPI:
    def test_create_returns_display_fields(self, pay_editor_client, pay_tenant, seed_vendor, seed_po):
        resp = pay_editor_client.post(
            f"{_base()}/", _payload(pay_tenant, seed_vendor, seed_po), format="json"
        )
        assert resp.status_code == status.HTTP_201_CREATED
        body = resp.data
        assert body["supplier_name"] == "Zenith Fabrics"
        assert body["po_number"] == "PO-SP-100"
        assert body["payment_status"] == "to_be_released"
        assert body["tenant"] == pay_tenant.id
        assert body["created_by"] is not None

    def test_list_and_search(self, pay_editor_client, pay_tenant, seed_vendor, seed_po):
        SupplierPayment.objects.create(
            tenant=pay_tenant, supplier=seed_vendor, purchase_order=seed_po,
            payment_ref="SP-SEARCH-1", invoice_no="INV-AAA",
        )
        SupplierPayment.objects.create(
            tenant=pay_tenant, supplier=seed_vendor, purchase_order=seed_po,
            payment_ref="SP-SEARCH-2", invoice_no="INV-BBB",
        )
        resp = pay_editor_client.get(_base()+"/", {"search": "SP-SEARCH-1"})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1
        assert resp.data["results"][0]["payment_ref"] == "SP-SEARCH-1"
        resp2 = pay_editor_client.get(_base()+"/", {"search": "Zenith"})
        assert resp2.data["count"] == 2

    def test_filter_by_status_and_supplier(self, pay_editor_client, pay_tenant, seed_vendor, seed_po):
        SupplierPayment.objects.create(
            tenant=pay_tenant, supplier=seed_vendor, purchase_order=seed_po,
            payment_ref="SP-F1", released=True, due_date=date(2020, 1, 1),
        )
        SupplierPayment.objects.create(
            tenant=pay_tenant, supplier=seed_vendor, purchase_order=seed_po,
            payment_ref="SP-F2", due_date=date(2020, 1, 1),
        )
        resp = pay_editor_client.get(_base()+"/", {"status": "overdue"})
        assert resp.data["count"] == 1
        assert resp.data["results"][0]["payment_ref"] == "SP-F2"

    def test_release_action(self, pay_editor_client, pay_tenant, seed_vendor, seed_po):
        sp = SupplierPayment.objects.create(
            tenant=pay_tenant, supplier=seed_vendor, purchase_order=seed_po,
            payment_ref="SP-REL-1", due_date=date(2099, 1, 1),
        )
        resp = pay_editor_client.post(f"{_base()}/{sp.id}/release/")
        assert resp.status_code == status.HTTP_200_OK
        sp.refresh_from_db()
        assert sp.released is True
        assert sp.released_at is not None
        assert sp.released_by is not None
        assert sp.payment_status == "released"

    def test_due_pivot_action(self, pay_editor_client, pay_tenant, seed_vendor, seed_po):
        SupplierPayment.objects.create(
            tenant=pay_tenant, supplier=seed_vendor, purchase_order=seed_po,
            payment_ref="SP-P1", amount=Decimal("1000.00"), due_date=date(2026, 8, 15),
        )
        SupplierPayment.objects.create(
            tenant=pay_tenant, supplier=seed_vendor, purchase_order=seed_po,
            payment_ref="SP-P2", amount=Decimal("2500.00"), due_date=date(2026, 8, 20),
        )
        resp = pay_editor_client.get(f"{_base()}/due_pivot/", {"month": "2026-08"})
        assert resp.status_code == status.HTTP_200_OK
        rows = resp.data["results"] if isinstance(resp.data, dict) else resp.data
        assert any(r["supplier"] == "Zenith Fabrics" and r["month"] == "2026-08" for r in rows)

    def test_update(self, pay_editor_client, pay_tenant, seed_vendor, seed_po):
        sp = SupplierPayment.objects.create(
            tenant=pay_tenant, supplier=seed_vendor, purchase_order=seed_po,
            payment_ref="SP-U1",
        )
        resp = pay_editor_client.patch(
            f"{_base()}/{sp.id}/",
            {"amount": "9000.00", "payment_method": "LC"}, format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        sp.refresh_from_db()
        assert sp.amount == Decimal("9000.00")
        assert sp.payment_method == "LC"

    def test_delete(self, pay_editor_client, pay_tenant, seed_vendor, seed_po):
        sp = SupplierPayment.objects.create(
            tenant=pay_tenant, supplier=seed_vendor, purchase_order=seed_po,
            payment_ref="SP-D1",
        )
        resp = pay_editor_client.delete(f"{_base()}/{sp.id}/")
        assert resp.status_code == status.HTTP_204_NO_CONTENT
        assert not SupplierPayment.objects.filter(pk=sp.id).exists()

    def test_viewer_cannot_create_or_release(self, pay_viewer_client, pay_tenant, seed_vendor, seed_po):
        resp = pay_viewer_client.post(
            f"{_base()}/", _payload(pay_tenant, seed_vendor, seed_po), format="json"
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN
        sp = SupplierPayment.objects.create(
            tenant=pay_tenant, supplier=seed_vendor, purchase_order=seed_po,
            payment_ref="SP-VIEW-1",
        )
        rel = pay_viewer_client.post(f"{_base()}/{sp.id}/release/")
        assert rel.status_code == status.HTTP_403_FORBIDDEN

    def test_no_logistics_permission_cannot_list(self, pay_nolog_client):
        resp = pay_nolog_client.get(_base()+"/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_cross_tenant_isolation(self, pay_editor_client, pay_tenant2, seed_vendor, seed_po, api_client):
        other = Tenant.objects.create(
            name="Other Co", slug="other-sp", schema_name="tenant_osp", status="active"
        )
        role = _make_role(
            other, "OtherAdmin",
            [(m, a) for m in ("logistics", "setup", "commercial", "merchandising")
             for a in ("view", "create", "edit", "delete")],
        )
        user = _make_user(other, role, "other_sp_editor")
        api_client.force_authenticate(user=user)
        other_rec = SupplierPayment.objects.create(
            tenant=other, payment_ref="SP-OTHER-1", amount=Decimal("500.00"),
        )
        SupplierPayment.objects.create(
            tenant=pay_tenant2, payment_ref="SP-OTHER-2", amount=Decimal("600.00"),
        )
        auth = {"HTTP_X_TENANT_ID": str(other.id)}
        list_resp = api_client.get(_base()+"/", **auth)
        assert list_resp.status_code == status.HTTP_200_OK
        assert list_resp.data["count"] == 1
        assert list_resp.data["results"][0]["payment_ref"] == "SP-OTHER-1"
        get_resp = api_client.get(f"{_base()}/{other_rec.id}/", **auth)
        assert get_resp.status_code == status.HTTP_200_OK
        other_two = SupplierPayment.objects.get(payment_ref="SP-OTHER-2")
        missing = api_client.get(f"{_base()}/{other_two.id}/", **auth)
        assert missing.status_code == status.HTTP_404_NOT_FOUND