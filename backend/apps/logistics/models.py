"""
Logistics models for BHMS.
"""
from datetime import timedelta
from decimal import Decimal

from django.db import models
from django.utils import timezone

from apps.core.models import TenantModel


class FreightForwarder(TenantModel):
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=50, unique=True)
    contact_person = models.CharField(max_length=200, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    phone = models.CharField(max_length=50, null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    country = models.CharField(max_length=100, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.code})"


class Shipment(TenantModel):
    STATUS_CHOICES = [
        ("booking", "Booking"),
        ("booked", "Booked"),
        ("picked_up", "Picked Up"),
        ("in_transit", "In Transit"),
        ("at_port", "At Port"),
        ("on_water", "On Water"),
        ("arrived", "Arrived"),
        ("cleared", "Cleared"),
        ("delivered", "Delivered"),
        ("cancelled", "Cancelled"),
    ]
    MODE_CHOICES = [
        ("sea", "Sea"),
        ("air", "Air"),
        ("road", "Road"),
        ("rail", "Rail"),
        ("multi", "Multi-Modal"),
    ]

    shipment_number = models.CharField(max_length=50, unique=True)
    purchase_order = models.ForeignKey(
        "merchandising.PurchaseOrder",
        on_delete=models.CASCADE,
        related_name="shipments"
    )
    factory = models.ForeignKey(
        "setup.Factory",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="shipments"
    )
    freight_forwarder = models.ForeignKey(
        "FreightForwarder",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="shipments"
    )
    mode = models.CharField(max_length=20, choices=MODE_CHOICES, default="sea")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="booking")
    booking_date = models.DateField(null=True, blank=True)
    booking_reference = models.CharField(
        max_length=100, blank=True,
        help_text="Freight booking reference (managed by logistics)",
    )
    booking_ref_required_date = models.DateField(
        null=True, blank=True,
        help_text="Booking ref deadline: ETA minus 14 days (GC Manual)",
    )
    etd = models.DateField(null=True, blank=True, help_text="Estimated Time of Departure")
    eta = models.DateField(null=True, blank=True, help_text="Estimated Time of Arrival")
    atd = models.DateField(null=True, blank=True, help_text="Actual Time of Departure")
    ata = models.DateField(null=True, blank=True, help_text="Actual Time of Arrival")
    port_of_loading = models.CharField(max_length=200, null=True, blank=True)
    port_of_discharge = models.CharField(max_length=200, null=True, blank=True)
    vessel_name = models.CharField(max_length=200, null=True, blank=True)
    voyage_number = models.CharField(max_length=100, null=True, blank=True)
    container_number = models.CharField(max_length=50, null=True, blank=True)
    seal_number = models.CharField(max_length=50, null=True, blank=True)
    container_size = models.CharField(max_length=20, null=True, blank=True, help_text="20GP, 40GP, 40HC")
    quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    weight_kg = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    cbm = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)
    marks = models.TextField(null=True, blank=True)
    remarks = models.TextField(null=True, blank=True)
    risk_level = models.ForeignKey(
        "setup.RiskLevel",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="shipments"
    )

    BOOKING_REF_MIN_DAYS = 14

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.shipment_number} ({self.status})"

    def _default_booking_ref_required_date(self):
        """Booking ref deadline = ETA minus 14 days (GC Manual minimum)."""
        if self.eta:
            return self.eta - timedelta(days=self.BOOKING_REF_MIN_DAYS)
        return None

    def save(self, *args, **kwargs):
        """Auto-derive the booking-ref deadline from ETA unless overridden.

        Derives when blank on create; re-derives when ETA moves and the
        stored value is still the previous derived default. A logistics
        manual override is always respected.
        """
        default = self._default_booking_ref_required_date()
        if default is not None:
            if self.booking_ref_required_date is None:
                self.booking_ref_required_date = default
            elif self.pk:
                old = type(self).objects.filter(pk=self.pk).only(
                    "eta", "booking_ref_required_date"
                ).first()
                if old is not None:
                    if self.booking_ref_required_date == old.booking_ref_required_date:
                        # Field unchanged: follow the new ETA if it was auto-derived.
                        if old.booking_ref_required_date == old._default_booking_ref_required_date():
                            self.booking_ref_required_date = default
                    # else: explicitly changed by the caller - respect the override.
        super().save(*args, **kwargs)

    @property
    def booking_ref_status(self):
        """'ok' reference filled or still in time; 'due' reference blank past
        the deadline; 'na' no deadline known."""
        if self.booking_reference:
            return "ok"
        if self.booking_ref_required_date is None:
            return "na"
        if timezone.localdate() >= self.booking_ref_required_date:
            return "due"
        return "ok"

    @classmethod
    def booking_ref_alerts(cls, tenant=None):
        """Shipments whose booking reference is blank past the deadline.

        GC Manual: booking ref must never be blank from 2 weeks before the
        delivery/arrival date.
        """
        qs = cls.objects.all() if tenant is None else cls.objects.filter(tenant=tenant)
        return qs.filter(
            booking_reference="",
            booking_ref_required_date__lte=timezone.localdate(),
        )


