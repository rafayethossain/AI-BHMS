"""
Commercial serializers for BHMS.
"""
from rest_framework import serializers

from .models import (
    LC,
    Bank,
    DebitNote,
    ForwardOrder,
    InvoiceApproval,
    LCAmendment,
    ProformaInvoice,
    SalesConfirmation,
    SalesContract,
)


class BankSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bank
        fields = [
            "id", "code", "name", "swift_code", "address",
            "contact_person", "phone", "email", "status", "created_at"
        ]
        read_only_fields = ["id", "created_at"]


class LCAmendmentSerializer(serializers.ModelSerializer):
    approved_by_name = serializers.CharField(source="approved_by.get_full_name", read_only=True)

    class Meta:
        model = LCAmendment
        fields = [
            "id", "lc", "amendment_number", "amount_change",
            "expiry_date_change", "quantity_change", "reason",
            "status", "approved_by", "approved_by_name", "approved_at", "created_at"
        ]
        read_only_fields = ["id", "created_at", "amendment_number"]


class LCSerializer(serializers.ModelSerializer):
    buyer_name = serializers.CharField(source="buyer.name", read_only=True)
    bank_name = serializers.CharField(source="bank.name", read_only=True)
    po_number = serializers.CharField(source="purchase_order.po_number", read_only=True)
    currency_name = serializers.CharField(source="currency.name", read_only=True)
    currency_code = serializers.CharField(source="currency.code", read_only=True)
    balance_amount = serializers.SerializerMethodField()
    utilization_percent = serializers.SerializerMethodField()
    amendments = LCAmendmentSerializer(many=True, read_only=True)

    class Meta:
        model = LC
        fields = [
            "id", "lc_number", "lc_type", "buyer", "buyer_name",
            "purchase_order", "po_number", "parent_lc", "bank", "bank_name",
            "amount", "currency", "currency_name", "currency_code",
            "issued_date", "expiry_date", "status",
            "utilized_amount", "balance_amount", "utilization_percent",
            "amendments", "remarks", "created_at"
        ]
        read_only_fields = ["id", "created_at", "utilized_amount"]

    def get_balance_amount(self, obj):
        return str(obj.amount - obj.utilized_amount)

    def get_utilization_percent(self, obj):
        if obj.amount and obj.amount > 0:
            return round(float(obj.utilized_amount / obj.amount * 100), 2)
        return 0


class ProformaInvoiceSerializer(serializers.ModelSerializer):
    buyer_name = serializers.CharField(source="buyer.name", read_only=True)
    po_number = serializers.CharField(source="purchase_order.po_number", read_only=True)

    class Meta:
        model = ProformaInvoice
        fields = "__all__"
        read_only_fields = ["tenant", "created_by", "created_at", "updated_at", "pi_number"]


class SalesContractSerializer(serializers.ModelSerializer):
    buyer_name = serializers.CharField(source="buyer.name", read_only=True)
    po_number = serializers.CharField(source="purchase_order.po_number", read_only=True)

    class Meta:
        model = SalesContract
        fields = "__all__"
        read_only_fields = ["tenant", "created_by", "created_at", "updated_at", "contract_number"]


