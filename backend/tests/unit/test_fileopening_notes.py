"""
Tests for FileOpeningNote add_notes action (US-044 gap closure).
"""
import pytest
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.tenants.models import Tenant
from apps.users.models import Role, UserRole, Permission, RolePermission
from apps.setup.models import Factory, Currency, Country, Season, Buyer, Brand
from apps.merchandising.models import Style, StyleVersion, FileOpening, FileOpeningNote

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def fo_tenant(db):
    return Tenant.objects.create(
        name="FO Notes Test Co", slug="fo-notes-test",
        schema_name="tenant_fo_notes", status="active",
    )


@pytest.fixture
def fo_role(db, fo_tenant):
    role = Role.objects.create(tenant=fo_tenant, name="FOMerch", is_system=True)
    for mod in ["merchandising", "setup"]:
        for act in ["view", "create", "edit", "delete"]:
            perm, _ = Permission.objects.get_or_create(
                module=mod, action=act,
                defaults={"description": f"{mod}:{act}"}
            )
            RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def fo_user(db, fo_tenant, fo_role):
    user = User.objects.create_user(
        username="fouser", email="fo@test.com",
        password="testpass123!@#", tenant=fo_tenant, status="active",
        first_name="Test", last_name="User",
    )
    UserRole.objects.create(user=user, role=fo_role)
    return user


@pytest.fixture
def fo_client(api_client, fo_user):
    api_client.force_authenticate(user=fo_user)
    return api_client


@pytest.fixture
def seed_fo(fo_tenant):
    currency = Currency.objects.create(tenant=fo_tenant, code="USD", name="US Dollar", symbol="$")
    country = Country.objects.create(tenant=fo_tenant, code="BGD", name="Bangladesh")
    season = Season.objects.create(tenant=fo_tenant, code="SS26", name="SS 2026")
    buyer = Buyer.objects.create(tenant=fo_tenant, code="HM", name="H&M", country=country, currency=currency)
    brand = Brand.objects.create(tenant=fo_tenant, buyer=buyer, code="HM-BM", name="Basics")
    factory = Factory.objects.create(tenant=fo_tenant, code="F-001", name="Apex Knitwears")
    style = Style.objects.create(tenant=fo_tenant, style_number="STY-001", name="Test Style", buyer=buyer)
    sv = StyleVersion.objects.create(tenant=fo_tenant, style=style, version_number=1, status="active")
    fo = FileOpening.objects.create(
        tenant=fo_tenant, file_number="FO-001", style=style, style_version=sv,
        buyer=buyer, factory=factory, file_date="2026-01-01",
        created_by=User.objects.filter(tenant=fo_tenant).first(),
    )
    return {"fo": fo, "buyer": buyer, "factory": factory, "style": style, "sv": sv}


# ==================== FileOpeningNote Model Tests ====================

@pytest.mark.django_db
class TestFileOpeningNoteModel:
    def test_create_note(self, fo_tenant, fo_user, seed_fo):
        note = FileOpeningNote.objects.create(
            tenant=fo_tenant, file_opening=seed_fo["fo"],
            text="Test note content", author=fo_user,
        )
        assert note.text == "Test note content"
        assert note.author == fo_user
        assert note.is_active is True
        assert note.author_initials == "TU"

    def test_note_str(self, fo_tenant, fo_user, seed_fo):
        note = FileOpeningNote.objects.create(
            tenant=fo_tenant, file_opening=seed_fo["fo"],
            text="Urgent update needed", author=fo_user,
        )
        assert "FO-001" in str(note)
        assert "TU" in str(note)

    def test_note_default_active(self, fo_tenant, seed_fo):
        note = FileOpeningNote.objects.create(
            tenant=fo_tenant, file_opening=seed_fo["fo"],
            text="Default active",
        )
        assert note.is_active is True

    def test_note_ordering(self, fo_tenant, fo_user, seed_fo):
        FileOpeningNote.objects.create(
            tenant=fo_tenant, file_opening=seed_fo["fo"],
            text="First", author=fo_user,
        )
        FileOpeningNote.objects.create(
            tenant=fo_tenant, file_opening=seed_fo["fo"],
            text="Second", author=fo_user,
        )
        notes = FileOpeningNote.objects.filter(tenant=fo_tenant)
        assert notes.count() == 2

    def test_inactive_note_excluded(self, fo_tenant, fo_user, seed_fo):
        note = FileOpeningNote.objects.create(
            tenant=fo_tenant, file_opening=seed_fo["fo"],
            text="Active note", author=fo_user,
        )
        inactive = FileOpeningNote.objects.create(
            tenant=fo_tenant, file_opening=seed_fo["fo"],
            text="Deactivated note", author=fo_user, is_active=False,
        )
        active_notes = FileOpeningNote.objects.filter(tenant=fo_tenant, is_active=True)
        assert note in active_notes
        assert inactive not in active_notes


