"""
Merchandising models for BHMS.
"""
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.utils import timezone

from apps.core.models import Note, TenantModel


class Style(TenantModel):
    """
    Style master model.
    """
    style_number = models.CharField(max_length=50)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    buyer = models.ForeignKey("setup.Buyer", on_delete=models.CASCADE, related_name="styles")
    brand = models.ForeignKey("setup.Brand", on_delete=models.SET_NULL, null=True, blank=True, related_name="styles")
    category = models.ForeignKey("setup.ProductCategory", on_delete=models.SET_NULL, null=True, blank=True, related_name="styles")
    product_type = models.ForeignKey("setup.ProductType", on_delete=models.SET_NULL, null=True, blank=True, related_name="styles")
    department = models.ForeignKey("setup.ProductDepartment", on_delete=models.SET_NULL, null=True, blank=True, related_name="styles")
    season = models.ForeignKey("setup.Season", on_delete=models.SET_NULL, null=True, blank=True, related_name="styles")
    tech_pack = models.FileField(upload_to="tech_packs/", blank=True, null=True)
    sketch_front = models.ImageField(upload_to="sketches/front/", blank=True, null=True)
    sketch_back = models.ImageField(upload_to="sketches/back/", blank=True, null=True)
    sketch_side = models.ImageField(upload_to="sketches/side/", blank=True, null=True)
    sketch_detail = models.ImageField(upload_to="sketches/detail/", blank=True, null=True)
    current_version = models.IntegerField(default=1)
    status = models.CharField(
        max_length=20,
        choices=[
            ("draft", "Draft"),
            ("active", "Active"),
            ("approved", "Approved"),
            ("archived", "Archived"),
        ],
        default="draft"
    )

    # ── Design info fields (techpack-equivalent, manual entry) ──────────
    block = models.CharField(max_length=100, blank=True, default="")
    based_on = models.CharField(max_length=100, blank=True, default="")
    relationship = models.CharField(
        max_length=20,
        choices=[
            ("new", "New"),
            ("based_on", "Based on"),
            ("na", "NA"),
            ("recut", "Recut"),
        ],
        default="new",
        blank=True,
    )
    customer = models.CharField(max_length=100, blank=True, default="")
    designer = models.CharField(max_length=100, blank=True, default="")
    pattern_cutter = models.CharField(max_length=100, blank=True, default="")
    issuer = models.CharField(max_length=100, blank=True, default="")
    cloth_code = models.CharField(max_length=255, blank=True, default="")
    size = models.CharField(max_length=50, blank=True, default="")
    length = models.CharField(max_length=50, blank=True, default="")
    issue_date = models.DateField(null=True, blank=True)
    risk_date = models.DateField(null=True, blank=True)
    pattern_request_date = models.DateField(null=True, blank=True)
    design_note = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-created_at"]
        unique_together = ["tenant", "style_number"]

    def __str__(self):
        return f"{self.style_number} - {self.name}"


class StyleVersion(TenantModel):
    """
    Style version model.
    """
    style = models.ForeignKey(Style, on_delete=models.CASCADE, related_name="versions")
    version_number = models.IntegerField()
    revision_notes = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=[
            ("draft", "Draft"),
            ("active", "Active"),
            ("approved", "Approved"),
        ],
        default="draft"
    )

    class Meta:
        ordering = ["-version_number"]
        unique_together = ["style", "version_number"]

    def __str__(self):
        return f"{self.style.style_number} V{self.version_number}"


