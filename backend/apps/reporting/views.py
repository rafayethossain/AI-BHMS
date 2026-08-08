"""
Reporting views for BHMS.
"""
import csv
from io import StringIO
from django.http import HttpResponse
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.core.permissions import HasPermission
from apps.core.pagination import StandardResultsSetPagination
from .models import SavedReport
from .serializers import SavedReportSerializer


class SavedReportViewSet(viewsets.ModelViewSet):
    queryset = SavedReport.objects.all()
    serializer_class = SavedReportSerializer
    pagination_class = StandardResultsSetPagination
    search_fields = ["name", "description"]
    filterset_fields = ["report_type", "is_scheduled"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {
        "list": "reports:view", "retrieve": "reports:view",
        "create": "reports:create", "update": "reports:edit",
        "partial_update": "reports:edit", "destroy": "reports:delete",
    }

    def get_queryset(self):
        return SavedReport.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(
            tenant=self.request.tenant,
            created_by=self.request.user
        )

    @action(detail=True, methods=["post"])
    def execute(self, request, pk=None):
        report = self.get_object()
        config = report.config or {}
        report_type = report.report_type

        data = []
        tenant = request.tenant

        if report_type == "orders":
            from apps.merchandising.models import PurchaseOrder
            qs = PurchaseOrder.objects.filter(tenant=tenant)
            if "status" in config:
                qs = qs.filter(status=config["status"])
            for po in qs[:500]:
                data.append({
                    "po_number": po.po_number,
                    "factory": str(po.factory),
                    "quantity": po.quantity,
                    "unit_price": str(po.unit_price),
                    "total_value": str(po.total_value),
                    "status": po.status,
                    "delivery_date": str(po.delivery_date),
                })

        elif report_type == "production":
            from apps.production.models import DailyProduction
            qs = DailyProduction.objects.filter(tenant=tenant)
            if "start_date" in config:
                qs = qs.filter(production_date__gte=config["start_date"])
            if "end_date" in config:
                qs = qs.filter(production_date__lte=config["end_date"])
            for dp in qs[:500]:
                data.append({
                    "date": str(dp.production_date),
                    "factory": str(dp.factory),
                    "po_number": dp.purchase_order.po_number if dp.purchase_order else "",
                    "line": dp.line_number,
                    "target": dp.target_quantity,
                    "actual": dp.actual_quantity,
                    "passed": dp.passed_quantity,
                    "rejected": dp.rejected_quantity,
                    "efficiency": dp.efficiency,
                    "dhu": dp.dhu,
                    "status": dp.status,
                })

        elif report_type == "commercial":
            from apps.commercial.models import LC
            qs = LC.objects.filter(tenant=tenant)
            if "lc_type" in config:
                qs = qs.filter(lc_type=config["lc_type"])
            for lc in qs[:500]:
                data.append({
                    "lc_number": lc.lc_number,
                    "lc_type": lc.lc_type,
                    "buyer": str(lc.buyer),
                    "amount": str(lc.amount),
                    "currency": lc.currency,
                    "utilized": str(lc.utilized_amount),
                    "balance": str(lc.balance_amount),
                    "expiry_date": str(lc.expiry_date),
                    "status": lc.status,
                })

        elif report_type == "quality":
            from apps.quality.models import Inspection
            qs = Inspection.objects.filter(tenant=tenant)
            if "inspection_type" in config:
                qs = qs.filter(inspection_type=config["inspection_type"])
            for ins in qs[:500]:
                data.append({
                    "po_number": ins.purchase_order.po_number if ins.purchase_order else "",
                    "factory": str(ins.factory),
                    "type": ins.inspection_type,
                    "date": str(ins.inspection_date),
                    "sample_size": ins.sample_size,
                    "passed": ins.passed_quantity,
                    "rejected": ins.rejected_quantity,
                    "status": ins.status,
                })

        elif report_type == "financial":
            from apps.merchandising.models import Costing
            qs = Costing.objects.filter(tenant=tenant)
            for c in qs[:500]:
                data.append({
                    "po_number": c.purchase_order.po_number if c.purchase_order else "",
                    "fabric_cost": str(c.fabric_cost),
                    "trim_cost": str(c.trim_cost),
                    "cm_cost": str(c.cm_cost),
                    "overhead_cost": str(c.overhead_cost),
                    "total_cost": str(c.total_cost),
                    "status": c.status,
                })

        elif report_type == "inventory":
            from apps.merchandising.models import PurchaseOrder, PurchaseOrderItem, BOMItem
            qs = PurchaseOrder.objects.filter(tenant=tenant)
            if "buyer" in config:
                qs = qs.filter(buyer_id=config["buyer"])
            if "status" in config:
                qs = qs.filter(status=config["status"])
            if "date_from" in config:
                qs = qs.filter(po_date__gte=config["date_from"])
            if "date_to" in config:
                qs = qs.filter(po_date__lte=config["date_to"])
            count = 0
            for po in qs[:500]:
                bom_items = list(BOMItem.objects.filter(
                    bom__style_version__style=po.file_opening.style,
                    bom__status="active",
                ))
                po_items = PurchaseOrderItem.objects.filter(purchase_order=po)
                if bom_items:
                    for pi in po_items:
                        for bi in bom_items:
                            if count >= 500:
                                break
                            total_cost = float(pi.quantity) * float(bi.unit_price or 0)
                            data.append({
                                "Category": bi.category,
                                "Color": str(pi.color),
                                "Size": pi.size,
                                "Quantity": pi.quantity,
                                "Unit Cost": str(bi.unit_price or 0),
                                "Total Cost": str(round(total_cost, 2)),
                                "PO Number": po.po_number,
                                "Buyer": str(po.buyer),
                            })
                            count += 1
                        if count >= 500:
                            break
                else:
                    for pi in po_items:
                        if count >= 500:
                            break
                        total_cost = float(pi.quantity) * float(pi.unit_price or 0)
                        data.append({
                            "Category": "",
                            "Color": str(pi.color),
                            "Size": pi.size,
                            "Quantity": pi.quantity,
                            "Unit Cost": str(pi.unit_price or 0),
                            "Total Cost": str(round(total_cost, 2)),
                            "PO Number": po.po_number,
                            "Buyer": str(po.buyer),
                        })
                        count += 1

        return Response({"columns": list(data[0].keys()) if data else [], "rows": data, "count": len(data)})

    @action(detail=True, methods=["get"])
    def export(self, request, pk=None):
        report = self.get_object()
        tenant = request.tenant

        data = []
        config = report.config or {}
        report_type = report.report_type

        if report_type == "orders":
            from apps.merchandising.models import PurchaseOrder
            qs = PurchaseOrder.objects.filter(tenant=tenant)
            for po in qs[:500]:
                data.append([po.po_number, str(po.factory), str(po.quantity), str(po.unit_price), str(po.total_value), po.status, str(po.delivery_date)])
            headers = ["PO Number", "Factory", "Quantity", "Unit Price", "Total Value", "Status", "Delivery Date"]
        elif report_type == "production":
            from apps.production.models import DailyProduction
            qs = DailyProduction.objects.filter(tenant=tenant)
            for dp in qs[:500]:
                data.append([str(dp.production_date), str(dp.factory), dp.purchase_order.po_number if dp.purchase_order else "", str(dp.actual_quantity), str(dp.efficiency), dp.status])
            headers = ["Date", "Factory", "PO Number", "Actual", "Efficiency", "Status"]
        elif report_type == "commercial":
            from apps.commercial.models import LC
            qs = LC.objects.filter(tenant=tenant)
            for lc in qs[:500]:
                data.append([lc.lc_number, lc.lc_type, str(lc.amount), lc.currency, str(lc.utilized_amount), str(lc.balance_amount), lc.status])
            headers = ["LC Number", "Type", "Amount", "Currency", "Utilized", "Balance", "Status"]
        elif report_type == "quality":
            from apps.quality.models import Inspection
            qs = Inspection.objects.filter(tenant=tenant)
            for ins in qs[:500]:
                data.append([ins.purchase_order.po_number if ins.purchase_order else "", str(ins.factory), ins.inspection_type, str(ins.inspection_date), str(ins.sample_size), str(ins.passed_quantity), str(ins.rejected_quantity), ins.status])
            headers = ["PO Number", "Factory", "Type", "Date", "Sample", "Passed", "Rejected", "Status"]
        elif report_type == "financial":
            from apps.merchandising.models import Costing
            qs = Costing.objects.filter(tenant=tenant)
            for c in qs[:500]:
                data.append([c.purchase_order.po_number if c.purchase_order else "", str(c.fabric_cost), str(c.trim_cost), str(c.cm_cost), str(c.total_cost), c.status])
            headers = ["PO Number", "Fabric", "Trim", "CM", "Total", "Status"]
        elif report_type == "inventory":
            from apps.merchandising.models import PurchaseOrder, PurchaseOrderItem, BOMItem
            qs = PurchaseOrder.objects.filter(tenant=tenant)
            if "buyer" in config:
                qs = qs.filter(buyer_id=config["buyer"])
            if "status" in config:
                qs = qs.filter(status=config["status"])
            if "date_from" in config:
                qs = qs.filter(po_date__gte=config["date_from"])
            if "date_to" in config:
                qs = qs.filter(po_date__lte=config["date_to"])
            count = 0
            for po in qs[:500]:
                bom_items = list(BOMItem.objects.filter(
                    bom__style_version__style=po.file_opening.style,
                    bom__status="active",
                ))
                po_items = PurchaseOrderItem.objects.filter(purchase_order=po)
                if bom_items:
                    for pi in po_items:
                        for bi in bom_items:
                            if count >= 500:
                                break
                            total_cost = float(pi.quantity) * float(bi.unit_price or 0)
                            data.append([bi.category, str(pi.color), pi.size, str(pi.quantity), str(bi.unit_price or 0), str(round(total_cost, 2)), po.po_number, str(po.buyer)])
                            count += 1
                        if count >= 500:
                            break
                else:
                    for pi in po_items:
                        if count >= 500:
                            break
                        total_cost = float(pi.quantity) * float(pi.unit_price or 0)
                        data.append(["", str(pi.color), pi.size, str(pi.quantity), str(pi.unit_price or 0), str(round(total_cost, 2)), po.po_number, str(po.buyer)])
                        count += 1
            headers = ["Category", "Color", "Size", "Quantity", "Unit Cost", "Total Cost", "PO Number", "Buyer"]
        else:
            headers = ["No data"]
            data = []

        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(headers)
        writer.writerows(data)

        response = HttpResponse(output.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="{report.name}.csv"'
        return response
