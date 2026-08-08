"""
RBAC permission classes for BHMS.

Permission format: "module:action" (e.g., "merchandising:view", "commercial:create")

Usage:
    from apps.core.permissions import HasPermission, ModulePermissions

    class MyViewSet(viewsets.ModelViewSet):
        permission_classes = [IsAuthenticated, HasPermission]
        required_permission = "merchandising:view"  # for all actions
        # OR
        required_permissions = {                     # per-action
            "list": "merchandising:view",
            "create": "merchandising:create",
        }
"""
from rest_framework.permissions import BasePermission
from django.core.cache import cache


MODULE_PERMISSIONS = {
    "setup": ["view", "create", "edit", "delete"],
    "merchandising": ["view", "create", "edit", "delete"],
    "commercial": ["view", "create", "edit", "delete"],
    "production": ["view", "create", "edit", "delete"],
    "quality": ["view", "create", "edit", "delete"],
    "logistics": ["view", "create", "edit", "delete"],
    "users": ["view", "create", "edit", "delete"],
    "reporting": ["view", "export"],
    "settings": ["view", "edit"],
}


def _get_user_permissions(user):
    """
    Get all permission strings for a user via their roles.
    Cached for 5 minutes.
    """
    cache_key = f"user_permissions_{user.id}"
    perms = cache.get(cache_key)
    if perms is not None:
        return perms

    perms = set()
    for ur in user.user_roles.select_related("role").prefetch_related(
        "role__role_permissions__permission"
    ):
        if not ur.role.is_active:
            continue
        for rp in ur.role.role_permissions.all():
            perms.add(f"{rp.permission.module}:{rp.permission.action}")

    cache.set(cache_key, perms, 300)
    return perms


class HasPermission(BasePermission):
    """
    Generic RBAC permission.
    Views must define either:
        - required_permission: str  (same permission for all actions)
        - required_permissions: dict  (action -> permission mapping)
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True

        # Check per-action permissions
        required = getattr(view, "required_permissions", {})
        action = getattr(view, "action", None)
        if action and action in required:
            perm = required[view.action]
        else:
            perm = getattr(view, "required_permission", None)

        if not perm:
            return True

        return perm in _get_user_permissions(request.user)


class IsTenantAdmin(BasePermission):
    """User has 'users:manage' or is superuser."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        return "users:manage" in _get_user_permissions(request.user)


class ModulePermission(BasePermission):
    """
    Permission class that checks module-level access.
    Set `required_module` on the view.
    Example: required_module = "merchandising"
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True

        module = getattr(view, "required_module", None)
        if not module:
            return True

        perms = _get_user_permissions(request.user)
        return any(p.startswith(f"{module}:") for p in perms)


def clear_user_permission_cache(user):
    """Call when roles/permissions change."""
    cache.delete(f"user_permissions_{user.id}")
