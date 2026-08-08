"""
Tests for RQ-019: Stock Fabric Management (formerly GC-027).
"""
import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.test import APIClient

from apps.merchandising.models import FileOpening, StockFabricAllocation, Style, StyleVersion
from apps.setup.models import Buyer, Country, Currency, Factory
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def sf_tenant(db):
    return Tenant.objects.create(
        name="SF Test Co", slug="sf-test",
        schema_name="tenant_sf", status="active",
    )


@pytest.fixture
def sf_role(db, sf_tenant):
    role = Role.objects.create(tenant=sf_tenant, name="SFMerch", is_system=True)
    for mod in ["merchandising", "setup"]:
        for act in ["view", "create", "edit", "delete"]:
            perm, _ = Permission.objects.get_or_create(
                module=mod, action=act,
                defaults={"description": f"{mod}:{act}"}
            )
            RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def sf_viewer_role(db, sf_tenant):
    role = Role.objects.create(tenant=sf_tenant, name="SFViewer", is_system=True)
    perm, _ = Permission.objects.get_or_create(
        module="merchandising", action="view",
        defaults={"description": "merchandising:view"}
    )
    RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def sf_user(db, sf_tenant, sf_role):
    user = User.objects.create_user(
        username="sfuser", email="sf@test.com",
        password="testpass123!@#", tenant=sf_tenant, status="active",
        first_name="SF", last_name="User",
    )
    UserRole.objects.create(user=user, role=sf_role)
    return user


@pytest.fixture
def sf_viewer(db, sf_tenant, sf_viewer_role):
    user = User.objects.create_user(
        username="sfviewer", email="sfv@test.com",
        password="testpass123!@#", tenant=sf_tenant, status="active",
        first_name="SFV", last_name="Viewer",
    )
    UserRole.objects.create(user=user, role=sf_viewer_role)
    return user


@pytest.fixture
def sf_client(api_client, sf_user):
    api_client.force_authenticate(user=sf_user)
    return api_client


@pytest.fixture
def sf_viewer_client(api_client, sf_viewer):
    api_client.force_authenticate(user=sf_viewer)
    return api_client


@pytest.fixture
def seed_fo(sf_tenant):
    currency = Currency.objects.create(tenant=sf_tenant, code="USD", name="US Dollar", symbol="$")
    country = Country.objects.create(tenant=sf_tenant, code="BGD", name="Bangladesh")
    buyer = Buyer.objects.create(tenant=sf_tenant, code="HM", name="H&M", country=country, currency=currency)
    factory = Factory.objects.create(tenant=sf_tenant, code="F-001", name="Apex Knitwears")
    style = Style.objects.create(tenant=sf_tenant, style_number="STY-001", name="Test Style", buyer=buyer)
    sv = StyleVersion.objects.create(tenant=sf_tenant, style=style, version_number=1, status="active")
    fo = FileOpening.objects.create(
        tenant=sf_tenant, file_number="FO-2025-010", style=style, style_version=sv,
        buyer=buyer, factory=factory, file_date="2026-01-01",
    )
    stock = FileOpening.objects.create(
        tenant=sf_tenant, file_number="FO-2025-011", style=style, style_version=sv,
        buyer=buyer, factory=factory, file_date="2026-01-01",
    )
    return {"fo": fo, "stock": stock, "buyer": buyer, "factory": factory, "style": style, "sv": sv}


