"""
Design Sheet "New Design" init API.

The Design register's "+ New Design" flow supports two modes through
``POST /api/v1/merchandising/design-sheets/init/``:

- ``fresh``: create a brand-new design sheet + tech pack from the init form.
  Garments Type is a typed ``ProductType`` selection, Buyer a typed ``Buyer``
  selection; the techpack gains an auto-generated unique ``style_code`` and its
  ``relationship`` is always ``new``. Style Reference is not set from the
  client (hidden). No annotations/notes carry over.
- ``copy``: clone an existing design sheet's technical header + sketch into a
  new sheet + tech pack (new TP-#### number and a fresh unique ``style_code``);
  ``based_on`` records the source tech-pack number; ``relationship`` is always
  ``based_on``; the source's ``product_type`` is derived and its buyer carries
  over (client may select a new Buyer). Sketch annotations are copied only when
  ``include_annotation`` is true and the note only when ``include_notes`` is
  true.
"""
from __future__ import annotations

from datetime import date

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.merchandising.models import DesignSheet, Style, StyleTechPack
from apps.setup.models import Buyer, Country, ProductCategory, ProductType
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def tenant(db):
    return Tenant.objects.create(
        name="Init Co", slug="init-co",
        schema_name="tenant_initco", status="active",
    )


@pytest.fixture
def other_tenant(db):
    return Tenant.objects.create(
        name="Other Co", slug="other-co",
        schema_name="tenant_otherco", status="active",
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
    role = _role_with(tenant, "InitFull", [
        ("merchandising", "view"), ("merchandising", "create"),
        ("merchandising", "edit"),
    ])
    return _user(tenant, role, "initapi", "initapi@test.com")


@pytest.fixture
def client(api_client, user):
    login = api_client.post("/api/v1/auth/login/", {
        "email": "initapi@test.com", "password": "testpass123!@#",
    })
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
    return api_client


@pytest.fixture
def viewer_client(api_client, tenant):
    role = _role_with(tenant, "InitView", [("merchandising", "view")])
    viewer = _user(tenant, role, "initview", "initview@test.com")
    login = api_client.post("/api/v1/auth/login/", {
        "email": "initview@test.com", "password": "testpass123!@#",
    })
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
    return api_client


@pytest.fixture
def category(tenant):
    return ProductCategory.objects.create(tenant=tenant, name="Apparel", code="APP")


@pytest.fixture
def product_type(tenant, category):
    return ProductType.objects.create(
        tenant=tenant, code="JGR", name="Jogger", category=category,
    )


@pytest.fixture
def buyer(tenant):
    Country.objects.get_or_create(tenant=tenant, name="Init Land", code="IN1")
    return Buyer.objects.create(tenant=tenant, name="Prime Buyer", code="PB1")


@pytest.fixture
def source_buyer(tenant):
    Country.objects.get_or_create(tenant=tenant, name="Source Land", code="SR1")
    return Buyer.objects.create(tenant=tenant, name="Source Buyer", code="SB1")


@pytest.fixture
def style(tenant, buyer):
    return Style.objects.create(
        tenant=tenant, style_number="SRC-STYLE-001", name="Source Style",
        buyer=buyer,
    )

@pytest.fixture
def source_sheet(tenant, style, product_type, source_buyer):
    tp = StyleTechPack.objects.create(
        tenant=tenant,
        techpack_number="TP-5111",
        style=style,
        product_type=product_type,
        buyer=source_buyer,
        style_code="OLD-CODE-1",
        style_number="SRC-STYLE-001",
        block="59080T",
        based_on="59070T",
        description="Base jogger description",
        note="Source design note",
        size="M",
        designer="Emmi.Huynh",
        pattern_cutter="Sam.Cutter",
        issuer="Issuer One",
        cloth_code="CC-100",
        length="100cm",
        sketch="SK-SOURCE",
        contains="Div 3 / 3446",
        risk_date=date(2026, 9, 1),
        pattern_request_date=date(2026, 8, 15),
        other_images=["photo_a.png", "photo_b.png"],
    )
    tp.sketch_image.name = "tech_packs/sketches/src_sketch.png"
    tp.save(update_fields=["sketch_image"])

    for existing in DesignSheet.objects.filter(tenant=tenant):
        existing.delete()
    return DesignSheet.objects.create(
        tenant=tenant,
        tech_pack=tp,
        status=DesignSheet.Status.NEW,
        sketch_annotations=[
            {"id": "n1", "x": 10, "y": 20, "text": "POCKET"},
            {"id": "n2", "x": 50, "y": 60, "text": "HEM"},
        ],
    )


@pytest.fixture
def foreign_sheet(tenant, other_tenant):
    tp = StyleTechPack.objects.create(
        tenant=other_tenant,
        techpack_number="TP-9001",
        style=None,
        style_number="FOREIGN-1",
    )
    return DesignSheet.objects.create(tenant=other_tenant, tech_pack=tp)


@pytest.mark.django_db
class TestInitFresh:
    def test_fresh_creates_sheet_with_typed_fields_unique_code_and_new_relationship(
        self, client, product_type, buyer
    ):
        resp = client.post(
            "/api/v1/merchandising/design-sheets/init/",
            {
                "mode": "fresh",
                "product_type": str(product_type.id),
                "buyer": str(buyer.id),
                "block_reference": "59080T",
                "description": "Brand new design",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED

        sheet = DesignSheet.objects.get(id=resp.data["id"])
        assert sheet.status == DesignSheet.Status.NEW
        assert sheet.sketch_annotations == []
        assert sheet.layout_order == list(DesignSheet.BLOCK_KEYS)

        tp = sheet.tech_pack
        assert tp.techpack_number.startswith("TP-")
        assert tp.style_id is None
        assert tp.product_type_id == product_type.id
        assert tp.buyer_id == buyer.id
        assert tp.style_code.startswith("DS-")
        assert resp.data["style_code"] == tp.style_code
        assert resp.data["product_type_name"] == "Jogger"
        assert resp.data["buyer_name"] == "Prime Buyer"
        assert resp.data["style_number"] == ""
        assert tp.block == "59080T"
        assert tp.description == "Brand new design"
        assert tp.relationship == "new"
        assert tp.note == ""
        assert tp.based_on == ""

    def test_fresh_ignores_style_reference_and_forces_new_relationship(
        self, client, product_type, buyer
    ):
        resp = client.post(
            "/api/v1/merchandising/design-sheets/init/",
            {
                "mode": "fresh",
                "product_type": str(product_type.id),
                "buyer": str(buyer.id),
                "style_reference": "CLIENT-INJECTED-1",
                "relationship": "recut",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        tp = DesignSheet.objects.get(id=resp.data["id"]).tech_pack
        assert tp.style_number == ""
        assert tp.relationship == "new"

    def test_fresh_defaults_optional_typed_fields(self, client):
        resp = client.post(
            "/api/v1/merchandising/design-sheets/init/",
            {"mode": "fresh"},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        tp = DesignSheet.objects.get(id=resp.data["id"]).tech_pack
        assert tp.relationship == "new"
        assert tp.product_type_id is None
        assert tp.buyer_id is None
        assert tp.style_number == ""
        assert tp.block == ""
        assert tp.style_code.startswith("DS-")

    def test_fresh_sheet_does_not_include_annotations_or_notes(
        self, client, source_sheet
    ):
        resp = client.post(
            "/api/v1/merchandising/design-sheets/init/",
            {
                "mode": "fresh",
                "product_type": str(source_sheet.tech_pack.product_type_id),
                "include_annotation": True,
                "include_notes": True,
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        sheet = DesignSheet.objects.get(id=resp.data["id"])
        assert sheet.sketch_annotations == []
        assert sheet.tech_pack.note == ""


@pytest.mark.django_db
class TestInitCopy:
    INIT_URL = "/api/v1/merchandising/design-sheets/init/"

    def test_copy_carries_header_sketch_product_type_and_buyer(
        self, client, source_sheet
    ):
        resp = client.post(
            self.INIT_URL,
            {"mode": "copy", "source_design_sheet": str(source_sheet.id)},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED

        sheet = DesignSheet.objects.get(id=resp.data["id"])
        assert sheet.status == DesignSheet.Status.NEW

        tp = sheet.tech_pack
        assert tp.relationship == "based_on"
        assert tp.product_type_id == source_sheet.tech_pack.product_type_id
        assert tp.buyer_id == source_sheet.tech_pack.buyer_id
        assert tp.style_number == "SRC-STYLE-001"
        assert tp.style_code != source_sheet.tech_pack.style_code
        assert tp.style_code.startswith("DS-")
        assert tp.based_on == source_sheet.tech_pack.techpack_number
        assert tp.block == "59080T"
        assert tp.description == "Base jogger description"
        assert tp.size == "M"
        assert tp.designer == "Emmi.Huynh"
        assert tp.pattern_cutter == "Sam.Cutter"
        assert tp.issuer == "Issuer One"
        assert tp.cloth_code == "CC-100"
        assert tp.length == "100cm"
        assert tp.sketch == "SK-SOURCE"
        assert tp.contains == "Div 3 / 3446"
        assert tp.risk_date == date(2026, 9, 1)
        assert tp.pattern_request_date == date(2026, 8, 15)
        assert tp.other_images == ["photo_a.png", "photo_b.png"]
        assert tp.sketch_image.name == "tech_packs/sketches/src_sketch.png"

    def test_copy_forces_based_on_relationship(self, client, source_sheet):
        resp = client.post(
            self.INIT_URL,
            {
                "mode": "copy",
                "source_design_sheet": str(source_sheet.id),
                "relationship": "recut",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        tp = DesignSheet.objects.get(id=resp.data["id"]).tech_pack
        assert tp.relationship == "based_on"

    def test_copy_respects_annotation_and_notes_flags(self, client, source_sheet):
        resp = client.post(
            self.INIT_URL,
            {
                "mode": "copy",
                "source_design_sheet": str(source_sheet.id),
                "include_annotation": False,
                "include_notes": False,
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        sheet = DesignSheet.objects.get(id=resp.data["id"])
        assert sheet.sketch_annotations == []
        assert sheet.tech_pack.note == ""

    def test_copy_lets_client_select_a_different_buyer(self, client, source_sheet, buyer):
        resp = client.post(
            self.INIT_URL,
            {
                "mode": "copy",
                "source_design_sheet": str(source_sheet.id),
                "buyer": str(buyer.id),
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        tp = DesignSheet.objects.get(id=resp.data["id"]).tech_pack
        assert tp.buyer_id == buyer.id
        assert tp.product_type_id == source_sheet.tech_pack.product_type_id

    def test_copy_requires_source_design_sheet(self, client):
        resp = client.post(self.INIT_URL, {"mode": "copy"}, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_copy_rejects_unknown_source(self, client):
        resp = client.post(
            self.INIT_URL,
            {"mode": "copy", "source_design_sheet": "00000000-0000-0000-0000-000000000000"},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_copy_rejects_source_from_other_tenant(self, client, foreign_sheet):
        resp = client.post(
            self.INIT_URL,
            {"mode": "copy", "source_design_sheet": str(foreign_sheet.id)},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestInitValidation:
    def test_rejects_unknown_relationship(self, client):
        resp = client.post(
            "/api/v1/merchandising/design-sheets/init/",
            {"mode": "fresh", "relationship": "bogus"},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_rejects_unknown_mode(self, client):
        resp = client.post(
            "/api/v1/merchandising/design-sheets/init/",
            {"mode": "teleport"},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_rejects_product_type_from_other_tenant(
        self, client, other_tenant, category
    ):
        cat = ProductCategory.objects.create(tenant=other_tenant, name="Other", code="OTH")
        pt = ProductType.objects.create(tenant=other_tenant, code="X", name="Foreign", category=cat)
        resp = client.post(
            "/api/v1/merchandising/design-sheets/init/",
            {"mode": "fresh", "product_type": str(pt.id)},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_rejects_buyer_from_other_tenant(self, client, other_tenant):
        Country.objects.create(tenant=other_tenant, name="Other Land", code="OL1")
        other_buyer = Buyer.objects.create(tenant=other_tenant, name="Other Buyer", code="OB1")
        resp = client.post(
            "/api/v1/merchandising/design-sheets/init/",
            {"mode": "fresh", "buyer": str(other_buyer.id)},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_requires_create_permission(self, viewer_client):
        resp = viewer_client.post(
            "/api/v1/merchandising/design-sheets/init/",
            {"mode": "fresh"},
            format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN