"""
Tests for Gold Seal Tracking (GC-016).

Gold seal is the customer-technical sample sign-off per shipment. Lifecycle:
pending -> sent -> approved / rejected. TDD: tests written before the model.
"""
import pytest
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.tenants.models import Tenant
from apps.users.models import Role, UserRole, Permission, RolePermission
from apps.setup.models import Factory, Currency, Country, Season, Buyer, Brand
from apps.merchandising.models import Style, StyleVersion, FileOpening, PurchaseOrder
from apps.logistics.models import FreightForwarder, Shipment
from apps.quality.models import GoldSeal

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def gs_tenant(db):
    return Tenant.objects.create(
        name="Gold Seal Test Co", slug="gs-test",
        schema_name="tenant_gs", status="active"
    )


@pytest.fixture
def gs_role(db, gs_tenant):
    role = Role.objects.create(tenant=gs_tenant, name="QualAdmin", is_system=True)
    for mod in ["quality", "logistics", "merchandising", "setup"]:
        for act in ["view", "create", "edit", "delete"]:
            perm, _ = Permission.objects.get_or_create(
                module=mod, action=act,
                defaults={"description": f"{mod}:{act}"}
            )
            RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def gs_user(db, gs_tenant, gs_role):
    user = User.objects.create_user(
        username="gsuser", email="gs@test.com",
        password="testpass123!@#", tenant=gs_tenant, status="active"
    )
    UserRole.objects.create(user=user, role=gs_role)
    return user


@pytest.fixture
def gs_client(api_client, gs_user):
    api_client.force_authenticate(user=gs_user)
    return api_client


@pytest.fixture
def seed_data(gs_tenant):
    currency = Currency.objects.create(tenant=gs_tenant, code="USD", name="US Dollar", symbol="$")
    country = Country.objects.create(tenant=gs_tenant, code="BGD", name="Bangladesh")
    season = Season.objects.create(tenant=gs_tenant, code="SS26", name="SS 2026")
    buyer = Buyer.objects.create(tenant=gs_tenant, code="HM", name="H&M", country=country, currency=currency)
    brand = Brand.objects.create(tenant=gs_tenant, buyer=buyer, code="HM-BM", name="Basics")
    factory = Factory.objects.create(tenant=gs_tenant, code="F-001", name="Apex Knitwears")
    style = Style.objects.create(tenant=gs_tenant, style_number="STY-001", name="Test Style", buyer=buyer)
    sv = StyleVersion.objects.create(tenant=gs_tenant, style=style, version_number=1, status="active")
    fo = FileOpening.objects.create(
        tenant=gs_tenant, file_number="FO-001", style=style, style_version=sv,
        buyer=buyer, factory=factory, file_date="2026-01-01"
    )
    po = PurchaseOrder.objects.create(
        tenant=gs_tenant, po_number="PO-001", file_opening=fo, buyer=buyer,
        factory=factory, po_date="2026-01-15", delivery_date="2026-06-01",
        quantity=1000, unit_price=10.00, total_value=10000.00, currency=currency,
    )
    ff = FreightForwarder.objects.create(tenant=gs_tenant, code="FF-001", name="Maersk Line")
    shipment = Shipment.objects.create(
        tenant=gs_tenant, shipment_number="SHP-001", purchase_order=po,
        factory=factory, freight_forwarder=ff, mode="sea", status="booked",
    )
    return {
        "currency": currency, "country": country, "season": season,
        "buyer": buyer, "brand": brand, "factory": factory,
        "style": style, "sv": sv, "fo": fo, "po": po, "shipment": shipment,
    }


# ==================== GoldSeal Model Tests ====================

