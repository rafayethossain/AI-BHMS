"""
Design Sheet end-to-end API flows (Day 29).

Journey-level tests that chain multiple endpoints together the way the
frontend drives them, asserting that each step's output feeds the next:

* Flow 1 — Product intro: sketch upload -> notes -> create sheet ->
  annotations -> workflow transition -> full detail.
* Flow 2 — Fit spec lifecycle: create specs -> upload/reorder images ->
  select current (single-selection enforced) -> sheet detail reflects it.
* Flow 3 — Fit spec copy: selected spec + images copied onto a child
  techpack through its ``based_on`` reference; follow-up copy without images.
* Flow 4 — Job request lifecycle: create -> allocate -> status transitions.
* Flow 5 — Tenant isolation: a cross-tenant copy is refused.
"""
from __future__ import annotations

from io import BytesIO

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework import status
from rest_framework.test import APIClient

from apps.merchandising.models import (
    DesignJobRequest, DesignSheet, FitImage, FitSpecification, Style,
    StyleTechPack,
)
from apps.setup.models import Buyer, Country
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


def _make_png(width=640, height=480, color=(200, 120, 40)):
    buf = BytesIO()
    Image.new("RGB", (width, height), color).save(buf, format="PNG")
    return buf.getvalue()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def tenant(db):
    return Tenant.objects.create(
        name="E2E Co", slug="e2e-ds",
        schema_name="tenant_e2eds", status="active",
    )


@pytest.fixture
def tenant_2(db):
    return Tenant.objects.create(
        name="E2E Co 2", slug="e2e-ds-2",
        schema_name="tenant_e2eds2", status="active",
    )


def _role_with(t, name, permissions):
    role = Role.objects.create(tenant=t, name=name, is_system=True)
    for module, action in permissions:
        perm, _ = Permission.objects.get_or_create(
            module=module, action=action,
            defaults={"description": f"{module}:{action}"},
        )
        RolePermission.objects.create(role=role, permission=perm)
    return role


def _user(t, role, username, email):
    user = User.objects.create_user(
        username=username, email=email, password="testpass123!@#",
        tenant=t, status="active",
    )
    UserRole.objects.create(user=user, role=role)
    return user


@pytest.fixture
def user(tenant):
    role = _role_with(tenant, "E2EFull", [
        ("merchandising", "view"), ("merchandising", "create"),
        ("merchandising", "edit"), ("merchandising", "delete"),
    ])
    return _user(tenant, role, "e2eapi", "e2eapi@test.com")


@pytest.fixture
def client(api_client, user):
    login = api_client.post("/api/v1/auth/login/", {
        "email": "e2eapi@test.com", "password": "testpass123!@#",
    })
    assert login.status_code == status.HTTP_200_OK
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
    return api_client


@pytest.fixture
def style(tenant):
    Country.objects.create(tenant=tenant, name="E2E Land", code="EE1")
    buyer = Buyer.objects.create(tenant=tenant, name="E2E Buyer", code="EEB1")
    return Style.objects.create(
        tenant=tenant, style_number="E2E-STYLE-001", name="E2E Style",
        buyer=buyer,
    )


@pytest.fixture
def techpack(tenant, style):
    return StyleTechPack.objects.create(
        tenant=tenant,
        techpack_number=StyleTechPack.next_techpack_number(tenant),
        style=style,
    )


def _sheet_for(tenant, techpack):
    return DesignSheet.objects.create(tenant=tenant, tech_pack=techpack)


@pytest.mark.django_db
class TestProductIntroFlow:
    def test_sketch_notes_sheet_annotations_transition_and_detail(self, client, techpack):
        sheet_url = "/api/v1/merchandising/design-sheets/"

        # 1. Sketch upload -> resized image + thumbnail URLs
        img = SimpleUploadedFile("sketch.png", _make_png(1200, 900), content_type="image/png")
        sketch = client.put(
            f"/api/v1/merchandising/styles/techpack/{techpack.id}/sketch/",
            {"sketch_image": img}, format="multipart",
        )
        assert sketch.status_code == status.HTTP_200_OK
        assert sketch.data["sketch_image_url"]
        assert sketch.data["sketch_thumbnail_url"]

        # 2. Notes -> initials + auto timestamp
        notes = client.put(
            f"/api/v1/merchandising/styles/techpack/{techpack.id}/notes/",
            {"note": "Inleg to be 74cm after buyer fit comment.", "notes_initials": "RM"},
        )
        assert notes.status_code == status.HTTP_200_OK
        assert notes.data["notes_initials"] == "RM"
        assert notes.data["notes_date"] is not None

        # 3. Create the design sheet -> file number mirrors techpack
        created = client.post(sheet_url, {"tech_pack": techpack.id})
        assert created.status_code == status.HTTP_201_CREATED
        sheet_id = created.data["id"]
        assert created.data["file_number"] == techpack.techpack_number
        assert created.data["status"] == "new"

        # 4. Annotations persist
        annotations = [
            {"id": "a1", "x": 10, "y": 20, "text": "WAIST SEAM"},
            {"id": "a2", "x": 80, "y": 55, "text": "FRONT FLY"},
        ]
        saved = client.patch(
            f"{sheet_url}{sheet_id}/annotations/",
            {"annotations": annotations}, format="json",
        )
        assert saved.status_code == status.HTTP_200_OK

        # 5. Mandatory issuer/designer must be present before finalizing
        techpack.issuer = "RM"
        techpack.designer = "EM"
        techpack.save(update_fields=["issuer", "designer"])

        # 6. Workflow transition
        closed = client.post(f"{sheet_url}{sheet_id}/transition/", {"status": "closed"})
        assert closed.status_code == status.HTTP_200_OK
        assert closed.data["status"] == "closed"

        # 7. Detail reflects the whole journey
        detail = client.get(f"{sheet_url}{sheet_id}/")
        assert detail.status_code == status.HTTP_200_OK
        assert detail.data["status"] == "closed"
        assert detail.data["file_number"] == techpack.techpack_number
        assert detail.data["note"] == "Inleg to be 74cm after buyer fit comment."
        assert detail.data["sketch_annotations"] == annotations
        assert detail.data["sketch_url"]


@pytest.mark.django_db
class TestFitSpecLifecycleFlow:
    def test_create_upload_images_and_select_single(self, client, techpack):
        sheet = _sheet_for(techpack.tenant, techpack)
        sheet_url = "/api/v1/merchandising/design-sheets/"
        fs_url = "/api/v1/merchandising/fit-specifications/"
        fi_url = "/api/v1/merchandising/fit-images/"

        a = client.post(fs_url, {
            "design_sheet": sheet.id, "fit_number": "DEV SPEC",
            "fit_date": "2026-08-10", "description": "Development sample",
        })
        b = client.post(fs_url, {
            "design_sheet": sheet.id, "fit_number": "1ST FIT",
            "fit_date": "2026-08-24", "description": "First prototype",
            "notes": "sleeve too long",
        })
        assert a.status_code == status.HTTP_201_CREATED
        assert b.status_code == status.HTTP_201_CREATED

        # Upload two images to spec A, then reorder the second first caption
        front = client.post(fi_url, {
            "fit_spec": a.data["id"], "caption": "front", "order": 0,
            "image": SimpleUploadedFile("front.png", _make_png(), content_type="image/png"),
        }, format="multipart")
        back = client.post(fi_url, {
            "fit_spec": a.data["id"], "caption": "back", "order": 1,
            "image": SimpleUploadedFile("back.png", _make_png(color=(40, 120, 200)), content_type="image/png"),
        }, format="multipart")
        assert front.status_code == status.HTTP_201_CREATED
        assert back.status_code == status.HTTP_201_CREATED

        # Select B -> A is unselected (single current enforced via endpoint)
        sel = client.post(f"{fs_url}{b.data['id']}/select/")
        assert sel.status_code == status.HTTP_200_OK
        spec_a = FitSpecification.objects.get(id=a.data["id"])
        spec_b = FitSpecification.objects.get(id=b.data["id"])
        assert spec_a.is_selected is False
        assert spec_b.is_selected is True

        # Detail carries both specs, images, and the selected flag
        detail = client.get(f"{sheet_url}{sheet.id}/")
        specs = {s["fit_number"]: s for s in detail.data["fit_specs"]}
        assert set(specs) == {"DEV SPEC", "1ST FIT"}
        assert specs["1ST FIT"]["is_selected"] is True
        assert specs["DEV SPEC"]["is_selected"] is False
        assert [(i["caption"], i["order"]) for i in specs["DEV SPEC"]["images"]] == [
            ("front", 0), ("back", 1),
        ]
        assert all(i["image"] for i in specs["DEV SPEC"]["images"])


