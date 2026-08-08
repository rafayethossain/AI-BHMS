"""
Tests for Order-Level Costing Enhancements (RQ-013 / GC-031).

Covers: 8 cost categories, 5 costing sheet types, exchange-rate landed cost,
live-sheet ticking, and "Additional" line-item changes with approval.
"""
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.test import APIClient

from apps.merchandising.models import Costing, CostingLine, FileOpening, PurchaseOrder, Style, StyleVersion
from apps.setup.models import (
    UOM,
    Brand,
    Buyer,
    ColorCode,
    Country,
    Currency,
    Factory,
    ProductCategory,
    ProductDepartment,
    Season,
    Vendor,
)
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def merch_tenant(db):
    return Tenant.objects.create(
        name="Costing Test Co", slug="costing-test",
        schema_name="tenant_costing", status="active"
    )


@pytest.fixture
def other_tenant(db):
    return Tenant.objects.create(
        name="Other Test Co", slug="other-test",
        schema_name="tenant_other", status="active"
    )


@pytest.fixture
def merch_role(db, merch_tenant):
    role = Role.objects.create(tenant=merch_tenant, name="MerchAdmin", is_system=True)
    for mod in ["setup", "merchandising"]:
        for act in ["view", "create", "edit", "delete"]:
            perm, _ = Permission.objects.get_or_create(module=mod, action=act, defaults={"description": f"{mod}:{act}"})
            RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def merch_user(db, merch_tenant, merch_role):
    user = User.objects.create_user(
        username="costuser", email="cost@test.com",
        password="testpass123!@#", tenant=merch_tenant, status="active"
    )
    UserRole.objects.create(user=user, role=merch_role)
    return user


@pytest.fixture
def merch_client(api_client, merch_user):
    login = api_client.post("/api/v1/auth/login/", {
        "email": "cost@test.com", "password": "testpass123!@#"
    })
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
    return api_client


@pytest.fixture
def seed_data(merch_tenant):
    currency = Currency.objects.create(tenant=merch_tenant, code="USD", name="US Dollar", symbol="$")
    country = Country.objects.create(tenant=merch_tenant, code="BGD", name="Bangladesh")
    season = Season.objects.create(tenant=merch_tenant, code="SS26", name="SS 2026")
    cat = ProductCategory.objects.create(tenant=merch_tenant, code="Tops", name="Tops")
    dept = ProductDepartment.objects.create(tenant=merch_tenant, code="LAD", name="Ladies")
    buyer = Buyer.objects.create(tenant=merch_tenant, code="HM", name="H&M", country=country, currency=currency)
    brand = Brand.objects.create(tenant=merch_tenant, buyer=buyer, code="HM-BM", name="Basics")
    factory = Factory.objects.create(tenant=merch_tenant, code="F-001", name="Apex")
    color = ColorCode.objects.create(tenant=merch_tenant, code="BLK", name="Black", hex_code="#000000")
    color2 = ColorCode.objects.create(tenant=merch_tenant, code="WHT", name="White", hex_code="#FFFFFF")
    uom = UOM.objects.create(tenant=merch_tenant, code="YD", name="Yard")
    vendor = Vendor.objects.create(tenant=merch_tenant, code="V-001", name="FabricCo")
    return {
        "tenant": merch_tenant, "currency": currency, "country": country,
        "season": season, "cat": cat, "dept": dept, "buyer": buyer,
        "brand": brand, "factory": factory, "color": color, "color2": color2,
        "uom": uom, "vendor": vendor,
    }


def _create_style(tenant, buyer, number="STY-COS", name="Costing Style"):
    return Style.objects.create(tenant=tenant, style_number=number, name=name, buyer=buyer)


def _create_sv(tenant, style, version=1):
    return StyleVersion.objects.create(tenant=tenant, style=style, version_number=version, status="active")


def _create_fo(tenant, style, sv, buyer, factory):
    return FileOpening.objects.create(
        tenant=tenant, file_number="FO-COS", style=style, style_version=sv,
        buyer=buyer, factory=factory, file_date="2026-01-01"
    )


def _create_po(tenant, fo, buyer, factory, currency, quantity=1000, unit_price=10.0):
    return PurchaseOrder.objects.create(
        tenant=tenant, po_number="PO-COS", file_opening=fo, buyer=buyer,
        factory=factory, po_date="2026-01-15", delivery_date="2026-06-01",
        quantity=quantity, unit_price=Decimal(str(unit_price)),
        total_value=Decimal(str(quantity)) * Decimal(str(unit_price)),
        currency=currency,
    )


