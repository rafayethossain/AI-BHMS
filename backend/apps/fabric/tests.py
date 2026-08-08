"""
Tests for Sprint 1: Fabric Management Foundation.
GC-004: Fabric Categories & HTS Codes
GC-005: Fabric Supplier & Mill Management
GC-006: Fabric Supplier RFQ Workflow
GC-007: Fabric Inventory/Booking System
"""
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def fabric_role(db, tenant):
    role = Role.objects.create(tenant=tenant, name="FabricAdmin", is_system=True)
    for act in ["view", "create", "edit", "delete"]:
        perm, _ = Permission.objects.get_or_create(module="fabric", action=act, defaults={"description": f"fabric:{act}"})
        RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def fabric_user(db, tenant, fabric_role):
    user = User.objects.create_user(
        username="fabricuser", email="fabric@test.com",
        password="testpass123!@#", tenant=tenant, status="active"
    )
    UserRole.objects.create(user=user, role=fabric_role)
    return user


@pytest.fixture
def auth_client(api_client, fabric_user):
    login = api_client.post("/api/v1/auth/login/", {
        "email": "fabric@test.com", "password": "testpass123!@#"
    })
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
    return api_client


# ── GC-004: Fabric Categories & HTS Codes ──────────────────────────────

@pytest.mark.django_db
class TestFabricCategoryModel:
    def test_create_fabric_category(self, tenant):
        from apps.fabric.models import FabricCategory
        cat = FabricCategory.objects.create(
            tenant=tenant,
            code="KNIT",
            name="Knit Fabric",
            description="Knitted fabrics including jersey, rib, interlock",
        )
        assert cat.code == "KNIT"
        assert cat.name == "Knit Fabric"
        assert cat.is_active is True
        assert str(cat) == "KNIT - Knit Fabric"

    def test_fabric_category_hierarchy(self, tenant):
        from apps.fabric.models import FabricCategory
        parent = FabricCategory.objects.create(
            tenant=tenant, code="WOVEN", name="Woven Fabric"
        )
        child = FabricCategory.objects.create(
            tenant=tenant, code="POPL", name="Poplin", parent=parent
        )
        assert child.parent == parent
        assert list(parent.children.all()) == [child]

    def test_fabric_category_unique_code_per_tenant(self, tenant):
        from apps.fabric.models import FabricCategory
        FabricCategory.objects.create(tenant=tenant, code="DENIM", name="Denim")
        with pytest.raises(Exception):
            FabricCategory.objects.create(tenant=tenant, code="DENIM", name="Duplicate")

    def test_fabric_category_active_default(self, tenant):
        from apps.fabric.models import FabricCategory
        cat = FabricCategory.objects.create(tenant=tenant, code="TEST", name="Test")
        assert cat.is_active is True


@pytest.mark.django_db
class TestHTSCodeModel:
    def test_create_hts_code(self, tenant):
        from apps.fabric.models import FabricCategory, HTSCode
        cat = FabricCategory.objects.create(tenant=tenant, code="KNIT", name="Knit")
        hts = HTSCode.objects.create(
            tenant=tenant,
            code="6006.10",
            description="Knit fabrics of cotton",
            fabric_category=cat,
            duty_rate=Decimal("12.00"),
        )
        assert hts.code == "6006.10"
        assert hts.duty_rate == Decimal("12.00")
        assert str(hts) == "6006.10 - Knit fabrics of cotton"

    def test_hts_code_no_category(self, tenant):
        from apps.fabric.models import HTSCode
        hts = HTSCode.objects.create(
            tenant=tenant,
            code="5209.42",
            description="Denim fabrics",
            duty_rate=Decimal("8.50"),
        )
        assert hts.fabric_category is None

    def test_hts_code_unique_code_per_tenant(self, tenant):
        from apps.fabric.models import HTSCode
        HTSCode.objects.create(tenant=tenant, code="5209.42", description="Denim")
        with pytest.raises(Exception):
            HTSCode.objects.create(tenant=tenant, code="5209.42", description="Duplicate")


# ── GC-005: Fabric Supplier & Mill Management ──────────────────────────

