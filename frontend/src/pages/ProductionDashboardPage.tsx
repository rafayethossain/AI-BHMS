import { useState, useEffect } from 'react';
import { productionApi, monitoringApi } from '../api/client';
import type { DailyProduction, Alert } from '../api/client';
import Layout from '../components/Layout';
import { useToast } from '../contexts/ToastContext';

interface DashboardData {
  total_plans: number;
  active_plans: number;
  completed_plans: number;
  today_reports: number;
  today_efficiency: number | null;
  plans_by_status: Record<string, number>;
  line_efficiencies: { line: string; efficiency: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-surface-alt',
  planned: 'bg-blue-500',
  in_progress: 'bg-amber-500',
  completed: 'bg-emerald-500',
};

function efficiencyColor(val: number | null): string {
  if (val === null) return 'text-muted';
  if (val > 80) return 'text-emerald-400';
  if (val > 60) return 'text-amber-400';
  return 'text-red-400';
}

function efficiencyBarColor(val: number): string {
  if (val > 80) return 'bg-emerald-500';
  if (val > 60) return 'bg-amber-500';
  return 'bg-red-500';
}

export default function ProductionDashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [recentReports, setRecentReports] = useState<DailyProduction[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [dashRes, reportsRes, alertsRes] = await Promise.allSettled([
          productionApi.getProductionDashboard(),
          productionApi.getDailyReports({ page_size: '10', ordering: '-production_date' }),
          monitoringApi.getAlerts({ service: 'production', is_resolved: 'false' }),
        ]);
        if (dashRes.status === 'fulfilled') setDashboard(dashRes.value.data as DashboardData);
        if (reportsRes.status === 'fulfilled') setRecentReports(reportsRes.value.data.results);
        if (alertsRes.status === 'fulfilled') setAlerts(alertsRes.value.data.results);
      } catch { toast('error', 'Failed to load dashboard data'); } finally { setLoading(false); }
    };
    loadData();
  }, []);

  const maxStatusCount = dashboard?.plans_by_status
    ? Math.max(1, ...Object.values(dashboard.plans_by_status))
    : 1;

  return (
    <Layout>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Production Dashboard</h1>
          <p className="text-muted text-sm mt-1">Real-time overview of production operations</p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" />
          </div>
        )}

        {!loading && (
          <div className="flex gap-6">
            <div className="flex-1 space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-surface rounded-xl border border-border p-5">
                  <p className="text-muted text-sm">Total Plans</p>
                  <p className="text-3xl font-bold mt-1 text-blue-400">{dashboard?.total_plans ?? 0}</p>
                </div>
                <div className="bg-surface rounded-xl border border-border p-5">
                  <p className="text-muted text-sm">Active Plans</p>
                  <p className="text-3xl font-bold mt-1 text-amber-400">{dashboard?.active_plans ?? 0}</p>
                </div>
                <div className="bg-surface rounded-xl border border-border p-5">
                  <p className="text-muted text-sm">Completed</p>
                  <p className="text-3xl font-bold mt-1 text-emerald-400">{dashboard?.completed_plans ?? 0}</p>
                </div>
                <div className="bg-surface rounded-xl border border-border p-5">
                  <p className="text-muted text-sm">Today's Reports</p>
                  <p className="text-3xl font-bold mt-1 text-teal-400">{dashboard?.today_reports ?? 0}</p>
                </div>
                <div className="bg-surface rounded-xl border border-border p-5">
                  <p className="text-muted text-sm">Today's Efficiency</p>
                  <p className={`text-3xl font-bold mt-1 ${efficiencyColor(dashboard?.today_efficiency ?? null)}`}>
                    {dashboard?.today_efficiency !== null && dashboard?.today_efficiency !== undefined
                      ? `${Number(dashboard.today_efficiency).toFixed(1)}%`
                      : '-'}
                  </p>
                </div>
              </div>

              <div className="bg-surface rounded-xl border border-border p-5">
                <h2 className="text-lg font-semibold mb-4">Plans by Status</h2>
                <div className="space-y-3">
                  {(['draft', 'planned', 'in_progress', 'completed'] as const).map((status) => {
                    const count = dashboard?.plans_by_status?.[status] ?? 0;
                    const pct = (count / maxStatusCount) * 100;
                    return (
                      <div key={status} className="flex items-center gap-3">
                        <span className="text-sm text-body w-28 capitalize">{status.replace('_', ' ')}</span>
                        <div className="flex-1 h-6 bg-input rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${STATUS_COLORS[status] ?? 'bg-surface-alt'}`}
                            style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted w-10 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-surface rounded-xl border border-border p-5">
                <h2 className="text-lg font-semibold mb-4">Today's Line Efficiency</h2>
                {dashboard?.line_efficiencies && dashboard.line_efficiencies.length > 0 ? (
                  <div className="space-y-3">
                    {dashboard.line_efficiencies.map((le) => (
                      <div key={le.line} className="flex items-center gap-3">
                        <span className="text-sm text-body w-20">{le.line}</span>
                        <div className="flex-1 h-6 bg-input rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${efficiencyBarColor(le.efficiency)}`}
                            style={{ width: `${Math.min(le.efficiency, 100)}%` }}
                          />
                        </div>
                        <span className={`text-sm font-medium w-14 text-right ${efficiencyColor(le.efficiency)}`}>
                          {le.efficiency.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-faint text-sm">No line data for today</p>
                )}
              </div>

              <div className="bg-surface rounded-xl border border-border p-5">
                <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted border-b border-border">
                        <th className="text-left py-2 pr-4 font-medium">Date</th>
                        <th className="text-left py-2 pr-4 font-medium">PO #</th>
                        <th className="text-left py-2 pr-4 font-medium">Factory</th>
                        <th className="text-right py-2 pr-4 font-medium">Efficiency</th>
                        <th className="text-left py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentReports.length === 0 && (
                        <tr><td colSpan={5} className="py-4 text-faint text-center">No recent reports</td></tr>
                      )}
                      {recentReports.map((r) => (
                        <tr key={r.id} className="border-b border-border">
                          <td className="py-2 pr-4">{r.production_date}</td>
                          <td className="py-2 pr-4 font-mono text-emerald-400">{r.po_number}</td>
                          <td className="py-2 pr-4">{r.factory_name}</td>
                          <td className={`py-2 pr-4 text-right ${efficiencyColor(r.efficiency)}`}>
                            {r.efficiency !== null ? `${Number(r.efficiency).toFixed(1)}%` : '-'}
                          </td>
                          <td className="py-2">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-surface-alt/20 text-muted capitalize">
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="w-72 shrink-0">
              <div className="bg-surface rounded-xl border border-border p-5 sticky top-6">
                <h2 className="text-lg font-semibold mb-4">Production Alerts</h2>
                {alerts.length === 0 ? (
                  <p className="text-faint text-sm">No unresolved alerts</p>
                ) : (
                  <div className="space-y-3">
                    {alerts.map((a) => (
                      <div key={a.id} className="bg-input rounded-lg p-3 border border-input-border">
                        <div className="flex items-start gap-2">
                          <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                            a.alert_type === 'critical' ? 'bg-red-400 animate-pulse' : 'bg-amber-400'
                          }`} />
                          <div>
                            <p className="text-sm font-medium">{a.title}</p>
                            <p className="text-xs text-muted mt-1">{a.message}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
}
