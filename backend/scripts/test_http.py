import os, sys, json, urllib.request, urllib.error
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

BASE = "http://localhost:8000/api/v1"

results = []

def api(method, path, data=None, token=None):
    url = f"{BASE}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        raw = resp.read().decode()
        resp_body = json.loads(raw) if raw.strip() else {"detail": "success"}
        return resp.status, resp_body
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            resp_body = json.loads(raw) if raw.strip() else {"detail": "success"}
        except:
            resp_body = raw[:500]
        return e.code, resp_body
    except Exception as e:
        return 0, str(e)

def test(name, method, path, data=None, token=None, expected_ok=True):
    status, body = api(method, path, data, token)
    ok = (200 <= status < 300) == expected_ok
    results.append((name, ok, status))
    tag = 'OK' if ok else 'FAIL'
    print(f"  [{tag}] {name}: {status}")
    if not ok:
        if isinstance(body, dict):
            err = body.get('error', body.get('detail', body))
            print(f"    Error: {json.dumps(err, indent=2)[:300]}")
        else:
            print(f"    Response: {str(body)[:300]}")
    return body if ok else None

# 1. Login
print("=== AUTH ===")
login_data = {"email": "admin@demo.com", "password": "admin123"}
login_resp = api("POST", "/auth/login/", login_data)
if login_resp[0] == 200:
    token = login_resp[1]["access"]
    print(f"  [OK] Login: 200 | token={token[:20]}...")
else:
    print(f"  [FAIL] Login: {login_resp[0]} | {login_resp[1]}")
    sys.exit(1)

# 2. Setup
print("\n=== SETUP ===")
test("List Buyers", "GET", "/setup/buyers/", token=token)
b = test("Create Buyer", "POST", "/setup/buyers/", {"code": "TB1", "name": "Test Buyer CRUD", "status": "active"}, token=token)
buyer_id = b['id'] if b and isinstance(b, dict) else None
if buyer_id:
    test("Get Buyer", "GET", f"/setup/buyers/{buyer_id}/", token=token)
    test("Delete Buyer", "DELETE", f"/setup/buyers/{buyer_id}/", token=token)

test("List Factories", "GET", "/setup/factories/", token=token)
f = test("Create Factory", "POST", "/setup/factories/", {"code": "TF1", "name": "Test Factory CRUD", "status": "active"}, token=token)
factory_id = f['id'] if f and isinstance(f, dict) else None
if factory_id:
    test("Delete Factory", "DELETE", f"/setup/factories/{factory_id}/", token=token)

test("List Currencies", "GET", "/setup/currencies/", token=token)
c = test("Create Currency", "POST", "/setup/currencies/", {"code": "TDT", "name": "Test Dinar", "symbol": "TD", "status": "active"}, token=token)
if c and isinstance(c, dict) and 'id' in c:
    test("Delete Currency", "DELETE", f"/setup/currencies/{c['id']}/", token=token)

test("List Seasons", "GET", "/setup/seasons/", token=token)
test("List Countries", "GET", "/setup/countries/", token=token)
test("List Colors", "GET", "/setup/color-codes/", token=token)
test("List Departments", "GET", "/setup/departments/", token=token)
test("List Designations", "GET", "/setup/designations/", token=token)
test("List Payment Terms", "GET", "/setup/payment-terms/", token=token)
test("List UOMs", "GET", "/setup/uoms/", token=token)
test("List Brands", "GET", "/setup/brands/", token=token)
test("List Vendors", "GET", "/setup/vendors/", token=token)
test("List Offices", "GET", "/setup/offices/", token=token)

# 3. Users
print("\n=== USERS ===")
test("List Users", "GET", "/users/", token=token)
test("List Roles", "GET", "/users/roles/", token=token)

# 4. Merchandising
print("\n=== MERCHANDISING ===")
test("List Styles", "GET", "/merchandising/styles/", token=token)
test("List File Openings", "GET", "/merchandising/file-openings/", token=token)
test("List POs", "GET", "/merchandising/purchase-orders/", token=token)
test("List BOMs", "GET", "/merchandising/boms/", token=token)
test("List Costings", "GET", "/merchandising/costings/", token=token)
test("List TAs", "GET", "/merchandising/tas/", token=token)
test("TA Calendar", "GET", "/merchandising/tas/calendar/", token=token)
test("TA Alerts", "GET", "/merchandising/tas/alerts/", token=token)