@pytest.mark.django_db
class TestFabricSupplierModel:
    def test_create_fabric_supplier(self, tenant):
        from apps.fabric.models import FabricSupplier
        from apps.setup.models import Country
        country = Country.objects.create(tenant=tenant, code="CHN", name="China")
        supplier = FabricSupplier.objects.create(
            tenant=tenant,
            code="SUP001",
            name="Shanghai Textiles Co.",
            country=country,
            contact_person="Li Wei",
            email="liwei@shanghaitex.com",
            lead_time_days=30,
            moq_meters=500,
            is_mill=True,
        )
        assert supplier.code == "SUP001"
        assert supplier.is_mill is True
        assert supplier.moq_meters == 500
        assert str(supplier) == "SUP001 - Shanghai Textiles Co."

    def test_fabric_supplier_no_vendor_link(self, tenant):
        from apps.fabric.models import FabricSupplier
        supplier = FabricSupplier.objects.create(
            tenant=tenant, code="SUP002", name="Local Supplier"
        )
        assert supplier.vendor is None
        assert supplier.country is None

    def test_fabric_supplier_unique_code(self, tenant):
        from apps.fabric.models import FabricSupplier
        FabricSupplier.objects.create(tenant=tenant, code="SUP003", name="First")
        with pytest.raises(Exception):
            FabricSupplier.objects.create(tenant=tenant, code="SUP003", name="Second")

    def test_fabric_supplier_active_default(self, tenant):
        from apps.fabric.models import FabricSupplier
        s = FabricSupplier.objects.create(tenant=tenant, code="SUP004", name="Active Test")
        assert s.is_active is True


@pytest.mark.django_db
class TestFabricMillModel:
    def test_create_fabric_mill(self, tenant):
        from apps.fabric.models import FabricMill
        from apps.setup.models import Country
        country = Country.objects.create(tenant=tenant, code="CHN", name="China")
        mill = FabricMill.objects.create(
            tenant=tenant,
            code="MILL001",
            name="Yangtze River Mills",
            country=country,
            city="Shanghai",
            capacity_meters_month=100000,
            rating=Decimal("4.50"),
            certification="OEKO-TEX",
        )
        assert mill.code == "MILL001"
        assert mill.capacity_meters_month == 100000
        assert mill.rating == Decimal("4.50")
        assert str(mill) == "MILL001 - Yangtze River Mills"

    def test_fabric_mill_active_default(self, tenant):
        from apps.fabric.models import FabricMill
        m = FabricMill.objects.create(tenant=tenant, code="MILL002", name="Test Mill")
        assert m.is_active is True

    def test_fabric_mill_unique_code(self, tenant):
        from apps.fabric.models import FabricMill
        FabricMill.objects.create(tenant=tenant, code="MILL003", name="First")
        with pytest.raises(Exception):
            FabricMill.objects.create(tenant=tenant, code="MILL003", name="Second")

    def test_fabric_mill_optional_fields(self, tenant):
        from apps.fabric.models import FabricMill
        m = FabricMill.objects.create(tenant=tenant, code="MILL004", name="Minimal Mill")
        assert m.country is None
        assert m.capacity_meters_month is None
        assert m.rating is None
        assert m.certification == ""


# ── GC-006: Fabric Supplier RFQ Workflow ───────────────────────────────

@pytest.mark.django_db
class TestRFQModel:
    def test_create_rfq(self, tenant):
        from apps.fabric.models import RFQ, FabricSupplier
        supplier = FabricSupplier.objects.create(
            tenant=tenant, code="SUP010", name="RFQ Supplier"
        )
        rfq = RFQ.objects.create(
            tenant=tenant,
            rfq_number="RFQ-2025-0001",
            supplier=supplier,
            status="sent",
            notes="Urgent requirement",
        )
        assert rfq.rfq_number == "RFQ-2025-0001"
        assert rfq.supplier == supplier
        assert rfq.status == "sent"
        assert str(rfq) == "RFQ-2025-0001"

    def test_rfq_status_default_draft(self, tenant):
        from apps.fabric.models import RFQ, FabricSupplier
        supplier = FabricSupplier.objects.create(
            tenant=tenant, code="SUP011", name="Draft Supplier"
        )
        rfq = RFQ.objects.create(
            tenant=tenant, rfq_number="RFQ-2025-0002", supplier=supplier
        )
        assert rfq.status == "draft"

    def test_rfq_unique_number(self, tenant):
        from apps.fabric.models import RFQ, FabricSupplier
        supplier = FabricSupplier.objects.create(
            tenant=tenant, code="SUP012", name="Unique Test"
        )
        RFQ.objects.create(tenant=tenant, rfq_number="RFQ-2025-0003", supplier=supplier)
        with pytest.raises(Exception):
            RFQ.objects.create(tenant=tenant, rfq_number="RFQ-2025-0003", supplier=supplier)


