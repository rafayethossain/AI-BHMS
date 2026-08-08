"""
Seed script to create initial data for development.
"""
import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from django.contrib.auth import get_user_model
from apps.tenants.models import Tenant
from apps.users.models import Role, UserRole

User = get_user_model()

# Create default tenant
tenant, _ = Tenant.objects.get_or_create(
    slug="default",
    defaults={
        "name": "Demo Buying House",
        "schema_name": "tenant_default",
        "status": "active",
        "plan": "professional",
    }
)
print(f"[OK] Tenant: {tenant.name}")

# Create roles
roles_data = [
    ("Admin", "System Administrator", True),
    ("Merchandiser", "Merchandiser", False),
    ("Commercial Manager", "Commercial Manager", False),
    ("Production Manager", "Production Manager", False),
    ("Quality Manager", "Quality Manager", False),
    ("Viewer", "Read-only Viewer", False),
]

for name, desc, is_system in roles_data:
    role, _ = Role.objects.get_or_create(
        tenant=tenant,
        name=name,
        defaults={"description": desc, "is_system": is_system}
    )
    print(f"[OK] Role: {role.name}")

# Create superuser
if not User.objects.filter(email="admin@demo.com").exists():
    user = User.objects.create_superuser(
        username="admin",
        email="admin@demo.com",
        password="admin123!@#",
        first_name="Admin",
        last_name="User",
        tenant=tenant,
        status="active",
    )
    admin_role = Role.objects.get(tenant=tenant, name="Admin")
    UserRole.objects.create(user=user, role=admin_role)
    print(f"[OK] Superuser: admin@demo.com / admin123!@#")
else:
    print("[SKIP] Superuser already exists")

print("\nDone! You can now start the server.")