class FileOpening(TenantModel):
    """
    File opening model.
    """
    file_number = models.CharField(max_length=50)
    style = models.ForeignKey(Style, on_delete=models.CASCADE, related_name="file_openings")
    style_version = models.ForeignKey(StyleVersion, on_delete=models.CASCADE, null=True, blank=True, related_name="file_openings")
    buyer = models.ForeignKey("setup.Buyer", on_delete=models.CASCADE, related_name="file_openings")
    brand = models.ForeignKey("setup.Brand", on_delete=models.SET_NULL, null=True, blank=True, related_name="file_openings")
    factory = models.ForeignKey("setup.Factory", on_delete=models.CASCADE, related_name="file_openings")
    file_date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=[
            ("open", "Open"),
            ("confirmed", "Confirmed"),
            ("closed", "Closed"),
            ("cancelled", "Cancelled"),
        ],
        default="open"
    )
    remarks = models.TextField(blank=True)
    risk_level = models.ForeignKey(
        "setup.RiskLevel",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="file_openings"
    )
    is_quick_lead = models.BooleanField(default=False)
    quick_lead_agreed_by = models.JSONField(default=list, blank=True)
    original_fn = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="repeats",
    )
    is_repeat = models.BooleanField(default=False)
    repeat_approved_by = models.JSONField(default=list, blank=True)
    is_stock_fabric = models.BooleanField(default=False)
    stock_fabric_description = models.TextField(blank=True)
    total_meters = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    allocated_meters = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    stock_photo = models.ImageField(upload_to="stock_fabric/", null=True, blank=True)

    QUICK_LEAD_PARTIES = [
        "sales", "buying", "customer", "technical", "planning", "merchandising",
    ]

    REPEAT_APPROVAL_PARTIES = [
        "technical", "trims",
    ]

    @property
    def quick_lead_flag(self):
        return "QL" if self.is_quick_lead else ""

    @property
    def quick_lead_agreement_complete(self):
        if not self.is_quick_lead:
            return False
        return all(p in self.quick_lead_agreed_by for p in self.QUICK_LEAD_PARTIES)

    @property
    def missing_agreements(self):
        if not self.is_quick_lead:
            return list(self.QUICK_LEAD_PARTIES)
        return [p for p in self.QUICK_LEAD_PARTIES if p not in self.quick_lead_agreed_by]

    def add_agreement(self, party):
        if not self.is_quick_lead:
            raise ValueError("Cannot agree on a non-quick-lead file opening")
        if party not in self.QUICK_LEAD_PARTIES:
            raise ValueError(f"Unknown quick lead party: {party}")
        if party not in self.quick_lead_agreed_by:
            self.quick_lead_agreed_by = self.quick_lead_agreed_by + [party]
            self.save(update_fields=["quick_lead_agreed_by", "updated_at"])

    def unmark_quick_lead(self):
        self.is_quick_lead = False
        self.quick_lead_agreed_by = []
        self.save(update_fields=["is_quick_lead", "quick_lead_agreed_by", "updated_at"])

    @property
    def original_fn_number(self):
        return self.original_fn.file_number if self.original_fn else ""

    @classmethod
    def next_file_number(cls, tenant):
        """Return the next FO-XXXX file number for a tenant."""
        import re
        existing = cls.objects.filter(
            tenant=tenant, file_number__startswith="FO-"
        ).values_list("file_number", flat=True)
        max_num = 1000
        for fn in existing:
            m = re.match(r"^FO-(\d+)$", fn)
            if m:
                max_num = max(max_num, int(m.group(1)))
        return f"FO-{max_num + 1:04d}"

    @property
    def repeat_approval_complete(self):
        if not self.is_repeat:
            return False
        return all(p in self.repeat_approved_by for p in self.REPEAT_APPROVAL_PARTIES)

    @property
    def missing_repeat_approvals(self):
        if not self.is_repeat:
            return list(self.REPEAT_APPROVAL_PARTIES)
        return [p for p in self.REPEAT_APPROVAL_PARTIES if p not in self.repeat_approved_by]

    def create_repeat(self):
        """
        Raise a repeat of this file opening, copying the order details across
        and linking back to the original FN.
        """
        repeat = FileOpening.objects.create(
            tenant=self.tenant,
            created_by=self.created_by,
            file_number=FileOpening.next_file_number(self.tenant),
            style=self.style,
            style_version=self.style_version,
            buyer=self.buyer,
            brand=self.brand,
            factory=self.factory,
            file_date=self.file_date,
            status="open",
            remarks=f"Repeat of {self.file_number}",
            is_repeat=True,
            original_fn=self,
        )
        return repeat

    def add_repeat_approval(self, party):
        if not self.is_repeat:
            raise ValueError("Cannot approve a non-repeat file opening")
        if party not in self.REPEAT_APPROVAL_PARTIES:
            raise ValueError(f"Unknown repeat approval party: {party}")
        if party not in self.repeat_approved_by:
            self.repeat_approved_by = self.repeat_approved_by + [party]
            self.save(update_fields=["repeat_approved_by", "updated_at"])

    @property
    def stock_balance_meters(self):
        return (self.total_meters or 0) - self.allocated_meters

    def mark_as_stock_fabric(self, stock_fabric_description, total_meters):
        """
        Move this file opening to a stock fabric FN with a swatch description
        and the total meters on hand.
        """
        if self.is_stock_fabric:
            raise ValueError("File opening is already marked as stock fabric")
        self.is_stock_fabric = True
        self.stock_fabric_description = stock_fabric_description
        self.total_meters = total_meters
        self.save(update_fields=[
            "is_stock_fabric", "stock_fabric_description", "total_meters", "updated_at",
        ])

    def allocate_stock(self, allocated_to, meters, notes=""):
        """
        Allocate meters from this stock fabric to another file number,
        recording the allocation and reducing the balance.
        """
        if not self.is_stock_fabric:
            raise ValueError("Cannot allocate from a non-stock file opening")
        if allocated_to is None:
            raise ValueError("Allocation target is required")
        if allocated_to == self:
            raise ValueError("Cannot allocate stock to itself")
        if meters <= 0:
            raise ValueError("Allocated meters must be positive")
        if meters > self.stock_balance_meters:
            raise ValueError("Insufficient stock balance")
        with transaction.atomic():
            allocation = StockFabricAllocation.objects.create(
                tenant=self.tenant,
                stock=self,
                allocated_to=allocated_to,
                meters=meters,
                notes=notes,
                allocated_date=timezone.localdate(),
                created_by=self.created_by,
            )
            self.allocated_meters = self.allocated_meters + meters
            self.save(update_fields=["allocated_meters", "updated_at"])
        return allocation

    class Meta:
        ordering = ["-created_at"]
        unique_together = ["tenant", "file_number"]

    def __str__(self):
        return f"{self.file_number} - {self.style.style_number}"


