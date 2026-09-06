"""
RQ-047 (B6): Sales Summary + Import/Export Recap report tests.

Target requirements (reference manual Sales Summary / Recap reports):
expose read-only aggregate reports grouped per buyer and per factory for the
export sales figures (quantity, FOB, CMPT, cost, factory payable, customer
received) and grouped per supplier / factory / item-category for the inbound
(Import Recap) values.  These are on-demand aggregations over the recap grids
shipped in B2 (ImportRecap) and B3 (ExportRecap); no new persistence is needed.
"""
from datetime import date
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.logistics.models import ExportRecap, ImportRecap
from apps.merchandising.models import PurchaseOrder
from apps.setup.models import Buyer, Factory, Vendor
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def sr_tenant(db):
    return Tenant.objects.create(
        name="Summary Co", slug="summary-co",
        schema_name="tenant_sr", status="active"
    )


@pytest.fixture
def sr_tenant2(db):
    return Tenant.objects.create(
        name="Summary Co 2", slug="summary-co-2",
        schema_name="tenant_sr_2", status="active"
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
def viewer_client(api_client, sr_tenant):
    role = _make_role(
        sr_tenant, "SrViewer",
        [(m, a) for m in ("logistics", "setup", "merchandising")
         for a in ("view",)],
    )
    user = _make_user(sr_tenant, role, "sr_viewer")
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def nolog_client(api_client, sr_tenant):
    role = _make_role(sr_tenant, "NoLogistics", [("setup", "view")])
    user = _make_user(sr_tenant, role, "sr_nolog")
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def buyer_a(sr_tenant):
    return Buyer.objects.create(tenant=sr_tenant, code="B-SR-A", name="Zara Kids")


@pytest.fixture
def buyer_b(sr_tenant):
    return Buyer.objects.create(tenant=sr_tenant, code="B-SR-B", name="H&M Basics")


@pytest.fixture
def factory_x(sr_tenant):
    return Factory.objects.create(tenant=sr_tenant, code="F-SR-X", name="Apex Knitwears")


@pytest.fixture
def factory_y(sr_tenant):
    return Factory.objects.create(tenant=sr_tenant, code="F-SR-Y", name="Vanguard Sweaters")


@pytest.fixture
def vendor_m(sr_tenant):
    return Vendor.objects.create(tenant=sr_tenant, code="V-SR-M", name="Zenith Fabrics")


@pytest.fixture
def vendor_n(sr_tenant):
    return Vendor.objects.create(tenant=sr_tenant, code="V-SR-N", name="Crest Trims")


def _po(sr_tenant, buyer, factory, number, qty):
    return PurchaseOrder.objects.create(
        tenant=sr_tenant, po_number=number,
        buyer=buyer, factory=factory, po_date=date(2026, 1, 1),
        delivery_date=date(2026, 6, 1), quantity=qty,
        unit_price=Decimal("5.00"), total_value=Decimal("5000.00"),
    )


@pytest.fixture
def po_ax(sr_tenant, buyer_a, factory_x):
    return _po(sr_tenant, buyer_a, factory_x, "PO-SR-101", 1000)


@pytest.fixture
def po_ax2(sr_tenant, buyer_a, factory_x):
    return _po(sr_tenant, buyer_a, factory_x, "PO-SR-102", 2000)


@pytest.fixture
def po_by(sr_tenant, buyer_b, factory_y):
    return _po(sr_tenant, buyer_b, factory_y, "PO-SR-201", 1500)


@pytest.fixture
def seed_export_recaps(sr_tenant, po_ax, po_ax2, po_by):
    return [
        ExportRecap.objects.create(
            tenant=sr_tenant, purchase_order=po_ax, factory=po_ax.factory,
            fob_no="FOB-SR-101", quantity=1000,
            fob_value=Decimal("5000.00"), cmpt_value=Decimal("2000.00"),
            cost_value=Decimal("4800.00"),
            factory_amount=Decimal("2000.00"), customer_received_amount=Decimal("5000.00"),
        ),
        ExportRecap.objects.create(
            tenant=sr_tenant, purchase_order=po_ax2, factory=po_ax2.factory,
            fob_no="FOB-SR-102", quantity=2000,
            fob_value=Decimal("9000.00"), cmpt_value=Decimal("3600.00"),
            cost_value=Decimal("8600.00"),
            factory_amount=Decimal("3400.00"), customer_received_amount=Decimal("8400.00"),
        ),
        ExportRecap.objects.create(
            tenant=sr_tenant, purchase_order=po_by, factory=po_by.factory,
            fob_no="FOB-SR-201", quantity=1500,
            fob_value=Decimal("6000.00"), cmpt_value=Decimal("2400.00"),
            cost_value=Decimal("5800.00"),
            factory_amount=Decimal("2500.00"), customer_received_amount=Decimal("6000.00"),
        ),
    ]


@pytest.fixture
def seed_import_recaps(sr_tenant, vendor_m, vendor_n, factory_x, factory_y):
    return [
        ImportRecap.objects.create(
            tenant=sr_tenant, supplier=vendor_m, factory=factory_x,
            s_c_number="SC-SR-1", item_category="fabric",
            invoice_value=Decimal("1000.00"), quantity=500.00,
        ),
        ImportRecap.objects.create(
            tenant=sr_tenant, supplier=vendor_m, factory=factory_x,
            s_c_number="SC-SR-2", item_category="trims",
            invoice_value=Decimal("400.00"), quantity=120.00,
        ),
        ImportRecap.objects.create(
            tenant=sr_tenant, supplier=vendor_n, factory=factory_y,
            s_c_number="SC-SR-3", item_category="fabric",
            invoice_value=Decimal("800.00"), quantity=300.00,
        ),
    ]


def _base():
    return "/api/v1/logistics"


class TestSalesSummary:
    def test_per_buyer_totals(self, viewer_client, sr_tenant, seed_export_recaps):
        auth = {"HTTP_X_TENANT_ID": str(sr_tenant.id)}
        resp = viewer_client.get(f"{_base()}/export-recaps/sales_summary/", **auth)
        assert resp.status_code == status.HTTP_200_OK
        body = resp.data
        buyers = {b["buyer"]: b for b in body["buyers"]}
        assert "Zara Kids" in buyers
        assert "H&M Basics" in buyers
        zara = buyers["Zara Kids"]
        assert Decimal(zara["quantity"]) == Decimal("3000.00")
        assert Decimal(zara["fob_value"]) == Decimal("14000.00")
        assert Decimal(zara["cmpt_value"]) == Decimal("5600.00")
        assert Decimal(zara["cost_value"]) == Decimal("13400.00")
        assert Decimal(zara["factory_amount"]) == Decimal("5400.00")
        assert Decimal(zara["customer_received_amount"]) == Decimal("13400.00")

    def test_grand_total(self, viewer_client, sr_tenant, seed_export_recaps):
        auth = {"HTTP_X_TENANT_ID": str(sr_tenant.id)}
        resp = viewer_client.get(f"{_base()}/export-recaps/sales_summary/", **auth)
        total = resp.data["total"]
        assert Decimal(total["quantity"]) == Decimal("4500.00")
        assert Decimal(total["fob_value"]) == Decimal("20000.00")
        assert Decimal(total["factory_amount"]) == Decimal("7900.00")

    def test_per_factory_totals(self, viewer_client, sr_tenant, seed_export_recaps):
        auth = {"HTTP_X_TENANT_ID": str(sr_tenant.id)}
        resp = viewer_client.get(f"{_base()}/export-recaps/sales_summary/", **auth)
        factories = {f["factory"]: f for f in resp.data["factories"]}
        assert "Apex Knitwears" in factories
        assert Decimal(factories["Apex Knitwears"]["fob_value"]) == Decimal("14000.00")
        assert Decimal(factories["Vanguard Sweaters"]["fob_value"]) == Decimal("6000.00")


class TestRecapSummary:
    def test_import_per_supplier_and_factory(self, viewer_client, sr_tenant, seed_import_recaps):
        auth = {"HTTP_X_TENANT_ID": str(sr_tenant.id)}
        resp = viewer_client.get(f"{_base()}/import-recaps/recap_summary/", **auth)
        assert resp.status_code == status.HTTP_200_OK
        suppliers = {s["supplier"]: s for s in resp.data["suppliers"]}
        assert Decimal(suppliers["Zenith Fabrics"]["invoice_value"]) == Decimal("1400.00")
        assert Decimal(suppliers["Crest Trims"]["invoice_value"]) == Decimal("800.00")
        factories = {f["factory"]: f for f in resp.data["factories"]}
        assert Decimal(factories["Apex Knitwears"]["invoice_value"]) == Decimal("1400.00")
        assert Decimal(factories["Vanguard Sweaters"]["invoice_value"]) == Decimal("800.00")

    def test_import_per_item_category(self, viewer_client, sr_tenant, seed_import_recaps):
        auth = {"HTTP_X_TENANT_ID": str(sr_tenant.id)}
        resp = viewer_client.get(f"{_base()}/import-recaps/recap_summary/", **auth)
        categories = {c["item_category"]: c for c in resp.data["categories"]}
        assert Decimal(categories["fabric"]["invoice_value"]) == Decimal("1800.00")
        assert Decimal(categories["trims"]["invoice_value"]) == Decimal("400.00")

    def test_export_recap_summary(self, viewer_client, sr_tenant, seed_export_recaps):
        auth = {"HTTP_X_TENANT_ID": str(sr_tenant.id)}
        resp = viewer_client.get(f"{_base()}/export-recaps/recap_summary/", **auth)
        assert resp.status_code == status.HTTP_200_OK
        factories = {f["factory"]: f for f in resp.data["factories"]}
        assert Decimal(factories["Apex Knitwears"]["quantity"]) == Decimal("3000.00")
        assert Decimal(factories["Vanguard Sweaters"]["quantity"]) == Decimal("1500.00")
        assert Decimal(resp.data["total"]["fob_value"]) == Decimal("20000.00")


class TestRBACAndIsolation:
    def test_no_logistics_permission_forbidden(self, nolog_client, sr_tenant):
        auth = {"HTTP_X_TENANT_ID": str(sr_tenant.id)}
        resp = nolog_client.get(f"{_base()}/export-recaps/sales_summary/", **auth)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_cross_tenant_isolation(self, viewer_client, sr_tenant2, seed_export_recaps, api_client):
        other = Tenant.objects.create(
            name="Other Co", slug="other-sr", schema_name="tenant_osr", status="active"
        )
        role = _make_role(
            other, "OtherViewer",
            [(m, a) for m in ("logistics", "setup", "merchandising")
             for a in ("view",)],
        )
        user = _make_user(other, role, "other_sr_viewer")
        api_client.force_authenticate(user=user)
        ob = Buyer.objects.create(tenant=other, code="B-OT", name="Other Buyer")
        of = Factory.objects.create(tenant=other, code="F-OT", name="Other Factory")
        opo = _po(other, ob, of, "PO-OT-1", 100)
        ExportRecap.objects.create(
            tenant=other, purchase_order=opo, factory=of,
            fob_no="FOB-OT-1", quantity=100,
            fob_value=Decimal("100.00"), cmpt_value=Decimal("40.00"),
            cost_value=Decimal("95.00"), factory_amount=Decimal("40.00"),
            customer_received_amount=Decimal("100.00"),
        )
        auth = {"HTTP_X_TENANT_ID": str(other.id)}
        resp = api_client.get(f"{_base()}/export-recaps/sales_summary/", **auth)
        assert resp.status_code == status.HTTP_200_OK
        buyers = {b["buyer"] for b in resp.data["buyers"]}
        assert buyers == {"Other Buyer"}
        assert Decimal(resp.data["total"]["quantity"]) == Decimal("100.00")


class TestMixed:
    def test_summary_returns_only_when_rows_exist(self, viewer_client, sr_tenant):
        auth = {"HTTP_X_TENANT_ID": str(sr_tenant.id)}
        resp = viewer_client.get(f"{_base()}/export-recaps/sales_summary/", **auth)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["buyers"] == []
        assert Decimal(resp.data["total"]["quantity"]) == Decimal("0.00")