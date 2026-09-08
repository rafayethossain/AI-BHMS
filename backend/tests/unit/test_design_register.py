"""
Unified Design register grid tests (merged Style + Design Sheet list).

The Design module shows one register (menu item "Design") whose grid rows carry
the design columns:

* Design / Style Code / Style Type / Based on / Status / Department /
  Designer / Risk Date / Contains / Live Orders / Completed Orders /
  Pattern Request Date / Annotation / Notes / Sketch.

This suite proves the list endpoint surfaces every register column and that
the live/completed order counts are correct and tenant-scoped.
"""
from __future__ import annotations

import datetime

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.merchandising.models import (
    DesignSheet,
    FileOpening,
    PurchaseOrder,
    Style,
    StyleTechPack,
)
from apps.setup.models import Buyer, Country, Factory, ProductCategory, ProductDepartment, ProductType
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()

REGISTER_FIELDS = [
    "style_code", "style_name", "product_type_name", "product_category_name", "based_on", "status",
    "department", "designer", "risk_date",
    "live_orders_count", "completed_orders_count",
    "pattern_request_date", "sketch_annotations", "note", "sketch",
]


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def tenant(db):
    return Tenant.objects.create(
        name="Register Co", slug="reg-test",
        schema_name="tenant_reg", status="active",
    )


def _role_with(tenant, name, permissions):
    role = Role.objects.create(tenant=tenant, name=name, is_system=True)
    for module, action in permissions:
        perm, _ = Permission.objects.get_or_create(
            module=module, action=action,
            defaults={"description": f"{module}:{action}"},
        )
        RolePermission.objects.create(role=role, permission=perm)
    return role


def _user(tenant, role, username, email):
    user = User.objects.create_user(
        username=username, email=email, password="testpass123!@#",
        tenant=tenant, status="active",
    )
    UserRole.objects.create(user=user, role=role)
    return user


@pytest.fixture
def reg_client(api_client, tenant):
    role = _role_with(tenant, "RegView", [
        ("merchandising", "view"),
    ])
    user = _user(tenant, role, "reguser", "reg@test.com")
    login = api_client.post("/api/v1/auth/login/", {
        "email": "reg@test.com", "password": "testpass123!@#",
    })
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
    return api_client


@pytest.fixture
def department(tenant):
    return ProductDepartment.objects.create(
        tenant=tenant, code="APP", name="Apparel",
    )


@pytest.fixture
def category(tenant):
    return ProductCategory.objects.create(
        tenant=tenant, code="APP", name="Apparel",
    )


@pytest.fixture
def product_type(tenant, category):
    return ProductType.objects.create(
        tenant=tenant, code="JGR", name="Jogger", category=category,
    )


@pytest.fixture
def buyer(tenant):
    Country.objects.create(tenant=tenant, name="Reg Land", code="RG1")
    return Buyer.objects.create(tenant=tenant, name="Reg Buyer", code="RGB1")


@pytest.fixture
def factory(tenant):
    return Factory.objects.create(tenant=tenant, name="Reg Factory", code="RGF1")


@pytest.fixture
def style(tenant, buyer, department):
    return Style.objects.create(
        tenant=tenant, style_number="REG-1001", name="Relaxed Jogger",
        buyer=buyer, department=department,
    )


@pytest.fixture
def techpack(tenant, style, product_type):
    return StyleTechPack.objects.create(
        tenant=tenant,
        techpack_number=StyleTechPack.next_techpack_number(tenant),
        style=style,
        product_type=product_type,
    )


@pytest.fixture
def design_sheet(tenant, techpack):
    sheet = DesignSheet.objects.create(tenant=tenant, tech_pack=techpack)
    techpack.based_on = "59073T"
    techpack.designer = "Emmi.Huynh"
    techpack.contains = "Div 3 / 3446"
    techpack.risk_date = datetime.date(2026, 9, 1)
    techpack.pattern_request_date = datetime.date(2026, 8, 15)
    techpack.sketch = "SK-REG-1001"
    techpack.note = "Front pocket change"
    techpack.save()
    sheet.sketch_annotations = [
        {"id": "a1", "x": 10, "y": 20, "text": "WAIST"},
        {"id": "a2", "x": 80, "y": 50, "text": "CUFF"},
    ]
    sheet.save(update_fields=["sketch_annotations"])
    return sheet