@pytest.mark.django_db
class TestGoldSealModel:
    def test_default_status(self, gs_tenant, seed_data):
        gs = GoldSeal.objects.create(
            tenant=gs_tenant, shipment=seed_data["shipment"]
        )
        assert gs.status == "pending"
        assert gs.sent_date is None
        assert gs.approval_date is None

    def test_create_with_all_fields(self, gs_tenant, seed_data):
        gs = GoldSeal.objects.create(
            tenant=gs_tenant, shipment=seed_data["shipment"],
            status="sent", sent_date="2026-03-01", notes="First gold seal sent",
        )
        assert gs.status == "sent"
        assert str(gs.sent_date) == "2026-03-01"
        assert gs.notes == "First gold seal sent"

    def test_gold_seal_str(self, gs_tenant, seed_data):
        gs = GoldSeal.objects.create(
            tenant=gs_tenant, shipment=seed_data["shipment"], status="approved"
        )
        assert "SHP-001" in str(gs)
        assert "Approved" in str(gs)

    def test_gold_seal_ordering(self, gs_tenant, seed_data):
        gs1 = GoldSeal.objects.create(tenant=gs_tenant, shipment=seed_data["shipment"])
        gs2 = GoldSeal.objects.create(
            tenant=gs_tenant, shipment=seed_data["shipment"], status="sent"
        )
        seals = list(GoldSeal.objects.filter(tenant=gs_tenant))
        assert seals[0].id == gs2.id
        assert seals[1].id == gs1.id

    def test_status_display(self, gs_tenant, seed_data):
        gs = GoldSeal.objects.create(
            tenant=gs_tenant, shipment=seed_data["shipment"], status="rejected"
        )
        assert gs.get_status_display() == "Rejected"


# ==================== GoldSeal API Tests ====================

