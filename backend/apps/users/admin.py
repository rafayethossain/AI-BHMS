"""
User admin configuration.
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Role, UserRole, Permission, RolePermission, AuditLog


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ["username", "email", "first_name", "last_name", "status", "is_staff"]
    list_filter = ["status", "is_staff", "is_superuser"]
    search_fields = ["username", "email", "first_name", "last_name"]
    readonly_fields = ["created_at", "updated_at", "last_login_ip"]
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ("Additional Info", {
            "fields": ("tenant", "phone", "designation", "department", "status", "mfa_enabled", "last_login_ip")
        }),
    )
    
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ("Additional Info", {
            "fields": ("tenant", "phone", "status"),
        }),
    )


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ["name", "description", "is_system", "is_active"]
    list_filter = ["is_system", "is_active"]
    search_fields = ["name", "description"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    list_display = ["user", "role", "created_at"]
    search_fields = ["user__username", "role__name"]
    readonly_fields = ["created_at"]


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ["module", "action", "description"]
    search_fields = ["module", "action"]
    list_filter = ["module"]


@admin.register(RolePermission)
class RolePermissionAdmin(admin.ModelAdmin):
    list_display = ["role", "permission", "created_at"]
    search_fields = ["role__name", "permission__module"]
    readonly_fields = ["created_at"]


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ["user", "action", "entity_type", "ip_address", "created_at"]
    list_filter = ["action", "entity_type"]
    search_fields = ["user__username", "entity_type"]
    readonly_fields = ["created_at"]
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
