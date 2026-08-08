"""
Tests for RQ-008: Quick Lead Time Orders (formerly GC-026).
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
def ql_tenant(db):
    return Tenant.objects.create(
        name="QL Test Co", slug="ql-test",
        schema_name="tenant_ql", status="active",
    )


@pytest.fixture
def ql_role(db, ql_tenant):
    role = Role.objects.create(tenant=ql_tenant, name="QLMerch", is_system=True)
    for mod in ["merchandising", "setup"]:
        for act in ["view", "create", "edit", "delete"]:
            perm, _ = Permission.objects.get_or_create(
                module=mod, action=act,
                defaults={"description": f"{mod}:{act}"}
            )
            RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def ql_viewer_role(db, ql_tenant):
    role = Role.objects.create(tenant=ql_tenant, name="QLViewer", is_system=True)
    perm, _ = Permission.objects.get_or_create(
        module="merchandising", action="view",
        defaults={"description": "merchandising:view"}
    )
    RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def ql_user(db, ql_tenant, ql_role):
    user = User.objects.create_user(
        username="qluser", email="ql@test.com",
        password="testpass123!@#", tenant=ql_tenant, status="active",
        first_name="QL", last_name="User",
    )
    UserRole.objects.create(user=user, role=ql_role)
    return user


@pytest.fixture
def ql_viewer(db, ql_tenant, ql_viewer_role):
    user = User.objects.create_user(
        username="qlviewer", email="qlv@test.com",
        password="testpass123!@#", tenant=ql_tenant, status="active",
        first_name="QLV", last_name="Viewer",
    )
    UserRole.objects.create(user=user, role=ql_viewer_role)
    return user


@pytest.fixture
def ql_client(api_client, ql_user):
    api_client.force_authenticate(user=ql_user)
    return api_client


@pytest.fixture
def ql_viewer_client(api_client, ql_viewer):
    api_client.force_authenticate(user=ql_viewer)
    return api_client


@pytest.fixture
def seed_fo(ql_tenant):
    currency = Currency.objects.create(tenant=ql_tenant, code="USD", name="US Dollar", symbol="$")
    country = Country.objects.create(tenant=ql_tenant, code="BGD", name="Bangladesh")
    buyer = Buyer.objects.create(tenant=ql_tenant, code="HM", name="H&M", country=country, currency=currency)
    factory = Factory.objects.create(tenant=ql_tenant, code="F-001", name="Apex Knitwears")
    style = Style.objects.create(tenant=ql_tenant, style_number="STY-001", name="Test Style", buyer=buyer)
    sv = StyleVersion.objects.create(tenant=ql_tenant, style=style, version_number=1, status="active")
    fo = FileOpening.objects.create(
        tenant=ql_tenant, file_number="FO-001", style=style, style_version=sv,
        buyer=buyer, factory=factory, file_date="2026-01-01",
    )
    return {"fo": fo, "buyer": buyer, "factory": factory, "style": style, "sv": sv}


# ==================== Quick Lead Model Tests ====================

@pytest.mark.django_db
class TestQuickLeadModel:
    def test_default_not_quick_lead(self, seed_fo):
        assert seed_fo["fo"].is_quick_lead is False
        assert seed_fo["fo"].quick_lead_agreement_complete is False

    def test_required_parties_constant(self, seed_fo):
        fo = seed_fo["fo"]
        assert set(fo.QUICK_LEAD_PARTIES) == {
            "sales", "buying", "customer", "technical", "planning", "merchandising",
        }

    def test_add_agreement(self, seed_fo):
        fo = seed_fo["fo"]
        fo.is_quick_lead = True
        fo.add_agreement("sales")
        assert fo.quick_lead_agreed_by == ["sales"]

    def test_add_agreement_dedupes(self, seed_fo):
        fo = seed_fo["fo"]
        fo.is_quick_lead = True
        fo.add_agreement("sales")
        fo.add_agreement("sales")
        assert fo.quick_lead_agreed_by.count("sales") == 1

    def test_add_agreement_invalid_party_raises(self, seed_fo):
        fo = seed_fo["fo"]
        fo.is_quick_lead = True
        with pytest.raises(ValueError):
            fo.add_agreement("unknown_party")

    def test_add_agreement_not_quick_lead_raises(self, seed_fo):
        with pytest.raises(ValueError):
            seed_fo["fo"].add_agreement("sales")

    def test_agreement_complete_requires_all_parties(self, seed_fo):
        fo = seed_fo["fo"]
        fo.is_quick_lead = True
        fo.add_agreement("sales")
        fo.add_agreement("buying")
        assert fo.quick_lead_agreement_complete is False
        assert set(fo.missing_agreements) == {
            "customer", "technical", "planning", "merchandising",
        }

    def test_agreement_complete_true_when_all_agreed(self, seed_fo):
        fo = seed_fo["fo"]
        fo.is_quick_lead = True
        for party in fo.QUICK_LEAD_PARTIES:
            fo.add_agreement(party)
        assert fo.quick_lead_agreement_complete is True
        assert fo.missing_agreements == []

    def test_unmark_clears_agreements(self, seed_fo):
        fo = seed_fo["fo"]
        fo.is_quick_lead = True
        for party in fo.QUICK_LEAD_PARTIES:
            fo.add_agreement(party)
        fo.unmark_quick_lead()
        assert fo.is_quick_lead is False
        assert fo.quick_lead_agreed_by == []
        assert fo.quick_lead_agreement_complete is False

    def test_quick_lead_str_fields(self, seed_fo):
        fo = seed_fo["fo"]
        fo.is_quick_lead = True
        assert "QL" in str(fo.quick_lead_flag)


# ==================== Quick Lead API Tests ====================

@pytest.mark.django_db
class TestQuickLeadAPI:
    def test_requires_auth(self, api_client, seed_fo):
        r = api_client.post(f"/api/v1/merchandising/file-openings/{seed_fo['fo'].id}/quick_lead/")
        assert r.status_code == status.HTTP_401_UNAUTHORIZED

    def test_viewer_cannot_mark(self, ql_viewer_client, seed_fo):
        r = ql_viewer_client.post(f"/api/v1/merchandising/file-openings/{seed_fo['fo'].id}/quick_lead/")
        assert r.status_code == status.HTTP_403_FORBIDDEN

    def test_mark_quick_lead(self, ql_client, seed_fo):
        r = ql_client.post(f"/api/v1/merchandising/file-openings/{seed_fo['fo'].id}/quick_lead/")
        assert r.status_code == status.HTTP_200_OK
        assert r.data["is_quick_lead"] is True
        seed_fo["fo"].refresh_from_db()
        assert seed_fo["fo"].is_quick_lead is True

    def test_agree_quick_lead(self, ql_client, seed_fo):
        ql_client.post(f"/api/v1/merchandising/file-openings/{seed_fo['fo'].id}/quick_lead/")
        r = ql_client.post(
            f"/api/v1/merchandising/file-openings/{seed_fo['fo'].id}/agree_quick_lead/",
            {"party": "sales"},
        )
        assert r.status_code == status.HTTP_200_OK
        assert "sales" in r.data["quick_lead_agreed_by"]

    def test_agree_invalid_party(self, ql_client, seed_fo):
        ql_client.post(f"/api/v1/merchandising/file-openings/{seed_fo['fo'].id}/quick_lead/")
        r = ql_client.post(
            f"/api/v1/merchandising/file-openings/{seed_fo['fo'].id}/agree_quick_lead/",
            {"party": "nope"},
        )
        assert r.status_code == status.HTTP_400_BAD_REQUEST

    def test_agree_requires_party_field(self, ql_client, seed_fo):
        ql_client.post(f"/api/v1/merchandising/file-openings/{seed_fo['fo'].id}/quick_lead/")
        r = ql_client.post(
            f"/api/v1/merchandising/file-openings/{seed_fo['fo'].id}/agree_quick_lead/",
            {},
        )
        assert r.status_code == status.HTTP_400_BAD_REQUEST

    def test_agree_not_quick_lead(self, ql_client, seed_fo):
        r = ql_client.post(
            f"/api/v1/merchandising/file-openings/{seed_fo['fo'].id}/agree_quick_lead/",
            {"party": "sales"},
        )
        assert r.status_code == status.HTTP_400_BAD_REQUEST

    def test_unmark_quick_lead(self, ql_client, seed_fo):
        ql_client.post(f"/api/v1/merchandising/file-openings/{seed_fo['fo'].id}/quick_lead/")
        ql_client.post(
            f"/api/v1/merchandising/file-openings/{seed_fo['fo'].id}/agree_quick_lead/",
            {"party": "sales"},
        )
        r = ql_client.post(f"/api/v1/merchandising/file-openings/{seed_fo['fo'].id}/unmark_quick_lead/")
        assert r.status_code == status.HTTP_200_OK
        assert r.data["is_quick_lead"] is False
        assert r.data["quick_lead_agreed_by"] == []

    def test_quick_lead_status(self, ql_client, seed_fo):
        ql_client.post(f"/api/v1/merchandising/file-openings/{seed_fo['fo'].id}/quick_lead/")
        r = ql_client.get(f"/api/v1/merchandising/file-openings/{seed_fo['fo'].id}/quick_lead_status/")
        assert r.status_code == status.HTTP_200_OK
        assert r.data["is_quick_lead"] is True
        assert set(r.data["required_parties"]) == {
            "sales", "buying", "customer", "technical", "planning", "merchandising",
        }
        assert r.data["agreement_complete"] is False
        assert len(r.data["missing_agreements"]) == 6

    def test_list_exposes_quick_lead(self, ql_client, seed_fo):
        ql_client.post(f"/api/v1/merchandising/file-openings/{seed_fo['fo'].id}/quick_lead/")
        r = ql_client.get("/api/v1/merchandising/file-openings/")
        assert r.status_code == status.HTTP_200_OK
        row = next(x for x in r.data["results"] if x["id"] == str(seed_fo["fo"].id))
        assert row["is_quick_lead"] is True
        assert row["quick_lead_agreement_complete"] is False
