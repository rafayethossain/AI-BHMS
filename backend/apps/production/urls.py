"""
Production URL patterns for BHMS.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProductionPlanViewSet, DailyProductionViewSet

router = DefaultRouter()
router.register(r"plans", ProductionPlanViewSet)
router.register(r"daily", DailyProductionViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
