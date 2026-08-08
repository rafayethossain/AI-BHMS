"""
Tests for RBAC permissions.
"""
import pytest
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.tenants.models import Tenant
from apps.users.models import Role, UserRole, Permission, RolePermission
from apps.core.permissions import HasPermission, ModulePermission, _get_user_permissions

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def rbac_tenant(db):
    return Tenant.objects.create(
        name="RBAC Test Company", slug="rbac-test",
        schema_name="tenant_rbac", status="active"
    )


@pytest.fixture
def view_perm(db):
    return Permission.objects.get_or_create(
        module="merchandising", action="view",
        defaults={"description": "merchandising:view"}
    )[0]


@pytest.fixture
def create_perm(db):
    return Permission.objects.get_or_create(
        module="merchandising", action="create",
        defaults={"description": "merchandising:create"}
    )[0]


@pytest.fixture
def viewer_role(db, rbac_tenant, view_perm):
    role = Role.objects.create(
        tenant=rbac_tenant, name="Viewer",
        description="Read-only access", is_system=True
    )
    RolePermission.objects.create(role=role, permission=view_perm)
    return role


@pytest.fixture
def merchandiser_role(db, rbac_tenant, view_perm, create_perm):
    role = Role.objects.create(
        tenant=rbac_tenant, name="Merchandiser",
        description="Merchandising role", is_system=True
    )
    RolePermission.objects.create(role=role, permission=view_perm)
    RolePermission.objects.create(role=role, permission=create_perm)
    return role


@pytest.fixture
def viewer_user(db, rbac_tenant, viewer_role):
    user = User.objects.create_user(
        username="viewer", email="viewer@test.com",
        password="testpass123!@#", first_name="View", last_name="User",
        tenant=rbac_tenant, status="active"
    )
    UserRole.objects.create(user=user, role=viewer_role)
    return user


@pytest.fixture
def merch_user(db, rbac_tenant, merchandiser_role):
    user = User.objects.create_user(
        username="merch", email="merch@test.com",
        password="testpass123!@#", first_name="Merch", last_name="User",
        tenant=rbac_tenant, status="active"
    )
    UserRole.objects.create(user=user, role=merchandiser_role)
    return user


@pytest.mark.django_db
class TestRBACPermissions:
    def test_get_user_permissions(self, viewer_user):
        perms = _get_user_permissions(viewer_user)
        assert "merchandising:view" in perms
        assert "merchandising:create" not in perms

    def test_get_user_permissions_multi_role(self, merch_user, viewer_role):
        UserRole.objects.create(user=merch_user, role=viewer_role)
        perms = _get_user_permissions(merch_user)
        assert "merchandising:view" in perms
        assert "merchandising:create" in perms

    def test_superuser_bypass(self, rbac_tenant):
        admin = User.objects.create_superuser(
            username="admin", email="admin@test.com",
            password="testpass123!@#", tenant=rbac_tenant
        )
        perms = _get_user_permissions(admin)
        # superuser check is done in has_permission, not in _get_user_permissions
        assert isinstance(perms, set)

    def test_has_permission_view(self, viewer_user):
        view = type('View', (), {'required_permission': 'merchandising:view', 'action': 'list'})()
        perm = HasPermission()
        assert perm.has_permission(type('Request', (), {'user': viewer_user})(), view) is True

    def test_has_permission_denied(self, viewer_user):
        view = type('View', (), {'required_permission': 'merchandising:create', 'action': 'create'})()
        perm = HasPermission()
        assert perm.has_permission(type('Request', (), {'user': viewer_user})(), view) is False

    def test_has_permission_no_restriction(self, viewer_user):
        view = type('View', (), {'action': 'list'})()
        perm = HasPermission()
        assert perm.has_permission(type('Request', (), {'user': viewer_user})(), view) is True

    def test_module_permission(self, viewer_user):
        view = type('View', (), {'required_module': 'merchandising'})()
        perm = ModulePermission()
        assert perm.has_permission(type('Request', (), {'user': viewer_user})(), view) is True

    def test_module_permission_denied(self, viewer_user):
        view = type('View', (), {'required_module': 'commercial'})()
        perm = ModulePermission()
        assert perm.has_permission(type('Request', (), {'user': viewer_user})(), view) is False

    def test_unauthenticated_denied(self):
        view = type('View', (), {'required_permission': 'merchandising:view'})()
        perm = HasPermission()
        assert perm.has_permission(type('Request', (), {'user': None})(), view) is False


@pytest.mark.django_db
class TestRolePermissions:
    def test_role_str(self, viewer_role):
        assert str(viewer_role) == "Viewer"

    def test_permission_str(self, view_perm):
        assert str(view_perm) == "merchandising:view"

    def test_role_permission_count(self, merchandiser_role):
        assert merchandiser_role.role_permissions.count() == 2

    def test_unique_role_permission(self, merchandiser_role, view_perm):
        with pytest.raises(Exception):
            RolePermission.objects.create(role=merchandiser_role, permission=view_perm)

    def test_role_unique_together(self, rbac_tenant):
        Role.objects.create(tenant=rbac_tenant, name="Test", is_system=True)
        with pytest.raises(Exception):
            Role.objects.create(tenant=rbac_tenant, name="Test", is_system=True)
