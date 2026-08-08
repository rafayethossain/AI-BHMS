"""
Tests for quality app.
"""
import pytest
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.tenants.models import Tenant
from apps.users.models import Role, UserRole, Permission, RolePermission
from apps.setup.models import Factory, Currency, Country, Season, Buyer, Brand
from apps.merchandising.models import Style, StyleVersion, FileOpening, PurchaseOrder
from apps.quality.models import Inspection, InspectionItem

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def qual_tenant(db):
    return Tenant.objects.create(
        name="Quality Test Co", slug="qual-test",
        schema_name="tenant_qual", status="active"
    )


@pytest.fixture
def qual_role(db, qual_tenant):
    role = Role.objects.create(tenant=qual_tenant, name="QualAdmin", is_system=True)
    for mod in ["quality", "merchandising", "setup"]:
        for act in ["view", "create", "edit", "delete"]:
            perm, _ = Permission.objects.get_or_create(
                module=mod, action=act,
                defaults={"description": f"{mod}:{act}"}
            )
            RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def qual_user(db, qual_tenant, qual_role):
    user = User.objects.create_user(
        username="qualuser", email="qual@test.com",
        password="testpass123!@#", tenant=qual_tenant, status="active"
    )
    UserRole.objects.create(user=user, role=qual_role)
    return user


@pytest.fixture
def qual_client(api_client, qual_user):
    api_client.force_authenticate(user=qual_user)
    return api_client


@pytest.fixture
def seed_data(qual_tenant):
    currency = Currency.objects.create(tenant=qual_tenant, code="USD", name="US Dollar", symbol="$")
    country = Country.objects.create(tenant=qual_tenant, code="BGD", name="Bangladesh")
    season = Season.objects.create(tenant=qual_tenant, code="SS26", name="SS 2026")
    buyer = Buyer.objects.create(tenant=qual_tenant, code="HM", name="H&M", country=country, currency=currency)
    brand = Brand.objects.create(tenant=qual_tenant, buyer=buyer, code="HM-BM", name="Basics")
    factory = Factory.objects.create(tenant=qual_tenant, code="F-001", name="Apex Knitwears")
    style = Style.objects.create(tenant=qual_tenant, style_number="STY-001", name="Test Style", buyer=buyer)
    sv = StyleVersion.objects.create(tenant=qual_tenant, style=style, version_number=1, status="active")
    fo = FileOpening.objects.create(
        tenant=qual_tenant, file_number="FO-001", style=style, style_version=sv,
        buyer=buyer, factory=factory, file_date="2026-01-01"
    )
    po = PurchaseOrder.objects.create(
        tenant=qual_tenant, po_number="PO-001", file_opening=fo, buyer=buyer,
        factory=factory, po_date="2026-01-15", delivery_date="2026-06-01",
        quantity=1000, unit_price=10.00, total_value=10000.00, currency=currency,
    )
    return {
        "currency": currency, "country": country, "season": season,
        "buyer": buyer, "brand": brand, "factory": factory,
        "style": style, "sv": sv, "fo": fo, "po": po,
    }


# ==================== Inspection Model Tests ====================

@pytest.mark.django_db
class TestInspectionModel:
    def test_create_inspection(self, qual_tenant, seed_data):
        inspection = Inspection.objects.create(
            tenant=qual_tenant,
            purchase_order=seed_data["po"],
            factory=seed_data["factory"],
            inspection_type="inline",
            inspection_date="2026-03-01",
            aql_level=2.5,
            passed_quantity=95,
            rejected_quantity=5,
            status="pending",
        )
        assert inspection.inspection_type == "inline"
        assert inspection.aql_level == 2.5
        assert inspection.status == "pending"

    def test_inspection_str(self, qual_tenant, seed_data):
        inspection = Inspection.objects.create(
            tenant=qual_tenant, purchase_order=seed_data["po"],
            factory=seed_data["factory"], inspection_type="final",
            inspection_date="2026-03-01",
        )
        assert "final" in str(inspection)
        assert "PO-001" in str(inspection)

    def test_inspection_default_status(self, qual_tenant, seed_data):
        inspection = Inspection.objects.create(
            tenant=qual_tenant, purchase_order=seed_data["po"],
            factory=seed_data["factory"], inspection_type="inline",
            inspection_date="2026-03-01",
        )
        assert inspection.status == "pending"

    def test_inspection_ordering(self, qual_tenant, seed_data):
        insp1 = Inspection.objects.create(
            tenant=qual_tenant, purchase_order=seed_data["po"],
            factory=seed_data["factory"], inspection_type="inline",
            inspection_date="2026-03-01",
        )
        insp2 = Inspection.objects.create(
            tenant=qual_tenant, purchase_order=seed_data["po"],
            factory=seed_data["factory"], inspection_type="final",
            inspection_date="2026-03-02",
        )
        inspections = list(Inspection.objects.filter(tenant=qual_tenant))
        assert inspections[0].id == insp2.id
        assert inspections[1].id == insp1.id


