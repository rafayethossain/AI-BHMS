"""
Commercial models for BHMS.
"""
from datetime import timedelta
from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from apps.core.models import TenantModel


class LC(TenantModel):
    """
    Letter of Credit model.
    """
    lc_number = models.CharField(max_length=50)
    lc_type = models.CharField(
        max_length=20,
        choices=[
            ("master", "Master LC"),
            ("b2b", "Back-to-Back LC"),
        ]
    )
    buyer = models.ForeignKey("setup.Buyer", on_delete=models.CASCADE, related_name="lcs")
    purchase_order = models.ForeignKey("merchandising.PurchaseOrder", on_delete=models.SET_NULL, null=True, blank=True, related_name="lcs")
    parent_lc = models.ForeignKey("self", on_delete=models.SET_NULL, null=True, blank=True, related_name="child_lcs")
    bank = models.ForeignKey("commercial.Bank", on_delete=models.SET_NULL, null=True, blank=True, related_name="lcs")
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.ForeignKey("setup.Currency", on_delete=models.SET_NULL, null=True, blank=True, related_name="lcs")
    issued_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=[
            ("draft", "Draft"),
            ("sent_to_bank", "Sent to Bank"),
            ("received", "Received"),
            ("accepted", "Accepted"),
            ("amended", "Amended"),
            ("utilized", "Utilized"),
            ("expired", "Expired"),
            ("cancelled", "Cancelled"),
        ],
        default="draft"
    )
    utilized_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    remarks = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ["tenant", "lc_number"]

    def __str__(self):
        return f"{self.lc_number} - {self.buyer.name}"


class LCAmendment(TenantModel):
    """
    LC Amendment model.
    """
    lc = models.ForeignKey(LC, on_delete=models.CASCADE, related_name="amendments")
    amendment_number = models.IntegerField()
    amount_change = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    expiry_date_change = models.DateField(null=True, blank=True)
    quantity_change = models.IntegerField(null=True, blank=True)
    reason = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=[
            ("pending", "Pending"),
            ("approved", "Approved"),
            ("rejected", "Rejected"),
        ],
        default="pending"
    )
    approved_by = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-amendment_number"]

    def __str__(self):
        return f"{self.lc.lc_number} - Amendment {self.amendment_number}"


class Bank(TenantModel):
    """
    Bank model.
    """
    code = models.CharField(max_length=50)
    name = models.CharField(max_length=255)
    swift_code = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    contact_person = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=[
            ("active", "Active"),
            ("inactive", "Inactive"),
        ],
        default="active"
    )

    class Meta:
        ordering = ["code"]
        unique_together = ["tenant", "code"]

    def __str__(self):
        return f"{self.code} - {self.name}"


class ProformaInvoice(TenantModel):
    pi_number = models.CharField(max_length=50, unique=True)
    purchase_order = models.ForeignKey(
        "merchandising.PurchaseOrder",
        on_delete=models.CASCADE,
        related_name="proforma_invoices"
    )
    buyer = models.ForeignKey(
        "setup.Buyer",
        on_delete=models.CASCADE,
        related_name="proforma_invoices"
    )
    lc = models.ForeignKey(
        LC,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="proforma_invoices"
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="USD")
    issued_date = models.DateField(auto_now_add=True)
    validity_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=[
        ("draft", "Draft"),
        ("sent", "Sent"),
        ("accepted", "Accepted"),
        ("rejected", "Rejected"),
    ], default="draft")
    remarks = models.TextField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.pi_number} ({self.status})"


class SalesContract(TenantModel):
    contract_number = models.CharField(max_length=50, unique=True)
    purchase_order = models.ForeignKey(
        "merchandising.PurchaseOrder",
        on_delete=models.CASCADE,
        related_name="sales_contracts"
    )
    buyer = models.ForeignKey(
        "setup.Buyer",
        on_delete=models.CASCADE,
        related_name="sales_contracts"
    )
    contract_date = models.DateField(auto_now_add=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="USD")
    payment_terms = models.ForeignKey(
        "setup.PaymentTerms",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sales_contracts"
    )
    delivery_terms = models.CharField(max_length=200, null=True, blank=True)
    status = models.CharField(max_length=20, choices=[
        ("draft", "Draft"),
        ("active", "Active"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    ], default="draft")
    remarks = models.TextField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.contract_number} ({self.status})"


