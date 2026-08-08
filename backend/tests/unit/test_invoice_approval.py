"""
Tests for RQ-035: Invoice Approval (GC-024)
— formerly GC Page 44 / §17 Invoice Approvals.

GC: "Fabric and trimmings — Quantity – Date – Price must match the
information on GC. Over-tolerance fabric quantities should have debit raised
corresponding." Planners sign off the factory invoice and hand over to accounts.
"""
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.test import APIClient

from apps.commercial.models import DebitNote, InvoiceApproval
from apps.logistics.services.paperwork_comparison import PaperworkComparisonService
from apps.merchandising.models import PurchaseOrder
from apps.setup.models import Buyer, Country, Currency, Factory
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def inv_tenant(db):
    return Tenant.objects.create(
        name="Invoice Test Co", slug="inv-test",
        schema_name="tenant_inv", status="active",
    )


@pytest.fixture
def inv_role(db, inv_tenant):
    role = Role.objects.create(tenant=inv_tenant, name="InvAdmin", is_system=True)
    for mod in ["commercial", "merchandising", "setup"]:
        for act in ["view", "create", "edit", "delete"]:
            perm, _ = Permission.objects.get_or_create(
                module=mod, action=act,
                defaults={"description": f"{mod}:{act}"}
            )
            RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def inv_user(db, inv_tenant, inv_role):
    user = User.objects.create_user(
        username="invuser", email="inv@test.com",
        password="testpass123!@#", tenant=inv_tenant, status="active",
        first_name="invuser",
    )
    UserRole.objects.create(user=user, role=inv_role)
    return user


@pytest.fixture
def inv_client(api_client, inv_user):
    api_client.force_authenticate(user=inv_user)
    return api_client


@pytest.fixture
def inv_data(inv_tenant):
    currency = Currency.objects.create(tenant=inv_tenant, code="USD", name="US Dollar", symbol="$")
    country = Country.objects.create(tenant=inv_tenant, code="BGD", name="Bangladesh")
    buyer = Buyer.objects.create(tenant=inv_tenant, code="TARGET", name="Target", country=country, currency=currency)
    factory = Factory.objects.create(tenant=inv_tenant, code="F-INV", name="Apex Knitwears")
    po = PurchaseOrder.objects.create(
        tenant=inv_tenant, po_number="PO-INV-001", buyer=buyer,
        factory=factory, po_date="2026-01-15", delivery_date="2026-06-01",
        quantity=1000, unit_price=10, total_value=10000, currency=currency,
    )
    return {"currency": currency, "country": country, "buyer": buyer, "factory": factory, "po": po}


def _make_invoice(inv_tenant, po, **kwargs):
    defaults = {
        "invoice_number": "INV-0001",
        "purchase_order": po,
        "invoice_date": "2026-06-01",
        "quantity": Decimal("1000.00"),
        "unit_price": Decimal("10.00"),
        "amount": Decimal("10000.00"),
    }
    defaults.update(kwargs)
    return InvoiceApproval.objects.create(tenant=inv_tenant, **defaults)


def _penney_po(inv_tenant, inv_data, **overrides):
    buyer = Buyer.objects.create(
        tenant=inv_tenant, code="PENNEY", name="J.C. Penney",
        country=inv_data["country"], currency=inv_data["currency"],
    )
    defaults = {
        "tenant": inv_tenant, "po_number": "PO-INV-PEN", "buyer": buyer,
        "factory": inv_data["factory"], "po_date": "2026-01-15",
        "delivery_date": "2026-06-01", "quantity": 1000, "unit_price": 10,
        "total_value": 10000, "currency": inv_data["currency"],
    }
    defaults.update(overrides)
    return PurchaseOrder.objects.create(**defaults)


# ==================== Model Tests ====================

