"""
Development settings for BHMS project.
"""
from .base import *  # noqa: F401, F403

# Development specific settings
DEBUG = True

# Use SQLite for local development (no PostgreSQL needed)
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# Add debug toolbar
INSTALLED_APPS += [  # noqa: F405
    "debug_toolbar",
]

MIDDLEWARE += [  # noqa: F405
    "debug_toolbar.middleware.DebugToolbarMiddleware",
]

# Debug toolbar
INTERNAL_IPS = ["127.0.0.1", "localhost"]

# CORS
CORS_ALLOW_ALL_ORIGINS = True

# Cache - use in-memory for local dev (no Redis needed)
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}

# Email Backend (Console for development)
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Simplified static file serving for development
STATICFILES_STORAGE = "django.contrib.staticfiles.storage.StaticFilesStorage"

# Disable password validation for local dev convenience
AUTH_PASSWORD_VALIDATORS = []

# Create logs directory if it doesn't exist
import os  # noqa: E402
from pathlib import Path  # noqa: E402

LOGS_DIR = Path(__file__).resolve().parent.parent.parent / "logs"
os.makedirs(LOGS_DIR, exist_ok=True)
