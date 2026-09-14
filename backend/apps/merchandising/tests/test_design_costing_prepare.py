"""
Tests for `DesignCostingViewSet.prepare_po_costing` (RQ-013 / G-12).

The approved Style-level design costing is the source of truth from which a
PurchaseOrder `Costing` is prepared (forward dot: design → PO costing). This
suite proves the action copies cost + lines, guards tenant + status, and
rejects duplicate preparation.
"""
from datetime import date
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.merchandising.models import (
    Costing,
    CostingLine,
    DesignCosting,
    DesignCostingLine,
    FileOpening,
    PurchaseOrder,
    Style,
    StyleVersion,
)
from apps.setup.models import Buyer, Country, Currency, Factory
from apps.tenants.models import Tenant
from apps.users.models import Role, RolePermission, UserRole

User = get_user_model()


@pytest.fixture
def tenant(db):
    return Tenant.objects.create(
        name="DC Prep Co", slug="dc-prep", schema_name="tenant_dc_prep", status="active"
    )


@pytest.fixture
def role(tenant):
    role = Role.objects.create(tenant=tenant, name="MerchAdmin", is_system=True)
    for mod in ["setup", "merchandising"]:
        for act in ["view", "create", "edit", "delete"]:
            from apps.users.models import Permission
            perm, _ = Permission.objects.get_or_create(
                module=mod, action=act, defaults={"description": f"{mod}:{act}"}
            )
            RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def user(tenant, role):
    user = User.objects.create_user(
        username="dcprep", email="dcprep@test.com",
        password="testpass123!@#", tenant=tenant, status="active",
    )
    UserRole.objects.create(user=user, role=role)
    return user


