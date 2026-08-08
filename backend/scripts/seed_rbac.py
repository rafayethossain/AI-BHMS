"""
Seed RBAC permissions and default roles.
"""
import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from apps.tenants.models import Tenant
from apps.users.models import User, Role, UserRole, Permission, RolePermission

tenant = Tenant.objects.get(slug="default")

# ──────────────────────────────────────────────
# 1. PERMISSIONS
# ──────────────────────────────────────────────
MODULE_PERMISSIONS = {
    "setup": ["view", "create", "edit", "delete"],
    "merchandising": ["view", "create", "edit", "delete", "approve"],
    "commercial": ["view", "create", "edit", "delete", "approve"],
    "production": ["view", "create", "edit", "delete", "approve"],
    "quality": ["view", "create", "edit", "delete", "approve"],
    "logistics": ["view", "create", "edit", "delete", "approve"],
    "users": ["view", "create", "edit", "delete", "manage"],
    "reporting": ["view", "export"],
    "settings": ["view", "edit"],
}

perm_objects = {}
for module, actions in MODULE_PERMISSIONS.items():
    for action in actions:
        perm, _ = Permission.objects.get_or_create(
            module=module, action=action,
            defaults={"description": f"{module}:{action}"}
        )
        perm_objects[f"{module}:{action}"] = perm
print(f"[OK] Permissions: {len(perm_objects)}")

# ──────────────────────────────────────────────
# 2. DEFAULT ROLES
# ──────────────────────────────────────────────
ROLE_PERMS = {
    "Admin": list(perm_objects.keys()),
    "Manager": [
        "setup:view", "merchandising:view", "merchandising:create", "merchandising:edit",
        "commercial:view", "commercial:create", "commercial:edit",
        "production:view", "production:create", "production:edit",
        "quality:view", "quality:create", "quality:edit",
        "logistics:view", "logistics:create", "logistics:edit",
        "reporting:view", "reporting:export",
        "users:view",
    ],
    "Merchandiser": [
        "setup:view", "merchandising:view", "merchandising:create", "merchandising:edit",
        "commercial:view", "reporting:view",
    ],
    "Production Manager": [
        "setup:view", "production:view", "production:create", "production:edit", "production:approve",
        "quality:view", "quality:create", "quality:edit",
        "merchandising:view", "reporting:view",
    ],
    "Quality Manager": [
        "setup:view", "quality:view", "quality:create", "quality:edit", "quality:approve",
        "production:view", "reporting:view",
    ],
    "Commercial Manager": [
        "setup:view", "commercial:view", "commercial:create", "commercial:edit", "commercial:approve",
        "logistics:view", "logistics:create", "logistics:edit",
        "merchandising:view", "reporting:view",
    ],
    "Shipping Manager": [
        "setup:view", "logistics:view", "logistics:create", "logistics:edit", "logistics:approve",
        "commercial:view", "reporting:view",
    ],
    "Viewer": [
        "setup:view", "merchandising:view", "commercial:view",
        "production:view", "quality:view", "logistics:view", "reporting:view",
    ],
}

for role_name, perm_keys in ROLE_PERMS.items():
    role, created = Role.objects.get_or_create(
        tenant=tenant, name=role_name,
        defaults={
            "description": f"{role_name} role",
            "is_system": True,
            "is_active": True,
        }
    )
    for pk in perm_keys:
        RolePermission.objects.get_or_create(
            role=role, permission=perm_objects[pk]
        )
    print(f"[OK] Role: {role_name} ({role.role_permissions.count()} permissions)")

# ──────────────────────────────────────────────
# 3. ADMIN USER ROLE ASSIGNMENT
# ──────────────────────────────────────────────
admin_user = User.objects.filter(tenant=tenant, is_superuser=True).first()
if admin_user:
    admin_role = Role.objects.get(tenant=tenant, name="Admin")
    UserRole.objects.get_or_create(user=admin_user, role=admin_role,
        defaults={"created_by": admin_user})
    print(f"\n[OK] Admin role assigned to {admin_user.email}")

# ──────────────────────────────────────────────
# 4. AUDIT LOG MODEL CHECK
# ──────────────────────────────────────────────
print(f"\n[OK] Total Roles: {Role.objects.filter(tenant=tenant).count()}")
print(f"[OK] Total Permissions: {Permission.objects.count()}")
print(f"[OK] Total Role-Permissions: {RolePermission.objects.count()}")
print(f"[OK] Total User-Roles: {UserRole.objects.filter(user__tenant=tenant).count()}")
