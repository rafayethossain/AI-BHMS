"""
User URL patterns for BHMS.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, RoleViewSet, PermissionViewSet, UserRoleViewSet, AuditLogViewSet

router = DefaultRouter()
router.register(r"roles", RoleViewSet)
router.register(r"permissions", PermissionViewSet)
router.register(r"user-roles", UserRoleViewSet)
router.register(r"audit-logs", AuditLogViewSet)
router.register(r"", UserViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
