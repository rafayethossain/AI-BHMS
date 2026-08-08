"""
Tests for commercial app.
"""
import pytest
from decimal import Decimal
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.tenants.models import Tenant
from apps.users.models import Role, UserRole, Permission, RolePermission
from apps.setup.models import Factory, Currency, Country, Season, Buyer, Brand
from apps.merchandising.models import Style, StyleVersion, FileOpening, PurchaseOrder
from apps.commercial.models import LC, LCAmendment, Bank, ProformaInvoice, SalesContract

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def comm_tenant(db):
    return Tenant.objects.create(
        name="Commercial Test Co", slug="comm-test",
        schema_name="tenant_comm", status="active"
    )


@pytest.fixture
def comm_role(db, comm_tenant):
    role = Role.objects.create(tenant=comm_tenant, name="CommAdmin", is_system=True)
    for mod in ["commercial", "merchandising", "setup"]:
        for act in ["view", "create", "edit", "delete"]:
            perm, _ = Permission.objects.get_or_create(
                module=mod, action=act,
                defaults={"description": f"{mod}:{act}"}
            )
            RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def comm_user(db, comm_tenant, comm_role):
    user = User.objects.create_user(
        username="commuser", email="comm@test.com",
        password="testpass123!@#", tenant=comm_tenant, status="active"
    )
    UserRole.objects.create(user=user, role=comm_role)
    return user


@pytest.fixture
def comm_client(api_client, comm_user):
    api_client.force_authenticate(user=comm_user)
    return api_client


@pytest.fixture
def seed_data(comm_tenant):
    currency = Currency.objects.create(tenant=comm_tenant, code="USD", name="US Dollar", symbol="$")
    country = Country.objects.create(tenant=comm_tenant, code="BGD", name="Bangladesh")
    season = Season.objects.create(tenant=comm_tenant, code="SS26", name="SS 2026")
    buyer = Buyer.objects.create(tenant=comm_tenant, code="HM", name="H&M", country=country, currency=currency)
    brand = Brand.objects.create(tenant=comm_tenant, buyer=buyer, code="HM-BM", name="Basics")
    factory = Factory.objects.create(tenant=comm_tenant, code="F-001", name="Apex Knitwears")
    bank = Bank.objects.create(tenant=comm_tenant, code="BK-001", name="Standard Chartered")
    style = Style.objects.create(tenant=comm_tenant, style_number="STY-001", name="Test Style", buyer=buyer)
    sv = StyleVersion.objects.create(tenant=comm_tenant, style=style, version_number=1, status="active")
    fo = FileOpening.objects.create(
        tenant=comm_tenant, file_number="FO-001", style=style, style_version=sv,
        buyer=buyer, factory=factory, file_date="2026-01-01"
    )
    po = PurchaseOrder.objects.create(
        tenant=comm_tenant, po_number="PO-001", file_opening=fo, buyer=buyer,
        factory=factory, po_date="2026-01-15", delivery_date="2026-06-01",
        quantity=1000, unit_price=Decimal("10.00"), total_value=Decimal("10000.00"),
        currency=currency,
    )
    return {
        "currency": currency, "country": country, "season": season,
        "buyer": buyer, "brand": brand, "factory": factory,
        "bank": bank, "style": style, "sv": sv, "fo": fo, "po": po,
    }


# ==================== Bank Model Tests ====================

@pytest.mark.django_db
class TestBankModel:
    def test_create_bank(self, comm_tenant):
        bank = Bank.objects.create(
            tenant=comm_tenant, code="BK-001", name="Standard Chartered",
            swift_code="SCBLUS33", contact_person="John",
        )
        assert bank.code == "BK-001"
        assert bank.swift_code == "SCBLUS33"
        assert bank.status == "active"

    def test_bank_str(self, comm_tenant):
        bank = Bank.objects.create(
            tenant=comm_tenant, code="BK-001", name="Standard Chartered",
        )
        assert "BK-001" in str(bank)
        assert "Standard Chartered" in str(bank)

    def test_bank_unique_code(self, comm_tenant):
        Bank.objects.create(tenant=comm_tenant, code="BK-001", name="SCB")
        with pytest.raises(Exception):
            Bank.objects.create(tenant=comm_tenant, code="BK-001", name="Duplicate")


# ==================== Bank API Tests ====================

