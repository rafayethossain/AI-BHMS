"""
Full-product end-to-end functional test.

Walks every feature module menu with realistic seeded data through the real
REST API (``/api/v1/...``), exercising the complete product lifecycle and
verifying the cross-module FK spine — every "dot" resolves to a real record.

Run with:

    python -m pytest tests/e2e/test_full_product_lifecycle.py -v
"""
from decimal import Decimal

import pytest
from django.core.management import call_command
from django.utils import timezone
from rest_framework.test import APIClient

from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole
from django.contrib.auth import get_user_model

User = get_user_model()

pytestmark = pytest.mark.django_db(transaction=True)

TENANT_SLUG = "demo-e2e"
ADMIN_EMAIL = "admin@demo.com"
ADMIN_PASS = "admin123!@#"

API = "/api/v1"
TODAY = timezone.localdate().isoformat()


class E2ERunner:
    """Records pass/fail per check and produces a module report."""

    def __init__(self, client):
        self.client = client
        self.access = None
        self.refresh = None
        self.results = []  # (module, name, ok, detail)

    def record(self, module, name, ok, detail=""):
        self.results.append((module, name, bool(ok), detail))

    def _data(self, resp):
        try:
            return resp.json()
        except Exception:
            return {}

    def _rows(self, resp):
        data = self._data(resp)
        if isinstance(data, dict) and "results" in data:
            return data["results"]
        if isinstance(data, list):
            return data
        return [data] if isinstance(data, dict) and data else []

    def list_endpoint(self, module, url, name=None, require_data=True):
        name = name or url
        resp = self.client.get(url)
        rows = self._rows(resp)
        ok = resp.status_code == 200 and (not require_data or len(rows) > 0)
        self.record(module, name, ok, detail=f"GET {url} -> {resp.status_code}, rows={len(rows)}")
        return rows

    def detail_endpoint(self, module, url, name=None, require_keys=()):
        name = name or url
        resp = self.client.get(url)
        data = self._data(resp)
        ok = resp.status_code == 200 and all(k in data for k in require_keys)
        self.record(module, name, ok, detail=f"GET {url} -> {resp.status_code}")
        return data

    def create(self, module, url, payload, name=None, require_keys=("id",)):
        name = name or url
        resp = self.client.post(url, payload, format="json")
        data = self._data(resp)
        ok = resp.status_code in (200, 201) and all(k in data for k in require_keys)
        detail = f"POST {url} -> {resp.status_code}"
        if not ok:
            detail += f" body={str(data)[:300]}"
        self.record(module, name, ok, detail=detail)
        return data

    def action(self, module, url, name=None, method="post", payload=None, expect=(200, 201),
               status_key=None, status_value=None, require_keys=()):
        name = name or url
        kw = {"format": "json"} if method != "get" else {}
        data = payload or ({} if method != "get" else None)
        resp = getattr(self.client, method)(url, data, **kw)
        body = self._data(resp)
        ok = resp.status_code in expect
        detail = f"{method.upper()} {url} -> {resp.status_code}"
        if ok and status_value is not None:
            ok = status_key in body and body.get(status_key) == status_value
            if not ok:
                detail += f" expected {status_key}={status_value!r}, got {str(body)[:200]}"
        if ok and require_keys:
            ok = all(k in body for k in require_keys)
        if not ok:
            detail += f" body={str(body)[:300]}"
        self.record(module, name, ok, detail=detail)
        return body

    def resolve(self, module, name, obj_id, endpoint_fmt, require_keys=("id",)):
        """GET the detail of a linked record to prove a FK "dot" is connected."""
        url = endpoint_fmt.format(obj_id=obj_id)
        resp = self.client.get(url)
        data = self._data(resp)
        ok = resp.status_code == 200 and all(k in data for k in require_keys)
        self.record(module, name, ok, detail=f"GET {url} -> {resp.status_code}")
        return data

    def report_text(self):
        lines = []
        by_module = {}
        for module, name, ok, detail in self.results:
            by_module.setdefault(module, []).append((name, ok, detail))
        total_ok = sum(1 for r in self.results if r[2])
        total = len(self.results)
        lines.append(f"=== E2E RESULTS: {total_ok}/{total} checks passed ===")
        for module in by_module:
            mod_ok = sum(1 for _, ok, _ in by_module[module] if ok)
            lines.append(f"\n[{module}] {mod_ok}/{len(by_module[module])} passed")
            for name, ok, detail in by_module[module]:
                tag = "OK  " if ok else "FAIL"
                lines.append(f"  {tag} {name}  ({detail})")
        return "\n".join(lines)


