"""
Tests for the Order Manager critical-path milestone block (RQ-028 / GC-019).

Extends OrderManagerSerializer with a per-PO `critical_path` summary derived
from the T&A critical path (TAMilestone). The Order Manager is the daily
critical-path review surface; each row must expose whether the order is
on-track or off-track against its milestone plan.
"""
from datetime import date
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model

from apps.merchandising.models import (
    TA,
    FileOpening,
    PurchaseOrder,
    Style,
    StyleVersion,
    TAMilestone,
)
from apps.merchandising.serializers import OrderManagerSerializer
from apps.setup.models import Buyer, Country, Currency, Factory
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


@pytest.fixture
def cp_tenant(db):
    return Tenant.objects.create(
        name="Critical Path Co", slug="critical-path",
        schema_name="tenant_critical_path", status="active"
    )


@pytest.fixture
def cp_role(db, cp_tenant):
    role = Role.objects.create(tenant=cp_tenant, name="MerchAdmin", is_system=True)
    for mod in ["setup", "merchandising"]:
        for act in ["view", "create", "edit", "delete"]:
            perm, _ = Permission.objects.get_or_create(
                module=mod, action=act,
                defaults={"description": f"{mod}:{act}"}
            )
            RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def cp_user(db, cp_tenant, cp_role):
    user = User.objects.create_user(
        username="cpusr", email="cp@test.com",
        password="testpass123!@#", tenant=cp_tenant, status="active",
    )
    UserRole.objects.create(user=user, role=cp_role)
    return user


@pytest.fixture
def cp_data(db, cp_tenant, cp_user):
    country = Country.objects.create(tenant=cp_tenant, name="CP Country")
    buyer = Buyer.objects.create(tenant=cp_tenant, name="CP Buyer", code="CP01", country=country)
    factory = Factory.objects.create(tenant=cp_tenant, name="CP Factory", code="CPF01", country=country)
    currency = Currency.objects.create(tenant=cp_tenant, name="USD", code="USD", symbol="$")
    style = Style.objects.create(
        tenant=cp_tenant, style_number="STY-CP", name="CP Style", buyer=buyer,
        created_by=cp_user,
    )
    sv = StyleVersion.objects.create(
        tenant=cp_tenant, style=style, version_number=1, status="active",
        created_by=cp_user,
    )

    def make_po(po_number, delivery_date):
        fo = FileOpening.objects.create(
            tenant=cp_tenant, file_number=f"FO-{po_number}", style=style,
            style_version=sv, buyer=buyer, factory=factory,
            file_date=date(2026, 1, 1), created_by=cp_user,
        )
        return PurchaseOrder.objects.create(
            tenant=cp_tenant, po_number=po_number, file_opening=fo, buyer=buyer,
            factory=factory, po_date=date(2026, 1, 15), delivery_date=delivery_date,
            quantity=1000, unit_price=Decimal("10.00"), total_value=Decimal("10000.00"),
            currency=currency,
        )

    return {"tenant": cp_tenant, "user": cp_user, "make_po": make_po}


def _serialize(po, today):
    return OrderManagerSerializer(po, context={"today": today}).data


