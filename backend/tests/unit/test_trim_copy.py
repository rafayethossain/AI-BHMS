"""
Tests for Trim/Label Copy From Order (GC-009).

Covers the copy_trim_items service and the BOMViewSet copy-trims action.
"""
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.merchandising.models import BOM, BOMItem, Style, StyleVersion
from apps.merchandising.services import NoTrimItemsError, copy_trim_items
from apps.setup.models import UOM, Buyer, Country, Currency, Vendor
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def copy_tenant(db):
    return Tenant.objects.create(
        name="Copy Test Co", slug="copy-test",
        schema_name="tenant_copy", status="active"
    )


@pytest.fixture
def copy_tenant2(db):
    return Tenant.objects.create(
        name="Copy Other Co", slug="copy-other",
        schema_name="tenant_copy_other", status="active"
    )


@pytest.fixture
def copy_role(db, copy_tenant):
    role = Role.objects.create(tenant=copy_tenant, name="CopyAdmin", is_system=True)
    for mod in ["setup", "merchandising"]:
        for act in ["view", "create", "edit", "delete"]:
            perm, _ = Permission.objects.get_or_create(
                module=mod, action=act,
                defaults={"description": f"{mod}:{act}"}
            )
            RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def copy_user(db, copy_tenant, copy_role):
    user = User.objects.create_user(
        username="copyuser", email="copy@test.com",
        password="testpass123!@#", tenant=copy_tenant, status="active",
    )
    UserRole.objects.create(user=user, role=copy_role)
    return user


@pytest.fixture
def copy_client(api_client, copy_user):
    api_client.force_authenticate(user=copy_user)
    return api_client


def _make_bom(tenant, user, style_number, bom_name):
    country = Country.objects.create(tenant=tenant, name=f"Country {style_number}", code=style_number[-3:])
    buyer = Buyer.objects.create(tenant=tenant, name="Copy Buyer", code=f"CB{style_number[-2:]}", country=country)
    style = Style.objects.create(
        tenant=tenant, style_number=style_number, name="Copy Style",
        buyer=buyer, created_by=user,
    )
    sv = StyleVersion.objects.create(
        tenant=tenant, style=style, version_number=1, status="active",
        created_by=user,
    )
    bom = BOM.objects.create(
        tenant=tenant, style_version=sv, name=bom_name, created_by=user,
    )
    return bom


@pytest.fixture
def copy_data(db, copy_tenant, copy_user):
    country = Country.objects.create(tenant=copy_tenant, name="Copy Country", code="CC1")
    buyer = Buyer.objects.create(tenant=copy_tenant, name="Copy Buyer", code="CB01", country=country)
    currency = Currency.objects.create(tenant=copy_tenant, name="USD", code="USD", symbol="$")
    uom = UOM.objects.create(tenant=copy_tenant, name="Pieces", code="PCS")
    supplier = Vendor.objects.create(tenant=copy_tenant, name="Label Supplier", code="LS01", country=country)
    style = Style.objects.create(
        tenant=copy_tenant, style_number="STY-COPY", name="Copy Style",
        buyer=buyer, created_by=copy_user,
    )
    sv = StyleVersion.objects.create(
        tenant=copy_tenant, style=style, version_number=1, status="active",
        created_by=copy_user,
    )
    source_bom = BOM.objects.create(
        tenant=copy_tenant, style_version=sv, name="Source BOM",
        created_by=copy_user,
    )
    target_bom = BOM.objects.create(
        tenant=copy_tenant, style_version=sv, name="Target BOM", version=2,
        created_by=copy_user,
    )
    return {
        "tenant": copy_tenant, "user": copy_user, "currency": currency,
        "uom": uom, "supplier": supplier, "source_bom": source_bom,
        "target_bom": target_bom,
    }


def _add_item(bom, user, category, item_name, **kwargs):
    defaults = {
        "tenant": bom.tenant, "bom": bom, "created_by": user,
        "category": category, "item_name": item_name,
    }
    defaults.update(kwargs)
    return BOMItem.objects.create(**defaults)


