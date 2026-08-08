"""
Tests for PO Bulk Import Feature — 7 Tests.

Covers:
  - Basic CSV import with valid rows
  - BOM (\\ufeff) prefix handling
  - Latin-1 encoding fallback
  - Multiple date format parsing
  - Duplicate row grouping
  - Missing required columns error
  - Invalid buyer error with available list
"""
from datetime import date
from decimal import Decimal

from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APITestCase

from apps.merchandising.models import PurchaseOrder, PurchaseOrderItem
from apps.setup.models import Buyer, ColorCode, Factory
from apps.tenants.models import Tenant
from apps.users.models import User


@override_settings(ROOT_URLCONF="config.urls")
class POBulkImportTest(APITestCase):
    """Tests for the PurchaseOrder bulk import CSV endpoint."""

    # ── setUp ────────────────────────────────────────────────────────────

    def setUp(self):
        cache.clear()

        self.tenant = Tenant.objects.create(
            name="Import Tenant", slug="import-tenant", schema_name="import_tenant",
        )
        self.user = User.objects.create_user(
            email="import@test.com",
            username="importer",
            password="testpass123!",
            tenant=self.tenant,
            is_superuser=True,
        )

        self.buyer = Buyer.objects.create(
            tenant=self.tenant, code="B001", name="Test Buyer",
        )
        self.factory = Factory.objects.create(
            tenant=self.tenant, code="F001", name="Test Factory",
        )
        self.color = ColorCode.objects.create(
            tenant=self.tenant, code="C001", name="Red", hex_code="#FF0000",
        )

        self.client.force_authenticate(user=self.user)
        self.client.credentials(HTTP_X_TENANT_ID=str(self.tenant.id))
        self.url = reverse("purchaseorder-bulk-import")

    # ── Helpers ──────────────────────────────────────────────────────────

    def _upload_csv(self, content, filename="test.csv"):
        """Helper: upload CSV content as multipart file."""
        file = SimpleUploadedFile(
            filename, content.encode("utf-8"), content_type="text/csv",
        )
        return self.client.post(self.url, {"file": file}, format="multipart")

    # ── Tests ────────────────────────────────────────────────────────────

    def test_bulk_import_basic_csv(self):
        """Upload CSV with valid rows — verifies POs and line items created."""
        csv_content = (
            "buyer_name,factory_name,po_date,delivery_date,"
            "color_name,size,quantity,unit_price,remarks\n"
            "Test Buyer,Test Factory,2026-01-01,2026-06-01,"
            "Red,L,100,5.00,Test remark\n"
        )
        response = self._upload_csv(csv_content)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["success"], 1)
        self.assertEqual(len(response.data["created_pos"]), 1)
        self.assertTrue(PurchaseOrder.objects.filter(tenant=self.tenant).exists())
        self.assertEqual(
            PurchaseOrderItem.objects.filter(tenant=self.tenant).count(), 1,
        )

    def test_bulk_import_bom_stripped(self):
        """CSV with UTF-8 BOM (\\ufeff) prefix is processed correctly."""
        csv_content = (
            "\ufeffbuyer_name,factory_name,po_date,delivery_date,"
            "color_name,size,quantity,unit_price,remarks\n"
            "Test Buyer,Test Factory,2026-01-01,2026-06-01,"
            "Red,L,100,5.00,\n"
        )
        file = SimpleUploadedFile(
            "bom.csv", csv_content.encode("utf-8"), content_type="text/csv",
        )
        response = self.client.post(self.url, {"file": file}, format="multipart")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["success"], 1)

    def test_bulk_import_latin1_encoding(self):
        """CSV encoded in latin-1 is decoded and processed correctly."""
        csv_content = (
            "buyer_name,factory_name,po_date,delivery_date,"
            "color_name,size,quantity,unit_price,remarks\n"
            "Test Buyer,Test Factory,2026-01-01,2026-06-01,"
            "Red,L,100,5.00,Caf\xe9\n"
        )
        file = SimpleUploadedFile(
            "latin1.csv", csv_content.encode("latin-1"), content_type="text/csv",
        )
        response = self.client.post(self.url, {"file": file}, format="multipart")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["success"], 1)

    def test_bulk_import_date_formats(self):
        """Various date formats (YYYY-MM-DD, M/D/YYYY, DD/MM/YYYY, YYYY/MM/DD) all parse."""
        formats = [
            ("2026-01-15", "2026-07-15"),   # YYYY-MM-DD
            ("1/15/2026", "7/15/2026"),      # M/D/YYYY
            ("15/01/2026", "15/07/2026"),    # DD/MM/YYYY
            ("2026/01/15", "2026/07/15"),    # YYYY/MM/DD
        ]
        for po_date, del_date in formats:
            PurchaseOrder.objects.filter(tenant=self.tenant).delete()
            csv_content = (
                "buyer_name,factory_name,po_date,delivery_date,"
                "color_name,size,quantity,unit_price,remarks\n"
                f"Test Buyer,Test Factory,{po_date},{del_date},"
                "Red,L,100,5.00,\n"
            )
            response = self._upload_csv(csv_content)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(
                response.data["success"], 1,
                f"Failed for dates: {po_date} / {del_date}",
            )

    def test_bulk_import_duplicate_detection(self):
        """Two identical rows in the same CSV are grouped into one PO."""
        csv_content = (
            "buyer_name,factory_name,po_date,delivery_date,"
            "color_name,size,quantity,unit_price,remarks\n"
            "Test Buyer,Test Factory,2026-01-01,2026-06-01,"
            "Red,L,100,5.00,\n"
            "Test Buyer,Test Factory,2026-01-01,2026-06-01,"
            "Red,L,100,5.00,\n"
        )
        response = self._upload_csv(csv_content)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["success"], 1)
        self.assertEqual(len(response.data["created_pos"]), 1)

    def test_bulk_import_missing_required_columns(self):
        """CSV missing required columns returns 400 with descriptive error."""
        csv_content = "buyer_name,factory_name\nTest Buyer,Test Factory\n"
        response = self._upload_csv(csv_content)
        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.data)
        self.assertIn("Missing", response.data["error"])

    def test_bulk_import_invalid_buyer(self):
        """CSV with non-existent buyer returns errors with available buyers listed."""
        csv_content = (
            "buyer_name,factory_name,po_date,delivery_date,"
            "color_name,size,quantity,unit_price,remarks\n"
            "Nonexistent Buyer,Test Factory,2026-01-01,2026-06-01,"
            "Red,L,100,5.00,\n"
        )
        response = self._upload_csv(csv_content)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["success"], 0)
        self.assertGreater(len(response.data["errors"]), 0)
        error_msg = response.data["errors"][0]["error"]
        self.assertIn("Nonexistent Buyer", error_msg)
        self.assertIn("Test Buyer", error_msg)
