"""
DesignSheet model + status transition tests (Documented: connection plan §6.1).

Covers the DesignSheet tenant model: default status/annotations, ``__str__``,
the one-design-sheet-per-tech-pack constraint, the guarded ``transition_to``
state machine (new -> rejected/closed/archived, reopen to new, invalid status
rejected), and cascading relationships with FitSpecification and
DesignJobRequest.
"""

import datetime

import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError

from apps.merchandising.models import (
    DesignSheet,
    DesignJobRequest,
    FitImage,
    FitSpecification,
    Style,
    StyleTechPack,
)
from apps.setup.models import Buyer, Country
from apps.tenants.models import Tenant


@pytest.fixture
def ds_tenant(db):
    return Tenant.objects.create(
        name="DS Model Co", slug="dsmodel-test",
        schema_name="tenant_dsmodel", status="active",
    )


@pytest.fixture
def ds_tenant_2(db):
    return Tenant.objects.create(
        name="DS Model Co 2", slug="dsmodel-test-2",
        schema_name="tenant_dsmodel2", status="active",
    )


@pytest.fixture
def ds_techpack(ds_tenant):
    return StyleTechPack.objects.create(
        tenant=ds_tenant,
        techpack_number=StyleTechPack.next_techpack_number(ds_tenant),
    )


@pytest.fixture
def ds_sheet(ds_tenant, ds_techpack):
    return DesignSheet.objects.create(tenant=ds_tenant, tech_pack=ds_techpack)


def make_sheet(tenant, **kwargs):
    techpack = kwargs.pop("tech_pack", None) or StyleTechPack.objects.create(
        tenant=tenant,
        techpack_number=StyleTechPack.next_techpack_number(tenant),
    )
    return DesignSheet.objects.create(tenant=tenant, tech_pack=techpack, **kwargs)


# ------------------------------------------------------------ defaults / str


def test_default_status_is_new(ds_sheet):
    assert ds_sheet.status == DesignSheet.Status.NEW


def test_sketch_annotations_default_empty_list(ds_sheet):
    assert ds_sheet.sketch_annotations == []


def test_str_includes_techpack_number(ds_sheet):
    assert ds_sheet.tech_pack.techpack_number in str(ds_sheet)


def test_status_choices_defined():
    assert set(DesignSheet.Status.values) == {"new", "rejected", "closed", "production", "archived"}


# ------------------------------------------------------ tech pack constraint


def test_no_second_design_sheet_for_same_techpack(ds_tenant, ds_techpack):
    DesignSheet.objects.create(tenant=ds_tenant, tech_pack=ds_techpack)
    with pytest.raises(IntegrityError):
        DesignSheet.objects.create(tenant=ds_tenant, tech_pack=ds_techpack)


def test_techpack_field_cascades_to_sheet(ds_tenant, ds_techpack):
    sheet = DesignSheet.objects.create(tenant=ds_tenant, tech_pack=ds_techpack)
    ds_techpack.delete()
    assert not DesignSheet.objects.filter(pk=sheet.pk).exists()


# ---------------------------------------------------------- status workflow


def test_transition_to_closed_persists(ds_sheet):
    ds_sheet.transition_to("closed")
    ds_sheet.refresh_from_db()
    assert ds_sheet.status == "closed"


def test_transition_to_rejected(ds_sheet):
    ds_sheet.transition_to(DesignSheet.Status.REJECTED)
    assert ds_sheet.status == DesignSheet.Status.REJECTED


def test_transition_to_archived(ds_sheet):
    ds_sheet.transition_to(DesignSheet.Status.ARCHIVED)
    assert ds_sheet.status == DesignSheet.Status.ARCHIVED


def test_transition_to_production(ds_sheet):
    ds_sheet.transition_to(DesignSheet.Status.PRODUCTION)
    assert ds_sheet.status == DesignSheet.Status.PRODUCTION
    assert ds_sheet.get_status_display() == "Production"


def test_transition_roundtrip_reopen_to_new(ds_sheet):
    ds_sheet.transition_to("closed")
    ds_sheet.transition_to("new")
    ds_sheet.refresh_from_db()
    assert ds_sheet.status == "new"


def test_transition_accepts_all_valid_statuses(ds_sheet):
    for value in DesignSheet.Status.values:
        ds_sheet.transition_to(value)
        assert ds_sheet.status == value


def test_transition_rejects_unknown_status(ds_sheet):
    with pytest.raises(ValidationError):
        ds_sheet.transition_to("bogus")
    ds_sheet.refresh_from_db()
    assert ds_sheet.status == DesignSheet.Status.NEW


def test_transition_annotations_survive_status_change(ds_sheet):
    ds_sheet.sketch_annotations = [{"id": "a1", "x": 10, "y": 20, "text": "SEAM"}]
    ds_sheet.save(update_fields=["sketch_annotations"])
    ds_sheet.transition_to("closed")
    ds_sheet.refresh_from_db()
    assert ds_sheet.sketch_annotations == [{"id": "a1", "x": 10, "y": 20, "text": "SEAM"}]


