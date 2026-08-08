"""
User serializers for BHMS.
"""
from rest_framework import serializers
from .models import User, Role, UserRole, Permission, RolePermission, AuditLog


class UserSerializer(serializers.ModelSerializer):
    """
    User serializer.
    """
    full_name = serializers.SerializerMethodField()
    roles = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name", "full_name",
            "phone", "designation", "department", "status", "roles",
            "mfa_enabled", "last_login", "created_at"
        ]
        read_only_fields = ["id", "created_at", "last_login"]
        extra_kwargs = {
            "password": {"write_only": True, "required": False},
        }
    
    def get_full_name(self, obj):
        return obj.get_full_name()
    
    def get_roles(self, obj):
        return [ur.role.name for ur in obj.user_roles.all()]


class UserCreateSerializer(serializers.ModelSerializer):
    """
    User creation serializer.
    """
    password = serializers.CharField(write_only=True, min_length=12)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = [
            "username", "email", "password", "password_confirm",
            "first_name", "last_name", "phone", "designation", "department"
        ]
    
    def validate(self, data):
        if data["password"] != data["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match"})
        return data
    
    def create(self, validated_data):
        validated_data.pop("password_confirm")
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class RoleSerializer(serializers.ModelSerializer):
    """
    Role serializer.
    """
    permissions = serializers.SerializerMethodField()
    
    class Meta:
        model = Role
        fields = ["id", "name", "description", "is_system", "permissions", "created_at"]
        read_only_fields = ["id", "created_at"]
    
    def get_permissions(self, obj):
        return [rp.permission.module + ":" + rp.permission.action for rp in obj.role_permissions.all()]


class PermissionSerializer(serializers.ModelSerializer):
    """
    Permission serializer.
    """
    class Meta:
        model = Permission
        fields = ["id", "module", "action", "description"]
        read_only_fields = ["id"]


class UserRoleSerializer(serializers.ModelSerializer):
    """
    User-Role assignment serializer.
    """
    user_username = serializers.CharField(source="user.username", read_only=True)
    role_name = serializers.CharField(source="role.name", read_only=True)
    
    class Meta:
        model = UserRole
        fields = ["id", "user", "role", "user_username", "role_name", "created_at"]
        read_only_fields = ["id", "created_at"]


class AuditLogSerializer(serializers.ModelSerializer):
    """
    Audit log serializer.
    """
    user_username = serializers.CharField(source="user.username", read_only=True)
    
    class Meta:
        model = AuditLog
        fields = [
            "id", "user", "user_username", "action", "entity_type", "entity_id",
            "old_values", "new_values", "ip_address", "created_at"
        ]
        read_only_fields = fields
