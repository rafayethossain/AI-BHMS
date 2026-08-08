"""
Monitoring views for BHMS.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from django.db import connection
from apps.core.permissions import HasPermission
from .models import AuditLog, SystemHealth, Alert
from .serializers import AuditLogSerializer, SystemHealthSerializer, AlertSerializer
from apps.core.pagination import StandardResultsSetPagination


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    """Public health check endpoint."""
    health_status = {"status": "ok", "timestamp": timezone.now().isoformat()}
    errors = []

    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        health_status["database"] = "ok"
    except Exception as e:
        health_status["database"] = "error"
        errors.append(f"Database: {str(e)}")

    if errors:
        health_status["status"] = "degraded"
        health_status["errors"] = errors

    return Response(health_status, status=status.HTTP_200_OK if not errors else status.HTTP_503_SERVICE_UNAVAILABLE)


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    pagination_class = StandardResultsSetPagination
    search_fields = ["entity_name", "description"]
    filterset_fields = ["entity_type", "action", "user"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {"list": "system:monitor", "retrieve": "system:monitor"}

    def get_queryset(self):
        return AuditLog.objects.filter(tenant=self.request.tenant)


class SystemHealthViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SystemHealth.objects.all()
    serializer_class = SystemHealthSerializer
    pagination_class = StandardResultsSetPagination
    filterset_fields = ["service", "status"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {"list": "system:monitor", "retrieve": "system:monitor"}

    def get_queryset(self):
        return SystemHealth.objects.filter(tenant=self.request.tenant)

    @action(detail=False, methods=["post"])
    def run_checks(self, request):
        results = []

        try:
            start = timezone.now()
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            elapsed = int((timezone.now() - start).total_seconds() * 1000)
            SystemHealth.objects.create(
                tenant=request.tenant,
                service="database",
                status="healthy",
                response_time_ms=elapsed,
                message="Connection successful"
            )
            results.append({"service": "database", "status": "healthy", "response_time_ms": elapsed})
        except Exception as e:
            SystemHealth.objects.create(
                tenant=request.tenant,
                service="database",
                status="down",
                message=str(e)
            )
            results.append({"service": "database", "status": "down", "message": str(e)})

        import os
        import shutil
        try:
            media_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "media")
            if os.path.exists(media_path):
                usage = shutil.disk_usage(media_path)
                free_gb = round(usage.free / (1024**3), 2)
                status_val = "healthy" if free_gb > 1 else "degraded" if free_gb > 0.1 else "down"
                SystemHealth.objects.create(
                    tenant=request.tenant,
                    service="storage",
                    status=status_val,
                    message=f"Free space: {free_gb} GB"
                )
                results.append({"service": "storage", "status": status_val, "free_gb": free_gb})
            else:
                results.append({"service": "storage", "status": "healthy", "message": "Media directory not configured"})
        except Exception as e:
            results.append({"service": "storage", "status": "down", "message": str(e)})

        try:
            from django.core.cache import cache
            cache.set("health_check", "ok", 10)
            if cache.get("health_check") == "ok":
                SystemHealth.objects.create(
                    tenant=request.tenant,
                    service="cache",
                    status="healthy",
                    message="Redis responding"
                )
                results.append({"service": "cache", "status": "healthy"})
            else:
                results.append({"service": "cache", "status": "degraded"})
        except Exception as e:
            results.append({"service": "cache", "status": "down", "message": str(e)})

        overall = "healthy" if all(r.get("status") == "healthy" for r in results) else "degraded"
        return Response({"overall": overall, "checks": results})


class AlertViewSet(viewsets.ModelViewSet):
    queryset = Alert.objects.all()
    serializer_class = AlertSerializer
    pagination_class = StandardResultsSetPagination
    search_fields = ["title", "message"]
    filterset_fields = ["alert_type", "service", "is_read", "is_resolved"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {
        "list": "system:monitor", "retrieve": "system:monitor",
        "create": "system:manage", "update": "system:manage",
        "destroy": "system:manage",
    }

    def get_queryset(self):
        return Alert.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        alert = self.get_object()
        alert.is_resolved = True
        alert.resolved_by = request.user
        alert.resolved_at = timezone.now()
        alert.save(update_fields=["is_resolved", "resolved_by", "resolved_at"])
        return Response({"status": "resolved"})

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        alert = self.get_object()
        alert.is_read = True
        alert.save(update_fields=["is_read"])
        return Response({"status": "read"})

    @action(detail=False, methods=["get"])
    def summary(self, request):
        tenant = request.tenant
        qs = Alert.objects.filter(tenant=tenant)
        return Response({
            "total": qs.count(),
            "unread": qs.filter(is_read=False).count(),
            "unresolved": qs.filter(is_resolved=False).count(),
            "critical": qs.filter(alert_type="critical", is_resolved=False).count(),
            "warning": qs.filter(alert_type="warning", is_resolved=False).count(),
        })