def _seed_rbac(tenant, admin_role):
    """Mirror scripts/seed_rbac.py so the RBAC catalogs are realistic."""
    modules = {
        "setup": ["view", "create", "edit", "delete"],
        "merchandising": ["view", "create", "edit", "delete", "approve"],
        "commercial": ["view", "create", "edit", "delete", "approve"],
        "production": ["view", "create", "edit", "delete", "approve"],
        "quality": ["view", "create", "edit", "delete", "approve"],
        "logistics": ["view", "create", "edit", "delete", "approve"],
        "users": ["view", "create", "edit", "delete", "manage"],
        "reporting": ["view", "export"],
        "settings": ["view", "edit"],
    }
    for module, actions in modules.items():
        for action in actions:
            perm, _ = Permission.objects.get_or_create(
                module=module, action=action, defaults={"description": f"{module}:{action}"}
            )
            RolePermission.objects.get_or_create(role=admin_role, permission=perm)


@pytest.fixture(scope="module")
def e2e(django_db_setup, django_db_blocker):
    """Demo tenant + admin user + realistic seed data, then a JWT-authenticated client."""
    with django_db_blocker.unblock():
        tenant, _ = Tenant.objects.get_or_create(
            slug=TENANT_SLUG,
            defaults={
                "name": "Demo Buying House",
                "schema_name": f"tenant_{TENANT_SLUG}",
                "status": "active",
                "plan": "professional",
            },
        )
        role, _ = Role.objects.get_or_create(
            tenant=tenant,
            name="Admin",
            defaults={"description": "System Administrator", "is_system": True},
        )
        user, created = User.objects.get_or_create(email=ADMIN_EMAIL, tenant=tenant)
        if created:
            user.username = "admin"
            user.first_name = "Admin"
            user.last_name = "User"
            user.is_staff = True
            user.is_superuser = True
            user.status = "active"
            user.set_password(ADMIN_PASS)
            user.save()
        UserRole.objects.get_or_create(user=user, role=role)
        _seed_rbac(tenant, role)
        call_command("seed_demo_data", tenant=TENANT_SLUG, verbosity=0)

        client = APIClient()
        resp = client.post(f"{API}/auth/login/", {"email": ADMIN_EMAIL, "password": ADMIN_PASS}, format="json")
        assert resp.status_code == 200, resp.content[:500]
        runner = E2ERunner(client)
        runner.access = resp.data["access"]
        runner.refresh = resp.data["refresh"]
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {runner.access}")
        return runner


# ── Module walks ────────────────────────────────────────────────────────────

def walk_auth_and_health(e2e):
    m = "Auth & Health"
    e2e.resolve(m, "core health", 0, API + "/health/", require_keys=("status",))
    e2e.detail_endpoint(m, API + "/dashboard/summary/", require_keys=())
    e2e.action(m, f"{API}/auth/token/verify/", name="token verify", method="get", expect=(200,))
    refreshed = e2e.action(m, f"{API}/auth/token/refresh/", name="token refresh",
                           payload={"refresh": e2e.refresh}, require_keys=("access",))
    if refreshed.get("access"):
        e2e.record(m, "refresh token usable", True, "new access issued")
        if refreshed.get("refresh"):
            e2e.refresh = refreshed["refresh"]


