"""
Tests for seed_demo_data management command.
"""
from datetime import timedelta
from decimal import Decimal
from io import StringIO

import pytest
from django.core.management import call_command
from django.utils import timezone

from apps.commercial.models import (
    LC,
    Bank,
    DebitNote,
    InvoiceApproval,
    LCAmendment,
    ProformaInvoice,
    SalesConfirmation,
    SalesContract,
)
from apps.fabric.models import FabricCategory, FabricOrder, FabricTolerance, HTSCode
from apps.logistics.models import BookingScheduleItem, Docket, FinalHitReconciliation, Shipment
from apps.merchandising.models import (
    BOM,
    BOMItem,
    DesignImage,
    FileOpening,
    FitSpec,
    Hit,
    JobRequest,
    JobStatus,
    JobType,
    PurchaseOrder,
    Style,
    TrimStatus,
)
from apps.quality.models import GoldSeal
from apps.tenants.models import Tenant


@pytest.fixture
def seed_tenant(db):
    tenant = Tenant.objects.create(
        name="Seed Test Co", slug="seed-test",
        schema_name="tenant_seed", status="active",
    )
    return tenant


@pytest.mark.django_db(transaction=True)
class TestSeedCommercialData:
    def test_seed_creates_banks(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        assert Bank.objects.filter(tenant=seed_tenant).count() == 6

    def test_seed_creates_lcs(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        assert LC.objects.filter(tenant=seed_tenant).count() == 5

    def test_seed_creates_lc_amendments(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        assert LCAmendment.objects.filter(tenant=seed_tenant).count() == 3

    def test_seed_creates_proforma_invoices(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        assert ProformaInvoice.objects.filter(tenant=seed_tenant).count() == 5

    def test_seed_creates_sales_contracts(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        assert SalesContract.objects.filter(tenant=seed_tenant).count() == 3

    def test_seed_lcs_linked_to_buyers(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        for lc in LC.objects.filter(tenant=seed_tenant):
            assert lc.buyer is not None
            assert lc.expiry_date is not None

    def test_seed_pis_linked_to_pos(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        for pi in ProformaInvoice.objects.filter(tenant=seed_tenant):
            assert pi.purchase_order is not None
            assert pi.amount > 0

    def test_seed_scs_have_contract_numbers(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        for sc in SalesContract.objects.filter(tenant=seed_tenant):
            assert sc.contract_number.startswith("SC-")
            assert sc.total_amount > 0

    def test_seed_creates_sales_confirmations(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        assert SalesConfirmation.objects.filter(tenant=seed_tenant).count() == 5

    def test_seed_confirmations_have_statuses(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        statuses = set(SalesConfirmation.objects.filter(tenant=seed_tenant).values_list("status", flat=True))
        assert statuses == {"draft", "sent", "disputed", "accepted"}

    def test_seed_confirmation_overdue_sent(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        overdue = [
            sc for sc in SalesConfirmation.objects.filter(tenant=seed_tenant, status="sent")
            if sc.window_elapsed()
        ]
        assert len(overdue) >= 1

    def test_seed_pi_statuses_valid(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        valid = {"draft", "sent", "accepted", "rejected"}
        for pi in ProformaInvoice.objects.filter(tenant=seed_tenant):
            assert pi.status in valid


@pytest.mark.django_db(transaction=True)
class TestSeedTrimSchedule:
    def test_seed_creates_boms(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        assert BOM.objects.filter(tenant=seed_tenant).count() >= 1

    def test_seed_creates_bom_items(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        items = BOMItem.objects.filter(tenant=seed_tenant)
        assert items.count() >= 5
        assert any(i.category == "Trim" for i in items)

    def test_seed_trim_items_have_suppliers(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        trims = BOMItem.objects.filter(tenant=seed_tenant, category="Trim")
        assert trims.filter(supplier__isnull=False).count() >= 3

    def test_seed_trim_items_have_statuses(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        trims = BOMItem.objects.filter(tenant=seed_tenant, category="Trim")
        statuses = set(trims.values_list("status", flat=True))
        assert TrimStatus.ORDERED in statuses
        assert TrimStatus.PARTIAL in statuses
        assert TrimStatus.COMPLETED in statuses

    def test_seed_trim_items_have_qty_and_dates(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        ordered = BOMItem.objects.filter(
            tenant=seed_tenant, category="Trim", status=TrimStatus.ORDERED
        ).first()
        assert ordered is not None
        assert ordered.ordered_qty is not None
        assert ordered.delivered_qty is not None
        assert ordered.eta_date is not None
        assert ordered.confirmed_date is not None
        assert ordered.actual_date is not None

    def test_seed_partial_delivery_qty_less_than_ordered(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        partial = BOMItem.objects.filter(
            tenant=seed_tenant, category="Trim", status=TrimStatus.PARTIAL
        ).first()
        assert partial is not None
        assert partial.delivered_qty < partial.ordered_qty


@pytest.mark.django_db(transaction=True)
class TestSeedHits:
    def test_seed_creates_hits(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        hits = Hit.objects.filter(tenant=seed_tenant)
        assert hits.count() >= 1

    def test_seed_hits_linked_to_po(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        for hit in Hit.objects.filter(tenant=seed_tenant):
            assert hit.purchase_order is not None
            assert hit.colour
            assert hit.hit_number.startswith("HIT-")

    def test_seed_hit_colours_unique_per_po(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        pairs = list(Hit.objects.filter(tenant=seed_tenant).values_list("purchase_order_id", "colour_id"))
        assert len(pairs) == len(set(pairs))

    def test_seed_hits_have_delivery_modes(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        modes = set(Hit.objects.filter(tenant=seed_tenant).values_list("delivery_mode", flat=True))
        assert "boxed" in modes
        assert "hanging" in modes

    def test_seed_hits_have_dates(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        hits = Hit.objects.filter(tenant=seed_tenant)
        assert hits.filter(original_delivery_date__isnull=False).count() >= 1
        assert hits.filter(actual_delivery_date__isnull=False).count() >= 1


@pytest.mark.django_db(transaction=True)
class TestSeedTrimCopy:
    """GC-009: seeded BOMs must support trim/label copy from order end-to-end."""

    def test_seed_creates_multiple_boms_with_trims(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        boms = BOM.objects.filter(tenant=seed_tenant)
        assert boms.count() >= 2
        for bom in boms:
            assert BOMItem.objects.filter(
                tenant=seed_tenant, bom=bom, category="Trim"
            ).count() >= 1

    def test_seed_copy_trim_items_between_boms(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        from apps.merchandising.services import copy_trim_items
        boms = list(BOM.objects.filter(tenant=seed_tenant))
        source, target = boms[0], boms[1]
        BOMItem.objects.filter(tenant=seed_tenant, bom=target, category="Trim").delete()
        result = copy_trim_items(source, target)
        source_trims = source.items.filter(category="Trim")
        assert result["copied"] == source_trims.count()
        assert result["skipped"] == 0
        for name in source_trims.values_list("item_name", flat=True):
            assert BOMItem.objects.filter(
                tenant=seed_tenant, bom=target, item_name__iexact=name
            ).exists()

    def test_seed_copy_preserves_supplier_and_price(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        from apps.merchandising.services import copy_trim_items
        boms = list(BOM.objects.filter(tenant=seed_tenant))
        source, target = boms[0], boms[1]
        BOMItem.objects.filter(tenant=seed_tenant, bom=target, category="Trim").delete()
        source_trim = source.items.filter(category="Trim").first()
        copy_trim_items(source, target)
        copied = BOMItem.objects.get(
            tenant=seed_tenant, bom=target, item_name__iexact=source_trim.item_name
        )
        assert copied.supplier == source_trim.supplier
        assert copied.unit_price == source_trim.unit_price
        assert copied.status == TrimStatus.TBC
        assert copied.ordered_qty is None

    def test_seed_copy_overwrite_resets_schedule(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        from apps.merchandising.services import copy_trim_items
        boms = list(BOM.objects.filter(tenant=seed_tenant))
        source, target = boms[0], boms[1]
        result = copy_trim_items(source, target, overwrite=True)
        assert result["overwritten"] >= 1
        for trim in target.items.filter(category="Trim"):
            assert trim.status == TrimStatus.TBC
            assert trim.ordered_qty is None
            assert trim.delivered_qty is None


@pytest.mark.django_db(transaction=True)
class TestSeedFitSpecs:
    """GC-011: seeded fit specs must be versioned with one current per order."""

    def test_seed_creates_fit_specs(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        assert FitSpec.objects.filter(tenant=seed_tenant).count() >= 1

    def test_seed_fit_specs_linked_to_pos(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        for spec in FitSpec.objects.filter(tenant=seed_tenant):
            assert spec.purchase_order is not None
            assert spec.version >= 1
            assert isinstance(spec.measurements, dict)

    def test_seed_one_current_spec_per_order(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        orders = set(
            FitSpec.objects.filter(tenant=seed_tenant).values_list("purchase_order_id", flat=True)
        )
        for order_id in orders:
            current_count = FitSpec.objects.filter(
                tenant=seed_tenant, purchase_order_id=order_id, is_current=True
            ).count()
            assert current_count == 1

    def test_seed_fit_specs_have_varied_stages(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        stages = set(FitSpec.objects.filter(tenant=seed_tenant).values_list("fit_stage", flat=True))
        assert "dev" in stages
        assert len(stages) >= 2


class TestSeedJobs:
    """GC-013: seeded job requests must form a queue per style."""

    def test_seed_creates_jobs(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        assert JobRequest.objects.filter(tenant=seed_tenant).count() >= 1

    def test_seed_jobs_linked_to_styles(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        for job in JobRequest.objects.filter(tenant=seed_tenant):
            assert job.style is not None
            assert job.job_number.startswith("JOB-")
            assert job.job_type in {"pattern", "sample", "3d", "mini_marker"}

    def test_seed_jobs_have_varied_statuses(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        statuses = set(JobRequest.objects.filter(tenant=seed_tenant).values_list("status", flat=True))
        assert len(statuses) >= 2

    def test_seed_booking_schedule_linked_to_shipments(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        items = BookingScheduleItem.objects.filter(tenant=seed_tenant)
        assert items.count() >= 1
        for item in items:
            assert item.shipment is not None
            assert item.shipment.tenant == seed_tenant
            assert item.week_ending is not None
            assert item.status in {"live", "in_work", "delivered"}

    def test_seed_booking_schedule_unique_per_shipment_week(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        items = BookingScheduleItem.objects.filter(tenant=seed_tenant)
        combos = set(items.values_list("shipment_id", "week_ending", "hit_id"))
        assert len(combos) == items.count()


class TestSeedGoldSeals:
    """GC-016: seeded gold seals must be linked to shipments and valid statuses."""

    def test_seed_creates_gold_seals(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        assert GoldSeal.objects.filter(tenant=seed_tenant).count() >= 1

    def test_seed_gold_seals_linked_to_shipments(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        for seal in GoldSeal.objects.filter(tenant=seed_tenant):
            assert seal.shipment is not None
            assert seal.shipment.tenant == seed_tenant
            assert seal.status in {"pending", "sent", "approved", "rejected"}

    def test_seed_gold_seals_have_dates_when_sent(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        seals = GoldSeal.objects.filter(tenant=seed_tenant)
        assert seals.filter(sent_date__isnull=False).count() >= 1
        assert seals.filter(approval_date__isnull=False).count() >= 1


class TestSeedDesignImages:
    """RQ-005: seeded design images must be linked to styles with valid roles."""

    def test_seed_creates_design_images(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        assert DesignImage.objects.filter(tenant=seed_tenant).count() >= 1

    def test_seed_design_images_linked_to_styles(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        for img in DesignImage.objects.filter(tenant=seed_tenant):
            assert img.style is not None
            assert img.style.tenant == seed_tenant
            assert img.role in {"main", "range", "colourway", "detail"}

    def test_seed_styles_have_main_images(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        styles = Style.objects.filter(tenant=seed_tenant)
        assert styles.count() >= 1
        for style in styles:
            assert style.design_images.filter(is_main=True).count() == 1
        assert DesignImage.objects.filter(tenant=seed_tenant, is_main=True).count() == styles.count()


class TestSeedNotSoldAnalysis:
    """RQ-006: seeded unsold analysis samples must be completed sample jobs linked to styles."""

    def _nsamp_jobs(self, tenant):
        return JobRequest.objects.filter(
            tenant=tenant, job_number__startswith="JOB-9"
        )

    def test_seed_creates_unsold_analysis_samples(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        styles = Style.objects.filter(tenant=seed_tenant)
        assert styles.count() >= 1
        jobs = self._nsamp_jobs(seed_tenant)
        assert jobs.count() == styles.count()
        assert jobs.filter(job_type=JobType.SAMPLE, status=JobStatus.COMPLETED).count() == styles.count()

    def test_seed_unsold_analysis_jobs_linked_to_styles(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        for job in self._nsamp_jobs(seed_tenant):
            assert job.style is not None
            assert job.style.tenant == seed_tenant
            assert job.job_type == JobType.SAMPLE
            assert job.status == JobStatus.COMPLETED

    def test_seed_unsold_analysis_sold_mix(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        opened_styles = set(
            FileOpening.objects.filter(tenant=seed_tenant).values_list("style_id", flat=True)
        )
        opened_jobs = self._nsamp_jobs(seed_tenant).filter(style_id__in=opened_styles)
        assert opened_jobs.filter(notes__icontains="no file opening").count() == 0


class TestSeedQuickLead:
    """RQ-008: seeded quick lead file openings must include a fully and a partially agreed one."""

    def test_seed_marks_quick_lead(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        assert FileOpening.objects.filter(tenant=seed_tenant, is_quick_lead=True).count() >= 1

    def test_seed_one_fully_agreed(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        full = [
            fo for fo in FileOpening.objects.filter(tenant=seed_tenant, is_quick_lead=True)
            if fo.quick_lead_agreement_complete
        ]
        assert len(full) >= 1

    def test_seed_one_partially_agreed(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        partial = [
            fo for fo in FileOpening.objects.filter(tenant=seed_tenant, is_quick_lead=True)
            if fo.quick_lead_agreed_by and not fo.quick_lead_agreement_complete
        ]
        assert len(partial) >= 1


class TestSeedRepeats:
    """RQ-009: seeded repeat file openings must link to an original FN with approvals."""

    def test_seed_creates_repeats(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        repeats = FileOpening.objects.filter(tenant=seed_tenant, is_repeat=True)
        assert repeats.count() >= 2
        assert all(r.original_fn is not None for r in repeats)
        assert all("Repeat of" in r.remarks for r in repeats)

    def test_seed_one_fully_approved(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        full = [
            fo for fo in FileOpening.objects.filter(tenant=seed_tenant, is_repeat=True)
            if fo.repeat_approval_complete
        ]
        assert len(full) >= 1

    def test_seed_one_partially_approved(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        partial = [
            fo for fo in FileOpening.objects.filter(tenant=seed_tenant, is_repeat=True)
            if fo.repeat_approved_by and not fo.repeat_approval_complete
        ]
        assert len(partial) >= 1


class TestSeedStockFabric:
    """RQ-019: seeded stock fabric FOs must be flagged with meter tracking."""

    def test_seed_creates_stock_fabric(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        stock = FileOpening.objects.filter(tenant=seed_tenant, is_stock_fabric=True)
        assert stock.count() >= 2
        assert all(s.stock_fabric_description == "stock fabric" for s in stock)
        assert all((s.total_meters or 0) > 0 for s in stock)

    def test_seed_one_with_allocation(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        allocated = [
            s for s in FileOpening.objects.filter(tenant=seed_tenant, is_stock_fabric=True)
            if s.stock_allocations.count() > 0
        ]
        assert len(allocated) >= 1
        alloc = allocated[0].stock_allocations.first()
        assert alloc.meters > 0
        assert alloc.allocated_to is not None

    def test_seed_balance_tracks_allocation(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        stock = FileOpening.objects.filter(tenant=seed_tenant, is_stock_fabric=True).first()
        assert stock.stock_balance_meters == stock.total_meters - stock.allocated_meters


class TestSeedFabricTolerance:
    """RQ-016: seeded fabric tolerance bands must match the GC manual."""

    def test_seed_creates_seven_bands(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        assert FabricTolerance.objects.filter(tenant=seed_tenant).count() == 7

    def test_seed_primark_bands_match_gc(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        primark = list(
            FabricTolerance.objects.filter(tenant=seed_tenant, customer_type="primark")
            .order_by("qty_from")
        )
        assert len(primark) == 3
        assert (str(primark[0].qty_from), str(primark[0].qty_to), str(primark[0].tolerance_pct)) == ("0.01", "2999.00", "5.00")
        assert (str(primark[1].qty_from), str(primark[1].qty_to), str(primark[1].tolerance_pct)) == ("3001.00", "4999.00", "3.00")
        assert (str(primark[2].qty_from), primark[2].qty_to, str(primark[2].tolerance_pct)) == ("5000.00", None, "2.00")

    def test_seed_tolerance_resolution(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        assert str(FabricTolerance.tolerance_for("primark", 2000).tolerance_pct) == "5.00"
        assert str(FabricTolerance.tolerance_for("other", 6000).tolerance_pct) == "3.00"
        assert str(FabricTolerance.tolerance_for("fur", 900).tolerance_pct) == "2.00"


class TestSeedFabricRisk:
    """RQ-018: seeded fabric orders carry GC risk levels."""

    def test_seed_assigns_risk_to_all_orders(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        orders = FabricOrder.objects.filter(tenant=seed_tenant)
        assert orders.count() >= 3
        assert all(o.risk_level is not None for o in orders)

    def test_seed_delivered_is_green_draft_is_none(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        delivered = FabricOrder.objects.get(tenant=seed_tenant, order_number="FO-2026-1003")
        draft = FabricOrder.objects.get(tenant=seed_tenant, order_number="FO-2026-1001")
        assert delivered.risk_level.code == "green"
        assert draft.risk_level.code == "none"

    def test_seed_bulk_approved_red_override(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        bulk = FabricOrder.objects.get(tenant=seed_tenant, order_number="FO-2026-1002")
        assert bulk.risk_level.code == "red"
        assert bulk.risk_notes
        assert bulk.effective_owner("clearance") == "logistics"


class TestSeedFabricSchedule:
    """RQ-020: seeded fabric orders carry a schedule handoff audit trail."""

    def test_seed_creates_handoffs_for_approved_orders(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        bulk = FabricOrder.objects.get(tenant=seed_tenant, order_number="FO-2026-1002")
        delivered = FabricOrder.objects.get(tenant=seed_tenant, order_number="FO-2026-1003")
        assert bulk.schedule_handoffs.count() == 5
        assert delivered.schedule_handoffs.count() == 5

    def test_seed_handoff_owners_reflect_chain(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        bulk = FabricOrder.objects.get(tenant=seed_tenant, order_number="FO-2026-1002")
        assert bulk.effective_owner("onboard") == "planning"
        assert bulk.effective_owner("lab_dip") == "merchandising"
        assert bulk.effective_owner("clearance") == "logistics"
        assert bulk.schedule_handoffs.filter(trigger="bulk_approved").count() == 3

    def test_seed_draft_has_no_handoffs(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        draft = FabricOrder.objects.get(tenant=seed_tenant, order_number="FO-2026-1001")
        assert draft.schedule_handoffs.count() == 0
        assert draft.effective_owner("onboard") == "sales"


class TestSeedFabricUtilization:
    """RQ-023: seeded docket-stage utilization records for non-draft orders."""

    def test_seed_creates_utilization_for_non_draft_orders(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        bulk = FabricOrder.objects.get(tenant=seed_tenant, order_number="FO-2026-1002")
        delivered = FabricOrder.objects.get(tenant=seed_tenant, order_number="FO-2026-1003")
        draft = FabricOrder.objects.get(tenant=seed_tenant, order_number="FO-2026-1001")
        assert bulk.utilizations.count() == 1
        assert delivered.utilizations.count() == 1
        assert draft.utilizations.count() == 0

    def test_seed_computed_quantities(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        delivered = FabricOrder.objects.get(tenant=seed_tenant, order_number="FO-2026-1003")
        rec = delivered.utilizations.get()
        assert rec.ordered_meters() == delivered.quantity_meters
        assert str(rec.received_meters) == "3100.00"
        assert str(rec.excess_meters()) == "25.00"
        assert str(rec.efficiency_pct()) == "95.16"

    def test_seed_carries_excess_fabric_note(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        delivered = FabricOrder.objects.get(tenant=seed_tenant, order_number="FO-2026-1003")
        rec = delivered.utilizations.get()
        assert "excess fabric" in rec.notes.lower()


class TestSeedFabricMasterData:
    """RQ-015: seeded fabric categories (depth-2 hierarchy) and HTS codes."""

    def test_seed_creates_twelve_categories_with_depth_two(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        cats = FabricCategory.objects.filter(tenant=seed_tenant)
        assert cats.count() == 12
        roots = cats.filter(parent__isnull=True)
        assert roots.count() == 3
        assert cats.filter(parent__isnull=False).count() == 9
        for root in roots:
            assert root.children.count() > 0

    def test_seed_category_codes_unique_per_tenant(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        codes = list(FabricCategory.objects.filter(tenant=seed_tenant).values_list("code", flat=True))
        assert len(codes) == len(set(codes))

    def test_seed_creates_eight_hts_codes(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        hts = HTSCode.objects.filter(tenant=seed_tenant)
        assert hts.count() == 8

    def test_seed_hts_codes_linked_to_categories_with_duty(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        hts = HTSCode.objects.filter(tenant=seed_tenant)
        assert hts.filter(fabric_category__isnull=False).count() == 8
        for code in hts:
            assert code.duty_rate is not None
            assert code.duty_rate > 0


class TestSeedDockets:
    """RQ-026: seeded dockets with contract pricing and over-200m sales flag.
    RQ-031 adds the two GC-022 comparison dockets (DK-PC-OVER/SHORT)."""

    def test_seed_creates_dockets(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        dockets = Docket.objects.filter(tenant=seed_tenant)
        assert dockets.count() == 6

    def test_seed_dockets_linked_to_shipments(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        dockets = Docket.objects.filter(tenant=seed_tenant)
        for docket in dockets:
            assert docket.shipment is not None
            assert docket.shipment.tenant == seed_tenant

    def test_seed_final_docket_over_200m_flagged(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        flagged = [d for d in Docket.objects.filter(tenant=seed_tenant) if d.requires_sales_notification]
        assert len(flagged) == 1
        assert flagged[0].is_final
        assert flagged[0].unused_fabric_meters > 200


class TestSeedFinalHitReconciliation:
    """RQ-027: seeded final hit reconciliations demo the over-20-unit debit rule."""

    def test_seed_creates_reconciliations_for_delivered_hits(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        recs = FinalHitReconciliation.objects.filter(tenant=seed_tenant)
        assert recs.count() > 0

    def test_seed_reconciliations_linked_to_shipments(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        for rec in FinalHitReconciliation.objects.filter(tenant=seed_tenant):
            assert rec.shipment is not None
            assert rec.shipment.tenant == seed_tenant
            assert rec.shortage_units >= 0

    def test_seed_demonstrates_debited_over_limit(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        debited = FinalHitReconciliation.objects.filter(tenant=seed_tenant, status="debited")
        assert debited.exists()
        for rec in debited:
            assert rec.requires_debit


class TestSeedOrderManager:
    """RQ-028: seeded Order Manager demo rows cover both risk extremes."""

    def test_seed_creates_demo_orders(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        pos = PurchaseOrder.objects.filter(tenant=seed_tenant, po_number__startswith="PO-DEMO")
        assert pos.count() >= 2

    def test_seed_overdue_order_is_open_and_has_job(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        po = PurchaseOrder.objects.get(tenant=seed_tenant, po_number="PO-DEMO-01")
        assert po.status == "open"
        assert po.delivery_date < timezone.localdate()
        assert po.job_requests.filter(status=JobStatus.PENDING).exists()

    def test_seed_delivered_order_is_clean(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        po = PurchaseOrder.objects.get(tenant=seed_tenant, po_number="PO-DEMO-02")
        assert po.status == "delivered"
        shipment = po.shipments.get(shipment_number="SHP-DEMO-01")
        assert shipment.status == "delivered"
        assert shipment.gold_seals.filter(status="approved").exists()
        rec = shipment.reconciliations.get()
        assert rec.status == "reconciled"
        assert rec.shortage_units == 0
        assert not rec.requires_debit


class TestSeedBookingRef:
    """GC-018: seeded booking refs demo both the filled and alert states."""

    def test_seed_sets_booking_reference_on_filled_shipment(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        shipment = Shipment.objects.get(tenant=seed_tenant, shipment_number="SHP-2025-002")
        assert shipment.booking_reference == "BRF-2025-1184"
        assert shipment.booking_ref_status == "ok"

    def test_seed_derives_required_date_from_eta(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        shipment = Shipment.objects.get(tenant=seed_tenant, shipment_number="SHP-2025-002")
        assert shipment.booking_ref_required_date is not None
        assert shipment.booking_ref_required_date == shipment.eta - timedelta(days=14)

    def test_seed_demonstrates_booking_ref_alert(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        assert Shipment.booking_ref_alerts(tenant=seed_tenant).exists()


class TestSeedPaperworkComparison:
    """GC-022: seeded comparison demonstrates over-tolerance + cannot-cover."""

    def _compare(self, seed_tenant):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)
        from apps.logistics.services.paperwork_comparison import PaperworkComparisonService
        return PaperworkComparisonService.compare_tenant(seed_tenant)

    def test_seed_demonstrates_over_tolerance(self, seed_tenant):
        result = self._compare(seed_tenant)
        rows = result["results"]
        assert result["count"] >= 2
        assert any(r["over_tolerance"] for r in rows)
        assert result["summary"]["over_tolerance_count"] >= 1

    def test_seed_demonstrates_cannot_cover(self, seed_tenant):
        result = self._compare(seed_tenant)
        rows = result["results"]
        assert any(r["can_cover_order"] is False for r in rows)
        assert result["summary"]["cannot_cover_count"] >= 1

    def test_seed_over_tolerance_scenario_specifics(self, seed_tenant):
        result = self._compare(seed_tenant)
        row = next(r for r in result["results"] if r["po_number"] == "PO-PC-OVER")
        assert row["shipped_quantity"] == Decimal("2160.00")
        assert row["ordered_quantity"] == 2000
        assert row["quantity_variance_pct"] == Decimal("8.00")
        assert row["over_tolerance"] is True

    def test_seed_cannot_cover_scenario_specifics(self, seed_tenant):
        result = self._compare(seed_tenant)
        row = next(r for r in result["results"] if r["po_number"] == "PO-PC-SHORT")
        assert row["ordered_quantity"] == 5000
        assert row["shipped_quantity"] == Decimal("5000.00")
        assert row["can_cover_order"] is False
        assert row["producible_garments"] < 5000


@pytest.mark.django_db(transaction=True)
class TestSeedDebitNotes:
    """GC-023: seeded debit notes demonstrate the pro-forma → issued → paid
    lifecycle and the final-hit >20-unit-short trigger (RQ-027)."""

    def _seed(self):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)

    def test_seed_creates_debit_notes(self, seed_tenant):
        self._seed()
        assert DebitNote.objects.filter(tenant=seed_tenant).count() == 4

    def test_seed_demonstrates_lifecycle(self, seed_tenant):
        self._seed()
        statuses = set(DebitNote.objects.filter(tenant=seed_tenant).values_list("status", flat=True))
        assert {"pro_forma", "issued", "paid"} <= statuses

    def test_seed_issued_and_paid_sent_compliance_email(self, seed_tenant):
        self._seed()
        dns = DebitNote.objects.filter(tenant=seed_tenant, status__in=["issued", "paid"])
        assert dns.count() == 2
        assert all(dn.compliance_email_sent for dn in dns)
        assert all(dn.email_sent_at is not None for dn in dns)

    def test_seed_final_hit_shortage_linked_to_reconciliation(self, seed_tenant):
        self._seed()
        dn = DebitNote.objects.get(tenant=seed_tenant, debit_number="DN-2025-004")
        assert dn.debit_type == "final_hit_shortage"
        assert dn.reconciliation is not None
        assert dn.reconciliation.requires_debit is True
        assert dn.shortage_units > Decimal("20.00")
        assert dn.reconciliation.shipment.purchase_order_id == dn.purchase_order_id


@pytest.mark.django_db(transaction=True)
class TestSeedInvoiceApprovals:
    """RQ-035 (GC-024): seeded invoice approvals demonstrate matching,
    mismatch, over-tolerance (with linked GC-023 debit) and sign-off."""

    def _seed(self):
        out = StringIO()
        call_command("seed_demo_data", "--tenant", "seed-test", stdout=out)

    def test_seed_creates_invoice_approvals(self, seed_tenant):
        self._seed()
        assert InvoiceApproval.objects.filter(tenant=seed_tenant).count() == 4

    def test_seed_matching_invoice(self, seed_tenant):
        self._seed()
        inv = InvoiceApproval.objects.get(tenant=seed_tenant, invoice_number="IA-2025-001")
        assert inv.match_status == "match"
        assert inv.is_match is True
        assert inv.status == "pending"

    def test_seed_mismatched_invoice(self, seed_tenant):
        self._seed()
        inv = InvoiceApproval.objects.get(tenant=seed_tenant, invoice_number="IA-2025-002")
        assert inv.match_status == "mismatch"
        assert "price" in inv.mismatch_reasons

    def test_seed_over_tolerance_invoice_linked_to_debit(self, seed_tenant):
        self._seed()
        inv = InvoiceApproval.objects.get(tenant=seed_tenant, invoice_number="IA-2025-003")
        assert inv.over_tolerance is True
        assert inv.debit_note is not None
        assert inv.debit_note.debit_number == "DN-2025-001"
        assert inv.debit_note.status == "pro_forma"

    def test_seed_approved_invoice_signed_off(self, seed_tenant):
        self._seed()
        inv = InvoiceApproval.objects.get(tenant=seed_tenant, invoice_number="IA-2025-004")
        assert inv.status == "approved"
        assert inv.approved_at is not None


class TestSeedFrozenDates:
    """--demo-frozen-dates pins all seeded dates to a fixed base so demos
    and screenshots are reproducible regardless of when the command runs."""

    def test_frozen_dates_pin_relative_dates(self, seed_tenant):
        from apps.setup.management.commands.seed_demo_data import DEMO_FROZEN_BASE_DATE

        out = StringIO()
        call_command(
            "seed_demo_data", "--tenant", "seed-test", "--demo-frozen-dates", stdout=out
        )
        base = DEMO_FROZEN_BASE_DATE
        for po in PurchaseOrder.objects.filter(tenant=seed_tenant):
            assert po.po_date < base
            assert po.delivery_date is not None
        assert (
            PurchaseOrder.objects.filter(
                tenant=seed_tenant, delivery_date__gt=base
            ).exists()
        )
        for lc in LC.objects.filter(tenant=seed_tenant):
            assert lc.issued_date == base
            assert lc.expiry_date > base
