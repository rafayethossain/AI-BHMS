"""
Merchandising domain services.

GC-009: Trim/Label Copy From Order — copies trim/label line items from a
source BOM into a target BOM, reusing the GC-008 schedule fields.
GC-012: Fit Spec Copying — copies the ticked fit spec from a source
purchase order into a target order.
"""
from django.db import transaction
from django.db.models import Max, Q

from .models import BOMItem, FitSpec, TrimStatus

TRIM_LABEL_FILTER = Q(category__iexact="trim") | Q(category__iexact="label")

DETAIL_FIELDS = (
    "category",
    "item_name",
    "description",
    "uom",
    "consumption",
    "waste_percent",
    "unit_price",
    "vendor",
    "supplier",
)

SCHEDULE_FIELDS = (
    "ordered_qty",
    "delivered_qty",
    "eta_date",
    "confirmed_date",
    "actual_date",
)


class NoTrimItemsError(ValueError):
    """Raised when the source BOM has no trim/label items to copy."""


def copy_trim_items(source_bom, target_bom, *, overwrite=False, selective="all"):
    """
    Copy trim/label line items from source_bom to target_bom.

    Detail fields (name, description, consumption, price, vendors) are
    copied; schedule fields are reset to their unconfirmed defaults so the
    target order schedules its own deliveries.

    Returns a dict of {"copied": n, "overwritten": n, "skipped": n}.

    selective: "all" copies every trim/label item, "washcare" only items
    whose name contains "care", "detail" everything else.
    """
    if selective not in ("all", "detail", "washcare"):
        raise ValueError("selective must be one of 'all', 'detail', 'washcare'")

    items = source_bom.items.filter(TRIM_LABEL_FILTER)
    if selective == "washcare":
        items = items.filter(item_name__icontains="care")
    elif selective == "detail":
        items = items.exclude(item_name__icontains="care")

    if not items.exists():
        raise NoTrimItemsError("Source BOM has no trim/label items to copy")

    result = {"copied": 0, "overwritten": 0, "skipped": 0}

    for source in items:
        existing = (
            target_bom.items
            .filter(
                category__iexact=source.category,
                item_name__iexact=source.item_name,
            )
            .first()
        )
        if existing is None:
            BOMItem.objects.create(
                tenant=target_bom.tenant,
                bom=target_bom,
                created_by=target_bom.created_by,
                status=TrimStatus.TBC,
                **{field: getattr(source, field) for field in DETAIL_FIELDS},
            )
            result["copied"] += 1
        elif overwrite:
            for field in DETAIL_FIELDS:
                setattr(existing, field, getattr(source, field))
            for field in SCHEDULE_FIELDS:
                setattr(existing, field, None)
            existing.status = TrimStatus.TBC
            existing.save()
            result["overwritten"] += 1
        else:
            result["skipped"] += 1

    return result


class NoCurrentFitSpecError(ValueError):
    """Raised when the source order has no current (ticked) fit spec."""


def copy_fit_spec(source_order, target_order, user):
    """
    Copy the current fit spec of source_order into target_order.

    The copied spec is the newest version for the target order and becomes
    its current spec (previous current flags are cleared).
    """
    source_spec = FitSpec.objects.filter(
        tenant=source_order.tenant,
        purchase_order=source_order,
        is_current=True,
    ).first()
    if source_spec is None:
        raise NoCurrentFitSpecError("Source order has no current fit spec to copy")

    tenant = target_order.tenant
    next_version = (
        FitSpec.objects.filter(tenant=tenant, purchase_order=target_order)
        .aggregate(m=Max("version"))["m"] or 0
    ) + 1

    with transaction.atomic():
        FitSpec.objects.filter(
            tenant=tenant, purchase_order=target_order
        ).update(is_current=False)
        new_spec = FitSpec.objects.create(
            tenant=tenant,
            purchase_order=target_order,
            fit_stage=source_spec.fit_stage,
            version=next_version,
            measurements=source_spec.measurements,
            images=source_spec.images,
            notes=source_spec.notes,
            is_current=True,
            created_by=user,
        )
    return new_spec
