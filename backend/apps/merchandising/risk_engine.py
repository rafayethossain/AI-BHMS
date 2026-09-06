"""
B1 standalone risk engine — reference Risk Management System (§15).

Pure, side-effect-free computation. Per-area risk (fabric / trims / labels /
technical) is derived from existing PO-linked child data using the reference
progression (None -> Amber -> Green -> Red; Yellow = awareness flag — §15.1/
§15.2); overall = highest individual area (§15.3). Each area is returned as a
serializable payload with a numeric Excel encoding plus colour/label rendering
so list and detail views can render colour+label without extra logic.

Area derivation (decision note, see TDD_TRACKER B1):
  - fabric    <- BookingScheduleItem via the PO's shipments; a manually-set red
                 item risk level is sticky (major issue, §15.2), delivered ->
                 green, in_work -> amber, otherwise none.
  - trims     <- BOM items in {Trim, Trims, Accessories}: any item without a
                 vendor -> amber (bulk not yet assigned), all assigned -> green,
                 none -> none.
  - labels    <- BOM items whose name contains "label": same vendor rule.
  - technical <- current FitSpec stage: none -> none, pre-production -> amber,
                 pre-production approved (pp) -> green.
  - overall   <- max(fabric, trims, labels, technical).

No call to this module writes to the database — persistence remains the
responsibility of callers (existing RiskLevel FKs are left untouched).
"""
from apps.merchandising.models import FitStage

RISK_ORDER = {"none": 0, "green": 1, "amber": 2, "yellow": 3, "red": 4}

RISK_COLORS = {
    "none": "#6b7280",
    "green": "#16a34a",
    "amber": "#d97706",
    "yellow": "#eab308",
    "red": "#dc2626",
}

TRIMS_CATEGORIES = {"Trim", "Trims", "Accessories"}


def risk_payload(code):
    """Serialize one risk code into colour+label+numeric Excel encoding."""
    code = code if code in RISK_ORDER else "none"
    return {
        "code": code,
        "label": code.title(),
        "color": RISK_COLORS[code],
        "numeric": RISK_ORDER[code],
    }


def overall_risk(areas):
    """Highest individual area risk (reference §15.3)."""
    if not areas:
        return "none"
    return max(areas, key=lambda r: RISK_ORDER.get(r, 0))


def _schedule_items(po):
    return [item for shipment in po.shipments.all() for item in shipment.schedule_items.all()]


def _fabric_risk(po):
    items = _schedule_items(po)
    if not items:
        return "none"
    for item in items:
        if item.risk_level_id and item.risk_level.code == "red":
            return "red"
    return overall_risk([
        "green" if item.status == "delivered"
        else "amber" if item.status == "in_work"
        else "none"
        for item in items
    ])


def _bom_items(po):
    fo = po.file_opening
    if not fo or not fo.style_version_id:
        return []
    return [
        item
        for bom in fo.style_version.boms.all()
        for item in bom.items.all()
    ]


def _area_vendor_risk(items):
    if not items:
        return "none"
    if any(item.vendor_id is None for item in items):
        return "amber"
    return "green"


def _trims_risk(po):
    items = [item for item in _bom_items(po) if item.category in TRIMS_CATEGORIES]
    return _area_vendor_risk(items)


def _labels_risk(po):
    items = [item for item in _bom_items(po) if "label" in item.item_name.lower()]
    return _area_vendor_risk(items)


def _technical_risk(po):
    fit_specs = list(po.fit_specs.all())
    if not fit_specs:
        return "none"
    current = next((f for f in fit_specs if f.is_current), None) or fit_specs[0]
    return "green" if current.fit_stage == FitStage.PP else "amber"


def compute_order_risk(po):
    """Per-area risk + overall for a PurchaseOrder, each as a risk_payload."""
    areas = {
        "fabric": _fabric_risk(po),
        "trims": _trims_risk(po),
        "labels": _labels_risk(po),
        "technical": _technical_risk(po),
    }
    areas["overall"] = overall_risk(list(areas.values()))
    return {key: risk_payload(code) for key, code in areas.items()}