class BookingScheduleItem(TenantModel):
    """
    Weekly production booking schedule item (GC Booking Schedule).

    One row per shipment (optionally per hit) per week-ending date, tracking
    cut quantity, garments ready, ex-factory date and risk. Status flow:
    Live -> In Work (planning) -> Delivered (logistics).
    """
    STATUS_CHOICES = [
        ("live", "Live"),
        ("in_work", "In Work"),
        ("delivered", "Delivered"),
    ]

    shipment = models.ForeignKey(
        Shipment,
        on_delete=models.CASCADE,
        related_name="schedule_items"
    )
    hit = models.ForeignKey(
        "merchandising.Hit",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="schedule_items"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="live")
    cut_qty = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="Cut quantity filled by planner",
    )
    garments_ready_qty = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="Garments ready (fully packed)",
    )
    ex_factory_date = models.DateField(null=True, blank=True)
    ex_factory_notes = models.TextField(blank=True)
    risk_level = models.ForeignKey(
        "setup.RiskLevel",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="schedule_items"
    )
    week_ending = models.DateField(help_text="Week-ending date (Friday)")
    notes = models.TextField(blank=True)
    snapshot_date = models.DateTimeField(
        blank=True, null=True, editable=False,
        help_text="Timestamp of the last point-in-time snapshot capture",
    )
    snapshot_data = models.JSONField(
        blank=True, null=True, editable=False,
        help_text="Point-in-time snapshot JSON (cut/garments/ex-factory/status)",
    )

    class Meta:
        ordering = ["week_ending", "-created_at"]
        unique_together = ["tenant", "shipment", "week_ending", "hit"]
        verbose_name = "Booking Schedule Item"
        verbose_name_plural = "Booking Schedule Items"

    def __str__(self):
        return f"{self.shipment.shipment_number} - {self.week_ending}"


class ShippingDocument(TenantModel):
    DOCUMENT_TYPE_CHOICES = [
        ("pl", "Packing List"),
        ("ci", "Commercial Invoice"),
        ("bl", "Bill of Lading"),
        ("co", "Certificate of Origin"),
        ("fumigation", "Fumigation Certificate"),
        ("inspection", "Inspection Certificate"),
        ("insurance", "Insurance Certificate"),
        ("other", "Other"),
    ]

    shipment = models.ForeignKey(
        Shipment,
        on_delete=models.CASCADE,
        related_name="documents"
    )
    document_type = models.CharField(max_length=20, choices=DOCUMENT_TYPE_CHOICES)
    document_number = models.CharField(max_length=100, null=True, blank=True)
    document_date = models.DateField(null=True, blank=True)
    file = models.FileField(upload_to="shipping_docs/%Y/%m/")
    notes = models.TextField(null=True, blank=True)

    class Meta:
        ordering = ["-document_date"]

    def __str__(self):
        return f"{self.get_document_type_display()} - {self.shipment.shipment_number}"


