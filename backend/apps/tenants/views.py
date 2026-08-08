"""
Tenant views for BHMS.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Tenant, Office
from .serializers import TenantSerializer, OfficeSerializer
from apps.core.pagination import StandardResultsSetPagination


class TenantViewSet(viewsets.ModelViewSet):
    """
    Tenant viewset.
    """
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer
    pagination_class = StandardResultsSetPagination
    ordering = ["-created_at"]
    search_fields = ["name", "slug"]
    filterset_fields = ["status", "plan"]

    def get_queryset(self):
        """Fail-closed: expose only the requesting tenant's own record."""
        tenant = self.request.tenant
        if tenant is None:
            return Tenant.objects.none()
        return Tenant.objects.filter(id=tenant.id)

    @action(detail=False, methods=["get", "patch"], url_path="current")
    def current(self, request):
        tenant = request.tenant
        if not tenant:
            return Response(
                {"error": "No tenant associated with this request"},
                status=status.HTTP_404_NOT_FOUND,
            )
        if request.method == "PATCH":
            serializer = TenantSerializer(tenant, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        serializer = TenantSerializer(tenant)
        return Response(serializer.data)


class OfficeViewSet(viewsets.ModelViewSet):
    """
    Office viewset.
    """
    serializer_class = OfficeSerializer
    pagination_class = StandardResultsSetPagination
    search_fields = ["code", "name"]
    filterset_fields = ["office_type", "status"]
    
    def get_queryset(self):
        return Office.objects.filter(tenant=self.request.tenant)
    
    def perform_create(self, serializer):
        serializer.save(
            tenant=self.request.tenant,
            created_by=self.request.user
        )
