"""
Tests for the Design-Version Sales Order report (RQ-051).

The Sales Order report is a read-only per-design-version view of every Purchase
Order placed under that version, with color-coded pipeline statuses derived
from live child data (fabric bookings, BOM trim progress, production output,
delivery dates). This suite proves the pure derivation module
(`sales_order.compute_sales_order_statuses`) area by area, then the API action
on StyleVersionViewSet (RED first, then GREEN).
"""
from datetime import date
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.logistics.models import BookingScheduleItem, Shipment
from apps.merchandising.models import (
    BOM,
    BOMItem,
    FileOpening,
    PurchaseOrder,
    Style,
    StyleVersion,
    TrimStatus,
)
from apps.production.models import DailyProduction
from apps.setup.models import Buyer, Country, Currency, Factory, RiskLevel
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


@pytest.fixture
def so_tenant(db):
    return Tenant.objects.create(
        name="Sales Order Co", slug="sales-order",
        schema_name="tenant_sales_order", status="active",
    )


@pytest.fixture
def so_role(db, so_tenant):
    role = Role.objects.create(tenant=so_tenant, name="MerchBO", is_system=True)
    for mod in ["setup", "merchandising"]:
        for act in ["view", "create", "edit", "delete"]:
            perm, _ = Permission.objects.get_or_create(
                module=mod, action=act,
                defaults={"description": f"{mod}:{act}"},
            )
            RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def so_user(db, so_tenant, so_role):
    user = User.objects.create_user(
        username="sousr", email="so@test.com",
        password="testpass123!@#", tenant=so_tenant, status="active",
    )
    UserRole.objects.create(user=user, role=so_role)
    return user


@pytest.fixture
def so_client(db, so_user):
    c = APIClient()
    c.force_authenticate(user=so_user)
    return c


@pytest.fixture
def so_world(db, so_tenant, so_user):
    country = Country.objects.create(tenant=so_tenant, name="SO Country", code="SOC")
    buyer = Buyer.objects.create(tenant=so_tenant, name="SO Buyer", code="SOB", country=country)
    factory = Factory.objects.create(tenant=so_tenant, name="SO Factory", code="SOF", country=country)
    currency = Currency.objects.create(tenant=so_tenant, name="USD", code="USD", symbol="$")
    style = Style.objects.create(
        tenant=so_tenant, style_number="STY-SO", name="SO Style",
        buyer=buyer, created_by=so_user,
    )
    sv = StyleVersion.objects.create(
        tenant=so_tenant, style=style, version_number=1, status="active",
        created_by=so_user,
    )
    return {
        "tenant": so_tenant, "user": so_user, "country": country,
        "buyer": buyer, "factory": factory, "currency": currency,
        "style": style, "sv": sv,
    }


def _po_path(world, po_number="PO-001", status="draft",
             delivery_date=date(2026, 6, 1), quantity=1000, sv=None):
    """Create a file opening + PO under the world's style version."""
    sv = sv or world["sv"]
    fo = FileOpening.objects.create(
        tenant=world["tenant"], file_number=f"FO-{po_number}", style=world["style"],
        style_version=sv, buyer=world["buyer"], factory=world["factory"],
        file_date=date(2026, 1, 1), created_by=world["user"],
    )
    po = PurchaseOrder.objects.create(
        tenant=world["tenant"], po_number=po_number, file_opening=fo,
        buyer=world["buyer"], factory=world["factory"], po_date=date(2026, 1, 15),
        delivery_date=delivery_date, quantity=quantity,
        unit_price=Decimal("10.00"), total_value=Decimal(str(quantity * 10)),
        currency=world["currency"], status=status,
    )
    return fo, po


def _schedule_item(po, status="live", risk_level=None, cut=0, garments_ready=0):
    shipment = Shipment.objects.create(
        tenant=po.tenant, shipment_number=f"SH-{po.po_number}-{status}",
        purchase_order=po,
    )
    return BookingScheduleItem.objects.create(
        tenant=po.tenant, shipment=shipment, status=status,
        week_ending=date(2026, 3, 6), cut_qty=cut,
        garments_ready_qty=garments_ready, risk_level=risk_level,
    )


