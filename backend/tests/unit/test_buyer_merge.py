"""
Buyer/Customer merge.

The duplicated free-text ``customer`` field is removed everywhere. The buyer
from the style pack (PDF "Customer" / workbook cell) resolves to the tenant's
Setup -> Buyers master by name and is stored on the ``buyer`` FK. The buyer is
the single source of truth across extract, import, the register and design
info. Unknown pack customers are rejected (master data required), never
auto-created.
"""
from __future__ import annotations

import uuid

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient

from apps.merchandising.models import DesignSheet, Style, StyleTechPack
from apps.merchandising.techpack.pdf_parser import (
    TechPackBOMRow,
    TechPackDesignInfo,
    TechPackDocument,
)
from apps.setup.models import Buyer, Country
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


# ------------------------------------------------------------- fixtures


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def bm_tenant(db):
    return Tenant.objects.create(
        name="Buyer Merge Co", slug="bm-test",
        schema_name="tenant_bm", status="active",
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
def bm_user(db, bm_tenant):
    role = _role_with(bm_tenant, "BmFull", [
        ("merchandising", "view"), ("merchandising", "create"),
        ("merchandising", "edit"),
    ])
    return _user(bm_tenant, role, "bmuser", "bmuser@test.com")


@pytest.fixture
def bm_client(api_client, bm_user):
    login = api_client.post("/api/v1/auth/login/", {
        "email": "bmuser@test.com", "password": "testpass123!@#",
    })
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
    return api_client


@pytest.fixture
def dotti_buyer(bm_tenant):
    Country.objects.create(tenant=bm_tenant, name="BM Land", code="BM1")
    return Buyer.objects.create(tenant=bm_tenant, name="DOTTI", code="DOT1")


@pytest.fixture
def other_buyer(bm_tenant):
    return Buyer.objects.create(tenant=bm_tenant, name="TP Buyer", code="TPB1")


def _buyer(tenant, name, code):
    return Buyer.objects.create(tenant=tenant, name=name, code=code)


def _make_doc(customer: str, style_number: str = "67741T") -> TechPackDocument:
    return TechPackDocument(
        design_info=TechPackDesignInfo(
            customer=customer,
            style_number=style_number,
            description="Wide leg pant",
        ),
        bom_rows=(TechPackBOMRow(type="CLOTH", description_code="VOILE"),),
    )


def _workbook(doc: TechPackDocument) -> SimpleUploadedFile:
    from apps.merchandising.techpack.excel_export import write_techpack_workbook

    return SimpleUploadedFile(
        "pack.xlsx",
        write_techpack_workbook(doc).getvalue(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


# ===================================================== master-data resolution


@pytest.mark.django_db
class TestBuyerResolution:
    """Setup -> Buyers is the master for the pack's customer text."""

    def test_resolves_case_insensitive_within_tenant(
        self, bm_tenant, dotti_buyer, other_buyer
    ):
        from apps.merchandising.techpack.buyer_resolve import resolve_buyer_by_name

        assert resolve_buyer_by_name(bm_tenant, "  dotti ") == dotti_buyer
        assert resolve_buyer_by_name(bm_tenant, "DOTTI") == dotti_buyer

    def test_does_not_leak_other_tenants_master(self, bm_tenant, dotti_buyer):
        from apps.merchandising.techpack.buyer_resolve import resolve_buyer_by_name

        other = Tenant.objects.create(
            name="Other Co", slug="bm-other",
            schema_name="tenant_bm_other", status="active",
        )
        consumed = _buyer(other, "DOTTI", "DOT9")
        assert resolve_buyer_by_name(bm_tenant, "DOTTI") == dotti_buyer
        assert resolve_buyer_by_name(other, "DOTTI") == consumed

    def test_returns_none_for_unknown_or_blank(self, bm_tenant, dotti_buyer):
        from apps.merchandising.techpack.buyer_resolve import resolve_buyer_by_name

        assert resolve_buyer_by_name(bm_tenant, "Decathlon") is None
        assert resolve_buyer_by_name(bm_tenant, "") is None
        assert resolve_buyer_by_name(bm_tenant, "  ") is None


# ================================================================ extract


@pytest.mark.django_db
class TestExtractStoresPackCustomerAsBuyer:
    EXTRACT_URL = "/api/v1/merchandising/styles/techpack/extract/"

    def _extract(self, client, doc, buyer_id=None):
        import apps.merchandising.views as views_module

        class _FakeParser:
            def __init__(self, inner):
                self._inner = inner

            def parse(self, upload):
                return self._inner

        original = views_module.StyleTechPackParser

        class _Patched:
            def __init__(self, *a, **k):
                pass

            def parse(self, upload):
                return doc

        views_module.StyleTechPackParser = _Patched
        try:
            data = {
                "file": SimpleUploadedFile(
                    "sample.pdf", b"PDF", content_type="application/pdf"
                )
            }
            if buyer_id:
                data["buyer"] = str(buyer_id)
            return client.post(self.EXTRACT_URL, data, format="multipart")
        finally:
            views_module.StyleTechPackParser = original

    def test_pack_customer_becomes_buyer_even_when_request_buyer_differs(
        self, bm_client, bm_tenant, dotti_buyer, other_buyer
    ):
        resp = self._extract(
            bm_client, _make_doc("DOTTI"), buyer_id=other_buyer.id
        )
        assert resp.status_code == status.HTTP_200_OK, resp.data
        tp = StyleTechPack.objects.get(tenant=bm_tenant)
        assert tp.buyer == dotti_buyer

    def test_resolved_buyer_is_used_when_request_buyer_matches(
        self, bm_client, bm_tenant, dotti_buyer
    ):
        resp = self._extract(
            bm_client, _make_doc("DOTTI"), buyer_id=dotti_buyer.id
        )
        assert resp.status_code == status.HTTP_200_OK, resp.data
        tp = StyleTechPack.objects.get(tenant=bm_tenant)
        assert tp.buyer == dotti_buyer

    def test_rejects_pack_customer_not_in_master(
        self, bm_client, bm_tenant, other_buyer
    ):
        resp = self._extract(
            bm_client, _make_doc("Decathlon"), buyer_id=other_buyer.id
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert StyleTechPack.objects.filter(tenant=bm_tenant).count() == 0


# ================================================================ import


@pytest.mark.django_db
class TestImportResolvesPackCustomerAsBuyer:
    IMPORT_URL = "/api/v1/merchandising/styles/techpack/import/"

    def _import(self, client, doc, buyer_id=None):
        data = {"file": _workbook(doc)}
        if buyer_id:
            data["buyer"] = str(buyer_id)
        return client.post(self.IMPORT_URL, data, format="multipart")

    def test_pack_customer_stored_on_style_buyer(
        self, bm_client, bm_tenant, dotti_buyer, other_buyer
    ):
        resp = self._import(
            bm_client, _make_doc("DOTTI"), buyer_id=other_buyer.id
        )
        assert resp.status_code == status.HTTP_200_OK, resp.data
        style = Style.objects.get(tenant=bm_tenant)
        assert style.buyer == dotti_buyer

    def test_rejects_pack_customer_not_in_master(
        self, bm_client, bm_tenant, other_buyer
    ):
        resp = self._import(
            bm_client, _make_doc("Decathlon"), buyer_id=other_buyer.id
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert Style.objects.filter(tenant=bm_tenant).count() == 0


# ============================================================ design info


@pytest.mark.django_db
class TestDesignInfoBuyer:
    """Design Information edits the buyer by Setup->Buyers id."""

    @pytest.fixture
    def linked(self, bm_tenant, other_buyer):
        style = Style.objects.create(
            tenant=bm_tenant, style_number="STY-BM-1", name="BM Style",
            buyer=other_buyer,
        )
        tp = StyleTechPack.objects.create(
            tenant=bm_tenant,
            techpack_number=StyleTechPack.next_techpack_number(bm_tenant),
            style=style,
            buyer=other_buyer,
        )
        sheet = DesignSheet.objects.create(tenant=bm_tenant, tech_pack=tp)
        return {"sheet": sheet, "style": style}

    def test_patch_writes_buyer_on_linked_style(
        self, bm_client, bm_tenant, linked, other_buyer
    ):
        replacement = _buyer(bm_tenant, "Decathlon", "DEC1")
        url = (
            f"/api/v1/merchandising/design-sheets/{linked['sheet'].id}/design-info/"
        )
        resp = bm_client.patch(url, {"buyer": str(replacement.id)}, format="json")
        assert resp.status_code == status.HTTP_200_OK, resp.data
        linked["style"].refresh_from_db()
        assert linked["style"].buyer == replacement
        assert resp.data["buyer_id"] == str(replacement.id)
        assert resp.data["buyer_name"] == "Decathlon"

    def test_patch_rejects_unknown_buyer(
        self, bm_client, bm_tenant, linked, other_buyer
    ):
        url = (
            f"/api/v1/merchandising/design-sheets/{linked['sheet'].id}/design-info/"
        )
        resp = bm_client.patch(
            url, {"buyer": str(uuid.uuid4())}, format="json"
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        linked["style"].refresh_from_db()
        assert linked["style"].buyer == other_buyer


# ================================================== no customer anywhere


@pytest.mark.django_db
class TestCustomerFieldRemoved:
    def test_design_sheet_detail_has_no_customer_key(
        self, bm_client, bm_tenant, other_buyer
    ):
        tp = StyleTechPack.objects.create(
            tenant=bm_tenant,
            techpack_number=StyleTechPack.next_techpack_number(bm_tenant),
            buyer=other_buyer,
        )
        sheet = DesignSheet.objects.create(tenant=bm_tenant, tech_pack=tp)
        resp = bm_client.get(
            f"/api/v1/merchandising/design-sheets/{sheet.id}/"
        )
        assert resp.status_code == status.HTTP_200_OK
        assert "customer" not in resp.data

    def test_init_fresh_response_has_no_customer_key(
        self, bm_client, bm_tenant, other_buyer
    ):
        resp = bm_client.post(
            "/api/v1/merchandising/design-sheets/init/",
            {
                "mode": "fresh",
                "buyer": str(other_buyer.id),
                "description": "Brand new design",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED, resp.data
        assert "customer" not in resp.data
        assert StyleTechPack.objects.get(tenant=bm_tenant).buyer == other_buyer

    def test_style_serializer_has_no_customer_field(
        self, bm_client, bm_tenant, other_buyer
    ):
        style = Style.objects.create(
            tenant=bm_tenant, style_number="STY-BM-2", name="BM Style 2",
            buyer=other_buyer,
        )
        resp = bm_client.get(f"/api/v1/merchandising/styles/{style.id}/")
        assert resp.status_code == status.HTTP_200_OK
        assert "customer" not in resp.data
        assert resp.data["buyer_name"] == "TP Buyer"