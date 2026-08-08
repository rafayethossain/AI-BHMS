import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { merchApi, setupApi } from '../api/client';
import type { OrderManagerDashboard, Buyer } from '../api/client';
import { useToast } from '../contexts/ToastContext';

const PO_STATUSES = [
  'draft', 'open', 'confirmed', 'in_production', 'quality_check',
  'ready', 'shipped', 'delivered', 'cancelled',
];

const RISK_BADGE: Record<string, { chip: string; border: string; dot: string }> = {
  risk: { chip: 'bg-red-500/20 text-badge-red', border: 'border-red-500/40', dot: 'bg-red-500' },
  watch: { chip: 'bg-amber-500/20 text-badge-amber', border: 'border-amber-500/40', dot: 'bg-amber-500' },
  ok: { chip: 'bg-emerald-500/20 text-badge-emerald', border: 'border-emerald-500/40', dot: 'bg-emerald-500' },
};

const PO_STATUS_BADGES: Record<string, string> = {
  draft: 'bg-surface-alt/20 text-muted', open: 'bg-blue-500/20 text-badge-blue',
  confirmed: 'bg-indigo-500/20 text-badge-blue', in_production: 'bg-amber-500/20 text-badge-amber',
  quality_check: 'bg-purple-500/20 text-badge-purple', ready: 'bg-cyan-500/20 text-badge-blue',
  shipped: 'bg-blue-500/20 text-badge-blue', delivered: 'bg-emerald-500/20 text-badge-emerald',
  cancelled: 'bg-red-500/20 text-badge-red',
};

const GOLD_SEAL_BADGES: Record<string, string> = {
  pending: 'bg-amber-500/20 text-badge-amber', sent: 'bg-blue-500/20 text-badge-blue',
  approved: 'bg-emerald-500/20 text-badge-emerald', rejected: 'bg-red-500/20 text-badge-red',
};

