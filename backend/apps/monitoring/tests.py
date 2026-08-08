"""
Tests for monitoring app.
"""
import pytest
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.users.models import Role, UserRole, Permission, RolePermission
from apps.tenants.models import Tenant
from .models import AuditLog, SystemHealth, Alert

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def mon_tenant(db):
    return Tenant.objects.create(
        name="Monitor Test Co", slug="monitor-test",
        schema_name="tenant_monitor", status="active"
    )


@pytest.fixture
def mon_role(db, mon_tenant):
    role = Role.objects.create(tenant=mon_tenant, name="MonitorAdmin", is_system=True)
    for mod in ["system"]:
        for act in ["monitor", "manage"]:
            perm, _ = Permission.objects.get_or_create(
                module=mod, action=act,
                defaults={"description": f"{mod}:{act}"}
            )
            RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def mon_user(db, mon_tenant, mon_role):
    user = User.objects.create_user(
        username="monuser", email="mon@test.com",
        password="testpass123!@#", tenant=mon_tenant, status="active"
    )
    UserRole.objects.create(user=user, role=mon_role)
    return user


@pytest.fixture
def mon_client(api_client, mon_user):
    api_client.force_authenticate(user=mon_user)
    return api_client


@pytest.fixture
def unauth_client(api_client):
    return api_client


# ==================== Health Check Tests ====================

@pytest.mark.django_db
class TestHealthCheck:
    def test_health_check_public(self, unauth_client):
        response = unauth_client.get("/api/v1/monitoring/health/")
        assert response.status_code in [200, 503]

    def test_health_check_returns_status(self, unauth_client):
        response = unauth_client.get("/api/v1/monitoring/health/")
        data = response.json()
        assert "status" in data
        assert "timestamp" in data
        assert data["status"] in ["ok", "degraded", "error"]

    def test_health_check_database_ok(self, unauth_client):
        response = unauth_client.get("/api/v1/monitoring/health/")
        data = response.json()
        assert data.get("database") == "ok"


# ==================== AuditLog Tests ====================

@pytest.mark.django_db
class TestAuditLogModel:
    def test_create_audit_log(self, mon_tenant, mon_user):
        log = AuditLog.objects.create(
            tenant=mon_tenant,
            entity_type="po",
            entity_id="123",
            entity_name="PO-001",
            action="create",
            description="Created PO",
            user=mon_user,
        )
        assert log.action == "create"
        assert log.entity_type == "po"
        assert log.entity_name == "PO-001"
        assert log.user == mon_user
        assert log.tenant == mon_tenant

    def test_audit_log_str(self, mon_tenant, mon_user):
        log = AuditLog.objects.create(
            tenant=mon_tenant,
            entity_type="style",
            entity_id="456",
            entity_name="STY-001",
            action="update",
            description="Updated style",
            user=mon_user,
        )
        assert "update" in str(log)
        assert "style" in str(log)

    def test_audit_log_ordering(self, mon_tenant, mon_user):
        log1 = AuditLog.objects.create(
            tenant=mon_tenant, entity_type="po", entity_id="1",
            entity_name="PO-001", action="create", description="First",
            user=mon_user,
        )
        log2 = AuditLog.objects.create(
            tenant=mon_tenant, entity_type="po", entity_id="2",
            entity_name="PO-002", action="update", description="Second",
            user=mon_user,
        )
        logs = list(AuditLog.objects.filter(tenant=mon_tenant))
        assert logs[0].id == log2.id
        assert logs[1].id == log1.id

    def test_audit_log_with_ip(self, mon_tenant, mon_user):
        log = AuditLog.objects.create(
            tenant=mon_tenant, entity_type="po", entity_id="1",
            entity_name="PO-001", action="create", description="Test",
            user=mon_user, ip_address="192.168.1.1",
            user_agent="Mozilla/5.0",
        )
        assert log.ip_address == "192.168.1.1"
        assert log.user_agent == "Mozilla/5.0"

    def test_audit_log_with_old_new_values(self, mon_tenant, mon_user):
        log = AuditLog.objects.create(
            tenant=mon_tenant, entity_type="po", entity_id="1",
            entity_name="PO-001", action="update", description="Test",
            user=mon_user,
            old_value={"status": "draft"},
            new_value={"status": "confirmed"},
        )
        assert log.old_value == {"status": "draft"}
        assert log.new_value == {"status": "confirmed"}

    def test_audit_log_user_nullable(self, mon_tenant):
        log = AuditLog.objects.create(
            tenant=mon_tenant, entity_type="system", entity_id="1",
            entity_name="System", action="create", description="System event",
        )
        assert log.user is None


# ==================== AuditLog API Tests ====================

@pytest.mark.django_db
class TestAuditLogAPI:
    def test_list_audit_logs(self, mon_client, mon_tenant, mon_user):
        AuditLog.objects.create(
            tenant=mon_tenant, entity_type="po", entity_id="1",
            entity_name="PO-001", action="create", description="Test",
            user=mon_user,
        )
        response = mon_client.get("/api/v1/monitoring/audit-logs/")
        assert response.status_code == status.HTTP_200_OK

    def test_retrieve_audit_log(self, mon_client, mon_tenant, mon_user):
        log = AuditLog.objects.create(
            tenant=mon_tenant, entity_type="po", entity_id="1",
            entity_name="PO-001", action="create", description="Test",
            user=mon_user,
        )
        response = mon_client.get(f"/api/v1/monitoring/audit-logs/{log.id}/")
        assert response.status_code == status.HTTP_200_OK

    def test_audit_log_read_only(self, mon_client, mon_tenant, mon_user):
        log = AuditLog.objects.create(
            tenant=mon_tenant, entity_type="po", entity_id="1",
            entity_name="PO-001", action="create", description="Test",
            user=mon_user,
        )
        response = mon_client.post("/api/v1/monitoring/audit-logs/", {
            "entity_type": "po", "entity_id": "2",
            "entity_name": "PO-002", "action": "create", "description": "Test"
        })
        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

    def test_filter_by_entity_type(self, mon_client, mon_tenant, mon_user):
        AuditLog.objects.create(
            tenant=mon_tenant, entity_type="po", entity_id="1",
            entity_name="PO-001", action="create", description="Test",
            user=mon_user,
        )
        AuditLog.objects.create(
            tenant=mon_tenant, entity_type="style", entity_id="2",
            entity_name="STY-001", action="create", description="Test",
            user=mon_user,
        )
        response = mon_client.get("/api/v1/monitoring/audit-logs/?entity_type=po")
        assert response.status_code == status.HTTP_200_OK

    def test_filter_by_action(self, mon_client, mon_tenant, mon_user):
        AuditLog.objects.create(
            tenant=mon_tenant, entity_type="po", entity_id="1",
            entity_name="PO-001", action="create", description="Test",
            user=mon_user,
        )
        AuditLog.objects.create(
            tenant=mon_tenant, entity_type="po", entity_id="2",
            entity_name="PO-002", action="update", description="Test",
            user=mon_user,
        )
        response = mon_client.get("/api/v1/monitoring/audit-logs/?action=create")
        assert response.status_code == status.HTTP_200_OK

    def test_search_audit_logs(self, mon_client, mon_tenant, mon_user):
        AuditLog.objects.create(
            tenant=mon_tenant, entity_type="po", entity_id="1",
            entity_name="PO-001", action="create",
            description="Created purchase order", user=mon_user,
        )
        response = mon_client.get("/api/v1/monitoring/audit-logs/?search=purchase")
        assert response.status_code == status.HTTP_200_OK


# ==================== Alert Model Tests ====================

@pytest.mark.django_db
class TestAlertModel:
    def test_create_alert(self, mon_tenant):
        alert = Alert.objects.create(
            tenant=mon_tenant,
            alert_type="warning",
            service="production",
            title="Low Stock",
            message="Fabric stock is running low",
        )
        assert alert.alert_type == "warning"
        assert alert.service == "production"
        assert alert.is_read is False
        assert alert.is_resolved is False

    def test_alert_str(self, mon_tenant):
        alert = Alert.objects.create(
            tenant=mon_tenant,
            alert_type="critical",
            service="system",
            title="System Down",
            message="System is down",
        )
        assert "[critical]" in str(alert)
        assert "System Down" in str(alert)

    def test_alert_ordering(self, mon_tenant):
        alert1 = Alert.objects.create(
            tenant=mon_tenant, alert_type="info", service="system",
            title="Alert 1", message="msg1",
        )
        alert2 = Alert.objects.create(
            tenant=mon_tenant, alert_type="warning", service="system",
            title="Alert 2", message="msg2",
        )
        alerts = list(Alert.objects.filter(tenant=mon_tenant))
        assert alerts[0].id == alert2.id
        assert alerts[1].id == alert1.id

    def test_alert_with_entity(self, mon_tenant):
        alert = Alert.objects.create(
            tenant=mon_tenant, alert_type="info", service="shipment",
            title="Shipment Delayed", message="Shipment is delayed",
            entity_type="shipment", entity_id="SHIP-001",
        )
        assert alert.entity_type == "shipment"
        assert alert.entity_id == "SHIP-001"

    def test_alert_resolve(self, mon_tenant, mon_user):
        alert = Alert.objects.create(
            tenant=mon_tenant, alert_type="critical", service="system",
            title="Critical Alert", message="Something wrong",
        )
        alert.is_resolved = True
        alert.resolved_by = mon_user
        alert.resolved_at = timezone.now()
        alert.save(update_fields=["is_resolved", "resolved_by", "resolved_at"])
        alert.refresh_from_db()
        assert alert.is_resolved is True
        assert alert.resolved_by == mon_user
        assert alert.resolved_at is not None


# ==================== Alert API Tests ====================