@pytest.fixture
def client(tenant, user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.fixture
def seed(db, tenant, user):
    country = Country.objects.create(tenant=tenant, name="DC Prep Country", code="DCP")
    buyer = Buyer.objects.create(tenant=tenant, name="DC Prep Buyer", code="DCP01", country=country)
    factory = Factory.objects.create(tenant=tenant, name="DC Prep Factory", code="DCPF01", country=country)
    currency = Currency.objects.create(tenant=tenant, name="USD", code="USD", symbol="$")
    style = Style.objects.create(
        tenant=tenant, style_number="STY-DCP", name="DC Prep Style",
        buyer=buyer, created_by=user,
    )
    sv = StyleVersion.objects.create(
        tenant=tenant, style=style, version_number=1, status="active", created_by=user,
    )
    return {
        "tenant": tenant, "user": user, "country": country, "buyer": buyer,
        "factory": factory, "currency": currency, "style": style, "style_version": sv,
    }


def _approved_design(seed, lines=True):
    dc = DesignCosting.objects.create(
        tenant=seed["tenant"], style=seed["style"], version=1, status="approved",
        sheet_type="bd", fabric_cost=Decimal("10.00"), trim_cost=Decimal("2.50"),
        cm_cost=Decimal("5.00"), overhead_cost=Decimal("1.25"),
        created_by=seed["user"],
    )
    if lines:
        DesignCostingLine.objects.create(
            tenant=seed["tenant"], costing=dc, category="fabric",
            description="Cotton", unit_price=Decimal("5.0000"),
            consumption=Decimal("2.0000"), sort_order=0,
        )
    return dc


def _approved_design_with_ladder(seed):
    return DesignCosting.objects.create(
        tenant=seed["tenant"], style=seed["style"], version=1, status="approved",
        sheet_type="bd", fabric_cost=Decimal("10.00"), trim_cost=Decimal("2.50"),
        cm_cost=Decimal("5.00"), overhead_cost=Decimal("1.25"),
        selling_price=Decimal("25.00"),
        customer_discount_pct=Decimal("2.00"),
        origin_overhead_pct=Decimal("4.00"),
        uk_overhead_pct=Decimal("16.00"),
        exchange_rate=Decimal("1.360000"),
        created_by=seed["user"],
    )


def _make_po(seed, po_number="PO-DCP-1"):
    fo = FileOpening.objects.create(
        tenant=seed["tenant"], file_number=f"FO-{po_number}", style=seed["style"],
        style_version=seed["style_version"], buyer=seed["buyer"],
        factory=seed["factory"], file_date=date(2026, 1, 1), created_by=seed["user"],
    )
    return PurchaseOrder.objects.create(
        tenant=seed["tenant"], po_number=po_number, file_opening=fo,
        buyer=seed["buyer"], factory=seed["factory"], po_date=date(2026, 1, 15),
        delivery_date=date(2026, 6, 1), quantity=1000, unit_price=Decimal("10.00"),
        total_value=Decimal("10000.00"), currency=seed["currency"],
    )


def _post(client, dc_id, po_id=None):
    payload = {}
    if po_id is not None:
        payload["purchase_order_id"] = str(po_id)
    return client.post(
        f"/api/v1/merchandising/design-costings/{dc_id}/prepare_po_costing/",
        payload, format="json",
    )


@pytest.mark.django_db
class TestPreparePoCosting:
    def test_requires_purchase_order_id(self, client, seed):
        dc = _approved_design(seed, lines=False)
        resp = _post(client, dc.id)
        assert resp.status_code == 400

    def test_requires_approved_design(self, client, seed):
        dc = DesignCosting.objects.create(
            tenant=seed["tenant"], style=seed["style"], version=1,
            status="draft", created_by=seed["user"],
        )
        po = _make_po(seed)
        resp = _post(client, dc.id, po.id)
        assert resp.status_code == 400

    def test_creates_po_costing(self, client, seed):
        dc = _approved_design(seed)
        po = _make_po(seed)
        resp = _post(client, dc.id, po.id)
        assert resp.status_code == 201, resp.content
        costing = Costing.objects.get(purchase_order=po, tenant=seed["tenant"])
        assert costing.total_cost == Decimal("18.75")
        assert costing.fabric_cost == Decimal("10.00")
        assert costing.is_live is True
        assert costing.sheet_type == "bd"
        assert costing.created_by == seed["user"]
        assert resp.json()["id"] == str(costing.id)

    def test_copies_cost_lines(self, client, seed):
        dc = _approved_design(seed, lines=True)
        po = _make_po(seed)
        _post(client, dc.id, po.id)
        costing = Costing.objects.get(purchase_order=po, tenant=seed["tenant"])
        clines = CostingLine.objects.filter(costing=costing)
        assert clines.count() == 1
        line = clines.first()
        assert line.category == "fabric"
        assert line.description == "Cotton"
        assert line.line_total == Decimal("10.00")

    def test_rejects_duplicate_po_costing(self, client, seed):
        dc = _approved_design(seed, lines=False)
        po = _make_po(seed)
        assert _post(client, dc.id, po.id).status_code == 201
        resp = _post(client, dc.id, po.id)
        assert resp.status_code == 400

    def test_scoped_to_tenant_po(self, client, seed):
        other = Tenant.objects.create(
            name="Other", slug="other-dcp", schema_name="tenant_other_dcp", status="active"
        )
        dc = _approved_design(seed, lines=False)
        other_po = PurchaseOrder.objects.create(
            tenant=other, po_number="PO-OTHER", buyer=seed["buyer"], factory=seed["factory"],
            po_date=date(2026, 1, 15), delivery_date=date(2026, 6, 1), quantity=500,
            unit_price=Decimal("10.00"), total_value=Decimal("5000.00"),
            currency=seed["currency"],
        )
        resp = _post(client, dc.id, other_po.id)
        assert resp.status_code in (400, 404)

    def test_copies_ladder_fields_onto_po_costing(self, client, seed):
        dc = _approved_design_with_ladder(seed)
        po = _make_po(seed)
        resp = _post(client, dc.id, po.id)
        assert resp.status_code == 201, resp.content
        costing = Costing.objects.get(purchase_order=po, tenant=seed["tenant"])
        assert costing.selling_price == Decimal("25.00")
        assert costing.customer_discount_pct == Decimal("2.00")
        assert costing.origin_overhead_pct == Decimal("4.00")
        assert costing.uk_overhead_pct == Decimal("16.00")
        assert costing.exchange_rate == Decimal("1.360000")
        assert costing.landed_cost == Decimal("25.50")

    def test_computes_po_totals_from_quantity(self, client, seed):
        dc = _approved_design_with_ladder(seed)
        po = _make_po(seed)  # quantity 1000
        resp = _post(client, dc.id, po.id)
        assert resp.status_code == 201, resp.content
        costing = Costing.objects.get(purchase_order=po, tenant=seed["tenant"])
        assert costing.po_quantity == 1000
        assert costing.po_total_cost == Decimal("18750.00")
        assert costing.po_base_cost == Decimal("23000.00")
        assert costing.po_margin_amount == Decimal("2000.00")

    def test_po_totals_without_ladder_only_fill_total(self, client, seed):
        dc = _approved_design(seed, lines=False)
        po = _make_po(seed)
        resp = _post(client, dc.id, po.id)
        assert resp.status_code == 201, resp.content
        costing = Costing.objects.get(purchase_order=po, tenant=seed["tenant"])
        assert costing.po_quantity == 1000
        assert costing.po_total_cost == Decimal("18750.00")
        assert costing.po_base_cost is None
        assert costing.po_margin_amount is None

    def test_prepared_response_exposes_ladder_and_po_totals(self, client, seed):
        dc = _approved_design_with_ladder(seed)
        po = _make_po(seed)
        resp = _post(client, dc.id, po.id)
        assert resp.status_code == 201, resp.content
        data = resp.json()
        assert data["selling_price"] == "25.00"
        assert data["base_cost"] == "23.00"
        assert data["margin_amount"] == "2.00"
        assert data["po_quantity"] == 1000
        assert data["po_total_cost"] == "18750.00"
        assert data["po_base_cost"] == "23000.00"
        assert data["po_margin_amount"] == "2000.00"
