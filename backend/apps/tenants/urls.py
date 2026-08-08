"""
Tenant URL patterns for BHMS.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TenantViewSet, OfficeViewSet

router = DefaultRouter()
router.register(r"offices", OfficeViewSet, basename="tenant-office")
router.register(r"", TenantViewSet, basename="tenant")

urlpatterns = [
    path("", include(router.urls)),
]
