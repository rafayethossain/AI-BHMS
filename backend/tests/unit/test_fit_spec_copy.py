"""
Tests for Fit Spec Copying (GC-012).

Covers the copy_fit_spec service and the FitSpecViewSet copy-from-order
action (copy the ticked/current fit spec from a source order to a target).
"""
from datetime import date
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.merchandising.models import (
    FileOpening,
    FitSpec,
    PurchaseOrder,
    Style,
    StyleVersion,
)
from apps.merchandising.services import NoCurrentFitSpecError, copy_fit_spec
from apps.setup.models import Buyer, Country, Currency, Factory
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def fcopy_tenant(db):
    return Tenant.objects.create(
        name="FitCopy Test Co", slug="fitcopy-test",
        schema_name="tenant_fitcopy", status="active"
    )


@pytest.fixture
def fcopy_tenant2(db):
    return Tenant.objects.create(
        name="FitCopy Other Co", slug="fitcopy-other",
        schema_name="tenant_fitcopy_other", status="active"
    )


@pytest.fixture
def fcopy_role(db, fcopy_tenant):
    role = Role.objects.create(tenant=fcopy_tenant, name="FitCopyAdmin", is_system=True)
    for mod in ["setup", "merchandising"]:
        for act in ["view", "create", "edit", "delete"]:
            perm, _ = Permission.objects.get_or_create(
                module=mod, action=act,
                defaults={"description": f"{mod}:{act}"}
            )
            RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def fcopy_user(db, fcopy_tenant, fcopy_role):
    user = User.objects.create_user(
        username="fitcopyuser", email="fitcopy@test.com",
        password="testpass123!@#", tenant=fcopy_tenant, status="active",
    )
    UserRole.objects.create(user=user, role=fcopy_role)
    return user


@pytest.fixture
def fcopy_client(api_client, fcopy_user):
    api_client.force_authenticate(user=fcopy_user)
    return api_client


def _make_po(tenant, user, po_number):
    country = Country.objects.create(tenant=tenant, name=f"C {po_number}", code=f"X{po_number[-2:]}")
    buyer = Buyer.objects.create(tenant=tenant, name="FitCopy Buyer", code=f"B{po_number[-2:]}", country=country)
    factory = Factory.objects.create(tenant=tenant, name=f"F {po_number}", code=f"Y{po_number[-2:]}", country=country)
    currency = Currency.objects.create(tenant=tenant, name="USD", code="USD", symbol="$")
    style = Style.objects.create(
        tenant=tenant, style_number=f"STY-{po_number}", name="FitCopy Style",
        buyer=buyer, created_by=user,
    )
    sv = StyleVersion.objects.create(
        tenant=tenant, style=style, version_number=1, status="active",
        created_by=user,
    )
    fo = FileOpening.objects.create(
        tenant=tenant, file_number=f"FO-{po_number}", style=style, style_version=sv,
        buyer=buyer, factory=factory, file_date=date(2026, 1, 1),
        created_by=user,
    )
    return PurchaseOrder.objects.create(
        tenant=tenant, po_number=po_number, file_opening=fo, buyer=buyer,
        factory=factory, po_date=date(2026, 1, 15), delivery_date=date(2026, 6, 1),
        quantity=1000, unit_price=Decimal("10.00"), total_value=Decimal("10000.00"),
        currency=currency,
    )


@pytest.fixture
def fcopy_data(db, fcopy_tenant, fcopy_user):
    source = _make_po(fcopy_tenant, fcopy_user, "PO-SRC")
    target = _make_po(fcopy_tenant, fcopy_user, "PO-TGT")
    return {"tenant": fcopy_tenant, "user": fcopy_user, "source": source, "target": target}


# ==================== Service Tests ====================