class StockFabricAllocation(TenantModel):
    """
    Ledger of meters allocated from a stock fabric FN to another file number.
    Records which file numbers consumed stock and how many meters, so the
    balance is always visible.
    """
    stock = models.ForeignKey(
        FileOpening, on_delete=models.CASCADE, related_name="stock_allocations",
    )
    allocated_to = models.ForeignKey(
        FileOpening, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="stock_allocations_in",
    )
    meters = models.DecimalField(max_digits=12, decimal_places=2)
    allocated_date = models.DateField(default=timezone.localdate)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Stock Fabric Allocation"
        verbose_name_plural = "Stock Fabric Allocations"

    @property
    def allocated_to_number(self):
        return self.allocated_to.file_number if self.allocated_to else ""

    def __str__(self):
        return f"{self.stock.file_number} -> {self.allocated_to_number} ({self.meters}m)"


class FileOpeningNote(Note):
    """
    Concrete note model for FileOpening.
    """
    file_opening = models.ForeignKey(
        FileOpening,
        on_delete=models.CASCADE,
        related_name="notes"
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Note on {self.file_opening.file_number}: {self.author_initials}"


class PurchaseOrder(TenantModel):
    """
    Purchase order model.
    """
    po_number = models.CharField(max_length=50)
    file_opening = models.ForeignKey(FileOpening, on_delete=models.SET_NULL, null=True, blank=True, related_name="purchase_orders")
    buyer = models.ForeignKey("setup.Buyer", on_delete=models.CASCADE, related_name="purchase_orders")
    brand = models.ForeignKey("setup.Brand", on_delete=models.SET_NULL, null=True, blank=True, related_name="purchase_orders")
    factory = models.ForeignKey("setup.Factory", on_delete=models.CASCADE, related_name="purchase_orders")
    po_date = models.DateField()
    delivery_date = models.DateField()
    destination_country = models.ForeignKey("setup.Country", on_delete=models.SET_NULL, null=True, blank=True, related_name="purchase_orders")
    destination_port = models.CharField(max_length=255, blank=True)
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_value = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.ForeignKey("setup.Currency", on_delete=models.SET_NULL, null=True, blank=True, related_name="purchase_orders")
    payment_terms = models.ForeignKey("setup.PaymentTerms", on_delete=models.SET_NULL, null=True, blank=True, related_name="purchase_orders")
    delivery_mode = models.ForeignKey("setup.DeliveryMode", on_delete=models.SET_NULL, null=True, blank=True, related_name="purchase_orders")
    status = models.CharField(
        max_length=20,
        choices=[
            ("draft", "Draft"),
            ("open", "Open"),
            ("confirmed", "Confirmed"),
            ("in_production", "In Production"),
            ("quality_check", "Quality Check"),
            ("ready", "Ready"),
            ("shipped", "Shipped"),
            ("delivered", "Delivered"),
            ("cancelled", "Cancelled"),
        ],
        default="draft"
    )
    remarks = models.TextField(blank=True)
    risk_level = models.ForeignKey(
        "setup.RiskLevel",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="purchase_orders"
    )

    class Meta:
        ordering = ["-created_at"]
        unique_together = ["tenant", "po_number"]

    def __str__(self):
        return f"{self.po_number} - {self.buyer.name}"


class POAmendment(TenantModel):
    """
    Purchase order amendment model.
    """
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name="amendments")
    amendment_number = models.CharField(max_length=50)
    field_name = models.CharField(max_length=100)
    old_value = models.TextField(blank=True)
    new_value = models.TextField()
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
    approved_by = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="approved_amendments")
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Amendment {self.amendment_number} - {self.purchase_order.po_number}"


class PurchaseOrderItem(TenantModel):
    """
    Purchase order line item model.
    """
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name="items")
    color = models.ForeignKey("setup.ColorCode", on_delete=models.CASCADE, related_name="po_items")
    size = models.CharField(max_length=50, blank=True)
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        ordering = ["color", "size"]

    def __str__(self):
        return f"{self.purchase_order.po_number} - {self.color.name} {self.size}"


class HitDeliveryMode(models.TextChoices):
    BOXED = "boxed", "Boxed"
    HANGING = "hanging", "Hanging"


class HitDeliveryType(models.TextChoices):
    SEA = "sea", "Sea"
    AIR = "air", "Air"


class Hit(TenantModel):
    """
    Production hit (breakdown) per PO colour.

    A hit is the production commitment for one colour of a purchase order
    (spanning all size lines of that colour). hit_number + colour form the
    production system key (GC Breakdown Tab).
    """
    purchase_order = models.ForeignKey(
        PurchaseOrder, on_delete=models.CASCADE, related_name="hits"
    )
    hit_number = models.CharField(max_length=50)
    colour = models.ForeignKey(
        "setup.ColorCode", on_delete=models.CASCADE, related_name="hits"
    )
    delivery_mode = models.CharField(
        max_length=20, choices=HitDeliveryMode.choices, default=HitDeliveryMode.BOXED
    )
    delivery_type = models.CharField(
        max_length=20, choices=HitDeliveryType.choices, default=HitDeliveryType.SEA
    )
    factory_override = models.ForeignKey(
        "setup.Factory",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="hit_overrides",
    )
    original_delivery_date = models.DateField(null=True, blank=True)
    actual_delivery_date = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ["tenant", "purchase_order", "colour"]

    def __str__(self):
        return f"{self.purchase_order.po_number} - {self.colour.name} ({self.hit_number})"


