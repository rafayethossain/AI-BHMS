"""
Tests for Fit Specification System (GC-011).

Covers the FitSpec model (versioning, current-fit selection) and the
FitSpecViewSet API (CRUD, measurements JSON validation, set-current action).
"""
from datetime import date
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from rest_framework import status
from rest_framework.test import APIClient

from apps.merchandising.models import (
    FileOpening,
    FitSpec,
    PurchaseOrder,
    Style,
    StyleVersion,
)
from apps.setup.models import Buyer, Country, Currency, Factory
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def fit_tenant(db):
    return Tenant.objects.create(
        name="Fit Test Co", slug="fit-test",
        schema_name="tenant_fit", status="active"
    )


@pytest.fixture
def fit_role(db, fit_tenant):
    role = Role.objects.create(tenant=fit_tenant, name="FitAdmin", is_system=True)
    for mod in ["setup", "merchandising"]:
        for act in ["view", "create", "edit", "delete"]:
            perm, _ = Permission.objects.get_or_create(
                module=mod, action=act,
                defaults={"description": f"{mod}:{act}"}
            )
            RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def fit_user(db, fit_tenant, fit_role):
    user = User.objects.create_user(
        username="fituser", email="fit@test.com",
        password="testpass123!@#", tenant=fit_tenant, status="active",
    )
    UserRole.objects.create(user=user, role=fit_role)
    return user


@pytest.fixture
def fit_client(api_client, fit_user):
    api_client.force_authenticate(user=fit_user)
    return api_client


@pytest.fixture
def seed_fit_data(db, fit_tenant, fit_user):
    country = Country.objects.create(tenant=fit_tenant, name="Fit Country", code="FC1")
    buyer = Buyer.objects.create(tenant=fit_tenant, name="Fit Buyer", code="FB01", country=country)
    factory = Factory.objects.create(tenant=fit_tenant, name="Factory A", code="FA01", country=country)
    currency = Currency.objects.create(tenant=fit_tenant, name="USD", code="USD", symbol="$")
    style = Style.objects.create(
        tenant=fit_tenant, style_number="STY-FIT", name="Fit Style",
        buyer=buyer, created_by=fit_user,
    )
    sv = StyleVersion.objects.create(
        tenant=fit_tenant, style=style, version_number=1, status="active",
        created_by=fit_user,
    )
    fo = FileOpening.objects.create(
        tenant=fit_tenant, file_number="FO-FIT", style=style, style_version=sv,
        buyer=buyer, factory=factory, file_date=date(2026, 1, 1),
        created_by=fit_user,
    )
    po = PurchaseOrder.objects.create(
        tenant=fit_tenant, po_number="PO-FIT", file_opening=fo, buyer=buyer,
        factory=factory, po_date=date(2026, 1, 15), delivery_date=date(2026, 6, 1),
        quantity=1000, unit_price=Decimal("10.00"), total_value=Decimal("10000.00"),
        currency=currency,
    )
    po2 = PurchaseOrder.objects.create(
        tenant=fit_tenant, po_number="PO-FIT2", file_opening=fo, buyer=buyer,
        factory=factory, po_date=date(2026, 1, 15), delivery_date=date(2026, 6, 15),
        quantity=500, unit_price=Decimal("12.00"), total_value=Decimal("6000.00"),
        currency=currency,
    )
    return {
        "tenant": fit_tenant, "user": fit_user, "buyer": buyer,
        "factory": factory, "currency": currency,
        "style": style, "style_version": sv, "file_opening": fo,
        "purchase_order": po, "purchase_order2": po2,
    }


# ==================== Model Tests ====================

