from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models, transaction

from apps.core.models import TenantModel
from apps.setup.models import RiskLevel


class FabricCategory(TenantModel):
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=255)
    parent = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="children",
    )
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["code"]
        unique_together = ["tenant", "code"]
        verbose_name = "Fabric Category"
        verbose_name_plural = "Fabric Categories"

    def __str__(self):
        return f"{self.code} - {self.name}"


class HTSCode(TenantModel):
    code = models.CharField(max_length=20)
    description = models.TextField(blank=True)
    fabric_category = models.ForeignKey(
        FabricCategory, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="hts_codes",
    )
    duty_rate = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)

    class Meta:
        ordering = ["code"]
        unique_together = ["tenant", "code"]
        verbose_name = "HTS Code"
        verbose_name_plural = "HTS Codes"

    def __str__(self):
        return f"{self.code} - {self.description}" if self.description else self.code


class FabricSupplier(TenantModel):
    code = models.CharField(max_length=50)
    name = models.CharField(max_length=255)
    vendor = models.ForeignKey(
        "setup.Vendor", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="fabric_suppliers",
    )
    contact_person = models.CharField(max_length=255, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    country = models.ForeignKey(
        "setup.Country", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="fabric_suppliers",
    )
    lead_time_days = models.IntegerField(null=True, blank=True)
    moq_meters = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    is_mill = models.BooleanField(default=False)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["code"]
        unique_together = ["tenant", "code"]
        verbose_name = "Fabric Supplier"
        verbose_name_plural = "Fabric Suppliers"

    def __str__(self):
        return f"{self.code} - {self.name}"


class FabricMill(TenantModel):
    code = models.CharField(max_length=50)
    name = models.CharField(max_length=255)
    country = models.ForeignKey(
        "setup.Country", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="fabric_mills",
    )
    city = models.CharField(max_length=100, blank=True)
    capacity_meters_month = models.IntegerField(null=True, blank=True)
    rating = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    certification = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["code"]
        unique_together = ["tenant", "code"]
        verbose_name = "Fabric Mill"
        verbose_name_plural = "Fabric Mills"

    def __str__(self):
        return f"{self.code} - {self.name}"


class RFQ(TenantModel):
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("sent", "Sent"),
        ("responded", "Responded"),
        ("closed", "Closed"),
        ("cancelled", "Cancelled"),
    ]
    rfq_number = models.CharField(max_length=50)
    supplier = models.ForeignKey(
        FabricSupplier, on_delete=models.CASCADE, related_name="rfqs",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    notes = models.TextField(blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ["tenant", "rfq_number"]

    def __str__(self):
        return self.rfq_number


class RFQLineItem(TenantModel):
    rfq = models.ForeignKey(RFQ, on_delete=models.CASCADE, related_name="line_items")
    fabric_category = models.ForeignKey(
        FabricCategory, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="rfq_line_items",
    )
    quantity_meters = models.DecimalField(max_digits=10, decimal_places=2)
    target_price = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        cat = self.fabric_category.code if self.fabric_category else "N/A"
        return f"{self.rfq.rfq_number} - {cat} - {self.quantity_meters}m"


class RFQResponse(TenantModel):
    rfq = models.ForeignKey(RFQ, on_delete=models.CASCADE, related_name="responses")
    supplier = models.ForeignKey(
        FabricSupplier, on_delete=models.CASCADE, related_name="rfq_responses",
    )
    response_date = models.DateField(null=True, blank=True)
    valid_until = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Response to {self.rfq.rfq_number} from {self.supplier.name}"


class RFQResponseItem(TenantModel):
    response = models.ForeignKey(
        RFQResponse, on_delete=models.CASCADE, related_name="response_items",
    )
    line_item = models.ForeignKey(
        RFQLineItem, on_delete=models.CASCADE, related_name="response_items",
    )
    quoted_price = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    available_qty_meters = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    lead_days = models.IntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Response item for {self.line_item}"


class FabricBooking(TenantModel):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("booked", "Booked"),
        ("confirmed", "Confirmed"),
        ("in_transit", "In Transit"),
        ("delivered", "Delivered"),
        ("cancelled", "Cancelled"),
    ]
    booking_number = models.CharField(max_length=50)
    supplier = models.ForeignKey(
        FabricSupplier, on_delete=models.CASCADE, related_name="bookings",
    )
    fabric_category = models.ForeignKey(
        FabricCategory, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="bookings",
    )
    quantity_meters = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    origin_country = models.ForeignKey(
        "setup.Country", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="fabric_bookings",
    )
    expected_delivery = models.DateField(null=True, blank=True)
    actual_delivery = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ["tenant", "booking_number"]

    def __str__(self):
        return self.booking_number


class FabricOrder(TenantModel):
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("submitted", "Submitted"),
        ("lab_dip_pending", "Lab Dip Pending"),
        ("lab_dip_approved", "Lab Dip Approved"),
        ("bulk_approved", "Bulk Approved"),
        ("in_production", "In Production"),
        ("shipped", "Shipped"),
        ("delivered", "Delivered"),
        ("cancelled", "Cancelled"),
    ]
    order_number = models.CharField(max_length=50)
    supplier = models.ForeignKey(
        FabricSupplier, on_delete=models.CASCADE, related_name="fabric_orders",
    )
    fabric_category = models.ForeignKey(
        FabricCategory, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="fabric_orders",
    )
    quantity_meters = models.DecimalField(max_digits=12, decimal_places=2)
    unit_price = models.DecimalField(max_digits=10, decimal_places=4)
    total_price = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    lab_dip_required_date = models.DateField(null=True, blank=True)
    lab_dip_actual_date = models.DateField(null=True, blank=True)
    lab_dip_approval_date = models.DateField(null=True, blank=True)
    lab_dip_notes = models.TextField(blank=True)
    bulk_approved_date = models.DateField(null=True, blank=True)
    bulk_approved_by = models.ForeignKey(
        "users.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="bulk_approved_orders",
    )
    bulk_approved_notes = models.TextField(blank=True)
    strike_off_required_date = models.DateField(null=True, blank=True)
    strike_off_actual_date = models.DateField(null=True, blank=True)
    strike_off_approval_date = models.DateField(null=True, blank=True)
    onboard_date = models.DateField(null=True, blank=True)
    eta_date = models.DateField(null=True, blank=True)
    actual_arrival_date = models.DateField(null=True, blank=True)
    paperwork_date = models.DateField(null=True, blank=True)
    clearance_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    risk_level = models.ForeignKey(
        RiskLevel, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="fabric_orders",
    )
    risk_notes = models.TextField(blank=True)
    date_owners = models.JSONField(default=dict, blank=True)

    FABRIC_DATE_KEYS = ["lab_dip", "strike_off", "onboard", "eta", "actual_arrival", "paperwork", "clearance"]

    class Meta:
        ordering = ["-created_at"]
        unique_together = ["tenant", "order_number"]
        verbose_name = "Fabric Order"
        verbose_name_plural = "Fabric Orders"

    def __str__(self):
        return self.order_number

    def effective_owner(self, date_key):
        """Role responsible for a schedule date, per the GC handoff chain:
        sales (pre-dip) -> merchandising (dip->bulk) -> planning (bulk+);
        clearance + arrival/paperwork = logistics."""
        override = (self.date_owners or {}).get(date_key)
        if override:
            return override
        if date_key in ("clearance", "actual_arrival", "paperwork"):
            return "logistics"
        if date_key in ("lab_dip", "strike_off"):
            return "merchandising" if self.bulk_approved_date else "sales"
        if date_key in ("onboard", "eta"):
            if self.bulk_approved_date:
                return "planning"
            if self.lab_dip_approval_date:
                return "merchandising"
            return "sales"
        return None

    def effective_owners(self):
        return {key: self.effective_owner(key) for key in self.FABRIC_DATE_KEYS}

    OWNER_CHAIN = {
        "lab_dip": ["sales", "merchandising"],
        "strike_off": ["sales", "merchandising"],
        "onboard": ["sales", "merchandising", "planning"],
        "eta": ["sales", "merchandising", "planning"],
        "actual_arrival": ["logistics"],
        "paperwork": ["logistics"],
        "clearance": ["logistics"],
    }

    def next_owner(self, date_key, role):
        """Next role in the GC handoff chain for a date key (or None)."""
        chain = self.OWNER_CHAIN.get(date_key) or []
        try:
            idx = chain.index(role)
        except ValueError:
            return None
        if idx + 1 < len(chain):
            return chain[idx + 1]
        return None

    def schedule_handoff(self, date_key, from_role, to_role, by_user=None,
                         trigger="manual", notes=""):
        """Record a handoff: update date_owners override + append audit row.
        Raises ValueError for unknown date keys or invalid chain transitions."""
        if date_key not in self.OWNER_CHAIN:
            raise ValueError(f"Unknown date key '{date_key}'")
        if self.next_owner(date_key, from_role) != to_role:
            raise ValueError(
                f"Cannot hand {date_key} from {from_role} to {to_role} "
                f"(next owner is {self.next_owner(date_key, from_role)})"
            )
        with transaction.atomic():
            self.date_owners = {**(self.date_owners or {}), date_key: to_role}
            self.save(update_fields=["date_owners", "updated_at"])
            return FabricScheduleHandoff.objects.create(
                tenant_id=self.tenant_id, order=self,
                date_key=date_key, from_role=from_role, to_role=to_role,
                trigger=trigger, handed_off_by=by_user, notes=notes,
            )

    def handoff_on_dip_approval(self, user=None):
        """Dip approval hands onboard/eta from sales to merchandising."""
        for key in ("onboard", "eta"):
            if self.effective_owner(key) == "sales":
                self.schedule_handoff(
                    key, "sales", "merchandising",
                    by_user=user, trigger="dip_approved",
                )

    def handoff_on_bulk_approval(self, user=None):
        """Bulk approval hands onboard/eta to planning + lab_dip to
        merchandising (from the pre-bulk owners)."""
        for key in ("onboard", "eta"):
            cur = self.effective_owner(key)
            if cur == "merchandising":
                self.schedule_handoff(
                    key, cur, "planning",
                    by_user=user, trigger="bulk_approved",
                )
        cur = self.effective_owner("lab_dip")
        if cur == "sales":
            self.schedule_handoff(
                "lab_dip", cur, "merchandising",
                by_user=user, trigger="bulk_approved",
            )

    def recompute_risk(self):
        """GC Fabric Risk setting: none -> amber (bulk + dates approved) -> green
        (cleared/confirmed); a manually set RED is never downgraded by policy."""
        if self.risk_level and self.risk_level.code == "red":
            return "red"
        if self.clearance_date or self.status == "delivered":
            return "green"
        if self.bulk_approved_date and self.onboard_date:
            return "amber"
        return "none"

    def apply_risk_policy(self):
        """Persist the recomputed risk level to risk_level FK (no-op without a
        matching RiskLevel row, so callers without risk levels never break)."""
        code = self.recompute_risk()
        try:
            level = RiskLevel.objects.get(tenant_id=self.tenant_id, code=code)
        except RiskLevel.DoesNotExist:
            return None
        self.risk_level = level
        self.save(update_fields=["risk_level", "updated_at"])
        return code