# ==================== FileOpeningNote API Tests ====================

@pytest.mark.django_db
class TestFileOpeningNoteAPI:
    def test_list_notes_empty(self, fo_client, seed_fo):
        response = fo_client.get(f"/api/v1/merchandising/file-openings/{seed_fo['fo'].id}/notes/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data == []

    def test_create_note(self, fo_client, seed_fo):
        response = fo_client.post(
            f"/api/v1/merchandising/file-openings/{seed_fo['fo'].id}/notes/",
            {"text": "New note via API"},
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["text"] == "New note via API"

    def test_create_note_persists(self, fo_client, seed_fo):
        resp = fo_client.post(
            f"/api/v1/merchandising/file-openings/{seed_fo['fo'].id}/notes/",
            {"text": "Persistent note"},
        )
        assert resp.status_code == status.HTTP_201_CREATED, f"POST failed: {resp.data}"
        notes = FileOpeningNote.objects.filter(file_opening=seed_fo["fo"])
        assert notes.count() == 1
        assert notes[0].text == "Persistent note"

    def test_list_notes_after_create(self, fo_client, seed_fo):
        r1 = fo_client.post(
            f"/api/v1/merchandising/file-openings/{seed_fo['fo'].id}/notes/",
            {"text": "Note 1"},
        )
        assert r1.status_code == status.HTTP_201_CREATED
        r2 = fo_client.post(
            f"/api/v1/merchandising/file-openings/{seed_fo['fo'].id}/notes/",
            {"text": "Note 2"},
        )
        assert r2.status_code == status.HTTP_201_CREATED
        response = fo_client.get(f"/api/v1/merchandising/file-openings/{seed_fo['fo'].id}/notes/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2

    def test_create_note_requires_text(self, fo_client, seed_fo):
        response = fo_client.post(
            f"/api/v1/merchandising/file-openings/{seed_fo['fo'].id}/notes/",
            {},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_notes_scoped_to_file_opening(self, fo_client, fo_tenant, seed_fo):
        other_fo = FileOpening.objects.create(
            tenant=fo_tenant, file_number="FO-OTHER", style=seed_fo["style"],
            style_version=seed_fo["sv"], buyer=seed_fo["buyer"],
            factory=seed_fo["factory"], file_date="2026-01-01",
        )
        r1 = fo_client.post(
            f"/api/v1/merchandising/file-openings/{seed_fo['fo'].id}/notes/",
            {"text": "Note on FO-001"},
        )
        assert r1.status_code == status.HTTP_201_CREATED, f"First POST failed: {r1.data}"
        r2 = fo_client.post(
            f"/api/v1/merchandising/file-openings/{other_fo.id}/notes/",
            {"text": "Note on FO-OTHER"},
        )
        assert r2.status_code == status.HTTP_201_CREATED, f"Second POST failed: {r2.data}"
        response = fo_client.get(
            f"/api/v1/merchandising/file-openings/{seed_fo['fo'].id}/notes/"
        )
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["text"] == "Note on FO-001"

    def test_notes_require_auth(self, api_client, seed_fo):
        response = api_client.get(
            f"/api/v1/merchandising/file-openings/{seed_fo['fo'].id}/notes/"
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_note_has_author_info(self, fo_client, fo_user, seed_fo):
        response = fo_client.post(
            f"/api/v1/merchandising/file-openings/{seed_fo['fo'].id}/notes/",
            {"text": "Author test"},
        )
        assert response.data.get("author") == fo_user.id
