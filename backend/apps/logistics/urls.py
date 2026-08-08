"""
Logistics URLs.
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    BookingScheduleItemViewSet,
    DocketViewSet,
    FinalHitReconciliationViewSet,
    FreightForwarderViewSet,
    ShipmentViewSet,
    ShippingDocumentViewSet,
)

router = DefaultRouter()
router.register(r"shipments", ShipmentViewSet)
router.register(r"documents", ShippingDocumentViewSet)
router.register(r"freight-forwarders", FreightForwarderViewSet)
router.register(r"booking-schedule", BookingScheduleItemViewSet, basename="booking-schedule")
router.register(r"dockets", DocketViewSet)
router.register(r"reconciliations", FinalHitReconciliationViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