class Docket(TenantModel):
    """
    Production docket (GC-020) linked to a shipment.

    Carries the centrally-saved contract price, date raised, delivery date and
    total fabric meters. Per the GC Manual, any fabric over 200 meters unusable
    after issuing the final docket must be sent to sales (Debbie & Palones) for
    direction on what to do with the extra fabric.
    """
    docket_number = models.CharField(max_length=50)
    shipment = models.ForeignKey(
        Shipment,
        on_delete=models.CASCADE,
        related_name="dockets",
    )
    contract_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    date_raised = models.DateField(null=True, blank=True)
    delivery_date = models.DateField(null=True, blank=True)
    total_fabric_meters = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    unused_fabric_meters = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    is_final = models.BooleanField(default=False)
    sales_notified = models.BooleanField(default=False)
    sales_notified_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ["tenant", "docket_number"]
        verbose_name = "Docket"
        verbose_name_plural = "Dockets"

    def __str__(self):
        return f"{self.docket_number} - {self.shipment.shipment_number}"

    @property
    def requires_sales_notification(self):
        """GC: fabric over 200m unusable after the final docket must go to sales."""
        return self.is_final and (self.unused_fabric_meters or 0) > 200

    def notify_sales(self):
        """Record that the docket was sent to sales (Debbie & Palones) for direction."""
        self.sales_notified = True
        self.sales_notified_at = timezone.now()
        self.save(update_fields=["sales_notified", "sales_notified_at"])


class ImportRecap(TenantModel):
    """
    RQ-043 (B2): Import Recap — fabric/trims inbound tracking.

    Reference Logistics Import Recap: supplier/vendor, factory, s/c no,
    invoice value, item category, qty, rolls/bales, container, B/L-HAWB,
    mode (Sea/Air), LC/FOC, vessel; milestone dates PCD/ETD/ETA/ATB/
    Unstuffed/In-house; clearing agent, docs workflow flag, status, remarks.
    """
    STATUS_CHOICES = [
        ("planned", "Planned"),
        ("in_transit", "In Transit"),
        ("arrived", "Arrived"),
        ("unstuffed", "Unstuffed"),
        ("in_house", "In House"),
        ("closed", "Closed"),
        ("cancelled", "Cancelled"),
    ]
    MODE_CHOICES = [
        ("sea", "Sea"),
        ("air", "Air"),
    ]
    LC_FOC_CHOICES = [
        ("lc", "LC"),
        ("foc", "FOC"),
    ]
    ITEM_CATEGORY_CHOICES = [
        ("fabric", "Fabric"),
        ("trims", "Trims"),
        ("labels", "Labels"),
        ("accessories", "Accessories"),
        ("packaging", "Packaging"),
        ("other", "Other"),
    ]

    supplier = models.ForeignKey(
        "setup.Vendor",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="import_recaps",
    )
    factory = models.ForeignKey(
        "setup.Factory",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="import_recaps",
    )
    s_c_number = models.CharField(max_length=60, blank=True)
    invoice_value = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    item_category = models.CharField(max_length=20, choices=ITEM_CATEGORY_CHOICES, default="fabric")
    quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    rolls_bales = models.PositiveIntegerField(null=True, blank=True)
    container = models.CharField(max_length=50, blank=True)
    bl_hawb = models.CharField(max_length=60, blank=True, help_text="Bill of Lading / HAWB number")
    mode = models.CharField(max_length=10, choices=MODE_CHOICES, default="sea")
    lc_foc = models.CharField(max_length=10, choices=LC_FOC_CHOICES, default="lc")
    vessel = models.CharField(max_length=100, blank=True)
    pcd_date = models.DateField(null=True, blank=True, help_text="PCD milestone date")
    etd_date = models.DateField(null=True, blank=True, help_text="ETD milestone date")
    eta_date = models.DateField(null=True, blank=True, help_text="ETA milestone date")
    atb_date = models.DateField(null=True, blank=True, help_text="ATB milestone date")
    unstuffed_date = models.DateField(null=True, blank=True, help_text="Unstuffed milestone date")
    in_house_date = models.DateField(null=True, blank=True, help_text="In-house milestone date")
    agent = models.CharField(max_length=120, blank=True, help_text="Clearing / shipping agent")
    docs_received = models.BooleanField(
        default=False,
        help_text="Import documents received (docs workflow flag)",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="planned")
    remarks = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Import Recap"
        verbose_name_plural = "Import Recaps"

    def __str__(self):
        return self.s_c_number or f"Import {self.pk}"