class FabricTolerance(TenantModel):
    CUSTOMER_TYPE_CHOICES = [
        ("primark", "Primark/Penney's"),
        ("other", "Other Customers"),
        ("fur", "All Fur Orders"),
    ]
    customer_type = models.CharField(max_length=20, choices=CUSTOMER_TYPE_CHOICES)
    qty_from = models.DecimalField(max_digits=12, decimal_places=2)
    qty_to = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    tolerance_pct = models.DecimalField(max_digits=5, decimal_places=2)

    class Meta:
        ordering = ["customer_type", "qty_from"]
        unique_together = ["tenant", "customer_type", "qty_from"]
        verbose_name = "Fabric Tolerance"
        verbose_name_plural = "Fabric Tolerances"

    def __str__(self):
        upper = f"{self.qty_to}" if self.qty_to else "open"
        return f"{self.customer_type}: {self.qty_from}-{upper}m +/-{self.tolerance_pct}%"

    def tolerance_meters(self, quantity):
        pct = Decimal(self.tolerance_pct)
        return Decimal(quantity) * (pct / 100)

    @classmethod
    def tolerance_for(cls, customer_type, quantity):
        qty = Decimal(quantity)
        return cls.objects.filter(
            customer_type=customer_type,
            qty_from__lte=qty,
        ).filter(
            models.Q(qty_to__isnull=True) | models.Q(qty_to__gte=qty),
        ).order_by("qty_from").first()