def walk_setup_admin(e2e):
    m = "Setup & Admin"
    masters = [
        "seasons", "product-categories", "product-types", "product-departments",
        "compliance-document-types", "delivery-modes", "uoms", "currencies",
        "payment-terms", "countries",
        "color-codes", "buyers", "brands", "factories", "vendors",
        "risk-levels",
    ]
    for ep in masters:
        e2e.list_endpoint(m, f"{API}/setup/{ep}/", name=f"setup/{ep}")
    e2e.create(m, f"{API}/setup/departments/", {"code": "E2E-DEP", "name": "E2E Department"},
               name="create department")
    e2e.create(m, f"{API}/setup/designations/", {"code": "E2E-DES", "name": "E2E Designation"},
               name="create designation")
    e2e.create(m, f"{API}/setup/offices/", {
        "code": "E2E-OFF", "name": "E2E Office", "office_type": "branch",
        "address": "Test St", "city": "Dhaka", "country": "BD",
    }, name="create setup office")
    e2e.list_endpoint(m, f"{API}/setup/departments/", name="setup/departments after create")
    e2e.list_endpoint(m, f"{API}/setup/designations/", name="setup/designations after create")
    e2e.list_endpoint(m, f"{API}/setup/offices/", name="setup/offices after create")
    e2e.list_endpoint(m, f"{API}/users/", name="users list")
    e2e.list_endpoint(m, f"{API}/users/roles/", name="roles list")
    e2e.list_endpoint(m, f"{API}/users/permissions/", name="permissions list")
    e2e.list_endpoint(m, f"{API}/users/user-roles/", name="user-roles list")
    e2e.list_endpoint(m, f"{API}/tenants/", name="tenants list")
    e2e.list_endpoint(m, f"{API}/tenants/offices/", name="tenant offices list")


