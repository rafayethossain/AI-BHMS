"""
Tests for RQ-034: Debit Note System (pro forma debits with compliance workflow)
— formerly GC-023 (GC Page 44 / §16 Debits Management).
"""
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.commercial.models import DebitNote
from apps.logistics.models import FinalHitReconciliation, Shipment
from apps.merchandising.models import PurchaseOrder
from apps.setup.models import Buyer, Country, Currency, Factory
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def dn_tenant(db):
    return Tenant.objects.create(
        name="Debit Note Test Co", slug="dn-test",
        schema_name="tenant_dn", status="active",
    )


@pytest.fixture
def dn_role(db, dn_tenant):
    role = Role.objects.create(tenant=dn_tenant, name="DNAdmin", is_system=True)
    for mod in ["commercial", "merchandising", "setup", "logistics"]:
        for act in ["view", "create", "edit", "delete"]:
            perm, _ = Permission.objects.get_or_create(
                module=mod, action=act,
                defaults={"description": f"{mod}:{act}"}
            )
            RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def dn_user(db, dn_tenant, dn_role):
    user = User.objects.create_user(
        username="dnuser", email="dn@test.com",
        password="testpass123!@#", tenant=dn_tenant, status="active",
    )
    UserRole.objects.create(user=user, role=dn_role)
    return user


@pytest.fixture
def dn_client(api_client, dn_user):
    api_client.force_authenticate(user=dn_user)
    return api_client


@pytest.fixture
def dn_data(dn_tenant):
    currency = Currency.objects.create(tenant=dn_tenant, code="USD", name="US Dollar", symbol="$")
    country = Country.objects.create(tenant=dn_tenant, code="BGD", name="Bangladesh")
    buyer = Buyer.objects.create(tenant=dn_tenant, code="PRIMARK", name="Primark", country=country, currency=currency)
    factory = Factory.objects.create(tenant=dn_tenant, code="F-DN", name="Apex Knitwears")
    po = PurchaseOrder.objects.create(
        tenant=dn_tenant, po_number="PO-DN-001", buyer=buyer,
        factory=factory, po_date="2026-01-15", delivery_date="2026-06-01",
        quantity=1000, unit_price=10, total_value=10000, currency=currency,
    )
    return {"currency": currency, "country": country, "buyer": buyer, "factory": factory, "po": po}


def _make_debit(dn_tenant, po, **kwargs):
    defaults = {
        "debit_number": "DN-0001",
        "purchase_order": po,
        "amount": Decimal("500.00"),
        "reason": "Fabric shipped 8% over the 5% tolerance",
    }
    defaults.update(kwargs)
    return DebitNote.objects.create(tenant=dn_tenant, **defaults)


# ==================== Model Tests ====================