@pytest.mark.django_db
class TestRFQLineItemModel:
    def test_create_rfq_line_item(self, tenant):
        from apps.fabric.models import RFQ, FabricCategory, FabricSupplier, RFQLineItem
        cat = FabricCategory.objects.create(tenant=tenant, code="KNIT", name="Knit")
        supplier = FabricSupplier.objects.create(
            tenant=tenant, code="SUP020", name="Line Supplier"
        )
        rfq = RFQ.objects.create(
            tenant=tenant, rfq_number="RFQ-2025-0010", supplier=supplier
        )
        item = RFQLineItem.objects.create(
            tenant=tenant,
            rfq=rfq,
            fabric_category=cat,
            quantity_meters=1000,
            target_price=Decimal("3.50"),
            notes="Need by next month",
        )
        assert item.quantity_meters == 1000
        assert item.target_price == Decimal("3.50")
        assert item.rfq == rfq

    def test_rfq_line_item_str(self, tenant):
        from apps.fabric.models import RFQ, FabricCategory, FabricSupplier, RFQLineItem
        cat = FabricCategory.objects.create(tenant=tenant, code="DENIM", name="Denim")
        supplier = FabricSupplier.objects.create(
            tenant=tenant, code="SUP021", name="Str Supplier"
        )
        rfq = RFQ.objects.create(
            tenant=tenant, rfq_number="RFQ-2025-0011", supplier=supplier
        )
        item = RFQLineItem.objects.create(
            tenant=tenant, rfq=rfq, fabric_category=cat, quantity_meters=500
        )
        assert "DENIM" in str(item)


@pytest.mark.django_db
class TestRFQResponseModel:
    def test_create_rfq_response(self, tenant):
        from apps.fabric.models import RFQ, FabricSupplier, RFQResponse
        supplier = FabricSupplier.objects.create(
            tenant=tenant, code="SUP030", name="Response Supplier"
        )
        rfq = RFQ.objects.create(
            tenant=tenant, rfq_number="RFQ-2025-0020", supplier=supplier
        )
        resp = RFQResponse.objects.create(
            tenant=tenant,
            rfq=rfq,
            supplier=supplier,
            valid_until="2025-08-01",
            notes="Price valid for 30 days",
        )
        assert resp.rfq == rfq
        assert resp.supplier == supplier
        assert str(resp) is not None

    def test_rfq_response_multiple_suppliers(self, tenant):
        from apps.fabric.models import RFQ, FabricSupplier, RFQResponse
        sup1 = FabricSupplier.objects.create(
            tenant=tenant, code="SUP031", name="Supplier A"
        )
        sup2 = FabricSupplier.objects.create(
            tenant=tenant, code="SUP032", name="Supplier B"
        )
        rfq = RFQ.objects.create(
            tenant=tenant, rfq_number="RFQ-2025-0021", supplier=sup1
        )
        RFQResponse.objects.create(tenant=tenant, rfq=rfq, supplier=sup1)
        RFQResponse.objects.create(tenant=tenant, rfq=rfq, supplier=sup2)
        assert rfq.responses.count() == 2


@pytest.mark.django_db
class TestRFQResponseItemModel:
    def test_create_response_item(self, tenant):
        from apps.fabric.models import (
            RFQ,
            FabricCategory,
            FabricSupplier,
            RFQLineItem,
            RFQResponse,
            RFQResponseItem,
        )
        cat = FabricCategory.objects.create(tenant=tenant, code="KNIT", name="Knit")
        supplier = FabricSupplier.objects.create(
            tenant=tenant, code="SUP040", name="Resp Item Supplier"
        )
        rfq = RFQ.objects.create(
            tenant=tenant, rfq_number="RFQ-2025-0030", supplier=supplier
        )
        line = RFQLineItem.objects.create(
            tenant=tenant, rfq=rfq, fabric_category=cat, quantity_meters=1000
        )
        resp = RFQResponse.objects.create(tenant=tenant, rfq=rfq, supplier=supplier)
        item = RFQResponseItem.objects.create(
            tenant=tenant,
            response=resp,
            line_item=line,
            quoted_price=Decimal("3.25"),
            available_qty_meters=1000,
            lead_days=25,
        )
        assert item.quoted_price == Decimal("3.25")
        assert item.available_qty_meters == 1000
        assert item.lead_days == 25

    def test_response_item_defaults(self, tenant):
        from apps.fabric.models import (
            RFQ,
            FabricCategory,
            FabricSupplier,
            RFQLineItem,
            RFQResponse,
            RFQResponseItem,
        )
        cat = FabricCategory.objects.create(tenant=tenant, code="DENIM", name="Denim")
        supplier = FabricSupplier.objects.create(
            tenant=tenant, code="SUP041", name="Default Test"
        )
        rfq = RFQ.objects.create(
            tenant=tenant, rfq_number="RFQ-2025-0031", supplier=supplier
        )
        line = RFQLineItem.objects.create(
            tenant=tenant, rfq=rfq, fabric_category=cat, quantity_meters=500
        )
        resp = RFQResponse.objects.create(tenant=tenant, rfq=rfq, supplier=supplier)
        item = RFQResponseItem.objects.create(
            tenant=tenant, response=resp, line_item=line
        )
        assert item.quoted_price is None
        assert item.available_qty_meters is None
        assert item.lead_days is None