@pytest.mark.django_db
class TestCopyFitSpecService:
    """Test the copy_fit_spec service function."""

    def test_copy_current_spec(self, fcopy_data):
        FitSpec.objects.create(
            tenant=fcopy_data["tenant"], purchase_order=fcopy_data["source"],
            fit_stage="dev", is_current=True,
            measurements={"chest": "52cm", "length": "70cm"},
            images=["https://cdn.example.com/spec.jpg"],
            notes="Approved dev spec", created_by=fcopy_data["user"],
        )
        new_spec = copy_fit_spec(fcopy_data["source"], fcopy_data["target"], fcopy_data["user"])
        assert new_spec.purchase_order == fcopy_data["target"]
        assert new_spec.measurements == {"chest": "52cm", "length": "70cm"}
        assert new_spec.images == ["https://cdn.example.com/spec.jpg"]
        assert new_spec.notes == "Approved dev spec"
        assert new_spec.fit_stage == "dev"
        assert new_spec.version == 1
        assert new_spec.is_current is True

    def test_copy_sets_current_clearing_existing(self, fcopy_data):
        FitSpec.objects.create(
            tenant=fcopy_data["tenant"], purchase_order=fcopy_data["source"],
            fit_stage="dev", is_current=True,
            measurements={"chest": "52cm"}, created_by=fcopy_data["user"],
        )
        old = FitSpec.objects.create(
            tenant=fcopy_data["tenant"], purchase_order=fcopy_data["target"],
            fit_stage="2nd", is_current=True,
            measurements={"chest": "50cm"}, created_by=fcopy_data["user"],
        )
        new_spec = copy_fit_spec(fcopy_data["source"], fcopy_data["target"], fcopy_data["user"])
        old.refresh_from_db()
        assert old.is_current is False
        assert new_spec.is_current is True

    def test_copy_increments_version_when_target_has_specs(self, fcopy_data):
        FitSpec.objects.create(
            tenant=fcopy_data["tenant"], purchase_order=fcopy_data["source"],
            fit_stage="dev", is_current=True, created_by=fcopy_data["user"],
        )
        FitSpec.objects.create(
            tenant=fcopy_data["tenant"], purchase_order=fcopy_data["target"],
            fit_stage="dev", is_current=True, created_by=fcopy_data["user"],
        )
        new_spec = copy_fit_spec(fcopy_data["source"], fcopy_data["target"], fcopy_data["user"])
        assert new_spec.version == 2

    def test_copy_source_no_current_raises(self, fcopy_data):
        FitSpec.objects.create(
            tenant=fcopy_data["tenant"], purchase_order=fcopy_data["source"],
            fit_stage="dev", is_current=False, created_by=fcopy_data["user"],
        )
        with pytest.raises(NoCurrentFitSpecError):
            copy_fit_spec(fcopy_data["source"], fcopy_data["target"], fcopy_data["user"])

    def test_copy_source_no_specs_raises(self, fcopy_data):
        with pytest.raises(NoCurrentFitSpecError):
            copy_fit_spec(fcopy_data["source"], fcopy_data["target"], fcopy_data["user"])

    def test_copy_returns_distinct_instance(self, fcopy_data):
        src_spec = FitSpec.objects.create(
            tenant=fcopy_data["tenant"], purchase_order=fcopy_data["source"],
            fit_stage="3rd", is_current=True,
            measurements={"chest": "51cm"}, created_by=fcopy_data["user"],
        )
        new_spec = copy_fit_spec(fcopy_data["source"], fcopy_data["target"], fcopy_data["user"])
        assert new_spec.id != src_spec.id
        assert FitSpec.objects.filter(
            tenant=fcopy_data["tenant"], purchase_order=fcopy_data["target"]
        ).count() == 1


# ==================== API Tests ====================

@pytest.mark.django_db
class TestCopyFitSpecActionAPI:
    """Test POST /api/v1/merchandising/fit-specs/copy-from-order/."""

    def test_copy_action_returns_new_spec(self, fcopy_client, fcopy_data):
        FitSpec.objects.create(
            tenant=fcopy_data["tenant"], purchase_order=fcopy_data["source"],
            fit_stage="dev", is_current=True,
            measurements={"chest": "52cm"}, notes="Copy me",
            created_by=fcopy_data["user"],
        )
        response = fcopy_client.post("/api/v1/merchandising/fit-specs/copy-from-order/", {
            "source_order": str(fcopy_data["source"].id),
            "target_order": str(fcopy_data["target"].id),
        }, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["po_number"] == "PO-TGT"
        assert response.data["version"] == 1
        assert response.data["is_current"] is True
        assert response.data["measurements"] == {"chest": "52cm"}

    def test_copy_action_clears_previous_current(self, fcopy_client, fcopy_data):
        FitSpec.objects.create(
            tenant=fcopy_data["tenant"], purchase_order=fcopy_data["source"],
            fit_stage="dev", is_current=True, created_by=fcopy_data["user"],
        )
        old = FitSpec.objects.create(
            tenant=fcopy_data["tenant"], purchase_order=fcopy_data["target"],
            fit_stage="1st", is_current=True, created_by=fcopy_data["user"],
        )
        response = fcopy_client.post("/api/v1/merchandising/fit-specs/copy-from-order/", {
            "source_order": str(fcopy_data["source"].id),
            "target_order": str(fcopy_data["target"].id),
        }, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        old.refresh_from_db()
        assert old.is_current is False

    def test_copy_action_source_no_current_400(self, fcopy_client, fcopy_data):
        FitSpec.objects.create(
            tenant=fcopy_data["tenant"], purchase_order=fcopy_data["source"],
            fit_stage="dev", is_current=False, created_by=fcopy_data["user"],
        )
        response = fcopy_client.post("/api/v1/merchandising/fit-specs/copy-from-order/", {
            "source_order": str(fcopy_data["source"].id),
            "target_order": str(fcopy_data["target"].id),
        }, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_copy_action_source_not_found_404(self, fcopy_client, fcopy_data):
        response = fcopy_client.post("/api/v1/merchandising/fit-specs/copy-from-order/", {
            "source_order": "999999",
            "target_order": str(fcopy_data["target"].id),
        }, format="json")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_copy_action_target_not_found_404(self, fcopy_client, fcopy_data):
        response = fcopy_client.post("/api/v1/merchandising/fit-specs/copy-from-order/", {
            "source_order": str(fcopy_data["source"].id),
            "target_order": "999999",
        }, format="json")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_copy_action_cross_tenant_source_404(self, fcopy_client, fcopy_data, fcopy_tenant2, fcopy_user):
        other_source = _make_po(fcopy_tenant2, fcopy_user, "PO-OTH")
        response = fcopy_client.post("/api/v1/merchandising/fit-specs/copy-from-order/", {
            "source_order": str(other_source.id),
            "target_order": str(fcopy_data["target"].id),
        }, format="json")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_copy_action_missing_body_400(self, fcopy_client, fcopy_data):
        response = fcopy_client.post("/api/v1/merchandising/fit-specs/copy-from-order/", {}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_copy_action_auth_required(self, db, fcopy_data):
        client = APIClient()
        response = client.post("/api/v1/merchandising/fit-specs/copy-from-order/", {
            "source_order": str(fcopy_data["source"].id),
            "target_order": str(fcopy_data["target"].id),
        }, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
