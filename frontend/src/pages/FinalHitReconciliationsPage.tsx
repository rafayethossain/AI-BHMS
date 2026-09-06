import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import SpreadsheetGrid from '../components/SpreadsheetGrid';
import type { SpreadsheetColumn } from '../components/SpreadsheetGrid';
import { logisticsApi } from '../api/client';
import type { FinalHitReconciliation, Shipment } from '../api/client';
import { useToast } from '../contexts/ToastContext';

const EMPTY_FORM = {
  shipment: '', docket_quantity: '', shipped_quantity: '', reasons_evident: false, notes: '',
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

  const loadData = async () => {
    try {
      const [res, over] = await Promise.all([
        logisticsApi.getReconciliations({ page_size: '10000' }),
        logisticsApi.getOverLimitReconciliations(),
      ]);
      setItems(res.data.results);
      setOverLimit(over.data.results);
    } catch { toast('error', 'Failed to load reconciliations'); }
  };

  useEffect(() => {
    Promise.all([
      logisticsApi.getReconciliations({ page_size: '10000' }),
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

  const columns: SpreadsheetColumn[] = [
    { title: 'Shipment', field: 'shipment_number', headerFilter: true },
    { title: 'PO', field: 'po_number', headerFilter: true },
    { title: 'Docket Qty', field: 'docket_quantity' },
    { title: 'Shipped', field: 'shipped_quantity' },
    { title: 'Shortage', field: 'shortage_units' },
    { title: 'Status', field: 'status_label', headerFilter: true },
    { title: 'Reconciled By', field: 'reconciled_by_name' },
  ];

  const gridData = items.map((rec) => ({
    ...rec,
    shortage_units: Number(rec.shortage_units) > 0 ? rec.shortage_units : '—',
  }));

  const overLimitCard = (rec: FinalHitReconciliation) => (
    <div key={rec.id} className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">{rec.shipment_number} — {rec.po_number}</p>
          <p className="text-xs text-red-600 dark:text-red-500 mt-1 font-mono">{rec.shortage_units} units short vs docket of {rec.docket_quantity} (over the 20-unit limit)</p>
          <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">Target requirements: if more than 20 units short and reasons are not evident, a debit must be raised.</p>
        </div>
        <div className="shrink-0 flex gap-2">
          <button onClick={() => runAction(rec.id, () => logisticsApi.reconcileHit(rec.id), 'Reconciliation complete')} disabled={busyId === rec.id} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50">Reconcile</button>
          <button onClick={() => runAction(rec.id, () => logisticsApi.markDebited(rec.id), 'Debit raised')} disabled={busyId === rec.id} className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50">{busyId === rec.id ? 'Working...' : 'Raise Debit'}</button>
        </div>
      </div>
    </div>
  );

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
          <SpreadsheetGrid
            data={gridData as unknown as Record<string, unknown>[]}
            columns={columns}
            height={480}
            toolbar
            title="Final Hit Reconciliation"
            exportable
            columnChooser
            paginationSize={10}
            actionColumn
            onAdd={() => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); }}
            onEdit={(row) => {
              const r = row as unknown as FinalHitReconciliation;
              setEditing(r); setForm({
                shipment: r.shipment, docket_quantity: r.docket_quantity, shipped_quantity: r.shipped_quantity,
                reasons_evident: r.reasons_evident, notes: r.notes,
              }); setShowModal(true);
            }}
            onDelete={(row) => setDeleteId(String(row.id))}
            loading={loading}
          />
        </div>

        <div className="bg-surface rounded-xl border border-border p-4">
          <h2 className="text-sm font-semibold text-heading mb-3">Register Actions</h2>
          <p className="text-xs text-muted mb-3">Status-specific actions (Reconcile / Debit / Waive) for pending entries; edit and delete are available via the grid row actions.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {items.filter(i => i.status === 'pending').map(rec => (
              <div key={rec.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-heading truncate">{rec.shipment_number} — {rec.po_number}</p>
                  <p className="text-xs text-muted font-mono">{rec.shortage_units} short {rec.requires_debit ? '· debit required' : ''}</p>
                </div>
                <div className="shrink-0 flex gap-2">
                  <button onClick={() => runAction(rec.id, () => logisticsApi.reconcileHit(rec.id), 'Reconciliation complete')} disabled={busyId === rec.id} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50">Reconcile</button>
                  {rec.requires_debit && (
                    <button onClick={() => runAction(rec.id, () => logisticsApi.markDebited(rec.id), 'Debit raised')} disabled={busyId === rec.id} className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50">Debit</button>
                  )}
                  <button onClick={() => openWaive(rec)} className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-xs font-medium transition-colors">Waive</button>
                </div>
              </div>
            ))}
            {items.filter(i => i.status === 'pending').length === 0 && (
              <p className="text-sm text-muted">No pending reconciliations.</p>
            )}
          </div>
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