def walk_merchandising(e2e):
    m = "Merchandising"
    styles = e2e.list_endpoint(m, f"{API}/merchandising/styles/", name="styles list")
    style = styles[0] if styles else {}
    e2e.detail_endpoint(m, f"{API}/merchandising/styles/{style['id']}/", name="style detail",
                        require_keys=("style_number", "buyer", "buyer_name"))
    e2e.list_endpoint(m, f"{API}/merchandising/style-versions/", name="style versions list")
    if style.get("id"):
        e2e.create(m, f"{API}/merchandising/style-items/", {
            "style": style["id"], "category": "fabric", "item_name": "Main fabric",
            "consumption": "2.5", "waste_percent": "3.00",
            "unit_price": "4.50", "sort_order": 1,
        }, name="create style item", require_keys=("id", "line_total"))
    e2e.list_endpoint(m, f"{API}/merchandising/style-items/", name="style items list")
    e2e.list_endpoint(m, f"{API}/merchandising/design-images/", name="design images list")
    if style.get("buyer"):
        e2e.resolve(m, "style -> buyer", style["buyer"], API + "/setup/buyers/{obj_id}/",
                    require_keys=("name",))

    fos = e2e.list_endpoint(m, f"{API}/merchandising/file-openings/", name="file openings list")
    fo = fos[0] if fos else {}
    e2e.detail_endpoint(m, f"{API}/merchandising/file-openings/{fo['id']}/", name="file opening detail",
                        require_keys=("file_number", "style", "style_number"))
    if fo.get("style"):
        e2e.resolve(m, "file opening -> style", fo["style"], API + "/merchandising/styles/{obj_id}/",
                    require_keys=("style_number",))

    pos = e2e.list_endpoint(m, f"{API}/merchandising/purchase-orders/", name="POs list")
    assert pos, "no seeded purchase orders"
    po = pos[0]
    po_id = po["id"]
    pod = e2e.detail_endpoint(m, f"{API}/merchandising/purchase-orders/{po_id}/", name="PO detail",
                              require_keys=("po_number", "buyer", "factory", "quantity", "unit_price",
                                            "currency", "delivery_date", "status"))
    for key, ep in (("buyer", "buyers"), ("factory", "factories"), ("currency", "currencies")):
        if pod.get(key):
            e2e.resolve(m, f"PO -> {key}", pod[key], f"{API}/setup/{ep}/{{obj_id}}/", require_keys=())
    e2e.action(m, f"{API}/merchandising/purchase-orders/{po_id}/trail/", name="PO trail",
               method="get", expect=(200,))
    e2e.list_endpoint(m, f"{API}/merchandising/po-items/", name="PO items list")
    e2e.list_endpoint(m, f"{API}/merchandising/po-amendments/", name="PO amendments list")
    e2e.action(m, f"{API}/merchandising/purchase-orders/order_manager/", name="order manager",
               method="get", expect=(200,))
    e2e.action(m, f"{API}/merchandising/purchase-orders/{po_id}/export/", name="PO export", method="get", expect=(200,))
    e2e.list_endpoint(m, f"{API}/merchandising/purchase-orders/{po_id}/hits/", name="PO hits list", require_data=False)

    boms = e2e.list_endpoint(m, f"{API}/merchandising/boms/", name="BOMs list")
    bom = boms[0] if boms else {}
    e2e.detail_endpoint(m, f"{API}/merchandising/boms/{bom['id']}/", name="BOM detail", require_keys=("id",))
    e2e.list_endpoint(m, f"{API}/merchandising/bom-items/", name="BOM items list")

    # Seed creates no costings; create one from the first BOM to exercise the lifecycle
    costings = e2e.list_endpoint(m, f"{API}/merchandising/costings/", name="costings list", require_data=False)
    if not costings:
        created = e2e.create(m, f"{API}/merchandising/costings/generate_from_bom/", {
            "bom_id": bom.get("id"),
            "purchase_order_id": po_id,
        }, name="generate costing from BOM", require_keys=("id", "purchase_order", "total_cost"))
        costings = [created] if created.get("id") else []
    costing = costings[0] if costings else {}
    if costing.get("id"):
        e2e.detail_endpoint(m, f"{API}/merchandising/costings/{costing['id']}/", name="costing detail", require_keys=("id",))
        e2e.list_endpoint(m, f"{API}/merchandising/costing-lines/", name="costing lines list", require_data=False)
        e2e.action(m, f"{API}/merchandising/costings/{costing['id']}/export/", name="costing export", method="get", expect=(200,))

    fit_specs = e2e.list_endpoint(m, f"{API}/merchandising/fit-specs/", name="fit specs list")
    fit_spec = fit_specs[0] if fit_specs else {}
    if fit_spec.get("id"):
        e2e.detail_endpoint(m, f"{API}/merchandising/fit-specs/{fit_spec['id']}/", name="fit spec detail", require_keys=("id",))

    e2e.list_endpoint(m, f"{API}/merchandising/job-requests/", name="job requests list")
    e2e.action(m, f"{API}/merchandising/job-requests/dashboard/", name="job dashboard", method="get", expect=(200,))
    e2e.action(m, f"{API}/merchandising/job-requests/queue/", name="job queue", method="get", expect=(200,))
    e2e.action(m, f"{API}/merchandising/job-requests/unsold_analysis/", name="unsold analysis", method="get", expect=(200,))

    # T&A: create if seed did not (seed has no TAs)
    tas = e2e.list_endpoint(m, f"{API}/merchandising/tas/", name="TAs list", require_data=False)
    if not tas:
        ta = e2e.create(m, f"{API}/merchandising/tas/", {
            "purchase_order": po_id,
            "delivery_date": TODAY,
            "status": "active",
            "critical_path": {"key": "value"},
        }, name="create TA", require_keys=("id", "po_number"))
    else:
        ta = tas[0]
    if ta.get("id"):
        e2e.detail_endpoint(m, f"{API}/merchandising/tas/{ta['id']}/", name="TA detail",
                            require_keys=("purchase_order", "po_number", "milestones"))
        e2e.create(m, f"{API}/merchandising/ta-milestones/", {
            "ta": ta["id"], "name": "Fabric booking", "description": "Book fabric",
            "planned_date": TODAY, "status": "pending", "is_critical": True, "sort_order": 1,
        }, name="create TA milestone")
        e2e.action(m, f"{API}/merchandising/tas/{ta['id']}/", name="TA status -> delayed",
                   payload={"status": "delayed"}, method="patch", expect=(200,), status_key="status", status_value="delayed")
        e2e.action(m, f"{API}/merchandising/tas/{ta['id']}/", name="TA status -> active",
                   payload={"status": "active"}, method="patch", expect=(200,), status_key="status", status_value="active")
    e2e.action(m, f"{API}/merchandising/tas/alerts/", name="TA alerts", method="get", expect=(200,))
    e2e.action(m, f"{API}/merchandising/tas/calendar_data/", name="TA calendar", method="get", expect=(200,))
    e2e.action(m, f"{API}/merchandising/tas/heatmap/", name="TA heatmap", method="get", expect=(200,))
    e2e.list_endpoint(m, f"{API}/merchandising/ta-milestones/", name="TA milestones list")

    return po_id, po


