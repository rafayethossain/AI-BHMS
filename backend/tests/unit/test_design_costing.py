"""
Tests for Design Costing — Pattern Options (RQ-014 / GC-032).

Covers the GC Manual "Design Costings" requirements mapped onto the BHMS
Costing model: 4 patterned-fabric options, the single-size watermark,
sizes & ratio input, the confirmed tick, the size/width column, free-text
notes, and the pattern-amendment rule that a pattern amendment MUST request
a new costing at the same time.
"""
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.merchandising.models import (
    Costing,
    CostingLine,
    FileOpening,
    PurchaseOrder,
    Style,
    StyleVersion,
)
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
def design_tenant(db):
    return Tenant.objects.create(
        name="Design Costing Co", slug="design-costing",
        schema_name="tenant_design", status="active"
    )


@pytest.fixture
def other_tenant(db):
    return Tenant.objects.create(
        name="Other Co", slug="other-design",
        schema_name="tenant_other_design", status="active"
    )


@pytest.fixture
def design_role(db, design_tenant):
    role = Role.objects.create(tenant=design_tenant, name="DesignAdmin", is_system=True)
    for mod in ["setup", "merchandising"]:
        for act in ["view", "create", "edit", "delete"]:
            perm, _ = Permission.objects.get_or_create(
                module=mod, action=act, defaults={"description": f"{mod}:{act}"}
            )
            RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def design_user(db, design_tenant, design_role):
    user = User.objects.create_user(
        username="designcost", email="design@test.com",
        password="testpass123!@#", tenant=design_tenant, status="active"
    )
    UserRole.objects.create(user=user, role=design_role)
    return user


@pytest.fixture
def design_client(api_client, design_user):
    api_client.default_format = "json"
    login = api_client.post("/api/v1/auth/login/", {
        "email": "design@test.com", "password": "testpass123!@#"
    })
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
    return api_client


@pytest.fixture
def seed_data(design_tenant):
    currency = Currency.objects.create(tenant=design_tenant, code="USD", name="US Dollar", symbol="$")
    country = Country.objects.create(tenant=design_tenant, code="BGD", name="Bangladesh")
    season = Season.objects.create(tenant=design_tenant, code="SS26", name="SS 2026")
    cat = ProductCategory.objects.create(tenant=design_tenant, code="Tops", name="Tops")
    dept = ProductDepartment.objects.create(tenant=design_tenant, code="LAD", name="Ladies")
    buyer = Buyer.objects.create(tenant=design_tenant, code="HM", name="H&M", country=country, currency=currency)
    brand = Brand.objects.create(tenant=design_tenant, buyer=buyer, code="HM-BM", name="Basics")
    factory = Factory.objects.create(tenant=design_tenant, code="F-001", name="Apex")
    color = ColorCode.objects.create(tenant=design_tenant, code="BLK", name="Black", hex_code="#000000")
    uom = UOM.objects.create(tenant=design_tenant, code="YD", name="Yard")
    vendor = Vendor.objects.create(tenant=design_tenant, code="V-001", name="FabricCo")
    return {
        "tenant": design_tenant, "currency": currency, "country": country,
        "season": season, "cat": cat, "dept": dept, "buyer": buyer,
        "brand": brand, "factory": factory, "color": color,
        "uom": uom, "vendor": vendor,
    }


def _create_po(seed_data, number="PO-DES"):
    t = seed_data["tenant"]
    style = Style.objects.create(
        tenant=t, style_number="STY-DES", name="Design Style", buyer=seed_data["buyer"]
    )
    sv = StyleVersion.objects.create(tenant=t, style=style, version_number=1, status="active")
    fo = FileOpening.objects.create(
        tenant=t, file_number="FO-DES", style=style, style_version=sv,
        buyer=seed_data["buyer"], factory=seed_data["factory"], file_date="2026-01-01"
    )
    return PurchaseOrder.objects.create(
        tenant=t, po_number=number, file_opening=fo, buyer=seed_data["buyer"],
        factory=seed_data["factory"], po_date="2026-01-15", delivery_date="2026-06-01",
        quantity=1000, unit_price=Decimal("10.00"), total_value=Decimal("10000.00"),
        currency=seed_data["currency"],
    )


