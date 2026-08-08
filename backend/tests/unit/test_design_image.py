"""
Tests for Design Image Management (RQ-005, formerly GC-033).

Covers the DesignImage model (roles, main-image uniqueness) and the
DesignImageViewSet API (CRUD, set-main action, tenant isolation).
"""
from io import BytesIO

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError
from PIL import Image
from rest_framework import status
from rest_framework.test import APIClient

from apps.merchandising.models import DesignImage, Style
from apps.setup.models import Buyer, Country
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


def make_png(color=(100, 150, 200), size=(32, 32)):
    buf = BytesIO()
    Image.new("RGB", size, color).save(buf, format="PNG")
    return buf.getvalue()


def upload(name="design.png", color=(100, 150, 200)):
    return SimpleUploadedFile(name, make_png(color=color), content_type="image/png")


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def img_tenant(db):
    return Tenant.objects.create(
        name="Design Image Test Co", slug="design-image-test",
        schema_name="tenant_design", status="active",
    )


@pytest.fixture
def img_role(db, img_tenant):
    role = Role.objects.create(tenant=img_tenant, name="ImgAdmin", is_system=True)
    for act in ["view", "create", "edit", "delete"]:
        perm, _ = Permission.objects.get_or_create(
            module="merchandising", action=act,
            defaults={"description": f"merchandising:{act}"},
        )
        RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def img_user(db, img_tenant, img_role):
    user = User.objects.create_user(
        username="imguser", email="img@test.com",
        password="testpass123!@#", tenant=img_tenant, status="active",
    )
    UserRole.objects.create(user=user, role=img_role)
    return user


@pytest.fixture
def img_client(api_client, img_user):
    api_client.force_authenticate(user=img_user)
    return api_client


@pytest.fixture
def seed_img_data(db, img_tenant, img_user):
    country = Country.objects.create(tenant=img_tenant, name="Img Country", code="IC1")
    buyer = Buyer.objects.create(tenant=img_tenant, name="Img Buyer", code="IB01", country=country)
    style = Style.objects.create(
        tenant=img_tenant, style_number="STY-IMG", name="Design Image Style",
        buyer=buyer, created_by=img_user,
    )
    other_style = Style.objects.create(
        tenant=img_tenant, style_number="STY-IMG2", name="Other Style",
        buyer=buyer, created_by=img_user,
    )
    return {"tenant": img_tenant, "user": img_user, "style": style, "other_style": other_style}


# ==================== Model Tests ====================

@pytest.mark.django_db
class TestDesignImageModel:
    """Test the RQ-005 DesignImage model."""

    def test_defaults(self, seed_img_data):
        img = DesignImage.objects.create(
            tenant=seed_img_data["tenant"], style=seed_img_data["style"],
            image=upload(),
        )
        assert img.role == "main"
        assert img.is_main is False
        assert img.caption == ""
        assert img.colourway == ""
        assert img.sort_order == 0

    def test_string_representation(self, seed_img_data):
        img = DesignImage.objects.create(
            tenant=seed_img_data["tenant"], style=seed_img_data["style"],
            image=upload(), role="range",
        )
        assert str(img) == "STY-IMG - Range image"

    def test_unique_main_image_per_style(self, seed_img_data):
        style = seed_img_data["style"]
        DesignImage.objects.create(
            tenant=seed_img_data["tenant"], style=style, image=upload(), is_main=True,
        )
        with pytest.raises(IntegrityError):
            DesignImage.objects.create(
                tenant=seed_img_data["tenant"], style=style, image=upload(), is_main=True,
            )

    def test_multiple_non_main_allowed(self, seed_img_data):
        style = seed_img_data["style"]
        DesignImage.objects.create(
            tenant=seed_img_data["tenant"], style=style, image=upload(), is_main=False,
        )
        DesignImage.objects.create(
            tenant=seed_img_data["tenant"], style=style, image=upload(), is_main=False,
        )
        assert DesignImage.objects.filter(style=style).count() == 2

    def test_ordered_by_sort_order(self, seed_img_data):
        style = seed_img_data["style"]
        img1 = DesignImage.objects.create(
            tenant=seed_img_data["tenant"], style=style, image=upload(), sort_order=2,
        )
        img2 = DesignImage.objects.create(
            tenant=seed_img_data["tenant"], style=style, image=upload(), sort_order=1,
        )
        queryset = list(DesignImage.objects.filter(style=style))
        assert queryset[0].id == img2.id
        assert queryset[1].id == img1.id


# ==================== API Tests ====================

