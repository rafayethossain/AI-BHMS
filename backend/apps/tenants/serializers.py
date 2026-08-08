"""
Tenant serializers for BHMS.
"""
from rest_framework import serializers
from .models import Tenant, Office


class TenantSerializer(serializers.ModelSerializer):
    """
    Tenant serializer.
    """
    class Meta:
        model = Tenant
        fields = [
            "id", "name", "slug", "legal_name", "address", "phone", "email",
            "logo", "timezone", "currency", "status", "plan", "created_at"
        ]
        read_only_fields = ["id", "created_at"]


class OfficeSerializer(serializers.ModelSerializer):
    """
    Office serializer.
    """
    class Meta:
        model = Office
        fields = [
            "id", "code", "name", "address", "city", "country",
            "office_type", "phone", "email", "status", "created_at"
        ]
        read_only_fields = ["id", "created_at"]
