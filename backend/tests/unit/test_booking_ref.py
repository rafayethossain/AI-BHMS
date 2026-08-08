"""
RQ-030 (GC-018): Booking Ref Management tests.

GC Manual: Booking Ref is managed by logistics and must be filled in a
minimum of 14 days before the delivery/arrival date; it should never be
blank from 2 weeks before delivery. Extends Shipment with
`booking_reference` and `booking_ref_required_date` (eta - 14 days) plus a
14-day alert surface.
"""
from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.logistics.models import Shipment
from apps.merchandising.models import FileOpening, PurchaseOrder, Style, StyleVersion
from apps.setup.models import Buyer, Country, Currency, Factory
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def br_tenant(db):
    return Tenant.objects.create(
        name="Booking Ref Test Co", slug="booking-ref-test",
        schema_name="tenant_booking_ref", status="active"
    )


@pytest.fixture
def br_tenant2(db):
    return Tenant.objects.create(
        name="Booking Ref Test Co 2", slug="booking-ref-test-2",
        schema_name="tenant_booking_ref_2", status="active"
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
def br_editor_client(api_client, br_tenant):
    role = _make_role(
        br_tenant, "BookingRefAdmin",
        [(m, a) for m in ("logistics", "merchandising", "setup")
         for a in ("view", "create", "edit", "delete")],
    )
    user = _make_user(br_tenant, role, "bookingrefeditor")
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def br_viewer_client(api_client, br_tenant):
    role = _make_role(
        br_tenant, "BookingRefViewer",
        [(m, a) for m in ("logistics", "merchandising", "setup")
         for a in ("view",)],
    )
    user = _make_user(br_tenant, role, "bookingrefviewer")
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def br_noauth_client(api_client, br_tenant):
    role = _make_role(
        br_tenant, "BookingRefNoPerms",
        [(m, a) for m in ("setup",) for a in ("view",)],
    )
    user = _make_user(br_tenant, role, "bookingrefnoperm")
    api_client.force_authenticate(user=user)
    return api_client


def _seed_bhms(br_tenant, po_number="PO-BR-001", country_code="BGD", buyer_code="HM"):
    currency = Currency.objects.create(tenant=br_tenant, code="USD", name="US Dollar", symbol="$")
    country = Country.objects.create(tenant=br_tenant, code=country_code, name="Bangladesh")
    buyer = Buyer.objects.create(tenant=br_tenant, code=buyer_code, name="H&M", country=country, currency=currency)
    factory = Factory.objects.create(tenant=br_tenant, code="F-001", name="Apex Knitwears")
    style = Style.objects.create(tenant=br_tenant, style_number="STY-BR-001", name="Test Style", buyer=buyer)
    sv = StyleVersion.objects.create(tenant=br_tenant, style=style, version_number=1, status="active")
    fo = FileOpening.objects.create(
        tenant=br_tenant, file_number="FO-BR-001", style=style, style_version=sv,
        buyer=buyer, factory=factory, file_date=timezone.localdate() - timedelta(days=60),
    )
    po = PurchaseOrder.objects.create(
        tenant=br_tenant, po_number=po_number, file_opening=fo, buyer=buyer,
        factory=factory, po_date=timezone.localdate() - timedelta(days=30),
        delivery_date=timezone.localdate() + timedelta(days=30),
        quantity=1000, unit_price=10.00, total_value=10000.00, currency=currency,
    )
    return po


# ==================== Model Tests ====================

@pytest.mark.django_db
class TestBookingRefModel:
    def test_create_shipment_with_booking_reference(self, br_tenant):
        po = _seed_bhms(br_tenant)
        shipment = Shipment.objects.create(
            tenant=br_tenant, shipment_number="SH-BR-001",
            purchase_order=po, booking_reference="BRF-2025-1184",
        )
        assert shipment.booking_reference == "BRF-2025-1184"

    def test_required_date_auto_derived_from_eta(self, br_tenant):
        po = _seed_bhms(br_tenant)
        eta = timezone.localdate() + timedelta(days=30)
        shipment = Shipment.objects.create(
            tenant=br_tenant, shipment_number="SH-BR-002",
            purchase_order=po, eta=eta,
        )
        assert shipment.booking_ref_required_date == eta - timedelta(days=14)

    def test_required_date_respects_manual_override(self, br_tenant):
        po = _seed_bhms(br_tenant)
        eta = timezone.localdate() + timedelta(days=30)
        override = timezone.localdate() + timedelta(days=10)
        shipment = Shipment.objects.create(
            tenant=br_tenant, shipment_number="SH-BR-003",
            purchase_order=po, eta=eta, booking_ref_required_date=override,
        )
        assert shipment.booking_ref_required_date == override

    def test_required_date_stays_in_sync_when_eta_changes(self, br_tenant):
        po = _seed_bhms(br_tenant)
        shipment = Shipment.objects.create(
            tenant=br_tenant, shipment_number="SH-BR-004",
            purchase_order=po, eta=timezone.localdate() + timedelta(days=30),
        )
        shipment.eta = timezone.localdate() + timedelta(days=45)
        shipment.save()
        assert shipment.booking_ref_required_date == timezone.localdate() + timedelta(days=31)

    def test_required_date_manual_override_survives_eta_change(self, br_tenant):
        po = _seed_bhms(br_tenant)
        override = timezone.localdate() + timedelta(days=5)
        shipment = Shipment.objects.create(
            tenant=br_tenant, shipment_number="SH-BR-005",
            purchase_order=po, eta=timezone.localdate() + timedelta(days=30),
            booking_ref_required_date=override,
        )
        shipment.eta = timezone.localdate() + timedelta(days=60)
        shipment.save()
        assert shipment.booking_ref_required_date == override

    def test_status_ok_when_reference_present(self, br_tenant):
        po = _seed_bhms(br_tenant)
        shipment = Shipment.objects.create(
            tenant=br_tenant, shipment_number="SH-BR-006",
            purchase_order=po, eta=timezone.localdate() - timedelta(days=5),
            booking_reference="BRF-2025-1184",
        )
        assert shipment.booking_ref_status == "ok"

    def test_status_na_when_no_deadline_and_no_reference(self, br_tenant):
        po = _seed_bhms(br_tenant)
        shipment = Shipment.objects.create(
            tenant=br_tenant, shipment_number="SH-BR-007", purchase_order=po,
        )
        assert shipment.booking_ref_status == "na"

    def test_status_due_when_blank_and_past_deadline(self, br_tenant):
        po = _seed_bhms(br_tenant)
        shipment = Shipment.objects.create(
            tenant=br_tenant, shipment_number="SH-BR-008",
            purchase_order=po, eta=timezone.localdate() - timedelta(days=5),
        )
        assert shipment.booking_ref_status == "due"

    def test_status_ok_when_blank_but_before_deadline(self, br_tenant):
        po = _seed_bhms(br_tenant)
        shipment = Shipment.objects.create(
            tenant=br_tenant, shipment_number="SH-BR-009",
            purchase_order=po, eta=timezone.localdate() + timedelta(days=30),
        )
        assert shipment.booking_ref_status == "ok"

    def test_status_due_on_deadline_day(self, br_tenant):
        po = _seed_bhms(br_tenant)
        required = timezone.localdate()
        shipment = Shipment.objects.create(
            tenant=br_tenant, shipment_number="SH-BR-010",
            purchase_order=po, booking_ref_required_date=required,
        )
        assert shipment.booking_ref_status == "due"

    def test_booking_ref_alerts_classmethod(self, br_tenant):
        po = _seed_bhms(br_tenant)
        due = Shipment.objects.create(
            tenant=br_tenant, shipment_number="SH-BR-011",
            purchase_order=po, eta=timezone.localdate() - timedelta(days=5),
        )
        filled = Shipment.objects.create(
            tenant=br_tenant, shipment_number="SH-BR-012",
            purchase_order=po, eta=timezone.localdate() - timedelta(days=5),
            booking_reference="BRF-2025-1184",
        )
        future = Shipment.objects.create(
            tenant=br_tenant, shipment_number="SH-BR-013",
            purchase_order=po, eta=timezone.localdate() + timedelta(days=30),
        )
        alerts = Shipment.booking_ref_alerts(tenant=br_tenant)
        assert set(alerts) == {due}
        assert filled not in alerts
        assert future not in alerts

    def test_booking_ref_alerts_empty_when_filled(self, br_tenant):
        po = _seed_bhms(br_tenant)
        shipment = Shipment.objects.create(
            tenant=br_tenant, shipment_number="SH-BR-014",
            purchase_order=po, eta=timezone.localdate() - timedelta(days=5),
        )
        assert shipment in Shipment.booking_ref_alerts(tenant=br_tenant)
        shipment.booking_reference = "BRF-2025-1184"
        shipment.save()
        assert shipment not in Shipment.booking_ref_alerts(tenant=br_tenant)


# ==================== API Tests ====================

@pytest.mark.django_db
class TestBookingRefAPI:
    def test_create_shipment_with_booking_reference(self, br_editor_client, br_tenant):
        po = _seed_bhms(br_tenant)
        resp = br_editor_client.post(
            "/api/v1/logistics/shipments/",
            {"purchase_order": po.id, "booking_reference": "BRF-2025-1184", "mode": "sea"},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["booking_reference"] == "BRF-2025-1184"

    def test_update_booking_reference(self, br_editor_client, br_tenant):
        po = _seed_bhms(br_tenant)
        shipment = Shipment.objects.create(
            tenant=br_tenant, shipment_number="SH-BR-API-01", purchase_order=po,
            eta=timezone.localdate() + timedelta(days=10),
        )
        resp = br_editor_client.patch(
            f"/api/v1/logistics/shipments/{shipment.id}/",
            {"booking_reference": "BRF-2025-2200"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        shipment.refresh_from_db()
        assert shipment.booking_reference == "BRF-2025-2200"

    def test_booking_ref_status_in_serializer(self, br_editor_client, br_tenant):
        po = _seed_bhms(br_tenant)
        due = Shipment.objects.create(
            tenant=br_tenant, shipment_number="SH-BR-API-02",
            purchase_order=po, eta=timezone.localdate() - timedelta(days=5),
        )
        resp = br_editor_client.get(f"/api/v1/logistics/shipments/{due.id}/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["booking_ref_status"] == "due"
        assert resp.data["booking_ref_required_date"] == (
            timezone.localdate() - timedelta(days=5) - timedelta(days=14)
        ).isoformat()

    def test_booking_ref_alerts_endpoint(self, br_editor_client, br_tenant):
        po = _seed_bhms(br_tenant)
        due = Shipment.objects.create(
            tenant=br_tenant, shipment_number="SH-BR-API-03",
            purchase_order=po, eta=timezone.localdate() - timedelta(days=5),
        )
        filled = Shipment.objects.create(
            tenant=br_tenant, shipment_number="SH-BR-API-04",
            purchase_order=po, eta=timezone.localdate() - timedelta(days=5),
            booking_reference="BRF-2025-1184",
        )
        resp = br_editor_client.get("/api/v1/logistics/shipments/booking_ref_alerts/")
        assert resp.status_code == status.HTTP_200_OK
        ids = [str(row["id"]) for row in resp.data["results"]]
        assert str(due.id) in ids
        assert str(filled.id) not in ids

    def test_booking_ref_alerts_empty_after_filling(self, br_editor_client, br_tenant):
        po = _seed_bhms(br_tenant)
        due = Shipment.objects.create(
            tenant=br_tenant, shipment_number="SH-BR-API-05",
            purchase_order=po, eta=timezone.localdate() - timedelta(days=5),
        )
        br_editor_client.patch(
            f"/api/v1/logistics/shipments/{due.id}/",
            {"booking_reference": "BRF-2025-1184"},
            format="json",
        )
        resp = br_editor_client.get("/api/v1/logistics/shipments/booking_ref_alerts/")
        ids = [str(row["id"]) for row in resp.data["results"]]
        assert str(due.id) not in ids

    def test_booking_ref_alerts_requires_view_permission(self, br_noauth_client, br_tenant):
        resp = br_noauth_client.get("/api/v1/logistics/shipments/booking_ref_alerts/")
        assert resp.status_code in (status.HTTP_403_FORBIDDEN, status.HTTP_401_UNAUTHORIZED)

    def test_booking_ref_alerts_tenant_scoped(self, br_editor_client, br_tenant, br_tenant2):
        po = _seed_bhms(br_tenant)
        po2 = _seed_bhms(br_tenant2, po_number="PO-BR-2", country_code="LKA", buyer_code="TGT")
        Shipment.objects.create(
            tenant=br_tenant, shipment_number="SH-BR-API-06",
            purchase_order=po, eta=timezone.localdate() - timedelta(days=5),
        )
        Shipment.objects.create(
            tenant=br_tenant2, shipment_number="SH-BR-API-07",
            purchase_order=po2, eta=timezone.localdate() - timedelta(days=5),
        )
        resp = br_editor_client.get("/api/v1/logistics/shipments/booking_ref_alerts/")
        ids = [str(row["id"]) for row in resp.data["results"]]
        assert len(ids) == 1
        assert str(Shipment.objects.get(shipment_number="SH-BR-API-07").id) not in ids

    def test_booking_ref_required_date_writable(self, br_editor_client, br_tenant):
        po = _seed_bhms(br_tenant)
        shipment = Shipment.objects.create(
            tenant=br_tenant, shipment_number="SH-BR-API-08",
            purchase_order=po, eta=timezone.localdate() + timedelta(days=30),
        )
        override = (timezone.localdate() + timedelta(days=5)).isoformat()
        resp = br_editor_client.patch(
            f"/api/v1/logistics/shipments/{shipment.id}/",
            {"booking_ref_required_date": override},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        shipment.refresh_from_db()
        assert shipment.booking_ref_required_date.isoformat() == override

    def test_booking_reference_searchable(self, br_editor_client, br_tenant):
        po = _seed_bhms(br_tenant)
        Shipment.objects.create(
            tenant=br_tenant, shipment_number="SH-BR-API-09",
            purchase_order=po, booking_reference="BRF-SEARCH-42",
        )
        resp = br_editor_client.get("/api/v1/logistics/shipments/?search=BRF-SEARCH-42")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1

    def test_booking_reference_in_export(self, br_editor_client, br_tenant):
        po = _seed_bhms(br_tenant)
        shipment = Shipment.objects.create(
            tenant=br_tenant, shipment_number="SH-BR-API-10",
            purchase_order=po, booking_reference="BRF-EXPORT-7",
        )
        resp = br_editor_client.get(f"/api/v1/logistics/shipments/{shipment.id}/export/")
        assert resp.status_code == status.HTTP_200_OK
        body = resp.content.decode()
        assert "Booking Reference" in body
        assert "BRF-EXPORT-7" in body
