"""
TDD Tests for Dashboard Summary Endpoint
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
from apps.core.views import DashboardSummaryView

User = get_user_model()


class DashboardEndpointTest:
    def __init__(self):
        self.tenant = Tenant.objects.filter(is_active=True).first()
        self.user = User.objects.filter(tenant=self.tenant).first()
        self.factory_req = APIRequestFactory()
        self.results = []

    def run_all(self):
        print("=" * 60)
        print("DASHBOARD SUMMARY ENDPOINT TESTS")
        print("=" * 60)

        self.test_returns_200()
        self.test_has_pipeline()
        self.test_has_financials()
        self.test_has_tasks()
        self.test_has_alerts()
        self.test_pipeline_stages()
        self.test_financials_fields()
        self.test_tasks_fields()
        self.test_alerts_structure()

        passed = sum(1 for r in self.results if r['status'] == 'PASS')
        failed = sum(1 for r in self.results if r['status'] == 'FAIL')
        print(f"\n{'=' * 60}")
        print(f"RESULTS: {passed} passed, {failed} failed, {len(self.results)} total")
        print(f"{'=' * 60}")
        return failed == 0

    def _call(self):
        request = self.factory_req.get('/')
        force_authenticate(request, user=self.user)
        request.tenant = self.tenant
        view = DashboardSummaryView.as_view()
        try:
            return view(request)
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

    def test_returns_200(self):
        resp = self._call()
        self._assert("Dashboard returns 200", resp.status_code == 200, f"got {resp.status_code}")

    def test_has_pipeline(self):
        resp = self._call()
        self._assert("Has pipeline", 'pipeline' in resp.data)
        self._assert("Pipeline is list", isinstance(resp.data.get('pipeline'), list))

    def test_has_financials(self):
        resp = self._call()
        self._assert("Has financials", 'financials' in resp.data)
        self._assert("Financials is dict", isinstance(resp.data.get('financials'), dict))

    def test_has_tasks(self):
        resp = self._call()
        self._assert("Has tasks", 'tasks' in resp.data)
        self._assert("Tasks is dict", isinstance(resp.data.get('tasks'), dict))

    def test_has_alerts(self):
        resp = self._call()
        self._assert("Has alerts", 'alerts' in resp.data)
        self._assert("Alerts is list", isinstance(resp.data.get('alerts'), list))

    def test_pipeline_stages(self):
        resp = self._call()
        stages = [p['stage'] for p in resp.data.get('pipeline', [])]
        expected = ['Styles', 'File Openings', 'Purchase Orders', 'Production', 'Quality', 'Shipments']
        self._assert("Pipeline has 6 stages", len(stages) == 6, f"got {len(stages)}")
        for exp in expected:
            self._assert(f"  Stage '{exp}'", exp in stages)

    def test_financials_fields(self):
        resp = self._call()
        f = resp.data.get('financials', {})
        required = ['total_revenue', 'total_cost', 'profit_margin', 'profit_margin_pct', 'lc_total', 'lc_utilized', 'po_value_total']
        for field in required:
            self._assert(f"  Financials has '{field}'", field in f)

    def test_tasks_fields(self):
        resp = self._call()
        t = resp.data.get('tasks', {})
        required = ['overdue_milestones', 'upcoming_milestones', 'pending_inspections', 'pending_costings', 'draft_pos', 'overdue_items']
        for field in required:
            self._assert(f"  Tasks has '{field}'", field in t)

    def test_alerts_structure(self):
        resp = self._call()
        alerts = resp.data.get('alerts', [])
        if alerts:
            alert = alerts[0]
            self._assert("Alert has type", 'type' in alert)
            self._assert("Alert has title", 'title' in alert)
            self._assert("Alert has description", 'description' in alert)
            self._assert("Alert has path", 'path' in alert)
        else:
            self._assert("Alerts list not empty", False, "0 alerts")


if __name__ == '__main__':
    test = DashboardEndpointTest()
    success = test.run_all()
    sys.exit(0 if success else 1)
