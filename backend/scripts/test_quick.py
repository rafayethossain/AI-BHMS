import os, sys, json, urllib.request, urllib.error
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
        resp = urllib.request.urlopen(req, timeout=5)
        raw = resp.read().decode()
        resp_body = json.loads(raw) if raw.strip() else {"detail": "success"}
        return resp.status, resp_body
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            resp_body = json.loads(raw) if raw.strip() else {"detail": "success"}
        except:
            resp_body = raw[:300]
        return e.code, resp_body
    except Exception as e:
        return 0, str(e)[:200]

def test(name, method, path, data=None, token=None):
    status, body = api(method, path, data, token)
    ok = 200 <= status < 300
    results.append((name, ok, status, body if not ok else ""))
    tag = "OK" if ok else "FAIL"
    print(f"  [{tag}] {name}: {status}")
    if not ok:
        if isinstance(body, dict):
            err = body.get("error", body.get("detail", body))
            print(f"    {json.dumps(err, indent=2)[:200]}")
        else:
            print(f"    {str(body)[:200]}")
    return body if ok else None

# Login
print("=== AUTH ===")
login = api("POST", "/auth/login/", {"email": "admin@demo.com", "password": "admin123"})
if login[0] == 200:
    T = login[1]["access"]
    print(f"  [OK] Login: 200")
else:
    print(f"  [FAIL] Login: {login}")
    sys.exit(1)

print("\n=== SETUP CRUD ===")
b = test("Create Buyer", "POST", "/setup/buyers/", {"code": "CRUD_B", "name": "CRUD Buyer", "status": "active"}, T)
if b and "id" in b:
    test("Get Buyer", "GET", f"/setup/buyers/{b['id']}/", token=T)
    test("Delete Buyer", "DELETE", f"/setup/buyers/{b['id']}/", token=T)

f = test("Create Factory", "POST", "/setup/factories/", {"code": "CRUD_F", "name": "CRUD Factory", "status": "active"}, T)
if f and "id" in f:
    test("Delete Factory", "DELETE", f"/setup/factories/{f['id']}/", token=T)

print("\n=== MERCHANDISING CRUD ===")
s = test("Create Style", "POST", "/merchandising/styles/", {"style_number": "CRUD_S1", "name": "CRUD Style"}, T)
if s and "id" in s:
    test("Get Style", "GET", f"/merchandising/styles/{s['id']}/", token=T)
    test("Delete Style", "DELETE", f"/merchandising/styles/{s['id']}/", token=T)

print("\n=== COMMERCIAL CRUD ===")
bk = test("Create Bank", "POST", "/commercial/banks/", {"code": "CBK", "name": "CRUD Bank", "swift_code": "CBKBD"}, T)
if bk and "id" in bk:
    test("Get Bank", "GET", f"/commercial/banks/{bk['id']}/", token=T)
    test("Delete Bank", "DELETE", f"/commercial/banks/{bk['id']}/", token=T)

print("\n=== LOGISTICS CRUD ===")
ff = test("Create FF", "POST", "/logistics/freight-forwarders/", {"code": "CFF1", "name": "CRUD FF"}, T)
if ff and "id" in ff:
    test("Get FF", "GET", f"/logistics/freight-forwarders/{ff['id']}/", token=T)
    test("Delete FF", "DELETE", f"/logistics/freight-forwarders/{ff['id']}/", token=T)

print("\n=== MONITORING CRUD ===")
a = test("Create Alert", "POST", "/monitoring/alerts/", {"alert_type": "info", "service": "system", "title": "Test Alert", "message": "Testing"}, T)
if a and "id" in a:
    test("Get Alert", "GET", f"/monitoring/alerts/{a['id']}/", token=T)
    test("Mark Read", "POST", f"/monitoring/alerts/{a['id']}/mark_read/", token=T)

print("\n=== REPORTING CRUD ===")
r = test("Create Report", "POST", "/reporting/reports/", {"name": "Test Report", "report_type": "orders", "config": {}, "is_scheduled": False}, T)
if r and "id" in r:
    test("Get Report", "GET", f"/reporting/reports/{r['id']}/", token=T)
    test("Delete Report", "DELETE", f"/reporting/reports/{r['id']}/", token=T)

print("\n=== ALL LIST ENDPOINTS ===")
endpoints = [
    "/setup/buyers/", "/setup/factories/", "/setup/currencies/", "/setup/seasons/",
    "/setup/countries/", "/setup/color-codes/", "/setup/departments/", "/setup/designations/",
    "/setup/payment-terms/", "/setup/uoms/", "/setup/brands/", "/setup/vendors/", "/setup/offices/",
    "/users/", "/users/roles/",
    "/merchandising/styles/", "/merchandising/file-openings/", "/merchandising/purchase-orders/",
    "/merchandising/boms/", "/merchandising/costings/", "/merchandising/tas/",
    "/commercial/lcs/", "/commercial/lc-amendments/", "/commercial/banks/",
    "/commercial/proforma-invoices/", "/commercial/sales-contracts/",
    "/production/plans/", "/production/daily-reports/",
    "/quality/inspections/", "/quality/inspection-items/", "/quality/corrective-actions/",
    "/logistics/shipments/", "/logistics/shipping-documents/", "/logistics/freight-forwarders/",
    "/monitoring/audit-logs/", "/monitoring/health/", "/monitoring/alerts/",
    "/reporting/reports/",
]
for ep in endpoints:
    test(f"GET {ep}", "GET", ep, token=T)

passed = sum(1 for _, ok, _, _ in results if ok)
failed = sum(1 for _, ok, _, _ in results if not ok)
print(f"\n{'='*60}")
print(f"RESULTS: {passed}/{len(results)} passed, {failed} failed")
if failed:
    print("\nFAILURES:")
    for name, ok, status, body in results:
        if not ok:
            print(f"  {name}: {status}")
