import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { tenantApi, type TenantConfig } from '../api/client';
import { useToast } from '../contexts/ToastContext';

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Dhaka', label: 'Asia/Dhaka (GMT+6)' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (GMT+5:30)' },
  { value: 'Europe/London', label: 'Europe/London (GMT+0)' },
  { value: 'America/New_York', label: 'America/New_York (GMT-5)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (GMT-8)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (GMT+11)' },
];

const PLAN_COLORS: Record<string, string> = {
  starter: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  professional: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  enterprise: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

export default function TenantSetupPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenant, setTenant] = useState<TenantConfig | null>(null);
  const [form, setForm] = useState({
    name: '',
    legal_name: '',
    address: '',
    phone: '',
    email: '',
    timezone: '',
  });

  useEffect(() => {
    tenantApi.getTenant()
      .then((res) => {
        setTenant(res.data);
        setForm({
          name: res.data.name || '',
          legal_name: res.data.legal_name || '',
          address: res.data.address || '',
          phone: res.data.phone || '',
          email: res.data.email || '',
          timezone: res.data.timezone || '',
        });
      })
      .catch(() => toast('error', 'Failed to load company information'))
      .finally(() => setLoading(false));
  }, [toast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await tenantApi.updateTenant(form);
      setTenant(res.data);
      toast('success', 'Company information updated successfully');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save';
      toast('error', msg);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-6 flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-muted mb-1">
            <a href="/setup" className="hover:text-heading transition-colors">Setup</a>
            <span>/</span>
            <span className="text-heading">Company Setup</span>
          </div>
          <h1 className="text-2xl font-bold text-heading">Company Setup</h1>
          <p className="text-muted text-sm mt-1">Configure your tenant company information</p>
        </div>

        <div className="space-y-6">
          {/* Plan Badge */}
          {tenant?.plan && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted">Current Plan:</span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${PLAN_COLORS[tenant.plan] || 'bg-surface-alt text-muted border-border'}`}>
                {tenant.plan.charAt(0).toUpperCase() + tenant.plan.slice(1)}
              </span>
            </div>
          )}

          {/* Company Information */}
          <div className="bg-surface border border-border rounded-xl">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-heading">Company Information</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm text-muted mb-1">Company Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-faint"
                  placeholder="Enter company name"
                />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Legal Name</label>
                <input
                  type="text"
                  value={form.legal_name}
                  onChange={(e) => updateField('legal_name', e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-faint"
                  placeholder="Enter legal name"
                />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Address</label>
                <textarea
                  value={form.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none placeholder:text-faint"
                  placeholder="Enter company address"
                />
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-surface border border-border rounded-xl">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-heading">Contact</h2>
            </div>
            <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-muted mb-1">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-faint"
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-faint"
                  placeholder="Enter email address"
                />
              </div>
            </div>
          </div>

          {/* Configuration */}
          <div className="bg-surface border border-border rounded-xl">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-heading">Configuration</h2>
            </div>
            <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-muted mb-1">Timezone</label>
                <select
                  value={form.timezone}
                  onChange={(e) => updateField('timezone', e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Select timezone...</option>
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Currency</label>
                <div className="w-full px-3 py-2 bg-surface-alt border border-input-border rounded-lg text-muted text-sm">
                  {tenant?.currency_name || tenant?.currency || 'Not configured'}
                </div>
              </div>
            </div>
          </div>

          {/* Logo */}
          <div className="bg-surface border border-border rounded-xl">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-heading">Logo</h2>
            </div>
            <div className="px-6 py-4 flex items-center gap-4">
              {tenant?.logo ? (
                <img src={tenant.logo} alt="Company logo" className="h-16 w-16 rounded-lg object-contain border border-border bg-surface-alt" />
              ) : (
                <div className="h-16 w-16 rounded-lg border border-dashed border-input-border bg-surface-alt flex items-center justify-center text-muted text-xs">
                  No logo
                </div>
              )}
              <div className="text-sm text-muted">
                Upload and manage your company logo from the tenant admin panel.
              </div>
            </div>
          </div>

          {/* Save */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