def walk_commercial(e2e, po_id):
    m = "Commercial"
    e2e.list_endpoint(m, f"{API}/commercial/banks/", name="banks list")

    lcs = e2e.list_endpoint(m, f"{API}/commercial/lcs/", name="LCs list")
    lc = lcs[0] if lcs else {}
    if lc.get("id"):
        lcd = e2e.detail_endpoint(m, f"{API}/commercial/lcs/{lc['id']}/", name="LC detail",
                                  require_keys=("lc_number", "buyer", "buyer_name", "bank", "bank_name"))
        if lcd.get("buyer"):
            e2e.resolve(m, "LC -> buyer", lcd["buyer"], API + "/setup/buyers/{obj_id}/", require_keys=())
        if lcd.get("bank"):
            e2e.resolve(m, "LC -> bank", lcd["bank"], API + "/commercial/banks/{obj_id}/", require_keys=("name",))
    e2e.list_endpoint(m, f"{API}/commercial/lc-amendments/", name="LC amendments list")

    pis = e2e.list_endpoint(m, f"{API}/commercial/proforma-invoices/", name="proforma invoices list")
    pi = pis[0] if pis else {}
    if pi.get("id"):
        e2e.detail_endpoint(m, f"{API}/commercial/proforma-invoices/{pi['id']}/", name="PI detail",
                            require_keys=("purchase_order", "po_number", "buyer_name"))

    scs = e2e.list_endpoint(m, f"{API}/commercial/sales-contracts/", name="sales contracts list")
    sc = scs[0] if scs else {}
    if sc.get("id"):
        e2e.detail_endpoint(m, f"{API}/commercial/sales-contracts/{sc['id']}/", name="SC detail",
                            require_keys=("purchase_order", "po_number", "buyer_name"))

    sconfs = e2e.list_endpoint(m, f"{API}/commercial/sales-confirmations/", name="sales confirmations list")
    sconf = sconfs[0] if sconfs else {}
    if sconf.get("id"):
        e2e.detail_endpoint(m, f"{API}/commercial/sales-confirmations/{sconf['id']}/", name="SCONF detail",
                            require_keys=("purchase_order", "po_number"))

    # Debit note lifecycle: pro_forma -> issue -> paid
    dns = e2e.list_endpoint(m, f"{API}/commercial/debit-notes/", name="debit notes list")
    dn = next((d for d in dns if d.get("status") == "pro_forma"), (dns[0] if dns else {}))
    if dn.get("id"):
        dn_id = dn["id"]
        e2e.detail_endpoint(m, f"{API}/commercial/debit-notes/{dn_id}/", name="debit note detail",
                            require_keys=("debit_number", "purchase_order", "status"))
        e2e.action(m, f"{API}/commercial/debit-notes/{dn_id}/issue/", name="debit note issue",
                   expect=(200,), status_key="status", status_value="issued")
        e2e.detail_endpoint(m, f"{API}/commercial/debit-notes/{dn_id}/", name="debit note issued detail",
                            require_keys=("issued_at",))
        e2e.action(m, f"{API}/commercial/debit-notes/{dn_id}/mark_paid/", name="debit note mark paid",
                   expect=(200,), status_key="status", status_value="paid")
        e2e.detail_endpoint(m, f"{API}/commercial/debit-notes/{dn_id}/", name="debit note paid detail",
                            require_keys=("paid_at",))
    e2e.action(m, f"{API}/commercial/debit-notes/dashboard/", name="debit note dashboard", method="get", expect=(200,))
    e2e.action(m, f"{API}/commercial/debit-notes/pending_over_tolerance/", name="debit note over-tolerance candidates",
               method="get", expect=(200,))
    e2e.action(m, f"{API}/commercial/debit-notes/export/", name="debit note export", method="get", expect=(200,))

    # Invoice approvals: create matching -> approve; over-tolerance -> raise debit; mismatch -> reject
    e2e.list_endpoint(m, f"{API}/commercial/invoice-approvals/", name="invoice approvals list")
    e2e.action(m, f"{API}/commercial/invoice-approvals/dashboard/", name="invoice approval dashboard", method="get", expect=(200,))
    e2e.action(m, f"{API}/commercial/invoice-approvals/export/", name="invoice approval export", method="get", expect=(200,))
    if po_id:
        pod = e2e.detail_endpoint(m, f"{API}/merchandising/purchase-orders/{po_id}/", name="PO for invoice",
                                  require_keys=("quantity", "unit_price", "delivery_date", "currency"))
        qty = Decimal(str(pod.get("quantity") or 100))
        price = Decimal(str(pod.get("unit_price") or 0))
        amount = (qty * price).quantize(Decimal("0.01"))
        base = {
            "purchase_order": po_id,
            "invoice_type": "fabric",
            "invoice_date": pod.get("delivery_date") or TODAY,
            "quantity": str(qty),
            "unit_price": str(price),
            "amount": str(amount),
            "currency": pod.get("currency"),
        }
        inv = e2e.create(m, f"{API}/commercial/invoice-approvals/", base, name="create matching invoice approval",
                         require_keys=("invoice_number", "purchase_order", "match_status"))
        if inv.get("id"):
            e2e.action(m, f"{API}/commercial/invoice-approvals/{inv['id']}/approve/", name="invoice approval approve",
                       expect=(200,), status_key="status", status_value="approved")
        over = dict(base, quantity=str((qty * Decimal("1.2")).quantize(Decimal("1"))),
                    amount=str((qty * Decimal("1.2") * price).quantize(Decimal("0.01"))))
        inv_over = e2e.create(m, f"{API}/commercial/invoice-approvals/", over,
                              name="create over-tolerance invoice approval",
                              require_keys=("id", "match_status"))
        if inv_over.get("id") and inv_over.get("match_status") == "over_tolerance":
            e2e.action(m, f"{API}/commercial/invoice-approvals/{inv_over['id']}/raise_debit/",
                       name="invoice approval raise debit", expect=(200,), require_keys=("debit_number",))
        inv_bad = e2e.create(m, f"{API}/commercial/invoice-approvals/",
                             dict(base, unit_price=str(price + Decimal("1.00")),
                                  amount=str((qty * (price + Decimal("1.00"))).quantize(Decimal("0.01")))),
                             name="create mismatched invoice approval",
                             require_keys=("id",))
        if inv_bad.get("id"):
            e2e.action(m, f"{API}/commercial/invoice-approvals/{inv_bad['id']}/reject/",
                       name="invoice approval reject", payload={"rejection_reason": "Price does not match GC"},
                       expect=(200,), status_key="status", status_value="rejected")


