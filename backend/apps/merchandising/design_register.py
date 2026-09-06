"""
Unified Design register helpers.

Shared logic for the merged Style + Design Sheet register grid: the design list
column semantics (live vs completed orders) that both the API serializer and
any future callers rely on.
"""
from __future__ import annotations


LIVE_PO_STATUSES = {
    "open",
    "confirmed",
    "in_production",
    "quality_check",
    "ready",
    "shipped",
}

COMPLETED_PO_STATUSES = {"delivered"}


def order_counts_for_style(style):
    """Return ``(live, completed)`` purchase-order counts for a style.

    Live orders are purchase orders still in flight (open through shipped);
    completed orders are delivered purchase orders. Draft and cancelled orders
    are excluded from both buckets. Counts are always tenant-scoped via the
    style lookup chain to respect tenant isolation.
    """
    if not style or not style.pk:
        return 0, 0
    from apps.merchandising.models import PurchaseOrder

    queryset = PurchaseOrder.objects.filter(
        tenant=style.tenant,
        file_opening__style=style,
    )
    live = queryset.filter(status__in=sorted(LIVE_PO_STATUSES)).count()
    completed = queryset.filter(status__in=sorted(COMPLETED_PO_STATUSES)).count()
    return live, completed