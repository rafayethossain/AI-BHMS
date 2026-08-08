import re

from rest_framework import serializers

from .models import (
    RFQ,
    FabricBooking,
    FabricCategory,
    FabricMill,
    FabricOrder,
    FabricSupplier,
    FabricTolerance,
    FabricUtilization,
    HTSCode,
    RFQLineItem,
    RFQResponse,
    RFQResponseItem,
)


class FabricCategorySerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()
    parent_name = serializers.CharField(source="parent.name", read_only=True, default=None)

    class Meta:
        model = FabricCategory
        fields = ["id", "code", "name", "parent", "parent_name", "children", "description", "is_active", "created_at"]
        read_only_fields = ["id", "created_at"]

    def get_children(self, obj):
        return FabricCategorySerializer(obj.children.all(), many=True).data


class HTSCodeSerializer(serializers.ModelSerializer):
    fabric_category_name = serializers.CharField(source="fabric_category.name", read_only=True, default=None)

    class Meta:
        model = HTSCode
        fields = ["id", "code", "description", "fabric_category", "fabric_category_name", "duty_rate", "is_active", "created_at"]
        read_only_fields = ["id", "created_at"]


class FabricSupplierSerializer(serializers.ModelSerializer):
    country_name = serializers.CharField(source="country.name", read_only=True, default=None)

    class Meta:
        model = FabricSupplier
        fields = [
            "id", "code", "name", "vendor", "contact_person", "email", "phone",
            "country", "country_name", "lead_time_days", "moq_meters",
            "is_mill", "notes", "is_active", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class FabricMillSerializer(serializers.ModelSerializer):
    country_name = serializers.CharField(source="country.name", read_only=True, default=None)

    class Meta:
        model = FabricMill
        fields = [
            "id", "code", "name", "country", "country_name", "city",
            "capacity_meters_month", "rating", "certification",
            "notes", "is_active", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class RFQLineItemSerializer(serializers.ModelSerializer):
    fabric_category_name = serializers.CharField(source="fabric_category.name", read_only=True, default=None)

    class Meta:
        model = RFQLineItem
        fields = ["id", "rfq", "fabric_category", "fabric_category_name", "quantity_meters", "target_price", "notes", "created_at"]
        read_only_fields = ["id", "created_at"]


class RFQResponseItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = RFQResponseItem
        fields = ["id", "response", "line_item", "quoted_price", "available_qty_meters", "lead_days", "notes", "created_at"]
        read_only_fields = ["id", "created_at"]


class RFQResponseSerializer(serializers.ModelSerializer):
    response_items = RFQResponseItemSerializer(many=True, read_only=True)
    rfq_number = serializers.CharField(source="rfq.rfq_number", read_only=True, default=None)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True, default=None)

    class Meta:
        model = RFQResponse
        fields = ["id", "rfq", "rfq_number", "supplier", "supplier_name", "response_date", "valid_until", "notes", "response_items", "is_active", "created_at"]
        read_only_fields = ["id", "created_at"]


class RFQSerializer(serializers.ModelSerializer):
    line_items = RFQLineItemSerializer(many=True, read_only=True)
    responses = RFQResponseSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)

    class Meta:
        model = RFQ
        fields = ["id", "rfq_number", "supplier", "supplier_name", "status", "notes", "line_items", "responses", "closed_at", "is_active", "created_at"]
        read_only_fields = ["id", "closed_at", "created_at"]


class FabricBookingSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    fabric_category_name = serializers.CharField(source="fabric_category.name", read_only=True, default=None)

    class Meta:
        model = FabricBooking
        fields = [
            "id", "booking_number", "supplier", "supplier_name",
            "fabric_category", "fabric_category_name", "quantity_meters",
            "status", "origin_country", "expected_delivery", "actual_delivery",
            "notes", "is_active", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class FabricOrderSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    fabric_category_name = serializers.CharField(source="fabric_category.name", read_only=True, default=None)
    bulk_approved_by_name = serializers.SerializerMethodField()
    risk_level_code = serializers.CharField(source="risk_level.code", read_only=True, default=None)
    risk_level_name = serializers.CharField(source="risk_level.name", read_only=True, default=None)
    effective_owners = serializers.SerializerMethodField()

    class Meta:
        model = FabricOrder
        fields = [
            "id", "order_number", "supplier", "supplier_name",
            "fabric_category", "fabric_category_name",
            "quantity_meters", "unit_price", "total_price",
            "status",
            "lab_dip_required_date", "lab_dip_actual_date",
            "lab_dip_approval_date", "lab_dip_notes",
            "bulk_approved_date", "bulk_approved_by", "bulk_approved_by_name",
            "onboard_date", "eta_date", "clearance_date",
            "risk_level", "risk_level_code", "risk_level_name",
            "risk_notes", "date_owners", "effective_owners",
            "notes", "is_active", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "order_number", "total_price", "created_at", "updated_at"]

    def get_bulk_approved_by_name(self, obj):
        if obj.bulk_approved_by:
            return str(obj.bulk_approved_by)
        return None

    def get_effective_owners(self, obj):
        return obj.effective_owners()


class FabricToleranceSerializer(serializers.ModelSerializer):
    customer_type_display = serializers.CharField(source="get_customer_type_display", read_only=True)

    class Meta:
        model = FabricTolerance
        fields = [
            "id", "customer_type", "customer_type_display",
            "qty_from", "qty_to", "tolerance_pct", "is_active",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class FabricUtilizationSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source="order.order_number", read_only=True)
    supplier_name = serializers.CharField(source="order.supplier.name", read_only=True)
    fabric_category_name = serializers.CharField(source="order.fabric_category.name", read_only=True, default=None)
    ordered_meters = serializers.DecimalField(source="order.quantity_meters", max_digits=12, decimal_places=2, read_only=True)
    over_under_meters = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    over_under_pct = serializers.DecimalField(max_digits=6, decimal_places=2, read_only=True)
    accounted_meters = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    excess_meters = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    efficiency_pct = serializers.DecimalField(max_digits=6, decimal_places=2, read_only=True)
    recorded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = FabricUtilization
        fields = [
            "id", "order", "order_number", "supplier_name", "fabric_category_name",
            "period", "received_meters", "used_meters",
            "wasted_meters", "damaged_meters",
            "ordered_meters", "over_under_meters", "over_under_pct",
            "accounted_meters", "excess_meters", "efficiency_pct",
            "notes", "recorded_by", "recorded_by_name", "recorded_at",
        ]
        read_only_fields = ["id", "recorded_by", "recorded_at"]

    def validate_period(self, value):
        if not re.match(r"^\d{4}-(0[1-9]|1[0-2])$", value):
            raise serializers.ValidationError("period must be in YYYY-MM format")
        return value

    def get_recorded_by_name(self, obj):
        return str(obj.recorded_by) if obj.recorded_by else None
