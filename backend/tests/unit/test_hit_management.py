"""
Tests for Hit Management / Breakdown (GC-010).

Hits are children of a PurchaseOrder, keyed by colour, managed via the
nested route /purchase-orders/{po_pk}/hits/.
"""
from datetime import date
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from rest_framework import status
from rest_framework.test import APIClient

from apps.merchandising.models import (
    FileOpening,
    Hit,
    PurchaseOrder,
    PurchaseOrderItem,
    Style,
    StyleVersion,
)
from apps.setup.models import Buyer, ColorCode, Country, Currency, Factory
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def hit_tenant(db):
    return Tenant.objects.create(
        name="Hit Test Co", slug="hit-test",
        schema_name="tenant_hit", status="active"
    )


@pytest.fixture
def hit_role(db, hit_tenant):
    role = Role.objects.create(tenant=hit_tenant, name="HitAdmin", is_system=True)
    for mod in ["setup", "merchandising"]:
        for act in ["view", "create", "edit", "delete"]:
            perm, _ = Permission.objects.get_or_create(
                module=mod, action=act,
                defaults={"description": f"{mod}:{act}"}
            )
            RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def hit_user(db, hit_tenant, hit_role):
    user = User.objects.create_user(
        username="hituser", email="hit@test.com",
        password="testpass123!@#", tenant=hit_tenant, status="active",
    )
    UserRole.objects.create(user=user, role=hit_role)
    return user


@pytest.fixture
def hit_client(api_client, hit_user):
    api_client.force_authenticate(user=hit_user)
    return api_client


@pytest.fixture
def seed_hit_data(db, hit_tenant, hit_user):
    country = Country.objects.create(tenant=hit_tenant, name="Test Country")
    buyer = Buyer.objects.create(tenant=hit_tenant, name="Hit Buyer", code="HB01", country=country)
    factory = Factory.objects.create(tenant=hit_tenant, name="Factory A", code="FA01", country=country)
    factory_b = Factory.objects.create(tenant=hit_tenant, name="Factory B", code="FB01", country=country)
    currency = Currency.objects.create(tenant=hit_tenant, name="USD", code="USD", symbol="$")
    color = ColorCode.objects.create(tenant=hit_tenant, code="BLK", name="Black", hex_code="#000000")
    color2 = ColorCode.objects.create(tenant=hit_tenant, code="WHT", name="White", hex_code="#FFFFFF")
    style = Style.objects.create(
        tenant=hit_tenant, style_number="STY-HIT", name="Hit Style",
        buyer=buyer, created_by=hit_user,
    )
    sv = StyleVersion.objects.create(
        tenant=hit_tenant, style=style, version_number=1, status="active",
        created_by=hit_user,
    )
    fo = FileOpening.objects.create(
        tenant=hit_tenant, file_number="FO-HIT", style=style, style_version=sv,
        buyer=buyer, factory=factory, file_date=date(2026, 1, 1),
        created_by=hit_user,
    )
    po = PurchaseOrder.objects.create(
        tenant=hit_tenant, po_number="PO-HIT", file_opening=fo, buyer=buyer,
        factory=factory, po_date=date(2026, 1, 15), delivery_date=date(2026, 6, 1),
        quantity=1000, unit_price=Decimal("10.00"), total_value=Decimal("10000.00"),
        currency=currency,
    )
    po2 = PurchaseOrder.objects.create(
        tenant=hit_tenant, po_number="PO-HIT2", file_opening=fo, buyer=buyer,
        factory=factory, po_date=date(2026, 2, 1), delivery_date=date(2026, 7, 1),
        quantity=500, unit_price=Decimal("11.00"), total_value=Decimal("5500.00"),
        currency=currency,
    )
    po_item = PurchaseOrderItem.objects.create(
        tenant=hit_tenant, purchase_order=po, color=color,
        size="M", quantity=500, unit_price=Decimal("10.00"),
    )
    po_item2 = PurchaseOrderItem.objects.create(
        tenant=hit_tenant, purchase_order=po, color=color2,
        size="L", quantity=500, unit_price=Decimal("10.00"),
    )
    return {
        "tenant": hit_tenant, "user": hit_user, "buyer": buyer,
        "factory": factory, "factory_b": factory_b, "currency": currency,
        "color": color, "color2": color2,
        "style": style, "style_version": sv, "file_opening": fo,
        "purchase_order": po, "purchase_order_2": po2,
        "po_item": po_item, "po_item2": po_item2,
    }


# ==================== Model Tests ====================