def _build_source_trims(data):
    supplier = data["supplier"]
    _add_item(data["source_bom"], data["user"], "Trim", "Hang Tag",
              description="Cardboard hang tag", uom=data["uom"],
              consumption=Decimal("1.0"), unit_price=Decimal("0.12"),
              supplier=supplier, ordered_qty=Decimal("10000"),
              delivered_qty=Decimal("4000"), status="Ordered")
    _add_item(data["source_bom"], data["user"], "Trim", "Care Label",
              description="Wash care label", uom=data["uom"],
              consumption=Decimal("1.0"), unit_price=Decimal("0.05"),
              supplier=supplier, status="Partial")
    _add_item(data["source_bom"], data["user"], "Label", "Main Label",
              description="Woven main label", supplier=supplier)


# ==================== Service Tests ====================

@pytest.mark.django_db
class TestCopyTrimItemsService:
    """Test the copy_trim_items service function."""

    def test_copy_creates_items_in_target(self, copy_data):
        _build_source_trims(copy_data)
        result = copy_trim_items(copy_data["source_bom"], copy_data["target_bom"])
        assert result == {"copied": 3, "overwritten": 0, "skipped": 0}
        items = BOMItem.objects.filter(bom=copy_data["target_bom"])
        assert items.count() == 3
        hang_tag = items.get(item_name="Hang Tag")
        assert hang_tag.description == "Cardboard hang tag"
        assert hang_tag.uom == copy_data["uom"]
        assert hang_tag.unit_price == Decimal("0.12")
        assert hang_tag.supplier == copy_data["supplier"]
        assert hang_tag.category == "Trim"

    def test_copy_resets_schedule_fields(self, copy_data):
        _build_source_trims(copy_data)
        copy_trim_items(copy_data["source_bom"], copy_data["target_bom"])
        hang_tag = BOMItem.objects.get(bom=copy_data["target_bom"], item_name="Hang Tag")
        assert hang_tag.status == "TBC"
        assert hang_tag.ordered_qty is None
        assert hang_tag.delivered_qty is None
        assert hang_tag.eta_date is None
        assert hang_tag.actual_date is None

    def test_copy_skips_existing_by_default(self, copy_data):
        _build_source_trims(copy_data)
        _add_item(copy_data["target_bom"], copy_data["user"], "Trim", "Hang Tag")
        result = copy_trim_items(copy_data["source_bom"], copy_data["target_bom"])
        assert result == {"copied": 2, "overwritten": 0, "skipped": 1}
        hang_tag = BOMItem.objects.get(bom=copy_data["target_bom"], item_name="Hang Tag")
        assert hang_tag.description == ""
        assert hang_tag.unit_price is None

    def test_copy_overwrites_existing(self, copy_data):
        _build_source_trims(copy_data)
        _add_item(copy_data["target_bom"], copy_data["user"], "Trim", "Hang Tag",
                  description="Old", unit_price=Decimal("9.99"), status="Completed")
        result = copy_trim_items(
            copy_data["source_bom"], copy_data["target_bom"], overwrite=True
        )
        assert result == {"copied": 2, "overwritten": 1, "skipped": 0}
        hang_tag = BOMItem.objects.get(bom=copy_data["target_bom"], item_name="Hang Tag")
        assert hang_tag.description == "Cardboard hang tag"
        assert hang_tag.unit_price == Decimal("0.12")
        assert hang_tag.status == "TBC"
        assert hang_tag.ordered_qty is None

    def test_copy_selective_washcare(self, copy_data):
        _build_source_trims(copy_data)
        result = copy_trim_items(
            copy_data["source_bom"], copy_data["target_bom"], selective="washcare"
        )
        assert result["copied"] == 1
        items = list(BOMItem.objects.filter(bom=copy_data["target_bom"]))
        assert [i.item_name for i in items] == ["Care Label"]

    def test_copy_selective_detail(self, copy_data):
        _build_source_trims(copy_data)
        result = copy_trim_items(
            copy_data["source_bom"], copy_data["target_bom"], selective="detail"
        )
        assert result["copied"] == 2
        names = {i.item_name for i in BOMItem.objects.filter(bom=copy_data["target_bom"])}
        assert "Hang Tag" in names
        assert "Main Label" in names
        assert "Care Label" not in names

    def test_copy_no_trim_items_raises(self, copy_data):
        _add_item(copy_data["source_bom"], copy_data["user"], "Fabric",
                  "Cotton Jersey", consumption=Decimal("1.5"))
        with pytest.raises(NoTrimItemsError):
            copy_trim_items(copy_data["source_bom"], copy_data["target_bom"])

    def test_copy_ignores_non_trim_categories(self, copy_data):
        _add_item(copy_data["source_bom"], copy_data["user"], "Fabric",
                  "Cotton Jersey", consumption=Decimal("1.5"))
        _add_item(copy_data["source_bom"], copy_data["user"], "Trim", "Hang Tag")
        result = copy_trim_items(copy_data["source_bom"], copy_data["target_bom"])
        assert result["copied"] == 1
        names = {i.item_name for i in BOMItem.objects.filter(bom=copy_data["target_bom"])}
        assert names == {"Hang Tag"}

    def test_copy_is_idempotent(self, copy_data):
        _build_source_trims(copy_data)
        copy_trim_items(copy_data["source_bom"], copy_data["target_bom"])
        result = copy_trim_items(copy_data["source_bom"], copy_data["target_bom"])
        assert result == {"copied": 0, "overwritten": 0, "skipped": 3}
        assert BOMItem.objects.filter(bom=copy_data["target_bom"]).count() == 3


