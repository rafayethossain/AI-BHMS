"""
Quality admin configuration.
"""
from django.contrib import admin

from .models import ComplianceAudit, CorrectiveAction, GoldSeal, Inspection, InspectionItem


@admin.register(Inspection)
class InspectionAdmin(admin.ModelAdmin):
    list_display = ["purchase_order", "factory", "inspection_type", "inspection_date", "status"]
    list_filter = ["status", "inspection_type", "factory"]
    search_fields = ["purchase_order__po_number"]


@admin.register(InspectionItem)
class InspectionItemAdmin(admin.ModelAdmin):
    list_display = ["inspection", "defect_type", "defect_count", "severity"]
    list_filter = ["severity"]
    search_fields = ["defect_type"]


@admin.register(GoldSeal)
class GoldSealAdmin(admin.ModelAdmin):
    list_display = ["shipment", "status", "sent_date", "approval_date"]
    list_filter = ["status"]
    search_fields = ["shipment__shipment_number", "notes"]


@admin.register(CorrectiveAction)
class CorrectiveActionAdmin(admin.ModelAdmin):
    list_display = ["title", "status", "priority", "due_date"]
    list_filter = ["status", "priority"]
    search_fields = ["title", "description"]


@admin.register(ComplianceAudit)
class ComplianceAuditAdmin(admin.ModelAdmin):
    list_display = ["purchase_order", "week_start", "overall_pass", "efficiency_rate"]
    list_filter = ["week_start"]
    search_fields = ["purchase_order__po_number", "notes"]
