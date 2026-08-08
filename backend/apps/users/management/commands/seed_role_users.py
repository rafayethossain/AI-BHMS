"""
Seed one user per role for testing access permissions.

Usage:
    python manage.py seed_role_users
    python manage.py seed_role_users --clear
"""
from django.core.management.base import BaseCommand
from apps.tenants.models import Tenant
from apps.users.models import User, Role, UserRole


# ── User definitions: one per role ──────────────────────────────
ROLE_USERS = [
    {
        "role_name": "Admin",
        "username": "admin",
        "email": "admin@demo.com",
        "password": "admin123!@#",
        "first_name": "Admin",
        "last_name": "User",
        "designation": "System Administrator",
    },
    {
        "role_name": "Manager",
        "username": "manager",
        "email": "manager@demo.com",
        "password": "Manager123!@#",
        "first_name": "Sarah",
        "last_name": "Chen",
        "designation": "Operations Manager",
    },
    {
        "role_name": "Merchandiser",
        "username": "merchandiser",
        "email": "merchandiser@demo.com",
        "password": "Merch123!@#",
        "first_name": "Fatima",
        "last_name": "Rahman",
        "designation": "Senior Merchandiser",
    },
    {
        "role_name": "Production Manager",
        "username": "prodmanager",
        "email": "production@demo.com",
        "password": "Prod123!@#!@#",
        "first_name": "Karim",
        "last_name": "Uddin",
        "designation": "Production Manager",
    },
    {
        "role_name": "Quality Manager",
        "username": "qualitymgr",
        "email": "quality@demo.com",
        "password": "Quality123!@#",
        "first_name": "Nadia",
        "last_name": "Akter",
        "designation": "Quality Assurance Manager",
    },
    {
        "role_name": "Commercial Manager",
        "username": "commercial",
        "email": "commercial@demo.com",
        "password": "Commerce123!@#",
        "first_name": "Rafiq",
        "last_name": "Hossain",
        "designation": "Commercial Manager",
    },
    {
        "role_name": "Shipping Manager",
        "username": "shipping",
        "email": "shipping@demo.com",
        "password": "Shipping123!@#",
        "first_name": "Aisha",
        "last_name": "Khan",
        "designation": "Shipping & Logistics Manager",
    },
    {
        "role_name": "Viewer",
        "username": "viewer",
        "email": "viewer@demo.com",
        "password": "Viewer123!@#!@#",
        "first_name": "Tanvir",
        "last_name": "Islam",
        "designation": "Read-Only Viewer",
    },
]


class Command(BaseCommand):
    help = "Create one user per role for access-permission testing"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear", action="store_true",
            help="Delete all non-superuser role users before seeding",
        )

    def handle(self, *args, **options):
        tenant = Tenant.objects.filter(status="active").first()
        if not tenant:
            self.stderr.write(self.style.ERROR("No active tenant found. Run seed_dev.py first."))
            return

        if options["clear"]:
            emails = [u["email"] for u in ROLE_USERS]
            deleted, _ = User.objects.filter(tenant=tenant, email__in=emails).delete()
            self.stdout.write(f"Cleared {deleted} existing role users")

        created, updated = 0, 0
        rows = []

        for defn in ROLE_USERS:
            role = Role.objects.filter(tenant=tenant, name=defn["role_name"]).first()
            if not role:
                self.stderr.write(
                    self.style.WARNING(f"  Role '{defn['role_name']}' not found — skipping")
                )
                rows.append((defn["email"], defn["role_name"], "SKIPPED (role missing)"))
                continue

            user, was_created = User.objects.get_or_create(
                tenant=tenant,
                email=defn["email"],
                defaults={
                    "username": defn["username"],
                    "first_name": defn["first_name"],
                    "last_name": defn["last_name"],
                    "designation": defn["designation"],
                    "status": "active",
                },
            )

            if was_created:
                user.set_password(defn["password"])
                user.save()
                created += 1
            else:
                updated += 1

            UserRole.objects.get_or_create(user=user, role=role)
            rows.append((defn["email"], defn["role_name"], "CREATED" if was_created else "EXISTS"))

        # ── Summary ───────────────────────────────────────────
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(f"  Done: {created} created, {updated} existing"))
        self.stdout.write("")
        self.stdout.write(f"  {'Email':<30} {'Role':<25} {'Status'}")
        self.stdout.write(f"  {'─'*30} {'─'*25} {'─'*15}")
        for email, role, status in rows:
            self.stdout.write(f"  {email:<30} {role:<25} {status}")
        self.stdout.write("")
