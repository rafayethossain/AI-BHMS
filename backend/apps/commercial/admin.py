"""
Commercial admin configuration.
"""
from django.contrib import admin

from .models import (
    LC,
    Bank,
    DebitNote,
    InvoiceApproval,
    LCAmendment,
    ProformaInvoice,
    SalesConfirmation,
    SalesContract,
)


@admin.register(LC)
class LCAdmin(admin.ModelAdmin):
    list_display = ["lc_number", "lc_type", "buyer", "amount", "expiry_date", "status"]
    list_filter = ["status", "lc_type", "buyer"]
    search_fields = ["lc_number"]


@admin.register(LCAmendment)
class LCAmendmentAdmin(admin.ModelAdmin):
    list_display = ["lc", "amendment_number", "status", "approved_at"]
    list_filter = ["status"]
    search_fields = ["lc__lc_number"]


@admin.register(Bank)
class BankAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "swift_code", "status"]
    list_filter = ["status"]
    search_fields = ["code", "name"]


@admin.register(ProformaInvoice)
class ProformaInvoiceAdmin(admin.ModelAdmin):
    list_display = ["pi_number", "purchase_order", "buyer", "amount", "status", "issued_date"]
    list_filter = ["status"]
    search_fields = ["pi_number"]


@admin.register(SalesContract)
class SalesContractAdmin(admin.ModelAdmin):
    list_display = ["contract_number", "purchase_order", "buyer", "total_amount", "status", "contract_date"]
    list_filter = ["status"]
    search_fields = ["contract_number"]


@admin.register(SalesConfirmation)
class SalesConfirmationAdmin(admin.ModelAdmin):
    list_display = ["confirmation_number", "purchase_order", "buyer", "status", "sent_at", "auto_accepted"]
    list_filter = ["status", "auto_accepted"]
    search_fields = ["confirmation_number"]


@admin.register(DebitNote)
class DebitNoteAdmin(admin.ModelAdmin):
    list_display = ["debit_number", "purchase_order", "debited_party", "debit_type", "amount", "status", "compliance_email_sent"]
    list_filter = ["status", "debit_type", "party_type"]
    search_fields = ["debit_number", "purchase_order__po_number", "debited_party"]


@admin.register(InvoiceApproval)
class InvoiceApprovalAdmin(admin.ModelAdmin):
    list_display = ["invoice_number", "invoice_type", "purchase_order", "amount", "status", "match_status", "approved_at"]
    list_filter = ["status", "invoice_type"]
    search_fields = ["invoice_number", "purchase_order__po_number"]

    @admin.display(description="Match")
    def match_status(self, obj):
        return obj.match_status
