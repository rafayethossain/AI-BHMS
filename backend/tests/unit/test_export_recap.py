"""
RQ-044 (B3): Export Recap tests.

Target requirements (reference manual Logistics / Export Recap): per-hit landed
economics — identifiers (FN/PO/style/buyer/factory/FOB no, factory & customer
invoice + dates, S/C), quantities, FOB/CMPT/cost values + service %, logistics
(ex-factory, mode, forwarder, HBL, on-board/ETA, container, BL, courier), and
the payment-to-factory + payment-from-customer pipelines (terms, due date,
received, overdue). Exposed as CRUD + Tabulator grid + Excel export.
"""
from datetime import date
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.logistics.models import ExportRecap, FreightForwarder
from apps.setup.models import Factory
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def export_tenant(db):
    return Tenant.objects.create(
        name="Export Recap Co", slug="export-recap",
        schema_name="tenant_export", status="active"
    )


@pytest.fixture
def export_tenant2(db):
    return Tenant.objects.create(
        name="Export Recap Co 2", slug="export-recap-2",
        schema_name="tenant_export_2", status="active"
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
def export_editor_client(api_client, export_tenant):
    role = _make_role(
        export_tenant, "ExportAdmin",
        [(m, a) for m in ("logistics", "setup") for a in ("view", "create", "edit", "delete")],
    )
    user = _make_user(export_tenant, role, "export_editor")
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def export_viewer_client(api_client, export_tenant):
    role = _make_role(
        export_tenant, "ExportViewer",
        [(m, a) for m in ("logistics", "setup") for a in ("view",)],
    )
    user = _make_user(export_tenant, role, "export_viewer")
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def export_nolog_client(api_client, export_tenant):
    role = _make_role(export_tenant, "NoLogistics", [("setup", "view")])
    user = _make_user(export_tenant, role, "export_nolog")
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def seed_factory(export_tenant):
    return Factory.objects.create(tenant=export_tenant, code="F-EXP-1", name="Apex Knitwears")


@pytest.fixture
def seed_forwarder(export_tenant):
    return FreightForwarder.objects.create(
        tenant=export_tenant, code="FF-EXP-1", name="OceanSwift Logistics"
    )


def _payload(export_tenant, factory, forwarder, **kwargs):
    payload = {
        "factory": str(factory.id) if factory else None,
        "forwarder": str(forwarder.id) if forwarder else None,
        "fob_no": "FOB-2026-101",
        "s_c_number": "SC-2026-777",
        "factory_invoice": "FI-2026-301",
        "factory_invoice_date": "2026-07-15",
        "customer_invoice": "CI-2026-501",
        "customer_invoice_date": "2026-07-20",
        "quantity": "1000",
        "fob_value": "85000.00",
        "cmpt_value": "43000.00",
        "cost_value": "38000.00",
        "service_pct": "3.000",
        "ex_factory_date": "2026-07-28",
        "mode": "sea",
        "hbl": "OONL2026HBL884",
        "on_board_date": "2026-07-30",
        "eta_date": "2026-08-25",
        "container": "TCLU5566778",
        "bl_number": "OOLU2026098765",
        "courier": "DHL Express",
        "factory_pay_terms": "60 days",
        "factory_amount": "50000.00",
        "factory_due_date": "2026-09-25",
        "factory_paid_date": None,
        "customer_pay_terms": "30 days",
        "customer_received_amount": "85000.00",
        "customer_due_date": "2026-08-20",
        "customer_payment_date": "2026-08-18",
        "remarks": "Full FOB lot to London.",
    }
    payload.update(kwargs)
    return payload


def _base():
    return "/api/v1/logistics/export-recaps"


class TestExportRecapModel:
    def test_model_and_defaults(self, export_tenant, seed_factory, seed_forwarder):
        rec = ExportRecap.objects.create(
            tenant=export_tenant, factory=seed_factory, forwarder=seed_forwarder,
            fob_no="FOB-X",
        )
        assert rec.id is not None
        assert rec.mode == "sea"
        assert rec.quantity == Decimal("0.00")
        assert rec.fob_value == Decimal("0.00")
        assert rec.cmpt_value == Decimal("0.00")
        assert rec.cost_value == Decimal("0.00")
        assert rec.factory_amount == Decimal("0.00")
        assert rec.customer_received_amount == Decimal("0.00")

    def test_payment_status_properties(self, export_tenant, seed_factory):
        pending = ExportRecap.objects.create(
            tenant=export_tenant, factory=seed_factory, fob_no="FOB-P",
            factory_due_date=date(2099, 1, 1), customer_due_date=date(2099, 1, 1),
        )
        assert pending.factory_payment_status == "pending"
        assert pending.customer_payment_status == "pending"

        paid = ExportRecap.objects.create(
            tenant=export_tenant, factory=seed_factory, fob_no="FOB-PAID",
            factory_due_date=date(2026, 1, 1), factory_paid_date=date(2026, 1, 2),
        )
        assert paid.factory_payment_status == "paid"

        received = ExportRecap.objects.create(
            tenant=export_tenant, factory=seed_factory, fob_no="FOB-REC",
            customer_due_date=date(2026, 1, 1), customer_payment_date=date(2026, 1, 2),
        )
        assert received.customer_payment_status == "received"

        overdue = ExportRecap.objects.create(
            tenant=export_tenant, factory=seed_factory, fob_no="FOB-OD",
            factory_due_date=date(2020, 1, 1), customer_due_date=date(2020, 1, 1),
        )
        assert overdue.factory_payment_status == "overdue"
        assert overdue.customer_payment_status == "overdue"


class TestExportRecapAPI:
    def test_create_returns_display_fields(self, export_editor_client, export_tenant, seed_factory, seed_forwarder):
        resp = export_editor_client.post(
            f"{_base()}/", _payload(export_tenant, seed_factory, seed_forwarder), format="json"
        )
        assert resp.status_code == status.HTTP_201_CREATED
        body = resp.data
        assert body["factory_name"] == "Apex Knitwears"
        assert body["forwarder_name"] == "OceanSwift Logistics"
        assert body["mode_label"] == "Sea"
        assert body["factory_payment_status"] == "pending"
        assert body["customer_payment_status"] == "received"
        assert body["tenant"] == export_tenant.id
        assert body["created_by"] is not None

    def test_list_and_search(self, export_editor_client, export_tenant, seed_factory, seed_forwarder):
        ExportRecap.objects.create(
            tenant=export_tenant, factory=seed_factory, forwarder=seed_forwarder,
            fob_no="FOB-SEARCH-1", hbl="HBL-AAA",
        )
        ExportRecap.objects.create(
            tenant=export_tenant, factory=seed_factory, forwarder=seed_forwarder,
            fob_no="FOB-SEARCH-2", hbl="HBL-BBB",
        )
        resp = export_editor_client.get(_base()+"/", {"search": "FOB-SEARCH-1"})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1
        assert resp.data["results"][0]["fob_no"] == "FOB-SEARCH-1"
        resp2 = export_editor_client.get(_base()+"/", {"search": "OceanSwift"})
        assert resp2.data["count"] == 2

    def test_filter_by_mode_and_factory(self, export_editor_client, export_tenant, seed_factory, seed_forwarder):
        ExportRecap.objects.create(
            tenant=export_tenant, factory=seed_factory, forwarder=seed_forwarder,
            fob_no="FOB-F1", mode="sea",
        )
        ExportRecap.objects.create(
            tenant=export_tenant, factory=seed_factory, forwarder=seed_forwarder,
            fob_no="FOB-F2", mode="air",
        )
        resp = export_editor_client.get(_base()+"/", {"mode": "air"})
        assert resp.data["count"] == 1
        assert resp.data["results"][0]["fob_no"] == "FOB-F2"

    def test_update_records_payments(self, export_editor_client, export_tenant, seed_factory, seed_forwarder):
        rec = ExportRecap.objects.create(
            tenant=export_tenant, factory=seed_factory, forwarder=seed_forwarder,
            fob_no="FOB-U1", factory_due_date=date(2026, 1, 1),
        )
        resp = export_editor_client.patch(
            f"{_base()}/{rec.id}/",
            {"factory_paid_date": "2026-01-15", "factory_amount": "12000.00"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        rec.refresh_from_db()
        assert str(rec.factory_paid_date) == "2026-01-15"
        assert rec.factory_amount == Decimal("12000.00")
        assert rec.factory_payment_status == "paid"

    def test_delete(self, export_editor_client, export_tenant, seed_factory):
        rec = ExportRecap.objects.create(tenant=export_tenant, factory=seed_factory, fob_no="FOB-D1")
        resp = export_editor_client.delete(f"{_base()}/{rec.id}/")
        assert resp.status_code == status.HTTP_204_NO_CONTENT
        assert not ExportRecap.objects.filter(pk=rec.id).exists()

    def test_viewer_cannot_create(self, export_viewer_client, export_tenant, seed_factory, seed_forwarder):
        resp = export_viewer_client.post(
            f"{_base()}/", _payload(export_tenant, seed_factory, seed_forwarder), format="json"
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_no_logistics_permission_cannot_list(self, export_nolog_client):
        resp = export_nolog_client.get(_base()+"/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_cross_tenant_isolation(self, export_editor_client, export_tenant2, seed_factory, seed_forwarder, api_client):
        other = Tenant.objects.create(
            name="Other Co", slug="other-export", schema_name="tenant_oe", status="active"
        )
        role = _make_role(
            other, "OtherAdmin",
            [(m, a) for m in ("logistics", "setup") for a in ("view", "create", "edit", "delete")],
        )
        user = _make_user(other, role, "other_editor")
        api_client.force_authenticate(user=user)
        other_rec = ExportRecap.objects.create(
            tenant=other, factory=seed_factory, fob_no="FOB-OTHER-1",
        )
        ExportRecap.objects.create(
            tenant=export_tenant2, factory=seed_factory, fob_no="FOB-OTHER-2",
        )
        auth = {"HTTP_X_TENANT_ID": str(other.id)}
        list_resp = api_client.get(_base()+"/", **auth)
        assert list_resp.status_code == status.HTTP_200_OK
        assert list_resp.data["count"] == 1
        assert list_resp.data["results"][0]["fob_no"] == "FOB-OTHER-1"
        get_resp = api_client.get(f"{_base()}/{other_rec.id}/", **auth)
        assert get_resp.status_code == status.HTTP_200_OK
        other_two = ExportRecap.objects.get(fob_no="FOB-OTHER-2")
        missing = api_client.get(f"{_base()}/{other_two.id}/", **auth)
        assert missing.status_code == status.HTTP_404_NOT_FOUND