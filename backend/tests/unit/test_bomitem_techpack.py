"""
RQ-041 — BOMItem additive tech-pack fields tests.

Covers the four design-sheet BOM columns the current BOMItem cannot express —
`Location`, `Colour`, `Width/Size`, `Match` — as additive nullable columns:
model defaults/assignment, read/write through BOMItemSerializer, admin list
display, and confirmation that existing BOM behavior is unchanged.
"""
from decimal import Decimal

import pytest
from django.contrib.admin.sites import site
from django.db import IntegrityError

from apps.merchandising.admin import BOMItemAdmin
from apps.merchandising.models import BOM, BOMItem, Style, StyleVersion
from apps.merchandising.serializers import BOMItemSerializer
from apps.setup.models import Buyer, Country
from apps.tenants.models import Tenant

NEW_FIELDS = ("location", "colour", "width_size", "match")


@pytest.fixture
def bom_item_data(db):
    tenant = Tenant.objects.create(
        name="BOM Item Co", slug="bom-item-test", schema_name="tenant_bomitem", status="active"
    )
    Country.objects.create(tenant=tenant, name="BOM Land", code="BO1")
    buyer = Buyer.objects.create(tenant=tenant, name="BOM Buyer", code="BOB1")
    style = Style.objects.create(tenant=tenant, style_number="STY-BOM", name="BOM Style", buyer=buyer)
    style_version = StyleVersion.objects.create(tenant=tenant, style=style, version_number=1, status="active")
    bom = BOM.objects.create(tenant=tenant, style_version=style_version, name="BOM v1", version=1, status="active")
    item = BOMItem.objects.create(
        tenant=tenant, bom=bom, category="fabric", item_name="SANDWASH LINEN",
        consumption=Decimal("1.6700"),
    )
    return {"tenant": tenant, "buyer": buyer, "style": style, "style_version": style_version,
            "bom": bom, "item": item}


# ---------------------------------------------------------------- model


def test_new_fields_exist_with_default_empty(bom_item_data):
    item = bom_item_data["item"]
    for field in NEW_FIELDS:
        assert getattr(item, field) == ""


def test_new_fields_assignable_and_roundtrip(bom_item_data):
    item = bom_item_data["item"]
    item.location = "MAIN"
    item.colour = "BLACK"
    item.width_size = "132 CM"
    item.match = "CRITICAL"
    item.save(update_fields=list(NEW_FIELDS) + ["updated_at"])
    item.refresh_from_db()
    assert (item.location, item.colour, item.width_size, item.match) == (
        "MAIN", "BLACK", "132 CM", "CRITICAL",
    )


def test_new_fields_nullable(bom_item_data):
    item = bom_item_data["item"]
    item.location = None
    item.colour = None
    item.width_size = None
    item.match = None
    item.save(update_fields=list(NEW_FIELDS) + ["updated_at"])
    item.refresh_from_db()
    assert all(getattr(item, f) is None for f in NEW_FIELDS)


def test_existing_required_fields_unaffected(bom_item_data):
    # The BOM FK is DB-not-null; omitting it must still raise IntegrityError.
    with pytest.raises(IntegrityError):
        BOMItem.objects.create(
            tenant=bom_item_data["tenant"],
            category="fabric", item_name="FABRIC",
        )


# -------------------------------------------------------------- serializer


def test_serializer_exposes_new_fields_read(bom_item_data):
    item = bom_item_data["item"]
    item.location = "MAIN"
    item.width_size = "132 CM"
    item.save(update_fields=["location", "width_size", "updated_at"])
    data = BOMItemSerializer(item).data
    assert data["location"] == "MAIN"
    assert data["width_size"] == "132 CM"
    assert data["colour"] == ""
    assert data["match"] == ""


def test_serializer_accepts_new_fields_write(bom_item_data):
    payload = {
        "bom": str(bom_item_data["bom"].id),
        "category": "trim",
        "item_name": "ZIP #5",
        "location": "MAIN",
        "colour": "BLACK",
        "width_size": "132 CM",
        "match": "CRITICAL",
    }
    serializer = BOMItemSerializer(data=payload)
    assert serializer.is_valid(), serializer.errors
    saved = serializer.save(tenant=bom_item_data["tenant"], bom=bom_item_data["bom"])
    saved.refresh_from_db()
    assert (saved.location, saved.colour, saved.width_size, saved.match) == (
        "MAIN", "BLACK", "132 CM", "CRITICAL",
    )


# ----------------------------------------------------------------- admin


def test_bom_admin_list_display_extended(bom_item_data):
    admin = BOMItemAdmin(BOMItem, site)
    for field in ("location", "colour", "width_size", "match"):
        assert field in admin.list_display


# --------------------------------------------------- existing behavior kept


def test_existing_bom_item_serialization_still_works(bom_item_data):
    data = BOMItemSerializer(bom_item_data["item"]).data
    assert data["category"] == "fabric"
    assert data["item_name"] == "SANDWASH LINEN"
    assert data["line_total"] is None
    assert set(NEW_FIELDS).issubset(data.keys())