@pytest.mark.django_db
class TestFitSpecModel:
    """Test the GC-011 FitSpec model."""

    def test_defaults(self, seed_fit_data):
        spec = FitSpec.objects.create(
            tenant=seed_fit_data["tenant"],
            purchase_order=seed_fit_data["purchase_order"],
            created_by=seed_fit_data["user"],
        )
        assert spec.fit_stage == "dev"
        assert spec.version == 1
        assert spec.measurements == {}
        assert spec.images == []
        assert spec.notes == ""
        assert spec.is_current is False

    def test_measurements_json_roundtrip(self, seed_fit_data):
        measurements = {
            "chest": {"size": "M", "value": "52cm"},
            "length": "70cm",
        }
        spec = FitSpec.objects.create(
            tenant=seed_fit_data["tenant"],
            purchase_order=seed_fit_data["purchase_order"],
            measurements=measurements,
            created_by=seed_fit_data["user"],
        )
        fetched = FitSpec.objects.get(id=spec.id)
        assert fetched.measurements == measurements

    def test_images_list_roundtrip(self, seed_fit_data):
        spec = FitSpec.objects.create(
            tenant=seed_fit_data["tenant"],
            purchase_order=seed_fit_data["purchase_order"],
            images=["https://cdn.example.com/spec1.jpg"],
            created_by=seed_fit_data["user"],
        )
        assert FitSpec.objects.get(id=spec.id).images == ["https://cdn.example.com/spec1.jpg"]

    def test_str_method(self, seed_fit_data):
        spec = FitSpec.objects.create(
            tenant=seed_fit_data["tenant"],
            purchase_order=seed_fit_data["purchase_order"],
            fit_stage="1st", created_by=seed_fit_data["user"],
        )
        assert str(spec) == "PO-FIT - 1st V1"

    def test_duplicate_version_raises(self, seed_fit_data):
        FitSpec.objects.create(
            tenant=seed_fit_data["tenant"],
            purchase_order=seed_fit_data["purchase_order"],
            fit_stage="2nd", version=1, created_by=seed_fit_data["user"],
        )
        with pytest.raises(IntegrityError):
            FitSpec.objects.create(
                tenant=seed_fit_data["tenant"],
                purchase_order=seed_fit_data["purchase_order"],
                fit_stage="2nd", version=1, created_by=seed_fit_data["user"],
            )


# ==================== API Tests ====================

