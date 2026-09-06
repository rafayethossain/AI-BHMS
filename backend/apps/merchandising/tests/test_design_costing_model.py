"""
Tests for the Style-level DesignCosting model (RQ-013 / G-12).

DesignCosting is the single-piece design costing attached to a Style (not a
PurchaseOrder). It is the source of truth from which a PO costing is prepared
(see `DesignCostingViewSet.prepare_po_costing`). Mirrors the Costing model's
cost categories / totals computation but is keyed to the Style.
"""
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError

from apps.merchandising.models import DesignCosting, DesignCostingLine, Style
from apps.setup.models import Country
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


@pytest.fixture
def dc_tenant(db):
    return Tenant.objects.create(
        name="Design Costing Co", slug="design-costing",
        schema_name="tenant_design_costing", status="active"
    )


@pytest.fixture
def dc_role(db, dc_tenant):
    role = Role.objects.create(tenant=dc_tenant, name="DesignAdmin", is_system=True)
    for mod in ["setup", "merchandising"]:
        for act in ["view", "create", "edit", "delete"]:
            perm, _ = Permission.objects.get_or_create(
                module=mod, action=act,
                defaults={"description": f"{mod}:{act}"}
            )
            RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def dc_user(db, dc_tenant, dc_role):
    user = User.objects.create_user(
        username="dcuser", email="dc@test.com",
        password="testpass123!@#", tenant=dc_tenant, status="active",
    )
    UserRole.objects.create(user=user, role=dc_role)
    return user


@pytest.fixture
def dc_style(db, dc_tenant, dc_user):
    country = Country.objects.create(tenant=dc_tenant, name="DC Country", code="DCC")
    buyer = _buyer(dc_tenant, country, "DC Buyer", "DC01")
    return Style.objects.create(
        tenant=dc_tenant, style_number="STY-DC", name="DC Style",
        buyer=buyer, created_by=dc_user,
    )


def _buyer(tenant, country, name, code):
    from apps.setup.models import Buyer
    return Buyer.objects.create(tenant=tenant, name=name, code=code, country=country)


@pytest.mark.django_db
class TestDesignCostingModel:
    def test_defaults(self, dc_tenant, dc_style, dc_user):
        dc = DesignCosting.objects.create(
            tenant=dc_tenant, style=dc_style, version=1, created_by=dc_user,
        )
        assert dc.status == "draft"
        assert dc.version == 1
        assert dc.total_cost == Decimal("0.00")
        assert dc.fabric_cost == Decimal("0")
        assert dc.is_live is True

    def test_total_cost_sums_categories(self, dc_tenant, dc_style, dc_user):
        dc = DesignCosting.objects.create(
            tenant=dc_tenant, style=dc_style, version=1, created_by=dc_user,
            fabric_cost=Decimal("10.00"), trim_cost=Decimal("2.50"),
            cm_cost=Decimal("5.00"), overhead_cost=Decimal("1.25"),
        )
        assert dc.total_cost == Decimal("18.75")

    def test_duplicate_version_rejected(self, dc_tenant, dc_style, dc_user):
        DesignCosting.objects.create(
            tenant=dc_tenant, style=dc_style, version=1, created_by=dc_user,
        )
        with pytest.raises(IntegrityError):
            DesignCosting.objects.create(
                tenant=dc_tenant, style=dc_style, version=1, created_by=dc_user,
            )

    def test_distinct_versions_coexist(self, dc_tenant, dc_style, dc_user):
        a = DesignCosting.objects.create(
            tenant=dc_tenant, style=dc_style, version=1, created_by=dc_user,
        )
        a.is_live = False
        a.save(update_fields=["is_live"])
        dc_b = DesignCosting.objects.create(
            tenant=dc_tenant, style=dc_style, version=2, created_by=dc_user,
        )
        assert dc_b.version == 2
        assert dc_b.is_live is True

    def test_ordering_newest_first(self, dc_tenant, dc_style, dc_user):
        a = DesignCosting.objects.create(
            tenant=dc_tenant, style=dc_style, version=1, created_by=dc_user,
        )
        a.is_live = False
        a.save(update_fields=["is_live"])
        DesignCosting.objects.create(
            tenant=dc_tenant, style=dc_style, version=2, created_by=dc_user,
        )
        latest = DesignCosting.objects.filter(tenant=dc_tenant, style=dc_style).first()
        assert latest.version == 2

    def test_tenant_isolation(self, dc_tenant, dc_style, dc_user, db):
        other = Tenant.objects.create(
            name="Other Co", slug="other-dc",
            schema_name="tenant_other_dc", status="active",
        )
        DesignCosting.objects.filter(tenant=dc_tenant).delete()
        DesignCosting.objects.create(
            tenant=dc_tenant, style=dc_style, version=1, created_by=dc_user,
        )
        assert DesignCosting.objects.filter(tenant=other).count() == 0

    def test_line_total_and_categories(self, dc_tenant, dc_style, dc_user):
        dc = DesignCosting.objects.create(
            tenant=dc_tenant, style=dc_style, version=1, created_by=dc_user,
        )
        line = DesignCostingLine.objects.create(
            tenant=dc_tenant, costing=dc, category="fabric",
            description="Cotton", unit_price=Decimal("10.0000"),
            consumption=Decimal("2.0000"),
        )
        assert line.line_total == Decimal("20.00")