class FitStage(models.TextChoices):
    DEV = "dev", "Dev Spec"
    FIRST = "1st", "1st Fit"
    SECOND = "2nd", "2nd Fit"
    THIRD = "3rd", "3rd Fit"
    PP = "pp", "Pre-Production"


class FitSpec(TenantModel):
    """
    Fit specification sheet per purchase order (GC Technical tab).

    One fit spec per (order, stage, version); exactly one spec per order
    is marked is_current. Measurements are stored as JSON.
    """
    purchase_order = models.ForeignKey(
        PurchaseOrder, on_delete=models.CASCADE, related_name="fit_specs"
    )
    fit_stage = models.CharField(
        max_length=20, choices=FitStage.choices, default=FitStage.DEV
    )
    version = models.IntegerField(default=1)
    measurements = models.JSONField(default=dict, blank=True)
    images = models.JSONField(default=list, blank=True)
    notes = models.TextField(blank=True)
    is_current = models.BooleanField(default=False)

    class Meta:
        ordering = ["-is_current", "created_at"]
        unique_together = ["purchase_order", "fit_stage", "version"]

    def __str__(self):
        return f"{self.purchase_order.po_number} - {self.fit_stage} V{self.version}"


class BOM(TenantModel):
    """
    Bill of Materials model.
    """
    style_version = models.ForeignKey(StyleVersion, on_delete=models.CASCADE, related_name="boms")
    name = models.CharField(max_length=255)
    version = models.IntegerField(default=1)
    status = models.CharField(
        max_length=20,
        choices=[
            ("draft", "Draft"),
            ("active", "Active"),
            ("archived", "Archived"),
        ],
        default="draft"
    )

    class Meta:
        ordering = ["-version"]
        unique_together = ["style_version", "version"]

    def __str__(self):
        return f"{self.style_version} - {self.name} V{self.version}"


class TrimStatus(models.TextChoices):
    TBC = "TBC", "To Be Confirmed"
    ORDERED = "Ordered", "Ordered"
    PARTIAL = "Partial", "Partial Delivery"
    COMPLETED = "Completed", "Completed"


class BOMItem(TenantModel):
    """
    BOM line item model.
    """
    bom = models.ForeignKey(BOM, on_delete=models.CASCADE, related_name="items")
    category = models.CharField(max_length=50)
    item_name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    uom = models.ForeignKey("setup.UOM", on_delete=models.SET_NULL, null=True, blank=True, related_name="bom_items")
    consumption = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    waste_percent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    vendor = models.ForeignKey("setup.Vendor", on_delete=models.SET_NULL, null=True, blank=True, related_name="bom_items")
    supplier = models.ForeignKey("setup.Vendor", on_delete=models.SET_NULL, null=True, blank=True, related_name="supplied_bom_items")
    ordered_qty = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    delivered_qty = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    eta_date = models.DateField(null=True, blank=True)
    confirmed_date = models.DateField(null=True, blank=True)
    actual_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=TrimStatus.choices,
        default=TrimStatus.TBC,
    )
    location = models.CharField(max_length=100, null=True, blank=True, default="")
    colour = models.CharField(max_length=100, null=True, blank=True, default="")
    width_size = models.CharField(max_length=100, null=True, blank=True, default="")
    match = models.CharField(max_length=100, null=True, blank=True, default="")

    class Meta:
        ordering = ["category", "item_name"]

    def __str__(self):
        return f"{self.bom.name} - {self.item_name}"


class StyleItem(TenantModel):
    """
    Style-level line item (material template).
    Defines the material breakdown for a style before it's versioned into BOMs.
    Prices and units are confirmed during BOM/costing.
    """
    style = models.ForeignKey(Style, on_delete=models.CASCADE, related_name="items")
    category = models.CharField(max_length=50)
    item_name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    uom = models.ForeignKey("setup.UOM", on_delete=models.SET_NULL, null=True, blank=True, related_name="style_items")
    consumption = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    waste_percent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    vendor = models.ForeignKey("setup.Vendor", on_delete=models.SET_NULL, null=True, blank=True, related_name="style_items")
    sort_order = models.IntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "category", "item_name"]

    def __str__(self):
        return f"{self.style.style_number} - {self.item_name}"


class DesignImage(TenantModel):
    """
    Multiple design images per style with main/range/colourway roles.
    """
    style = models.ForeignKey(Style, on_delete=models.CASCADE, related_name="design_images")
    image = models.ImageField(upload_to="design_images/")
    role = models.CharField(
        max_length=20,
        choices=[
            ("main", "Main"),
            ("range", "Range"),
            ("colourway", "Colourway"),
            ("detail", "Detail"),
        ],
        default="main",
    )
    caption = models.CharField(max_length=255, blank=True)
    colourway = models.CharField(max_length=100, blank=True)
    sort_order = models.IntegerField(default=0)
    is_main = models.BooleanField(default=False)

    class Meta:
        ordering = ["sort_order", "-is_main", "created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["style", "is_main"],
                condition=models.Q(is_main=True),
                name="unique_main_design_image_per_style",
            ),
        ]

    def __str__(self):
        return f"{self.style.style_number} - {self.get_role_display()} image"