class ExportRecap(TenantModel):
    """
    RQ-044 (B3): Export Recap — per-hit landed economics.

    Reference Logistics Export Recap: identifiers (FOB no, factory & customer
    invoice + dates, S/C), quantities, FOB/CMPT/cost values + service %,
    logistics (ex-factory, mode, forwarder, HBL, on-board/ETA, container, BL,
    courier), and the payment-to-factory + payment-from-customer pipelines
    (terms, due date, received, overdue).
    """
    MODE_CHOICES = [
        ("sea", "Sea"),
        ("air", "Air"),
    ]

    purchase_order = models.ForeignKey(
        "merchandising.PurchaseOrder",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="export_recaps",
    )
    factory = models.ForeignKey(
        "setup.Factory",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="export_recaps",
    )
    forwarder = models.ForeignKey(
        "FreightForwarder",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="export_recaps",
    )
    fob_no = models.CharField(max_length=60, blank=True, help_text="FOB identifier")
    s_c_number = models.CharField(max_length=60, blank=True)
    factory_invoice = models.CharField(max_length=80, blank=True, help_text="Factory invoice number")
    factory_invoice_date = models.DateField(null=True, blank=True)
    customer_invoice = models.CharField(max_length=80, blank=True, help_text="Customer invoice number")
    customer_invoice_date = models.DateField(null=True, blank=True)
    quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    fob_value = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    cmpt_value = models.DecimalField(max_digits=14, decimal_places=2, default=0, help_text="Cut Make Pack Trim value")
    cost_value = models.DecimalField(max_digits=14, decimal_places=2, default=0, help_text="Landed cost value")
    service_pct = models.DecimalField(max_digits=6, decimal_places=3, default=0, help_text="Service charge %")
    ex_factory_date = models.DateField(null=True, blank=True)
    mode = models.CharField(max_length=10, choices=MODE_CHOICES, default="sea")
    hbl = models.CharField(max_length=60, blank=True, help_text="House Bill of Lading")
    on_board_date = models.DateField(null=True, blank=True)
    eta_date = models.DateField(null=True, blank=True)
    container = models.CharField(max_length=50, blank=True)
    bl_number = models.CharField(max_length=60, blank=True, help_text="Bill of Lading number")
    courier = models.CharField(max_length=80, blank=True)
    factory_pay_terms = models.CharField(max_length=80, blank=True)
    factory_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    factory_due_date = models.DateField(null=True, blank=True)
    factory_paid_date = models.DateField(null=True, blank=True)
    customer_pay_terms = models.CharField(max_length=80, blank=True)
    customer_received_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    customer_due_date = models.DateField(null=True, blank=True)
    customer_payment_date = models.DateField(null=True, blank=True)
    remarks = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Export Recap"
        verbose_name_plural = "Export Recaps"

    def __str__(self):
        return self.fob_no or f"Export {self.pk}"

    @property
    def factory_payment_status(self):
        """paid / overdue / pending for the payment-to-factory pipeline."""
        if self.factory_paid_date:
            return "paid"
        if self.factory_due_date and self.factory_due_date < timezone.localdate():
            return "overdue"
        return "pending"

    @property
    def customer_payment_status(self):
        """received / overdue / pending for the payment-from-customer pipeline."""
        if self.customer_payment_date:
            return "received"
        if self.customer_due_date and self.customer_due_date < timezone.localdate():
            return "overdue"
        return "pending"


