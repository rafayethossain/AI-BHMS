"""Central tolerance engine (B10 / RQ-016 extension).

Classifies fabric received vs ordered quantities against tolerance bands
(Primark/Penney's 2%, Other 5%, Fur 2%) and returns structured results
for surfacing over-tolerance flags on reconciliation.

GC Manual 17.2: over shipment > 5% triggers debit for trimming;
under shipment < 5% triggers debit for trimming; shortage > 20 units
triggers debit on delivery.
"""
from decimal import Decimal

from apps.fabric.models import FabricTolerance

TOLERANCE_DEFAULTS = {
    "primark": Decimal("2.00"),
    "other": Decimal("5.00"),
    "fur": Decimal("2.00"),
}


def classify(customer_type, ordered_meters, received_meters):
    """Classify fabric received vs ordered against tolerance bands.

    Returns a dict with:
        - tolerance_pct: Decimal — applied tolerance percentage
        - tolerance_meters: Decimal — allowed over/under in meters
        - allowed_upper: Decimal — max meters before over-tolerance
        - allowed_lower: Decimal — min meters before under-tolerance
        - status: str — 'over' | 'under' | 'within'
        - over_tolerance: bool — True if over-tolerance
        - variance_meters: Decimal — received minus ordered
        - variance_pct: Decimal — variance as percentage of ordered
    """
    ordered = Decimal(ordered_meters)
    received = Decimal(received_meters)

    if not ordered:
        return {
            "tolerance_pct": Decimal("0"),
            "tolerance_meters": Decimal("0"),
            "allowed_upper": Decimal("0"),
            "allowed_lower": Decimal("0"),
            "status": "within",
            "over_tolerance": False,
            "variance_meters": received - ordered,
            "variance_pct": Decimal("0"),
        }

    band = FabricTolerance.tolerance_for(customer_type, ordered)
    if band:
        pct = Decimal(band.tolerance_pct)
    else:
        pct = TOLERANCE_DEFAULTS.get(customer_type, TOLERANCE_DEFAULTS["other"])

    tol_meters = (ordered * pct / 100).quantize(Decimal("0.01"))
    allowed_upper = (ordered + tol_meters).quantize(Decimal("0.01"))
    allowed_lower = (ordered - tol_meters).quantize(Decimal("0.01"))

    variance = (received - ordered).quantize(Decimal("0.01"))
    variance_pct = Decimal("0")
    if ordered:
        variance_pct = (variance / ordered * 100).quantize(Decimal("0.01"))

    if received > allowed_upper:
        status = "over"
    elif received < allowed_lower:
        status = "under"
    else:
        status = "within"

    return {
        "tolerance_pct": pct,
        "tolerance_meters": tol_meters,
        "allowed_upper": allowed_upper,
        "allowed_lower": allowed_lower,
        "status": status,
        "over_tolerance": status == "over",
        "variance_meters": variance,
        "variance_pct": variance_pct,
    }
