"""
RQ-031 (GC-022): Shipping Paperwork Comparison tests.

GC Manual "Reconciliation procedures" 1) Shipping Paperwork: compare what has
been ordered against what has been shipped once the paperwork is received; if
fabric shipped is more than 5% (2% for Primark and Penney's) a debit must be
raised. "Shipping Paperwork Vs Ordered Quantity": compare the shipped quantity
and costing to establish how many garments can be produced, and notify sales if
the order cannot be covered.

Roadmap GC-022: shipped qty vs ordered qty analysis; comparison calculation +
garment producibility estimate. New service, no model changes.
"""
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.logistics.models import Docket, Shipment
from apps.merchandising.models import (
    BOM,
    BOMItem,
    FileOpening,
    PurchaseOrder,
    Style,
    StyleVersion,
)
from apps.setup.models import Buyer, Country, Currency, Factory
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def pc_tenant(db):
    return Tenant.objects.create(
        name="Paperwork Compare Co", slug="pc-test",
        schema_name="tenant_pc", status="active"
    )


@pytest.fixture
def pc_tenant2(db):
    return Tenant.objects.create(
        name="Paperwork Compare Co 2", slug="pc-test-2",
        schema_name="tenant_pc_2", status="active"
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
def pc_editor_client(api_client, pc_tenant):
    role = _make_role(
        pc_tenant, "PaperworkAdmin",
        [(m, a) for m in ("logistics", "merchandising", "setup")
         for a in ("view", "create", "edit", "delete")],
    )
    user = _make_user(pc_tenant, role, "pc_editor")
    api_client.force_authenticate(user=user)
    api_client.defaults["HTTP_X_TENANT_ID"] = str(pc_tenant.id)
    return api_client


@pytest.fixture
def pc_nolog_client(api_client, pc_tenant):
    role = _make_role(pc_tenant, "NoLogistics", [("setup", "view")])
    user = _make_user(pc_tenant, role, "pc_nolog")
    api_client.force_authenticate(user=user)
    api_client.defaults["HTTP_X_TENANT_ID"] = str(pc_tenant.id)
    return api_client


@pytest.fixture
def pc_tenant2_client(api_client, pc_tenant2):
    role = _make_role(
        pc_tenant2, "PaperworkAdmin2",
        [(m, a) for m in ("logistics", "merchandising", "setup")
         for a in ("view", "create", "edit", "delete")],
    )
    user = _make_user(pc_tenant2, role, "pc_editor2")
    api_client.force_authenticate(user=user)
    api_client.defaults["HTTP_X_TENANT_ID"] = str(pc_tenant2.id)
    return api_client


def _seed_po_chain(tenant, po_number="PO-100", buyer_name="H&M", buyer_code="HM",
                   quantity=1000, country_code="BGD", currency_code="USD",
                   style_number="STY-100", bom_consumption=Decimal("1.1000"),
                   with_bom=True):
    """Full PO -> style -> BOM chain with a fabric consumption line."""
    currency = Currency.objects.create(tenant=tenant, code=currency_code, name="US Dollar", symbol="$")
    country = Country.objects.create(tenant=tenant, code=country_code, name="Bangladesh")
    buyer = Buyer.objects.create(tenant=tenant, code=buyer_code, name=buyer_name, country=country, currency=currency)
    factory = Factory.objects.create(tenant=tenant, code=f"F-{buyer_code}", name="Apex Knitwears")
    style = Style.objects.create(tenant=tenant, style_number=style_number, name="Test Style", buyer=buyer)
    sv = StyleVersion.objects.create(tenant=tenant, style=style, version_number=1, status="active")
    fo = FileOpening.objects.create(
        tenant=tenant, file_number=f"FO-{buyer_code}", style=style, style_version=sv,
        buyer=buyer, factory=factory, file_date="2026-01-01"
    )
    po = PurchaseOrder.objects.create(
        tenant=tenant, po_number=po_number, file_opening=fo, buyer=buyer,
        factory=factory, po_date="2026-01-15", delivery_date="2026-06-01",
        quantity=quantity, unit_price=10.00, total_value=10000.00, currency=currency,
    )
    if with_bom:
        bom = BOM.objects.create(tenant=tenant, style_version=sv, name="Main BOM", version=1, status="active")
        BOMItem.objects.create(
            tenant=tenant, bom=bom, category="fabric", item_name="Mesh Fabric",
            consumption=bom_consumption,
        )
    return {"po": po, "buyer": buyer, "factory": factory, "style": style,
            "style_version": sv, "file_opening": fo, "currency": currency}


def _make_shipment(tenant, po, number, quantity, status_="delivered"):
    return Shipment.objects.create(
        tenant=tenant, shipment_number=number, purchase_order=po,
        status=status_, mode="sea", quantity=Decimal(str(quantity)),
    )


def _make_docket(tenant, shipment, meters):
    return Docket.objects.create(
        tenant=tenant, docket_number=f"DCK-{shipment.shipment_number}",
        shipment=shipment, total_fabric_meters=Decimal(str(meters)),
    )


# ---------------------------------------------------------------------------
# Tolerance
# ---------------------------------------------------------------------------

def test_tolerance_default_5pct(pc_tenant):
    from apps.logistics.services.paperwork_comparison import PaperworkComparisonService
    chain = _seed_po_chain(pc_tenant)
    assert PaperworkComparisonService.tolerance_pct_for_buyer(chain["buyer"]) == Decimal("5.00")


def test_tolerance_2pct_for_primark_and_penney(pc_tenant):
    from apps.logistics.services.paperwork_comparison import PaperworkComparisonService
    currency = Currency.objects.create(tenant=pc_tenant, code="GBP", name="GBP", symbol="£")
    country = Country.objects.create(tenant=pc_tenant, code="IRL", name="Ireland")
    primark = Buyer.objects.create(tenant=pc_tenant, code="PRM", name="Primark", country=country, currency=currency)
    penney = Buyer.objects.create(tenant=pc_tenant, code="JCP", name="JC Penney", country=country, currency=currency)
    other = Buyer.objects.create(tenant=pc_tenant, code="TGT", name="Target", country=country, currency=currency)
    assert PaperworkComparisonService.tolerance_pct_for_buyer(primark) == Decimal("2.00")
    assert PaperworkComparisonService.tolerance_pct_for_buyer(penney) == Decimal("2.00")
    assert PaperworkComparisonService.tolerance_pct_for_buyer(other) == Decimal("5.00")


# ---------------------------------------------------------------------------
# Compare a single PO
# ---------------------------------------------------------------------------

def test_compare_po_inline_order_vs_shipped(pc_tenant):
    from apps.logistics.services.paperwork_comparison import PaperworkComparisonService
    chain = _seed_po_chain(pc_tenant)
    _make_shipment(pc_tenant, chain["po"], "SHP-100", 1000)
    r = PaperworkComparisonService.compare_po(chain["po"])
    assert r["po_number"] == "PO-100"
    assert r["ordered_quantity"] == 1000
    assert r["shipped_quantity"] == Decimal("1000.00")
    assert r["quantity_variance"] == Decimal("0.00")
    assert r["quantity_variance_pct"] == Decimal("0.00")
    assert r["over_tolerance"] is False


def test_compare_po_over_tolerance_when_more_than_5pct(pc_tenant):
    from apps.logistics.services.paperwork_comparison import PaperworkComparisonService
    chain = _seed_po_chain(pc_tenant)
    _make_shipment(pc_tenant, chain["po"], "SHP-100", 1051)
    r = PaperworkComparisonService.compare_po(chain["po"])
    assert r["quantity_variance"] == Decimal("51.00")
    assert r["quantity_variance_pct"] == Decimal("5.10")
    assert r["over_tolerance"] is True


def test_compare_po_exactly_5pct_not_over_tolerance(pc_tenant):
    from apps.logistics.services.paperwork_comparison import PaperworkComparisonService
    chain = _seed_po_chain(pc_tenant)
    _make_shipment(pc_tenant, chain["po"], "SHP-100", 1050)
    r = PaperworkComparisonService.compare_po(chain["po"])
    assert r["quantity_variance_pct"] == Decimal("5.00")
    assert r["over_tolerance"] is False


def test_compare_po_primark_2pct_tolerance(pc_tenant):
    from apps.logistics.services.paperwork_comparison import PaperworkComparisonService
    chain = _seed_po_chain(pc_tenant, buyer_name="Primark", buyer_code="PRM",
                           country_code="IRL", currency_code="GBP")
    _make_shipment(pc_tenant, chain["po"], "SHP-100", 1030)
    r = PaperworkComparisonService.compare_po(chain["po"])
    assert r["tolerance_pct"] == Decimal("2.00")
    assert r["quantity_variance_pct"] == Decimal("3.00")
    assert r["over_tolerance"] is True


def test_compare_po_aggregates_shipments_and_excludes_cancelled(pc_tenant):
    from apps.logistics.services.paperwork_comparison import PaperworkComparisonService
    chain = _seed_po_chain(pc_tenant)
    _make_shipment(pc_tenant, chain["po"], "SHP-100", 600)
    _make_shipment(pc_tenant, chain["po"], "SHP-101", 450)
    _make_shipment(pc_tenant, chain["po"], "SHP-102", 1000, status_="cancelled")
    r = PaperworkComparisonService.compare_po(chain["po"])
    assert r["shipped_quantity"] == Decimal("1050.00")
    assert r["quantity_variance"] == Decimal("50.00")


def test_compare_po_booking_shipment_not_counted(pc_tenant):
    from apps.logistics.services.paperwork_comparison import PaperworkComparisonService
    chain = _seed_po_chain(pc_tenant)
    _make_shipment(pc_tenant, chain["po"], "SHP-100", 500, status_="booking")
    r = PaperworkComparisonService.compare_po(chain["po"])
    assert r["shipped_quantity"] == Decimal("0.00")
    assert r["quantity_variance"] == Decimal("-1000.00")


def test_compare_po_shipped_fabric_meters_from_dockets(pc_tenant):
    from apps.logistics.services.paperwork_comparison import PaperworkComparisonService
    chain = _seed_po_chain(pc_tenant)
    s1 = _make_shipment(pc_tenant, chain["po"], "SHP-100", 1000)
    s2 = _make_shipment(pc_tenant, chain["po"], "SHP-101", 1000)
    _make_docket(pc_tenant, s1, 600)
    _make_docket(pc_tenant, s2, 500)
    r = PaperworkComparisonService.compare_po(chain["po"])
    assert r["shipped_fabric_meters"] == Decimal("1100.00")


def test_compare_po_producible_garments_and_cover_order(pc_tenant):
    from apps.logistics.services.paperwork_comparison import PaperworkComparisonService
    chain = _seed_po_chain(pc_tenant, quantity=1000, bom_consumption=Decimal("1.1000"))
    s1 = _make_shipment(pc_tenant, chain["po"], "SHP-100", 1000)
    _make_docket(pc_tenant, s1, 1100)
    r = PaperworkComparisonService.compare_po(chain["po"])
    assert r["consumption_per_garment"] == Decimal("1.1000")
    assert r["shipped_fabric_meters"] == Decimal("1100.00")
    assert r["producible_garments"] == 1000
    assert r["garment_variance"] == 0
    assert r["can_cover_order"] is True


def test_compare_po_cannot_cover_order(pc_tenant):
    from apps.logistics.services.paperwork_comparison import PaperworkComparisonService
    chain = _seed_po_chain(pc_tenant, quantity=1000, bom_consumption=Decimal("1.1000"))
    s1 = _make_shipment(pc_tenant, chain["po"], "SHP-100", 1000)
    _make_docket(pc_tenant, s1, 990)
    r = PaperworkComparisonService.compare_po(chain["po"])
    assert r["producible_garments"] == 900
    assert r["garment_variance"] == -100
    assert r["can_cover_order"] is False


def test_compare_po_no_bom_no_producibility(pc_tenant):
    from apps.logistics.services.paperwork_comparison import PaperworkComparisonService
    chain = _seed_po_chain(pc_tenant, with_bom=False)
    _make_shipment(pc_tenant, chain["po"], "SHP-100", 1000)
    r = PaperworkComparisonService.compare_po(chain["po"])
    assert r["consumption_per_garment"] is None
    assert r["producible_garments"] is None
    assert r["can_cover_order"] is None


def test_compare_po_zero_ordered_quantity_guarded(pc_tenant):
    from apps.logistics.services.paperwork_comparison import PaperworkComparisonService
    chain = _seed_po_chain(pc_tenant, quantity=0)
    _make_shipment(pc_tenant, chain["po"], "SHP-100", 10)
    r = PaperworkComparisonService.compare_po(chain["po"])
    assert r["quantity_variance_pct"] is None
    assert r["over_tolerance"] is False


# ---------------------------------------------------------------------------
# Tenant-level comparison
# ---------------------------------------------------------------------------

def test_compare_tenant_only_pos_with_shipped_shipments(pc_tenant):
    from apps.logistics.services.paperwork_comparison import PaperworkComparisonService
    chain = _seed_po_chain(pc_tenant, po_number="PO-100")
    chain2 = _seed_po_chain(pc_tenant, po_number="PO-200", buyer_code="CHM",
                            country_code="SLV", currency_code="EUR",
                            style_number="STY-200")
    _make_shipment(pc_tenant, chain["po"], "SHP-100", 1000)
    _make_shipment(pc_tenant, chain2["po"], "SHP-200", 1000, status_="booking")
    result = PaperworkComparisonService.compare_tenant(pc_tenant)
    assert result["count"] == 1
    assert [r["po_number"] for r in result["results"]] == ["PO-100"]


def test_compare_tenant_summary_counts(pc_tenant):
    from apps.logistics.services.paperwork_comparison import PaperworkComparisonService
    over = _seed_po_chain(pc_tenant, po_number="PO-100", buyer_code="BHM",
                          country_code="BGD", currency_code="USD",
                          style_number="STY-100")
    short = _seed_po_chain(pc_tenant, po_number="PO-200", buyer_code="CHM",
                           country_code="SLV", currency_code="EUR",
                           style_number="STY-200")
    _make_shipment(pc_tenant, over["po"], "SHP-100", 1060)
    s = _make_shipment(pc_tenant, short["po"], "SHP-200", 1000)
    _make_docket(pc_tenant, s, 990)
    result = PaperworkComparisonService.compare_tenant(pc_tenant)
    assert result["count"] == 2
    assert result["summary"]["over_tolerance_count"] == 1
    assert result["summary"]["cannot_cover_count"] == 1


def test_compare_tenant_sorted_by_variance_desc(pc_tenant):
    from apps.logistics.services.paperwork_comparison import PaperworkComparisonService
    c1 = _seed_po_chain(pc_tenant, po_number="PO-100", buyer_code="BHM",
                        country_code="BGD", currency_code="USD", style_number="STY-100")
    c2 = _seed_po_chain(pc_tenant, po_number="PO-200", buyer_code="CHM",
                        country_code="SLV", currency_code="EUR", style_number="STY-200")
    _make_shipment(pc_tenant, c1["po"], "SHP-100", 1050)
    _make_shipment(pc_tenant, c2["po"], "SHP-200", 1020)
    result = PaperworkComparisonService.compare_tenant(pc_tenant)
    pcts = [r["quantity_variance_pct"] for r in result["results"]]
    assert pcts == sorted(pcts, reverse=True)


# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------

def test_endpoint_requires_auth(api_client, pc_tenant):
    resp = api_client.get("/api/v1/logistics/shipments/paperwork_comparison/")
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


def test_endpoint_requires_logistics_view(pc_nolog_client):
    resp = pc_nolog_client.get("/api/v1/logistics/shipments/paperwork_comparison/")
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_endpoint_returns_comparison(pc_editor_client, pc_tenant):
    chain = _seed_po_chain(pc_tenant)
    _make_shipment(pc_tenant, chain["po"], "SHP-100", 1051)
    resp = pc_editor_client.get("/api/v1/logistics/shipments/paperwork_comparison/")
    assert resp.status_code == status.HTTP_200_OK
    body = resp.json()
    assert body["count"] == 1
    assert "summary" in body
    row = body["results"][0]
    assert row["po_number"] == "PO-100"
    assert row["over_tolerance"] is True
    assert row["shipped_quantity"] == 1051.0


def test_endpoint_tenant_scoped(pc_tenant2_client, pc_tenant):
    chain = _seed_po_chain(pc_tenant)
    _make_shipment(pc_tenant, chain["po"], "SHP-100", 1051)
    resp = pc_tenant2_client.get("/api/v1/logistics/shipments/paperwork_comparison/")
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["count"] == 0
