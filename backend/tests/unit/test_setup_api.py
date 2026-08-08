"""
Tests for Setup API endpoints.
"""
import pytest
import io
import csv
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from apps.tenants.models import Tenant
from apps.users.models import Role, UserRole, Permission, RolePermission
from apps.setup.models import (
    Season, Buyer, Brand, Factory, Currency, Country,
    Department, UOM, ColorCode, Vendor, ProductCategory,
    PaymentTerms, DeliveryMode
)

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def setup_tenant(db):
    return Tenant.objects.create(
        name="Setup Test Co", slug="setup-test",
        schema_name="tenant_setup", status="active"
    )


@pytest.fixture
def setup_role(db, setup_tenant):
    role = Role.objects.create(tenant=setup_tenant, name="SetupAdmin", is_system=True)
    for mod in ["setup", "merchandising"]:
        for act in ["view", "create", "edit", "delete"]:
            perm, _ = Permission.objects.get_or_create(module=mod, action=act, defaults={"description": f"{mod}:{act}"})
            RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def setup_user(db, setup_tenant, setup_role):
    user = User.objects.create_user(
        username="setupuser", email="setup@test.com",
        password="testpass123!@#", tenant=setup_tenant, status="active"
    )
    UserRole.objects.create(user=user, role=setup_role)
    return user


@pytest.fixture
def auth_client(api_client, setup_user):
    login = api_client.post("/api/v1/auth/login/", {
        "email": "setup@test.com", "password": "testpass123!@#"
    })
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
    return api_client


@pytest.fixture
def seed_data(setup_tenant):
    currency = Currency.objects.create(tenant=setup_tenant, code="USD", name="US Dollar", symbol="$")
    country = Country.objects.create(tenant=setup_tenant, code="BGD", name="Bangladesh")
    dept = Department.objects.create(tenant=setup_tenant, code="MER", name="Merchandising")
    cat = ProductCategory.objects.create(tenant=setup_tenant, code="Tops", name="Tops")
    season = Season.objects.create(tenant=setup_tenant, code="SS26", name="Summer Spring 2026")
    buyer = Buyer.objects.create(tenant=setup_tenant, code="HM", name="H&M", country=country, currency=currency)
    brand = Brand.objects.create(tenant=setup_tenant, buyer=buyer, code="HM-BM", name="H&M Basics")
    factory = Factory.objects.create(tenant=setup_tenant, code="F-001", name="Apex Knitwears")
    vendor = Vendor.objects.create(tenant=setup_tenant, code="VEN-001", name="Textile Suppliers Ltd")
    color = ColorCode.objects.create(tenant=setup_tenant, code="BLK", name="Black", hex_code="#000000")
    uom = UOM.objects.create(tenant=setup_tenant, code="KGS", name="Kilograms")
    pt = PaymentTerms.objects.create(tenant=setup_tenant, code="LC-S", name="LC Sight", days=30)
    dm = DeliveryMode.objects.create(tenant=setup_tenant, code="FOB", name="Free On Board")

    return {
        "currency": currency, "country": country, "department": dept,
        "category": cat, "season": season, "buyer": buyer, "brand": brand,
        "factory": factory, "vendor": vendor, "color": color, "uom": uom,
        "payment_terms": pt, "delivery_mode": dm,
    }


