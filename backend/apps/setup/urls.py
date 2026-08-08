"""
Setup URL patterns for BHMS.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SeasonViewSet, ProductCategoryViewSet, ProductTypeViewSet,
    ProductDepartmentViewSet, ComplianceDocumentTypeViewSet,
    DeliveryModeViewSet, UOMViewSet, CurrencyViewSet,
    DepartmentViewSet, DesignationViewSet, PaymentTermsViewSet,
    CountryViewSet, ColorCodeViewSet, BuyerViewSet, BrandViewSet,
    FactoryViewSet, VendorViewSet, RiskLevelViewSet, OfficeViewSet
)
from .import_views import SetupImportView

router = DefaultRouter()
router.register(r"seasons", SeasonViewSet)
router.register(r"product-categories", ProductCategoryViewSet)
router.register(r"product-types", ProductTypeViewSet)
router.register(r"product-departments", ProductDepartmentViewSet)
router.register(r"compliance-document-types", ComplianceDocumentTypeViewSet)
router.register(r"delivery-modes", DeliveryModeViewSet)
router.register(r"uoms", UOMViewSet)
router.register(r"currencies", CurrencyViewSet)
router.register(r"departments", DepartmentViewSet)
router.register(r"designations", DesignationViewSet)
router.register(r"payment-terms", PaymentTermsViewSet)
router.register(r"countries", CountryViewSet)
router.register(r"color-codes", ColorCodeViewSet)
router.register(r"buyers", BuyerViewSet)
router.register(r"brands", BrandViewSet)
router.register(r"factories", FactoryViewSet)
router.register(r"vendors", VendorViewSet)
router.register(r"risk-levels", RiskLevelViewSet)
router.register(r"offices", OfficeViewSet)

urlpatterns = [
    path("import/", SetupImportView.as_view(), name="setup-import"),
    path("", include(router.urls)),
]
