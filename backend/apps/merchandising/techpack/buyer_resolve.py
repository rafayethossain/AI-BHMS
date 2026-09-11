"""Setup->Buyers name resolution for the tech-pack customer text."""

from __future__ import annotations


def resolve_buyer_by_name(tenant, name):
    """Return the tenant's Setup->Buyer matching ``name`` (case-insensitive).

    Returns ``None`` when the name is blank or not registered — the caller
    decides between the request buyer fallback and a master-data error.
    """
    if name is None or not str(name).strip():
        return None
    from apps.setup.models import Buyer

    normalized = str(name).strip()
    return (
        Buyer.objects.filter(tenant=tenant, name__iexact=normalized).first()
    )