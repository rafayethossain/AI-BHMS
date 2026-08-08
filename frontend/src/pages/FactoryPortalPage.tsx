import { useState, useEffect, type FormEvent } from 'react';
import { productionApi, merchApi } from '../api/client';
import type { DailyProduction } from '../api/client';
import SearchableSelect from '../components/SearchableSelect';
import { useToast } from '../contexts/ToastContext';
import Layout from '../components/Layout';

function efficiencyColor(val: number | null): string {
  if (val === null) return 'text-muted';
  if (val > 80) return 'text-emerald-400';
  if (val > 60) return 'text-amber-400';
  return 'text-red-400';
}

export default function FactoryPortalPage() {
  const { toast } = useToast();
  const [pos, setPOs] = useState<{ value: string; label: string }[]>([]);
  const [todayReports, setTodayReports] = useState<DailyProduction[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    purchase_order: '',
    production_date: today,
    line_number: '',
    target_quantity: '',
    actual_quantity: '',
    passed_quantity: '',
    rejected_quantity: '',
    manpower: '',
    working_hours: '',
    remarks: '',
  });

  const fetchTodayReports = async () => {
    try {
      const res = await productionApi.getDailyReports({ production_date: today, page_size: '50' });
      setTodayReports(res.data.results);
    } catch { toast('error', 'Failed to load today\'s reports'); }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const poRes = await merchApi.getPOs({ page_size: '500' });
        setPOs(poRes.data.results.map(p => ({ value: p.id, label: p.po_number })));
        await fetchTodayReports();
      } catch { toast('error', 'Failed to load factory portal data'); } finally { setLoading(false); }
    };
    load();
  }, []);

  const quickStats = todayReports.reduce(
    (acc, r) => ({
      actual: acc.actual + r.actual_quantity,
      passed: acc.passed + r.passed_quantity,
      rejected: acc.rejected + r.rejected_quantity,
    }),
    { actual: 0, passed: 0, rejected: 0 }
  );

  const todayEfficiency = todayReports.length > 0
    ? todayReports.reduce((sum, r) => sum + (r.efficiency ?? 0), 0) / todayReports.filter(r => r.efficiency !== null).length
    : null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        purchase_order: form.purchase_order,
        production_date: form.production_date,
        actual_quantity: Number(form.actual_quantity),
        passed_quantity: Number(form.passed_quantity),
        rejected_quantity: Number(form.rejected_quantity),
      };
      if (form.line_number) payload.line_number = Number(form.line_number);
      if (form.target_quantity) payload.target_quantity = Number(form.target_quantity);
      if (form.manpower) payload.manpower = Number(form.manpower);
      if (form.working_hours) payload.working_hours = Number(form.working_hours);
      if (form.remarks) payload.remarks = form.remarks;

      await productionApi.createDailyReport(payload);
      toast('success', 'Report submitted successfully');
      setForm({
        purchase_order: '',
        production_date: today,
        line_number: '',
        target_quantity: '',
        actual_quantity: '',
        passed_quantity: '',
        rejected_quantity: '',
        manpower: '',
        working_hours: '',
        remarks: '',
      });
      await fetchTodayReports();
    } catch {
      toast('error', 'Failed to submit report');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Factory Reporting Portal</h1>
          <p className="text-muted text-sm mt-1">Submit daily production reports</p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" />
          </div>
        )}

        {!loading && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-surface rounded-xl border border-border p-5">
                <p className="text-muted text-sm">Today's Actual</p>
                <p className="text-3xl font-bold mt-1 text-blue-400">{quickStats.actual.toLocaleString()}</p>
              </div>
              <div className="bg-surface rounded-xl border border-border p-5">
                <p className="text-muted text-sm">Today's Passed</p>
                <p className="text-3xl font-bold mt-1 text-emerald-400">{quickStats.passed.toLocaleString()}</p>
              </div>
              <div className="bg-surface rounded-xl border border-border p-5">
                <p className="text-muted text-sm">Today's Rejected</p>
                <p className="text-3xl font-bold mt-1 text-red-400">{quickStats.rejected.toLocaleString()}</p>
              </div>
              <div className="bg-surface rounded-xl border border-border p-5">
                <p className="text-muted text-sm">Today's Efficiency</p>
                <p className={`text-3xl font-bold mt-1 ${efficiencyColor(todayEfficiency)}`}>
                  {todayEfficiency !== null ? `${todayEfficiency.toFixed(1)}%` : '-'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-surface rounded-xl border border-border p-6">
                <h2 className="text-lg font-semibold mb-4">Submit Daily Report</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm text-body mb-1">Purchase Order *</label>
                    <SearchableSelect
                      options={pos}
                      value={form.purchase_order}
                      onChange={(v) => setForm({ ...form, purchase_order: String(v || '') })}
                      placeholder="Select PO"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-body mb-1">Date *</label>
                      <input required type="date" value={form.production_date}
                        onChange={(e) => setForm({ ...form, production_date: e.target.value })}
                        className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-sm text-body mb-1">Line #</label>
                      <input type="number" min="0" value={form.line_number}
                        onChange={(e) => setForm({ ...form, line_number: e.target.value })}
                        className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="1" />
                    </div>
                    <div>
                      <label className="block text-sm text-body mb-1">Target</label>
                      <input type="number" min="0" value={form.target_quantity}
                        onChange={(e) => setForm({ ...form, target_quantity: e.target.value })}
                        className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="0" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-body mb-1">Actual Qty *</label>
                      <input required type="number" min="0" value={form.actual_quantity}
                        onChange={(e) => setForm({ ...form, actual_quantity: e.target.value })}
                        className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-sm text-body mb-1">Passed *</label>
                      <input required type="number" min="0" value={form.passed_quantity}
                        onChange={(e) => setForm({ ...form, passed_quantity: e.target.value })}
                        className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-sm text-body mb-1">Rejected *</label>
                      <input required type="number" min="0" value={form.rejected_quantity}
                        onChange={(e) => setForm({ ...form, rejected_quantity: e.target.value })}
                        className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="0" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-body mb-1">Manpower</label>
                      <input type="number" min="0" value={form.manpower}
                        onChange={(e) => setForm({ ...form, manpower: e.target.value })}
                        className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-sm text-body mb-1">Working Hours</label>
                      <input type="number" min="0" step="0.5" value={form.working_hours}
                        onChange={(e) => setForm({ ...form, working_hours: e.target.value })}
                        className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-body mb-1">Remarks</label>
                    <textarea value={form.remarks}
                      onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                      className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" rows={2} />
                  </div>
                  <button type="submit" disabled={saving}
                    className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white text-sm rounded-lg font-medium transition-colors">
                    {saving ? 'Submitting...' : 'Submit Report'}
                  </button>
                </form>
              </div>

              <div className="bg-surface rounded-xl border border-border p-6">
                <h2 className="text-lg font-semibold mb-4">Today's Submissions</h2>
                {todayReports.length === 0 ? (
                  <p className="text-faint text-sm">No reports submitted today</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-muted border-b border-border">
                          <th className="text-left py-2 pr-3 font-medium">PO #</th>
                          <th className="text-right py-2 pr-3 font-medium">Line</th>
                          <th className="text-right py-2 pr-3 font-medium">Actual</th>
                          <th className="text-right py-2 pr-3 font-medium">Passed</th>
                          <th className="text-right py-2 pr-3 font-medium">Rejected</th>
                          <th className="text-right py-2 font-medium">Eff.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {todayReports.map((r) => (
                          <tr key={r.id} className="border-b border-border/50">
                            <td className="py-2 pr-3 font-mono text-emerald-400">{r.po_number}</td>
                            <td className="py-2 pr-3 text-right">{r.line_number ?? '-'}</td>
                            <td className="py-2 pr-3 text-right">{r.actual_quantity}</td>
                            <td className="py-2 pr-3 text-right text-emerald-400">{r.passed_quantity}</td>
                            <td className="py-2 pr-3 text-right text-red-400">{r.rejected_quantity}</td>
                            <td className={`py-2 text-right ${efficiencyColor(r.efficiency)}`}>
                              {r.efficiency !== null ? `${Number(r.efficiency).toFixed(1)}%` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </Layout>
  );
}
