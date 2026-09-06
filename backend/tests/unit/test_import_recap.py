"""
RQ-043 (B2): Import Recap tests.

Target requirements (reference manual Logistics / Import Recap): fabric & trim
inbound tracking with supplier/vendor, factory, s/c no, invoice value, item
category, qty, rolls/bales, container, B/L-HAWB, mode (Sea/Air), LC/FOC,
vessel, milestone dates PCD/ETD/ETA/ATB/Unstuffed/In-house, clearing agent,
docs workflow flag, status and remarks. Exposed as CRUD + Tabulator grid +
Excel export.
"""
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.logistics.models import ImportRecap
from apps.setup.models import Factory, Vendor
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def import_tenant(db):
    return Tenant.objects.create(
        name="Import Recap Co", slug="import-recap",
        schema_name="tenant_import", status="active"
    )


@pytest.fixture
def import_tenant2(db):
    return Tenant.objects.create(
        name="Import Recap Co 2", slug="import-recap-2",
        schema_name="tenant_import_2", status="active"
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
def import_editor_client(api_client, import_tenant):
    role = _make_role(
        import_tenant, "ImportAdmin",
        [(m, a) for m in ("logistics", "setup")
         for a in ("view", "create", "edit", "delete")],
    )
    user = _make_user(import_tenant, role, "import_editor")
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def import_viewer_client(api_client, import_tenant):
    role = _make_role(
        import_tenant, "ImportViewer",
        [(m, a) for m in ("logistics", "setup") for a in ("view",)],
    )
    user = _make_user(import_tenant, role, "import_viewer")
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def import_nolog_client(api_client, import_tenant):
    role = _make_role(import_tenant, "NoLogistics", [("setup", "view")])
    user = _make_user(import_tenant, role, "import_nolog")
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def seed_supplier(import_tenant):
    return Vendor.objects.create(
        tenant=import_tenant, code="V-IMP-1", name="Smart Spinning Mills Ltd"
    )


@pytest.fixture
def seed_factory(import_tenant):
    return Factory.objects.create(tenant=import_tenant, code="F-IMP-1", name="Apex Knitwears")


def _payload(tenant, supplier, factory, **kwargs):
    payload = {
        "supplier": str(supplier.id),
        "factory": str(factory.id),
        "s_c_number": "SC-2026-888",
        "invoice_value": "12500.00",
        "item_category": "fabric",
        "quantity": "45",
        "rolls_bales": 180,
        "container": "TCLU1234567",
        "bl_hawb": "OOLU2312345678",
        "mode": "sea",
        "lc_foc": "lc",
        "vessel": "CMA CGM FRANKLIN",
        "pcd_date": "2026-08-01",
        "etd_date": "2026-08-10",
        "eta_date": "2026-09-12",
        "atb_date": "2026-09-14",
        "unstuffed_date": "2026-09-16",
        "in_house_date": "2026-09-18",
        "agent": "Progressive Clearing Agent",
        "docs_received": True,
        "status": "in_transit",
        "remarks": "Priority inbound for PO 1015 fabric.",
    }
    payload.update(kwargs)
    return payload


def _base():
    return "/api/v1/logistics/import-recaps"


class TestImportRecapModel:
    def test_model_and_defaults(self, import_tenant, seed_supplier, seed_factory):
        rec = ImportRecap.objects.create(
            tenant=import_tenant, supplier=seed_supplier, factory=seed_factory,
            s_c_number="SC-X",
        )
        assert rec.id is not None
        assert rec.status == "planned"
        assert rec.docs_received is False
        assert rec.mode == "sea"
        assert rec.lc_foc == "lc"
        assert rec.invoice_value == Decimal("0.00")
        assert rec.quantity == Decimal("0.00")

    def test_milestones_persist(self, import_tenant, seed_supplier, seed_factory):
        rec = ImportRecap.objects.create(
            tenant=import_tenant, supplier=seed_supplier, factory=seed_factory,
            s_c_number="SC-M1", pcd_date="2026-08-01", etd_date="2026-08-10",
            eta_date="2026-09-12", atb_date="2026-09-14",
            unstuffed_date="2026-09-16", in_house_date="2026-09-18",
        )
        rec.refresh_from_db()
        assert str(rec.pcd_date) == "2026-08-01"
        assert str(rec.etd_date) == "2026-08-10"
        assert str(rec.eta_date) == "2026-09-12"
        assert str(rec.atb_date) == "2026-09-14"
        assert str(rec.unstuffed_date) == "2026-09-16"
        assert str(rec.in_house_date) == "2026-09-18"


class TestImportRecapAPI:
    def test_create_returns_display_fields(self, import_editor_client, import_tenant, seed_supplier, seed_factory):
        resp = import_editor_client.post(
            f"{_base()}/", _payload(import_tenant, seed_supplier, seed_factory), format="json"
        )
        assert resp.status_code == status.HTTP_201_CREATED
        body = resp.data
        assert body["supplier_name"] == "Smart Spinning Mills Ltd"
        assert body["factory_name"] == "Apex Knitwears"
        assert body["mode_label"] == "Sea"
        assert body["lc_foc_label"] == "LC"
        assert body["item_category_label"] == "Fabric"
        assert body["status_label"] == "In Transit"
        assert body["tenant"] == import_tenant.id
        assert body["created_by"] is not None

    def test_list_and_search(self, import_editor_client, import_tenant, seed_supplier, seed_factory):
        ImportRecap.objects.create(
            tenant=import_tenant, supplier=seed_supplier, factory=seed_factory,
            s_c_number="SC-SEARCH-1", vessel="MAERSK KOWLOON",
        )
        ImportRecap.objects.create(
            tenant=import_tenant, supplier=seed_supplier, factory=seed_factory,
            s_c_number="SC-SEARCH-2", vessel="EVER GIVEN",
        )
        resp = import_editor_client.get(_base()+"/", {"search": "SC-SEARCH-1"})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1
        assert resp.data["results"][0]["s_c_number"] == "SC-SEARCH-1"
        resp2 = import_editor_client.get(_base()+"/", {"search": "Smart Spinning"})
        assert resp2.data["count"] == 2

    def test_filter_by_status_and_mode(self, import_editor_client, import_tenant, seed_supplier, seed_factory):
        ImportRecap.objects.create(
            tenant=import_tenant, supplier=seed_supplier, factory=seed_factory,
            s_c_number="SC-F1", status="in_transit", mode="sea",
        )
        ImportRecap.objects.create(
            tenant=import_tenant, supplier=seed_supplier, factory=seed_factory,
            s_c_number="SC-F2", status="closed", mode="air",
        )
        resp = import_editor_client.get(_base()+"/", {"status": "closed"})
        assert resp.data["count"] == 1
        assert resp.data["results"][0]["s_c_number"] == "SC-F2"
        resp2 = import_editor_client.get(_base()+"/", {"mode": "air"})
        assert resp2.data["count"] == 1

    def test_update_advances_milestones(self, import_editor_client, import_tenant, seed_supplier, seed_factory):
        rec = ImportRecap.objects.create(
            tenant=import_tenant, supplier=seed_supplier, factory=seed_factory,
            s_c_number="SC-U1", status="in_transit",
        )
        resp = import_editor_client.patch(
            f"{_base()}/{rec.id}/",
            {"status": "unstuffed", "unstuffed_date": "2026-09-16", "atb_date": "2026-09-14"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        rec.refresh_from_db()
        assert rec.status == "unstuffed"
        assert str(rec.unstuffed_date) == "2026-09-16"

    def test_delete(self, import_editor_client, import_tenant, seed_supplier, seed_factory):
        rec = ImportRecap.objects.create(
            tenant=import_tenant, supplier=seed_supplier, factory=seed_factory, s_c_number="SC-D1",
        )
        resp = import_editor_client.delete(f"{_base()}/{rec.id}/")
        assert resp.status_code == status.HTTP_204_NO_CONTENT
        assert not ImportRecap.objects.filter(pk=rec.id).exists()

    def test_viewer_cannot_create(self, import_viewer_client, import_tenant, seed_supplier, seed_factory):
        resp = import_viewer_client.post(
            f"{_base()}/", _payload(import_tenant, seed_supplier, seed_factory), format="json"
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_no_logistics_permission_cannot_list(self, import_nolog_client):
        resp = import_nolog_client.get(_base()+"/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_cross_tenant_isolation(self, import_editor_client, import_tenant2, seed_supplier, seed_factory, api_client):
        other = Tenant.objects.create(
            name="Other Co", slug="other-import", schema_name="tenant_oi", status="active"
        )
        role = _make_role(
            other, "OtherAdmin",
            [(m, a) for m in ("logistics", "setup") for a in ("view", "create", "edit", "delete")],
        )
        user = _make_user(other, role, "other_editor")
        api_client.force_authenticate(user=user)
        other_rec = ImportRecap.objects.create(
            tenant=other, supplier=seed_supplier, factory=seed_factory, s_c_number="SC-OTHER-1",
        )
        ImportRecap.objects.create(
            tenant=import_tenant2, supplier=seed_supplier, factory=seed_factory, s_c_number="SC-OTHER-2",
        )
        auth = {"HTTP_X_TENANT_ID": str(other.id)}
        list_resp = api_client.get(_base()+"/", **auth)
        assert list_resp.status_code == status.HTTP_200_OK
        assert list_resp.data["count"] == 1
        assert list_resp.data["results"][0]["s_c_number"] == "SC-OTHER-1"
        get_resp = api_client.get(f"{_base()}/{other_rec.id}/", **auth)
        assert get_resp.status_code == status.HTTP_200_OK
        other_two = ImportRecap.objects.get(s_c_number="SC-OTHER-2")
        missing = api_client.get(f"{_base()}/{other_two.id}/", **auth)
        assert missing.status_code == status.HTTP_404_NOT_FOUND