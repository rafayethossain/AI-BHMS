"""
RQ-027 (GC-021): Final Hit Reconciliation tests.

GC Manual "Reconciliation procedures" 3) Final Hit Reconciliation: when the
final hits are delivered, compare quantity against docket; anything over 20
units that is short must be debited unless reasons are evident. Triggered when
logistics marks the booking schedule item from In Work to Delivered once the
last hit has gone (GC Manual Booking Schedule).
"""
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.logistics.models import BookingScheduleItem, FinalHitReconciliation, Shipment
from apps.merchandising.models import FileOpening, Hit, PurchaseOrder, Style, StyleVersion
from apps.setup.models import Buyer, ColorCode, Country, Currency, Factory
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def fhr_tenant(db):
    return Tenant.objects.create(
        name="Final Hit Recon Co", slug="fhr-test",
        schema_name="tenant_fhr", status="active"
    )


@pytest.fixture
def fhr_tenant2(db):
    return Tenant.objects.create(
        name="Final Hit Recon Co 2", slug="fhr-test-2",
        schema_name="tenant_fhr_2", status="active"
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
def fhr_editor_client(api_client, fhr_tenant):
    role = _make_role(
        fhr_tenant, "FinalHitAdmin",
        [(m, a) for m in ("logistics", "merchandising", "setup")
         for a in ("view", "create", "edit", "delete")],
    )
    user = _make_user(fhr_tenant, role, "fhr_editor")
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def fhr_viewer_client(api_client, fhr_tenant):
    role = _make_role(
        fhr_tenant, "FinalHitViewer",
        [(m, a) for m in ("logistics", "merchandising", "setup")
         for a in ("view",)],
    )
    user = _make_user(fhr_tenant, role, "fhr_viewer")
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def fhr_nolog_client(api_client, fhr_tenant):
    role = _make_role(fhr_tenant, "NoLogistics", [("setup", "view")])
    user = _make_user(fhr_tenant, role, "fhr_nolog")
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def seed_shipment(fhr_tenant):
    """Full PO chain with PO quantity 1000 and a delivered shipment of 955
    (short 45 units -> over the 20-unit debit trigger)."""
    currency = Currency.objects.create(tenant=fhr_tenant, code="USD", name="US Dollar", symbol="$")
    country = Country.objects.create(tenant=fhr_tenant, code="BGD", name="Bangladesh")
    color = ColorCode.objects.create(tenant=fhr_tenant, code="BLK", name="Black", hex_code="#000000")
    buyer = Buyer.objects.create(tenant=fhr_tenant, code="HM", name="H&M", country=country, currency=currency)
    factory = Factory.objects.create(tenant=fhr_tenant, code="F-001", name="Apex Knitwears")
    style = Style.objects.create(tenant=fhr_tenant, style_number="STY-001", name="Test Style", buyer=buyer)
    sv = StyleVersion.objects.create(tenant=fhr_tenant, style=style, version_number=1, status="active")
    fo = FileOpening.objects.create(
        tenant=fhr_tenant, file_number="FO-001", style=style, style_version=sv,
        buyer=buyer, factory=factory, file_date="2026-01-01"
    )
    po = PurchaseOrder.objects.create(
        tenant=fhr_tenant, po_number="PO-001", file_opening=fo, buyer=buyer,
        factory=factory, po_date="2026-01-15", delivery_date="2026-06-01",
        quantity=1000, unit_price=10.00, total_value=10000.00, currency=currency,
    )
    shipment = Shipment.objects.create(
        tenant=fhr_tenant, shipment_number="SHP-001", purchase_order=po,
        status="delivered", mode="sea", quantity=Decimal("955.00"),
    )
    return shipment


@pytest.fixture
def seed_hit(seed_shipment, fhr_tenant):
    """A hit for the seed shipment's PO (required for the delivered trigger)."""
    return Hit.objects.create(
        tenant=fhr_tenant,
        purchase_order=seed_shipment.purchase_order,
        hit_number="H-01",
        colour=ColorCode.objects.filter(tenant=fhr_tenant, name__iexact="Black").first(),
    )


@pytest.fixture
def seed_item(seed_shipment, fhr_tenant):
    """A delivered booking schedule item for the seed shipment."""
    return BookingScheduleItem.objects.create(
        tenant=fhr_tenant,
        shipment=seed_shipment,
        status="delivered",
        week_ending="2026-06-19",
        cut_qty=Decimal("1000.00"),
        garments_ready_qty=Decimal("955.00"),
    )


def _create_reconciliation(tenant, shipment, **kwargs):
    defaults = {
        "docket_quantity": Decimal("1000.00"),
        "shipped_quantity": Decimal("955.00"),
        "reasons_evident": False,
        "notes": "",
        "status": "pending",
    }
    defaults.update(kwargs)
    return FinalHitReconciliation.objects.create(tenant=tenant, shipment=shipment, **defaults)


def _base():
    return "/api/v1/logistics/reconciliations"


class TestFinalHitReconciliationModel:
    def test_shortage_computed_on_save(self, fhr_tenant, seed_shipment):
        rec = _create_reconciliation(fhr_tenant, seed_shipment)
        assert rec.shortage_units == Decimal("45.00")
        assert rec.is_short

    def test_no_shortage_when_shipped_equals_docket(self, fhr_tenant, seed_shipment):
        rec = _create_reconciliation(
            fhr_tenant, seed_shipment,
            docket_quantity=Decimal("1000.00"), shipped_quantity=Decimal("1000.00"),
        )
        assert rec.shortage_units == Decimal("0.00")
        assert not rec.is_short

    def test_no_shortage_when_over_shipped(self, fhr_tenant, seed_shipment):
        rec = _create_reconciliation(
            fhr_tenant, seed_shipment,
            docket_quantity=Decimal("1000.00"), shipped_quantity=Decimal("1020.00"),
        )
        assert rec.shortage_units == Decimal("0.00")

    def test_requires_debit_over_20(self, fhr_tenant, seed_shipment):
        rec = _create_reconciliation(
            fhr_tenant, seed_shipment, shipped_quantity=Decimal("955.00")
        )
        assert rec.requires_debit

    def test_requires_debit_false_at_boundary_20(self, fhr_tenant, seed_shipment):
        rec = _create_reconciliation(
            fhr_tenant, seed_shipment, shipped_quantity=Decimal("980.00")
        )
        assert rec.shortage_units == Decimal("20.00")
        assert not rec.requires_debit

    def test_requires_debit_false_under_20(self, fhr_tenant, seed_shipment):
        rec = _create_reconciliation(
            fhr_tenant, seed_shipment, shipped_quantity=Decimal("990.00")
        )
        assert not rec.requires_debit

    def test_amend_shows_new_figures(self, fhr_tenant, seed_shipment):
        rec = _create_reconciliation(fhr_tenant, seed_shipment)
        rec.shipped_quantity = Decimal("990.00")
        rec.save()
        assert rec.shortage_units == Decimal("10.00")
        assert not rec.requires_debit

    def test_reconcile_stamps_reconciled_by_and_at(self, fhr_tenant, seed_shipment):
        user = _make_user(fhr_tenant, _make_role(fhr_tenant, "Ops", [("logistics", "edit")]), "fhr_ops")
        rec = _create_reconciliation(fhr_tenant, seed_shipment)
        shortage, debit = rec.reconcile(user=user)
        assert shortage == Decimal("45.00")
        assert debit is True
        assert rec.status == "reconciled"
        assert rec.reconciled_by == user
        assert rec.reconciled_at is not None

    def test_reconcile_accepts_explicit_shipped_quantity(self, fhr_tenant, seed_shipment):
        rec = _create_reconciliation(fhr_tenant, seed_shipment)
        rec.reconcile(shipped_quantity=Decimal("985.00"))
        assert rec.shipped_quantity == Decimal("985.00")
        assert rec.shortage_units == Decimal("15.00")
        assert not rec.requires_debit


class TestFinalHitReconciliationTrigger:
    """GC: changing the schedule item to Delivered once the last hit goes
    triggers a final hit reconciliation."""

    def test_delivered_transition_creates_reconciliation(self, fhr_editor_client, fhr_tenant, seed_shipment, seed_hit):
        item = BookingScheduleItem.objects.create(
            tenant=fhr_tenant, shipment=seed_shipment, hit=seed_hit,
            status="in_work", week_ending="2026-06-19",
        )
        resp = fhr_editor_client.post(
            f"/api/v1/logistics/booking-schedule/{item.id}/transition/",
            {"status": "delivered"}, format="json"
        )
        assert resp.status_code == status.HTTP_200_OK
        rec = FinalHitReconciliation.objects.filter(tenant=fhr_tenant, shipment=seed_shipment).first()
        assert rec is not None
        assert rec.schedule_item == item

    def test_delivered_transition_computes_shortage(self, fhr_editor_client, fhr_tenant, seed_shipment, seed_hit):
        item = BookingScheduleItem.objects.create(
            tenant=fhr_tenant, shipment=seed_shipment, hit=seed_hit,
            status="in_work", week_ending="2026-06-19",
        )
        fhr_editor_client.post(
            f"/api/v1/logistics/booking-schedule/{item.id}/transition/",
            {"status": "delivered"}, format="json"
        )
        rec = FinalHitReconciliation.objects.get(tenant=fhr_tenant, shipment=seed_shipment)
        assert rec.docket_quantity == Decimal("1000.00")
        assert rec.shipped_quantity == Decimal("955.00")
        assert rec.shortage_units == Decimal("45.00")
        assert rec.requires_debit

    def test_retrigger_updates_existing_reconciliation(self, fhr_editor_client, fhr_tenant, seed_shipment, seed_hit):
        first = BookingScheduleItem.objects.create(
            tenant=fhr_tenant, shipment=seed_shipment, hit=seed_hit,
            status="in_work", week_ending="2026-06-19",
        )
        second = BookingScheduleItem.objects.create(
            tenant=fhr_tenant, shipment=seed_shipment, hit=seed_hit,
            status="in_work", week_ending="2026-06-26",
        )
        fhr_editor_client.post(
            f"/api/v1/logistics/booking-schedule/{first.id}/transition/",
            {"status": "delivered"}, format="json"
        )
        fhr_editor_client.post(
            f"/api/v1/logistics/booking-schedule/{second.id}/transition/",
            {"status": "delivered"}, format="json"
        )
        assert FinalHitReconciliation.objects.filter(tenant=fhr_tenant, shipment=seed_shipment).count() == 1
        rec = FinalHitReconciliation.objects.get(tenant=fhr_tenant, shipment=seed_shipment)
        assert rec.schedule_item == second

    def test_non_delivered_transition_creates_no_reconciliation(self, fhr_editor_client, fhr_tenant, seed_shipment, seed_hit):
        item = BookingScheduleItem.objects.create(
            tenant=fhr_tenant, shipment=seed_shipment, hit=seed_hit,
            status="live", week_ending="2026-06-19",
        )
        fhr_editor_client.post(
            f"/api/v1/logistics/booking-schedule/{item.id}/transition/",
            {"status": "in_work"}, format="json"
        )
        assert not FinalHitReconciliation.objects.filter(tenant=fhr_tenant, shipment=seed_shipment).exists()

    def test_invalid_transition_creates_no_reconciliation(self, fhr_editor_client, fhr_tenant, seed_shipment, seed_hit):
        item = BookingScheduleItem.objects.create(
            tenant=fhr_tenant, shipment=seed_shipment, hit=seed_hit,
            status="live", week_ending="2026-06-19",
        )
        resp = fhr_editor_client.post(
            f"/api/v1/logistics/booking-schedule/{item.id}/transition/",
            {"status": "delivered"}, format="json"
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert not FinalHitReconciliation.objects.filter(tenant=fhr_tenant, shipment=seed_shipment).exists()


@pytest.mark.django_db
class TestFinalHitReconciliationAPI:
    def test_list_requires_auth(self, api_client, fhr_tenant):
        resp = api_client.get(f"{_base()}/")
        assert resp.status_code in (401, 403)

    def test_list_requires_logistics_view(self, fhr_nolog_client):
        resp = fhr_nolog_client.get(f"{_base()}/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_create_reconciliation(self, fhr_editor_client, fhr_tenant, seed_shipment):
        resp = fhr_editor_client.post(f"{_base()}/", {
            "shipment": str(seed_shipment.id),
            "docket_quantity": "1000.00",
            "shipped_quantity": "955.00",
        }, format="json")
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["shortage_units"] == "45.00"
        assert resp.data["requires_debit"] is True
        assert resp.data["shipment_number"] == "SHP-001"
        assert resp.data["po_number"] == "PO-001"

    def test_retrieve_exposes_computed_fields(self, fhr_editor_client, fhr_tenant, seed_shipment):
        rec = _create_reconciliation(fhr_tenant, seed_shipment)
        resp = fhr_editor_client.get(f"{_base()}/{rec.id}/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["shortage_units"] == "45.00"
        assert resp.data["is_short"] is True
        assert resp.data["requires_debit"] is True

    def test_update_amends_quantities(self, fhr_editor_client, fhr_tenant, seed_shipment):
        rec = _create_reconciliation(fhr_tenant, seed_shipment)
        resp = fhr_editor_client.patch(f"{_base()}/{rec.id}/", {
            "shipped_quantity": "990.00",
        }, format="json")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["shortage_units"] == "10.00"
        assert resp.data["requires_debit"] is False

    def test_reconcile_action(self, fhr_editor_client, fhr_tenant, seed_shipment):
        user = User.objects.get(username="fhr_editor")
        rec = _create_reconciliation(fhr_tenant, seed_shipment)
        resp = fhr_editor_client.post(f"{_base()}/{rec.id}/reconcile/", {}, format="json")
        assert resp.status_code == status.HTTP_200_OK
        rec.refresh_from_db()
        assert rec.status == "reconciled"
        assert rec.reconciled_by == user
        assert rec.reconciled_at is not None

    def test_reconcile_action_with_explicit_shipped_quantity(self, fhr_editor_client, fhr_tenant, seed_shipment):
        rec = _create_reconciliation(fhr_tenant, seed_shipment)
        resp = fhr_editor_client.post(f"{_base()}/{rec.id}/reconcile/", {
            "shipped_quantity": "985.00",
        }, format="json")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["shortage_units"] == "15.00"
        assert resp.data["requires_debit"] is False

    def test_mark_debited(self, fhr_editor_client, fhr_tenant, seed_shipment):
        rec = _create_reconciliation(fhr_tenant, seed_shipment)
        resp = fhr_editor_client.post(f"{_base()}/{rec.id}/mark_debited/", {}, format="json")
        assert resp.status_code == status.HTTP_200_OK
        rec.refresh_from_db()
        assert rec.status == "debited"

    def test_waive_sets_reasons_evident(self, fhr_editor_client, fhr_tenant, seed_shipment):
        rec = _create_reconciliation(fhr_tenant, seed_shipment)
        resp = fhr_editor_client.post(f"{_base()}/{rec.id}/waive/", {
            "reasons_evident": True,
            "notes": "Factory documented fabric defect",
        }, format="json")
        assert resp.status_code == status.HTTP_200_OK
        rec.refresh_from_db()
        assert rec.status == "waived"
        assert rec.reasons_evident is True
        assert rec.notes == "Factory documented fabric defect"

    def test_over_limit_returns_only_pending_debit(self, fhr_editor_client, fhr_tenant, seed_shipment):
        rec = _create_reconciliation(fhr_tenant, seed_shipment)
        po = seed_shipment.purchase_order
        clean_ship = Shipment.objects.create(
            tenant=fhr_tenant, shipment_number="SHP-002", purchase_order=po,
            status="delivered", mode="sea", quantity=Decimal("990.00"),
        )
        _create_reconciliation(
            fhr_tenant, clean_ship,
            docket_quantity=Decimal("1000.00"), shipped_quantity=Decimal("990.00"),
        )
        debited_ship = Shipment.objects.create(
            tenant=fhr_tenant, shipment_number="SHP-003", purchase_order=po,
            status="delivered", mode="sea", quantity=Decimal("955.00"),
        )
        _create_reconciliation(
            fhr_tenant, debited_ship,
            docket_quantity=Decimal("1000.00"), shipped_quantity=Decimal("955.00"),
            status="debited",
        )
        resp = fhr_editor_client.get(f"{_base()}/over_limit/")
        assert resp.status_code == status.HTTP_200_OK
        ids = [r["id"] for r in resp.data["results"]]
        assert str(rec.id) in ids
        assert resp.data["count"] == 1

    def test_delete_reconciliation(self, fhr_editor_client, fhr_tenant, seed_shipment):
        rec = _create_reconciliation(fhr_tenant, seed_shipment)
        resp = fhr_editor_client.delete(f"{_base()}/{rec.id}/")
        assert resp.status_code == status.HTTP_204_NO_CONTENT
        assert not FinalHitReconciliation.objects.filter(pk=rec.pk).exists()

    def test_tenant_isolation(self, fhr_editor_client, fhr_tenant, fhr_tenant2, seed_shipment):
        other = Shipment.objects.get(pk=seed_shipment.pk)
        _create_reconciliation(fhr_tenant2, other)
        resp = fhr_editor_client.get(f"{_base()}/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 0
