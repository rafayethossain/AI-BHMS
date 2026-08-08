import { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import { logisticsApi } from '../api/client';
import type { FinalHitReconciliation, Shipment } from '../api/client';
import type { Column } from '../components/DataTable';
import { useToast } from '../contexts/ToastContext';

const EMPTY_FORM = {
  shipment: '', docket_quantity: '', shipped_quantity: '', reasons_evident: false, notes: '',
};

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  reconciled: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  debited: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400',
  waived: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

export default function FinalHitReconciliationsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<FinalHitReconciliation[]>([]);
  const [overLimit, setOverLimit] = useState<FinalHitReconciliation[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showWaive, setShowWaive] = useState<FinalHitReconciliation | null>(null);
  const [waiveForm, setWaiveForm] = useState({ reasons_evident: true, notes: '' });
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState<FinalHitReconciliation | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const loadData = async () => {
    try {
      const [res, over] = await Promise.all([
        logisticsApi.getReconciliations({ page_size: '100' }),
        logisticsApi.getOverLimitReconciliations(),
      ]);
      setItems(res.data.results);
      setOverLimit(over.data.results);
    } catch { toast('error', 'Failed to load reconciliations'); }
  };

  useEffect(() => {
    Promise.all([
      logisticsApi.getReconciliations({ page_size: '100' }),
      logisticsApi.getOverLimitReconciliations(),
      logisticsApi.getShipments({ page_size: '100', status: 'delivered' }),
    ]).then(([res, over, ships]) => {
      setItems(res.data.results);
      setOverLimit(over.data.results);
      setShipments(ships.data.results);
    }).catch(() => toast('error', 'Failed to load reconciliation data')).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!form.shipment) { toast('warning', 'Shipment is required'); return; }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        shipment: form.shipment,
        docket_quantity: form.docket_quantity || '0',
        shipped_quantity: form.shipped_quantity || '0',
        reasons_evident: form.reasons_evident,
        notes: form.notes,
      };
      if (editing) {
        await logisticsApi.updateReconciliation(editing.id, payload);
        toast('success', 'Reconciliation updated');
      } else {
        await logisticsApi.createReconciliation(payload);
        toast('success', 'Reconciliation created');
      }
      setShowModal(false); setForm(EMPTY_FORM); setEditing(null); loadData();
    } catch { toast('error', 'Failed to save reconciliation');
    } finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await logisticsApi.deleteReconciliation(deleteId);
      toast('success', 'Reconciliation deleted');
      setDeleteId(null); loadData();
    } catch { toast('error', 'Failed to delete'); setDeleteId(null); }
  };

  const runAction = async (id: string, fn: () => Promise<unknown>, success: string) => {
    setBusyId(id);
    try {
      await fn();
      toast('success', success);
      loadData();
    } catch { toast('error', 'Action failed');
    } finally { setBusyId(null); }
  };

  const openWaive = (rec: FinalHitReconciliation) => {
    setWaiveForm({ reasons_evident: rec.reasons_evident, notes: rec.notes });
    setShowWaive(rec);
  };

  const confirmWaive = async () => {
    if (!showWaive) return;
    const rec = showWaive;
    setShowWaive(null);
    await runAction(rec.id, () => logisticsApi.waiveReconciliation(rec.id, waiveForm), 'Debit waived');
  };

  const filtered = useMemo(() => items.filter(i =>
    i.shipment_number.toLowerCase().includes(search.toLowerCase()) ||
    i.po_number.toLowerCase().includes(search.toLowerCase()) ||
    i.status_label.toLowerCase().includes(search.toLowerCase())
  ), [items, search]);
  const pagedData = useMemo(() => { const s = (page - 1) * pageSize; return filtered.slice(s, s + pageSize); }, [filtered, page]);

  const statusBadge = (status: string, label: string) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status] ?? STATUS_STYLES.pending}`}>{label}</span>
  );

  const columns: Column[] = [
    { key: 'shipment_number', label: 'Shipment', sortable: true, render: (v) => <span className="font-medium text-heading font-mono">{String(v)}</span> },
    { key: 'po_number', label: 'PO', render: (v) => <span className="font-mono text-body">{String(v)}</span> },
    { key: 'docket_quantity', label: 'Docket Qty', render: (v) => <span className="font-mono text-body">{String(v)}</span> },
    { key: 'shipped_quantity', label: 'Shipped', render: (v) => <span className="font-mono text-body">{String(v)}</span> },
    { key: 'shortage_units', label: 'Shortage', render: (v, row) => {
      const r = row as unknown as FinalHitReconciliation;
      const short = Number(r.shortage_units) > 0;
      return <span className={`font-mono ${short ? 'text-amber-600 font-semibold' : 'text-muted'}`}>{short ? String(v) : '—'}</span>;
    }},
    { key: 'requires_debit', label: 'Debit', render: (_v, row) => {
      const r = row as unknown as FinalHitReconciliation;
      return r.requires_debit ? <span className="text-red-600 font-semibold text-sm">&gt;20 short</span> : <span className="text-muted">No</span>;
    }},
    { key: 'status', label: 'Status', render: (_v, row) => {
      const r = row as unknown as FinalHitReconciliation;
      return statusBadge(r.status, r.status_label);
    }},
    { key: 'reconciled_by_name', label: 'Reconciled By', render: (v) => <span className="text-body text-sm">{String(v ?? '—')}</span> },
    { key: 'actions', label: '', className: 'text-right', render: (_v, row) => {
      const r = row as unknown as FinalHitReconciliation;
      const idle = busyId !== r.id;
      return (
        <div className="flex justify-end gap-3 text-sm">
          {r.status === 'pending' && (
            <>
              <button onClick={(e) => { e.stopPropagation(); runAction(r.id, () => logisticsApi.reconcileHit(r.id), 'Reconciliation complete'); }} disabled={!idle} className="text-emerald-600 hover:text-emerald-500 disabled:opacity-50">Reconcile</button>
              {r.requires_debit && (
                <button onClick={(e) => { e.stopPropagation(); runAction(r.id, () => logisticsApi.markDebited(r.id), 'Debit raised'); }} disabled={!idle} className="text-red-500 hover:text-red-400 disabled:opacity-50">Debit</button>
              )}
              <button onClick={(e) => { e.stopPropagation(); openWaive(r); }} className="text-slate-500 hover:text-slate-400">Waive</button>
            </>
          )}
          <button onClick={(e) => { e.stopPropagation(); setEditing(r); setForm({
            shipment: r.shipment, docket_quantity: r.docket_quantity, shipped_quantity: r.shipped_quantity,
            reasons_evident: r.reasons_evident, notes: r.notes,
          }); setShowModal(true); }} className="text-emerald-600 hover:text-emerald-500">Edit</button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteId(r.id); }} className="text-red-500 hover:text-red-400">Delete</button>
        </div>
      );
    }},
  ];

  const overLimitCard = (rec: FinalHitReconciliation) => (
    <div key={rec.id} className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">{rec.shipment_number} — {rec.po_number}</p>
          <p className="text-xs text-red-600 dark:text-red-500 mt-1 font-mono">{rec.shortage_units} units short vs docket of {rec.docket_quantity} (over the 20-unit limit)</p>
          <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">GC Manual: if more than 20 units short and reasons are not evident, a debit must be raised.</p>
        </div>
        <div className="shrink-0 flex gap-2">
          <button onClick={() => runAction(rec.id, () => logisticsApi.reconcileHit(rec.id), 'Reconciliation complete')} disabled={busyId === rec.id} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50">Reconcile</button>
          <button onClick={() => runAction(rec.id, () => logisticsApi.markDebited(rec.id), 'Debit raised')} disabled={busyId === rec.id} className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50">{busyId === rec.id ? 'Working...' : 'Raise Debit'}</button>
        </div>
      </div>
    </div>
  );

  if (loading) return <Layout><div className="p-6 flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" /></div></Layout>;

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Final Hit Reconciliation</h1>
            <p className="text-muted text-sm mt-1">GC-021 — when the last hit is delivered, compare shipped quantity against the docket. Anything more than 20 units short must be debited unless reasons are evident.</p>
          </div>
          <button onClick={() => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); }} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">+ New Reconciliation</button>
        </div>

        {overLimit.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">Over-20-Unit Shortage — Debit Required</h2>
            {overLimit.map(overLimitCard)}
          </div>
        )}

        <div className="bg-surface rounded-xl border border-border p-5">
          <h2 className="text-sm font-semibold text-heading mb-4">Reconciliation Register</h2>
          <DataTable data={pagedData as unknown as Record<string, unknown>[]} columns={columns} totalCount={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search by shipment, PO or status..." loading={loading} />
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border"><h2 className="text-lg font-semibold">{editing ? 'Edit Reconciliation' : 'New Reconciliation'}</h2></div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-muted mb-1">Shipment *</label>
                <select value={form.shipment} onChange={(e) => setForm({ ...form, shipment: e.target.value })} disabled={!!editing} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50">
                  <option value="">Select delivered shipment...</option>
                  {shipments.map(s => <option key={s.id} value={s.id}>{s.shipment_number} — {s.po_number}</option>)}
                </select>
                {editing && <p className="text-xs text-muted mt-1">Shipment cannot be changed after creation.</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm text-muted mb-1">Docket Quantity</label><input type="number" min="0" step="0.01" value={form.docket_quantity} onChange={(e) => setForm({ ...form, docket_quantity: e.target.value })} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                <div><label className="block text-sm text-muted mb-1">Shipped Quantity</label><input type="number" min="0" step="0.01" value={form.shipped_quantity} onChange={(e) => setForm({ ...form, shipped_quantity: e.target.value })} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-heading cursor-pointer">
                  <input type="checkbox" checked={form.reasons_evident} onChange={(e) => setForm({ ...form, reasons_evident: e.target.checked })} className="h-4 w-4 rounded border-border text-emerald-600 focus:ring-emerald-500" />
                  Shortage explained by evident reasons (no debit required)
                </label>
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="e.g. factory documented fabric defect..." className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">{saving ? 'Saving...' : editing ? 'Save Changes' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {showWaive && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl border border-border w-full max-w-md">
            <div className="p-6 border-b border-border"><h2 className="text-lg font-semibold">Waive Debit — {showWaive.shipment_number}</h2></div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-heading cursor-pointer">
                  <input type="checkbox" checked={waiveForm.reasons_evident} onChange={(e) => setWaiveForm({ ...waiveForm, reasons_evident: e.target.checked })} className="h-4 w-4 rounded border-border text-emerald-600 focus:ring-emerald-500" />
                  Reasons are evident (documented)
                </label>
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Reason</label>
                <textarea value={waiveForm.notes} onChange={(e) => setWaiveForm({ ...waiveForm, notes: e.target.value })} rows={2} placeholder="Explain the evident reason for the shortage..." className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button onClick={() => setShowWaive(null)} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
              <button onClick={confirmWaive} className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm font-medium transition-colors">Waive</button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2">Delete Reconciliation?</h2>
            <p className="text-muted text-sm mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-3"><button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-body hover:text-heading">Cancel</button><button onClick={confirmDelete} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg">Delete</button></div>
          </div>
        </div>
      )}
    </Layout>
  );
}
