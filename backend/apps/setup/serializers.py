"""
Setup serializers for BHMS.
"""
from rest_framework import serializers
from .models import (
    Season, ProductCategory, ProductType, ProductDepartment,
    ComplianceDocumentType, DeliveryMode, UOM, Currency,
    Department, Designation, PaymentTerms, Country, ColorCode,
    Buyer, Brand, Factory, Vendor, RiskLevel
)
from apps.tenants.models import Office


class SeasonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Season
        fields = ["id", "code", "name", "start_date", "end_date", "status", "created_at"]
        read_only_fields = ["id", "created_at"]


class ProductCategorySerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()
    parent_name = serializers.CharField(source="parent.name", read_only=True, default=None)
    
    class Meta:
        model = ProductCategory
        fields = ["id", "code", "name", "parent", "parent_name", "children", "status", "created_at"]
        read_only_fields = ["id", "created_at"]
    
    def get_children(self, obj):
        depth = self.context.get("category_depth", 0)
        if depth >= 2:
            return []
        return ProductCategorySerializer(
            obj.children.all(), many=True,
            context={**self.context, "category_depth": depth + 1}
        ).data


class ProductTypeSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    
    class Meta:
        model = ProductType
        fields = ["id", "code", "name", "category", "category_name", "status", "created_at"]
        read_only_fields = ["id", "created_at"]


class ProductDepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductDepartment
        fields = ["id", "code", "name", "status", "created_at"]
        read_only_fields = ["id", "created_at"]


class ComplianceDocumentTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComplianceDocumentType
        fields = ["id", "code", "name", "description", "validity_days", "status", "created_at"]
        read_only_fields = ["id", "created_at"]


class DeliveryModeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryMode
        fields = ["id", "code", "name", "description", "status", "created_at"]
        read_only_fields = ["id", "created_at"]


class UOMSerializer(serializers.ModelSerializer):
    class Meta:
        model = UOM
        fields = ["id", "code", "name", "status", "created_at"]
        read_only_fields = ["id", "created_at"]


class CurrencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Currency
        fields = ["id", "code", "name", "symbol", "exchange_rate", "is_default", "status", "created_at"]
        read_only_fields = ["id", "created_at"]


class DepartmentSerializer(serializers.ModelSerializer):
    parent_name = serializers.CharField(source="parent.name", read_only=True, default=None)
    
    class Meta:
        model = Department
        fields = ["id", "code", "name", "parent", "parent_name", "status", "description", "created_at"]
        read_only_fields = ["id", "created_at"]


class DesignationSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True, default=None)
    
    class Meta:
        model = Designation
        fields = ["id", "code", "name", "department", "department_name", "description", "status", "created_at"]
        read_only_fields = ["id", "created_at"]


class PaymentTermsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentTerms
        fields = ["id", "code", "name", "days", "description", "status", "created_at"]
        read_only_fields = ["id", "created_at"]


class CountrySerializer(serializers.ModelSerializer):
    default_currency_code = serializers.CharField(source="default_currency.code", read_only=True)
    
    class Meta:
        model = Country
        fields = ["id", "code", "name", "default_currency", "default_currency_code", "status", "created_at"]
        read_only_fields = ["id", "created_at"]


class ColorCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ColorCode
        fields = ["id", "code", "name", "hex_code", "status", "created_at"]
        read_only_fields = ["id", "created_at"]


class BuyerSerializer(serializers.ModelSerializer):
    country_name = serializers.CharField(source="country.name", read_only=True, default=None)
    currency_code = serializers.CharField(source="currency.code", read_only=True, default=None)
    payment_terms_name = serializers.CharField(source="payment_terms.name", read_only=True, default=None)
    
    class Meta:
        model = Buyer
        fields = [
            "id", "code", "name", "contact_person", "email", "phone", "address",
            "country", "country_name", "currency", "currency_code",
            "payment_terms", "payment_terms_name", "credit_limit", "status", "notes", "created_at"
        ]
        read_only_fields = ["id", "created_at"]


class BrandSerializer(serializers.ModelSerializer):
    buyer_name = serializers.CharField(source="buyer.name", read_only=True)
    
    class Meta:
        model = Brand
        fields = ["id", "buyer", "buyer_name", "code", "name", "status", "created_at"]
        read_only_fields = ["id", "created_at"]


class FactorySerializer(serializers.ModelSerializer):
    country_name = serializers.CharField(source="country.name", read_only=True)
    
    class Meta:
        model = Factory
        fields = [
            "id", "code", "name", "contact_person", "email", "phone", "address",
            "city", "country", "country_name", "capacity", "capacity_unit",
            "factory_type", "status", "notes", "created_at"
        ]
        read_only_fields = ["id", "created_at"]


class VendorSerializer(serializers.ModelSerializer):
    country_name = serializers.CharField(source="country.name", read_only=True, default=None)
    payment_terms_name = serializers.CharField(source="payment_terms.name", read_only=True, default=None)
    approved_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Vendor
        fields = [
            "id", "code", "name", "contact_person", "email", "phone", "address",
            "city", "country", "country_name", "product_categories",
            "payment_terms", "payment_terms_name", "lead_time_days", "rating",
            "status", "notes", "created_at",
            "is_approved", "approved_by", "approved_by_name", "approved_at",
        ]
        read_only_fields = ["id", "created_at", "approved_by", "approved_at"]
    
    def get_approved_by_name(self, obj):
        if obj.approved_by:
            return f"{obj.approved_by.first_name} {obj.approved_by.last_name}".strip()
        return None


class RiskLevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = RiskLevel
        fields = ["id", "code", "name", "color", "description", "sort_order", "status", "created_at"]
        read_only_fields = ["id", "created_at"]


class OfficeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Office
        fields = [
            "id", "code", "name", "office_type", "address", "city", "country",
            "phone", "email", "is_active", "status", "created_by", "created_at",
        ]
        read_only_fields = ["created_by", "created_at", "updated_at"]
