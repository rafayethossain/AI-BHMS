"""
Setup views for BHMS.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.core.permissions import HasPermission
from .models import (
    Season, ProductCategory, ProductType, ProductDepartment,
    ComplianceDocumentType, DeliveryMode, UOM, Currency,
    Department, Designation, PaymentTerms, Country, ColorCode,
    Buyer, Brand, Factory, Vendor, RiskLevel
)
from apps.tenants.models import Office
from .serializers import (
    SeasonSerializer, ProductCategorySerializer, ProductTypeSerializer,
    ProductDepartmentSerializer, ComplianceDocumentTypeSerializer,
    DeliveryModeSerializer, UOMSerializer, CurrencySerializer,
    DepartmentSerializer, DesignationSerializer, PaymentTermsSerializer,
    CountrySerializer, ColorCodeSerializer, BuyerSerializer, BrandSerializer,
    FactorySerializer, VendorSerializer, RiskLevelSerializer, OfficeSerializer
)
from apps.core.pagination import SmallResultsSetPagination


class TenantViewSetMixin:
    """Mixin that filters by tenant and auto-sets tenant on create."""

    def get_queryset(self):
        qs = super().get_queryset()
        tenant = self.request.tenant
        return qs.filter(tenant=tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant, created_by=self.request.user)


SETUP_PERMS = {
    "list": "setup:view", "retrieve": "setup:view",
    "create": "setup:create", "update": "setup:edit",
    "partial_update": "setup:edit", "destroy": "setup:delete",
}


class SeasonViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = Season.objects.all()
    serializer_class = SeasonSerializer
    pagination_class = SmallResultsSetPagination
    search_fields = ["code", "name"]
    filterset_fields = ["status"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = SETUP_PERMS


class ProductCategoryViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = ProductCategory.objects.all()
    serializer_class = ProductCategorySerializer
    pagination_class = SmallResultsSetPagination
    search_fields = ["code", "name"]
    filterset_fields = ["status", "parent"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = SETUP_PERMS


class ProductTypeViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = ProductType.objects.all()
    serializer_class = ProductTypeSerializer
    pagination_class = SmallResultsSetPagination
    search_fields = ["code", "name"]
    filterset_fields = ["status", "category"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = SETUP_PERMS


class ProductDepartmentViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = ProductDepartment.objects.all()
    serializer_class = ProductDepartmentSerializer
    pagination_class = SmallResultsSetPagination
    search_fields = ["code", "name"]
    filterset_fields = ["status"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = SETUP_PERMS


class ComplianceDocumentTypeViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = ComplianceDocumentType.objects.all()
    serializer_class = ComplianceDocumentTypeSerializer
    pagination_class = SmallResultsSetPagination
    search_fields = ["code", "name"]
    filterset_fields = ["status"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = SETUP_PERMS


class DeliveryModeViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = DeliveryMode.objects.all()
    serializer_class = DeliveryModeSerializer
    pagination_class = SmallResultsSetPagination
    search_fields = ["code", "name"]
    filterset_fields = ["status"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = SETUP_PERMS


class UOMViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = UOM.objects.all()
    serializer_class = UOMSerializer
    pagination_class = SmallResultsSetPagination
    search_fields = ["code", "name"]
    filterset_fields = ["status"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = SETUP_PERMS


class CurrencyViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = Currency.objects.all()
    serializer_class = CurrencySerializer
    pagination_class = SmallResultsSetPagination
    search_fields = ["code", "name"]
    filterset_fields = ["status", "is_default"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = SETUP_PERMS


class DepartmentViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    pagination_class = SmallResultsSetPagination
    search_fields = ["code", "name"]
    filterset_fields = ["status"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = SETUP_PERMS


class DesignationViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = Designation.objects.all()
    serializer_class = DesignationSerializer
    pagination_class = SmallResultsSetPagination
    search_fields = ["code", "name"]
    filterset_fields = ["status"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = SETUP_PERMS


class PaymentTermsViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = PaymentTerms.objects.all()
    serializer_class = PaymentTermsSerializer
    pagination_class = SmallResultsSetPagination
    search_fields = ["code", "name"]
    filterset_fields = ["status"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = SETUP_PERMS


class CountryViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = Country.objects.all()
    serializer_class = CountrySerializer
    pagination_class = SmallResultsSetPagination
    search_fields = ["code", "name"]
    filterset_fields = ["status"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = SETUP_PERMS


class ColorCodeViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = ColorCode.objects.all()
    serializer_class = ColorCodeSerializer
    pagination_class = SmallResultsSetPagination
    search_fields = ["code", "name"]
    filterset_fields = ["status"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = SETUP_PERMS


class BuyerViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = Buyer.objects.all()
    serializer_class = BuyerSerializer
    pagination_class = SmallResultsSetPagination
    search_fields = ["code", "name"]
    filterset_fields = ["status", "country"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = SETUP_PERMS

    @action(detail=True, methods=["get"])
    def brands(self, request, pk=None):
        buyer = self.get_object()
        brands = Brand.objects.filter(tenant=request.tenant, buyer=buyer)
        serializer = BrandSerializer(brands, many=True)
        return Response(serializer.data)


class BrandViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    pagination_class = SmallResultsSetPagination
    search_fields = ["code", "name"]
    filterset_fields = ["status", "buyer"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = SETUP_PERMS


class FactoryViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = Factory.objects.all()
    serializer_class = FactorySerializer
    pagination_class = SmallResultsSetPagination
    search_fields = ["code", "name"]
    filterset_fields = ["status", "factory_type"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = SETUP_PERMS


class VendorViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = Vendor.objects.all()
    serializer_class = VendorSerializer
    pagination_class = SmallResultsSetPagination
    search_fields = ["code", "name"]
    filterset_fields = ["status"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = SETUP_PERMS


class RiskLevelViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = RiskLevel.objects.all()
    serializer_class = RiskLevelSerializer
    pagination_class = SmallResultsSetPagination
    search_fields = ["code", "name", "description"]
    filterset_fields = ["status", "color"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = SETUP_PERMS


class OfficeViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = Office.objects.all()
    serializer_class = OfficeSerializer
    pagination_class = SmallResultsSetPagination
    search_fields = ["name", "city"]
    filterset_fields = ["office_type", "is_active"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = SETUP_PERMS

    def get_queryset(self):
        return Office.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant, created_by=self.request.user)