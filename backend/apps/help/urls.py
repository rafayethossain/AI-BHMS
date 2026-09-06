"""
B9 Help & Onboarding URL configuration.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TourCompletionViewSet, OnboardingChecklistViewSet, ReleaseNoteViewSet

router = DefaultRouter()
router.register(r"tour-completions", TourCompletionViewSet, basename="tour-completion")
router.register(r"onboarding", OnboardingChecklistViewSet, basename="onboarding-checklist")
router.register(r"release-notes", ReleaseNoteViewSet, basename="release-note")

urlpatterns = [
    path("", include(router.urls)),
]
