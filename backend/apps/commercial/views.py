"""
Commercial views for BHMS.
"""
from decimal import Decimal

from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.pagination import StandardResultsSetPagination
from apps.core.permissions import HasPermission
from apps.logistics.services.paperwork_comparison import PaperworkComparisonService
from apps.merchandising.models import PurchaseOrderItem

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
from .pdf_utils import generate_invoice_pdf
from .serializers import (
    BankSerializer,
    DebitNoteSerializer,
    InvoiceApprovalSerializer,
    LCAmendmentSerializer,
    LCSerializer,
    ProformaInvoiceSerializer,
    SalesConfirmationSerializer,
    SalesContractSerializer,
)


class LCViewSet(viewsets.ModelViewSet):
    queryset = LC.objects.all()
    serializer_class = LCSerializer
    pagination_class = StandardResultsSetPagination
    search_fields = ["lc_number"]
    filterset_fields = ["status", "lc_type", "buyer"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {
        "list": "commercial:view", "retrieve": "commercial:view",
        "create": "commercial:create", "update": "commercial:edit",
        "partial_update": "commercial:edit", "destroy": "commercial:delete",
    }

    def get_queryset(self):
        return LC.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        lc = serializer.save(
            tenant=self.request.tenant,
            created_by=self.request.user
        )
        lc.utilized_amount = 0
        lc.save(update_fields=["utilized_amount"])

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        lc = self.get_object()
        if lc.status not in ("draft", "sent_to_bank"):
            return Response(
                {"error": f"Cannot approve LC in '{lc.status}' status"},
                status=status.HTTP_400_BAD_REQUEST
            )
        lc.status = "received"
        lc.save(update_fields=["status"])
        return Response({"status": "received"})

    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        lc = self.get_object()
        if lc.status != "received":
            return Response(
                {"error": f"Cannot accept LC in '{lc.status}' status"},
                status=status.HTTP_400_BAD_REQUEST
            )
        lc.status = "accepted"
        lc.issued_date = lc.issued_date or timezone.localtime(timezone.now()).date()
        lc.save(update_fields=["status", "issued_date"])
        return Response({"status": "accepted"})

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        lc = self.get_object()
        if lc.status in ("utilized", "cancelled", "expired"):
            return Response(
                {"error": f"Cannot cancel LC in '{lc.status}' status"},
                status=status.HTTP_400_BAD_REQUEST
            )
        lc.status = "cancelled"
        lc.save(update_fields=["status"])
        return Response({"status": "cancelled"})

    @action(detail=True, methods=["get"])
    def utilization(self, request, pk=None):
        lc = self.get_object()
        balance = lc.amount - lc.utilized_amount
        utilization_pct = (lc.utilized_amount / lc.amount * 100) if lc.amount > 0 else 0
        return Response({
            "lc_id": str(lc.id),
            "total_amount": str(lc.amount),
            "utilized_amount": str(lc.utilized_amount),
            "balance_amount": str(balance),
            "utilization_percent": round(utilization_pct, 2),
        })

    @action(detail=True, methods=["get"])
    def export(self, request, pk=None):
        lc = self.get_object()
        import csv
        from io import StringIO
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(["Field", "Value"])
        writer.writerow(["LC Number", lc.lc_number])
        writer.writerow(["Type", lc.get_lc_type_display()])
        writer.writerow(["Buyer", lc.buyer.name])
        writer.writerow(["Amount", str(lc.amount)])
        writer.writerow(["Utilized", str(lc.utilized_amount)])
        writer.writerow(["Balance", str(lc.amount - lc.utilized_amount)])
        writer.writerow(["Status", lc.status])
        writer.writerow(["Expiry Date", str(lc.expiry_date)])
        if lc.issued_date:
            writer.writerow(["Issued Date", str(lc.issued_date)])
        if lc.bank:
            writer.writerow(["Bank", lc.bank.name])
        response = HttpResponse(output.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="lc_{lc.lc_number}.csv"'
        return response

    @action(detail=False, methods=["get"])
    def dashboard(self, request):
        tenant = request.tenant
        qs = LC.objects.filter(tenant=tenant)
        today = timezone.localtime(timezone.now()).date()
        return Response({
            "total_lcs": qs.count(),
            "active_lcs": qs.exclude(status__in=["cancelled", "expired"]).count(),
            "total_value": str(sum(lc.amount for lc in qs)),
            "utilized_value": str(sum(lc.utilized_amount for lc in qs)),
            "expiring_soon": LCSerializer(
                qs.filter(expiry_date__lte=today + timezone.timedelta(days=30),
                          expiry_date__gte=today).exclude(status__in=["cancelled", "expired"]),
                many=True, context={"request": request}
            ).data,
            "draft_lcs": qs.filter(status="draft").count(),
        })


class LCAmendmentViewSet(viewsets.ModelViewSet):
    queryset = LCAmendment.objects.all()
    serializer_class = LCAmendmentSerializer
    pagination_class = StandardResultsSetPagination
    filterset_fields = ["status", "lc"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {
        "list": "commercial:view", "retrieve": "commercial:view",
        "create": "commercial:create", "update": "commercial:edit",
        "partial_update": "commercial:edit", "destroy": "commercial:delete",
    }

    def get_queryset(self):
        return LCAmendment.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        lc = serializer.validated_data["lc"]
        existing_count = LCAmendment.objects.filter(
            lc=lc, tenant=self.request.tenant
        ).count()
        serializer.save(
            tenant=self.request.tenant,
            amendment_number=existing_count + 1,
            created_by=self.request.user
        )

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        amendment = self.get_object()
        if amendment.status != "pending":
            return Response(
                {"error": "Amendment already processed"},
                status=status.HTTP_400_BAD_REQUEST
            )
        amendment.status = "approved"
        amendment.approved_by = request.user
        amendment.approved_at = timezone.now()
        amendment.save(update_fields=["status", "approved_by", "approved_at"])

        lc = amendment.lc
        if amendment.amount_change:
            lc.amount = amendment.amount_change
        if amendment.expiry_date_change:
            lc.expiry_date = amendment.expiry_date_change
        lc.status = "amended"
        lc.save()
        return Response({"status": "approved"})

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        amendment = self.get_object()
        if amendment.status != "pending":
            return Response(
                {"error": "Amendment already processed"},
                status=status.HTTP_400_BAD_REQUEST
            )
        amendment.status = "rejected"
        amendment.save(update_fields=["status"])
        return Response({"status": "rejected"})


class BankViewSet(viewsets.ModelViewSet):
    queryset = Bank.objects.all()
    serializer_class = BankSerializer
    pagination_class = StandardResultsSetPagination
    search_fields = ["code", "name"]
    filterset_fields = ["status"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {
        "list": "commercial:view", "retrieve": "commercial:view",
        "create": "commercial:create", "update": "commercial:edit",
        "partial_update": "commercial:edit", "destroy": "commercial:delete",
    }

    def get_queryset(self):
        return Bank.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(
            tenant=self.request.tenant,
            created_by=self.request.user
        )


class ProformaInvoiceViewSet(viewsets.ModelViewSet):
    queryset = ProformaInvoice.objects.all()
    serializer_class = ProformaInvoiceSerializer
    pagination_class = StandardResultsSetPagination
    search_fields = ["pi_number", "purchase_order__po_number"]
    filterset_fields = ["status", "buyer"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {
        "list": "commercial:view", "retrieve": "commercial:view",
        "create": "commercial:create", "update": "commercial:edit",
        "partial_update": "commercial:edit", "destroy": "commercial:delete",
    }

    def get_queryset(self):
        return ProformaInvoice.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        import uuid
        pi_number = f"PI-{uuid.uuid4().hex[:8].upper()}"
        serializer.save(tenant=self.request.tenant, pi_number=pi_number)

    @action(detail=True, methods=["post"])
    def send(self, request, pk=None):
        pi = self.get_object()
        pi.status = "sent"
        pi.save(update_fields=["status"])
        return Response({"status": "sent"})

    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        pi = self.get_object()
        pi.status = "accepted"
        pi.save(update_fields=["status"])
        return Response({"status": "accepted"})

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        pi = self.get_object()
        pi.status = "rejected"
        pi.save(update_fields=["status"])
        return Response({"status": "rejected"})

    @action(detail=True, methods=["get"])
    def export_pdf(self, request, pk=None):
        pi = self.get_object()
        po = pi.purchase_order
        buyer = pi.buyer
        items = list(PurchaseOrderItem.objects.filter(purchase_order=po).values(
            "color__name", "size", "quantity", "unit_price"
        ))
        item_data = [
            {
                "color_name": it["color__name"] or "N/A",
                "size": it["size"] or "",
                "quantity": it["quantity"],
                "unit_price": it["unit_price"],
            }
            for it in items
        ]
        extra = []
        if pi.validity_date:
            extra.append(("Validity Date:", str(pi.validity_date)))
        if pi.remarks:
            extra.append(("Remarks:", pi.remarks))

        pdf_bytes = generate_invoice_pdf(
            title="PROFORMA INVOICE",
            doc_number=pi.pi_number,
            doc_date=pi.issued_date,
            buyer=buyer,
            po=po,
            items=item_data,
            amount=pi.amount,
            currency=pi.currency,
            status=pi.status,
            extra_fields=extra if extra else None,
        )
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{pi.pi_number}.pdf"'
        return response


class SalesContractViewSet(viewsets.ModelViewSet):
    queryset = SalesContract.objects.all()
    serializer_class = SalesContractSerializer
    pagination_class = StandardResultsSetPagination
    search_fields = ["contract_number", "purchase_order__po_number"]
    filterset_fields = ["status", "buyer"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {
        "list": "commercial:view", "retrieve": "commercial:view",
        "create": "commercial:create", "update": "commercial:edit",
        "partial_update": "commercial:edit", "destroy": "commercial:delete",
    }

    def get_queryset(self):
        return SalesContract.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        import uuid
        contract_number = f"SC-{uuid.uuid4().hex[:8].upper()}"
        serializer.save(tenant=self.request.tenant, contract_number=contract_number)

    @action(detail=True, methods=["get"])
    def export_pdf(self, request, pk=None):
        sc = self.get_object()
        po = sc.purchase_order
        buyer = sc.buyer
        items = list(PurchaseOrderItem.objects.filter(purchase_order=po).values(
            "color__name", "size", "quantity", "unit_price"
        ))
        item_data = [
            {
                "color_name": it["color__name"] or "N/A",
                "size": it["size"] or "",
                "quantity": it["quantity"],
                "unit_price": it["unit_price"],
            }
            for it in items
        ]
        extra = []
        if hasattr(sc, "payment_terms") and sc.payment_terms:
            extra.append(("Payment Terms:", str(sc.payment_terms)))
        if sc.delivery_terms:
            extra.append(("Delivery Terms:", sc.delivery_terms))
        if sc.remarks:
            extra.append(("Remarks:", sc.remarks))

        pdf_bytes = generate_invoice_pdf(
            title="SALES CONTRACT",
            doc_number=sc.contract_number,
            doc_date=sc.contract_date,
            buyer=buyer,
            po=po,
            items=item_data,
            amount=sc.total_amount,
            currency=sc.currency,
            status=sc.status,
            extra_fields=extra if extra else None,
        )
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{sc.contract_number}.pdf"'
        return response


class SalesConfirmationViewSet(viewsets.ModelViewSet):
    queryset = SalesConfirmation.objects.all()
    serializer_class = SalesConfirmationSerializer
    pagination_class = StandardResultsSetPagination
    search_fields = ["confirmation_number", "purchase_order__po_number"]
    filterset_fields = ["status", "buyer"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {
        "list": "commercial:view", "retrieve": "commercial:view",
        "create": "commercial:create", "update": "commercial:edit",
        "partial_update": "commercial:edit", "destroy": "commercial:delete",
    }

    def get_queryset(self):
        return SalesConfirmation.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        import uuid
        confirmation_number = f"SCF-{uuid.uuid4().hex[:8].upper()}"
        serializer.save(tenant=self.request.tenant, confirmation_number=confirmation_number)

    @action(detail=True, methods=["post"])
    def send(self, request, pk=None):
        sc = self.get_object()
        if sc.status != "draft":
            return Response(
                {"error": f"Cannot send confirmation in '{sc.status}' status"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        sc.send()
        return Response(SalesConfirmationSerializer(sc, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def dispute(self, request, pk=None):
        sc = self.get_object()
        reason = (request.data.get("dispute_reason") or "").strip()
        if not reason:
            return Response(
                {"error": "dispute_reason is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if sc.status != "sent":
            return Response(
                {"error": f"Cannot dispute confirmation in '{sc.status}' status"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        sc.status = "disputed"
        sc.dispute_reason = reason
        sc.disputed_at = timezone.now()
        sc.save(update_fields=["status", "dispute_reason", "disputed_at", "updated_at"])
        return Response(SalesConfirmationSerializer(sc, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        sc = self.get_object()
        if sc.status != "sent":
            return Response(
                {"error": f"Cannot accept confirmation in '{sc.status}' status"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        sc.status = "accepted"
        sc.accepted_at = timezone.now()
        sc.auto_accepted = False
        sc.save(update_fields=["status", "accepted_at", "auto_accepted", "updated_at"])
        return Response(SalesConfirmationSerializer(sc, context={"request": request}).data)

    @action(detail=False, methods=["post"])
    def auto_accept(self, request):
        count = SalesConfirmation.auto_accept_overdue()
        return Response({"auto_accepted": count})

    @action(detail=False, methods=["get"])
    def dashboard(self, request):
        tenant = request.tenant
        qs = SalesConfirmation.objects.filter(tenant=tenant)
        by_status = {}
        for value, _ in SalesConfirmation._meta.get_field("status").choices:
            by_status[value] = qs.filter(status=value).count()
        overdue = sum(1 for sc in qs.filter(status="sent") if sc.window_elapsed())
        return Response({
            "total": qs.count(),
            "by_status": by_status,
            "overdue": overdue,
            "sent_within_window": qs.filter(status="sent").count() - overdue,
        })


class DebitNoteViewSet(viewsets.ModelViewSet):
    queryset = DebitNote.objects.all()
    serializer_class = DebitNoteSerializer
    pagination_class = StandardResultsSetPagination
    search_fields = ["debit_number", "purchase_order__po_number", "debited_party", "reason"]
    filterset_fields = ["status", "debit_type", "party_type"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {
        "list": "commercial:view", "retrieve": "commercial:view",
        "create": "commercial:create", "update": "commercial:edit",
        "partial_update": "commercial:edit", "destroy": "commercial:delete",
        "issue": "commercial:edit", "mark_paid": "commercial:edit",
        "pending_over_tolerance": "commercial:view", "dashboard": "commercial:view",
        "export": "commercial:view",
    }

    def get_queryset(self):
        qs = DebitNote.objects.select_related(
            "purchase_order__buyer", "currency", "reconciliation__shipment", "raised_by"
        )
        qs = qs.filter(tenant=self.request.tenant)
        return qs

    def perform_create(self, serializer):
        import uuid
        debit_number = f"DN-{uuid.uuid4().hex[:8].upper()}"
        serializer.save(
            tenant=self.request.tenant,
            debit_number=debit_number,
            raised_by=self.request.user,
        )

    @action(detail=True, methods=["post"])
    def issue(self, request, pk=None):
        """Formally issue a pro forma debit via the compliance email workflow."""
        dn = self.get_object()
        try:
            dn.issue()
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(DebitNoteSerializer(dn, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def mark_paid(self, request, pk=None):
        """Senior finance marks an issued debit as paid."""
        dn = self.get_object()
        try:
            dn.mark_paid()
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(DebitNoteSerializer(dn, context={"request": request}).data)

    @action(detail=False, methods=["get"])
    def pending_over_tolerance(self, request):
        """POs shipped over tolerance (5% / 2% Primark-Penney) needing a debit.

        Reuses RQ-031 PaperworkComparisonService so the over-tolerance rule is
        single-sourced.
        """
        comparison = PaperworkComparisonService.compare_tenant(request.tenant)
        results = []
        for r in comparison["results"]:
            if r["over_tolerance"]:
                results.append({
                    **r,
                    "tolerance_pct": str(r["tolerance_pct"]),
                    "quantity_variance_pct": (
                        str(r["quantity_variance_pct"])
                        if r["quantity_variance_pct"] is not None else None
                    ),
                })
        return Response({"count": len(results), "results": results})

    @action(detail=False, methods=["get"])
    def dashboard(self, request):
        tenant = request.tenant
        qs = DebitNote.objects.filter(tenant=tenant)
        by_status = {}
        for value, _ in DebitNote._meta.get_field("status").choices:
            by_status[value] = qs.filter(status=value).count()
        total_value = sum((Decimal(dn.amount) for dn in qs), Decimal("0.00"))
        return Response({
            "total": qs.count(),
            "total_value": str(total_value),
            "by_status": by_status,
            "compliance_emails_sent": qs.filter(compliance_email_sent=True).count(),
            "pending_value": str(sum(
                (Decimal(dn.amount) for dn in qs.exclude(status="paid")), Decimal("0.00")
            )),
        })

    @action(detail=False, methods=["get"])
    def export(self, request):
        import csv
        from io import StringIO

        qs = self.get_queryset()

        output = StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "debit_number", "po_number", "buyer", "debited_party", "party_type",
            "debit_type", "amount", "currency", "status", "compliance_email_sent",
            "shortage_units", "tolerance_pct", "reason", "notes",
        ])
        for dn in qs:
            writer.writerow([
                dn.debit_number,
                dn.purchase_order.po_number if dn.purchase_order_id else "",
                dn.purchase_order.buyer.name if dn.purchase_order_id and dn.purchase_order.buyer_id else "",
                dn.debited_party,
                dn.get_party_type_display(),
                dn.get_debit_type_display(),
                str(dn.amount),
                dn.currency.code if dn.currency_id else "",
                dn.status,
                "yes" if dn.compliance_email_sent else "no",
                str(dn.shortage_units),
                str(dn.tolerance_pct),
                dn.reason,
                dn.notes,
            ])
        response = HttpResponse(output.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="debit_notes.csv"'
        return response


class InvoiceApprovalViewSet(viewsets.ModelViewSet):
    queryset = InvoiceApproval.objects.all()
    serializer_class = InvoiceApprovalSerializer
    pagination_class = StandardResultsSetPagination
    search_fields = ["invoice_number", "purchase_order__po_number", "notes"]
    filterset_fields = ["status", "invoice_type", "purchase_order"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {
        "list": "commercial:view", "retrieve": "commercial:view",
        "create": "commercial:create", "update": "commercial:edit",
        "partial_update": "commercial:edit", "destroy": "commercial:delete",
        "approve": "commercial:edit", "reject": "commercial:edit",
        "raise_debit": "commercial:edit", "dashboard": "commercial:view",
        "export": "commercial:view",
    }

    def get_queryset(self):
        qs = InvoiceApproval.objects.select_related(
            "purchase_order__buyer", "currency", "debit_note",
            "approved_by", "rejected_by",
        )
        qs = qs.filter(tenant=self.request.tenant)
        return qs

    def perform_create(self, serializer):
        import uuid
        invoice_number = f"INV-{uuid.uuid4().hex[:8].upper()}"
        serializer.save(
            tenant=self.request.tenant,
            invoice_number=invoice_number,
            created_by=self.request.user,
        )

    def filter_queryset(self, queryset):
        qs = super().filter_queryset(queryset)
        match = self.request.query_params.get("match")
        if match:
            matched = [inv.id for inv in qs if inv.match_status == match]
            return InvoiceApproval.objects.filter(pk__in=matched)
        return qs

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """Planner signs off the invoice and hands over to accounts."""
        inv = self.get_object()
        try:
            inv.approve(request.user)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(InvoiceApprovalSerializer(inv, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        """Reject a pending invoice; a rejection reason is required."""
        inv = self.get_object()
        reason = (request.data.get("rejection_reason") or "").strip()
        if not reason:
            return Response(
                {"error": "rejection_reason is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            inv.reject(reason, request.user)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(InvoiceApprovalSerializer(inv, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def raise_debit(self, request, pk=None):
        """Raise a pro forma debit (GC-023) for an over-tolerance invoice."""
        inv = self.get_object()
        try:
            debit = inv.raise_debit(request.user)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(DebitNoteSerializer(debit, context={"request": request}).data)

    @action(detail=False, methods=["get"])
    def dashboard(self, request):
        tenant = request.tenant
        qs = InvoiceApproval.objects.filter(tenant=tenant)
        by_status = {}
        for value, _ in InvoiceApproval._meta.get_field("status").choices:
            by_status[value] = qs.filter(status=value).count()
        return Response({
            "total": qs.count(),
            "by_status": by_status,
            "over_tolerance": sum(1 for inv in qs if inv.over_tolerance),
            "auto_approval_eligible": sum(1 for inv in qs if inv.auto_approval_eligible),
        })

    @action(detail=False, methods=["get"])
    def export(self, request):
        import csv
        from io import StringIO

        qs = self.get_queryset()

        output = StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "invoice_number", "invoice_type", "po_number", "buyer", "invoice_date",
            "quantity", "unit_price", "amount", "currency", "status",
            "match_status", "over_tolerance", "debit_number", "rejection_reason",
        ])
        for inv in qs:
            writer.writerow([
                inv.invoice_number,
                inv.get_invoice_type_display(),
                inv.purchase_order.po_number if inv.purchase_order_id else "",
                inv.purchase_order.buyer.name if inv.purchase_order_id and inv.purchase_order.buyer_id else "",
                str(inv.invoice_date) if inv.invoice_date else "",
                str(inv.quantity),
                str(inv.unit_price),
                str(inv.amount),
                inv.currency.code if inv.currency_id else "",
                inv.status,
                inv.match_status,
                "yes" if inv.over_tolerance else "no",
                inv.debit_note.debit_number if inv.debit_note_id else "",
                inv.rejection_reason,
            ])
        response = HttpResponse(output.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="invoice_approvals.csv"'
        return response