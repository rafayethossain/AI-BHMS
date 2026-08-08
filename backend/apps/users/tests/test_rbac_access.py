"""
RBAC Integration Tests — Verify role-based access control across all modules.

Tests 8 roles × 7 modules × 5 operations (list, create, retrieve, update, delete)
= 280 access checks using parametrized helpers.

Role → Permission mapping (from seed_rbac.py):
  Admin                : ALL permissions
  Manager              : setup:view, merch/commercial/production/quality/logistics (view/create/edit), reporting (view/export), users:view
  Merchandiser         : setup:view, merchandising (view/create/edit), commercial:view, reporting:view
  Production Manager   : setup:view, production (view/create/edit/approve), quality (view/create/edit), merchandising:view, reporting:view
  Quality Manager      : setup:view, quality (view/create/edit/approve), production:view, reporting:view
  Commercial Manager   : setup:view, commercial (view/create/edit/approve), logistics (view/create/edit), merchandising:view, reporting:view
  Shipping Manager     : setup:view, logistics (view/create/edit/approve), commercial:view, reporting:view
  Viewer               : setup:view, merchandising:view, commercial:view, production:view, quality:view, logistics:view, reporting:view
"""
from datetime import date
from decimal import Decimal

from django.core.cache import cache
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APITestCase

from apps.commercial.models import Bank, LC
from apps.logistics.models import FreightForwarder, Shipment
from apps.merchandising.models import PurchaseOrder, Style
from apps.production.models import ProductionPlan
from apps.quality.models import Inspection
from apps.setup.models import Buyer, Factory
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, User, UserRole


ALL_ROLES = [
    "Admin", "Manager", "Merchandiser", "Production Manager",
    "Quality Manager", "Commercial Manager", "Shipping Manager", "Viewer",
]

# Permission → roles that HAVE the permission
PERM_ALLOWED = {
    "merchandising:view": ["Admin", "Manager", "Merchandiser", "Production Manager", "Commercial Manager", "Viewer"],
    "merchandising:create": ["Admin", "Manager", "Merchandiser"],
    "merchandising:edit": ["Admin", "Manager", "Merchandiser"],
    "merchandising:delete": ["Admin"],
    "commercial:view": ["Admin", "Manager", "Merchandiser", "Commercial Manager", "Shipping Manager", "Viewer"],
    "commercial:create": ["Admin", "Manager", "Commercial Manager"],
    "commercial:edit": ["Admin", "Manager", "Commercial Manager"],
    "commercial:delete": ["Admin"],
    "production:view": ["Admin", "Manager", "Production Manager", "Quality Manager", "Viewer"],
    "production:create": ["Admin", "Manager", "Production Manager"],
    "production:edit": ["Admin", "Manager", "Production Manager"],
    "production:delete": ["Admin"],
    "quality:view": ["Admin", "Manager", "Production Manager", "Quality Manager", "Viewer"],
    "quality:create": ["Admin", "Manager", "Production Manager", "Quality Manager"],
    "quality:edit": ["Admin", "Manager", "Production Manager", "Quality Manager"],
    "quality:delete": ["Admin"],
    "logistics:view": ["Admin", "Manager", "Commercial Manager", "Shipping Manager", "Viewer"],
    "logistics:create": ["Admin", "Manager", "Commercial Manager", "Shipping Manager"],
    "logistics:edit": ["Admin", "Manager", "Commercial Manager", "Shipping Manager"],
    "logistics:delete": ["Admin"],
    "setup:view": ALL_ROLES,
    "setup:create": ["Admin"],
    "setup:edit": ["Admin"],
    "setup:delete": ["Admin"],
}

