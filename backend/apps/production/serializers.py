"""
Production serializers for BHMS.
"""
from rest_framework import serializers
from .models import ProductionPlan, DailyProduction


class ProductionPlanSerializer(serializers.ModelSerializer):
    po_number = serializers.CharField(source="purchase_order.po_number", read_only=True)
    factory_name = serializers.CharField(source="factory.name", read_only=True)
    
    class Meta:
        model = ProductionPlan
        fields = [
            "id", "purchase_order", "po_number", "factory", "factory_name",
            "plan_date", "start_date", "end_date", "quantity", "status",
            "remarks", "created_at"
        ]
        read_only_fields = ["id", "created_at"]


class DailyProductionSerializer(serializers.ModelSerializer):
    factory_name = serializers.CharField(source="factory.name", read_only=True)
    po_number = serializers.CharField(source="purchase_order.po_number", read_only=True)
    
    class Meta:
        model = DailyProduction
        fields = [
            "id", "factory", "factory_name", "purchase_order", "po_number",
            "production_date", "line_number", "target_quantity", "actual_quantity",
            "passed_quantity", "rejected_quantity", "efficiency", "dhu",
            "manpower", "working_hours", "status", "created_at"
        ]
        read_only_fields = ["id", "created_at"]
