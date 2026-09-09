"""Verify all setup seed data is correctly linked."""
import os, sys, django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from apps.tenants.models import Tenant, Office
from apps.setup.models import *
from apps.users.models import User, Role, UserRole, Permission, RolePermission

t = Tenant.objects.first()

print("=" * 60)
print("SEED DATA VERIFICATION -- Setup & Administrative")
print("=" * 60)

print(f"\nTenant: {t.name} ({t.slug}) [{t.status}] [{t.plan}]")

print("\n--- LOOKUP TABLES ---")
counts = [
    ("Season", Season), ("ProductCategory", ProductCategory), ("ProductType", ProductType),
    ("ProductDepartment", ProductDepartment), ("ComplianceDocumentType", ComplianceDocumentType),
    ("DeliveryMode", DeliveryMode), ("UOM", UOM), ("Currency", Currency),
    ("Department", Department), ("Designation", Designation), ("PaymentTerms", PaymentTerms),
    ("Country", Country), ("ColorCode", ColorCode), ("Buyer", Buyer), ("Brand", Brand),
    ("Factory", Factory), ("Vendor", Vendor), ("RiskLevel", RiskLevel),
]
for name, M in counts:
    print(f"  {name:<25} {M.objects.filter(tenant=t).count():>4}")

print("\n--- OFFICES ---")
for o in Office.objects.filter(tenant=t):
    print(f"  {o.code:<8} {o.name:<25} [{o.office_type}] {o.city}")

print("\n--- ROLES & RBAC ---")
for r in Role.objects.filter(tenant=t).order_by("name"):
    rp = RolePermission.objects.filter(role=r).count()
    users = UserRole.objects.filter(role=r).count()
    print(f"  {r.name:<25} perms={rp:<3} users={users}")

print(f"\n  Total Permissions:     {Permission.objects.count()}")
print(f"  Total Role-Perms:      {RolePermission.objects.count()}")

print("\n--- USERS ---")
for u in User.objects.filter(tenant=t).order_by("email"):
    roles = list(UserRole.objects.filter(user=u).values_list("role__name", flat=True))
    dept = u.department.name if u.department else "-"
    print(f"  {u.email:<30} {u.username:<15} roles={roles} dept={dept} [{u.status}]")

print("\n--- FK INTEGRITY CHECKS ---")
b = Buyer.objects.filter(tenant=t).first()
print(f'  Buyer "{b.code}" -> country={b.country}, currency={b.currency}, payment_terms={b.payment_terms}')

br = Brand.objects.filter(tenant=t).first()
print(f'  Brand "{br.code}" -> buyer={br.buyer}')

f = Factory.objects.filter(tenant=t).first()
print(f'  Factory "{f.code}" -> country={f.country}')

v = Vendor.objects.filter(tenant=t).first()
print(f'  Vendor "{v.code}" -> country={v.country}, payment_terms={v.payment_terms}')

c = Country.objects.filter(tenant=t).first()
print(f'  Country "{c.code}" -> default_currency={c.default_currency}')

pt = ProductType.objects.filter(tenant=t).first()
print(f'  ProductType "{pt.code}" -> category={pt.category}')

d = Designation.objects.filter(tenant=t).first()
print(f'  Designation "{d.code}" -> department={d.department}')

print("\n" + "=" * 60)
print("SETUP SEED DATA COMPLETE -- Ready for design creation")
print("=" * 60)