class Costing(TenantModel):
    """
    Costing model.

    Order-level costing sheet (GC Manual "Costing Tab — Filling in the Costing Sheet").
    RQ-013 (GC-031): standardized 8 cost categories, 5 sheet types (by factory
    location) with a live tick, and an exchange rate that converts USD costings
    into GBP for landed orders.
    """
    COST_CATEGORIES = [
        ("fabric", "Fabric"),
        ("trim", "Trims"),
        ("label", "Labels"),
        ("making", "Making (CM)"),
        ("overhead", "Overheads"),
        ("packaging", "Packaging"),
        ("freight", "Transport / Freight"),
        ("other", "Other"),
    ]

    SHEET_TYPES = [
        ("sl", "Sri Lanka"),
        ("vn", "Vietnam"),
        ("bd", "Bangladesh"),
        ("cn", "China"),
        ("other", "Other"),
    ]

    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name="costings")
    bom = models.ForeignKey("BOM", on_delete=models.SET_NULL, null=True, blank=True, related_name="costings")
    version = models.IntegerField(default=1)
    status = models.CharField(
        max_length=20,
        choices=[
            ("draft", "Draft"),
            ("pending", "Pending Approval"),
            ("approved", "Approved"),
            ("rejected", "Rejected"),
        ],
        default="draft"
    )
    sheet_type = models.CharField(max_length=10, choices=SHEET_TYPES, default="bd")
    is_live = models.BooleanField(default=True, help_text="Ticked live costing sheet for this order")
    exchange_rate = models.DecimalField(
        max_digits=12, decimal_places=6, null=True, blank=True,
        help_text="GBP per 1 USD; used to convert USD costings into GBP for landed orders"
    )
    target_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    fabric_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    trim_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    cm_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    overhead_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    margin = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    PATTERN_OPTIONS = [
        ("striped", "Striped"),
        ("checked", "Checked"),
        ("one_way", "One-way pattern"),
        ("match_point", "Match at specified points"),
    ]

    approved_by = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="approved_costings")
    approved_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, help_text="Free-text notes box on the design costing")
    is_single_size = models.BooleanField(default=False, help_text="Single-size costing; a watermark is shown over the image as it must not be used for production purposes")
    size_ratio = models.JSONField(default=list, blank=True, help_text="List of {size, ratio} entries stating the sizes and ratio for the costing")
    confirmed = models.BooleanField(default=False, help_text="Ticked only once the costing is confirmed with the customer")
    confirmed_by = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="confirmed_costings")
    confirmed_at = models.DateTimeField(null=True, blank=True)
    is_patterned = models.BooleanField(default=False, help_text="Patterned fabric requires additional options for an accurate costing")
    patterned_fabric_options = models.JSONField(default=list, blank=True, help_text="Subset of the 4 pattern options for patterned fabric")

    class Meta:
        ordering = ["-version"]
        unique_together = ["purchase_order", "version"]

    def __str__(self):
        return f"{self.purchase_order.po_number} - Costing V{self.version}"

    @property
    def landed_cost(self):
        """Total cost converted from USD into GBP (None until an exchange rate is set)."""
        if self.exchange_rate is None:
            return None
        return (self.total_cost * self.exchange_rate).quantize(Decimal("0.01"))

    @property
    def single_size_watermark(self):
        """Single-size costings display a watermark over the design image."""
        return self.is_single_size


class CostingLine(TenantModel):
    """
    Line item on a costing sheet (RQ-013 / GC-031).

    Every line belongs to one of the 8 standardized cost categories. Cost
    increases are added as "Additional" rows: the description is prefixed
    with "Additional" and `original_description` matches the original line,
    then approved by a user with a date (GC Manual "Changes to costs").
    """
    costing = models.ForeignKey(Costing, on_delete=models.CASCADE, related_name="lines")
    category = models.CharField(max_length=20, choices=Costing.COST_CATEGORIES)
    description = models.CharField(max_length=255)
    unit_price = models.DecimalField(max_digits=12, decimal_places=4, default=0)
    consumption = models.DecimalField(max_digits=10, decimal_places=4, default=0)
    is_additional = models.BooleanField(default=False)
    original_description = models.CharField(max_length=255, blank=True)
    approved_by = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="approved_costing_lines")
    approved_at = models.DateTimeField(null=True, blank=True)
    size_width = models.CharField(max_length=50, blank=True, help_text="Size / width column for costing-schedule accuracy")
    sort_order = models.IntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "created_at"]

    def __str__(self):
        return f"{self.costing} - {self.description}"

    @property
    def line_total(self):
        return (self.unit_price * self.consumption).quantize(Decimal("0.01"))

    def clean(self):
        if self.is_additional and not self.original_description:
            raise ValidationError({"original_description": "An additional cost line requires the original description."})
        super().clean()


