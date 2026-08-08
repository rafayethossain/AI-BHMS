"""
Quality URL patterns for BHMS.
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ComplianceAuditViewSet,
    CorrectiveActionViewSet,
    GoldSealViewSet,
    InspectionItemViewSet,
    InspectionViewSet,
)

router = DefaultRouter()
router.register(r"inspections", InspectionViewSet)
router.register(r"inspection-items", InspectionItemViewSet)
router.register(r"corrective-actions", CorrectiveActionViewSet)
router.register(r"gold-seals", GoldSealViewSet)
router.register(r"compliance-audits", ComplianceAuditViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