@pytest.mark.django_db
class TestFitSpecAPI:
    """Test the FitSpecViewSet endpoints."""

    def test_create_first_spec_is_current(self, fit_client, seed_fit_data):
        response = fit_client.post("/api/v1/merchandising/fit-specs/", {
            "purchase_order": str(seed_fit_data["purchase_order"].id),
            "fit_stage": "dev",
            "measurements": {"chest": "52cm"},
            "notes": "Initial dev spec",
        }, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["version"] == 1
        assert response.data["is_current"] is True
        assert response.data["po_number"] == "PO-FIT"

    def test_create_second_spec_increments_version(self, fit_client, seed_fit_data):
        fit_client.post("/api/v1/merchandising/fit-specs/", {
            "purchase_order": str(seed_fit_data["purchase_order"].id),
            "fit_stage": "dev",
        }, format="json")
        response = fit_client.post("/api/v1/merchandising/fit-specs/", {
            "purchase_order": str(seed_fit_data["purchase_order"].id),
            "fit_stage": "1st",
        }, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["version"] == 2
        assert response.data["is_current"] is False

    def test_set_current_action(self, fit_client, seed_fit_data):
        s1 = FitSpec.objects.create(
            tenant=seed_fit_data["tenant"], purchase_order=seed_fit_data["purchase_order"],
            fit_stage="dev", is_current=True, created_by=seed_fit_data["user"],
        )
        s2 = FitSpec.objects.create(
            tenant=seed_fit_data["tenant"], purchase_order=seed_fit_data["purchase_order"],
            fit_stage="2nd", created_by=seed_fit_data["user"],
        )
        response = fit_client.post(f"/api/v1/merchandising/fit-specs/{s2.id}/set-current/")
        assert response.status_code == status.HTTP_200_OK
        s1.refresh_from_db()
        s2.refresh_from_db()
        assert s1.is_current is False
        assert s2.is_current is True

    def test_patch_is_current_clears_others(self, fit_client, seed_fit_data):
        s1 = FitSpec.objects.create(
            tenant=seed_fit_data["tenant"], purchase_order=seed_fit_data["purchase_order"],
            fit_stage="dev", is_current=True, created_by=seed_fit_data["user"],
        )
        s2 = FitSpec.objects.create(
            tenant=seed_fit_data["tenant"], purchase_order=seed_fit_data["purchase_order"],
            fit_stage="3rd", created_by=seed_fit_data["user"],
        )
        response = fit_client.patch(f"/api/v1/merchandising/fit-specs/{s2.id}/", {
            "is_current": True,
        }, format="json")
        assert response.status_code == status.HTTP_200_OK
        s1.refresh_from_db()
        s2.refresh_from_db()
        assert s1.is_current is False
        assert s2.is_current is True

    def test_current_independent_across_orders(self, fit_client, seed_fit_data):
        s1 = FitSpec.objects.create(
            tenant=seed_fit_data["tenant"], purchase_order=seed_fit_data["purchase_order"],
            fit_stage="dev", is_current=True, created_by=seed_fit_data["user"],
        )
        s2 = FitSpec.objects.create(
            tenant=seed_fit_data["tenant"], purchase_order=seed_fit_data["purchase_order2"],
            fit_stage="dev", is_current=True, created_by=seed_fit_data["user"],
        )
        response = fit_client.post(f"/api/v1/merchandising/fit-specs/{s2.id}/set-current/")
        assert response.status_code == status.HTTP_200_OK
        s1.refresh_from_db()
        s2.refresh_from_db()
        assert s1.is_current is True
        assert s2.is_current is True

    def test_invalid_measurements_rejected(self, fit_client, seed_fit_data):
        response = fit_client.post("/api/v1/merchandising/fit-specs/", {
            "purchase_order": str(seed_fit_data["purchase_order"].id),
            "measurements": ["chest", "52cm"],
        }, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_invalid_fit_stage_rejected(self, fit_client, seed_fit_data):
        response = fit_client.post("/api/v1/merchandising/fit-specs/", {
            "purchase_order": str(seed_fit_data["purchase_order"].id),
            "fit_stage": "bogus",
        }, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_filter_by_fit_stage(self, fit_client, seed_fit_data):
        FitSpec.objects.create(
            tenant=seed_fit_data["tenant"], purchase_order=seed_fit_data["purchase_order"],
            fit_stage="dev", created_by=seed_fit_data["user"],
        )
        FitSpec.objects.create(
            tenant=seed_fit_data["tenant"], purchase_order=seed_fit_data["purchase_order"],
            fit_stage="1st", created_by=seed_fit_data["user"],
        )
        response = fit_client.get("/api/v1/merchandising/fit-specs/?fit_stage=1st")
        assert response.status_code == status.HTTP_200_OK
        for r in response.data["results"]:
            assert r["fit_stage"] == "1st"

    def test_filter_by_purchase_order(self, fit_client, seed_fit_data):
        FitSpec.objects.create(
            tenant=seed_fit_data["tenant"], purchase_order=seed_fit_data["purchase_order"],
            fit_stage="dev", created_by=seed_fit_data["user"],
        )
        FitSpec.objects.create(
            tenant=seed_fit_data["tenant"], purchase_order=seed_fit_data["purchase_order2"],
            fit_stage="dev", created_by=seed_fit_data["user"],
        )
        response = fit_client.get(
            f"/api/v1/merchandising/fit-specs/?purchase_order={seed_fit_data['purchase_order'].id}"
        )
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["po_number"] == "PO-FIT"

    def test_update_notes(self, fit_client, seed_fit_data):
        spec = FitSpec.objects.create(
            tenant=seed_fit_data["tenant"], purchase_order=seed_fit_data["purchase_order"],
            fit_stage="dev", created_by=seed_fit_data["user"],
        )
        response = fit_client.patch(f"/api/v1/merchandising/fit-specs/{spec.id}/", {
            "notes": "Approved by buyer",
        }, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["notes"] == "Approved by buyer"

    def test_auth_required(self, db, seed_fit_data):
        client = APIClient()
        response = client.get("/api/v1/merchandising/fit-specs/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