def walk_fabric(e2e):
    m = "Fabric"
    e2e.list_endpoint(m, f"{API}/fabric/categories/", name="categories list")
    e2e.list_endpoint(m, f"{API}/fabric/hts-codes/", name="HTS codes list")
    e2e.list_endpoint(m, f"{API}/fabric/suppliers/", name="suppliers list")
    e2e.list_endpoint(m, f"{API}/fabric/mills/", name="mills list")

    rfqs = e2e.list_endpoint(m, f"{API}/fabric/rfqs/", name="RFQs list")
    rfq = rfqs[0] if rfqs else {}
    if rfq.get("id"):
        e2e.detail_endpoint(m, f"{API}/fabric/rfqs/{rfq['id']}/", name="RFQ detail",
                            require_keys=("rfq_number", "supplier", "supplier_name", "line_items", "responses"))
    e2e.list_endpoint(m, f"{API}/fabric/rfq-line-items/", name="RFQ line items list")
    e2e.list_endpoint(m, f"{API}/fabric/rfq-responses/", name="RFQ responses list")
    e2e.list_endpoint(m, f"{API}/fabric/rfq-response-items/", name="RFQ response items list")

    bookings = e2e.list_endpoint(m, f"{API}/fabric/bookings/", name="bookings list")
    booking = bookings[0] if bookings else {}
    if booking.get("id"):
        e2e.detail_endpoint(m, f"{API}/fabric/bookings/{booking['id']}/", name="booking detail",
                            require_keys=("booking_number", "supplier", "supplier_name"))

    orders = e2e.list_endpoint(m, f"{API}/fabric/orders/", name="orders list")
    order = orders[0] if orders else {}
    if order.get("id"):
        e2e.detail_endpoint(m, f"{API}/fabric/orders/{order['id']}/", name="order detail",
                            require_keys=("order_number", "supplier", "supplier_name"))
    e2e.list_endpoint(m, f"{API}/fabric/tolerances/", name="tolerances list")
    e2e.list_endpoint(m, f"{API}/fabric/utilizations/", name="utilizations list")