class FinalHitReconciliation(TenantModel):
    """
    GC-021 Final Hit Reconciliation.

    Raised when the booking schedule item for a hit is marked Delivered once
    the last hit has gone (GC Manual L1301). Compares the shipped quantity
    against the docket/PO quantity; anything more than 20 units short must be
    debited unless reasons are evident (GC Manual Reconciliation procedures).
    """
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("reconciled", "Reconciled"),
        ("debited", "Debited"),
        ("waived", "Waived"),
    ]

    shipment = models.ForeignKey(
        Shipment,
        on_delete=models.CASCADE,
        related_name="reconciliations",
    )
    schedule_item = models.ForeignKey(
        BookingScheduleItem,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reconciliation",
    )
    docket_quantity = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="Quantity per the docket / PO",
    )
    shipped_quantity = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="Quantity actually shipped",
    )
    shortage_units = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="Shortfall = docket quantity - shipped quantity (minimum 0)",
    )
    reasons_evident = models.BooleanField(
        default=False,
        help_text="Shortage explained by evident reasons (no debit required)",
    )
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    reconciled_at = models.DateTimeField(null=True, blank=True)
    reconciled_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reconciliations",
    )

    class Meta:
        ordering = ["-created_at"]
        unique_together = ["tenant", "shipment"]
        verbose_name = "Final Hit Reconciliation"
        verbose_name_plural = "Final Hit Reconciliations"

    def __str__(self):
        return f"{self.shipment.shipment_number} ({self.get_status_display()})"

    def save(self, *args, **kwargs):
        self.shortage_units = max(
            Decimal("0.00"),
            (self.docket_quantity or Decimal("0.00")) - (self.shipped_quantity or Decimal("0.00")),
        )
        super().save(*args, **kwargs)

    @property
    def is_short(self):
        return self.shortage_units > 0

    @property
    def requires_debit(self):
        """GC: anything over 20 units short must be debited unless reasons evident."""
        return self.shortage_units > Decimal("20.00")

    def reconcile(self, shipped_quantity=None, user=None):
        """Re-run the calculation and stamp the reconciliation as reconciled."""
        if shipped_quantity is not None:
            self.shipped_quantity = shipped_quantity
        self.status = "reconciled"
        self.reconciled_at = timezone.now()
        if user:
            self.reconciled_by = user
        self.save()
        return self.shortage_units, self.requires_debit


class SupplierPayment(TenantModel):
    """
    RQ-045 (B4): Supplier Payment + Due — SP log.

    Reference manual Supplier Payment / SP log: SP log CRUD, invoice-value
    allocation by FN, due pivot by supplier x month, to-be-released statuses,
    and a release workflow. Tied to a supplier (setup.Vendor), the PO/FN the
    payment settles, and an optional LC reference.
    """
    PAYMENT_METHODS = [
        ("TT", "TT"),
        ("LC", "LC"),
        ("FOC", "FOC"),
        ("cash", "Cash"),
    ]

    supplier = models.ForeignKey(
        "setup.Vendor",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="supplier_payments",
    )
    purchase_order = models.ForeignKey(
        "merchandising.PurchaseOrder",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="supplier_payments",
    )
    lc = models.ForeignKey(
        "commercial.LC",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="supplier_payments",
    )
    payment_ref = models.CharField(max_length=60, help_text="SP log reference")
    invoice_no = models.CharField(max_length=80, blank=True, help_text="Supplier invoice number")
    fn_ref = models.CharField(max_length=60, blank=True, help_text="File number (FN) reference")
    allocated_amount = models.DecimalField(
        max_digits=14, decimal_places=2, default=0,
        help_text="Invoice value allocated against the FN/PO",
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    currency = models.CharField(max_length=10, blank=True, default="USD")
    payment_date = models.DateField(null=True, blank=True, help_text="Actual payment date")
    due_date = models.DateField(null=True, blank=True)
    payment_method = models.CharField(max_length=10, choices=PAYMENT_METHODS, default="TT")
    released = models.BooleanField(default=False, help_text="Payment released for settlement")
    released_at = models.DateTimeField(null=True, blank=True)
    released_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="released_supplier_payments",
    )
    remarks = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Supplier Payment"
        verbose_name_plural = "Supplier Payments"

    def __str__(self):
        return self.payment_ref or f"SP {self.pk}"

    @property
    def payment_status(self):
        """released / overdue / to_be_released for the release workflow."""
        if self.released:
            return "released"
        if self.due_date and self.due_date < timezone.localdate():
            return "overdue"
        return "to_be_released"

    def release(self, user=None):
        """Stamp the payment as released (release workflow)."""
        self.released = True
        self.released_at = timezone.now()
        if user:
            self.released_by = user
        self.save(update_fields=["released", "released_at", "released_by"])