# ── GC-007: Fabric Inventory/Booking System ────────────────────────────

@pytest.mark.django_db
class TestFabricBookingModel:
    def test_create_fabric_booking(self, tenant):
        from apps.fabric.models import FabricBooking, FabricCategory, FabricSupplier
        from apps.setup.models import Country
        cat = FabricCategory.objects.create(tenant=tenant, code="KNIT", name="Knit")
        supplier = FabricSupplier.objects.create(
            tenant=tenant, code="SUP050", name="Booking Supplier"
        )
        country = Country.objects.create(tenant=tenant, code="CHN", name="China")
        booking = FabricBooking.objects.create(
            tenant=tenant,
            booking_number="BK-2025-0001",
            supplier=supplier,
            fabric_category=cat,
            quantity_meters=5000,
            status="booked",
            origin_country=country,
            expected_delivery="2025-09-01",
            notes="For PO-2025-0100",
        )
        assert booking.booking_number == "BK-2025-0001"
        assert booking.quantity_meters == 5000
        assert booking.status == "booked"
        assert str(booking) == "BK-2025-0001"

    def test_fabric_booking_status_default(self, tenant):
        from apps.fabric.models import FabricBooking, FabricCategory, FabricSupplier
        cat = FabricCategory.objects.create(tenant=tenant, code="DENIM", name="Denim")
        supplier = FabricSupplier.objects.create(
            tenant=tenant, code="SUP051", name="Default Booking"
        )
        booking = FabricBooking.objects.create(
            tenant=tenant,
            booking_number="BK-2025-0002",
            supplier=supplier,
            fabric_category=cat,
            quantity_meters=1000,
        )
        assert booking.status == "pending"

    def test_fabric_booking_unique_number(self, tenant):
        from apps.fabric.models import FabricBooking, FabricCategory, FabricSupplier
        cat = FabricCategory.objects.create(tenant=tenant, code="KNIT", name="Knit")
        supplier = FabricSupplier.objects.create(
            tenant=tenant, code="SUP052", name="Unique Booking"
        )
        FabricBooking.objects.create(
            tenant=tenant, booking_number="BK-2025-0003",
            supplier=supplier, fabric_category=cat, quantity_meters=100,
        )
        with pytest.raises(Exception):
            FabricBooking.objects.create(
                tenant=tenant, booking_number="BK-2025-0003",
                supplier=supplier, fabric_category=cat, quantity_meters=200,
            )

    def test_fabric_booking_dates_optional(self, tenant):
        from apps.fabric.models import FabricBooking, FabricCategory, FabricSupplier
        cat = FabricCategory.objects.create(tenant=tenant, code="WOVEN", name="Woven")
        supplier = FabricSupplier.objects.create(
            tenant=tenant, code="SUP053", name="Date Test"
        )
        booking = FabricBooking.objects.create(
            tenant=tenant, booking_number="BK-2025-0004",
            supplier=supplier, fabric_category=cat, quantity_meters=2000,
        )
        assert booking.expected_delivery is None
        assert booking.actual_delivery is None


# ── API Tests ──────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestFabricCategoryAPI:
    def test_list_fabric_categories(self, tenant, auth_client):
        from apps.fabric.models import FabricCategory
        FabricCategory.objects.create(tenant=tenant, code="KNIT", name="Knit")
        FabricCategory.objects.create(tenant=tenant, code="WOVEN", name="Woven")
        resp = auth_client.get("/api/v1/fabric/categories/")
        assert resp.status_code == 200
        assert len(resp.data["results"]) == 2

    def test_create_fabric_category(self, tenant, auth_client):
        resp = auth_client.post("/api/v1/fabric/categories/", {
            "code": "DENIM", "name": "Denim Fabric",
        })
        assert resp.status_code == 201
        assert resp.data["code"] == "DENIM"