def _make_po(seed_data):
    t = seed_data["tenant"]
    style = _create_style(t, seed_data["buyer"])
    sv = _create_sv(t, style)
    fo = _create_fo(t, style, sv, seed_data["buyer"], seed_data["factory"])
    return _create_po(t, fo, seed_data["buyer"], seed_data["factory"], seed_data["currency"])


# ==================== Model: Costing enhancements ====================

@pytest.mark.django_db
class TestCostingModelEnhancements:
    def test_cost_categories_are_eight(self):
        assert len(Costing.COST_CATEGORIES) == 8

    def test_sheet_types_are_five(self):
        assert len(Costing.SHEET_TYPES) == 5

    def test_sheet_type_default_is_bd(self):
        costing = Costing(
            tenant=Tenant(id=1), purchase_order_id=1,
            fabric_cost=Decimal("5"), trim_cost=Decimal("1"),
        )
        assert costing.sheet_type == "bd"

    def test_landed_cost_converts_usd_to_gbp(self, seed_data):
        po = _make_po(seed_data)
        costing = Costing.objects.create(
            tenant=seed_data["tenant"], purchase_order=po,
            total_cost=Decimal("100.00"), exchange_rate=Decimal("0.80"),
        )
        assert costing.landed_cost == Decimal("80.00")

    def test_landed_cost_none_without_exchange_rate(self, seed_data):
        po = _make_po(seed_data)
        costing = Costing.objects.create(
            tenant=seed_data["tenant"], purchase_order=po,
            total_cost=Decimal("100.00"), exchange_rate=None,
        )
        assert costing.landed_cost is None

    def test_line_total_calculates_unit_price_times_consumption(self, seed_data):
        po = _make_po(seed_data)
        costing = Costing.objects.create(tenant=seed_data["tenant"], purchase_order=po)
        line = CostingLine.objects.create(
            tenant=seed_data["tenant"], costing=costing,
            category="making", description="CM price",
            unit_price=Decimal("2.50"), consumption=Decimal("3.00"),
        )
        assert line.line_total == Decimal("7.50")

    def test_additional_line_requires_original_description(self, seed_data):
        po = _make_po(seed_data)
        costing = Costing.objects.create(tenant=seed_data["tenant"], purchase_order=po)
        line = CostingLine(
            tenant=seed_data["tenant"], costing=costing,
            category="making", description="Additional CM price",
            is_additional=True, original_description="",
        )
        with pytest.raises(ValidationError):
            line.clean()


# ==================== API: Costing enhancements ====================

@pytest.mark.django_db
class TestCostingAPIEnhancements:
    def test_create_costing_with_sheet_type_and_exchange_rate(self, merch_client, seed_data):
        po = _make_po(seed_data)
        response = merch_client.post("/api/v1/merchandising/costings/", {
            "purchase_order": str(po.id),
            "fabric_cost": "5.00", "trim_cost": "1.50",
            "cm_cost": "2.00", "overhead_cost": "0.50",
            "sheet_type": "vn", "exchange_rate": "0.80",
        })
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["sheet_type"] == "vn"
        assert float(response.data["total_cost"]) == 9.0
        assert float(response.data["landed_cost"]) == 7.2

    def test_default_sheet_type_is_bd_on_create(self, merch_client, seed_data):
        po = _make_po(seed_data)
        response = merch_client.post("/api/v1/merchandising/costings/", {
            "purchase_order": str(po.id),
            "fabric_cost": "5.00",
        })
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["sheet_type"] == "bd"
        assert response.data["is_live"] is True
        assert response.data["landed_cost"] is None

    def test_filter_costings_by_sheet_type(self, merch_client, seed_data):
        po = _make_po(seed_data)
        merch_client.post("/api/v1/merchandising/costings/", {
            "purchase_order": str(po.id), "fabric_cost": "1", "sheet_type": "sl",
        })
        merch_client.post("/api/v1/merchandising/costings/", {
            "purchase_order": str(po.id), "version": 2, "fabric_cost": "1", "sheet_type": "vn",
        })
        resp = merch_client.get("/api/v1/merchandising/costings/", {"sheet_type": "vn"})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1
        assert resp.data["results"][0]["sheet_type"] == "vn"

    def test_filter_costings_by_is_live(self, merch_client, seed_data):
        po = _make_po(seed_data)
        merch_client.post("/api/v1/merchandising/costings/", {
            "purchase_order": str(po.id), "fabric_cost": "1", "is_live": False,
        })
        merch_client.post("/api/v1/merchandising/costings/", {
            "purchase_order": str(po.id), "version": 2, "fabric_cost": "1", "is_live": True,
        })
        resp = merch_client.get("/api/v1/merchandising/costings/", {"is_live": "true"})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1
        assert resp.data["results"][0]["is_live"] is True

    def test_set_live_untoggles_previous_live(self, merch_client, seed_data):
        po = _make_po(seed_data)
        v1 = merch_client.post("/api/v1/merchandising/costings/", {
            "purchase_order": str(po.id), "fabric_cost": "1", "sheet_type": "sl",
        }).data
        v2 = merch_client.post("/api/v1/merchandising/costings/", {
            "purchase_order": str(po.id), "version": 2, "fabric_cost": "1", "sheet_type": "vn",
        }).data
        resp = merch_client.post(f"/api/v1/merchandising/costings/{v2['id']}/set_live/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["is_live"] is True
        refreshed = Costing.objects.get(id=v1["id"])
        assert refreshed.is_live is False

    def test_costing_detail_includes_lines(self, merch_client, seed_data):
        po = _make_po(seed_data)
        costing = merch_client.post("/api/v1/merchandising/costings/", {
            "purchase_order": str(po.id), "fabric_cost": "5.00",
        }).data
        merch_client.post("/api/v1/merchandising/costing-lines/", {
            "costing": str(costing["id"]), "category": "making",
            "description": "CM price", "unit_price": "2.50", "consumption": "3.00",
        })
        resp = merch_client.get(f"/api/v1/merchandising/costings/{costing['id']}/")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data["lines"]) == 1
        assert resp.data["lines"][0]["line_total"] == "7.50"

    def test_costing_list_requires_auth(self, api_client):
        resp = api_client.get("/api/v1/merchandising/costings/")
        assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)


