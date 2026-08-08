"""
Logistics serializers for BHMS.
"""
from rest_framework import serializers

from apps.setup.models import RiskLevel

from .models import (
    BookingScheduleItem,
    Docket,
    FinalHitReconciliation,
    FreightForwarder,
    Shipment,
    ShippingDocument,
)


class FreightForwarderSerializer(serializers.ModelSerializer):
    class Meta:
        model = FreightForwarder
        fields = "__all__"
        read_only_fields = ["tenant", "created_by", "created_at", "updated_at"]


class ShippingDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShippingDocument
        fields = "__all__"
        read_only_fields = ["tenant", "created_by", "created_at", "updated_at"]


class RiskLevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = RiskLevel
        fields = ["id", "code", "name", "color"]


class ShipmentSerializer(serializers.ModelSerializer):
    documents = ShippingDocumentSerializer(many=True, read_only=True)
    factory_name = serializers.SerializerMethodField()
    po_number = serializers.CharField(source="purchase_order.po_number", read_only=True)
    freight_forwarder_name = serializers.SerializerMethodField()
    risk_level_detail = RiskLevelSerializer(source="risk_level", read_only=True)
    booking_ref_status = serializers.CharField(read_only=True)

    class Meta:
        model = Shipment
        fields = "__all__"
        read_only_fields = ["tenant", "created_by", "created_at", "updated_at", "shipment_number"]

    def get_factory_name(self, obj):
        return obj.factory.name if obj.factory else None

    def get_freight_forwarder_name(self, obj):
        return obj.freight_forwarder.name if obj.freight_forwarder else None


class BookingScheduleItemSerializer(serializers.ModelSerializer):
    po_number = serializers.CharField(source="shipment.purchase_order.po_number", read_only=True)
    shipment_number = serializers.CharField(source="shipment.shipment_number", read_only=True)
    hit_colour = serializers.CharField(source="hit.colour.name", read_only=True, default=None)
    hit_number = serializers.CharField(source="hit.hit_number", read_only=True, default=None)
    risk_level_detail = RiskLevelSerializer(source="risk_level", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    is_at_risk = serializers.SerializerMethodField()
    is_reconciliation_trigger = serializers.SerializerMethodField()

    class Meta:
        model = BookingScheduleItem
        fields = "__all__"
        read_only_fields = ["tenant", "created_by", "created_at", "updated_at"]

    def get_is_at_risk(self, obj):
        if obj.garments_ready_qty and obj.cut_qty:
            return obj.garments_ready_qty >= obj.cut_qty
        return False

    def get_is_reconciliation_trigger(self, obj):
        return obj.status == "delivered" and obj.hit is not None

    def validate(self, attrs):
        shipment = attrs.get("shipment", getattr(self.instance, "shipment", None))
        hit = attrs.get("hit", getattr(self.instance, "hit", None))
        week_ending = attrs.get("week_ending", getattr(self.instance, "week_ending", None))
        if shipment and week_ending and BookingScheduleItem.objects.filter(
            tenant=self.context["request"].tenant,
            shipment=shipment,
            week_ending=week_ending,
            hit=hit,
        ).exclude(pk=getattr(self.instance, "pk", None)).exists():
            raise serializers.ValidationError(
                {"week_ending": "A schedule item for this shipment/week/hit already exists."}
            )
        return attrs


class DocketSerializer(serializers.ModelSerializer):
    shipment_number = serializers.CharField(source="shipment.shipment_number", read_only=True)
    po_number = serializers.CharField(source="shipment.purchase_order.po_number", read_only=True)
    requires_sales_notification = serializers.BooleanField(read_only=True)

    class Meta:
        model = Docket
        fields = "__all__"
        read_only_fields = [
            "tenant", "created_by", "created_at", "updated_at",
            "docket_number", "sales_notified", "sales_notified_at",
        ]


class FinalHitReconciliationSerializer(serializers.ModelSerializer):
    shipment_number = serializers.CharField(source="shipment.shipment_number", read_only=True)
    po_number = serializers.CharField(source="shipment.purchase_order.po_number", read_only=True)
    schedule_item_id = serializers.IntegerField(source="schedule_item.id", read_only=True, default=None)
    reconciled_by_name = serializers.CharField(source="reconciled_by.username", read_only=True, default=None)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    is_short = serializers.BooleanField(read_only=True)
    requires_debit = serializers.BooleanField(read_only=True)

    class Meta:
        model = FinalHitReconciliation
        fields = "__all__"
        read_only_fields = [
            "tenant", "created_by", "created_at", "updated_at",
            "shortage_units", "reconciled_at", "reconciled_by",
        ]
