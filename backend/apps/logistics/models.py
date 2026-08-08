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
