"""
RQ-028 (GC-019): Order Manager Dashboard tests.

GC Manual "Order Manager" (L1318-1343): an overall summary of the order,
displayed in completion date order. Reviewed daily by production managers to
manage customer critical paths; potential issues are flagged. TBC statuses
appear on the report while Completed items drop off (L1067-1076).
"""
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.logistics.models import BookingScheduleItem, Docket, FinalHitReconciliation, Shipment
from apps.merchandising.models import FileOpening, FitSpec, JobRequest, PurchaseOrder, Style, StyleVersion
from apps.quality.models import GoldSeal
from apps.setup.models import Buyer, Country, Currency, Factory
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()

PAST = "2020-01-01"
FUTURE = "2099-01-01"


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def om_tenant(db):
    return Tenant.objects.create(
        name="Order Manager Co", slug="om-test",
        schema_name="tenant_om", status="active"
    )


@pytest.fixture
def om_tenant2(db):
    return Tenant.objects.create(
        name="Order Manager Co 2", slug="om-test-2",
        schema_name="tenant_om_2", status="active"
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
def om_editor_client(api_client, om_tenant):
    role = _make_role(om_tenant, "OrderManagerAdmin", [("merchandising", "view")])
    user = _make_user(om_tenant, role, "om_editor")
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def om_nom_client(api_client, om_tenant):
    role = _make_role(om_tenant, "NoMerch", [("setup", "view")])
    user = _make_user(om_tenant, role, "om_nom")
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def om_base(om_tenant):
    currency = Currency.objects.create(tenant=om_tenant, code="USD", name="US Dollar", symbol="$")
    country = Country.objects.create(tenant=om_tenant, code="BGD", name="Bangladesh")
    buyer = Buyer.objects.create(tenant=om_tenant, code="HM", name="H&M", country=country, currency=currency)
    buyer2 = Buyer.objects.create(tenant=om_tenant, code="ZT", name="Zara", country=country, currency=currency)
    factory = Factory.objects.create(tenant=om_tenant, code="F-001", name="Apex Knitwears")
    style = Style.objects.create(tenant=om_tenant, style_number="STY-001", name="Test Style", buyer=buyer)
    return {
        "tenant": om_tenant, "buyer": buyer, "buyer2": buyer2,
        "factory": factory, "currency": currency, "style": style,
    }


def _make_po(base, number, delivery_date, status_value="open", quantity=1000,
             buyer=None, style_number=None, file_number=None):
    tenant = base["tenant"]
    buyer = buyer or base["buyer"]
    style = base["style"]
    if style_number:
        style = Style.objects.create(tenant=tenant, style_number=style_number, name=f"Style {style_number}", buyer=buyer)
    sv = StyleVersion.objects.filter(tenant=tenant, style=style, version_number=1).first()
    if sv is None:
        sv = StyleVersion.objects.create(tenant=tenant, style=style, version_number=1, status="active")
    fo = FileOpening.objects.create(
        tenant=tenant, file_number=file_number or f"FO-{number}", style=style,
        style_version=sv, buyer=buyer, factory=base["factory"], file_date="2026-01-01"
    )
    return PurchaseOrder.objects.create(
        tenant=tenant, po_number=number, file_opening=fo, buyer=buyer,
        factory=base["factory"], po_date="2026-01-15", delivery_date=delivery_date,
        quantity=quantity, unit_price=Decimal("10.00"),
        total_value=Decimal(str(quantity * 10)), currency=base["currency"],
        status=status_value,
    )


def _make_shipment(base, po, number, status_value="delivered", quantity=Decimal("955.00")):
    return Shipment.objects.create(
        tenant=base["tenant"], shipment_number=number, purchase_order=po,
        status=status_value, mode="sea", quantity=quantity,
    )


def _make_schedule_item(base, shipment, status_value="live", week="2099-06-19"):
    return BookingScheduleItem.objects.create(
        tenant=base["tenant"], shipment=shipment, status=status_value, week_ending=week,
    )


def _make_gold_seal(base, shipment, status_value="approved"):
    return GoldSeal.objects.create(tenant=base["tenant"], shipment=shipment, status=status_value)


def _make_docket(base, shipment, is_final=False, unused_fabric_meters=0, sales_notified=False, docket_number=None):
    return Docket.objects.create(
        tenant=base["tenant"], docket_number=docket_number or f"DK-{shipment.shipment_number}",
        shipment=shipment, is_final=is_final, unused_fabric_meters=Decimal(str(unused_fabric_meters)),
        sales_notified=sales_notified,
    )


def _make_reconciliation(base, shipment, **kwargs):
    defaults = {
        "docket_quantity": Decimal("1000.00"),
        "shipped_quantity": Decimal("955.00"),
        "status": "pending",
    }
    defaults.update(kwargs)
    return FinalHitReconciliation.objects.create(tenant=base["tenant"], shipment=shipment, **defaults)


def _make_job(base, po, number, status_value="pending", required_by_date=None):
    return JobRequest.objects.create(
        tenant=base["tenant"], job_number=number, job_type="pattern",
        style=po.file_opening.style, purchase_order=po, status=status_value,
        required_by_date=required_by_date, priority=2,
    )


def _make_fit_spec(base, po, stage="1st", is_current=True):
    return FitSpec.objects.create(
        tenant=base["tenant"], purchase_order=po, fit_stage=stage, is_current=is_current,
    )


def _url():
    return "/api/v1/merchandising/purchase-orders/order_manager"


def _by_number(data, po_number):
    return next(r for r in data["results"] if r["po_number"] == po_number)


class TestOrderManagerDashboardAPI:
    def test_requires_auth(self, api_client, om_tenant):
        resp = api_client.get(f"{_url()}/")
        assert resp.status_code in (401, 403)

    def test_requires_merchandising_view(self, om_nom_client):
        resp = om_nom_client.get(f"{_url()}/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_empty_data_safe(self, om_editor_client, om_tenant):
        resp = om_editor_client.get(f"{_url()}/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["results"] == []
        summary = resp.data["summary"]
        assert summary["total_orders"] == 0
        assert summary["ok"] == summary["watch"] == summary["risk"] == 0

    def test_orders_sorted_by_completion_date(self, om_editor_client, om_base):
        _make_po(om_base, "PO-A", "2099-06-01")
        _make_po(om_base, "PO-B", "2099-03-01")
        _make_po(om_base, "PO-C", "2099-09-01")
        resp = om_editor_client.get(f"{_url()}/")
        numbers = [r["po_number"] for r in resp.data["results"]]
        assert numbers == ["PO-B", "PO-A", "PO-C"]

    def test_row_shape_includes_tiles(self, om_editor_client, om_base):
        po = _make_po(om_base, "PO-001", FUTURE)
        shipment = _make_shipment(om_base, po, "SHP-001")
        _make_schedule_item(om_base, shipment, "delivered")
        _make_reconciliation(
            om_base, shipment,
            docket_quantity=Decimal("1000.00"), shipped_quantity=Decimal("1000.00"),
        )
        row = _by_number(om_editor_client.get(f"{_url()}/").data, "PO-001")
        assert row["po_number"] == "PO-001"
        assert row["buyer_name"] == "H&M"
        assert row["status_label"] == "Open"
        assert set(row["production"]) == {"total", "open", "overdue", "completed"}
        assert set(row["technical"]) == {"fit_stage", "fit_stage_label"}
        assert set(row["logistics"]) == {"shipments_total", "delivered", "in_transit", "delivered_pct"}
        assert set(row["dockets"]) == {"total", "final_raised", "over_limit_pending"}
        assert set(row["reconciliation"]) == {"pending_debits", "shortage_units"}
        assert set(row["schedule"]) == {"items_total", "items_delivered", "delivered_pct"}
        assert set(row["gold_seal"]) == {"status", "status_label"}
        assert set(row["risk"]) == {"level", "flags"}


class TestOrderManagerRisk:
    def test_overdue_completion_flags_risk(self, om_editor_client, om_base):
        _make_po(om_base, "PO-R1", PAST, status_value="open")
        row = _by_number(om_editor_client.get(f"{_url()}/").data, "PO-R1")
        assert row["risk"]["level"] == "risk"
        assert any("Overdue completion" in f for f in row["risk"]["flags"])

    def test_overdue_production_flags_risk(self, om_editor_client, om_base):
        po = _make_po(om_base, "PO-R2", FUTURE, status_value="open")
        _make_job(om_base, po, "J-01", status_value="pending", required_by_date=PAST)
        row = _by_number(om_editor_client.get(f"{_url()}/").data, "PO-R2")
        assert row["risk"]["level"] == "risk"
        assert any("Overdue production" in f for f in row["risk"]["flags"])

    def test_pending_debit_flags_risk(self, om_editor_client, om_base):
        po = _make_po(om_base, "PO-R3", FUTURE, status_value="delivered")
        shipment = _make_shipment(om_base, po, "SHP-R3")
        _make_reconciliation(om_base, shipment)
        row = _by_number(om_editor_client.get(f"{_url()}/").data, "PO-R3")
        assert row["risk"]["level"] == "risk"
        assert any("Pending debit" in f for f in row["risk"]["flags"])
        assert row["reconciliation"]["pending_debits"] == 1

    def test_over_limit_docket_flags_risk(self, om_editor_client, om_base):
        po = _make_po(om_base, "PO-R4", FUTURE, status_value="open")
        shipment = _make_shipment(om_base, po, "SHP-R4")
        _make_docket(om_base, shipment, is_final=True, unused_fabric_meters=250)
        row = _by_number(om_editor_client.get(f"{_url()}/").data, "PO-R4")
        assert row["risk"]["level"] == "risk"
        assert any("Fabric over 200 m" in f for f in row["risk"]["flags"])

    def test_open_production_flags_watch(self, om_editor_client, om_base):
        po = _make_po(om_base, "PO-W1", FUTURE, status_value="open")
        _make_job(om_base, po, "J-W1", status_value="pending", required_by_date=FUTURE)
        row = _by_number(om_editor_client.get(f"{_url()}/").data, "PO-W1")
        assert row["risk"]["level"] == "watch"
        assert any("Open production" in f for f in row["risk"]["flags"])

    def test_schedule_not_fully_delivered_flags_watch(self, om_editor_client, om_base):
        po = _make_po(om_base, "PO-W2", FUTURE, status_value="open")
        shipment = _make_shipment(om_base, po, "SHP-W2")
        _make_schedule_item(om_base, shipment, "live")
        _make_schedule_item(om_base, shipment, "delivered", week="2099-06-26")
        row = _by_number(om_editor_client.get(f"{_url()}/").data, "PO-W2")
        assert row["schedule"]["delivered_pct"] == 50
        assert row["risk"]["level"] == "watch"
        assert any("Schedule" in f for f in row["risk"]["flags"])

    def test_fit_not_pp_flags_watch(self, om_editor_client, om_base):
        po = _make_po(om_base, "PO-W3", FUTURE, status_value="open")
        _make_fit_spec(om_base, po, stage="1st", is_current=True)
        row = _by_number(om_editor_client.get(f"{_url()}/").data, "PO-W3")
        assert row["technical"]["fit_stage"] == "1st"
        assert row["risk"]["level"] == "watch"
        assert any("Fit at" in f for f in row["risk"]["flags"])

    def test_pp_fit_is_not_watch(self, om_editor_client, om_base):
        po = _make_po(om_base, "PO-OK1", FUTURE, status_value="open")
        _make_fit_spec(om_base, po, stage="pp", is_current=True)
        row = _by_number(om_editor_client.get(f"{_url()}/").data, "PO-OK1")
        assert row["risk"]["level"] == "ok"

    def test_gold_seal_not_approved_flags_watch(self, om_editor_client, om_base):
        po = _make_po(om_base, "PO-W4", FUTURE, status_value="open")
        shipment = _make_shipment(om_base, po, "SHP-W4")
        _make_gold_seal(om_base, shipment, status_value="pending")
        row = _by_number(om_editor_client.get(f"{_url()}/").data, "PO-W4")
        assert row["gold_seal"]["status"] == "pending"
        assert row["risk"]["level"] == "watch"
        assert any("Gold seal" in f for f in row["risk"]["flags"])

    def test_clean_delivered_order_is_ok(self, om_editor_client, om_base):
        po = _make_po(om_base, "PO-OK2", FUTURE, status_value="delivered")
        shipment = _make_shipment(om_base, po, "SHP-OK2", quantity=Decimal("1000.00"))
        _make_schedule_item(om_base, shipment, "delivered")
        _make_reconciliation(
            om_base, shipment,
            docket_quantity=Decimal("1000.00"), shipped_quantity=Decimal("1000.00"),
            status="reconciled",
        )
        _make_gold_seal(om_base, shipment, status_value="approved")
        row = _by_number(om_editor_client.get(f"{_url()}/").data, "PO-OK2")
        assert row["reconciliation"]["pending_debits"] == 0
        assert row["schedule"]["delivered_pct"] == 100
        assert row["gold_seal"]["status"] == "approved"
        assert row["risk"]["level"] == "ok"
        assert row["risk"]["flags"] == []

    def test_production_tile_aggregates_jobs(self, om_editor_client, om_base):
        po = _make_po(om_base, "PO-P1", FUTURE, status_value="open")
        _make_job(om_base, po, "J-01", status_value="completed")
        _make_job(om_base, po, "J-02", status_value="pending", required_by_date=FUTURE)
        _make_job(om_base, po, "J-03", status_value="pending", required_by_date=PAST)
        row = _by_number(om_editor_client.get(f"{_url()}/").data, "PO-P1")
        assert row["production"] == {"total": 3, "open": 2, "overdue": 1, "completed": 1}

    def test_logistics_tile_delivered_pct(self, om_editor_client, om_base):
        po = _make_po(om_base, "PO-L1", FUTURE, status_value="open")
        _make_shipment(om_base, po, "SHP-L1a", status_value="delivered")
        _make_shipment(om_base, po, "SHP-L1b", status_value="in_transit")
        row = _by_number(om_editor_client.get(f"{_url()}/").data, "PO-L1")
        assert row["logistics"]["shipments_total"] == 2
        assert row["logistics"]["delivered"] == 1
        assert row["logistics"]["in_transit"] == 1
        assert row["logistics"]["delivered_pct"] == 50

    def test_dockets_tile_counts_over_limit(self, om_editor_client, om_base):
        po = _make_po(om_base, "PO-D1", FUTURE, status_value="open")
        shipment = _make_shipment(om_base, po, "SHP-D1")
        _make_docket(om_base, shipment, is_final=True, unused_fabric_meters=250, docket_number="DK-D1a")
        _make_docket(om_base, shipment, is_final=False, unused_fabric_meters=500, docket_number="DK-D1b")
        row = _by_number(om_editor_client.get(f"{_url()}/").data, "PO-D1")
        assert row["dockets"]["total"] == 2
        assert row["dockets"]["final_raised"] == 1
        assert row["dockets"]["over_limit_pending"] == 1


class TestOrderManagerSummaryAndFilters:
    def test_summary_counts(self, om_editor_client, om_base):
        _make_po(om_base, "PO-S1", PAST, status_value="open")
        watch = _make_po(om_base, "PO-S2", FUTURE, status_value="open")
        _make_job(om_base, watch, "J-S2", status_value="pending", required_by_date=FUTURE)
        ok = _make_po(om_base, "PO-S3", FUTURE, status_value="delivered")
        shipment = _make_shipment(om_base, ok, "SHP-S3", quantity=Decimal("1000.00"))
        _make_reconciliation(
            om_base, shipment,
            docket_quantity=Decimal("1000.00"), shipped_quantity=Decimal("1000.00"),
            status="reconciled",
        )
        summary = om_editor_client.get(f"{_url()}/").data["summary"]
        assert summary["total_orders"] == 3
        assert summary["open_orders"] == 2
        assert summary["delivered_orders"] == 1
        assert summary["risk"] == 1
        assert summary["watch"] == 1
        assert summary["ok"] == 1

    def test_summary_pending_debits_and_overdue_production(self, om_editor_client, om_base):
        po = _make_po(om_base, "PO-S4", FUTURE, status_value="delivered")
        _make_job(om_base, po, "J-S4", status_value="pending", required_by_date=PAST)
        shipment = _make_shipment(om_base, po, "SHP-S4")
        _make_reconciliation(om_base, shipment)
        summary = om_editor_client.get(f"{_url()}/").data["summary"]
        assert summary["pending_debits"] == 1
        assert summary["overdue_production"] == 1

    def test_buyer_filter(self, om_editor_client, om_base):
        _make_po(om_base, "PO-BF1", FUTURE)
        _make_po(om_base, "PO-BF2", FUTURE, buyer=om_base["buyer2"])
        data = om_editor_client.get(f"{_url()}/", {"buyer": om_base["buyer2"].id}).data
        assert [r["po_number"] for r in data["results"]] == ["PO-BF2"]
        assert data["summary"]["total_orders"] == 1

    def test_status_filter(self, om_editor_client, om_base):
        _make_po(om_base, "PO-SF1", FUTURE, status_value="open")
        _make_po(om_base, "PO-SF2", FUTURE, status_value="delivered")
        data = om_editor_client.get(f"{_url()}/", {"status": "delivered"}).data
        assert [r["po_number"] for r in data["results"]] == ["PO-SF2"]

    def test_q_search_by_po_number(self, om_editor_client, om_base):
        _make_po(om_base, "PO-Q1", FUTURE)
        _make_po(om_base, "PO-Q2", FUTURE)
        data = om_editor_client.get(f"{_url()}/", {"q": "PO-Q2"}).data
        assert [r["po_number"] for r in data["results"]] == ["PO-Q2"]

    def test_q_search_by_buyer_name(self, om_editor_client, om_base):
        _make_po(om_base, "PO-Q3", FUTURE, buyer=om_base["buyer2"])
        data = om_editor_client.get(f"{_url()}/", {"q": "Zara"}).data
        assert [r["po_number"] for r in data["results"]] == ["PO-Q3"]

    def test_q_search_by_style_number(self, om_editor_client, om_base):
        _make_po(om_base, "PO-Q4", FUTURE, style_number="STY-999")
        data = om_editor_client.get(f"{_url()}/", {"q": "STY-999"}).data
        assert [r["po_number"] for r in data["results"]] == ["PO-Q4"]

    def test_risk_filter(self, om_editor_client, om_base):
        _make_po(om_base, "PO-RF1", PAST, status_value="open")
        _make_po(om_base, "PO-RF2", FUTURE, status_value="open")
        data = om_editor_client.get(f"{_url()}/", {"risk": "risk"}).data
        assert [r["po_number"] for r in data["results"]] == ["PO-RF1"]

    def test_tenant_isolation(self, om_editor_client, om_base, om_tenant2):
        _make_po(om_base, "PO-T1", FUTURE)
        style2 = Style.objects.create(
            tenant=om_tenant2, style_number="STY-T2", name="Style T2", buyer=om_base["buyer"]
        )
        base2 = {
            "tenant": om_tenant2, "buyer": om_base["buyer"], "buyer2": om_base["buyer2"],
            "factory": om_base["factory"], "currency": om_base["currency"], "style": style2,
        }
        _make_po(base2, "PO-T2", FUTURE)
        data = om_editor_client.get(f"{_url()}/").data
        assert [r["po_number"] for r in data["results"]] == ["PO-T1"]
