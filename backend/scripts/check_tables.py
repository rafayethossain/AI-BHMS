import os, sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import django
django.setup()
from django.db import connection
cursor = connection.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
tables = [r[0] for r in cursor.fetchall()]
print("=== EXISTING TABLES ===")
for t in tables:
    print(f"  {t}")
print(f"\nTotal: {len(tables)} tables")

expected = [
    'commercial_bank', 'commercial_lc', 'commercial_lcamendment',
    'commercial_proformainvoice', 'commercial_salescontract',
    'logistics_freightforwarder', 'logistics_shipment', 'logistics_shippingdocument',
    'monitoring_alert', 'monitoring_auditlog', 'monitoring_systemhealth',
    'production_dailyproduction', 'production_productionplan',
    'quality_correctiveaction', 'quality_inspection', 'quality_inspectionitem',
    'reporting_savedreport',
    'users_passwordhistory',
]
print("\n=== MISSING TABLES ===")
for t in expected:
    if t not in tables:
        print(f"  MISSING: {t}")