@pytest.mark.django_db
class TestHTSCodeAPI:
    def test_create_hts_code(self, tenant, auth_client):
        from apps.fabric.models import FabricCategory
        cat = FabricCategory.objects.create(tenant=tenant, code="JERSEY", name="Jersey")
        resp = auth_client.post("/api/v1/fabric/hts-codes/", {
            "code": "6006.10", "description": "Cotton knit fabrics",
            "fabric_category": str(cat.id), "duty_rate": "12.00",
        })
        assert resp.status_code == 201
        assert resp.data["code"] == "6006.10"
        assert Decimal(resp.data["duty_rate"]) == Decimal("12.00")

    def test_list_hts_codes(self, tenant, auth_client):
        from apps.fabric.models import HTSCode
        HTSCode.objects.create(tenant=tenant, code="6006.10", description="Knit")
        HTSCode.objects.create(tenant=tenant, code="5209.42", description="Denim")
        resp = auth_client.get("/api/v1/fabric/hts-codes/")
        assert resp.status_code == 200
        assert len(resp.data["results"]) == 2

    def test_filter_hts_codes_by_category(self, tenant, auth_client):
        from apps.fabric.models import FabricCategory, HTSCode
        cat = FabricCategory.objects.create(tenant=tenant, code="JERSEY", name="Jersey")
        HTSCode.objects.create(tenant=tenant, code="6006.10", description="Knit", fabric_category=cat)
        HTSCode.objects.create(tenant=tenant, code="5209.42", description="Denim")
        resp = auth_client.get(f"/api/v1/fabric/hts-codes/?fabric_category={cat.id}")
        assert resp.status_code == 200
        assert len(resp.data["results"]) == 1

    def test_search_hts_codes(self, tenant, auth_client):
        from apps.fabric.models import HTSCode
        HTSCode.objects.create(tenant=tenant, code="6006.10", description="Cotton knit fabrics")
        HTSCode.objects.create(tenant=tenant, code="5209.42", description="Denim fabrics of cotton")
        resp = auth_client.get("/api/v1/fabric/hts-codes/?search=denim")
        assert resp.status_code == 200
        assert len(resp.data["results"]) == 1
        assert resp.data["results"][0]["code"] == "5209.42"

    def test_hts_codes_requires_auth(self, tenant, api_client):
        resp = api_client.get("/api/v1/fabric/hts-codes/")
        assert resp.status_code in (401, 403)


@pytest.mark.django_db
class TestFabricMillAPI:
    def test_create_mill(self, tenant, auth_client):
        resp = auth_client.post("/api/v1/fabric/mills/", {
            "code": "MILL100", "name": "Test Mill", "city": "Karachi",
        })
        assert resp.status_code == 201
        assert resp.data["code"] == "MILL100"

    def test_list_mills(self, tenant, auth_client):
        from apps.fabric.models import FabricMill
        FabricMill.objects.create(tenant=tenant, code="MILL101", name="Mill A")
        FabricMill.objects.create(tenant=tenant, code="MILL102", name="Mill B")
        resp = auth_client.get("/api/v1/fabric/mills/")
        assert resp.status_code == 200
        assert len(resp.data["results"]) == 2

    def test_search_mills(self, tenant, auth_client):
        from apps.fabric.models import FabricMill
        FabricMill.objects.create(tenant=tenant, code="MILL101", name="Denim Mill")
        FabricMill.objects.create(tenant=tenant, code="MILL102", name="Silk Mill")
        resp = auth_client.get("/api/v1/fabric/mills/?search=denim")
        assert resp.status_code == 200
        assert len(resp.data["results"]) == 1


