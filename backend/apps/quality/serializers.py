"""
Quality serializers for BHMS.
"""
from rest_framework import serializers

from .models import ComplianceAudit, CorrectiveAction, GoldSeal, Inspection, InspectionItem


class InspectionItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InspectionItem
        fields = ["id", "inspection", "defect_type", "defect_count", "severity", "description", "image_url",
                  "tenant", "created_by", "created_at", "updated_at"]
        read_only_fields = ["id", "tenant", "created_by", "created_at", "updated_at"]


class CorrectiveActionSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(source="assigned_to.get_full_name", read_only=True)
    verified_by_name = serializers.CharField(source="verified_by.get_full_name", read_only=True)

    class Meta:
        model = CorrectiveAction
        fields = "__all__"
        read_only_fields = ["tenant", "created_by", "created_at", "updated_at"]


class InspectionSerializer(serializers.ModelSerializer):
    items = InspectionItemSerializer(many=True, read_only=True)
    corrective_actions = CorrectiveActionSerializer(many=True, read_only=True)
    po_number = serializers.CharField(source="purchase_order.po_number", read_only=True)
    factory_name = serializers.CharField(source="factory.name", read_only=True)

    class Meta:
        model = Inspection
        fields = [
            "id", "purchase_order", "po_number", "factory", "factory_name",
            "inspection_type", "inspection_date", "inspector", "aql_level",
            "sample_size", "passed_quantity", "rejected_quantity", "status",
            "remarks", "items", "corrective_actions",
            "tenant", "created_by", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "tenant", "created_by", "created_at", "updated_at"]


class GoldSealSerializer(serializers.ModelSerializer):
    shipment_number = serializers.CharField(source="shipment.shipment_number", read_only=True)
    po_number = serializers.CharField(source="shipment.purchase_order.po_number", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = GoldSeal
        fields = [
            "id", "shipment", "shipment_number", "po_number",
            "status", "status_label", "sent_date", "approval_date", "notes",
            "tenant", "created_by", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "tenant", "created_by", "created_at", "updated_at"]


class ComplianceAuditSerializer(serializers.ModelSerializer):
    po_number = serializers.CharField(source="purchase_order.po_number", read_only=True)
    buyer_name = serializers.CharField(source="purchase_order.buyer.name", read_only=True)
    po_status = serializers.CharField(source="purchase_order.status", read_only=True)
    style_number = serializers.SerializerMethodField()
    delivery_date = serializers.DateField(source="purchase_order.delivery_date", read_only=True)
    mini_marker_efficiency_status = serializers.CharField(read_only=True)
    efficiency_met = serializers.BooleanField(read_only=True)
    fail_count = serializers.IntegerField(read_only=True)
    overall_pass = serializers.BooleanField(read_only=True)
    reviewed = serializers.BooleanField(read_only=True)
    warning_count = serializers.IntegerField(read_only=True)
    warning_label = serializers.CharField(read_only=True)

    class Meta:
        model = ComplianceAudit
        fields = [
            "id", "purchase_order", "po_number", "buyer_name", "po_status",
            "style_number", "delivery_date", "week_start", "efficiency_rate",
            "fabric_paperwork_status", "dockets_status", "fabric_utilisation_status",
            "factory_invoice_status", "fabric_rating_status",
            "recon_costed_vs_actual_status", "final_hits_status", "notes",
            "mini_marker_efficiency_status", "efficiency_met", "fail_count",
            "overall_pass", "reviewed", "warning_count", "warning_label",
            "tenant", "created_by", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "tenant", "created_by", "created_at", "updated_at"]

    def get_style_number(self, obj):
        file_opening = getattr(obj.purchase_order, "file_opening", None)
        style = getattr(file_opening, "style", None)
        return getattr(style, "style_number", None)