@pytest.mark.django_db
class TestInvoiceApprovalModel:
    def test_defaults(self, inv_tenant, inv_data):
        inv = _make_invoice(inv_tenant, inv_data["po"])
        assert inv.status == "pending"
        assert inv.invoice_type == "fabric"
        assert inv.approved_at is None
        assert inv.rejected_at is None
        assert inv.debit_note_id is None
        assert inv.auto_approval_eligible is True

    def test_str(self, inv_tenant, inv_data):
        inv = _make_invoice(inv_tenant, inv_data["po"])
        assert "INV-0001" in str(inv)
        assert "Pending" in str(inv)

    def test_matching_exact_match(self, inv_tenant, inv_data):
        inv = _make_invoice(inv_tenant, inv_data["po"])
        assert inv.quantity_matches is True
        assert inv.price_matches is True
        assert inv.amount_matches is True
        assert inv.date_matches is True
        assert inv.is_match is True
        assert inv.match_status == "match"
        assert inv.auto_approval_eligible is True
        assert inv.mismatch_reasons == []

    def test_quantity_over_tolerance(self, inv_tenant, inv_data):
        inv = _make_invoice(inv_tenant, inv_data["po"], quantity=Decimal("1100.00"),
                            amount=Decimal("11000.00"))
        assert inv.quantity_variance == Decimal("100.00")
        assert inv.quantity_variance_pct == Decimal("10.00")
        assert inv.tolerance_pct == Decimal("5.00")
        assert inv.over_tolerance is True
        assert inv.quantity_matches is False
        assert inv.is_match is False
        assert inv.match_status == "over_tolerance"
        assert "quantity" in inv.mismatch_reasons

    def test_quantity_within_tolerance_matches(self, inv_tenant, inv_data):
        inv = _make_invoice(inv_tenant, inv_data["po"], quantity=Decimal("1040.00"),
                            amount=Decimal("10400.00"))
        assert inv.quantity_variance_pct == Decimal("4.00")
        assert inv.over_tolerance is False
        assert inv.quantity_matches is True

    def test_quantity_under_tolerance_is_mismatch(self, inv_tenant, inv_data):
        inv = _make_invoice(inv_tenant, inv_data["po"], quantity=Decimal("940.00"),
                            amount=Decimal("9400.00"))
        assert inv.quantity_variance_pct == Decimal("-6.00")
        assert inv.over_tolerance is False
        assert inv.quantity_matches is False
        assert inv.match_status == "mismatch"

    def test_price_mismatch(self, inv_tenant, inv_data):
        inv = _make_invoice(inv_tenant, inv_data["po"], unit_price=Decimal("11.00"),
                            amount=Decimal("11000.00"))
        assert inv.price_matches is False
        assert "price" in inv.mismatch_reasons

    def test_amount_mismatch(self, inv_tenant, inv_data):
        inv = _make_invoice(inv_tenant, inv_data["po"], amount=Decimal("9000.00"))
        assert inv.amount_matches is False
        assert "amount" in inv.mismatch_reasons

    def test_date_before_delivery_mismatch(self, inv_tenant, inv_data):
        inv = _make_invoice(inv_tenant, inv_data["po"], invoice_date="2026-05-01")
        assert inv.date_matches is False
        assert "date" in inv.mismatch_reasons

    def test_multiple_mismatch_reasons(self, inv_tenant, inv_data):
        inv = _make_invoice(inv_tenant, inv_data["po"], quantity=Decimal("940.00"),
                            unit_price=Decimal("11.00"), amount=Decimal("9000.00"),
                            invoice_date="2026-05-01")
        assert set(inv.mismatch_reasons) == {"quantity", "price", "amount", "date"}

    def test_tolerance_2pct_discount_retailer(self, inv_tenant, inv_data):
        po = _penney_po(inv_tenant, inv_data)
        inv = _make_invoice(inv_tenant, po, quantity=Decimal("1030.00"),
                            amount=Decimal("10300.00"))
        assert inv.tolerance_pct == Decimal("2.00")
        assert inv.over_tolerance is True

    def test_tolerance_uses_paperwork_comparison_service(self, inv_tenant, inv_data):
        inv = _make_invoice(inv_tenant, inv_data["po"])
        assert inv.tolerance_pct == PaperworkComparisonService.tolerance_pct_for_buyer(inv_data["po"].buyer)

    def test_amount_min_validator(self, inv_tenant, inv_data):
        inv = _make_invoice(inv_tenant, inv_data["po"], amount=Decimal("0.00"))
        with pytest.raises(ValidationError):
            inv.full_clean()

    def test_negative_quantity_rejected(self, inv_tenant, inv_data):
        inv = _make_invoice(inv_tenant, inv_data["po"], quantity=Decimal("-1.00"))
        with pytest.raises(ValidationError):
            inv.full_clean()

    def test_invoice_number_unique_per_tenant(self, inv_tenant, inv_data):
        _make_invoice(inv_tenant, inv_data["po"], invoice_number="INV-UNIQUE")
        with pytest.raises(Exception):
            _make_invoice(inv_tenant, inv_data["po"], invoice_number="INV-UNIQUE")

    def test_approve_from_pending(self, inv_tenant, inv_data, inv_user):
        inv = _make_invoice(inv_tenant, inv_data["po"])
        inv.approve(inv_user)
        inv.refresh_from_db()
        assert inv.status == "approved"
        assert inv.approved_at is not None
        assert inv.approved_by == inv_user

    def test_approve_from_approved_raises(self, inv_tenant, inv_data, inv_user):
        inv = _make_invoice(inv_tenant, inv_data["po"], status="approved")
        with pytest.raises(ValueError):
            inv.approve(inv_user)

    def test_approve_from_rejected_raises(self, inv_tenant, inv_data, inv_user):
        inv = _make_invoice(inv_tenant, inv_data["po"], status="rejected")
        with pytest.raises(ValueError):
            inv.approve(inv_user)

    def test_reject_from_pending(self, inv_tenant, inv_data, inv_user):
        inv = _make_invoice(inv_tenant, inv_data["po"])
        inv.reject("Price does not match the PO", inv_user)
        inv.refresh_from_db()
        assert inv.status == "rejected"
        assert inv.rejection_reason == "Price does not match the PO"
        assert inv.rejected_at is not None

    def test_reject_requires_reason(self, inv_tenant, inv_data):
        inv = _make_invoice(inv_tenant, inv_data["po"])
        with pytest.raises(ValueError):
            inv.reject("", None)

    def test_reject_from_approved_raises(self, inv_tenant, inv_data):
        inv = _make_invoice(inv_tenant, inv_data["po"], status="approved")
        with pytest.raises(ValueError):
            inv.reject("nope", None)

    def test_raise_debit_creates_linked_pro_forma(self, inv_tenant, inv_data, inv_user):
        inv = _make_invoice(inv_tenant, inv_data["po"], quantity=Decimal("1100.00"),
                            amount=Decimal("11000.00"))
        debit = inv.raise_debit(inv_user)
        inv.refresh_from_db()
        assert inv.debit_note == debit
        assert debit.debit_type == "fabric_over_tolerance"
        assert debit.purchase_order == inv_data["po"]
        assert debit.status == "pro_forma"
        assert debit.amount == Decimal("1000.00")
        assert debit.tolerance_pct == Decimal("5.00")
        assert debit.raised_by == inv_user

    def test_raise_debit_requires_over_tolerance(self, inv_tenant, inv_data):
        inv = _make_invoice(inv_tenant, inv_data["po"])
        with pytest.raises(ValueError):
            inv.raise_debit(None)

    def test_full_lifecycle(self, inv_tenant, inv_data, inv_user):
        inv = _make_invoice(inv_tenant, inv_data["po"])
        inv.approve(inv_user)
        inv.refresh_from_db()
        assert inv.status == "approved"
        assert inv.approved_at is not None
        assert inv.approved_by == inv_user


