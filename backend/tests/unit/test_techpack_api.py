"""
RQ-040 — Tech-Pack Processing API tests.

Covers the three viewset actions on StyleViewSet:

* ``POST /merchandising/styles/techpack/extract/`` — upload a buyer PDF, parse
  it (RQ-036), persist a ``StyleTechPack`` in ``extracted`` state with the
  normalized fields + raw JSON, and generate the editable Excel (RQ-037).
* ``GET /merchandising/styles/techpack/excel/?techpack=<id>`` — download the
  generated workbook for a tech-pack.
* ``POST /merchandising/styles/techpack/import/`` — upload a (possibly
  hand-edited) workbook, create/update the Style + StyleVersion + StyleItems +
  BOM + BOMItems (RQ-038/040), and optionally link + complete the tech-pack.

Auth/permission behaviour (401 / 403) and tenant isolation are covered too.
"""
from __future__ import annotations

from pathlib import Path

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient

from apps.merchandising.models import (
    BOM,
    BOMItem,
    DesignSheet,
    Style,
    StyleItem,
    StyleTechPack,
    StyleVersion,
)
from apps.merchandising.techpack.excel_export import write_techpack_workbook
from apps.merchandising.techpack.pdf_parser import (
    StyleTechPackParser,
    TechPackBOMRow,
    TechPackDesignInfo,
    TechPackDocument,
)
from apps.setup.models import Buyer, Country
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()

PDF_EXTRACT_DIR = Path(__file__).resolve().parents[2].parent / "PDF Extract"
SAMPLE_PDF = PDF_EXTRACT_DIR / "Sample style doc.pdf"


# ------------------------------------------------------------- fixtures


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def tp_api_tenant(db):
    return Tenant.objects.create(
        name="Tech Pack API Co", slug="tp-api-test",
        schema_name="tenant_tp_api", status="active",
    )


def _role_with(tenant, name, permissions):
    role = Role.objects.create(tenant=tenant, name=name, is_system=True)
    for perm in permissions:
        perm_obj, _ = Permission.objects.get_or_create(
            module=perm[0], action=perm[1], defaults={"description": f"{perm[0]}:{perm[1]}"}
        )
        RolePermission.objects.create(role=role, permission=perm_obj)
    return role


def _user(tenant, role, username, email):
    user = User.objects.create_user(
        username=username, email=email, password="testpass123!@#",
        tenant=tenant, status="active",
    )
    UserRole.objects.create(user=user, role=role)
    return user


@pytest.fixture
def tp_api_buyer(tp_api_tenant):
    Country.objects.create(tenant=tp_api_tenant, name="TP Land", code="TP1")
    return Buyer.objects.create(tenant=tp_api_tenant, name="DOTTI", code="TPB1")


@pytest.fixture
def tp_api_user(db, tp_api_tenant):
    role = _role_with(tp_api_tenant, "TPFull", [
        ("setup", "view"), ("setup", "create"),
        ("merchandising", "view"), ("merchandising", "create"),
    ])
    return _user(tp_api_tenant, role, "tpapi", "tpapi@test.com")


@pytest.fixture
def tp_api_viewer(db, tp_api_tenant):
    role = _role_with(tp_api_tenant, "TPView", [("merchandising", "view")])
    return _user(tp_api_tenant, role, "tpviewer", "tpviewer@test.com")


@pytest.fixture
def tp_api_client(api_client, tp_api_user):
    login = api_client.post("/api/v1/auth/login/", {
        "email": "tpapi@test.com", "password": "testpass123!@#",
    })
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
    return api_client


@pytest.fixture
def tp_api_viewer_client(db, tp_api_viewer):
    client = APIClient()
    login = client.post("/api/v1/auth/login/", {
        "email": "tpviewer@test.com", "password": "testpass123!@#",
    })
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
    return client


def _sample_pdf_bytes() -> bytes:
    return SAMPLE_PDF.read_bytes()


def _sample_doc() -> TechPackDocument:
    return StyleTechPackParser().parse(SAMPLE_PDF)


@pytest.fixture
def sample_pdf():
    return SimpleUploadedFile(
        "Sample style doc.pdf", _sample_pdf_bytes(), content_type="application/pdf"
    )


@pytest.fixture
def sample_workbook_bytes():
    doc = _sample_doc()
    buf = write_techpack_workbook(doc)
    return buf.getvalue()