# Create a style to test full flow
s = test("Create Style", "POST", "/merchandising/styles/", {
    "style_number": "CRUD001", "name": "Test CRUD Style", "description": "test"
}, token=token)
style_id = s['id'] if s and isinstance(s, dict) else None

if style_id:
    # Create file opening from style
    fo = test("Create File Opening", "POST", "/merchandising/file-openings/", {
        "style_version": None,
        "buyer": None,
        "factory": None,
        "status": "open",
    }, token=token, expected_ok=False)

# 5. Commercial
print("\n=== COMMERCIAL ===")
test("List LCs", "GET", "/commercial/lcs/", token=token)
test("List LC Amendments", "GET", "/commercial/lc-amendments/", token=token)
test("List Banks", "GET", "/commercial/banks/", token=token)
test("List PIs", "GET", "/commercial/proforma-invoices/", token=token)
test("List Sales Contracts", "GET", "/commercial/sales-contracts/", token=token)

b = test("Create Bank", "POST", "/commercial/banks/", {
    "name": "Test Bank", "swift_code": "TESTBD01", "country": "Bangladesh"
}, token=token)
if b and isinstance(b, dict) and 'id' in b:
    test("Delete Bank", "DELETE", f"/commercial/banks/{b['id']}/", token=token)

# 6. Production
print("\n=== PRODUCTION ===")
test("List Plans", "GET", "/production/plans/", token=token)
test("List Daily Reports", "GET", "/production/daily-reports/", token=token)

# 7. Quality
print("\n=== QUALITY ===")
test("List Inspections", "GET", "/quality/inspections/", token=token)
test("List Inspection Items", "GET", "/quality/inspection-items/", token=token)
test("List Corrective Actions", "GET", "/quality/corrective-actions/", token=token)

# 8. Logistics
print("\n=== LOGISTICS ===")
test("List Shipments", "GET", "/logistics/shipments/", token=token)
test("List Shipping Docs", "GET", "/logistics/shipping-documents/", token=token)
test("List Freight Forwarders", "GET", "/logistics/freight-forwarders/", token=token)

ff = test("Create Freight Forwarder", "POST", "/logistics/freight-forwarders/", {
    "name": "Test FF", "code": "TFF001", "contact_person": "John"
}, token=token)
if ff and isinstance(ff, dict) and 'id' in ff:
    test("Delete Freight Forwarder", "DELETE", f"/logistics/freight-forwarders/{ff['id']}/", token=token)

# 9. Monitoring
print("\n=== MONITORING ===")
test("List Audit Logs", "GET", "/monitoring/audit-logs/", token=token)
test("List Health Records", "GET", "/monitoring/health/", token=token)
test("List Alerts", "GET", "/monitoring/alerts/", token=token)
a = test("Create Alert", "POST", "/monitoring/alerts/", {
    "alert_type": "info", "service": "system", "title": "Test Alert CRUD", "message": "Testing alert creation"
}, token=token)
if a and isinstance(a, dict) and 'id' in a:
    test("Mark Alert Read", "POST", f"/monitoring/alerts/{a['id']}/mark_read/", token=token)
    test("Resolve Alert", "POST", f"/monitoring/alerts/{a['id']}/resolve/", token=token)

# 10. Reporting
print("\n=== REPORTING ===")
test("List Reports", "GET", "/reporting/reports/", token=token)
r = test("Create Report", "POST", "/reporting/reports/", {
    "name": "Test CRUD Report", "report_type": "orders", "config": {}, "is_scheduled": False
}, token=token)
if r and isinstance(r, dict) and 'id' in r:
    test("Get Report", "GET", f"/reporting/reports/{r['id']}/", token=token)
    test("Delete Report", "DELETE", f"/reporting/reports/{r['id']}/", token=token)

# Summary
passed = sum(1 for _, ok, _ in results if ok)
failed = sum(1 for _, ok, _ in results if not ok)
print(f"\n{'='*60}")
print(f"RESULTS: {passed} passed, {failed} failed out of {len(results)} total")
if failed:
    print(f"\nFailed tests:")
    for name, ok, status in results:
        if not ok:
            print(f"  {name}: HTTP {status}")
