"""
Tests for the Job Request / Queue System (GC-013).

Cross-department job requests (pattern, sample, 3D, mini-marker) with
job_type filtering, assignment and queue ordering.
"""
from datetime import date

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.merchandising.models import JobRequest, JobStatus, Style
from apps.setup.models import Buyer, Country
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def job_tenant(db):
    return Tenant.objects.create(
        name="JobTest Co", slug="jobtest",
        schema_name="tenant_jobtest", status="active",
    )


@pytest.fixture
def job_tenant2(db):
    return Tenant.objects.create(
        name="JobTest Other Co", slug="jobtest-other",
        schema_name="tenant_jobtest_other", status="active",
    )


@pytest.fixture
def job_role(db, job_tenant):
    role = Role.objects.create(tenant=job_tenant, name="JobAdmin", is_system=True)
    for mod in ["setup", "merchandising"]:
        for act in ["view", "create", "edit", "delete"]:
            perm, _ = Permission.objects.get_or_create(
                module=mod, action=act,
                defaults={"description": f"{mod}:{act}"}
            )
            RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def job_user(db, job_tenant, job_role):
    user = User.objects.create_user(
        username="jobuser", email="jobuser@test.com",
        password="testpass123!@#", tenant=job_tenant, status="active",
    )
    UserRole.objects.create(user=user, role=job_role)
    return user


@pytest.fixture
def job_user2(db, job_tenant, job_role):
    user = User.objects.create_user(
        username="jobuser2", email="jobuser2@test.com",
        password="testpass123!@#", tenant=job_tenant, status="active",
    )
    UserRole.objects.create(user=user, role=job_role)
    return user


@pytest.fixture
def job_client(api_client, job_user):
    api_client.force_authenticate(user=job_user)
    return api_client


def _make_style(tenant, user, style_number):
    country = Country.objects.create(tenant=tenant, name=f"C {style_number}", code=f"J{style_number[-4:]}")
    buyer = Buyer.objects.create(tenant=tenant, name="Job Buyer", code=f"B{style_number[-4:]}", country=country)
    return Style.objects.create(
        tenant=tenant, style_number=style_number, name=f"Style {style_number}",
        buyer=buyer, created_by=user,
    )


@pytest.fixture
def job_data(db, job_tenant, job_user):
    style = _make_style(job_tenant, job_user, "JST-100")
    style2 = _make_style(job_tenant, job_user, "JST-200")
    return {"tenant": job_tenant, "user": job_user, "style": style, "style2": style2}


@pytest.fixture
def job_payload(job_data):
    return {
        "job_type": "pattern",
        "style": str(job_data["style"].id),
        "description": "Create pattern for repeat order",
        "work_location": "Pattern Room 2",
        "required_by_date": "2026-08-20",
        "priority": "high",
        "notes": "Urgent repeat",
    }


# ==================== Model Tests ====================

@pytest.mark.django_db
class TestJobRequestModel:
    def test_defaults(self, job_data):
        job = JobRequest.objects.create(
            tenant=job_data["tenant"], job_number="JOB-0001",
            job_type="pattern", style=job_data["style"],
            created_by=job_data["user"],
        )
        assert job.status == JobStatus.PENDING
        assert job.priority == 2  # normal
        assert job.required_by_date is None
        assert job.assigned_to is None
        assert job.work_location == ""

    def test_str(self, job_data):
        job = JobRequest.objects.create(
            tenant=job_data["tenant"], job_number="JOB-0001",
            job_type="sample", style=job_data["style"],
            description="Sample for approval", created_by=job_data["user"],
        )
        assert str(job) == "JOB-0001 - sample"

    def test_invalid_job_type_rejected(self, job_data):
        job = JobRequest(
            tenant=job_data["tenant"], job_number="JOB-0001",
            job_type="bogus", style=job_data["style"],
            created_by=job_data["user"],
        )
        with pytest.raises(Exception):
            job.full_clean()

    def test_priority_display(self, job_data):
        job = JobRequest.objects.create(
            tenant=job_data["tenant"], job_number="JOB-0001",
            job_type="3d", style=job_data["style"],
            priority=4, created_by=job_data["user"],
        )
        assert job.get_priority_display() == "Urgent"

    def test_queue_ordering_priority_first(self, job_data):
        low = JobRequest.objects.create(
            tenant=job_data["tenant"], job_number="JOB-0001", job_type="pattern",
            style=job_data["style"], priority=1, required_by_date=date(2026, 8, 30),
            created_by=job_data["user"],
        )
        urgent = JobRequest.objects.create(
            tenant=job_data["tenant"], job_number="JOB-0002", job_type="sample",
            style=job_data["style"], priority=4, required_by_date=date(2026, 8, 10),
            created_by=job_data["user"],
        )
        assert list(JobRequest.objects.all()) == [urgent, low]