@pytest.fixture
def sample_workbook(sample_workbook_bytes):
    return SimpleUploadedFile(
        "Extracted.xlsx",
        sample_workbook_bytes,
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


def _extract_pdf(client, pdf, buyer, **extra):
    data = {"file": pdf, "buyer": str(buyer.id), **extra}
    return client.post("/api/v1/merchandising/styles/techpack/extract/", data, format="multipart")


def _import_workbook(client, workbook, buyer, **extra):
    data = {"file": workbook, "buyer": str(buyer.id), **extra}
    return client.post("/api/v1/merchandising/styles/techpack/import/", data, format="multipart")


# ============================================================= EXTRACT


@pytest.mark.django_db
class TestExtractTechPack:
    def test_requires_authentication(self, api_client, sample_pdf, tp_api_buyer):
        resp = _extract_pdf(api_client, sample_pdf, tp_api_buyer)
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_requires_create_permission(self, tp_api_viewer_client, sample_pdf, tp_api_buyer):
        resp = _extract_pdf(tp_api_viewer_client, sample_pdf, tp_api_buyer)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_requires_file(self, tp_api_client, tp_api_buyer):
        resp = tp_api_client.post(
            "/api/v1/merchandising/styles/techpack/extract/",
            {"buyer": str(tp_api_buyer.id)}, format="multipart",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_rejects_non_pdf(self, tp_api_client, tp_api_buyer):
        bogus = SimpleUploadedFile("fake.pdf", b"not a pdf", content_type="application/pdf")
        resp = _extract_pdf(tp_api_client, bogus, tp_api_buyer)
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_requires_buyer(self, tp_api_client, sample_pdf):
        resp = tp_api_client.post(
            "/api/v1/merchandising/styles/techpack/extract/",
            {"file": sample_pdf}, format="multipart",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_creates_extracted_techpack(self, tp_api_client, sample_pdf, tp_api_buyer):
        resp = _extract_pdf(tp_api_client, sample_pdf, tp_api_buyer)
        assert resp.status_code == status.HTTP_200_OK, resp.data

        techpacks = StyleTechPack.objects.filter(tenant=tp_api_buyer.tenant)
        assert techpacks.count() == 1
        tp = techpacks.first()
        assert tp.status == StyleTechPack.Status.EXTRACTED
        assert tp.style_number == "67741T"
        assert tp.cloth_code == "SANDWASH LINEN"
        assert tp.buyer == tp_api_buyer
        assert tp.source_pdf.name != ""
        assert tp.extracted_data["bom_rows"]

    def test_extract_returns_data_and_download_url(self, tp_api_client, sample_pdf, tp_api_buyer):
        resp = _extract_pdf(tp_api_client, sample_pdf, tp_api_buyer)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["status"] == StyleTechPack.Status.EXTRACTED
        assert resp.data["techpack_number"].startswith("TP-")
        assert len(resp.data["data"]["bom_rows"]) == 6
        url = resp.data["excel_download_url"]
        assert "techpack/excel" in url
        assert f"techpack={resp.data['id']}" in url

    def test_extract_generates_excel_file(self, tp_api_client, sample_pdf, tp_api_buyer):
        resp = _extract_pdf(tp_api_client, sample_pdf, tp_api_buyer)
        assert resp.status_code == status.HTTP_200_OK
        tp = StyleTechPack.objects.get(tenant=tp_api_buyer.tenant)
        assert tp.excel_file.name.endswith(".xlsx")


# ============================================================= EXCEL


@pytest.mark.django_db
class TestTechPackExcel:
    def test_requires_authentication(self, api_client, tp_api_tenant):
        resp = api_client.get("/api/v1/merchandising/styles/techpack/excel/?techpack=1")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_downloads_workbook(self, tp_api_client, sample_pdf, tp_api_buyer):
        _extract_pdf(tp_api_client, sample_pdf, tp_api_buyer)
        tp = StyleTechPack.objects.get(tenant=tp_api_buyer.tenant)
        resp = tp_api_client.get(f"/api/v1/merchandising/styles/techpack/excel/?techpack={tp.id}")
        assert resp.status_code == status.HTTP_200_OK
        body = b"".join(resp.streaming_content)
        assert body.startswith(b"PK")

    def test_unknown_techpack_404(self, tp_api_client):
        resp = tp_api_client.get("/api/v1/merchandising/styles/techpack/excel/?techpack=99999")
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_requires_view_permission(self, tp_api_viewer_client, tp_api_tenant):
        resp = tp_api_viewer_client.get(
            "/api/v1/merchandising/styles/techpack/excel/?techpack=1"
        )
        assert resp.status_code == status.HTTP_404_NOT_FOUND


# ============================================================= IMPORT


@pytest.mark.django_db
class TestImportTechPack:
    def test_requires_authentication(self, api_client, sample_workbook, tp_api_buyer):
        resp = _import_workbook(api_client, sample_workbook, tp_api_buyer)
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_requires_create_permission(self, tp_api_viewer_client, sample_workbook, tp_api_buyer):
        resp = _import_workbook(tp_api_viewer_client, sample_workbook, tp_api_buyer)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_requires_file(self, tp_api_client, tp_api_buyer):
        resp = tp_api_client.post(
            "/api/v1/merchandising/styles/techpack/import/",
            {"buyer": str(tp_api_buyer.id)}, format="multipart",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_rejects_non_workbook(self, tp_api_client, tp_api_buyer):
        bogus = SimpleUploadedFile("fake.xlsx", b"not a workbook", content_type="application/vnd.ms-excel")
        resp = _import_workbook(tp_api_client, bogus, tp_api_buyer)
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_requires_buyer(self, tp_api_client, sample_workbook):
        resp = tp_api_client.post(
            "/api/v1/merchandising/styles/techpack/import/",
            {"file": sample_workbook}, format="multipart",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_creates_style_and_children(self, tp_api_client, sample_workbook, tp_api_buyer):
        resp = _import_workbook(tp_api_client, sample_workbook, tp_api_buyer)
        assert resp.status_code == status.HTTP_200_OK

        tenant = tp_api_buyer.tenant
        style = Style.objects.get(tenant=tenant, style_number="67741T")
        assert StyleVersion.objects.filter(tenant=tenant, style=style, version_number=1).exists()
        assert StyleItem.objects.filter(tenant=tenant, style=style).count() == 6
        bom = BOM.objects.filter(tenant=tenant, style_version__style=style).first()
        assert bom is not None
        assert BOMItem.objects.filter(tenant=tenant, bom=bom).count() == 6

    def test_maps_bom_row_fields(self, tp_api_client, sample_workbook, tp_api_buyer):
        _import_workbook(tp_api_client, sample_workbook, tp_api_buyer)
        tenant = tp_api_buyer.tenant
        row0 = _sample_doc().bom_rows[0]
        item = BOMItem.objects.get(tenant=tenant, item_name=row0.description_code)
        assert item.category == row0.type
        assert item.consumption == row0.qty
        assert item.location == row0.location
        assert item.colour == row0.colour
        assert item.width_size == row0.width_size
        assert item.match == row0.match

    def test_creates_new_version_for_existing_style(self, tp_api_client, sample_workbook, tp_api_buyer):
        tenant = tp_api_buyer.tenant
        style = Style.objects.create(
            tenant=tenant, style_number="67741T", name="Existing", buyer=tp_api_buyer,
        )
        StyleVersion.objects.create(tenant=tenant, style=style, version_number=1, status="active")
        resp = _import_workbook(tp_api_client, sample_workbook, tp_api_buyer)
        assert resp.status_code == status.HTTP_200_OK
        style = Style.objects.get(tenant=tenant, style_number="67741T")
        assert Style.objects.filter(tenant=tenant, style_number="67741T").count() == 1
        assert style.name == "Existing"
        versions = list(
            StyleVersion.objects.filter(tenant=tenant, style=style)
            .order_by("version_number")
            .values_list("version_number", flat=True)
        )
        assert versions == [1, 2]

    def test_generates_style_number_when_missing(self, tp_api_client, tp_api_buyer, sample_workbook_bytes):
        from django.core.files.uploadedfile import SimpleUploadedFile as SUF

        doc = TechPackDocument(
            design_info=TechPackDesignInfo(style_number="", description="Nameless"),
            bom_rows=(TechPackBOMRow(type="CLOTH", description_code="VOILE"),),
        )
        buf = write_techpack_workbook(doc)
        workbook = SUF("Nameless.xlsx", buf.getvalue())
        resp = _import_workbook(tp_api_client, workbook, tp_api_buyer)
        assert resp.status_code == status.HTTP_200_OK
        style = Style.objects.get(tenant=tp_api_buyer.tenant)
        assert style.style_number.startswith("STY-")

    def test_links_and_completes_techpack(self, tp_api_client, sample_pdf, sample_workbook, tp_api_buyer):
        extract_resp = _extract_pdf(tp_api_client, sample_pdf, tp_api_buyer)
        techpack_id = extract_resp.data["id"]
        resp = _import_workbook(
            tp_api_client, sample_workbook, tp_api_buyer, techpack=techpack_id
        )
        assert resp.status_code == status.HTTP_200_OK
        tp = StyleTechPack.objects.get(id=techpack_id)
        assert tp.status == StyleTechPack.Status.COMPLETED
        assert tp.style is not None
        assert tp.style.style_number == "67741T"
        assert tp.style.tech_pack.name.endswith(".pdf")

    def test_returns_import_summary(self, tp_api_client, sample_workbook, tp_api_buyer):
        resp = _import_workbook(tp_api_client, sample_workbook, tp_api_buyer)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["style"]["style_number"] == "67741T"
        assert resp.data["style_version"]["version_number"] == 1
        assert resp.data["bom"]["version"] == 1
        assert resp.data["style_items_created"] == 6
        assert resp.data["bom_items_created"] == 6

    def test_creates_design_sheet_for_linked_techpack(
        self, tp_api_client, sample_pdf, sample_workbook, tp_api_buyer
    ):
        extract_resp = _extract_pdf(tp_api_client, sample_pdf, tp_api_buyer)
        techpack_id = extract_resp.data["id"]
        resp = _import_workbook(
            tp_api_client, sample_workbook, tp_api_buyer, techpack=techpack_id
        )
        assert resp.status_code == status.HTTP_200_OK
        tenant = tp_api_buyer.tenant
        assert DesignSheet.objects.filter(
            tenant=tenant, tech_pack_id=techpack_id
        ).count() == 1

    def test_import_response_includes_design_sheet(
        self, tp_api_client, sample_pdf, sample_workbook, tp_api_buyer
    ):
        extract_resp = _extract_pdf(tp_api_client, sample_pdf, tp_api_buyer)
        techpack_id = extract_resp.data["id"]
        resp = _import_workbook(
            tp_api_client, sample_workbook, tp_api_buyer, techpack=techpack_id
        )
        assert resp.status_code == status.HTTP_200_OK
        assert "design_sheet" in resp.data
        assert resp.data["design_sheet"]["id"] is not None
        assert resp.data["design_sheet"]["status"] == "new"

    def test_import_without_techpack_does_not_create_design_sheet(
        self, tp_api_client, sample_workbook, tp_api_buyer
    ):
        resp = _import_workbook(tp_api_client, sample_workbook, tp_api_buyer)
        assert resp.status_code == status.HTTP_200_OK
        assert DesignSheet.objects.filter(tenant=tp_api_buyer.tenant).count() == 0

    def test_rolls_back_on_fatal_error(self, tp_api_client, sample_workbook, tp_api_buyer, monkeypatch):
        import apps.merchandising.views as views_module
        from apps.merchandising.models import Style as StyleModel

        def boom(tenant, user, buyer, doc, techpack=None):
            StyleModel.objects.create(
                tenant=tenant, style_number="STY-PARTIAL", name="Partial", buyer=buyer,
            )
            raise RuntimeError("boom")

        monkeypatch.setattr(views_module, "import_style_from_techpack", boom)
        resp = _import_workbook(tp_api_client, sample_workbook, tp_api_buyer)
        assert resp.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert Style.objects.filter(tenant=tp_api_buyer.tenant).count() == 0


class TestStyleTechPacksList:
    def test_lists_linked_techpack(self, tp_api_client, sample_pdf, sample_workbook, tp_api_buyer):
        extract_resp = _extract_pdf(tp_api_client, sample_pdf, tp_api_buyer)
        techpack_id = extract_resp.data["id"]
        _import_workbook(tp_api_client, sample_workbook, tp_api_buyer, techpack=techpack_id)
        style = Style.objects.get(tenant=tp_api_buyer.tenant)
        resp = tp_api_client.get(f"/api/v1/merchandising/styles/{style.id}/tech_packs/")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 1
        row = resp.data[0]
        assert row["id"] == str(techpack_id)
        assert row["techpack_number"].startswith("TP-")
        assert row["status"] == StyleTechPack.Status.COMPLETED
        assert row["bom_items_count"] == 6
        assert row["source_pdf_url"] is not None
        assert row["style"] == style.id

    def test_returns_empty_when_no_techpacks(self, tp_api_client, sample_workbook, tp_api_buyer):
        _import_workbook(tp_api_client, sample_workbook, tp_api_buyer)
        style = Style.objects.get(tenant=tp_api_buyer.tenant)
        resp = tp_api_client.get(f"/api/v1/merchandising/styles/{style.id}/tech_packs/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data == []

    def test_viewer_can_list(self, tp_api_client, tp_api_viewer_client, sample_pdf, sample_workbook, tp_api_buyer):
        extract_resp = _extract_pdf(tp_api_client, sample_pdf, tp_api_buyer)
        techpack_id = extract_resp.data["id"]
        _import_workbook(tp_api_client, sample_workbook, tp_api_buyer, techpack=techpack_id)
        style = Style.objects.get(tenant=tp_api_buyer.tenant)
        resp = tp_api_viewer_client.get(f"/api/v1/merchandising/styles/{style.id}/tech_packs/")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 1

    def test_requires_auth(self, api_client, tp_api_buyer):
        style = Style.objects.create(
            tenant=tp_api_buyer.tenant, style_number="STY-9999", name="No Auth",
            buyer=tp_api_buyer,
        )
        resp = api_client.get(f"/api/v1/merchandising/styles/{style.id}/tech_packs/")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED
