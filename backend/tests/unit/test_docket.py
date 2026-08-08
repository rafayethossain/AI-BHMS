"""
RQ-026 (GC-020): Docket Management tests.

GC Manual "Dockets": contract price / date raised / delivery date on the
docket; any fabric over 200 meters unusable after the final docket must be
sent to sales (Debbie & Palones) for direction.
"""
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from rest_framework import status
from rest_framework.test import APIClient

from apps.logistics.models import Docket, Shipment
from apps.merchandising.models import FileOpening, PurchaseOrder, Style, StyleVersion
from apps.setup.models import Buyer, Country, Currency, Factory
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def dt_tenant(db):
    return Tenant.objects.create(
        name="Docket Test Co", slug="docket-test",
        schema_name="tenant_docket", status="active"
    )


@pytest.fixture
def dt_tenant2(db):
    return Tenant.objects.create(
        name="Docket Test Co 2", slug="docket-test-2",
        schema_name="tenant_docket_2", status="active"
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
def dt_editor_client(api_client, dt_tenant):
    role = _make_role(
        dt_tenant, "DocketAdmin",
        [(m, a) for m in ("logistics", "merchandising", "setup")
         for a in ("view", "create", "edit", "delete")],
    )
    user = _make_user(dt_tenant, role, "docketeditor")
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def dt_viewer_client(api_client, dt_tenant):
    role = _make_role(
        dt_tenant, "DocketViewer",
        [(m, a) for m in ("logistics", "merchandising", "setup")
         for a in ("view",)],
    )
    user = _make_user(dt_tenant, role, "docketviewer")
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def dt_nolog_client(api_client, dt_tenant):
    role = _make_role(dt_tenant, "NoLogistics", [("setup", "view")])
    user = _make_user(dt_tenant, role, "docketnolog")
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def seed_shipment(dt_tenant):
    """Build the minimal PO chain and return a Shipment for docket FKs."""
    currency = Currency.objects.create(tenant=dt_tenant, code="USD", name="US Dollar", symbol="$")
    country = Country.objects.create(tenant=dt_tenant, code="BGD", name="Bangladesh")
    buyer = Buyer.objects.create(tenant=dt_tenant, code="HM", name="H&M", country=country, currency=currency)
    factory = Factory.objects.create(tenant=dt_tenant, code="F-001", name="Apex Knitwears")
    style = Style.objects.create(tenant=dt_tenant, style_number="STY-001", name="Test Style", buyer=buyer)
    sv = StyleVersion.objects.create(tenant=dt_tenant, style=style, version_number=1, status="active")
    fo = FileOpening.objects.create(
        tenant=dt_tenant, file_number="FO-001", style=style, style_version=sv,
        buyer=buyer, factory=factory, file_date="2026-01-01"
    )
    po = PurchaseOrder.objects.create(
        tenant=dt_tenant, po_number="PO-001", file_opening=fo, buyer=buyer,
        factory=factory, po_date="2026-01-15", delivery_date="2026-06-01",
        quantity=1000, unit_price=10.00, total_value=10000.00, currency=currency,
    )
    shipment = Shipment.objects.create(
        tenant=dt_tenant, shipment_number="SHP-001", purchase_order=po,
        status="booked", mode="sea",
    )
    return shipment


def _create_docket(tenant, shipment, **kwargs):
    defaults = {
        "docket_number": "DK-001",
        "shipment": shipment,
        "contract_price": Decimal("8.50"),
        "date_raised": "2026-02-01",
        "delivery_date": "2026-06-01",
        "total_fabric_meters": Decimal("1200.00"),
        "unused_fabric_meters": Decimal("50.00"),
        "is_final": False,
    }
    defaults.update(kwargs)
    return Docket.objects.create(tenant=tenant, **defaults)


# ── Model Tests ────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestDocketModel:
    def test_create_docket(self, dt_tenant, seed_shipment):
        d = _create_docket(dt_tenant, seed_shipment)
        assert d.docket_number == "DK-001"
        assert d.shipment == seed_shipment
        assert d.contract_price == Decimal("8.50")
        assert not d.is_final
        assert not d.sales_notified

    def test_docket_str(self, dt_tenant, seed_shipment):
        d = _create_docket(dt_tenant, seed_shipment)
        assert "DK-001" in str(d)
        assert "SHP-001" in str(d)

    def test_requires_notification_false_when_not_final(self, dt_tenant, seed_shipment):
        d = _create_docket(dt_tenant, seed_shipment, unused_fabric_meters=Decimal("250.00"))
        assert not d.requires_sales_notification

    def test_requires_notification_false_at_or_below_threshold(self, dt_tenant, seed_shipment):
        d = _create_docket(dt_tenant, seed_shipment, is_final=True, unused_fabric_meters=Decimal("200.00"))
        assert not d.requires_sales_notification

    def test_requires_notification_true_over_threshold(self, dt_tenant, seed_shipment):
        d = _create_docket(dt_tenant, seed_shipment, is_final=True, unused_fabric_meters=Decimal("250.00"))
        assert d.requires_sales_notification

    def test_requires_notification_true_with_null_meters_is_false(self, dt_tenant, seed_shipment):
        d = _create_docket(dt_tenant, seed_shipment, is_final=True, unused_fabric_meters=None)
        assert not d.requires_sales_notification

    def test_notify_sales_records_notification(self, dt_tenant, seed_shipment):
        d = _create_docket(dt_tenant, seed_shipment)
        assert not d.sales_notified
        assert d.sales_notified_at is None
        d.notify_sales()
        d.refresh_from_db()
        assert d.sales_notified
        assert d.sales_notified_at is not None

    def test_unique_docket_number_per_tenant(self, dt_tenant, seed_shipment):
        _create_docket(dt_tenant, seed_shipment, docket_number="DK-001")
        with pytest.raises(IntegrityError):
            _create_docket(dt_tenant, seed_shipment, docket_number="DK-001")

    def test_same_docket_number_different_tenants(self, dt_tenant, dt_tenant2, seed_shipment):
        _create_docket(dt_tenant, seed_shipment, docket_number="DK-001")
        ship2 = Shipment.objects.create(
            tenant=dt_tenant2, shipment_number="SHP-002",
            purchase_order=seed_shipment.purchase_order, status="booked",
        )
        d2 = _create_docket(dt_tenant2, ship2, docket_number="DK-001")
        assert d2.pk is not None


# ── API Tests ──────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestDocketAPI:
    def test_list_401_unauthenticated(self, api_client, dt_tenant):
        resp = api_client.get("/api/v1/logistics/dockets/")
        assert resp.status_code in (401, 403)

    def test_list_403_without_logistics_perms(self, dt_nolog_client):
        resp = dt_nolog_client.get("/api/v1/logistics/dockets/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_list_returns_dockets(self, dt_editor_client, dt_tenant, seed_shipment):
        _create_docket(dt_tenant, seed_shipment)
        _create_docket(dt_tenant, seed_shipment, docket_number="DK-002")
        resp = dt_editor_client.get("/api/v1/logistics/dockets/")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data["results"]) == 2

    def test_list_tenant_scoped(self, dt_editor_client, dt_tenant, dt_tenant2, seed_shipment):
        _create_docket(dt_tenant, seed_shipment, docket_number="DK-001")
        ship2 = Shipment.objects.create(
            tenant=dt_tenant2, shipment_number="SHP-002",
            purchase_order=seed_shipment.purchase_order, status="booked",
        )
        _create_docket(dt_tenant2, ship2, docket_number="DK-002")
        resp = dt_editor_client.get("/api/v1/logistics/dockets/")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data["results"]) == 1
        assert resp.data["results"][0]["docket_number"] == "DK-001"

    def test_create_auto_generates_docket_number(self, dt_editor_client, seed_shipment):
        resp = dt_editor_client.post("/api/v1/logistics/dockets/", {
            "shipment": str(seed_shipment.id),
            "contract_price": "8.50",
            "total_fabric_meters": "1200.00",
            "unused_fabric_meters": "250.00",
            "is_final": True,
        })
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["docket_number"].startswith("DK-")
        assert resp.data["requires_sales_notification"] is True

    def test_create_requires_create_perm(self, dt_viewer_client, seed_shipment):
        resp = dt_viewer_client.post("/api/v1/logistics/dockets/", {
            "shipment": str(seed_shipment.id),
        })
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_retrieve_exposes_derived_flag(self, dt_editor_client, dt_tenant, seed_shipment):
        d = _create_docket(dt_tenant, seed_shipment, is_final=True, unused_fabric_meters=Decimal("250.00"))
        resp = dt_editor_client.get(f"/api/v1/logistics/dockets/{d.id}/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["requires_sales_notification"] is True
        assert resp.data["shipment_number"] == "SHP-001"

    def test_update_docket(self, dt_editor_client, dt_tenant, seed_shipment):
        d = _create_docket(dt_tenant, seed_shipment)
        resp = dt_editor_client.patch(f"/api/v1/logistics/dockets/{d.id}/", {
            "contract_price": "9.25",
            "is_final": True,
            "unused_fabric_meters": "300.00",
        })
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["requires_sales_notification"] is True

    def test_delete_docket(self, dt_editor_client, dt_tenant, seed_shipment):
        d = _create_docket(dt_tenant, seed_shipment)
        resp = dt_editor_client.delete(f"/api/v1/logistics/dockets/{d.id}/")
        assert resp.status_code == status.HTTP_204_NO_CONTENT
        assert Docket.objects.filter(id=d.id).count() == 0

    def test_send_to_sales_action(self, dt_editor_client, dt_tenant, seed_shipment):
        d = _create_docket(dt_tenant, seed_shipment)
        resp = dt_editor_client.post(f"/api/v1/logistics/dockets/{d.id}/send_to_sales/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["sales_notified"] is True
        d.refresh_from_db()
        assert d.sales_notified

    def test_send_to_sales_twice_400(self, dt_editor_client, dt_tenant, seed_shipment):
        d = _create_docket(dt_tenant, seed_shipment)
        dt_editor_client.post(f"/api/v1/logistics/dockets/{d.id}/send_to_sales/")
        resp = dt_editor_client.post(f"/api/v1/logistics/dockets/{d.id}/send_to_sales/")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_send_to_sales_requires_edit_perm(self, dt_viewer_client, dt_tenant, seed_shipment):
        d = _create_docket(dt_tenant, seed_shipment)
        resp = dt_viewer_client.post(f"/api/v1/logistics/dockets/{d.id}/send_to_sales/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_over_limit_action_returns_only_flagged(self, dt_editor_client, dt_tenant, seed_shipment):
        _create_docket(dt_tenant, seed_shipment, docket_number="DK-001", is_final=True,
                       unused_fabric_meters=Decimal("250.00"))
        _create_docket(dt_tenant, seed_shipment, docket_number="DK-002", is_final=True,
                       unused_fabric_meters=Decimal("50.00"))
        _create_docket(dt_tenant, seed_shipment, docket_number="DK-003",
                       unused_fabric_meters=Decimal("500.00"))
        resp = dt_editor_client.get("/api/v1/logistics/dockets/over_limit/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1
        assert resp.data["results"][0]["docket_number"] == "DK-001"
