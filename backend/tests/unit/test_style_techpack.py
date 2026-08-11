"""
RQ-039 — StyleTechPack model + progress lifecycle tests.

Covers the StyleTechPack tenant model: defaults/__str__, per-tenant unique
tech-pack numbering, nullable style link, file-field defaults, the guarded
state machine `draft → extracted → in_progress → completed`, cross-tenant
isolation, and the RQ-039 demo seed (2 tech-packs, draft + completed).
"""

import pytest
from django.core.management import call_command
from django.db import IntegrityError

from apps.merchandising.models import Style, StyleTechPack
from apps.setup.models import UOM, Buyer, ColorCode, Country, Factory, Vendor
from apps.tenants.models import Tenant


@pytest.fixture
def tp_tenant(db):
    return Tenant.objects.create(
        name="Tech Pack Co", slug="tp-test", schema_name="tenant_tp", status="active"
    )


@pytest.fixture
def tp_tenant_2(db):
    return Tenant.objects.create(
        name="Tech Pack Co 2", slug="tp-test-2", schema_name="tenant_tp2", status="active"
    )


def make_techpack(tenant, **kwargs):
    return StyleTechPack.objects.create(
        tenant=tenant,
        techpack_number=kwargs.pop("techpack_number", StyleTechPack.next_techpack_number(tenant)),
        **kwargs,
    )


# ------------------------------------------------------------ defaults / str


def test_defaults(tp_tenant):
    tp = make_techpack(tp_tenant)
    assert tp.status == StyleTechPack.Status.DRAFT
    assert tp.style is None
    assert tp.extracted_data == {}
    assert tp.errors == []
    assert tp.warnings == []
    assert tp.issue_date is None
    for field in ("block", "based_on", "customer", "style_number", "size",
                  "designer", "pattern_cutter", "issuer", "cloth_code",
                  "length", "sketch", "description", "note"):
        assert getattr(tp, field) == ""
    assert tp.source_pdf.name == ""
    assert tp.excel_file.name == ""


def test_str_unlinked(tp_tenant):
    tp = make_techpack(tp_tenant)
    assert tp.techpack_number in str(tp)


def test_str_linked(tp_tenant, tp_tenant_2):
    Country.objects.create(tenant=tp_tenant, name="TP Land", code="TP1")
    buyer = Buyer.objects.create(tenant=tp_tenant, name="TP Buyer", code="TPB1")
    style = Style.objects.create(
        tenant=tp_tenant, style_number="STY-TP", name="TP Style", buyer=buyer,
    )
    tp = StyleTechPack.objects.create(
        tenant=tp_tenant, techpack_number="TP-2000", style=style,
    )
    assert str(tp) == "TP-2000 - STY-TP"


# ------------------------------------------------------------- numbering


def test_next_techpack_number_starts_at_1001(tp_tenant):
    assert StyleTechPack.next_techpack_number(tp_tenant) == "TP-1001"


def test_techpack_number_increments_per_tenant(tp_tenant):
    make_techpack(tp_tenant)
    assert StyleTechPack.next_techpack_number(tp_tenant) == "TP-1002"
    make_techpack(tp_tenant)
    assert StyleTechPack.next_techpack_number(tp_tenant) == "TP-1003"


def test_numbering_respects_highest_existing(tp_tenant):
    make_techpack(tp_tenant, techpack_number="TP-1500")
    assert StyleTechPack.next_techpack_number(tp_tenant) == "TP-1501"


def test_numbering_ignores_non_matching_prefixes(tp_tenant):
    make_techpack(tp_tenant, techpack_number="TP-ABC")
    assert StyleTechPack.next_techpack_number(tp_tenant) == "TP-1001"


def test_numbering_independent_across_tenants(tp_tenant, tp_tenant_2):
    make_techpack(tp_tenant)
    make_techpack(tp_tenant_2)
    assert StyleTechPack.next_techpack_number(tp_tenant) == "TP-1002"
    assert StyleTechPack.next_techpack_number(tp_tenant_2) == "TP-1002"


def test_techpack_number_unique_per_tenant(tp_tenant):
    make_techpack(tp_tenant, techpack_number="TP-1001")
    with pytest.raises(IntegrityError):
        make_techpack(tp_tenant, techpack_number="TP-1001")


# ------------------------------------------------------------ style linkage


def test_style_fk_nullable_then_linkable(tp_tenant):
    Country.objects.create(tenant=tp_tenant, name="TP Land", code="TP1")
    buyer = Buyer.objects.create(tenant=tp_tenant, name="TP Buyer", code="TPB1")
    style = Style.objects.create(
        tenant=tp_tenant, style_number="STY-TP", name="TP Style", buyer=buyer,
    )
    tp = make_techpack(tp_tenant)
    tp.style = style
    tp.save(update_fields=["style", "updated_at"])
    tp.refresh_from_db()
    assert tp.style == style


# ------------------------------------------------------------ file fields


def test_source_pdf_and_excel_file_assignable(tp_tenant):
    tp = StyleTechPack.objects.create(
        tenant=tp_tenant,
        techpack_number="TP-3001",
        source_pdf="tech_packs/source/sample.pdf",
        excel_file="tech_packs/excel/sample.xlsx",
    )
    assert tp.source_pdf.name == "tech_packs/source/sample.pdf"
    assert tp.excel_file.name == "tech_packs/excel/sample.xlsx"


# ------------------------------------------------------------- lifecycle


def test_mark_extracted_stores_data_and_moves_to_extracted(tp_tenant):
    tp = make_techpack(tp_tenant)
    data = {"design_info": {"style_number": "67741T"}, "bom_rows": []}
    tp.mark_extracted(data)
    tp.refresh_from_db()
    assert tp.status == StyleTechPack.Status.EXTRACTED
    assert tp.extracted_data == data


def test_mark_extracted_illegal_from_completed(tp_tenant):
    tp = make_techpack(tp_tenant, status=StyleTechPack.Status.COMPLETED)
    with pytest.raises(ValueError):
        tp.mark_extracted({"design_info": {}})


def test_mark_in_progress_from_extracted(tp_tenant):
    tp = make_techpack(tp_tenant)
    tp.mark_extracted({"design_info": {}})
    tp.mark_in_progress()
    tp.refresh_from_db()
    assert tp.status == StyleTechPack.Status.IN_PROGRESS


def test_mark_in_progress_illegal_from_draft(tp_tenant):
    tp = make_techpack(tp_tenant)
    with pytest.raises(ValueError):
        tp.mark_in_progress()


def test_complete_links_style_and_completes(tp_tenant):
    Country.objects.create(tenant=tp_tenant, name="TP Land", code="TP1")
    buyer = Buyer.objects.create(tenant=tp_tenant, name="TP Buyer", code="TPB1")
    style = Style.objects.create(
        tenant=tp_tenant, style_number="STY-TP", name="TP Style", buyer=buyer,
    )
    tp = make_techpack(tp_tenant)
    tp.mark_extracted({"design_info": {"style_number": "STY-TP"}})
    tp.mark_in_progress()
    tp.complete(style=style)
    tp.refresh_from_db()
    assert tp.status == StyleTechPack.Status.COMPLETED
    assert tp.style == style


def test_complete_illegal_from_draft(tp_tenant):
    tp = make_techpack(tp_tenant)
    with pytest.raises(ValueError):
        tp.complete()


# ------------------------------------------------------------ tenancy


def test_cross_tenant_isolation(tp_tenant, tp_tenant_2):
    Country.objects.create(tenant=tp_tenant, name="TP Land", code="TP1")
    buyer = Buyer.objects.create(tenant=tp_tenant, name="TP Buyer", code="TPB1")
    style = Style.objects.create(
        tenant=tp_tenant, style_number="STY-TP", name="TP Style", buyer=buyer,
    )
    make_techpack(tp_tenant, style=style, status=StyleTechPack.Status.EXTRACTED)
    make_techpack(tp_tenant_2)
    assert StyleTechPack.objects.filter(tenant=tp_tenant).count() == 1
    assert StyleTechPack.objects.filter(tenant=tp_tenant_2).count() == 1
    assert list(StyleTechPack.objects.filter(tenant=tp_tenant).values_list("status", flat=True)) == [
        StyleTechPack.Status.EXTRACTED
    ]


# --------------------------------------------------------------- seed


def test_seed_creates_draft_and_completed_techpacks(db, tp_tenant):
    country = Country.objects.create(tenant=tp_tenant, name="TP Land", code="TP1")
    Factory.objects.create(tenant=tp_tenant, name="TP Factory", code="TPF1", country=country)
    for idx in range(3):  # seed_style_data indexes buyers[0..2]
        Buyer.objects.create(tenant=tp_tenant, name=f"TP Buyer {idx}", code=f"TPB{idx}")
    Vendor.objects.create(tenant=tp_tenant, name="TP Vendor", code="TPV1")
    ColorCode.objects.create(tenant=tp_tenant, name="Black", code="BLK", hex_code="#000000")
    UOM.objects.create(tenant=tp_tenant, name="Meters", code="MTR")
    call_command("seed_style_data", verbosity=0)
    techpacks = StyleTechPack.objects.filter(tenant=tp_tenant)
    assert techpacks.count() == 2
    assert set(techpacks.values_list("status", flat=True)) == {
        StyleTechPack.Status.DRAFT, StyleTechPack.Status.COMPLETED,
    }
