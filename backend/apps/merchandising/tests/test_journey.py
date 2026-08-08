"""
TDD Tests for Order Journey Endpoint
Phase 1: Order Journey Tracker
"""
import os, sys, json, traceback
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
    Style, StyleVersion, FileOpening, PurchaseOrder, PurchaseOrderItem,
    BOM, BOMItem, Costing, TA, TAMilestone
)
from apps.merchandising.views import PurchaseOrderViewSet
from apps.setup.models import Buyer, Factory, Currency
from apps.production.models import ProductionPlan
from apps.quality.models import Inspection
from apps.logistics.models import Shipment
from apps.commercial.models import ProformaInvoice, SalesContract, LC
from decimal import Decimal
import uuid

User = get_user_model()

class OrderJourneyEndpointTest:
    def __init__(self):
        self.tenant = Tenant.objects.filter(is_active=True).first()
        self.user = User.objects.filter(tenant=self.tenant).first()
        self.po = PurchaseOrder.objects.filter(tenant=self.tenant).order_by('-created_at').first()
        self.factory_req = APIRequestFactory()
        self.results = []

    def run_all(self):
        print("=" * 60)
        print("ORDER JOURNEY ENDPOINT TESTS")
        print("=" * 60)
        if not self.po:
            print("  FATAL: No PurchaseOrder found. Cannot run tests.")
            return False

        self.test_journey_returns_200()
        self.test_journey_has_all_steps()
        self.test_journey_step_statuses()
        self.test_journey_step_ids()
        self.test_journey_step_counts()
        self.test_journey_current_step()
        self.test_journey_completion_percentage()
        self.test_journey_style_step()
        self.test_journey_fo_step()
        self.test_journey_bom_step()
        self.test_journey_costing_step()
        self.test_journey_ta_step()
        self.test_journey_production_step()
        self.test_journey_quality_step()
        self.test_journey_commercial_step()
        self.test_journey_logistics_step()

        passed = sum(1 for r in self.results if r['status'] == 'PASS')
        failed = sum(1 for r in self.results if r['status'] == 'FAIL')
        print(f"\n{'=' * 60}")
        print(f"RESULTS: {passed} passed, {failed} failed, {len(self.results)} total")
        print(f"{'=' * 60}")
        return failed == 0

    def _get_journey(self):
        request = self.factory_req.get('/')
        force_authenticate(request, user=self.user)
        request.tenant = self.tenant
        view = PurchaseOrderViewSet.as_view({'get': 'journey'})
        try:
            return view(request, pk=str(self.po.id))
        except Exception as e:
            traceback.print_exc()
            # Return a mock response-like object
            class MockResp:
                status_code = 500
                data = {'error': str(e)}
            return MockResp()

    def _assert(self, name, condition, detail=''):
        status = 'PASS' if condition else 'FAIL'
        marker = '✓' if condition else '✗'
        print(f"  {marker} {name}" + (f" — {detail}" if detail else ""))
        self.results.append({'name': name, 'status': status, 'detail': detail})

    def test_journey_returns_200(self):
        response = self._get_journey()
        self._assert("Journey endpoint returns 200", response.status_code == 200, f"got {response.status_code}")

    def test_journey_has_all_steps(self):
        response = self._get_journey()
        steps = response.data.get('steps', []) if isinstance(response.data, dict) else []
        expected = ['style', 'file_opening', 'purchase_order', 'bom', 'costing', 'ta', 'production', 'quality', 'logistics', 'commercial']
        self._assert("Journey has all 10 steps", len(steps) == 10, f"got {len(steps)} steps")
        step_keys = [s['key'] for s in steps]
        for exp in expected:
            self._assert(f"  Step '{exp}' exists", exp in step_keys, f"got keys: {step_keys}")

    def test_journey_step_statuses(self):
        response = self._get_journey()
        if not isinstance(response.data, dict):
            self._assert("Can parse response", False, "response is not dict")
            return
        steps = {s['key']: s for s in response.data.get('steps', [])}
        fo = self.po.file_opening
        style = fo.style if fo else None
        sv = fo.style_version if fo else None
        bom = BOM.objects.filter(tenant=self.tenant, style_version=sv).order_by('-version').first() if sv else None
        costing = Costing.objects.filter(tenant=self.tenant, purchase_order=self.po).order_by('-version').first()
        ta_obj = TA.objects.filter(tenant=self.tenant, purchase_order=self.po).first()

        if style:
            self._assert("Style step status matches DB", steps.get('style', {}).get('status') == style.status, f"got '{steps.get('style', {}).get('status')}' vs '{style.status}'")
        if fo:
            self._assert("FO step status matches DB", steps.get('file_opening', {}).get('status') == fo.status, f"got '{steps.get('file_opening', {}).get('status')}' vs '{fo.status}'")
        self._assert("PO step status matches DB", steps.get('purchase_order', {}).get('status') == self.po.status, f"got '{steps.get('purchase_order', {}).get('status')}' vs '{self.po.status}'")
        if bom:
            self._assert("BOM step status matches DB", steps.get('bom', {}).get('status') == bom.status, f"got '{steps.get('bom', {}).get('status')}' vs '{bom.status}'")
        if costing:
            self._assert("Costing step status matches DB", steps.get('costing', {}).get('status') == costing.status, f"got '{steps.get('costing', {}).get('status')}' vs '{costing.status}'")
        if ta_obj:
            self._assert("TA step status matches DB", steps.get('ta', {}).get('status') == ta_obj.status, f"got '{steps.get('ta', {}).get('status')}' vs '{ta_obj.status}'")

    def test_journey_step_ids(self):
        response = self._get_journey()
        if not isinstance(response.data, dict):
            return
        steps = {s['key']: s for s in response.data.get('steps', [])}
        fo = self.po.file_opening
        style = fo.style if fo else None
        self._assert("PO step has PO ID", steps.get('purchase_order', {}).get('id') == str(self.po.id))

    def test_journey_step_counts(self):
        response = self._get_journey()
        if not isinstance(response.data, dict):
            return
        steps = {s['key']: s for s in response.data.get('steps', [])}
        ta_obj = TA.objects.filter(tenant=self.tenant, purchase_order=self.po).first()
        self._assert("TA step has milestones_total", 'milestones_total' in steps.get('ta', {}))
        self._assert("TA step has milestones_completed", 'milestones_completed' in steps.get('ta', {}))
        self._assert("Production step has plans_count", 'plans_count' in steps.get('production', {}))
        self._assert("Quality step has inspections_count", 'inspections_count' in steps.get('quality', {}))
        self._assert("Logistics step has shipments_count", 'shipments_count' in steps.get('logistics', {}))

    def test_journey_current_step(self):
        response = self._get_journey()
        if not isinstance(response.data, dict):
            return
        current = response.data.get('current_step', '')
        self._assert("Journey has current_step", current != '', f"current_step: '{current}'")
        valid_steps = ['style', 'file_opening', 'purchase_order', 'bom', 'costing', 'ta', 'production', 'quality', 'logistics', 'commercial']
        self._assert("Current step is valid key", current in valid_steps, f"got '{current}'")

    def test_journey_completion_percentage(self):
        response = self._get_journey()
        if not isinstance(response.data, dict):
            return
        pct = response.data.get('completion_percentage', -1)
        self._assert("completion_percentage is 0-100", 0 <= pct <= 100, f"got {pct}%")
        self._assert("Journey has steps array", 'steps' in response.data)

    def test_journey_style_step(self):
        response = self._get_journey()
        if not isinstance(response.data, dict):
            return
        steps = {s['key']: s for s in response.data.get('steps', [])}
        s = steps.get('style', {})
        self._assert("Style step has 'label'", s.get('label', '') != '')
        self._assert("Style step has 'status'", s.get('status', '') != '')

    def test_journey_fo_step(self):
        response = self._get_journey()
        if not isinstance(response.data, dict):
            return
        steps = {s['key']: s for s in response.data.get('steps', [])}
        s = steps.get('file_opening', {})
        self._assert("FO step has 'label'", s.get('label', '') != '')
        self._assert("FO step has 'code'", s.get('code', '') != '', f"code: {s.get('code')}")

    def test_journey_bom_step(self):
        response = self._get_journey()
        if not isinstance(response.data, dict):
            return
        steps = {s['key']: s for s in response.data.get('steps', [])}
        s = steps.get('bom', {})
        self._assert("BOM step has 'label'", s.get('label', '') != '')
        self._assert("BOM step has 'items_count'", 'items_count' in s)

    def test_journey_costing_step(self):
        response = self._get_journey()
        if not isinstance(response.data, dict):
            return
        steps = {s['key']: s for s in response.data.get('steps', [])}
        s = steps.get('costing', {})
        self._assert("Costing step has 'label'", s.get('label') != '')
        self._assert("Costing step has 'total_cost'", 'total_cost' in s)

    def test_journey_ta_step(self):
        response = self._get_journey()
        if not isinstance(response.data, dict):
            return
        steps = {s['key']: s for s in response.data.get('steps', [])}
        s = steps.get('ta', {})
        self._assert("TA step has 'label'", s.get('label') != '')
        self._assert("TA step has 'milestones_total'", 'milestones_total' in s)
        self._assert("TA step has 'milestones_completed'", 'milestones_completed' in s)

    def test_journey_production_step(self):
        response = self._get_journey()
        if not isinstance(response.data, dict):
            return
        steps = {s['key']: s for s in response.data.get('steps', [])}
        s = steps.get('production', {})
        self._assert("Production step has 'label'", s.get('label') != '')
        self._assert("Production step has valid status", s.get('status') in ['not_started', 'draft', 'planned', 'in_progress', 'completed'])
        self._assert("Production step has 'plans_count'", 'plans_count' in s)

    def test_journey_quality_step(self):
        response = self._get_journey()
        if not isinstance(response.data, dict):
            return
        steps = {s['key']: s for s in response.data.get('steps', [])}
        s = steps.get('quality', {})
        self._assert("Quality step has 'label'", s.get('label') != '')
        self._assert("Quality step has valid status", s.get('status') in ['not_started', 'pending', 'in_progress', 'passed', 'failed'])
        self._assert("Quality step has 'inspections_count'", 'inspections_count' in s)

    def test_journey_commercial_step(self):
        response = self._get_journey()
        if not isinstance(response.data, dict):
            return
        steps = {s['key']: s for s in response.data.get('steps', [])}
        s = steps.get('commercial', {})
        self._assert("Commercial step has 'label'", s.get('label') != '')
        self._assert("Commercial step has valid status", s.get('status') in ['not_started', 'in_progress', 'completed'])
        self._assert("Commercial step has 'pi_status'", 'pi_status' in s)
        self._assert("Commercial step has 'sc_status'", 'sc_status' in s)
        self._assert("Commercial step has 'lc_status'", 'lc_status' in s)

    def test_journey_logistics_step(self):
        response = self._get_journey()
        if not isinstance(response.data, dict):
            return
        steps = {s['key']: s for s in response.data.get('steps', [])}
        s = steps.get('logistics', {})
        self._assert("Logistics step has 'label'", s.get('label') != '')
        self._assert("Logistics step has valid status", s.get('status') in ['not_started', 'planned', 'booked', 'in_transit', 'delivered'])
        self._assert("Logistics step has 'shipments_count'", 'shipments_count' in s)


if __name__ == '__main__':
    test = OrderJourneyEndpointTest()
    success = test.run_all()
    sys.exit(0 if success else 1)
