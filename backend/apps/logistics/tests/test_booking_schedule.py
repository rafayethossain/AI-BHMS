"""
Tests for Booking Schedule (GC-015).

Weekly production booking schedule items linked to Shipment (and optionally
Hit), with a status flow (Live -> In Work -> Delivered), cut-qty /
garments-ready tracking, ex-factory dates and risk markers.
"""
from datetime import date
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from rest_framework import status
from rest_framework.test import APIClient

from apps.logistics.models import BookingScheduleItem, FreightForwarder, Shipment
from apps.merchandising.models import (
    FileOpening,
    Hit,
    PurchaseOrder,
    PurchaseOrderItem,
    Style,
    StyleVersion,
)
from apps.setup.models import Buyer, ColorCode, Country, Currency, Factory, RiskLevel
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def bs_tenant(db):
    return Tenant.objects.create(
        name="Booking Schedule Co", slug="booking-schedule",
        schema_name="tenant_booking_schedule", status="active"
    )


@pytest.fixture
def bs_role(db, bs_tenant):
    role = Role.objects.create(tenant=bs_tenant, name="LogisticsAdmin", is_system=True)
    for mod in ["setup", "merchandising", "logistics"]:
        for act in ["view", "create", "edit", "delete"]:
            perm, _ = Permission.objects.get_or_create(
                module=mod, action=act,
                defaults={"description": f"{mod}:{act}"}
            )
            RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def bs_user(db, bs_tenant, bs_role):
    user = User.objects.create_user(
        username="bsuser", email="bs@test.com",
        password="testpass123!@#", tenant=bs_tenant, status="active",
    )
    UserRole.objects.create(user=user, role=bs_role)
    return user


@pytest.fixture
def bs_client(api_client, bs_user):
    api_client.force_authenticate(user=bs_user)
    return api_client


@pytest.fixture
def seed_bs_data(db, bs_tenant, bs_user):
    country = Country.objects.create(tenant=bs_tenant, name="Test Country")
    buyer = Buyer.objects.create(tenant=bs_tenant, name="Booking Buyer", code="BB01", country=country)
    factory = Factory.objects.create(tenant=bs_tenant, name="Factory A", code="FBA01", country=country)
    currency = Currency.objects.create(tenant=bs_tenant, name="USD", code="USD", symbol="$")
    color = ColorCode.objects.create(tenant=bs_tenant, code="BLK", name="Black", hex_code="#000000")
    risk = RiskLevel.objects.create(
        tenant=bs_tenant, code="HIGH", name="High Risk", color="#FF0000", sort_order=1,
    )
    low_risk = RiskLevel.objects.create(
        tenant=bs_tenant, code="LOW", name="Low Risk", color="#00FF00", sort_order=2,
    )
    ff = FreightForwarder.objects.create(tenant=bs_tenant, name="Maersk", code="MRS")
    style = Style.objects.create(
        tenant=bs_tenant, style_number="STY-BS", name="Booking Style",
        buyer=buyer, created_by=bs_user,
    )
    sv = StyleVersion.objects.create(
        tenant=bs_tenant, style=style, version_number=1, status="active",
        created_by=bs_user,
    )
    fo = FileOpening.objects.create(
        tenant=bs_tenant, file_number="FO-BS", style=style, style_version=sv,
        buyer=buyer, factory=factory, file_date=date(2026, 1, 1),
        created_by=bs_user,
    )
    po = PurchaseOrder.objects.create(
        tenant=bs_tenant, po_number="PO-BS", file_opening=fo, buyer=buyer,
        factory=factory, po_date=date(2026, 1, 15), delivery_date=date(2026, 6, 1),
        quantity=1000, unit_price=Decimal("10.00"), total_value=Decimal("10000.00"),
        currency=currency,
    )
    shipment = Shipment.objects.create(
        tenant=bs_tenant, shipment_number="SH-BS-1", purchase_order=po,
        factory=factory, freight_forwarder=ff, status="booked", mode="sea",
    )
    shipment_b = Shipment.objects.create(
        tenant=bs_tenant, shipment_number="SH-BS-2", purchase_order=po,
        factory=factory, freight_forwarder=ff, status="booking", mode="sea",
    )
    po_item = PurchaseOrderItem.objects.create(
        tenant=bs_tenant, purchase_order=po, color=color,
        size="M", quantity=500, unit_price=Decimal("10.00"),
    )
    hit = Hit.objects.create(
        tenant=bs_tenant, purchase_order=po, hit_number="HIT-BS-1",
        colour=color, created_by=bs_user,
    )
    return {
        "tenant": bs_tenant, "user": bs_user, "buyer": buyer,
        "factory": factory, "currency": currency, "color": color,
        "style": style, "style_version": sv, "file_opening": fo,
        "purchase_order": po, "po_item": po_item, "hit": hit,
        "shipment": shipment, "shipment_b": shipment_b,
        "freight_forwarder": ff, "risk": risk, "low_risk": low_risk,
    }


# ==================== Model Tests ====================

