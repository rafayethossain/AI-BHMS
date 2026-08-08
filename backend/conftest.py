"""
pytest-django configuration for BHMS.
"""
import django
from django.conf import settings


def pytest_configure():
    """Configure Django settings for pytest."""
    import os
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.test")
    django.setup()


# Import shared fixtures so pytest discovers them
pytest_plugins = ["tests.conftest.fixtures"]