# ==================== Inspection API Tests ====================

@pytest.mark.django_db
class TestInspectionAPI:
    def test_list_inspections(self, qual_client, seed_data):
        Inspection.objects.create(
            tenant=seed_data["po"].tenant, purchase_order=seed_data["po"],
            factory=seed_data["factory"], inspection_type="inline",
            inspection_date="2026-03-01",
        )
        response = qual_client.get("/api/v1/quality/inspections/")
        assert response.status_code == status.HTTP_200_OK

    def test_create_inspection(self, qual_client, seed_data):
        response = qual_client.post("/api/v1/quality/inspections/", {
            "purchase_order": str(seed_data["po"].id),
            "factory": str(seed_data["factory"].id),
            "inspection_type": "inline",
            "inspection_date": "2026-03-01",
            "aql_level": "2.5",
        })
        assert response.status_code == status.HTTP_201_CREATED

    def test_retrieve_inspection(self, qual_client, seed_data):
        inspection = Inspection.objects.create(
            tenant=seed_data["po"].tenant, purchase_order=seed_data["po"],
            factory=seed_data["factory"], inspection_type="inline",
            inspection_date="2026-03-01",
        )
        response = qual_client.get(f"/api/v1/quality/inspections/{inspection.id}/")
        assert response.status_code == status.HTTP_200_OK

    def test_start_inspection(self, qual_client, seed_data):
        inspection = Inspection.objects.create(
            tenant=seed_data["po"].tenant, purchase_order=seed_data["po"],
            factory=seed_data["factory"], inspection_type="inline",
            inspection_date="2026-03-01", status="pending",
        )
        response = qual_client.post(f"/api/v1/quality/inspections/{inspection.id}/start/")
        assert response.status_code == status.HTTP_200_OK
        inspection.refresh_from_db()
        assert inspection.status == "in_progress"

    def test_complete_inspection_passed(self, qual_client, seed_data):
        inspection = Inspection.objects.create(
            tenant=seed_data["po"].tenant, purchase_order=seed_data["po"],
            factory=seed_data["factory"], inspection_type="inline",
            inspection_date="2026-03-01", status="in_progress",
            aql_level=2.5, passed_quantity=98, rejected_quantity=2,
        )
        response = qual_client.post(f"/api/v1/quality/inspections/{inspection.id}/complete/")
        assert response.status_code == status.HTTP_200_OK
        inspection.refresh_from_db()
        assert inspection.status == "passed"

    def test_complete_inspection_failed(self, qual_client, seed_data):
        inspection = Inspection.objects.create(
            tenant=seed_data["po"].tenant, purchase_order=seed_data["po"],
            factory=seed_data["factory"], inspection_type="inline",
            inspection_date="2026-03-01", status="in_progress",
            aql_level=2.5, passed_quantity=80, rejected_quantity=20,
        )
        response = qual_client.post(f"/api/v1/quality/inspections/{inspection.id}/complete/")
        assert response.status_code == status.HTTP_200_OK
        inspection.refresh_from_db()
        assert inspection.status == "failed"

    def test_start_inspection_invalid_status(self, qual_client, seed_data):
        inspection = Inspection.objects.create(
            tenant=seed_data["po"].tenant, purchase_order=seed_data["po"],
            factory=seed_data["factory"], inspection_type="inline",
            inspection_date="2026-03-01", status="passed",
        )
        response = qual_client.post(f"/api/v1/quality/inspections/{inspection.id}/start/")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_export_inspection(self, qual_client, seed_data):
        inspection = Inspection.objects.create(
            tenant=seed_data["po"].tenant, purchase_order=seed_data["po"],
            factory=seed_data["factory"], inspection_type="inline",
            inspection_date="2026-03-01", passed_quantity=95, rejected_quantity=5,
        )
        response = qual_client.get(f"/api/v1/quality/inspections/{inspection.id}/export/")
        assert response.status_code == status.HTTP_200_OK
        assert response["Content-Type"] == "text/csv"

    def test_filter_inspections_by_type(self, qual_client, seed_data):
        Inspection.objects.create(
            tenant=seed_data["po"].tenant, purchase_order=seed_data["po"],
            factory=seed_data["factory"], inspection_type="inline",
            inspection_date="2026-03-01",
        )
        Inspection.objects.create(
            tenant=seed_data["po"].tenant, purchase_order=seed_data["po"],
            factory=seed_data["factory"], inspection_type="final",
            inspection_date="2026-03-02",
        )
        response = qual_client.get("/api/v1/quality/inspections/?inspection_type=inline")
        assert response.status_code == status.HTTP_200_OK

    def test_filter_inspections_by_status(self, qual_client, seed_data):
        Inspection.objects.create(
            tenant=seed_data["po"].tenant, purchase_order=seed_data["po"],
            factory=seed_data["factory"], inspection_type="inline",
            inspection_date="2026-03-01", status="pending",
        )
        Inspection.objects.create(
            tenant=seed_data["po"].tenant, purchase_order=seed_data["po"],
            factory=seed_data["factory"], inspection_type="final",
            inspection_date="2026-03-02", status="passed",
        )
        response = qual_client.get("/api/v1/quality/inspections/?status=pending")
        assert response.status_code == status.HTTP_200_OK