class DesignCosting(TenantModel):
    """
    Style-level single-piece design costing (RQ-013 / G-12).

    The design cost is the source of truth for how much one garment costs,
    computed per Style (not per PurchaseOrder). It is the reference a PO
    costing is prepared from (see ``DesignCostingViewSet.prepare_po_costing``).
    Reuses the same 8 standardized cost categories / sheet types / pattern and
    single-size options as the order-level ``Costing``.
    """

    COST_CATEGORIES = Costing.COST_CATEGORIES
    SHEET_TYPES = Costing.SHEET_TYPES
    PATTERN_OPTIONS = Costing.PATTERN_OPTIONS

    style = models.ForeignKey(Style, on_delete=models.CASCADE, related_name="design_costings")
    version = models.IntegerField(default=1)
    status = models.CharField(
        max_length=20,
        choices=[
            ("draft", "Draft"),
            ("pending", "Pending Approval"),
            ("approved", "Approved"),
            ("rejected", "Rejected"),
        ],
        default="draft"
    )
    sheet_type = models.CharField(max_length=10, choices=SHEET_TYPES, default="bd")
    is_live = models.BooleanField(default=True, help_text="Ticked live design costing for this style")
    target_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    fabric_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    trim_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    cm_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    overhead_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    margin = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    is_single_size = models.BooleanField(default=False)
    size_ratio = models.JSONField(default=list, blank=True)
    is_patterned = models.BooleanField(default=False)
    patterned_fabric_options = models.JSONField(default=list, blank=True)
    approved_by = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="approved_design_costings")
    approved_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-version"]
        unique_together = ["tenant", "style", "version"]

    def __str__(self):
        return f"{self.style.style_number} - Design Costing V{self.version}"

    def save(self, *args, **kwargs):
        fabric = Decimal(str(self.fabric_cost or 0))
        trim = Decimal(str(self.trim_cost or 0))
        cm = Decimal(str(self.cm_cost or 0))
        overhead = Decimal(str(self.overhead_cost or 0))
        self.total_cost = (fabric + trim + cm + overhead).quantize(Decimal("0.01"))
        super().save(*args, **kwargs)

    @property
    def margin_percent(self):
        if self.total_cost and self.target_price and self.total_cost > 0:
            return round(float((self.target_price - self.total_cost) / self.total_cost * 100), 2)
        return None


class DesignCostingLine(TenantModel):
    """
    Line item on a Style-level design costing.

    Belongs to one of the 8 standardized cost categories; total cost is
    cached on the parent ``DesignCosting`` by the serializer / prepare action.
    """
    costing = models.ForeignKey(DesignCosting, on_delete=models.CASCADE, related_name="lines")
    category = models.CharField(max_length=20, choices=DesignCosting.COST_CATEGORIES)
    description = models.CharField(max_length=255)
    unit_price = models.DecimalField(max_digits=12, decimal_places=4, default=0)
    consumption = models.DecimalField(max_digits=10, decimal_places=4, default=0)
    size_width = models.CharField(max_length=50, blank=True)
    sort_order = models.IntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "created_at"]

    def __str__(self):
        return f"{self.costing} - {self.description}"

    @property
    def line_total(self):
        return (self.unit_price * self.consumption).quantize(Decimal("0.01"))


class TA(TenantModel):
    """
    Time & Action model.
    """
    purchase_order = models.OneToOneField(PurchaseOrder, on_delete=models.CASCADE, related_name="ta")
    status = models.CharField(
        max_length=20,
        choices=[
            ("active", "Active"),
            ("completed", "Completed"),
            ("delayed", "Delayed"),
        ],
        default="active"
    )
    delivery_date = models.DateField()
    critical_path = models.JSONField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"T&A - {self.purchase_order.po_number}"


class TAMilestone(TenantModel):
    """
    T&A Milestone model.
    """
    ta = models.ForeignKey(TA, on_delete=models.CASCADE, related_name="milestones")
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    planned_date = models.DateField()
    actual_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=[
            ("pending", "Pending"),
            ("in_progress", "In Progress"),
            ("completed", "Completed"),
            ("delayed", "Delayed"),
        ],
        default="pending"
    )
    assigned_to = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="ta_milestones")
    is_critical = models.BooleanField(default=False)
    sort_order = models.IntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "planned_date"]

    def __str__(self):
        return f"{self.ta} - {self.name}"


class JobType(models.TextChoices):
    PATTERN = "pattern", "Pattern"
    SAMPLE = "sample", "Sample"
    THREE_D = "3d", "3D"
    MINI_MARKER = "mini_marker", "Mini-Marker"
class JobPriority(models.IntegerChoices):
    LOW = 1, "Low"
    NORMAL = 2, "Normal"
    HIGH = 3, "High"
    URGENT = 4, "Urgent"


class JobStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    IN_PROGRESS = "in_progress", "In Progress"
    COMPLETED = "completed", "Completed"
    CANCELLED = "cancelled", "Cancelled"


class JobRequest(TenantModel):
    """
    Cross-department job request (pattern, sample, 3D, mini-marker).

    Jobs form a queue: highest priority first, then earliest required date.
    """
    job_number = models.CharField(max_length=50)
    job_type = models.CharField(max_length=20, choices=JobType.choices)
    style = models.ForeignKey(
        Style, on_delete=models.CASCADE, related_name="job_requests"
    )
    purchase_order = models.ForeignKey(
        PurchaseOrder, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="job_requests",
    )
    description = models.TextField(blank=True)
    work_location = models.CharField(max_length=255, blank=True)
    assigned_to = models.ForeignKey(
        "users.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="job_requests",
    )
    required_by_date = models.DateField(null=True, blank=True)
    priority = models.IntegerField(
        choices=JobPriority.choices, default=JobPriority.NORMAL
    )
    status = models.CharField(
        max_length=20, choices=JobStatus.choices, default=JobStatus.PENDING
    )
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-priority", "required_by_date", "created_at"]

    def __str__(self):
        return f"{self.job_number} - {self.job_type}"


