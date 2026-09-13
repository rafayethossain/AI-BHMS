"""
``seed_design_sheet_demo`` management command (design-sheet demo data).

The design-sheet detail page renders two user-facing blocks:

1. **Design Information** (header block) — fields persisted on the linked
   ``StyleTechPack`` (block / based-on / relationship / buyer / designer /
   pattern-cutter / issuer / cloth-code / size / length / issue-date /
   risk-date / pattern-request-date / note).
2. **Material Breakdown** (material block) — ``BOMItem`` rows surfaced by
   ``DesignSheetSerializer.material_items`` in grid field names.

This suite proves the seed command creates 4-5 demo design sheets, each with
populated design information and a 4-5-row material breakdown, and that it is
safe to re-run (idempotent).
"""
from __future__ import annotations

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from rest_framework.test import APIClient

from apps.merchandising.models import BOMItem, DesignJobRequest, DesignSheet, StyleVersion
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()

GRID_ROW_KEYS = {
    "id", "bom_id", "type", "description_code", "location",
    "supplier", "colour", "width_size", "qty", "match",
}


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def tenant(db):
    return Tenant.objects.create(
        name="Seed Demo Co", slug="seed-demo",
        schema_name="tenant_seeddemo", status="active",
    )


@pytest.fixture
def user(tenant):
    role = Role.objects.create(tenant=tenant, name="SeedViewer", is_system=True)
    perm, _ = Permission.objects.get_or_create(
        module="merchandising", action="view",
        defaults={"description": "merchandising:view"},
    )
    RolePermission.objects.create(role=role, permission=perm)
    user = User.objects.create_user(
        username="seedviewer", email="seedviewer@test.com",
        password="testpass123!@#", tenant=tenant, status="active",
    )
    UserRole.objects.create(user=user, role=role)
    return user


@pytest.fixture
def client(api_client, user):
    from rest_framework import status

    login = api_client.post("/api/v1/auth/login/", {
        "email": "seedviewer@test.com", "password": "testpass123!@#",
    })
    assert login.status_code == status.HTTP_200_OK, login.data
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
    return api_client


def _run(tenant):
    call_command("seed_design_sheet_demo", tenant=tenant.slug, verbosity=0)


def _fit_and_job_state(tenant):
    state = {}
    for sheet in (
        DesignSheet.objects.filter(tenant=tenant)
        .order_by("tech_pack__techpack_number")
    ):
        state[sheet.id] = {
            "fits": tuple(
                sheet.fit_specs.order_by("fit_number").values_list(
                    "fit_number", "fit_date", "description", "is_selected"
                )
            ),
            "jobs": tuple(
                sheet.job_requests.order_by("job_type", "required_by").values_list(
                    "job_type", "required_by", "allocated_to_id", "status"
                )
            ),
        }
    return state


@pytest.mark.django_db
class TestSeedDesignSheetDemo:
    def test_creates_four_to_five_design_sheets(self, tenant, client):
        _run(tenant)
        sheets = list(DesignSheet.objects.filter(tenant=tenant))
        assert 4 <= len(sheets) <= 5

    def test_design_sheets_expose_populated_design_information(self, tenant, client):
        _run(tenant)
        sheets = DesignSheet.objects.filter(tenant=tenant)
        for sheet in sheets:
            detail = client.get(f"/api/v1/merchandising/design-sheets/{sheet.id}/")
            assert detail.status_code == 200, detail.data
            row = detail.data
            for field in ("block", "buyer_name", "designer", "cloth_code", "issue_date"):
                assert row.get(field), (
                    f"{sheet.tech_pack.techpack_number} missing design info {field}: {row.get(field)!r}"
                )

    def test_each_design_sheet_has_four_to_five_material_rows_in_grid_shape(self, tenant, client):
        _run(tenant)
        sheets = DesignSheet.objects.filter(tenant=tenant)
        assert sheets.count() > 0
        for sheet in sheets:
            detail = client.get(f"/api/v1/merchandising/design-sheets/{sheet.id}/")
            rows = detail.data["material_items"]
            assert 4 <= len(rows) <= 5, f"{sheet.tech_pack.techpack_number}: {len(rows)} rows"
            for row in rows:
                assert GRID_ROW_KEYS <= set(row.keys()), f"bad row keys: {row}"
                assert row["type"] and row["description_code"], f"blank material: {row}"
                assert row["supplier"], f"blank supplier: {row}"
                assert row["qty"] is None or row["qty"] > 0

    def test_idempotent_re_run(self, tenant, client):
        _run(tenant)
        first_sheets = list(DesignSheet.objects.filter(tenant=tenant).order_by("tech_pack__techpack_number"))
        first_codes = {
            s.id: sorted(
                BOMItem.objects.filter(tenant=tenant, bom__style_version__style=s.tech_pack.style)
                .values_list("item_name", flat=True)
            )
            for s in first_sheets
        }
        _run(tenant)
        second_sheets = list(DesignSheet.objects.filter(tenant=tenant).order_by("tech_pack__techpack_number"))
        assert [s.id for s in first_sheets] == [s.id for s in second_sheets]
        assert StyleVersion.objects.filter(tenant=tenant).count() == len(second_sheets)
        for sheet in second_sheets:
            assert sorted(
                BOMItem.objects.filter(tenant=tenant, bom__style_version__style=sheet.tech_pack.style)
                .values_list("item_name", flat=True)
            ) == first_codes[sheet.id]


