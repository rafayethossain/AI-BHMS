"""
Tests for RQ-023: Fabric Utilization Reports (GC-030).

GC Manual Fabric Utilisation: identify excess fabric at docket stage to
explore options to utilise; final rating vs actual rating; local fabric team
monitors mills quarterly with performance.
"""
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.fabric.models import (
    FabricOrder,
    FabricSupplier,
    FabricUtilization,
)
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()

CURRENT_PERIOD = timezone.now().strftime("%Y-%m")


def _make_order(tenant, number, supplier, qty, status="delivered"):
    return FabricOrder.objects.create(
        tenant=tenant,
        order_number=number,
        supplier=supplier,
        fabric_category=None,
        quantity_meters=qty,
        unit_price="4.0000",
        status=status,
    )


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def fu_tenant(db):
    return Tenant.objects.create(
        name="FU Test Co", slug="fu-test",
        schema_name="tenant_fu", status="active",
    )


@pytest.fixture
def fu_tenant2(db):
    return Tenant.objects.create(
        name="FU Test Co 2", slug="fu-test-2",
        schema_name="tenant_fu2", status="active",
    )


def _make_role(db, tenant, name, perms=None):
    role = Role.objects.create(tenant=tenant, name=name, is_system=True)
    for mod, act in (perms or [("fabric", "view")]):
        perm, _ = Permission.objects.get_or_create(
            module=mod, action=act,
            defaults={"description": f"{mod}:{act}"},
        )
        RolePermission.objects.create(role=role, permission=perm)
    return role


def _make_user(db, tenant, username, role):
    user = User.objects.create_user(
        username=username, email=f"{username}@test.com",
        password="testpass123!@#", tenant=tenant, status="active",
        first_name=username.title(), last_name="User",
    )
    if role:
        UserRole.objects.create(user=user, role=role)
    return user


@pytest.fixture
def editor_role(db, fu_tenant):
    return _make_role(
        db, fu_tenant, "Fabric Editor",
        [("fabric", "view"), ("fabric", "create"), ("fabric", "edit"), ("fabric", "delete")],
    )


@pytest.fixture
def viewer_role(db, fu_tenant):
    return _make_role(db, fu_tenant, "Fabric Viewer", [("fabric", "view")])


@pytest.fixture
def nofab_role(db, fu_tenant):
    return _make_role(db, fu_tenant, "HR Only", [("users", "view")])


@pytest.fixture
def fu_editor(db, fu_tenant, editor_role):
    return _make_user(db, fu_tenant, "fueditor", editor_role)


@pytest.fixture
def fu_viewer(db, fu_tenant, viewer_role):
    return _make_user(db, fu_tenant, "fuviewer", viewer_role)


@pytest.fixture
def fu_nofab(db, fu_tenant, nofab_role):
    return _make_user(db, fu_tenant, "funofab", nofab_role)


@pytest.fixture
def editor_client(api_client, fu_editor):
    api_client.force_authenticate(user=fu_editor)
    return api_client


@pytest.fixture
def viewer_client(api_client, fu_viewer):
    api_client.force_authenticate(user=fu_viewer)
    return api_client


@pytest.fixture
def nofab_client(api_client, fu_nofab):
    api_client.force_authenticate(user=fu_nofab)
    return api_client


@pytest.fixture
def seed_order(fu_tenant):
    supplier = FabricSupplier.objects.create(
        tenant=fu_tenant, code="SUP-FU1", name="FU Supplier",
    )
    return _make_order(fu_tenant, "FO-2026-3001", supplier, "3000")


@pytest.fixture
def seed_util(seed_order):
    return FabricUtilization.objects.create(
        tenant=seed_order.tenant,
        order=seed_order,
        period=CURRENT_PERIOD,
        received_meters="3100",
        used_meters="2950",
        wasted_meters="100",
        damaged_meters="25",
    )