def _make_po(tenant, style, buyer, factory, po_number, status_value, file_number=None):
    fo = FileOpening.objects.create(
        tenant=tenant,
        file_number=file_number or f"FO-{po_number}",
        style=style,
        buyer=buyer,
        factory=factory,
        file_date=datetime.date(2026, 8, 1),
    )
    return PurchaseOrder.objects.create(
        tenant=tenant,
        po_number=po_number,
        file_opening=fo,
        buyer=buyer,
        factory=factory,
        po_date=datetime.date(2026, 8, 1),
        delivery_date=datetime.date(2026, 12, 1),
        quantity=100,
        unit_price="12.50",
        total_value="1250.00",
        status=status_value,
    )


@pytest.mark.django_db
class TestDesignRegisterAPI:
    def test_list_exposes_every_register_column(self, reg_client, design_sheet):
        resp = reg_client.get("/api/v1/merchandising/design-sheets/")
        assert resp.status_code == status.HTTP_200_OK
        row = resp.data["results"][0]
        for key in REGISTER_FIELDS:
            assert key in row, f"missing register column: {key}"
        assert row["style_code"] == "REG-1001"
        assert row["style_name"] == "Relaxed Jogger"
        assert row["product_type_name"] == "Jogger"
        assert row["product_category_name"] == "Apparel"
        assert "style_type" not in row
        assert "contains" not in row
        assert row["based_on"] == "59073T"
        assert row["department"] == "Apparel"
        assert row["designer"] == "Emmi.Huynh"
        assert row["risk_date"] == "2026-09-01"
        assert row["pattern_request_date"] == "2026-08-15"
        assert row["note"] == "Front pocket change"
        assert row["sketch"] == "SK-REG-1001"
        assert len(row["sketch_annotations"]) == 2

    def test_status_column_carries_design_sheet_status(
        self, reg_client, style, techpack
    ):
        sheet = DesignSheet.objects.create(
            tenant=techpack.tenant, tech_pack=techpack, status="closed",
        )
        resp = reg_client.get("/api/v1/merchandising/design-sheets/")
        row = next(
            r for r in resp.data["results"] if r["id"] == str(sheet.id)
        )
        assert row["status"] == "closed"

    def test_counts_live_and_completed_orders(
        self, reg_client, style, buyer, factory, techpack
    ):
        DesignSheet.objects.create(tenant=techpack.tenant, tech_pack=techpack)
        for idx, s_val in enumerate(
            ["open", "confirmed", "shipped", "delivered", "delivered", "draft", "cancelled"]
        ):
            _make_po(
                techpack.tenant, style, buyer, factory,
                f"REG-PO-{idx:03d}", s_val,
            )
        resp = reg_client.get("/api/v1/merchandising/design-sheets/")
        row = resp.data["results"][0]
        assert row["live_orders_count"] == 3
        assert row["completed_orders_count"] == 2

    def test_counts_respect_tenant_isolation(
        self, reg_client, tenant, style, buyer, factory, techpack,
        db, department,
    ):
        DesignSheet.objects.create(tenant=techpack.tenant, tech_pack=techpack)
        other_tenant = Tenant.objects.create(
            name="Other Co", slug="other-reg",
            schema_name="tenant_other_reg", status="active",
        )
        other_dept = ProductDepartment.objects.create(
            tenant=other_tenant, code="KTN", name="Knitwear",
        )
        other_buyer = Buyer.objects.create(
            tenant=other_tenant, name="Other Buyer", code="OTH1",
        )
        other_factory = Factory.objects.create(
            tenant=other_tenant, name="Other Factory", code="OTF1",
        )
        other_style = Style.objects.create(
            tenant=other_tenant, style_number="OTH-2001", name="Other Tee",
            buyer=other_buyer, department=other_dept,
        )
        _make_po(
            other_tenant, other_style, other_buyer, other_factory,
            "OTH-PO-001", "delivered",
        )
        resp = reg_client.get("/api/v1/merchandising/design-sheets/")
        assert resp.data["count"] == 1
        row = resp.data["results"][0]
        assert row["style_code"] == style.style_number
        assert row["live_orders_count"] == 0
        assert row["completed_orders_count"] == 0

    def test_unlinked_style_still_returns_safe_defaults(
        self, reg_client, tenant,
    ):
        tp = StyleTechPack.objects.create(
            tenant=tenant,
            techpack_number=StyleTechPack.next_techpack_number(tenant),
            style=None,
        )
        DesignSheet.objects.create(tenant=tenant, tech_pack=tp)
        resp = reg_client.get("/api/v1/merchandising/design-sheets/")
        row = resp.data["results"][0]
        assert row["style_code"] == ""
        assert row["style_name"] == ""
        assert row["department"] == ""
        assert row["live_orders_count"] == 0
        assert row["completed_orders_count"] == 0
        assert row["risk_date"] is None
        assert row["pattern_request_date"] is None