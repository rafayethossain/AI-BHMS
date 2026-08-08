"""
Tests for RQ-007: Sales Confirmation (48-hour dispute window) — formerly GC-025.
"""
from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.commercial.models import SalesConfirmation
from apps.merchandising.models import PurchaseOrder
from apps.setup.models import Buyer, Country, Currency, Factory
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def sc_tenant(db):
    return Tenant.objects.create(
        name="Sales Conf Test Co", slug="sc-test",
        schema_name="tenant_sc", status="active",
    )


@pytest.fixture
def sc_role(db, sc_tenant):
    role = Role.objects.create(tenant=sc_tenant, name="SCAdmin", is_system=True)
    for mod in ["commercial", "merchandising", "setup"]:
        for act in ["view", "create", "edit", "delete"]:
            perm, _ = Permission.objects.get_or_create(
                module=mod, action=act,
                defaults={"description": f"{mod}:{act}"}
            )
            RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def sc_user(db, sc_tenant, sc_role):
    user = User.objects.create_user(
        username="scuser", email="sc@test.com",
        password="testpass123!@#", tenant=sc_tenant, status="active",
    )
    UserRole.objects.create(user=user, role=sc_role)
    return user


@pytest.fixture
def sc_client(api_client, sc_user):
    api_client.force_authenticate(user=sc_user)
    return api_client


@pytest.fixture
def sc_data(sc_tenant):
    currency = Currency.objects.create(tenant=sc_tenant, code="USD", name="US Dollar", symbol="$")
    country = Country.objects.create(tenant=sc_tenant, code="BGD", name="Bangladesh")
    buyer = Buyer.objects.create(tenant=sc_tenant, code="HM", name="H&M", country=country, currency=currency)
    factory = Factory.objects.create(tenant=sc_tenant, code="F-001", name="Apex Knitwears")
    po = PurchaseOrder.objects.create(
        tenant=sc_tenant, po_number="PO-SC-001", buyer=buyer,
        factory=factory, po_date="2026-01-15", delivery_date="2026-06-01",
        quantity=1000, unit_price=10, total_value=10000, currency=currency,
    )
    return {"currency": currency, "country": country, "buyer": buyer, "factory": factory, "po": po}


def _make_confirmation(sc_tenant, po, buyer, **kwargs):
    defaults = {"purchase_order": po, "buyer": buyer}
    defaults.update(kwargs)
    return SalesConfirmation.objects.create(tenant=sc_tenant, **defaults)


# ==================== Model Tests ====================