@pytest.mark.django_db
class TestCopyFitSpecFlow:
    def test_copy_from_base_with_images_then_without(self, client, tenant, style, techpack):
        sheet_url = "/api/v1/merchandising/design-sheets/"
        source = _sheet_for(tenant, techpack)

        spec = FitSpecification.objects.create(
            tenant=tenant, design_sheet=source, fit_number="DEV SPEC",
            fit_date="2026-08-10", description="Base dev fit",
            notes="keep waist seam", is_selected=True,
        )
        FitImage.objects.create(
            tenant=tenant, fit_spec=spec, caption="front", order=0,
            image=SimpleUploadedFile("f.png", _make_png(), content_type="image/png"),
        )
        FitImage.objects.create(
            tenant=tenant, fit_spec=spec, caption="back", order=1,
            image=SimpleUploadedFile("b.png", _make_png(color=(10, 10, 200)), content_type="image/png"),
        )

        # Child techpack based on the source file number
        child_tp = StyleTechPack.objects.create(
            tenant=tenant, style=style,
            techpack_number=StyleTechPack.next_techpack_number(tenant),
            based_on=techpack.techpack_number,
        )
        child = _sheet_for(tenant, child_tp)

        # Copy via base reference (no explicit source)
        copied = client.post(
            f"{sheet_url}{child.id}/copy-fit-spec/", {}, format="json",
        )
        assert copied.status_code == status.HTTP_201_CREATED
        assert copied.data["fit_number"] == "DEV SPEC"
        assert copied.data["description"] == "Base dev fit"
        assert copied.data["is_selected"] is True

        # Child has exactly one selected spec and the images followed
        detail = client.get(f"{sheet_url}{child.id}/")
        assert len(detail.data["fit_specs"]) == 1
        assert detail.data["fit_specs"][0]["is_selected"] is True
        assert [(i["caption"], i["order"]) for i in detail.data["fit_specs"][0]["images"]] == [
            ("front", 0), ("back", 1),
        ]

        # A second copy lands as the next label and can skip images
        again = client.post(
            f"{sheet_url}{child.id}/copy-fit-spec/",
            {"include_images": False}, format="json",
        )
        assert again.status_code == status.HTTP_201_CREATED
        assert again.data["fit_number"] == "1ST FIT"
        detail = client.get(f"{sheet_url}{child.id}/")
        by_label = {s["fit_number"]: s for s in detail.data["fit_specs"]}
        assert by_label["DEV SPEC"]["is_selected"] is False
        assert by_label["1ST FIT"]["is_selected"] is True
        assert by_label["1ST FIT"]["images"] == []

    def test_copy_refused_across_tenants(self, client, tenant, tenant_2, style, techpack):
        source = _sheet_for(tenant, techpack)
        FitSpecification.objects.create(
            tenant=tenant, design_sheet=source, fit_number="DEV SPEC",
            fit_date="2026-08-10", description="Base dev fit", is_selected=True,
        )

        other_tp = StyleTechPack.objects.create(
            tenant=tenant_2, style=style,
            techpack_number=StyleTechPack.next_techpack_number(tenant_2),
        )
        other_sheet = _sheet_for(tenant_2, other_tp)

        resp = client.post(
            f"/api/v1/merchandising/design-sheets/{other_sheet.id}/copy-fit-spec/",
            {"source_design_sheet": str(source.id)}, format="json",
        )
        assert resp.status_code == status.HTTP_404_NOT_FOUND
        assert other_sheet.fit_specs.count() == 0


@pytest.mark.django_db
class TestJobRequestFlow:
    def test_create_allocate_and_transition(self, client, techpack):
        sheet = _sheet_for(techpack.tenant, techpack)
        sheet_url = "/api/v1/merchandising/design-sheets/"
        job_url = "/api/v1/merchandising/design-job-requests/"

        allocator = User.objects.create_user(
            username="cutter1", email="cutter1@test.com", password="pass123!@#",
            tenant=techpack.tenant, status="active",
            first_name="Cutter", last_name="One",
        )

        created = client.post(
            f"{sheet_url}{sheet.id}/create-job/",
            {"job_type": "new_pattern", "required_by": "2026-09-15",
             "no_of_garments": 2, "work_location": "Cutting"},
        )
        assert created.status_code == status.HTTP_201_CREATED
        job_id = created.data["id"]

        # Allocate to a user + move in-progress
        in_progress = client.patch(
            f"{job_url}{job_id}/",
            {"allocated_to": allocator.id, "status": "in_progress"}, format="json",
        )
        assert in_progress.status_code == status.HTTP_200_OK
        assert in_progress.data["allocated_to"] == allocator.id
        assert in_progress.data["allocated_to_name"] == "Cutter One"
        assert in_progress.data["status"] == "in_progress"

        # Complete
        done = client.patch(
            f"{job_url}{job_id}/", {"status": "completed"}, format="json",
        )
        assert done.status_code == status.HTTP_200_OK
        assert done.data["status"] == "completed"

        # Sheet detail carries the job with its final state
        detail = client.get(f"{sheet_url}{sheet.id}/")
        job = detail.data["job_requests"][0]
        assert job["id"] == job_id
        assert job["status"] == "completed"
        assert job["allocated_to_name"] == "Cutter One"
        assert job["design_sheet_number"] == techpack.techpack_number
        assert DesignJobRequest.objects.filter(pk=job_id).exists()


@pytest.mark.django_db
class TestSelectEnforcedAtDatabase:
    def test_api_select_keeps_single_current(self, client, techpack):
        sheet = _sheet_for(techpack.tenant, techpack)
        fs_url = "/api/v1/merchandising/fit-specifications/"
        ids = []
        for label in ["DEV SPEC", "1ST FIT", "2ND FIT"]:
            resp = client.post(fs_url, {
                "design_sheet": sheet.id, "fit_number": label,
                "fit_date": "2026-08-10", "description": label,
            })
            assert resp.status_code == status.HTTP_201_CREATED
            ids.append(resp.data["id"])

        for spec_id in ids:
            resp = client.post(f"{fs_url}{spec_id}/select/")
            assert resp.status_code == status.HTTP_200_OK

        rows = FitSpecification.objects.filter(
            tenant=techpack.tenant, design_sheet=sheet, is_selected=True
        )
        assert rows.count() == 1
        assert str(rows.first().id) == ids[-1]