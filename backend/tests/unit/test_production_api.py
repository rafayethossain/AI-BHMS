"""
Tests for production app.
"""
import pytest
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.tenants.models import Tenant
from apps.users.models import Role, UserRole, Permission, RolePermission
from apps.setup.models import Factory, Currency, Country, Season, Buyer, Brand
from apps.merchandising.models import Style, StyleVersion, FileOpening, PurchaseOrder
from apps.production.models import ProductionPlan, DailyProduction

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def prod_tenant(db):
    return Tenant.objects.create(
        name="Production Test Co", slug="prod-test",
        schema_name="tenant_prod", status="active"
    )


@pytest.fixture
def prod_role(db, prod_tenant):
    role = Role.objects.create(tenant=prod_tenant, name="ProdAdmin", is_system=True)
    for mod in ["production", "merchandising", "setup"]:
        for act in ["view", "create", "edit", "delete"]:
            perm, _ = Permission.objects.get_or_create(
                module=mod, action=act,
                defaults={"description": f"{mod}:{act}"}
            )
            RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def prod_user(db, prod_tenant, prod_role):
    user = User.objects.create_user(
        username="produser", email="prod@test.com",
        password="testpass123!@#", tenant=prod_tenant, status="active"
    )
    UserRole.objects.create(user=user, role=prod_role)
    return user


@pytest.fixture
def prod_client(api_client, prod_user):
    api_client.force_authenticate(user=prod_user)
    return api_client


@pytest.fixture
def seed_data(prod_tenant):
    currency = Currency.objects.create(tenant=prod_tenant, code="USD", name="US Dollar", symbol="$")
    country = Country.objects.create(tenant=prod_tenant, code="BGD", name="Bangladesh")
    season = Season.objects.create(tenant=prod_tenant, code="SS26", name="SS 2026")
    buyer = Buyer.objects.create(tenant=prod_tenant, code="HM", name="H&M", country=country, currency=currency)
    brand = Brand.objects.create(tenant=prod_tenant, buyer=buyer, code="HM-BM", name="Basics")
    factory = Factory.objects.create(tenant=prod_tenant, code="F-001", name="Apex Knitwears")
    style = Style.objects.create(tenant=prod_tenant, style_number="STY-001", name="Test Style", buyer=buyer)
    sv = StyleVersion.objects.create(tenant=prod_tenant, style=style, version_number=1, status="active")
    fo = FileOpening.objects.create(
        tenant=prod_tenant, file_number="FO-001", style=style, style_version=sv,
        buyer=buyer, factory=factory, file_date="2026-01-01"
    )
    po = PurchaseOrder.objects.create(
        tenant=prod_tenant, po_number="PO-001", file_opening=fo, buyer=buyer,
        factory=factory, po_date="2026-01-15", delivery_date="2026-06-01",
        quantity=1000, unit_price=10.00, total_value=10000.00, currency=currency,
    )
    return {
        "currency": currency, "country": country, "season": season,
        "buyer": buyer, "brand": brand, "factory": factory,
        "style": style, "sv": sv, "fo": fo, "po": po,
    }


# ==================== ProductionPlan Model Tests ====================

@pytest.mark.django_db
class TestProductionPlanModel:
    def test_create_plan(self, prod_tenant, seed_data):
        plan = ProductionPlan.objects.create(
            tenant=prod_tenant,
            purchase_order=seed_data["po"],
            factory=seed_data["factory"],
            plan_date="2026-03-01",
            quantity=1000,
            status="draft",
        )
        assert plan.status == "draft"
        assert plan.quantity == 1000
        assert plan.purchase_order == seed_data["po"]

    def test_plan_str(self, prod_tenant, seed_data):
        plan = ProductionPlan.objects.create(
            tenant=prod_tenant,
            purchase_order=seed_data["po"],
            factory=seed_data["factory"],
            plan_date="2026-03-01",
            quantity=500,
        )
        assert "PO-001" in str(plan)

    def test_plan_default_status(self, prod_tenant, seed_data):
        plan = ProductionPlan.objects.create(
            tenant=prod_tenant,
            purchase_order=seed_data["po"],
            factory=seed_data["factory"],
            plan_date="2026-03-01",
            quantity=500,
        )
        assert plan.status == "draft"

    def test_plan_ordering(self, prod_tenant, seed_data):
        plan1 = ProductionPlan.objects.create(
            tenant=prod_tenant, purchase_order=seed_data["po"],
            factory=seed_data["factory"], plan_date="2026-03-01", quantity=100,
        )
        plan2 = ProductionPlan.objects.create(
            tenant=prod_tenant, purchase_order=seed_data["po"],
            factory=seed_data["factory"], plan_date="2026-03-02", quantity=200,
        )
        plans = list(ProductionPlan.objects.filter(tenant=prod_tenant))
        assert plans[0].id == plan2.id
        assert plans[1].id == plan1.id


