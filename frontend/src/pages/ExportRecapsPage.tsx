import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import SpreadsheetGrid from '../components/SpreadsheetGrid';
import type { SpreadsheetColumn } from '../components/SpreadsheetGrid';
import { logisticsApi, setupApi } from '../api/client';
import type { ExportRecap, Factory, FreightForwarder } from '../api/client';
import SearchableSelect from '../components/SearchableSelect';
import { useToast } from '../contexts/ToastContext';

const EMPTY_FORM: Record<string, string> = {
  factory: '', forwarder: '', fob_no: '', s_c_number: '',
  factory_invoice: '', factory_invoice_date: '', customer_invoice: '', customer_invoice_date: '',
  quantity: '0', fob_value: '0', cmpt_value: '0', cost_value: '0', service_pct: '0',
  ex_factory_date: '', mode: 'sea', hbl: '', on_board_date: '', eta_date: '',
  container: '', bl_number: '', courier: '',
  factory_pay_terms: '', factory_amount: '0', factory_due_date: '', factory_paid_date: '',
  customer_pay_terms: '', customer_received_amount: '0', customer_due_date: '', customer_payment_date: '',
  remarks: '',
};

const FACTORY_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending', paid: 'Paid', overdue: 'Overdue',
};
const CUSTOMER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending', received: 'Received', overdue: 'Overdue',
};

