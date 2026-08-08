"""
Tenant isolation tests — fail-closed tenant resolution and queryset scoping.
Covers Phase 0.1: no cross-tenant data leak, no silently-defaulting to the
first active tenant, and tenant-scoped viewsets returning empty (not `.all()`)
when no tenant context is resolved.
"""
import uuid
from datetime import date

from django.test import RequestFactory, TestCase, override_settings
from rest_framework.test import APIRequestFactory

from apps.tenants.middleware import TenantMiddleware
from apps.tenants.models import Tenant
from apps.users.models import User


def _tenant(name, slug, schema, **kwargs):
    defaults = {"status": "active", "is_active": True}
    defaults.update(kwargs)
    return Tenant.objects.create(name=name, slug=slug, schema_name=schema, **defaults)


class TenantMiddlewareResolutionTest(TestCase):
    """The middleware must resolve tenant deterministically and never guess."""

    def setUp(self):
        self.factory = RequestFactory()
        self.middleware = TenantMiddleware(lambda request: None)
        self.tenant_a = _tenant("Alpha Co", "alpha", "tenant_alpha")
        self.tenant_b = _tenant("Beta Co", "beta", "tenant_beta")
        self.user_a = User.objects.create_user(
            username="usera", email="a@test.com",
            password="testpass123!@#", tenant=self.tenant_a, status="active",
        )

    def _request(self, headers=None, user=None):
        request = self.factory.get("/api/v1/test/")
        for key, value in (headers or {}).items():
            request.META[key] = value
        if user is not None:
            request.user = user
        return request

    @override_settings(TENANT_HEADER_REQUIRED=True)
    def test_no_header_anonymous_resolves_none(self):
        request = self._request()
        self.middleware.process_request(request)
        self.assertIsNone(request.tenant)

    @override_settings(TENANT_HEADER_REQUIRED=False)
    def test_no_header_anonymous_dev_falls_back_to_first_tenant(self):
        request = self._request()
        self.middleware.process_request(request)
        self.assertEqual(request.tenant, self.tenant_a)

    def test_valid_header_resolves_tenant(self):
        request = self._request({"HTTP_X_TENANT_ID": str(self.tenant_a.id)})
        self.middleware.process_request(request)
        self.assertEqual(request.tenant, self.tenant_a)

    @override_settings(TENANT_HEADER_REQUIRED=True)
    def test_unknown_tenant_id_resolves_none(self):
        request = self._request({"HTTP_X_TENANT_ID": str(uuid.uuid4())})
        self.middleware.process_request(request)
        self.assertIsNone(request.tenant)

    @override_settings(TENANT_HEADER_REQUIRED=True)
    def test_malformed_tenant_id_resolves_none(self):
        request = self._request({"HTTP_X_TENANT_ID": "not-a-uuid"})
        self.middleware.process_request(request)
        self.assertIsNone(request.tenant)

    @override_settings(TENANT_HEADER_REQUIRED=True)
    def test_inactive_tenant_resolves_none(self):
        inactive = _tenant("Gone Co", "gone", "tenant_gone", status="inactive", is_active=False)
        request = self._request({"HTTP_X_TENANT_ID": str(inactive.id)})
        self.middleware.process_request(request)
        self.assertIsNone(request.tenant)

    def test_no_header_authenticated_uses_user_tenant(self):
        request = self._request(user=self.user_a)
        self.middleware.process_request(request)
        self.assertEqual(request.tenant, self.tenant_a)

    @override_settings(TENANT_HEADER_REQUIRED=True)
    def test_no_header_authenticated_tenantless_user_resolves_none(self):
        tenantless = User.objects.create_user(
            username="tl", email="tl@test.com", password="testpass123!@#", status="active",
        )
        request = self._request(user=tenantless)
        self.middleware.process_request(request)
        self.assertIsNone(request.tenant)

    def test_header_wins_over_user_tenant(self):
        request = self._request({"HTTP_X_TENANT_ID": str(self.tenant_b.id)}, user=self.user_a)
        self.middleware.process_request(request)
        self.assertEqual(request.tenant, self.tenant_b)

    def test_invalid_header_falls_back_to_user_tenant(self):
        request = self._request({"HTTP_X_TENANT_ID": str(uuid.uuid4())}, user=self.user_a)
        self.middleware.process_request(request)
        self.assertEqual(request.tenant, self.tenant_a)


class TenantQuerysetFailClosedTest(TestCase):
    """Tenant-scoped viewsets must never return `.all()` when tenant is None."""

    def setUp(self):
        from apps.merchandising.models import PurchaseOrder
        from apps.setup.models import Buyer, Factory, Currency, Country

        self.tenant_a = _tenant("Alpha Co", "alpha", "tenant_alpha")
        self.tenant_b = _tenant("Beta Co", "beta", "tenant_beta")

        def seed(tenant, po_number, country_code, currency_code):
            buyer = Buyer.objects.create(tenant=tenant, name="Buyer", code=f"B-{country_code}")
            factory = Factory.objects.create(tenant=tenant, name="Factory", code=f"F-{country_code}")
            currency = Currency.objects.create(tenant=tenant, name=currency_code, code=currency_code)
            country = Country.objects.create(tenant=tenant, name=f"Country {country_code}", code=country_code)
            return PurchaseOrder.objects.create(
                tenant=tenant, po_number=po_number, buyer=buyer, factory=factory,
                po_date=date(2026, 1, 1), delivery_date=date(2026, 6, 30),
                quantity=100, unit_price=5, total_value=500,
                currency=currency, destination_country=country, status="draft",
            )

        self.po_a = seed(self.tenant_a, "PO-A-1", "US", "USD")
        self.po_b = seed(self.tenant_b, "PO-B-1", "GB", "GBP")

    def _queryset(self, tenant):
        from apps.merchandising.views import PurchaseOrderViewSet

        factory = APIRequestFactory().get("/api/v1/merchandising/purchase-orders/")
        factory.tenant = tenant
        viewset = PurchaseOrderViewSet()
        viewset.request = factory
        viewset.action = "list"
        return viewset.get_queryset()

    def test_no_tenant_returns_empty_not_all(self):
        qs = self._queryset(None)
        self.assertEqual(qs.count(), 0)

    def test_tenant_scopes_to_own_tenant_only(self):
        qs = self._queryset(self.tenant_a)
        self.assertEqual(list(qs.values_list("po_number", flat=True)), ["PO-A-1"])
        self.assertNotIn(self.po_b.id, list(qs.values_list("id", flat=True)))

    def test_tenant_b_isolated_from_a(self):
        qs = self._queryset(self.tenant_b)
        self.assertEqual(list(qs.values_list("po_number", flat=True)), ["PO-B-1"])
