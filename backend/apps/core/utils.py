"""
Core utilities for BHMS.
"""
import uuid
from django.utils.text import slugify


def generate_unique_code(prefix, model, length=6):
    """
    Generate unique code with prefix.
    """
    while True:
        code = f"{prefix}-{uuid.uuid4().hex[:length].upper()}"
        if not model.objects.filter(code=code).exists():
            return code


def generate_file_number():
    """
    Generate unique file number.
    """
    return f"FO-{uuid.uuid4().hex[:8].upper()}"


def generate_po_number():
    """
    Generate unique PO number.
    """
    return f"PO-{uuid.uuid4().hex[:8].upper()}"


def generate_style_number():
    """
    Generate unique style number.
    """
    return f"STY-{uuid.uuid4().hex[:6].upper()}"


def calculate_total_value(quantity, unit_price):
    """
    Calculate total value.
    """
    return quantity * unit_price


def get_client_ip(request):
    """
    Get client IP address.
    """
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        ip = x_forwarded_for.split(",")[0]
    else:
        ip = request.META.get("REMOTE_ADDR")
    return ip