class StyleTechPack(TenantModel):
    """
    A tech-pack processing task (RQ-039 → RQ-042).

    Persists each step of the PDF → Excel → import flow: the source PDF, the
    generated Excel, the raw extraction payload, any extraction errors, and the
    progress state (`draft → extracted → in_progress → completed`) so progress
    is visible as the task advances. The normalized design-sheet fields mirror
    the ``TechPackDesignInfo`` DTO; the raw JSON is kept in ``extracted_data``
    for re-import/preview. ``style`` stays null until the Excel import links it.
    """

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        EXTRACTED = "extracted", "Extracted"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"

    techpack_number = models.CharField(max_length=50)
    style = models.ForeignKey(
        Style, on_delete=models.SET_NULL, null=True, blank=True, related_name="tech_packs"
    )
    source_pdf = models.FileField(upload_to="tech_packs/source/", blank=True)
    excel_file = models.FileField(upload_to="tech_packs/excel/", blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    extracted_data = models.JSONField(default=dict, blank=True)
    errors = models.JSONField(default=list, blank=True)
    warnings = models.JSONField(default=list, blank=True)

    issue_date = models.DateField(null=True, blank=True)
    block = models.CharField(max_length=100, blank=True)
    based_on = models.CharField(max_length=100, blank=True)

    class Relationship(models.TextChoices):
        BASED_ON = "based_on", "Based on"
        NA = "na", "NA"
        RECUT = "recut", "Recut"
        NEW = "new", "New"

    relationship = models.CharField(
        max_length=20, choices=Relationship.choices, default="new", blank=True,
        help_text="Relationship of this design to a base (Based on / NA / Recut / New)",
    )
    customer = models.CharField(max_length=100, blank=True)
    style_number = models.CharField(max_length=50, blank=True)
    size = models.CharField(max_length=50, blank=True)
    designer = models.CharField(max_length=100, blank=True)
    pattern_cutter = models.CharField(max_length=100, blank=True)
    issuer = models.CharField(max_length=100, blank=True)
    cloth_code = models.CharField(max_length=255, blank=True)
    length = models.CharField(max_length=50, blank=True)
    sketch = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    note = models.TextField(blank=True)

    # Design register columns (unified Style + Design Sheet list)
    product_type = models.ForeignKey(
        "setup.ProductType", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="tech_packs",
    )
    buyer = models.ForeignKey(
        "setup.Buyer", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="tech_packs",
    )
    style_code = models.CharField(max_length=50, blank=True)
    contains = models.CharField(max_length=255, blank=True)
    risk_date = models.DateField(null=True, blank=True)
    pattern_request_date = models.DateField(null=True, blank=True)

    # Design Sheet enhancement fields (Day 1)
    sketch_image = models.ImageField(
        upload_to="tech_packs/sketches/", blank=True, null=True
    )
    sketch_thumbnail = models.ImageField(
        upload_to="tech_packs/sketches/thumbs/", blank=True, null=True
    )
    other_images = models.JSONField(default=list, blank=True)
    notes_initials = models.CharField(max_length=10, blank=True)
    notes_date = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ["tenant", "techpack_number"]

    def buyer_display_name(self):
        """Buyer name for register/export: style buyer → tech-pack buyer → customer."""
        if self.style_id and self.style.buyer_id:
            return self.style.buyer.name
        if self.buyer_id:
            return self.buyer.name
        return self.customer or ""

    def __str__(self):
        number = self.style_number or (self.style.style_number if self.style else "") or "unlinked"
        return f"{self.techpack_number} - {number}"

    @classmethod
    def next_techpack_number(cls, tenant):
        """Return the next TP-XXXX tech-pack number for a tenant."""
        import re
        existing = cls.objects.filter(
            tenant=tenant, techpack_number__startswith="TP-"
        ).values_list("techpack_number", flat=True)
        max_num = 1000
        for number in existing:
            match = re.match(r"^TP-(\d+)$", number)
            if match:
                max_num = max(max_num, int(match.group(1)))
        return f"TP-{max_num + 1:04d}"

    @classmethod
    def next_style_code(cls, tenant):
        """Return the next DS-XXXX unique style code for a tenant."""
        import re
        existing = cls.objects.filter(
            tenant=tenant, style_code__startswith="DS-"
        ).values_list("style_code", flat=True)
        max_num = 1000
        for code in existing:
            match = re.match(r"^DS-(\d+)$", code)
            if match:
                max_num = max(max_num, int(match.group(1)))
        return f"DS-{max_num + 1:04d}"

    def mark_extracted(self, data):
        """Store the extraction payload and move draft → extracted."""
        if self.status != self.Status.DRAFT:
            raise ValueError("Only draft tech-packs can be marked as extracted")
        self.extracted_data = data
        self.status = self.Status.EXTRACTED
        self.save(update_fields=["extracted_data", "status", "updated_at"])

    def mark_in_progress(self):
        """Move extracted → in_progress once manual completion starts."""
        if self.status != self.Status.EXTRACTED:
            raise ValueError("Only extracted tech-packs can move to in progress")
        self.status = self.Status.IN_PROGRESS
        self.save(update_fields=["status", "updated_at"])

    def complete(self, style=None):
        """Move in_progress → completed, optionally linking the imported style."""
        if self.status != self.Status.IN_PROGRESS:
            raise ValueError("Only in-progress tech-packs can be completed")
        if style is not None:
            self.style = style
        self.status = self.Status.COMPLETED
        self.save(update_fields=["style", "status", "updated_at"])


# ---------------------------------------------------------------------------
# Design Sheet (Week 2)
# ---------------------------------------------------------------------------

class DesignSheet(TenantModel):
    """
    Design sheet linked to StyleTechPack.
    Provides status workflow and links to fit specs and job requests.

    ``layout_order`` persists the designer's content-block arrangement
    (header/sketch/material/fit_specs/images/job_requests). The design-sheet
    page renders the blocks in exactly this order; changing it reorders the
    on-screen and printed tech pack without touching the data.
    """

    BLOCK_KEYS = [
        "header", "sketch", "material", "fit_specs",
        "images", "job_requests",
    ]

    class Status(models.TextChoices):
        NEW = "new", "New"
        REJECTED = "rejected", "Rejected"
        CLOSED = "closed", "Closed"
        PRODUCTION = "production", "Production"
        ARCHIVED = "archived", "Archived"

    tech_pack = models.OneToOneField(
        StyleTechPack,
        on_delete=models.CASCADE,
        related_name="design_sheet",
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.NEW
    )
    sketch_annotations = models.JSONField(
        default=list, blank=True,
        help_text="List of {id, x, y, text} sketch annotations (percentages 0-100)",
    )
    layout_order = models.JSONField(
        default=list, blank=True,
        help_text="Ordered list of content-block keys rendered on the design-sheet page",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"DesignSheet - {self.tech_pack}"

    def clean(self):
        super().clean()
        if self.layout_order and set(self.layout_order) != set(self.BLOCK_KEYS):
            raise ValidationError(
                "layout_order must contain exactly the design-sheet blocks "
                f"{self.BLOCK_KEYS}, got {self.layout_order}"
            )

    def save(self, *args, **kwargs):
        if not self.layout_order:
            self.layout_order = list(self.BLOCK_KEYS)
        super().save(*args, **kwargs)

    def transition_to(self, status):
        """
        Move the design sheet to ``status``.

        ``status`` must be one of the workflow values (new/rejected/closed/
        archived); the workflow is intentionally permissive so any valid
        status is reachable (reopen to ``new`` included). Raises
        :class:`ValidationError` for anything outside the workflow.
        """
        if status not in self.Status.values:
            raise ValidationError(
                f"Invalid design sheet status {status!r}. "
                f"Valid: {list(self.Status.values)}"
            )
        self.status = status
        self.save(update_fields=["status", "updated_at"])
        return self.status


class FitSpecification(TenantModel):
    """
    Fit specification for a design sheet (Dev Spec, 1st Fit, 2nd Fit, etc.).
    """

    design_sheet = models.ForeignKey(
        DesignSheet,
        on_delete=models.CASCADE,
        related_name="fit_specs",
    )
    fit_number = models.CharField(max_length=50)
    fit_date = models.DateField()
    description = models.CharField(max_length=200)
    notes = models.TextField(blank=True)
    is_selected = models.BooleanField(default=False)

    class Meta:
        ordering = ["fit_number"]
        unique_together = ["tenant", "design_sheet", "fit_number"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "design_sheet"],
                condition=models.Q(is_selected=True),
                name="unique_selected_fit_spec_per_design_sheet",
            ),
        ]

    def __str__(self):
        return f"{self.fit_number} - {self.description}"