@pytest.mark.django_db
class TestDesignImageAPI:
    """Test the RQ-005 DesignImageViewSet API."""

    def test_create_design_image(self, img_client, seed_img_data):
        res = img_client.post(
            "/api/v1/merchandising/design-images/",
            {
                "style": seed_img_data["style"].id,
                "image": upload(),
                "role": "main",
                "caption": "Front flat",
            },
            format="multipart",
        )
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data["style_number"] == "STY-IMG"
        assert res.data["caption"] == "Front flat"
        assert DesignImage.objects.filter(style=seed_img_data["style"]).count() == 1

    def test_create_requires_style(self, img_client, seed_img_data):
        res = img_client.post(
            "/api/v1/merchandising/design-images/",
            {"image": upload()},
            format="multipart",
        )
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_rejects_foreign_tenant_style(self, img_client, seed_img_data):
        tenant2 = Tenant.objects.create(
            name="Other Co", slug="other-tenant", schema_name="tenant_other", status="active",
        )
        country = Country.objects.create(tenant=tenant2, name="C2", code="C2")
        buyer = Buyer.objects.create(tenant=tenant2, name="B2", code="B2", country=country)
        foreign_style = Style.objects.create(
            tenant=tenant2, style_number="STY-FOREIGN", name="Foreign", buyer=buyer,
        )
        res = img_client.post(
            "/api/v1/merchandising/design-images/",
            {"style": foreign_style.id, "image": upload()},
            format="multipart",
        )
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_list_filter_by_style(self, img_client, seed_img_data):
        style = seed_img_data["style"]
        DesignImage.objects.create(tenant=seed_img_data["tenant"], style=style, image=upload(), role="main")
        DesignImage.objects.create(
            tenant=seed_img_data["tenant"], style=seed_img_data["other_style"],
            image=upload(), role="detail",
        )
        res = img_client.get(f"/api/v1/merchandising/design-images/?style={style.id}")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["count"] == 1

    def test_retrieve(self, img_client, seed_img_data):
        img = DesignImage.objects.create(
            tenant=seed_img_data["tenant"], style=seed_img_data["style"], image=upload(),
        )
        res = img_client.get(f"/api/v1/merchandising/design-images/{img.id}/")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["id"] == str(img.id)

    def test_update(self, img_client, seed_img_data):
        img = DesignImage.objects.create(
            tenant=seed_img_data["tenant"], style=seed_img_data["style"],
            image=upload(), caption="Old",
        )
        res = img_client.patch(
            f"/api/v1/merchandising/design-images/{img.id}/",
            {"caption": "New caption", "role": "range"},
            format="json",
        )
        assert res.status_code == status.HTTP_200_OK
        img.refresh_from_db()
        assert img.caption == "New caption"
        assert img.role == "range"

    def test_delete(self, img_client, seed_img_data):
        img = DesignImage.objects.create(
            tenant=seed_img_data["tenant"], style=seed_img_data["style"], image=upload(),
        )
        res = img_client.delete(f"/api/v1/merchandising/design-images/{img.id}/")
        assert res.status_code == status.HTTP_204_NO_CONTENT
        assert DesignImage.objects.filter(id=img.id).count() == 0

    def test_set_main(self, img_client, seed_img_data):
        style = seed_img_data["style"]
        img1 = DesignImage.objects.create(
            tenant=seed_img_data["tenant"], style=style, image=upload(),
            role="main", is_main=True,
        )
        img2 = DesignImage.objects.create(
            tenant=seed_img_data["tenant"], style=style, image=upload(), role="range",
        )
        res = img_client.post(f"/api/v1/merchandising/design-images/{img2.id}/set_main/")
        assert res.status_code == status.HTTP_200_OK
        img1.refresh_from_db()
        img2.refresh_from_db()
        assert img1.is_main is False
        assert img2.is_main is True

    def test_style_design_images_action(self, img_client, seed_img_data):
        style = seed_img_data["style"]
        DesignImage.objects.create(tenant=seed_img_data["tenant"], style=style, image=upload(), role="main")
        res = img_client.get(f"/api/v1/merchandising/styles/{style.id}/design_images/")
        assert res.status_code == status.HTTP_200_OK
        assert len(res.data) == 1

    def test_main_image_serialized_on_style(self, img_client, seed_img_data):
        style = seed_img_data["style"]
        DesignImage.objects.create(
            tenant=seed_img_data["tenant"], style=style, image=upload(),
            role="main", is_main=True,
        )
        res = img_client.get(f"/api/v1/merchandising/styles/{style.id}/")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["main_image"] is not None

    def test_permission_denied_without_role(self, api_client, img_tenant, seed_img_data):
        user = User.objects.create_user(
            username="noperm", email="np@test.com",
            password="testpass123!@#", tenant=img_tenant, status="active",
        )
        api_client.force_authenticate(user=user)
        res = api_client.get("/api/v1/merchandising/design-images/")
        assert res.status_code == status.HTTP_403_FORBIDDEN
