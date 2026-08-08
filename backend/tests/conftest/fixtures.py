"""
Test fixtures for BHMS.
"""
import pytest
from django.contrib.auth import get_user_model
from apps.tenants.models import Tenant
from apps.users.models import Role, UserRole

User = get_user_model()


@pytest.fixture
def tenant(db):
    """Create a test tenant."""
    return Tenant.objects.create(
        name="Test Company",
        slug="test-company",
        schema_name="tenant_test",
        status="active",
        plan="professional"
    )


@pytest.fixture
def role(db, tenant):
    """Create a test role."""
    return Role.objects.create(
        tenant=tenant,
        name="Admin",
        description="System Administrator",
        is_system=True
    )


@pytest.fixture
def user(db, tenant, role):
    """Create a test user."""
    user = User.objects.create_user(
        username="testuser",
        email="test@example.com",
        password="testpass123!@#",
        first_name="Test",
        last_name="User",
        tenant=tenant,
        status="active"
    )
    UserRole.objects.create(user=user, role=role)
    return user


@pytest.fixture
def merchandiser_user(db, tenant):
    """Create a merchandiser user."""
    role = Role.objects.create(
        tenant=tenant,
        name="Merchandiser",
        description="Merchandiser"
    )
    user = User.objects.create_user(
        username="merchandiser",
        email="merchandiser@example.com",
        password="testpass123!@#",
        first_name="Merch",
        last_name="User",
        tenant=tenant,
        status="active"
    )
    UserRole.objects.create(user=user, role=role)
    return user
