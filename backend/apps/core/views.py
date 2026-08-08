"""
Core views for BHMS.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db import connection
from django.db.models import Sum, Count, Q
from django.core.cache import cache
from django.utils import timezone
from datetime import timedelta


class HealthCheckView(APIView):
    """
    Health check endpoint.
    """
    permission_classes = []
    authentication_classes = []
    
    def get(self, request):
        health_status = {
            "status": "healthy",
            "services": {}
        }
        
        # Check database
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            health_status["services"]["database"] = "healthy"
        except Exception as e:
            health_status["services"]["database"] = f"unhealthy: {str(e)}"
            health_status["status"] = "unhealthy"
        
        # Check cache
        try:
            cache.set("health_check", "ok", 10)
            cache.get("health_check")
            health_status["services"]["cache"] = "healthy"
        except Exception as e:
            health_status["services"]["cache"] = f"unhealthy: {str(e)}"
            health_status["status"] = "degraded"
        
        http_status = status.HTTP_200_OK if health_status["status"] == "healthy" else status.HTTP_503_SERVICE_UNAVAILABLE
        
        return Response(health_status, status=http_status)


class DashboardSummaryView(APIView):
    """Rich dashboard summary with pipeline, financials, tasks, and alerts."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = getattr(request, 'tenant', None)
        today = timezone.localtime(timezone.now()).date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)

        from apps.merchandising.models import (
            Style, FileOpening, PurchaseOrder, BOM, Costing, TA, TAMilestone
        )
        from apps.production.models import ProductionPlan
        from apps.quality.models import Inspection
        from apps.logistics.models import Shipment
        from apps.commercial.models import ProformaInvoice, SalesContract, LC

        def qs(model):
            return model.objects.filter(tenant=tenant)

        # === Pipeline ===
        style_total = qs(Style).count()
        style_active = qs(Style).exclude(status__in=['archived']).count()
        fo_total = qs(FileOpening).count()
        fo_open = qs(FileOpening).filter(status='open').count()
        po_total = qs(PurchaseOrder).count()
        po_by_status = dict(qs(PurchaseOrder).values_list('status').annotate(c=Count('id')).values_list('status', 'c'))
        prod_plans = qs(ProductionPlan).count()
        prod_active = qs(ProductionPlan).filter(status__in=['planned', 'in_progress']).count()
        inspection_total = qs(Inspection).count()
        inspection_passed = qs(Inspection).filter(status='passed').count()
        shipment_total = qs(Shipment).count()
        shipment_in_transit = qs(Shipment).filter(status__in=['in_transit', 'on_water', 'at_port']).count()
        shipment_delivered = qs(Shipment).filter(status='delivered').count()

        pipeline = [
            {"stage": "Styles", "total": style_total, "active": style_active, "path": "/styles"},
            {"stage": "File Openings", "total": fo_total, "active": fo_open, "path": "/file-openings"},
            {"stage": "Purchase Orders", "total": po_total,
             "active": sum(po_by_status.get(s, 0) for s in ['confirmed', 'in_production', 'quality_check', 'ready']),
             "breakdown": po_by_status, "path": "/purchase-orders"},
            {"stage": "Production", "total": prod_plans, "active": prod_active, "path": "/production"},
            {"stage": "Quality", "total": inspection_total, "active": inspection_passed, "path": "/quality"},
            {"stage": "Shipments", "total": shipment_total,
             "active": shipment_in_transit + shipment_delivered, "path": "/logistics"},
        ]

        # === Financials ===
        pi_accepted = qs(ProformaInvoice).filter(status='accepted')
        total_revenue = pi_accepted.aggregate(total=Sum('amount'))['total'] or 0

        costing_approved = qs(Costing).filter(status='approved')
        total_cost = costing_approved.aggregate(total=Sum('total_cost'))['total'] or 0
        total_target = costing_approved.aggregate(total=Sum('target_price'))['total'] or 0

        lc_total = qs(LC).aggregate(total=Sum('amount'))['total'] or 0
        lc_utilized = qs(LC).aggregate(total=Sum('utilized_amount'))['total'] or 0

        sc_active = qs(SalesContract).filter(status='active').count()
        sc_total = qs(SalesContract).count()

        financials = {
            "total_revenue": float(total_revenue),
            "total_cost": float(total_cost),
            "profit_margin": float(total_revenue - total_cost) if total_revenue else 0,
            "profit_margin_pct": round(float((total_revenue - total_cost) / total_revenue * 100), 1) if total_revenue and total_revenue > 0 else 0,
            "accepted_pis": pi_accepted.count(),
            "total_pis": qs(ProformaInvoice).count(),
            "approved_costings": costing_approved.count(),
            "total_costings": qs(Costing).count(),
            "lc_total": float(lc_total),
            "lc_utilized": float(lc_utilized),
            "lc_utilization_pct": round(float(lc_utilized / lc_total * 100), 1) if lc_total and lc_total > 0 else 0,
            "active_contracts": sc_active,
            "total_contracts": sc_total,
            "po_value_total": float(qs(PurchaseOrder).aggregate(t=Sum('total_value'))['t'] or 0),
            "profit_by_buyer": self._profit_by_buyer(qs, tenant),
            "profit_by_factory": self._profit_by_factory(qs, tenant),
        }

        # === My Tasks ===
        overdue_milestones = TAMilestone.objects.filter(
            ta__purchase_order__isnull=False,
            status__in=['pending', 'in_progress'],
            planned_date__lt=today,
        ).filter(ta__purchase_order__tenant=tenant)

        upcoming_milestones = TAMilestone.objects.filter(
            ta__purchase_order__isnull=False,
            status__in=['pending', 'in_progress'],
            planned_date__gte=today,
            planned_date__lte=today + timedelta(days=7),
        ).filter(ta__purchase_order__tenant=tenant)

        pending_inspections = qs(Inspection).filter(status__in=['pending', 'in_progress'])
        pending_costings = qs(Costing).filter(status='pending')
        draft_pos = qs(PurchaseOrder).filter(status='draft')

        tasks = {
            "overdue_milestones": overdue_milestones.count(),
            "upcoming_milestones": upcoming_milestones.count(),
            "pending_inspections": pending_inspections.count(),
            "pending_costings": pending_costings.count(),
            "draft_pos": draft_pos.count(),
            "overdue_items": [
                {
                    "id": str(m.id),
                    "name": m.name,
                    "po_number": m.ta.purchase_order.po_number,
                    "planned_date": str(m.planned_date),
                    "days_overdue": (today - m.planned_date).days,
                    "url": f"/purchase-orders/{m.ta.purchase_order.id}?tab=ta",
                }
                for m in overdue_milestones.select_related('ta__purchase_order').order_by('planned_date')[:10]
            ],
        }

        # === Alerts ===
        alerts = []

        if overdue_milestones.count() > 0:
            alerts.append({
                "type": "danger",
                "title": f"{overdue_milestones.count()} Overdue Milestones",
                "description": "T&A milestones past their planned date need attention.",
                "path": "/tas",
            })

        failed_inspections = qs(Inspection).filter(status='failed')
        if failed_inspections.count() > 0:
            alerts.append({
                "type": "danger",
                "title": f"{failed_inspections.count()} Failed Inspections",
                "description": "Quality inspections that failed require corrective action.",
                "path": "/quality",
            })

        delayed_shipments = qs(Shipment).filter(status__in=['delayed', 'on_hold'])
        if delayed_shipments.count() > 0:
            alerts.append({
                "type": "warning",
                "title": f"{delayed_shipments.count()} Delayed Shipments",
                "description": "Shipments with delays may affect delivery commitments.",
                "path": "/logistics",
            })

        rejected_costings = qs(Costing).filter(status='rejected')
        if rejected_costings.count() > 0:
            alerts.append({
                "type": "warning",
                "title": f"{rejected_costings.count()} Rejected Costings",
                "description": "Costings rejected and may need revision.",
                "path": "/purchase-orders?tab=bom_costing",
            })

        expiring_lcs = qs(LC).filter(
            expiry_date__gte=today,
            expiry_date__lte=today + timedelta(days=14),
            status__in=['draft', 'received', 'accepted'],
        )
        if expiring_lcs.count() > 0:
            alerts.append({
                "type": "warning",
                "title": f"{expiring_lcs.count()} LCs Expiring Soon",
                "description": "Letters of credit expiring within 14 days.",
                "path": "/lcs",
            })

        if not alerts:
            alerts.append({
                "type": "success",
                "title": "All Clear",
                "description": "No pressing issues. Keep up the good work!",
                "path": "/dashboard",
            })

        return Response({
            "pipeline": pipeline,
            "financials": financials,
            "tasks": tasks,
            "alerts": alerts,
        })

    def _profit_by_buyer(self, qs, tenant):
        from collections import defaultdict
        from apps.merchandising.models import PurchaseOrder, Costing
        costing_qs = qs(Costing).filter(status='approved').select_related('purchase_order__buyer')
        revenue_map = defaultdict(float)
        cost_map = defaultdict(float)
        for c in costing_qs:
            po = c.purchase_order
            buyer_name = po.buyer.name if po and po.buyer else 'Unknown'
            revenue = float(po.quantity or 0) * float(po.unit_price or 0) if po else 0
            revenue_map[buyer_name] += revenue
            cost_map[buyer_name] += float(c.total_cost or 0)
        result = []
        for buyer in sorted(set(list(revenue_map.keys()) + list(cost_map.keys()))):
            rev = revenue_map[buyer]
            cost = cost_map[buyer]
            result.append({
                'buyer': buyer,
                'revenue': rev,
                'cost': cost,
                'profit': round(rev - cost, 2),
                'margin_pct': round((rev - cost) / rev * 100, 1) if rev > 0 else 0,
            })
        return sorted(result, key=lambda x: x['profit'], reverse=True)

    def _profit_by_factory(self, qs, tenant):
        from collections import defaultdict
        from apps.merchandising.models import Costing
        costing_qs = qs(Costing).filter(status='approved').select_related('purchase_order__factory')
        cost_map = defaultdict(float)
        cost_count = defaultdict(int)
        for c in costing_qs:
            if c.purchase_order:
                factory_name = c.purchase_order.factory.name if c.purchase_order.factory else 'Unknown'
                cost_map[factory_name] += float(c.total_cost or 0)
                cost_count[factory_name] += 1
        result = []
        for factory, total_cost in cost_map.items():
            result.append({
                'factory': factory,
                'total_cost': total_cost,
                'po_count': cost_count[factory],
                'avg_cost': round(total_cost / cost_count[factory], 2) if cost_count[factory] > 0 else 0,
            })
        return sorted(result, key=lambda x: x['total_cost'], reverse=True)