class FitImage(TenantModel):
    """Images for a fit specification."""

    fit_spec = models.ForeignKey(
        FitSpecification,
        on_delete=models.CASCADE,
        related_name="images",
    )
    image = models.ImageField(upload_to="fits/")
    caption = models.CharField(max_length=200, blank=True)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"FitImage - {self.fit_spec.fit_number}"


class DesignJobRequest(TenantModel):
    """
    Job request for patterns, samples, mini markers linked to a design sheet.
    This is separate from the existing JobRequest model which is for
    cross-department job queue management.
    """

    class JobType(models.TextChoices):
        NEW_PATTERN = "new_pattern", "New Pattern"
        TECH_SAMPLE = "tech_sample", "Technical Sample"
        FIT_SAMPLE = "fit_sample", "Fit Sample"
        MINI_MARKER = "mini_marker", "Mini Marker"
        THREE_D = "3d", "3D Sample"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"

    design_sheet = models.ForeignKey(
        DesignSheet,
        on_delete=models.CASCADE,
        related_name="job_requests",
    )
    job_type = models.CharField(max_length=50, choices=JobType.choices)
    required_by = models.DateField()
    work_location = models.CharField(max_length=100, blank=True)
    no_of_garments = models.IntegerField(default=1)
    allocated_to = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="design_job_requests",
    )
    notes = models.TextField(blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )

    class Meta:
        ordering = ["-required_by", "-created_at"]

    def __str__(self):
        return f"{self.get_job_type_display()} - {self.design_sheet}"