# ==================== API Tests ====================

@pytest.mark.django_db
class TestJobRequestAPI:
    """POST/GET /api/v1/merchandising/job-requests/."""

    def test_create_auto_job_number(self, job_client, job_payload):
        response = job_client.post("/api/v1/merchandising/job-requests/", job_payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["job_number"] == "JOB-1001"
        assert response.data["status"] == "pending"
        assert response.data["priority_display"] == "High"
        assert response.data["style_number"] == "JST-100"

        response2 = job_client.post("/api/v1/merchandising/job-requests/", job_payload, format="json")
        assert response2.status_code == status.HTTP_201_CREATED
        assert response2.data["job_number"] == "JOB-1002"

    def test_list_type_filter(self, job_client, job_payload):
        job_client.post("/api/v1/merchandising/job-requests/", job_payload, format="json")
        pattern_payload = {**job_payload, "job_type": "3d", "description": "3D model render"}
        job_client.post("/api/v1/merchandising/job-requests/", pattern_payload, format="json")
        response = job_client.get("/api/v1/merchandising/job-requests/?job_type=pattern")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["job_type"] == "pattern"

    def test_assign_job(self, job_client, job_payload, job_user2):
        created = job_client.post("/api/v1/merchandising/job-requests/", job_payload, format="json")
        job_id = created.data["id"]
        response = job_client.patch(
            f"/api/v1/merchandising/job-requests/{job_id}/",
            {"assigned_to": str(job_user2.id)}, format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert str(response.data["assigned_to"]) == str(job_user2.id)
        assert response.data["assigned_to_name"] == job_user2.username

    def test_queue_ordering_api(self, job_client, job_payload, job_data):
        low = {**job_payload, "priority": "low", "required_by_date": "2026-08-30"}
        urgent = {**job_payload, "priority": "urgent", "required_by_date": "2026-08-10"}
        job_client.post("/api/v1/merchandising/job-requests/", low, format="json")
        job_client.post("/api/v1/merchandising/job-requests/", urgent, format="json")
        response = job_client.get("/api/v1/merchandising/job-requests/")
        results = response.data["results"]
        assert len(results) == 2
        assert results[0]["priority"] == 4  # urgent first
        assert results[1]["priority"] == 1

    def test_status_filter(self, job_client, job_payload):
        created = job_client.post("/api/v1/merchandising/job-requests/", job_payload, format="json")
        job_id = created.data["id"]
        job_client.patch(f"/api/v1/merchandising/job-requests/{job_id}/", {"status": "completed"}, format="json")
        response = job_client.get("/api/v1/merchandising/job-requests/?status=pending")
        assert response.data["count"] == 0
        response2 = job_client.get("/api/v1/merchandising/job-requests/?status=completed")
        assert response2.data["count"] == 1

    def test_style_mismatch_cross_tenant_400(self, job_client, job_payload, job_tenant2, job_user):
        other_style = _make_style(job_tenant2, job_user, "JST-OTH")
        response = job_client.post("/api/v1/merchandising/job-requests/", {
            **job_payload, "style": str(other_style.id),
        }, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_requires_merchandising_permission(self, api_client, job_tenant, job_user, job_payload):
        role = Role.objects.create(tenant=job_tenant, name="ViewOnly", is_system=True)
        perm, _ = Permission.objects.get_or_create(module="merchandising", action="view")
        RolePermission.objects.create(role=role, permission=perm)
        UserRole.objects.all().delete()
        UserRole.objects.create(user=job_user, role=role)
        api_client.force_authenticate(user=job_user)
        response = api_client.post("/api/v1/merchandising/job-requests/", job_payload, format="json")
        assert response.status_code in (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND)

    def test_401_unauthenticated(self, job_payload):
        client = APIClient()
        response = client.post("/api/v1/merchandising/job-requests/", job_payload, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_invalid_job_type_400(self, job_client, job_payload):
        response = job_client.post("/api/v1/merchandising/job-requests/", {
            **job_payload, "job_type": "bogus",
        }, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
