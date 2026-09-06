"""
Logistics views for BHMS.
"""
import csv
import uuid
from decimal import Decimal
from io import StringIO

from django.http import HttpResponse
from django.db.models import Q, Sum
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.pagination import StandardResultsSetPagination
from apps.core.permissions import HasPermission

from .models import (
    BookingScheduleItem,
    CostReconciliation,
    Docket,
    ExportRecap,
    FinalHitReconciliation,
    FreightForwarder,
    ImportRecap,
    Shipment,
    ShippingDocument,
    SupplierPayment,
)
from .serializers import (
    BookingScheduleItemSerializer,
    CostReconciliationSerializer,
    DocketSerializer,
    ExportRecapSerializer,
    FinalHitReconciliationSerializer,
    FreightForwarderSerializer,
    ImportRecapSerializer,
    ShipmentSerializer,
    ShippingDocumentSerializer,
    SupplierPaymentSerializer,
)
from .services.paperwork_comparison import PaperworkComparisonService


class ShipmentViewSet(viewsets.ModelViewSet):
    queryset = Shipment.objects.all()
    serializer_class = ShipmentSerializer
    pagination_class = StandardResultsSetPagination
    search_fields = ["shipment_number", "purchase_order__po_number", "factory__name", "booking_reference"]
    filterset_fields = ["status", "mode", "factory", "freight_forwarder"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {
        "list": "logistics:view", "retrieve": "logistics:view",
        "create": "logistics:create", "update": "logistics:edit",
        "partial_update": "logistics:edit", "destroy": "logistics:delete",
        "transition": "logistics:edit", "dashboard": "logistics:view",
        "export": "logistics:view", "booking_ref_alerts": "logistics:view",
        "paperwork_comparison": "logistics:view",
    }

    def get_queryset(self):
        return Shipment.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        shipment_number = f"SH-{uuid.uuid4().hex[:8].upper()}"
        serializer.save(
            tenant=self.request.tenant,
            created_by=self.request.user,
            shipment_number=shipment_number,
        )

    @action(detail=True, methods=["post"])
    def transition(self, request, pk=None):
        shipment = self.get_object()
        new_status = request.data.get("status")
        if not new_status:
            return Response(
                {"error": "Missing 'status' field in request body"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        valid_transitions = {
            "booking": ["booked", "cancelled"],
            "booked": ["picked_up", "cancelled"],
            "picked_up": ["in_transit"],
            "in_transit": ["at_port", "arrived"],
            "at_port": ["on_water"],
            "on_water": ["arrived"],
            "arrived": ["cleared"],
            "cleared": ["delivered"],
        }
        allowed = valid_transitions.get(shipment.status, [])
        if new_status not in allowed:
            return Response(
                {"error": f"Cannot transition from '{shipment.status}' to '{new_status}'. Allowed: {allowed}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        shipment.status = new_status
        if new_status == "picked_up":
            shipment.atd = timezone.localtime(timezone.now()).date()
        elif new_status == "arrived":
            shipment.ata = timezone.localtime(timezone.now()).date()
        shipment.save()
        return Response({"status": new_status, "previous_status": shipment.status})

    @action(detail=False, methods=["get"])
    def dashboard(self, request):
        tenant = request.tenant
        qs = Shipment.objects.filter(tenant=tenant)
        today = timezone.localtime(timezone.now()).date()

        # Per-status counts for accurate pipeline
        status_counts = {}
        for s in dict(Shipment.STATUS_CHOICES):
            status_counts[s] = qs.filter(status=s).count()

        return Response({
            "total_shipments": qs.count(),
            "in_transit": qs.filter(status__in=["picked_up", "in_transit", "on_water"]).count(),
            "at_port": qs.filter(status="at_port").count(),
            "delivered": qs.filter(status="delivered").count(),
            "etd_today": qs.filter(etd=today).count(),
            "eta_today": qs.filter(eta=today).count(),
            "overdue": qs.filter(
                eta__lt=today,
                status__in=["booked", "picked_up", "in_transit", "at_port", "on_water"],
            ).count(),
            "status_counts": status_counts,
        })

    @action(detail=False, methods=["get"])
    def booking_ref_alerts(self, request):
        """Shipments whose booking reference is blank past the deadline."""
        tenant = request.tenant
        qs = Shipment.booking_ref_alerts(tenant=tenant).select_related(
            "purchase_order", "factory"
        )
        serializer = self.get_serializer(qs, many=True)
        return Response({"count": qs.count(), "results": serializer.data})

    @action(detail=False, methods=["get"])
    def paperwork_comparison(self, request):
        """GC-022: compare ordered vs shipped qty; estimate producible garments."""
        return Response(PaperworkComparisonService.compare_tenant(request.tenant))

    @action(detail=True, methods=["get"])
    def export(self, request, pk=None):
        shipment = self.get_object()
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(["Field", "Value"])
        writer.writerow(["Shipment #", shipment.shipment_number])
        writer.writerow(["PO #", shipment.purchase_order.po_number])
        writer.writerow(["Factory", shipment.factory.name if shipment.factory else "N/A"])
        writer.writerow(["Freight Forwarder", shipment.freight_forwarder.name if shipment.freight_forwarder else "N/A"])
        writer.writerow(["Mode", shipment.mode])
        writer.writerow(["Status", shipment.status])
        writer.writerow(["Booking Date", str(shipment.booking_date or "N/A")])
        writer.writerow(["Booking Reference", shipment.booking_reference or "N/A"])
        writer.writerow(["Booking Ref Required Date", str(shipment.booking_ref_required_date or "N/A")])
        writer.writerow(["ETD", str(shipment.etd or "N/A")])
        writer.writerow(["ETA", str(shipment.eta or "N/A")])
        writer.writerow(["ATD", str(shipment.atd or "N/A")])
        writer.writerow(["ATA", str(shipment.ata or "N/A")])
        writer.writerow(["Port of Loading", shipment.port_of_loading or "N/A"])
        writer.writerow(["Port of Discharge", shipment.port_of_discharge or "N/A"])
        writer.writerow(["Vessel", shipment.vessel_name or "N/A"])
        writer.writerow(["Voyage #", shipment.voyage_number or "N/A"])
        writer.writerow(["Container #", shipment.container_number or "N/A"])
        writer.writerow(["Seal #", shipment.seal_number or "N/A"])
        writer.writerow(["Container Size", shipment.container_size or "N/A"])
        writer.writerow(["Quantity", str(shipment.quantity)])
        writer.writerow(["Weight (kg)", str(shipment.weight_kg or "N/A")])
        writer.writerow(["CBM", str(shipment.cbm or "N/A")])
        writer.writerow(["Marks", shipment.marks or "N/A"])
        writer.writerow(["Remarks", shipment.remarks or "N/A"])
        response = HttpResponse(output.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="shipment_{shipment.shipment_number}.csv"'
        return response


class FreightForwarderViewSet(viewsets.ModelViewSet):
    queryset = FreightForwarder.objects.all()
    serializer_class = FreightForwarderSerializer
    pagination_class = StandardResultsSetPagination
    search_fields = ["name", "code"]
    filterset_fields = ["is_active"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {
        "list": "logistics:view", "retrieve": "logistics:view",
        "create": "logistics:create", "update": "logistics:edit",
        "partial_update": "logistics:edit", "destroy": "logistics:delete",
    }

    def get_queryset(self):
        return FreightForwarder.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class ShippingDocumentViewSet(viewsets.ModelViewSet):
    queryset = ShippingDocument.objects.all()
    serializer_class = ShippingDocumentSerializer
    pagination_class = StandardResultsSetPagination
    filterset_fields = ["shipment", "document_type"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {
        "list": "logistics:view", "retrieve": "logistics:view",
        "create": "logistics:create", "update": "logistics:edit",
        "partial_update": "logistics:edit", "destroy": "logistics:delete",
    }

    def get_queryset(self):
        return ShippingDocument.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant, created_by=self.request.user)


class BookingScheduleItemViewSet(viewsets.ModelViewSet):
    queryset = BookingScheduleItem.objects.all()
    serializer_class = BookingScheduleItemSerializer
    pagination_class = StandardResultsSetPagination
    search_fields = [
        "shipment__shipment_number",
        "shipment__purchase_order__po_number",
        "hit__colour",
        "hit__hit_number",
    ]
    filterset_fields = ["shipment", "hit", "status", "risk_level", "week_ending"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {
        "list": "logistics:view", "retrieve": "logistics:view",
        "create": "logistics:create", "update": "logistics:edit",
        "partial_update": "logistics:edit", "destroy": "logistics:delete",
        "transition": "logistics:edit", "weekly": "logistics:view",
    }

    def get_queryset(self):
        return BookingScheduleItem.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant, created_by=self.request.user)
        self._stamp_snapshot(serializer.instance)

    def perform_update(self, serializer):
        serializer.save()
        self._stamp_snapshot(serializer.instance)

    def _stamp_snapshot(self, item):
        """Capture the point-in-time snapshot at save time (B8 / 16.1 snapshot columns)."""
        snapshot = {
            "status": item.status,
            "cut_qty": str(item.cut_qty) if item.cut_qty is not None else None,
            "garments_ready_qty": str(item.garments_ready_qty) if item.garments_ready_qty is not None else None,
            "ex_factory_date": item.ex_factory_date.isoformat() if item.ex_factory_date else None,
            "week_ending": item.week_ending.isoformat(),
        }
        item.snapshot_data = snapshot
        item.snapshot_date = timezone.now()
        item.save(update_fields=["snapshot_data", "snapshot_date", "updated_at"])

    @action(detail=True, methods=["post"])
    def transition(self, request, pk=None):
        item = self.get_object()
        new_status = request.data.get("status")
        if not new_status:
            return Response(
                {"error": "Missing 'status' field in request body"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        valid_transitions = {
            "live": ["in_work"],
            "in_work": ["delivered"],
            "delivered": [],
        }
        allowed = valid_transitions.get(item.status, [])
        if new_status not in allowed:
            return Response(
                {"error": f"Cannot transition from '{item.status}' to '{new_status}'. Allowed: {allowed}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        item.status = new_status
        item.save()
        if new_status == "delivered" and item.hit is not None:
            self._trigger_final_hit_reconciliation(item)
        return Response({"status": new_status, "previous_status": item.status})

    def _trigger_final_hit_reconciliation(self, item):
        """GC-021: delivering the final hit triggers a hit reconciliation."""
        po = item.shipment.purchase_order
        rec, _ = FinalHitReconciliation.objects.get_or_create(
            tenant=item.tenant,
            shipment=item.shipment,
            defaults={"created_by": item.created_by},
        )
        rec.schedule_item = item
        rec.docket_quantity = po.quantity if po else item.shipment.quantity
        rec.shipped_quantity = item.shipment.quantity
        rec.save()

    @action(detail=False, methods=["get"])
    def weekly(self, request):
        tenant = request.tenant
        qs = BookingScheduleItem.objects.filter(tenant=tenant)
        week_ending = request.query_params.get("week_ending")
        if week_ending:
            qs = qs.filter(week_ending=week_ending)
        items = qs.order_by("week_ending", "shipment__shipment_number")
        serializer = self.get_serializer(items, many=True)
        return Response({
            "count": items.count(),
            "results": serializer.data,
        })


class DocketViewSet(viewsets.ModelViewSet):
    """
    Production dockets (GC-020) with contract pricing and the over-200m
    fabric rule: any fabric over 200 meters unusable after the final docket
    must be sent to sales for direction.
    """
    queryset = Docket.objects.all()
    serializer_class = DocketSerializer
    pagination_class = StandardResultsSetPagination
    search_fields = [
        "docket_number",
        "shipment__shipment_number",
        "shipment__purchase_order__po_number",
    ]
    filterset_fields = ["shipment", "is_final", "sales_notified"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {
        "list": "logistics:view", "retrieve": "logistics:view",
        "create": "logistics:create", "update": "logistics:edit",
        "partial_update": "logistics:edit", "destroy": "logistics:delete",
        "send_to_sales": "logistics:edit", "over_limit": "logistics:view",
    }

    def get_queryset(self):
        return Docket.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(
            tenant=self.request.tenant,
            created_by=self.request.user,
            docket_number=f"DK-{uuid.uuid4().hex[:8].upper()}",
        )

    @action(detail=True, methods=["post"])
    def send_to_sales(self, request, pk=None):
        docket = self.get_object()
        if docket.sales_notified:
            return Response(
                {"error": "Docket already sent to sales"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        docket.notify_sales()
        return Response({
            "sales_notified": True,
            "sales_notified_at": docket.sales_notified_at,
        })

    @action(detail=False, methods=["get"])
    def over_limit(self, request):
        tenant = request.tenant
        qs = Docket.objects.filter(tenant=tenant)
        flagged = [d for d in qs if d.requires_sales_notification]
        serializer = self.get_serializer(flagged, many=True)
        return Response({
            "count": len(flagged),
            "results": serializer.data,
        })


class ImportRecapViewSet(viewsets.ModelViewSet):
    """
    RQ-043 (B2): Import Recap — fabric/trims inbound tracking.

    CRUD with tenant isolation and logistics permission gating.  The grid
    columns mirror the reference Import Recap tracker.
    """
    queryset = ImportRecap.objects.all()
    serializer_class = ImportRecapSerializer
    pagination_class = StandardResultsSetPagination
    search_fields = [
        "s_c_number",
        "container",
        "bl_hawb",
        "vessel",
        "supplier__name",
        "factory__name",
        "agent",
    ]
    filterset_fields = [
        "status", "mode", "lc_foc", "item_category",
        "docs_received", "supplier", "factory",
    ]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {
        "list": "logistics:view", "retrieve": "logistics:view",
        "create": "logistics:create", "update": "logistics:edit",
        "partial_update": "logistics:edit", "destroy": "logistics:delete",
        "recap_summary": "logistics:view",
    }

    def get_queryset(self):
        return ImportRecap.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant, created_by=self.request.user)

    @action(detail=False, methods=["get"])
    def recap_summary(self, request):
        """B6 (RQ-047): inbound Import Recap report, groups per supplier /
        factory / item-category with invoice-value and quantity totals."""
        recaps = self.get_queryset()
        suppliers = []
        for row in (
            recaps.exclude(supplier=None)
            .values("supplier__name")
            .annotate(
                invoice_value=Sum("invoice_value"),
                quantity=Sum("quantity"),
            )
        ):
            suppliers.append({
                "supplier": row["supplier__name"],
                "invoice_value": str(row["invoice_value"] or 0),
                "quantity": str(row["quantity"] or 0),
            })
        factories = []
        for row in (
            recaps.exclude(factory=None)
            .values("factory__name")
            .annotate(
                invoice_value=Sum("invoice_value"),
                quantity=Sum("quantity"),
            )
        ):
            factories.append({
                "factory": row["factory__name"],
                "invoice_value": str(row["invoice_value"] or 0),
                "quantity": str(row["quantity"] or 0),
            })
        categories = []
        for row in recaps.values("item_category").annotate(
            invoice_value=Sum("invoice_value"),
            quantity=Sum("quantity"),
        ):
            categories.append({
                "item_category": row["item_category"],
                "invoice_value": str(row["invoice_value"] or 0),
                "quantity": str(row["quantity"] or 0),
            })
        agg = recaps.aggregate(
            invoice_value=Sum("invoice_value"),
            quantity=Sum("quantity"),
        )
        return Response({
            "suppliers": suppliers,
            "factories": factories,
            "categories": categories,
            "total": {
                "invoice_value": str(agg["invoice_value"] or 0),
                "quantity": str(agg["quantity"] or 0),
            },
        })


class ExportRecapViewSet(viewsets.ModelViewSet):
    """
    RQ-044 (B3): Export Recap — per-hit landed economics.

    CRUD with tenant isolation and logistics permission gating.  The grid
    columns mirror the reference Export Recap tracker (identifiers, landed
    values, logistics, and the payment-to-factory / payment-from-customer
    pipelines).
    """
    queryset = ExportRecap.objects.all()
    serializer_class = ExportRecapSerializer
    pagination_class = StandardResultsSetPagination
    search_fields = [
        "fob_no",
        "s_c_number",
        "factory_invoice",
        "customer_invoice",
        "container",
        "hbl",
        "bl_number",
        "courier",
        "factory__name",
        "forwarder__name",
    ]
    filterset_fields = [
        "mode", "factory", "forwarder", "purchase_order",
        "factory_paid_date", "customer_payment_date",
    ]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {
        "list": "logistics:view", "retrieve": "logistics:view",
        "create": "logistics:create", "update": "logistics:edit",
        "partial_update": "logistics:edit", "destroy": "logistics:delete",
        "sales_summary": "logistics:view", "recap_summary": "logistics:view",
    }

    def get_queryset(self):
        return ExportRecap.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant, created_by=self.request.user)

    @action(detail=False, methods=["get"])
    def sales_summary(self, request):
        """B6 (RQ-047): Sales Summary report — per-buyer and per-factory
        groupings over the export recap figures plus a grand total."""
        recaps = self.get_queryset()
        buyers = []
        for row in (
            recaps.exclude(purchase_order=None)
            .exclude(purchase_order__buyer=None)
            .values("purchase_order__buyer__name")
            .annotate(
                quantity=Sum("quantity"),
                fob_value=Sum("fob_value"),
                cmpt_value=Sum("cmpt_value"),
                cost_value=Sum("cost_value"),
                factory_amount=Sum("factory_amount"),
                customer_received_amount=Sum("customer_received_amount"),
            )
        ):
            buyers.append({
                "buyer": row["purchase_order__buyer__name"],
                "quantity": str(row["quantity"] or 0),
                "fob_value": str(row["fob_value"] or 0),
                "cmpt_value": str(row["cmpt_value"] or 0),
                "cost_value": str(row["cost_value"] or 0),
                "factory_amount": str(row["factory_amount"] or 0),
                "customer_received_amount": str(row["customer_received_amount"] or 0),
            })
        factories = []
        for row in (
            recaps.exclude(factory=None)
            .values("factory__name")
            .annotate(
                quantity=Sum("quantity"),
                fob_value=Sum("fob_value"),
                cmpt_value=Sum("cmpt_value"),
                cost_value=Sum("cost_value"),
                factory_amount=Sum("factory_amount"),
                customer_received_amount=Sum("customer_received_amount"),
            )
        ):
            factories.append({
                "factory": row["factory__name"],
                "quantity": str(row["quantity"] or 0),
                "fob_value": str(row["fob_value"] or 0),
                "cmpt_value": str(row["cmpt_value"] or 0),
                "cost_value": str(row["cost_value"] or 0),
                "factory_amount": str(row["factory_amount"] or 0),
                "customer_received_amount": str(row["customer_received_amount"] or 0),
            })
        total = recaps.aggregate(
            quantity=Sum("quantity"),
            fob_value=Sum("fob_value"),
            cmpt_value=Sum("cmpt_value"),
            cost_value=Sum("cost_value"),
            factory_amount=Sum("factory_amount"),
            customer_received_amount=Sum("customer_received_amount"),
        )
        return Response({
            "buyers": buyers,
            "factories": factories,
            "total": {k: str(v or 0) for k, v in total.items()},
        })

    @action(detail=False, methods=["get"])
    def recap_summary(self, request):
        """B6 (RQ-047): Export Recap report — per-factory grouping plus a
        grand total (quantity + landed values)."""
        recaps = self.get_queryset()
        factories = []
        for row in (
            recaps.exclude(factory=None)
            .values("factory__name")
            .annotate(
                quantity=Sum("quantity"),
                fob_value=Sum("fob_value"),
                cmpt_value=Sum("cmpt_value"),
                cost_value=Sum("cost_value"),
            )
        ):
            factories.append({
                "factory": row["factory__name"],
                "quantity": str(row["quantity"] or 0),
                "fob_value": str(row["fob_value"] or 0),
                "cmpt_value": str(row["cmpt_value"] or 0),
                "cost_value": str(row["cost_value"] or 0),
            })
        total = recaps.aggregate(
            quantity=Sum("quantity"),
            fob_value=Sum("fob_value"),
            cmpt_value=Sum("cmpt_value"),
            cost_value=Sum("cost_value"),
        )
        return Response({
            "factories": factories,
            "total": {k: str(v or 0) for k, v in total.items()},
        })


class SupplierPaymentViewSet(viewsets.ModelViewSet):
    """
    RQ-045 (B4): Supplier Payment + Due — SP log.

    CRUD with tenant isolation and logistics permission gating plus two
    behaviour actions: `release` stamps the payment as released
    (release workflow) and `due_pivot` returns an aggregate per
    supplier x due-month (due pivot used by the grid/report).
    """
    queryset = SupplierPayment.objects.all()
    serializer_class = SupplierPaymentSerializer
    pagination_class = StandardResultsSetPagination
    search_fields = [
        "payment_ref",
        "invoice_no",
        "fn_ref",
        "supplier__name",
        "purchase_order__po_number",
        "lc__lc_number",
    ]
    filterset_fields = [
        "supplier", "purchase_order", "lc", "released", "payment_method",
        "payment_date", "due_date",
    ]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {
        "list": "logistics:view", "retrieve": "logistics:view",
        "create": "logistics:create", "update": "logistics:edit",
        "partial_update": "logistics:edit", "destroy": "logistics:delete",
        "release": "logistics:edit",
    }

    def get_queryset(self):
        queryset = SupplierPayment.objects.filter(tenant=self.request.tenant)
        status_filter = self.request.query_params.get("status")
        if status_filter:
            today = timezone.localdate()
            if status_filter == "released":
                queryset = queryset.filter(released=True)
            elif status_filter == "overdue":
                queryset = queryset.filter(released=False, due_date__lt=today)
            elif status_filter == "to_be_released":
                queryset = queryset.filter(released=False).exclude(due_date__lt=today)
        return queryset

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant, created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def release(self, request, pk=None):
        payment = self.get_object()
        payment.release(user=request.user)
        return Response(SupplierPaymentSerializer(payment, context={"request": request}).data)

    @action(detail=False, methods=["get"])
    def due_pivot(self, request):
        payments = self.get_queryset()
        month = request.query_params.get("month")
        if month:
            payments = payments.filter(due_date__year=int(month[:4]), due_date__month=int(month[5:7]))
        rows = (
            payments.exclude(supplier=None)
            .exclude(due_date=None)
            .values("supplier__name")
            .annotate(
                total=Sum("amount"),
                released_total=Sum("amount", filter=Q(released=True)),
                overdue_due=Sum("amount", filter=Q(released=False, due_date__lt=timezone.localdate())),
            )
        )
        pivoted = []
        for row in rows:
            pivoted.append({
                "supplier": row["supplier__name"],
                "month": month or "ALL",
                "total": str(row["total"] or 0),
                "released_total": str(row["released_total"] or 0),
                "overdue_due": str(row["overdue_due"] or 0),
            })
        return Response({"results": pivoted})


class FinalHitReconciliationViewSet(viewsets.ModelViewSet):
    """
    GC-021 Final Hit Reconciliation.

    Auto-raised when the booking schedule item is marked Delivered once the
    last hit has gone. Compares shipped quantity against docket/PO quantity;
    anything over 20 units short that is not explained by evident reasons must
    be debited (GC Manual Reconciliation procedures).
    """
    queryset = FinalHitReconciliation.objects.all()
    serializer_class = FinalHitReconciliationSerializer
    pagination_class = StandardResultsSetPagination
    search_fields = [
        "shipment__shipment_number",
        "shipment__purchase_order__po_number",
    ]
    filterset_fields = ["shipment", "status", "reasons_evident"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {
        "list": "logistics:view", "retrieve": "logistics:view",
        "create": "logistics:create", "update": "logistics:edit",
        "partial_update": "logistics:edit", "destroy": "logistics:delete",
        "reconcile": "logistics:edit", "mark_debited": "logistics:edit",
        "waive": "logistics:edit", "over_limit": "logistics:view",
    }

    def get_queryset(self):
        return FinalHitReconciliation.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant, created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def reconcile(self, request, pk=None):
        rec = self.get_object()
        shipped_quantity = request.data.get("shipped_quantity")
        if shipped_quantity in (None, ""):
            shipped_quantity = None
        else:
            shipped_quantity = Decimal(str(shipped_quantity))
        rec.reconcile(shipped_quantity=shipped_quantity, user=request.user)
        return Response(self.get_serializer(rec).data)

    @action(detail=True, methods=["post"])
    def mark_debited(self, request, pk=None):
        rec = self.get_object()
        if rec.status == "waived":
            return Response(
                {"error": "Cannot debit a waived reconciliation"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        rec.status = "debited"
        rec.save()
        return Response(self.get_serializer(rec).data)

    @action(detail=True, methods=["post"])
    def waive(self, request, pk=None):
        rec = self.get_object()
        rec.reasons_evident = bool(request.data.get("reasons_evident", True))
        rec.notes = request.data.get("notes", rec.notes)
        rec.status = "waived"
        rec.save()
        return Response(self.get_serializer(rec).data)

    @action(detail=False, methods=["get"])
    def over_limit(self, request):
        tenant = request.tenant
        qs = FinalHitReconciliation.objects.filter(tenant=tenant)
        flagged = [r for r in qs if r.requires_debit and r.status == "pending"]
        serializer = self.get_serializer(flagged, many=True)
        return Response({
            "count": len(flagged),
            "results": serializer.data,
        })


class CostReconciliationViewSet(viewsets.ModelViewSet):
    """
    RQ-046 (B5): Cost update / reconcile.

    Compares the Factory Invoice (MP) against the Planning CM for an order,
    deriving a Saving/Loss per unit and total, flagging a mismatch, and exposing
    a status workflow (compare / resolve actions) on a Tabulator grid.
    """
    queryset = CostReconciliation.objects.all()
    serializer_class = CostReconciliationSerializer
    pagination_class = StandardResultsSetPagination
    search_fields = [
        "purchase_order__po_number",
        "purchase_order__buyer__name",
        "purchase_order__factory__name",
        "notes",
    ]
    filterset_fields = ["purchase_order", "export_recap", "costing", "status"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {
        "list": "logistics:view", "retrieve": "logistics:view",
        "create": "logistics:create", "update": "logistics:edit",
        "partial_update": "logistics:edit", "destroy": "logistics:delete",
        "compare": "logistics:edit", "resolve": "logistics:edit",
    }

    def get_queryset(self):
        qs = CostReconciliation.objects.filter(tenant=self.request.tenant)
        mismatch = self.request.query_params.get("mismatch")
        if mismatch is not None:
            want = str(mismatch).strip().lower() in ("1", "true", "yes", "on")
            qs = qs.filter(is_mismatch=want)
        return qs

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant, created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def compare(self, request, pk=None):
        """Update Factory Inv / Planning CM inputs and re-run the comparison."""
        rec = self.get_object()
        amt_factory = request.data.get("factory_inv_amount")
        amt_cm = request.data.get("planning_cm_amount")
        qty_factory = request.data.get("factory_inv_qty")
        qty_cm = request.data.get("planning_cm_qty")

        def _dec(v):
            if v in (None, ""):
                return None
            return Decimal(str(v))

        rec.compare(
            factory_inv_amount=_dec(amt_factory),
            planning_cm_amount=_dec(amt_cm),
            factory_inv_qty=_dec(qty_factory),
            planning_cm_qty=_dec(qty_cm),
            user=request.user,
        )
        return Response(self.get_serializer(rec).data)

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        """Set a workflow status (reconciled / disputed / resolved)."""
        rec = self.get_object()
        new_status = request.data.get("status", "resolved")
        if new_status not in dict(CostReconciliation.STATUS_CHOICES):
            return Response(
                {"error": "invalid status"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        rec.status = new_status
        rec.resolve_status(status=new_status, user=request.user)
        return Response(self.get_serializer(rec).data)