@pytest.mark.django_db
class TestHitModel:
    """Test the GC-010 Hit model."""

    def test_default_delivery_mode(self, seed_hit_data):
        hit = Hit.objects.create(
            tenant=seed_hit_data["tenant"],
            purchase_order=seed_hit_data["purchase_order"],
            hit_number="HIT-0001",
            colour=seed_hit_data["color"],
            created_by=seed_hit_data["user"],
        )
        assert hit.delivery_mode == "boxed"
        assert hit.delivery_type == "sea"
        assert hit.original_delivery_date is None
        assert hit.actual_delivery_date is None
        assert hit.factory_override is None

    def test_create_with_all_fields(self, seed_hit_data):
        hit = Hit.objects.create(
            tenant=seed_hit_data["tenant"],
            purchase_order=seed_hit_data["purchase_order"],
            hit_number="HIT-0002",
            colour=seed_hit_data["color"],
            delivery_mode="hanging",
            delivery_type="air",
            factory_override=seed_hit_data["factory_b"],
            original_delivery_date=date(2026, 5, 1),
            actual_delivery_date=date(2026, 5, 10),
            created_by=seed_hit_data["user"],
        )
        assert hit.delivery_mode == "hanging"
        assert hit.delivery_type == "air"
        assert hit.factory_override == seed_hit_data["factory_b"]
        assert hit.original_delivery_date == date(2026, 5, 1)
        assert hit.actual_delivery_date == date(2026, 5, 10)

    def test_str_method(self, seed_hit_data):
        hit = Hit.objects.create(
            tenant=seed_hit_data["tenant"],
            purchase_order=seed_hit_data["purchase_order"],
            hit_number="HIT-0003",
            colour=seed_hit_data["color"],
            created_by=seed_hit_data["user"],
        )
        assert str(hit) == "PO-HIT - Black (HIT-0003)"

    def test_unique_per_colour_per_po(self, seed_hit_data):
        Hit.objects.create(
            tenant=seed_hit_data["tenant"],
            purchase_order=seed_hit_data["purchase_order"],
            hit_number="HIT-0004",
            colour=seed_hit_data["color"],
            created_by=seed_hit_data["user"],
        )
        with pytest.raises(IntegrityError):
            Hit.objects.create(
                tenant=seed_hit_data["tenant"],
                purchase_order=seed_hit_data["purchase_order"],
                hit_number="HIT-0005",
                colour=seed_hit_data["color"],
                created_by=seed_hit_data["user"],
            )

    def test_same_colour_different_po_allowed(self, seed_hit_data):
        Hit.objects.create(
            tenant=seed_hit_data["tenant"],
            purchase_order=seed_hit_data["purchase_order"],
            hit_number="HIT-0006",
            colour=seed_hit_data["color"],
            created_by=seed_hit_data["user"],
        )
        hit2 = Hit.objects.create(
            tenant=seed_hit_data["tenant"],
            purchase_order=seed_hit_data["purchase_order_2"],
            hit_number="HIT-0007",
            colour=seed_hit_data["color"],
            created_by=seed_hit_data["user"],
        )
        assert hit2.colour == seed_hit_data["color"]
        assert hit2.purchase_order == seed_hit_data["purchase_order_2"]


# ==================== API Tests ====================