@pytest.mark.django_db
class TestSeasonAPI:
    def test_list_seasons(self, auth_client, seed_data):
        response = auth_client.get("/api/v1/setup/seasons/")
        assert response.status_code == status.HTTP_200_OK

    def test_create_season(self, auth_client):
        response = auth_client.post("/api/v1/setup/seasons/", {
            "code": "FW26", "name": "Fall Winter 2026"
        })
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["code"] == "FW26"

    def test_get_season(self, auth_client, seed_data):
        season = seed_data["season"]
        response = auth_client.get(f"/api/v1/setup/seasons/{season.id}/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["code"] == "SS26"

    def test_update_season(self, auth_client, seed_data):
        season = seed_data["season"]
        response = auth_client.patch(f"/api/v1/setup/seasons/{season.id}/", {"name": "SS 2026 Updated"})
        assert response.status_code == status.HTTP_200_OK

    def test_delete_season(self, auth_client, seed_data):
        season = seed_data["season"]
        response = auth_client.delete(f"/api/v1/setup/seasons/{season.id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT


@pytest.mark.django_db
class TestBuyerAPI:
    def test_list_buyers(self, auth_client, seed_data):
        response = auth_client.get("/api/v1/setup/buyers/")
        assert response.status_code == status.HTTP_200_OK

    def test_create_buyer(self, auth_client, seed_data):
        response = auth_client.post("/api/v1/setup/buyers/", {
            "code": "IND", "name": "Inditex",
            "country": str(seed_data["country"].id),
        })
        assert response.status_code == status.HTTP_201_CREATED

    def test_buyer_has_brands_endpoint(self, auth_client, seed_data):
        buyer = seed_data["buyer"]
        response = auth_client.get(f"/api/v1/setup/buyers/{buyer.id}/brands/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1


@pytest.mark.django_db
class TestFactoryAPI:
    def test_list_factories(self, auth_client, seed_data):
        response = auth_client.get("/api/v1/setup/factories/")
        assert response.status_code == status.HTTP_200_OK

    def test_create_factory(self, auth_client):
        response = auth_client.post("/api/v1/setup/factories/", {
            "code": "F-002", "name": "Epic Group"
        })
        assert response.status_code == status.HTTP_201_CREATED

    def test_filter_by_type(self, auth_client, seed_data):
        f = seed_data["factory"]
        f.factory_type = "knitting"
        f.save()
        response = auth_client.get("/api/v1/setup/factories/?factory_type=knitting")
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestCurrencyAPI:
    def test_list_currencies(self, auth_client, seed_data):
        response = auth_client.get("/api/v1/setup/currencies/")
        assert response.status_code == status.HTTP_200_OK

    def test_create_currency(self, auth_client):
        response = auth_client.post("/api/v1/setup/currencies/", {
            "code": "GBP", "name": "British Pound", "symbol": "\u00a3"
        })
        assert response.status_code == status.HTTP_201_CREATED


@pytest.mark.django_db
class TestSetupImport:
    def _make_csv(self, rows):
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
        return SimpleUploadedFile("test.csv", output.getvalue().encode("utf-8"), content_type="text/csv")

    def test_import_buyers(self, auth_client, setup_tenant):
        file = self._make_csv([
            {"code": "CNA", "name": "CNA International", "contact_person": "John", "email": "john@cna.com", "phone": "+31-20", "address": "Amsterdam"},
            {"code": "DEC", "name": "Decathlon", "contact_person": "Pierre", "email": "pierre@decathlon.com", "phone": "+33-1", "address": "Paris"},
        ])
        response = auth_client.post("/api/v1/setup/import/?entity=buyers", {"file": file}, format="multipart")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["total_rows"] == 2
        assert response.data["created"] + response.data["updated"] == 2
        assert Buyer.objects.filter(tenant=setup_tenant).count() == 2

    def test_import_seasons(self, auth_client, setup_tenant):
        file = self._make_csv([
            {"code": "SS27", "name": "Spring Summer 2027"},
            {"code": "FW27", "name": "Fall Winter 2027"},
        ])
        response = auth_client.post("/api/v1/setup/import/?entity=seasons", {"file": file}, format="multipart")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["total_rows"] == 2
        assert response.data["created"] + response.data["updated"] == 2

    def test_import_invalid_entity(self, auth_client):
        file = self._make_csv([{"code": "X", "name": "Y"}])
        response = auth_client.post("/api/v1/setup/import/?entity=invalid", {"file": file}, format="multipart")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_import_no_file(self, auth_client):
        response = auth_client.post("/api/v1/setup/import/?entity=buyers")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_import_missing_columns(self, auth_client):
        file = SimpleUploadedFile("test.csv", b"code\nA\nB", content_type="text/csv")
        response = auth_client.post("/api/v1/setup/import/?entity=buyers", {"file": file}, format="multipart")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_import_duplicate_updates(self, auth_client, seed_data):
        file = self._make_csv([
            {"code": "HM", "name": "H&M Updated", "contact_person": "", "email": "", "phone": "", "address": ""},
        ])
        response = auth_client.post("/api/v1/setup/import/?entity=buyers", {"file": file}, format="multipart")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["total_rows"] == 1
        assert response.data["created"] + response.data["updated"] == 1


@pytest.mark.django_db
class TestRiskLevelAPI:
    """Tests for /api/v1/setup/risk-levels/ CRUD."""

    def test_list_risk_levels(self, auth_client, seed_data):
        from apps.setup.models import RiskLevel
        RiskLevel.objects.create(tenant=seed_data["country"].tenant, code="green", name="Low", color="#00FF00")
        response = auth_client.get("/api/v1/setup/risk-levels/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] >= 1

    def test_create_risk_level(self, auth_client, setup_tenant):
        response = auth_client.post("/api/v1/setup/risk-levels/", {
            "code": "amber", "name": "Medium Risk", "color": "#FFA500",
            "description": "Requires monitoring", "sort_order": 2, "status": "active",
        })
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["code"] == "amber"
        assert response.data["color"] == "#FFA500"
        assert response.data["sort_order"] == 2

    def test_get_risk_level(self, auth_client, seed_data):
        from apps.setup.models import RiskLevel
        risk = RiskLevel.objects.create(tenant=seed_data["country"].tenant, code="red", name="High", color="#FF0000")
        response = auth_client.get(f"/api/v1/setup/risk-levels/{risk.id}/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["code"] == "red"

    def test_update_risk_level(self, auth_client, seed_data):
        from apps.setup.models import RiskLevel
        risk = RiskLevel.objects.create(tenant=seed_data["country"].tenant, code="cyan", name="Info", color="#00FFFF")
        response = auth_client.patch(f"/api/v1/setup/risk-levels/{risk.id}/", {"name": "Information"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Information"

    def test_delete_risk_level(self, auth_client, seed_data):
        from apps.setup.models import RiskLevel
        risk = RiskLevel.objects.create(tenant=seed_data["country"].tenant, code="none", name="None", color="#808080")
        response = auth_client.delete(f"/api/v1/setup/risk-levels/{risk.id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not RiskLevel.objects.filter(id=risk.id).exists()
