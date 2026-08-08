import os, sys, json
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import django
django.setup()

from django.test import Client
from apps.users.models import User

# Login first
c = Client()
user = User.objects.get(email='admin@demo.com')
c.force_login(user)
tenant = user.tenant

def api(method, path, data=None):
    if method == 'GET':
        resp = c.get(path, content_type='application/json')
    elif method == 'POST':
        resp = c.post(path, data=json.dumps(data), content_type='application/json')
    elif method == 'PATCH':
        resp = c.patch(path, data=json.dumps(data), content_type='application/json')
    elif method == 'DELETE':
        resp = c.delete(path, content_type='application/json')
    
    try:
        body = json.loads(resp.content)
    except:
        body = resp.content.decode()[:200]
    return resp.status_code, body

results = []

def test(name, method, path, data=None, expected=200):
    status, body = api(method, path, data)
    ok = status == expected
    results.append((name, ok, status, body if not ok else ''))
    tag = 'OK' if ok else 'FAIL'
    print(f"  [{tag}] {name}: {status}")
    if not ok:
        if isinstance(body, dict):
            print(f"    Error: {json.dumps(body, indent=2)[:500]}")
        else:
            print(f"    Response: {str(body)[:500]}")
    return body if ok else None

print("=== 1. SETUP ===")
b = test("List Buyers", "GET", "/api/v1/setup/buyers/")
b = test("Create Buyer", "POST", "/api/v1/setup/buyers/", {"code": "TB1", "name": "Test Buyer New", "status": "active"})
buyer_id = b['id'] if b else None

f = test("List Factories", "GET", "/api/v1/setup/factories/")
f = test("Create Factory", "POST", "/api/v1/setup/factories/", {"code": "TF1", "name": "Test Factory New", "status": "active"})
factory_id = f['id'] if f else None

test("List Currencies", "GET", "/api/v1/setup/currencies/")
test("List Seasons", "GET", "/api/v1/setup/seasons/")
test("List Countries", "GET", "/api/v1/setup/countries/")
test("List Colors", "GET", "/api/v1/setup/color-codes/")
test("List Departments", "GET", "/api/v1/setup/departments/")
test("List Designations", "GET", "/api/v1/setup/designations/")
test("List Payment Terms", "GET", "/api/v1/setup/payment-terms/")
test("List UOMs", "GET", "/api/v1/setup/uoms/")
test("List Brands", "GET", "/api/v1/setup/brands/")
test("List Vendors", "GET", "/api/v1/setup/vendors/")
test("List Offices", "GET", "/api/v1/setup/offices/")

print("\n=== 2. USERS ===")
test("List Users", "GET", "/api/v1/users/")
test("List Roles", "GET", "/api/v1/users/roles/")

print("\n=== 3. MERCHANDISING ===")
s = test("List Styles", "GET", "/api/v1/merchandising/styles/")
test("List File Openings", "GET", "/api/v1/merchandising/file-openings/")
test("List POs", "GET", "/api/v1/merchandising/purchase-orders/")
test("List BOMs", "GET", "/api/v1/merchandising/boms/")
test("List Costings", "GET", "/api/v1/merchandising/costings/")
test("List TAs", "GET", "/api/v1/merchandising/tas/")
test("TA Calendar", "GET", "/api/v1/merchandising/tas/calendar/")
test("TA Alerts", "GET", "/api/v1/merchandising/tas/alerts/")
test("Costing Export", "GET", "/api/v1/merchandising/costings/export/")
test("PO Export", "GET", "/api/v1/merchandising/purchase-orders/export/")

print("\n=== 4. COMMERCIAL ===")
test("List LCs", "GET", "/api/v1/commercial/lcs/")
test("List LC Amendments", "GET", "/api/v1/commercial/lc-amendments/")
test("List Banks", "GET", "/api/v1/commercial/banks/")
test("List PIs", "GET", "/api/v1/commercial/proforma-invoices/")
test("List Sales Contracts", "GET", "/api/v1/commercial/sales-contracts/")

print("\n=== 5. PRODUCTION ===")
test("List Plans", "GET", "/api/v1/production/plans/")
test("List Daily Reports", "GET", "/api/v1/production/daily-reports/")
test("Production Dashboard", "GET", "/api/v1/production/plans/dashboard/")

print("\n=== 6. QUALITY ===")
test("List Inspections", "GET", "/api/v1/quality/inspections/")
test("List Inspection Items", "GET", "/api/v1/quality/inspection-items/")
test("List Corrective Actions", "GET", "/api/v1/quality/corrective-actions/")

print("\n=== 7. LOGISTICS ===")
test("List Shipments", "GET", "/api/v1/logistics/shipments/")
test("List Shipping Docs", "GET", "/api/v1/logistics/shipping-documents/")
test("List Freight Forwarders", "GET", "/api/v1/logistics/freight-forwarders/")
test("Shipment Dashboard", "GET", "/api/v1/logistics/shipments/dashboard/")

print("\n=== 8. MONITORING ===")
test("List Audit Logs", "GET", "/api/v1/monitoring/audit-logs/")
test("List Health", "GET", "/api/v1/monitoring/health/")
test("List Alerts", "GET", "/api/v1/monitoring/alerts/")
test("Alert Summary", "GET", "/api/v1/monitoring/alerts/summary/")
test("Run Health Check", "POST", "/api/v1/monitoring/health/run_checks/")

print("\n=== 9. REPORTING ===")
test("List Reports", "GET", "/api/v1/reporting/reports/")

print("\n=== 10. AUTH ===")
test("Verify Token", "GET", "/api/v1/auth/token/verify/")

# Summary
passed = sum(1 for _, ok, _, _ in results if ok)
failed = sum(1 for _, ok, _, _ in results if not ok)
print(f"\n=== RESULTS: {passed} passed, {failed} failed out of {len(results)} total ===")
if failed:
    print("\nFailed tests:")
    for name, ok, status, body in results:
        if not ok:
            print(f"  {name}: {status} - {str(body)[:200]}")
