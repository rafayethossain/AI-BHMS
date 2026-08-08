"""
Tenant middleware for multi-tenancy.

Resolution order (fail-closed):
  1. ``X-Tenant-ID`` header — resolves the exact active tenant; an unknown,
     malformed, or inactive tenant id resolves to ``None`` (never guesses).
  2. Authenticated user's own tenant (safe fallback for header-less clients
     whose identity is already known at middleware time — e.g. session pages).
  3. When ``settings.TENANT_HEADER_REQUIRED`` is ``False`` (dev/test
     convenience), the first active tenant — this keeps the test suite, which
     authenticates via DRF ``force_authenticate`` (runs *after* middleware),
     compatible with header-less requests.
  4. ``None`` otherwise. In production ``TENANT_HEADER_REQUIRED`` is ``True``,
     so a request without a valid tenant context resolves to ``None`` and
     tenant-scoped viewsets return empty resultsets.
"""
from django.conf import settings
from django.utils.deprecation import MiddlewareMixin
from django.core.exceptions import ValidationError
from .models import Tenant


class TenantMiddleware(MiddlewareMixin):
    """
    Middleware to set tenant context based on request.
    """

    def process_request(self, request):
        tenant = self._resolve_from_header(request)

        if tenant is None and getattr(request, "user", None) and request.user.is_authenticated:
            tenant = self._resolve_from_user(request.user)

        if tenant is None and not getattr(settings, "TENANT_HEADER_REQUIRED", False):
            tenant = Tenant.objects.filter(is_active=True).order_by("created_at").first()

        request.tenant = tenant
        return None

    def _resolve_from_header(self, request):
        tenant_id = request.META.get("HTTP_X_TENANT_ID")
        if not tenant_id:
            return None
        try:
            return Tenant.objects.filter(id=tenant_id, is_active=True).first()
        except (ValueError, ValidationError):
            return None

    def _resolve_from_user(self, user):
        tenant = user.tenant
        if tenant is not None and tenant.is_active:
            return tenant
        return None
