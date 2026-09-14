"""
Design-Version Sales Order status derivation (RQ-051).

Pure, side-effect-free computation for the Sales Order report. For a single
PurchaseOrder it derives five pipeline statuses — fabric, trims, production,
delivery, overall — each returned as a serializable risk payload (code, label,
color, numeric) using the shared RISK_ORDER / RISK_COLORS / risk_payload from
the risk engine so colour+label rendering stays consistent app-wide.

Area derivation (decision note, see TDD_TRACKER #74):
  - fabric     <- reuse risk_engine._fabric_risk (BookingScheduleItem via the
                  PO's shipments: delivered -> green, in_work -> amber, sticky
                  red -> red, none -> none). Deliberately NOT duplicated.
  - trims      <- BOM items in {Trim, Trims, Accessories} by their status
                  field: all Completed -> green, any TBC/Ordered/Partial ->
                  amber, no items -> none. (This answers "trims progressing?",
                  unlike risk_engine's vendor-assignment rule — different
                  question, deliberate difference.)
  - production <- PO lifecycle + DailyProduction.actual_quantity summed against
                  PO.quantity (plus booking-schedule garments_ready): making
                  complete -> green, in_production with output >= quantity ->
                  green, in_production otherwise -> amber, not started/cancelled
                  -> none.
  - delivery   <- PO lifecycle + PO.delivery_date (the customer TOD): delivered
                  / ready / shipped -> green, overdue (today > delivery date and
                  still open) -> red, in-progress with future TOD -> amber,
                  draft/open/cancelled or no TOD -> none.
  - overall    <- max of the four areas (risk_engine overall_risk).

No call to this module writes to the database — persistence remains the
responsibility of callers.
"""
from django.utils import timezone

from apps.merchandising.models import TrimStatus
from apps.merchandising.risk_engine import (
    TRIMS_CATEGORIES,
    _bom_items,
    _fabric_risk,
    overall_risk,
    risk_payload,
)


def _trims_progress_risk(po):
    """Trim/accessory progress from BOM item status (all completed -> green)."""
    items = [item for item in _bom_items(po) if item.category in TRIMS_CATEGORIES]
    if not items:
        return "none"
    return "green" if all(item.status == TrimStatus.COMPLETED for item in items) else "amber"


def _production_risk(po):
    status = po.status
    if status in {"delivered", "ready", "shipped", "quality_check"}:
        return "green"
    if status != "in_production":
        return "none"
    produced = sum(day.actual_quantity for day in po.daily_productions.all())
    garments_ready = sum(
        item.garments_ready_qty or 0
        for shipment in po.shipments.all()
        for item in shipment.schedule_items.all()
    )
    if produced + garments_ready >= po.quantity:
        return "green"
    return "amber"


def _delivery_risk(po, today):
    status = po.status
    if status in {"delivered", "ready", "shipped"}:
        return "green"
    if status in {"draft", "open", "cancelled"}:
        return "none"
    tod = po.delivery_date
    if not tod:
        return "none"
    if today > tod:
        return "red"
    return "amber"


def compute_sales_order_statuses(po, today=None):
    """Per-area pipeline status + overall for a PurchaseOrder row."""
    if today is None:
        today = timezone.localdate()
    areas = {
        "fabric": _fabric_risk(po),
        "trims": _trims_progress_risk(po),
        "production": _production_risk(po),
        "delivery": _delivery_risk(po, today),
    }
    areas["overall"] = overall_risk(list(areas.values()))
    return {key: risk_payload(code) for key, code in areas.items()}