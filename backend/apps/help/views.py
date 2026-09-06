"""
B9 Help & Onboarding views.
RQ-050: Tour completions, onboarding checklist, release notes — tenant-scoped, data-backed.
"""
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.pagination import CursorPagination
from rest_framework.response import Response

from apps.core.permissions import HasPermission
from .models import TourCompletion, OnboardingChecklistItem, ReleaseNote
from .serializers import (
    TourCompletionSerializer,
    OnboardingChecklistItemSerializer,
    ReleaseNoteSerializer,
)


class TourCompletionCursorPagination(CursorPagination):
    ordering = "-completed_at"


class OnboardingCursorPagination(CursorPagination):
    ordering = "item_key"


class ReleaseNoteCursorPagination(CursorPagination):
    ordering = "-released_at"


class TourCompletionViewSet(viewsets.ModelViewSet):
    serializer_class = TourCompletionSerializer
    permission_classes = [permissions.IsAuthenticated, HasPermission]
    pagination_class = TourCompletionCursorPagination
    required_permissions = {
        "list": "help:view",
        "retrieve": "help:view",
        "create": "help:create",
        "update": "help:edit",
        "partial_update": "help:edit",
        "destroy": "help:delete",
    }

    def get_queryset(self):
        return TourCompletion.objects.filter(
            tenant=self.request.tenant,
            user=self.request.user,
        )


class OnboardingChecklistViewSet(viewsets.ModelViewSet):
    serializer_class = OnboardingChecklistItemSerializer
    permission_classes = [permissions.IsAuthenticated, HasPermission]
    pagination_class = OnboardingCursorPagination
    required_permissions = {
        "list": "help:view",
        "retrieve": "help:view",
        "create": "help:create",
        "update": "help:edit",
        "partial_update": "help:edit",
        "destroy": "help:delete",
    }

    def get_queryset(self):
        return OnboardingChecklistItem.objects.filter(
            tenant=self.request.tenant,
            user=self.request.user,
        )

    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk=None):
        item = self.get_object()
        item.mark_completed()
        return Response(OnboardingChecklistItemSerializer(item).data)

    @action(detail=True, methods=["post"], url_path="incomplete")
    def incomplete(self, request, pk=None):
        item = self.get_object()
        item.mark_incomplete()
        return Response(OnboardingChecklistItemSerializer(item).data)


class ReleaseNoteViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ReleaseNoteSerializer
    permission_classes = [permissions.IsAuthenticated, HasPermission]
    pagination_class = ReleaseNoteCursorPagination
    required_permissions = {
        "list": "help:view",
        "retrieve": "help:view",
    }

    def get_queryset(self):
        return ReleaseNote.objects.filter(is_published=True)
