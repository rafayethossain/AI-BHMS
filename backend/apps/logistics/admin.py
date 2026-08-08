from django.contrib import admin

from .models import BookingScheduleItem, FreightForwarder, Shipment, ShippingDocument


@admin.register(FreightForwarder)
class FreightForwarderAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "contact_person", "email", "country", "is_active"]
    search_fields = ["name", "code"]
    list_filter = ["is_active", "country"]


@admin.register(Shipment)
class ShipmentAdmin(admin.ModelAdmin):
    list_display = [
        "shipment_number", "purchase_order", "factory", "freight_forwarder",
        "mode", "status", "booking_reference", "etd", "eta",
    ]
    list_filter = ["status", "mode"]
    search_fields = ["shipment_number", "purchase_order__po_number", "booking_reference"]


@admin.register(ShippingDocument)
class ShippingDocumentAdmin(admin.ModelAdmin):
    list_display = ["document_type", "shipment", "document_number", "document_date"]
    list_filter = ["document_type"]


@admin.register(BookingScheduleItem)
class BookingScheduleItemAdmin(admin.ModelAdmin):
    list_display = [
        "shipment", "hit", "status", "cut_qty", "garments_ready_qty",
        "ex_factory_date", "risk_level", "week_ending",
    ]
    list_filter = ["status", "risk_level", "week_ending"]
    search_fields = [
        "shipment__shipment_number",
        "shipment__purchase_order__po_number",
        "hit__hit_number",
    ]
