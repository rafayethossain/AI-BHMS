"""
Test settings for BHMS project.
Uses SQLite for fast test execution without PostgreSQL.
"""
from .base import *  # noqa: F401, F403

DEBUG = False

# Use SQLite for tests
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

# Disable password validation for tests
AUTH_PASSWORD_VALIDATORS = []

# Disable throttling for tests
REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"] = []  # noqa: F405
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {}  # noqa: F405

# Disable Celery for tests
CELERY_TASK_ALWAYS_EAGER = True

# Disable caching for tests
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}

# Email backend for tests
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

# Simplified logging for tests
LOGGING = {}

# Disable whitenoise for tests
MIDDLEWARE = [m for m in MIDDLEWARE if "whitenoise" not in m]  # noqa: F405
