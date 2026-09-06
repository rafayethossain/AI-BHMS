"""
Tests: B1 standalone risk engine (reference Risk Management System §15).

Reference contract (REPLICATION_ROADMAP_ARCHIVE §15.1-15.4):
  - Areas: Fabric, Trims, Labels, Technical (+ Design) with a common
    progression None -> Amber -> Green -> Red (Yellow = awareness flag).
  - Overall risk = HIGHEST individual area risk.
  - Numeric encoding for Excel export: NONE=0, GREEN=1, AMBER=2, YELLOW=3, RED=4.
  - Display: Order List = per-area color columns + Overall.

Derivation from existing PO-linked child data (decision note, see tracker):
  - fabric    <- BookingScheduleItem (via shipments); red sticky from item
                 risk_level, delivered -> green, in_work -> amber.
  - trims     <- BOM items (Trim/Trims/Accessories): unassigned vendor -> amber,
                 assigned -> green, none -> none.
  - labels    <- BOM items whose name contains "label": same vendor rule.
  - technical <- current FitSpec stage: nothing -> none, pre-PP -> amber, PP -> green.
  - overall   <- max(fabric, trims, labels, technical).
"""
import itertools

import pytest
from rest_framework.test import APIClient

from apps.tenants.models import Tenant
from apps.users.models import Role, UserRole, Permission, RolePermission
from apps.setup.models import (
    Buyer, Factory, Currency, Country, ColorCode, RiskLevel, Vendor,
)
from apps.merchandising.models import (
    Style, StyleVersion, FileOpening, PurchaseOrder,
    FitSpec, FitStage, BOM, BOMItem,
)
from apps.logistics.models import Shipment, BookingScheduleItem

from apps.merchandising.risk_engine import (
    RISK_ORDER, risk_payload, overall_risk, compute_order_risk,
)

User = None
from django.contrib.auth import get_user_model
User = get_user_model()

_SEQ = itertools.count(1)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def risk_tenant(db):
    return Tenant.objects.create(
        name="Risk Co", slug="risk-co", schema_name="tenant_risk", status="active"
    )


@pytest.fixture
def risk_levels(risk_tenant):
    levels = {}
    for code in ("none", "green", "amber", "yellow", "red"):
        levels[code], _ = RiskLevel.objects.get_or_create(
            tenant=risk_tenant, code=code,
            defaults={"name": code.title(), "color": "#000000"},
        )
    return levels


@pytest.fixture
def risk_setup(risk_tenant):
    currency = Currency.objects.create(tenant=risk_tenant, code="USD", name="US Dollar", symbol="$")
    country = Country.objects.create(tenant=risk_tenant, code="DEU", name="Germany")
    buyer = Buyer.objects.create(tenant=risk_tenant, code="ZR", name="Zara",
                                 country=country, currency=currency)
    factory = Factory.objects.create(tenant=risk_tenant, code="F-001", name="Apex")
    color = ColorCode.objects.create(tenant=risk_tenant, code="BLK", name="Black", hex_code="#000000")
    vendor = Vendor.objects.create(tenant=risk_tenant, code="VEN-001", name="Trim House")
    return {
        "tenant": risk_tenant, "currency": currency, "country": country,
        "buyer": buyer, "factory": factory, "color": color, "vendor": vendor,
    }


@pytest.fixture
def risk_role(db, risk_tenant):
    role = Role.objects.create(tenant=risk_tenant, name="RiskAdmin", is_system=True)
    for mod in ["setup", "merchandising"]:
        for act in ["view"]:
            perm, _ = Permission.objects.get_or_create(
                module=mod, action=act, defaults={"description": f"{mod}:{act}"}
            )
            RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def risk_user(db, risk_tenant, risk_role):
    user = User.objects.create_user(
        username="riskuser", email="risk@test.com",
        password="testpass123!@#", tenant=risk_tenant, status="active"
    )
    UserRole.objects.create(user=user, role=risk_role)
    return user


@pytest.fixture
def risk_client(api_client, risk_user):
    login = api_client.post("/api/v1/auth/login/", {
        "email": "risk@test.com", "password": "testpass123!@#"
    })
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
    return api_client


def make_chain(setup, with_file=True, style_version=None):
    """Style -> StyleVersion -> FileOpening -> PurchaseOrder (fresh per call)."""
    n = next(_SEQ)
    style = Style.objects.create(
        tenant=setup["tenant"], style_number=f"STY-{n:04d}", name="Linen Top",
        buyer=setup["buyer"],
    )
    if style_version is None:
        style_version, _ = StyleVersion.objects.get_or_create(
            tenant=setup["tenant"], style=style, version_number=1,
            defaults={"status": "active"},
        )
    fo = None
    if with_file:
        fo = FileOpening.objects.create(
            tenant=setup["tenant"], file_number=f"FO-{n:04d}",
            style=style, style_version=style_version, buyer=setup["buyer"],
            factory=setup["factory"], file_date="2026-01-10",
        )
    po = PurchaseOrder.objects.create(
        tenant=setup["tenant"], po_number=f"PO-{n:04d}",
        file_opening=fo, buyer=setup["buyer"], factory=setup["factory"],
        po_date="2026-01-15", delivery_date="2026-04-30",
        quantity=500, unit_price="12.50", total_value="6250.00",
        currency=setup["currency"], destination_country=setup["country"],
    )
    return {"po": po, "style": style, "style_version": style_version, "fo": fo}


def make_bom(setup, po, items):
    sv = po.file_opening.style_version
    bom = BOM.objects.create(
        tenant=setup["tenant"], style_version=sv, name="BOM-1", version=1, status="active"
    )
    for item in items:
        BOMItem.objects.create(
            tenant=setup["tenant"], bom=bom, category=item["category"],
            item_name=item["name"], vendor=item.get("vendor"),
        )


def make_schedule_item(setup, po, status="in_work", risk=None):
    shipment = Shipment.objects.create(
        tenant=setup["tenant"], shipment_number=f"SHP-{next(_SEQ):04d}",
        purchase_order=po,
    )
    return BookingScheduleItem.objects.create(
        tenant=setup["tenant"], shipment=shipment, week_ending="2026-03-06",
        status=status, risk_level=risk,
    )


def make_fit_spec(setup, po, stage):
    return FitSpec.objects.create(
        tenant=setup["tenant"], purchase_order=po,
        fit_stage=stage, version=1, is_current=True,
    )


# ---------------------------------------------------------------------------
# RED 1 — pure engine contract (reference §15.3 numeric encoding)
# ---------------------------------------------------------------------------

def test_risk_order_encodes_reference_progression():
    assert RISK_ORDER == {"none": 0, "green": 1, "amber": 2, "yellow": 3, "red": 4}


def test_overall_risk_is_highest_individual_area():
    assert overall_risk(["none", "green", "amber"]) == "amber"
    assert overall_risk(["green", "red", "yellow"]) == "red"
    assert overall_risk(["yellow", "green"]) == "yellow"
    assert overall_risk(["none"]) == "none"
    assert overall_risk([]) == "none"


def test_risk_payload_shapes_code_label_color_numeric():
    payload = risk_payload("amber")
    assert payload["code"] == "amber"
    assert payload["label"] == "Amber"
    assert payload["numeric"] == 2
    assert isinstance(payload["color"], str) and payload["color"].startswith("#")
    assert risk_payload("none")["numeric"] == 0


# ---------------------------------------------------------------------------
# RED 2 — compute_order_risk from PO-linked child data
# ---------------------------------------------------------------------------

def test_compute_order_risk_null_safe_with_empty_child_data(risk_setup):
    chain = make_chain(risk_setup, with_file=False)
    result = compute_order_risk(chain["po"])
    assert set(result) == {"fabric", "trims", "labels", "technical", "overall"}
    for code in ("fabric", "trims", "labels", "technical", "overall"):
        assert result[code]["code"] == "none"
    assert result["overall"]["numeric"] == 0


def test_fabric_risk_delivered_schedule_item_green(risk_setup, risk_levels):
    chain = make_chain(risk_setup)
    make_schedule_item(risk_setup, chain["po"], status="delivered")
    assert compute_order_risk(chain["po"])["fabric"]["code"] == "green"


