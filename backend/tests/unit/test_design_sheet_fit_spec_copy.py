"""
Design Sheet fit-spec copy API (Day 23).

The FitSpec component offers "Copy from Base" (a design sheet's own
``based_on`` reference) and "Copy from Another Style" (an explicit source
sheet). Both route through
``POST /api/v1/merchandising/design-sheets/{target}/copy-fit-spec/``.
"""
from __future__ import annotations

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.merchandising.models import (
    DesignSheet, FitImage, FitSpecification, Style, StyleTechPack,
    StyleVersion,
)
from apps.setup.models import Buyer, Country
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def tenant(db):
    return Tenant.objects.create(
        name="Fit Copy Co", slug="fit-copy",
        schema_name="tenant_fitcopy", status="active",
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
    role = _role_with(tenant, "CopyFull", [
        ("merchandising", "view"), ("merchandising", "create"),
        ("merchandising", "edit"),
    ])
    return _user(tenant, role, "copyapi", "copyapi@test.com")


@pytest.fixture
def client(api_client, user):
    login = api_client.post("/api/v1/auth/login/", {
        "email": "copyapi@test.com", "password": "testpass123!@#",
    })
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
    return api_client


@pytest.fixture
def style(tenant):
    Country.objects.create(tenant=tenant, name="Copy Land", code="CL1")
    buyer = Buyer.objects.create(tenant=tenant, name="Copy Buyer", code="COB1")
    return Style.objects.create(
        tenant=tenant, style_number="COPY-STYLE-001", name="Copy Style",
        buyer=buyer,
    )


@pytest.fixture
def style_version(tenant, style):
    return StyleVersion.objects.create(
        tenant=tenant, style=style, version_number=1, status="active",
    )


def _sheet(tenant, style, number, based_on=""):
    tp = StyleTechPack.objects.create(
        tenant=tenant,
        techpack_number=StyleTechPack.next_techpack_number(tenant),
        style=style,
        based_on=based_on,
    )
    return DesignSheet.objects.create(tenant=tenant, tech_pack=tp)


def _spec(tenant, sheet, label, *, selected=False, **kw):
    return FitSpecification.objects.create(
        tenant=tenant, design_sheet=sheet, fit_number=label,
        is_selected=selected, **kw,
    )


def _image(tenant, spec, caption, order=0):
    return FitImage.objects.create(
        tenant=tenant, fit_spec=spec, caption=caption, order=order,
    )


@pytest.fixture
def source_spec(tenant, style):
    sheet = _sheet(tenant, style, "COPY-SOURCE")
    spec = _spec(
        tenant, sheet, "DEV SPEC", selected=True,
        fit_date="2026-08-10", description="Base dev fit", notes="keep sleeve",
    )
    _spec(tenant, sheet, "1ST FIT", fit_date="2026-08-20")
    write = _image(tenant, spec, "front", 0)
    _image(tenant, spec, "back", 1)
    return sheet, spec, write


@pytest.fixture
def target_sheet(tenant, style):
    sheet = _sheet(tenant, style, "COPY-TARGET")
    _spec(
        tenant, sheet, "DEV SPEC", selected=True,
        fit_date="2026-08-01", description="existing",
    )
    return sheet


@pytest.mark.django_db
class TestCopyFitSpecAPI:
    def test_copies_selected_spec_from_another_sheet(self, client, source_spec, target_sheet):
        source, spec, _ = source_spec
        resp = client.post(
            f"/api/v1/merchandising/design-sheets/{target_sheet.id}/copy-fit-spec/",
            {"source_design_sheet": str(source.id)},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["fit_number"] == "1ST FIT"
        assert resp.data["fit_date"] == "2026-08-10"
        assert resp.data["description"] == "Base dev fit"
        assert resp.data["notes"] == "keep sleeve"
        assert resp.data["is_selected"] is True
        copied = FitSpecification.objects.get(id=resp.data["id"])
        assert copied.design_sheet_id == target_sheet.id
        assert target_sheet.fit_specs.filter(is_selected=True).count() == 1
        assert target_sheet.fit_specs.get(is_selected=True).id != spec.id

    def test_copies_images_with_the_spec_by_default(self, client, source_spec, target_sheet):
        source, spec, _ = source_spec
        resp = client.post(
            f"/api/v1/merchandising/design-sheets/{target_sheet.id}/copy-fit-spec/",
            {"source_design_sheet": str(source.id)},
            format="json",
        )
        imgs = FitImage.objects.filter(fit_spec_id=resp.data["id"]).order_by("order")
        assert [(i.caption, i.order) for i in imgs] == [("front", 0), ("back", 1)]

    def test_can_exclude_images(self, client, source_spec, target_sheet):
        source, spec, _ = source_spec
        resp = client.post(
            f"/api/v1/merchandising/design-sheets/{target_sheet.id}/copy-fit-spec/",
            {"source_design_sheet": str(source.id), "include_images": False},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert FitImage.objects.filter(fit_spec_id=resp.data["id"]).count() == 0

    def test_copies_annotations_by_default(self, client, source_spec, target_sheet):
        source, spec, _ = source_spec
        src_annotations = [
            {"id": "s1", "x": 10, "y": 20, "text": "WAIST SEAM"},
            {"id": "s2", "x": 80, "y": 55, "text": "FRONT FLY"},
        ]
        source.tech_pack.design_sheet.sketch_annotations = src_annotations
        source.tech_pack.design_sheet.save(update_fields=["sketch_annotations"])
        resp = client.post(
            f"/api/v1/merchandising/design-sheets/{target_sheet.id}/copy-fit-spec/",
            {"source_design_sheet": str(source.id)},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        target_sheet.refresh_from_db()
        copied = target_sheet.sketch_annotations
        assert len(copied) == 2
        assert {c["text"] for c in copied} == {"WAIST SEAM", "FRONT FLY"}
        assert len({c["id"] for c in copied}) == 2
        assert {c["id"] for c in copied} != {"s1", "s2"}

    def test_can_exclude_annotations(self, client, source_spec, target_sheet):
        source, spec, _ = source_spec
        source.tech_pack.design_sheet.sketch_annotations = [
            {"id": "s1", "x": 10, "y": 20, "text": "WAIST SEAM"},
        ]
        source.tech_pack.design_sheet.save(update_fields=["sketch_annotations"])
        target_sheet.sketch_annotations = [
            {"id": "t1", "x": 5, "y": 5, "text": "KEEP"},
        ]
        target_sheet.save(update_fields=["sketch_annotations"])
        resp = client.post(
            f"/api/v1/merchandising/design-sheets/{target_sheet.id}/copy-fit-spec/",
            {"source_design_sheet": str(source.id), "include_annotations": False},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        target_sheet.refresh_from_db()
        assert target_sheet.sketch_annotations == [{"id": "t1", "x": 5, "y": 5, "text": "KEEP"}]

    def test_resolves_source_from_base_reference(self, client, style, target_sheet):
        source = _sheet(tenant=style.tenant, style=style, number="BASE-NUMBER")
        source.tech_pack.techpack_number = "BASE-FN-1234"
        source.tech_pack.save(update_fields=["techpack_number"])
        _spec(
            style.tenant, source, "DEV SPEC", selected=True,
            fit_date="2026-08-05", description="from_base",
        )
        target_sheet.tech_pack.based_on = "BASE-FN-1234"
        target_sheet.tech_pack.save(update_fields=["based_on"])
        resp = client.post(
            f"/api/v1/merchandising/design-sheets/{target_sheet.id}/copy-fit-spec/",
            {},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["description"] == "from_base"
        assert resp.data["is_selected"] is True

    def test_uses_latest_spec_when_source_has_no_selected(self, client, style, target_sheet):
        source = _sheet(tenant=style.tenant, style=style, number="NO-SELECT")
        _spec(
            style.tenant, source, "1ST FIT",
            fit_date="2026-08-20", description="unselected latest",
        )
        resp = client.post(
            f"/api/v1/merchandising/design-sheets/{target_sheet.id}/copy-fit-spec/",
            {"source_design_sheet": str(source.id)},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["description"] == "unselected latest"

    def test_400_when_no_base_or_source_to_copy_from(self, client, target_sheet):
        resp = client.post(
            f"/api/v1/merchandising/design-sheets/{target_sheet.id}/copy-fit-spec/",
            {},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_400_when_source_has_no_fit_specs(self, client, style, target_sheet):
        source = _sheet(tenant=style.tenant, style=style, number="EMPTY")
        resp = client.post(
            f"/api/v1/merchandising/design-sheets/{target_sheet.id}/copy-fit-spec/",
            {"source_design_sheet": str(source.id)},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_400_when_copying_to_itself(self, client, source_spec, target_sheet):
        source, spec, _ = source_spec
        resp = client.post(
            f"/api/v1/merchandising/design-sheets/{source.id}/copy-fit-spec/",
            {"source_design_sheet": str(source.id)},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST