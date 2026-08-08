"""
Monitoring URLs.
"""
from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import AuditLogViewSet, SystemHealthViewSet, AlertViewSet, health_check

router = DefaultRouter()
router.register(r"audit-logs", AuditLogViewSet)
router.register(r"system-health", SystemHealthViewSet)
router.register(r"alerts", AlertViewSet)

urlpatterns = [
    path("health/", health_check, name="monitoring-health"),
] + router.urls
