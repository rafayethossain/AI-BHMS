import os, sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import django
django.setup()

from apps.users.models import User

u = User.objects.get(email='admin@demo.com')
print(f'User: {u.email} | username: {u.username}')
print(f'has_usable_password: {u.has_usable_password()}')
print(f'check admin123: {u.check_password("admin123")}')

# Reset password to known value
u.set_password('admin123')
u.save(update_fields=['password'])
print(f'After reset, check admin123: {u.check_password("admin123")}')
print(f'Tenant ID: {u.tenant_id}')
print(f'Is active: {u.is_active}')
