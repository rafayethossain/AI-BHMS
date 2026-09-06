"""
Design Sheet + Fit Spec + Job Request API tests (Week 2).

Covers:

* ``POST /api/v1/merchandising/design-sheets/`` — create a design sheet
  linked to a techpack.
* ``POST /api/v1/merchandising/design-sheets/{id}/transition/`` — move
  through the workflow states (new → rejected/closed/archived).
* ``POST /api/v1/merchandising/design-sheets/{id}/create-job/`` — create a
  design-sheet job request.
* ``POST /api/v1/merchandising/styles/techpack/{id}/sketch/`` — upload a
  sketch image.
* ``PUT /api/v1/merchandising/styles/techpack/{id}/notes/`` — update notes
  with initials + auto timestamp.
"""
from __future__ import annotations

from io import BytesIO

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework import status
from rest_framework.test import APIClient

from apps.merchandising.models import DesignJobRequest, DesignSheet, Style, StyleTechPack
from apps.setup.models import Buyer, Country
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


def _make_png(width, height, color=(200, 120, 40)):
    buf = BytesIO()
    Image.new("RGB", (width, height), color).save(buf, format="PNG")
    return buf.getvalue()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def ds_tenant(db):
    return Tenant.objects.create(
        name="Design Sheet Co", slug="ds-test",
        schema_name="tenant_ds", status="active",
    )


def _role_with(tenant, name, permissions):
    role = Role.objects.create(tenant=tenant, name=name, is_system=True)
    for module, action in permissions:
        perm, _ = Permission.objects.get_or_create(
            module=module, action=action,
            defaults={"description": f"{module}:{action}"},
        )
        RolePermission.objects.create(role=role, permission=perm)
    return role


def _user(tenant, role, username, email):
    user = User.objects.create_user(
        username=username, email=email, password="testpass123!@#",
        tenant=tenant, status="active",
    )
    UserRole.objects.create(user=user, role=role)
    return user


@pytest.fixture
def ds_user(db, ds_tenant):
    role = _role_with(ds_tenant, "DSFull", [
        ("merchandising", "view"), ("merchandising", "create"),
        ("merchandising", "edit"),
    ])
    return _user(ds_tenant, role, "dsapi", "dsapi@test.com")


@pytest.fixture
def ds_client(api_client, ds_user):
    login = api_client.post("/api/v1/auth/login/", {
        "email": "dsapi@test.com", "password": "testpass123!@#",
    })
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
    return api_client


@pytest.fixture
def ds_buyer(ds_tenant):
    Country.objects.create(tenant=ds_tenant, name="DS Land", code="DS1")
    return Buyer.objects.create(tenant=ds_tenant, name="DS Buyer", code="DSB1")


@pytest.fixture
def ds_style(ds_tenant, ds_buyer):
    return Style.objects.create(
        tenant=ds_tenant, style_number="DS-STYLE-001", name="DS Style",
        buyer=ds_buyer,
    )


@pytest.fixture
def ds_techpack(ds_tenant, ds_style):
    return StyleTechPack.objects.create(
        tenant=ds_tenant,
        techpack_number=StyleTechPack.next_techpack_number(ds_tenant),
        style=ds_style,
    )


@pytest.fixture
def ds_design_sheet(ds_tenant, ds_techpack):
    return DesignSheet.objects.create(
        tenant=ds_tenant, tech_pack=ds_techpack,
    )


def _png_bytes():
    return _make_png(640, 480)


# ============================================================= DESIGN SHEETS


