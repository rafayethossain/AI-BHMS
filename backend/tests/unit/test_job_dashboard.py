"""
Tests for the Job Queue Dashboard (GC-014).

Dynamic queue view with status aggregation, job_type breakdown, overdue /
due-this-week counts and a focused queue action for active jobs.
"""
from datetime import date, timedelta

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.merchandising.models import JobRequest, Style
from apps.setup.models import Buyer, Country
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def qd_tenant(db):
    return Tenant.objects.create(
        name="QueueDash Co", slug="queuedash",
        schema_name="tenant_queuedash", status="active",
    )


@pytest.fixture
def qd_tenant2(db):
    return Tenant.objects.create(
        name="QueueDash Other", slug="queuedash-other",
        schema_name="tenant_queuedash_other", status="active",
    )


@pytest.fixture
def qd_role(db, qd_tenant):
    role = Role.objects.create(tenant=qd_tenant, name="QueueDashAdmin", is_system=True)
    for mod in ["setup", "merchandising"]:
        for act in ["view", "create", "edit", "delete"]:
            perm, _ = Permission.objects.get_or_create(
                module=mod, action=act,
                defaults={"description": f"{mod}:{act}"},
            )
            RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def qd_user(db, qd_tenant, qd_role):
    user = User.objects.create_user(
        username="qddashuser", email="qddash@test.com",
        password="testpass123!@#", tenant=qd_tenant, status="active",
    )
    UserRole.objects.create(user=user, role=qd_role)
    return user


@pytest.fixture
def qd_client(api_client, qd_user):
    api_client.force_authenticate(user=qd_user)
    return api_client


def _make_style(tenant, user, style_number):
    country = Country.objects.create(tenant=tenant, name=f"C {style_number}", code=f"Q{style_number[-4:]}")
    buyer = Buyer.objects.create(tenant=tenant, name="Queue Buyer", code=f"B{style_number[-4:]}", country=country)
    return Style.objects.create(
        tenant=tenant, style_number=style_number, name=f"Style {style_number}",
        buyer=buyer, created_by=user,
    )


@pytest.fixture
def qd_style(db, qd_tenant, qd_user):
    return _make_style(qd_tenant, qd_user, "QST-001")


@pytest.mark.django_db
class TestJobDashboardAPI:
    """GET /api/v1/merchandising/job-requests/dashboard/."""

    def _create(self, tenant, user, style, **kwargs):
        return JobRequest.objects.create(
            tenant=tenant, job_number=kwargs.pop("job_number", "JOB-T"),
            job_type=kwargs.pop("job_type", "pattern"), style=style,
            created_by=user, **kwargs,
        )

    def test_dashboard_status_aggregation(self, qd_client, qd_tenant, qd_user, qd_style):
        self._create(qd_tenant, qd_user, qd_style, status="pending", priority=3)
        self._create(qd_tenant, qd_user, qd_style, status="in_progress", priority=2)
        self._create(qd_tenant, qd_user, qd_style, status="completed", priority=4)
        self._create(qd_tenant, qd_user, qd_style, status="pending", priority=1)
        response = qd_client.get("/api/v1/merchandising/job-requests/dashboard/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["total"] == 4
        assert response.data["by_status"]["pending"] == 2
        assert response.data["by_status"]["in_progress"] == 1
        assert response.data["by_status"]["completed"] == 1
        assert response.data["by_status"]["cancelled"] == 0

    def test_dashboard_type_breakdown(self, qd_client, qd_tenant, qd_user, qd_style):
        self._create(qd_tenant, qd_user, qd_style, job_type="pattern")
        self._create(qd_tenant, qd_user, qd_style, job_type="sample")
        self._create(qd_tenant, qd_user, qd_style, job_type="3d")
        self._create(qd_tenant, qd_user, qd_style, job_type="mini_marker")
        response = qd_client.get("/api/v1/merchandising/job-requests/dashboard/")
        assert response.data["by_type"]["pattern"] == 1
        assert response.data["by_type"]["sample"] == 1
        assert response.data["by_type"]["3d"] == 1
        assert response.data["by_type"]["mini_marker"] == 1

    def test_dashboard_overdue_and_due_this_week(self, qd_client, qd_tenant, qd_user, qd_style):
        yesterday = date.today() - timedelta(days=1)
        in_three_days = date.today() + timedelta(days=3)
        next_month = date.today() + timedelta(days=45)
        self._create(qd_tenant, qd_user, qd_style, status="pending", required_by_date=yesterday)
        self._create(qd_tenant, qd_user, qd_style, status="in_progress", required_by_date=in_three_days)
        self._create(qd_tenant, qd_user, qd_style, status="pending", required_by_date=next_month)
        self._create(qd_tenant, qd_user, qd_style, status="completed", required_by_date=yesterday)
        response = qd_client.get("/api/v1/merchandising/job-requests/dashboard/")
        assert response.data["overdue"] == 1
        assert response.data["due_this_week"] == 1

    def test_dashboard_unassigned_count(self, qd_client, qd_tenant, qd_user, qd_style):
        self._create(qd_tenant, qd_user, qd_style)
        self._create(qd_tenant, qd_user, qd_style, assigned_to=qd_user)
        response = qd_client.get("/api/v1/merchandising/job-requests/dashboard/")
        assert response.data["unassigned"] == 1

    def test_dashboard_priority_breakdown(self, qd_client, qd_tenant, qd_user, qd_style):
        self._create(qd_tenant, qd_user, qd_style, priority=1)
        self._create(qd_tenant, qd_user, qd_style, priority=4)
        response = qd_client.get("/api/v1/merchandising/job-requests/dashboard/")
        assert response.data["by_priority"]["low"] == 1
        assert response.data["by_priority"]["urgent"] == 1

    def test_dashboard_tenant_scoped(self, qd_client, qd_tenant, qd_tenant2, qd_user, qd_style):
        other_style = _make_style(qd_tenant2, qd_user, "QST-OTH")
        self._create(qd_tenant, qd_user, qd_style, status="pending")
        self._create(qd_tenant2, qd_user, other_style, status="pending")
        self._create(qd_tenant2, qd_user, other_style, status="in_progress")
        response = qd_client.get("/api/v1/merchandising/job-requests/dashboard/")
        assert response.data["total"] == 1

    def test_dashboard_401_unauthenticated(self):
        client = APIClient()
        response = client.get("/api/v1/merchandising/job-requests/dashboard/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestJobQueueAPI:
    """GET /api/v1/merchandising/job-requests/queue/ — active jobs first."""

    @pytest.mark.django_db
    def test_queue_returns_active_only_priority_ordered(self, qd_client, qd_tenant, qd_user, qd_style):
        JobRequest.objects.create(
            tenant=qd_tenant, job_number="JOB-1", job_type="pattern", style=qd_style,
            priority=1, required_by_date=date.today() + timedelta(days=10),
            created_by=qd_user,
        )
        JobRequest.objects.create(
            tenant=qd_tenant, job_number="JOB-2", job_type="sample", style=qd_style,
            priority=4, required_by_date=date.today() + timedelta(days=2),
            created_by=qd_user,
        )
        JobRequest.objects.create(
            tenant=qd_tenant, job_number="JOB-3", job_type="3d", style=qd_style,
            priority=2, status="completed", created_by=qd_user,
        )
        response = qd_client.get("/api/v1/merchandising/job-requests/queue/")
        assert response.status_code == status.HTTP_200_OK
        job_numbers = [job["job_number"] for job in response.data["results"]]
        assert job_numbers == ["JOB-2", "JOB-1"]