class SalesConfirmation(TenantModel):
    """
    Sales confirmation sheet sent to the customer with a 48-hour
    dispute window (GC-025). If no dispute within the window, the
    confirmation is taken as accepted.
    """
    DISPUTE_WINDOW_HOURS = 48

    confirmation_number = models.CharField(max_length=50, unique=True)
    purchase_order = models.ForeignKey(
        "merchandising.PurchaseOrder",
        on_delete=models.CASCADE,
        related_name="sales_confirmations"
    )
    buyer = models.ForeignKey(
        "setup.Buyer",
        on_delete=models.CASCADE,
        related_name="sales_confirmations"
    )
    sent_at = models.DateTimeField(null=True, blank=True)
    disputed_at = models.DateTimeField(null=True, blank=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=[
        ("draft", "Draft"),
        ("sent", "Sent"),
        ("disputed", "Disputed"),
        ("accepted", "Accepted"),
    ], default="draft")
    dispute_reason = models.TextField(blank=True)
    auto_accepted = models.BooleanField(default=False)
    remarks = models.TextField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.confirmation_number} ({self.status})"

    def send(self):
        self.status = "sent"
        self.sent_at = timezone.now()
        self.save(update_fields=["status", "sent_at", "updated_at"])

    def window_elapsed(self, now=None):
        """True once more than 48 hours have passed since sending."""
        if self.status != "sent" or not self.sent_at:
            return False
        now = now or timezone.now()
        return now >= self.sent_at + timedelta(hours=self.DISPUTE_WINDOW_HOURS)

    @classmethod
    def auto_accept_overdue(cls, now=None):
        """
        Accept every sent confirmation whose 48-hour window has elapsed.
        Returns the number of confirmations auto-accepted.
        """
        now = now or timezone.now()
        cutoff = now - timedelta(hours=cls.DISPUTE_WINDOW_HOURS)
        overdue = list(cls.objects.filter(status="sent", sent_at__lte=cutoff))
        for sc in overdue:
            sc.status = "accepted"
            sc.auto_accepted = True
            sc.accepted_at = now
            sc.save(update_fields=["status", "auto_accepted", "accepted_at", "updated_at"])
        return len(overdue)


class DebitNote(TenantModel):
    """
    GC-023 Debit Note System (GC Manual p44, §16 Debits Management).

    Factory and supplier debits MUST be raised as soon as the issue is
    confirmed. It is a pro forma debit and is formally issued once all details
    are confirmed. Debits are sent out formally from the compliance mail
    address, cc'ing the person raising the debit and the necessary teams, then
    managed by the senior finance team until paid.
    """
    DEBIT_TYPE_CHOICES = [
        ("fabric_over_tolerance", "Fabric Over-Tolerance"),
        ("fabric_shortage", "Fabric Shortage (Trimmings)"),
        ("trims_shortage", "Trims Shortage"),
        ("final_hit_shortage", "Final Hit Shortage"),
        ("other", "Other"),
    ]
    PARTY_TYPE_CHOICES = [
        ("factory", "Factory"),
        ("fabric_supplier", "Fabric Supplier"),
        ("trim_supplier", "Trim Supplier"),
        ("other", "Other"),
    ]
    STATUS_CHOICES = [
        ("pro_forma", "Pro Forma"),
        ("issued", "Issued"),
        ("paid", "Paid"),
    ]
    DEFAULT_COMPLIANCE_EMAIL = "compliance@bhms.local"

    debit_number = models.CharField(max_length=50, unique=True)
    debit_type = models.CharField(max_length=40, choices=DEBIT_TYPE_CHOICES, default="other")
    party_type = models.CharField(max_length=30, choices=PARTY_TYPE_CHOICES, default="factory")
    debited_party = models.CharField(max_length=255, blank=True)
    purchase_order = models.ForeignKey(
        "merchandising.PurchaseOrder",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="debit_notes",
    )
    reconciliation = models.ForeignKey(
        "logistics.FinalHitReconciliation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="debit_notes",
        help_text="Final-hit reconciliation that triggered a >20-unit shortage debit",
    )
    amount = models.DecimalField(
        max_digits=12, decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    currency = models.ForeignKey(
        "setup.Currency",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="debit_notes",
    )
    shortage_units = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Units short for shortage-type debits (e.g. final hits > 20)",
    )
    tolerance_pct = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("5.00"),
        help_text="Tolerance the debit was raised against (5% default, 2% Primark/Penney)",
    )
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pro_forma")
    compliance_email = models.CharField(max_length=255, default=DEFAULT_COMPLIANCE_EMAIL)
    compliance_email_sent = models.BooleanField(default=False)
    email_sent_at = models.DateTimeField(null=True, blank=True)
    raised_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="debit_notes_raised",
    )
    raised_at = models.DateTimeField(auto_now_add=True)
    issued_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ["tenant", "debit_number"]
        verbose_name = "Debit Note"
        verbose_name_plural = "Debit Notes"

    def __str__(self):
        return f"{self.debit_number} ({self.get_status_display()})"

    def issue(self):
        """
        Formally issue a pro forma debit: sent out from the compliance mail
        address, cc'ing the person raising it (recorded as the compliance
        email send). Only legal from pro_forma.
        """
        if self.status != "pro_forma":
            raise ValueError(f"Cannot issue debit note in '{self.status}' status")
        now = timezone.now()
        self.status = "issued"
        self.issued_at = now
        self.compliance_email_sent = True
        self.email_sent_at = now
        self.save(update_fields=[
            "status", "issued_at", "compliance_email_sent", "email_sent_at", "updated_at",
        ])

    def mark_paid(self):
        """Mark an issued debit as paid (senior finance)."""
        if self.status != "issued":
            raise ValueError(f"Cannot mark debit note '{self.status}' as paid")
        self.status = "paid"
        self.paid_at = timezone.now()
        self.save(update_fields=["status", "paid_at", "updated_at"])


