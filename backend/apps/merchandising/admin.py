"""
Merchandising admin configuration.
"""
from django.contrib import admin

from .models import (
    BOM,
    TA,
    BOMItem,
    Costing,
    DesignImage,
    DesignJobRequest,
    DesignSheet,
    FileOpening,
    FileOpeningNote,
    FitImage,
    FitSpec,
    FitSpecification,
    Hit,
    JobRequest,
    POAmendment,
    PurchaseOrder,
    PurchaseOrderItem,
    Style,
    StyleTechPack,
    StyleVersion,
    TAMilestone,
)


@admin.register(Style)
class StyleAdmin(admin.ModelAdmin):
    list_display = ["style_number", "name", "buyer", "season", "status", "current_version"]
    list_filter = ["status", "season", "buyer"]
    search_fields = ["style_number", "name"]


@admin.register(StyleVersion)
class StyleVersionAdmin(admin.ModelAdmin):
    list_display = ["style", "version_number", "status"]
    list_filter = ["status"]
    search_fields = ["style__style_number"]


@admin.register(StyleTechPack)
class StyleTechPackAdmin(admin.ModelAdmin):
    list_display = ["techpack_number", "style", "style_number", "status", "issue_date", "created_at"]
    list_filter = ["status"]
    search_fields = ["techpack_number", "style_number", "style__style_number"]


@admin.register(FileOpening)
class FileOpeningAdmin(admin.ModelAdmin):
    list_display = ["file_number", "style", "buyer", "factory", "status"]
    list_filter = ["status", "buyer", "factory"]
    search_fields = ["file_number"]


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ["po_number", "buyer", "factory", "delivery_date", "quantity", "status"]
    list_filter = ["status", "buyer", "factory"]
    search_fields = ["po_number"]


@admin.register(PurchaseOrderItem)
class PurchaseOrderItemAdmin(admin.ModelAdmin):
    list_display = ["purchase_order", "color", "size", "quantity", "unit_price"]
    search_fields = ["purchase_order__po_number"]


@admin.register(Hit)
class HitAdmin(admin.ModelAdmin):
    list_display = ["purchase_order", "hit_number", "colour", "delivery_mode", "delivery_type", "factory_override", "original_delivery_date", "actual_delivery_date"]
    list_filter = ["delivery_mode", "delivery_type"]
    search_fields = ["hit_number", "colour__name", "purchase_order__po_number"]


@admin.register(FitSpec)
class FitSpecAdmin(admin.ModelAdmin):
    list_display = ["purchase_order", "fit_stage", "version", "is_current", "notes"]
    list_filter = ["fit_stage", "is_current"]
    search_fields = ["purchase_order__po_number", "notes"]


@admin.register(DesignImage)
class DesignImageAdmin(admin.ModelAdmin):
    list_display = ["style", "role", "caption", "colourway", "is_main", "sort_order"]
    list_filter = ["role", "is_main"]
    search_fields = ["caption", "colourway", "style__style_number"]


@admin.register(JobRequest)
class JobRequestAdmin(admin.ModelAdmin):
    list_display = ["job_number", "job_type", "style", "priority", "status", "assigned_to", "required_by_date"]
    list_filter = ["job_type", "priority", "status", "assigned_to"]
    search_fields = ["job_number", "description", "style__style_number"]


@admin.register(BOM)
class BOMAdmin(admin.ModelAdmin):
    list_display = ["style_version", "name", "version", "status"]
    list_filter = ["status"]
    search_fields = ["name"]


@admin.register(BOMItem)
class BOMItemAdmin(admin.ModelAdmin):
    list_display = ["bom", "category", "item_name", "consumption", "unit_price", "ordered_qty", "status", "location", "colour", "width_size", "match"]
    list_filter = ["status", "category"]
    search_fields = ["item_name"]


@admin.register(Costing)
class CostingAdmin(admin.ModelAdmin):
    list_display = ["purchase_order", "version", "total_cost", "margin", "status"]
    list_filter = ["status"]
    search_fields = ["purchase_order__po_number"]


@admin.register(TA)
class TAAdmin(admin.ModelAdmin):
    list_display = ["purchase_order", "status", "delivery_date"]
    list_filter = ["status"]
    search_fields = ["purchase_order__po_number"]


@admin.register(TAMilestone)
class TAMilestoneAdmin(admin.ModelAdmin):
    list_display = ["ta", "name", "planned_date", "actual_date", "status"]
    list_filter = ["status", "is_critical"]
    search_fields = ["name"]


@admin.register(FileOpeningNote)
class FileOpeningNoteAdmin(admin.ModelAdmin):
    list_display = ["file_opening", "author_initials", "text", "is_active", "created_at"]
    list_filter = ["is_active"]
    search_fields = ["text", "file_opening__file_number"]

    def author_initials(self, obj):
        return obj.author_initials
    author_initials.short_description = "Author"


@admin.register(POAmendment)
class POAmendmentAdmin(admin.ModelAdmin):
    list_display = ["amendment_number", "purchase_order", "field_name", "status", "created_at"]
    list_filter = ["status"]
    search_fields = ["amendment_number", "purchase_order__po_number"]


@admin.register(DesignSheet)
class DesignSheetAdmin(admin.ModelAdmin):
    list_display = ["id", "tech_pack", "status", "created_at"]
    list_filter = ["status"]
    search_fields = ["tech_pack__techpack_number"]


@admin.register(FitSpecification)
class FitSpecificationAdmin(admin.ModelAdmin):
    list_display = ["fit_number", "design_sheet", "fit_date", "description", "is_selected"]
    list_filter = ["is_selected"]
    search_fields = ["fit_number", "design_sheet__tech_pack__techpack_number"]


@admin.register(FitImage)
class FitImageAdmin(admin.ModelAdmin):
    list_display = ["fit_spec", "caption", "order"]
    search_fields = ["fit_spec__fit_number"]


@admin.register(DesignJobRequest)
class DesignJobRequestAdmin(admin.ModelAdmin):
    list_display = ["job_type", "design_sheet", "required_by", "status", "allocated_to"]
    list_filter = ["job_type", "status"]
    search_fields = ["design_sheet__tech_pack__techpack_number"]
