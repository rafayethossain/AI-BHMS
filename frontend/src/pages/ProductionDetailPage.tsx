import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productionApi } from '../api/client';
import type { ProductionPlan, DailyProduction } from '../api/client';
import { useToast } from '../contexts/ToastContext';
import Layout from '../components/Layout';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-surface-alt/20 text-muted',
  planned: 'bg-blue-500/20 text-badge-blue',
  in_progress: 'bg-amber-500/20 text-badge-amber',
  completed: 'bg-emerald-500/20 text-badge-emerald',
};

export default function ProductionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [plan, setPlan] = useState<ProductionPlan | null>(null);
  const [reports, setReports] = useState<DailyProduction[]>([]);
  const [linePerf, setLinePerf] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const planRes = await productionApi.getPlan(id);
      setPlan(planRes.data);

      const reportsRes = await productionApi.getDailyReports({ purchase_order: planRes.data.purchase_order, page_size: '50' });
      setReports(reportsRes.data.results);

      const perfRes = await productionApi.getLinePerformance();
      setLinePerf(perfRes.data);
    } catch { toast('error', 'Failed to load production detail'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleStart = async () => {
    if (!id) return;
    try { await productionApi.startPlan(id); toast('success', 'Plan started'); fetchData(); } catch { toast('error', 'Failed to start plan'); }
  };

  const handleComplete = async () => {
    if (!id) return;
    try { await productionApi.completePlan(id); toast('success', 'Plan completed'); fetchData(); } catch { toast('error', 'Failed to complete plan'); }
  };
  if (loading) return <Layout><div className="py-20 flex items-center justify-center"><div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" /></div></Layout>;

  if (!plan) return <Layout><div className="py-20 flex items-center justify-center">Plan not found</div></Layout>;

  const totalTarget = reports.reduce((s, r) => s + (r.target_quantity || 0), 0);
  const totalActual = reports.reduce((s, r) => s + r.actual_quantity, 0);
  const totalRejected = reports.reduce((s, r) => s + r.rejected_quantity, 0);
  const avgEff = totalTarget > 0 ? Math.round(totalActual / totalTarget * 100) : 0;

  const maxEff = Math.max(...linePerf.map((l) => Number((l as Record<string, unknown>).avg_efficiency) || 0), 1);

  return (
    <Layout>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <button onClick={() => navigate('/production')} className="text-sm text-muted hover:text-heading mb-4 transition-colors">&larr; Back to Production</button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Production — {plan.po_number}</h1>
            <p className="text-muted text-sm mt-1">
              Factory: {plan.factory_name} &middot;
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[plan.status] || ''}`}>{plan.status.replace('_', ' ')}</span>
            </p>
          </div>
          <div className="flex gap-2">
            {(plan.status === 'draft' || plan.status === 'planned') && (
              <button onClick={handleStart} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors">Start</button>
            )}
            {plan.status === 'in_progress' && (
              <button onClick={handleComplete} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">Complete</button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-surface rounded-xl border border-border p-4">
            <p className="text-sm text-muted">Plan Date</p>
            <p className="text-xl font-bold text-heading">{plan.plan_date}</p>
          </div>
          <div className="bg-surface rounded-xl border border-border p-4">
            <p className="text-sm text-muted">Target Quantity</p>
            <p className="text-xl font-bold text-heading">{plan.quantity.toLocaleString()}</p>
          </div>
          <div className="bg-surface rounded-xl border border-border p-4">
            <p className="text-sm text-muted">Total Actual</p>
            <p className="text-xl font-bold text-emerald-400">{totalActual.toLocaleString()}</p>
          </div>
          <div className="bg-surface rounded-xl border border-border p-4">
            <p className="text-sm text-muted">Avg Efficiency</p>
            <p className={`text-xl font-bold ${avgEff >= 80 ? 'text-emerald-400' : avgEff >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{avgEff}%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-surface rounded-xl border border-border p-6">
            <h2 className="text-lg font-bold mb-4">Daily Reports</h2>
            {reports.length === 0 ? (
              <p className="text-muted text-sm">No daily reports yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted border-b border-border">
                      <th className="text-left py-2 pr-4">Date</th>
                      <th className="text-left py-2 pr-4">Line</th>
                      <th className="text-right py-2 pr-4">Target</th>
                      <th className="text-right py-2 pr-4">Actual</th>
                      <th className="text-right py-2 pr-4">Rejected</th>
                      <th className="text-right py-2">Eff %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((r) => (
                      <tr key={r.id} className="border-b border-border hover:bg-surface-alt/30">
                        <td className="py-2 pr-4 text-heading">{r.production_date}</td>
                        <td className="py-2 pr-4 text-body">{r.line_number || '-'}</td>
                        <td className="py-2 pr-4 text-right text-body">{(r.target_quantity || 0).toLocaleString()}</td>
                        <td className="py-2 pr-4 text-right text-emerald-400">{r.actual_quantity.toLocaleString()}</td>
                        <td className="py-2 pr-4 text-right text-red-400">{r.rejected_quantity.toLocaleString()}</td>
                        <td className="py-2 text-right">
                          <span className={r.efficiency && r.efficiency >= 80 ? 'text-emerald-400' : r.efficiency && r.efficiency >= 60 ? 'text-amber-400' : 'text-red-400'}>
                            {r.efficiency ? `${r.efficiency}%` : '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-surface rounded-xl border border-border p-6">
            <h2 className="text-lg font-bold mb-4">Line Performance</h2>
            {linePerf.length === 0 ? (
              <p className="text-muted text-sm">No line performance data</p>
            ) : (
              <div className="space-y-3">
                {linePerf.map((lp, idx) => {
                  const rec = lp as Record<string, unknown>;
                  const eff = Number(rec.avg_efficiency) || 0;
                  const barWidth = Math.round((eff / maxEff) * 100);
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-sm text-body w-16 truncate" title={String(rec.factory__name || '')}>Line {String(rec.line_number || 'N/A')}</span>
                      <div className="flex-1 h-6 bg-surface-alt rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${eff >= 80 ? 'bg-emerald-500' : eff >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${barWidth}%` }} />
                      </div>
                      <span className="text-sm font-mono text-heading w-12 text-right">{Math.round(eff)}%</span>
                      <span className="text-xs text-muted w-20 text-right">{Number(rec.total_actual || 0).toLocaleString()} pcs</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 bg-surface rounded-xl border border-border p-6">
          <h2 className="text-lg font-bold mb-2">Plan Info</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-muted">Start Date:</span> <span className="text-heading ml-1">{plan.start_date || 'N/A'}</span></div>
            <div><span className="text-muted">End Date:</span> <span className="text-heading ml-1">{plan.end_date || 'N/A'}</span></div>
            <div><span className="text-muted">Total Rejected:</span> <span className="text-red-400 ml-1">{totalRejected.toLocaleString()}</span></div>
            <div><span className="text-muted">Reports:</span> <span className="text-heading ml-1">{reports.length}</span></div>
          </div>
          {plan.remarks && <p className="mt-3 text-muted text-sm">{plan.remarks}</p>}
        </div>
      </main>
    </Layout>
  );
}