# ==================== ProductionPlan API Tests ====================

@pytest.mark.django_db
class TestProductionPlanAPI:
    def test_list_plans(self, prod_client, seed_data):
        ProductionPlan.objects.create(
            tenant=seed_data["po"].tenant, purchase_order=seed_data["po"],
            factory=seed_data["factory"], plan_date="2026-03-01", quantity=100,
        )
        response = prod_client.get("/api/v1/production/plans/")
        assert response.status_code == status.HTTP_200_OK

    def test_create_plan(self, prod_client, seed_data):
        response = prod_client.post("/api/v1/production/plans/", {
            "purchase_order": str(seed_data["po"].id),
            "factory": str(seed_data["factory"].id),
            "plan_date": "2026-03-01",
            "quantity": 1000,
        })
        assert response.status_code == status.HTTP_201_CREATED

    def test_retrieve_plan(self, prod_client, seed_data):
        plan = ProductionPlan.objects.create(
            tenant=seed_data["po"].tenant, purchase_order=seed_data["po"],
            factory=seed_data["factory"], plan_date="2026-03-01", quantity=100,
        )
        response = prod_client.get(f"/api/v1/production/plans/{plan.id}/")
        assert response.status_code == status.HTTP_200_OK

    def test_update_plan(self, prod_client, seed_data):
        plan = ProductionPlan.objects.create(
            tenant=seed_data["po"].tenant, purchase_order=seed_data["po"],
            factory=seed_data["factory"], plan_date="2026-03-01", quantity=100,
        )
        response = prod_client.patch(f"/api/v1/production/plans/{plan.id}/", {
            "quantity": 2000,
        })
        assert response.status_code == status.HTTP_200_OK

    def test_start_plan(self, prod_client, seed_data):
        plan = ProductionPlan.objects.create(
            tenant=seed_data["po"].tenant, purchase_order=seed_data["po"],
            factory=seed_data["factory"], plan_date="2026-03-01", quantity=100,
            status="draft",
        )
        response = prod_client.post(f"/api/v1/production/plans/{plan.id}/start/")
        assert response.status_code == status.HTTP_200_OK
        plan.refresh_from_db()
        assert plan.status == "in_progress"

    def test_complete_plan(self, prod_client, seed_data):
        plan = ProductionPlan.objects.create(
            tenant=seed_data["po"].tenant, purchase_order=seed_data["po"],
            factory=seed_data["factory"], plan_date="2026-03-01", quantity=100,
            status="in_progress",
        )
        response = prod_client.post(f"/api/v1/production/plans/{plan.id}/complete/")
        assert response.status_code == status.HTTP_200_OK
        plan.refresh_from_db()
        assert plan.status == "completed"

    def test_start_plan_invalid_status(self, prod_client, seed_data):
        plan = ProductionPlan.objects.create(
            tenant=seed_data["po"].tenant, purchase_order=seed_data["po"],
            factory=seed_data["factory"], plan_date="2026-03-01", quantity=100,
            status="completed",
        )
        response = prod_client.post(f"/api/v1/production/plans/{plan.id}/start/")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_complete_plan_invalid_status(self, prod_client, seed_data):
        plan = ProductionPlan.objects.create(
            tenant=seed_data["po"].tenant, purchase_order=seed_data["po"],
            factory=seed_data["factory"], plan_date="2026-03-01", quantity=100,
            status="draft",
        )
        response = prod_client.post(f"/api/v1/production/plans/{plan.id}/complete/")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_dashboard(self, prod_client, seed_data):
        ProductionPlan.objects.create(
            tenant=seed_data["po"].tenant, purchase_order=seed_data["po"],
            factory=seed_data["factory"], plan_date="2026-03-01", quantity=100,
            status="in_progress",
        )
        response = prod_client.get("/api/v1/production/plans/dashboard/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "total_plans" in data
        assert "active_plans" in data
        assert "today_actual" in data

    def test_export_plan(self, prod_client, seed_data):
        plan = ProductionPlan.objects.create(
            tenant=seed_data["po"].tenant, purchase_order=seed_data["po"],
            factory=seed_data["factory"], plan_date="2026-03-01", quantity=100,
        )
        response = prod_client.get(f"/api/v1/production/plans/{plan.id}/export/")
        assert response.status_code == status.HTTP_200_OK
        assert response["Content-Type"] == "text/csv"


# ==================== DailyProduction Model Tests ====================

@pytest.mark.django_db
class TestDailyProductionModel:
    def test_create_daily(self, prod_tenant, seed_data):
        daily = DailyProduction.objects.create(
            tenant=prod_tenant,
            factory=seed_data["factory"],
            purchase_order=seed_data["po"],
            production_date="2026-03-01",
            target_quantity=100,
            actual_quantity=95,
            passed_quantity=90,
            rejected_quantity=5,
        )
        assert daily.actual_quantity == 95
        assert daily.passed_quantity == 90
        assert daily.rejected_quantity == 5

    def test_daily_str(self, prod_tenant, seed_data):
        daily = DailyProduction.objects.create(
            tenant=prod_tenant, factory=seed_data["factory"],
            purchase_order=seed_data["po"], production_date="2026-03-01",
            actual_quantity=50,
        )
        assert "F-001" in str(daily)
        assert "2026-03-01" in str(daily)

    def test_daily_default_status(self, prod_tenant, seed_data):
        daily = DailyProduction.objects.create(
            tenant=prod_tenant, factory=seed_data["factory"],
            purchase_order=seed_data["po"], production_date="2026-03-01",
            actual_quantity=50,
        )
        assert daily.status == "active"


# ==================== DailyProduction API Tests ====================

@pytest.mark.django_db
class TestDailyProductionAPI:
    def test_list_daily(self, prod_client, seed_data):
        DailyProduction.objects.create(
            tenant=seed_data["po"].tenant, factory=seed_data["factory"],
            purchase_order=seed_data["po"], production_date="2026-03-01",
            actual_quantity=50,
        )
        response = prod_client.get("/api/v1/production/daily/")
        assert response.status_code == status.HTTP_200_OK

    def test_create_daily(self, prod_client, seed_data):
        response = prod_client.post("/api/v1/production/daily/", {
            "factory": str(seed_data["factory"].id),
            "purchase_order": str(seed_data["po"].id),
            "production_date": "2026-03-01",
            "target_quantity": 100,
            "actual_quantity": 95,
            "passed_quantity": 90,
            "rejected_quantity": 5,
        })
        assert response.status_code == status.HTTP_201_CREATED

    def test_daily_auto_calc_efficiency(self, prod_client, seed_data):
        response = prod_client.post("/api/v1/production/daily/", {
            "factory": str(seed_data["factory"].id),
            "purchase_order": str(seed_data["po"].id),
            "production_date": "2026-03-01",
            "target_quantity": 100,
            "actual_quantity": 80,
            "passed_quantity": 75,
            "rejected_quantity": 5,
        })
        assert response.status_code == status.HTTP_201_CREATED
        daily = DailyProduction.objects.get(id=response.data["id"])
        assert daily.efficiency == 80.0
        assert daily.dhu == 6.25

    def test_approve_daily(self, prod_client, seed_data):
        daily = DailyProduction.objects.create(
            tenant=seed_data["po"].tenant, factory=seed_data["factory"],
            purchase_order=seed_data["po"], production_date="2026-03-01",
            actual_quantity=50, status="active",
        )
        response = prod_client.post(f"/api/v1/production/daily/{daily.id}/approve/")
        assert response.status_code == status.HTTP_200_OK
        daily.refresh_from_db()
        assert daily.status == "approved"

    def test_approve_daily_already_approved(self, prod_client, seed_data):
        daily = DailyProduction.objects.create(
            tenant=seed_data["po"].tenant, factory=seed_data["factory"],
            purchase_order=seed_data["po"], production_date="2026-03-01",
            actual_quantity=50, status="approved",
        )
        response = prod_client.post(f"/api/v1/production/daily/{daily.id}/approve/")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_filter_daily_by_date(self, prod_client, seed_data):
        DailyProduction.objects.create(
            tenant=seed_data["po"].tenant, factory=seed_data["factory"],
            purchase_order=seed_data["po"], production_date="2026-03-01",
            actual_quantity=50,
        )
        DailyProduction.objects.create(
            tenant=seed_data["po"].tenant, factory=seed_data["factory"],
            purchase_order=seed_data["po"], production_date="2026-03-02",
            actual_quantity=60,
        )
        response = prod_client.get("/api/v1/production/daily/?production_date=2026-03-01")
        assert response.status_code == status.HTTP_200_OK