@pytest.mark.django_db
class TestBookingScheduleModel:
    """Test the GC-015 BookingScheduleItem model."""

    def test_defaults(self, seed_bs_data):
        item = BookingScheduleItem.objects.create(
            tenant=seed_bs_data["tenant"],
            shipment=seed_bs_data["shipment"],
            week_ending=date(2026, 5, 22),
            created_by=seed_bs_data["user"],
        )
        assert item.status == "live"
        assert item.cut_qty == Decimal("0")
        assert item.garments_ready_qty == Decimal("0")
        assert item.ex_factory_date is None
        assert item.risk_level is None
        assert item.hit is None
        assert item.notes == ""

    def test_create_with_all_fields(self, seed_bs_data):
        item = BookingScheduleItem.objects.create(
            tenant=seed_bs_data["tenant"],
            shipment=seed_bs_data["shipment"],
            hit=seed_bs_data["hit"],
            status="in_work",
            cut_qty=Decimal("800"),
            garments_ready_qty=Decimal("600"),
            ex_factory_date=date(2026, 5, 8),
            ex_factory_notes="Ex-factory confirmed",
            risk_level=seed_bs_data["risk"],
            week_ending=date(2026, 5, 22),
            notes="Planner fill",
            created_by=seed_bs_data["user"],
        )
        assert item.status == "in_work"
        assert item.cut_qty == Decimal("800")
        assert item.garments_ready_qty == Decimal("600")
        assert item.ex_factory_date == date(2026, 5, 8)
        assert item.ex_factory_notes == "Ex-factory confirmed"
        assert item.risk_level == seed_bs_data["risk"]
        assert item.notes == "Planner fill"

    def test_str_method(self, seed_bs_data):
        item = BookingScheduleItem.objects.create(
            tenant=seed_bs_data["tenant"],
            shipment=seed_bs_data["shipment"],
            hit=seed_bs_data["hit"],
            week_ending=date(2026, 5, 22),
            created_by=seed_bs_data["user"],
        )
        assert str(item) == "SH-BS-1 - 2026-05-22"

    def test_unique_per_shipment_week_hit(self, seed_bs_data):
        BookingScheduleItem.objects.create(
            tenant=seed_bs_data["tenant"],
            shipment=seed_bs_data["shipment"],
            hit=seed_bs_data["hit"],
            week_ending=date(2026, 5, 22),
            created_by=seed_bs_data["user"],
        )
        with pytest.raises(IntegrityError):
            BookingScheduleItem.objects.create(
                tenant=seed_bs_data["tenant"],
                shipment=seed_bs_data["shipment"],
                hit=seed_bs_data["hit"],
                week_ending=date(2026, 5, 22),
                created_by=seed_bs_data["user"],
            )

    def test_same_week_different_shipment_allowed(self, seed_bs_data):
        BookingScheduleItem.objects.create(
            tenant=seed_bs_data["tenant"],
            shipment=seed_bs_data["shipment"],
            week_ending=date(2026, 5, 22),
            created_by=seed_bs_data["user"],
        )
        item2 = BookingScheduleItem.objects.create(
            tenant=seed_bs_data["tenant"],
            shipment=seed_bs_data["shipment_b"],
            week_ending=date(2026, 5, 22),
            created_by=seed_bs_data["user"],
        )
        assert item2.shipment == seed_bs_data["shipment_b"]

    def test_different_week_same_shipment_allowed(self, seed_bs_data):
        BookingScheduleItem.objects.create(
            tenant=seed_bs_data["tenant"],
            shipment=seed_bs_data["shipment"],
            week_ending=date(2026, 5, 22),
            created_by=seed_bs_data["user"],
        )
        item2 = BookingScheduleItem.objects.create(
            tenant=seed_bs_data["tenant"],
            shipment=seed_bs_data["shipment"],
            week_ending=date(2026, 5, 29),
            created_by=seed_bs_data["user"],
        )
        assert item2.week_ending == date(2026, 5, 29)


# ==================== API Tests ====================

