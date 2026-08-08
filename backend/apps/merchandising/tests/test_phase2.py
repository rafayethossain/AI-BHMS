"""
TDD Tests for Phase 2 Endpoints:
- generate_pi, generate_sc, linked
"""
import os, sys, traceback
_backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
sys.path.insert(0, _backend_dir)
os.chdir(_backend_dir)
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings.development'
import django
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory, force_authenticate
from apps.tenants.models import Tenant
from apps.merchandising.models import (
    Style, StyleVersion, FileOpening, PurchaseOrder,
    BOM, BOMItem, Costing, TA, TAMilestone
)
from apps.merchandising.views import PurchaseOrderViewSet
from apps.setup.models import Buyer, Factory, Currency
from apps.commercial.models import ProformaInvoice, SalesContract

User = get_user_model()


class Phase2EndpointTest:
    def __init__(self):
        self.tenant = Tenant.objects.filter(is_active=True).first()
        self.user = User.objects.filter(tenant=self.tenant).first()
        self.po = PurchaseOrder.objects.filter(tenant=self.tenant).order_by('-created_at').first()
        self.factory_req = APIRequestFactory()
        self.results = []

    def run_all(self):
        print("=" * 60)
        print("PHASE 2 ENDPOINT TESTS")
        print("=" * 60)
        if not self.po:
            print("  FATAL: No PurchaseOrder found.")
            return False

        self.test_generate_pi_creates()
        self.test_generate_pi_idempotent()
        self.test_generate_sc_creates()
        self.test_generate_sc_idempotent()
        self.test_linked_returns_all_entities()
        self.test_linked_no_pi_sc()
        self.test_linked_with_existing_pi_sc()

        passed = sum(1 for r in self.results if r['status'] == 'PASS')
        failed = sum(1 for r in self.results if r['status'] == 'FAIL')
        print(f"\n{'=' * 60}")
        print(f"RESULTS: {passed} passed, {failed} failed, {len(self.results)} total")
        print(f"{'=' * 60}")
        return failed == 0

    def _call(self, action, method='get', data=None):
        request = getattr(self.factory_req, method)('/', data=data, format='json')
        force_authenticate(request, user=self.user)
        request.tenant = self.tenant
        view = PurchaseOrderViewSet.as_view({method: action})
        try:
            return view(request, pk=str(self.po.id))
        except Exception as e:
            traceback.print_exc()
            class MockResp:
                status_code = 500
                data = {'error': str(e)}
            return MockResp()

    def _assert(self, name, condition, detail=''):
        s = 'PASS' if condition else 'FAIL'
        m = '✓' if condition else '✗'
        print(f"  {m} {name}" + (f" — {detail}" if detail else ""))
        self.results.append({'name': name, 'status': s, 'detail': detail})

    # --- generate_pi tests ---
    def test_generate_pi_creates(self):
        ProformaInvoice.objects.filter(tenant=self.tenant, purchase_order=self.po).delete()
        resp = self._call('generate_pi', 'post')
        self._assert("generate_pi returns 201", resp.status_code == 201, f"got {resp.status_code}")
        self._assert("generate_pi returns pi_number", 'pi_number' in resp.data, f"keys: {list(resp.data.keys())}")
        self._assert("generate_pi status is created", resp.data.get('status') == 'created', f"got {resp.data.get('status')}")

    def test_generate_pi_idempotent(self):
        resp = self._call('generate_pi', 'post')
        self._assert("generate_pi idempotent returns 200", resp.status_code == 200, f"got {resp.status_code}")
        self._assert("generate_pi idempotent status is exists", resp.data.get('status') == 'exists', f"got {resp.data.get('status')}")

    # --- generate_sc tests ---
    def test_generate_sc_creates(self):
        SalesContract.objects.filter(tenant=self.tenant, purchase_order=self.po).delete()
        resp = self._call('generate_sc', 'post')
        self._assert("generate_sc returns 201", resp.status_code == 201, f"got {resp.status_code}")
        self._assert("generate_sc returns contract_number", 'contract_number' in resp.data, f"keys: {list(resp.data.keys())}")
        self._assert("generate_sc status is created", resp.data.get('status') == 'created', f"got {resp.data.get('status')}")

    def test_generate_sc_idempotent(self):
        resp = self._call('generate_sc', 'post')
        self._assert("generate_sc idempotent returns 200", resp.status_code == 200, f"got {resp.status_code}")
        self._assert("generate_sc idempotent status is exists", resp.data.get('status') == 'exists', f"got {resp.data.get('status')}")

    # --- linked tests ---
    def test_linked_returns_all_entities(self):
        resp = self._call('linked', 'get')
        self._assert("linked returns 200", resp.status_code == 200, f"got {resp.status_code}")
        data = resp.data
        self._assert("linked has style", 'style' in data, f"keys: {list(data.keys())}")
        self._assert("linked has file_opening", 'file_opening' in data)
        self._assert("linked has ta", 'ta' in data)
        self._assert("linked has bom", 'bom' in data)
        self._assert("linked has costing", 'costing' in data)
        self._assert("linked has production_plan", 'production_plan' in data)
        self._assert("linked has quality_inspections", 'quality_inspections' in data)
        self._assert("linked has proforma_invoice", 'proforma_invoice' in data)
        self._assert("linked has sales_contract", 'sales_contract' in data)

    def test_linked_no_pi_sc(self):
        ProformaInvoice.objects.filter(tenant=self.tenant, purchase_order=self.po).delete()
        SalesContract.objects.filter(tenant=self.tenant, purchase_order=self.po).delete()
        resp = self._call('linked', 'get')
        self._assert("linked without PI/SC returns 200", resp.status_code == 200)
        self._assert("linked proforma_invoice is None", resp.data.get('proforma_invoice') is None)
        self._assert("linked sales_contract is None", resp.data.get('sales_contract') is None)

    def test_linked_with_existing_pi_sc(self):
        self._call('generate_pi', 'post')
        self._call('generate_sc', 'post')
        resp = self._call('linked', 'get')
        self._assert("linked with PI/SC returns 200", resp.status_code == 200)
        self._assert("linked proforma_invoice is not None", resp.data.get('proforma_invoice') is not None)
        self._assert("linked sales_contract is not None", resp.data.get('sales_contract') is not None)
        pi = resp.data['proforma_invoice']
        self._assert("linked PI has pi_number", 'pi_number' in pi)
        sc = resp.data['sales_contract']
        self._assert("linked SC has contract_number", 'contract_number' in sc)


if __name__ == '__main__':
    test = Phase2EndpointTest()
    success = test.run_all()
    sys.exit(0 if success else 1)