def walk_production(e2e, po_id):
    m = "Production"
    plans = e2e.list_endpoint(m, f"{API}/production/plans/", name="plans list", require_data=False)
    if not plans and po_id:
        pod = e2e.detail_endpoint(m, f"{API}/merchandising/purchase-orders/{po_id}/", name="PO for production plan",
                                  require_keys=("factory", "quantity", "delivery_date"))
        plan = e2e.create(m, f"{API}/production/plans/", {
            "purchase_order": po_id,
            "factory": pod.get("factory"),
            "plan_date": TODAY,
            "quantity": int(pod.get("quantity") or 100),
            "status": "draft",
        }, name="create production plan", require_keys=("id", "status"))
        if plan.get("id"):
            e2e.detail_endpoint(m, f"{API}/production/plans/{plan['id']}/", name="plan detail",
                                require_keys=("purchase_order", "factory"))
    e2e.action(m, f"{API}/production/plans/dashboard/", name="production dashboard", method="get", expect=(200,))

    dailies = e2e.list_endpoint(m, f"{API}/production/daily/", name="daily reports list", require_data=False)
    if not dailies and po_id:
        pod = e2e.detail_endpoint(m, f"{API}/merchandising/purchase-orders/{po_id}/", name="PO for daily report",
                                  require_keys=("factory",))
        daily = e2e.create(m, f"{API}/production/daily/", {
            "factory": pod.get("factory"),
            "purchase_order": po_id,
            "production_date": TODAY,
            "target_quantity": 500,
            "actual_quantity": 480,
            "passed_quantity": 475,
            "rejected_quantity": 5,
            "efficiency": "96.00",
        }, name="create daily report", require_keys=("id", "status"))
        if daily.get("id"):
            e2e.detail_endpoint(m, f"{API}/production/daily/{daily['id']}/", name="daily report detail",
                                require_keys=("factory", "purchase_order", "actual_quantity"))
            e2e.action(m, f"{API}/production/daily/{daily['id']}/approve/", name="approve daily report",
                       expect=(200,), status_key="status", status_value="approved")


def walk_quality(e2e, po_id):
    m = "Quality"
    inspections = e2e.list_endpoint(m, f"{API}/quality/inspections/", name="inspections list", require_data=False)
    if not inspections and po_id:
        pod = e2e.detail_endpoint(m, f"{API}/merchandising/purchase-orders/{po_id}/", name="PO for inspection",
                                  require_keys=("factory",))
        insp = e2e.create(m, f"{API}/quality/inspections/", {
            "purchase_order": po_id,
            "factory": pod.get("factory"),
            "inspection_type": "final",
            "inspection_date": TODAY,
            "aql_level": "2.5",
            "sample_size": 315,
            "passed_quantity": 310,
            "rejected_quantity": 5,
            "status": "in_progress",
        }, name="create inspection", require_keys=("id", "po_number"))
        if insp.get("id"):
            insp_id = insp["id"]
            e2e.detail_endpoint(m, f"{API}/quality/inspections/{insp_id}/", name="inspection detail",
                                require_keys=("purchase_order", "factory", "po_number"))
            e2e.create(m, f"{API}/quality/inspection-items/", {
                "inspection": insp_id, "defect_type": "Stitch defect",
                "defect_count": 3, "severity": "minor", "description": "Loose stitching",
            }, name="create inspection item")
            e2e.create(m, f"{API}/quality/corrective-actions/", {
                "inspection": insp_id, "title": "Re-train sewing operators",
                "description": "Stitch defects exceed acceptable threshold",
                "corrective_measure": "Operator re-training + line audit",
                "preventive_measure": "Weekly line audit",
                "due_date": TODAY,
                "priority": "high",
            }, name="create corrective action", require_keys=("id", "title"))
    e2e.list_endpoint(m, f"{API}/quality/inspection-items/", name="inspection items list")
    e2e.list_endpoint(m, f"{API}/quality/corrective-actions/", name="corrective actions list")

    gold_seals = e2e.list_endpoint(m, f"{API}/quality/gold-seals/", name="gold seals list")
    gs = gold_seals[0] if gold_seals else {}
    if gs.get("id"):
        e2e.detail_endpoint(m, f"{API}/quality/gold-seals/{gs['id']}/", name="gold seal detail",
                            require_keys=("shipment", "status"))

    audits = e2e.list_endpoint(m, f"{API}/quality/compliance-audits/", name="compliance audits list")
    audit = audits[0] if audits else {}
    if audit.get("id"):
        e2e.detail_endpoint(m, f"{API}/quality/compliance-audits/{audit['id']}/", name="compliance audit detail",
                            require_keys=("purchase_order", "po_number", "week_start"))
    e2e.action(m, f"{API}/quality/compliance-audits/weekly_overview/", name="compliance audit weekly overview",
               method="get", expect=(200,))


