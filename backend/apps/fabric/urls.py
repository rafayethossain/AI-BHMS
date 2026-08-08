from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    FabricBookingViewSet,
    FabricCategoryViewSet,
    FabricMillViewSet,
    FabricOrderViewSet,
    FabricSupplierViewSet,
    FabricToleranceViewSet,
    FabricUtilizationViewSet,
    HTSCodeViewSet,
    RFQLineItemViewSet,
    RFQResponseItemViewSet,
    RFQResponseViewSet,
    RFQViewSet,
)

router = DefaultRouter()
router.register(r"categories", FabricCategoryViewSet)
router.register(r"hts-codes", HTSCodeViewSet)
router.register(r"suppliers", FabricSupplierViewSet)
router.register(r"mills", FabricMillViewSet)
router.register(r"rfqs", RFQViewSet)
router.register(r"rfq-line-items", RFQLineItemViewSet)
router.register(r"rfq-responses", RFQResponseViewSet)
router.register(r"rfq-response-items", RFQResponseItemViewSet)
router.register(r"bookings", FabricBookingViewSet)
router.register(r"orders", FabricOrderViewSet)
router.register(r"tolerances", FabricToleranceViewSet)
router.register(r"utilizations", FabricUtilizationViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
