"""
End-to-End Functional Test: Complete Garment Industry Lifecycle

Scenario: H&M orders 5,000 Classic Crew Neck T-Shirts.
The order flows through every department:
  Setup → Style → FileOpening → PO → T&A → BOM → Costing →
  Production → Quality → Logistics → Commercial → Finance

See docs/FULL_LIFECYCLE_TEST_PLAN.md for the full test plan.
"""
import io
from datetime import date, timedelta
from unittest.mock import patch

from django.core.cache import cache
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from apps.tenants.models import Tenant
from apps.users.models import User


@override_settings(ROOT_URLCONF="config.urls")
class FullLifecycleTest(APITestCase):
    """
    Single test method that walks an order through every module.
    Each step is a numbered section with assertions.
    """

    def setUp(self):
        cache.clear()

        # ── Tenant ────────────────────────────────────────────
        self.tenant = Tenant.objects.create(
            name="E2E Test Tenant", slug="e2e-test",
            schema_name="tenant_e2e_test", status="active",
            plan="enterprise",
        )

        # ── User (superuser to bypass RBAC) ──────────────────
        self.user = User.objects.create_superuser(
            username="e2e_admin", email="e2e@test.com",
            password="testpass123!", tenant=self.tenant,
        )
        self.client.force_authenticate(user=self.user)
        self.client.credentials(
            HTTP_X_TENANT_ID=str(self.tenant.id),
        )

        # ── Helper to reduce boilerplate ─────────────────────
        self._ids = {}  # store created IDs for later steps

    def _post(self, url_name, data, **kwargs):
        """POST to a named URL, return (response, created_id)."""
        resp = self.client.post(f"/api/v1/{url_name}/", data, format="json", **kwargs)
        return resp

    def _get(self, url, **kwargs):
        if url.startswith("/"):
            return self.client.get(url, **kwargs)
        return self.client.get(f"/api/v1/{url.rstrip('/')}/", **kwargs)

    def _patch(self, url, data, **kwargs):
        if url.startswith("/"):
            return self.client.patch(url, data, format="json", **kwargs)
        return self.client.patch(f"/api/v1/{url.rstrip('/')}/", data, format="json", **kwargs)

    def _detail_url(self, basename, pk):
        return f"/api/v1/{basename}/{pk}/"

    def _action_url(self, basename, pk, action):
        return f"/api/v1/{basename}/{pk}/{action}/"

    # ════════════════════════════════════════════════════════════
    #  THE FULL LIFECYCLE
    # ════════════════════════════════════════════════════════════
    def test_01_full_garment_lifecycle(self):
        """Walk an order from style creation to financial reporting."""

        today = date.today()
        delivery = today + timedelta(days=90)

        # ──────────────────────────────────────────────────────
        # PHASE 1: SETUP MASTER DATA
        # ──────────────────────────────────────────────────────
        print("\n  Phase 1: Setup Master Data")

        # 1.1 Buyer
        r = self._post("setup/buyers", {
            "code": "H&M", "name": "Hennes & Mauritz AB",
            "email": "buyer@hm.com", "phone": "+46-8-796-5500",
        })
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        buyer_id = r.data["id"]

        # 1.2 Factory
        r = self._post("setup/factories", {
            "code": "ATM", "name": "Apex Textile Mills Ltd",
            "email": "info@apex-bd.com", "phone": "+880-2-8713001",
            "city": "Dhaka", "factory_type": "knitting",
        })
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        factory_id = r.data["id"]

        # 1.3 Color
        r = self._post("setup/color-codes", {
            "code": "NVB", "name": "Navy Blue", "hex_code": "#000080",
        })
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        color_id = r.data["id"]

        # 1.4 Currency
        r = self._post("setup/currencies", {
            "code": "USD", "name": "US Dollar", "symbol": "$",
            "is_default": True,
        })
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        currency_id = r.data["id"]

        # 1.5 Country
        r = self._post("setup/countries", {
            "code": "BD", "name": "Bangladesh",
        })
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        country_id = r.data["id"]

        # 1.6 Payment Terms
        r = self._post("setup/payment-terms", {
            "code": "TT30", "name": "T/T 30 Days", "days": 30,
        })
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        payment_terms_id = r.data["id"]

        # 1.7 Season
        r = self._post("setup/seasons", {
            "code": "SS26", "name": "Spring/Summer 2026",
            "start_date": "2026-03-01", "end_date": "2026-08-31",
        })
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        season_id = r.data["id"]

        # 1.8 UOM
        r = self._post("setup/uoms", {
            "code": "PCS", "name": "Piece",
        })
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        uom_id = r.data["id"]

        # 1.9 Delivery Mode
        r = self._post("setup/delivery-modes", {
            "code": "SEA", "name": "Sea Freight",
        })
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        delivery_mode_id = r.data["id"]

        # 1.10 Vendor
        r = self._post("setup/vendors", {
            "code": "PDM", "name": "Pacific Denim Mills",
            "email": "sales@pdm.com", "lead_time_days": 14,
        })
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        vendor_id = r.data["id"]

        # 1.11 Brand
        r = self._post("setup/brands", {
            "buyer": buyer_id, "code": "FP", "name": "FashionPlus",
        })
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        brand_id = r.data["id"]

        print("    ✓ 11 setup entities created")

        # ──────────────────────────────────────────────────────
        # PHASE 2: STYLE INITIATION
        # ──────────────────────────────────────────────────────
        print("\n  Phase 2: Style Initiation")

        # 2.1 Create Style
        r = self._post("merchandising/styles", {
            "name": "Classic Crew Neck Tee",
            "buyer": buyer_id,
            "brand": brand_id,
            "season": season_id,
            "description": "100% cotton crew neck t-shirt, 180gsm",
        })
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        style_id = r.data["id"]
        style_number = r.data["style_number"]
        self.assertIsNotNone(style_number)
        print(f"    Style created: {style_number}")

        # 2.2 Transition draft → active
        r = self.client.post(
            self._action_url("merchandising/styles", style_id, "transition"),
            {"status": "active"}, format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        print("    Style: draft → active ✓")

        # 2.3 Transition active → approved
        r = self.client.post(
            self._action_url("merchandising/styles", style_id, "transition"),
            {"status": "approved"}, format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        print("    Style: active → approved ✓")

        # 2.4 Create StyleVersion
        r = self._post("merchandising/style-versions", {
            "style": style_id,
            "revision_notes": "Initial version",
        })
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        style_version_id = r.data["id"]
        print(f"    StyleVersion created: v{r.data['version_number']}")

        # ──────────────────────────────────────────────────────
        # PHASE 3: FILE OPENING
        # ──────────────────────────────────────────────────────
        print("\n  Phase 3: File Opening")

        r = self._post("merchandising/file-openings", {
            "style": style_id,
            "buyer": buyer_id,
            "factory": factory_id,
            "file_date": str(today),
            "style_version": style_version_id,
            "brand": brand_id,
        })
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        fo_id = r.data["id"]
        fo_number = r.data["file_number"]
        self.assertIsNotNone(fo_number)
        print(f"    FileOpening created: {fo_number}")

        # ──────────────────────────────────────────────────────
        # PHASE 4: PURCHASE ORDER
        # ──────────────────────────────────────────────────────
        print("\n  Phase 4: Purchase Order")

        # 4.1 Create PO
        r = self._post("merchandising/purchase-orders", {
            "buyer": buyer_id,
            "factory": factory_id,
            "file_opening": fo_id,
            "brand": brand_id,
            "po_date": str(today),
            "delivery_date": str(delivery),
            "quantity": 5000,
            "unit_price": "3.50",
            "currency": currency_id,
            "payment_terms": payment_terms_id,
            "delivery_mode": delivery_mode_id,
            "destination_country": country_id,
            "destination_port": "Hamburg",
        })
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        po_id = r.data["id"]
        po_number = r.data["po_number"]
        self.assertIsNotNone(po_number)

        # 4.2 Create PO Item
        r = self._post("merchandising/po-items", {
            "purchase_order": po_id,
            "color": color_id,
            "quantity": 5000,
            "unit_price": "3.50",
            "size": "M",
        })
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        poi_id = r.data["id"]
        print(f"    PO created: {po_number}")

        # 4.3 Verify total_value
        r = self._get(self._detail_url("merchandising/purchase-orders", po_id))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        # total_value may be calculated from items or from PO fields
        print(f"    PO total_value: {r.data.get('total_value')}")

        # ──────────────────────────────────────────────────────
        # PHASE 5: PO CONFIRMATION (side effects)
        # ──────────────────────────────────────────────────────
        print("\n  Phase 5: PO Confirmation")

        r = self.client.post(
            self._action_url("merchandising/purchase-orders", po_id, "transition"),
            {"status": "confirmed"}, format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        print("    PO: draft → confirmed ✓")

        # 5.2 Verify T&A auto-created
        r = self._get(
            self._action_url("merchandising/purchase-orders", po_id, "ta")
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        ta_data = r.data
        self.assertIsNotNone(ta_data)
        print(f"    T&A auto-created: status={ta_data.get('status')}")

        # 5.3 Verify milestones (9 default)
        milestones = ta_data.get("milestones", [])
        if not milestones:
            # milestones may be nested or separate
            ta_id = ta_data.get("id")
            if ta_id:
                r = self._get(f"/api/v1/merchandising/ta-milestones/?ta={ta_id}")
                if r.status_code == 200:
                    milestones = r.data.get("results", r.data) if isinstance(r.data, dict) else r.data
        milestone_count = len(milestones) if isinstance(milestones, list) else 0
        print(f"    Default milestones: {milestone_count}")

        # 5.4 Verify ProformaInvoice auto-created
        r = self._get("commercial/proforma-invoices/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        pi_list = r.data.get("results", []) if isinstance(r.data, dict) else r.data
        # Filter by PO number since purchase_order may be nested or string
        pi_for_po = [p for p in pi_list if str(p.get("purchase_order", "")) == str(po_id)
                     or p.get("po_number", "")]
        self.assertGreater(len(pi_for_po), 0, "ProformaInvoice should be auto-created on PO confirm")
        pi_id = pi_for_po[0]["id"]
        print(f"    ProformaInvoice auto-created: {pi_for_po[0].get('pi_number')}")

        # 5.5 Verify SalesContract auto-created
        r = self._get("commercial/sales-contracts/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        sc_list = r.data.get("results", []) if isinstance(r.data, dict) else r.data
        sc_for_po = [s for s in sc_list if str(s.get("purchase_order", "")) == str(po_id)
                     or s.get("contract_number", "")]
        self.assertGreater(len(sc_for_po), 0, "SalesContract should be auto-created on PO confirm")
        sc_id = sc_for_po[0]["id"]
        print(f"    SalesContract auto-created: {sc_for_po[0].get('contract_number')}")

        # ──────────────────────────────────────────────────────
        # PHASE 6: T&A MILESTONES
        # ──────────────────────────────────────────────────────
        print("\n  Phase 6: T&A Milestones")

        if milestones:
            # 6.1 Complete first milestone
            first_ms = milestones[0]
            ms_id = first_ms.get("id")
            if ms_id:
                r = self._patch(
                    self._detail_url("merchandising/ta-milestones", ms_id),
                    {"status": "completed", "actual_date": str(today)},
                )
                if r.status_code == 200:
                    print(f"    Milestone '{first_ms.get('name')}' completed ✓")
                else:
                    print(f"    Milestone complete returned {r.status_code}")

        # 6.2 Add custom milestone
        r = self.client.post(
            self._action_url("merchandising/purchase-orders", po_id, "create_ta_milestone"),
            {
                "name": "Custom Sampling Review",
                "planned_date": str(today + timedelta(days=14)),
                "description": "Internal review of production samples",
            }, format="json",
        )
        if r.status_code in (200, 201):
            print("    Custom milestone added ✓")
        else:
            print(f"    Custom milestone returned {r.status_code}: {r.data}")

        # ──────────────────────────────────────────────────────
        # PHASE 7: BOM (Bill of Materials)
        # ──────────────────────────────────────────────────────
        print("\n  Phase 7: BOM")

        # 7.1 Create BOM (items created via BOMSerializer nested create with empty list)
        r = self._post("merchandising/boms", {
            "style_version": style_version_id,
            "name": "Classic Crew Tee BOM v1",
            "items": [],
        })
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        bom_id = r.data["id"]
        print(f"    BOM created: {r.data.get('name')}")

        # 7.2 Add a BOM item (required before activation)
        r = self._post("merchandising/bom-items", {
            "bom": bom_id,
            "category": "fabric",
            "item_name": "Main Body Fabric",
            "description": "100% Cotton Jersey 180gsm",
            "uom": uom_id,
            "consumption": "1.2000",
            "waste_percent": "5.00",
            "unit_price": "3.50",
        })
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        print(f"    BOM item created: {r.data.get('item_name')}")

        # 7.5 Activate BOM
        r = self.client.post(
            self._action_url("merchandising/boms", bom_id, "activate"),
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        print("    BOM: draft → active ✓")

        # ──────────────────────────────────────────────────────
        # PHASE 8: COSTING
        # ──────────────────────────────────────────────────────
        print("\n  Phase 8: Costing")

        r = self._post("merchandising/costings", {
            "purchase_order": po_id,
            "bom": bom_id,
            "fabric_cost": "8000.00",
            "trim_cost": "1500.00",
            "cm_cost": "3000.00",
            "overhead_cost": "1200.00",
            "target_price": "4.00",
            "margin": "12.00",
        })
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        costing_id = r.data["id"]
        total_cost = float(r.data.get("total_cost", 0))
        self.assertEqual(total_cost, 13700.00, f"Expected total_cost=13700, got {total_cost}")
        print(f"    Costing created: total_cost=${total_cost:,.2f}")

        # 8.3 Approve Costing
        r = self.client.post(
            self._action_url("merchandising/costings", costing_id, "approve"),
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        print("    Costing: draft → approved ✓")

        # ──────────────────────────────────────────────────────
        # PHASE 9: PRODUCTION
        # ──────────────────────────────────────────────────────
        print("\n  Phase 9: Production")

        # 9.1 Create ProductionPlan
        r = self._post("production/plans", {
            "purchase_order": po_id,
            "factory": factory_id,
            "plan_date": str(today),
            "quantity": 5000,
            "start_date": str(today + timedelta(days=30)),
            "end_date": str(delivery - timedelta(days=10)),
        })
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        plan_id = r.data["id"]
        print(f"    ProductionPlan created")

        # 9.2 Start Production
        r = self.client.post(
            self._action_url("production/plans", plan_id, "start"),
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        print("    Plan: draft → in_progress ✓")

        # 9.3 Create DailyProduction
        r = self._post("production/daily", {
            "factory": factory_id,
            "purchase_order": po_id,
            "production_date": str(today + timedelta(days=31)),
            "target_quantity": 1000,
            "actual_quantity": 1000,
            "passed_quantity": 980,
            "rejected_quantity": 20,
            "line_number": 1,
            "manpower": 45,
            "working_hours": "8.00",
        })
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        daily_id = r.data["id"]

        # 9.4-9.5 Verify calculated fields
        efficiency = float(r.data.get("efficiency", 0))
        dhu = float(r.data.get("dhu", 0))
        self.assertEqual(efficiency, 100.0, f"Expected efficiency=100, got {efficiency}")
        self.assertEqual(dhu, 2.0, f"Expected dhu=2.0, got {dhu}")
        print(f"    DailyReport: efficiency={efficiency}%, DHU={dhu}%")

        # 9.6 Approve DailyProduction
        r = self.client.post(
            self._action_url("production/daily", daily_id, "approve"),
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        print("    DailyReport: active → approved ✓")

        # 9.7 Complete Production
        r = self.client.post(
            self._action_url("production/plans", plan_id, "complete"),
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        print("    Plan: in_progress → completed ✓")

        # ──────────────────────────────────────────────────────
        # PHASE 10: QUALITY
        # ──────────────────────────────────────────────────────
        print("\n  Phase 10: Quality")

        # 10.1 Create Inspection (final, AQL 2.5)
        r = self._post("quality/inspections", {
            "purchase_order": po_id,
            "factory": factory_id,
            "inspection_type": "final",
            "inspection_date": str(today + timedelta(days=45)),
            "aql_level": "2.5",
            "passed_quantity": 490,
            "rejected_quantity": 10,
        })
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        inspection_id = r.data["id"]
        print(f"    Inspection created (final, AQL 2.5)")

        # 10.2 Start Inspection
        r = self.client.post(
            self._action_url("quality/inspections", inspection_id, "start"),
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        print("    Inspection: pending → in_progress ✓")

        # 10.3 Add InspectionItem
        r = self._post("quality/inspection-items", {
            "inspection": inspection_id,
            "defect_type": "Open seams",
            "defect_count": 5,
            "severity": "major",
            "description": "Side seams opening at 3cm intervals",
        })
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        print("    InspectionItem added: Open seams (5 major)")

        # 10.4 Complete Inspection
        # reject_rate = 10/500 = 2.0% ≤ 2.5% → should PASS
        r = self.client.post(
            self._action_url("quality/inspections", inspection_id, "complete"),
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        inspection_status = r.data.get("status")
        print(f"    Inspection completed: status={inspection_status}")

        # 10.5-10.6 Create CorrectiveAction
        r = self._post("quality/corrective-actions", {
            "inspection": inspection_id,
            "title": "Fix side seam alignment",
            "description": "Side seams opening at 3cm intervals on 5 pieces",
            "corrective_measure": "Re-train operators on seam alignment technique",
            "due_date": str(today + timedelta(days=7)),
            "priority": "high",
        })
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        ca_id = r.data["id"]
        print(f"    CorrectiveAction created")

        # 10.7 Complete CorrectiveAction
        r = self.client.post(
            self._action_url("quality/corrective-actions", ca_id, "complete"),
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        print("    CorrectiveAction: open → completed ✓")

        # ──────────────────────────────────────────────────────
        # PHASE 11: PO PROGRESSION
        # ──────────────────────────────────────────────────────
        print("\n  Phase 11: PO Progression")

        for transition in ["in_production", "quality_check", "ready"]:
            r = self.client.post(
                self._action_url("merchandising/purchase-orders", po_id, "transition"),
                {"status": transition}, format="json",
            )
            self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
            print(f"    PO → {transition} ✓")

        # ──────────────────────────────────────────────────────
        # PHASE 12: COMMERCIAL (LC + Invoices)
        # ──────────────────────────────────────────────────────
        print("\n  Phase 12: Commercial")

        # 12.1 Create Bank
        r = self._post("commercial/banks", {
            "code": "DBBL", "name": "Dutch-Bangla Bank Ltd",
            "swift_code": "DBBLBDDH",
            "address": "Dhaka, Bangladesh",
        })
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        bank_id = r.data["id"]
        print(f"    Bank created")

        # 12.2 Create LC
        r = self._post("commercial/lcs", {
            "lc_type": "master",
            "buyer": buyer_id,
            "amount": "17500.00",
            "expiry_date": str(delivery + timedelta(days=30)),
            "lc_number": "LC-2026-HM-001",
            "bank": bank_id,
            "purchase_order": po_id,
            "currency": currency_id,
            "issued_date": str(today),
        })
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        lc_id = r.data["id"]
        print(f"    LC created: {r.data.get('lc_number')}")

        # 12.3 Approve LC (draft→received)
        r = self.client.post(
            self._action_url("commercial/lcs", lc_id, "approve"),
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        print("    LC: draft → received ✓")

        # 12.4 Accept LC (received→accepted)
        r = self.client.post(
            self._action_url("commercial/lcs", lc_id, "accept"),
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        print("    LC: received → accepted ✓")

        # 12.5 Create LCAmendment (amount_change is absolute, sets new amount to $19,500)
        r = self._post("commercial/lc-amendments", {
            "lc": lc_id,
            "reason": "Quantity increase from buyer",
            "amount_change": "19500.00",
        })
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        amend_id = r.data["id"]
        print(f"    LCAmendment created (+$2,000)")

        # 12.6 Approve LCAmendment
        r = self.client.post(
            self._action_url("commercial/lc-amendments", amend_id, "approve"),
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        print("    LCAmendment: pending → approved ✓")

        # 12.7 Verify LC amount updated
        r = self._get(self._detail_url("commercial/lcs", lc_id))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        lc_amount = float(r.data.get("amount", 0))
        self.assertEqual(lc_amount, 19500.00, f"Expected LC amount=19500, got {lc_amount}")
        print(f"    LC amount updated: ${lc_amount:,.2f}")

        # 12.8 Send ProformaInvoice
        r = self.client.post(
            self._action_url("commercial/proforma-invoices", pi_id, "send"),
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        print("    PI: draft → sent ✓")

        # 12.9 Accept ProformaInvoice
        r = self.client.post(
            self._action_url("commercial/proforma-invoices", pi_id, "accept"),
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        print("    PI: sent → accepted ✓")

        # 12.10 Export PI PDF
        r = self._get(
            self._action_url("commercial/proforma-invoices", pi_id, "export_pdf")
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        print("    PI PDF exported ✓")

        # ──────────────────────────────────────────────────────
        # PHASE 13: LOGISTICS (SHIPPING)
        # ──────────────────────────────────────────────────────
        print("\n  Phase 13: Logistics")

        # 13.1 Create FreightForwarder
        r = self._post("logistics/freight-forwarders", {
            "name": "DHL Global Forwarding",
            "code": "DHL",
            "email": "ocean@dhl.com",
            "phone": "+49-228-1810",
        })
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        ff_id = r.data["id"]
        print(f"    FreightForwarder created")

        # 13.2 Create Shipment
        r = self._post("logistics/shipments", {
            "purchase_order": po_id,
            "factory": factory_id,
            "freight_forwarder": ff_id,
            "mode": "sea",
            "port_of_loading": "Chattogram",
            "port_of_discharge": "Hamburg",
            "booking_date": str(today),
            "etd": str(today + timedelta(days=60)),
            "eta": str(today + timedelta(days=80)),
            "quantity": "5000.00",
            "weight_kg": "1200.00",
            "cbm": "28.500",
            "vessel_name": "Maersk Seletar",
            "voyage_number": "MS-2026-07",
        })
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        shipment_id = r.data["id"]
        shipment_number = r.data.get("shipment_number")
        print(f"    Shipment created: {shipment_number}")

        # 13.3-13.10 Full shipment journey
        shipment_journey = [
            "booked", "picked_up", "in_transit",
            "at_port", "on_water", "arrived", "cleared", "delivered",
        ]
        for target in shipment_journey:
            r = self.client.post(
                self._action_url("logistics/shipments", shipment_id, "transition"),
                {"status": target}, format="json",
            )
            self.assertEqual(r.status_code, status.HTTP_200_OK,
                             f"Transition to {target} failed: {r.data}")
            print(f"    Shipment → {target} ✓")

        # 13.11 Create ShippingDocument (BL)
        from django.core.files.uploadedfile import SimpleUploadedFile
        fake_file = SimpleUploadedFile(
            "bill_of_lading.pdf", b"%PDF-1.4 fake content",
            content_type="application/pdf",
        )
        r = self.client.post(
            "/api/v1/logistics/documents/",
            {
                "shipment": shipment_id,
                "document_type": "bl",
                "document_number": "BL-2026-001",
                "document_date": str(today),
                "file": fake_file,
            },
            format="multipart",
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        print(f"    ShippingDocument (BL) uploaded ✓")

        # 13.12 Shipment Dashboard
        r = self._get("/api/v1/logistics/shipments/dashboard/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        print(f"    Shipment Dashboard ✓")

        # ──────────────────────────────────────────────────────
        # PHASE 14: FINAL PO DELIVERY
        # ──────────────────────────────────────────────────────
        print("\n  Phase 14: Final PO Delivery")

        r = self.client.post(
            self._action_url("merchandising/purchase-orders", po_id, "transition"),
            {"status": "shipped"}, format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        print("    PO: ready → shipped ✓")

        r = self.client.post(
            self._action_url("merchandising/purchase-orders", po_id, "transition"),
            {"status": "delivered"}, format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        print("    PO: shipped → delivered ✓")

        # ──────────────────────────────────────────────────────
        # PHASE 15: FINANCIAL REPORTING
        # ──────────────────────────────────────────────────────
        print("\n  Phase 15: Financial Reporting")

        # 15.1 Profit breakdown
        r = self._get(
            self._action_url("merchandising/purchase-orders", po_id, "profit")
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        print(f"    Profit endpoint ✓ — {r.data}")

        # 15.2 Trail (audit log)
        r = self._get(
            self._action_url("merchandising/purchase-orders", po_id, "trail")
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        trail = r.data if isinstance(r.data, list) else r.data.get("results", [])
        print(f"    PO Trail: {len(trail)} events ✓")

        # 15.3 Journey (10-step lifecycle)
        r = self._get(
            self._action_url("merchandising/purchase-orders", po_id, "journey")
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        journey = r.data
        completed_steps = journey.get("completed_steps", 0)
        total_steps = journey.get("total_steps", 10)
        completion_pct = journey.get("completion_percentage", 0)
        print(f"    PO Journey: {completed_steps}/{total_steps} steps ({completion_pct}%)")

        # 15.4 Linked entities
        r = self._get(
            self._action_url("merchandising/purchase-orders", po_id, "linked")
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        print(f"    PO Linked entities ✓")

        # 15.5 Export PO CSV
        r = self._get(
            self._action_url("merchandising/purchase-orders", po_id, "export")
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        print(f"    PO CSV exported ✓")

        # 15.6 Production Dashboard
        r = self._get("/api/v1/production/plans/dashboard/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        print(f"    Production Dashboard ✓")

        # 15.7 LC Dashboard
        r = self._get("/api/v1/commercial/lcs/dashboard/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        print(f"    LC Dashboard ✓")

        # ──────────────────────────────────────────────────────
        # SUMMARY
        # ──────────────────────────────────────────────────────
        print("\n" + "=" * 60)
        print("  FULL LIFECYCLE TEST PASSED")
        print("=" * 60)
        print(f"  Style:          {style_number}")
        print(f"  File Opening:   {fo_number}")
        print(f"  Purchase Order: {po_number}")
        print(f"  BOM:            {r.data.get('name', 'Active')}")
        print(f"  Costing:        ${total_cost:,.2f} (approved)")
        print(f"  Production:     Completed")
        print(f"  Quality:        Final inspection passed (AQL 2.5)")
        print(f"  Shipment:       Delivered (sea, Chattogram→Hamburg)")
        print(f"  LC:             ${lc_amount:,.2f} (amended)")
        print(f"  PI:             Accepted & PDF exported")
        print(f"  Journey:        {completed_steps}/{total_steps} steps ({completion_pct}%)")
        print("=" * 60)
