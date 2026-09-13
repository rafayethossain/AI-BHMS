"""
Design Sheet material grid API flow (Day 19-20).

The Material Breakdown grid (Tabulator) is backed by BOMItem rows. The
design-sheet detail response exposes them via ``material_items`` (mapped to
the grid's field names) so the frontend can render the grid in one request;
inline edits are written back through ``PATCH /bom-items/{id}/``.

Covers:

* ``GET /api/v1/merchandising/design-sheets/{id}/`` returns ``material_items``
  in grid shape (type / description_code / location / supplier / colour /
  width_size / qty / match) for the techpack's BOM.
* The active BOM is preferred; otherwise the latest version.
* ``PATCH /api/v1/merchandising/bom-items/{id}/`` persists grid edits
  (category, item_name, location, colour, width_size, ordered_qty, match).
* ``PATCH`` of the supplier (vendor FK) is reflected by name in the grid.
"""
from __future__ import annotations

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.merchandising.models import (
    BOM, BOMItem, DesignSheet, Style, StyleTechPack, StyleVersion,
)
from apps.setup.models import Buyer, Country, Vendor
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def tenant(db):
    return Tenant.objects.create(
        name="Material Grid Co", slug="mat-grid",
        schema_name="tenant_matgrid", status="active",
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
    role = _role_with(tenant, "GridFull", [
        ("merchandising", "view"), ("merchandising", "create"),
        ("merchandising", "edit"),
    ])
    return _user(tenant, role, "gridapi", "gridapi@test.com")


@pytest.fixture
def client(api_client, user):
    login = api_client.post("/api/v1/auth/login/", {
        "email": "gridapi@test.com", "password": "testpass123!@#",
    })
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
    return api_client


@pytest.fixture
def style(tenant):
    Country.objects.create(tenant=tenant, name="Grid Land", code="GL1")
    buyer = Buyer.objects.create(tenant=tenant, name="Grid Buyer", code="GRB1")
    return Style.objects.create(
        tenant=tenant, style_number="GRID-STYLE-001", name="Grid Style",
        buyer=buyer,
    )


@pytest.fixture
def style_version(tenant, style):
    return StyleVersion.objects.create(
        tenant=tenant, style=style, version_number=1, status="active",
    )


@pytest.fixture
def vendor(tenant):
    return Vendor.objects.create(tenant=tenant, name="FOURSEASONS", code="FS1")


def _bom(tenant, style_version, version, status="draft"):
    return BOM.objects.create(
        tenant=tenant, style_version=style_version,
        name=f"BOM V{version}", version=version, status=status,
    )


def _item(tenant, bom, category, item_name, **kw):
    return BOMItem.objects.create(
        tenant=tenant, bom=bom, category=category, item_name=item_name, **kw,
    )


def _techpack_with(tenant, style):
    return StyleTechPack.objects.create(
        tenant=tenant,
        techpack_number=StyleTechPack.next_techpack_number(tenant),
        style=style,
    )


@pytest.fixture
def design_sheet(tenant, style, style_version):
    bom = _bom(tenant, style_version, 1, status="active")
    _item(
        tenant, bom, "Cloth", "SANDWASH LINEN XK-529",
        location="CUT ANGLE", colour="WHITE", width_size="60in",
        match="Left", ordered_qty=2.25,
    )
    _item(
        tenant, bom, "Trims", "BUTTON 4 HOLES FV9757",
        location="CHEST", colour="BLACK", width_size="25mm",
        match="Center", ordered_qty=4,
    )
    tp = _techpack_with(tenant, style)
    return DesignSheet.objects.create(tenant=tenant, tech_pack=tp)


@pytest.mark.django_db
class TestMaterialGridAPI:
    def test_detail_includes_material_items_in_grid_shape(self, client, design_sheet):
        resp = client.get(f"/api/v1/merchandising/design-sheets/{design_sheet.id}/")
        assert resp.status_code == status.HTTP_200_OK
        items = resp.data["material_items"]
        assert len(items) == 2
        row = next(i for i in items if i["type"] == "Cloth")
        assert row["description_code"] == "SANDWASH LINEN XK-529"
        assert row["location"] == "CUT ANGLE"
        assert row["colour"] == "WHITE"
        assert row["width_size"] == "60in"
        assert row["match"] == "Left"
        assert row["qty"] == 2.25
        assert row["supplier"] == ""
        assert "id" in row
        assert row["bom_id"] == str(
            BOMItem.objects.filter(
                tenant=design_sheet.tenant, item_name="SANDWASH LINEN XK-529",
            ).first().bom_id
        )

    def test_material_items_prefers_active_bom_then_latest(
        self, client, tenant, style, style_version
    ):
        draft_v1 = _bom(tenant, style_version, 1, status="draft")
        active_v2 = _bom(tenant, style_version, 2, status="active")
        _item(tenant, draft_v1, "Cloth", "STALE ITEM", ordered_qty=1)
        _item(tenant, active_v2, "Cloth", "CURRENT FABRIC", ordered_qty=3)
        tp = _techpack_with(tenant, style)
        sheet = DesignSheet.objects.create(tenant=tenant, tech_pack=tp)
        resp = client.get(f"/api/v1/merchandising/design-sheets/{sheet.id}/")
        codes = [i["description_code"] for i in resp.data["material_items"]]
        assert codes == ["CURRENT FABRIC"]

    def test_material_items_empty_when_no_bom_exists(self, client, tenant, style):
        tp = _techpack_with(tenant, style)
        sheet = DesignSheet.objects.create(tenant=tenant, tech_pack=tp)
        resp = client.get(f"/api/v1/merchandising/design-sheets/{sheet.id}/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["material_items"] == []

    def test_patch_bom_item_persists_grid_edits(self, client, design_sheet):
        bom_item = BOMItem.objects.filter(
            tenant=design_sheet.tenant, item_name="SANDWASH LINEN XK-529"
        ).first()
        resp = client.patch(f"/api/v1/merchandising/bom-items/{bom_item.id}/", {
            "category": "Fabric", "ordered_qty": "2.5", "colour": "BLACK",
            "location": "BACK", "match": "Right",
        })
        assert resp.status_code == status.HTTP_200_OK
        detail = client.get(f"/api/v1/merchandising/design-sheets/{design_sheet.id}/")
        row = next(i for i in detail.data["material_items"] if i["description_code"] == "SANDWASH LINEN XK-529")
        assert row["type"] == "Fabric"
        assert row["qty"] == 2.5
        assert row["colour"] == "BLACK"
        assert row["location"] == "BACK"
        assert row["match"] == "Right"

    def test_patch_bom_item_supplier_reflected_by_name(self, vendor, client, design_sheet):
        bom_item = BOMItem.objects.filter(
            tenant=design_sheet.tenant, item_name="SANDWASH LINEN XK-529"
        ).first()
        resp = client.patch(f"/api/v1/merchandising/bom-items/{bom_item.id}/", {
            "supplier": str(vendor.id),
        })
        assert resp.status_code == status.HTTP_200_OK
        detail = client.get(f"/api/v1/merchandising/design-sheets/{design_sheet.id}/")
        row = next(i for i in detail.data["material_items"] if i["description_code"] == "SANDWASH LINEN XK-529")
        assert row["supplier"] == "FOURSEASONS"


@pytest.mark.django_db
class TestMaterialAddAction:
    """POST /design-sheets/{id}/material-add/ backs the grid's Add item."""

    def test_add_item_to_existing_bom_returns_grid_shape(self, vendor, client, design_sheet):
        resp = client.post(
            f"/api/v1/merchandising/design-sheets/{design_sheet.id}/material-add/",
            {
                "category": "Trims", "item_name": "ELASTIC 40MM",
                "supplier": str(vendor.id), "location": "BACK", "ordered_qty": "6",
                "colour": "WHITE", "width_size": "40mm", "match": "Center",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        row = resp.data
        assert row["type"] == "Trims"
        assert row["description_code"] == "ELASTIC 40MM"
        assert row["supplier"] == "FOURSEASONS"
        assert row["location"] == "BACK"
        assert row["colour"] == "WHITE"
        assert row["width_size"] == "40mm"
        assert row["match"] == "Center"
        assert row["qty"] == 6.0
        assert "id" in row
        detail = client.get(f"/api/v1/merchandising/design-sheets/{design_sheet.id}/")
        codes = {i["description_code"] for i in detail.data["material_items"]}
        assert codes == {
            "SANDWASH LINEN XK-529", "BUTTON 4 HOLES FV9757", "ELASTIC 40MM",
        }

    def test_add_item_with_defaults_when_only_category_sent(self, client, design_sheet):
        resp = client.post(
            f"/api/v1/merchandising/design-sheets/{design_sheet.id}/material-add/",
            {"category": "Cloth"},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["type"] == "Cloth"
        assert resp.data["description_code"] == "New Item"

    def test_add_item_creates_bom_and_style_version_when_missing(self, client, tenant, style):
        tp = _techpack_with(tenant, style)
        sheet = DesignSheet.objects.create(tenant=tenant, tech_pack=tp)
        resp = client.post(
            f"/api/v1/merchandising/design-sheets/{sheet.id}/material-add/",
            {"category": "Cloth", "item_name": "FIRST FABRIC"},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        bom_id = resp.data["bom_id"]
        assert bom_id
        detail = client.get(f"/api/v1/merchandising/design-sheets/{sheet.id}/")
        assert [i["description_code"] for i in detail.data["material_items"]] == ["FIRST FABRIC"]

    def test_add_item_reuses_existing_bom_on_empty_grid(self, client, tenant, style):
        """Add works on an empty grid: it creates/reuses a BOM without needing bom_id."""
        tp = _techpack_with(tenant, style)
        sheet = DesignSheet.objects.create(tenant=tenant, tech_pack=tp)
        first = client.post(
            f"/api/v1/merchandising/design-sheets/{sheet.id}/material-add/",
            {"category": "Cloth", "item_name": "FIRST FABRIC"},
            format="json",
        )
        second = client.post(
            f"/api/v1/merchandising/design-sheets/{sheet.id}/material-add/",
            {"category": "Trims", "item_name": "SECOND TRIM"},
            format="json",
        )
        assert first.status_code == status.HTTP_201_CREATED
        assert second.status_code == status.HTTP_201_CREATED
        assert second.data["bom_id"] == first.data["bom_id"]
        detail = client.get(f"/api/v1/merchandising/design-sheets/{sheet.id}/")
        assert {i["description_code"] for i in detail.data["material_items"]} == {
            "FIRST FABRIC", "SECOND TRIM",
        }

    def test_add_item_rejects_sheet_without_linked_style(self, client, tenant):
        tp = StyleTechPack.objects.create(
            tenant=tenant,
            techpack_number=StyleTechPack.next_techpack_number(tenant),
            style=None,
        )
        sheet = DesignSheet.objects.create(tenant=tenant, tech_pack=tp)
        resp = client.post(
            f"/api/v1/merchandising/design-sheets/{sheet.id}/material-add/",
            {"category": "Cloth", "item_name": "ORPHAN"},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST