"""
Tests for Not Sold Analysis (RQ-006, formerly GC-034).

GC manual: quarterly report of styles (by samples) not yet sold. Done via the
Job Queue by searching a time period for sample jobs that are completed, then
removing any style that has a file (FileOpening) against it.
"""
from datetime import timedelta
from io import BytesIO

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from PIL import Image
from rest_framework import status
from rest_framework.test import APIClient

from apps.merchandising.models import (
    DesignImage,
    FileOpening,
    JobRequest,
    Style,
)
from apps.setup.models import Buyer, Country, Factory
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def ns_tenant(db):
    return Tenant.objects.create(
        name="Not Sold Co", slug="notsold",
        schema_name="tenant_notsold", status="active",
    )


@pytest.fixture
def ns_tenant2(db):
    return Tenant.objects.create(
        name="Not Sold Other", slug="notsold-other",
        schema_name="tenant_notsold_other", status="active",
    )


@pytest.fixture
def ns_role(db, ns_tenant):
    role = Role.objects.create(tenant=ns_tenant, name="NotSoldAdmin", is_system=True)
    for act in ["view", "create", "edit", "delete"]:
        perm, _ = Permission.objects.get_or_create(
            module="merchandising", action=act,
            defaults={"description": f"merchandising:{act}"},
        )
        RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def ns_user(db, ns_tenant, ns_role):
    user = User.objects.create_user(
        username="nsuser", email="ns@test.com",
        password="testpass123!@#", tenant=ns_tenant, status="active",
    )
    UserRole.objects.create(user=user, role=ns_role)
    return user


@pytest.fixture
def ns_client(api_client, ns_user):
    api_client.force_authenticate(user=ns_user)
    return api_client


@pytest.fixture
def ns_data(db, ns_tenant, ns_user):
    country = Country.objects.create(tenant=ns_tenant, name="NS Country", code="NC1")
    buyer = Buyer.objects.create(tenant=ns_tenant, name="NS Buyer", code="NB01", country=country)
    factory = Factory.objects.create(tenant=ns_tenant, code="NF01", name="NS Factory", country=country)

    def make_style(number, name):
        return Style.objects.create(
            tenant=ns_tenant, style_number=number, name=name,
            buyer=buyer, created_by=ns_user,
        )

    unsold_style = make_style("NS-001", "Un-Sold Style")
    sold_style = make_style("NS-002", "Sold Style")
    return {
        "tenant": ns_tenant, "user": ns_user, "buyer": buyer,
        "factory": factory, "unsold_style": unsold_style, "sold_style": sold_style,
    }


def _create_sample_job(tenant, user, style, **kwargs):
    return JobRequest.objects.create(
        tenant=tenant, job_number=kwargs.pop("job_number", "JOB-NS"),
        job_type=kwargs.pop("job_type", "sample"), style=style,
        status=kwargs.pop("status", "completed"), created_by=user, **kwargs,
    )


def _stamp(job, days_ago):
    JobRequest.objects.filter(pk=job.pk).update(
        created_at=timezone.now() - timedelta(days=days_ago)
    )
    job.refresh_from_db()
    return job


