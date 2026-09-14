import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { merchApi } from '../api/client';
import type { DesignCosting, PurchaseOrder } from '../api/client';
import { useToast } from '../contexts/ToastContext';
import Layout from '../components/Layout';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-surface-alt/20 text-muted',
  pending: 'bg-amber-500/20 text-badge-amber',
  approved: 'bg-emerald-500/20 text-badge-emerald',
  rejected: 'bg-red-500/20 text-badge-red',
};

export default function DesignCostingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [costing, setCosting] = useState<DesignCosting | null>(null);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [selectedPo, setSelectedPo] = useState('');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [ladder, setLadder] = useState({
    customerDiscountPct: '',
    originOverheadPct: '',
    ukOverheadPct: '',
    exchangeRate: '',
    sellingPrice: '',
  });

  const fetchCosting = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await merchApi.getDesignCosting(id);
      setCosting(res.data);
    } catch { toast('error', 'Failed to load design costing'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchCosting(); }, [id]);

  useEffect(() => {
    if (costing) {
      setLadder({
        customerDiscountPct: costing.customer_discount_pct ?? '',
        originOverheadPct: costing.origin_overhead_pct ?? '',
        ukOverheadPct: costing.uk_overhead_pct ?? '',
        exchangeRate: costing.exchange_rate ?? '',
        sellingPrice: costing.selling_price ?? '',
      });
    }
  }, [costing]);

  useEffect(() => {
    (async () => {
      try {
        const res = await merchApi.getPurchaseOrders({ page_size: '10000' });
        const rows = res.data.results || [];
        setPos(rows);
      } catch { /* PO list is optional */ }
    })();
  }, []);

  const handleApprove = async () => {
    if (!id) return;
    setActing(true);
    try { await merchApi.approveDesignCosting(id); toast('success', 'Design costing approved'); fetchCosting(); } catch { toast('error', 'Failed to approve'); } finally { setActing(false); }
  };

  const handleReject = async () => {
    if (!id) return;
    setActing(true);
    try { await merchApi.rejectDesignCosting(id); toast('success', 'Design costing rejected'); fetchCosting(); } catch { toast('error', 'Failed to reject'); } finally { setActing(false); }
  };

  const handleSetLive = async () => {
    if (!id) return;
    setActing(true);
    try { await merchApi.setLiveDesignCosting(id); toast('success', 'Design costing set as live'); fetchCosting(); } catch { toast('error', 'Failed to set live'); } finally { setActing(false); }
  };

  const handlePrepare = async () => {
    if (!id || !selectedPo) { toast('error', 'Choose a purchase order first'); return; }
    setActing(true);
    try {
      const res = await merchApi.preparePOCosting(id, selectedPo);
      toast('success', `PO costing created — navigate to the prepared costing`);
      navigate(`/costings/${res.data.id}`);
    } catch (e) {
      const detail = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast('error', detail || 'Failed to prepare PO costing');
    } finally { setActing(false); }
  };

  const handleSaveLadder = async () => {
    if (!id) return;
    setActing(true);
    try {
      await merchApi.updateDesignCosting(id, {
        customer_discount_pct: ladder.customerDiscountPct === '' ? '0.00' : ladder.customerDiscountPct,
        origin_overhead_pct: ladder.originOverheadPct === '' ? '0.00' : ladder.originOverheadPct,
        uk_overhead_pct: ladder.ukOverheadPct === '' ? '0.00' : ladder.ukOverheadPct,
        exchange_rate: ladder.exchangeRate === '' ? null : ladder.exchangeRate,
        selling_price: ladder.sellingPrice === '' ? null : ladder.sellingPrice,
      });
      toast('success', 'Price ladder saved');
      fetchCosting();
    } catch { toast('error', 'Failed to save price ladder'); } finally { setActing(false); }
  };

  if (loading) return <Layout><div className="py-20 flex items-center justify-center"><div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" /></div></Layout>;

  if (!costing) return <Layout><div className="py-20 flex items-center justify-center">Design costing not found</div></Layout>;

  const costBreakdown = [
    { label: 'Fabric', value: parseFloat(String(costing.fabric_cost)), color: 'text-blue-400' },
    { label: 'Trim', value: parseFloat(String(costing.trim_cost)), color: 'text-purple-400' },
    { label: 'CM', value: parseFloat(String(costing.cm_cost)), color: 'text-amber-400' },
    { label: 'Overhead', value: parseFloat(String(costing.overhead_cost)), color: 'text-cyan-400' },
  ];
  const total = parseFloat(String(costing.total_cost));
  const target = costing.target_price ? parseFloat(String(costing.target_price)) : null;

  const selling = parseFloat(ladder.sellingPrice);
  const discountPct = parseFloat(ladder.customerDiscountPct || '0');
  const originPct = parseFloat(ladder.originOverheadPct || '0');
  const ukPct = parseFloat(ladder.ukOverheadPct || '0');
  const rate = parseFloat(ladder.exchangeRate || '0');
  const hasSelling = Number.isFinite(selling) && selling > 0;
  const discountAmt = hasSelling ? selling * discountPct / 100 : NaN;
  const overheadAmt = Number.isFinite(total) ? total * (originPct + ukPct) / 100 : NaN;
  const base = hasSelling && Number.isFinite(total) ? total + discountAmt + overheadAmt : NaN;
  const marginLadder = hasSelling ? selling - base : NaN;
  const marginPctLadder = hasSelling && selling > 0 ? (marginLadder / selling) * 100 : NaN;
  const landed = Number.isFinite(total) && Number.isFinite(rate) && rate > 0 ? total * rate : NaN;
  const fmt = (v: number, digits = 2) =>
    Number.isFinite(v) ? v.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits }) : '—';

  return (
    <Layout>
      <main className="max-w-5xl mx-auto px-6 py-8">
        <button onClick={() => navigate('/design-costings')} className="text-sm text-muted hover:text-heading mb-4 transition-colors">&larr; Back to Design Costings</button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Design Costing — {costing.style_number} V{costing.version}</h1>
            <p className="text-muted text-sm mt-1">
              <span className={STATUS_COLORS[costing.status] || ''} style={{ display: 'inline-block' }}>
                <span className="ml-2 px-2 py-0.5 rounded-full text-xs">{costing.status}</span>
              </span>
              <span className="ml-2 text-body">{costing.sheet_type_label}</span>
              {costing.is_live && <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold uppercase bg-emerald-500/15 text-emerald-700">Live</span>}
              {costing.is_single_size && <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold uppercase bg-red-500/15 text-badge-red">Single Size</span>}
              {costing.is_patterned && <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold uppercase bg-purple-500/15 text-purple-700">Patterned</span>}
            </p>
          </div>
          <div className="flex gap-2">
            {!costing.is_live && (
              <button onClick={handleSetLive} disabled={acting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">Set as Live</button>
            )}
            {(costing.status === 'draft' || costing.status === 'pending') && (
              <>
                <button onClick={handleReject} disabled={acting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">Reject</button>
                <button onClick={handleApprove} disabled={acting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">Approve</button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-surface rounded-xl border border-border p-6">
            <h3 className="text-sm font-medium text-muted mb-4">Cost Breakdown</h3>
            <div className="space-y-4">
              {costBreakdown.map(({ label, value, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-body">{label}</span>
                    <span className={color}>${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="h-2 bg-surface-alt rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color.replace('text-', 'bg-')}`} style={{ width: `${total > 0 ? (value / total) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border flex justify-between">
              <span className="font-medium text-body">Total Cost (USD)</span>
              <span className="text-xl font-bold text-emerald-700">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-border p-6">
            <h3 className="text-sm font-medium text-muted mb-4">Pricing Analysis</h3>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-body">Total Cost</span>
                <span className="text-heading">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              {target && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-body">Target Price</span>
                    <span className="text-heading">${target.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-body">Margin</span>
                    <span className={target - total >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      ${(target - total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-body">Margin %</span>
                    <span className={target - total >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {total > 0 ? ((target - total) / total * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </>
              )}
              {!target && <p className="text-faint text-sm italic">No target price set</p>}
              {costing.approved_by && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs text-muted">Approved by: <span className="text-heading">{costing.approved_by}</span></p>
                  <p className="text-xs text-muted">At: <span className="text-heading">{costing.approved_at}</span></p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-xl border border-border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted">Price Ladder (per piece)</h3>
            <button
              onClick={handleSaveLadder}
              disabled={acting}
              data-testid="save-ladder"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
              Save Ladder
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <label className="text-xs text-muted">
              Customer Discount %
              <input
                type="number" min="0" max="100" step="0.01"
                data-testid="input-discount"
                value={ladder.customerDiscountPct}
                onChange={(e) => setLadder({ ...ladder, customerDiscountPct: e.target.value })}
                className="mt-1 w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-heading" />
            </label>
            <label className="text-xs text-muted">
              Origin Overhead %
              <input
                type="number" min="0" max="100" step="0.01"
                data-testid="input-origin"
                value={ladder.originOverheadPct}
                onChange={(e) => setLadder({ ...ladder, originOverheadPct: e.target.value })}
                className="mt-1 w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-heading" />
            </label>
            <label className="text-xs text-muted">
              UK Overhead %
              <input
                type="number" min="0" max="100" step="0.01"
                data-testid="input-uk"
                value={ladder.ukOverheadPct}
                onChange={(e) => setLadder({ ...ladder, ukOverheadPct: e.target.value })}
                className="mt-1 w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-heading" />
            </label>
            <label className="text-xs text-muted">
              Exchange Rate (GBP per USD)
              <input
                type="number" min="0" step="0.000001"
                data-testid="input-rate"
                value={ladder.exchangeRate}
                onChange={(e) => setLadder({ ...ladder, exchangeRate: e.target.value })}
                className="mt-1 w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-heading" />
            </label>
            <label className="text-xs text-muted">
              Selling Price ($)
              <input
                type="number" min="0" step="0.01"
                data-testid="input-selling"
                value={ladder.sellingPrice}
                onChange={(e) => setLadder({ ...ladder, sellingPrice: e.target.value })}
                className="mt-1 w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-heading" />
            </label>
          </div>
          <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="flex justify-between text-sm">
              <span className="text-body">Total Cost</span>
              <span data-testid="ladder-cost" className="text-heading font-mono">${fmt(total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-body">Discount</span>
              <span data-testid="ladder-discount" className="text-heading font-mono">${fmt(discountAmt)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-body">Overhead</span>
              <span data-testid="ladder-overhead" className="text-heading font-mono">${fmt(overheadAmt)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-body font-medium">Base Cost</span>
              <span data-testid="ladder-base" className="text-heading font-semibold font-mono">${fmt(base)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-body font-medium">Margin</span>
              <span data-testid="ladder-margin" className={`font-mono ${hasSelling && marginLadder >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                ${fmt(marginLadder)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-body font-medium">Margin %</span>
              <span data-testid="ladder-margin-pct" className={`font-mono ${hasSelling && marginPctLadder >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {Number.isFinite(marginPctLadder) ? `${marginPctLadder.toFixed(2)}%` : '—'}
              </span>
            </div>
            <div className="flex justify-between text-sm md:col-span-3">
              <span className="text-body">Landed (GBP)</span>
              <span data-testid="ladder-landed" className="text-heading font-mono">GBP {fmt(landed)}</span>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-xl border border-border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted">Prepare PO Costing</h3>
            {costing.status !== 'approved' && (
              <span className="text-xs text-badge-amber">Only an approved design costing can be prepared into a PO costing</span>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={selectedPo}
              onChange={(e) => setSelectedPo(e.target.value)}
              className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-heading">
              <option value="">Select a purchase order…</option>
              {pos.map((po) => (
                <option key={po.id} value={po.id}>{po.po_number}{po.style_number ? ` (${po.style_number})` : ''}</option>
              ))}
            </select>
            <button
              onClick={handlePrepare}
              disabled={acting || costing.status !== 'approved' || !selectedPo}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors">
              Prepare PO Costing
            </button>
          </div>
          <p className="mt-2 text-xs text-faint">Copies this design cost and its lines into a new order-level costing sheet for the chosen Purchase Order.</p>
        </div>

        <div className="bg-surface rounded-xl border border-border p-6">
          <h3 className="text-sm font-medium text-muted mb-4">Cost Lines</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-border">
                  <th className="py-2 pr-4 font-medium">Category</th>
                  <th className="py-2 pr-4 font-medium">Description</th>
                  <th className="py-2 pr-4 font-medium">Size / Width</th>
                  <th className="py-2 pr-4 font-medium text-right">Unit Price</th>
                  <th className="py-2 pr-4 font-medium text-right">Consumption</th>
                  <th className="py-2 font-medium text-right">Line Total</th>
                </tr>
              </thead>
              <tbody>
                {costing.lines.map((line) => (
                  <tr key={line.id} className="border-b border-border/50 last:border-0">
                    <td className="py-2 pr-4 text-body">{line.category_label}</td>
                    <td className="py-2 pr-4 text-heading">{line.description}</td>
                    <td className="py-2 pr-4 text-body">{line.size_width || '—'}</td>
                    <td className="py-2 pr-4 text-right text-body">${parseFloat(String(line.unit_price)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                    <td className="py-2 pr-4 text-right text-body">{parseFloat(String(line.consumption)).toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                    <td className="py-2 text-right text-emerald-700 font-mono">${parseFloat(String(line.line_total)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {costing.lines.length === 0 && (
              <p className="py-6 text-center text-faint text-sm italic">No cost lines yet</p>
            )}
          </div>
        </div>
      </main>
    </Layout>
  );
}
