"""
Tests for RQ-016: Fabric Tolerance Tables (GC-005).
"""
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.fabric.models import FabricTolerance
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def ft_tenant(db):
    return Tenant.objects.create(
        name="FT Test Co", slug="ft-test",
        schema_name="tenant_ft", status="active",
    )


@pytest.fixture
def ft_role(db, ft_tenant):
    role = Role.objects.create(tenant=ft_tenant, name="FTMerch", is_system=True)
    for mod in ["fabric"]:
        for act in ["view", "create", "edit", "delete"]:
            perm, _ = Permission.objects.get_or_create(
                module=mod, action=act,
                defaults={"description": f"{mod}:{act}"}
            )
            RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def ft_viewer_role(db, ft_tenant):
    role = Role.objects.create(tenant=ft_tenant, name="FTViewer", is_system=True)
    perm, _ = Permission.objects.get_or_create(
        module="fabric", action="view",
        defaults={"description": "fabric:view"}
    )
    RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def ft_user(db, ft_tenant, ft_role):
    user = User.objects.create_user(
        username="ftuser", email="ft@test.com",
        password="testpass123!@#", tenant=ft_tenant, status="active",
        first_name="FT", last_name="User",
    )
    UserRole.objects.create(user=user, role=ft_role)
    return user


@pytest.fixture
def ft_viewer(db, ft_tenant, ft_viewer_role):
    user = User.objects.create_user(
        username="ftviewer", email="ftv@test.com",
        password="testpass123!@#", tenant=ft_tenant, status="active",
        first_name="FTV", last_name="Viewer",
    )
    UserRole.objects.create(user=user, role=ft_viewer_role)
    return user


@pytest.fixture
def ft_client(api_client, ft_user):
    api_client.force_authenticate(user=ft_user)
    return api_client


@pytest.fixture
def ft_viewer_client(api_client, ft_viewer):
    api_client.force_authenticate(user=ft_viewer)
    return api_client


@pytest.fixture
def primark_bands(ft_tenant):
    return [
        FabricTolerance.objects.create(
            tenant=ft_tenant, customer_type="primark",
            qty_from="0.01", qty_to="2999", tolerance_pct="5.00",
        ),
        FabricTolerance.objects.create(
            tenant=ft_tenant, customer_type="primark",
            qty_from="3001", qty_to="4999", tolerance_pct="3.00",
        ),
        FabricTolerance.objects.create(
            tenant=ft_tenant, customer_type="primark",
            qty_from="5000", qty_to=None, tolerance_pct="2.00",
        ),
    ]


@pytest.fixture
def other_bands(ft_tenant):
    return [
        FabricTolerance.objects.create(
            tenant=ft_tenant, customer_type="other",
            qty_from="0.01", qty_to="4999", tolerance_pct="5.00",
        ),
        FabricTolerance.objects.create(
            tenant=ft_tenant, customer_type="other",
            qty_from="5000", qty_to="9999", tolerance_pct="3.00",
        ),
        FabricTolerance.objects.create(
            tenant=ft_tenant, customer_type="other",
            qty_from="10000", qty_to=None, tolerance_pct="2.00",
        ),
    ]


@pytest.fixture
def fur_band(ft_tenant):
    return FabricTolerance.objects.create(
        tenant=ft_tenant, customer_type="fur",
        qty_from="0.01", qty_to=None, tolerance_pct="2.00",
    )


@pytest.fixture
def all_bands(primark_bands, other_bands, fur_band):
    return {"primark": primark_bands, "other": other_bands, "fur": fur_band}