def test_fabric_risk_red_is_sticky_from_schedule_risk_level(risk_setup, risk_levels):
    chain = make_chain(risk_setup)
    make_schedule_item(risk_setup, chain["po"], status="delivered",
                       risk=risk_levels["red"])
    assert compute_order_risk(chain["po"])["fabric"]["code"] == "red"


def test_trims_risk_from_bom_vendor_assignment(risk_setup):
    unassigned = make_chain(risk_setup)
    make_bom(risk_setup, unassigned["po"], [
        {"category": "Trims", "name": "Main Swing Ticket", "vendor": None},
    ])
    assert compute_order_risk(unassigned["po"])["trims"]["code"] == "amber"

    assigned = make_chain(risk_setup)
    make_bom(risk_setup, assigned["po"], [
        {"category": "Trims", "name": "Main Swing Ticket", "vendor": risk_setup["vendor"]},
    ])
    assert compute_order_risk(assigned["po"])["trims"]["code"] == "green"


def test_labels_risk_from_label_bom_items(risk_setup):
    unassigned = make_chain(risk_setup)
    make_bom(risk_setup, unassigned["po"], [
        {"category": "Trim", "name": "Care Label", "vendor": None},
    ])
    assert compute_order_risk(unassigned["po"])["labels"]["code"] == "amber"

    assigned = make_chain(risk_setup)
    make_bom(risk_setup, assigned["po"], [
        {"category": "Trim", "name": "Care Label", "vendor": risk_setup["vendor"]},
    ])
    assert compute_order_risk(assigned["po"])["labels"]["code"] == "green"


def test_technical_risk_from_current_fit_stage(risk_setup):
    chain = make_chain(risk_setup)
    assert compute_order_risk(chain["po"])["technical"]["code"] == "none"
    make_fit_spec(risk_setup, chain["po"], FitStage.DEV)
    assert compute_order_risk(chain["po"])["technical"]["code"] == "amber"
    chain2 = make_chain(risk_setup)
    make_fit_spec(risk_setup, chain2["po"], FitStage.PP)
    assert compute_order_risk(chain2["po"])["technical"]["code"] == "green"


def test_overall_risk_makes_order_list_headline(risk_setup, risk_levels):
    chain = make_chain(risk_setup)
    make_schedule_item(risk_setup, chain["po"], status="delivered",
                       risk=risk_levels["red"])
    make_bom(risk_setup, chain["po"], [
        {"category": "Trims", "name": "Swing Ticket", "vendor": None},
    ])
    result = compute_order_risk(chain["po"])
    assert result["fabric"]["code"] == "red"
    assert result["trims"]["code"] == "amber"
    assert result["overall"]["code"] == "red"
    assert result["overall"]["numeric"] == 4


# ---------------------------------------------------------------------------
# RED 3 — serializer surfaces the risk payload on the Order List
# ---------------------------------------------------------------------------

def test_purchase_order_list_serializer_exposes_risk(risk_setup, risk_levels, risk_client):
    chain = make_chain(risk_setup)
    make_schedule_item(risk_setup, chain["po"], status="in_work")
    resp = risk_client.get("/api/v1/merchandising/purchase-orders/")
    assert resp.status_code == 200
    row = next(r for r in resp.data["results"] if r["id"] == str(chain["po"].id))
    risk = row["risk"]
    assert set(risk) == {"fabric", "trims", "labels", "technical", "overall"}
    assert risk["fabric"] == {"code": "amber", "label": "Amber", "numeric": 2, "color": "#d97706"}
    assert risk["trims"]["code"] == "none"
    for payload in risk.values():
        assert set(payload) == {"code", "label", "numeric", "color"}


def test_po_risk_numeric_usable_for_export(risk_setup, risk_client):
    chain = make_chain(risk_setup)
    resp = risk_client.get("/api/v1/merchandising/purchase-orders/")
    row = next(r for r in resp.data["results"] if r["id"] == str(chain["po"].id))
    assert row["risk"]["overall"]["numeric"] == 0