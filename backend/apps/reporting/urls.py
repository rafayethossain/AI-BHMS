"""
Reporting URLs.
"""
from rest_framework.routers import DefaultRouter
from .views import SavedReportViewSet

router = DefaultRouter()
router.register(r"reports", SavedReportViewSet)

urlpatterns = router.urls