def walk_logistics(e2e):
    m = "Logistics"
    shipments = e2e.list_endpoint(m, f"{API}/logistics/shipments/", name="shipments list")
    ship = shipments[0] if shipments else {}
    if ship.get("id"):
        sd = e2e.detail_endpoint(m, f"{API}/logistics/shipments/{ship['id']}/", name="shipment detail",
                                 require_keys=("shipment_number", "purchase_order", "po_number"))
        if sd.get("purchase_order"):
            e2e.resolve(m, "shipment -> PO", sd["purchase_order"], API + "/merchandising/purchase-orders/{obj_id}/",
                        require_keys=("po_number",))
    e2e.action(m, f"{API}/logistics/shipments/dashboard/", name="shipment dashboard", method="get", expect=(200,))
    e2e.action(m, f"{API}/logistics/shipments/paperwork_comparison/", name="paperwork comparison", method="get", expect=(200,))
    e2e.action(m, f"{API}/logistics/shipments/booking_ref_alerts/", name="booking ref alerts", method="get", expect=(200,))
    e2e.list_endpoint(m, f"{API}/logistics/documents/", name="shipping documents list", require_data=False)
    e2e.list_endpoint(m, f"{API}/logistics/freight-forwarders/", name="freight forwarders list")
    e2e.list_endpoint(m, f"{API}/logistics/booking-schedule/", name="booking schedule list")
    dockets = e2e.list_endpoint(m, f"{API}/logistics/dockets/", name="dockets list")
    docket = dockets[0] if dockets else {}
    if docket.get("id"):
        e2e.detail_endpoint(m, f"{API}/logistics/dockets/{docket['id']}/", name="docket detail",
                            require_keys=("shipment_number", "po_number"))
    recs = e2e.list_endpoint(m, f"{API}/logistics/reconciliations/", name="reconciliations list")
    rec = recs[0] if recs else {}
    if rec.get("id"):
        e2e.detail_endpoint(m, f"{API}/logistics/reconciliations/{rec['id']}/", name="reconciliation detail",
                            require_keys=("shipment_number", "po_number"))


def walk_reporting_monitoring(e2e):
    m = "Reporting & Monitoring"
    reports = e2e.list_endpoint(m, f"{API}/reporting/reports/", name="reports list")
    report = reports[0] if reports else {}
    if report.get("id"):
        e2e.detail_endpoint(m, f"{API}/reporting/reports/{report['id']}/", name="report detail", require_keys=("id",))
        e2e.action(m, f"{API}/reporting/reports/{report['id']}/execute/", name="report execute", expect=(200,))
    e2e.list_endpoint(m, f"{API}/monitoring/audit-logs/", name="audit logs list")
    e2e.action(m, f"{API}/monitoring/health/run_checks/", name="run health checks", expect=(200,))
    e2e.action(m, f"{API}/monitoring/alerts/summary/", name="alerts summary", method="get", expect=(200,))
    e2e.create(m, f"{API}/monitoring/alerts/", {
        "alert_type": "warning", "service": "production", "title": "Shipment delay detected",
        "message": "ETA missed by 3 days", "entity_type": "shipment", "entity_id": "SHIP-E2E-001",
    }, name="create alert", require_keys=("id", "title"))
    e2e.list_endpoint(m, f"{API}/monitoring/alerts/", name="alerts list")


def test_full_product_lifecycle(e2e):
    """Walk every feature module end-to-end through the real API."""
    walk_auth_and_health(e2e)
    walk_setup_admin(e2e)
    po_id, po = walk_merchandising(e2e)
    walk_fabric(e2e)
    walk_commercial(e2e, po_id)
    walk_production(e2e, po_id)
    walk_quality(e2e, po_id)
    walk_logistics(e2e)
    walk_reporting_monitoring(e2e)

    # Logout last (blacklists the refresh token used above).
    e2e.action("Auth & Health", f"{API}/auth/logout/", name="logout",
               payload={"refresh": e2e.refresh}, expect=(200,))

    report = e2e.report_text()
    print("\n" + report)
    failed = [r for r in e2e.results if not r[2]]
    assert not failed, f"{len(failed)} E2E check(s) failed:\n" + "\n".join(
        f"  [{m}] {n}: {d}" for m, n, ok, d in e2e.results if not ok
    ) + "\n\nFULL REPORT\n" + report