export default function ExportRecapsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<ExportRecap[]>([]);
  const [factories, setFactories] = useState<Factory[]>([]);
  const [forwarders, setForwarders] = useState<FreightForwarder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Record<string, string>>(EMPTY_FORM);
  const [editing, setEditing] = useState<ExportRecap | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const res = await logisticsApi.getExportRecaps({ page_size: '10000' });
      setItems(res.data.results);
    } catch { toast('error', 'Failed to load export recaps'); }
  };

  useEffect(() => {
    Promise.all([
      logisticsApi.getExportRecaps({ page_size: '10000' }),
      setupApi.getFactories({ page_size: '500' }),
      logisticsApi.getFreightForwarders({ page_size: '500' }),
    ]).then(([res, f, ff]) => {
      setItems(res.data.results);
      setFactories(f.data.results);
      setForwarders(ff.data.results);
    }).catch(() => toast('error', 'Failed to load export recap data')).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        ...form,
        factory: form.factory || null,
        forwarder: form.forwarder || null,
        quantity: form.quantity || '0',
        fob_value: form.fob_value || '0',
        cmpt_value: form.cmpt_value || '0',
        cost_value: form.cost_value || '0',
        service_pct: form.service_pct || '0',
        factory_amount: form.factory_amount || '0',
        customer_received_amount: form.customer_received_amount || '0',
        factory_invoice_date: form.factory_invoice_date || null,
        customer_invoice_date: form.customer_invoice_date || null,
        ex_factory_date: form.ex_factory_date || null,
        on_board_date: form.on_board_date || null,
        eta_date: form.eta_date || null,
        factory_due_date: form.factory_due_date || null,
        factory_paid_date: form.factory_paid_date || null,
        customer_due_date: form.customer_due_date || null,
        customer_payment_date: form.customer_payment_date || null,
      };
      if (editing) {
        await logisticsApi.updateExportRecap(editing.id, payload);
        toast('success', 'Export recap updated');
      } else {
        await logisticsApi.createExportRecap(payload);
        toast('success', 'Export recap created');
      }
      setShowModal(false); setForm(EMPTY_FORM); setEditing(null); loadData();
    } catch { toast('error', 'Failed to save export recap');
    } finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await logisticsApi.deleteExportRecap(deleteId);
      toast('success', 'Export recap deleted');
      setDeleteId(null); loadData();
    } catch { toast('error', 'Failed to delete'); setDeleteId(null); }
  };

  const columns: SpreadsheetColumn[] = [
    { title: 'FOB No', field: 'fob_no', headerFilter: true },
    { title: 'S/C No', field: 's_c_number', headerFilter: true },
    { title: 'Factory', field: 'factory_name', headerFilter: true },
    { title: 'Quantity', field: 'quantity', hozAlign: 'right' },
    { title: 'FOB Value', field: 'fob_value', hozAlign: 'right', bottomCalc: 'sum' },
    { title: 'CMPT', field: 'cmpt_value', hozAlign: 'right', bottomCalc: 'sum' },
    { title: 'Cost', field: 'cost_value', hozAlign: 'right', bottomCalc: 'sum' },
    { title: 'Service %', field: 'service_pct', hozAlign: 'right' },
    { title: 'Ex-Factory', field: 'ex_factory_date' },
    { title: 'Mode', field: 'mode_label' },
    { title: 'Forwarder', field: 'forwarder_name', headerFilter: true },
    { title: 'HBL', field: 'hbl' },
    { title: 'On-Board', field: 'on_board_date' },
    { title: 'ETA', field: 'eta_date' },
    { title: 'Container', field: 'container' },
    { title: 'BL No', field: 'bl_number' },
    { title: 'Courier', field: 'courier' },
    { title: 'Fct Inv', field: 'factory_invoice' },
    { title: 'Pay Factory', field: 'factory_payment_status_label' },
    { title: 'Factory Due', field: 'factory_due_date', headerFilter: true },
    { title: 'Factory Paid', field: 'factory_paid_date' },
    { title: 'Pay Customer', field: 'customer_payment_status_label' },
    { title: 'Customer Due', field: 'customer_due_date', headerFilter: true },
    { title: 'Customer Received', field: 'customer_payment_date' },
  ];

  const money = (v: string) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const gridData = items.map((rec) => ({
    ...rec,
    quantity: Number(rec.quantity).toLocaleString(),
    fob_value: money(rec.fob_value),
    cmpt_value: money(rec.cmpt_value),
    cost_value: money(rec.cost_value),
    service_pct: `${Number(rec.service_pct).toFixed(1)}%`,
    factory_payment_status_label: FACTORY_STATUS_LABELS[rec.factory_payment_status] ?? rec.factory_payment_status,
    customer_payment_status_label: CUSTOMER_STATUS_LABELS[rec.customer_payment_status] ?? rec.customer_payment_status,
  }));

  const setField = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const openEdit = (rec: ExportRecap) => {
    setEditing(rec);
    setForm({
      factory: rec.factory || '', forwarder: rec.forwarder || '', fob_no: rec.fob_no,
      s_c_number: rec.s_c_number, factory_invoice: rec.factory_invoice,
      factory_invoice_date: rec.factory_invoice_date || '', customer_invoice: rec.customer_invoice,
      customer_invoice_date: rec.customer_invoice_date || '', quantity: rec.quantity,
      fob_value: rec.fob_value, cmpt_value: rec.cmpt_value, cost_value: rec.cost_value,
      service_pct: rec.service_pct, ex_factory_date: rec.ex_factory_date || '', mode: rec.mode,
      hbl: rec.hbl, on_board_date: rec.on_board_date || '', eta_date: rec.eta_date || '',
      container: rec.container, bl_number: rec.bl_number, courier: rec.courier,
      factory_pay_terms: rec.factory_pay_terms, factory_amount: rec.factory_amount,
      factory_due_date: rec.factory_due_date || '', factory_paid_date: rec.factory_paid_date || '',
      customer_pay_terms: rec.customer_pay_terms, customer_received_amount: rec.customer_received_amount,
      customer_due_date: rec.customer_due_date || '', customer_payment_date: rec.customer_payment_date || '',
      remarks: rec.remarks,
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
            <h1 className="text-2xl font-bold">Export Recaps</h1>
            <p className="text-muted text-sm mt-1">RQ-044 — per-hit landed economics: FOB/CMPT/cost + service %, logistics, and payment-to-factory & payment-from-customer pipelines.</p>
          </div>
          <button onClick={() => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); }} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">+ New Export Recap</button>
        </div>

        <div className="bg-surface rounded-xl border border-border p-5">
          <SpreadsheetGrid
            data={gridData as unknown as Record<string, unknown>[]}
            columns={columns}
            height={480}
            toolbar
            title="Export Recaps"
            exportable
            columnChooser
            paginationSize={10}
            actionColumn
            onAdd={() => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); }}
            onEdit={(row) => openEdit(row as unknown as ExportRecap)}
            onDelete={(row) => setDeleteId(String(row.id))}
            loading={loading}
          />
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl border border-border w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border"><h2 className="text-lg font-semibold">{editing ? 'Edit Export Recap' : 'New Export Recap'}</h2></div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Factory</label>
                  <SearchableSelect options={factories.map(f => ({ value: f.id, label: f.name }))}
                    value={form.factory || null} onChange={(v) => setField('factory', String(v || ''))} placeholder="Select factory..." />
                </div>
                <div>
                  <label className={labelCls}>Forwarder</label>
                  <SearchableSelect options={forwarders.map(ff => ({ value: ff.id, label: ff.name }))}
                    value={form.forwarder || null} onChange={(v) => setField('forwarder', String(v || ''))} placeholder="Select forwarder..." />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div><label className={labelCls}>FOB No</label><input value={form.fob_no} onChange={(e) => setField('fob_no', e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>S/C No</label><input value={form.s_c_number} onChange={(e) => setField('s_c_number', e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>Quantity</label><input type="number" step="0.01" value={form.quantity} onChange={(e) => setField('quantity', e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>Mode</label>
                  <select value={form.mode} onChange={(e) => setField('mode', e.target.value)} className={inputCls}><option value="sea">Sea</option><option value="air">Air</option></select>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div><label className={labelCls}>FOB Value</label><input type="number" step="0.01" value={form.fob_value} onChange={(e) => setField('fob_value', e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>CMPT</label><input type="number" step="0.01" value={form.cmpt_value} onChange={(e) => setField('cmpt_value', e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>Cost</label><input type="number" step="0.01" value={form.cost_value} onChange={(e) => setField('cost_value', e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>Service %</label><input type="number" step="0.001" value={form.service_pct} onChange={(e) => setField('service_pct', e.target.value)} className={inputCls} /></div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div><label className={labelCls}>Factory Invoice</label><input value={form.factory_invoice} onChange={(e) => setField('factory_invoice', e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>Factory Inv Date</label><input type="date" value={form.factory_invoice_date} onChange={(e) => setField('factory_invoice_date', e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>Customer Invoice</label><input value={form.customer_invoice} onChange={(e) => setField('customer_invoice', e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>Customer Inv Date</label><input type="date" value={form.customer_invoice_date} onChange={(e) => setField('customer_invoice_date', e.target.value)} className={inputCls} /></div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div><label className={labelCls}>Ex-Factory</label><input type="date" value={form.ex_factory_date} onChange={(e) => setField('ex_factory_date', e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>On-Board</label><input type="date" value={form.on_board_date} onChange={(e) => setField('on_board_date', e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>ETA</label><input type="date" value={form.eta_date} onChange={(e) => setField('eta_date', e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>HBL</label><input value={form.hbl} onChange={(e) => setField('hbl', e.target.value)} className={inputCls} /></div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div><label className={labelCls}>Container</label><input value={form.container} onChange={(e) => setField('container', e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>BL No</label><input value={form.bl_number} onChange={(e) => setField('bl_number', e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>Courier</label><input value={form.courier} onChange={(e) => setField('courier', e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>Remarks</label><input value={form.remarks} onChange={(e) => setField('remarks', e.target.value)} className={inputCls} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-heading">Payment to Factory</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>Terms</label><input value={form.factory_pay_terms} onChange={(e) => setField('factory_pay_terms', e.target.value)} className={inputCls} /></div>
                    <div><label className={labelCls}>Amount</label><input type="number" step="0.01" value={form.factory_amount} onChange={(e) => setField('factory_amount', e.target.value)} className={inputCls} /></div>
                    <div><label className={labelCls}>Due Date</label><input type="date" value={form.factory_due_date} onChange={(e) => setField('factory_due_date', e.target.value)} className={inputCls} /></div>
                    <div><label className={labelCls}>Paid Date</label><input type="date" value={form.factory_paid_date} onChange={(e) => setField('factory_paid_date', e.target.value)} className={inputCls} /></div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-heading">Payment from Customer</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>Terms</label><input value={form.customer_pay_terms} onChange={(e) => setField('customer_pay_terms', e.target.value)} className={inputCls} /></div>
                    <div><label className={labelCls}>Received Amount</label><input type="number" step="0.01" value={form.customer_received_amount} onChange={(e) => setField('customer_received_amount', e.target.value)} className={inputCls} /></div>
                    <div><label className={labelCls}>Due Date</label><input type="date" value={form.customer_due_date} onChange={(e) => setField('customer_due_date', e.target.value)} className={inputCls} /></div>
                    <div><label className={labelCls}>Payment Date</label><input type="date" value={form.customer_payment_date} onChange={(e) => setField('customer_payment_date', e.target.value)} className={inputCls} /></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">{saving ? 'Saving...' : editing ? 'Save Changes' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2">Delete Export Recap?</h2>
            <p className="text-muted text-sm mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-3"><button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-body hover:text-heading">Cancel</button><button onClick={confirmDelete} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg">Delete</button></div>
          </div>
        </div>
      )}
    </Layout>
  );
}