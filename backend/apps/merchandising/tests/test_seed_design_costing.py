"""
TDD tests for the ``seed_design_costing`` management command.

Verifies that 5 demo DesignCosting records are created, each linked to an
existing design register style, populated with cost lines across standard
categories and exercising the price-ladder fields.
"""
from decimal import Decimal

import pytest
from django.core.management import call_command

from apps.merchandising.models import DesignCosting
from apps.setup.models import Buyer
from apps.tenants.models import Tenant


@pytest.fixture
def tenant(db):
    return Tenant.objects.create(
        name="Seed Costing Co", slug="seed-costing",
        schema_name="tenant_seedcosting", status="active",
    )


@pytest.fixture
def buyer(tenant):
    return Buyer.objects.create(
        tenant=tenant, name="Seed Buyer", code="SB1",
    )


@pytest.fixture
def styles(tenant, buyer):
    from apps.merchandising.models import Style

    names = [
        "Relaxed Jogger",
        "Classic Crew Neck Tee",
        "Performance Polo Shirt",
        "Tech Windbreaker",
        "Striped Long Sleeve Tee",
    ]
    created = []
    for i, name in enumerate(names, start=1):
        style = Style.objects.create(
            tenant=tenant,
            style_number=f"REG-100{i}",
            name=name,
            buyer=buyer,
            status="active",
        )
        created.append(style)
    return created


def _run(tenant):
    call_command("seed_design_costing", tenant=tenant.slug, verbosity=0)


def test_creates_five_design_costings(tenant, styles):
    _run(tenant)
    count = DesignCosting.objects.filter(tenant=tenant).count()
    assert count >= 5


def test_each_costing_has_lines(tenant, styles):
    _run(tenant)
    for dc in DesignCosting.objects.filter(tenant=tenant):
        assert dc.lines.count() >= 3


def test_costing_total_matches_line_sum(tenant, styles):
    _run(tenant)
    for dc in DesignCosting.objects.filter(tenant=tenant):
        line_total = sum((line.line_total for line in dc.lines.all()), Decimal("0"))
        assert dc.total_cost == line_total.quantize(Decimal("0.01"))


def test_costings_connected_to_design_styles(tenant, styles):
    _run(tenant)
    linked = DesignCosting.objects.filter(
        tenant=tenant, style__style_number__in=[s.style_number for s in styles]
    ).count()
    assert linked >= 5


def test_ladder_fields_populated_on_approved(tenant, styles):
    _run(tenant)
    approved = DesignCosting.objects.filter(tenant=tenant, status="approved")
    assert approved.count() >= 1
    for dc in approved:
        assert dc.selling_price is not None and dc.selling_price > 0
        assert dc.customer_discount_pct > 0
        assert dc.origin_overhead_pct > 0
        assert dc.exchange_rate is not None


def test_discount_computed_from_selling_price(tenant, styles):
    _run(tenant)
    for dc in DesignCosting.objects.filter(tenant=tenant):
        if not dc.selling_price:
            continue
        expected = (
            dc.selling_price * dc.customer_discount_pct / Decimal("100")
        ).quantize(Decimal("0.01"))
        assert dc.discount_amount == expected


def test_only_one_live_per_style(tenant, styles):
    _run(tenant)
    for style in styles:
        live = DesignCosting.objects.filter(
            tenant=tenant, style=style, is_live=True
        ).count()
        assert live <= 1


def test_re_run_is_idempotent(tenant, styles):
    _run(tenant)
    first = DesignCosting.objects.filter(tenant=tenant).count()
    _run(tenant)
    second = DesignCosting.objects.filter(tenant=tenant).count()
    assert first == second