class TestFabricToleranceModel:
    """RQ-016: FabricTolerance model fields + tolerance resolution."""

    def test_defaults(self, ft_tenant):
        ft = FabricTolerance.objects.create(
            tenant=ft_tenant, customer_type="primark",
            qty_from="0.01", qty_to="2999", tolerance_pct="5.00",
        )
        assert ft.customer_type == "primark"
        assert str(ft.qty_from) == "0.01"
        assert str(ft.qty_to) == "2999"
        assert str(ft.tolerance_pct) == "5.00"

    def test_open_ended_qty_to_is_null(self, ft_tenant):
        ft = FabricTolerance.objects.create(
            tenant=ft_tenant, customer_type="fur",
            qty_from="0.01", tolerance_pct="2.00",
        )
        assert ft.qty_to is None

    def test_str(self, ft_tenant):
        ft = FabricTolerance.objects.create(
            tenant=ft_tenant, customer_type="primark",
            qty_from="0.01", qty_to="2999", tolerance_pct="5.00",
        )
        assert str(ft) == "primark: 0.01-2999m +/-5.00%"

    def test_tolerance_meters(self, ft_tenant):
        ft = FabricTolerance.objects.create(
            tenant=ft_tenant, customer_type="primark",
            qty_from="0.01", qty_to="2999", tolerance_pct="5.00",
        )
        assert ft.tolerance_meters(1000) == Decimal("50.00")

    def test_tolerance_for_primark_2000_is_5_percent(self, all_bands):
        ft = FabricTolerance.tolerance_for("primark", 2000)
        assert ft is not None
        assert str(ft.tolerance_pct) == "5.00"

    def test_tolerance_for_primark_4000_is_3_percent(self, all_bands):
        ft = FabricTolerance.tolerance_for("primark", 4000)
        assert ft is not None
        assert str(ft.tolerance_pct) == "3.00"

    def test_tolerance_for_primark_6000_is_2_percent(self, all_bands):
        ft = FabricTolerance.tolerance_for("primark", 6000)
        assert ft is not None
        assert str(ft.tolerance_pct) == "2.00"

    def test_tolerance_for_other_2000_is_5_percent(self, all_bands):
        ft = FabricTolerance.tolerance_for("other", 2000)
        assert ft is not None
        assert str(ft.tolerance_pct) == "5.00"

    def test_tolerance_for_other_6000_is_3_percent(self, all_bands):
        ft = FabricTolerance.tolerance_for("other", 6000)
        assert ft is not None
        assert str(ft.tolerance_pct) == "3.00"

    def test_tolerance_for_other_12000_is_2_percent(self, all_bands):
        ft = FabricTolerance.tolerance_for("other", 12000)
        assert ft is not None
        assert str(ft.tolerance_pct) == "2.00"

    def test_tolerance_for_fur_is_flat_2_percent(self, all_bands):
        for qty in [500, 4500, 11000]:
            ft = FabricTolerance.tolerance_for("fur", qty)
            assert ft is not None
            assert str(ft.tolerance_pct) == "2.00"

    def test_tolerance_for_unknown_customer_type_returns_none(self, all_bands):
        assert FabricTolerance.tolerance_for("unknown", 2000) is None

    def test_tolerance_for_no_band_returns_none(self, all_bands):
        assert FabricTolerance.tolerance_for("primark", 3000) is None
        assert FabricTolerance.tolerance_for("primark", 3000.5) is None

    def test_tolerance_for_primark_5000_is_2_percent(self, all_bands):
        ft = FabricTolerance.tolerance_for("primark", 5000)
        assert ft is not None
        assert str(ft.tolerance_pct) == "2.00"

    def test_tolerance_for_other_10000_is_2_percent(self, all_bands):
        ft = FabricTolerance.tolerance_for("other", 10000)
        assert ft is not None
        assert str(ft.tolerance_pct) == "2.00"

    def test_tolerance_for_primark_decimal_quantity(self, all_bands):
        ft = FabricTolerance.tolerance_for("primark", 2500.75)
        assert ft is not None
        assert str(ft.tolerance_pct) == "5.00"

    def test_unique_together_blocks_duplicate_band(self, ft_tenant):
        FabricTolerance.objects.create(
            tenant=ft_tenant, customer_type="primark",
            qty_from="0.01", qty_to="2999", tolerance_pct="5.00",
        )
        from django.db import IntegrityError
        with pytest.raises(IntegrityError):
            FabricTolerance.objects.create(
                tenant=ft_tenant, customer_type="primark",
                qty_from="0.01", qty_to="2999", tolerance_pct="3.00",
            )


