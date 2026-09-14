"""
Tests for the per-piece price ladder on DesignCosting (RQ-013 / reference
"Cost Report — Live/Delivered").

The reference per-piece design cost exposes a price ladder: customer discount %,
origin (BD/VN/CN) overhead %, UK overhead % and a USD→GBP exchange rate derive
Base Cost → Selling Price → Margin over the per-piece total cost. This suite
proves the ladder properties on the model and their persistence/validation via
the API (RED first, then GREEN with the ladder fields).
"""
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.merchandising.models import DesignCosting, Style
from apps.setup.models import Buyer, Country
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


@pytest.fixture
def tenant():
    return Tenant.objects.create(
        name="DC Ladder Co", slug="dc-ladder",
        schema_name="tenant_dc_ladder", status="active"
    )


@pytest.fixture
def role(tenant):
    role = Role.objects.create(tenant=tenant, name="DesignAdmin", is_system=True)
    for mod in ["setup", "merchandising"]:
        for act in ["view", "create", "edit", "delete"]:
            perm, _ = Permission.objects.get_or_create(
                module=mod, action=act,
                defaults={"description": f"{mod}:{act}"}
            )
            RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def user(tenant, role):
    user = User.objects.create_user(
        username="dclad", email="dclad@test.com",
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
def seed(tenant, user):
    country = Country.objects.create(tenant=tenant, name="DC Ladder Country", code="DCL")
    buyer = Buyer.objects.create(tenant=tenant, name="DC Ladder Buyer", code="DCL01", country=country)
    style = Style.objects.create(tenant=tenant, style_number="STY-DCL", name="DC Ladder Style", buyer=buyer, created_by=user)
    return {"tenant": tenant, "user": user, "style": style}


def _costing(seed, **kwargs):
    values = dict(
        fabric_cost=Decimal("10.00"), trim_cost=Decimal("2.50"),
        cm_cost=Decimal("5.00"), overhead_cost=Decimal("1.25"),
        selling_price=Decimal("25.00"),
        customer_discount_pct=Decimal("2.00"),
        origin_overhead_pct=Decimal("4.00"),
        uk_overhead_pct=Decimal("16.00"),
        exchange_rate=Decimal("1.360000"),
    )
    values.update(kwargs)
    return DesignCosting.objects.create(
        tenant=seed["tenant"], style=seed["style"], version=1,
        created_by=seed["user"], **values
    )


@pytest.mark.django_db
class TestDesignCostingLadderModel:
    def test_defaults(self, tenant, seed):
        dc = DesignCosting.objects.create(
            tenant=tenant, style=seed["style"], version=1,
            created_by=seed["user"],
        )
        assert dc.customer_discount_pct == Decimal("0.00")
        assert dc.origin_overhead_pct == Decimal("0.00")
        assert dc.uk_overhead_pct == Decimal("0.00")
        assert dc.exchange_rate is None
        assert dc.selling_price is None

    def test_discount_amount_is_percent_of_selling(self, seed):
        dc = _costing(seed)
        assert dc.discount_amount == Decimal("0.50")

    def test_overhead_amount_sums_origin_and_uk_on_total(self, seed):
        dc = _costing(seed)
        assert dc.overhead_amount == Decimal("3.75")

    def test_base_cost_is_total_plus_discount_plus_overheads(self, seed):
        dc = _costing(seed)
        assert dc.base_cost == Decimal("23.00")

    def test_margin_amount_is_selling_minus_base(self, seed):
        dc = _costing(seed)
        assert dc.margin_amount == Decimal("2.00")

    def test_margin_percent_is_on_selling_when_ladder_used(self, seed):
        dc = _costing(seed)
        assert dc.margin_percent == 8.0

    def test_legacy_margin_percent_when_no_selling_price(self, seed):
        dc = DesignCosting.objects.create(
            tenant=seed["tenant"], style=seed["style"], version=1,
            created_by=seed["user"], fabric_cost=Decimal("10.00"),
            trim_cost=Decimal("2.50"), cm_cost=Decimal("5.00"),
            overhead_cost=Decimal("1.25"), target_price=Decimal("25.00"),
        )
        assert dc.margin_percent == round(float((25 - 18.75) / 18.75 * 100), 2)

    def test_ladder_is_none_guarded_without_selling_price(self, seed):
        dc = DesignCosting.objects.create(
            tenant=seed["tenant"], style=seed["style"], version=1,
            created_by=seed["user"], fabric_cost=Decimal("10.00"),
            trim_cost=Decimal("2.50"), cm_cost=Decimal("5.00"),
            overhead_cost=Decimal("1.25"),
        )
        assert dc.discount_amount is None
        assert dc.overhead_amount == Decimal("0.00")
        assert dc.base_cost is None
        assert dc.margin_amount is None

    def test_landed_cost_converts_total_at_exchange_rate(self, seed):
        dc = _costing(seed)
        assert dc.landed_cost == Decimal("25.50")

    def test_landed_cost_none_without_rate(self, seed):
        dc = _costing(seed, exchange_rate=None)
        assert dc.landed_cost is None


@pytest.mark.django_db
class TestDesignCostingLadderAPI:
    def test_create_persists_ladder_fields(self, client, seed):
        resp = client.post("/api/v1/merchandising/design-costings/", {
            "style": str(seed["style"].id),
            "version": 1,
            "fabric_cost": "10.00", "trim_cost": "2.50",
            "cm_cost": "5.00", "overhead_cost": "1.25",
            "selling_price": "25.00",
            "customer_discount_pct": "2.00",
            "origin_overhead_pct": "4.00",
            "uk_overhead_pct": "16.00",
            "exchange_rate": "1.360000",
        }, format="json")
        assert resp.status_code == 201, resp.content
        data = resp.json()
        assert data["selling_price"] == "25.00"
        assert data["customer_discount_pct"] == "2.00"
        assert data["origin_overhead_pct"] == "4.00"
        assert data["uk_overhead_pct"] == "16.00"
        assert data["exchange_rate"] == "1.360000"
        assert data["base_cost"] == "23.00"
        assert data["margin_amount"] == "2.00"
        assert data["margin_percent"] == 8.0
        assert data["landed_cost"] == "25.50"

    def test_patch_updates_ladder_and_recomputes(self, client, seed):
        dc = _costing(seed)
        resp = client.patch(f"/api/v1/merchandising/design-costings/{dc.id}/", {
            "selling_price": "30.00", "uk_overhead_pct": "0.00",
        }, format="json")
        assert resp.status_code == 200, resp.content
        data = resp.json()
        assert data["selling_price"] == "30.00"
        assert data["uk_overhead_pct"] == "0.00"
        assert data["base_cost"] == "20.10"
        assert data["margin_amount"] == "9.90"

    def test_rejects_negative_discount(self, client, seed):
        resp = client.post("/api/v1/merchandising/design-costings/", {
            "style": str(seed["style"].id), "version": 1,
            "customer_discount_pct": "-1.00",
        }, format="json")
        assert resp.status_code == 400

    def test_rejects_percent_over_100(self, client, seed):
        resp = client.post("/api/v1/merchandising/design-costings/", {
            "style": str(seed["style"].id), "version": 1,
            "uk_overhead_pct": "150.00",
        }, format="json")
        assert resp.status_code == 400

    def test_rejects_non_positive_selling_price(self, client, seed):
        resp = client.post("/api/v1/merchandising/design-costings/", {
            "style": str(seed["style"].id), "version": 1,
            "selling_price": "0.00",
        }, format="json")
        assert resp.status_code == 400

    def test_rejects_non_positive_exchange_rate(self, client, seed):
        resp = client.post("/api/v1/merchandising/design-costings/", {
            "style": str(seed["style"].id), "version": 1,
            "exchange_rate": "0.000000",
        }, format="json")
        assert resp.status_code == 400