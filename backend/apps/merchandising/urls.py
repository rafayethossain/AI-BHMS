"""
Merchandising URL patterns for BHMS.
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    BOMItemViewSet,
    BOMViewSet,
    CostingLineViewSet,
    CostingViewSet,
    DesignImageViewSet,
    FileOpeningViewSet,
    FitSpecViewSet,
    HitViewSet,
    JobRequestViewSet,
    POAmendmentViewSet,
    PurchaseOrderItemViewSet,
    PurchaseOrderViewSet,
    StyleItemViewSet,
    StyleVersionViewSet,
    StyleViewSet,
    TAMilestoneViewSet,
    TAViewSet,
)

router = DefaultRouter()
router.register(r"styles", StyleViewSet)
router.register(r"style-versions", StyleVersionViewSet)
router.register(r"style-items", StyleItemViewSet)
router.register(r"design-images", DesignImageViewSet)
router.register(r"file-openings", FileOpeningViewSet)
router.register(r"purchase-orders", PurchaseOrderViewSet)
router.register(r"po-items", PurchaseOrderItemViewSet)
router.register(r"purchase-orders/(?P<po_pk>[^/.]+)/hits", HitViewSet, basename="purchase-order-hits")
router.register(r"fit-specs", FitSpecViewSet)
router.register(r"job-requests", JobRequestViewSet)
router.register(r"po-amendments", POAmendmentViewSet)
router.register(r"boms", BOMViewSet)
router.register(r"bom-items", BOMItemViewSet)
router.register(r"costings", CostingViewSet)
router.register(r"costing-lines", CostingLineViewSet)
router.register(r"tas", TAViewSet)
router.register(r"ta-milestones", TAMilestoneViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
