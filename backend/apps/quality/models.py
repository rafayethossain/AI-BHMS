"""
Quality models for BHMS.
"""
from datetime import timedelta
from decimal import Decimal

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.core.models import TenantModel


class Inspection(TenantModel):
    """
    Quality inspection model.
    """
    purchase_order = models.ForeignKey("merchandising.PurchaseOrder", on_delete=models.CASCADE, related_name="inspections")
    factory = models.ForeignKey("setup.Factory", on_delete=models.CASCADE, related_name="inspections")
    inspection_type = models.CharField(
        max_length=50,
        choices=[
            ("inline", "Inline"),
            ("final", "Final"),
            ("pre shipment", "Pre Shipment"),
        ]
    )
    inspection_date = models.DateField()
    inspector = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="inspections")
    aql_level = models.DecimalField(max_digits=3, decimal_places=1, default=2.5)
    sample_size = models.IntegerField(null=True, blank=True)
    passed_quantity = models.IntegerField(default=0)
    rejected_quantity = models.IntegerField(default=0)
    status = models.CharField(
        max_length=20,
        choices=[
            ("pending", "Pending"),
            ("in_progress", "In Progress"),
            ("passed", "Passed"),
            ("failed", "Failed"),
        ],
        default="pending"
    )
    remarks = models.TextField(blank=True)

    class Meta:
        ordering = ["-inspection_date"]

    def __str__(self):
        return f"{self.inspection_type} - {self.purchase_order.po_number}"


class InspectionItem(TenantModel):
    """
    Inspection defect item model.
    """
    inspection = models.ForeignKey(Inspection, on_delete=models.CASCADE, related_name="items")
    defect_type = models.CharField(max_length=100)
    defect_count = models.IntegerField()
    severity = models.CharField(
        max_length=20,
        choices=[
            ("critical", "Critical"),
            ("major", "Major"),
            ("minor", "Minor"),
        ]
    )
    description = models.TextField(blank=True)
    image_url = models.URLField(blank=True)

    class Meta:
        ordering = ["severity", "defect_type"]

    def __str__(self):
        return f"{self.defect_type} - {self.severity}"


class CorrectiveAction(TenantModel):
    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("critical", "Critical"),
    ]
    STATUS_CHOICES = [
        ("open", "Open"),
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
        ("verified", "Verified"),
        ("closed", "Closed"),
    ]

    inspection = models.ForeignKey(
        Inspection,
        on_delete=models.CASCADE,
        related_name="corrective_actions"
    )
    title = models.CharField(max_length=200)
    description = models.TextField()
    root_cause = models.TextField(null=True, blank=True)
    corrective_measure = models.TextField()
    preventive_measure = models.TextField(null=True, blank=True)
    assigned_to = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="corrective_actions"
    )
    due_date = models.DateField()
    completed_date = models.DateField(null=True, blank=True)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default="medium")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="open")
    verified_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="verified_actions"
    )
    verified_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"CAP: {self.title} ({self.status})"


class GoldSeal(TenantModel):
    """
    Gold seal sample tracking per shipment (GC-016, GC Booking tab).

    Customer technical sign-off for the gold seal sample. Lifecycle:
    pending -> sent -> approved / rejected.
    """
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("sent", "Sent"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]

    shipment = models.ForeignKey(
        "logistics.Shipment",
        on_delete=models.CASCADE,
        related_name="gold_seals"
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="pending"
    )
    sent_date = models.DateField(null=True, blank=True)
    approval_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Gold Seal"
        verbose_name_plural = "Gold Seals"

    def __str__(self):
        return f"{self.shipment.shipment_number} - {self.get_status_display()}"


class ComplianceAudit(TenantModel):
    """
    Weekly compliance order review (GC-029, GC Manual page 47).

    Reviews each order against the 8 key items: fabric paperwork, mini-marker
    efficiency (above 85%), docket/final-cut-docket, fabric utilisation,
    factory invoice vs delivered & cut, fabric rating, recon costed vs actual,
    and final hits monitoring & shortages. One audit per order per week
    (unique tenant + purchase_order + week_start).

    The mini-marker efficiency item is derived from ``efficiency_rate``
    (blank -> na, >= 85.00 -> pass, below -> fail) so the rate and the status
    can never disagree. The 3-warning policy (two warnings, 3rd = dismissal)
    is modelled as consecutive failing weekly audits for the same order,
    capped at 3.
    """
    EFFICIENCY_THRESHOLD = Decimal("85.00")

    ITEM_STATUS = [
        ("pass", "Pass"),
        ("fail", "Fail"),
        ("na", "N/A"),
    ]

    CHECKLIST_ITEMS = [
        ("fabric_paperwork", "Fabric paperwork (over/under tolerance)"),
        ("mini_marker_efficiency", "Mini-marker efficiency (above 85%)"),
        ("dockets", "Docket & final cut docket review"),
        ("fabric_utilisation", "Fabric utilisation & unused fabric"),
        ("factory_invoice", "Factory invoice vs delivered & cut"),
        ("fabric_rating", "Fabric rating queries"),
        ("recon_costed_vs_actual", "Recon costed vs actual (trims/CMT/fabric)"),
        ("final_hits", "Final hits monitoring & shortages"),
    ]

    STORED_ITEM_KEYS = [key for key, _label in CHECKLIST_ITEMS if key != "mini_marker_efficiency"]

    purchase_order = models.ForeignKey(
        "merchandising.PurchaseOrder",
        on_delete=models.CASCADE,
        related_name="compliance_audits",
    )
    week_start = models.DateField(db_index=True)
    efficiency_rate = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True,
        validators=[MinValueValidator(Decimal("0.00")), MaxValueValidator(Decimal("100.00"))],
        help_text="Mini-marker efficiency rate (%). Should be above 85%.",
    )
    fabric_paperwork_status = models.CharField(max_length=10, choices=ITEM_STATUS, default="na")
    dockets_status = models.CharField(max_length=10, choices=ITEM_STATUS, default="na")
    fabric_utilisation_status = models.CharField(max_length=10, choices=ITEM_STATUS, default="na")
    factory_invoice_status = models.CharField(max_length=10, choices=ITEM_STATUS, default="na")
    fabric_rating_status = models.CharField(max_length=10, choices=ITEM_STATUS, default="na")
    recon_costed_vs_actual_status = models.CharField(max_length=10, choices=ITEM_STATUS, default="na")
    final_hits_status = models.CharField(max_length=10, choices=ITEM_STATUS, default="na")
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-week_start", "purchase_order__po_number"]
        unique_together = [("tenant", "purchase_order", "week_start")]
        verbose_name = "Compliance Audit"
        verbose_name_plural = "Compliance Audits"

    def __str__(self):
        return f"{self.purchase_order.po_number} - {self.week_start}"

    @classmethod
    def week_start_for(cls, value):
        """Return the Monday of the week containing ``value``."""
        return value - timedelta(days=value.weekday())

    @property
    def mini_marker_efficiency_status(self):
        if self.efficiency_rate is None:
            return "na"
        rate = Decimal(self.efficiency_rate)
        return "pass" if rate >= self.EFFICIENCY_THRESHOLD else "fail"

    @property
    def efficiency_met(self):
        if self.efficiency_rate is None:
            return None
        return Decimal(self.efficiency_rate) >= self.EFFICIENCY_THRESHOLD

    def status_for(self, key):
        """Return the effective status for any of the 8 checklist items."""
        if key == "mini_marker_efficiency":
            return self.mini_marker_efficiency_status
        return getattr(self, f"{key}_status")

    @property
    def fail_count(self):
        return sum(1 for key, _label in self.CHECKLIST_ITEMS if self.status_for(key) == "fail")

    @property
    def overall_pass(self):
        return self.fail_count == 0

    @property
    def reviewed(self):
        return any(self.status_for(key) != "na" for key, _label in self.CHECKLIST_ITEMS)

    @property
    def warning_count(self):
        """Consecutive failing weekly audits for this order (incl. self), capped at 3."""
        prior = ComplianceAudit.objects.filter(
            tenant=self.tenant,
            purchase_order=self.purchase_order,
            week_start__lte=self.week_start,
        ).order_by("-week_start")
        count = 0
        for audit in prior:
            if not audit.overall_pass:
                count += 1
                if count >= 3:
                    break
            else:
                break
        return count

    @property
    def warning_label(self):
        labels = {0: "No warnings", 1: "1st warning", 2: "2nd warning", 3: "3rd warning"}
        return labels[self.warning_count]
