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
from apps.merchandising.models import PurchaseOrder
from apps.merchandising.views import PurchaseOrderViewSet

User = get_user_model()
tenant = Tenant.objects.filter(is_active=True).first()
user = User.objects.filter(tenant=tenant).first()
po = PurchaseOrder.objects.filter(tenant=tenant).order_by('-created_at').first()
factory = APIRequestFactory()
request = factory.get('/')
force_authenticate(request, user=user)
request.tenant = tenant
view = PurchaseOrderViewSet.as_view({'get': 'profit'})
try:
    resp = view(request, pk=str(po.id))
    print('Status:', resp.status_code)
    print('Revenue:', resp.data.get('revenue'))
    print('Cost:', resp.data.get('total_cost'))
    print('Profit:', resp.data.get('profit'))
    print('Margin:', resp.data.get('margin_percent'), '%')
    print('Cost breakdown:', resp.data.get('cost_breakdown'))
except Exception as e:
    traceback.print_exc()