def _design_payload(po_id, **overrides):
    payload = {
        "purchase_order": str(po_id),
        "fabric_cost": "5.00",
        "notes": "Patterned shell, stripes match at side seams.",
        "is_single_size": False,
        "size_ratio": [{"size": "S", "ratio": 1}, {"size": "M", "ratio": 2}, {"size": "L", "ratio": 2}],
        "is_patterned": True,
        "patterned_fabric_options": ["striped", "match_point"],
    }
    payload.update(overrides)
    return payload


# ==================== Model: Design Costing fields ====================

@pytest.mark.django_db
class TestDesignCostingModel:
    def test_pattern_options_are_four(self):
        assert len(Costing.PATTERN_OPTIONS) == 4

    def test_is_single_size_default_false(self, seed_data):
        po = _create_po(seed_data)
        costing = Costing.objects.create(tenant=seed_data["tenant"], purchase_order=po)
        assert costing.is_single_size is False
        assert costing.single_size_watermark is False

    def test_single_size_watermark_reflects_is_single_size(self, seed_data):
        po = _create_po(seed_data)
        costing = Costing.objects.create(
            tenant=seed_data["tenant"], purchase_order=po, is_single_size=True
        )
        assert costing.single_size_watermark is True

    def test_size_ratio_defaults_to_list(self, seed_data):
        po = _create_po(seed_data)
        costing = Costing.objects.create(tenant=seed_data["tenant"], purchase_order=po)
        assert costing.size_ratio == []

    def test_patterned_fabric_options_default_to_list(self, seed_data):
        po = _create_po(seed_data)
        costing = Costing.objects.create(tenant=seed_data["tenant"], purchase_order=po)
        assert costing.patterned_fabric_options == []
        assert costing.is_patterned is False

    def test_confirmed_default_false(self, seed_data):
        po = _create_po(seed_data)
        costing = Costing.objects.create(tenant=seed_data["tenant"], purchase_order=po)
        assert costing.confirmed is False
        assert costing.confirmed_by is None
        assert costing.confirmed_at is None

    def test_size_width_default_blank(self, seed_data):
        po = _create_po(seed_data)
        costing = Costing.objects.create(tenant=seed_data["tenant"], purchase_order=po)
        line = CostingLine.objects.create(
            tenant=seed_data["tenant"], costing=costing,
            category="fabric", description="Fabric shell",
            unit_price=Decimal("1"), consumption=Decimal("2"),
        )
        assert line.size_width == ""


# ==================== API: Design Costing ====================

