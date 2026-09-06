"""
Tests for B9 — Help & Onboarding API endpoints.
RQ-050: Tour completions, onboarding checklist, release notes — REST API.
"""
import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.help.models import TourCompletion, OnboardingChecklistItem, ReleaseNote
from apps.tenants.models import Tenant

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def ht_tenant(db):
    return Tenant.objects.create(name="Help Tenant", slug="help-tenant", is_active=True)


@pytest.fixture
def ht_user(db, ht_tenant):
    return User.objects.create_superuser(
        username="htuser", email="ht@test.com",
        password="testpass123!@#", tenant=ht_tenant, status="active",
        first_name="HT", last_name="User",
    )


def _auth(client, tenant):
    client.defaults["HTTP_X_TENANT_ID"] = str(tenant.id)
    return client


@pytest.fixture
def ht_client(api_client, ht_user):
    api_client.force_authenticate(user=ht_user)
    _auth(api_client, ht_user.tenant)
    return api_client


# ---------- Tour Completions API ----------

@pytest.mark.django_db
class TestTourCompletionAPI:
    def test_list_empty(self, ht_client):
        resp = ht_client.get("/api/v1/help/tour-completions/")
        assert resp.status_code == 200
        assert len(resp.data["results"]) == 0

    def test_create_tour_completion(self, ht_client):
        resp = ht_client.post(
            "/api/v1/help/tour-completions/",
            {"tour_id": "welcome-tour"},
            format="json",
        )
        assert resp.status_code == 201
        assert resp.data["tour_id"] == "welcome-tour"
        assert "id" in resp.data

    def test_list_after_create(self, ht_client):
        ht_client.post(
            "/api/v1/help/tour-completions/",
            {"tour_id": "tour-a"}, format="json",
        )
        ht_client.post(
            "/api/v1/help/tour-completions/",
            {"tour_id": "tour-b"}, format="json",
        )
        resp = ht_client.get("/api/v1/help/tour-completions/")
        assert resp.status_code == 200
        assert len(resp.data["results"]) == 2

    def test_duplicate_tour_returns_400(self, ht_client):
        ht_client.post(
            "/api/v1/help/tour-completions/",
            {"tour_id": "welcome-tour"}, format="json",
        )
        resp = ht_client.post(
            "/api/v1/help/tour-completions/",
            {"tour_id": "welcome-tour"}, format="json",
        )
        assert resp.status_code == 400


# ---------- Onboarding Checklist API ----------

@pytest.mark.django_db
class TestOnboardingChecklistAPI:
    def test_list_empty(self, ht_client):
        resp = ht_client.get("/api/v1/help/onboarding/")
        assert resp.status_code == 200
        assert len(resp.data["results"]) == 0

    def test_create_checklist_item(self, ht_client):
        resp = ht_client.post(
            "/api/v1/help/onboarding/",
            {"item_key": "created_style"}, format="json",
        )
        assert resp.status_code == 201
        assert resp.data["item_key"] == "created_style"
        assert resp.data["completed"] is False

    def test_complete_action(self, ht_client):
        create_resp = ht_client.post(
            "/api/v1/help/onboarding/",
            {"item_key": "opened_file"}, format="json",
        )
        item_id = create_resp.data["id"]
        resp = ht_client.post(f"/api/v1/help/onboarding/{item_id}/complete/")
        assert resp.status_code == 200
        assert resp.data["completed"] is True
        assert resp.data["completed_at"] is not None

    def test_incomplete_action(self, ht_client):
        create_resp = ht_client.post(
            "/api/v1/help/onboarding/",
            {"item_key": "created_po"}, format="json",
        )
        item_id = create_resp.data["id"]
        ht_client.post(f"/api/v1/help/onboarding/{item_id}/complete/")
        resp = ht_client.post(f"/api/v1/help/onboarding/{item_id}/incomplete/")
        assert resp.status_code == 200
        assert resp.data["completed"] is False
        assert resp.data["completed_at"] is None

    def test_tenant_isolation(self, ht_client, ht_tenant):
        other = Tenant.objects.create(name="Other", slug="other-ht", is_active=True)
        other_user = User.objects.create_superuser(
            username="otherht", email="other@ht.com",
            password="testpass123!@#", tenant=other, status="active",
        )
        ht_client.post(
            "/api/v1/help/onboarding/",
            {"item_key": "created_style"}, format="json",
        )
        other_client = APIClient()
        other_client.force_authenticate(user=other_user)
        other_client.defaults["HTTP_X_TENANT_ID"] = str(other.id)
        resp = other_client.get("/api/v1/help/onboarding/")
        assert resp.status_code == 200
        assert len(resp.data["results"]) == 0


# ---------- Release Notes API ----------

@pytest.mark.django_db
class TestReleaseNoteAPI:
    def _seed_notes(self):
        ReleaseNote.objects.create(
            version="1.0.0", title="Initial", body="First.",
            released_at=timezone.now() - timezone.timedelta(days=10),
        )
        ReleaseNote.objects.create(
            version="1.1.0", title="New Features", body="Added help.",
            released_at=timezone.now(),
        )
        ReleaseNote.objects.create(
            version="1.2.0", title="Draft", body="Coming soon.",
            released_at=timezone.now() + timezone.timedelta(days=1),
            is_published=False,
        )

    def test_list_published_only(self, ht_client):
        self._seed_notes()
        resp = ht_client.get("/api/v1/help/release-notes/")
        assert resp.status_code == 200
        assert len(resp.data["results"]) == 2

    def test_retrieve_release_note(self, ht_client):
        self._seed_notes()
        note = ReleaseNote.objects.filter(is_published=True).order_by("-released_at").first()
        resp = ht_client.get(f"/api/v1/help/release-notes/{note.id}/")
        assert resp.status_code == 200
        assert resp.data["version"] == note.version

    def test_unpublished_not_retrievable(self, ht_client):
        self._seed_notes()
        note = ReleaseNote.objects.filter(is_published=False).first()
        resp = ht_client.get(f"/api/v1/help/release-notes/{note.id}/")
        assert resp.status_code == 404

    def test_ordering_newest_first(self, ht_client):
        self._seed_notes()
        resp = ht_client.get("/api/v1/help/release-notes/")
        assert resp.status_code == 200
        versions = [n["version"] for n in resp.data["results"]]
        assert versions == ["1.1.0", "1.0.0"]