@pytest.mark.django_db
class TestOrderManagerCriticalPath:
    def test_no_ta_reports_no_ta(self, cp_data):
        po = cp_data["make_po"]("PO-NOTA", date(2026, 6, 1))
        data = _serialize(po, date(2026, 5, 1))
        cp = data["critical_path"]
        assert cp["has_ta"] is False
        assert cp["status"] == "no-ta"

    def test_delayed_milestone_is_off_track(self, cp_data):
        po = cp_data["make_po"]("PO-OFF", date(2026, 6, 1))
        ta = TA.objects.create(
            tenant=cp_data["tenant"], purchase_order=po,
            delivery_date=date(2026, 6, 1), status="delayed",
        )
        TAMilestone.objects.create(
            tenant=cp_data["tenant"], ta=ta, name="Fabric Booking",
            planned_date=date(2026, 2, 1), status="delayed", is_critical=True,
        )
        data = _serialize(po, date(2026, 5, 1))
        cp = data["critical_path"]
        assert cp["has_ta"] is True
        assert cp["milestones_total"] == 1
        assert cp["milestones_delayed"] == 1
        assert cp["critical_milestones_total"] == 1
        assert cp["status"] == "off-track"

    def test_overdue_critical_milestone_is_off_track(self, cp_data):
        po = cp_data["make_po"]("PO-OVER", date(2026, 6, 1))
        ta = TA.objects.create(
            tenant=cp_data["tenant"], purchase_order=po,
            delivery_date=date(2026, 6, 1), status="active",
        )
        TAMilestone.objects.create(
            tenant=cp_data["tenant"], ta=ta, name="Strike-off",
            planned_date=date(2026, 3, 1), status="pending", is_critical=True,
        )
        data = _serialize(po, date(2026, 5, 1))
        cp = data["critical_path"]
        assert cp["status"] == "off-track"
        assert cp["next_milestone"]["name"] == "Strike-off"
        assert cp["next_milestone"]["is_critical"] is True

    def test_upcoming_on_schedule_is_on_track(self, cp_data):
        po = cp_data["make_po"]("PO-ON", date(2026, 6, 1))
        ta = TA.objects.create(
            tenant=cp_data["tenant"], purchase_order=po,
            delivery_date=date(2026, 6, 1), status="active",
        )
        TAMilestone.objects.create(
            tenant=cp_data["tenant"], ta=ta, name="Bulk", is_critical=False,
            planned_date=date(2026, 7, 1), status="pending",
        )
        data = _serialize(po, date(2026, 5, 1))
        cp = data["critical_path"]
        assert cp["status"] == "on-track"
        assert cp["next_milestone"]["planned_date"] == "2026-07-01"

    def test_all_completed_is_complete(self, cp_data):
        po = cp_data["make_po"]("PO-DONE", date(2026, 6, 1))
        ta = TA.objects.create(
            tenant=cp_data["tenant"], purchase_order=po,
            delivery_date=date(2026, 6, 1), status="completed",
        )
        TAMilestone.objects.create(
            tenant=cp_data["tenant"], ta=ta, name="Delivery", is_critical=True,
            planned_date=date(2026, 4, 1), actual_date=date(2026, 4, 1),
            status="completed",
        )
        data = _serialize(po, date(2026, 5, 1))
        cp = data["critical_path"]
        assert cp["milestones_completed"] == 1
        assert cp["status"] == "complete"

    def test_off_track_milestone_counts_are_accurate(self, cp_data):
        po = cp_data["make_po"]("PO-MIX", date(2026, 6, 1))
        ta = TA.objects.create(
            tenant=cp_data["tenant"], purchase_order=po,
            delivery_date=date(2026, 6, 1), status="delayed",
        )
        TAMilestone.objects.create(
            tenant=cp_data["tenant"], ta=ta, name="Fabric", is_critical=True,
            planned_date=date(2026, 2, 1), status="delayed",
        )
        TAMilestone.objects.create(
            tenant=cp_data["tenant"], ta=ta, name="Trims", is_critical=True,
            planned_date=date(2026, 4, 1), status="pending",
        )
        TAMilestone.objects.create(
            tenant=cp_data["tenant"], ta=ta, name="Labels", is_critical=False,
            planned_date=date(2026, 3, 1), actual_date=date(2026, 3, 1),
            status="completed",
        )
        data = _serialize(po, date(2026, 5, 1))
        cp = data["critical_path"]
        assert cp["milestones_total"] == 3
        assert cp["milestones_completed"] == 1
        assert cp["milestones_delayed"] == 1
        assert cp["critical_milestones_total"] == 2
        assert cp["critical_milestones_completed"] == 0
        assert cp["status"] == "off-track"
