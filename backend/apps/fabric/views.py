from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.pagination import SmallResultsSetPagination
from apps.core.permissions import HasPermission
from apps.setup.models import RiskLevel

from .models import (
    RFQ,
    FabricBooking,
    FabricCategory,
    FabricMill,
    FabricOrder,
    FabricSupplier,
    FabricTolerance,
    FabricUtilization,
    HTSCode,
    RFQLineItem,
    RFQResponse,
    RFQResponseItem,
)
from .serializers import (
    FabricBookingSerializer,
    FabricCategorySerializer,
    FabricMillSerializer,
    FabricOrderSerializer,
    FabricSupplierSerializer,
    FabricToleranceSerializer,
    FabricUtilizationSerializer,
    HTSCodeSerializer,
    RFQLineItemSerializer,
    RFQResponseItemSerializer,
    RFQResponseSerializer,
    RFQSerializer,
)


class TenantViewSetMixin:
    def get_queryset(self):
        qs = super().get_queryset()
        return qs.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant, created_by=self.request.user)


FABRIC_PERMS = {
    "list": "fabric:view", "retrieve": "fabric:view",
    "create": "fabric:create", "update": "fabric:edit",
    "partial_update": "fabric:edit", "destroy": "fabric:delete",
    "risk_status": "fabric:view",
    "set_risk": "fabric:edit",
    "recompute_risk": "fabric:edit",
    "update_schedule_dates": "fabric:edit",
    "schedule_status": "fabric:view",
    "handoff_schedule": "fabric:edit",
    "monthly_summary": "fabric:view",
    "quarterly_mill_report": "fabric:view",
}


class FabricCategoryViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = FabricCategory.objects.all()
    serializer_class = FabricCategorySerializer
    pagination_class = SmallResultsSetPagination
    search_fields = ["code", "name"]
    filterset_fields = ["is_active", "parent"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = FABRIC_PERMS


class HTSCodeViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = HTSCode.objects.all()
    serializer_class = HTSCodeSerializer
    pagination_class = SmallResultsSetPagination
    search_fields = ["code", "description"]
    filterset_fields = ["fabric_category"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = FABRIC_PERMS


class FabricSupplierViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = FabricSupplier.objects.all()
    serializer_class = FabricSupplierSerializer
    pagination_class = SmallResultsSetPagination
    search_fields = ["code", "name"]
    filterset_fields = ["is_mill", "country"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = FABRIC_PERMS


class FabricMillViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = FabricMill.objects.all()
    serializer_class = FabricMillSerializer
    pagination_class = SmallResultsSetPagination
    search_fields = ["code", "name"]
    filterset_fields = ["country"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = FABRIC_PERMS


class RFQViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = RFQ.objects.all()
    serializer_class = RFQSerializer
    pagination_class = SmallResultsSetPagination
    search_fields = ["rfq_number", "notes"]
    filterset_fields = ["status", "supplier"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = FABRIC_PERMS


class RFQLineItemViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = RFQLineItem.objects.all()
    serializer_class = RFQLineItemSerializer
    pagination_class = SmallResultsSetPagination
    filterset_fields = ["rfq", "fabric_category"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = FABRIC_PERMS


class RFQResponseViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = RFQResponse.objects.all()
    serializer_class = RFQResponseSerializer
    pagination_class = SmallResultsSetPagination
    filterset_fields = ["rfq", "supplier"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = FABRIC_PERMS


class RFQResponseItemViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = RFQResponseItem.objects.all()
    serializer_class = RFQResponseItemSerializer
    pagination_class = SmallResultsSetPagination
    filterset_fields = ["response", "line_item"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = FABRIC_PERMS


class FabricBookingViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = FabricBooking.objects.all()
    serializer_class = FabricBookingSerializer
    pagination_class = SmallResultsSetPagination
    search_fields = ["booking_number", "notes"]
    filterset_fields = ["status", "supplier", "fabric_category"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = FABRIC_PERMS


class FabricOrderViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = FabricOrder.objects.all()
    serializer_class = FabricOrderSerializer
    pagination_class = SmallResultsSetPagination
    search_fields = ["order_number", "notes", "supplier__name"]
    filterset_fields = ["status", "supplier", "fabric_category", "risk_level"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = FABRIC_PERMS

    SCHEDULE_DATE_KEYS = {
        "lab_dip_required_date": "lab_dip",
        "lab_dip_actual_date": "lab_dip",
        "lab_dip_approval_date": "lab_dip",
        "onboard_date": "onboard",
        "eta_date": "eta",
        "clearance_date": "clearance",
    }

    def perform_create(self, serializer):
        last = FabricOrder.objects.filter(tenant=self.request.tenant).order_by("-created_at").first()
        if last and last.order_number.startswith("FO-"):
            try:
                num = int(last.order_number.split("-")[-1]) + 1
            except (IndexError, ValueError):
                num = 1001
        else:
            num = 1001
        from datetime import datetime
        year = datetime.now().year
        serializer.save(
            tenant=self.request.tenant,
            created_by=self.request.user,
            order_number=f"FO-{year}-{num:04d}",
            total_price=serializer.validated_data.get("quantity_meters", 0)
                       * serializer.validated_data.get("unit_price", 0),
        )

    def perform_update(self, serializer):
        qty = serializer.validated_data.get("quantity_meters")
        price = serializer.validated_data.get("unit_price")
        if qty is not None and price is not None:
            serializer.save(total_price=qty * price)
        else:
            serializer.save()

    @action(detail=True, methods=["post"])
    def record_lab_dip(self, request, pk=None):
        order = self.get_object()
        order.handoff_on_dip_approval(request.user)
        data = request.data
        order.lab_dip_actual_date = data.get("lab_dip_actual_date", order.lab_dip_actual_date)
        order.lab_dip_approval_date = data.get("lab_dip_approval_date", order.lab_dip_approval_date)
        order.lab_dip_notes = data.get("lab_dip_notes", order.lab_dip_notes)
        if order.lab_dip_approval_date:
            order.status = "lab_dip_approved"
        elif order.lab_dip_actual_date:
            order.status = "lab_dip_pending"
        order.save(update_fields=["status", "lab_dip_actual_date", "lab_dip_approval_date", "lab_dip_notes"])
        order.apply_risk_policy()
        serializer = self.get_serializer(order)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def approve_bulk(self, request, pk=None):
        order = self.get_object()
        order.handoff_on_bulk_approval(request.user)
        from django.utils import timezone
        order.bulk_approved_date = timezone.now().date()
        order.bulk_approved_by = request.user
        order.status = "bulk_approved"
        order.save(update_fields=["status", "bulk_approved_date", "bulk_approved_by"])
        order.apply_risk_policy()
        serializer = self.get_serializer(order)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def ship(self, request, pk=None):
        order = self.get_object()
        if order.status not in ("bulk_approved", "lab_dip_approved", "in_production"):
            return Response(
                {"error": f"Cannot ship order in status '{order.status}'"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        order.status = "shipped"
        order.onboard_date = request.data.get("onboard_date", order.onboard_date)
        order.save(update_fields=["status", "onboard_date"])
        order.apply_risk_policy()
        serializer = self.get_serializer(order)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def deliver(self, request, pk=None):
        order = self.get_object()
        if order.status != "shipped":
            return Response(
                {"error": f"Cannot deliver order in status '{order.status}'"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        order.status = "delivered"
        order.clearance_date = request.data.get("clearance_date", order.clearance_date)
        order.save(update_fields=["status", "clearance_date"])
        order.apply_risk_policy()
        serializer = self.get_serializer(order)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def risk_status(self, request, pk=None):
        order = self.get_object()
        return Response({
            "order_number": order.order_number,
            "status": order.status,
            "policy_code": order.recompute_risk(),
            "risk_level": order.risk_level_id,
            "risk_level_code": order.risk_level.code if order.risk_level else None,
            "risk_level_name": order.risk_level.name if order.risk_level else None,
            "risk_notes": order.risk_notes,
            "effective_owners": order.effective_owners(),
            "bulk_approved_date": order.bulk_approved_date,
            "onboard_date": order.onboard_date,
            "clearance_date": order.clearance_date,
        })

    @action(detail=True, methods=["post"])
    def set_risk(self, request, pk=None):
        order = self.get_object()
        risk_id = request.data.get("risk_level")
        if not risk_id:
            return Response(
                {"error": "risk_level is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        level = RiskLevel.objects.filter(tenant_id=order.tenant_id, id=risk_id).first()
        if level is None:
            return Response(
                {"error": "Invalid risk_level"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        order.risk_level = level
        order.risk_notes = request.data.get("notes", order.risk_notes)
        order.save(update_fields=["risk_level", "risk_notes", "updated_at"])
        serializer = self.get_serializer(order)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def recompute_risk(self, request, pk=None):
        order = self.get_object()
        order.apply_risk_policy()
        serializer = self.get_serializer(order)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def update_schedule_dates(self, request, pk=None):
        order = self.get_object()
        dates = request.data.get("dates")
        if not isinstance(dates, dict) or not dates:
            return Response(
                {"error": "dates is required and must be a non-empty object"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user_roles = {ur.role.name.lower().replace(" ", "_") for ur in request.user.user_roles.all()}
        assist = "china_office" in user_roles
        for field, value in dates.items():
            date_key = self.SCHEDULE_DATE_KEYS.get(field)
            if date_key is None:
                return Response(
                    {"error": f"Unknown schedule date '{field}'"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            owner = order.effective_owner(date_key)
            if owner not in user_roles and not assist:
                return Response(
                    {"error": f"{field} is owned by the {owner} role"},
                    status=status.HTTP_403_FORBIDDEN,
                )
            setattr(order, field, value or None)
        order.save()
        serializer = self.get_serializer(order)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def schedule_status(self, request, pk=None):
        order = self.get_object()
        handoffs = list(
            order.schedule_handoffs.select_related("handed_off_by").order_by("handed_off_at", "-id")
        )
        return Response({
            "order_number": order.order_number,
            "date_owners": order.date_owners or {},
            "effective_owners": order.effective_owners(),
            "handoffs": [
                {
                    "date_key": h.date_key,
                    "from_role": h.from_role,
                    "to_role": h.to_role,
                    "trigger": h.trigger,
                    "handed_off_by": str(h.handed_off_by) if h.handed_off_by else None,
                    "handed_off_at": h.handed_off_at,
                    "notes": h.notes,
                }
                for h in handoffs
            ],
        })

    @action(detail=True, methods=["post"])
    def handoff_schedule(self, request, pk=None):
        order = self.get_object()
        date_key = request.data.get("date_key")
        if date_key not in order.OWNER_CHAIN:
            return Response(
                {"error": f"Unknown date key '{date_key}'"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user_roles = {ur.role.name.lower().replace(" ", "_") for ur in request.user.user_roles.all()}
        owner = order.effective_owner(date_key)
        if owner not in user_roles and "china_office" not in user_roles:
            return Response(
                {"error": f"{date_key} is owned by the {owner} role"},
                status=status.HTTP_403_FORBIDDEN,
            )
        next_role = order.next_owner(date_key, owner)
        if next_role is None:
            return Response(
                {"error": f"{date_key} is already at its final owner ({owner})"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        handoff = order.schedule_handoff(
            date_key, owner, next_role,
            by_user=request.user, trigger="manual",
            notes=request.data.get("notes", ""),
        )
        serializer = self.get_serializer(order)
        return Response({
            "order": serializer.data,
            "handoff": {
                "date_key": handoff.date_key,
                "from_role": handoff.from_role,
                "to_role": handoff.to_role,
                "trigger": handoff.trigger,
                "handed_off_at": handoff.handed_off_at,
            },
        })


class FabricToleranceViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    queryset = FabricTolerance.objects.all()
    serializer_class = FabricToleranceSerializer
    pagination_class = SmallResultsSetPagination
    search_fields = ["customer_type"]
    filterset_fields = ["customer_type", "is_active"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = FABRIC_PERMS

    @action(detail=False, methods=["get"])
    def tolerance_for(self, request):
        from decimal import Decimal, InvalidOperation

        customer_type = request.query_params.get("customer_type")
        quantity_raw = request.query_params.get("quantity")
        if customer_type not in dict(FabricTolerance.CUSTOMER_TYPE_CHOICES):
            return Response(
                {"error": "Invalid customer_type"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if quantity_raw is None:
            return Response(
                {"error": "quantity is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            quantity = Decimal(quantity_raw)
        except (InvalidOperation, ValueError):
            return Response(
                {"error": "quantity must be a valid number"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        band = FabricTolerance.tolerance_for(customer_type, quantity)
        if band is None:
            return Response({
                "customer_type": customer_type,
                "quantity": str(quantity),
                "tolerance_pct": None,
                "tolerance_meters": None,
                "qty_from": None,
                "qty_to": None,
            })
        return Response({
            "customer_type": band.customer_type,
            "quantity": str(quantity),
            "tolerance_pct": str(band.tolerance_pct),
            "tolerance_meters": str(band.tolerance_meters(quantity)),
            "qty_from": str(band.qty_from),
            "qty_to": str(band.qty_to) if band.qty_to else None,
        })


class FabricUtilizationViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    """Fabric utilization records + monthly/quarterly reports (GC-030)."""

    queryset = FabricUtilization.objects.all()
    serializer_class = FabricUtilizationSerializer
    pagination_class = SmallResultsSetPagination
    search_fields = ["order__order_number", "period", "notes"]
    filterset_fields = ["order", "period", "order__supplier"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = FABRIC_PERMS

    def get_queryset(self):
        return (
            super().get_queryset()
            .select_related("order__supplier", "order__fabric_category", "recorded_by")
        )

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant, recorded_by=self.request.user)

    @staticmethod
    def _summarize(qs, prefix="all"):
        """Aggregate ordered/received/consumed meters for a queryset."""
        agg = qs.aggregate(
            ordered=Sum("order__quantity_meters"),
            received=Sum("received_meters"),
            used=Sum("used_meters"),
            wasted=Sum("wasted_meters"),
            damaged=Sum("damaged_meters"),
        )
        received = agg["received"] or Decimal("0")
        used = agg["used"] or Decimal("0")
        ordered = agg["ordered"] or Decimal("0")
        wasted = agg["wasted"] or Decimal("0")
        damaged = agg["damaged"] or Decimal("0")
        over_under = received - ordered
        return {
            "orders_count": qs.count(),
            "ordered_meters": str(ordered.quantize(Decimal("0.01"))),
            "received_meters": str(received.quantize(Decimal("0.01"))),
            "used_meters": str(used.quantize(Decimal("0.01"))),
            "wasted_meters": str(wasted.quantize(Decimal("0.01"))),
            "damaged_meters": str(damaged.quantize(Decimal("0.01"))),
            "excess_meters": str((received - used - wasted - damaged).quantize(Decimal("0.01"))),
            "over_under_meters": str(over_under.quantize(Decimal("0.01"))),
            "over_under_pct": str(
                (over_under / ordered * 100).quantize(Decimal("0.01")) if ordered else Decimal("0")
            ),
            "efficiency_pct": str(
                (used / received * 100).quantize(Decimal("0.01")) if received else Decimal("0")
            ),
        }

    @action(detail=False, methods=["get"], url_path="monthly_summary")
    def monthly_summary(self, request):
        """Monthly fabric utilization analysis for a period (default: current month)."""
        period = request.query_params.get("period") or timezone.now().strftime("%Y-%m")
        qs = self.get_queryset().filter(period=period)
        return Response({
            "period": period,
            "summary": self._summarize(qs),
            "rows": self.get_serializer(qs, many=True).data,
        })

    @action(detail=False, methods=["get"], url_path="quarterly_mill_report")
    def quarterly_mill_report(self, request):
        """Quarterly mill performance: utilization grouped by supplier/mill."""
        try:
            year = int(request.query_params.get("year", ""))
            quarter = int(request.query_params.get("quarter", ""))
        except (TypeError, ValueError):
            return Response(
                {"error": "year and quarter are required integers"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if quarter < 1 or quarter > 4:
            return Response(
                {"error": "quarter must be between 1 and 4"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        months = [f"{year:04d}-{m:02d}" for m in range(quarter * 3 - 2, quarter * 3 + 1)]
        qs = self.get_queryset().filter(period__in=months)
        summary = self._summarize(qs)
        mills = []
        for group in (
            qs.values("order__supplier_id", "order__supplier__name")
            .annotate(
                ordered=Sum("order__quantity_meters"),
                received=Sum("received_meters"),
                used=Sum("used_meters"),
                wasted=Sum("wasted_meters"),
                damaged=Sum("damaged_meters"),
            )
            .order_by("order__supplier__name")
        ):
            received = group["received"] or Decimal("0")
            used = group["used"] or Decimal("0")
            ordered = group["ordered"] or Decimal("0")
            wasted = group["wasted"] or Decimal("0")
            damaged = group["damaged"] or Decimal("0")
            over_under = received - ordered
            mills.append({
                "supplier_id": str(group["order__supplier_id"]),
                "supplier_name": group["order__supplier__name"],
                "orders_count": qs.filter(order__supplier_id=group["order__supplier_id"]).count(),
                "ordered_meters": str(ordered.quantize(Decimal("0.01"))),
                "received_meters": str(received.quantize(Decimal("0.01"))),
                "used_meters": str(used.quantize(Decimal("0.01"))),
                "wasted_meters": str(wasted.quantize(Decimal("0.01"))),
                "damaged_meters": str(damaged.quantize(Decimal("0.01"))),
                "excess_meters": str((received - used - wasted - damaged).quantize(Decimal("0.01"))),
                "over_under_meters": str(over_under.quantize(Decimal("0.01"))),
                "over_under_pct": str(
                    (over_under / ordered * 100).quantize(Decimal("0.01")) if ordered else Decimal("0")
                ),
                "efficiency_pct": str(
                    (used / received * 100).quantize(Decimal("0.01")) if received else Decimal("0")
                ),
            })
        return Response({
            "year": year,
            "quarter": quarter,
            "periods": months,
            "summary": summary,
            "mills": mills,
        })