@pytest.mark.django_db
class TestHitAPI:
    """Test the nested Hit Management API endpoints."""

    def _base(self, seed_hit_data):
        return (
            "/api/v1/merchandising/purchase-orders/"
            f"{seed_hit_data['purchase_order'].id}/hits"
        )

    def test_list_hits(self, hit_client, seed_hit_data):
        Hit.objects.create(
            tenant=seed_hit_data["tenant"],
            purchase_order=seed_hit_data["purchase_order"],
            hit_number="HIT-0010",
            colour=seed_hit_data["color"],
            created_by=seed_hit_data["user"],
        )
        response = hit_client.get(f"{self._base(seed_hit_data)}/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) >= 1
        hit = response.data["results"][0]
        assert hit["hit_number"] == "HIT-0010"
        assert hit["colour_name"] == "Black"
        assert hit["po_number"] == "PO-HIT"
        assert hit["purchase_order"] == seed_hit_data["purchase_order"].id
        assert hit["delivery_mode"] == "boxed"
        assert "factory_override" in hit
        assert "original_delivery_date" in hit
        assert "actual_delivery_date" in hit

    def test_create_hit_auto_number(self, hit_client, seed_hit_data):
        response = hit_client.post(f"{self._base(seed_hit_data)}/", {
            "colour": str(seed_hit_data["color"].id),
        }, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["hit_number"].startswith("HIT-")
        assert response.data["colour_name"] == "Black"
        assert response.data["delivery_mode"] == "boxed"
        assert response.data["po_number"] == "PO-HIT"
        assert response.data["purchase_order"] == seed_hit_data["purchase_order"].id

    def test_create_ignores_body_purchase_order(self, hit_client, seed_hit_data):
        response = hit_client.post(f"{self._base(seed_hit_data)}/", {
            "purchase_order": str(seed_hit_data["purchase_order_2"].id),
            "colour": str(seed_hit_data["color"].id),
        }, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["purchase_order"] == seed_hit_data["purchase_order"].id
        assert response.data["po_number"] == "PO-HIT"

    def test_create_hit_with_delivery_mode(self, hit_client, seed_hit_data):
        response = hit_client.post(f"{self._base(seed_hit_data)}/", {
            "colour": str(seed_hit_data["color2"].id),
            "delivery_mode": "hanging",
            "delivery_type": "air",
            "factory_override": str(seed_hit_data["factory_b"].id),
            "original_delivery_date": "2026-05-01",
        }, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["delivery_mode"] == "hanging"
        assert response.data["delivery_type"] == "air"
        assert response.data["factory_name"] == "Factory B"
        assert response.data["original_delivery_date"] == "2026-05-01"

    def test_duplicate_colour_rejected(self, hit_client, seed_hit_data):
        base = self._base(seed_hit_data)
        hit_client.post(f"{base}/", {"colour": str(seed_hit_data["color"].id)}, format="json")
        response = hit_client.post(f"{base}/", {"colour": str(seed_hit_data["color"].id)}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_colour_must_be_po_item_colour(self, hit_client, seed_hit_data):
        """GC-010: hit colour must be one of the PO's item colours (RQ-010)."""
        extra = ColorCode.objects.create(
            tenant=seed_hit_data["tenant"], code="RED", name="Red", hex_code="#FF0000"
        )
        response = hit_client.post(f"{self._base(seed_hit_data)}/", {
            "colour": str(extra.id),
        }, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_colour_name_returned(self, hit_client, seed_hit_data):
        response = hit_client.post(f"{self._base(seed_hit_data)}/", {
            "colour": str(seed_hit_data["color"].id),
        }, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["colour_name"] == "Black"

    def test_invalid_delivery_mode_rejected(self, hit_client, seed_hit_data):
        response = hit_client.post(f"{self._base(seed_hit_data)}/", {
            "colour": str(seed_hit_data["color"].id),
            "delivery_mode": "invalid",
        }, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_scoped_to_po(self, hit_client, seed_hit_data):
        Hit.objects.create(
            tenant=seed_hit_data["tenant"],
            purchase_order=seed_hit_data["purchase_order_2"],
            hit_number="HIT-0011",
            colour=seed_hit_data["color"],
            created_by=seed_hit_data["user"],
        )
        response = hit_client.get(f"{self._base(seed_hit_data)}/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 0

    def test_retrieve_other_po_hit_404(self, hit_client, seed_hit_data):
        hit = Hit.objects.create(
            tenant=seed_hit_data["tenant"],
            purchase_order=seed_hit_data["purchase_order_2"],
            hit_number="HIT-0012",
            colour=seed_hit_data["color"],
            created_by=seed_hit_data["user"],
        )
        response = hit_client.get(f"{self._base(seed_hit_data)}/{hit.id}/")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_filter_by_delivery_mode(self, hit_client, seed_hit_data):
        Hit.objects.create(
            tenant=seed_hit_data["tenant"],
            purchase_order=seed_hit_data["purchase_order"],
            hit_number="HIT-0020", colour=seed_hit_data["color"], delivery_mode="boxed",
            created_by=seed_hit_data["user"],
        )
        Hit.objects.create(
            tenant=seed_hit_data["tenant"],
            purchase_order=seed_hit_data["purchase_order"],
            hit_number="HIT-0021", colour=seed_hit_data["color2"], delivery_mode="hanging",
            created_by=seed_hit_data["user"],
        )
        response = hit_client.get(f"{self._base(seed_hit_data)}/?delivery_mode=hanging")
        assert response.status_code == status.HTTP_200_OK
        for r in response.data["results"]:
            assert r["delivery_mode"] == "hanging"

    def test_update_actual_delivery_date(self, hit_client, seed_hit_data):
        hit = Hit.objects.create(
            tenant=seed_hit_data["tenant"],
            purchase_order=seed_hit_data["purchase_order"],
            hit_number="HIT-0040", colour=seed_hit_data["color"],
            created_by=seed_hit_data["user"],
        )
        response = hit_client.patch(
            f"{self._base(seed_hit_data)}/{hit.id}/", {
                "actual_delivery_date": "2026-05-12",
            }, format="json"
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["actual_delivery_date"] == "2026-05-12"

    def test_auth_required(self, db, seed_hit_data):
        client = APIClient()
        response = client.get(
            "/api/v1/merchandising/purchase-orders/"
            f"{seed_hit_data['purchase_order'].id}/hits/"
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