@pytest.mark.django_db
class TestRFQLineItemAPI:
    def test_create_line_item(self, tenant, auth_client):
        from apps.fabric.models import RFQ, FabricCategory, FabricSupplier
        cat = FabricCategory.objects.create(tenant=tenant, code="DENIM", name="Denim")
        supplier = FabricSupplier.objects.create(
            tenant=tenant, code="SUP250", name="LineItem API"
        )
        rfq = RFQ.objects.create(tenant=tenant, rfq_number="RFQ-2025-0250", supplier=supplier)
        resp = auth_client.post("/api/v1/fabric/rfq-line-items/", {
            "rfq": str(rfq.id),
            "fabric_category": str(cat.id),
            "quantity_meters": "2500.00",
        })
        assert resp.status_code == 201
        assert Decimal(resp.data["quantity_meters"]) == Decimal("2500.00")

    def test_list_line_items(self, tenant, auth_client):
        from apps.fabric.models import RFQ, FabricSupplier, RFQLineItem
        supplier = FabricSupplier.objects.create(
            tenant=tenant, code="SUP251", name="LineItem List"
        )
        rfq = RFQ.objects.create(tenant=tenant, rfq_number="RFQ-2025-0251", supplier=supplier)
        RFQLineItem.objects.create(tenant=tenant, rfq=rfq, quantity_meters=100)
        RFQLineItem.objects.create(tenant=tenant, rfq=rfq, quantity_meters=200)
        resp = auth_client.get("/api/v1/fabric/rfq-line-items/")
        assert resp.status_code == 200
        assert len(resp.data["results"]) == 2

    def test_filter_line_items_by_rfq(self, tenant, auth_client):
        from apps.fabric.models import RFQ, FabricSupplier, RFQLineItem
        supplier = FabricSupplier.objects.create(
            tenant=tenant, code="SUP252", name="LineItem Filter"
        )
        rfq1 = RFQ.objects.create(tenant=tenant, rfq_number="RFQ-2025-0252", supplier=supplier)
        rfq2 = RFQ.objects.create(tenant=tenant, rfq_number="RFQ-2025-0253", supplier=supplier)
        RFQLineItem.objects.create(tenant=tenant, rfq=rfq1, quantity_meters=100)
        RFQLineItem.objects.create(tenant=tenant, rfq=rfq2, quantity_meters=200)
        resp = auth_client.get(f"/api/v1/fabric/rfq-line-items/?rfq={rfq1.id}")
        assert resp.status_code == 200
        assert len(resp.data["results"]) == 1


@pytest.mark.django_db
class TestFabricSupplierAPI:
    def test_create_fabric_supplier(self, tenant, auth_client):
        resp = auth_client.post("/api/v1/fabric/suppliers/", {
            "code": "SUP100", "name": "Test Supplier", "is_mill": True,
        })
        assert resp.status_code == 201
        assert resp.data["is_mill"] is True

    def test_list_fabric_suppliers(self, tenant, auth_client):
        from apps.fabric.models import FabricSupplier
        FabricSupplier.objects.create(tenant=tenant, code="SUP101", name="Supplier A")
        FabricSupplier.objects.create(tenant=tenant, code="SUP102", name="Supplier B")
        resp = auth_client.get("/api/v1/fabric/suppliers/")
        assert resp.status_code == 200
        assert len(resp.data["results"]) == 2


@pytest.mark.django_db
class TestRFQAPI:
    def test_create_rfq(self, tenant, auth_client):
        from apps.fabric.models import FabricSupplier
        supplier = FabricSupplier.objects.create(
            tenant=tenant, code="SUP200", name="RFQ API Supplier"
        )
        resp = auth_client.post("/api/v1/fabric/rfqs/", {
            "rfq_number": "RFQ-2025-0100",
            "supplier": str(supplier.id),
            "status": "draft",
        })
        assert resp.status_code == 201
        assert resp.data["rfq_number"] == "RFQ-2025-0100"

    def test_list_rfqs(self, tenant, auth_client):
        from apps.fabric.models import RFQ, FabricSupplier
        supplier = FabricSupplier.objects.create(
            tenant=tenant, code="SUP201", name="RFQ List"
        )
        RFQ.objects.create(tenant=tenant, rfq_number="RFQ-2025-0101", supplier=supplier)
        RFQ.objects.create(tenant=tenant, rfq_number="RFQ-2025-0102", supplier=supplier)
        resp = auth_client.get("/api/v1/fabric/rfqs/")
        assert resp.status_code == 200
        assert len(resp.data["results"]) == 2