@pytest.mark.django_db
class TestSalesConfirmationModel:
    def test_create_confirmation(self, sc_tenant, sc_data):
        sc = _make_confirmation(sc_tenant, sc_data["po"], sc_data["buyer"], confirmation_number="SCF-001")
        assert sc.confirmation_number == "SCF-001"
        assert sc.status == "draft"
        assert sc.auto_accepted is False
        assert sc.sent_at is None

    def test_unique_number_per_tenant(self, sc_tenant, sc_data):
        _make_confirmation(sc_tenant, sc_data["po"], sc_data["buyer"], confirmation_number="SCF-001")
        with pytest.raises(Exception):
            _make_confirmation(sc_tenant, sc_data["po"], sc_data["buyer"], confirmation_number="SCF-001")

    def test_send_sets_sent_at(self, sc_tenant, sc_data):
        sc = _make_confirmation(sc_tenant, sc_data["po"], sc_data["buyer"], confirmation_number="SCF-002")
        sc.send()
        sc.refresh_from_db()
        assert sc.status == "sent"
        assert sc.sent_at is not None

    def test_window_elapsed_false_within_48h(self, sc_tenant, sc_data):
        sc = _make_confirmation(
            sc_tenant, sc_data["po"], sc_data["buyer"], confirmation_number="SCF-003",
            status="sent", sent_at=timezone.now() - timedelta(hours=10),
        )
        assert sc.window_elapsed() is False

    def test_window_elapsed_true_after_48h(self, sc_tenant, sc_data):
        sc = _make_confirmation(
            sc_tenant, sc_data["po"], sc_data["buyer"], confirmation_number="SCF-004",
            status="sent", sent_at=timezone.now() - timedelta(hours=49),
        )
        assert sc.window_elapsed() is True

    def test_window_elapsed_exactly_48h(self, sc_tenant, sc_data):
        sc = _make_confirmation(
            sc_tenant, sc_data["po"], sc_data["buyer"], confirmation_number="SCF-005",
            status="sent", sent_at=timezone.now() - timedelta(hours=48),
        )
        assert sc.window_elapsed() is True

    def test_window_elapsed_false_when_not_sent(self, sc_tenant, sc_data):
        sc = _make_confirmation(
            sc_tenant, sc_data["po"], sc_data["buyer"], confirmation_number="SCF-006",
            status="draft", sent_at=timezone.now() - timedelta(hours=200),
        )
        assert sc.window_elapsed() is False

    def test_auto_accept_overdue(self, sc_tenant, sc_data):
        overdue = _make_confirmation(
            sc_tenant, sc_data["po"], sc_data["buyer"], confirmation_number="SCF-007",
            status="sent", sent_at=timezone.now() - timedelta(hours=72),
        )
        in_window = _make_confirmation(
            sc_tenant, sc_data["po"], sc_data["buyer"], confirmation_number="SCF-008",
            status="sent", sent_at=timezone.now() - timedelta(hours=5),
        )
        draft = _make_confirmation(
            sc_tenant, sc_data["po"], sc_data["buyer"], confirmation_number="SCF-009",
            status="draft",
        )
        disputed = _make_confirmation(
            sc_tenant, sc_data["po"], sc_data["buyer"], confirmation_number="SCF-010",
            status="disputed", sent_at=timezone.now() - timedelta(hours=100),
            dispute_reason="Qty mismatch",
        )
        accepted = _make_confirmation(
            sc_tenant, sc_data["po"], sc_data["buyer"], confirmation_number="SCF-011",
            status="accepted", sent_at=timezone.now() - timedelta(hours=100),
        )

        count = SalesConfirmation.auto_accept_overdue()
        assert count == 1

        overdue.refresh_from_db()
        assert overdue.status == "accepted"
        assert overdue.auto_accepted is True
        assert overdue.accepted_at is not None

        in_window.refresh_from_db()
        assert in_window.status == "sent"
        draft.refresh_from_db()
        assert draft.status == "draft"
        disputed.refresh_from_db()
        assert disputed.status == "disputed"
        accepted.refresh_from_db()
        assert accepted.status == "accepted"
        assert accepted.auto_accepted is False

    def test_auto_accept_overdue_idempotent(self, sc_tenant, sc_data):
        _make_confirmation(
            sc_tenant, sc_data["po"], sc_data["buyer"], confirmation_number="SCF-012",
            status="sent", sent_at=timezone.now() - timedelta(hours=60),
        )
        assert SalesConfirmation.auto_accept_overdue() == 1
        assert SalesConfirmation.auto_accept_overdue() == 0

    def test_str(self, sc_tenant, sc_data):
        sc = _make_confirmation(sc_tenant, sc_data["po"], sc_data["buyer"], confirmation_number="SCF-013")
        assert "SCF-013" in str(sc)


# ==================== API Tests ====================