# ==================== API Tests ====================

@pytest.mark.django_db
class TestCopyTrimActionAPI:
    """Test the POST /boms/{id}/copy-trims/ endpoint."""

    def test_copy_action_returns_counts(self, copy_client, copy_data):
        _build_source_trims(copy_data)
        response = copy_client.post(
            f"/api/v1/merchandising/boms/{copy_data['target_bom'].id}/copy-trims/",
            {"source_bom": str(copy_data["source_bom"].id)}, format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["copied"] == 3
        assert response.data["skipped"] == 0

    def test_copy_action_with_overwrite(self, copy_client, copy_data):
        _build_source_trims(copy_data)
        _add_item(copy_data["target_bom"], copy_data["user"], "Trim", "Hang Tag")
        response = copy_client.post(
            f"/api/v1/merchandising/boms/{copy_data['target_bom'].id}/copy-trims/",
            {"source_bom": str(copy_data["source_bom"].id), "overwrite": True},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["overwritten"] == 1
        hang_tag = BOMItem.objects.get(bom=copy_data["target_bom"], item_name="Hang Tag")
        assert hang_tag.description == "Cardboard hang tag"

    def test_copy_action_selective(self, copy_client, copy_data):
        _build_source_trims(copy_data)
        response = copy_client.post(
            f"/api/v1/merchandising/boms/{copy_data['target_bom'].id}/copy-trims/",
            {"source_bom": str(copy_data["source_bom"].id), "selective": "washcare"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["copied"] == 1

    def test_copy_action_source_not_found_404(self, copy_client, copy_data):
        response = copy_client.post(
            f"/api/v1/merchandising/boms/{copy_data['target_bom'].id}/copy-trims/",
            {"source_bom": "999999"}, format="json",
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_copy_action_cross_tenant_source_404(self, copy_client, copy_data, copy_tenant2, copy_user):
        other_bom = _make_bom(copy_tenant2, copy_user, "STY-OTHER", "Other BOM")
        response = copy_client.post(
            f"/api/v1/merchandising/boms/{copy_data['target_bom'].id}/copy-trims/",
            {"source_bom": str(other_bom.id)}, format="json",
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_copy_action_invalid_selective_400(self, copy_client, copy_data):
        _build_source_trims(copy_data)
        response = copy_client.post(
            f"/api/v1/merchandising/boms/{copy_data['target_bom'].id}/copy-trims/",
            {"source_bom": str(copy_data["source_bom"].id), "selective": "bogus"},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_copy_action_no_trims_400(self, copy_client, copy_data):
        _add_item(copy_data["source_bom"], copy_data["user"], "Fabric",
                  "Cotton Jersey", consumption=Decimal("1.5"))
        response = copy_client.post(
            f"/api/v1/merchandising/boms/{copy_data['target_bom'].id}/copy-trims/",
            {"source_bom": str(copy_data["source_bom"].id)}, format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_copy_action_missing_source_400(self, copy_client, copy_data):
        response = copy_client.post(
            f"/api/v1/merchandising/boms/{copy_data['target_bom'].id}/copy-trims/",
            {}, format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_copy_action_auth_required(self, db, copy_data):
        client = APIClient()
        response = client.post(
            f"/api/v1/merchandising/boms/{copy_data['target_bom'].id}/copy-trims/",
            {"source_bom": str(copy_data["source_bom"].id)}, format="json",
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