@pytest.mark.django_db
class TestFabricBookingAPI:
    def test_create_booking(self, tenant, auth_client):
        from apps.fabric.models import FabricCategory, FabricSupplier
        cat = FabricCategory.objects.create(tenant=tenant, code="KNIT", name="Knit")
        supplier = FabricSupplier.objects.create(
            tenant=tenant, code="SUP300", name="Booking API"
        )
        resp = auth_client.post("/api/v1/fabric/bookings/", {
            "booking_number": "BK-2025-0100",
            "supplier": str(supplier.id),
            "fabric_category": str(cat.id),
            "quantity_meters": 5000,
        })
        assert resp.status_code == 201
        assert resp.data["booking_number"] == "BK-2025-0100"

    def test_list_bookings(self, tenant, auth_client):
        from apps.fabric.models import FabricBooking, FabricCategory, FabricSupplier
        cat = FabricCategory.objects.create(tenant=tenant, code="DENIM", name="Denim")
        supplier = FabricSupplier.objects.create(
            tenant=tenant, code="SUP301", name="Booking List"
        )
        FabricBooking.objects.create(
            tenant=tenant, booking_number="BK-2025-0101",
            supplier=supplier, fabric_category=cat, quantity_meters=1000,
        )
        FabricBooking.objects.create(
            tenant=tenant, booking_number="BK-2025-0102",
            supplier=supplier, fabric_category=cat, quantity_meters=2000,
        )
        resp = auth_client.get("/api/v1/fabric/bookings/")
        assert resp.status_code == 200
        assert len(resp.data["results"]) == 2


@pytest.mark.django_db
class TestRFQResponseAPI:
    def test_create_rfq_response(self, tenant, auth_client):
        from apps.fabric.models import RFQ, FabricSupplier
        supplier = FabricSupplier.objects.create(
            tenant=tenant, code="SUP500", name="Resp API Supplier"
        )
        rfq = RFQ.objects.create(
            tenant=tenant, rfq_number="RFQ-2025-0500", supplier=supplier
        )
        resp = auth_client.post("/api/v1/fabric/rfq-responses/", {
            "rfq": str(rfq.id),
            "supplier": str(supplier.id),
            "valid_until": "2025-09-01",
            "notes": "Quote valid 45 days",
        })
        assert resp.status_code == 201
        assert resp.data["notes"] == "Quote valid 45 days"

    def test_list_rfq_responses(self, tenant, auth_client):
        from apps.fabric.models import RFQ, FabricSupplier, RFQResponse
        supplier = FabricSupplier.objects.create(
            tenant=tenant, code="SUP501", name="Resp List"
        )
        rfq = RFQ.objects.create(
            tenant=tenant, rfq_number="RFQ-2025-0501", supplier=supplier
        )
        RFQResponse.objects.create(tenant=tenant, rfq=rfq, supplier=supplier)
        RFQResponse.objects.create(tenant=tenant, rfq=rfq, supplier=supplier)
        resp = auth_client.get("/api/v1/fabric/rfq-responses/")
        assert resp.status_code == 200
        assert len(resp.data["results"]) == 2

    def test_filter_rfq_response_by_rfq(self, tenant, auth_client):
        from apps.fabric.models import RFQ, FabricSupplier, RFQResponse
        sup1 = FabricSupplier.objects.create(
            tenant=tenant, code="SUP502", name="Filter Sup A"
        )
        sup2 = FabricSupplier.objects.create(
            tenant=tenant, code="SUP503", name="Filter Sup B"
        )
        rfq1 = RFQ.objects.create(
            tenant=tenant, rfq_number="RFQ-2025-0502", supplier=sup1
        )
        rfq2 = RFQ.objects.create(
            tenant=tenant, rfq_number="RFQ-2025-0503", supplier=sup1
        )
        RFQResponse.objects.create(tenant=tenant, rfq=rfq1, supplier=sup1)
        RFQResponse.objects.create(tenant=tenant, rfq=rfq1, supplier=sup2)
        RFQResponse.objects.create(tenant=tenant, rfq=rfq2, supplier=sup1)
        resp = auth_client.get(f"/api/v1/fabric/rfq-responses/?rfq={rfq1.id}")
        assert resp.status_code == 200
        assert len(resp.data["results"]) == 2

    def test_update_rfq_response(self, tenant, auth_client):
        from apps.fabric.models import RFQ, FabricSupplier, RFQResponse
        supplier = FabricSupplier.objects.create(
            tenant=tenant, code="SUP504", name="Upd Resp"
        )
        rfq = RFQ.objects.create(
            tenant=tenant, rfq_number="RFQ-2025-0504", supplier=supplier
        )
        response = RFQResponse.objects.create(
            tenant=tenant, rfq=rfq, supplier=supplier, notes="Initial"
        )
        resp = auth_client.patch(
            f"/api/v1/fabric/rfq-responses/{response.id}/",
            {"notes": "Updated notes"},
        )
        assert resp.status_code == 200
        assert resp.data["notes"] == "Updated notes"

    def test_delete_rfq_response(self, tenant, auth_client):
        from apps.fabric.models import RFQ, FabricSupplier, RFQResponse
        supplier = FabricSupplier.objects.create(
            tenant=tenant, code="SUP505", name="Del Resp"
        )
        rfq = RFQ.objects.create(
            tenant=tenant, rfq_number="RFQ-2025-0505", supplier=supplier
        )
        response = RFQResponse.objects.create(
            tenant=tenant, rfq=rfq, supplier=supplier
        )
        resp = auth_client.delete(f"/api/v1/fabric/rfq-responses/{response.id}/")
        assert resp.status_code == 204


