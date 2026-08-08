"""
Tests for user models.
"""
import pytest
from django.contrib.auth import get_user_model
from apps.users.models import Role, UserRole, Permission, RolePermission

User = get_user_model()


@pytest.mark.django_db
class TestUser:
    def test_create_user(self, db, tenant):
        user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123!@#",
            first_name="Test",
            last_name="User",
            tenant=tenant,
            status="active"
        )
        assert user.username == "testuser"
        assert user.email == "test@example.com"
        assert user.check_password("testpass123!@#")
        assert user.tenant == tenant
        assert user.status == "active"

    def test_user_str(self, db, tenant):
        user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123!@#",
            first_name="Test",
            last_name="User",
            tenant=tenant
        )
        assert str(user) == "Test User (testuser)"

    def test_user_roles(self, db, user, role):
        assert user.user_roles.count() == 1
        assert user.user_roles.first().role == role

    def test_user_default_status(self, db, tenant):
        user = User.objects.create_user(
            username="newuser",
            email="new@test.com",
            password="testpass123!@#",
            tenant=tenant
        )
        assert user.status == "active"


@pytest.mark.django_db
class TestRole:
    def test_create_role(self, db, tenant):
        role = Role.objects.create(
            tenant=tenant,
            name="Admin",
            description="System Administrator",
            is_system=True
        )
        assert role.name == "Admin"
        assert role.is_system is True
        assert role.tenant == tenant

    def test_role_str(self, db, tenant):
        role = Role.objects.create(
            tenant=tenant,
            name="Admin"
        )
        assert str(role) == "Admin"

    def test_role_default_active(self, db, tenant):
        role = Role.objects.create(
            tenant=tenant,
            name="Merchandiser"
        )
        assert role.is_active is True


@pytest.mark.django_db
class TestUserRole:
    def test_get_user_role(self, user, role):
        user_role = user.user_roles.first()
        assert user_role is not None
        assert user_role.user == user
        assert user_role.role == role

    def test_user_role_str(self, user, role):
        user_role = user.user_roles.first()
        assert str(user_role) == "testuser - Admin"


@pytest.mark.django_db
class TestPermission:
    def test_create_permission(self, db):
        perm = Permission.objects.create(
            module="merchandising",
            action="create"
        )
        assert perm.module == "merchandising"
        assert perm.action == "create"

    def test_permission_str(self, db):
        perm = Permission.objects.create(
            module="merchandising",
            action="create"
        )
        assert str(perm) == "merchandising:create"

    def test_permission_unique(self, db):
        Permission.objects.create(module="merchandising", action="create")
        with pytest.raises(Exception):
            Permission.objects.create(module="merchandising", action="create")


@pytest.mark.django_db
class TestRolePermission:
    def test_create_role_permission(self, db, tenant):
        role = Role.objects.create(tenant=tenant, name="Admin")
        perm = Permission.objects.create(module="merchandising", action="create")
        rp = RolePermission.objects.create(role=role, permission=perm)
        assert rp.role == role
        assert rp.permission == perm
