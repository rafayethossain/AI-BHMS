"""
B9 Help & Onboarding serializers.
RQ-050: Tour completions, onboarding checklist, release notes.
"""
from django.db.models import Q
from rest_framework import serializers
from .models import TourCompletion, OnboardingChecklistItem, ReleaseNote


class TourCompletionSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = TourCompletion
        fields = [
            "id", "tour_id", "completed_at", "user_email",
            "tenant", "created_at",
        ]
        read_only_fields = ["id", "tenant", "user_email", "completed_at", "created_at"]

    def validate(self, attrs):
        request = self.context["request"]
        tenant = request.user.tenant
        user = request.user
        tour_id = attrs.get("tour_id")
        if tour_id and not self.instance:
            exists = TourCompletion.objects.filter(
                tenant=tenant, user=user, tour_id=tour_id,
            ).exists()
            if exists:
                raise serializers.ValidationError(
                    {"tour_id": "This tour has already been completed."}
                )
        return attrs

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        validated_data["tenant"] = self.context["request"].user.tenant
        return super().create(validated_data)


class OnboardingChecklistItemSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = OnboardingChecklistItem
        fields = [
            "id", "item_key", "completed", "completed_at",
            "user_email", "tenant", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "tenant", "user_email", "completed_at", "created_at", "updated_at",
        ]

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        validated_data["tenant"] = self.context["request"].user.tenant
        return super().create(validated_data)


class ReleaseNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReleaseNote
        fields = [
            "id", "version", "title", "body", "released_at",
            "is_published", "created_at",
        ]
        read_only_fields = fields