@pytest.mark.django_db
class TestNotSoldAnalysisAPI:
    """GET /api/v1/merchandising/job-requests/unsold_analysis/."""

    def test_requires_authentication(self, api_client):
        response = api_client.get("/api/v1/merchandising/job-requests/unsold_analysis/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_requires_permission(self, api_client, ns_tenant):
        user = User.objects.create_user(
            username="nsnoperm", email="nsnp@test.com",
            password="testpass123!@#", tenant=ns_tenant, status="active",
        )
        api_client.force_authenticate(user=user)
        response = api_client.get("/api/v1/merchandising/job-requests/unsold_analysis/")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_summary_counts_completed_samples(self, ns_client, ns_data):
        _stamp(_create_sample_job(ns_data["tenant"], ns_data["user"], ns_data["unsold_style"]), 10)
        _stamp(_create_sample_job(ns_data["tenant"], ns_data["user"], ns_data["sold_style"]), 12)
        _stamp(_create_sample_job(ns_data["tenant"], ns_data["user"], ns_data["sold_style"], job_number="JOB-NS2"), 15)
        response = ns_client.get("/api/v1/merchandising/job-requests/unsold_analysis/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["summary"]["total_samples"] == 3
        assert response.data["summary"]["styles_sampled"] == 2

    def test_unsold_style_flagged_no_file(self, ns_client, ns_data):
        _stamp(_create_sample_job(ns_data["tenant"], ns_data["user"], ns_data["unsold_style"]), 5)
        response = ns_client.get("/api/v1/merchandising/job-requests/unsold_analysis/")
        results = response.data["results"]
        row = next(r for r in results if r["style_id"] == str(ns_data["unsold_style"].id))
        assert row["has_file"] is False
        assert row["not_sold"] is True
        assert row["style_number"] == "NS-001"
        assert row["sample_count"] == 1

    def test_sold_style_flagged_with_file(self, ns_client, ns_data):
        _stamp(_create_sample_job(ns_data["tenant"], ns_data["user"], ns_data["sold_style"]), 5)
        FileOpening.objects.create(
            tenant=ns_data["tenant"], file_number="FO-NS-001", style=ns_data["sold_style"],
            buyer=ns_data["buyer"], factory=ns_data["factory"],
            file_date=timezone.localdate(), created_by=ns_data["user"],
        )
        response = ns_client.get("/api/v1/merchandising/job-requests/unsold_analysis/")
        results = response.data["results"]
        row = next(r for r in results if r["style_id"] == str(ns_data["sold_style"].id))
        assert row["has_file"] is True
        assert row["not_sold"] is False

    def test_summary_sold_and_not_sold_counts(self, ns_client, ns_data):
        _stamp(_create_sample_job(ns_data["tenant"], ns_data["user"], ns_data["unsold_style"]), 5)
        _stamp(_create_sample_job(ns_data["tenant"], ns_data["user"], ns_data["sold_style"]), 5)
        FileOpening.objects.create(
            tenant=ns_data["tenant"], file_number="FO-NS-002", style=ns_data["sold_style"],
            buyer=ns_data["buyer"], factory=ns_data["factory"],
            file_date=timezone.localdate(), created_by=ns_data["user"],
        )
        response = ns_client.get("/api/v1/merchandising/job-requests/unsold_analysis/")
        assert response.data["summary"]["sold"] == 1
        assert response.data["summary"]["not_sold"] == 1

    def test_only_completed_jobs_count(self, ns_client, ns_data):
        _stamp(_create_sample_job(ns_data["tenant"], ns_data["user"], ns_data["unsold_style"], status="pending"), 5)
        _stamp(_create_sample_job(ns_data["tenant"], ns_data["user"], ns_data["unsold_style"], status="in_progress", job_number="JOB-NS2"), 5)
        response = ns_client.get("/api/v1/merchandising/job-requests/unsold_analysis/")
        assert response.data["summary"]["total_samples"] == 0
        assert response.data["results"] == []

    def test_only_sample_job_type_counts(self, ns_client, ns_data):
        _stamp(_create_sample_job(ns_data["tenant"], ns_data["user"], ns_data["unsold_style"], job_type="pattern"), 5)
        _stamp(_create_sample_job(ns_data["tenant"], ns_data["user"], ns_data["unsold_style"], job_type="3d", job_number="JOB-NS2"), 5)
        _stamp(_create_sample_job(ns_data["tenant"], ns_data["user"], ns_data["unsold_style"], job_type="mini_marker", job_number="JOB-NS3"), 5)
        response = ns_client.get("/api/v1/merchandising/job-requests/unsold_analysis/")
        assert response.data["summary"]["total_samples"] == 0
        assert response.data["results"] == []

    def test_date_range_filtering(self, ns_client, ns_data):
        _stamp(_create_sample_job(ns_data["tenant"], ns_data["user"], ns_data["unsold_style"]), 400)
        response = ns_client.get(
            "/api/v1/merchandising/job-requests/unsold_analysis/?start_date=2026-07-01&end_date=2026-08-03"
        )
        assert response.data["summary"]["total_samples"] == 0
        assert response.data["results"] == []

    def test_date_range_includes_in_period(self, ns_client, ns_data):
        _stamp(_create_sample_job(ns_data["tenant"], ns_data["user"], ns_data["unsold_style"]), 10)
        _stamp(_create_sample_job(ns_data["tenant"], ns_data["user"], ns_data["sold_style"]), 400)
        response = ns_client.get(
            "/api/v1/merchandising/job-requests/unsold_analysis/?start_date=2026-06-01&end_date=2026-08-03"
        )
        assert response.data["summary"]["total_samples"] == 1
        assert response.data["results"][0]["style_number"] == "NS-001"

    def test_default_period_last_90_days(self, ns_client, ns_data):
        _stamp(_create_sample_job(ns_data["tenant"], ns_data["user"], ns_data["unsold_style"]), 10)
        _stamp(_create_sample_job(ns_data["tenant"], ns_data["user"], ns_data["sold_style"], job_number="JOB-NS2"), 200)
        response = ns_client.get("/api/v1/merchandising/job-requests/unsold_analysis/")
        assert response.data["summary"]["total_samples"] == 1
        assert len(response.data["results"]) == 1

    def test_sample_count_aggregates_multiple_jobs(self, ns_client, ns_data):
        _stamp(_create_sample_job(ns_data["tenant"], ns_data["user"], ns_data["unsold_style"]), 5)
        _stamp(_create_sample_job(ns_data["tenant"], ns_data["user"], ns_data["unsold_style"], job_number="JOB-NS2"), 6)
        _stamp(_create_sample_job(ns_data["tenant"], ns_data["user"], ns_data["unsold_style"], job_number="JOB-NS3"), 7)
        response = ns_client.get("/api/v1/merchandising/job-requests/unsold_analysis/")
        row = next(r for r in response.data["results"] if r["style_id"] == str(ns_data["unsold_style"].id))
        assert row["sample_count"] == 3

    def test_tenant_isolation(self, ns_client, ns_data, ns_tenant2):
        other_user = User.objects.create_user(
            username="nso", email="nso@test.com",
            password="testpass123!@#", tenant=ns_tenant2, status="active",
        )
        other_country = Country.objects.create(tenant=ns_tenant2, name="Other C", code="OC1")
        other_buyer = Buyer.objects.create(tenant=ns_tenant2, name="Other B", code="OB01", country=other_country)
        other_style = Style.objects.create(
            tenant=ns_tenant2, style_number="OS-001", name="Other Style",
            buyer=other_buyer, created_by=other_user,
        )
        _create_sample_job(ns_tenant2, other_user, other_style)
        response = ns_client.get("/api/v1/merchandising/job-requests/unsold_analysis/")
        assert response.data["summary"]["total_samples"] == 0
        assert response.data["results"] == []

    def test_status_not_sold_filter(self, ns_client, ns_data):
        _stamp(_create_sample_job(ns_data["tenant"], ns_data["user"], ns_data["unsold_style"]), 5)
        _stamp(_create_sample_job(ns_data["tenant"], ns_data["user"], ns_data["sold_style"]), 5)
        FileOpening.objects.create(
            tenant=ns_data["tenant"], file_number="FO-NS-003", style=ns_data["sold_style"],
            buyer=ns_data["buyer"], factory=ns_data["factory"],
            file_date=timezone.localdate(), created_by=ns_data["user"],
        )
        response = ns_client.get(
            "/api/v1/merchandising/job-requests/unsold_analysis/?status=not_sold"
        )
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["style_number"] == "NS-001"

    def test_status_sold_filter(self, ns_client, ns_data):
        _stamp(_create_sample_job(ns_data["tenant"], ns_data["user"], ns_data["unsold_style"]), 5)
        _stamp(_create_sample_job(ns_data["tenant"], ns_data["user"], ns_data["sold_style"]), 5)
        FileOpening.objects.create(
            tenant=ns_data["tenant"], file_number="FO-NS-004", style=ns_data["sold_style"],
            buyer=ns_data["buyer"], factory=ns_data["factory"],
            file_date=timezone.localdate(), created_by=ns_data["user"],
        )
        response = ns_client.get(
            "/api/v1/merchandising/job-requests/unsold_analysis/?status=sold"
        )
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["style_number"] == "NS-002"

    def test_main_image_included(self, ns_client, ns_data):
        _stamp(_create_sample_job(ns_data["tenant"], ns_data["user"], ns_data["unsold_style"]), 5)
        buf = BytesIO()
        Image.new("RGB", (32, 32), (10, 200, 90)).save(buf, format="PNG")
        DesignImage.objects.create(
            tenant=ns_data["tenant"], style=ns_data["unsold_style"],
            image=SimpleUploadedFile("ns.png", buf.getvalue(), content_type="image/png"),
            role="main", is_main=True, created_by=ns_data["user"],
        )
        response = ns_client.get("/api/v1/merchandising/job-requests/unsold_analysis/")
        row = next(r for r in response.data["results"] if r["style_id"] == str(ns_data["unsold_style"].id))
        assert row["main_image"] is not None

    def test_period_reflected_in_response(self, ns_client, ns_data):
        _stamp(_create_sample_job(ns_data["tenant"], ns_data["user"], ns_data["unsold_style"]), 5)
        response = ns_client.get(
            "/api/v1/merchandising/job-requests/unsold_analysis/?start_date=2026-07-01&end_date=2026-07-31"
        )
        assert response.data["period"]["start"] == "2026-07-01"
        assert response.data["period"]["end"] == "2026-07-31"
