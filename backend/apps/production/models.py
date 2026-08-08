"""
Production models for BHMS.
"""
import uuid
from django.db import models
from apps.core.models import TenantModel


class ProductionPlan(TenantModel):
    """
    Production plan model.
    """
    purchase_order = models.ForeignKey("merchandising.PurchaseOrder", on_delete=models.CASCADE, related_name="production_plans")
    factory = models.ForeignKey("setup.Factory", on_delete=models.CASCADE, related_name="production_plans")
    plan_date = models.DateField()
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    quantity = models.IntegerField()
    status = models.CharField(
        max_length=20,
        choices=[
            ("draft", "Draft"),
            ("planned", "Planned"),
            ("in_progress", "In Progress"),
            ("completed", "Completed"),
        ],
        default="draft"
    )
    remarks = models.TextField(blank=True)
    
    class Meta:
        ordering = ["-created_at"]
    
    def __str__(self):
        return f"Plan - {self.purchase_order.po_number}"


class DailyProduction(TenantModel):
    """
    Daily production report model.
    """
    factory = models.ForeignKey("setup.Factory", on_delete=models.CASCADE, related_name="daily_productions")
    purchase_order = models.ForeignKey("merchandising.PurchaseOrder", on_delete=models.CASCADE, related_name="daily_productions")
    production_date = models.DateField()
    line_number = models.IntegerField(null=True, blank=True)
    target_quantity = models.IntegerField(null=True, blank=True)
    actual_quantity = models.IntegerField(default=0)
    passed_quantity = models.IntegerField(default=0)
    rejected_quantity = models.IntegerField(default=0)
    efficiency = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    dhu = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    manpower = models.IntegerField(null=True, blank=True)
    working_hours = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=[
            ("active", "Active"),
            ("approved", "Approved"),
        ],
        default="active"
    )
    
    class Meta:
        ordering = ["-production_date"]
    
    def __str__(self):
        return f"{self.factory.code} - {self.production_date}"