class CostReconciliation(TenantModel):
    """
    RQ-046 (B5): Cost update / reconcile.

    Compares the Factory Invoice (make price / MP) against the Planning CM for
    the same order, recording a point-in-time snapshot. Derives a Saving/Loss
    per unit and total by order/invoice quantity and flags a mismatch when the
    two sources differ. Mirrors the FinalHitReconciliation status workflow.
    """
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("reconciled", "Reconciled"),
        ("disputed", "Disputed"),
        ("resolved", "Resolved"),
    ]

    purchase_order = models.ForeignKey(
        "merchandising.PurchaseOrder",
        on_delete=models.CASCADE,
        related_name="cost_reconciliations",
    )
    export_recap = models.ForeignKey(
        ExportRecap,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cost_reconciliations",
        help_text="Optional source export recap supplying the factory invoice",
    )
    costing = models.ForeignKey(
        "merchandising.Costing",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cost_reconciliations",
        help_text="Optional live costing sheet supplying the planning CM",
    )
    factory_inv_amount = models.DecimalField(
        max_digits=14, decimal_places=2, default=0,
        help_text="Factory Invoice (MP) value for the order",
    )
    factory_inv_qty = models.DecimalField(
        max_digits=14, decimal_places=2, default=0,
        help_text="Invoice quantity for the factory side",
    )
    planning_cm_amount = models.DecimalField(
        max_digits=14, decimal_places=2, default=0,
        help_text="Planning CM value for the order",
    )
    planning_cm_qty = models.DecimalField(
        max_digits=14, decimal_places=2, default=0,
        help_text="Order quantity for the planning side",
    )
    factory_inv_per_unit = models.DecimalField(
        max_digits=14, decimal_places=4, default=0,
        help_text="Factory Invoice value divided by its quantity",
    )
    planning_cm_per_unit = models.DecimalField(
        max_digits=14, decimal_places=4, default=0,
        help_text="Planning CM value divided by its quantity",
    )
    saving_loss_per_unit = models.DecimalField(
        max_digits=14, decimal_places=4, default=0,
        help_text="Factory Inv per unit - Planning CM per unit (positive = saving, negative = loss)",
    )
    saving_loss_total = models.DecimalField(
        max_digits=14, decimal_places=2, default=0,
        help_text="Saving/Loss per unit x reference quantity",
    )
    is_mismatch = models.BooleanField(
        default=False,
        help_text="Factory Inv and Planning CM differ",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    notes = models.TextField(blank=True)
    reconciled_at = models.DateTimeField(null=True, blank=True)
    reconciled_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cost_reconciliations",
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Cost Reconciliation"
        verbose_name_plural = "Cost Reconciliations"

    def __str__(self):
        return f"{self.purchase_order.po_number} ({self.get_status_display()})"

    def _recompute(self):
        fi_per_unit = (
            (self.factory_inv_amount / self.factory_inv_qty)
            if self.factory_inv_qty else Decimal("0.00")
        )
        cm_per_unit = (
            (self.planning_cm_amount / self.planning_cm_qty)
            if self.planning_cm_qty else Decimal("0.00")
        )
        self.factory_inv_per_unit = fi_per_unit
        self.planning_cm_per_unit = cm_per_unit
        self.saving_loss_per_unit = fi_per_unit - cm_per_unit
        ref_qty = self.factory_inv_qty or self.planning_cm_qty
        self.saving_loss_total = (self.saving_loss_per_unit * ref_qty) if ref_qty else Decimal("0.00")
        self.is_mismatch = self.saving_loss_per_unit != 0

    def save(self, *args, **kwargs):
        self._recompute()
        super().save(*args, **kwargs)

    def compare(self, factory_inv_amount=None, planning_cm_amount=None,
                factory_inv_qty=None, planning_cm_qty=None, user=None):
        """Update the snapshot inputs and re-run the comparison."""
        if factory_inv_amount is not None:
            self.factory_inv_amount = factory_inv_amount
        if planning_cm_amount is not None:
            self.planning_cm_amount = planning_cm_amount
        if factory_inv_qty is not None:
            self.factory_inv_qty = factory_inv_qty
        if planning_cm_qty is not None:
            self.planning_cm_qty = planning_cm_qty
        self.save()
        return self.saving_loss_per_unit, self.saving_loss_total

    def resolve_status(self, status=None, user=None):
        """Set a workflow status and stamp the reconciliation."""
        if status:
            self.status = status
        self.reconciled_at = timezone.now()
        if user:
            self.reconciled_by = user
        self.save(update_fields=["status", "reconciled_at", "reconciled_by"])
        return self.status
        return self