@pytest.mark.django_db
class TestGoldSealAPI:
    def test_list_gold_seals(self, gs_client, seed_data):
        GoldSeal.objects.create(
            tenant=seed_data["shipment"].tenant, shipment=seed_data["shipment"]
        )
        response = gs_client.get("/api/v1/quality/gold-seals/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1

    def test_create_gold_seal(self, gs_client, seed_data):
        response = gs_client.post("/api/v1/quality/gold-seals/", {
            "shipment": str(seed_data["shipment"].id),
            "notes": "Customer technical gold seal sample",
        })
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["status"] == "pending"
        assert response.data["shipment_number"] == "SHP-001"
        assert response.data["po_number"] == "PO-001"

    def test_retrieve_gold_seal(self, gs_client, seed_data):
        gs = GoldSeal.objects.create(
            tenant=seed_data["shipment"].tenant, shipment=seed_data["shipment"]
        )
        response = gs_client.get(f"/api/v1/quality/gold-seals/{gs.id}/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == str(gs.id)

    def test_update_gold_seal(self, gs_client, seed_data):
        gs = GoldSeal.objects.create(
            tenant=seed_data["shipment"].tenant, shipment=seed_data["shipment"]
        )
        response = gs_client.patch(f"/api/v1/quality/gold-seals/{gs.id}/", {
            "notes": "Updated notes"
        })
        assert response.status_code == status.HTTP_200_OK
        gs.refresh_from_db()
        assert gs.notes == "Updated notes"

    def test_delete_gold_seal(self, gs_client, seed_data):
        gs = GoldSeal.objects.create(
            tenant=seed_data["shipment"].tenant, shipment=seed_data["shipment"]
        )
        response = gs_client.delete(f"/api/v1/quality/gold-seals/{gs.id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert GoldSeal.objects.filter(id=gs.id).count() == 0

    def test_send_action(self, gs_client, seed_data):
        gs = GoldSeal.objects.create(
            tenant=seed_data["shipment"].tenant, shipment=seed_data["shipment"]
        )
        response = gs_client.post(f"/api/v1/quality/gold-seals/{gs.id}/send/")
        assert response.status_code == status.HTTP_200_OK
        gs.refresh_from_db()
        assert gs.status == "sent"
        assert gs.sent_date is not None

    def test_send_invalid_status(self, gs_client, seed_data):
        gs = GoldSeal.objects.create(
            tenant=seed_data["shipment"].tenant, shipment=seed_data["shipment"],
            status="approved",
        )
        response = gs_client.post(f"/api/v1/quality/gold-seals/{gs.id}/send/")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_approve_action(self, gs_client, seed_data):
        gs = GoldSeal.objects.create(
            tenant=seed_data["shipment"].tenant, shipment=seed_data["shipment"],
            status="sent", sent_date="2026-03-01",
        )
        response = gs_client.post(f"/api/v1/quality/gold-seals/{gs.id}/approve/")
        assert response.status_code == status.HTTP_200_OK
        gs.refresh_from_db()
        assert gs.status == "approved"
        assert gs.approval_date is not None

    def test_approve_invalid_status(self, gs_client, seed_data):
        gs = GoldSeal.objects.create(
            tenant=seed_data["shipment"].tenant, shipment=seed_data["shipment"]
        )
        response = gs_client.post(f"/api/v1/quality/gold-seals/{gs.id}/approve/")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_reject_action(self, gs_client, seed_data):
        gs = GoldSeal.objects.create(
            tenant=seed_data["shipment"].tenant, shipment=seed_data["shipment"],
            status="sent", sent_date="2026-03-01",
        )
        response = gs_client.post(f"/api/v1/quality/gold-seals/{gs.id}/reject/")
        assert response.status_code == status.HTTP_200_OK
        gs.refresh_from_db()
        assert gs.status == "rejected"

    def test_reject_invalid_status(self, gs_client, seed_data):
        gs = GoldSeal.objects.create(
            tenant=seed_data["shipment"].tenant, shipment=seed_data["shipment"],
            status="approved",
        )
        response = gs_client.post(f"/api/v1/quality/gold-seals/{gs.id}/reject/")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_filter_by_status(self, gs_client, seed_data):
        GoldSeal.objects.create(
            tenant=seed_data["shipment"].tenant, shipment=seed_data["shipment"],
            status="sent", sent_date="2026-03-01",
        )
        GoldSeal.objects.create(
            tenant=seed_data["shipment"].tenant, shipment=seed_data["shipment"],
            status="pending",
        )
        response = gs_client.get("/api/v1/quality/gold-seals/?status=sent")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["status"] == "sent"

    def test_requires_permission(self, api_client, gs_tenant, seed_data):
        role = Role.objects.create(tenant=gs_tenant, name="ReadOnly", is_system=True)
        perm, _ = Permission.objects.get_or_create(
            module="quality", action="view",
            defaults={"description": "quality:view"}
        )
        RolePermission.objects.create(role=role, permission=perm)
        user = User.objects.create_user(
            username="reader", email="reader@test.com",
            password="testpass123!@#", tenant=gs_tenant, status="active"
        )
        UserRole.objects.create(user=user, role=role)
        api_client.force_authenticate(user=user)
        response = api_client.post("/api/v1/quality/gold-seals/", {
            "shipment": str(seed_data["shipment"].id),
        })
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_unauthenticated_401(self, api_client):
        response = api_client.get("/api/v1/quality/gold-seals/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_tenant_isolation(self, api_client, gs_tenant, seed_data):
        other_tenant = Tenant.objects.create(
            name="Other Co", slug="other-co",
            schema_name="tenant_other", status="active"
        )
        role = Role.objects.create(tenant=other_tenant, name="OtherAdmin", is_system=True)
        for mod in ["quality", "logistics", "merchandising", "setup"]:
            for act in ["view", "create", "edit", "delete"]:
                perm, _ = Permission.objects.get_or_create(
                    module=mod, action=act,
                    defaults={"description": f"{mod}:{act}"}
                )
                RolePermission.objects.create(role=role, permission=perm)
        other_user = User.objects.create_user(
            username="other", email="other@test.com",
            password="testpass123!@#", tenant=other_tenant, status="active"
        )
        UserRole.objects.create(user=other_user, role=role)
        GoldSeal.objects.create(
            tenant=gs_tenant, shipment=seed_data["shipment"]
        )
        api_client.force_authenticate(user=other_user)
        api_client.credentials(HTTP_X_TENANT_ID=str(other_tenant.id))
        response = api_client.get("/api/v1/quality/gold-seals/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 0
