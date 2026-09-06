"""
Tests for B10: Central Tolerance Engine (RQ-016 extension, GC-005 / GC-030).

The tolerance engine classifies fabric received vs ordered quantities against
tolerance bands (Primark/Penney's 2%, Other 5%, Fur 2%) and returns structured
results for surfacing over-tolerance flags on reconciliation.

GC Manual 17.2: over shipment > 5% triggers debit for trimming;
under shipment < 5% triggers debit for trimming; shortage > 20 units
triggers debit on delivery.
"""
from decimal import Decimal

import pytest

from apps.fabric.models import FabricTolerance
from apps.fabric.services.tolerance_engine import classify


@pytest.fixture
def te_tenant(db):
    from apps.tenants.models import Tenant
    return Tenant.objects.create(
        name="TE Test Co", slug="te-test",
        schema_name="tenant_te", status="active",
    )


@pytest.fixture
def primark_bands(te_tenant):
    return [
        FabricTolerance.objects.create(
            tenant=te_tenant, customer_type="primark",
            qty_from="0.01", qty_to="2999", tolerance_pct="5.00",
        ),
        FabricTolerance.objects.create(
            tenant=te_tenant, customer_type="primark",
            qty_from="3001", qty_to="4999", tolerance_pct="3.00",
        ),
        FabricTolerance.objects.create(
            tenant=te_tenant, customer_type="primark",
            qty_from="5000", qty_to=None, tolerance_pct="2.00",
        ),
    ]


@pytest.fixture
def other_bands(te_tenant):
    return [
        FabricTolerance.objects.create(
            tenant=te_tenant, customer_type="other",
            qty_from="0.01", qty_to="4999", tolerance_pct="5.00",
        ),
        FabricTolerance.objects.create(
            tenant=te_tenant, customer_type="other",
            qty_from="5000", qty_to="9999", tolerance_pct="3.00",
        ),
        FabricTolerance.objects.create(
            tenant=te_tenant, customer_type="other",
            qty_from="10000", qty_to=None, tolerance_pct="2.00",
        ),
    ]


@pytest.fixture
def fur_band(te_tenant):
    return FabricTolerance.objects.create(
        tenant=te_tenant, customer_type="fur",
        qty_from="0.01", qty_to=None, tolerance_pct="2.00",
    )


@pytest.fixture
def all_bands(primark_bands, other_bands, fur_band):
    return {"primark": primark_bands, "other": other_bands, "fur": fur_band}


