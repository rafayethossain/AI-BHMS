"""GC-022 Shipping Paperwork Comparison.

GC Manual "Reconciliation procedures" 1) Shipping Paperwork: once the
paperwork is received the shipped quantity is input and compared against what
was ordered. Fabric shipped more than 5% over (2% for Primark and Penney's)
triggers an immediate debit. "Shipping Paperwork Vs Ordered Quantity": compare
the shipped quantity and costing to establish how many garments can be
produced; if the order cannot be covered, sales must be notified.

Pure analysis service - no model changes. Shipped quantity comes from shipment
records once they leave booking; shipped fabric meters come from dockets; the
per-garment consumption comes from the style's active BOM fabric lines.
"""
from decimal import Decimal

from django.db.models import Sum

from apps.merchandising.models import BOMItem, PurchaseOrder


class PaperworkComparisonService:
    """Compares ordered vs shipped quantities and estimates producible garments."""

    TOLERANCE_PCT_DEFAULT = Decimal("5.00")
    TOLERANCE_PCT_DISCOUNT_RETAILERS = Decimal("2.00")
    DISCOUNT_RETAILER_MARKS = ("primark", "penney")
    SHIPPED_STATUSES = (
        "picked_up", "in_transit", "at_port", "on_water",
        "arrived", "cleared", "delivered",
    )

    @classmethod
    def tolerance_pct_for_buyer(cls, buyer):
        """GC: over-tolerance debit threshold is 2% for Primark/Penney's, else 5%."""
        name = (buyer.name or "").lower()
        if any(mark in name for mark in cls.DISCOUNT_RETAILER_MARKS):
            return cls.TOLERANCE_PCT_DISCOUNT_RETAILERS
        return cls.TOLERANCE_PCT_DEFAULT

    @classmethod
    def _fabric_consumption_per_garment(cls, style):
        """Meters of fabric needed per garment from the style's active BOMs."""
        if style is None:
            return None
        return BOMItem.objects.filter(
            bom__status="active",
            bom__style_version__style=style,
            category__iexact="fabric",
        ).aggregate(total=Sum("consumption"))["total"]

    @classmethod
    def compare_po(cls, po):
        """Single PO comparison: ordered vs shipped qty + producible garments."""
        shipped_qty = sum(
            (Decimal(s.quantity) for s in po.shipments.all()
             if s.status in cls.SHIPPED_STATUSES),
            Decimal("0.00"),
        )
        ordered_qty = Decimal(po.quantity)
        variance = (shipped_qty - ordered_qty).quantize(Decimal("0.01"))
        pct = None
        if ordered_qty:
            pct = (variance / ordered_qty * Decimal("100")).quantize(Decimal("0.01"))
        tolerance = cls.tolerance_pct_for_buyer(po.buyer)
        over_tolerance = pct is not None and pct > tolerance

        raw_meters = [
            d.total_fabric_meters
            for s in po.shipments.all()
            for d in s.dockets.all()
            if d.total_fabric_meters is not None
        ]
        meters = sum((Decimal(m) for m in raw_meters), Decimal("0.00")).quantize(Decimal("0.01"))
        if not meters:
            meters = None

        style = po.file_opening.style if po.file_opening_id else None
        consumption = cls._fabric_consumption_per_garment(style)
        producible = None
        garment_variance = None
        can_cover = None
        if meters and consumption:
            producible = int(meters // consumption)
            garment_variance = producible - po.quantity
            can_cover = producible >= po.quantity

        return {
            "po_id": po.id,
            "po_number": po.po_number,
            "buyer_name": po.buyer.name,
            "status": po.status,
            "ordered_quantity": po.quantity,
            "shipped_quantity": shipped_qty,
            "quantity_variance": variance,
            "quantity_variance_pct": pct,
            "tolerance_pct": tolerance,
            "over_tolerance": over_tolerance,
            "shipped_fabric_meters": meters,
            "consumption_per_garment": consumption,
            "producible_garments": producible,
            "garment_variance": garment_variance,
            "can_cover_order": can_cover,
        }

    @classmethod
    def compare_tenant(cls, tenant=None):
        """All POs with shipped quantities, biggest variance first."""
        qs = PurchaseOrder.objects.filter(
            shipments__status__in=cls.SHIPPED_STATUSES
        ).distinct().select_related(
            "buyer", "file_opening__style"
        ).prefetch_related("shipments", "shipments__dockets")
        if tenant:
            qs = qs.filter(tenant=tenant)

        rows = [cls.compare_po(po) for po in qs]
        rows.sort(key=lambda r: abs(r["quantity_variance"] or 0), reverse=True)
        return {
            "count": len(rows),
            "summary": {
                "checked": len(rows),
                "over_tolerance_count": sum(1 for r in rows if r["over_tolerance"]),
                "cannot_cover_count": sum(1 for r in rows if r["can_cover_order"] is False),
            },
            "results": rows,
        }