def _bom_item(po, category="Trims", item_name="Trims", item_status=TrimStatus.TBC):
    sv = po.file_opening.style_version
    bom, _ = BOM.objects.get_or_create(
        tenant=po.tenant, style_version=sv, version=1,
        defaults={"name": "SO BOM", "status": "active"},
    )
    return BOMItem.objects.create(
        tenant=po.tenant, bom=bom, category=category,
        item_name=item_name, status=item_status,
    )


def _statuses(po, today=date(2026, 5, 1)):
    from apps.merchandising.sales_order import compute_sales_order_statuses
    return compute_sales_order_statuses(po, today=today)


@pytest.mark.django_db
class TestSalesOrderStatusDerivation:
    def test_empty_po_reports_none_everywhere(self, so_world):
        _, po = _po_path(so_world)
        statuses = _statuses(po)
        for area in ["fabric", "trims", "production", "delivery", "overall"]:
            assert statuses[area]["code"] == "none", area

    def test_fabric_delivered_is_green(self, so_world):
        _, po = _po_path(so_world, status="confirmed")
        _schedule_item(po, status="delivered")
        assert _statuses(po)["fabric"]["code"] == "green"

    def test_fabric_in_work_is_amber(self, so_world):
        _, po = _po_path(so_world)
        _schedule_item(po, status="in_work")
        assert _statuses(po)["fabric"]["code"] == "amber"

    def test_fabric_red_risk_level_is_sticky_red(self, so_world):
        _, po = _po_path(so_world)
        red = RiskLevel.objects.create(
            tenant=so_world["tenant"], code="red", name="Red", color="#dc2626",
        )
        _schedule_item(po, status="delivered", risk_level=red)
        assert _statuses(po)["fabric"]["code"] == "red"

    def test_trims_no_bom_is_none(self, so_world):
        _, po = _po_path(so_world)
        assert _statuses(po)["trims"]["code"] == "none"

    def test_trims_all_completed_is_green(self, so_world):
        _, po = _po_path(so_world)
        _bom_item(po, item_status=TrimStatus.COMPLETED)
        _bom_item(po, category="Accessories", item_name="Zip",
                  item_status=TrimStatus.COMPLETED)
        assert _statuses(po)["trims"]["code"] == "green"

    def test_trims_any_incomplete_is_amber(self, so_world):
        _, po = _po_path(so_world)
        _bom_item(po, item_status=TrimStatus.COMPLETED)
        _bom_item(po, category="Trim", item_name="Button",
                  item_status=TrimStatus.ORDERED)
        assert _statuses(po)["trims"]["code"] == "amber"

    def test_trims_tbc_is_amber(self, so_world):
        _, po = _po_path(so_world)
        _bom_item(po, item_status=TrimStatus.TBC)
        assert _statuses(po)["trims"]["code"] == "amber"

    def test_production_delivered_is_green(self, so_world):
        _, po = _po_path(so_world, status="delivered")
        assert _statuses(po)["production"]["code"] == "green"

    def test_production_actual_meets_quantity_is_green(self, so_world):
        _, po = _po_path(so_world, status="in_production", quantity=1000)
        DailyProduction.objects.create(
            tenant=so_world["tenant"], factory=so_world["factory"],
            purchase_order=po, production_date=date(2026, 4, 1),
            actual_quantity=1000,
        )
        assert _statuses(po)["production"]["code"] == "green"

    def test_production_partial_output_is_amber(self, so_world):
        _, po = _po_path(so_world, status="in_production", quantity=1000)
        DailyProduction.objects.create(
            tenant=so_world["tenant"], factory=so_world["factory"],
            purchase_order=po, production_date=date(2026, 4, 1),
            actual_quantity=400,
        )
        assert _statuses(po)["production"]["code"] == "amber"

    def test_production_in_production_no_records_is_amber(self, so_world):
        _, po = _po_path(so_world, status="in_production")
        assert _statuses(po)["production"]["code"] == "amber"

    def test_production_draft_is_none(self, so_world):
        _, po = _po_path(so_world, status="draft")
        assert _statuses(po)["production"]["code"] == "none"

    def test_production_cancelled_is_none(self, so_world):
        _, po = _po_path(so_world, status="cancelled")
        assert _statuses(po)["production"]["code"] == "none"

    def test_delivery_delivered_is_green(self, so_world):
        _, po = _po_path(so_world, status="delivered")
        assert _statuses(po)["delivery"]["code"] == "green"

    def test_delivery_shipped_is_green(self, so_world):
        _, po = _po_path(so_world, status="shipped")
        assert _statuses(po)["delivery"]["code"] == "green"

    def test_delivery_overdue_is_red(self, so_world):
        _, po = _po_path(so_world, status="in_production",
                        delivery_date=date(2026, 4, 1))
        assert _statuses(po, today=date(2026, 5, 1))["delivery"]["code"] == "red"

    def test_delivery_in_future_is_amber(self, so_world):
        _, po = _po_path(so_world, status="in_production",
                        delivery_date=date(2026, 6, 1))
        assert _statuses(po, today=date(2026, 5, 1))["delivery"]["code"] == "amber"

    def test_delivery_draft_is_none(self, so_world):
        _, po = _po_path(so_world, status="draft")
        assert _statuses(po)["delivery"]["code"] == "none"

    def test_overall_is_max_of_areas(self, so_world):
        _, po = _po_path(so_world, status="in_production",
                        delivery_date=date(2026, 4, 1))
        red = RiskLevel.objects.create(
            tenant=so_world["tenant"], code="red", name="Red", color="#dc2626",
        )
        _schedule_item(po, status="delivered", risk_level=red)  # fabric red
        _bom_item(po, item_status=TrimStatus.COMPLETED)          # trims green
        assert _statuses(po)["overall"]["code"] == "red"

    def test_payload_shapes(self, so_world):
        _, po = _po_path(so_world, status="delivered")
        write = _statuses(po)
        for payload in write.values():
            assert set(payload) == {"code", "label", "color", "numeric"}