class TestToleranceEngineClassify:
    """B10: classify() — over / under / within tolerance."""

    def test_within_tolerance_other_tier(self, all_bands):
        """Other tier, 5% tolerance: 3000m ordered, 3100m received = +3.33% — within."""
        result = classify("other", 3000, 3100)
        assert result["status"] == "within"
        assert result["over_tolerance"] is False
        assert result["tolerance_pct"] == Decimal("5.00")
        assert result["tolerance_meters"] == Decimal("150.00")
        assert result["allowed_upper"] == Decimal("3150.00")
        assert result["allowed_lower"] == Decimal("2850.00")
        assert result["variance_meters"] == Decimal("100.00")
        assert result["variance_pct"] == Decimal("3.33")

    def test_over_tolerance_other_tier(self, all_bands):
        """Other tier, 5% tolerance: 3000m ordered, 3200m received = +6.67% — over."""
        result = classify("other", 3000, 3200)
        assert result["status"] == "over"
        assert result["over_tolerance"] is True
        assert result["tolerance_pct"] == Decimal("5.00")
        assert result["variance_meters"] == Decimal("200.00")
        assert result["variance_pct"] == Decimal("6.67")

    def test_under_tolerance_other_tier(self, all_bands):
        """Other tier, 5% tolerance: 3000m ordered, 2800m received = -6.67% — under."""
        result = classify("other", 3000, 2800)
        assert result["status"] == "under"
        assert result["over_tolerance"] is False
        assert result["tolerance_pct"] == Decimal("5.00")
        assert result["variance_meters"] == Decimal("-200.00")
        assert result["variance_pct"] == Decimal("-6.67")

    def test_over_tolerance_primark_tier(self, all_bands):
        """Primark tier, 2% tolerance (5000+ band): 6000m ordered, 6150m received = +2.5% — over."""
        result = classify("primark", 6000, 6150)
        assert result["status"] == "over"
        assert result["over_tolerance"] is True
        assert result["tolerance_pct"] == Decimal("2.00")
        assert result["tolerance_meters"] == Decimal("120.00")
        assert result["allowed_upper"] == Decimal("6120.00")
        assert result["variance_meters"] == Decimal("150.00")

    def test_within_tolerance_primark_tier(self, all_bands):
        """Primark tier, 2% tolerance (5000+ band): 6000m ordered, 6100m received = +1.67% — within."""
        result = classify("primark", 6000, 6100)
        assert result["status"] == "within"
        assert result["over_tolerance"] is False
        assert result["tolerance_pct"] == Decimal("2.00")

    def test_over_tolerance_fur_tier(self, all_bands):
        """Fur tier, 2% flat: 5000m ordered, 5120m received = +2.4% — over."""
        result = classify("fur", 5000, 5120)
        assert result["status"] == "over"
        assert result["over_tolerance"] is True
        assert result["tolerance_pct"] == Decimal("2.00")
        assert result["tolerance_meters"] == Decimal("100.00")
        assert result["allowed_upper"] == Decimal("5100.00")

    def test_within_boundary_primark(self, all_bands):
        """Primark 2%: 6000m ordered, 6120m received = exactly at upper boundary — within."""
        result = classify("primark", 6000, 6120)
        assert result["status"] == "within"
        assert result["over_tolerance"] is False

    def test_just_over_boundary_primark(self, all_bands):
        """Primark 2%: 6000m ordered, 6120.01m received = just over upper boundary — over."""
        result = classify("primark", 6000, 6120.01)
        assert result["status"] == "over"
        assert result["over_tolerance"] is True

    def test_exact_match(self, all_bands):
        """Exact match: received == ordered — within."""
        result = classify("other", 3000, 3000)
        assert result["status"] == "within"
        assert result["over_tolerance"] is False
        assert result["variance_meters"] == Decimal("0.00")
        assert result["variance_pct"] == Decimal("0.00")

    def test_primark_small_qty_5_percent(self, all_bands):
        """Primark small qty band (0-2999): 2000m ordered, 2110m received = +5.5% — over."""
        result = classify("primark", 2000, 2110)
        assert result["status"] == "over"
        assert result["over_tolerance"] is True
        assert result["tolerance_pct"] == Decimal("5.00")

    def test_other_large_qty_3_percent(self, all_bands):
        """Other large qty band (5000-9999): 6000m ordered, 6200m received = +3.33% — over."""
        result = classify("other", 6000, 6200)
        assert result["status"] == "over"
        assert result["over_tolerance"] is True
        assert result["tolerance_pct"] == Decimal("3.00")

    def test_fallback_default_other_when_no_band(self, all_bands):
        """No band for unknown tier — falls back to 'other' 5% default."""
        result = classify("unknown_tier", 3000, 3200)
        assert result["status"] == "over"
        assert result["over_tolerance"] is True
        assert result["tolerance_pct"] == Decimal("5.00")

    def test_zero_ordered_returns_within(self, all_bands):
        """Zero ordered: treated as within (no meaningful comparison)."""
        result = classify("other", 0, 100)
        assert result["status"] == "within"
        assert result["over_tolerance"] is False

    def test_fabric_utilization_over_tolerance_flag(self, all_bands):
        """Over tolerance flag surfaced on reconciliation — the B10 deliverable."""
        result = classify("other", 3000, 3200)
        assert result["over_tolerance"] is True
        assert result["status"] == "over"
        assert result["variance_meters"] == Decimal("200.00")
        assert result["variance_pct"] == Decimal("6.67")