@pytest.mark.django_db
class TestBankAPI:
    def test_list_banks(self, comm_client, seed_data):
        response = comm_client.get("/api/v1/commercial/banks/")
        assert response.status_code == status.HTTP_200_OK

    def test_create_bank(self, comm_client):
        response = comm_client.post("/api/v1/commercial/banks/", {
            "code": "BK-NEW", "name": "New Bank",
            "swift_code": "NEWRUS33",
        })
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["code"] == "BK-NEW"

    def test_retrieve_bank(self, comm_client, seed_data):
        bank = seed_data["bank"]
        response = comm_client.get(f"/api/v1/commercial/banks/{bank.id}/")
        assert response.status_code == status.HTTP_200_OK

    def test_update_bank(self, comm_client, seed_data):
        bank = seed_data["bank"]
        response = comm_client.patch(f"/api/v1/commercial/banks/{bank.id}/", {
            "name": "SCB Updated",
        })
        assert response.status_code == status.HTTP_200_OK

    def test_delete_bank(self, comm_client, seed_data):
        bank = Bank.objects.create(
            tenant=seed_data["po"].tenant, code="BK-DEL", name="To Delete",
        )
        response = comm_client.delete(f"/api/v1/commercial/banks/{bank.id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT


# ==================== LC Model Tests ====================

@pytest.mark.django_db
class TestLCModel:
    def test_create_lc(self, comm_tenant, seed_data):
        lc = LC.objects.create(
            tenant=comm_tenant, lc_number="LC-001", lc_type="master",
            buyer=seed_data["po"].buyer, purchase_order=seed_data["po"],
            bank=seed_data["bank"], amount=Decimal("50000.00"),
            currency=seed_data["currency"], expiry_date="2026-12-31",
            status="draft",
        )
        assert lc.lc_number == "LC-001"
        assert lc.amount == Decimal("50000.00")
        assert lc.status == "draft"

    def test_lc_str(self, comm_tenant, seed_data):
        lc = LC.objects.create(
            tenant=comm_tenant, lc_number="LC-001", lc_type="master",
            buyer=seed_data["po"].buyer, amount=Decimal("50000.00"),
            expiry_date="2026-12-31",
        )
        assert "LC-001" in str(lc)
        assert "H&M" in str(lc)

    def test_lc_unique_number(self, comm_tenant, seed_data):
        LC.objects.create(
            tenant=comm_tenant, lc_number="LC-001", lc_type="master",
            buyer=seed_data["po"].buyer, amount=Decimal("50000.00"),
            expiry_date="2026-12-31",
        )
        with pytest.raises(Exception):
            LC.objects.create(
                tenant=comm_tenant, lc_number="LC-001", lc_type="master",
                buyer=seed_data["po"].buyer, amount=Decimal("50000.00"),
                expiry_date="2026-12-31",
            )

    def test_lc_default_status(self, comm_tenant, seed_data):
        lc = LC.objects.create(
            tenant=comm_tenant, lc_number="LC-002", lc_type="b2b",
            buyer=seed_data["po"].buyer, amount=Decimal("25000.00"),
            expiry_date="2026-12-31",
        )
        assert lc.status == "draft"

    def test_lc_ordering(self, comm_tenant, seed_data):
        lc1 = LC.objects.create(
            tenant=comm_tenant, lc_number="LC-001", lc_type="master",
            buyer=seed_data["po"].buyer, amount=Decimal("50000.00"),
            expiry_date="2026-12-31",
        )
        lc2 = LC.objects.create(
            tenant=comm_tenant, lc_number="LC-002", lc_type="master",
            buyer=seed_data["po"].buyer, amount=Decimal("50000.00"),
            expiry_date="2026-12-31",
        )
        lcs = list(LC.objects.filter(tenant=comm_tenant))
        assert lcs[0].id == lc2.id
        assert lcs[1].id == lc1.id


# ==================== LC API Tests ====================

@pytest.mark.django_db
class TestLCAPI:
    def test_list_lcs(self, comm_client, seed_data):
        LC.objects.create(
            tenant=seed_data["po"].tenant, lc_number="LC-001",
            lc_type="master", buyer=seed_data["po"].buyer,
            amount=Decimal("50000.00"), expiry_date="2026-12-31",
        )
        response = comm_client.get("/api/v1/commercial/lcs/")
        assert response.status_code == status.HTTP_200_OK

    def test_create_lc(self, comm_client, seed_data):
        response = comm_client.post("/api/v1/commercial/lcs/", {
            "lc_number": "LC-NEW", "lc_type": "master",
            "buyer": str(seed_data["po"].buyer.id),
            "amount": "50000.00",
            "expiry_date": "2026-12-31",
        })
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["lc_number"] == "LC-NEW"

    def test_retrieve_lc(self, comm_client, seed_data):
        lc = LC.objects.create(
            tenant=seed_data["po"].tenant, lc_number="LC-001",
            lc_type="master", buyer=seed_data["po"].buyer,
            amount=Decimal("50000.00"), expiry_date="2026-12-31",
        )
        response = comm_client.get(f"/api/v1/commercial/lcs/{lc.id}/")
        assert response.status_code == status.HTTP_200_OK

    def test_update_lc(self, comm_client, seed_data):
        lc = LC.objects.create(
            tenant=seed_data["po"].tenant, lc_number="LC-001",
            lc_type="master", buyer=seed_data["po"].buyer,
            amount=Decimal("50000.00"), expiry_date="2026-12-31",
        )
        response = comm_client.patch(f"/api/v1/commercial/lcs/{lc.id}/", {
            "amount": "75000.00",
        })
        assert response.status_code == status.HTTP_200_OK

    def test_delete_lc(self, comm_client, seed_data):
        lc = LC.objects.create(
            tenant=seed_data["po"].tenant, lc_number="LC-001",
            lc_type="master", buyer=seed_data["po"].buyer,
            amount=Decimal("50000.00"), expiry_date="2026-12-31",
        )
        response = comm_client.delete(f"/api/v1/commercial/lcs/{lc.id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_filter_lcs_by_type(self, comm_client, seed_data):
        LC.objects.create(
            tenant=seed_data["po"].tenant, lc_number="LC-001",
            lc_type="master", buyer=seed_data["po"].buyer,
            amount=Decimal("50000.00"), expiry_date="2026-12-31",
        )
        LC.objects.create(
            tenant=seed_data["po"].tenant, lc_number="LC-002",
            lc_type="b2b", buyer=seed_data["po"].buyer,
            amount=Decimal("25000.00"), expiry_date="2026-12-31",
        )
        response = comm_client.get("/api/v1/commercial/lcs/?lc_type=master")
        assert response.status_code == status.HTTP_200_OK

    def test_filter_lcs_by_status(self, comm_client, seed_data):
        LC.objects.create(
            tenant=seed_data["po"].tenant, lc_number="LC-001",
            lc_type="master", buyer=seed_data["po"].buyer,
            amount=Decimal("50000.00"), expiry_date="2026-12-31", status="draft",
        )
        LC.objects.create(
            tenant=seed_data["po"].tenant, lc_number="LC-002",
            lc_type="master", buyer=seed_data["po"].buyer,
            amount=Decimal("50000.00"), expiry_date="2026-12-31", status="accepted",
        )
        response = comm_client.get("/api/v1/commercial/lcs/?status=accepted")
        assert response.status_code == status.HTTP_200_OK


# ==================== LC Action Tests ====================

@pytest.mark.django_db
class TestLCActions:
    def test_approve_draft_lc(self, comm_client, seed_data):
        lc = LC.objects.create(
            tenant=seed_data["po"].tenant, lc_number="LC-ACT-001",
            lc_type="master", buyer=seed_data["po"].buyer,
            amount=Decimal("50000.00"), expiry_date="2026-12-31",
        )
        resp = comm_client.post(f"/api/v1/commercial/lcs/{lc.id}/approve/")
        assert resp.status_code == 200
        assert resp.data["status"] == "received"

    def test_approve_sent_to_bank_lc(self, comm_client, seed_data):
        lc = LC.objects.create(
            tenant=seed_data["po"].tenant, lc_number="LC-ACT-002",
            lc_type="master", buyer=seed_data["po"].buyer,
            amount=Decimal("50000.00"), expiry_date="2026-12-31",
            status="sent_to_bank",
        )
        resp = comm_client.post(f"/api/v1/commercial/lcs/{lc.id}/approve/")
        assert resp.status_code == 200
        assert resp.data["status"] == "received"

    def test_approve_wrong_status(self, comm_client, seed_data):
        lc = LC.objects.create(
            tenant=seed_data["po"].tenant, lc_number="LC-ACT-003",
            lc_type="master", buyer=seed_data["po"].buyer,
            amount=Decimal("50000.00"), expiry_date="2026-12-31",
            status="accepted",
        )
        resp = comm_client.post(f"/api/v1/commercial/lcs/{lc.id}/approve/")
        assert resp.status_code == 400

    def test_accept_lc(self, comm_client, seed_data):
        lc = LC.objects.create(
            tenant=seed_data["po"].tenant, lc_number="LC-ACT-004",
            lc_type="master", buyer=seed_data["po"].buyer,
            amount=Decimal("50000.00"), expiry_date="2026-12-31",
            status="received",
        )
        resp = comm_client.post(f"/api/v1/commercial/lcs/{lc.id}/accept/")
        assert resp.status_code == 200
        assert resp.data["status"] == "accepted"

    def test_accept_wrong_status(self, comm_client, seed_data):
        lc = LC.objects.create(
            tenant=seed_data["po"].tenant, lc_number="LC-ACT-005",
            lc_type="master", buyer=seed_data["po"].buyer,
            amount=Decimal("50000.00"), expiry_date="2026-12-31",
            status="draft",
        )
        resp = comm_client.post(f"/api/v1/commercial/lcs/{lc.id}/accept/")
        assert resp.status_code == 400

    def test_cancel_draft_lc(self, comm_client, seed_data):
        lc = LC.objects.create(
            tenant=seed_data["po"].tenant, lc_number="LC-ACT-006",
            lc_type="master", buyer=seed_data["po"].buyer,
            amount=Decimal("50000.00"), expiry_date="2026-12-31",
        )
        resp = comm_client.post(f"/api/v1/commercial/lcs/{lc.id}/cancel/")
        assert resp.status_code == 200
        assert resp.data["status"] == "cancelled"

    def test_cancel_accepted_lc(self, comm_client, seed_data):
        lc = LC.objects.create(
            tenant=seed_data["po"].tenant, lc_number="LC-ACT-007",
            lc_type="master", buyer=seed_data["po"].buyer,
            amount=Decimal("50000.00"), expiry_date="2026-12-31",
            status="accepted",
        )
        resp = comm_client.post(f"/api/v1/commercial/lcs/{lc.id}/cancel/")
        assert resp.status_code == 200
        assert resp.data["status"] == "cancelled"

    def test_cancel_utilized_lc_fails(self, comm_client, seed_data):
        lc = LC.objects.create(
            tenant=seed_data["po"].tenant, lc_number="LC-ACT-008",
            lc_type="master", buyer=seed_data["po"].buyer,
            amount=Decimal("50000.00"), expiry_date="2026-12-31",
            status="utilized",
        )
        resp = comm_client.post(f"/api/v1/commercial/lcs/{lc.id}/cancel/")
        assert resp.status_code == 400

    def test_cancel_cancelled_lc_fails(self, comm_client, seed_data):
        lc = LC.objects.create(
            tenant=seed_data["po"].tenant, lc_number="LC-ACT-009",
            lc_type="master", buyer=seed_data["po"].buyer,
            amount=Decimal("50000.00"), expiry_date="2026-12-31",
            status="cancelled",
        )
        resp = comm_client.post(f"/api/v1/commercial/lcs/{lc.id}/cancel/")
        assert resp.status_code == 400

    def test_utilization_endpoint(self, comm_client, seed_data):
        lc = LC.objects.create(
            tenant=seed_data["po"].tenant, lc_number="LC-ACT-010",
            lc_type="master", buyer=seed_data["po"].buyer,
            amount=Decimal("50000.00"), expiry_date="2026-12-31",
            status="accepted", utilized_amount=Decimal("10000.00"),
        )
        resp = comm_client.get(f"/api/v1/commercial/lcs/{lc.id}/utilization/")
        assert resp.status_code == 200
        assert Decimal(resp.data["balance_amount"]) == Decimal("40000.00")
        assert resp.data["utilization_percent"] == 20.0

    def test_full_lc_lifecycle(self, comm_client, seed_data):
        lc = LC.objects.create(
            tenant=seed_data["po"].tenant, lc_number="LC-LIFE-001",
            lc_type="master", buyer=seed_data["po"].buyer,
            amount=Decimal("50000.00"), expiry_date="2026-12-31",
        )
        resp = comm_client.post(f"/api/v1/commercial/lcs/{lc.id}/approve/")
        assert resp.data["status"] == "received"
        resp = comm_client.post(f"/api/v1/commercial/lcs/{lc.id}/accept/")
        assert resp.data["status"] == "accepted"

    def test_export_lc_csv(self, comm_client, seed_data):
        lc = LC.objects.create(
            tenant=seed_data["po"].tenant, lc_number="LC-EXP-001",
            lc_type="master", buyer=seed_data["po"].buyer,
            bank=seed_data["bank"], amount=Decimal("50000.00"),
            expiry_date="2026-12-31",
        )
        resp = comm_client.get(f"/api/v1/commercial/lcs/{lc.id}/export/")
        assert resp.status_code == 200
        assert resp["Content-Type"] == "text/csv"
        assert "LC-EXP-001" in resp.content.decode()

    def test_dashboard_endpoint(self, comm_client, seed_data):
        LC.objects.create(
            tenant=seed_data["po"].tenant, lc_number="LC-DSH-001",
            lc_type="master", buyer=seed_data["po"].buyer,
            amount=Decimal("50000.00"), expiry_date="2027-12-31",
        )
        resp = comm_client.get("/api/v1/commercial/lcs/dashboard/")
        assert resp.status_code == 200
        assert resp.data["total_lcs"] >= 1


# ==================== LCAmendment Tests ====================

@pytest.mark.django_db
class TestLCAmendmentModel:
    def test_create_amendment(self, comm_tenant, seed_data):
        lc = LC.objects.create(
            tenant=comm_tenant, lc_number="LC-001", lc_type="master",
            buyer=seed_data["po"].buyer, amount=Decimal("50000.00"),
            expiry_date="2026-12-31",
        )
        amend = LCAmendment.objects.create(
            tenant=comm_tenant, lc=lc, amendment_number=1,
            amount_change=Decimal("10000.00"),
            reason="Quantity increase",
        )
        assert amend.amendment_number == 1
        assert amend.amount_change == Decimal("10000.00")
        assert amend.status == "pending"

    def test_amendment_str(self, comm_tenant, seed_data):
        lc = LC.objects.create(
            tenant=comm_tenant, lc_number="LC-001", lc_type="master",
            buyer=seed_data["po"].buyer, amount=Decimal("50000.00"),
            expiry_date="2026-12-31",
        )
        amend = LCAmendment.objects.create(
            tenant=comm_tenant, lc=lc, amendment_number=1,
            reason="Test amendment",
        )
        assert "LC-001" in str(amend)
        assert "1" in str(amend)


@pytest.mark.django_db
class TestLCAmendmentAPI:
    def test_list_amendments(self, comm_client, seed_data):
        lc = LC.objects.create(
            tenant=seed_data["po"].tenant, lc_number="LC-001",
            lc_type="master", buyer=seed_data["po"].buyer,
            amount=Decimal("50000.00"), expiry_date="2026-12-31",
        )
        LCAmendment.objects.create(
            tenant=seed_data["po"].tenant, lc=lc,
            amendment_number=1, reason="Test",
        )
        response = comm_client.get("/api/v1/commercial/lc-amendments/")
        assert response.status_code == status.HTTP_200_OK

    def test_create_amendment(self, comm_client, seed_data):
        lc = LC.objects.create(
            tenant=seed_data["po"].tenant, lc_number="LC-001",
            lc_type="master", buyer=seed_data["po"].buyer,
            amount=Decimal("50000.00"), expiry_date="2026-12-31",
        )
        response = comm_client.post("/api/v1/commercial/lc-amendments/", {
            "lc": str(lc.id),
            "amendment_number": 1,
            "amount_change": "10000.00",
            "reason": "Quantity increase",
        })
        assert response.status_code == status.HTTP_201_CREATED

    def test_retrieve_amendment(self, comm_client, seed_data):
        lc = LC.objects.create(
            tenant=seed_data["po"].tenant, lc_number="LC-001",
            lc_type="master", buyer=seed_data["po"].buyer,
            amount=Decimal("50000.00"), expiry_date="2026-12-31",
        )
        amend = LCAmendment.objects.create(
            tenant=seed_data["po"].tenant, lc=lc,
            amendment_number=1, reason="Test",
        )
        response = comm_client.get(f"/api/v1/commercial/lc-amendments/{amend.id}/")
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestLCAmendmentActions:
    def test_approve_amendment(self, comm_client, seed_data):
        lc = LC.objects.create(
            tenant=seed_data["po"].tenant, lc_number="LC-AMD-001",
            lc_type="master", buyer=seed_data["po"].buyer,
            amount=Decimal("50000.00"), expiry_date="2026-12-31",
        )
        amend = LCAmendment.objects.create(
            tenant=seed_data["po"].tenant, lc=lc,
            amendment_number=1, amount_change=Decimal("60000.00"),
            reason="Increase amount",
        )
        resp = comm_client.post(f"/api/v1/commercial/lc-amendments/{amend.id}/approve/")
        assert resp.status_code == 200
        assert resp.data["status"] == "approved"

        lc.refresh_from_db()
        assert lc.amount == Decimal("60000.00")
        assert lc.status == "amended"

    def test_reject_amendment(self, comm_client, seed_data):
        lc = LC.objects.create(
            tenant=seed_data["po"].tenant, lc_number="LC-AMD-002",
            lc_type="master", buyer=seed_data["po"].buyer,
            amount=Decimal("50000.00"), expiry_date="2026-12-31",
        )
        amend = LCAmendment.objects.create(
            tenant=seed_data["po"].tenant, lc=lc,
            amendment_number=1, reason="Test reject",
        )
        resp = comm_client.post(f"/api/v1/commercial/lc-amendments/{amend.id}/reject/")
        assert resp.status_code == 200
        assert resp.data["status"] == "rejected"

    def test_amend_expiry_date(self, comm_client, seed_data):
        lc = LC.objects.create(
            tenant=seed_data["po"].tenant, lc_number="LC-AMD-003",
            lc_type="master", buyer=seed_data["po"].buyer,
            amount=Decimal("50000.00"), expiry_date="2026-12-31",
        )
        new_date = "2027-03-31"
        amend = LCAmendment.objects.create(
            tenant=seed_data["po"].tenant, lc=lc,
            amendment_number=1, expiry_date_change=new_date,
            reason="Extend expiry",
        )
        resp = comm_client.post(f"/api/v1/commercial/lc-amendments/{amend.id}/approve/")
        assert resp.status_code == 200

        lc.refresh_from_db()
        assert str(lc.expiry_date) == new_date
        assert lc.status == "amended"

    def test_approve_processed_amendment_fails(self, comm_client, seed_data):
        lc = LC.objects.create(
            tenant=seed_data["po"].tenant, lc_number="LC-AMD-004",
            lc_type="master", buyer=seed_data["po"].buyer,
            amount=Decimal("50000.00"), expiry_date="2026-12-31",
        )
        amend = LCAmendment.objects.create(
            tenant=seed_data["po"].tenant, lc=lc,
            amendment_number=1, reason="Already done",
            status="approved",
        )
        resp = comm_client.post(f"/api/v1/commercial/lc-amendments/{amend.id}/approve/")
        assert resp.status_code == 400

    def test_reject_processed_amendment_fails(self, comm_client, seed_data):
        lc = LC.objects.create(
            tenant=seed_data["po"].tenant, lc_number="LC-AMD-005",
            lc_type="master", buyer=seed_data["po"].buyer,
            amount=Decimal("50000.00"), expiry_date="2026-12-31",
        )
        amend = LCAmendment.objects.create(
            tenant=seed_data["po"].tenant, lc=lc,
            amendment_number=1, reason="Already done",
            status="rejected",
        )
        resp = comm_client.post(f"/api/v1/commercial/lc-amendments/{amend.id}/reject/")
        assert resp.status_code == 400


# ==================== ProformaInvoice Model Tests ====================

@pytest.mark.django_db
class TestProformaInvoiceModel:
    def test_create_proforma_invoice(self, comm_tenant, seed_data):
        pi = ProformaInvoice.objects.create(
            tenant=comm_tenant, pi_number="PI-001",
            purchase_order=seed_data["po"],
            buyer=seed_data["buyer"],
            amount=Decimal("10000.00"),
        )
        assert pi.pi_number == "PI-001"
        assert pi.amount == Decimal("10000.00")
        assert pi.status == "draft"

    def test_pi_str(self, comm_tenant, seed_data):
        pi = ProformaInvoice.objects.create(
            tenant=comm_tenant, pi_number="PI-001",
            purchase_order=seed_data["po"],
            buyer=seed_data["buyer"],
            amount=Decimal("5000.00"),
        )
        assert "PI-001" in str(pi)

    def test_pi_status_transitions(self, comm_tenant, seed_data):
        pi = ProformaInvoice.objects.create(
            tenant=comm_tenant, pi_number="PI-002",
            purchase_order=seed_data["po"],
            buyer=seed_data["buyer"],
            amount=Decimal("5000.00"),
        )
        assert pi.status == "draft"
        pi.status = "sent"
        pi.save()
        pi.refresh_from_db()
        assert pi.status == "sent"


# ==================== ProformaInvoice API Tests ====================

@pytest.mark.django_db
class TestProformaInvoiceAPI:
    def test_list_pis(self, comm_client, seed_data):
        ProformaInvoice.objects.create(
            tenant=seed_data["po"].tenant, pi_number="PI-API-001",
            purchase_order=seed_data["po"],
            buyer=seed_data["buyer"],
            amount=Decimal("10000.00"),
        )
        resp = comm_client.get("/api/v1/commercial/proforma-invoices/")
        assert resp.status_code == 200

    def test_create_pi(self, comm_client, seed_data):
        resp = comm_client.post("/api/v1/commercial/proforma-invoices/", {
            "purchase_order": str(seed_data["po"].id),
            "buyer": str(seed_data["buyer"].id),
            "amount": "15000.00",
            "currency": "USD",
        })
        assert resp.status_code == 201
        assert resp.data["pi_number"].startswith("PI-")
        assert resp.data["status"] == "draft"

    def test_retrieve_pi(self, comm_client, seed_data):
        pi = ProformaInvoice.objects.create(
            tenant=seed_data["po"].tenant, pi_number="PI-API-002",
            purchase_order=seed_data["po"],
            buyer=seed_data["buyer"],
            amount=Decimal("10000.00"),
        )
        resp = comm_client.get(f"/api/v1/commercial/proforma-invoices/{pi.id}/")
        assert resp.status_code == 200
        assert resp.data["pi_number"] == "PI-API-002"

    def test_update_pi(self, comm_client, seed_data):
        pi = ProformaInvoice.objects.create(
            tenant=seed_data["po"].tenant, pi_number="PI-API-003",
            purchase_order=seed_data["po"],
            buyer=seed_data["buyer"],
            amount=Decimal("10000.00"),
        )
        resp = comm_client.patch(f"/api/v1/commercial/proforma-invoices/{pi.id}/", {
            "amount": "12000.00",
        })
        assert resp.status_code == 200

    def test_delete_pi(self, comm_client, seed_data):
        pi = ProformaInvoice.objects.create(
            tenant=seed_data["po"].tenant, pi_number="PI-API-004",
            purchase_order=seed_data["po"],
            buyer=seed_data["buyer"],
            amount=Decimal("10000.00"),
        )
        resp = comm_client.delete(f"/api/v1/commercial/proforma-invoices/{pi.id}/")
        assert resp.status_code == 204

    def test_filter_pi_by_status(self, comm_client, seed_data):
        ProformaInvoice.objects.create(
            tenant=seed_data["po"].tenant, pi_number="PI-API-005",
            purchase_order=seed_data["po"],
            buyer=seed_data["buyer"],
            amount=Decimal("10000.00"), status="sent",
        )
        resp = comm_client.get("/api/v1/commercial/proforma-invoices/?status=sent")
        assert resp.status_code == 200


@pytest.mark.django_db
class TestProformaInvoiceActions:
    def test_send_pi(self, comm_client, seed_data):
        pi = ProformaInvoice.objects.create(
            tenant=seed_data["po"].tenant, pi_number="PI-ACT-001",
            purchase_order=seed_data["po"],
            buyer=seed_data["buyer"],
            amount=Decimal("10000.00"),
        )
        resp = comm_client.post(f"/api/v1/commercial/proforma-invoices/{pi.id}/send/")
        assert resp.status_code == 200
        assert resp.data["status"] == "sent"

    def test_accept_pi(self, comm_client, seed_data):
        pi = ProformaInvoice.objects.create(
            tenant=seed_data["po"].tenant, pi_number="PI-ACT-002",
            purchase_order=seed_data["po"],
            buyer=seed_data["buyer"],
            amount=Decimal("10000.00"), status="sent",
        )
        resp = comm_client.post(f"/api/v1/commercial/proforma-invoices/{pi.id}/accept/")
        assert resp.status_code == 200
        assert resp.data["status"] == "accepted"

    def test_reject_pi(self, comm_client, seed_data):
        pi = ProformaInvoice.objects.create(
            tenant=seed_data["po"].tenant, pi_number="PI-ACT-003",
            purchase_order=seed_data["po"],
            buyer=seed_data["buyer"],
            amount=Decimal("10000.00"), status="sent",
        )
        resp = comm_client.post(f"/api/v1/commercial/proforma-invoices/{pi.id}/reject/")
        assert resp.status_code == 200
        assert resp.data["status"] == "rejected"

    def test_pi_full_workflow(self, comm_client, seed_data):
        pi = ProformaInvoice.objects.create(
            tenant=seed_data["po"].tenant, pi_number="PI-ACT-004",
            purchase_order=seed_data["po"],
            buyer=seed_data["buyer"],
            amount=Decimal("10000.00"),
        )
        resp = comm_client.post(f"/api/v1/commercial/proforma-invoices/{pi.id}/send/")
        assert resp.data["status"] == "sent"
        resp = comm_client.post(f"/api/v1/commercial/proforma-invoices/{pi.id}/accept/")
        assert resp.data["status"] == "accepted"


# ==================== SalesContract Model Tests ====================

@pytest.mark.django_db
class TestSalesContractModel:
    def test_create_sales_contract(self, comm_tenant, seed_data):
        sc = SalesContract.objects.create(
            tenant=comm_tenant, contract_number="SC-001",
            purchase_order=seed_data["po"],
            buyer=seed_data["buyer"],
            total_amount=Decimal("10000.00"),
        )
        assert sc.contract_number == "SC-001"
        assert sc.total_amount == Decimal("10000.00")
        assert sc.status == "draft"

    def test_sc_str(self, comm_tenant, seed_data):
        sc = SalesContract.objects.create(
            tenant=comm_tenant, contract_number="SC-001",
            purchase_order=seed_data["po"],
            buyer=seed_data["buyer"],
            total_amount=Decimal("5000.00"),
        )
        assert "SC-001" in str(sc)

    def test_sc_status_default(self, comm_tenant, seed_data):
        sc = SalesContract.objects.create(
            tenant=comm_tenant, contract_number="SC-002",
            purchase_order=seed_data["po"],
            buyer=seed_data["buyer"],
            total_amount=Decimal("5000.00"),
        )
        assert sc.status == "draft"


# ==================== SalesContract API Tests ====================

@pytest.mark.django_db
class TestSalesContractAPI:
    def test_list_scs(self, comm_client, seed_data):
        SalesContract.objects.create(
            tenant=seed_data["po"].tenant, contract_number="SC-API-001",
            purchase_order=seed_data["po"],
            buyer=seed_data["buyer"],
            total_amount=Decimal("10000.00"),
        )
        resp = comm_client.get("/api/v1/commercial/sales-contracts/")
        assert resp.status_code == 200

    def test_create_sc(self, comm_client, seed_data):
        resp = comm_client.post("/api/v1/commercial/sales-contracts/", {
            "purchase_order": str(seed_data["po"].id),
            "buyer": str(seed_data["buyer"].id),
            "total_amount": "20000.00",
            "currency": "USD",
        })
        assert resp.status_code == 201
        assert resp.data["contract_number"].startswith("SC-")
        assert resp.data["status"] == "draft"

    def test_retrieve_sc(self, comm_client, seed_data):
        sc = SalesContract.objects.create(
            tenant=seed_data["po"].tenant, contract_number="SC-API-002",
            purchase_order=seed_data["po"],
            buyer=seed_data["buyer"],
            total_amount=Decimal("10000.00"),
        )
        resp = comm_client.get(f"/api/v1/commercial/sales-contracts/{sc.id}/")
        assert resp.status_code == 200
        assert resp.data["contract_number"] == "SC-API-002"

    def test_update_sc(self, comm_client, seed_data):
        sc = SalesContract.objects.create(
            tenant=seed_data["po"].tenant, contract_number="SC-API-003",
            purchase_order=seed_data["po"],
            buyer=seed_data["buyer"],
            total_amount=Decimal("10000.00"),
        )
        resp = comm_client.patch(f"/api/v1/commercial/sales-contracts/{sc.id}/", {
            "total_amount": "15000.00",
        })
        assert resp.status_code == 200

    def test_delete_sc(self, comm_client, seed_data):
        sc = SalesContract.objects.create(
            tenant=seed_data["po"].tenant, contract_number="SC-API-004",
            purchase_order=seed_data["po"],
            buyer=seed_data["buyer"],
            total_amount=Decimal("10000.00"),
        )
        resp = comm_client.delete(f"/api/v1/commercial/sales-contracts/{sc.id}/")
        assert resp.status_code == 204

    def test_filter_sc_by_status(self, comm_client, seed_data):
        SalesContract.objects.create(
            tenant=seed_data["po"].tenant, contract_number="SC-API-005",
            purchase_order=seed_data["po"],
            buyer=seed_data["buyer"],
            total_amount=Decimal("10000.00"), status="active",
        )
        resp = comm_client.get("/api/v1/commercial/sales-contracts/?status=active")
        assert resp.status_code == 200
