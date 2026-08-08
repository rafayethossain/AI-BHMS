"""
User models for BHMS.
"""
import uuid
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models
from apps.core.models import TenantModel


class User(AbstractUser):
    """
    Custom User model for BHMS.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="users",
        null=True,
        blank=True
    )
    
    # Profile Information
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    designation = models.CharField(max_length=100, blank=True)
    department = models.ForeignKey(
        "setup.Department",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users"
    )
    
    # MFA
    mfa_enabled = models.BooleanField(default=False)
    mfa_secret = models.CharField(max_length=255, blank=True)
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=[
            ("active", "Active"),
            ("inactive", "Inactive"),
            ("suspended", "Suspended"),
        ],
        default="active"
    )
    
    # Timestamps
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_users"
    )
    
    class Meta:
        ordering = ["-created_at"]
        verbose_name = "User"
        verbose_name_plural = "Users"
    
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.username})"


class PasswordHistory(TenantModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="password_history"
    )
    password_hash = models.CharField(max_length=128)

    class Meta:
        ordering = ["-created_at"]


class Role(models.Model):
    """
    Role model for RBAC.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="roles",
        null=True,
        blank=True
    )
    
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    is_system = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_roles"
    )
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ["name"]
        unique_together = ["tenant", "name"]
        verbose_name = "Role"
        verbose_name_plural = "Roles"
    
    def __str__(self):
        return self.name


class UserRole(models.Model):
    """
    User-Role assignment.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="user_roles")
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name="user_roles")
    
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_roles"
    )
    
    class Meta:
        unique_together = ["user", "role"]
        verbose_name = "User Role"
        verbose_name_plural = "User Roles"
    
    def __str__(self):
        return f"{self.user.username} - {self.role.name}"


class Permission(models.Model):
    """
    Permission model for RBAC.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    module = models.CharField(max_length=50)
    action = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    
    class Meta:
        unique_together = ["module", "action"]
        verbose_name = "Permission"
        verbose_name_plural = "Permissions"
    
    def __str__(self):
        return f"{self.module}:{self.action}"


class RolePermission(models.Model):
    """
    Role-Permission assignment.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name="role_permissions")
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE, related_name="role_permissions")
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ["role", "permission"]
        verbose_name = "Role Permission"
        verbose_name_plural = "Role Permissions"
    
    def __str__(self):
        return f"{self.role.name} - {self.permission}"


class AuditLog(models.Model):
    """
    Audit log model for tracking changes.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="audit_logs",
        null=True,
        blank=True
    )
    
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs"
    )
    
    action = models.CharField(max_length=50)
    entity_type = models.CharField(max_length=100)
    entity_id = models.UUIDField(null=True, blank=True)
    
    old_values = models.JSONField(null=True, blank=True)
    new_values = models.JSONField(null=True, blank=True)
    
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "entity_type", "entity_id"]),
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["action", "created_at"]),
        ]
        verbose_name = "Audit Log"
        verbose_name_plural = "Audit Logs"
    
    def __str__(self):
        return f"{self.user} - {self.action} - {self.entity_type}"