@pytest.mark.django_db
class TestBookingScheduleAPI:
    """Test the Booking Schedule API endpoints."""

    @pytest.fixture(autouse=True)
    def _urls(self, settings):
        settings.ROOT_URLCONF = "config.urls"

    def _base(self):
        return "/api/v1/logistics/booking-schedule"

    def test_list_requires_auth(self, api_client, seed_bs_data):
        response = api_client.get(f"{self._base()}/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_schedule_item(self, bs_client, seed_bs_data):
        response = bs_client.post(
            f"{self._base()}/",
            {
                "shipment": seed_bs_data["shipment"].id,
                "week_ending": "2026-05-22",
                "cut_qty": "800",
                "garments_ready_qty": "600",
                "ex_factory_date": "2026-05-08",
                "ex_factory_notes": "Confirmed",
                "notes": "Weekly fill",
            },
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED, response.data
        data = response.data
        assert data["status"] == "live"
        assert data["cut_qty"] == "800.00"
        assert data["po_number"] == "PO-BS"
        assert "risk_level" in data

    def test_create_with_hit(self, bs_client, seed_bs_data):
        response = bs_client.post(
            f"{self._base()}/",
            {
                "shipment": seed_bs_data["shipment"].id,
                "hit": seed_bs_data["hit"].id,
                "week_ending": "2026-05-22",
                "status": "in_work",
            },
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED, response.data
        assert response.data["hit"] == seed_bs_data["hit"].id
        assert response.data["status"] == "in_work"

    def test_update_schedule_item(self, bs_client, seed_bs_data):
        item = BookingScheduleItem.objects.create(
            tenant=seed_bs_data["tenant"],
            shipment=seed_bs_data["shipment"],
            week_ending=date(2026, 5, 22),
            cut_qty=Decimal("500"),
            created_by=seed_bs_data["user"],
        )
        response = bs_client.patch(
            f"{self._base()}/{item.id}/",
            {"garments_ready_qty": "450"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["garments_ready_qty"] == "450.00"

    def test_list_filters_by_shipment(self, bs_client, seed_bs_data):
        BookingScheduleItem.objects.create(
            tenant=seed_bs_data["tenant"],
            shipment=seed_bs_data["shipment"],
            week_ending=date(2026, 5, 22),
            created_by=seed_bs_data["user"],
        )
        BookingScheduleItem.objects.create(
            tenant=seed_bs_data["tenant"],
            shipment=seed_bs_data["shipment_b"],
            week_ending=date(2026, 5, 22),
            created_by=seed_bs_data["user"],
        )
        response = bs_client.get(
            f"{self._base()}/",
            {"shipment": seed_bs_data["shipment"].id},
        )
        assert response.status_code == status.HTTP_200_OK
        results = response.data["results"]
        assert len(results) == 1
        assert results[0]["shipment"] == seed_bs_data["shipment"].id

    def test_transition_live_to_in_work(self, bs_client, seed_bs_data):
        item = BookingScheduleItem.objects.create(
            tenant=seed_bs_data["tenant"],
            shipment=seed_bs_data["shipment"],
            week_ending=date(2026, 5, 22),
            created_by=seed_bs_data["user"],
        )
        response = bs_client.post(f"{self._base()}/{item.id}/transition/", {"status": "in_work"}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "in_work"

    def test_transition_in_work_to_delivered(self, bs_client, seed_bs_data):
        item = BookingScheduleItem.objects.create(
            tenant=seed_bs_data["tenant"],
            shipment=seed_bs_data["shipment"],
            week_ending=date(2026, 5, 22),
            status="in_work",
            created_by=seed_bs_data["user"],
        )
        response = bs_client.post(f"{self._base()}/{item.id}/transition/", {"status": "delivered"}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "delivered"

    def test_transition_invalid_skips_live(self, bs_client, seed_bs_data):
        item = BookingScheduleItem.objects.create(
            tenant=seed_bs_data["tenant"],
            shipment=seed_bs_data["shipment"],
            week_ending=date(2026, 5, 22),
            created_by=seed_bs_data["user"],
        )
        response = bs_client.post(f"{self._base()}/{item.id}/transition/", {"status": "delivered"}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_transition_missing_status(self, bs_client, seed_bs_data):
        item = BookingScheduleItem.objects.create(
            tenant=seed_bs_data["tenant"],
            shipment=seed_bs_data["shipment"],
            week_ending=date(2026, 5, 22),
            created_by=seed_bs_data["user"],
        )
        response = bs_client.post(f"{self._base()}/{item.id}/transition/", {}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_delete_schedule_item(self, bs_client, seed_bs_data):
        item = BookingScheduleItem.objects.create(
            tenant=seed_bs_data["tenant"],
            shipment=seed_bs_data["shipment"],
            week_ending=date(2026, 5, 22),
            created_by=seed_bs_data["user"],
        )
        response = bs_client.delete(f"{self._base()}/{item.id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not BookingScheduleItem.objects.filter(id=item.id).exists()

    def test_tenant_isolation(self, bs_client, seed_bs_data, bs_tenant):
        other_tenant = Tenant.objects.create(
            name="Other Co", slug="other-co", schema_name="tenant_other", status="active"
        )
        other_user = User.objects.create_user(
            username="otheruser", email="other@test.com",
            password="testpass123!@#", tenant=other_tenant, status="active",
        )
        other_role = Role.objects.create(tenant=other_tenant, name="OtherAdmin", is_system=True)
        for mod in ["logistics", "setup", "merchandising"]:
            for act in ["view", "create", "edit", "delete"]:
                perm, _ = Permission.objects.get_or_create(
                    module=mod, action=act, defaults={"description": f"{mod}:{act}"}
                )
                RolePermission.objects.create(role=other_role, permission=perm)
        UserRole.objects.create(user=other_user, role=other_role)

        item = BookingScheduleItem.objects.create(
            tenant=seed_bs_data["tenant"],
            shipment=seed_bs_data["shipment"],
            week_ending=date(2026, 5, 22),
            created_by=seed_bs_data["user"],
        )
        api_client = APIClient()
        api_client.force_authenticate(user=other_user)
        response = api_client.get(f"{self._base()}/")
        assert response.status_code == status.HTTP_200_OK
        results = response.data["results"]
        assert all(r["id"] != item.id for r in results)