class SalesConfirmationSerializer(serializers.ModelSerializer):
    buyer_name = serializers.CharField(source="buyer.name", read_only=True)
    po_number = serializers.CharField(source="purchase_order.po_number", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    window_elapsed = serializers.SerializerMethodField()

    class Meta:
        model = SalesConfirmation
        fields = [
            "id", "confirmation_number", "purchase_order", "po_number",
            "buyer", "buyer_name", "sent_at", "disputed_at", "accepted_at",
            "status", "status_display", "dispute_reason", "auto_accepted",
            "remarks", "window_elapsed", "created_at", "updated_at",
        ]
        read_only_fields = [
            "tenant", "created_by", "created_at", "updated_at", "confirmation_number",
            "sent_at", "disputed_at", "accepted_at", "auto_accepted",
        ]

    def get_window_elapsed(self, obj):
        return obj.window_elapsed()


class DebitNoteSerializer(serializers.ModelSerializer):
    po_number = serializers.CharField(source="purchase_order.po_number", read_only=True, allow_null=True)
    buyer_name = serializers.CharField(source="purchase_order.buyer.name", read_only=True, allow_null=True)
    reconciliation_number = serializers.CharField(
        source="reconciliation.shipment.shipment_number", read_only=True, allow_null=True
    )
    currency_code = serializers.CharField(source="currency.code", read_only=True, allow_null=True)
    currency_name = serializers.CharField(source="currency.name", read_only=True, allow_null=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    debit_type_display = serializers.CharField(source="get_debit_type_display", read_only=True)
    party_type_display = serializers.CharField(source="get_party_type_display", read_only=True)
    raised_by_name = serializers.CharField(source="raised_by.get_full_name", read_only=True, allow_null=True)

    class Meta:
        model = DebitNote
        fields = [
            "id", "debit_number", "debit_type", "debit_type_display",
            "party_type", "party_type_display", "debited_party",
            "purchase_order", "po_number", "buyer_name",
            "reconciliation", "reconciliation_number",
            "amount", "currency", "currency_code", "currency_name",
            "shortage_units", "tolerance_pct", "reason",
            "status", "status_display",
            "compliance_email", "compliance_email_sent", "email_sent_at",
            "raised_by", "raised_by_name", "raised_at",
            "issued_at", "paid_at", "notes", "created_at", "updated_at",
        ]
        read_only_fields = [
            "tenant", "created_by", "created_at", "updated_at",
            "debit_number", "status", "compliance_email", "compliance_email_sent",
            "email_sent_at", "raised_by", "raised_at", "issued_at", "paid_at",
        ]

    def validate_reason(self, value):
        if not (value or "").strip():
            raise serializers.ValidationError("A reason is required for a debit note.")
        return value

    def validate_amount(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("Debit amount must be greater than zero.")
        return value


class InvoiceApprovalSerializer(serializers.ModelSerializer):
    po_number = serializers.CharField(source="purchase_order.po_number", read_only=True, allow_null=True)
    buyer_name = serializers.CharField(source="purchase_order.buyer.name", read_only=True, allow_null=True)
    currency_code = serializers.CharField(source="currency.code", read_only=True, allow_null=True)
    currency_name = serializers.CharField(source="currency.name", read_only=True, allow_null=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    invoice_type_display = serializers.CharField(source="get_invoice_type_display", read_only=True)
    approved_by_name = serializers.CharField(source="approved_by.get_full_name", read_only=True, allow_null=True)
    rejected_by_name = serializers.CharField(source="rejected_by.get_full_name", read_only=True, allow_null=True)
    debit_number = serializers.CharField(source="debit_note.debit_number", read_only=True, allow_null=True)
    is_match = serializers.SerializerMethodField()
    over_tolerance = serializers.SerializerMethodField()
    auto_approval_eligible = serializers.SerializerMethodField()
    tolerance_pct = serializers.SerializerMethodField()
    quantity_variance_pct = serializers.SerializerMethodField()
    match_status = serializers.SerializerMethodField()
    mismatch_reasons = serializers.SerializerMethodField()

    class Meta:
        model = InvoiceApproval
        fields = [
            "id", "invoice_number", "invoice_type", "invoice_type_display",
            "purchase_order", "po_number", "buyer_name",
            "invoice_date", "quantity", "unit_price", "amount",
            "currency", "currency_code", "currency_name",
            "status", "status_display", "rejection_reason",
            "debit_note", "debit_number",
            "approved_by", "approved_by_name", "approved_at",
            "rejected_by", "rejected_by_name", "rejected_at",
            "is_match", "over_tolerance", "auto_approval_eligible",
            "tolerance_pct", "quantity_variance_pct",
            "match_status", "mismatch_reasons",
            "notes", "created_at", "updated_at",
        ]
        read_only_fields = [
            "tenant", "created_by", "created_at", "updated_at",
            "invoice_number", "status", "debit_note",
            "approved_by", "approved_at", "rejected_by", "rejected_at",
        ]
        extra_kwargs = {"purchase_order": {"required": True}}

    def get_is_match(self, obj):
        return obj.is_match

    def get_over_tolerance(self, obj):
        return obj.over_tolerance

    def get_auto_approval_eligible(self, obj):
        return obj.auto_approval_eligible

    def get_tolerance_pct(self, obj):
        return str(obj.tolerance_pct)

    def get_quantity_variance_pct(self, obj):
        pct = obj.quantity_variance_pct
        return str(pct) if pct is not None else None

    def get_match_status(self, obj):
        return obj.match_status

    def get_mismatch_reasons(self, obj):
        return obj.mismatch_reasons


class ForwardOrderSerializer(serializers.ModelSerializer):
    buyer_name = serializers.CharField(source="buyer.name", read_only=True)
    factory_name = serializers.CharField(source="factory.name", read_only=True)
    po_number = serializers.CharField(source="purchase_order.po_number", read_only=True)

    class Meta:
        model = ForwardOrder
        fields = [
            "id", "tenant", "month", "buyer", "buyer_name", "factory", "factory_name",
            "purchase_order", "po_number", "quantity", "unit_cost",
            "total_cost", "service_pct", "service_charge",
            "in_hand_units", "status", "remarks", "created_at",
        ]
        read_only_fields = ["id", "tenant", "created_at", "total_cost", "service_charge"]
