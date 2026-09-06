import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import SpreadsheetGrid from '../components/SpreadsheetGrid';
import type { SpreadsheetColumn } from '../components/SpreadsheetGrid';
import { logisticsApi, merchApi } from '../api/client';
import type { CostReconciliation, PurchaseOrder } from '../api/client';
import SearchableSelect from '../components/SearchableSelect';
import { useToast } from '../contexts/ToastContext';

const EMPTY_FORM: Record<string, string> = {
  purchase_order: '', factory_inv_amount: '0', factory_inv_qty: '0',
  planning_cm_amount: '0', planning_cm_qty: '0', status: 'pending', notes: '',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending', reconciled: 'Reconciled', disputed: 'Disputed', resolved: 'Resolved',
};

export default function CostReconcilePage() {
  const { toast } = useToast();
  const [items, setItems] = useState<CostReconciliation[]>([]);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Record<string, string>>(EMPTY_FORM);
  const [editing, setEditing] = useState<CostReconciliation | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const res = await logisticsApi.getCostReconciliations({ page_size: '10000' });
      setItems(res.data.results);
    } catch { toast('error', 'Failed to load cost reconciliations'); }
  };

  useEffect(() => {
    Promise.all([
      logisticsApi.getCostReconciliations({ page_size: '10000' }),
      merchApi.getPurchaseOrders({ page_size: '500' }),
    ]).then(([res, p]) => {
      setItems(res.data.results);
      setPos(p.data.results);
    }).catch(() => toast('error', 'Failed to load cost reconciliation data')).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        ...form,
        purchase_order: form.purchase_order || null,
        factory_inv_amount: form.factory_inv_amount || '0',
        factory_inv_qty: form.factory_inv_qty || '0',
        planning_cm_amount: form.planning_cm_amount || '0',
        planning_cm_qty: form.planning_cm_qty || '0',
      };
      if (editing) {
        await logisticsApi.updateCostReconciliation(editing.id, payload);
        toast('success', 'Cost reconciliation updated');
      } else {
        await logisticsApi.createCostReconciliation(payload);
        toast('success', 'Cost reconciliation created');
      }
      setShowModal(false); setForm(EMPTY_FORM); setEditing(null); loadData();
    } catch { toast('error', 'Failed to save cost reconciliation');
    } finally { setSaving(false); }
  };

  const handleCompare = async (rec: CostReconciliation) => {
    try {
      await logisticsApi.compareCostReconciliation(rec.id, {
        factory_inv_amount: form.factory_inv_amount,
        planning_cm_amount: form.planning_cm_amount,
        factory_inv_qty: form.factory_inv_qty,
        planning_cm_qty: form.planning_cm_qty,
      });
      toast('success', 'Cost comparison updated');
      loadData();
    } catch { toast('error', 'Failed to compare costs'); }
  };

  const handleResolve = async (rec: CostReconciliation) => {
    try {
      await logisticsApi.resolveCostReconciliation(rec.id, { status: form.status || 'resolved' });
      toast('success', 'Reconciliation resolved');
      setShowModal(false); setForm(EMPTY_FORM); setEditing(null); loadData();
    } catch { toast('error', 'Failed to resolve reconciliation'); }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await logisticsApi.deleteCostReconciliation(deleteId);
      toast('success', 'Cost reconciliation deleted');
      setDeleteId(null); loadData();
    } catch { toast('error', 'Failed to delete'); setDeleteId(null); }
  };

  const columns: SpreadsheetColumn[] = [
    { title: 'PO No', field: 'po_number', headerFilter: true },
    { title: 'Factory Inv (MP)', field: 'factory_inv_amount', hozAlign: 'right', bottomCalc: 'sum' },
    { title: 'Factory Qty', field: 'factory_inv_qty', hozAlign: 'right' },
    { title: 'Planning CM', field: 'planning_cm_amount', hozAlign: 'right', bottomCalc: 'sum' },
    { title: 'CM Qty', field: 'planning_cm_qty', hozAlign: 'right' },
    { title: 'Factory Unit', field: 'factory_inv_per_unit', hozAlign: 'right' },
    { title: 'CM Unit', field: 'planning_cm_per_unit', hozAlign: 'right' },
    { title: 'Saving/Loss Unit', field: 'saving_loss_per_unit', hozAlign: 'right' },
    { title: 'Saving/Loss Total', field: 'saving_loss_total', hozAlign: 'right', bottomCalc: 'sum' },
    { title: 'Flag', field: 'mismatch_label' },
    { title: 'Status', field: 'status_label', headerFilter: true },
    { title: 'Reconciled By', field: 'reconciled_by_name' },
  ];

  const money = (v: string) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const money4 = (v: string) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });

  const gridData = items.map((p) => ({
    ...p,
    factory_inv_amount: money(p.factory_inv_amount),
    planning_cm_amount: money(p.planning_cm_amount),
    factory_inv_per_unit: money4(p.factory_inv_per_unit),
    planning_cm_per_unit: money4(p.planning_cm_per_unit),
    saving_loss_per_unit: money4(p.saving_loss_per_unit),
    saving_loss_total: money(p.saving_loss_total),
    mismatch_label: p.is_mismatch ? 'Mismatch' : 'OK',
    status_label: STATUS_LABELS[p.status] ?? p.status_label ?? p.status,
  }));

  const setField = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const openEdit = (rec: CostReconciliation) => {
    setEditing(rec);
    setForm({
      purchase_order: rec.purchase_order, factory_inv_amount: rec.factory_inv_amount,
      factory_inv_qty: rec.factory_inv_qty, planning_cm_amount: rec.planning_cm_amount,
      planning_cm_qty: rec.planning_cm_qty, status: rec.status, notes: rec.notes,
    });
    setShowModal(true);
  };

  const inputCls = 'w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500';
  const labelCls = 'block text-sm text-muted mb-1';

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Cost Reconciliations</h1>
            <p className="text-muted text-sm mt-1">RQ-046 — Compare Factory Invoice (MP) vs Planning CM; Saving/Loss per unit and total; flag mismatches.</p>
          </div>
          <button onClick={() => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); }} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">+ New Cost Reconciliation</button>
        </div>

        <div className="bg-surface rounded-xl border border-border p-5">
          <SpreadsheetGrid
            data={gridData as unknown as Record<string, unknown>[]}
            columns={columns}
            height={480}
            toolbar
            title="Cost Reconciliations"
            exportable
            columnChooser
            paginationSize={10}
            actionColumn
            onAdd={() => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); }}
            onEdit={(row) => openEdit(row as unknown as CostReconciliation)}
            onDelete={(row) => setDeleteId(String(row.id))}
            loading={loading}
          />
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border"><h2 className="text-lg font-semibold">{editing ? 'Edit Cost Reconciliation' : 'New Cost Reconciliation'}</h2></div>
            <div className="p-6 space-y-4">
              <div>
                <label className={labelCls}>Purchase Order</label>
                <SearchableSelect options={pos.map(p => ({ value: p.id, label: p.po_number }))}
                  value={form.purchase_order || null} onChange={(v) => setField('purchase_order', String(v || ''))} placeholder="Select purchase order..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Factory Inv (MP) Amount</label><input type="number" step="0.01" value={form.factory_inv_amount} onChange={(e) => setField('factory_inv_amount', e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>Factory Inv Qty</label><input type="number" step="1" value={form.factory_inv_qty} onChange={(e) => setField('factory_inv_qty', e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>Planning CM Amount</label><input type="number" step="0.01" value={form.planning_cm_amount} onChange={(e) => setField('planning_cm_amount', e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>Planning CM Qty</label><input type="number" step="1" value={form.planning_cm_qty} onChange={(e) => setField('planning_cm_qty', e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>Status</label>
                  <select value={form.status} onChange={(e) => setField('status', e.target.value)} className={inputCls}><option value="pending">Pending</option><option value="reconciled">Reconciled</option><option value="disputed">Disputed</option><option value="resolved">Resolved</option></select>
                </div>
                <div><label className={labelCls}>Notes</label><input value={form.notes} onChange={(e) => setField('notes', e.target.value)} className={inputCls} /></div>
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              {editing && (
                <button onClick={() => { handleCompare(editing); }} className="px-4 py-2 text-sm text-blue-500 hover:text-blue-400 transition-colors">Re-compare</button>
              )}
              {editing && (
                <button onClick={() => { handleResolve(editing); }} className="px-4 py-2 text-sm text-emerald-600 hover:text-emerald-500 transition-colors">Resolve</button>
              )}
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">{saving ? 'Saving...' : editing ? 'Save Changes' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2">Delete Cost Reconciliation?</h2>
            <p className="text-muted text-sm mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-3"><button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-body hover:text-heading">Cancel</button><button onClick={confirmDelete} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg">Delete</button></div>
          </div>
        </div>
      )}
    </Layout>
  );
}