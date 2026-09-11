"""
TDD Tests for Style creation with techpack-equivalent design info fields.

Phase: Enhance Style creation with manual techpack data entry.
Expected: RED (tests fail because fields don't exist on Style model yet).
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.merchandising.models import Style
from apps.setup.models import Buyer, Country, ProductCategory, ProductType
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


@pytest.fixture
def tenant():
    return Tenant.objects.create(
        name="Design Fields Co", slug="design-fields",
        schema_name="tenant_df", status="active",
    )


@pytest.fixture
def role(tenant):
    role = Role.objects.create(tenant=tenant, name="StyleAdmin", is_system=True)
    for mod in ["setup", "merchandising"]:
        for act in ["view", "create", "edit", "delete"]:
            perm, _ = Permission.objects.get_or_create(
                module=mod, action=act,
                defaults={"description": f"{mod}:{act}"},
            )
            RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def user(tenant, role):
    u = User.objects.create_user(
        username="dftestusr", email="dftest@test.com",
        password="testpass123!@#", tenant=tenant, status="active",
    )
    UserRole.objects.create(user=u, role=role)
    return u


@pytest.fixture
def client(tenant, user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.fixture
def seed(tenant, user):
    country = Country.objects.create(tenant=tenant, name="DF Country", code="DFC")
    buyer = Buyer.objects.create(tenant=tenant, name="DF Buyer", code="DFB", country=country)
    category = ProductCategory.objects.create(tenant=tenant, name="DF Category", code="DFCAT")
    product_type = ProductType.objects.create(tenant=tenant, name="DF Product Type", code="DFPT", category=category)
    return {"tenant": tenant, "user": user, "buyer": buyer, "product_type": product_type}


@pytest.mark.django_db
class TestStyleDesignInfoFields:
    """Verify that Style creation accepts techpack-equivalent design info fields."""

    def _create(self, client, seed, **extra):
        payload = {
            "name": "Test Style",
            "buyer": str(seed["buyer"].id),
            **extra,
        }
        return client.post("/api/v1/merchandising/styles/", payload, format="json")

    def test_create_with_no_design_fields(self, client, seed):
        """Baseline: basic create still works."""
        resp = self._create(client, seed)
        assert resp.status_code == 201, resp.content

    def test_create_with_block(self, client, seed):
        resp = self._create(client, seed, block="Block A")
        assert resp.status_code == 201, resp.content
        assert resp.json()["block"] == "Block A"

    def test_create_with_based_on(self, client, seed):
        resp = self._create(client, seed, based_on="59073T")
        assert resp.status_code == 201, resp.content
        assert resp.json()["based_on"] == "59073T"

    def test_create_with_relationship(self, client, seed):
        resp = self._create(client, seed, relationship="based_on")
        assert resp.status_code == 201, resp.content
        assert resp.json()["relationship"] == "based_on"

    def test_create_with_designer(self, client, seed):
        resp = self._create(client, seed, designer="John Doe")
        assert resp.status_code == 201, resp.content
        assert resp.json()["designer"] == "John Doe"

    def test_create_with_pattern_cutter(self, client, seed):
        resp = self._create(client, seed, pattern_cutter="Jane Smith")
        assert resp.status_code == 201, resp.content
        assert resp.json()["pattern_cutter"] == "Jane Smith"

    def test_create_with_issuer(self, client, seed):
        resp = self._create(client, seed, issuer="Buying House")
        assert resp.status_code == 201, resp.content
        assert resp.json()["issuer"] == "Buying House"

    def test_create_with_cloth_code(self, client, seed):
        resp = self._create(client, seed, cloth_code="CC-12345")
        assert resp.status_code == 201, resp.content
        assert resp.json()["cloth_code"] == "CC-12345"

    def test_create_with_size(self, client, seed):
        resp = self._create(client, seed, size="M, L, XL")
        assert resp.status_code == 201, resp.content
        assert resp.json()["size"] == "M, L, XL"

    def test_create_with_length(self, client, seed):
        resp = self._create(client, seed, length="72cm")
        assert resp.status_code == 201, resp.content
        assert resp.json()["length"] == "72cm"

    def test_create_with_issue_date(self, client, seed):
        resp = self._create(client, seed, issue_date="2026-01-15")
        assert resp.status_code == 201, resp.content
        assert resp.json()["issue_date"] == "2026-01-15"

    def test_create_with_risk_date(self, client, seed):
        resp = self._create(client, seed, risk_date="2026-03-01")
        assert resp.status_code == 201, resp.content
        assert resp.json()["risk_date"] == "2026-03-01"

    def test_create_with_pattern_request_date(self, client, seed):
        resp = self._create(client, seed, pattern_request_date="2026-02-10")
        assert resp.status_code == 201, resp.content
        assert resp.json()["pattern_request_date"] == "2026-02-10"

    def test_create_with_design_note(self, client, seed):
        resp = self._create(client, seed, design_note="Special wash required")
        assert resp.status_code == 201, resp.content
        assert resp.json()["design_note"] == "Special wash required"

    def test_create_with_all_design_fields(self, client, seed):
        """Full payload: all design info fields at once."""
        resp = self._create(client, seed,
            block="Block B", based_on="59080T", relationship="recut",
            designer="Alice", pattern_cutter="Bob",
            issuer="Buyer Co", cloth_code="CC-99999", size="S, M, L",
            length="65cm", issue_date="2026-06-01", risk_date="2026-09-01",
            pattern_request_date="2026-07-15", design_note="French Terry",
        )
        assert resp.status_code == 201, resp.content
        data = resp.json()
        assert data["block"] == "Block B"
        assert data["based_on"] == "59080T"
        assert data["relationship"] == "recut"
        assert data["buyer_name"] == seed["buyer"].name
        assert data["designer"] == "Alice"
        assert data["pattern_cutter"] == "Bob"
        assert data["issuer"] == "Buyer Co"
        assert data["cloth_code"] == "CC-99999"
        assert data["size"] == "S, M, L"
        assert data["length"] == "65cm"
        assert data["issue_date"] == "2026-06-01"
        assert data["risk_date"] == "2026-09-01"
        assert data["pattern_request_date"] == "2026-07-15"
        assert data["design_note"] == "French Terry"

    def test_create_defaults_relationship_to_new(self, client, seed):
        resp = self._create(client, seed)
        assert resp.status_code == 201
        assert resp.json()["relationship"] == "new"

    def test_create_defaults_blank_fields(self, client, seed):
        """Optional fields default to empty/blank."""
        resp = self._create(client, seed)
        assert resp.status_code == 201
        data = resp.json()
        assert data["block"] == ""
        assert data["based_on"] == ""
        assert data["designer"] == ""
        assert data["pattern_cutter"] == ""
        assert data["issuer"] == ""
        assert data["cloth_code"] == ""
        assert data["size"] == ""
        assert data["length"] == ""
        assert data["design_note"] == ""

    def test_patch_update_design_info_fields(self, client, seed):
        """PATCH a style to add/update design info fields."""
        create_resp = self._create(client, seed, block="Old Block", designer="Old Designer")
        assert create_resp.status_code == 201
        style_id = create_resp.json()["id"]

        patch_payload = {
            "block": "New Block",
            "designer": "New Designer",
            "pattern_cutter": "PC Updated",
            "issuer": "Issuer Updated",
            "cloth_code": "CC-NEW",
            "size": "S, M, L, XL",
            "length": "70cm",
            "issue_date": "2026-08-01",
            "risk_date": "2026-10-01",
            "pattern_request_date": "2026-09-01",
            "design_note": "Updated note",
            "relationship": "recut",
        }
        patch_resp = client.patch(
            f"/api/v1/merchandising/styles/{style_id}/",
            patch_payload, format="json",
        )
        assert patch_resp.status_code == 200, patch_resp.content
        data = patch_resp.json()
        assert data["block"] == "New Block"
        assert data["designer"] == "New Designer"
        assert data["pattern_cutter"] == "PC Updated"
        assert data["issuer"] == "Issuer Updated"
        assert data["cloth_code"] == "CC-NEW"
        assert data["size"] == "S, M, L, XL"
        assert data["length"] == "70cm"
        assert data["issue_date"] == "2026-08-01"
        assert data["risk_date"] == "2026-10-01"
        assert data["pattern_request_date"] == "2026-09-01"
        assert data["design_note"] == "Updated note"
        assert data["relationship"] == "recut"

    def test_patch_clear_design_info_field(self, client, seed):
        """PATCH can clear a design info field back to blank."""
        create_resp = self._create(client, seed, block="To Clear")
        assert create_resp.status_code == 201
        style_id = create_resp.json()["id"]

        patch_resp = client.patch(
            f"/api/v1/merchandising/styles/{style_id}/",
            {"block": "", "designer": ""}, format="json",
        )
        assert patch_resp.status_code == 200, patch_resp.content
        data = patch_resp.json()
        assert data["block"] == ""
        assert data["designer"] == ""

    def test_patch_preserves_unset_fields(self, client, seed):
        """PATCH only updates supplied fields; others stay untouched."""
        create_resp = self._create(client, seed, block="Keep Me", designer="Keep Designer")
        assert create_resp.status_code == 201
        style_id = create_resp.json()["id"]

        patch_resp = client.patch(
            f"/api/v1/merchandising/styles/{style_id}/",
            {"designer": "Only Designer"}, format="json",
        )
        assert patch_resp.status_code == 200, patch_resp.content
        data = patch_resp.json()
        assert data["block"] == "Keep Me"
        assert data["designer"] == "Only Designer"