@pytest.mark.django_db
class TestAlertAPI:
    def test_list_alerts(self, mon_client, mon_tenant):
        Alert.objects.create(
            tenant=mon_tenant, alert_type="warning", service="production",
            title="Alert 1", message="msg",
        )
        response = mon_client.get("/api/v1/monitoring/alerts/")
        assert response.status_code == status.HTTP_200_OK

    def test_create_alert(self, mon_client):
        response = mon_client.post("/api/v1/monitoring/alerts/", {
            "alert_type": "warning",
            "service": "production",
            "title": "Test Alert",
            "message": "This is a test",
        })
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["title"] == "Test Alert"

    def test_retrieve_alert(self, mon_client, mon_tenant):
        alert = Alert.objects.create(
            tenant=mon_tenant, alert_type="info", service="system",
            title="Info Alert", message="msg",
        )
        response = mon_client.get(f"/api/v1/monitoring/alerts/{alert.id}/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == "Info Alert"

    def test_resolve_alert(self, mon_client, mon_tenant, mon_user):
        alert = Alert.objects.create(
            tenant=mon_tenant, alert_type="critical", service="system",
            title="Critical Alert", message="Something is wrong",
        )
        response = mon_client.post(f"/api/v1/monitoring/alerts/{alert.id}/resolve/")
        assert response.status_code == status.HTTP_200_OK
        alert.refresh_from_db()
        assert alert.is_resolved is True

    def test_mark_read_alert(self, mon_client, mon_tenant):
        alert = Alert.objects.create(
            tenant=mon_tenant, alert_type="warning", service="production",
            title="Unread Alert", message="msg",
        )
        response = mon_client.post(f"/api/v1/monitoring/alerts/{alert.id}/mark_read/")
        assert response.status_code == status.HTTP_200_OK
        alert.refresh_from_db()
        assert alert.is_read is True

    def test_alert_summary(self, mon_client, mon_tenant):
        Alert.objects.create(
            tenant=mon_tenant, alert_type="critical", service="system",
            title="Alert 1", message="msg",
        )
        Alert.objects.create(
            tenant=mon_tenant, alert_type="warning", service="production",
            title="Alert 2", message="msg", is_read=True,
        )
        Alert.objects.create(
            tenant=mon_tenant, alert_type="info", service="quality",
            title="Alert 3", message="msg", is_resolved=True,
        )
        response = mon_client.get("/api/v1/monitoring/alerts/summary/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total"] == 3
        assert data["unread"] == 2
        assert data["critical"] == 1
        assert data["warning"] == 1
        assert data["unresolved"] == 2

    def test_filter_alerts_by_type(self, mon_client, mon_tenant):
        Alert.objects.create(
            tenant=mon_tenant, alert_type="critical", service="system",
            title="Critical", message="msg",
        )
        Alert.objects.create(
            tenant=mon_tenant, alert_type="warning", service="system",
            title="Warning", message="msg",
        )
        response = mon_client.get("/api/v1/monitoring/alerts/?alert_type=critical")
        assert response.status_code == status.HTTP_200_OK

    def test_filter_alerts_by_service(self, mon_client, mon_tenant):
        Alert.objects.create(
            tenant=mon_tenant, alert_type="info", service="production",
            title="Production Alert", message="msg",
        )
        Alert.objects.create(
            tenant=mon_tenant, alert_type="info", service="quality",
            title="Quality Alert", message="msg",
        )
        response = mon_client.get("/api/v1/monitoring/alerts/?service=production")
        assert response.status_code == status.HTTP_200_OK

    def test_filter_alerts_by_read_status(self, mon_client, mon_tenant):
        Alert.objects.create(
            tenant=mon_tenant, alert_type="info", service="system",
            title="Unread", message="msg",
        )
        Alert.objects.create(
            tenant=mon_tenant, alert_type="info", service="system",
            title="Read", message="msg", is_read=True,
        )
        response = mon_client.get("/api/v1/monitoring/alerts/?is_read=false")
        assert response.status_code == status.HTTP_200_OK

    def test_search_alerts(self, mon_client, mon_tenant):
        Alert.objects.create(
            tenant=mon_tenant, alert_type="info", service="system",
            title="Database Connection", message="DB is slow",
        )
        response = mon_client.get("/api/v1/monitoring/alerts/?search=database")
        assert response.status_code == status.HTTP_200_OK


# ==================== SystemHealth Model Tests ====================

@pytest.mark.django_db
class TestSystemHealthModel:
    def test_create_health_check(self, mon_tenant):
        health = SystemHealth.objects.create(
            tenant=mon_tenant,
            service="database",
            status="healthy",
            response_time_ms=15,
            message="Connection successful",
        )
        assert health.service == "database"
        assert health.status == "healthy"
        assert health.response_time_ms == 15

    def test_health_str(self, mon_tenant):
        health = SystemHealth.objects.create(
            tenant=mon_tenant, service="cache", status="degraded",
        )
        assert "cache" in str(health)
        assert "degraded" in str(health)

    def test_health_ordering(self, mon_tenant):
        h1 = SystemHealth.objects.create(
            tenant=mon_tenant, service="database", status="healthy",
        )
        h2 = SystemHealth.objects.create(
            tenant=mon_tenant, service="cache", status="healthy",
        )
        healths = list(SystemHealth.objects.filter(tenant=mon_tenant))
        assert healths[0].id == h2.id
        assert healths[1].id == h1.id

    def test_health_down_status(self, mon_tenant):
        health = SystemHealth.objects.create(
            tenant=mon_tenant, service="celery", status="down",
            message="Worker not responding",
        )
        assert health.status == "down"
        assert health.message == "Worker not responding"


# ==================== SystemHealth API Tests ====================

@pytest.mark.django_db
class TestSystemHealthAPI:
    def test_list_health_checks(self, mon_client, mon_tenant):
        SystemHealth.objects.create(
            tenant=mon_tenant, service="database", status="healthy",
            response_time_ms=10,
        )
        response = mon_client.get("/api/v1/monitoring/system-health/")
        assert response.status_code == status.HTTP_200_OK

    def test_retrieve_health_check(self, mon_client, mon_tenant):
        health = SystemHealth.objects.create(
            tenant=mon_tenant, service="database", status="healthy",
        )
        response = mon_client.get(f"/api/v1/monitoring/system-health/{health.id}/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["service"] == "database"

    def test_health_read_only(self, mon_client, mon_tenant):
        response = mon_client.post("/api/v1/monitoring/system-health/", {
            "service": "database", "status": "healthy"
        })
        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

    def test_run_health_checks(self, mon_client):
        response = mon_client.post("/api/v1/monitoring/system-health/run_checks/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "overall" in data
        assert "checks" in data
        assert isinstance(data["checks"], list)
        assert len(data["checks"]) > 0

    def test_run_health_checks_overall_status(self, mon_client):
        response = mon_client.post("/api/v1/monitoring/system-health/run_checks/")
        data = response.json()
        assert data["overall"] in ["healthy", "degraded"]

    def test_run_health_checks_database_check(self, mon_client):
        response = mon_client.post("/api/v1/monitoring/system-health/run_checks/")
        data = response.json()
        db_checks = [c for c in data["checks"] if c["service"] == "database"]
        assert len(db_checks) == 1
        assert db_checks[0]["status"] in ["healthy", "down"]

    def test_filter_health_by_service(self, mon_client, mon_tenant):
        SystemHealth.objects.create(
            tenant=mon_tenant, service="database", status="healthy",
        )
        SystemHealth.objects.create(
            tenant=mon_tenant, service="cache", status="degraded",
        )
        response = mon_client.get("/api/v1/monitoring/system-health/?service=database")
        assert response.status_code == status.HTTP_200_OK

    def test_filter_health_by_status(self, mon_client, mon_tenant):
        SystemHealth.objects.create(
            tenant=mon_tenant, service="database", status="healthy",
        )
        SystemHealth.objects.create(
            tenant=mon_tenant, service="cache", status="down",
        )
        response = mon_client.get("/api/v1/monitoring/system-health/?status=down")
        assert response.status_code == status.HTTP_200_OK


# ==================== Authentication Tests ====================

@pytest.mark.django_db
class TestMonitoringAuth:
    def test_unauthenticated_list_alerts(self, unauth_client):
        response = unauth_client.get("/api/v1/monitoring/alerts/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_unauthenticated_list_audit_logs(self, unauth_client):
        response = unauth_client.get("/api/v1/monitoring/audit-logs/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_unauthenticated_health_list(self, unauth_client):
        response = unauth_client.get("/api/v1/monitoring/system-health/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_authenticated_health_check(self, mon_client):
        response = mon_client.get("/api/v1/monitoring/system-health/")
        assert response.status_code == status.HTTP_200_OK


# ==================== Middleware Tests ====================

@pytest.mark.django_db
class TestAuditLogMiddleware:
    def test_middleware_creates_log_on_post(self, mon_client, mon_tenant, mon_user):
        initial_count = AuditLog.objects.filter(tenant=mon_tenant).count()
        mon_client.post("/api/v1/monitoring/alerts/", {
            "alert_type": "info", "service": "system",
            "title": "Middleware Test", "message": "msg",
        })
        new_count = AuditLog.objects.filter(tenant=mon_tenant).count()
        assert new_count > initial_count

    def test_middleware_logs_user(self, mon_client, mon_tenant, mon_user):
        mon_client.post("/api/v1/monitoring/alerts/", {
            "alert_type": "info", "service": "system",
            "title": "User Test", "message": "msg",
        })
        log = AuditLog.objects.filter(
            tenant=mon_tenant, entity_type="alerts"
        ).order_by("-created_at").first()
        if log:
            assert log.user == mon_user
