import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { logisticsApi } from '../api/client';
import type { PaperworkComparison, PaperworkComparisonRow } from '../api/client';
import { useToast } from '../contexts/ToastContext';

const fmt = (v: number | null | undefined, digits = 2): string =>
  v === null || v === undefined ? 'N/A' : Number(v).toLocaleString(undefined, { maximumFractionDigits: digits });

export default function PaperworkComparisonPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState<PaperworkComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'over' | 'short'>('all');

  const load = async () => {
    setLoading(true);
    try {
      const res = await logisticsApi.getPaperworkComparison();
      setData(res.data);
    } catch {
      toast('error', 'Failed to load paperwork comparison');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading && !data) {
    return (
      <Layout>
        <div className="p-6 flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  const summary = data?.summary;
  const rows = (data?.results ?? []).filter(row => {
    if (filter === 'over') return row.over_tolerance;
    if (filter === 'short') return row.can_cover_order === false;
    return true;
  });

  const summaryCards = [
    { label: 'Paperwork Checked', value: summary?.checked ?? 0, color: 'text-heading' },
    { label: 'Over Tolerance', value: summary?.over_tolerance_count ?? 0, color: 'text-badge-red' },
    { label: 'Cannot Cover Order', value: summary?.cannot_cover_count ?? 0, color: 'text-badge-amber' },
  ];

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Shipping Paperwork Comparison</h1>
            <p className="text-sm text-muted mt-1">
              Shipped vs ordered quantity - debit if over tolerance; fabric producibility check (GC)
            </p>
          </div>
          <button onClick={() => load()}
            className="px-4 py-2 bg-surface-alt hover:bg-border rounded-lg text-sm text-heading transition-colors">
            Refresh
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {summaryCards.map(card => (
            <div key={card.label} className="bg-surface rounded-xl p-4 border border-border">
              <div className="text-sm text-muted">{card.label}</div>
              <div className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-surface rounded-xl p-4 border border-border flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-muted mb-1">Show</label>
            <select value={filter} onChange={e => setFilter(e.target.value as typeof filter)}
              className="px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm">
              <option value="all">All comparisons</option>
              <option value="over">Over tolerance only</option>
              <option value="short">Cannot cover only</option>
            </select>
          </div>
        </div>

        {/* Comparison table */}
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted border-b border-border">
                  <th className="text-left py-2 px-3">Order</th>
                  <th className="text-left py-2 px-3">Buyer</th>
                  <th className="text-left py-2 px-3">Status</th>
                  <th className="text-right py-2 px-3">Ordered</th>
                  <th className="text-right py-2 px-3">Shipped</th>
                  <th className="text-right py-2 px-3">Variance</th>
                  <th className="text-center py-2 px-3">Tolerance</th>
                  <th className="text-right py-2 px-3">Fabric (m)</th>
                  <th className="text-right py-2 px-3">Consumption</th>
                  <th className="text-right py-2 px-3">Producible</th>
                  <th className="text-center py-2 px-3">Garments</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={11} className="py-10 text-center text-muted">No comparisons match</td></tr>
                ) : rows.map(row => (
                  <ComparisonRow key={row.po_number} row={row} onOpen={po => navigate(`/purchase-orders/${po}`)} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function ComparisonRow({ row, onOpen }: { row: PaperworkComparisonRow; onOpen: (po: string) => void }) {
  const pct = row.quantity_variance_pct;
  const pctColor = row.over_tolerance
    ? 'text-badge-red'
    : pct === null
      ? 'text-muted'
      : pct > 0
        ? 'text-badge-amber'
        : 'text-badge-emerald';

  return (
    <tr className="border-b border-border hover:bg-surface-alt/30 cursor-pointer" onClick={() => onOpen(row.po_number)}>
      <td className="py-2 px-3 font-mono text-heading">{row.po_number}</td>
      <td className="py-2 px-3 text-body">{row.buyer_name}</td>
      <td className="py-2 px-3 text-body">{row.status.replace(/_/g, ' ')}</td>
      <td className="py-2 px-3 text-right text-body">{fmt(row.ordered_quantity, 0)}</td>
      <td className="py-2 px-3 text-right text-body">{fmt(row.shipped_quantity, 0)}</td>
      <td className={`py-2 px-3 text-right ${pctColor}`}>
        {row.quantity_variance > 0 ? '+' : ''}{fmt(row.quantity_variance, 0)}
      </td>
      <td className="py-2 px-3 text-center">
        {pct === null ? (
          <span className="text-muted">-</span>
        ) : (
          <span>
            <div className={`font-semibold ${pctColor}`}>
              {row.quantity_variance > 0 ? '+' : ''}{fmt(pct)}%
            </div>
            {row.over_tolerance && (
              <div className="text-[11px] text-badge-red">over {fmt(row.tolerance_pct)}%</div>
            )}
          </span>
        )}
      </td>
      <td className="py-2 px-3 text-right text-body">{fmt(row.shipped_fabric_meters)}</td>
      <td className="py-2 px-3 text-right text-body">{fmt(row.consumption_per_garment, 4)}</td>
      <td className="py-2 px-3 text-right text-body">{row.producible_garments === null ? 'N/A' : fmt(row.producible_garments, 0)}</td>
      <td className="py-2 px-3 text-center">
        {row.can_cover_order === null ? (
          <span className="text-muted text-xs">N/A</span>
        ) : row.can_cover_order ? (
          <span className="px-2 py-1 rounded-full text-xs bg-emerald-500/20 text-badge-emerald">Covers order</span>
        ) : (
          <span className="px-2 py-1 rounded-full text-xs bg-amber-500/20 text-badge-amber">Cannot cover</span>
        )}
      </td>
    </tr>
  );
}