# ==================== InspectionItem Tests ====================

@pytest.mark.django_db
class TestInspectionItemModel:
    def test_create_item(self, qual_tenant, seed_data):
        inspection = Inspection.objects.create(
            tenant=qual_tenant, purchase_order=seed_data["po"],
            factory=seed_data["factory"], inspection_type="inline",
            inspection_date="2026-03-01",
        )
        item = InspectionItem.objects.create(
            tenant=qual_tenant, inspection=inspection,
            defect_type="Open Seam", defect_count=3,
            severity="major", description="Seam not closed properly",
        )
        assert item.defect_type == "Open Seam"
        assert item.severity == "major"
        assert item.defect_count == 3

    def test_item_str(self, qual_tenant, seed_data):
        inspection = Inspection.objects.create(
            tenant=qual_tenant, purchase_order=seed_data["po"],
            factory=seed_data["factory"], inspection_type="inline",
            inspection_date="2026-03-01",
        )
        item = InspectionItem.objects.create(
            tenant=qual_tenant, inspection=inspection,
            defect_type="Stain", defect_count=1, severity="critical",
        )
        assert "Stain" in str(item)
        assert "critical" in str(item)


@pytest.mark.django_db
class TestInspectionItemAPI:
    def test_create_item(self, qual_client, seed_data):
        inspection = Inspection.objects.create(
            tenant=seed_data["po"].tenant, purchase_order=seed_data["po"],
            factory=seed_data["factory"], inspection_type="inline",
            inspection_date="2026-03-01",
        )
        response = qual_client.post("/api/v1/quality/inspection-items/", {
            "inspection": str(inspection.id),
            "defect_type": "Open Seam",
            "defect_count": 3,
            "severity": "major",
            "description": "Seam not closed",
        })
        assert response.status_code == status.HTTP_201_CREATED

    def test_list_items(self, qual_client, seed_data):
        inspection = Inspection.objects.create(
            tenant=seed_data["po"].tenant, purchase_order=seed_data["po"],
            factory=seed_data["factory"], inspection_type="inline",
            inspection_date="2026-03-01",
        )
        InspectionItem.objects.create(
            tenant=seed_data["po"].tenant, inspection=inspection,
            defect_type="Stain", defect_count=1, severity="critical",
        )
        response = qual_client.get("/api/v1/quality/inspection-items/")
        assert response.status_code == status.HTTP_200_OK

    def test_filter_items_by_severity(self, qual_client, seed_data):
        inspection = Inspection.objects.create(
            tenant=seed_data["po"].tenant, purchase_order=seed_data["po"],
            factory=seed_data["factory"], inspection_type="inline",
            inspection_date="2026-03-01",
        )
        InspectionItem.objects.create(
            tenant=seed_data["po"].tenant, inspection=inspection,
            defect_type="Stain", defect_count=1, severity="critical",
        )
        InspectionItem.objects.create(
            tenant=seed_data["po"].tenant, inspection=inspection,
            defect_type="Loose Thread", defect_count=5, severity="minor",
        )
        response = qual_client.get("/api/v1/quality/inspection-items/?severity=critical")
        assert response.status_code == status.HTTP_200_OK
