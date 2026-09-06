"""
Tests for RQ-020: Fabric Schedule (Role Handoff) (GC-017).

GC Manual Fabric-Schedule: sales raises orders and owns onboard/arrival until
dip approval; merchandising owns dip->bulk; planning owns from bulk approval;
logistics owns paperwork/clearance; China office aids schedule management.
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.fabric.models import FabricCategory, FabricOrder, FabricSupplier
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def fs_tenant(db):
    return Tenant.objects.create(
        name="FS Test Co", slug="fs-test",
        schema_name="tenant_fs", status="active",
    )


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
def sales_role(db, fs_tenant):
    return _make_role(db, fs_tenant, "Sales", [("fabric", "view"), ("fabric", "edit")])


@pytest.fixture
def merchandising_role(db, fs_tenant):
    return _make_role(db, fs_tenant, "Merchandising", [("fabric", "view"), ("fabric", "edit")])


@pytest.fixture
def planning_role(db, fs_tenant):
    return _make_role(db, fs_tenant, "Planning", [("fabric", "view"), ("fabric", "edit")])


@pytest.fixture
def logistics_role(db, fs_tenant):
    return _make_role(db, fs_tenant, "Logistics", [("fabric", "view"), ("fabric", "edit")])


@pytest.fixture
def china_role(db, fs_tenant):
    return _make_role(db, fs_tenant, "China Office", [("fabric", "view"), ("fabric", "edit")])


@pytest.fixture
def viewer_role(db, fs_tenant):
    return _make_role(db, fs_tenant, "Viewer", [("fabric", "view")])


@pytest.fixture
def fs_sales(db, fs_tenant, sales_role):
    return _make_user(db, fs_tenant, "fssales", sales_role)


@pytest.fixture
def fs_merch(db, fs_tenant, merchandising_role):
    return _make_user(db, fs_tenant, "fsmerch", merchandising_role)


@pytest.fixture
def fs_planning(db, fs_tenant, planning_role):
    return _make_user(db, fs_tenant, "fsplanning", planning_role)


@pytest.fixture
def fs_logistics(db, fs_tenant, logistics_role):
    return _make_user(db, fs_tenant, "fslogistics", logistics_role)


@pytest.fixture
def fs_china(db, fs_tenant, china_role):
    return _make_user(db, fs_tenant, "fschina", china_role)


@pytest.fixture
def fs_viewer(db, fs_tenant, viewer_role):
    return _make_user(db, fs_tenant, "fsviewer", viewer_role)


@pytest.fixture
def fs_client(api_client, fs_sales):
    api_client.force_authenticate(user=fs_sales)
    return api_client


@pytest.fixture
def fs_planning_client(api_client, fs_planning):
    api_client.force_authenticate(user=fs_planning)
    return api_client


@pytest.fixture
def fs_logistics_client(api_client, fs_logistics):
    api_client.force_authenticate(user=fs_logistics)
    return api_client


@pytest.fixture
def fs_china_client(api_client, fs_china):
    api_client.force_authenticate(user=fs_china)
    return api_client


@pytest.fixture
def fs_viewer_client(api_client, fs_viewer):
    api_client.force_authenticate(user=fs_viewer)
    return api_client


@pytest.fixture
def seed_order(fs_tenant):
    supplier = FabricSupplier.objects.create(
        tenant=fs_tenant, code="SUP-FS1", name="FS Supplier",
    )
    category = FabricCategory.objects.create(
        tenant=fs_tenant, code="FSC", name="FS Category",
    )
    order = FabricOrder.objects.create(
        tenant=fs_tenant,
        order_number="FO-2026-2001",
        supplier=supplier,
        fabric_category=category,
        quantity_meters="2500",
        unit_price="3.5000",
        status="draft",
    )
    return order


class TestFabricScheduleModel:
    """RQ-020: handoff model + owner chain helpers."""

    def test_default_no_handoffs(self, seed_order):
        assert seed_order.schedule_handoffs.count() == 0

    def test_next_owner_onboard_sales_to_merchandising(self, seed_order):
        assert seed_order.next_owner("onboard", "sales") == "merchandising"

    def test_next_owner_onboard_merch_to_planning(self, seed_order):
        assert seed_order.next_owner("onboard", "merchandising") == "planning"

    def test_next_owner_onboard_planning_none(self, seed_order):
        assert seed_order.next_owner("onboard", "planning") is None

    def test_next_owner_lab_dip_sales_to_merch(self, seed_order):
        assert seed_order.next_owner("lab_dip", "sales") == "merchandising"

    def test_next_owner_lab_dip_merch_none(self, seed_order):
        assert seed_order.next_owner("lab_dip", "merchandising") is None

    def test_next_owner_clearance_none(self, seed_order):
        assert seed_order.next_owner("clearance", "logistics") is None

    def test_next_owner_unknown_role_none(self, seed_order):
        assert seed_order.next_owner("onboard", "bogus") is None

    def test_schedule_handoff_records_row(self, seed_order, fs_sales):
        handoff = seed_order.schedule_handoff(
            "onboard", "sales", "merchandising",
            by_user=fs_sales, trigger="manual", notes="Moving along",
        )
        assert handoff.date_key == "onboard"
        assert handoff.from_role == "sales"
        assert handoff.to_role == "merchandising"
        assert handoff.trigger == "manual"
        assert handoff.handed_off_by == fs_sales
        assert handoff.notes == "Moving along"
        assert seed_order.schedule_handoffs.count() == 1

    def test_schedule_handoff_updates_effective_owner(self, seed_order):
        seed_order.schedule_handoff("onboard", "sales", "merchandising")
        seed_order.refresh_from_db()
        assert seed_order.date_owners["onboard"] == "merchandising"
        assert seed_order.effective_owner("onboard") == "merchandising"

    def test_schedule_handoff_unknown_key_raises(self, seed_order):
        with pytest.raises(ValueError):
            seed_order.schedule_handoff("bogus", "sales", "merchandising")

    def test_schedule_handoff_invalid_transition_raises(self, seed_order):
        with pytest.raises(ValueError):
            seed_order.schedule_handoff("onboard", "sales", "planning")

    def test_dip_approval_triggers_onboard_handoff(self, seed_order, fs_sales):
        seed_order.handoff_on_dip_approval(fs_sales)
        assert seed_order.schedule_handoffs.filter(date_key="onboard", trigger="dip_approved").exists()
        assert seed_order.schedule_handoffs.filter(date_key="eta", trigger="dip_approved").exists()
        assert not seed_order.schedule_handoffs.filter(date_key="lab_dip").exists()
        seed_order.refresh_from_db()
        assert seed_order.effective_owner("onboard") == "merchandising"

    def test_bulk_approval_triggers_planning_handoff(self, seed_order, fs_sales):
        seed_order.handoff_on_dip_approval(fs_sales)
        seed_order.handoff_on_bulk_approval(fs_sales)
        handoffs = list(seed_order.schedule_handoffs.all())
        by_key = {(h.date_key, h.to_role) for h in handoffs}
        assert ("onboard", "merchandising") in by_key
        assert ("onboard", "planning") in by_key
        assert ("lab_dip", "merchandising") in by_key
        seed_order.refresh_from_db()
        assert seed_order.effective_owner("onboard") == "planning"
        assert seed_order.effective_owner("lab_dip") == "merchandising"

    def test_handoff_not_repeated_when_override_exists(self, seed_order, fs_sales):
        seed_order.date_owners = {"onboard": "planning", "eta": "planning"}
        seed_order.save()
        seed_order.handoff_on_dip_approval(fs_sales)
        assert seed_order.schedule_handoffs.count() == 0
        seed_order.refresh_from_db()
        assert seed_order.effective_owner("onboard") == "planning"

    def test_handoff_on_bulk_skips_when_not_merch(self, seed_order, fs_sales):
        seed_order.handoff_on_bulk_approval(fs_sales)
        seed_order.refresh_from_db()
        assert seed_order.schedule_handoffs.count() == 1
        assert seed_order.schedule_handoffs.filter(date_key="lab_dip").exists()
        assert seed_order.effective_owner("lab_dip") == "merchandising"
        assert seed_order.effective_owner("onboard") == "sales"


class TestFabricScheduleAPI:
    """RQ-020: schedule_status + handoff_schedule actions + auto triggers."""

    def test_requires_auth_schedule_status(self, api_client, fs_tenant):
        resp = api_client.get("/api/v1/fabric/orders/")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_viewer_can_read_schedule_status(self, fs_viewer_client, seed_order):
        resp = fs_viewer_client.get(f"/api/v1/fabric/orders/{seed_order.id}/schedule_status/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["order_number"] == "FO-2026-2001"
        assert resp.data["effective_owners"]["clearance"] == "logistics"
        assert resp.data["handoffs"] == []

    def test_schedule_status_includes_history(self, fs_viewer_client, seed_order, fs_sales):
        seed_order.schedule_handoff("onboard", "sales", "merchandising", by_user=fs_sales)
        seed_order.schedule_handoff("eta", "sales", "merchandising", by_user=fs_sales)
        resp = fs_viewer_client.get(f"/api/v1/fabric/orders/{seed_order.id}/schedule_status/")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data["handoffs"]) == 2
        first = resp.data["handoffs"][0]
        assert first["date_key"] == "onboard"
        assert first["from_role"] == "sales"
        assert first["to_role"] == "merchandising"
        assert first["trigger"] == "manual"
        assert first["handed_off_by"] is not None

    def test_owner_can_handoff(self, fs_client, seed_order):
        resp = fs_client.post(
            f"/api/v1/fabric/orders/{seed_order.id}/handoff_schedule/",
            {"date_key": "onboard", "notes": "Handing to merch"}, format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["handoff"]["to_role"] == "merchandising"
        seed_order.refresh_from_db()
        assert seed_order.effective_owner("onboard") == "merchandising"
        assert seed_order.schedule_handoffs.filter(date_key="onboard", trigger="manual").exists()

    def test_non_owner_cannot_handoff(self, fs_planning_client, seed_order):
        resp = fs_planning_client.post(
            f"/api/v1/fabric/orders/{seed_order.id}/handoff_schedule/",
            {"date_key": "onboard"}, format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN
        seed_order.refresh_from_db()
        assert seed_order.effective_owner("onboard") == "sales"

    def test_china_office_can_handoff_any_date(self, fs_china_client, seed_order):
        resp = fs_china_client.post(
            f"/api/v1/fabric/orders/{seed_order.id}/handoff_schedule/",
            {"date_key": "onboard"}, format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["handoff"]["to_role"] == "merchandising"

    def test_handoff_at_final_owner_400(self, fs_logistics_client, seed_order):
        resp = fs_logistics_client.post(
            f"/api/v1/fabric/orders/{seed_order.id}/handoff_schedule/",
            {"date_key": "clearance"}, format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_handoff_invalid_key_400(self, fs_client, seed_order):
        resp = fs_client.post(
            f"/api/v1/fabric/orders/{seed_order.id}/handoff_schedule/",
            {"date_key": "bogus"}, format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_viewer_cannot_handoff(self, fs_viewer_client, seed_order):
        resp = fs_viewer_client.post(
            f"/api/v1/fabric/orders/{seed_order.id}/handoff_schedule/",
            {"date_key": "onboard"}, format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_china_office_can_update_any_schedule_date(self, fs_china_client, seed_order):
        resp = fs_china_client.post(
            f"/api/v1/fabric/orders/{seed_order.id}/update_schedule_dates/",
            {"dates": {"clearance_date": "2026-09-01"}}, format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        seed_order.refresh_from_db()
        assert str(seed_order.clearance_date) == "2026-09-01"

    def test_record_lab_dip_triggers_handoff(self, fs_client, seed_order):
        resp = fs_client.post(
            f"/api/v1/fabric/orders/{seed_order.id}/record_lab_dip/",
            {"lab_dip_approval_date": "2026-05-01"}, format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        seed_order.refresh_from_db()
        assert seed_order.effective_owner("onboard") == "merchandising"
        assert seed_order.schedule_handoffs.filter(trigger="dip_approved").count() == 2

    def test_approve_bulk_triggers_handoff(self, fs_client, seed_order):
        fs_client.post(
            f"/api/v1/fabric/orders/{seed_order.id}/record_lab_dip/",
            {"lab_dip_approval_date": "2026-05-01"}, format="json",
        )
        resp = fs_client.post(f"/api/v1/fabric/orders/{seed_order.id}/approve_bulk/")
        assert resp.status_code == status.HTTP_200_OK
        seed_order.refresh_from_db()
        assert seed_order.effective_owner("onboard") == "planning"
        assert seed_order.effective_owner("lab_dip") == "merchandising"
        assert seed_order.schedule_handoffs.filter(trigger="bulk_approved").count() == 3


class TestFabricSchedule16_2Alignment:
    """Roadmap 16.2 Fabric Schedule alignment (RQ-049 continuance, B8 Part 3):
    strike-off dates (required/actual/approved), actual arrival, paperwork date and
    bulk approval notes must be captured on FabricOrder and managed via the schedule API
    with the same ownership discipline as the existing onboard/eta/clearance dates."""

    def test_16_2_dates_writable_via_order_api(self, fs_client, seed_order):
        resp = fs_client.patch(
            f"/api/v1/fabric/orders/{seed_order.id}/",
            {
                "strike_off_required_date": "2026-04-15",
                "strike_off_actual_date": "2026-04-20",
                "strike_off_approval_date": "2026-04-25",
                "actual_arrival_date": "2026-08-05",
                "paperwork_date": "2026-08-18",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        seed_order.refresh_from_db()
        assert str(seed_order.strike_off_required_date) == "2026-04-15"
        assert str(seed_order.strike_off_actual_date) == "2026-04-20"
        assert str(seed_order.strike_off_approval_date) == "2026-04-25"
        assert str(seed_order.actual_arrival_date) == "2026-08-05"
        assert str(seed_order.paperwork_date) == "2026-08-18"

    def test_16_2_dates_serialized_in_response(self, fs_client, seed_order):
        resp = fs_client.get(f"/api/v1/fabric/orders/{seed_order.id}/")
        assert resp.status_code == status.HTTP_200_OK
        for field in (
            "strike_off_required_date", "strike_off_actual_date",
            "strike_off_approval_date", "actual_arrival_date", "paperwork_date",
            "bulk_approved_notes",
        ):
            assert field in resp.data, f"expected '{field}' in FabricOrder serializer output"

    def test_china_office_update_schedule_for_new_dates(self, fs_china_client, seed_order):
        resp = fs_china_client.post(
            f"/api/v1/fabric/orders/{seed_order.id}/update_schedule_dates/",
            {
                "dates": {
                    "strike_off_required_date": "2026-04-15",
                    "actual_arrival_date": "2026-08-05",
                    "paperwork_date": "2026-08-18",
                }
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        seed_order.refresh_from_db()
        assert str(seed_order.strike_off_required_date) == "2026-04-15"
        assert str(seed_order.actual_arrival_date) == "2026-08-05"
        assert str(seed_order.paperwork_date) == "2026-08-18"

    def test_effective_owner_new_dates(self, seed_order):
        assert seed_order.effective_owner("strike_off") == "sales"
        assert seed_order.effective_owner("actual_arrival") == "logistics"
        assert seed_order.effective_owner("paperwork") == "logistics"

    def test_approve_bulk_records_notes(self, fs_client, seed_order):
        resp = fs_client.post(
            f"/api/v1/fabric/orders/{seed_order.id}/approve_bulk/",
            {"bulk_approved_notes": "Strike-off approved; bulk confirmed with check samples"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        seed_order.refresh_from_db()
        assert seed_order.bulk_approved_notes == "Strike-off approved; bulk confirmed with check samples"
        assert seed_order.bulk_approved_date is not None
