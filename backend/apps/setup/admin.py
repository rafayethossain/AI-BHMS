"""
Setup admin configuration.
"""
from django.contrib import admin
from .models import (
    Season, ProductCategory, ProductType, ProductDepartment,
    ComplianceDocumentType, DeliveryMode, UOM, Currency,
    Department, Designation, PaymentTerms, Country, ColorCode,
    Buyer, Brand, Factory, Vendor
)


@admin.register(Season)
class SeasonAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "start_date", "end_date", "status"]
    list_filter = ["status"]
    search_fields = ["code", "name"]


@admin.register(ProductCategory)
class ProductCategoryAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "parent", "status"]
    list_filter = ["status"]
    search_fields = ["code", "name"]


@admin.register(ProductType)
class ProductTypeAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "category", "status"]
    list_filter = ["category", "status"]
    search_fields = ["code", "name"]


@admin.register(ProductDepartment)
class ProductDepartmentAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "status"]
    list_filter = ["status"]
    search_fields = ["code", "name"]


@admin.register(ComplianceDocumentType)
class ComplianceDocumentTypeAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "validity_days", "status"]
    list_filter = ["status"]
    search_fields = ["code", "name"]


@admin.register(DeliveryMode)
class DeliveryModeAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "status"]
    list_filter = ["status"]
    search_fields = ["code", "name"]


@admin.register(UOM)
class UOMAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "status"]
    list_filter = ["status"]
    search_fields = ["code", "name"]


@admin.register(Currency)
class CurrencyAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "symbol", "exchange_rate", "is_default", "status"]
    list_filter = ["status", "is_default"]
    search_fields = ["code", "name"]


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "status"]
    list_filter = ["status"]
    search_fields = ["code", "name"]


@admin.register(Designation)
class DesignationAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "status"]
    list_filter = ["status"]
    search_fields = ["code", "name"]


@admin.register(PaymentTerms)
class PaymentTermsAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "days", "status"]
    list_filter = ["status"]
    search_fields = ["code", "name"]


@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "default_currency", "status"]
    list_filter = ["status"]
    search_fields = ["code", "name"]


@admin.register(ColorCode)
class ColorCodeAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "hex_code", "status"]
    list_filter = ["status"]
    search_fields = ["code", "name"]


@admin.register(Buyer)
class BuyerAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "country", "status"]
    list_filter = ["status", "country"]
    search_fields = ["code", "name"]


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "buyer", "status"]
    list_filter = ["status", "buyer"]
    search_fields = ["code", "name"]


@admin.register(Factory)
class FactoryAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "factory_type", "status"]
    list_filter = ["status", "factory_type"]
    search_fields = ["code", "name"]


@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "rating", "status"]
    list_filter = ["status"]
    search_fields = ["code", "name"]
