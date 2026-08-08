"""
Quality views for BHMS.
"""
from datetime import datetime

from django.db.models import BooleanField, Case, Q, Value, When
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.pagination import StandardResultsSetPagination
from apps.core.permissions import HasPermission
from apps.merchandising.models import PurchaseOrder

from .models import ComplianceAudit, CorrectiveAction, GoldSeal, Inspection, InspectionItem
from .serializers import (
    ComplianceAuditSerializer,
    CorrectiveActionSerializer,
    GoldSealSerializer,
    InspectionItemSerializer,
    InspectionSerializer,
)


class InspectionViewSet(viewsets.ModelViewSet):
    queryset = Inspection.objects.all()
    serializer_class = InspectionSerializer
    pagination_class = StandardResultsSetPagination
    search_fields = ["purchase_order__po_number"]
    filterset_fields = ["status", "inspection_type", "factory", "purchase_order"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {
        "list": "quality:view", "retrieve": "quality:view",
        "create": "quality:create", "update": "quality:edit",
        "partial_update": "quality:edit", "destroy": "quality:delete",
    }

    def get_queryset(self):
        return Inspection.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        inspection = serializer.save(
            tenant=self.request.tenant,
            created_by=self.request.user
        )
        self._recalculate(inspection)

    def _recalculate(self, inspection):
        total_sample = inspection.passed_quantity + inspection.rejected_quantity
        if total_sample > 0:
            inspection.sample_size = total_sample
            inspection.save(update_fields=["sample_size"])

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        inspection = self.get_object()
        if inspection.status != "pending":
            return Response(
                {"error": f"Cannot start inspection in '{inspection.status}' status"},
                status=status.HTTP_400_BAD_REQUEST
            )
        inspection.status = "in_progress"
        inspection.save(update_fields=["status"])
        return Response({"status": "in_progress"})

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        inspection = self.get_object()
        if inspection.status not in ("in_progress", "pending"):
            return Response(
                {"error": f"Cannot complete inspection in '{inspection.status}' status"},
                status=status.HTTP_400_BAD_REQUEST
            )
        total = inspection.passed_quantity + inspection.rejected_quantity
        reject_rate = (inspection.rejected_quantity / total * 100) if total > 0 else 0
        aql_threshold = float(inspection.aql_level)
        inspection.status = "passed" if reject_rate <= aql_threshold else "failed"
        inspection.save(update_fields=["status"])
        return Response({"status": inspection.status})

    @action(detail=True, methods=["get"])
    def export(self, request, pk=None):
        inspection = self.get_object()
        import csv
        from io import StringIO
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(["Field", "Value"])
        writer.writerow(["PO Number", inspection.purchase_order.po_number])
        writer.writerow(["Factory", inspection.factory.name])
        writer.writerow(["Type", inspection.inspection_type])
        writer.writerow(["Date", str(inspection.inspection_date)])
        writer.writerow(["AQL Level", str(inspection.aql_level)])
        writer.writerow(["Sample Size", inspection.sample_size or "N/A"])
        writer.writerow(["Passed", inspection.passed_quantity])
        writer.writerow(["Rejected", inspection.rejected_quantity])
        writer.writerow(["Status", inspection.status])
        if inspection.items.exists():
            writer.writerow([])
            writer.writerow(["Defect Type", "Count", "Severity", "Description"])
            for item in inspection.items.all():
                writer.writerow([item.defect_type, item.defect_count, item.severity, item.description])
        response = HttpResponse(output.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="inspection_{inspection.purchase_order.po_number}.csv"'
        return response


class InspectionItemViewSet(viewsets.ModelViewSet):
    queryset = InspectionItem.objects.all()
    serializer_class = InspectionItemSerializer
    pagination_class = StandardResultsSetPagination
    filterset_fields = ["inspection", "severity"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {
        "list": "quality:view", "retrieve": "quality:view",
        "create": "quality:create", "update": "quality:edit",
        "partial_update": "quality:edit", "destroy": "quality:delete",
    }

    def get_queryset(self):
        return InspectionItem.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class CorrectiveActionViewSet(viewsets.ModelViewSet):
    queryset = CorrectiveAction.objects.all()
    serializer_class = CorrectiveActionSerializer
    pagination_class = StandardResultsSetPagination
    search_fields = ["title", "description"]
    filterset_fields = ["status", "priority", "inspection"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {
        "list": "quality:view", "retrieve": "quality:view",
        "create": "quality:create", "update": "quality:edit",
        "partial_update": "quality:edit", "destroy": "quality:delete",
    }

    def get_queryset(self):
        return CorrectiveAction.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        action = self.get_object()
        if action.status not in ("open", "in_progress"):
            return Response(
                {"error": f"Cannot complete action in '{action.status}' status"},
                status=status.HTTP_400_BAD_REQUEST
            )
        action.status = "completed"
        action.completed_date = timezone.localtime(timezone.now()).date()
        action.save(update_fields=["status", "completed_date"])
        return Response({"status": "completed"})

    @action(detail=True, methods=["post"])
    def verify(self, request, pk=None):
        action = self.get_object()
        if action.status != "completed":
            return Response(
                {"error": "Action must be completed before verification"},
                status=status.HTTP_400_BAD_REQUEST
            )
        action.status = "verified"
        action.verified_by = request.user
        action.verified_at = timezone.now()
        action.save(update_fields=["status", "verified_by", "verified_at"])
        return Response({"status": "verified"})

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        action = self.get_object()
        if action.status != "verified":
            return Response(
                {"error": "Action must be verified before closing"},
                status=status.HTTP_400_BAD_REQUEST
            )
        action.status = "closed"
        action.save(update_fields=["status"])
        return Response({"status": "closed"})


class GoldSealViewSet(viewsets.ModelViewSet):
    queryset = GoldSeal.objects.all()
    serializer_class = GoldSealSerializer
    pagination_class = StandardResultsSetPagination
    search_fields = ["shipment__shipment_number", "shipment__purchase_order__po_number", "notes"]
    filterset_fields = ["status", "shipment"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {
        "list": "quality:view", "retrieve": "quality:view",
        "create": "quality:create", "update": "quality:edit",
        "partial_update": "quality:edit", "destroy": "quality:delete",
        "send": "quality:edit", "approve": "quality:edit", "reject": "quality:edit",
    }

    def get_queryset(self):
        return GoldSeal.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)

    @action(detail=True, methods=["post"])
    def send(self, request, pk=None):
        seal = self.get_object()
        if seal.status != "pending":
            return Response(
                {"error": f"Cannot send gold seal in '{seal.status}' status"},
                status=status.HTTP_400_BAD_REQUEST
            )
        seal.status = "sent"
        seal.sent_date = timezone.localtime(timezone.now()).date()
        seal.save(update_fields=["status", "sent_date"])
        return Response({"status": "sent", "sent_date": str(seal.sent_date)})

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        seal = self.get_object()
        if seal.status != "sent":
            return Response(
                {"error": "Gold seal must be sent before approval"},
                status=status.HTTP_400_BAD_REQUEST
            )
        seal.status = "approved"
        seal.approval_date = timezone.localtime(timezone.now()).date()
        seal.save(update_fields=["status", "approval_date"])
        return Response({"status": "approved", "approval_date": str(seal.approval_date)})

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        seal = self.get_object()
        if seal.status != "sent":
            return Response(
                {"error": "Gold seal must be sent before rejection"},
                status=status.HTTP_400_BAD_REQUEST
            )
        seal.status = "rejected"
        seal.save(update_fields=["status"])
        return Response({"status": "rejected"})


class ComplianceAuditViewSet(viewsets.ModelViewSet):
    queryset = ComplianceAudit.objects.all()
    serializer_class = ComplianceAuditSerializer
    pagination_class = StandardResultsSetPagination
    search_fields = [
        "purchase_order__po_number", "purchase_order__buyer__name", "notes",
    ]
    filterset_fields = ["purchase_order", "week_start"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {
        "list": "quality:view", "retrieve": "quality:view",
        "create": "quality:create", "update": "quality:edit",
        "partial_update": "quality:edit", "destroy": "quality:delete",
        "weekly_overview": "quality:view", "export": "quality:view",
    }

    def get_queryset(self):
        queryset = ComplianceAudit.objects.select_related(
            "purchase_order__buyer",
            "purchase_order__file_opening__style",
        )
        queryset = queryset.filter(tenant=self.request.tenant)

        result = self.request.query_params.get("result")
        if result:
            stored_fails = (
                Q(fabric_paperwork_status="fail") | Q(dockets_status="fail")
                | Q(fabric_utilisation_status="fail") | Q(factory_invoice_status="fail")
                | Q(fabric_rating_status="fail") | Q(recon_costed_vs_actual_status="fail")
                | Q(final_hits_status="fail")
            )
            efficiency_fail = Q(
                efficiency_rate__isnull=False,
                efficiency_rate__lt=ComplianceAudit.EFFICIENCY_THRESHOLD,
            )
            all_na = (
                Q(fabric_paperwork_status="na", dockets_status="na",
                  fabric_utilisation_status="na", factory_invoice_status="na",
                  fabric_rating_status="na", recon_costed_vs_actual_status="na",
                  final_hits_status="na", efficiency_rate__isnull=True)
            )
            queryset = queryset.annotate(
                has_fail=Case(
                    When(stored_fails | efficiency_fail, then=Value(True)),
                    default=Value(False),
                    output_field=BooleanField(),
                ),
                is_pending=Case(
                    When(all_na, then=Value(True)),
                    default=Value(False),
                    output_field=BooleanField(),
                ),
            )
            if result == "fail":
                queryset = queryset.filter(has_fail=True)
            elif result == "pass":
                queryset = queryset.filter(has_fail=False, is_pending=False)
            elif result == "pending":
                queryset = queryset.filter(is_pending=True)

        return queryset

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant, created_by=self.request.user)

    def _resolve_week(self, request):
        week_param = request.query_params.get("week")
        week_date = None
        if week_param:
            try:
                week_date = datetime.strptime(week_param, "%Y-%m-%d").date()
            except ValueError:
                week_date = None
        return ComplianceAudit.week_start_for(week_date or timezone.localdate())

    @action(detail=False, methods=["get"])
    def weekly_overview(self, request):
        week_start = self._resolve_week(request)
        tenant = request.tenant
        audits = list(ComplianceAudit.objects.filter(
            tenant=tenant, week_start=week_start,
        ).select_related("purchase_order__buyer", "purchase_order__file_opening__style"))
        orders = list(PurchaseOrder.objects.filter(
            tenant=tenant,
        ).exclude(status="cancelled").select_related("buyer"))
        audited_ids = {audit.purchase_order_id for audit in audits}
        pending_orders = [po for po in orders if po.id not in audited_ids]

        pass_count = sum(1 for audit in audits if audit.overall_pass and audit.reviewed)
        fail_count = sum(1 for audit in audits if not audit.overall_pass)
        incomplete_count = sum(1 for audit in audits if not audit.reviewed)

        return Response({
            "week_start": str(week_start),
            "threshold": float(ComplianceAudit.EFFICIENCY_THRESHOLD),
            "checklist": [
                {"key": key, "label": label}
                for key, label in ComplianceAudit.CHECKLIST_ITEMS
            ],
            "summary": {
                "total_orders": len(orders),
                "audited": len(audits),
                "pass": pass_count,
                "fail": fail_count,
                "incomplete": incomplete_count,
                "pending": len(pending_orders),
            },
            "pending_orders": [
                {
                    "po_id": str(po.id),
                    "po_number": po.po_number,
                    "buyer_name": po.buyer.name,
                    "delivery_date": str(po.delivery_date),
                }
                for po in pending_orders
            ],
            "results": ComplianceAuditSerializer(
                audits, many=True, context={"request": request}
            ).data,
        })

    @action(detail=False, methods=["get"])
    def export(self, request):
        week_start = self._resolve_week(request)
        tenant = request.tenant
        audits = list(ComplianceAudit.objects.filter(
            tenant=tenant, week_start=week_start,
        ).select_related("purchase_order__buyer", "purchase_order__file_opening__style"))

        import csv
        from io import StringIO

        output = StringIO()
        writer = csv.writer(output)
        header = [
            "po_number", "buyer", "style_number", "delivery_date", "week_start",
            "efficiency_rate",
        ] + [label for _key, label in ComplianceAudit.CHECKLIST_ITEMS] + [
            "fail_count", "overall_pass", "warning_count", "notes",
        ]
        writer.writerow(header)
        for audit in audits:
            file_opening = getattr(audit.purchase_order, "file_opening", None)
            style = getattr(file_opening, "style", None)
            writer.writerow([
                audit.purchase_order.po_number,
                audit.purchase_order.buyer.name,
                getattr(style, "style_number", ""),
                str(audit.purchase_order.delivery_date),
                str(audit.week_start),
                "" if audit.efficiency_rate is None else str(audit.efficiency_rate),
            ] + [audit.status_for(key) for key, _label in ComplianceAudit.CHECKLIST_ITEMS] + [
                audit.fail_count,
                "True" if audit.overall_pass else "False",
                audit.warning_count,
                audit.notes,
            ])

        response = HttpResponse(output.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = (
            f'attachment; filename="compliance_audits_{week_start}.csv"'
        )
        return response