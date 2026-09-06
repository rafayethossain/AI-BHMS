import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import SpreadsheetGrid from '../components/SpreadsheetGrid';
import type { SpreadsheetColumn } from '../components/SpreadsheetGrid';
import { logisticsApi, setupApi } from '../api/client';
import type { SupplierPayment, Vendor } from '../api/client';
import SearchableSelect from '../components/SearchableSelect';
import { useToast } from '../contexts/ToastContext';

const EMPTY_FORM: Record<string, string> = {
  supplier: '', payment_ref: '', invoice_no: '', fn_ref: '',
  allocated_amount: '0', amount: '0', currency: 'USD',
  payment_date: '', due_date: '', payment_method: 'TT', remarks: '',
};

const STATUS_LABELS: Record<string, string> = {
  released: 'Released', overdue: 'Overdue', to_be_released: 'To Be Released',
};

export default function SupplierPaymentsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<SupplierPayment[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [pivot, setPivot] = useState<{ supplier: string; month: string; total: string; overdue_due: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Record<string, string>>(EMPTY_FORM);
  const [editing, setEditing] = useState<SupplierPayment | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const res = await logisticsApi.getSupplierPayments({ page_size: '10000' });
      setItems(res.data.results);
    } catch { toast('error', 'Failed to load supplier payments'); }
  };

  useEffect(() => {
    Promise.all([
      logisticsApi.getSupplierPayments({ page_size: '10000' }),
      setupApi.getVendors({ page_size: '500' }),
      logisticsApi.getSupplierPaymentsDuePivot(),
    ]).then(([res, v, p]) => {
      setItems(res.data.results);
      setVendors(v.data.results);
      setPivot(p.data.results);
    }).catch(() => toast('error', 'Failed to load supplier payment data')).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        ...form,
        supplier: form.supplier || null,
        allocated_amount: form.allocated_amount || '0',
        amount: form.amount || '0',
        payment_date: form.payment_date || null,
        due_date: form.due_date || null,
      };
      if (editing) {
        await logisticsApi.updateSupplierPayment(editing.id, payload);
        toast('success', 'Supplier payment updated');
      } else {
        await logisticsApi.createSupplierPayment(payload);
        toast('success', 'Supplier payment created');
      }
      setShowModal(false); setForm(EMPTY_FORM); setEditing(null); loadData();
    } catch { toast('error', 'Failed to save supplier payment');
    } finally { setSaving(false); }
  };

  const handleRelease = async (rec: SupplierPayment) => {
    try {
      await logisticsApi.releaseSupplierPayment(rec.id);
      toast('success', 'Payment released');
      loadData();
    } catch { toast('error', 'Failed to release payment'); }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await logisticsApi.deleteSupplierPayment(deleteId);
      toast('success', 'Supplier payment deleted');
      setDeleteId(null); loadData();
    } catch { toast('error', 'Failed to delete'); setDeleteId(null); }
  };

  const columns: SpreadsheetColumn[] = [
    { title: 'SP Ref', field: 'payment_ref', headerFilter: true },
    { title: 'Supplier', field: 'supplier_name', headerFilter: true },
    { title: 'PO No', field: 'po_number' },
    { title: 'Invoice No', field: 'invoice_no' },
    { title: 'FN Ref', field: 'fn_ref' },
    { title: 'Allocated', field: 'allocated_amount', hozAlign: 'right', bottomCalc: 'sum' },
    { title: 'Amount', field: 'amount', hozAlign: 'right', bottomCalc: 'sum' },
    { title: 'Currency', field: 'currency' },
    { title: 'Method', field: 'payment_method' },
    { title: 'Due Date', field: 'due_date', headerFilter: true },
    { title: 'Payment Date', field: 'payment_date' },
    { title: 'Status', field: 'payment_status_label' },
    { title: 'Released By', field: 'released_by_name' },
  ];

  const money = (v: string) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const gridData = items.map((p) => ({
    ...p,
    allocated_amount: money(p.allocated_amount),
    amount: money(p.amount),
    payment_status_label: STATUS_LABELS[p.payment_status] ?? p.payment_status,
  }));

  const setField = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const openEdit = (rec: SupplierPayment) => {
    setEditing(rec);
    setForm({
      supplier: rec.supplier || '', payment_ref: rec.payment_ref, invoice_no: rec.invoice_no,
      fn_ref: rec.fn_ref, allocated_amount: rec.allocated_amount, amount: rec.amount,
      currency: rec.currency, payment_date: rec.payment_date || '', due_date: rec.due_date || '',
      payment_method: rec.payment_method, remarks: rec.remarks,
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
            <h1 className="text-2xl font-bold">Supplier Payments</h1>
            <p className="text-muted text-sm mt-1">RQ-045 — SP log with invoice-value allocation by FN, due pivot by supplier, to-be-released statuses, and a release workflow.</p>
          </div>
          <button onClick={() => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); }} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">+ New Supplier Payment</button>
        </div>

        {pivot.length > 0 && (
          <div className="bg-surface rounded-xl border border-border p-4">
            <h2 className="text-sm font-semibold text-heading mb-2">Due Pivot (by supplier × month)</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {pivot.map((row, idx) => (
                <div key={`${row.supplier}-${row.month}-${idx}`} className="rounded-lg border border-border p-3 bg-panel">
                  <div className="text-sm font-medium text-heading">{row.supplier}</div>
                  <div className="text-xs text-muted">{row.month}</div>
                  <div className="mt-1 text-emerald-600 font-semibold">Due {money(row.total)}</div>
                  {Number(row.overdue_due) > 0 && <div className="text-xs text-red-500">Overdue {money(row.overdue_due)}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-surface rounded-xl border border-border p-5">
          <SpreadsheetGrid
            data={gridData as unknown as Record<string, unknown>[]}
            columns={columns}
            height={480}
            toolbar
            title="Supplier Payments"
            exportable
            columnChooser
            paginationSize={10}
            actionColumn
            onAdd={() => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); }}
            onEdit={(row) => openEdit(row as unknown as SupplierPayment)}
            onDelete={(row) => setDeleteId(String(row.id))}
            loading={loading}
          />
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border"><h2 className="text-lg font-semibold">{editing ? 'Edit Supplier Payment' : 'New Supplier Payment'}</h2></div>
            <div className="p-6 space-y-4">
              <div>
                <label className={labelCls}>Supplier</label>
                <SearchableSelect options={vendors.map(v => ({ value: v.id, label: v.name }))}
                  value={form.supplier || null} onChange={(v) => setField('supplier', String(v || ''))} placeholder="Select supplier..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>SP Ref</label><input value={form.payment_ref} onChange={(e) => setField('payment_ref', e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>Invoice No</label><input value={form.invoice_no} onChange={(e) => setField('invoice_no', e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>FN Ref</label><input value={form.fn_ref} onChange={(e) => setField('fn_ref', e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>Payment Method</label>
                  <select value={form.payment_method} onChange={(e) => setField('payment_method', e.target.value)} className={inputCls}><option value="TT">TT</option><option value="LC">LC</option><option value="FOC">FOC</option><option value="cash">Cash</option></select>
                </div>
                <div><label className={labelCls}>Allocated Amount</label><input type="number" step="0.01" value={form.allocated_amount} onChange={(e) => setField('allocated_amount', e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>Amount</label><input type="number" step="0.01" value={form.amount} onChange={(e) => setField('amount', e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>Currency</label><input value={form.currency} onChange={(e) => setField('currency', e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>Due Date</label><input type="date" value={form.due_date} onChange={(e) => setField('due_date', e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>Payment Date</label><input type="date" value={form.payment_date} onChange={(e) => setField('payment_date', e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>Remarks</label><input value={form.remarks} onChange={(e) => setField('remarks', e.target.value)} className={inputCls} /></div>
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              {editing && !editing.released && (
                <button onClick={() => { handleRelease(editing); setShowModal(false); }} className="px-4 py-2 text-sm text-blue-500 hover:text-blue-400 transition-colors">Mark as Released</button>
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
            <h2 className="text-lg font-bold mb-2">Delete Supplier Payment?</h2>
            <p className="text-muted text-sm mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-3"><button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-body hover:text-heading">Cancel</button><button onClick={confirmDelete} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg">Delete</button></div>
          </div>
        </div>
      )}
    </Layout>
  );
}