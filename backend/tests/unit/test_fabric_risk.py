"""
Tests for RQ-018: Fabric Risk & Schedule (GC-007).
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.fabric.models import FabricCategory, FabricOrder, FabricSupplier
from apps.setup.models import RiskLevel
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def fr_tenant(db):
    return Tenant.objects.create(
        name="FR Test Co", slug="fr-test",
        schema_name="tenant_fr", status="active",
    )


@pytest.fixture
def risk_levels(fr_tenant):
    data = [
        ("none", "None", "#808080"),
        ("green", "Low Risk", "#00FF00"),
        ("amber", "Medium Risk", "#FFA500"),
        ("red", "High Risk", "#FF0000"),
    ]
    levels = {}
    for code, name, color in data:
        levels[code], _ = RiskLevel.objects.get_or_create(
            tenant=fr_tenant, code=code,
            defaults={"name": name, "color": color, "sort_order": 0},
        )
    return levels


def _make_role(db, tenant, name, perms=None):
    role = Role.objects.create(tenant=tenant, name=name, is_system=True)
    for mod, act in (perms or [("fabric", "view")]):
        perm, _ = Permission.objects.get_or_create(
            module=mod, action=act,
            defaults={"description": f"{mod}:{act}"}
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
def editor_role(db, fr_tenant):
    return _make_role(db, fr_tenant, "FabricMgr", [("fabric", "view"), ("fabric", "create"), ("fabric", "edit"), ("fabric", "delete")])


@pytest.fixture
def sales_role(db, fr_tenant):
    return _make_role(db, fr_tenant, "Sales", [("fabric", "view"), ("fabric", "edit")])


@pytest.fixture
def planning_role(db, fr_tenant):
    return _make_role(db, fr_tenant, "Planning", [("fabric", "view"), ("fabric", "edit")])


@pytest.fixture
def quality_role(db, fr_tenant):
    return _make_role(db, fr_tenant, "Quality", [("fabric", "view"), ("fabric", "edit")])


@pytest.fixture
def viewer_role(db, fr_tenant):
    return _make_role(db, fr_tenant, "Viewer", [("fabric", "view")])


@pytest.fixture
def fr_editor(db, fr_tenant, editor_role):
    return _make_user(db, fr_tenant, "freditor", editor_role)


@pytest.fixture
def fr_sales(db, fr_tenant, sales_role):
    return _make_user(db, fr_tenant, "frsales", sales_role)


@pytest.fixture
def fr_planning(db, fr_tenant, planning_role):
    return _make_user(db, fr_tenant, "frplanning", planning_role)


@pytest.fixture
def fr_quality(db, fr_tenant, quality_role):
    return _make_user(db, fr_tenant, "frquality", quality_role)


@pytest.fixture
def fr_viewer(db, fr_tenant, viewer_role):
    return _make_user(db, fr_tenant, "frviewer", viewer_role)


@pytest.fixture
def fr_nobody(db, fr_tenant):
    return _make_user(db, fr_tenant, "frnobody", None)


@pytest.fixture
def fr_client(api_client, fr_editor):
    api_client.force_authenticate(user=fr_editor)
    return api_client


@pytest.fixture
def fr_sales_client(api_client, fr_sales):
    api_client.force_authenticate(user=fr_sales)
    return api_client


@pytest.fixture
def fr_planning_client(api_client, fr_planning):
    api_client.force_authenticate(user=fr_planning)
    return api_client


@pytest.fixture
def fr_quality_client(api_client, fr_quality):
    api_client.force_authenticate(user=fr_quality)
    return api_client


@pytest.fixture
def fr_viewer_client(api_client, fr_viewer):
    api_client.force_authenticate(user=fr_viewer)
    return api_client


@pytest.fixture
def fr_nobody_client(api_client, fr_nobody):
    api_client.force_authenticate(user=fr_nobody)
    return api_client


@pytest.fixture
def seed_order(fr_tenant, risk_levels):
    supplier = FabricSupplier.objects.create(
        tenant=fr_tenant, code="SUP-100", name="FR Supplier",
    )
    category = FabricCategory.objects.create(
        tenant=fr_tenant, code="FRC", name="FR Category",
    )
    order = FabricOrder.objects.create(
        tenant=fr_tenant,
        order_number="FO-2026-1001",
        supplier=supplier,
        fabric_category=category,
        quantity_meters="2500",
        unit_price="3.5000",
        status="draft",
    )
    return order


class TestFabricRiskModel:
    """RQ-018: risk_level FK + GC risk state machine + owner chain."""

    def test_default_risk_level_none(self, seed_order):
        assert seed_order.risk_level is None

    def test_default_risk_notes_blank(self, seed_order):
        assert seed_order.risk_notes == ""

    def test_default_date_owners_empty(self, seed_order):
        assert seed_order.date_owners == {}

    def test_effective_owner_clearance_is_logistics(self, seed_order):
        assert seed_order.effective_owner("clearance") == "logistics"

    def test_effective_owner_onboard_pre_dip_is_sales(self, seed_order):
        assert seed_order.effective_owner("onboard") == "sales"
        assert seed_order.effective_owner("eta") == "sales"

    def test_effective_owner_onboard_after_dip_is_merchandising(self, seed_order):
        seed_order.lab_dip_approval_date = "2026-05-01"
        assert seed_order.effective_owner("onboard") == "merchandising"
        assert seed_order.effective_owner("eta") == "merchandising"
        assert seed_order.effective_owner("lab_dip") == "sales"

    def test_effective_owner_onboard_after_bulk_is_planning(self, seed_order):
        seed_order.lab_dip_approval_date = "2026-05-01"
        seed_order.bulk_approved_date = "2026-06-01"
        assert seed_order.effective_owner("onboard") == "planning"
        assert seed_order.effective_owner("eta") == "planning"

    def test_effective_owner_lab_dip_pre_bulk_is_sales(self, seed_order):
        assert seed_order.effective_owner("lab_dip") == "sales"

    def test_effective_owner_unknown_key_none(self, seed_order):
        assert seed_order.effective_owner("bogus") is None

    def test_date_owner_override_wins(self, seed_order):
        seed_order.date_owners = {"onboard": "planning"}
        assert seed_order.effective_owner("onboard") == "planning"

    def test_recompute_draft_is_none(self, seed_order):
        assert seed_order.recompute_risk() == "none"

    def test_recompute_bulk_and_dates_is_amber(self, seed_order):
        seed_order.bulk_approved_date = "2026-06-01"
        seed_order.onboard_date = "2026-08-01"
        assert seed_order.recompute_risk() == "amber"

    def test_recompute_clearance_is_green(self, seed_order):
        seed_order.clearance_date = "2026-09-01"
        assert seed_order.recompute_risk() == "green"

    def test_recompute_delivered_is_green(self, seed_order):
        seed_order.status = "delivered"
        assert seed_order.recompute_risk() == "green"

    def test_recompute_bulk_without_dates_is_none(self, seed_order):
        seed_order.bulk_approved_date = "2026-06-01"
        assert seed_order.recompute_risk() == "none"

    def test_apply_policy_amber(self, seed_order, risk_levels):
        seed_order.bulk_approved_date = "2026-06-01"
        seed_order.onboard_date = "2026-08-01"
        seed_order.apply_risk_policy()
        seed_order.refresh_from_db()
        assert seed_order.risk_level == risk_levels["amber"]

    def test_apply_policy_green(self, seed_order, risk_levels):
        seed_order.clearance_date = "2026-09-01"
        seed_order.apply_risk_policy()
        seed_order.refresh_from_db()
        assert seed_order.risk_level == risk_levels["green"]

    def test_red_is_sticky_across_policy(self, seed_order, risk_levels):
        seed_order.risk_level = risk_levels["red"]
        seed_order.clearance_date = "2026-09-01"
        seed_order.apply_risk_policy()
        seed_order.refresh_from_db()
        assert seed_order.risk_level == risk_levels["red"]

    def test_apply_policy_no_levels_is_noop(self, fr_tenant, seed_order):
        bare = Tenant.objects.create(
            name="Bare Co", slug="bare-fr",
            schema_name="tenant_bare_fr", status="active",
        )
        supplier = FabricSupplier.objects.create(tenant=bare, code="SUP-999", name="Bare Supplier")
        category = FabricCategory.objects.create(tenant=bare, code="BRC", name="Bare Category")
        order = FabricOrder.objects.create(
            tenant=bare, order_number="FO-2026-9999",
            supplier=supplier, fabric_category=category,
            quantity_meters="100", unit_price="1.0000", status="draft",
        )
        order.clearance_date = "2026-09-01"
        assert order.apply_risk_policy() is None
        order.refresh_from_db()
        assert order.risk_level is None


class TestFabricRiskAPI:
    """RQ-018: risk_status/set_risk/recompute_risk/update_schedule_dates."""

    def test_requires_auth(self, api_client, fr_tenant):
        resp = api_client.get("/api/v1/fabric/orders/")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_includes_risk_fields(self, fr_client, seed_order):
        resp = fr_client.get("/api/v1/fabric/orders/")
        assert resp.status_code == status.HTTP_200_OK
        row = resp.data["results"][0]
        assert "risk_level" in row
        assert "risk_level_name" in row
        assert "risk_level_code" in row
        assert "effective_owners" in row

    def test_viewer_can_read_risk_status(self, fr_viewer_client, seed_order):
        resp = fr_viewer_client.get(f"/api/v1/fabric/orders/{seed_order.id}/risk_status/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["policy_code"] == "none"
        assert resp.data["effective_owners"]["clearance"] == "logistics"

    def test_editor_can_set_risk(self, fr_client, seed_order, risk_levels):
        resp = fr_client.post(
            f"/api/v1/fabric/orders/{seed_order.id}/set_risk/",
            {"risk_level": str(risk_levels["red"].id), "notes": "Mill failed delivery"}, format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["risk_level_code"] == "red"
        assert resp.data["risk_notes"] == "Mill failed delivery"

    def test_viewer_cannot_set_risk(self, fr_viewer_client, seed_order, risk_levels):
        resp = fr_viewer_client.post(
            f"/api/v1/fabric/orders/{seed_order.id}/set_risk/",
            {"risk_level": str(risk_levels["red"].id)}, format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_set_risk_invalid_level_400(self, fr_client, seed_order):
        resp = fr_client.post(
            f"/api/v1/fabric/orders/{seed_order.id}/set_risk/",
            {"risk_level": "00000000-0000-0000-0000-000000000000"}, format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_set_risk_foreign_tenant_level_400(self, fr_client, seed_order, fr_tenant):
        other = Tenant.objects.create(
            name="Other Co", slug="other-fr",
            schema_name="tenant_other_fr", status="active",
        )
        foreign, _ = RiskLevel.objects.get_or_create(
            tenant=other, code="red", defaults={"name": "Red"},
        )
        resp = fr_client.post(
            f"/api/v1/fabric/orders/{seed_order.id}/set_risk/",
            {"risk_level": str(foreign.id)}, format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_recompute_risk_amber(self, fr_client, seed_order):
        seed_order.bulk_approved_date = "2026-06-01"
        seed_order.onboard_date = "2026-08-01"
        seed_order.save()
        resp = fr_client.post(f"/api/v1/fabric/orders/{seed_order.id}/recompute_risk/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["risk_level_code"] == "amber"

    def test_recompute_risk_green(self, fr_client, seed_order):
        seed_order.clearance_date = "2026-09-01"
        seed_order.save()
        resp = fr_client.post(f"/api/v1/fabric/orders/{seed_order.id}/recompute_risk/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["risk_level_code"] == "green"

    def test_recompute_risk_keeps_red(self, fr_client, seed_order, risk_levels):
        seed_order.risk_level = risk_levels["red"]
        seed_order.clearance_date = "2026-09-01"
        seed_order.save()
        resp = fr_client.post(f"/api/v1/fabric/orders/{seed_order.id}/recompute_risk/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["risk_level_code"] == "red"

    def test_sales_can_update_onboard_pre_dip(self, fr_sales_client, seed_order):
        resp = fr_sales_client.post(
            f"/api/v1/fabric/orders/{seed_order.id}/update_schedule_dates/",
            {"dates": {"onboard_date": "2026-08-01", "eta_date": "2026-08-15"}}, format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        seed_order.refresh_from_db()
        assert str(seed_order.onboard_date) == "2026-08-01"
        assert str(seed_order.eta_date) == "2026-08-15"

    def test_planning_can_update_onboard_after_bulk(self, fr_planning_client, seed_order):
        seed_order.lab_dip_approval_date = "2026-05-01"
        seed_order.bulk_approved_date = "2026-06-01"
        seed_order.save()
        resp = fr_planning_client.post(
            f"/api/v1/fabric/orders/{seed_order.id}/update_schedule_dates/",
            {"dates": {"onboard_date": "2026-08-20"}}, format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        seed_order.refresh_from_db()
        assert str(seed_order.onboard_date) == "2026-08-20"

    def test_wrong_role_cannot_update_onboard(self, fr_quality_client, seed_order):
        resp = fr_quality_client.post(
            f"/api/v1/fabric/orders/{seed_order.id}/update_schedule_dates/",
            {"dates": {"onboard_date": "2026-08-01"}}, format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_planning_cannot_update_clearance(self, fr_planning_client, seed_order):
        resp = fr_planning_client.post(
            f"/api/v1/fabric/orders/{seed_order.id}/update_schedule_dates/",
            {"dates": {"clearance_date": "2026-09-01"}}, format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_no_role_user_cannot_update(self, fr_nobody_client, seed_order):
        resp = fr_nobody_client.post(
            f"/api/v1/fabric/orders/{seed_order.id}/update_schedule_dates/",
            {"dates": {"onboard_date": "2026-08-01"}}, format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_update_schedule_dates_invalid_key(self, fr_sales_client, seed_order):
        resp = fr_sales_client.post(
            f"/api/v1/fabric/orders/{seed_order.id}/update_schedule_dates/",
            {"dates": {"bogus_date": "2026-08-01"}}, format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_update_schedule_dates_empty(self, fr_sales_client, seed_order):
        resp = fr_sales_client.post(
            f"/api/v1/fabric/orders/{seed_order.id}/update_schedule_dates/",
            {"dates": {}}, format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