# ==================== API Tests ====================

@pytest.mark.django_db
class TestInvoiceApprovalAPI:
    def test_unauthenticated_401(self, api_client, inv_data):
        res = api_client.get("/api/v1/commercial/invoice-approvals/")
        assert res.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_invoice_approval(self, inv_client, inv_data):
        res = inv_client.post("/api/v1/commercial/invoice-approvals/", {
            "purchase_order": str(inv_data["po"].id),
            "invoice_type": "fabric",
            "invoice_date": "2026-06-01",
            "quantity": "1000.00",
            "unit_price": "10.00",
            "amount": "10000.00",
            "currency": str(inv_data["currency"].id),
        }, format="json")
        assert res.status_code == status.HTTP_201_CREATED, res.content
        assert res.data["invoice_number"].startswith("INV-")
        assert res.data["status"] == "pending"
        assert res.data["po_number"] == "PO-INV-001"
        assert res.data["buyer_name"] == "Target"
        assert res.data["is_match"] is True
        assert res.data["match_status"] == "match"

    def test_create_requires_purchase_order(self, inv_client):
        res = inv_client.post("/api/v1/commercial/invoice-approvals/", {
            "invoice_date": "2026-06-01",
            "quantity": "1000.00",
            "unit_price": "10.00",
            "amount": "10000.00",
        }, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_retrieve_exposes_computed_fields(self, inv_client, inv_tenant, inv_data):
        inv = _make_invoice(inv_tenant, inv_data["po"], currency=inv_data["currency"],
                            quantity=Decimal("1100.00"), amount=Decimal("11000.00"))
        res = inv_client.get(f"/api/v1/commercial/invoice-approvals/{inv.id}/")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["over_tolerance"] is True
        assert res.data["tolerance_pct"] == "5.00"
        assert res.data["quantity_variance_pct"] == "10.00"
        assert res.data["match_status"] == "over_tolerance"
        assert "quantity" in res.data["mismatch_reasons"]
        assert res.data["currency_code"] == "USD"

    def test_list_filter_by_status(self, inv_client, inv_tenant, inv_data):
        _make_invoice(inv_tenant, inv_data["po"], invoice_number="INV-STA-01", status="pending")
        _make_invoice(inv_tenant, inv_data["po"], invoice_number="INV-STA-02", status="approved")
        res = inv_client.get("/api/v1/commercial/invoice-approvals/", {"status": "approved"})
        assert res.status_code == status.HTTP_200_OK
        assert res.data["count"] == 1
        assert res.data["results"][0]["invoice_number"] == "INV-STA-02"

    def test_list_filter_by_invoice_type(self, inv_client, inv_tenant, inv_data):
        _make_invoice(inv_tenant, inv_data["po"], invoice_number="INV-TYP-01", invoice_type="fabric")
        _make_invoice(inv_tenant, inv_data["po"], invoice_number="INV-TYP-02", invoice_type="trimmings")
        res = inv_client.get("/api/v1/commercial/invoice-approvals/", {"invoice_type": "trimmings"})
        assert res.data["count"] == 1
        assert res.data["results"][0]["invoice_number"] == "INV-TYP-02"

    def test_list_filter_by_match(self, inv_client, inv_tenant, inv_data):
        _make_invoice(inv_tenant, inv_data["po"], invoice_number="INV-MAT-01")
        _make_invoice(inv_tenant, inv_data["po"], invoice_number="INV-MIS-01",
                      unit_price=Decimal("11.00"), amount=Decimal("11000.00"))
        _make_invoice(inv_tenant, inv_data["po"], invoice_number="INV-OVR-01",
                      quantity=Decimal("1100.00"), amount=Decimal("11000.00"))
        res = inv_client.get("/api/v1/commercial/invoice-approvals/", {"match": "over_tolerance"})
        assert res.data["count"] == 1
        assert res.data["results"][0]["invoice_number"] == "INV-OVR-01"
        res = inv_client.get("/api/v1/commercial/invoice-approvals/", {"match": "mismatch"})
        assert res.data["count"] == 1
        res = inv_client.get("/api/v1/commercial/invoice-approvals/", {"match": "match"})
        assert res.data["count"] == 1
        assert res.data["results"][0]["invoice_number"] == "INV-MAT-01"

    def test_search_by_po_number(self, inv_client, inv_tenant, inv_data):
        _make_invoice(inv_tenant, inv_data["po"], invoice_number="INV-SRC-01")
        res = inv_client.get("/api/v1/commercial/invoice-approvals/", {"search": "PO-INV-001"})
        assert res.data["count"] == 1

    def test_approve_action(self, inv_client, inv_tenant, inv_data):
        inv = _make_invoice(inv_tenant, inv_data["po"], invoice_number="INV-APR-01")
        res = inv_client.post(f"/api/v1/commercial/invoice-approvals/{inv.id}/approve/")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["status"] == "approved"
        assert res.data["approved_by_name"] == "invuser"

    def test_approve_illegal_state_400(self, inv_client, inv_tenant, inv_data):
        inv = _make_invoice(inv_tenant, inv_data["po"], invoice_number="INV-APR-02", status="approved")
        res = inv_client.post(f"/api/v1/commercial/invoice-approvals/{inv.id}/approve/")
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_reject_action(self, inv_client, inv_tenant, inv_data):
        inv = _make_invoice(inv_tenant, inv_data["po"], invoice_number="INV-REJ-01")
        res = inv_client.post(f"/api/v1/commercial/invoice-approvals/{inv.id}/reject/",
                              {"rejection_reason": "Price mismatch"}, format="json")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["status"] == "rejected"
        assert res.data["rejection_reason"] == "Price mismatch"

    def test_reject_requires_reason_400(self, inv_client, inv_tenant, inv_data):
        inv = _make_invoice(inv_tenant, inv_data["po"], invoice_number="INV-REJ-02")
        res = inv_client.post(f"/api/v1/commercial/invoice-approvals/{inv.id}/reject/", {}, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_raise_debit_action(self, inv_client, inv_tenant, inv_data):
        inv = _make_invoice(inv_tenant, inv_data["po"], invoice_number="INV-DEB-01",
                            quantity=Decimal("1100.00"), amount=Decimal("11000.00"))
        res = inv_client.post(f"/api/v1/commercial/invoice-approvals/{inv.id}/raise_debit/")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["debit_number"].startswith("DN-")
        inv.refresh_from_db()
        assert inv.debit_note is not None
        assert inv.debit_note.status == "pro_forma"

    def test_raise_debit_action_not_over_tolerance_400(self, inv_client, inv_tenant, inv_data):
        inv = _make_invoice(inv_tenant, inv_data["po"], invoice_number="INV-DEB-02")
        res = inv_client.post(f"/api/v1/commercial/invoice-approvals/{inv.id}/raise_debit/")
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_dashboard_summary(self, inv_client, inv_tenant, inv_data):
        _make_invoice(inv_tenant, inv_data["po"], invoice_number="INV-DSH-01")
        _make_invoice(inv_tenant, inv_data["po"], invoice_number="INV-DSH-02", status="approved")
        _make_invoice(inv_tenant, inv_data["po"], invoice_number="INV-DSH-03",
                      quantity=Decimal("1100.00"), amount=Decimal("11000.00"))
        res = inv_client.get("/api/v1/commercial/invoice-approvals/dashboard/")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["total"] == 3
        assert res.data["by_status"]["pending"] == 2
        assert res.data["by_status"]["approved"] == 1
        assert res.data["over_tolerance"] == 1

    def test_export_csv(self, inv_client, inv_tenant, inv_data):
        _make_invoice(inv_tenant, inv_data["po"], invoice_number="INV-CSV-01")
        res = inv_client.get("/api/v1/commercial/invoice-approvals/export/")
        assert res.status_code == status.HTTP_200_OK
        assert "text/csv" in res["Content-Type"]
        content = res.content.decode()
        assert "invoice_number" in content
        assert "INV-CSV-01" in content

    def test_tenant_isolation(self, inv_client, inv_tenant, inv_data):
        other = Tenant.objects.create(
            name="Other Inv Co", slug="inv-other", schema_name="tenant_inv2", status="active",
        )
        currency = Currency.objects.create(tenant=other, code="EUR", name="Euro", symbol="€")
        country = Country.objects.create(tenant=other, code="GBR", name="United Kingdom")
        buyer = Buyer.objects.create(tenant=other, code="HM", name="H&M", country=country, currency=currency)
        factory = Factory.objects.create(tenant=other, code="F-INV2", name="Other Knitwears")
        po = PurchaseOrder.objects.create(
            tenant=other, po_number="PO-OTHER", buyer=buyer, factory=factory,
            po_date="2026-01-15", delivery_date="2026-06-01",
            quantity=100, unit_price=10, total_value=1000, currency=currency,
        )
        _make_invoice(inv_tenant, inv_data["po"], invoice_number="INV-TEN-01")
        InvoiceApproval.objects.create(
            tenant=other, invoice_number="INV-TEN-02", purchase_order=po,
            invoice_date="2026-06-01", quantity=Decimal("100.00"),
            unit_price=Decimal("10.00"), amount=Decimal("1000.00"),
        )
        res = inv_client.get("/api/v1/commercial/invoice-approvals/")
        assert res.data["count"] == 1
        assert res.data["results"][0]["invoice_number"] == "INV-TEN-01"


@pytest.mark.django_db
class TestInvoiceApprovalIntegration:
    """Cross-feature: RQ-034 over-tolerance invoice → debit; RQ-031 tolerance rule."""

    def test_over_tolerance_invoice_raises_linked_debit(self, inv_client, inv_tenant, inv_data):
        inv = _make_invoice(inv_tenant, inv_data["po"], invoice_number="INV-INT-01",
                            quantity=Decimal("1100.00"), amount=Decimal("11000.00"))
        debit = inv.raise_debit(User.objects.filter(tenant=inv_tenant).first())
        assert isinstance(debit, DebitNote)
        assert debit.purchase_order == inv_data["po"]
        assert inv.debit_note == debit
        assert DebitNote.objects.filter(tenant=inv_tenant, purchase_order=inv_data["po"]).count() == 1

    def test_tolerance_derived_from_rq031_service(self, inv_tenant, inv_data):
        inv = _make_invoice(inv_tenant, inv_data["po"])
        service_tolerance = PaperworkComparisonService.tolerance_pct_for_buyer(inv_data["po"].buyer)
        assert inv.tolerance_pct == service_tolerance
        assert service_tolerance == Decimal("5.00")