@pytest.mark.django_db
class TestDebitNoteModel:
    def test_create_pro_forma_default(self, dn_tenant, dn_data):
        dn = _make_debit(dn_tenant, dn_data["po"])
        assert dn.status == "pro_forma"
        assert dn.debit_type == "other"
        assert dn.compliance_email_sent is False
        assert dn.compliance_email == DebitNote.DEFAULT_COMPLIANCE_EMAIL
        assert dn.raised_at is not None
        assert dn.issued_at is None
        assert dn.paid_at is None

    def test_str(self, dn_tenant, dn_data):
        dn = _make_debit(dn_tenant, dn_data["po"])
        assert "DN-0001" in str(dn)
        assert "Pro Forma" in str(dn)

    def test_amount_min_validator(self, dn_tenant, dn_data):
        dn = _make_debit(dn_tenant, dn_data["po"], amount=Decimal("0.00"))
        with pytest.raises(ValidationError):
            dn.full_clean()

    def test_negative_shortage_units_rejected(self, dn_tenant, dn_data):
        dn = _make_debit(dn_tenant, dn_data["po"], shortage_units=Decimal("-1.00"))
        with pytest.raises(ValidationError):
            dn.full_clean()

    def test_debit_number_unique_per_tenant(self, dn_tenant, dn_data):
        _make_debit(dn_tenant, dn_data["po"], debit_number="DN-UNIQUE")
        with pytest.raises(Exception):
            _make_debit(dn_tenant, dn_data["po"], debit_number="DN-UNIQUE")

    def test_issue_from_pro_forma(self, dn_tenant, dn_data):
        dn = _make_debit(dn_tenant, dn_data["po"])
        dn.issue()
        dn.refresh_from_db()
        assert dn.status == "issued"
        assert dn.issued_at is not None
        assert dn.compliance_email_sent is True
        assert dn.email_sent_at is not None

    def test_issue_from_issued_raises(self, dn_tenant, dn_data):
        dn = _make_debit(dn_tenant, dn_data["po"], status="issued", issued_at=timezone.now())
        with pytest.raises(ValueError):
            dn.issue()

    def test_issue_from_paid_raises(self, dn_tenant, dn_data):
        dn = _make_debit(dn_tenant, dn_data["po"], status="paid", paid_at=timezone.now())
        with pytest.raises(ValueError):
            dn.issue()

    def test_mark_paid_from_issued(self, dn_tenant, dn_data):
        dn = _make_debit(dn_tenant, dn_data["po"], status="issued", issued_at=timezone.now())
        dn.mark_paid()
        dn.refresh_from_db()
        assert dn.status == "paid"
        assert dn.paid_at is not None

    def test_mark_paid_from_pro_forma_raises(self, dn_tenant, dn_data):
        dn = _make_debit(dn_tenant, dn_data["po"])
        with pytest.raises(ValueError):
            dn.mark_paid()

    def test_mark_paid_from_paid_raises(self, dn_tenant, dn_data):
        dn = _make_debit(dn_tenant, dn_data["po"], status="paid", paid_at=timezone.now())
        with pytest.raises(ValueError):
            dn.mark_paid()

    def test_full_lifecycle(self, dn_tenant, dn_data):
        dn = _make_debit(dn_tenant, dn_data["po"])
        dn.issue()
        dn.mark_paid()
        dn.refresh_from_db()
        assert dn.status == "paid"
        assert dn.raised_at is not None
        assert dn.issued_at is not None
        assert dn.paid_at is not None
        assert dn.compliance_email_sent is True

    def test_default_tolerance_pct(self, dn_tenant, dn_data):
        dn = _make_debit(dn_tenant, dn_data["po"], debit_type="fabric_over_tolerance")
        assert dn.tolerance_pct == Decimal("5.00")


# ==================== API Tests ====================