@pytest.mark.django_db
class TestSalesOrderEndpoint:
    URL = "/api/v1/merchandising/style-versions/{pk}/sales_order/"

    def test_returns_only_that_versions_pos(self, so_world, so_client):
        _, po1 = _po_path(so_world, po_number="PO-V1A", status="confirmed")
        _, po2 = _po_path(so_world, po_number="PO-V1B", status="in_production")
        sv2 = StyleVersion.objects.create(
            tenant=so_world["tenant"], style=so_world["style"], version_number=2,
            status="active", created_by=so_world["user"],
        )
        _, po3 = _po_path(so_world, po_number="PO-V2A", status="delivered", sv=sv2)

        resp = so_client.get(self.URL.format(pk=so_world["sv"].id))
        assert resp.status_code == 200
        numbers = {row["po_number"] for row in resp.json()}
        assert numbers == {"PO-V1A", "PO-V1B"}

    def test_rows_carry_status_payloads_and_po_fields(self, so_world, so_client):
        _, po = _po_path(so_world, po_number="PO-FIELDS", status="delivered")
        _schedule_item(po, status="delivered")
        resp = so_client.get(self.URL.format(pk=so_world["sv"].id))
        assert resp.status_code == 200
        row = resp.json()[0]
        assert row["po_number"] == "PO-FIELDS"
        assert row["buyer_name"] == "SO Buyer"
        assert row["quantity"] == 1000
        assert row["delivery_date"] == "2026-06-01"
        assert row["sales_statuses"]["fabric"]["code"] == "green"
        assert row["sales_statuses"]["overall"]["code"] == "green"

    def test_requires_merchandising_view_permission(self, so_world):
        _, po = _po_path(so_world, po_number="PO-NOPERM")
        locked = User.objects.create_user(
            username="nolook", email="nolook@test.com",
            password="testpass123!@#", tenant=so_world["tenant"], status="active",
        )
        client = APIClient()
        client.force_authenticate(user=locked)
        resp = client.get(self.URL.format(pk=so_world["sv"].id))
        assert resp.status_code == 403