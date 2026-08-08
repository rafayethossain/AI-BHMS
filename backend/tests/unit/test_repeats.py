"""
Tests for RQ-009: Repeats Management (formerly GC-028).
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.merchandising.models import FileOpening, Style, StyleVersion
from apps.setup.models import Buyer, Country, Currency, Factory
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def rp_tenant(db):
    return Tenant.objects.create(
        name="RP Test Co", slug="rp-test",
        schema_name="tenant_rp", status="active",
    )


@pytest.fixture
def rp_role(db, rp_tenant):
    role = Role.objects.create(tenant=rp_tenant, name="RPMerch", is_system=True)
    for mod in ["merchandising", "setup"]:
        for act in ["view", "create", "edit", "delete"]:
            perm, _ = Permission.objects.get_or_create(
                module=mod, action=act,
                defaults={"description": f"{mod}:{act}"}
            )
            RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def rp_viewer_role(db, rp_tenant):
    role = Role.objects.create(tenant=rp_tenant, name="RPViewer", is_system=True)
    perm, _ = Permission.objects.get_or_create(
        module="merchandising", action="view",
        defaults={"description": "merchandising:view"}
    )
    RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def rp_user(db, rp_tenant, rp_role):
    user = User.objects.create_user(
        username="rpuser", email="rp@test.com",
        password="testpass123!@#", tenant=rp_tenant, status="active",
        first_name="RP", last_name="User",
    )
    UserRole.objects.create(user=user, role=rp_role)
    return user


@pytest.fixture
def rp_viewer(db, rp_tenant, rp_viewer_role):
    user = User.objects.create_user(
        username="rpviewer", email="rpv@test.com",
        password="testpass123!@#", tenant=rp_tenant, status="active",
        first_name="RPV", last_name="Viewer",
    )
    UserRole.objects.create(user=user, role=rp_viewer_role)
    return user


@pytest.fixture
def rp_client(api_client, rp_user):
    api_client.force_authenticate(user=rp_user)
    return api_client


@pytest.fixture
def rp_viewer_client(api_client, rp_viewer):
    api_client.force_authenticate(user=rp_viewer)
    return api_client


@pytest.fixture
def seed_fo(rp_tenant):
    currency = Currency.objects.create(tenant=rp_tenant, code="USD", name="US Dollar", symbol="$")
    country = Country.objects.create(tenant=rp_tenant, code="BGD", name="Bangladesh")
    buyer = Buyer.objects.create(tenant=rp_tenant, code="HM", name="H&M", country=country, currency=currency)
    factory = Factory.objects.create(tenant=rp_tenant, code="F-001", name="Apex Knitwears")
    style = Style.objects.create(tenant=rp_tenant, style_number="STY-001", name="Test Style", buyer=buyer)
    sv = StyleVersion.objects.create(tenant=rp_tenant, style=style, version_number=1, status="active")
    fo = FileOpening.objects.create(
        tenant=rp_tenant, file_number="FO-2025-010", style=style, style_version=sv,
        buyer=buyer, factory=factory, file_date="2026-01-01",
    )
    return {"fo": fo, "buyer": buyer, "factory": factory, "style": style, "sv": sv}


# ==================== Repeat Model Tests ====================

@pytest.mark.django_db
class TestRepeatModel:
    def test_default_not_repeat(self, seed_fo):
        fo = seed_fo["fo"]
        assert fo.is_repeat is False
        assert fo.repeat_approval_complete is False
        assert fo.original_fn is None

    def test_required_parties_constant(self, seed_fo):
        assert set(seed_fo["fo"].REPEAT_APPROVAL_PARTIES) == {"technical", "trims"}

    def test_create_repeat_links_original(self, seed_fo):
        fo = seed_fo["fo"]
        repeat = fo.create_repeat()
        assert repeat.is_repeat is True
        assert repeat.original_fn == fo
        assert repeat.file_number.startswith("FO-")
        assert repeat.file_number != fo.file_number

    def test_create_repeat_copies_order_details(self, seed_fo):
        fo = seed_fo["fo"]
        repeat = fo.create_repeat()
        assert repeat.style == fo.style
        assert repeat.buyer == fo.buyer
        assert repeat.factory == fo.factory
        assert repeat.style_version == fo.style_version
        assert "Repeat of" in repeat.remarks
        assert "FO-2025-010" in repeat.remarks

    def test_add_approval(self, seed_fo):
        fo = seed_fo["fo"]
        repeat = fo.create_repeat()
        repeat.add_repeat_approval("technical")
        assert repeat.repeat_approved_by == ["technical"]

    def test_add_approval_dedupes(self, seed_fo):
        fo = seed_fo["fo"]
        repeat = fo.create_repeat()
        repeat.add_repeat_approval("trims")
        repeat.add_repeat_approval("trims")
        assert repeat.repeat_approved_by.count("trims") == 1

    def test_add_approval_invalid_party_raises(self, seed_fo):
        fo = seed_fo["fo"]
        repeat = fo.create_repeat()
        with pytest.raises(ValueError):
            repeat.add_repeat_approval("unknown_party")

    def test_add_approval_not_repeat_raises(self, seed_fo):
        with pytest.raises(ValueError):
            seed_fo["fo"].add_repeat_approval("technical")

    def test_approval_complete_requires_all_parties(self, seed_fo):
        fo = seed_fo["fo"]
        repeat = fo.create_repeat()
        repeat.add_repeat_approval("technical")
        assert repeat.repeat_approval_complete is False
        assert set(repeat.missing_repeat_approvals) == {"trims"}

    def test_approval_complete_true_when_all_approved(self, seed_fo):
        fo = seed_fo["fo"]
        repeat = fo.create_repeat()
        for party in fo.REPEAT_APPROVAL_PARTIES:
            repeat.add_repeat_approval(party)
        assert repeat.repeat_approval_complete is True
        assert repeat.missing_repeat_approvals == []

    def test_original_fn_number_property(self, seed_fo):
        fo = seed_fo["fo"]
        repeat = fo.create_repeat()
        assert repeat.original_fn_number == "FO-2025-010"
        assert fo.original_fn_number == ""


# ==================== Repeat API Tests ====================

@pytest.mark.django_db
class TestRepeatAPI:
    def test_requires_auth(self, api_client, seed_fo):
        r = api_client.post(f"/api/v1/merchandising/file-openings/{seed_fo['fo'].id}/create_repeat/")
        assert r.status_code == status.HTTP_401_UNAUTHORIZED

    def test_viewer_cannot_create_repeat(self, rp_viewer_client, seed_fo):
        r = rp_viewer_client.post(f"/api/v1/merchandising/file-openings/{seed_fo['fo'].id}/create_repeat/")
        assert r.status_code == status.HTTP_403_FORBIDDEN

    def test_create_repeat_action(self, rp_client, seed_fo):
        fo = seed_fo["fo"]
        r = rp_client.post(f"/api/v1/merchandising/file-openings/{fo.id}/create_repeat/")
        assert r.status_code == status.HTTP_200_OK
        assert r.data["is_repeat"] is True
        assert r.data["original_fn"] == str(fo.id)
        assert r.data["original_fn_number"] == "FO-2025-010"
        assert r.data["file_number"].startswith("FO-")
        repeat = FileOpening.objects.get(pk=r.data["id"])
        assert repeat.original_fn == fo

    def test_create_repeat_generates_distinct_file_number(self, rp_client, seed_fo):
        fo = seed_fo["fo"]
        r1 = rp_client.post(f"/api/v1/merchandising/file-openings/{fo.id}/create_repeat/")
        r2 = rp_client.post(f"/api/v1/merchandising/file-openings/{fo.id}/create_repeat/")
        assert r1.status_code == status.HTTP_200_OK
        assert r2.status_code == status.HTTP_200_OK
        assert r1.data["file_number"] != r2.data["file_number"]

    def test_approve_repeat(self, rp_client, seed_fo):
        fo = seed_fo["fo"]
        repeat_id = rp_client.post(f"/api/v1/merchandising/file-openings/{fo.id}/create_repeat/").data["id"]
        r = rp_client.post(
            f"/api/v1/merchandising/file-openings/{repeat_id}/approve_repeat/",
            {"party": "technical"},
        )
        assert r.status_code == status.HTTP_200_OK
        assert "technical" in r.data["repeat_approved_by"]

    def test_approve_invalid_party(self, rp_client, seed_fo):
        fo = seed_fo["fo"]
        repeat_id = rp_client.post(f"/api/v1/merchandising/file-openings/{fo.id}/create_repeat/").data["id"]
        r = rp_client.post(
            f"/api/v1/merchandising/file-openings/{repeat_id}/approve_repeat/",
            {"party": "nope"},
        )
        assert r.status_code == status.HTTP_400_BAD_REQUEST

    def test_approve_requires_party_field(self, rp_client, seed_fo):
        fo = seed_fo["fo"]
        repeat_id = rp_client.post(f"/api/v1/merchandising/file-openings/{fo.id}/create_repeat/").data["id"]
        r = rp_client.post(
            f"/api/v1/merchandising/file-openings/{repeat_id}/approve_repeat/",
            {},
        )
        assert r.status_code == status.HTTP_400_BAD_REQUEST

    def test_approve_not_repeat(self, rp_client, seed_fo):
        fo = seed_fo["fo"]
        r = rp_client.post(
            f"/api/v1/merchandising/file-openings/{fo.id}/approve_repeat/",
            {"party": "technical"},
        )
        assert r.status_code == status.HTTP_400_BAD_REQUEST

    def test_repeat_status(self, rp_client, seed_fo):
        fo = seed_fo["fo"]
        repeat_id = rp_client.post(f"/api/v1/merchandising/file-openings/{fo.id}/create_repeat/").data["id"]
        r = rp_client.get(f"/api/v1/merchandising/file-openings/{repeat_id}/repeat_status/")
        assert r.status_code == status.HTTP_200_OK
        assert r.data["is_repeat"] is True
        assert r.data["original_fn_number"] == "FO-2025-010"
        assert set(r.data["required_parties"]) == {"technical", "trims"}
        assert r.data["approval_complete"] is False
        assert len(r.data["missing_approvals"]) == 2

    def test_list_exposes_repeat(self, rp_client, seed_fo):
        fo = seed_fo["fo"]
        repeat_id = rp_client.post(f"/api/v1/merchandising/file-openings/{fo.id}/create_repeat/").data["id"]
        r = rp_client.get("/api/v1/merchandising/file-openings/")
        assert r.status_code == status.HTTP_200_OK
        row = next(x for x in r.data["results"] if x["id"] == repeat_id)
        assert row["is_repeat"] is True
        assert row["original_fn_number"] == "FO-2025-010"
        assert row["repeat_approval_complete"] is False

    def test_list_filters_is_repeat(self, rp_client, seed_fo):
        fo = seed_fo["fo"]
        rp_client.post(f"/api/v1/merchandising/file-openings/{fo.id}/create_repeat/")
        r = rp_client.get("/api/v1/merchandising/file-openings/?is_repeat=true")
        assert r.status_code == status.HTTP_200_OK
        assert len(r.data["results"]) == 1
        assert all(row["is_repeat"] for row in r.data["results"])