class TestFabricUtilizationModel:
    """RQ-023: utilization record + computed GC quantities."""

    def test_default_wasted_damaged_zero(self, seed_order):
        u = FabricUtilization.objects.create(
            tenant=seed_order.tenant, order=seed_order,
            period="2026-07", received_meters="2000", used_meters="1900",
        )
        assert u.wasted_meters == Decimal("0")
        assert u.damaged_meters == Decimal("0")

    def test_ordered_meters_from_order(self, seed_util):
        assert seed_util.ordered_meters() == Decimal("3000")

    def test_over_under_meters_positive_when_over_delivered(self, seed_util):
        assert seed_util.over_under_meters() == Decimal("100")

    def test_over_under_pct_computed(self, seed_util):
        assert seed_util.over_under_pct() == Decimal("3.33")

    def test_accounted_meters_sums_all_components(self, seed_util):
        assert seed_util.accounted_meters() == Decimal("3075")

    def test_excess_meters_is_unaccounted_remainder(self, seed_util):
        assert seed_util.excess_meters() == Decimal("25")

    def test_efficiency_pct_used_over_received(self, seed_util):
        assert seed_util.efficiency_pct() == Decimal("95.16")

    def test_under_delivery_gives_negative_over_under(self, seed_order):
        u = FabricUtilization.objects.create(
            tenant=seed_order.tenant, order=seed_order,
            period="2026-07", received_meters="2900", used_meters="2900",
        )
        assert u.over_under_meters() == Decimal("-100")
        assert u.over_under_pct() == Decimal("-3.33")

    def test_efficiency_guards_zero_received(self, seed_order):
        u = FabricUtilization.objects.create(
            tenant=seed_order.tenant, order=seed_order,
            period="2026-07", received_meters="0", used_meters="0",
        )
        assert u.efficiency_pct() == Decimal("0")
        assert u.excess_meters() == Decimal("0")

    def test_unique_order_period(self, seed_util):
        with pytest.raises(IntegrityError):
            FabricUtilization.objects.create(
                tenant=seed_util.tenant, order=seed_util.order,
                period=seed_util.period,
                received_meters="100", used_meters="100",
            )

    def test_negative_received_rejected_by_clean(self, seed_order):
        u = FabricUtilization(
            tenant=seed_order.tenant, order=seed_order,
            period="2026-07", received_meters="-5", used_meters="0",
        )
        with pytest.raises(ValidationError):
            u.full_clean()