@pytest.mark.django_db
class TestSalesConfirmationAPI:
    def test_list_requires_auth(self, api_client):
        response = api_client.get("/api/v1/commercial/sales-confirmations/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_forbidden_without_permission(self, api_client, sc_tenant):
        user = User.objects.create_user(
            username="noperm", email="noperm@test.com",
            password="testpass123!@#", tenant=sc_tenant, status="active",
        )
        api_client.force_authenticate(user=user)
        response = api_client.get("/api/v1/commercial/sales-confirmations/")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_list_confirmations(self, sc_client, sc_data):
        _make_confirmation(sc_data["po"].tenant, sc_data["po"], sc_data["buyer"], confirmation_number="SCF-100")
        response = sc_client.get("/api/v1/commercial/sales-confirmations/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] >= 1

    def test_create_confirmation(self, sc_client, sc_data):
        response = sc_client.post("/api/v1/commercial/sales-confirmations/", {
            "purchase_order": str(sc_data["po"].id),
            "buyer": str(sc_data["buyer"].id),
        })
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["confirmation_number"].startswith("SCF-")
        assert response.data["status"] == "draft"

    def test_retrieve_confirmation(self, sc_client, sc_data):
        sc = _make_confirmation(sc_data["po"].tenant, sc_data["po"], sc_data["buyer"], confirmation_number="SCF-101")
        response = sc_client.get(f"/api/v1/commercial/sales-confirmations/{sc.id}/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["confirmation_number"] == "SCF-101"
        assert response.data["po_number"] == "PO-SC-001"
        assert response.data["buyer_name"] == "H&M"

    def test_update_confirmation(self, sc_client, sc_data):
        sc = _make_confirmation(sc_data["po"].tenant, sc_data["po"], sc_data["buyer"], confirmation_number="SCF-102")
        response = sc_client.patch(f"/api/v1/commercial/sales-confirmations/{sc.id}/", {
            "remarks": "Updated remarks",
        })
        assert response.status_code == status.HTTP_200_OK
        assert response.data["remarks"] == "Updated remarks"

    def test_delete_confirmation(self, sc_client, sc_data):
        sc = _make_confirmation(sc_data["po"].tenant, sc_data["po"], sc_data["buyer"], confirmation_number="SCF-103")
        response = sc_client.delete(f"/api/v1/commercial/sales-confirmations/{sc.id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_filter_by_status(self, sc_client, sc_data):
        _make_confirmation(sc_data["po"].tenant, sc_data["po"], sc_data["buyer"], confirmation_number="SCF-104", status="accepted")
        response = sc_client.get("/api/v1/commercial/sales-confirmations/?status=accepted")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] >= 1


@pytest.mark.django_db
class TestSalesConfirmationActions:
    def test_send_action(self, sc_client, sc_data):
        sc = _make_confirmation(sc_data["po"].tenant, sc_data["po"], sc_data["buyer"], confirmation_number="SCF-200")
        response = sc_client.post(f"/api/v1/commercial/sales-confirmations/{sc.id}/send/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "sent"
        assert response.data["sent_at"] is not None

    def test_send_twice_fails(self, sc_client, sc_data):
        sc = _make_confirmation(
            sc_data["po"].tenant, sc_data["po"], sc_data["buyer"],
            confirmation_number="SCF-201", status="sent",
            sent_at=timezone.now() - timedelta(hours=1),
        )
        response = sc_client.post(f"/api/v1/commercial/sales-confirmations/{sc.id}/send/")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_dispute_action(self, sc_client, sc_data):
        sc = _make_confirmation(
            sc_data["po"].tenant, sc_data["po"], sc_data["buyer"],
            confirmation_number="SCF-202", status="sent",
            sent_at=timezone.now() - timedelta(hours=1),
        )
        response = sc_client.post(f"/api/v1/commercial/sales-confirmations/{sc.id}/dispute/", {
            "dispute_reason": "Quantity mismatch on style",
        })
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "disputed"
        assert response.data["dispute_reason"] == "Quantity mismatch on style"
        assert response.data["disputed_at"] is not None

    def test_dispute_requires_reason(self, sc_client, sc_data):
        sc = _make_confirmation(
            sc_data["po"].tenant, sc_data["po"], sc_data["buyer"],
            confirmation_number="SCF-203", status="sent",
            sent_at=timezone.now() - timedelta(hours=1),
        )
        response = sc_client.post(f"/api/v1/commercial/sales-confirmations/{sc.id}/dispute/")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_dispute_from_draft_fails(self, sc_client, sc_data):
        sc = _make_confirmation(sc_data["po"].tenant, sc_data["po"], sc_data["buyer"], confirmation_number="SCF-204")
        response = sc_client.post(f"/api/v1/commercial/sales-confirmations/{sc.id}/dispute/", {
            "dispute_reason": "Some issue",
        })
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_accept_action(self, sc_client, sc_data):
        sc = _make_confirmation(
            sc_data["po"].tenant, sc_data["po"], sc_data["buyer"],
            confirmation_number="SCF-205", status="sent",
            sent_at=timezone.now() - timedelta(hours=1),
        )
        response = sc_client.post(f"/api/v1/commercial/sales-confirmations/{sc.id}/accept/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "accepted"
        assert response.data["accepted_at"] is not None
        assert response.data["auto_accepted"] is False

    def test_accept_from_draft_fails(self, sc_client, sc_data):
        sc = _make_confirmation(sc_data["po"].tenant, sc_data["po"], sc_data["buyer"], confirmation_number="SCF-206")
        response = sc_client.post(f"/api/v1/commercial/sales-confirmations/{sc.id}/accept/")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_auto_accept_action(self, sc_client, sc_data):
        _make_confirmation(
            sc_data["po"].tenant, sc_data["po"], sc_data["buyer"],
            confirmation_number="SCF-207", status="sent",
            sent_at=timezone.now() - timedelta(hours=60),
        )
        response = sc_client.post("/api/v1/commercial/sales-confirmations/auto_accept/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["auto_accepted"] == 1

    def test_dashboard_endpoint(self, sc_client, sc_data):
        _make_confirmation(sc_data["po"].tenant, sc_data["po"], sc_data["buyer"], confirmation_number="SCF-208")
        _make_confirmation(
            sc_data["po"].tenant, sc_data["po"], sc_data["buyer"],
            confirmation_number="SCF-209", status="sent",
            sent_at=timezone.now() - timedelta(hours=2),
        )
        _make_confirmation(
            sc_data["po"].tenant, sc_data["po"], sc_data["buyer"],
            confirmation_number="SCF-210", status="sent",
            sent_at=timezone.now() - timedelta(hours=100),
        )
        response = sc_client.get("/api/v1/commercial/sales-confirmations/dashboard/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["total"] == 3
        assert response.data["by_status"]["draft"] == 1
        assert response.data["by_status"]["sent"] == 2
        assert response.data["overdue"] == 1

    def test_tenant_isolation(self, sc_client, sc_tenant, sc_data):
        other_tenant = Tenant.objects.create(
            name="Other Co", slug="sc-other", schema_name="tenant_sc_other", status="active",
        )
        other_buyer = Buyer.objects.create(tenant=other_tenant, code="ZR", name="Zara")
        other_factory = Factory.objects.create(tenant=other_tenant, code="F-2", name="Other Factory")
        other_po = PurchaseOrder.objects.create(
            tenant=other_tenant, po_number="PO-OTHER-1", buyer=other_buyer,
            factory=other_factory, po_date="2026-01-01", delivery_date="2026-06-01",
            quantity=10, unit_price=1, total_value=10,
        )
        _make_confirmation(sc_data["po"].tenant, sc_data["po"], sc_data["buyer"], confirmation_number="SCF-300")
        _make_confirmation(other_tenant, other_po, other_buyer, confirmation_number="SCF-301")

        response = sc_client.get("/api/v1/commercial/sales-confirmations/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1


# ==================== Celery Task Tests ====================

@pytest.mark.django_db
class TestSalesConfirmationCeleryTask:
    def test_auto_accept_task_sweeps_overdue(self, sc_tenant, sc_data):
        _make_confirmation(
            sc_tenant, sc_data["po"], sc_data["buyer"], confirmation_number="SCF-400",
            status="sent", sent_at=timezone.now() - timedelta(hours=80),
        )
        _make_confirmation(
            sc_tenant, sc_data["po"], sc_data["buyer"], confirmation_number="SCF-401",
            status="sent", sent_at=timezone.now() - timedelta(hours=2),
        )
        from apps.commercial.tasks import auto_accept_sales_confirmations
        result = auto_accept_sales_confirmations.run()
        assert result == {"auto_accepted": 1}
