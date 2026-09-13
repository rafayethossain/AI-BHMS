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
from apps.tenants.models import Tenant, Office
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

# Create offices (head office, branch, warehouse, factory liaison)
offices_data = [
    ("HQ-DHK", "Demo Buying House Head Office", "Level 7, Gulshan Avenue", "Dhaka", "hq", "+880-2-87141000", "info@demobh.com"),
    ("BR-CTG", "Chattogram Branch Office", "Agrabad C/A", "Chattogram", "branch", "+880-31-712345", "chattogram@demobh.com"),
    ("WH-GZP", "Gazipur Warehouse", "BSCIC Industrial Area, Konabari", "Gazipur", "warehouse", "+880-2-8891020", "warehouse@demobh.com"),
    ("FT-SAV", "Savar Factory Liaison", "Nabinagar, Savar", "Dhaka", "factory", "+880-2-7744567", "factory@demobh.com"),
    ("BR-CUM", "Cumilla Branch Office", "Kandirpar", "Cumilla", "branch", "+880-81-778899", "cumilla@demobh.com"),
]
for code, name, address, city, otype, phone, email in offices_data:
    Office.objects.get_or_create(
        tenant=tenant, code=code,
        defaults={
            "name": name, "address": address, "city": city,
            "country": "BGD", "office_type": otype,
            "phone": phone, "email": email, "status": "active",
        }
    )
print(f"[OK] Offices: {Office.objects.filter(tenant=tenant).count()}")

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
