"""Fix FK relationships between setup entities."""
import os, sys, django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from apps.tenants.models import Tenant
from apps.setup.models import (
    Buyer, Brand, Factory, Vendor, Country, Currency, PaymentTerms, Department, Designation
)

t = Tenant.objects.first()
countries = {c.code: c for c in Country.objects.filter(tenant=t)}
currencies = {c.code: c for c in Currency.objects.filter(tenant=t)}
payment_terms = {p.code: p for p in PaymentTerms.objects.filter(tenant=t)}
departments = {d.code: d for d in Department.objects.filter(tenant=t)}

# ── BUYERS: link country, currency, payment_terms ──
buyer_country_map = {
    "HM": ("SWE", "EUR", "LC-60"),
    "IND": ("ESP", "EUR", "DA60"),
    "GAP": ("USA", "USD", "LC-30"),
    "WAL": ("USA", "USD", "NET60"),
    "TGT": ("USA", "USD", "NET45"),
    "COST": ("USA", "USD", "NET30"),
    "MNG": ("ESP", "EUR", "DA30"),
    "C&A": ("DEU", "EUR", "DA60"),
    "TK": ("USA", "USD", "LC-30"),
    "NIKE": ("USA", "USD", "NET60"),
    "ADD": ("DEU", "EUR", "LC-60"),
    "DEC": ("FRA", "EUR", "NET90"),
    "PRIM": ("IRL", "GBP", "DA60"),
    "LIDL": ("DEU", "EUR", "NET45"),
    "ALDI": ("DEU", "EUR", "NET30"),
}
updated = 0
for buyer in Buyer.objects.filter(tenant=t):
    info = buyer_country_map.get(buyer.code)
    if info:
        cc, cr, pt = info
        buyer.country = countries.get(cc)
        buyer.currency = currencies.get(cr)
        buyer.payment_terms = payment_terms.get(pt)
        buyer.save(update_fields=["country", "currency", "payment_terms"])
        updated += 1
print(f"[OK] Buyers linked: {updated}")

# ── BRANDS: already linked to buyers via seed_setup.py, verify ──
brand_count = Brand.objects.filter(tenant=t, buyer__isnull=False).count()
print(f"[OK] Brands with buyer: {brand_count}/{Brand.objects.filter(tenant=t).count()}")

# ── FACTORIES: link country ──
factory_country_map = {
    "FT-001": "BGD", "FT-002": "BGD", "FT-003": "BGD", "FT-004": "BGD",
    "FT-005": "BGD", "FT-006": "BGD", "FT-007": "BGD", "FT-008": "BGD",
    "FT-009": "BGD", "FT-010": "BGD",
}
updated = 0
for factory in Factory.objects.filter(tenant=t):
    cc = factory_country_map.get(factory.code, "BGD")
    factory.country = countries.get(cc)
    factory.save(update_fields=["country"])
    updated += 1
print(f"[OK] Factories linked: {updated}")

# ── VENDORS: link country, payment_terms ──
vendor_country_map = {
    "VEN-001": ("IND", "DA30"),   # India - Vardhman
    "VEN-002": ("BGD", "NET30"),  # Bangladesh - Noman
    "VEN-003": ("BGD", "NET30"),  # Bangladesh - Orion
    "VEN-004": ("BGD", "DA60"),   # Sri Lanka (use BGD as proxy)
    "VEN-005": ("BGD", "NET15"),  # Bangladesh - A&E Yarns
    "VEN-006": ("CHN", "LC-90"),  # China - Pacific
    "VEN-007": ("BGD", "NET30"),  # Bangladesh - Zipper
    "VEN-008": ("BGD", "NET30"),  # Bangladesh - Star Fashions
    "VEN-009": ("BGD", "NET15"),  # Bangladesh - Fancy Buttons
    "VEN-010": ("CHN", "LC-60"),  # China - Dragon Label
}
updated = 0
for vendor in Vendor.objects.filter(tenant=t):
    info = vendor_country_map.get(vendor.code, ("BGD", "NET30"))
    cc, pt = info
    vendor.country = countries.get(cc)
    vendor.payment_terms = payment_terms.get(pt)
    vendor.save(update_fields=["country", "payment_terms"])
    updated += 1
print(f"[OK] Vendors linked: {updated}")

# ── DESIGNATIONS: link department ──
dept_map = {
    "MD": "ADM", "DMD": "ADM", "GM": "ADM", "AGM": "ADM", "DGM": "ADM",
    "Sr MM": "MKT", "MM": "MKT", "AMM": "MKT", "JMM": "MKT", "ME": "MKT",
    "QAM": "QA", "QCM": "QC", "QC-Insp": "QC",
    "PM": "PRO", "PP": "PRO", "SEW-OP": "Sew", "CUT-Mstr": "CUT",
    "LOG-Mgr": "LOG", "CM-Mgr": "CM", "FIN-Acc": "FIN",
    "HR-Off": "HR", "IT-Mgr": "IT", "ADM-Off": "ADM",
    "Sr-Exp": "EXP", "Exec": "ADM", "Jr-Exec": "ADM",
    "Off-Ass": "ADM", "Helper": "ADM",
}
updated = 0
for desig in Designation.objects.filter(tenant=t):
    dept_code = dept_map.get(desig.code, "ADM")
    desig.department = departments.get(dept_code)
    desig.save(update_fields=["department"])
    updated += 1
print(f"[OK] Designations linked: {updated}")

print("\nFK relationships fixed!")