class TestStockFabricModel:
    """RQ-019: FileOpening stock fabric fields + allocation ledger."""

    def test_default_not_stock_fabric(self, seed_fo):
        assert seed_fo["fo"].is_stock_fabric is False

    def test_stock_balance_meters_zero_when_no_total(self, seed_fo):
        assert seed_fo["fo"].stock_balance_meters == 0

    def test_mark_as_stock_fabric_sets_flags(self, seed_fo):
        stock = seed_fo["stock"]
        stock.mark_as_stock_fabric("stock fabric", 500)
        stock.refresh_from_db()
        assert stock.is_stock_fabric is True
        assert stock.stock_fabric_description == "stock fabric"
        assert stock.total_meters == 500
        assert stock.allocated_meters == 0
        assert stock.stock_balance_meters == 500

    def test_mark_as_stock_fabric_twice_raises(self, seed_fo):
        stock = seed_fo["stock"]
        stock.mark_as_stock_fabric("stock fabric", 500)
        with pytest.raises(ValueError):
            stock.mark_as_stock_fabric("stock fabric", 600)

    def test_allocate_stock_creates_allocation(self, seed_fo):
        stock = seed_fo["stock"]
        stock.mark_as_stock_fabric("stock fabric", 500)
        stock.allocate_stock(seed_fo["fo"], 100, notes="For order 1")
        alloc = StockFabricAllocation.objects.get(stock=stock, allocated_to=seed_fo["fo"])
        assert alloc.meters == 100
        assert alloc.notes == "For order 1"

    def test_allocate_stock_increments_allocated_meters(self, seed_fo):
        stock = seed_fo["stock"]
        stock.mark_as_stock_fabric("stock fabric", 500)
        stock.allocate_stock(seed_fo["fo"], 100)
        stock.refresh_from_db()
        assert stock.allocated_meters == 100
        assert stock.stock_balance_meters == 400

    def test_allocate_stock_reduces_balance(self, seed_fo):
        stock = seed_fo["stock"]
        stock.mark_as_stock_fabric("stock fabric", 300)
        stock.allocate_stock(seed_fo["fo"], 120)
        stock.allocate_stock(seed_fo["fo"], 80)
        stock.refresh_from_db()
        assert stock.allocated_meters == 200
        assert stock.stock_balance_meters == 100

    def test_allocate_stock_insufficient_balance_raises(self, seed_fo):
        stock = seed_fo["stock"]
        stock.mark_as_stock_fabric("stock fabric", 50)
        with pytest.raises(ValueError):
            stock.allocate_stock(seed_fo["fo"], 51)

    def test_allocate_stock_non_stock_raises(self, seed_fo):
        with pytest.raises(ValueError):
            seed_fo["fo"].allocate_stock(seed_fo["stock"], 10)

    def test_allocate_stock_invalid_meters_raises(self, seed_fo):
        stock = seed_fo["stock"]
        stock.mark_as_stock_fabric("stock fabric", 500)
        with pytest.raises((ValueError, DjangoValidationError)):
            stock.allocate_stock(seed_fo["fo"], 0)

    def test_allocate_stock_self_target_raises(self, seed_fo):
        stock = seed_fo["stock"]
        stock.mark_as_stock_fabric("stock fabric", 500)
        with pytest.raises(ValueError):
            stock.allocate_stock(stock, 10)

    def test_multiple_allocations_accumulate(self, seed_fo):
        stock = seed_fo["stock"]
        stock.mark_as_stock_fabric("stock fabric", 1000)
        fo2 = FileOpening.objects.create(
            tenant=seed_fo["fo"].tenant, file_number="FO-2025-012",
            style=seed_fo["style"], style_version=seed_fo["sv"],
            buyer=seed_fo["buyer"], factory=seed_fo["factory"],
            file_date="2026-01-01",
        )
        stock.allocate_stock(seed_fo["fo"], 200)
        stock.allocate_stock(fo2, 300)
        assert stock.stock_allocations.count() == 2
        stock.refresh_from_db()
        assert stock.allocated_meters == 500
        assert stock.stock_balance_meters == 500

    def test_allocation_records_destination_file_number(self, seed_fo):
        stock = seed_fo["stock"]
        stock.mark_as_stock_fabric("stock fabric", 500)
        stock.allocate_stock(seed_fo["fo"], 100)
        alloc = StockFabricAllocation.objects.get(stock=stock)
        assert alloc.allocated_to.file_number == "FO-2025-010"