export default function OrderManagerDashboardPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dashboard, setDashboard] = useState<OrderManagerDashboard | null>(null);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [buyer, setBuyer] = useState('');
  const [status, setStatus] = useState('');
  const [riskFilter, setRiskFilter] = useState('');

  const load = async (resetLoading = true) => {
    if (resetLoading) setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (q.trim()) params.q = q.trim();
      if (buyer) params.buyer = buyer;
      if (status) params.status = status;
      if (riskFilter) params.risk = riskFilter;
      const res = await merchApi.getOrderManager(params);
      setDashboard(res.data);
    } catch {
      toast('error', 'Failed to load order manager');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    setupApi.getBuyers({ page_size: '200' }).then(r => setBuyers(r.data.results)).catch(() => {});
  }, [buyer, status, riskFilter]);

  const handleSearch = () => load();

  if (loading && !dashboard) {
    return (
      <Layout>
        <div className="p-6 flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  const summary = dashboard?.summary;
  const rows = dashboard?.results ?? [];

  const summaryCards = [
    { label: 'Total Orders', value: summary?.total_orders ?? 0, color: 'text-heading' },
    { label: 'Open Orders', value: summary?.open_orders ?? 0, color: 'text-heading' },
    { label: 'Delivered', value: summary?.delivered_orders ?? 0, color: 'text-badge-emerald' },
    { label: 'At Risk', value: summary?.risk ?? 0, color: 'text-badge-red' },
    { label: 'Watch', value: summary?.watch ?? 0, color: 'text-badge-amber' },
    { label: 'On Track', value: summary?.ok ?? 0, color: 'text-badge-emerald' },
    { label: 'Pending Debits', value: summary?.pending_debits ?? 0, color: 'text-badge-red' },
    { label: 'Overdue Jobs', value: summary?.overdue_production ?? 0, color: 'text-badge-red' },
  ];

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Order Manager</h1>
            <p className="text-sm text-muted mt-1">
              Per-order summary in completion date order - daily critical-path review
            </p>
          </div>
          <button onClick={() => load()}
            className="px-4 py-2 bg-surface-alt hover:bg-border rounded-lg text-sm text-heading transition-colors">
            Refresh
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {summaryCards.map(card => (
            <div key={card.label} className="bg-surface rounded-xl p-4 border border-border">
              <div className="text-sm text-muted">{card.label}</div>
              <div className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-surface rounded-xl p-4 border border-border flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-muted mb-1">Search (PO / buyer / file / style)</label>
            <input value={q} onChange={e => setQ(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
              placeholder="e.g. PO-001 or buyer name"
              className="w-full px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Buyer</label>
            <select value={buyer} onChange={e => setBuyer(e.target.value)}
              className="px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm">
              <option value="">All buyers</option>
              {buyers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm">
              <option value="">All statuses</option>
              {PO_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Risk</label>
            <select value={riskFilter} onChange={e => setRiskFilter(e.target.value)}
              className="px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm">
              <option value="">All</option>
              <option value="risk">At Risk</option>
              <option value="watch">Watch</option>
              <option value="ok">On Track</option>
            </select>
          </div>
          <button onClick={handleSearch}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm text-white transition-colors">
            Apply
          </button>
        </div>

        {/* Order table (completion date order) */}
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted border-b border-border">
                  <th className="text-left py-2 px-3">Risk</th>
                  <th className="text-left py-2 px-3">Order</th>
                  <th className="text-left py-2 px-3">Buyer / Style</th>
                  <th className="text-left py-2 px-3">Completion</th>
                  <th className="text-left py-2 px-3">Status</th>
                  <th className="text-left py-2 px-3">Qty</th>
                  <th className="text-left py-2 px-3">Production</th>
                  <th className="text-left py-2 px-3">Technical</th>
                  <th className="text-left py-2 px-3">Logistics</th>
                  <th className="text-left py-2 px-3">Dockets</th>
                  <th className="text-left py-2 px-3">Recon.</th>
                  <th className="text-left py-2 px-3">Schedule</th>
                  <th className="text-left py-2 px-3">Gold Seal</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={13} className="py-10 text-center text-muted">No orders match</td></tr>
                ) : rows.map(row => {
                  const risk = RISK_BADGE[row.risk.level] ?? RISK_BADGE.ok;
                  return (
                    <tr key={row.po_id}
                      className="border-b border-border hover:bg-surface-alt/30 cursor-pointer"
                      onClick={() => navigate(`/purchase-orders/${row.po_id}`)}>
                      <td className="py-2 px-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${risk.chip}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${risk.dot}`} />
                          {row.risk.level}
                        </span>
                        {row.risk.flags.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {row.risk.flags.map((flag, i) => (
                              <div key={i} className="text-[11px] text-badge-red leading-tight">{flag}</div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-mono text-heading">{row.po_number}</div>
                        <div className="text-xs text-muted">{row.file_number || 'No file'}</div>
                      </td>
                      <td className="py-2 px-3">
                        <div className="text-body">{row.buyer_name || 'N/A'}</div>
                        <div className="text-xs text-muted font-mono">{row.style_number || ''}</div>
                      </td>
                      <td className="py-2 px-3 text-body">{row.delivery_date || 'N/A'}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${PO_STATUS_BADGES[row.status] || 'bg-surface-alt/20 text-body'}`}>
                          {row.status_label}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-body">{row.quantity}</td>
                      <td className="py-2 px-3 text-body">
                        {row.production.open}/{row.production.total} open
                        {row.production.overdue > 0 && (
                          <div className="text-xs text-badge-red">{row.production.overdue} overdue</div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-body">{row.technical.fit_stage_label}</td>
                      <td className="py-2 px-3 text-body">{row.logistics.delivered_pct}%</td>
                      <td className="py-2 px-3 text-body">
                        {row.dockets.final_raised} final
                        {row.dockets.over_limit_pending > 0 && (
                          <div className="text-xs text-badge-red">+{row.dockets.over_limit_pending} over limit</div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-body">
                        {row.reconciliation.pending_debits > 0 ? (
                          <span className="text-badge-red font-semibold">{row.reconciliation.pending_debits} debits</span>
                        ) : '0'}
                      </td>
                      <td className="py-2 px-3 text-body">
                        {row.schedule.items_delivered}/{row.schedule.items_total}
                        <span className="text-muted"> ({row.schedule.delivered_pct}%)</span>
                      </td>
                      <td className="py-2 px-3">
                        {row.gold_seal.status ? (
                          <span className={`px-2 py-1 rounded-full text-xs ${GOLD_SEAL_BADGES[row.gold_seal.status] || 'bg-surface-alt/20 text-body'}`}>
                            {row.gold_seal.status_label}
                          </span>
                        ) : 'None'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
