"""
Tests for reporting app API endpoints.
"""
import pytest
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.tenants.models import Tenant
from apps.users.models import Role, UserRole, Permission, RolePermission
from apps.reporting.models import SavedReport

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def rpt_tenant(db):
    return Tenant.objects.create(
        name="Report Test Co", slug="rpt-test",
        schema_name="tenant_rpt", status="active"
    )


@pytest.fixture
def rpt_role(db, rpt_tenant):
    role = Role.objects.create(tenant=rpt_tenant, name="RptAdmin", is_system=True)
    for act in ["view", "create", "edit", "delete"]:
        perm, _ = Permission.objects.get_or_create(
            module="reports", action=act,
            defaults={"description": f"reports:{act}"}
        )
        RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def rpt_user(db, rpt_tenant, rpt_role):
    user = User.objects.create_user(
        username="rptuser", email="rpt@test.com",
        password="testpass123!@#", tenant=rpt_tenant, status="active"
    )
    UserRole.objects.create(user=user, role=rpt_role)
    return user


@pytest.fixture
def rpt_client(api_client, rpt_user):
    api_client.force_authenticate(user=rpt_user)
    return api_client


@pytest.fixture
def saved_report(rpt_tenant, rpt_user):
    return SavedReport.objects.create(
        tenant=rpt_tenant,
        name="Monthly Order Report",
        report_type="orders",
        description="Monthly summary of all orders",
        config={"filters": {"status": "confirmed"}, "columns": ["po_number", "buyer", "quantity"]},
        created_by=rpt_user,
    )


# ==================== SavedReport API Tests ====================

@pytest.mark.django_db
class TestSavedReportAPI:
    def test_create_saved_report(self, rpt_client, rpt_tenant):
        response = rpt_client.post("/api/v1/reporting/reports/", {
            "name": "Custom Report",
            "report_type": "custom",
            "description": "My custom report",
            "config": {"filters": {}},
        }, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "Custom Report"
        assert response.data["report_type"] == "custom"

    def test_list_saved_reports(self, rpt_client, saved_report):
        response = rpt_client.get("/api/v1/reporting/reports/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] >= 1

    def test_get_saved_report(self, rpt_client, saved_report):
        response = rpt_client.get(f"/api/v1/reporting/reports/{saved_report.id}/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Monthly Order Report"

    def test_update_saved_report(self, rpt_client, saved_report):
        response = rpt_client.patch(f"/api/v1/reporting/reports/{saved_report.id}/", {
            "description": "Updated description"
        })
        assert response.status_code == status.HTTP_200_OK
        assert response.data["description"] == "Updated description"

    def test_delete_saved_report(self, rpt_client, saved_report):
        response = rpt_client.delete(f"/api/v1/reporting/reports/{saved_report.id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not SavedReport.objects.filter(id=saved_report.id).exists()