# ------------------------------------------------------------ related models


def test_fit_spec_unique_fit_number_per_sheet(ds_tenant, ds_sheet):
    FitSpecification.objects.create(
        tenant=ds_tenant, design_sheet=ds_sheet,
        fit_number="1st Fit", fit_date=datetime.date(2026, 9, 1),
        description="First fitting",
    )
    with pytest.raises(IntegrityError):
        FitSpecification.objects.create(
            tenant=ds_tenant, design_sheet=ds_sheet,
            fit_number="1st Fit", fit_date=datetime.date(2026, 9, 8),
            description="Duplicate",
        )


def test_fit_spec_defaults_unselected(ds_tenant, ds_sheet):
    spec = FitSpecification.objects.create(
        tenant=ds_tenant, design_sheet=ds_sheet,
        fit_number="1st Fit", fit_date=datetime.date(2026, 9, 1),
        description="First fitting",
    )
    assert spec.is_selected is False


def test_job_request_default_status_pending(ds_tenant, ds_sheet):
    job = DesignJobRequest.objects.create(
        tenant=ds_tenant, design_sheet=ds_sheet,
        job_type="new_pattern", required_by=datetime.date(2026, 9, 15),
    )
    assert job.status == DesignJobRequest.Status.PENDING


def test_delete_sheet_cascades_fit_specs_images_and_jobs(ds_tenant, ds_sheet):
    spec = FitSpecification.objects.create(
        tenant=ds_tenant, design_sheet=ds_sheet,
        fit_number="1st Fit", fit_date=datetime.date(2026, 9, 1),
        description="First fitting",
    )
    FitImage.objects.create(tenant=ds_tenant, fit_spec=spec, image="fits/x.jpg")
    DesignJobRequest.objects.create(
        tenant=ds_tenant, design_sheet=ds_sheet,
        job_type="tech_sample", required_by=datetime.date(2026, 9, 20),
    )
    sheet_pk = ds_sheet.pk
    ds_sheet.delete()
    assert not FitSpecification.objects.filter(design_sheet_id=sheet_pk).exists()
    assert not FitImage.objects.filter(fit_spec=spec).exists()
    assert not DesignJobRequest.objects.filter(design_sheet_id=sheet_pk).exists()


# -------------------------------------------------------------- isolation


def test_status_workflow_independent_across_tenants(ds_sheet, ds_tenant_2):
    other = make_sheet(ds_tenant_2, status="closed")
    ds_sheet.transition_to("archived")
    other.refresh_from_db()
    assert other.status == "closed"
    assert ds_sheet.status == "archived"


def test_same_techpack_number_linked_to_independent_sheets(ds_tenant, ds_tenant_2):
    sheet_a = make_sheet(ds_tenant)
    sheet_b = make_sheet(ds_tenant_2)
    sheet_a.transition_to("rejected")
    sheet_b.refresh_from_db()
    assert sheet_a.status == "rejected"
    assert sheet_b.status == "new"
    assert sheet_a.tech_pack.techpack_number == sheet_b.tech_pack.techpack_number


# ------------------------------------------------------------ fit spec str/order


def test_fit_spec_str_format(ds_tenant, ds_sheet):
    spec = FitSpecification.objects.create(
        tenant=ds_tenant, design_sheet=ds_sheet,
        fit_number="DEV SPEC", fit_date=datetime.date(2026, 9, 1),
        description="Development sample of the body",
    )
    assert str(spec) == "DEV SPEC - Development sample of the body"


def test_fit_spec_ordering_by_fit_number(ds_tenant, ds_sheet):
    for number in ["DEV SPEC", "1st Fit", "2nd Fit"]:
        FitSpecification.objects.create(
            tenant=ds_tenant, design_sheet=ds_sheet,
            fit_number=number, fit_date=datetime.date(2026, 9, 1),
            description=number,
        )
    ordered = list(
        FitSpecification.objects.filter(design_sheet=ds_sheet)
        .values_list("fit_number", flat=True)
    )
    assert ordered == sorted(ordered) == ["1st Fit", "2nd Fit", "DEV SPEC"]


def test_fit_spec_same_number_allowed_across_sheets(ds_tenant, ds_techpack):
    sheet_a = make_sheet(ds_tenant, tech_pack=ds_techpack)
    sheet_b = make_sheet(ds_tenant)
    for sheet in (sheet_a, sheet_b):
        FitSpecification.objects.create(
            tenant=ds_tenant, design_sheet=sheet,
            fit_number="1st Fit", fit_date=datetime.date(2026, 9, 1),
            description="First fitting",
        )
    assert FitSpecification.objects.filter(fit_number="1st Fit").count() == 2