@pytest.mark.django_db
class TestRFQResponseItemAPI:
    def test_create_response_item(self, tenant, auth_client):
        from apps.fabric.models import (
            RFQ,
            FabricCategory,
            FabricSupplier,
            RFQLineItem,
            RFQResponse,
        )
        cat = FabricCategory.objects.create(tenant=tenant, code="KNIT", name="Knit")
        supplier = FabricSupplier.objects.create(
            tenant=tenant, code="SUP600", name="RespItem API"
        )
        rfq = RFQ.objects.create(
            tenant=tenant, rfq_number="RFQ-2025-0600", supplier=supplier
        )
        line = RFQLineItem.objects.create(
            tenant=tenant, rfq=rfq, fabric_category=cat, quantity_meters=1000
        )
        resp_obj = RFQResponse.objects.create(tenant=tenant, rfq=rfq, supplier=supplier)
        resp = auth_client.post("/api/v1/fabric/rfq-response-items/", {
            "response": str(resp_obj.id),
            "line_item": str(line.id),
            "quoted_price": "3.25",
            "available_qty_meters": 1000,
            "lead_days": 25,
        })
        assert resp.status_code == 201
        assert Decimal(resp.data["quoted_price"]) == Decimal("3.25")

    def test_list_response_items(self, tenant, auth_client):
        from apps.fabric.models import (
            RFQ,
            FabricCategory,
            FabricSupplier,
            RFQLineItem,
            RFQResponse,
            RFQResponseItem,
        )
        cat = FabricCategory.objects.create(tenant=tenant, code="DENIM", name="Denim")
        supplier = FabricSupplier.objects.create(
            tenant=tenant, code="SUP601", name="RespItem List"
        )
        rfq = RFQ.objects.create(
            tenant=tenant, rfq_number="RFQ-2025-0601", supplier=supplier
        )
        line = RFQLineItem.objects.create(
            tenant=tenant, rfq=rfq, fabric_category=cat, quantity_meters=500
        )
        resp_obj = RFQResponse.objects.create(tenant=tenant, rfq=rfq, supplier=supplier)
        RFQResponseItem.objects.create(tenant=tenant, response=resp_obj, line_item=line)
        RFQResponseItem.objects.create(
            tenant=tenant, response=resp_obj, line_item=line, quoted_price=Decimal("4.00")
        )
        resp = auth_client.get("/api/v1/fabric/rfq-response-items/")
        assert resp.status_code == 200
        assert len(resp.data["results"]) == 2

    def test_filter_response_items_by_response(self, tenant, auth_client):
        from apps.fabric.models import (
            RFQ,
            FabricCategory,
            FabricSupplier,
            RFQLineItem,
            RFQResponse,
            RFQResponseItem,
        )
        cat = FabricCategory.objects.create(tenant=tenant, code="WOVEN", name="Woven")
        supplier = FabricSupplier.objects.create(
            tenant=tenant, code="SUP602", name="RespItem Filter"
        )
        rfq = RFQ.objects.create(
            tenant=tenant, rfq_number="RFQ-2025-0602", supplier=supplier
        )
        line1 = RFQLineItem.objects.create(
            tenant=tenant, rfq=rfq, fabric_category=cat, quantity_meters=100
        )
        line2 = RFQLineItem.objects.create(
            tenant=tenant, rfq=rfq, fabric_category=cat, quantity_meters=200
        )
        resp1 = RFQResponse.objects.create(tenant=tenant, rfq=rfq, supplier=supplier)
        resp2 = RFQResponse.objects.create(tenant=tenant, rfq=rfq, supplier=supplier)
        RFQResponseItem.objects.create(tenant=tenant, response=resp1, line_item=line1)
        RFQResponseItem.objects.create(tenant=tenant, response=resp1, line_item=line2)
        RFQResponseItem.objects.create(tenant=tenant, response=resp2, line_item=line1)
        resp = auth_client.get(f"/api/v1/fabric/rfq-response-items/?response={resp1.id}")
        assert resp.status_code == 200
        assert len(resp.data["results"]) == 2
