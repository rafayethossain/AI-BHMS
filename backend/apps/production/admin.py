"""
Production admin configuration.
"""
from django.contrib import admin
from .models import ProductionPlan, DailyProduction


@admin.register(ProductionPlan)
class ProductionPlanAdmin(admin.ModelAdmin):
    list_display = ["purchase_order", "factory", "plan_date", "quantity", "status"]
    list_filter = ["status", "factory"]
    search_fields = ["purchase_order__po_number"]


@admin.register(DailyProduction)
class DailyProductionAdmin(admin.ModelAdmin):
    list_display = ["factory", "production_date", "actual_quantity", "efficiency", "status"]
    list_filter = ["status", "factory", "production_date"]
    search_fields = ["factory__code"]
