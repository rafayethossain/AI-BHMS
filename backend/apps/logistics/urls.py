"""
Logistics URLs.
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    BookingScheduleItemViewSet,
    CostReconciliationViewSet,
    DocketViewSet,
    ExportRecapViewSet,
    FinalHitReconciliationViewSet,
    FreightForwarderViewSet,
    ImportRecapViewSet,
    ShipmentViewSet,
    ShippingDocumentViewSet,
    SupplierPaymentViewSet,
)

router = DefaultRouter()
router.register(r"shipments", ShipmentViewSet)
router.register(r"documents", ShippingDocumentViewSet)
router.register(r"freight-forwarders", FreightForwarderViewSet)
router.register(r"booking-schedule", BookingScheduleItemViewSet, basename="booking-schedule")
router.register(r"dockets", DocketViewSet)
router.register(r"reconciliations", FinalHitReconciliationViewSet)
router.register(r"import-recaps", ImportRecapViewSet)
router.register(r"export-recaps", ExportRecapViewSet)
router.register(r"supplier-payments", SupplierPaymentViewSet)
router.register(r"cost-reconciliations", CostReconciliationViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