@pytest.mark.django_db
class TestSeedDesignSheetFitSpecsAndJobs:
    """Fit Specs + Job Requests seeded into the demo design sheets (slice #70)."""

    def test_each_design_sheet_has_fit_specs_with_exactly_one_selected(self, tenant, client):
        _run(tenant)
        sheets = DesignSheet.objects.filter(tenant=tenant)
        assert sheets.count() > 0
        for sheet in sheets:
            detail = client.get(f"/api/v1/merchandising/design-sheets/{sheet.id}/")
            assert detail.status_code == 200, detail.data
            fit_specs = detail.data["fit_specs"]
            assert len(fit_specs) >= 2, (
                f"{sheet.tech_pack.techpack_number}: {len(fit_specs)} fit specs"
            )
            for fs in fit_specs:
                assert fs["fit_number"] and fs["fit_date"] and fs["description"], (
                    f"blank fit spec field: {fs}"
                )
            selected = [fs for fs in fit_specs if fs["is_selected"]]
            assert len(selected) == 1, (
                f"{sheet.tech_pack.techpack_number}: {len(selected)} selected fit specs"
            )

    def test_fit_spec_stages_are_unique_reference_labels(self, tenant, client):
        _run(tenant)
        for sheet in DesignSheet.objects.filter(tenant=tenant):
            numbers = list(sheet.fit_specs.values_list("fit_number", flat=True))
            assert len(numbers) == len(set(numbers)), (
                f"{sheet.tech_pack.techpack_number}: duplicate fit labels {numbers}"
            )
            assert "DEV SPEC" in numbers, (
                f"{sheet.tech_pack.techpack_number}: dev spec missing from {numbers}"
            )
            assert "1ST FIT" in numbers, (
                f"{sheet.tech_pack.techpack_number}: 1st fit missing from {numbers}"
            )

    def test_each_design_sheet_has_job_requests_with_expected_fields(self, tenant, client):
        _run(tenant)
        job_types = set(DesignJobRequest.JobType.values)
        statuses = set(DesignJobRequest.Status.values)
        for sheet in DesignSheet.objects.filter(tenant=tenant):
            jobs = list(sheet.job_requests.order_by("required_by"))
            assert len(jobs) >= 1, f"{sheet.tech_pack.techpack_number}: no job requests"
            for job in jobs:
                assert job.job_type in job_types, f"bad job type: {job.job_type}"
                assert job.status in statuses, f"bad status: {job.status}"
                assert job.required_by is not None, f"missing required_by: {job}"

    def test_job_requests_serialize_allocation_and_notes(self, tenant, client):
        _run(tenant)
        sheet = DesignSheet.objects.filter(tenant=tenant).first()
        detail = client.get(f"/api/v1/merchandising/design-sheets/{sheet.id}/")
        jobs = detail.data["job_requests"]
        assert jobs, "at least one job request serialized"
        for job in jobs:
            assert {
                "job_type", "required_by", "work_location", "no_of_garments",
                "allocated_to", "allocated_to_name", "status",
            } <= set(job.keys()), f"bad job keys: {job}"

    def test_re_run_is_idempotent_for_fit_specs_and_job_requests(self, tenant, client):
        _run(tenant)
        first = _fit_and_job_state(tenant)
        _run(tenant)
        second = _fit_and_job_state(tenant)
        assert first == second
        for sheet in DesignSheet.objects.filter(tenant=tenant):
            assert sheet.fit_specs.filter(is_selected=True).count() == 1
            assert sheet.job_requests.count() >= 1