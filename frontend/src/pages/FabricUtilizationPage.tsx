import { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import { fabricApi } from '../api/client';
import type { FabricOrder, FabricUtilization, MonthlySummary, QuarterlyMillReport } from '../api/client';
import type { Column } from '../components/DataTable';
import { useToast } from '../contexts/ToastContext';

const CURRENT_PERIOD = new Date().toISOString().slice(0, 7);
const CURRENT_QUARTER = String(Math.floor((new Date().getMonth()) / 3) + 1);

const EMPTY_FORM = { order: '', period: CURRENT_PERIOD, received_meters: '', used_meters: '', wasted_meters: '0', damaged_meters: '0', notes: '' };

export default function FabricUtilizationPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<FabricUtilization[]>([]);
  const [orders, setOrders] = useState<FabricOrder[]>([]);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [quarterReport, setQuarterReport] = useState<QuarterlyMillReport | null>(null);
  const [period, setPeriod] = useState(CURRENT_PERIOD);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [quarter, setQuarter] = useState(CURRENT_QUARTER);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const loadRecords = async () => {
    try {
      const res = await fabricApi.getUtilizations({ page_size: '100' });
      setItems(res.data.results);
    } catch { toast('error', 'Failed to load utilization records'); }
  };

  const loadMonthly = async (p: string) => {
    setReportLoading(true);
    try {
      const res = await fabricApi.getMonthlySummary(p);
      setSummary(res.data);
    } catch { toast('error', 'Failed to load monthly summary');
    } finally { setReportLoading(false); }
  };

  const loadQuarterly = async (y: string, q: string) => {
    setReportLoading(true);
    try {
      const res = await fabricApi.getQuarterlyMillReport(y, q);
      setQuarterReport(res.data);
    } catch { toast('error', 'Failed to load quarterly mill report');
    } finally { setReportLoading(false); }
  };

  useEffect(() => {
    Promise.all([
      fabricApi.getUtilizations({ page_size: '100' }),
      fabricApi.getOrders({ page_size: '100' }),
      fabricApi.getMonthlySummary(CURRENT_PERIOD),
      fabricApi.getQuarterlyMillReport(String(new Date().getFullYear()), CURRENT_QUARTER),
    ]).then(([recs, ords, sum, quart]) => {
      setItems(recs.data.results);
      setOrders(ords.data.results);
      setSummary(sum.data);
      setQuarterReport(quart.data);
    }).catch(() => toast('error', 'Failed to load fabric utilization data')).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!form.order || !form.received_meters || !form.used_meters) { toast('warning', 'Order, Received and Used meters are required'); return; }
    setSaving(true);
    try {
      await fabricApi.createUtilization({ order: form.order, period: form.period, received_meters: form.received_meters, used_meters: form.used_meters, wasted_meters: form.wasted_meters || '0', damaged_meters: form.damaged_meters || '0', notes: form.notes });
      toast('success', 'Utilization record created');
      setShowModal(false); setForm(EMPTY_FORM); loadRecords(); loadMonthly(period); loadQuarterly(year, quarter);
    } catch { toast('error', 'Failed to save. A record for this order/period may already exist.');
    } finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await fabricApi.deleteUtilization(deleteId);
      toast('success', 'Utilization record deleted');
      setDeleteId(null); loadRecords(); loadMonthly(period); loadQuarterly(year, quarter);
    } catch { toast('error', 'Failed to delete'); setDeleteId(null); }
  };

  const filtered = useMemo(() => items.filter(i =>
    i.order_number.toLowerCase().includes(search.toLowerCase()) ||
    i.supplier_name.toLowerCase().includes(search.toLowerCase()) ||
    i.period.includes(search)
  ), [items, search]);
  const pagedData = useMemo(() => { const s = (page - 1) * pageSize; return filtered.slice(s, s + pageSize); }, [filtered, page]);

  const columns: Column[] = [
    { key: 'order_number', label: 'Order', sortable: true, render: (v) => <span className="font-medium text-heading font-mono">{String(v)}</span> },
    { key: 'supplier_name', label: 'Supplier', sortable: true },
    { key: 'period', label: 'Period', sortable: true, render: (v) => <span className="font-mono text-body">{String(v)}</span> },
    { key: 'received_meters', label: 'Received', render: (v) => <span className="font-mono text-body">{String(v)}</span> },
    { key: 'used_meters', label: 'Used', render: (v) => <span className="font-mono text-body">{String(v)}</span> },
    { key: 'wasted_meters', label: 'Wasted', render: (v) => <span className="font-mono text-body">{String(v)}</span> },
    { key: 'damaged_meters', label: 'Damaged', render: (v) => <span className="font-mono text-body">{String(v)}</span> },
    { key: 'excess_meters', label: 'Excess', render: (v) => <span className="font-mono text-amber-600">{String(v)}</span> },
    { key: 'efficiency_pct', label: 'Efficiency', render: (v) => <span className="font-mono text-emerald-600">{String(v)}%</span> },
    { key: 'tolerance_status', label: 'Tolerance', sortable: true, render: (v) => {
      const status = String(v);
      const cls = status === 'over' ? 'bg-red-100 text-red-700' : status === 'under' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700';
      return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{status === 'over' ? 'Over' : status === 'under' ? 'Under' : 'Within'}</span>;
    }},
    { key: 'over_tolerance', label: 'Debit Flag', render: (v) => v === true ? <span className="text-red-600 font-medium text-xs">DEBIT</span> : <span className="text-muted text-xs">-</span> },
    { key: 'actions', label: '', className: 'text-right', render: (_v, row) => {
      const item = row as unknown as FabricUtilization;
      return <button onClick={(e) => { e.stopPropagation(); setDeleteId(item.id); }} className="text-red-500 hover:text-red-400 text-sm">Delete</button>;
    }},
  ];

  const summaryCard = (label: string, value: string | number | undefined, accent = false) => (
    <div className="bg-surface-alt rounded-lg p-4">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className={`font-mono text-lg ${accent ? 'text-emerald-600' : 'text-heading'}`}>{value ?? '0'}</p>
    </div>
  );

  if (loading) return <Layout><div className="p-6 flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" /></div></Layout>;

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Fabric Utilization Reports</h1>
            <p className="text-muted text-sm mt-1">GC-030 — excess fabric at docket stage, final rating vs actual rating, quarterly mill performance (GC Manual, Fabric Utilisation).</p>
          </div>
          <button onClick={() => { setForm({ ...EMPTY_FORM, period }); setShowModal(true); }} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">+ Add Record</button>
        </div>

        <div className="bg-surface rounded-xl border border-border p-5">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
            <h2 className="text-sm font-semibold text-heading">Monthly Utilization</h2>
            <div className="flex items-end gap-2">
              <div>
                <label className="block text-sm text-muted mb-1">Period (YYYY-MM)</label>
                <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="px-3 py-2 bg-input border border-input-border rounded-lg text-heading font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <button onClick={() => loadMonthly(period)} disabled={reportLoading} className="px-4 py-2 bg-surface-alt hover:bg-surface text-heading border border-border rounded-lg text-sm font-medium transition-colors disabled:opacity-50">Load</button>
            </div>
          </div>
          {summary && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {summaryCard('Orders', summary.summary.orders_count)}
                {summaryCard('Ordered (m)', summary.summary.ordered_meters)}
                {summaryCard('Received (m)', summary.summary.received_meters)}
                {summaryCard('Used (m)', summary.summary.used_meters)}
                {summaryCard('Wasted (m)', summary.summary.wasted_meters)}
                {summaryCard('Damaged (m)', summary.summary.damaged_meters)}
                {summaryCard('Excess (m)', summary.summary.excess_meters, true)}
                {summaryCard('Over/Under %', summary.summary.over_under_pct)}
                {summaryCard('Efficiency %', summary.summary.efficiency_pct, true)}
              </div>
              <p className="text-xs text-muted mt-3">Excess metres = received − (used + wasted + damaged); Over/Under % = final rating vs actual rating; Efficiency % = used ÷ received.</p>
            </>
          )}
        </div>

        <div className="bg-surface rounded-xl border border-border p-5">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
            <h2 className="text-sm font-semibold text-heading">Quarterly Mill Performance</h2>
            <div className="flex items-end gap-2">
              <div>
                <label className="block text-sm text-muted mb-1">Year</label>
                <input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="w-24 px-3 py-2 bg-input border border-input-border rounded-lg text-heading font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Quarter</label>
                <select value={quarter} onChange={(e) => setQuarter(e.target.value)} className="px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  {['1', '2', '3', '4'].map(q => <option key={q} value={q}>Q{q}</option>)}
                </select>
              </div>
              <button onClick={() => loadQuarterly(year, quarter)} disabled={reportLoading} className="px-4 py-2 bg-surface-alt hover:bg-surface text-heading border border-border rounded-lg text-sm font-medium transition-colors disabled:opacity-50">Load</button>
            </div>
          </div>
          {quarterReport && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted text-xs uppercase">
                    <th className="text-left py-2 pr-4">Mill</th><th className="text-right py-2 pr-4">Orders</th>
                    <th className="text-right py-2 pr-4">Ordered (m)</th><th className="text-right py-2 pr-4">Received (m)</th>
                    <th className="text-right py-2 pr-4">Excess (m)</th><th className="text-right py-2 pr-4">Over/Under %</th>
                    <th className="text-right py-2 pr-4">Damaged (m)</th><th className="text-right py-2 pr-4">Efficiency %</th>
                  </tr>
                </thead>
                <tbody>
                  {quarterReport.mills.length === 0 && <tr><td colSpan={8} className="py-4 text-muted text-center">No utilization records in {quarterReport.year}-Q{quarterReport.quarter}.</td></tr>}
                  {quarterReport.mills.map((m, i) => (
                    <tr key={m.supplier_id || i} className="border-t border-border">
                      <td className="py-2 pr-4 text-heading font-medium">{m.supplier_name}</td>
                      <td className="py-2 pr-4 text-right font-mono">{m.orders_count}</td>
                      <td className="py-2 pr-4 text-right font-mono">{m.ordered_meters}</td>
                      <td className="py-2 pr-4 text-right font-mono">{m.received_meters}</td>
                      <td className="py-2 pr-4 text-right font-mono text-amber-600">{m.excess_meters}</td>
                      <td className="py-2 pr-4 text-right font-mono">{m.over_under_pct}</td>
                      <td className="py-2 pr-4 text-right font-mono">{m.damaged_meters}</td>
                      <td className="py-2 pr-4 text-right font-mono text-emerald-600">{m.efficiency_pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DataTable data={pagedData as unknown as Record<string, unknown>[]} columns={columns} totalCount={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search by order, supplier or period..." loading={loading} />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border"><h2 className="text-lg font-semibold">Add Utilization Record</h2></div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-muted mb-1">Order *</label>
                <select value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="">Select fabric order...</option>
                  {orders.map(o => <option key={o.id} value={o.id}>{o.order_number} — {o.supplier_name} ({o.quantity_meters}m)</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Period (YYYY-MM) *</label>
                <input type="month" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm text-muted mb-1">Received (m) *</label><input type="number" min="0" step="0.01" value={form.received_meters} onChange={(e) => setForm({ ...form, received_meters: e.target.value })} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                <div><label className="block text-sm text-muted mb-1">Used (m) *</label><input type="number" min="0" step="0.01" value={form.used_meters} onChange={(e) => setForm({ ...form, used_meters: e.target.value })} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                <div><label className="block text-sm text-muted mb-1">Wasted (m)</label><input type="number" min="0" step="0.01" value={form.wasted_meters} onChange={(e) => setForm({ ...form, wasted_meters: e.target.value })} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                <div><label className="block text-sm text-muted mb-1">Damaged (m)</label><input type="number" min="0" step="0.01" value={form.damaged_meters} onChange={(e) => setForm({ ...form, damaged_meters: e.target.value })} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="e.g. excess fabric identified at docket stage..." className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">{saving ? 'Saving...' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2">Delete Utilization Record?</h2>
            <p className="text-muted text-sm mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-3"><button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-body hover:text-heading">Cancel</button><button onClick={confirmDelete} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg">Delete</button></div>
          </div>
        </div>
      )}
    </Layout>
  );
}