@pytest.mark.django_db
class TestDesignSheetAPI:
    def test_create_design_sheet(self, ds_client, ds_techpack):
        resp = ds_client.post("/api/v1/merchandising/design-sheets/", {
            "tech_pack": ds_techpack.id,
        })
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["status"] == "new"
        assert resp.data["file_number"] == ds_techpack.techpack_number

    def test_list_requires_auth(self, api_client):
        resp = api_client.get("/api/v1/merchandising/design-sheets/")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_returns_design_sheets(self, ds_client, ds_design_sheet):
        resp = ds_client.get("/api/v1/merchandising/design-sheets/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1
        row = resp.data["results"][0]
        assert row["id"] == str(ds_design_sheet.id)
        assert row["status"] == "new"

    DESIGN_INFO_FIELDS = [
        "issue_date", "block", "based_on", "customer", "style_number",
        "size", "designer", "pattern_cutter", "issuer", "cloth_code",
        "length", "sketch", "description", "note",
    ]

    def test_design_sheet_detail_returns_design_info_fields(
        self, ds_client, ds_techpack, ds_design_sheet
    ):
        import datetime

        ds_techpack.issue_date = datetime.date(2026, 8, 1)
        ds_techpack.block = "Main Block"
        ds_techpack.based_on = "Base 2026"
        ds_techpack.customer = "DS Buyer"
        ds_techpack.style_number = "DS-STYLE-001"
        ds_techpack.size = "S-2XL"
        ds_techpack.designer = "Alice"
        ds_techpack.pattern_cutter = "Bob"
        ds_techpack.issuer = "Carol"
        ds_techpack.cloth_code = "CL-42"
        ds_techpack.length = "40in"
        ds_techpack.sketch = "Flat sketch ref"
        ds_techpack.description = "Wide leg pant"
        ds_techpack.note = "Front pocket change"
        ds_techpack.save()

        resp = ds_client.get(
            f"/api/v1/merchandising/design-sheets/{ds_design_sheet.id}/"
        )
        assert resp.status_code == status.HTTP_200_OK
        for key in self.DESIGN_INFO_FIELDS:
            assert key in resp.data, f"missing {key}"
        assert resp.data["block"] == "Main Block"
        assert resp.data["based_on"] == "Base 2026"
        assert resp.data["customer"] == "DS Buyer"
        assert resp.data["style_number"] == "DS-STYLE-001"
        assert resp.data["size"] == "S-2XL"
        assert resp.data["designer"] == "Alice"
        assert resp.data["pattern_cutter"] == "Bob"
        assert resp.data["issuer"] == "Carol"
        assert resp.data["cloth_code"] == "CL-42"
        assert resp.data["length"] == "40in"
        assert resp.data["sketch"] == "Flat sketch ref"
        assert resp.data["description"] == "Wide leg pant"
        assert resp.data["note"] == "Front pocket change"
        assert resp.data["issue_date"] == "2026-08-01"

    def test_design_sheet_detail_returns_season_and_style_id(
        self, ds_client, ds_tenant, ds_style, ds_design_sheet
    ):
        from apps.setup.models import Season
        season = Season.objects.create(
            tenant=ds_tenant, code="FW26", name="Fall / Winter 2026",
            start_date="2026-07-01", end_date="2026-12-31",
        )
        ds_style.season = season
        ds_style.save(update_fields=["season"])
        resp = ds_client.get(
            f"/api/v1/merchandising/design-sheets/{ds_design_sheet.id}/"
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["season"] == "Fall / Winter 2026"
        assert resp.data["style_id"] == str(ds_style.id)

    def test_transition_rejects_invalid_status(self, ds_client, ds_design_sheet):
        # Issuer/designer set so we reach the status validation, not the guard
        ds_design_sheet.tech_pack.issuer = "Alice"
        ds_design_sheet.tech_pack.designer = "Bob"
        ds_design_sheet.tech_pack.save(update_fields=["issuer", "designer"])
        resp = ds_client.post(
            f"/api/v1/merchandising/design-sheets/{ds_design_sheet.id}/transition/",
            {"status": "bogus"},
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_transition_to_closed(self, ds_client, ds_design_sheet):
        ds_design_sheet.tech_pack.issuer = "Alice"
        ds_design_sheet.tech_pack.designer = "Bob"
        ds_design_sheet.tech_pack.save(update_fields=["issuer", "designer"])
        resp = ds_client.post(
            f"/api/v1/merchandising/design-sheets/{ds_design_sheet.id}/transition/",
            {"status": "closed"},
        )
        assert resp.status_code == status.HTTP_200_OK
        ds_design_sheet.refresh_from_db()
        assert ds_design_sheet.status == "closed"

    def test_transition_blocked_without_issuer(self, ds_client, ds_design_sheet):
        ds_design_sheet.tech_pack.designer = "Bob"
        ds_design_sheet.tech_pack.save(update_fields=["designer"])
        resp = ds_client.post(
            f"/api/v1/merchandising/design-sheets/{ds_design_sheet.id}/transition/",
            {"status": "closed"},
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        ds_design_sheet.refresh_from_db()
        assert ds_design_sheet.status == "new"

    def test_transition_blocked_without_designer(self, ds_client, ds_design_sheet):
        ds_design_sheet.tech_pack.issuer = "Alice"
        ds_design_sheet.tech_pack.save(update_fields=["issuer"])
        resp = ds_client.post(
            f"/api/v1/merchandising/design-sheets/{ds_design_sheet.id}/transition/",
            {"status": "archived"},
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_reopen_to_new_not_blocked_without_fields(self, ds_client, ds_design_sheet):
        # Reopening back to "new" must stay possible regardless of issuer/designer
        resp = ds_client.post(
            f"/api/v1/merchandising/design-sheets/{ds_design_sheet.id}/transition/",
            {"status": "new"},
        )
        assert resp.status_code == status.HTTP_200_OK

    def test_create_job(self, ds_client, ds_design_sheet):
        resp = ds_client.post(
            f"/api/v1/merchandising/design-sheets/{ds_design_sheet.id}/create-job/", {
                "job_type": "new_pattern",
                "required_by": "2026-09-15",
                "no_of_garments": 2,
            },
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["job_type"] == "new_pattern"
        assert DesignJobRequest.objects.count() == 1

    def test_create_job_invalid_type(self, ds_client, ds_design_sheet):
        resp = ds_client.post(
            f"/api/v1/merchandising/design-sheets/{ds_design_sheet.id}/create-job/", {
                "job_type": "nope",
                "required_by": "2026-09-15",
            },
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_sketch_annotations_save_and_list(self, ds_client, ds_design_sheet):
        url = f"/api/v1/merchandising/design-sheets/{ds_design_sheet.id}/annotations/"
        annotations = [
            {"id": "a1", "x": 12.5, "y": 34, "text": "WAIST SEAM"},
            {"id": "a2", "x": 88, "y": 60, "text": "SIDE VENT"},
        ]
        resp = ds_client.patch(url, {"annotations": annotations}, format="json")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["annotations"] == annotations

        detail = ds_client.get(
            f"/api/v1/merchandising/design-sheets/{ds_design_sheet.id}/"
        )
        assert detail.status_code == status.HTTP_200_OK
        assert detail.data["sketch_annotations"] == annotations

    def test_sketch_annotations_save_requires_list(self, ds_client, ds_design_sheet):
        url = f"/api/v1/merchandising/design-sheets/{ds_design_sheet.id}/annotations/"
        resp = ds_client.patch(url, {"annotations": "not-a-list"}, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_sketch_annotations_delete_all(self, ds_client, ds_design_sheet):
        url = f"/api/v1/merchandising/design-sheets/{ds_design_sheet.id}/annotations/"
        ds_client.patch(url, {"annotations": [
            {"id": "a1", "x": 1, "y": 2, "text": "T1"},
        ]}, format="json")
        resp = ds_client.patch(url, {"annotations": []}, format="json")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["annotations"] == []
        detail = ds_client.get(
            f"/api/v1/merchandising/design-sheets/{ds_design_sheet.id}/"
        )
        assert detail.data["sketch_annotations"] == []


# ===================================== DESIGN SHEET BLOCK LAYOUT ORDER


@pytest.mark.django_db
class TestDesignSheetLayoutOrder:
    """DesignSheet content-block layout order (tech-pack builder, Phase 1).

    The design sheet page is a content-block document (sketch / material /
    fit specs / images / job requests). ``layout_order`` persists the
    designer's arrangement so the block order is stable across reloads and
    is rendered in exactly the saved sequence (like a built-in template).
    """

    def test_layout_order_defaults_to_all_blocks(self, ds_client, ds_design_sheet):
        resp = ds_client.get(
            f"/api/v1/merchandising/design-sheets/{ds_design_sheet.id}/"
        )
        assert resp.status_code == status.HTTP_200_OK
        order = resp.data["layout_order"]
        assert order == [
            "header", "sketch", "material", "fit_specs",
            "images", "job_requests",
        ]
        assert len(order) == len(set(order))

    def test_layout_order_is_writable_and_round_trips(self, ds_client, ds_design_sheet):
        url = f"/api/v1/merchandising/design-sheets/{ds_design_sheet.id}/"
        new_order = [
            "images", "header", "sketch", "material",
            "fit_specs", "job_requests",
        ]
        resp = ds_client.patch(url, {"layout_order": new_order}, format="json")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["layout_order"] == new_order

        detail = ds_client.get(url)
        assert detail.data["layout_order"] == new_order

    def test_layout_order_with_unknown_block_names_is_rejected(
        self, ds_client, ds_design_sheet
    ):
        url = f"/api/v1/merchandising/design-sheets/{ds_design_sheet.id}/"
        resp = ds_client.patch(
            url,
            {"layout_order": ["sketch", "nope-not-a-block"]},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_layout_order_must_be_a_list(self, ds_client, ds_design_sheet):
        url = f"/api/v1/merchandising/design-sheets/{ds_design_sheet.id}/"
        resp = ds_client.patch(url, {"layout_order": "header,sketch"}, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST


# ============================================================= SKETCH/NOTES


@pytest.mark.django_db
class TestDesignSheetSketchAndNotes:
    def test_upload_sketch_valid(self, ds_client, ds_techpack):
        img = SimpleUploadedFile("sketch.png", _png_bytes(), content_type="image/png")
        resp = ds_client.put(
            f"/api/v1/merchandising/styles/techpack/{ds_techpack.id}/sketch/",
            {"sketch_image": img},
            format="multipart",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert "sketch_image_url" in resp.data

    def test_upload_sketch_invalid_type(self, ds_client, ds_techpack):
        f = SimpleUploadedFile("sketch.txt", b"hello", content_type="text/plain")
        resp = ds_client.put(
            f"/api/v1/merchandising/styles/techpack/{ds_techpack.id}/sketch/",
            {"sketch_image": f},
            format="multipart",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_upload_sketch_missing(self, ds_client, ds_techpack):
        resp = ds_client.put(
            f"/api/v1/merchandising/styles/techpack/{ds_techpack.id}/sketch/",
            {},
            format="multipart",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_update_notes_sets_initials_and_date(self, ds_client, ds_techpack):
        resp = ds_client.put(
            f"/api/v1/merchandising/styles/techpack/{ds_techpack.id}/notes/",
            {"note": "Front pocket depth changed per buyer comment",
             "notes_initials": "RM"},
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["notes_initials"] == "RM"
        assert resp.data["notes_date"] is not None
        ds_techpack.refresh_from_db()
        assert ds_techpack.note == "Front pocket depth changed per buyer comment"

    def test_notes_requires_auth(self, api_client, ds_techpack):
        resp = api_client.put(
            f"/api/v1/merchandising/styles/techpack/{ds_techpack.id}/notes/",
            {"note": "x"},
        )
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_upload_sketch_resizes_large_image(self, ds_client, ds_techpack):
        img = SimpleUploadedFile("big.png", _make_png(3200, 2400), content_type="image/png")
        resp = ds_client.put(
            f"/api/v1/merchandising/styles/techpack/{ds_techpack.id}/sketch/",
            {"sketch_image": img},
            format="multipart",
        )
        assert resp.status_code == status.HTTP_200_OK
        ds_techpack.refresh_from_db()
        assert ds_techpack.sketch_image is not None
        stored = Image.open(ds_techpack.sketch_image.path)
        assert stored.width <= 1920
        assert stored.height <= 1920
        assert stored.width < 3200

    def test_upload_sketch_keeps_small_image(self, ds_client, ds_techpack):
        img = SimpleUploadedFile("small.png", _make_png(640, 480), content_type="image/png")
        resp = ds_client.put(
            f"/api/v1/merchandising/styles/techpack/{ds_techpack.id}/sketch/",
            {"sketch_image": img},
            format="multipart",
        )
        assert resp.status_code == status.HTTP_200_OK
        ds_techpack.refresh_from_db()
        stored = Image.open(ds_techpack.sketch_image.path)
        assert stored.width == 640
        assert stored.height == 480

    def test_upload_sketch_generates_thumbnail(self, ds_client, ds_techpack):
        img = SimpleUploadedFile("big.png", _make_png(3200, 2400), content_type="image/png")
        resp = ds_client.put(
            f"/api/v1/merchandising/styles/techpack/{ds_techpack.id}/sketch/",
            {"sketch_image": img},
            format="multipart",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["sketch_thumbnail_url"] is not None
        ds_techpack.refresh_from_db()
        assert ds_techpack.sketch_thumbnail is not None
        thumb = Image.open(ds_techpack.sketch_thumbnail.path)
        assert thumb.width <= 150
        assert thumb.height <= 150


# ============================================================= FIT SPECS


@pytest.mark.django_db
class TestFitSpecificationAPI:
    def test_create_fit_spec(self, ds_client, ds_design_sheet):
        resp = ds_client.post("/api/v1/merchandising/fit-specifications/", {
            "design_sheet": ds_design_sheet.id,
            "fit_number": "1st Fit",
            "fit_date": "2026-09-01",
            "description": "First prototype fitting",
        })
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["fit_number"] == "1st Fit"

    def test_select_marks_only_one_selected(self, ds_client, ds_design_sheet):
        from apps.merchandising.models import FitSpecification
        a = FitSpecification.objects.create(
            tenant=ds_design_sheet.tenant, design_sheet=ds_design_sheet,
            fit_number="1st Fit", fit_date="2026-09-01", description="A",
        )
        b = FitSpecification.objects.create(
            tenant=ds_design_sheet.tenant, design_sheet=ds_design_sheet,
            fit_number="2nd Fit", fit_date="2026-09-08", description="B",
        )
        resp = ds_client.post(f"/api/v1/merchandising/fit-specifications/{a.id}/select/")
        assert resp.status_code == status.HTTP_200_OK
        resp = ds_client.post(f"/api/v1/merchandising/fit-specifications/{b.id}/select/")
        assert resp.status_code == status.HTTP_200_OK
        a.refresh_from_db()
        b.refresh_from_db()
        assert a.is_selected is False
        assert b.is_selected is True