# Production settings for BHMS
from .base import *

DEBUG = False

# Fail-closed multi-tenancy: header-less or invalid-header requests get
# tenant=None, and tenant-scoped viewsets return empty resultsets.
TENANT_HEADER_REQUIRED = True

# Security settings
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# CORS settings
CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS",
    default="https://bhms.com,https://www.bhms.com",
    cast=lambda v: [s.strip() for s in v.split(",")]
)

# Logging
LOGGING["root"]["level"] = "WARNING"
LOGGING["loggers"]["django"]["level"] = "WARNING"
LOGGING["loggers"]["apps"]["level"] = "INFO"

# Cache timeout
CACHE_MIDDLEWARE_SECONDS = 300
