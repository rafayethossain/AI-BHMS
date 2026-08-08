"""
Tests for Merchandising API endpoints.
"""
import pytest
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from apps.tenants.models import Tenant
from apps.users.models import Role, UserRole, Permission, RolePermission
from apps.setup.models import (
    Season, Buyer, Brand, Factory, Currency, Country,
    Department, UOM, ColorCode, ProductCategory, ProductDepartment,
    PaymentTerms, DeliveryMode, Vendor
)
from apps.merchandising.models import (
    Style, StyleVersion, FileOpening, PurchaseOrder, PurchaseOrderItem,
    BOM, BOMItem, Costing, TA, TAMilestone, POAmendment
)

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def merch_tenant(db):
    return Tenant.objects.create(
        name="Merch Test Co", slug="merch-test",
        schema_name="tenant_merch", status="active"
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
        username="merchuser", email="merch@test.com",
        password="testpass123!@#", tenant=merch_tenant, status="active"
    )
    UserRole.objects.create(user=user, role=merch_role)
    return user


@pytest.fixture
def merch_client(api_client, merch_user):
    login = api_client.post("/api/v1/auth/login/", {
        "email": "merch@test.com", "password": "testpass123!@#"
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
        "currency": currency, "country": country, "season": season,
        "category": cat, "department": dept, "buyer": buyer, "brand": brand,
        "factory": factory, "color": color, "color2": color2,
        "uom": uom, "vendor": vendor,
    }


def _create_style(tenant, buyer, number="STY-9999", name="Test"):
    return Style.objects.create(tenant=tenant, style_number=number, name=name, buyer=buyer)


def _create_sv(tenant, style, version=1):
    return StyleVersion.objects.create(tenant=tenant, style=style, version_number=version, status="active")


def _create_fo(tenant, style, sv, buyer, factory):
    return FileOpening.objects.create(
        tenant=tenant, file_number="FO-999", style=style, style_version=sv,
        buyer=buyer, factory=factory, file_date="2026-01-01"
    )


def _create_po(tenant, fo, buyer, factory, currency, quantity=1000, unit_price=10.0):
    from decimal import Decimal
    return PurchaseOrder.objects.create(
        tenant=tenant, po_number="PO-999", file_opening=fo, buyer=buyer,
        factory=factory, po_date="2026-01-15", delivery_date="2026-06-01",
        quantity=quantity, unit_price=Decimal(str(unit_price)),
        total_value=Decimal(str(quantity)) * Decimal(str(unit_price)),
        currency=currency,
    )


# ==================== Style Tests ====================

@pytest.mark.django_db
class TestStyleAPI:
    def test_list_styles(self, merch_client, seed_data):
        response = merch_client.get("/api/v1/merchandising/styles/")
        assert response.status_code == status.HTTP_200_OK

    def test_create_style(self, merch_client, seed_data):
        response = merch_client.post("/api/v1/merchandising/styles/", {
            "name": "Classic Tee", "buyer": str(seed_data["buyer"].id),
        })
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["style_number"].startswith("STY-")

    def test_create_style_auto_number(self, merch_client, seed_data):
        resp1 = merch_client.post("/api/v1/merchandising/styles/", {
            "name": "Style 1", "buyer": str(seed_data["buyer"].id),
        })
        resp2 = merch_client.post("/api/v1/merchandising/styles/", {
            "name": "Style 2", "buyer": str(seed_data["buyer"].id),
        })
        assert resp1.data["style_number"] < resp2.data["style_number"]

    def test_get_style(self, merch_client, seed_data):
        style = _create_style(seed_data["buyer"].tenant, seed_data["buyer"])
        response = merch_client.get(f"/api/v1/merchandising/styles/{style.id}/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["style_number"] == style.style_number

    def test_update_style(self, merch_client, seed_data):
        style = _create_style(seed_data["buyer"].tenant, seed_data["buyer"], "STY-UPD", "Old")
        response = merch_client.patch(f"/api/v1/merchandising/styles/{style.id}/", {"name": "New Name"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "New Name"

    def test_delete_style(self, merch_client, seed_data):
        style = _create_style(seed_data["buyer"].tenant, seed_data["buyer"], "STY-DEL", "To Delete")
        response = merch_client.delete(f"/api/v1/merchandising/styles/{style.id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_style_versions_endpoint(self, merch_client, seed_data):
        style = _create_style(seed_data["buyer"].tenant, seed_data["buyer"], "STY-VER", "With Versions")
        _create_sv(seed_data["buyer"].tenant, style)
        response = merch_client.get(f"/api/v1/merchandising/styles/{style.id}/versions/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1

    def test_style_file_openings_endpoint(self, merch_client, seed_data):
        t = seed_data["buyer"].tenant
        style = _create_style(t, seed_data["buyer"], "STY-FO", "With FOs")
        sv = _create_sv(t, style)
        _create_fo(t, style, sv, seed_data["buyer"], seed_data["factory"])
        response = merch_client.get(f"/api/v1/merchandising/styles/{style.id}/file_openings/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1


# ==================== Style Workflow Tests ====================

@pytest.mark.django_db
class TestStyleWorkflow:
    def test_transition_draft_to_active(self, merch_client, seed_data):
        style = _create_style(seed_data["buyer"].tenant, seed_data["buyer"])
        resp = merch_client.post(f"/api/v1/merchandising/styles/{style.id}/transition/", {"status": "active"})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["status"] == "active"

    def test_transition_active_to_approved(self, merch_client, seed_data):
        style = _create_style(seed_data["buyer"].tenant, seed_data["buyer"])
        merch_client.post(f"/api/v1/merchandising/styles/{style.id}/transition/", {"status": "active"})
        resp = merch_client.post(f"/api/v1/merchandising/styles/{style.id}/transition/", {"status": "approved"})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["status"] == "approved"

    def test_transition_invalid_from(self, merch_client, seed_data):
        style = _create_style(seed_data["buyer"].tenant, seed_data["buyer"])
        resp = merch_client.post(f"/api/v1/merchandising/styles/{style.id}/transition/", {"status": "approved"})
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_transition_invalid_status(self, merch_client, seed_data):
        style = _create_style(seed_data["buyer"].tenant, seed_data["buyer"])
        resp = merch_client.post(f"/api/v1/merchandising/styles/{style.id}/transition/", {"status": "bogus"})
        assert resp.status_code == status.HTTP_400_BAD_REQUEST


# ==================== Tech Pack Upload Tests ====================

@pytest.mark.django_db
class TestTechPackUpload:
    def test_upload_tech_pack(self, merch_client, seed_data):
        style = _create_style(seed_data["buyer"].tenant, seed_data["buyer"], "STY-TP", "Tech Pack Style")
        file = SimpleUploadedFile("techpack.pdf", b"PDF content", content_type="application/pdf")
        resp = merch_client.post(
            f"/api/v1/merchandising/styles/{style.id}/upload-tech-pack/",
            {"tech_pack": file}, format="multipart"
        )
        assert resp.status_code == status.HTTP_200_OK
        assert "tech_pack" in resp.data

    def test_upload_no_file(self, merch_client, seed_data):
        style = _create_style(seed_data["buyer"].tenant, seed_data["buyer"], "STY-NF", "No File")
        resp = merch_client.post(f"/api/v1/merchandising/styles/{style.id}/upload-tech-pack/")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST


# ==================== StyleVersion Tests ====================

@pytest.mark.django_db
class TestStyleVersionAPI:
    def test_create_version_auto_number(self, merch_client, seed_data):
        style = _create_style(seed_data["buyer"].tenant, seed_data["buyer"], "STY-AUTO", "Auto Version")
        resp = merch_client.post("/api/v1/merchandising/style-versions/", {
            "style": str(style.id), "revision_notes": "Initial"
        })
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["version_number"] == 1

        resp2 = merch_client.post("/api/v1/merchandising/style-versions/", {
            "style": str(style.id), "revision_notes": "Updated"
        })
        assert resp2.data["version_number"] == 2


# ==================== FileOpening Tests ====================

@pytest.mark.django_db
class TestFileOpeningAPI:
    def test_create_file_opening(self, merch_client, seed_data):
        t = seed_data["buyer"].tenant
        style = _create_style(t, seed_data["buyer"], "STY-100", "For FO")
        sv = _create_sv(t, style)
        response = merch_client.post("/api/v1/merchandising/file-openings/", {
            "style": str(style.id),
            "style_version": str(sv.id),
            "buyer": str(seed_data["buyer"].id),
            "factory": str(seed_data["factory"].id),
            "file_date": "2026-03-01",
        })
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["file_number"].startswith("FO-")

    def test_file_opening_purchase_orders_endpoint(self, merch_client, seed_data):
        t = seed_data["buyer"].tenant
        style = _create_style(t, seed_data["buyer"], "STY-PO", "With POs")
        sv = _create_sv(t, style)
        fo = _create_fo(t, style, sv, seed_data["buyer"], seed_data["factory"])
        _create_po(t, fo, seed_data["buyer"], seed_data["factory"], seed_data["currency"])
        response = merch_client.get(f"/api/v1/merchandising/file-openings/{fo.id}/purchase_orders/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1


# ==================== PurchaseOrder Tests ====================

@pytest.mark.django_db
class TestPurchaseOrderAPI:
    def test_create_po_auto_number(self, merch_client, seed_data):
        t = seed_data["buyer"].tenant
        style = _create_style(t, seed_data["buyer"], "STY-200", "For PO")
        sv = _create_sv(t, style)
        fo = _create_fo(t, style, sv, seed_data["buyer"], seed_data["factory"])
        response = merch_client.post("/api/v1/merchandising/purchase-orders/", {
            "file_opening": str(fo.id),
            "buyer": str(seed_data["buyer"].id),
            "factory": str(seed_data["factory"].id),
            "po_date": "2026-02-01",
            "delivery_date": "2026-07-01",
            "quantity": 10000,
            "unit_price": "12.50",
            "currency": str(seed_data["currency"].id),
        })
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["po_number"].startswith("PO-")
        assert float(response.data["total_value"]) == 125000.0

    def test_po_total_calculated(self, merch_client, seed_data):
        t = seed_data["buyer"].tenant
        style = _create_style(t, seed_data["buyer"], "STY-201", "Calc PO")
        sv = _create_sv(t, style)
        fo = _create_fo(t, style, sv, seed_data["buyer"], seed_data["factory"])
        response = merch_client.post("/api/v1/merchandising/purchase-orders/", {
            "file_opening": str(fo.id),
            "buyer": str(seed_data["buyer"].id),
            "factory": str(seed_data["factory"].id),
            "po_date": "2026-02-01",
            "delivery_date": "2026-07-01",
            "quantity": 500,
            "unit_price": "7.25",
            "currency": str(seed_data["currency"].id),
        })
        assert float(response.data["total_value"]) == 3625.0


# ==================== PO Workflow Tests ====================

@pytest.mark.django_db
class TestPOWorkflow:
    def test_transition_draft_to_confirmed(self, merch_client, seed_data):
        t = seed_data["buyer"].tenant
        style = _create_style(t, seed_data["buyer"], "STY-WF1", "PO WF")
        sv = _create_sv(t, style)
        fo = _create_fo(t, style, sv, seed_data["buyer"], seed_data["factory"])
        po = _create_po(t, fo, seed_data["buyer"], seed_data["factory"], seed_data["currency"])
        resp = merch_client.post(f"/api/v1/merchandising/purchase-orders/{po.id}/transition/", {"status": "confirmed"})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["status"] == "confirmed"

    def test_transition_to_in_production(self, merch_client, seed_data):
        t = seed_data["buyer"].tenant
        style = _create_style(t, seed_data["buyer"], "STY-WF2", "PO WF2")
        sv = _create_sv(t, style)
        fo = _create_fo(t, style, sv, seed_data["buyer"], seed_data["factory"])
        po = _create_po(t, fo, seed_data["buyer"], seed_data["factory"], seed_data["currency"])
        merch_client.post(f"/api/v1/merchandising/purchase-orders/{po.id}/transition/", {"status": "confirmed"})
        resp = merch_client.post(f"/api/v1/merchandising/purchase-orders/{po.id}/transition/", {"status": "in_production"})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["status"] == "in_production"

    def test_transition_invalid(self, merch_client, seed_data):
        t = seed_data["buyer"].tenant
        style = _create_style(t, seed_data["buyer"], "STY-WF3", "PO WF3")
        sv = _create_sv(t, style)
        fo = _create_fo(t, style, sv, seed_data["buyer"], seed_data["factory"])
        po = _create_po(t, fo, seed_data["buyer"], seed_data["factory"], seed_data["currency"])
        resp = merch_client.post(f"/api/v1/merchandising/purchase-orders/{po.id}/transition/", {"status": "shipped"})
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_transition_cancels(self, merch_client, seed_data):
        t = seed_data["buyer"].tenant
        style = _create_style(t, seed_data["buyer"], "STY-WF4", "PO WF4")
        sv = _create_sv(t, style)
        fo = _create_fo(t, style, sv, seed_data["buyer"], seed_data["factory"])
        po = _create_po(t, fo, seed_data["buyer"], seed_data["factory"], seed_data["currency"])
        resp = merch_client.post(f"/api/v1/merchandising/purchase-orders/{po.id}/transition/", {"status": "cancelled"})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["status"] == "cancelled"


# ==================== BOM Tests ====================

@pytest.mark.django_db
class TestBOMAPI:
    def test_create_bom_with_items(self, merch_client, seed_data):
        t = seed_data["buyer"].tenant
        style = _create_style(t, seed_data["buyer"], "STY-BOM", "BOM Style")
        sv = _create_sv(t, style)
        response = merch_client.post("/api/v1/merchandising/boms/", {
            "style_version": str(sv.id),
            "name": "Main Fabric BOM",
            "items": [
                {"category": "Fabric", "item_name": "Cotton Jersey", "unit_price": "5.50", "consumption": "1.5", "waste_percent": "5"},
                {"category": "Trim", "item_name": "Thread", "unit_price": "0.20", "consumption": "10", "waste_percent": "0"},
            ]
        }, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert len(response.data["items"]) == 2
        assert BOMItem.objects.filter(bom__id=response.data["id"]).count() == 2

    def test_update_bom_replaces_items(self, merch_client, merch_user, seed_data):
        t = seed_data["buyer"].tenant
        style = _create_style(t, seed_data["buyer"], "STY-BOM2", "BOM Style 2")
        sv = _create_sv(t, style)
        bom = BOM.objects.create(tenant=t, style_version=sv, name="Old BOM", created_by=merch_user)
        BOMItem.objects.create(tenant=t, bom=bom, category="Fabric", item_name="Old Item", created_by=merch_user)
        response = merch_client.patch(f"/api/v1/merchandising/boms/{bom.id}/", {
            "name": "Updated BOM",
            "items": [
                {"category": "Trim", "item_name": "New Zipper", "unit_price": "1.20", "consumption": "1", "waste_percent": "0"},
            ]
        }, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["items"][0]["item_name"] == "New Zipper"
        assert BOMItem.objects.filter(bom=bom).count() == 1

    def test_bom_total_cost(self, merch_client, seed_data):
        t = seed_data["buyer"].tenant
        style = _create_style(t, seed_data["buyer"], "STY-BOM3", "BOM Cost")
        sv = _create_sv(t, style)
        response = merch_client.post("/api/v1/merchandising/boms/", {
            "style_version": str(sv.id),
            "name": "Cost BOM",
            "items": [
                {"category": "Fabric", "item_name": "Silk", "unit_price": "10.00", "consumption": "2", "waste_percent": "5"},
            ]
        }, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert float(response.data["total_cost"]) == 21.0


# ==================== Costing Tests ====================

@pytest.mark.django_db
class TestCostingAPI:
    def test_create_costing_auto_calc(self, merch_client, seed_data):
        t = seed_data["buyer"].tenant
        style = _create_style(t, seed_data["buyer"], "STY-COS", "Costing Style")
        sv = _create_sv(t, style)
        fo = _create_fo(t, style, sv, seed_data["buyer"], seed_data["factory"])
        po = _create_po(t, fo, seed_data["buyer"], seed_data["factory"], seed_data["currency"])
        response = merch_client.post("/api/v1/merchandising/costings/", {
            "purchase_order": str(po.id),
            "fabric_cost": "5.00",
            "trim_cost": "1.50",
            "cm_cost": "2.00",
            "overhead_cost": "0.50",
            "target_price": "12.00",
        })
        assert response.status_code == status.HTTP_201_CREATED
        assert float(response.data["total_cost"]) == 9.0
        assert response.data["margin_percent"] is not None

    def test_approve_costing(self, merch_client, seed_data):
        t = seed_data["buyer"].tenant
        style = _create_style(t, seed_data["buyer"], "STY-CA", "Approve Style")
        sv = _create_sv(t, style)
        fo = _create_fo(t, style, sv, seed_data["buyer"], seed_data["factory"])
        po = _create_po(t, fo, seed_data["buyer"], seed_data["factory"], seed_data["currency"])
        resp = merch_client.post("/api/v1/merchandising/costings/", {
            "purchase_order": str(po.id),
            "fabric_cost": "5.00",
            "trim_cost": "1.50",
        })
        costing_id = resp.data["id"]
        resp2 = merch_client.post(f"/api/v1/merchandising/costings/{costing_id}/approve/")
        assert resp2.status_code == status.HTTP_200_OK
        assert resp2.data["status"] == "approved"

    def test_reject_costing(self, merch_client, seed_data):
        t = seed_data["buyer"].tenant
        style = _create_style(t, seed_data["buyer"], "STY-CR", "Reject Style")
        sv = _create_sv(t, style)
        fo = _create_fo(t, style, sv, seed_data["buyer"], seed_data["factory"])
        po = _create_po(t, fo, seed_data["buyer"], seed_data["factory"], seed_data["currency"])
        resp = merch_client.post("/api/v1/merchandising/costings/", {
            "purchase_order": str(po.id),
            "fabric_cost": "5.00",
            "trim_cost": "1.50",
        })
        costing_id = resp.data["id"]
        resp2 = merch_client.post(f"/api/v1/merchandising/costings/{costing_id}/reject/")
        assert resp2.status_code == status.HTTP_200_OK
        assert resp2.data["status"] == "rejected"


# ==================== PO Amendment Tests ====================

@pytest.mark.django_db
class TestPOAmendmentAPI:
    def test_create_amendment(self, merch_client, seed_data):
        t = seed_data["buyer"].tenant
        style = _create_style(t, seed_data["buyer"], "STY-AMD", "Amend Style")
        sv = _create_sv(t, style)
        fo = _create_fo(t, style, sv, seed_data["buyer"], seed_data["factory"])
        po = _create_po(t, fo, seed_data["buyer"], seed_data["factory"], seed_data["currency"])
        response = merch_client.post("/api/v1/merchandising/po-amendments/", {
            "purchase_order": str(po.id),
            "field_name": "delivery_date",
            "new_value": "2026-07-01",
            "reason": "Customer requested delay",
        })
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["amendment_number"].startswith("AMD-")
        assert response.data["field_name"] == "delivery_date"
        assert response.data["status"] == "pending"

    def test_list_amendments(self, merch_client, seed_data):
        t = seed_data["buyer"].tenant
        style = _create_style(t, seed_data["buyer"], "STY-AML", "List Amend")
        sv = _create_sv(t, style)
        fo = _create_fo(t, style, sv, seed_data["buyer"], seed_data["factory"])
        po = _create_po(t, fo, seed_data["buyer"], seed_data["factory"], seed_data["currency"])
        merch_client.post("/api/v1/merchandising/po-amendments/", {
            "purchase_order": str(po.id), "field_name": "quantity",
            "new_value": "2000", "reason": "Increase order",
        })
        response = merch_client.get(f"/api/v1/merchandising/po-amendments/?purchase_order={po.id}")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] >= 1

    def test_approve_amendment(self, merch_client, seed_data):
        t = seed_data["buyer"].tenant
        style = _create_style(t, seed_data["buyer"], "STY-AMA", "Approve Amend")
        sv = _create_sv(t, style)
        fo = _create_fo(t, style, sv, seed_data["buyer"], seed_data["factory"])
        po = _create_po(t, fo, seed_data["buyer"], seed_data["factory"], seed_data["currency"])
        resp = merch_client.post("/api/v1/merchandising/po-amendments/", {
            "purchase_order": str(po.id), "field_name": "delivery_date",
            "new_value": "2026-08-01", "reason": "Delay approved",
        })
        amend_id = resp.data["id"]
        resp2 = merch_client.post(f"/api/v1/merchandising/po-amendments/{amend_id}/approve/")
        assert resp2.status_code == status.HTTP_200_OK
        assert resp2.data["status"] == "approved"

    def test_reject_amendment(self, merch_client, seed_data):
        t = seed_data["buyer"].tenant
        style = _create_style(t, seed_data["buyer"], "STY-AMR", "Reject Amend")
        sv = _create_sv(t, style)
        fo = _create_fo(t, style, sv, seed_data["buyer"], seed_data["factory"])
        po = _create_po(t, fo, seed_data["buyer"], seed_data["factory"], seed_data["currency"])
        resp = merch_client.post("/api/v1/merchandising/po-amendments/", {
            "purchase_order": str(po.id), "field_name": "quantity",
            "new_value": "1500", "reason": "Over request",
        })
        amend_id = resp.data["id"]
        resp2 = merch_client.post(f"/api/v1/merchandising/po-amendments/{amend_id}/reject/")
        assert resp2.status_code == status.HTTP_200_OK
        assert resp2.data["status"] == "rejected"

    def test_cannot_approve_non_pending(self, merch_client, seed_data):
        t = seed_data["buyer"].tenant
        style = _create_style(t, seed_data["buyer"], "STY-CAN", "Cannot Amend")
        sv = _create_sv(t, style)
        fo = _create_fo(t, style, sv, seed_data["buyer"], seed_data["factory"])
        po = _create_po(t, fo, seed_data["buyer"], seed_data["factory"], seed_data["currency"])
        resp = merch_client.post("/api/v1/merchandising/po-amendments/", {
            "purchase_order": str(po.id), "field_name": "remarks",
            "new_value": "Urgent", "reason": "Priority",
        })
        amend_id = resp.data["id"]
        merch_client.post(f"/api/v1/merchandising/po-amendments/{amend_id}/approve/")
        resp2 = merch_client.post(f"/api/v1/merchandising/po-amendments/{amend_id}/approve/")
        assert resp2.status_code == status.HTTP_400_BAD_REQUEST

    def test_amendment_default_status_pending(self, seed_data):
        t = seed_data["buyer"].tenant
        style = _create_style(t, seed_data["buyer"], "STY-ADP", "Default Status")
        sv = _create_sv(t, style)
        fo = _create_fo(t, style, sv, seed_data["buyer"], seed_data["factory"])
        po = _create_po(t, fo, seed_data["buyer"], seed_data["factory"], seed_data["currency"])
        amend = POAmendment.objects.create(
            tenant=t, purchase_order=po, amendment_number="AMD-TST",
            field_name="quantity", new_value="2000", reason="Test",
        )
        assert amend.status == "pending"
        assert str(amend).startswith("Amendment")