class TestStockFabricAPI:
    """RQ-019: stock fabric viewset actions."""

    def test_requires_auth(self, api_client, seed_fo):
        r = api_client.post(f"/api/v1/merchandising/file-openings/{seed_fo['stock'].id}/mark_as_stock_fabric/",
                            {"stock_fabric_description": "stock fabric", "total_meters": 100})
        assert r.status_code == status.HTTP_401_UNAUTHORIZED

    def test_viewer_cannot_mark(self, sf_viewer_client, seed_fo):
        r = sf_viewer_client.post(f"/api/v1/merchandising/file-openings/{seed_fo['stock'].id}/mark_as_stock_fabric/",
                                  {"stock_fabric_description": "stock fabric", "total_meters": 100})
        assert r.status_code == status.HTTP_403_FORBIDDEN

    def test_viewer_cannot_allocate(self, sf_viewer_client, seed_fo):
        r = sf_viewer_client.post(f"/api/v1/merchandising/file-openings/{seed_fo['stock'].id}/allocate_stock/",
                                  {"allocated_to": seed_fo["fo"].id, "meters": 10})
        assert r.status_code == status.HTTP_403_FORBIDDEN

    def test_mark_as_stock_fabric_action(self, sf_client, seed_fo):
        r = sf_client.post(f"/api/v1/merchandising/file-openings/{seed_fo['stock'].id}/mark_as_stock_fabric/",
                           {"stock_fabric_description": "stock fabric", "total_meters": 250})
        assert r.status_code == status.HTTP_200_OK
        assert r.data["is_stock_fabric"] is True
        assert r.data["stock_fabric_description"] == "stock fabric"
        assert r.data["total_meters"] == "250.00"
        assert r.data["stock_balance_meters"] == "250.00"

    def test_create_stock_fabric_via_create_endpoint(self, sf_client, seed_fo):
        r = sf_client.post("/api/v1/merchandising/file-openings/", {
            "style": seed_fo["style"].id, "buyer": seed_fo["buyer"].id,
            "factory": seed_fo["factory"].id, "file_date": "2026-02-01",
            "is_stock_fabric": True, "stock_fabric_description": "stock fabric",
            "total_meters": 400,
        })
        assert r.status_code == status.HTTP_201_CREATED
        assert r.data["is_stock_fabric"] is True
        assert r.data["total_meters"] == "400.00"

    def test_list_filters_is_stock_fabric(self, sf_client, seed_fo):
        stock = seed_fo["stock"]
        stock.mark_as_stock_fabric("stock fabric", 100)
        r = sf_client.get("/api/v1/merchandising/file-openings/", {"is_stock_fabric": "true"})
        assert r.status_code == status.HTTP_200_OK
        ids = [row["id"] for row in r.data["results"]]
        assert str(stock.id) in ids
        assert str(seed_fo["fo"].id) not in ids

    def test_stock_status_returns_balance(self, sf_client, seed_fo):
        stock = seed_fo["stock"]
        stock.mark_as_stock_fabric("stock fabric", 300)
        stock.allocate_stock(seed_fo["fo"], 100)
        r = sf_client.get(f"/api/v1/merchandising/file-openings/{stock.id}/stock_status/")
        assert r.status_code == status.HTTP_200_OK
        assert r.data["is_stock_fabric"] is True
        assert r.data["total_meters"] == 300
        assert r.data["allocated_meters"] == 100
        assert r.data["stock_balance_meters"] == 200
        assert len(r.data["allocations"]) == 1
        assert r.data["allocations"][0]["allocated_to_number"] == "FO-2025-010"

    def test_allocate_stock_action(self, sf_client, seed_fo):
        stock = seed_fo["stock"]
        stock.mark_as_stock_fabric("stock fabric", 500)
        r = sf_client.post(f"/api/v1/merchandising/file-openings/{stock.id}/allocate_stock/",
                           {"allocated_to": seed_fo["fo"].id, "meters": 150, "notes": "to order"})
        assert r.status_code == status.HTTP_200_OK
        assert r.data["allocated_meters"] == "150.00"
        assert r.data["stock_balance_meters"] == "350.00"

    def test_allocate_stock_insufficient_balance_400(self, sf_client, seed_fo):
        stock = seed_fo["stock"]
        stock.mark_as_stock_fabric("stock fabric", 30)
        r = sf_client.post(f"/api/v1/merchandising/file-openings/{stock.id}/allocate_stock/",
                           {"allocated_to": seed_fo["fo"].id, "meters": 100})
        assert r.status_code == status.HTTP_400_BAD_REQUEST

    def test_allocate_stock_non_stock_400(self, sf_client, seed_fo):
        r = sf_client.post(f"/api/v1/merchandising/file-openings/{seed_fo['fo'].id}/allocate_stock/",
                           {"allocated_to": seed_fo["stock"].id, "meters": 10})
        assert r.status_code == status.HTTP_400_BAD_REQUEST

    def test_allocate_stock_missing_fields_400(self, sf_client, seed_fo):
        stock = seed_fo["stock"]
        stock.mark_as_stock_fabric("stock fabric", 500)
        r = sf_client.post(f"/api/v1/merchandising/file-openings/{stock.id}/allocate_stock/", {})
        assert r.status_code == status.HTTP_400_BAD_REQUEST

    def test_serializer_exposes_stock_fields(self, sf_client, seed_fo):
        stock = seed_fo["stock"]
        stock.mark_as_stock_fabric("stock fabric", 200)
        r = sf_client.get(f"/api/v1/merchandising/file-openings/{stock.id}/")
        assert r.status_code == status.HTTP_200_OK
        assert r.data["is_stock_fabric"] is True
        assert "stock_balance_meters" in r.data
        assert "allocated_meters" in r.data
