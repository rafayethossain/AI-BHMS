"""
Tests for Logistics API — 21 Bug Regressions.

Categories:
  A. Tenant Data Leak (3)
  B. Permission Bypass (4)
  C. Null Factory Crash (3)
  D. Status Validation (3)
  E. Dashboard Real Data (2)
  F. Document Type Values (2)
  G. Document Delete (1)
  H. UUID Format (1)
  I. Filtering (2)
"""
import uuid
from datetime import date
from decimal import Decimal

from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APITestCase

from apps.logistics.models import FreightForwarder, Shipment, ShippingDocument
from apps.merchandising.models import PurchaseOrder
from apps.setup.models import Buyer, ColorCode, Factory
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, User, UserRole


@override_settings(ROOT_URLCONF="config.urls")
class LogisticsAPITest(APITestCase):
    """Comprehensive API tests covering all logistics bug regressions."""

    # ── setUp ────────────────────────────────────────────────────────────

    def setUp(self):
        cache.clear()

        # Tenants
        self.tenant = Tenant.objects.create(
            name="Tenant A", slug="tenant-a", schema_name="tenant_a",
        )
        self.tenant_b = Tenant.objects.create(
            name="Tenant B", slug="tenant-b", schema_name="tenant_b",
        )

        # Users
        self.user = User.objects.create_user(
            email="admin@test.com",
            username="admin",
            password="testpass123!",
            tenant=self.tenant,
            is_superuser=True,
        )
        self.regular_user = User.objects.create_user(
            email="regular@test.com",
            username="regular",
            password="testpass123!",
            tenant=self.tenant,
        )
        self.tenant_b_user = User.objects.create_user(
            email="tenantb@test.com",
            username="tenantb",
            password="testpass123!",
            tenant=self.tenant_b,
            is_superuser=True,
        )

        # Setup data — Tenant A
        self.buyer = Buyer.objects.create(
            tenant=self.tenant, code="B001", name="Test Buyer",
        )
        self.factory = Factory.objects.create(
            tenant=self.tenant, code="F001", name="Test Factory",
        )
        self.color = ColorCode.objects.create(
            tenant=self.tenant, code="C001", name="Red", hex_code="#FF0000",
        )

        # Setup data — Tenant B
        self.buyer_b = Buyer.objects.create(
            tenant=self.tenant_b, code="B002", name="Tenant B Buyer",
        )
        self.factory_b = Factory.objects.create(
            tenant=self.tenant_b, code="F002", name="Tenant B Factory",
        )

        # Freight forwarders
        self.ff = FreightForwarder.objects.create(
            tenant=self.tenant, name="Maersk", code="MRS",
        )
        self.ff_b = FreightForwarder.objects.create(
            tenant=self.tenant_b, name="DHL", code="DHL",
        )

        # Purchase orders
        self.po = PurchaseOrder.objects.create(
            tenant=self.tenant,
            po_number="PO-1001",
            buyer=self.buyer,
            factory=self.factory,
            po_date=date(2026, 1, 1),
            delivery_date=date(2026, 6, 1),
            quantity=1000,
            unit_price=Decimal("5.00"),
            total_value=Decimal("5000.00"),
        )
        self.po_b = PurchaseOrder.objects.create(
            tenant=self.tenant_b,
            po_number="PO-2001",
            buyer=self.buyer_b,
            factory=self.factory_b,
            po_date=date(2026, 1, 1),
            delivery_date=date(2026, 6, 1),
            quantity=500,
            unit_price=Decimal("10.00"),
            total_value=Decimal("5000.00"),
        )

        # Shipments
        self.shipment = Shipment.objects.create(
            tenant=self.tenant,
            shipment_number="SH-1001",
            purchase_order=self.po,
            status="booking",
            factory=self.factory,
            freight_forwarder=self.ff,
        )
        self.shipment_b = Shipment.objects.create(
            tenant=self.tenant_b,
            shipment_number="SH-2001",
            purchase_order=self.po_b,
            status="booking",
            factory=self.factory_b,
            freight_forwarder=self.ff_b,
        )

        # Shipping documents
        test_file = SimpleUploadedFile(
            "test.pdf", b"test content", content_type="application/pdf",
        )
        self.doc = ShippingDocument.objects.create(
            tenant=self.tenant,
            shipment=self.shipment,
            document_type="bl",
            document_number="BL-001",
            file=test_file,
        )
        test_file_b = SimpleUploadedFile(
            "test2.pdf", b"test content", content_type="application/pdf",
        )
        self.doc_b = ShippingDocument.objects.create(
            tenant=self.tenant_b,
            shipment=self.shipment_b,
            document_type="bl",
            document_number="BL-002",
            file=test_file_b,
        )

        # Default auth: superuser on tenant A
        self.client.force_authenticate(user=self.user)
        self.client.credentials(HTTP_X_TENANT_ID=str(self.tenant.id))

    # ── A. Tenant Data Leak (3) ─────────────────────────────────────────

    def test_shipment_list_tenant_isolation(self):
        """Tenant A can only see its own shipments."""
        url = reverse("shipment-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        results = response.data.get("results", response.data)
        ids = {r["id"] for r in results}
        self.assertIn(str(self.shipment.id), ids)
        self.assertNotIn(str(self.shipment_b.id), ids)

    def test_freight_forwarder_list_tenant_isolation(self):
        """Tenant A can only see its own freight forwarders."""
        url = reverse("freightforwarder-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        results = response.data.get("results", response.data)
        ids = {r["id"] for r in results}
        self.assertIn(str(self.ff.id), ids)
        self.assertNotIn(str(self.ff_b.id), ids)

    def test_shipping_document_tenant_isolation(self):
        """Tenant A can only see its own shipping documents."""
        url = reverse("shippingdocument-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        results = response.data.get("results", response.data)
        ids = {r["id"] for r in results}
        self.assertIn(str(self.doc.id), ids)
        self.assertNotIn(str(self.doc_b.id), ids)

    # ── B. Permission Bypass (4) ────────────────────────────────────────

    def test_transition_requires_permission(self):
        """User without logistics:edit gets 403 on transition."""
        no_perm = User.objects.create_user(
            email="noperm@test.com",
            username="noperm",
            password="testpass123!",
            tenant=self.tenant,
        )
        self.client.force_authenticate(user=no_perm)
        self.client.credentials(HTTP_X_TENANT_ID=str(self.tenant.id))

        url = reverse("shipment-transition", args=[self.shipment.id])
        response = self.client.post(url, {"status": "booked"}, format="json")
        self.assertEqual(response.status_code, 403)

    def test_dashboard_requires_permission(self):
        """User without logistics:view gets 403 on dashboard."""
        no_perm = User.objects.create_user(
            email="noperm2@test.com",
            username="noperm2",
            password="testpass123!",
            tenant=self.tenant,
        )
        self.client.force_authenticate(user=no_perm)
        self.client.credentials(HTTP_X_TENANT_ID=str(self.tenant.id))

        url = reverse("shipment-dashboard")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 403)

    def test_export_requires_permission(self):
        """User without logistics:view gets 403 on export."""
        no_perm = User.objects.create_user(
            email="noperm3@test.com",
            username="noperm3",
            password="testpass123!",
            tenant=self.tenant,
        )
        self.client.force_authenticate(user=no_perm)
        self.client.credentials(HTTP_X_TENANT_ID=str(self.tenant.id))

        url = reverse("shipment-export", args=[self.shipment.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 403)

    def test_manage_permission_allows_all(self):
        """User with logistics:edit permission can transition shipments."""
        perm = Permission.objects.create(module="logistics", action="edit")
        role = Role.objects.create(tenant=self.tenant, name="Logistics Manager")
        RolePermission.objects.create(role=role, permission=perm)
        UserRole.objects.create(user=self.regular_user, role=role)
        cache.clear()

        self.client.force_authenticate(user=self.regular_user)
        self.client.credentials(HTTP_X_TENANT_ID=str(self.tenant.id))

        url = reverse("shipment-transition", args=[self.shipment.id])
        response = self.client.post(url, {"status": "booked"}, format="json")
        self.assertEqual(response.status_code, 200)

    # ── C. Null Factory Crash (3) ───────────────────────────────────────

    def test_export_null_factory(self):
        """Shipment with null factory does not crash the CSV export."""
        ship = Shipment.objects.create(
            tenant=self.tenant,
            shipment_number="SH-NF01",
            purchase_order=self.po,
            status="booking",
            factory=None,
            freight_forwarder=self.ff,
        )
        url = reverse("shipment-export", args=[ship.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"N/A", response.content)

    def test_serializer_null_factory_name(self):
        """ShipmentSerializer returns null for factory_name when factory is null."""
        ship = Shipment.objects.create(
            tenant=self.tenant,
            shipment_number="SH-NF02",
            purchase_order=self.po,
            status="booking",
            factory=None,
            freight_forwarder=self.ff,
        )
        url = reverse("shipment-detail", args=[ship.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data.get("factory_name"))

    def test_serializer_null_freight_forwarder_name(self):
        """ShipmentSerializer returns null for freight_forwarder_name when ff is null."""
        ship = Shipment.objects.create(
            tenant=self.tenant,
            shipment_number="SH-NF03",
            purchase_order=self.po,
            status="booking",
            factory=self.factory,
            freight_forwarder=None,
        )
        url = reverse("shipment-detail", args=[ship.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data.get("freight_forwarder_name"))

    # ── D. Status Validation (3) ────────────────────────────────────────

    def test_transition_invalid_status_returns_400(self):
        """Transitioning from a terminal state returns 400."""
        ship = Shipment.objects.create(
            tenant=self.tenant,
            shipment_number="SH-SV01",
            purchase_order=self.po,
            status="delivered",
            factory=self.factory,
        )
        url = reverse("shipment-transition", args=[ship.id])
        response = self.client.post(url, {"status": "booking"}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_transition_missing_status_returns_400(self):
        """Transition with no status field returns 400 with error message."""
        url = reverse("shipment-transition", args=[self.shipment.id])
        response = self.client.post(url, {}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.data)

    def test_valid_transition_updates_status(self):
        """Valid booking → booked transition updates the shipment status."""
        url = reverse("shipment-transition", args=[self.shipment.id])
        response = self.client.post(url, {"status": "booked"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.shipment.refresh_from_db()
        self.assertEqual(self.shipment.status, "booked")

    # ── E. Dashboard Real Data (2) ──────────────────────────────────────

    def test_dashboard_returns_status_counts(self):
        """Dashboard returns actual status_counts from the database."""
        url = reverse("shipment-dashboard")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        data = response.data
        self.assertIn("status_counts", data)
        self.assertIn("total_shipments", data)
        self.assertEqual(data["total_shipments"], 1)
        self.assertEqual(data["status_counts"]["booking"], 1)

    def test_dashboard_empty_tenant_returns_zeros(self):
        """Dashboard for a tenant with no shipments returns zero counts."""
        self.client.credentials(HTTP_X_TENANT_ID=str(self.tenant_b.id))
        self.client.force_authenticate(user=self.tenant_b_user)

        Shipment.objects.filter(tenant=self.tenant_b).delete()

        url = reverse("shipment-dashboard")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total_shipments"], 0)
        for count in response.data["status_counts"].values():
            self.assertEqual(count, 0)

    # ── F. Document Type Values (2) ─────────────────────────────────────

    def test_document_type_bl_value(self):
        """Document with type='bl' (Bill of Lading) is created correctly."""
        url = reverse("shippingdocument-list")
        file = SimpleUploadedFile("bl.pdf", b"bl content", content_type="application/pdf")
        response = self.client.post(
            url,
            {
                "shipment": str(self.shipment.id),
                "document_type": "bl",
                "document_number": "BL-TEST-001",
                "file": file,
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["document_type"], "bl")

    def test_document_type_ci_value(self):
        """Document with type='ci' (Commercial Invoice) is created correctly."""
        url = reverse("shippingdocument-list")
        file = SimpleUploadedFile("ci.pdf", b"ci content", content_type="application/pdf")
        response = self.client.post(
            url,
            {
                "shipment": str(self.shipment.id),
                "document_type": "ci",
                "document_number": "CI-TEST-001",
                "file": file,
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["document_type"], "ci")

    # ── G. Document Delete (1) ──────────────────────────────────────────

    def test_document_delete(self):
        """Shipping documents can be deleted via the API."""
        url = reverse("shippingdocument-detail", args=[self.doc.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 204)
        self.assertFalse(ShippingDocument.objects.filter(id=self.doc.id).exists())

    # ── H. UUID Format (1) ──────────────────────────────────────────────

    def test_shipment_uuid_format(self):
        """Shipment IDs are valid UUID4 format."""
        url = reverse("shipment-detail", args=[self.shipment.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        parsed = uuid.UUID(response.data["id"])
        self.assertEqual(parsed.version, 4)

    # ── I. Filtering (2) ────────────────────────────────────────────────

    def test_filter_by_freight_forwarder(self):
        """Can filter shipments by freight_forwarder ID."""
        ff2 = FreightForwarder.objects.create(
            tenant=self.tenant, name="MSC", code="MSC",
        )
        Shipment.objects.create(
            tenant=self.tenant,
            shipment_number="SH-FLT01",
            purchase_order=self.po,
            status="booked",
            freight_forwarder=ff2,
        )

        url = reverse("shipment-list")
        response = self.client.get(url, {"freight_forwarder": str(self.ff.id)})
        self.assertEqual(response.status_code, 200)
        results = response.data.get("results", response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], str(self.shipment.id))

    def test_filter_by_status(self):
        """Can filter shipments by status."""
        Shipment.objects.create(
            tenant=self.tenant,
            shipment_number="SH-FLT02",
            purchase_order=self.po,
            status="in_transit",
            factory=self.factory,
        )

        url = reverse("shipment-list")
        response = self.client.get(url, {"status": "in_transit"})
        self.assertEqual(response.status_code, 200)
        results = response.data.get("results", response.data)
        for r in results:
            self.assertEqual(r["status"], "in_transit")
