"""
Reporting models for BHMS.
"""
from django.db import models
from apps.core.models import TenantModel


class SavedReport(TenantModel):
    REPORT_TYPE_CHOICES = [
        ("orders", "Order Reports"),
        ("production", "Production Reports"),
        ("commercial", "Commercial Reports"),
        ("quality", "Quality Reports"),
        ("inventory", "Inventory Reports"),
        ("financial", "Financial Reports"),
        ("custom", "Custom Report"),
    ]

    name = models.CharField(max_length=200)
    report_type = models.CharField(max_length=20, choices=REPORT_TYPE_CHOICES)
    description = models.TextField(null=True, blank=True)
    config = models.JSONField(default=dict, help_text="Report configuration: filters, columns, grouping")
    is_scheduled = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="saved_reports"
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.report_type})"