class FabricScheduleHandoff(TenantModel):
    """Audit trail for RQ-020 role handoffs on fabric schedule dates
    (sales -> merchandising -> planning; clearance -> logistics)."""

    TRIGGER_CHOICES = [
        ("dip_approved", "Lab Dip Approved"),
        ("bulk_approved", "Bulk Approved"),
        ("manual", "Manual Handoff"),
    ]
    order = models.ForeignKey(
        FabricOrder, on_delete=models.CASCADE, related_name="schedule_handoffs",
    )
    date_key = models.CharField(max_length=30)
    from_role = models.CharField(max_length=30)
    to_role = models.CharField(max_length=30)
    trigger = models.CharField(max_length=20, choices=TRIGGER_CHOICES, default="manual")
    handed_off_by = models.ForeignKey(
        "users.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="schedule_handoffs",
    )
    handed_off_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["handed_off_at", "-id"]
        verbose_name = "Fabric Schedule Handoff"
        verbose_name_plural = "Fabric Schedule Handoffs"

    def __str__(self):
        return f"{self.order.order_number} {self.date_key}: {self.from_role} -> {self.to_role}"


class FabricUtilization(TenantModel):
    """Fabric utilization record (GC-030): excess fabric identified at docket
    stage, final rating vs actual rating, and quarterly mill performance.

    One record per order per period (YYYY-MM) captures what was received
    (actual rating) versus ordered (final rating) and how the received meters
    were consumed (used / wasted / damaged). Derived quantities are computed
    from these raw figures rather than stored.
    """

    order = models.ForeignKey(
        FabricOrder, on_delete=models.CASCADE, related_name="utilizations",
    )
    period = models.CharField(max_length=7, help_text="YYYY-MM")
    received_meters = models.DecimalField(
        max_digits=12, decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
    )
    used_meters = models.DecimalField(
        max_digits=12, decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
    )
    wasted_meters = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0"),
        validators=[MinValueValidator(Decimal("0"))],
    )
    damaged_meters = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0"),
        validators=[MinValueValidator(Decimal("0"))],
    )
    notes = models.TextField(blank=True)
    recorded_by = models.ForeignKey(
        "users.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="fabric_utilizations",
    )
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-period", "-id"]
        unique_together = ["tenant", "order", "period"]
        verbose_name = "Fabric Utilization"
        verbose_name_plural = "Fabric Utilizations"

    def __str__(self):
        return f"{self.order.order_number} {self.period} util"

    @staticmethod
    def _pct(numerator, denominator):
        numerator = Decimal(numerator)
        denominator = Decimal(denominator)
        if not denominator:
            return Decimal("0")
        return (numerator / denominator * 100).quantize(Decimal("0.01"))

    def ordered_meters(self):
        return Decimal(self.order.quantity_meters)

    def over_under_meters(self):
        """Final rating vs actual rating: received minus ordered."""
        return Decimal(self.received_meters) - Decimal(self.order.quantity_meters)

    def over_under_pct(self):
        return self._pct(self.over_under_meters(), self.order.quantity_meters)

    def accounted_meters(self):
        return (
            Decimal(self.used_meters)
            + Decimal(self.wasted_meters)
            + Decimal(self.damaged_meters)
        )

    def excess_meters(self):
        """Received meters not accounted for by used/wasted/damaged."""
        return Decimal(self.received_meters) - self.accounted_meters()

    def efficiency_pct(self):
        return self._pct(self.used_meters, self.received_meters)
