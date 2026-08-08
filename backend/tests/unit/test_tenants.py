"""
Tests for tenant models.
"""
import pytest
from apps.tenants.models import Tenant, Office


@pytest.mark.django_db
class TestTenant:
    def test_create_tenant(self, db):
        tenant = Tenant.objects.create(
            name="Test Company",
            slug="test-company",
            schema_name="tenant_test",
            status="active",
            plan="professional"
        )
        assert tenant.name == "Test Company"
        assert tenant.slug == "test-company"
        assert tenant.status == "active"
        assert tenant.plan == "professional"

    def test_tenant_str(self, db):
        tenant = Tenant.objects.create(
            name="Test Company",
            slug="test-company",
            schema_name="tenant_1"
        )
        assert str(tenant) == "Test Company"

    def test_tenant_unique_slug(self, db):
        Tenant.objects.create(
            name="Test Company",
            slug="test-company",
            schema_name="tenant_1"
        )
        with pytest.raises(Exception):
            Tenant.objects.create(
                name="Test Company 2",
                slug="test-company",
                schema_name="tenant_2"
            )

    def test_tenant_auto_slug(self, db):
        tenant = Tenant.objects.create(
            name="Auto Slug Company",
            schema_name="tenant_auto"
        )
        assert tenant.slug == "auto-slug-company"

    def test_tenant_auto_schema_name(self, db):
        tenant = Tenant.objects.create(
            name="Schema Test",
            slug="schema-test"
        )
        assert tenant.schema_name == "tenant_schema-test"


@pytest.mark.django_db
class TestOffice:
    def test_create_office(self, db, tenant):
        office = Office.objects.create(
            tenant=tenant,
            name="Head Office",
            code="HO",
            address="Dhaka",
            city="Dhaka",
            country="Bangladesh",
            phone="+8801712345678",
            email="ho@test.com",
            office_type="hq",
            status="active"
        )
        assert office.name == "Head Office"
        assert office.tenant == tenant
        assert office.city == "Dhaka"

    def test_office_str(self, db, tenant):
        office = Office.objects.create(
            tenant=tenant,
            name="Head Office",
            code="HO",
            address="Dhaka",
            city="Dhaka",
            country="Bangladesh"
        )
        assert str(office) == "HO - Head Office"