@pytest.mark.django_db
class TestDebitNoteAPI:
    def test_unauthenticated_401(self, api_client, dn_data):
        res = api_client.get("/api/v1/commercial/debit-notes/")
        assert res.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_debit_note(self, dn_client, dn_data):
        res = dn_client.post("/api/v1/commercial/debit-notes/", {
            "purchase_order": str(dn_data["po"].id),
            "debit_type": "fabric_over_tolerance",
            "party_type": "factory",
            "debited_party": "Apex Knitwears",
            "amount": "750.00",
            "currency": str(dn_data["currency"].id),
            "tolerance_pct": "5.00",
            "reason": "Shipped 8% over the 5% tolerance",
        }, format="json")
        assert res.status_code == status.HTTP_201_CREATED, res.content
        assert res.data["status"] == "pro_forma"
        assert res.data["debit_number"].startswith("DN-")
        assert res.data["po_number"] == "PO-DN-001"
        assert res.data["buyer_name"] == "Primark"
        assert res.data["compliance_email_sent"] is False

    def test_create_requires_reason(self, dn_client, dn_data):
        res = dn_client.post("/api/v1/commercial/debit-notes/", {
            "purchase_order": str(dn_data["po"].id),
            "amount": "100.00",
            "reason": "",
        }, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_rejects_zero_amount(self, dn_client, dn_data):
        res = dn_client.post("/api/v1/commercial/debit-notes/", {
            "purchase_order": str(dn_data["po"].id),
            "amount": "0.00",
            "reason": "Some issue",
        }, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_list_filters_by_status(self, dn_client, dn_tenant, dn_data):
        _make_debit(dn_tenant, dn_data["po"], debit_number="DN-STA-01", status="pro_forma")
        _make_debit(dn_tenant, dn_data["po"], debit_number="DN-STA-02", status="issued",
                    issued_at=timezone.now(), compliance_email_sent=True)
        res = dn_client.get("/api/v1/commercial/debit-notes/", {"status": "issued"})
        assert res.status_code == status.HTTP_200_OK
        assert res.data["count"] == 1
        assert res.data["results"][0]["debit_number"] == "DN-STA-02"

    def test_list_filters_by_debit_type(self, dn_client, dn_tenant, dn_data):
        _make_debit(dn_tenant, dn_data["po"], debit_number="DN-TYP-01", debit_type="final_hit_shortage")
        _make_debit(dn_tenant, dn_data["po"], debit_number="DN-TYP-02", debit_type="trims_shortage")
        res = dn_client.get("/api/v1/commercial/debit-notes/", {"debit_type": "trims_shortage"})
        assert res.status_code == status.HTTP_200_OK
        assert res.data["count"] == 1
        assert res.data["results"][0]["debit_number"] == "DN-TYP-02"

    def test_search_by_po_number(self, dn_client, dn_tenant, dn_data):
        _make_debit(dn_tenant, dn_data["po"], debit_number="DN-SRC-01")
        res = dn_client.get("/api/v1/commercial/debit-notes/", {"search": "PO-DN-001"})
        assert res.status_code == status.HTTP_200_OK
        assert res.data["count"] == 1

    def test_retrieve_exposes_readonly_fields(self, dn_client, dn_tenant, dn_data):
        dn = _make_debit(
            dn_tenant, dn_data["po"],
            debit_number="DN-RO-01", debit_type="fabric_over_tolerance",
            currency=dn_data["currency"],
        )
        res = dn_client.get(f"/api/v1/commercial/debit-notes/{dn.id}/")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["status_display"] == "Pro Forma"
        assert res.data["debit_type_display"] == "Fabric Over-Tolerance"
        assert res.data["currency_code"] == "USD"

    def test_update_amount(self, dn_client, dn_tenant, dn_data):
        dn = _make_debit(dn_tenant, dn_data["po"], debit_number="DN-UPD-01")
        res = dn_client.patch(f"/api/v1/commercial/debit-notes/{dn.id}/",
                              {"amount": "900.00"}, format="json")
        assert res.status_code == status.HTTP_200_OK
        assert Decimal(res.data["amount"]) == Decimal("900.00")

    def test_status_is_read_only_via_crud(self, dn_client, dn_tenant, dn_data):
        dn = _make_debit(dn_tenant, dn_data["po"], debit_number="DN-RO-STA")
        res = dn_client.patch(f"/api/v1/commercial/debit-notes/{dn.id}/",
                              {"status": "paid"}, format="json")
        assert res.status_code == status.HTTP_200_OK
        dn.refresh_from_db()
        assert dn.status == "pro_forma"

    def test_issue_action(self, dn_client, dn_tenant, dn_data):
        dn = _make_debit(dn_tenant, dn_data["po"], debit_number="DN-ISS-01")
        res = dn_client.post(f"/api/v1/commercial/debit-notes/{dn.id}/issue/")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["status"] == "issued"
        assert res.data["compliance_email_sent"] is True

    def test_issue_action_illegal_state_400(self, dn_client, dn_tenant, dn_data):
        dn = _make_debit(dn_tenant, dn_data["po"], debit_number="DN-ISS-02",
                         status="paid", paid_at=timezone.now())
        res = dn_client.post(f"/api/v1/commercial/debit-notes/{dn.id}/issue/")
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_mark_paid_action(self, dn_client, dn_tenant, dn_data):
        dn = _make_debit(dn_tenant, dn_data["po"], debit_number="DN-PAY-01",
                         status="issued", issued_at=timezone.now())
        res = dn_client.post(f"/api/v1/commercial/debit-notes/{dn.id}/mark_paid/")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["status"] == "paid"

    def test_mark_paid_action_illegal_state_400(self, dn_client, dn_tenant, dn_data):
        dn = _make_debit(dn_tenant, dn_data["po"], debit_number="DN-PAY-02")
        res = dn_client.post(f"/api/v1/commercial/debit-notes/{dn.id}/mark_paid/")
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_dashboard_summary(self, dn_client, dn_tenant, dn_data):
        _make_debit(dn_tenant, dn_data["po"], debit_number="DN-DSH-01", amount=Decimal("100.00"))
        _make_debit(dn_tenant, dn_data["po"], debit_number="DN-DSH-02", amount=Decimal("200.00"),
                    status="issued", issued_at=timezone.now(), compliance_email_sent=True)
        res = dn_client.get("/api/v1/commercial/debit-notes/dashboard/")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["total"] == 2
        assert res.data["by_status"]["pro_forma"] == 1
        assert res.data["by_status"]["issued"] == 1
        assert res.data["total_value"] == "300.00"
        assert res.data["compliance_emails_sent"] == 1

    def test_export_csv(self, dn_client, dn_tenant, dn_data):
        _make_debit(dn_tenant, dn_data["po"], debit_number="DN-CSV-01")
        res = dn_client.get("/api/v1/commercial/debit-notes/export/")
        assert res.status_code == status.HTTP_200_OK
        assert "text/csv" in res["Content-Type"]
        content = res.content.decode()
        assert "debit_number" in content
        assert "DN-CSV-01" in content
        assert "compliance_email_sent" in content

    def test_tenant_isolation(self, dn_client, dn_tenant, dn_data):
        other = Tenant.objects.create(
            name="Other Co", slug="dn-other", schema_name="tenant_dn2", status="active",
        )
        currency = Currency.objects.create(tenant=other, code="EUR", name="Euro", symbol="€")
        country = Country.objects.create(tenant=other, code="GBR", name="United Kingdom")
        buyer = Buyer.objects.create(tenant=other, code="HM", name="H&M", country=country, currency=currency)
        factory = Factory.objects.create(tenant=other, code="F-OTH", name="Other Knitwears")
        po = PurchaseOrder.objects.create(
            tenant=other, po_number="PO-OTHER", buyer=buyer, factory=factory,
            po_date="2026-01-15", delivery_date="2026-06-01",
            quantity=100, unit_price=10, total_value=1000, currency=currency,
        )
        _make_debit(dn_tenant, dn_data["po"], debit_number="DN-TEN-01")
        DebitNote.objects.create(
            tenant=other, debit_number="DN-TEN-02", purchase_order=po,
            amount=Decimal("10.00"), reason="Other tenant issue",
        )
        res = dn_client.get("/api/v1/commercial/debit-notes/")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["count"] == 1
        assert res.data["results"][0]["debit_number"] == "DN-TEN-01"


@pytest.mark.django_db
class TestDebitNoteIntegration:
    """Cross-feature: RQ-027 final-hit >20-unit shortage → debit; RQ-031 over-tolerance → debit."""

    def test_debit_linked_to_final_hit_reconciliation(self, dn_tenant, dn_data):
        po = dn_data["po"]
        shipment = Shipment.objects.create(
            tenant=dn_tenant, shipment_number="SHP-DN-001", purchase_order=po,
            quantity=1000, status="delivered",
        )
        recon = FinalHitReconciliation.objects.create(
            tenant=dn_tenant, shipment=shipment,
            docket_quantity=Decimal("1000.00"), shipped_quantity=Decimal("995.00"),
            status="reconciled",
        )
        assert recon.shortage_units == Decimal("5.00")
        assert recon.requires_debit is False
        recon.shipped_quantity = Decimal("960.00")
        recon.save()
        assert recon.shortage_units == Decimal("40.00")
        assert recon.requires_debit is True

        dn = DebitNote.objects.create(
            tenant=dn_tenant, debit_number="DN-REC-01", purchase_order=po,
            reconciliation=recon, debit_type="final_hit_shortage",
            debited_party="Factory", party_type="factory",
            amount=Decimal("400.00"), shortage_units=recon.shortage_units,
            reason=f"Final hit shortage of {recon.shortage_units} units (>20)",
        )
        assert dn.reconciliation == recon
        assert dn.debit_type == "final_hit_shortage"
        assert dn.shortage_units == Decimal("40.00")

    def test_pending_over_tolerance_uses_paperwork_comparison(self, dn_client, dn_tenant, dn_data):
        """Over-tolerance shipped qty surfaces as a debit candidate.

        Fixture buyer is Primark, a discount retailer, so the GC 2% threshold
        applies (2% for Primark/Penney's, 5% default).
        """
        po = dn_data["po"]
        Shipment.objects.create(
            tenant=dn_tenant, shipment_number="SHP-DN-OT", purchase_order=po,
            quantity=Decimal("1100.00"), status="in_transit",
        )
        res = dn_client.get("/api/v1/commercial/debit-notes/pending_over_tolerance/")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["count"] >= 1
        row = next(r for r in res.data["results"] if r["po_number"] == "PO-DN-001")
        assert row["over_tolerance"] is True
        assert row["tolerance_pct"] == "2.00"
        assert row["quantity_variance_pct"] == "10.00"

    def test_pending_over_tolerance_default_5pct_for_regular_buyer(self, dn_client, dn_tenant, dn_data):
        """Non discount-retailer buyers keep the GC default 5% threshold."""
        buyer = Buyer.objects.create(
            tenant=dn_tenant, code="MNS", name="Marks & Spencer",
            country=dn_data["country"], currency=dn_data["currency"],
        )
        po = PurchaseOrder.objects.create(
            tenant=dn_tenant, po_number="PO-DN-MNS", buyer=buyer,
            factory=dn_data["factory"], po_date="2026-01-15", delivery_date="2026-06-01",
            quantity=1000, unit_price=10, total_value=10000, currency=dn_data["currency"],
        )
        Shipment.objects.create(
            tenant=dn_tenant, shipment_number="SHP-DN-MNS", purchase_order=po,
            quantity=Decimal("1060.00"), status="in_transit",
        )
        res = dn_client.get("/api/v1/commercial/debit-notes/pending_over_tolerance/")
        assert res.status_code == status.HTTP_200_OK
        row = next(r for r in res.data["results"] if r["po_number"] == "PO-DN-MNS")
        assert row["over_tolerance"] is True
        assert row["tolerance_pct"] == "5.00"
        assert row["quantity_variance_pct"] == "6.00"

    def test_pending_over_tolerance_respects_2pct_discount_retailer(self, dn_client, dn_tenant, dn_data):
        buyer = Buyer.objects.create(
            tenant=dn_tenant, code="PENNEY", name="J.C. Penney",
            country=dn_data["country"], currency=dn_data["currency"],
        )
        po = PurchaseOrder.objects.create(
            tenant=dn_tenant, po_number="PO-DN-PEN", buyer=buyer,
            factory=dn_data["factory"], po_date="2026-01-15", delivery_date="2026-06-01",
            quantity=1000, unit_price=10, total_value=10000, currency=dn_data["currency"],
        )
        Shipment.objects.create(
            tenant=dn_tenant, shipment_number="SHP-DN-PEN", purchase_order=po,
            quantity=Decimal("1025.00"), status="in_transit",
        )
        res = dn_client.get("/api/v1/commercial/debit-notes/pending_over_tolerance/")
        assert res.status_code == status.HTTP_200_OK
        row = next(r for r in res.data["results"] if r["po_number"] == "PO-DN-PEN")
        assert row["over_tolerance"] is True
        assert row["tolerance_pct"] == "2.00"
