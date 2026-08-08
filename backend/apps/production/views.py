"""
Production views for BHMS.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.http import HttpResponse
from django.db.models import Avg, Sum, Count
from apps.core.permissions import HasPermission
from .models import ProductionPlan, DailyProduction
from .serializers import ProductionPlanSerializer, DailyProductionSerializer
from apps.core.pagination import StandardResultsSetPagination


class ProductionPlanViewSet(viewsets.ModelViewSet):
    queryset = ProductionPlan.objects.all()
    serializer_class = ProductionPlanSerializer
    pagination_class = StandardResultsSetPagination
    search_fields = ["purchase_order__po_number"]
    filterset_fields = ["status", "factory", "purchase_order"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {
        "list": "production:view", "retrieve": "production:view",
        "create": "production:create", "update": "production:edit",
        "partial_update": "production:edit", "destroy": "production:delete",
    }

    def get_queryset(self):
        return ProductionPlan.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(
            tenant=self.request.tenant,
            created_by=self.request.user
        )

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        plan = self.get_object()
        if plan.status not in ("draft", "planned"):
            return Response(
                {"error": f"Cannot start plan in '{plan.status}' status"},
                status=status.HTTP_400_BAD_REQUEST
            )
        plan.status = "in_progress"
        plan.start_date = plan.start_date or timezone.localtime(timezone.now()).date()
        plan.save(update_fields=["status", "start_date"])
        return Response({"status": "in_progress"})

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        plan = self.get_object()
        if plan.status != "in_progress":
            return Response(
                {"error": f"Cannot complete plan in '{plan.status}' status"},
                status=status.HTTP_400_BAD_REQUEST
            )
        plan.status = "completed"
        plan.end_date = timezone.localtime(timezone.now()).date()
        plan.save(update_fields=["status", "end_date"])
        return Response({"status": "completed"})

    @action(detail=False, methods=["get"])
    def dashboard(self, request):
        tenant = request.tenant
        plans = ProductionPlan.objects.filter(tenant=tenant)
        daily = DailyProduction.objects.filter(tenant=tenant)
        today = timezone.localtime(timezone.now()).date()

        today_reports = daily.filter(production_date=today)
        total_target = sum(r.target_quantity or 0 for r in today_reports)
        total_actual = sum(r.actual_quantity for r in today_reports)
        total_rejected = sum(r.rejected_quantity for r in today_reports)

        status_qs = plans.values("status").annotate(count=Count("id"))
        plans_by_status = {row["status"]: row["count"] for row in status_qs}

        today_line_data = (
            today_reports
            .filter(line_number__isnull=False)
            .values("line_number")
            .annotate(avg_efficiency=Avg("efficiency"), total_actual=Sum("actual_quantity"))
            .order_by("-avg_efficiency")
        )
        line_efficiencies = [
            {
                "line": f"Line {row['line_number']}",
                "efficiency": round(float(row["avg_efficiency"] or 0), 1),
                "actual": row["total_actual"] or 0,
            }
            for row in today_line_data
        ]

        return Response({
            "total_plans": plans.count(),
            "active_plans": plans.filter(status="in_progress").count(),
            "completed_plans": plans.filter(status="completed").count(),
            "today_reports": today_reports.count(),
            "today_target": total_target,
            "today_actual": total_actual,
            "today_rejected": total_rejected,
            "today_efficiency": round(total_actual / total_target * 100, 1) if total_target > 0 else None,
            "plans_by_status": plans_by_status,
            "line_efficiencies": line_efficiencies,
        })

    @action(detail=True, methods=["get"])
    def export(self, request, pk=None):
        plan = self.get_object()
        import csv
        from io import StringIO
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(["Field", "Value"])
        writer.writerow(["PO Number", plan.purchase_order.po_number])
        writer.writerow(["Factory", plan.factory.name])
        writer.writerow(["Plan Date", str(plan.plan_date)])
        writer.writerow(["Start Date", str(plan.start_date or "N/A")])
        writer.writerow(["End Date", str(plan.end_date or "N/A")])
        writer.writerow(["Quantity", plan.quantity])
        writer.writerow(["Status", plan.status])
        if plan.remarks:
            writer.writerow(["Remarks", plan.remarks])
        response = HttpResponse(output.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="plan_{plan.purchase_order.po_number}.csv"'
        return response

    @action(detail=False, methods=["get"])
    def line_performance(self, request):
        tenant = request.tenant
        daily = DailyProduction.objects.filter(tenant=tenant)

        start = request.query_params.get("start_date")
        end = request.query_params.get("end_date")
        if start:
            daily = daily.filter(production_date__gte=start)
        if end:
            daily = daily.filter(production_date__lte=end)

        lines = daily.values("line_number", "factory__name").annotate(
            avg_efficiency=Avg("efficiency"),
            total_actual=Sum("actual_quantity"),
            total_rejected=Sum("rejected_quantity"),
            report_count=Count("id"),
        ).order_by("-avg_efficiency")

        return Response(list(lines))


class DailyProductionViewSet(viewsets.ModelViewSet):
    queryset = DailyProduction.objects.all()
    serializer_class = DailyProductionSerializer
    pagination_class = StandardResultsSetPagination
    search_fields = ["purchase_order__po_number", "factory__name"]
    filterset_fields = ["status", "factory", "purchase_order", "production_date"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {
        "list": "production:view", "retrieve": "production:view",
        "create": "production:create", "update": "production:edit",
        "partial_update": "production:edit", "destroy": "production:delete",
    }

    def get_queryset(self):
        return DailyProduction.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        report = serializer.save(
            tenant=self.request.tenant,
            created_by=self.request.user
        )
        if report.target_quantity and report.target_quantity > 0:
            report.efficiency = round(report.actual_quantity / report.target_quantity * 100, 2)
        if report.actual_quantity and report.actual_quantity > 0:
            report.dhu = round(report.rejected_quantity / report.actual_quantity * 100, 2)
        report.save(update_fields=["efficiency", "dhu"])

    def perform_update(self, serializer):
        report = serializer.save()
        if report.target_quantity and report.target_quantity > 0:
            report.efficiency = round(report.actual_quantity / report.target_quantity * 100, 2)
        if report.actual_quantity and report.actual_quantity > 0:
            report.dhu = round(report.rejected_quantity / report.actual_quantity * 100, 2)
        report.save(update_fields=["efficiency", "dhu"])

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        report = self.get_object()
        if report.status != "active":
            return Response(
                {"error": "Report already processed"},
                status=status.HTTP_400_BAD_REQUEST
            )
        report.status = "approved"
        report.save(update_fields=["status"])
        return Response({"status": "approved"})