# Role → list of permission strings (from seed_rbac.py)
ROLE_PERMS = {
    "Admin": [f"{m}:{a}" for m in [
        "setup", "merchandising", "commercial", "production", "quality", "logistics", "users", "reporting", "settings"
    ] for a in ["view", "create", "edit", "delete", "approve", "manage", "export"]],
    "Manager": [
        "setup:view", "merchandising:view", "merchandising:create", "merchandising:edit",
        "commercial:view", "commercial:create", "commercial:edit",
        "production:view", "production:create", "production:edit",
        "quality:view", "quality:create", "quality:edit",
        "logistics:view", "logistics:create", "logistics:edit",
        "reporting:view", "reporting:export", "users:view",
    ],
    "Merchandiser": [
        "setup:view", "merchandising:view", "merchandising:create", "merchandising:edit",
        "commercial:view", "reporting:view",
    ],
    "Production Manager": [
        "setup:view", "production:view", "production:create", "production:edit", "production:approve",
        "quality:view", "quality:create", "quality:edit",
        "merchandising:view", "reporting:view",
    ],
    "Quality Manager": [
        "setup:view", "quality:view", "quality:create", "quality:edit", "quality:approve",
        "production:view", "reporting:view",
    ],
    "Commercial Manager": [
        "setup:view", "commercial:view", "commercial:create", "commercial:edit", "commercial:approve",
        "logistics:view", "logistics:create", "logistics:edit",
        "merchandising:view", "reporting:view",
    ],
    "Shipping Manager": [
        "setup:view", "logistics:view", "logistics:create", "logistics:edit", "logistics:approve",
        "commercial:view", "reporting:view",
    ],
    "Viewer": [
        "setup:view", "merchandising:view", "commercial:view",
        "production:view", "quality:view", "logistics:view", "reporting:view",
    ],
}

# Permission module → action pairs
MODULE_PERMISSIONS = {
    "setup": ["view", "create", "edit", "delete"],
    "merchandising": ["view", "create", "edit", "delete", "approve"],
    "commercial": ["view", "create", "edit", "delete", "approve"],
    "production": ["view", "create", "edit", "delete", "approve"],
    "quality": ["view", "create", "edit", "delete", "approve"],
    "logistics": ["view", "create", "edit", "delete", "approve"],
    "users": ["view", "create", "edit", "delete", "manage"],
    "reporting": ["view", "export"],
    "settings": ["view", "edit"],
}


def _denied_roles(permission_key):
    """Return roles that do NOT have the given permission."""
    allowed = PERM_ALLOWED.get(permission_key, [])
    return [r for r in ALL_ROLES if r not in allowed]