# ==================== API: CostingLine ====================

@pytest.mark.django_db
class TestCostingLineAPI:
    def test_cost_line_create(self, merch_client, seed_data):
        po = _make_po(seed_data)
        costing = merch_client.post("/api/v1/merchandising/costings/", {
            "purchase_order": str(po.id), "fabric_cost": "5.00",
        }).data
        response = merch_client.post("/api/v1/merchandising/costing-lines/", {
            "costing": str(costing["id"]), "category": "fabric",
            "description": "Fabric shell", "unit_price": "1.20", "consumption": "2.00",
        })
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["category"] == "fabric"
        assert response.data["line_total"] == "2.40"

    def test_cost_line_rejects_invalid_category(self, merch_client, seed_data):
        po = _make_po(seed_data)
        costing = merch_client.post("/api/v1/merchandising/costings/", {
            "purchase_order": str(po.id), "fabric_cost": "5.00",
        }).data
        response = merch_client.post("/api/v1/merchandising/costing-lines/", {
            "costing": str(costing["id"]), "category": "rockets",
            "description": "Bad", "unit_price": "1.00", "consumption": "1.00",
        })
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_cost_line_additional_requires_original_description(self, merch_client, seed_data):
        po = _make_po(seed_data)
        costing = merch_client.post("/api/v1/merchandising/costings/", {
            "purchase_order": str(po.id), "fabric_cost": "5.00",
        }).data
        response = merch_client.post("/api/v1/merchandising/costing-lines/", {
            "costing": str(costing["id"]), "category": "making",
            "description": "Additional CM price", "is_additional": True,
        })
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_cost_line_list_filter_by_category(self, merch_client, seed_data):
        po = _make_po(seed_data)
        costing = merch_client.post("/api/v1/merchandising/costings/", {
            "purchase_order": str(po.id), "fabric_cost": "5.00",
        }).data
        merch_client.post("/api/v1/merchandising/costing-lines/", {
            "costing": str(costing["id"]), "category": "fabric", "description": "F", "unit_price": "1", "consumption": "1",
        })
        merch_client.post("/api/v1/merchandising/costing-lines/", {
            "costing": str(costing["id"]), "category": "trim", "description": "T", "unit_price": "1", "consumption": "1",
        })
        resp = merch_client.get("/api/v1/merchandising/costing-lines/", {"category": "fabric"})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1

    def test_cost_line_list_filter_by_is_additional(self, merch_client, seed_data):
        po = _make_po(seed_data)
        costing = merch_client.post("/api/v1/merchandising/costings/", {
            "purchase_order": str(po.id), "fabric_cost": "5.00",
        }).data
        merch_client.post("/api/v1/merchandising/costing-lines/", {
            "costing": str(costing["id"]), "category": "fabric", "description": "F", "unit_price": "1", "consumption": "1",
        })
        merch_client.post("/api/v1/merchandising/costing-lines/", {
            "costing": str(costing["id"]), "category": "making", "description": "Additional",
            "unit_price": "1", "consumption": "1",
            "is_additional": True, "original_description": "CM price",
        })
        resp = merch_client.get("/api/v1/merchandising/costing-lines/", {"is_additional": "true"})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1
        assert resp.data["results"][0]["is_additional"] is True

    def test_cost_line_update(self, merch_client, seed_data):
        po = _make_po(seed_data)
        costing = merch_client.post("/api/v1/merchandising/costings/", {
            "purchase_order": str(po.id), "fabric_cost": "5.00",
        }).data
        line = merch_client.post("/api/v1/merchandising/costing-lines/", {
            "costing": str(costing["id"]), "category": "fabric", "description": "F", "unit_price": "1", "consumption": "1",
        }).data
        resp = merch_client.patch(f"/api/v1/merchandising/costing-lines/{line['id']}/", {
            "unit_price": "2.00",
        })
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["line_total"] == "2.00"

    def test_approve_additional_line_records_user_and_date(self, merch_client, seed_data):
        po = _make_po(seed_data)
        costing = merch_client.post("/api/v1/merchandising/costings/", {
            "purchase_order": str(po.id), "fabric_cost": "5.00",
        }).data
        line = merch_client.post("/api/v1/merchandising/costing-lines/", {
            "costing": str(costing["id"]), "category": "making", "description": "Additional",
            "unit_price": "1", "consumption": "1",
            "is_additional": True, "original_description": "CM price",
        }).data
        resp = merch_client.post(f"/api/v1/merchandising/costing-lines/{line['id']}/approve/")
        assert resp.status_code == status.HTTP_200_OK
        refreshed = CostingLine.objects.get(id=line["id"])
        assert refreshed.approved_by is not None
        assert refreshed.approved_at is not None

    def test_approve_non_additional_line_rejected(self, merch_client, seed_data):
        po = _make_po(seed_data)
        costing = merch_client.post("/api/v1/merchandising/costings/", {
            "purchase_order": str(po.id), "fabric_cost": "5.00",
        }).data
        line = merch_client.post("/api/v1/merchandising/costing-lines/", {
            "costing": str(costing["id"]), "category": "fabric", "description": "F", "unit_price": "1", "consumption": "1",
        }).data
        resp = merch_client.post(f"/api/v1/merchandising/costing-lines/{line['id']}/approve/")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_cost_line_requires_auth(self, api_client):
        resp = api_client.get("/api/v1/merchandising/costing-lines/")
        assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)

    def test_cost_line_tenant_scoping(self, api_client, merch_user, seed_data, other_tenant):
        po = _make_po(seed_data)
        costing = Costing.objects.create(tenant=seed_data["tenant"], purchase_order=po)
        CostingLine.objects.create(
            tenant=seed_data["tenant"], costing=costing,
            category="fabric", description="Tenant A fabric", unit_price=Decimal("1"), consumption=Decimal("1"),
        )
        other_buyer = Buyer.objects.create(
            tenant=other_tenant, code="B2", name="Buyer B",
            country=Country.objects.create(tenant=other_tenant, code="VNM", name="Vietnam"),
            currency=Currency.objects.create(tenant=other_tenant, code="EUR", name="Euro", symbol="€"),
        )
        other_factory = Factory.objects.create(tenant=other_tenant, code="F-B", name="Other Factory")
        other_style = Style.objects.create(tenant=other_tenant, style_number="STY-B", name="Other", buyer=other_buyer)
        other_sv = StyleVersion.objects.create(tenant=other_tenant, style=other_style, version_number=1, status="active")
        other_fo = FileOpening.objects.create(
            tenant=other_tenant, file_number="FO-B", style=other_style, style_version=other_sv,
            buyer=other_buyer, factory=other_factory, file_date="2026-01-01",
        )
        other_po = PurchaseOrder.objects.create(
            tenant=other_tenant, po_number="PO-B", file_opening=other_fo, buyer=other_buyer,
            factory=other_factory, po_date="2026-01-15", delivery_date="2026-06-01",
            quantity=10, unit_price=Decimal("1"), total_value=Decimal("10"),
            currency=Currency.objects.get(tenant=other_tenant, code="EUR"),
        )
        other_cost = Costing.objects.create(tenant=other_tenant, purchase_order=other_po)
        CostingLine.objects.create(
            tenant=other_tenant, costing=other_cost,
            category="fabric", description="Tenant B fabric", unit_price=Decimal("1"), consumption=Decimal("1"),
        )

        login = api_client.post("/api/v1/auth/login/", {
            "email": "cost@test.com", "password": "testpass123!@#"
        })
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        api_client.defaults["HTTP_X_TENANT_ID"] = str(seed_data["tenant"].id)
        resp = api_client.get("/api/v1/merchandising/costing-lines/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1
        assert resp.data["results"][0]["description"] == "Tenant A fabric"