@pytest.mark.django_db
class TestDesignCostingAPI:
    def test_create_costing_with_design_fields(self, design_client, seed_data):
        po = _create_po(seed_data)
        response = design_client.post(
            "/api/v1/merchandising/costings/",
            _design_payload(po.id),
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["notes"] == "Patterned shell, stripes match at side seams."
        assert response.data["is_single_size"] is False
        assert response.data["single_size_watermark"] is False
        assert response.data["is_patterned"] is True
        assert response.data["patterned_fabric_options"] == ["striped", "match_point"]
        assert len(response.data["size_ratio"]) == 3
        assert response.data["confirmed"] is False

    def test_single_size_watermark_serialized(self, design_client, seed_data):
        po = _create_po(seed_data)
        response = design_client.post(
            "/api/v1/merchandising/costings/",
            _design_payload(po.id, is_single_size=True),
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["single_size_watermark"] is True

    def test_cost_line_size_width_writable(self, design_client, seed_data):
        po = _create_po(seed_data)
        costing = design_client.post(
            "/api/v1/merchandising/costings/", _design_payload(po.id)
        ).data
        response = design_client.post("/api/v1/merchandising/costing-lines/", {
            "costing": str(costing["id"]), "category": "fabric",
            "description": "Fabric shell", "unit_price": "1.20", "consumption": "2.00",
            "size_width": "58 in",
        })
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["size_width"] == "58 in"

    def test_filter_costings_by_is_single_size(self, design_client, seed_data):
        po = _create_po(seed_data)
        design_client.post(
            "/api/v1/merchandising/costings/",
            _design_payload(po.id, is_single_size=True),
        )
        design_client.post(
            "/api/v1/merchandising/costings/",
            _design_payload(po.id, version=2, is_single_size=False),
        )
        resp = design_client.get("/api/v1/merchandising/costings/", {"is_single_size": "true"})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1
        assert resp.data["results"][0]["single_size_watermark"] is True

    def test_filter_costings_by_is_patterned(self, design_client, seed_data):
        po = _create_po(seed_data)
        design_client.post(
            "/api/v1/merchandising/costings/",
            _design_payload(po.id, is_patterned=True, patterned_fabric_options=["checked"]),
        )
        design_client.post(
            "/api/v1/merchandising/costings/",
            _design_payload(po.id, version=2, is_patterned=False, patterned_fabric_options=[]),
        )
        resp = design_client.get("/api/v1/merchandising/costings/", {"is_patterned": "true"})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1
        assert resp.data["results"][0]["is_patterned"] is True

    def test_filter_costings_by_confirmed(self, design_client, seed_data):
        po = _create_po(seed_data)
        design_client.post(
            "/api/v1/merchandising/costings/",
            _design_payload(po.id, version=2, confirmed=True),
        )
        resp = design_client.get("/api/v1/merchandising/costings/", {"confirmed": "true"})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1
        assert resp.data["results"][0]["confirmed"] is True

    def test_patterned_requires_at_least_one_option(self, design_client, seed_data):
        po = _create_po(seed_data)
        response = design_client.post(
            "/api/v1/merchandising/costings/",
            _design_payload(po.id, is_patterned=True, patterned_fabric_options=[]),
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_non_patterned_rejects_options(self, design_client, seed_data):
        po = _create_po(seed_data)
        response = design_client.post(
            "/api/v1/merchandising/costings/",
            _design_payload(po.id, is_patterned=False, patterned_fabric_options=["striped"]),
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_patterned_options_must_be_known(self, design_client, seed_data):
        po = _create_po(seed_data)
        response = design_client.post(
            "/api/v1/merchandising/costings/",
            _design_payload(po.id, patterned_fabric_options=["camouflage"]),
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_size_ratio_ratio_must_be_positive(self, design_client, seed_data):
        po = _create_po(seed_data)
        response = design_client.post(
            "/api/v1/merchandising/costings/",
            _design_payload(po.id, size_ratio=[{"size": "S", "ratio": 0}]),
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_size_ratio_entry_requires_size(self, design_client, seed_data):
        po = _create_po(seed_data)
        response = design_client.post(
            "/api/v1/merchandising/costings/",
            _design_payload(po.id, size_ratio=[{"size": "", "ratio": 2}]),
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_confirm_sets_user_and_date(self, design_client, seed_data, design_user):
        po = _create_po(seed_data)
        costing = design_client.post(
            "/api/v1/merchandising/costings/", _design_payload(po.id)
        ).data
        response = design_client.post(
            f"/api/v1/merchandising/costings/{costing['id']}/confirm/"
        )
        assert response.status_code == status.HTTP_200_OK
        refreshed = Costing.objects.get(id=costing["id"])
        assert refreshed.confirmed is True
        assert refreshed.confirmed_by == design_user
        assert refreshed.confirmed_at is not None

    def test_pattern_amendment_requests_new_costing(self, design_client, seed_data):
        po = _create_po(seed_data)
        costing = design_client.post(
            "/api/v1/merchandising/costings/", _design_payload(po.id)
        ).data
        design_client.post("/api/v1/merchandising/costing-lines/", {
            "costing": str(costing["id"]), "category": "fabric",
            "description": "Fabric shell", "unit_price": "1.20", "consumption": "2.00",
            "size_width": "58 in",
        })
        response = design_client.post(
            f"/api/v1/merchandising/costings/{costing['id']}/pattern_amendment/",
            {"note": "Stripes now run across the body; re-cost."},
        )
        assert response.status_code == status.HTTP_201_CREATED
        new_cost = response.data
        assert new_cost["id"] != costing["id"]
        assert new_cost["version"] == costing["version"] + 1
        assert new_cost["status"] == "draft"
        assert new_cost["is_live"] is False
        assert new_cost["confirmed"] is False
        assert "Stripes now run across the body" in new_cost["notes"]
        assert new_cost["patterned_fabric_options"] == costing["patterned_fabric_options"]
        assert len(new_cost["lines"]) == 1
        assert new_cost["lines"][0]["size_width"] == "58 in"
        assert new_cost["lines"][0]["approved_by"] is None

    def test_pattern_amendment_requires_note(self, design_client, seed_data):
        po = _create_po(seed_data)
        costing = design_client.post(
            "/api/v1/merchandising/costings/", _design_payload(po.id)
        ).data
        response = design_client.post(
            f"/api/v1/merchandising/costings/{costing['id']}/pattern_amendment/", {}
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_design_costing_list_requires_auth(self, api_client):
        resp = api_client.get("/api/v1/merchandising/costings/")
        assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
