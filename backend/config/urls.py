"""
URL configuration for BHMS project.
"""
from django.contrib import admin
from django.http import HttpResponseRedirect
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView


def root_redirect(request):
    return HttpResponseRedirect(settings.FRONTEND_URL)


urlpatterns = [
    # Root redirect to frontend
    path("", root_redirect),

    # Admin
    path("admin/", admin.site.urls),
    
    # API Documentation
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    
    # API Endpoints
    path("api/v1/", include("apps.core.urls")),
    path("api/v1/auth/", include("apps.authentication.urls")),
    path("api/v1/users/", include("apps.users.urls")),
    path("api/v1/setup/", include("apps.setup.urls")),
    path("api/v1/tenants/", include("apps.tenants.urls")),
    path("api/v1/merchandising/", include("apps.merchandising.urls")),
    path("api/v1/commercial/", include("apps.commercial.urls")),
    path("api/v1/production/", include("apps.production.urls")),
    path("api/v1/quality/", include("apps.quality.urls")),
    path("api/v1/logistics/", include("apps.logistics.urls")),
    path("api/v1/reporting/", include("apps.reporting.urls")),
    path("api/v1/monitoring/", include("apps.monitoring.urls")),
    path("api/v1/fabric/", include("apps.fabric.urls")),
    path("api/v1/help/", include("apps.help.urls")),
]

# Debug toolbar
if settings.DEBUG:
    import debug_toolbar
    urlpatterns += [
        path("__debug__/", include(debug_toolbar.urls)),
    ]

# Media files
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
