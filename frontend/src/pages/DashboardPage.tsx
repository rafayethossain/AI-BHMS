import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import GuidedTour from '../components/GuidedTour';
import { dashboardApi } from '../api/client';

type DashboardTab = 'tasks' | 'pipeline' | 'financials' | 'alerts';

const TABS: { key: DashboardTab; label: string; icon: string }[] = [
  { key: 'tasks', label: 'My Tasks', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { key: 'pipeline', label: 'Pipeline', icon: 'M13 7l5 5m0 0l-5 5m5-5H6' },
  { key: 'financials', label: 'Financials', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { key: 'alerts', label: 'Alerts', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
];

const ALERT_COLORS: Record<string, string> = {
  danger: 'border-red-500/40 bg-red-500/5',
  warning: 'border-amber-500/40 bg-amber-500/5',
  success: 'border-emerald-500/40 bg-emerald-500/5',
};

const ALERT_DOT: Record<string, string> = {
  danger: 'bg-red-400',
  warning: 'bg-amber-400',
  success: 'bg-emerald-400',
};

const PIPELINE_COLORS = [
  'bg-emerald-500', 'bg-blue-500', 'bg-amber-500', 'bg-cyan-500', 'bg-rose-500', 'bg-purple-500',
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<DashboardTab>('tasks');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    pipeline: { stage: string; total: number; active: number; path: string; breakdown?: Record<string, number> }[];
    financials: {
      total_revenue: number; total_cost: number; profit_margin: number; profit_margin_pct: number;
      accepted_pis: number; total_pis: number; approved_costings: number; total_costings: number;
      lc_total: number; lc_utilized: number; lc_utilization_pct: number;
      active_contracts: number; total_contracts: number; po_value_total: number;
      profit_by_buyer?: { buyer: string; revenue: number; cost: number; profit: number; margin_pct: number }[];
      profit_by_factory?: { factory: string; total_cost: number; po_count: number; avg_cost: number }[];
    };
    tasks: {
      overdue_milestones: number; upcoming_milestones: number; pending_inspections: number;
      pending_costings: number; draft_pos: number;
      overdue_items: { id: string; name: string; po_number: string; planned_date: string; days_overdue: number; url: string }[];
    };
    alerts: { type: string; title: string; description: string; path: string }[];
  } | null>(null);

  useEffect(() => {
    dashboardApi.getRichSummary().then(res => setData(res.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="p-6 flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  const tasks = data?.tasks;
  const financials = data?.financials;
  const pipeline = data?.pipeline;
  const alerts = data?.alerts;

  return (
    <Layout>
      <GuidedTour />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted text-sm mt-1">Overview of your buying house operations</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/reports')} className="px-4 py-2 bg-surface-alt hover:bg-surface-alt text-sm rounded-lg text-body transition-colors">Reports</button>
          </div>
        </div>

        {/* Alert Banner */}
        {alerts && alerts.some(a => a.type === 'danger') && (
          <div className="flex items-center gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
            <span className="text-sm text-red-400">
              {alerts.filter(a => a.type === 'danger').map(a => a.title).join(' · ')}
            </span>
          </div>
        )}

        {/* Quick KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <button onClick={() => setTab('tasks')} className="bg-surface rounded-xl border border-border p-4 text-left hover:border-amber-500/40 transition-colors group">
            <p className="text-muted text-xs">Overdue Tasks</p>
            <p className={`text-2xl font-bold mt-1 ${(tasks?.overdue_milestones || 0) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {tasks?.overdue_milestones || 0}
            </p>
          </button>
          <button onClick={() => setTab('pipeline')} className="bg-surface rounded-xl border border-border p-4 text-left hover:border-blue-500/40 transition-colors group">
            <p className="text-muted text-xs">Active Orders</p>
            <p className="text-2xl font-bold text-blue-400 mt-1">
              {pipeline?.find(p => p.stage === 'Purchase Orders')?.active || 0}
            </p>
          </button>
          <button onClick={() => setTab('financials')} className="bg-surface rounded-xl border border-border p-4 text-left hover:border-emerald-500/40 transition-colors group">
            <p className="text-muted text-xs">Revenue</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              ${financials ? (financials.total_revenue / 1000).toFixed(0) : 0}K
            </p>
          </button>
          <button onClick={() => setTab('financials')} className="bg-surface rounded-xl border border-border p-4 text-left hover:border-cyan-500/40 transition-colors group">
            <p className="text-muted text-xs">Profit Margin</p>
            <p className="text-2xl font-bold text-cyan-400 mt-1">
              {financials?.profit_margin_pct || 0}%
            </p>
          </button>
          <button onClick={() => setTab('alerts')} className="bg-surface rounded-xl border border-border p-4 text-left hover:border-purple-500/40 transition-colors group">
            <p className="text-muted text-xs">Alerts</p>
            <p className={`text-2xl font-bold mt-1 ${(alerts?.length || 0) > 1 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {alerts?.length || 0}
            </p>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 border-b border-border">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t.key ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-muted hover:text-body'
              }`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
              </svg>
              {t.label}
              {t.key === 'tasks' && (tasks?.overdue_milestones || 0) > 0 && (
                <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">{tasks?.overdue_milestones}</span>
              )}
              {t.key === 'alerts' && (alerts?.length || 0) > 1 && (
                <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">{alerts!.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === 'tasks' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-sm font-medium text-muted">Overdue Milestones</h3>
              {tasks && tasks.overdue_items.length > 0 ? (
                <div className="space-y-2">
                  {tasks.overdue_items.map(item => (
                    <button key={item.id} onClick={() => navigate(item.url)}
                      className="w-full flex items-center justify-between p-4 bg-surface rounded-xl border border-border hover:border-red-500/30 transition-colors text-left group">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                        <div>
                          <span className="text-sm font-medium text-heading group-hover:text-red-400 transition-colors">{item.name}</span>
                          <p className="text-xs text-muted">{item.po_number}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-xs text-red-400 font-medium">{item.days_overdue}d overdue</span>
                        <p className="text-xs text-faint">{item.planned_date}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="bg-surface rounded-xl border border-border p-8 text-center">
                  <svg className="w-10 h-10 text-emerald-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="text-sm text-muted">No overdue milestones. All on track!</p>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted">Action Required</h3>
              <div className="space-y-2">
                {[
                  { label: 'Pending Costings', count: tasks?.pending_costings || 0, path: '/purchase-orders?tab=bom_costing', color: 'text-badge-purple' },
                  { label: 'Pending Inspections', count: tasks?.pending_inspections || 0, path: '/quality', color: 'text-badge-blue' },
                  { label: 'Draft POs', count: tasks?.draft_pos || 0, path: '/purchase-orders', color: 'text-badge-amber' },
                  { label: 'Due This Week', count: tasks?.upcoming_milestones || 0, path: '/tas', color: 'text-badge-green' },
                ].map(item => (
                  <button key={item.label} onClick={() => navigate(item.path)}
                    className="w-full flex items-center justify-between p-3 bg-surface rounded-xl border border-border hover:border-emerald-500/30 transition-colors text-left">
                    <span className="text-sm text-body">{item.label}</span>
                    <span className={`text-lg font-bold ${item.color}`}>{item.count}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'pipeline' && pipeline && (
          <div className="space-y-6">
            <div className="bg-surface rounded-xl border border-border p-6">
              <h3 className="text-sm font-medium text-muted mb-6">Order Lifecycle Pipeline</h3>
              <div className="flex items-center gap-1 overflow-x-auto pb-2">
                {pipeline.map((stage, idx) => (
                  <div key={stage.stage} className="flex items-center">
                    <button onClick={() => navigate(stage.path)}
                      className="flex-shrink-0 group text-center hover:opacity-80 transition-opacity">
                      <div className="relative w-28">
                        <div className={`h-20 rounded-lg ${PIPELINE_COLORS[idx]} opacity-20 group-hover:opacity-30 transition-opacity`} />
                        <div className={`absolute bottom-0 left-0 right-0 h-20 rounded-lg ${PIPELINE_COLORS[idx]} opacity-80`}
                          style={{ height: `${Math.max(20, (stage.active / Math.max(stage.total, 1)) * 80)}px` }} />
                      </div>
                      <p className="text-xs font-medium text-heading mt-2">{stage.stage}</p>
                      <p className="text-lg font-bold text-heading">{stage.total}</p>
                      <p className="text-xs text-muted">{stage.active} active</p>
                    </button>
                    {idx < pipeline.length - 1 && (
                      <svg className="w-5 h-5 text-faint flex-shrink-0 mx-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* PO Status Breakdown */}
            {pipeline.find(p => p.stage === 'Purchase Orders')?.breakdown && (
              <div className="bg-surface rounded-xl border border-border p-6">
                <h3 className="text-sm font-medium text-muted mb-4">PO Status Breakdown</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(pipeline.find(p => p.stage === 'Purchase Orders')!.breakdown!).map(([status, count]) => (
                    <button key={status} onClick={() => navigate('/purchase-orders')}
                      className="p-3 bg-surface-alt/30 rounded-lg hover:bg-surface-alt/50 transition-colors text-center">
                      <p className="text-xs text-muted capitalize">{status.replace('_', ' ')}</p>
                      <p className="text-xl font-bold text-heading mt-1">{count}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'financials' && financials && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue & Profit */}
            <div className="bg-surface rounded-xl border border-border p-6">
              <h3 className="text-sm font-medium text-muted mb-4">Revenue & Profit</h3>
              <div className="space-y-4">
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                  <p className="text-xs text-muted">Total Revenue (Accepted PIs)</p>
                  <p className="text-3xl font-bold text-emerald-400 mt-1">${financials.total_revenue.toLocaleString()}</p>
                  <p className="text-xs text-faint mt-1">{financials.accepted_pis} of {financials.total_pis} PIs accepted</p>
                </div>
                <div className="bg-input rounded-xl p-4">
                  <p className="text-xs text-muted">Total Cost (Approved Costings)</p>
                  <p className="text-2xl font-bold text-heading mt-1">${financials.total_cost.toLocaleString()}</p>
                  <p className="text-xs text-faint mt-1">{financials.approved_costings} of {financials.total_costings} costings approved</p>
                </div>
                <div className={`rounded-xl p-4 ${financials.profit_margin >= 0 ? 'bg-cyan-500/5 border border-cyan-500/20' : 'bg-red-500/5 border border-red-500/20'}`}>
                  <p className="text-xs text-muted">Profit Margin</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className={`text-2xl font-bold ${financials.profit_margin >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                      ${financials.profit_margin.toLocaleString()}
                    </p>
                    <span className={`text-sm font-medium ${financials.profit_margin >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                      ({financials.profit_margin_pct}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* LC & Contracts */}
            <div className="bg-surface rounded-xl border border-border p-6">
              <h3 className="text-sm font-medium text-muted mb-4">Letters of Credit & Contracts</h3>
              <div className="space-y-4">
                <div className="bg-input rounded-xl p-4">
                  <p className="text-xs text-muted">LC Exposure</p>
                  <p className="text-2xl font-bold text-heading mt-1">${financials.lc_total.toLocaleString()}</p>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-muted mb-1">
                      <span>Utilized</span>
                      <span>{financials.lc_utilization_pct}%</span>
                    </div>
                    <div className="h-2 bg-surface-alt rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min(financials.lc_utilization_pct, 100)}%` }} />
                    </div>
                    <p className="text-xs text-faint mt-1">${financials.lc_utilized.toLocaleString()} of ${financials.lc_total.toLocaleString()}</p>
                  </div>
                </div>
                <div className="bg-input rounded-xl p-4">
                  <p className="text-xs text-muted">Sales Contracts</p>
                  <p className="text-2xl font-bold text-heading mt-1">{financials.active_contracts} <span className="text-sm text-muted font-normal">active</span></p>
                  <p className="text-xs text-faint mt-1">{financials.total_contracts} total</p>
                </div>
                <div className="bg-input rounded-xl p-4">
                  <p className="text-xs text-muted">Total PO Value</p>
                  <p className="text-2xl font-bold text-heading mt-1">${financials.po_value_total.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Profit by Buyer */}
            {financials.profit_by_buyer && financials.profit_by_buyer.length > 0 && (
              <div className="bg-surface rounded-xl border border-border p-6">
                <h3 className="text-sm font-medium text-muted mb-4">Profit by Buyer</h3>
                <div className="space-y-2">
                  {financials.profit_by_buyer.map(b => (
                    <div key={b.buyer} className="flex items-center gap-3 p-3 bg-input rounded-lg">
                      <span className="text-xs text-body w-32 truncate">{b.buyer}</span>
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-xs font-mono text-emerald-400 w-20 text-right">${b.revenue.toLocaleString()}</span>
                        <span className="text-xs text-faint">→</span>
                        <span className="text-xs font-mono text-red-400 w-20 text-right">${b.cost.toLocaleString()}</span>
                      </div>
                      <span className={`text-xs font-bold ${b.profit >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>${b.profit.toLocaleString()}</span>
                      <span className="text-xs text-faint w-12 text-right">{b.margin_pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cost by Factory */}
            {financials.profit_by_factory && financials.profit_by_factory.length > 0 && (
              <div className="bg-surface rounded-xl border border-border p-6">
                <h3 className="text-sm font-medium text-muted mb-4">Cost by Factory</h3>
                <div className="space-y-2">
                  {financials.profit_by_factory.map(f => (
                    <div key={f.factory} className="flex items-center gap-3 p-3 bg-input rounded-lg">
                      <span className="text-xs text-body w-32 truncate">{f.factory}</span>
                      <div className="flex-1 flex items-center gap-3">
                        <span className="text-xs font-mono text-heading">${f.total_cost.toLocaleString()}</span>
                        <span className="text-xs text-faint">{f.po_count} POs</span>
                      </div>
                      <span className="text-xs text-muted">avg ${f.avg_cost.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'alerts' && alerts && (
          <div className="space-y-3">
            {alerts.map((alert, idx) => (
              <button key={idx} onClick={() => navigate(alert.path)}
                className={`w-full flex items-center gap-4 p-5 rounded-xl border transition-colors text-left ${ALERT_COLORS[alert.type] || ALERT_COLORS.warning} hover:opacity-80`}>
                <span className={`w-3 h-3 rounded-full flex-shrink-0 ${ALERT_DOT[alert.type] || ALERT_DOT.warning}`} />
                <div>
                  <p className="text-sm font-medium text-heading">{alert.title}</p>
                  <p className="text-xs text-muted mt-0.5">{alert.description}</p>
                </div>
                <svg className="w-4 h-4 text-faint ml-auto flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
