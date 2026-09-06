"""
Tests for B9 — Help & Onboarding backend models.
RQ-050: Help centre data-backed content, tour tracking, onboarding checklist, release notes.
"""
import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.help.models import TourCompletion, OnboardingChecklistItem, ReleaseNote
from apps.tenants.models import Tenant

User = get_user_model()


@pytest.fixture
def tenant(db):
    return Tenant.objects.create(name="Test Tenant", slug="test-tenant", is_active=True)


@pytest.fixture
def user(db, tenant):
    return User.objects.create_user(
        username="helpuser", email="help@test.com",
        password="Test1234!", first_name="Help", last_name="User",
        tenant=tenant, status="active",
    )


# ---------- TourCompletion ----------

@pytest.mark.django_db
class TestTourCompletion:
    def test_create_completion(self, user):
        tc = TourCompletion.objects.create(
            tenant=user.tenant, user=user, tour_id="welcome-tour"
        )
        assert tc.id is not None
        assert tc.tour_id == "welcome-tour"
        assert tc.user == user
        assert tc.completed_at is not None

    def test_unique_together_user_tour(self, user):
        TourCompletion.objects.create(tenant=user.tenant, user=user, tour_id="welcome-tour")
        with pytest.raises(Exception):
            TourCompletion.objects.create(tenant=user.tenant, user=user, tour_id="welcome-tour")

    def test_str(self, user):
        tc = TourCompletion.objects.create(
            tenant=user.tenant, user=user, tour_id="welcome-tour"
        )
        assert "welcome-tour" in str(tc)
        assert "help@test.com" in str(tc)

    def test_tenant_scoped(self, user, tenant):
        tc = TourCompletion.objects.create(
            tenant=user.tenant, user=user, tour_id="welcome-tour"
        )
        assert tc.tenant == tenant

    def test_multiple_tours_per_user(self, user):
        TourCompletion.objects.create(tenant=user.tenant, user=user, tour_id="tour-a")
        TourCompletion.objects.create(tenant=user.tenant, user=user, tour_id="tour-b")
        assert user.tour_completions.count() == 2


# ---------- OnboardingChecklistItem ----------

@pytest.mark.django_db
class TestOnboardingChecklistItem:
    def test_create_item(self, user):
        item = OnboardingChecklistItem.objects.create(
            tenant=user.tenant, user=user, item_key="created_style"
        )
        assert item.id is not None
        assert item.completed is False
        assert item.completed_at is None

    def test_mark_completed(self, user):
        item = OnboardingChecklistItem.objects.create(
            tenant=user.tenant, user=user, item_key="created_style"
        )
        item.mark_completed()
        assert item.completed is True
        assert item.completed_at is not None

    def test_mark_incomplete(self, user):
        item = OnboardingChecklistItem.objects.create(
            tenant=user.tenant, user=user, item_key="created_style"
        )
        item.mark_completed()
        item.mark_incomplete()
        assert item.completed is False
        assert item.completed_at is None

    def test_unique_together_user_item_key(self, user):
        OnboardingChecklistItem.objects.create(
            tenant=user.tenant, user=user, item_key="created_style"
        )
        with pytest.raises(Exception):
            OnboardingChecklistItem.objects.create(
                tenant=user.tenant, user=user, item_key="created_style"
            )

    def test_str(self, user):
        item = OnboardingChecklistItem.objects.create(
            tenant=user.tenant, user=user, item_key="created_style"
        )
        assert "created_style" in str(item)
        assert "help@test.com" in str(item)

    def test_tenant_scoped(self, user, tenant):
        item = OnboardingChecklistItem.objects.create(
            tenant=user.tenant, user=user, item_key="created_style"
        )
        assert item.tenant == tenant

    def test_completed_items_property(self, user):
        OnboardingChecklistItem.objects.create(
            tenant=user.tenant, user=user, item_key="a", completed=True
        )
        OnboardingChecklistItem.objects.create(
            tenant=user.tenant, user=user, item_key="b", completed=False
        )
        items = user.onboarding_items.all()
        assert items.filter(completed=True).count() == 1
        assert items.filter(completed=False).count() == 1


# ---------- ReleaseNote ----------

@pytest.mark.django_db
class TestReleaseNote:
    def test_create_release_note(self):
        rn = ReleaseNote.objects.create(
            version="1.0.0",
            title="Initial Release",
            body="First release of BHMS.",
            released_at=timezone.now(),
        )
        assert rn.id is not None
        assert rn.version == "1.0.0"
        assert rn.is_published is True

    def test_unpublished(self):
        rn = ReleaseNote.objects.create(
            version="1.1.0",
            title="Draft",
            body="Coming soon.",
            released_at=timezone.now(),
            is_published=False,
        )
        assert rn.is_published is False

    def test_str(self):
        rn = ReleaseNote.objects.create(
            version="1.0.0",
            title="Initial Release",
            body="First release.",
            released_at=timezone.now(),
        )
        assert "1.0.0" in str(rn)
        assert "Initial Release" in str(rn)

    def test_ordering_by_released_at_desc(self):
        ReleaseNote.objects.create(
            version="1.0.0", title="v1", body="a",
            released_at=timezone.now() - timezone.timedelta(days=1),
        )
        ReleaseNote.objects.create(
            version="1.1.0", title="v1.1", body="b",
            released_at=timezone.now(),
        )
        notes = list(ReleaseNote.objects.all())
        assert notes[0].version == "1.1.0"
        assert notes[1].version == "1.0.0"

    def test_published_only(self):
        ReleaseNote.objects.create(
            version="1.0.0", title="v1", body="a",
            released_at=timezone.now(), is_published=True,
        )
        ReleaseNote.objects.create(
            version="1.1.0", title="v1.1", body="b",
            released_at=timezone.now(), is_published=False,
        )
        assert ReleaseNote.objects.filter(is_published=True).count() == 1
        assert ReleaseNote.objects.filter(is_published=False).count() == 1