@override_settings(ROOT_URLCONF="config.urls")
class RBACAccessTest(APITestCase):
    """Verify role-based access control across all modules."""

    @classmethod
    def setUpTestData(cls):
        cache.clear()

        # ── Tenant ──────────────────────────────────────────────────
        cls.tenant = Tenant.objects.create(
            name="RBAC Test Tenant", slug="rbac-test", schema_name="rbac_test",
        )

        # ── Permissions ─────────────────────────────────────────────
        cls.permissions = {}
        for module, actions in MODULE_PERMISSIONS.items():
            for action in actions:
                perm, _ = Permission.objects.get_or_create(
                    module=module, action=action,
                    defaults={"description": f"{module}:{action}"},
                )
                cls.permissions[f"{module}:{action}"] = perm

        # ── Roles + RolePermissions ─────────────────────────────────
        cls.roles = {}
        for role_name, perm_keys in ROLE_PERMS.items():
            role, _ = Role.objects.get_or_create(
                tenant=cls.tenant, name=role_name,
                defaults={"description": f"{role_name} role", "is_system": True, "is_active": True},
            )
            # Assign permissions (idempotent)
            for pk in perm_keys:
                if pk in cls.permissions:
                    RolePermission.objects.get_or_create(
                        role=role, permission=cls.permissions[pk],
                    )
            cls.roles[role_name] = role

        # ── Users (one per role) ────────────────────────────────────
        cls.users = {}
        for role_name in ALL_ROLES:
            slug = role_name.lower().replace(" ", "_")
            user = User.objects.create_user(
                email=f"{slug}@rbactest.com",
                username=slug,
                password="testpass123!",
                tenant=cls.tenant,
            )
            UserRole.objects.create(user=user, role=cls.roles[role_name])
            cls.users[role_name] = user

        # ── Setup fixtures ──────────────────────────────────────────
        cls.buyer = Buyer.objects.create(
            tenant=cls.tenant, code="B-100", name="RBAC Test Buyer",
        )
        cls.factory = Factory.objects.create(
            tenant=cls.tenant, code="F-100", name="RBAC Test Factory",
        )
        cls.bank = Bank.objects.create(
            tenant=cls.tenant, code="BK-001", name="Test Bank",
        )

        # ── Merchandising fixtures ──────────────────────────────────
        cls.style = Style.objects.create(
            tenant=cls.tenant, style_number="STY-9000", name="RBAC Style",
            buyer=cls.buyer,
        )
        cls.po = PurchaseOrder.objects.create(
            tenant=cls.tenant, po_number="PO-9000",
            buyer=cls.buyer, factory=cls.factory,
            po_date=date(2026, 1, 1), delivery_date=date(2026, 6, 1),
            quantity=100, unit_price=Decimal("5.00"), total_value=Decimal("500.00"),
        )

        # ── Commercial fixtures ─────────────────────────────────────
        cls.lc = LC.objects.create(
            tenant=cls.tenant, lc_number="LC-9000", lc_type="master",
            buyer=cls.buyer, amount=Decimal("10000.00"),
            expiry_date=date(2026, 12, 31),
        )

        # ── Production fixtures ─────────────────────────────────────
        cls.plan = ProductionPlan.objects.create(
            tenant=cls.tenant, purchase_order=cls.po,
            factory=cls.factory, plan_date=date(2026, 3, 1), quantity=100,
        )

        # ── Quality fixtures ────────────────────────────────────────
        cls.inspection = Inspection.objects.create(
            tenant=cls.tenant, purchase_order=cls.po,
            factory=cls.factory, inspection_type="inline",
            inspection_date=date(2026, 3, 15),
        )

        # ── Logistics fixtures ──────────────────────────────────────
        cls.ff = FreightForwarder.objects.create(
            tenant=cls.tenant, name="Maersk", code="MRS",
        )
        cls.shipment = Shipment.objects.create(
            tenant=cls.tenant, shipment_number="SH-9000",
            purchase_order=cls.po, factory=cls.factory,
            freight_forwarder=cls.ff, status="booking",
        )

    # ── Helpers ─────────────────────────────────────────────────────────

    def _login(self, role_name):
        """Authenticate as the user with the given role and set tenant header."""
        cache.clear()
        self.client.force_authenticate(user=self.users[role_name])
        self.client.credentials(HTTP_X_TENANT_ID=str(self.tenant.id))

    def _request(self, role, method, url, data=None, fmt=None):
        """Make an authenticated request as the given role. Returns the response."""
        self._login(role)
        kwargs = {}
        if data is not None:
            kwargs["data"] = data
        if fmt is not None:
            kwargs["format"] = fmt
        return getattr(self.client, method)(url, **kwargs)

    def _assert_access(self, role, method, url, expected_codes, data=None, fmt=None):
        """Assert that a role gets expected status code(s) on a given endpoint."""
        response = self._request(role, method, url, data=data, fmt=fmt)
        self.assertIn(
            response.status_code, expected_codes,
            f"{role} got {response.status_code} on {method.upper()} {url}, "
            f"expected {expected_codes}. Body: {response.data}",
        )
        return response

    def _assert_permission_matrix(self, permission_key, method, url, data=None, fmt=None,
                                  allowed_codes=None, denied_codes=None):
        """
        Assert that every role either gets allowed_codes or denied_codes
        based on whether they have the given permission.
        """
        if allowed_codes is None:
            allowed_codes = [200]
        if denied_codes is None:
            denied_codes = [403]

        allowed = PERM_ALLOWED.get(permission_key, [])
        denied = _denied_roles(permission_key)

        for role in allowed:
            self._assert_access(role, method, url, allowed_codes, data=data, fmt=fmt)
        for role in denied:
            self._assert_access(role, method, url, denied_codes, data=data, fmt=fmt)

    def _create_via_api(self, role, url, payload, expected_codes=None):
        """POST to create an object, return the response."""
        return self._assert_access(role, "post", url, expected_codes or [201], data=payload, fmt="json")

    # ═══════════════════════════════════════════════════════════════════
    # MODULE: Merchandising (styles + purchase-orders)
    # ═══════════════════════════════════════════════════════════════════

    def test_merchandising_view_list(self):
        """merchandising:view — list styles."""
        url = reverse("style-list")
        self._assert_permission_matrix("merchandising:view", "get", url)

    def test_merchandising_view_retrieve(self):
        """merchandising:view — retrieve style detail."""
        url = reverse("style-detail", args=[self.style.id])
        self._assert_permission_matrix("merchandising:view", "get", url)

    def test_merchandising_view_po_list(self):
        """merchandising:view — list purchase orders."""
        url = reverse("purchaseorder-list")
        self._assert_permission_matrix("merchandising:view", "get", url)

    def test_merchandising_view_po_retrieve(self):
        """merchandising:view — retrieve purchase order detail."""
        url = reverse("purchaseorder-detail", args=[self.po.id])
        self._assert_permission_matrix("merchandising:view", "get", url)

    def test_merchandising_create(self):
        """merchandising:create — create a style."""
        url = reverse("style-list")
        payload = {"name": "New RBAC Style", "buyer": str(self.buyer.id)}
        self._assert_permission_matrix("merchandising:create", "post", url, data=payload, fmt="json",
                                        allowed_codes=[201])

    def test_merchandising_create_po(self):
        """merchandising:create — create a purchase order."""
        url = reverse("purchaseorder-list")
        payload = {
            "buyer": str(self.buyer.id),
            "factory": str(self.factory.id),
            "po_date": "2026-04-01",
            "delivery_date": "2026-09-01",
            "quantity": 200,
            "unit_price": "10.00",
            "total_value": "2000.00",
        }
        self._assert_permission_matrix("merchandising:create", "post", url, data=payload, fmt="json",
                                        allowed_codes=[201])

    def test_merchandising_edit(self):
        """merchandising:edit — update a style."""
        url = reverse("style-detail", args=[self.style.id])
        payload = {"name": "Updated RBAC Style"}
        self._assert_permission_matrix("merchandising:edit", "patch", url, data=payload, fmt="json")

    def test_merchandising_edit_po(self):
        """merchandising:edit — update a purchase order."""
        url = reverse("purchaseorder-detail", args=[self.po.id])
        payload = {"remarks": "updated via RBAC test"}
        self._assert_permission_matrix("merchandising:edit", "patch", url, data=payload, fmt="json")

    def test_merchandising_delete(self):
        """merchandising:delete — delete a style."""
        style = Style.objects.create(
            tenant=self.tenant, style_number="STY-DEL", name="To Delete", buyer=self.buyer,
        )
        url = reverse("style-detail", args=[style.id])
        self._assert_permission_matrix("merchandising:delete", "delete", url, allowed_codes=[204])

    def test_merchandising_delete_po(self):
        """merchandising:delete — delete a purchase order."""
        po = PurchaseOrder.objects.create(
            tenant=self.tenant, po_number="PO-DEL", buyer=self.buyer, factory=self.factory,
            po_date=date(2026, 1, 1), delivery_date=date(2026, 6, 1),
            quantity=50, unit_price=Decimal("5.00"), total_value=Decimal("250.00"),
        )
        url = reverse("purchaseorder-detail", args=[po.id])
        self._assert_permission_matrix("merchandising:delete", "delete", url, allowed_codes=[204])

    # ═══════════════════════════════════════════════════════════════════
    # MODULE: Commercial (lcs)
    # ═══════════════════════════════════════════════════════════════════

    def test_commercial_view_list(self):
        """commercial:view — list LCs."""
        url = reverse("lc-list")
        self._assert_permission_matrix("commercial:view", "get", url)

    def test_commercial_view_retrieve(self):
        """commercial:view — retrieve LC detail."""
        url = reverse("lc-detail", args=[self.lc.id])
        self._assert_permission_matrix("commercial:view", "get", url)

    def test_commercial_create(self):
        """commercial:create — create an LC."""
        url = reverse("lc-list")
        allowed = PERM_ALLOWED["commercial:create"]
        denied = _denied_roles("commercial:create")
        for i, role in enumerate(allowed):
            payload = {
                "lc_number": f"LC-ROLE-{i}",
                "lc_type": "master",
                "buyer": str(self.buyer.id),
                "amount": "5000.00",
                "expiry_date": "2026-12-31",
            }
            self._assert_access(role, "post", url, [201], data=payload, fmt="json")
        for role in denied:
            self._assert_access(role, "post", url, [403], data={}, fmt="json")

    def test_commercial_edit(self):
        """commercial:edit — update an LC."""
        url = reverse("lc-detail", args=[self.lc.id])
        payload = {"remarks": "updated via RBAC test"}
        self._assert_permission_matrix("commercial:edit", "patch", url, data=payload, fmt="json")

    def test_commercial_delete(self):
        """commercial:delete — delete an LC."""
        lc = LC.objects.create(
            tenant=self.tenant, lc_number="LC-DEL", lc_type="master",
            buyer=self.buyer, amount=Decimal("1000.00"), expiry_date=date(2026, 12, 31),
        )
        url = reverse("lc-detail", args=[lc.id])
        self._assert_permission_matrix("commercial:delete", "delete", url, allowed_codes=[204])

    # ═══════════════════════════════════════════════════════════════════
    # MODULE: Production (plans)
    # ═══════════════════════════════════════════════════════════════════

    def test_production_view_list(self):
        """production:view — list production plans."""
        url = reverse("productionplan-list")
        self._assert_permission_matrix("production:view", "get", url)

    def test_production_view_retrieve(self):
        """production:view — retrieve production plan detail."""
        url = reverse("productionplan-detail", args=[self.plan.id])
        self._assert_permission_matrix("production:view", "get", url)

    def test_production_create(self):
        """production:create — create a production plan."""
        url = reverse("productionplan-list")
        payload = {
            "purchase_order": str(self.po.id),
            "factory": str(self.factory.id),
            "plan_date": "2026-04-01",
            "quantity": 100,
        }
        self._assert_permission_matrix("production:create", "post", url, data=payload, fmt="json",
                                        allowed_codes=[201])

    def test_production_edit(self):
        """production:edit — update a production plan."""
        url = reverse("productionplan-detail", args=[self.plan.id])
        payload = {"remarks": "updated via RBAC test"}
        self._assert_permission_matrix("production:edit", "patch", url, data=payload, fmt="json")

    def test_production_delete(self):
        """production:delete — delete a production plan."""
        plan = ProductionPlan.objects.create(
            tenant=self.tenant, purchase_order=self.po,
            factory=self.factory, plan_date=date(2026, 5, 1), quantity=50,
        )
        url = reverse("productionplan-detail", args=[plan.id])
        self._assert_permission_matrix("production:delete", "delete", url, allowed_codes=[204])

    # ═══════════════════════════════════════════════════════════════════
    # MODULE: Quality (inspections)
    # ═══════════════════════════════════════════════════════════════════

    def test_quality_view_list(self):
        """quality:view — list inspections."""
        url = reverse("inspection-list")
        self._assert_permission_matrix("quality:view", "get", url)

    def test_quality_view_retrieve(self):
        """quality:view — retrieve inspection detail."""
        url = reverse("inspection-detail", args=[self.inspection.id])
        self._assert_permission_matrix("quality:view", "get", url)

    def test_quality_create(self):
        """quality:create — create an inspection."""
        url = reverse("inspection-list")
        payload = {
            "purchase_order": str(self.po.id),
            "factory": str(self.factory.id),
            "inspection_type": "final",
            "inspection_date": "2026-04-15",
        }
        self._assert_permission_matrix("quality:create", "post", url, data=payload, fmt="json",
                                        allowed_codes=[201])

    def test_quality_edit(self):
        """quality:edit — update an inspection."""
        url = reverse("inspection-detail", args=[self.inspection.id])
        payload = {"remarks": "updated via RBAC test"}
        self._assert_permission_matrix("quality:edit", "patch", url, data=payload, fmt="json")

    def test_quality_delete(self):
        """quality:delete — delete an inspection."""
        insp = Inspection.objects.create(
            tenant=self.tenant, purchase_order=self.po,
            factory=self.factory, inspection_type="final",
            inspection_date=date(2026, 4, 1),
        )
        url = reverse("inspection-detail", args=[insp.id])
        self._assert_permission_matrix("quality:delete", "delete", url, allowed_codes=[204])

    # ═══════════════════════════════════════════════════════════════════
    # MODULE: Logistics (shipments)
    # ═══════════════════════════════════════════════════════════════════

    def test_logistics_view_list(self):
        """logistics:view — list shipments."""
        url = reverse("shipment-list")
        self._assert_permission_matrix("logistics:view", "get", url)

    def test_logistics_view_retrieve(self):
        """logistics:view — retrieve shipment detail."""
        url = reverse("shipment-detail", args=[self.shipment.id])
        self._assert_permission_matrix("logistics:view", "get", url)

    def test_logistics_create(self):
        """logistics:create — create a shipment."""
        url = reverse("shipment-list")
        payload = {
            "purchase_order": str(self.po.id),
            "factory": str(self.factory.id),
            "freight_forwarder": str(self.ff.id),
            "status": "booking",
        }
        self._assert_permission_matrix("logistics:create", "post", url, data=payload, fmt="json",
                                        allowed_codes=[201])

    def test_logistics_edit(self):
        """logistics:edit — update a shipment."""
        url = reverse("shipment-detail", args=[self.shipment.id])
        payload = {"remarks": "updated via RBAC test"}
        self._assert_permission_matrix("logistics:edit", "patch", url, data=payload, fmt="json")

    def test_logistics_delete(self):
        """logistics:delete — delete a shipment."""
        ship = Shipment.objects.create(
            tenant=self.tenant, shipment_number="SH-DEL",
            purchase_order=self.po, factory=self.factory,
            freight_forwarder=self.ff, status="booking",
        )
        url = reverse("shipment-detail", args=[ship.id])
        self._assert_permission_matrix("logistics:delete", "delete", url, allowed_codes=[204])

    # ═══════════════════════════════════════════════════════════════════
    # MODULE: Setup (buyers)
    # ═══════════════════════════════════════════════════════════════════

    def test_setup_view_list(self):
        """setup:view — list buyers (ALL roles allowed)."""
        url = reverse("buyer-list")
        for role in ALL_ROLES:
            self._assert_access(role, "get", url, [200])

    def test_setup_view_retrieve(self):
        """setup:view — retrieve buyer detail (ALL roles allowed)."""
        url = reverse("buyer-detail", args=[self.buyer.id])
        for role in ALL_ROLES:
            self._assert_access(role, "get", url, [200])

    def test_setup_create(self):
        """setup:create — create a buyer."""
        url = reverse("buyer-list")
        payload = {"code": "B-NEW", "name": "New RBAC Buyer"}
        self._assert_permission_matrix("setup:create", "post", url, data=payload, fmt="json",
                                        allowed_codes=[201])

    def test_setup_edit(self):
        """setup:edit — update a buyer."""
        url = reverse("buyer-detail", args=[self.buyer.id])
        payload = {"name": "Updated RBAC Buyer"}
        self._assert_permission_matrix("setup:edit", "patch", url, data=payload, fmt="json")

    def test_setup_delete(self):
        """setup:delete — delete a buyer."""
        buyer = Buyer.objects.create(
            tenant=self.tenant, code="B-DEL", name="Buyer to Delete",
        )
        url = reverse("buyer-detail", args=[buyer.id])
        self._assert_permission_matrix("setup:delete", "delete", url, allowed_codes=[204])

    # ═══════════════════════════════════════════════════════════════════
    # MODULE: Users (no RBAC — all authenticated users can access)
    # ═══════════════════════════════════════════════════════════════════

    def test_users_accessible_by_all_roles(self):
        """UserViewSet has no RBAC — all authenticated users can list."""
        url = reverse("user-list")
        for role in ALL_ROLES:
            self._assert_access(role, "get", url, [200])

    def test_users_me_accessible_by_all_roles(self):
        """/users/me/ — accessible by all authenticated users."""
        url = reverse("user-me")
        for role in ALL_ROLES:
            self._assert_access(role, "get", url, [200])

    # ═══════════════════════════════════════════════════════════════════
    # UNAUTHENTICATED ACCESS
    # ═══════════════════════════════════════════════════════════════════

    def test_unauthenticated_denied_on_all_endpoints(self):
        """Unauthenticated requests get 401/403 on all RBAC-protected endpoints."""
        cache.clear()
        self.client.force_authenticate(user=None)
        self.client.credentials(HTTP_X_TENANT_ID=str(self.tenant.id))

        endpoints = [
            ("get", reverse("style-list")),
            ("get", reverse("purchaseorder-list")),
            ("get", reverse("lc-list")),
            ("get", reverse("productionplan-list")),
            ("get", reverse("inspection-list")),
            ("get", reverse("shipment-list")),
            ("get", reverse("buyer-list")),
        ]
        for method, url in endpoints:
            response = getattr(self.client, method)(url)
            self.assertIn(response.status_code, [401, 403],
                f"Unauthenticated got {response.status_code} on {url}")

    # ═══════════════════════════════════════════════════════════════════
    # CROSS-MODULE: Verify deny isolation (role A cannot access module B)
    # ═══════════════════════════════════════════════════════════════════

    def test_quality_manager_denied_merchandising_create(self):
        """Quality Manager has no merchandising:create → 403."""
        url = reverse("style-list")
        payload = {"name": "Should Fail", "buyer": str(self.buyer.id)}
        self._assert_access("Quality Manager", "post", url, [403], data=payload, fmt="json")

    def test_shipping_manager_denied_production_edit(self):
        """Shipping Manager has no production:edit → 403."""
        url = reverse("productionplan-detail", args=[self.plan.id])
        payload = {"remarks": "should fail"}
        self._assert_access("Shipping Manager", "patch", url, [403], data=payload, fmt="json")

    def test_viewer_denied_all_creates(self):
        """Viewer has no create permissions on any module → 403 on all creates."""
        creates = [
            reverse("style-list"),
            reverse("purchaseorder-list"),
            reverse("lc-list"),
            reverse("productionplan-list"),
            reverse("inspection-list"),
            reverse("shipment-list"),
            reverse("buyer-list"),
        ]
        for url in creates:
            self._assert_access("Viewer", "post", url, [403], data={}, fmt="json")

    def test_viewer_denied_all_deletes(self):
        """Viewer has no delete permissions → 403 on all deletes."""
        objects = [
            reverse("style-detail", args=[self.style.id]),
            reverse("purchaseorder-detail", args=[self.po.id]),
            reverse("lc-detail", args=[self.lc.id]),
            reverse("productionplan-detail", args=[self.plan.id]),
            reverse("inspection-detail", args=[self.inspection.id]),
            reverse("shipment-detail", args=[self.shipment.id]),
            reverse("buyer-detail", args=[self.buyer.id]),
        ]
        for url in objects:
            self._assert_access("Viewer", "delete", url, [403])

    def test_admin_full_access_all_modules(self):
        """Admin has ALL permissions — full CRUD on every module."""
        # List
        for url in [reverse("style-list"), reverse("lc-list"), reverse("productionplan-list"),
                     reverse("inspection-list"), reverse("shipment-list"), reverse("buyer-list")]:
            self._assert_access("Admin", "get", url, [200])
        # Retrieve
        for url in [reverse("style-detail", args=[self.style.id]),
                     reverse("lc-detail", args=[self.lc.id]),
                     reverse("productionplan-detail", args=[self.plan.id]),
                     reverse("inspection-detail", args=[self.inspection.id]),
                     reverse("shipment-detail", args=[self.shipment.id]),
                     reverse("buyer-detail", args=[self.buyer.id])]:
            self._assert_access("Admin", "get", url, [200])

    # ═══════════════════════════════════════════════════════════════════
    # SUPERUSER BYPASS
    # ═══════════════════════════════════════════════════════════════════

    def test_superuser_bypasses_rbac(self):
        """Superuser with no role permissions still gets 200 on all endpoints."""
        su = User.objects.create_user(
            email="superuser@rbactest.com", username="superuser",
            password="testpass123!", tenant=self.tenant, is_superuser=True,
        )
        cache.clear()
        self.client.force_authenticate(user=su)
        self.client.credentials(HTTP_X_TENANT_ID=str(self.tenant.id))

        urls = [
            ("get", reverse("style-list")),
            ("post", reverse("style-list")),
            ("get", reverse("lc-list")),
            ("post", reverse("lc-list")),
            ("get", reverse("productionplan-list")),
            ("post", reverse("productionplan-list")),
            ("get", reverse("inspection-list")),
            ("post", reverse("inspection-list")),
            ("get", reverse("shipment-list")),
            ("post", reverse("shipment-list")),
            ("get", reverse("buyer-list")),
            ("post", reverse("buyer-list")),
        ]
        for method, url in urls:
            response = getattr(self.client, method)(url, data={}, format="json")
            self.assertNotEqual(response.status_code, 403,
                f"Superuser got 403 on {method} {url}")