class TestFabricUtilizationAPI:
    """RQ-023: CRUD + monthly/quarterly report endpoints."""

    def test_list_401_unauthenticated(self, api_client, fu_tenant):
        resp = api_client.get("/api/v1/fabric/utilizations/")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_403_without_fabric_perms(self, nofab_client):
        resp = nofab_client.get("/api/v1/fabric/utilizations/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_list_viewer_allowed(self, viewer_client, seed_util):
        resp = viewer_client.get("/api/v1/fabric/utilizations/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1

    def test_list_tenant_scoped(self, editor_client, fu_tenant2, seed_util):
        other_supplier = FabricSupplier.objects.create(
            tenant=fu_tenant2, code="SUP-FU2", name="Other Supplier",
        )
        other_order = _make_order(fu_tenant2, "FO-2026-5001", other_supplier, "1000")
        FabricUtilization.objects.create(
            tenant=fu_tenant2, order=other_order,
            period=CURRENT_PERIOD, received_meters="1000", used_meters="1000",
        )
        resp = editor_client.get("/api/v1/fabric/utilizations/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1

    def test_create_record(self, editor_client, seed_order):
        resp = editor_client.post("/api/v1/fabric/utilizations/", {
            "order": str(seed_order.id),
            "period": CURRENT_PERIOD,
            "received_meters": "3100",
            "used_meters": "2950",
            "wasted_meters": "100",
            "damaged_meters": "25",
        })
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["order_number"] == seed_order.order_number
        assert resp.data["ordered_meters"] == "3000.00"
        assert resp.data["recorded_by"] is not None

    def test_create_computes_derived_fields(self, editor_client, seed_order):
        resp = editor_client.post("/api/v1/fabric/utilizations/", {
            "order": str(seed_order.id),
            "period": CURRENT_PERIOD,
            "received_meters": "3100",
            "used_meters": "2950",
            "wasted_meters": "100",
            "damaged_meters": "25",
        })
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["over_under_meters"] == "100.00"
        assert resp.data["over_under_pct"] == "3.33"
        assert resp.data["accounted_meters"] == "3075.00"
        assert resp.data["excess_meters"] == "25.00"
        assert resp.data["efficiency_pct"] == "95.16"

    def test_create_requires_create_perm(self, viewer_client, seed_order):
        resp = viewer_client.post("/api/v1/fabric/utilizations/", {
            "order": str(seed_order.id),
            "period": CURRENT_PERIOD,
            "received_meters": "100", "used_meters": "100",
        })
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_create_negative_meters_400(self, editor_client, seed_order):
        resp = editor_client.post("/api/v1/fabric/utilizations/", {
            "order": str(seed_order.id),
            "period": CURRENT_PERIOD,
            "received_meters": "-5", "used_meters": "100",
        })
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_invalid_period_400(self, editor_client, seed_order):
        resp = editor_client.post("/api/v1/fabric/utilizations/", {
            "order": str(seed_order.id),
            "period": "08-2026",
            "received_meters": "100", "used_meters": "100",
        })
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_retrieve_exposes_computed_fields(self, editor_client, seed_util):
        resp = editor_client.get(f"/api/v1/fabric/utilizations/{seed_util.id}/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["efficiency_pct"] == "95.16"
        assert resp.data["excess_meters"] == "25.00"

    def test_update_recomputes_derived(self, editor_client, seed_util):
        resp = editor_client.patch(
            f"/api/v1/fabric/utilizations/{seed_util.id}/",
            {"used_meters": "3000"},
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["used_meters"] == "3000.00"
        assert resp.data["efficiency_pct"] == "96.77"

    def test_delete_record(self, editor_client, seed_util):
        resp = editor_client.delete(f"/api/v1/fabric/utilizations/{seed_util.id}/")
        assert resp.status_code == status.HTTP_204_NO_CONTENT
        assert FabricUtilization.objects.filter(id=seed_util.id).count() == 0

    def test_delete_requires_delete_perm(self, viewer_client, seed_util):
        resp = viewer_client.delete(f"/api/v1/fabric/utilizations/{seed_util.id}/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_monthly_summary_defaults_current_period(self, editor_client, seed_util):
        resp = editor_client.get("/api/v1/fabric/utilizations/monthly_summary/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["period"] == CURRENT_PERIOD
        assert resp.data["summary"]["orders_count"] == 1
        assert resp.data["summary"]["received_meters"] == "3100.00"

    def test_monthly_summary_empty_period_zeros(self, editor_client, seed_util):
        resp = editor_client.get("/api/v1/fabric/utilizations/monthly_summary/?period=2099-01")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["summary"]["orders_count"] == 0
        assert resp.data["summary"]["received_meters"] == "0.00"
        assert resp.data["rows"] == []

    def test_monthly_summary_aggregates_totals(self, editor_client, seed_util, seed_order):
        supplier2 = FabricSupplier.objects.create(
            tenant=seed_order.tenant, code="SUP-FU3", name="Supplier Three",
        )
        order2 = _make_order(seed_order.tenant, "FO-2026-3002", supplier2, "3000")
        FabricUtilization.objects.create(
            tenant=seed_order.tenant, order=order2,
            period=CURRENT_PERIOD,
            received_meters="3000", used_meters="3000",
        )
        resp = editor_client.get(
            f"/api/v1/fabric/utilizations/monthly_summary/?period={CURRENT_PERIOD}"
        )
        summary = resp.data["summary"]
        assert summary["orders_count"] == 2
        assert summary["ordered_meters"] == "6000.00"
        assert summary["received_meters"] == "6100.00"
        assert summary["used_meters"] == "5950.00"
        assert summary["over_under_meters"] == "100.00"
        assert summary["over_under_pct"] == "1.67"
        assert summary["efficiency_pct"] == "97.54"
        assert len(resp.data["rows"]) == 2

    def test_monthly_summary_requires_view(self, nofab_client):
        resp = nofab_client.get("/api/v1/fabric/utilizations/monthly_summary/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_quarterly_report_requires_params(self, editor_client):
        resp = editor_client.get("/api/v1/fabric/utilizations/quarterly_mill_report/")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_quarterly_report_invalid_quarter_400(self, editor_client):
        resp = editor_client.get(
            "/api/v1/fabric/utilizations/quarterly_mill_report/?year=2026&quarter=9"
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_quarterly_report_groups_by_supplier(self, editor_client, seed_order):
        supplier_b = FabricSupplier.objects.create(
            tenant=seed_order.tenant, code="SUP-FUB", name="Mill B",
        )
        order_b = _make_order(seed_order.tenant, "FO-2026-3002", supplier_b, "2000")
        FabricUtilization.objects.create(
            tenant=seed_order.tenant, order=seed_order,
            period="2026-08",
            received_meters="3100", used_meters="2950",
            wasted_meters="100", damaged_meters="25",
        )
        FabricUtilization.objects.create(
            tenant=seed_order.tenant, order=order_b,
            period="2026-08",
            received_meters="2000", used_meters="1900",
        )
        resp = editor_client.get(
            "/api/v1/fabric/utilizations/quarterly_mill_report/?year=2026&quarter=3"
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["quarter"] == 3
        assert len(resp.data["mills"]) == 2
        assert resp.data["summary"]["orders_count"] == 2

    def test_quarterly_report_mill_totals(self, editor_client, seed_order):
        supplier_b = FabricSupplier.objects.create(
            tenant=seed_order.tenant, code="SUP-FUB", name="Mill B",
        )
        order_b = _make_order(seed_order.tenant, "FO-2026-3002", supplier_b, "2000")
        FabricUtilization.objects.create(
            tenant=seed_order.tenant, order=seed_order,
            period="2026-08",
            received_meters="3100", used_meters="2950",
            wasted_meters="100", damaged_meters="25",
        )
        FabricUtilization.objects.create(
            tenant=seed_order.tenant, order=order_b,
            period="2026-08",
            received_meters="2000", used_meters="1900",
        )
        resp = editor_client.get(
            "/api/v1/fabric/utilizations/quarterly_mill_report/?year=2026&quarter=3"
        )
        by_name = {m["supplier_name"]: m for m in resp.data["mills"]}
        mill_a = by_name["FU Supplier"]
        mill_b = by_name["Mill B"]
        assert mill_a["ordered_meters"] == "3000.00"
        assert mill_a["received_meters"] == "3100.00"
        assert mill_a["over_under_pct"] == "3.33"
        assert mill_a["efficiency_pct"] == "95.16"
        assert mill_a["excess_meters"] == "25.00"
        assert mill_b["ordered_meters"] == "2000.00"
        assert mill_b["efficiency_pct"] == "95.00"
        summary = resp.data["summary"]
        assert summary["ordered_meters"] == "5000.00"
        assert summary["received_meters"] == "5100.00"
        assert summary["used_meters"] == "4850.00"
        assert summary["over_under_pct"] == "2.00"
        assert summary["efficiency_pct"] == "95.10"

    def test_quarterly_report_filters_out_other_periods(self, editor_client, seed_order):
        supplier_b = FabricSupplier.objects.create(
            tenant=seed_order.tenant, code="SUP-FUB", name="Mill B",
        )
        order_b = _make_order(seed_order.tenant, "FO-2026-3002", supplier_b, "2000")
        FabricUtilization.objects.create(
            tenant=seed_order.tenant, order=order_b,
            period="2026-08",
            received_meters="2000", used_meters="1900",
        )
        FabricUtilization.objects.create(
            tenant=seed_order.tenant, order=seed_order,
            period="2026-02",
            received_meters="3000", used_meters="3000",
        )
        resp = editor_client.get(
            "/api/v1/fabric/utilizations/quarterly_mill_report/?year=2026&quarter=3"
        )
        assert len(resp.data["mills"]) == 1
        assert resp.data["summary"]["orders_count"] == 1


class TestFabricUtilizationToleranceFields:
    """B10: tolerance fields surfaced on reconciliation via ToleranceEngine."""

    def test_tolerance_fields_present_in_list(self, editor_client, seed_util):
        """List endpoint returns tolerance_pct, tolerance_status, over_tolerance."""
        resp = editor_client.get("/api/v1/fabric/utilizations/")
        assert resp.status_code == status.HTTP_200_OK
        row = resp.data["results"][0]
        assert "tolerance_pct" in row
        assert "tolerance_upper_meters" in row
        assert "tolerance_lower_meters" in row
        assert "tolerance_status" in row
        assert "over_tolerance" in row

    def test_tolerance_fields_present_in_detail(self, editor_client, seed_util):
        """Detail endpoint returns tolerance fields."""
        resp = editor_client.get(f"/api/v1/fabric/utilizations/{seed_util.id}/")
        assert resp.status_code == status.HTTP_200_OK
        assert "tolerance_pct" in resp.data
        assert "tolerance_status" in resp.data
        assert "over_tolerance" in resp.data

    def test_within_tolerance_other_default(self, editor_client, seed_order):
        """3000m ordered, 3100m received = +3.33% — within 5% default for 'other' tier."""
        util = FabricUtilization.objects.create(
            tenant=seed_order.tenant, order=seed_order,
            period="2026-09", received_meters="3100", used_meters="2950",
        )
        resp = editor_client.get(f"/api/v1/fabric/utilizations/{util.id}/")
        assert resp.data["tolerance_pct"] == "5.00"
        assert resp.data["tolerance_status"] == "within"
        assert resp.data["over_tolerance"] is False
        assert resp.data["tolerance_upper_meters"] == "3150.00"
        assert resp.data["tolerance_lower_meters"] == "2850.00"

    def test_over_tolerance_flag_surfaced(self, editor_client, seed_order):
        """3000m ordered, 3200m received = +6.67% — over 5% default for 'other' tier."""
        util = FabricUtilization.objects.create(
            tenant=seed_order.tenant, order=seed_order,
            period="2026-10", received_meters="3200", used_meters="3100",
        )
        resp = editor_client.get(f"/api/v1/fabric/utilizations/{util.id}/")
        assert resp.data["tolerance_status"] == "over"
        assert resp.data["over_tolerance"] is True
        assert resp.data["tolerance_pct"] == "5.00"

    def test_under_tolerance_flag_surfaced(self, editor_client, seed_order):
        """3000m ordered, 2800m received = -6.67% — under 5% default for 'other' tier."""
        util = FabricUtilization.objects.create(
            tenant=seed_order.tenant, order=seed_order,
            period="2026-11", received_meters="2800", used_meters="2800",
        )
        resp = editor_client.get(f"/api/v1/fabric/utilizations/{util.id}/")
        assert resp.data["tolerance_status"] == "under"
        assert resp.data["over_tolerance"] is False

    def test_tolerance_fields_in_create_response(self, editor_client, seed_order):
        """Create response includes tolerance fields."""
        resp = editor_client.post("/api/v1/fabric/utilizations/", {
            "order": str(seed_order.id),
            "period": "2026-12",
            "received_meters": "3200",
            "used_meters": "3100",
        })
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["tolerance_status"] == "over"
        assert resp.data["over_tolerance"] is True
        assert resp.data["tolerance_pct"] == "5.00"

    def test_tolerance_fields_in_update_response(self, editor_client, seed_util):
        """Patch response includes updated tolerance fields."""
        resp = editor_client.patch(
            f"/api/v1/fabric/utilizations/{seed_util.id}/",
            {"received_meters": "3200"},
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["tolerance_status"] == "over"
        assert resp.data["over_tolerance"] is True
