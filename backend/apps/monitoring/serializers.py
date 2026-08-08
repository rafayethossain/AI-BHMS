"""
Monitoring serializers for BHMS.
"""
from rest_framework import serializers
from .models import AuditLog, SystemHealth, Alert


class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)

    class Meta:
        model = AuditLog
        fields = "__all__"
        read_only_fields = ["tenant", "created_by", "created_at", "updated_at"]


class SystemHealthSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemHealth
        fields = "__all__"
        read_only_fields = ["tenant", "created_by", "created_at", "updated_at"]


class AlertSerializer(serializers.ModelSerializer):
    resolved_by_name = serializers.CharField(source="resolved_by.get_full_name", read_only=True)

    class Meta:
        model = Alert
        fields = "__all__"
        read_only_fields = ["tenant", "created_by", "created_at", "updated_at"]