def test_fit_spec_selection_independent_across_sheets(ds_tenant, ds_techpack):
    sheet_a = make_sheet(ds_tenant, tech_pack=ds_techpack)
    sheet_b = make_sheet(ds_tenant)
    spec_a = FitSpecification.objects.create(
        tenant=ds_tenant, design_sheet=sheet_a,
        fit_number="DEV SPEC", fit_date=datetime.date(2026, 9, 1),
        description="Development sample", is_selected=True,
    )
    FitSpecification.objects.create(
        tenant=ds_tenant, design_sheet=sheet_b,
        fit_number="DEV SPEC", fit_date=datetime.date(2026, 9, 1),
        description="Development sample",
    )
    spec_a.refresh_from_db()
    assert spec_a.is_selected is True
    assert FitSpecification.objects.filter(
        tenant=ds_tenant, design_sheet_id=spec_a.design_sheet_id, is_selected=True
    ).count() == 1


def test_fit_spec_second_selected_in_same_sheet_rejected(ds_tenant, ds_sheet):
    FitSpecification.objects.create(
        tenant=ds_tenant, design_sheet=ds_sheet,
        fit_number="DEV SPEC", fit_date=datetime.date(2026, 9, 1),
        description="Development sample", is_selected=True,
    )
    with pytest.raises(IntegrityError):
        FitSpecification.objects.create(
            tenant=ds_tenant, design_sheet=ds_sheet,
            fit_number="1st Fit", fit_date=datetime.date(2026, 9, 8),
            description="Second fitting", is_selected=True,
        )


# ------------------------------------------------------------ fit image rules


def test_fit_image_str_includes_fit_number(ds_tenant, ds_sheet):
    spec = FitSpecification.objects.create(
        tenant=ds_tenant, design_sheet=ds_sheet,
        fit_number="2nd Fit", fit_date=datetime.date(2026, 9, 1),
        description="Second fitting",
    )
    image = FitImage.objects.create(
        tenant=ds_tenant, fit_spec=spec, image="fits/back.jpg", caption="Back view",
    )
    assert str(image) == "FitImage - 2nd Fit"


def test_fit_image_ordered_by_order_field(ds_tenant, ds_sheet):
    spec = FitSpecification.objects.create(
        tenant=ds_tenant, design_sheet=ds_sheet,
        fit_number="DEV SPEC", fit_date=datetime.date(2026, 9, 1),
        description="Development sample",
    )
    c = FitImage.objects.create(tenant=ds_tenant, fit_spec=spec, image="fits/c.jpg", order=3)
    a = FitImage.objects.create(tenant=ds_tenant, fit_spec=spec, image="fits/a.jpg", order=1)
    b = FitImage.objects.create(tenant=ds_tenant, fit_spec=spec, image="fits/b.jpg", order=2)
    ordered = list(FitImage.objects.filter(fit_spec=spec).values_list("pk", flat=True))
    assert ordered == [a.pk, b.pk, c.pk]


# ---------------------------------------------------------- job request rules


def test_job_request_str_has_job_type_and_techpack(ds_tenant, ds_sheet):
    job = DesignJobRequest.objects.create(
        tenant=ds_tenant, design_sheet=ds_sheet,
        job_type="new_pattern", required_by=datetime.date(2026, 9, 15),
    )
    text = str(job)
    assert "New Pattern" in text
    assert ds_sheet.tech_pack.techpack_number in text


def test_job_request_type_and_status_choices_defined():
    assert set(DesignJobRequest.JobType.values) == {
        "new_pattern", "tech_sample", "fit_sample", "mini_marker", "3d",
    }
    assert set(DesignJobRequest.Status.values) == {"pending", "in_progress", "completed"}


def test_job_request_ordered_by_required_by_desc(ds_tenant, ds_sheet):
    late = DesignJobRequest.objects.create(
        tenant=ds_tenant, design_sheet=ds_sheet,
        job_type="fit_sample", required_by=datetime.date(2026, 9, 30),
    )
    early = DesignJobRequest.objects.create(
        tenant=ds_tenant, design_sheet=ds_sheet,
        job_type="mini_marker", required_by=datetime.date(2026, 9, 10),
    )
    ordered = list(
        DesignJobRequest.objects.filter(design_sheet=ds_sheet).values_list("pk", flat=True)
    )
    assert ordered == [late.pk, early.pk]


def test_job_request_allocated_to_set_null_on_user_delete(ds_tenant, ds_sheet, db):
    from django.contrib.auth import get_user_model

    user = get_user_model().objects.create_user(
        username="dsalloc", email="dsalloc@test.com", password="x",
    )
    job = DesignJobRequest.objects.create(
        tenant=ds_tenant, design_sheet=ds_sheet,
        job_type="tech_sample", required_by=datetime.date(2026, 9, 20),
        allocated_to=user,
    )
    user.delete()
    job.refresh_from_db()
    assert job.allocated_to_id is None
    assert DesignJobRequest.objects.filter(pk=job.pk).exists()