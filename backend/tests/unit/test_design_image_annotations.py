"""
Tests for Design Image Annotations (RQ-036-042 infra + sketch_annotations precedent).

Covers the per-image annotation list stored on DesignImage (id, x, y, text),
the DesignImageViewSet annotations action (PATCH .../design-images/{id}/annotations/),
serializer exposure, validation, tenant isolation and permissions.
"""
from io import BytesIO

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
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


def upload(name="annot.png", color=(100, 150, 200)):
    return SimpleUploadedFile(name, make_png(color=color), content_type="image/png")


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def ann_tenant(db):
    return Tenant.objects.create(
        name="Annot Test Co", slug="annot-test",
        schema_name="tenant_annot", status="active",
    )


@pytest.fixture
def ann_role(db, ann_tenant):
    role = Role.objects.create(tenant=ann_tenant, name="AnnAdmin", is_system=True)
    for act in ["view", "create", "edit", "delete"]:
        perm, _ = Permission.objects.get_or_create(
            module="merchandising", action=act,
            defaults={"description": f"merchandising:{act}"},
        )
        RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def ann_user(db, ann_tenant, ann_role):
    user = User.objects.create_user(
        username="annuser", email="ann@test.com",
        password="testpass123!@#", tenant=ann_tenant, status="active",
    )
    UserRole.objects.create(user=user, role=ann_role)
    return user


@pytest.fixture
def ann_client(api_client, ann_user):
    api_client.force_authenticate(user=ann_user)
    return api_client


@pytest.fixture
def ann_data(db, ann_tenant, ann_user):
    country = Country.objects.create(tenant=ann_tenant, name="Ann Country", code="AC1")
    buyer = Buyer.objects.create(tenant=ann_tenant, name="Ann Buyer", code="AB01", country=country)
    style = Style.objects.create(
        tenant=ann_tenant, style_number="STY-ANN", name="Annot Style",
        buyer=buyer, created_by=ann_user,
    )
    image = DesignImage.objects.create(
        tenant=ann_tenant, style=style, image=upload(), role="main",
    )
    return {"tenant": ann_tenant, "user": ann_user, "style": style, "image": image}


SAMPLE_ANNOTATIONS = [
    {"id": "a1", "x": 12.5, "y": 30, "text": "Change button spacing"},
    {"id": "a2", "x": 45, "y": 60, "text": "Widen waistband here"},
]

URL = "/api/v1/merchandising/design-images/{0}/annotations/"


# ==================== Model Tests ====================

@pytest.mark.django_db
class TestDesignImageAnnotationModel:
    """Annotations are a JSON list, defaulting to empty."""

    def test_default_annotations_is_empty_list(self, ann_data):
        image = DesignImage.objects.create(
            tenant=ann_data["tenant"], style=ann_data["style"], image=upload(),
        )
        assert image.annotations == []

    def test_annotations_stored_and_retrieved(self, ann_data):
        image = ann_data["image"]
        image.annotations = SAMPLE_ANNOTATIONS
        image.save(update_fields=["annotations", "updated_at"])
        image.refresh_from_db()
        assert image.annotations == SAMPLE_ANNOTATIONS


# ==================== API Tests ====================

@pytest.mark.django_db
class TestDesignImageAnnotationAPI:
    """The annotations action persists a per-image list and validates it."""

    def test_patch_annotations_saves_and_echoes(self, ann_client, ann_data):
        image = ann_data["image"]
        res = ann_client.patch(
            URL.format(image.id), {"annotations": SAMPLE_ANNOTATIONS}, format="json",
        )
        assert res.status_code == status.HTTP_200_OK
        assert res.data["annotations"] == SAMPLE_ANNOTATIONS
        image.refresh_from_db()
        assert image.annotations == SAMPLE_ANNOTATIONS

    def test_patch_annotations_exposed_in_retrieve(self, ann_client, ann_data):
        image = ann_data["image"]
        ann_client.patch(
            URL.format(image.id), {"annotations": SAMPLE_ANNOTATIONS}, format="json",
        )
        res = ann_client.get(f"/api/v1/merchandising/design-images/{image.id}/")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["annotations"] == SAMPLE_ANNOTATIONS

    def test_patch_empty_list_clears_annotations(self, ann_client, ann_data):
        image = ann_data["image"]
        image.annotations = SAMPLE_ANNOTATIONS
        image.save(update_fields=["annotations"])
        res = ann_client.patch(URL.format(image.id), {"annotations": []}, format="json")
        assert res.status_code == status.HTTP_200_OK
        image.refresh_from_db()
        assert image.annotations == []

    def test_patch_rejects_non_list(self, ann_client, ann_data):
        res = ann_client.patch(
            URL.format(ann_data["image"].id), {"annotations": "not-a-list"}, format="json",
        )
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_patch_rejects_item_missing_id_or_text(self, ann_client, ann_data):
        res = ann_client.patch(
            URL.format(ann_data["image"].id),
            {"annotations": [{"x": 10, "y": 20}]}, format="json",
        )
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_patch_rejects_non_numeric_coordinates(self, ann_client, ann_data):
        res = ann_client.patch(
            URL.format(ann_data["image"].id),
            {"annotations": [{"id": "a1", "text": "nope", "x": "abc", "y": 20}]},
            format="json",
        )
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_patch_rejects_foreign_tenant_image(self, ann_client, ann_tenant, ann_data):
        tenant2 = Tenant.objects.create(
            name="Other Ann Co", slug="other-annot", schema_name="tenant_annot2", status="active",
        )
        country = Country.objects.create(tenant=tenant2, name="C9", code="C9")
        buyer = Buyer.objects.create(tenant=tenant2, name="B9", code="B9", country=country)
        style2 = Style.objects.create(
            tenant=tenant2, style_number="STY-ANN2", name="Other", buyer=buyer,
        )
        foreign_image = DesignImage.objects.create(tenant=tenant2, style=style2, image=upload())
        res = ann_client.patch(
            URL.format(foreign_image.id), {"annotations": SAMPLE_ANNOTATIONS}, format="json",
        )
        assert res.status_code == status.HTTP_404_NOT_FOUND

    def test_patch_denied_without_permission(self, api_client, ann_tenant, ann_data):
        user = User.objects.create_user(
            username="annnoperm", email="anp@test.com",
            password="testpass123!@#", tenant=ann_tenant, status="active",
        )
        api_client.force_authenticate(user=user)
        res = api_client.patch(
            URL.format(ann_data["image"].id), {"annotations": SAMPLE_ANNOTATIONS}, format="json",
        )
        assert res.status_code == status.HTTP_403_FORBIDDEN