"""
Authentication serializers for BHMS.
"""
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom token serializer with additional user data.
    """
    username_field = "email"
    
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["username"] = user.username
        token["email"] = user.email
        token["full_name"] = user.get_full_name()
        token["tenant_id"] = str(user.tenant_id) if user.tenant_id else None
        return token
    
    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        data["user"] = {
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "full_name": user.get_full_name(),
            "tenant_id": str(user.tenant_id) if user.tenant_id else None,
        }
        return data


class PasswordChangeSerializer(serializers.Serializer):
    """
    Password change serializer.
    """
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=12)
    new_password_confirm = serializers.CharField(required=True)
    
    def validate(self, data):
        if data["new_password"] != data["new_password_confirm"]:
            raise serializers.ValidationError({"new_password_confirm": "Passwords do not match"})
        return data


class PasswordResetRequestSerializer(serializers.Serializer):
    """
    Password reset request serializer.
    """
    email = serializers.EmailField(required=True)


class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    Password reset confirm serializer.
    """
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=12)
    new_password_confirm = serializers.CharField(required=True)
    
    def validate(self, data):
        if data["new_password"] != data["new_password_confirm"]:
            raise serializers.ValidationError({"new_password_confirm": "Passwords do not match"})
        return data


class LoginSerializer(serializers.Serializer):
    """
    Login serializer.
    """
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True)