class InvoiceApproval(TenantModel):
    """
    RQ-035 / GC-024: Fabric and trimmings invoice approvals (GC Manual p44,
    §17 Invoice Approvals).

    GC: "Quantity – Date – Price must match the information on GC.
    Over-tolerance fabric quantities should have debit raised corresponding."
    Planners sign off the factory invoice, then hand over to accounts. Auto
    approvals via the accounts package are a future enhancement: the
    ``auto_approval_eligible`` flag is computed here but no actual
    auto-approval happens in this module.
    """
    INVOICE_TYPE_CHOICES = [
        ("fabric", "Fabric"),
        ("trimmings", "Trimmings"),
        ("factory", "Factory"),
    ]
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]

    invoice_number = models.CharField(max_length=50, unique=True)
    invoice_type = models.CharField(
        max_length=20, choices=INVOICE_TYPE_CHOICES, default="fabric",
    )
    purchase_order = models.ForeignKey(
        "merchandising.PurchaseOrder",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoice_approvals",
    )
    invoice_date = models.DateField(null=True, blank=True)
    quantity = models.DecimalField(
        max_digits=15, decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    unit_price = models.DecimalField(
        max_digits=15, decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    amount = models.DecimalField(
        max_digits=15, decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    currency = models.ForeignKey(
        "setup.Currency",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoice_approvals",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    rejection_reason = models.TextField(blank=True)
    debit_note = models.OneToOneField(
        DebitNote,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoice_approval",
        help_text="Linked pro forma debit raised for an over-tolerance invoice (GC-023)",
    )
    approved_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoice_approvals_approved",
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    rejected_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoice_approvals_rejected",
    )
    rejected_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ["tenant", "invoice_number"]
        verbose_name = "Invoice Approval"
        verbose_name_plural = "Invoice Approvals"

    def __str__(self):
        return f"{self.invoice_number} ({self.get_status_display()})"

    # ---- Matching vs GC data (RQ-031 tolerance rule single-sourced) ----

    @property
    def tolerance_pct(self):
        """5% default, 2% for Primark/Penney's (reuses RQ-031 service)."""
        from apps.logistics.services.paperwork_comparison import PaperworkComparisonService
        if not self.purchase_order_id or not self.purchase_order.buyer_id:
            return PaperworkComparisonService.TOLERANCE_PCT_DEFAULT
        return PaperworkComparisonService.tolerance_pct_for_buyer(self.purchase_order.buyer)

    @property
    def po_quantity(self):
        return Decimal(self.purchase_order.quantity) if self.purchase_order_id else None

    @property
    def quantity_variance(self):
        """Invoiced quantity minus the PO ordered quantity."""
        if self.po_quantity is None:
            return None
        return (self.quantity - self.po_quantity).quantize(Decimal("0.01"))

    @property
    def quantity_variance_pct(self):
        if self.po_quantity:
            return (self.quantity_variance / self.po_quantity * Decimal("100")).quantize(Decimal("0.01"))
        return None

    @property
    def over_tolerance(self):
        pct = self.quantity_variance_pct
        return pct is not None and pct > self.tolerance_pct

    @property
    def quantity_matches(self):
        pct = self.quantity_variance_pct
        if pct is None:
            return True
        return abs(pct) <= self.tolerance_pct

    @property
    def price_matches(self):
        if not self.purchase_order_id:
            return True
        return self.unit_price == Decimal(self.purchase_order.unit_price)

    @property
    def amount_matches(self):
        expected = (self.quantity * self.unit_price).quantize(Decimal("0.01"))
        return self.amount == expected

    @property
    def date_matches(self):
        if not self.purchase_order_id or not self.purchase_order.delivery_date:
            return True
        return self.invoice_date is not None and self.invoice_date >= self.purchase_order.delivery_date

    @property
    def is_match(self):
        return all([
            self.quantity_matches,
            self.price_matches,
            self.amount_matches,
            self.date_matches,
        ])

    @property
    def match_status(self):
        if self.over_tolerance:
            return "over_tolerance"
        if self.is_match:
            return "match"
        return "mismatch"

    @property
    def mismatch_reasons(self):
        reasons = []
        if not self.quantity_matches:
            reasons.append("quantity")
        if not self.price_matches:
            reasons.append("price")
        if not self.amount_matches:
            reasons.append("amount")
        if not self.date_matches:
            reasons.append("date")
        return reasons

    @property
    def auto_approval_eligible(self):
        """Exact matches are eligible for the future accounts-package auto-approval."""
        return self.match_status == "match"

    # ---- Lifecycle ----

    def approve(self, user):
        """Planner signs off the invoice; hands over to accounts."""
        if self.status != "pending":
            raise ValueError(f"Cannot approve invoice in '{self.status}' status")
        self.status = "approved"
        self.approved_by = user
        self.approved_at = timezone.now()
        self.save(update_fields=["status", "approved_by", "approved_at", "updated_at"])

    def reject(self, reason, user):
        """Reject a pending invoice; a reason is required."""
        if self.status != "pending":
            raise ValueError(f"Cannot reject invoice in '{self.status}' status")
        reason = (reason or "").strip()
        if not reason:
            raise ValueError("A rejection reason is required")
        self.status = "rejected"
        self.rejection_reason = reason
        self.rejected_by = user
        self.rejected_at = timezone.now()
        self.save(update_fields=[
            "status", "rejection_reason", "rejected_by", "rejected_at", "updated_at",
        ])

    def raise_debit(self, user):
        """Raise a pro forma debit for over-tolerance fabric (GC-023)."""
        import uuid
        if not self.over_tolerance:
            raise ValueError("A debit can only be raised for over-tolerance invoices")
        if not self.purchase_order_id:
            raise ValueError("A purchase order is required to raise a debit")
        po = self.purchase_order
        variance = self.quantity_variance
        debit = DebitNote.objects.create(
            tenant=self.tenant,
            debit_number=f"DN-{uuid.uuid4().hex[:8].upper()}",
            debit_type="fabric_over_tolerance" if self.invoice_type == "fabric" else "other",
            party_type="factory",
            debited_party=po.factory.name if po.factory_id else "",
            purchase_order=po,
            amount=(variance * self.unit_price).quantize(Decimal("0.01")),
            tolerance_pct=self.tolerance_pct,
            reason=(
                f"Over-tolerance {self.invoice_type} on {self.invoice_number}: "
                f"{variance} units over PO {po.po_number} ({self.tolerance_pct}% tolerance)"
            ),
            raised_by=user,
        )
        self.debit_note = debit
        self.save(update_fields=["debit_note", "updated_at"])
        return debit
