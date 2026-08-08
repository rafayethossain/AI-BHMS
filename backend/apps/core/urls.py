"""
Core URL patterns for BHMS.
"""
from django.urls import path
from .views import HealthCheckView, DashboardSummaryView

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="health-check"),
    path("dashboard/summary/", DashboardSummaryView.as_view(), name="dashboard-summary"),
]