class TestFabricToleranceAPI:
    """RQ-016: FabricTolerance CRUD + tolerance resolution action."""

    def test_requires_auth(self, api_client, ft_tenant):
        resp = api_client.get("/api/v1/fabric/tolerances/")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_empty(self, ft_client):
        resp = ft_client.get("/api/v1/fabric/tolerances/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["results"] == []

    def test_list_returns_bands(self, ft_client, all_bands):
        resp = ft_client.get("/api/v1/fabric/tolerances/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 7

    def test_viewer_can_list(self, ft_viewer_client, all_bands):
        resp = ft_viewer_client.get("/api/v1/fabric/tolerances/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 7

    def test_viewer_cannot_create(self, ft_viewer_client):
        resp = ft_viewer_client.post("/api/v1/fabric/tolerances/", {
            "customer_type": "primark", "qty_from": "0.01",
            "qty_to": "2999", "tolerance_pct": "5.00",
        }, format="json")
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_editor_can_create(self, ft_client):
        resp = ft_client.post("/api/v1/fabric/tolerances/", {
            "customer_type": "primark", "qty_from": "0.01",
            "qty_to": "2999", "tolerance_pct": "5.00",
        }, format="json")
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["customer_type"] == "primark"
        assert resp.data["tolerance_pct"] == "5.00"

    def test_create_requires_valid_customer_type(self, ft_client):
        resp = ft_client.post("/api/v1/fabric/tolerances/", {
            "customer_type": "bogus", "qty_from": "0.01",
            "tolerance_pct": "5.00",
        }, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_filter_by_customer_type(self, ft_client, all_bands):
        resp = ft_client.get("/api/v1/fabric/tolerances/?customer_type=primark")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 3

    def test_editor_can_update(self, ft_client, primark_bands):
        band = primark_bands[0]
        resp = ft_client.patch(
            f"/api/v1/fabric/tolerances/{band.id}/",
            {"tolerance_pct": "4.50"}, format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["tolerance_pct"] == "4.50"

    def test_editor_can_delete(self, ft_client, primark_bands):
        band = primark_bands[0]
        resp = ft_client.delete(f"/api/v1/fabric/tolerances/{band.id}/")
        assert resp.status_code == status.HTTP_204_NO_CONTENT

    def test_tolerance_for_action_valid(self, ft_client, all_bands):
        resp = ft_client.get(
            "/api/v1/fabric/tolerances/tolerance_for/?customer_type=primark&quantity=2000"
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["tolerance_pct"] == "5.00"
        assert resp.data["tolerance_meters"] == "100.00"

    def test_tolerance_for_action_no_band(self, ft_client, all_bands):
        resp = ft_client.get(
            "/api/v1/fabric/tolerances/tolerance_for/?customer_type=primark&quantity=3000"
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["tolerance_pct"] is None
        assert resp.data["tolerance_meters"] is None

    def test_tolerance_for_action_missing_quantity(self, ft_client, all_bands):
        resp = ft_client.get(
            "/api/v1/fabric/tolerances/tolerance_for/?customer_type=primark"
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_tolerance_for_action_invalid_quantity(self, ft_client, all_bands):
        resp = ft_client.get(
            "/api/v1/fabric/tolerances/tolerance_for/?customer_type=primark&quantity=abc"
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_tolerance_for_action_invalid_customer_type(self, ft_client, all_bands):
        resp = ft_client.get(
            "/api/v1/fabric/tolerances/tolerance_for/?customer_type=bogus&quantity=2000"
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_tenant_scoped(self, ft_client, all_bands):
        other_tenant = Tenant.objects.create(
            name="Other Co", slug="other-co",
            schema_name="tenant_other", status="active",
        )
        FabricTolerance.objects.create(
            tenant=other_tenant, customer_type="primark",
            qty_from="0.01", qty_to="2999", tolerance_pct="9.00",
        )
        resp = ft_client.get("/api/v1/fabric/tolerances/")
        assert resp.data["count"] == 7
