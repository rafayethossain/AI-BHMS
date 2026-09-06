import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import SpreadsheetGrid from '../components/SpreadsheetGrid';
import type { SpreadsheetColumn } from '../components/SpreadsheetGrid';
import { logisticsApi, setupApi } from '../api/client';
import type { ImportRecap, Vendor, Factory } from '../api/client';
import SearchableSelect from '../components/SearchableSelect';
import { useToast } from '../contexts/ToastContext';

const EMPTY_FORM: Record<string, string> = {
  supplier: '', factory: '', s_c_number: '', invoice_value: '0', item_category: 'fabric',
  quantity: '0', rolls_bales: '', container: '', bl_hawb: '', mode: 'sea', lc_foc: 'lc',
  vessel: '', pcd_date: '', etd_date: '', eta_date: '', atb_date: '',
  unstuffed_date: '', in_house_date: '', agent: '', docs_received: 'false',
  status: 'planned', remarks: '',
};

export default function ImportRecapsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<ImportRecap[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [factories, setFactories] = useState<Factory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Record<string, string>>(EMPTY_FORM);
  const [editing, setEditing] = useState<ImportRecap | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const res = await logisticsApi.getImportRecaps({ page_size: '10000' });
      setItems(res.data.results);
    } catch { toast('error', 'Failed to load import recaps'); }
  };

  useEffect(() => {
    Promise.all([
      logisticsApi.getImportRecaps({ page_size: '10000' }),
      setupApi.getVendors({ page_size: '500' }),
      setupApi.getFactories({ page_size: '500' }),
    ]).then(([res, v, f]) => {
      setItems(res.data.results);
      setVendors(v.data.results);
      setFactories(f.data.results);
    }).catch(() => toast('error', 'Failed to load import recap data')).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        ...form,
        supplier: form.supplier || null,
        factory: form.factory || null,
        invoice_value: form.invoice_value || '0',
        quantity: form.quantity || '0',
        rolls_bales: form.rolls_bales ? parseInt(form.rolls_bales, 10) : null,
        docs_received: form.docs_received === 'true',
        pcd_date: form.pcd_date || null,
        etd_date: form.etd_date || null,
        eta_date: form.eta_date || null,
        atb_date: form.atb_date || null,
        unstuffed_date: form.unstuffed_date || null,
        in_house_date: form.in_house_date || null,
      };
      if (editing) {
        await logisticsApi.updateImportRecap(editing.id, payload);
        toast('success', 'Import recap updated');
      } else {
        await logisticsApi.createImportRecap(payload);
        toast('success', 'Import recap created');
      }
      setShowModal(false); setForm(EMPTY_FORM); setEditing(null); loadData();
    } catch { toast('error', 'Failed to save import recap');
    } finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await logisticsApi.deleteImportRecap(deleteId);
      toast('success', 'Import recap deleted');
      setDeleteId(null); loadData();
    } catch { toast('error', 'Failed to delete'); setDeleteId(null); }
  };

  const columns: SpreadsheetColumn[] = [
    { title: 'Supplier', field: 'supplier_name', headerFilter: true },
    { title: 'Factory', field: 'factory_name', headerFilter: true },
    { title: 'S/C No', field: 's_c_number', headerFilter: true },
    { title: 'Inv Value', field: 'invoice_value', hozAlign: 'right' },
    { title: 'Category', field: 'item_category_label' },
    { title: 'Qty', field: 'quantity', hozAlign: 'right' },
    { title: 'Rolls/Bales', field: 'rolls_bales', hozAlign: 'right' },
    { title: 'Container', field: 'container' },
    { title: 'B/L-HAWB', field: 'bl_hawb' },
    { title: 'Mode', field: 'mode_label' },
    { title: 'LC/FOC', field: 'lc_foc_label' },
    { title: 'Vessel', field: 'vessel' },
    { title: 'PCD', field: 'pcd_date' },
    { title: 'ETD', field: 'etd_date' },
    { title: 'ETA', field: 'eta_date' },
    { title: 'ATB', field: 'atb_date' },
    { title: 'Unstuffed', field: 'unstuffed_date' },
    { title: 'In-house', field: 'in_house_date' },
    { title: 'Agent', field: 'agent' },
    { title: 'Docs', field: 'docs_label' },
    { title: 'Status', field: 'status_label', headerFilter: true },
  ];

  const gridData = items.map((rec) => ({
    ...rec,
    invoice_value: Number(rec.invoice_value).toLocaleString(),
    quantity: Number(rec.quantity).toLocaleString(),
    docs_label: rec.docs_received ? 'Yes' : 'No',
  }));

  const setField = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const openEdit = (rec: ImportRecap) => {
    setEditing(rec);
    setForm({
      supplier: rec.supplier || '', factory: rec.factory || '', s_c_number: rec.s_c_number,
      invoice_value: rec.invoice_value, item_category: rec.item_category, quantity: rec.quantity,
      rolls_bales: rec.rolls_bales ? String(rec.rolls_bales) : '', container: rec.container,
      bl_hawb: rec.bl_hawb, mode: rec.mode, lc_foc: rec.lc_foc, vessel: rec.vessel,
      pcd_date: rec.pcd_date || '', etd_date: rec.etd_date || '', eta_date: rec.eta_date || '',
      atb_date: rec.atb_date || '', unstuffed_date: rec.unstuffed_date || '',
      in_house_date: rec.in_house_date || '', agent: rec.agent,
      docs_received: rec.docs_received ? 'true' : 'false', status: rec.status, remarks: rec.remarks,
    });
    setShowModal(true);
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Import Recaps</h1>
            <p className="text-muted text-sm mt-1">RQ-043 — fabric/trims inbound tracking: supplier, vessel, container, LC/FOC and the PCD/ETD/ETA/ATB/Unstuffed/In-house milestone chain.</p>
          </div>
          <button onClick={() => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); }} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">+ New Import Recap</button>
        </div>

        <div className="bg-surface rounded-xl border border-border p-5">
          <SpreadsheetGrid
            data={gridData as unknown as Record<string, unknown>[]}
            columns={columns}
            height={480}
            toolbar
            title="Import Recaps"
            exportable
            columnChooser
            paginationSize={10}
            actionColumn
            onAdd={() => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); }}
            onEdit={(row) => openEdit(row as unknown as ImportRecap)}
            onDelete={(row) => setDeleteId(String(row.id))}
            loading={loading}
          />
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl border border-border w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border"><h2 className="text-lg font-semibold">{editing ? 'Edit Import Recap' : 'New Import Recap'}</h2></div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted mb-1">Supplier</label>
                  <SearchableSelect options={vendors.map(v => ({ value: v.id, label: v.name }))}
                    value={form.supplier || null} onChange={(v) => setField('supplier', String(v || ''))} placeholder="Select supplier..." />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Factory</label>
                  <SearchableSelect options={factories.map(f => ({ value: f.id, label: f.name }))}
                    value={form.factory || null} onChange={(v) => setField('factory', String(v || ''))} placeholder="Select factory..." />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-sm text-muted mb-1">S/C No</label><input value={form.s_c_number} onChange={(e) => setField('s_c_number', e.target.value)} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                <div><label className="block text-sm text-muted mb-1">Invoice Value</label><input type="number" step="0.01" value={form.invoice_value} onChange={(e) => setField('invoice_value', e.target.value)} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                <div><label className="block text-sm text-muted mb-1">Item Category</label>
                  <select value={form.item_category} onChange={(e) => setField('item_category', e.target.value)} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="fabric">Fabric</option><option value="trims">Trims</option><option value="labels">Labels</option>
                    <option value="accessories">Accessories</option><option value="packaging">Packaging</option><option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-sm text-muted mb-1">Quantity</label><input type="number" step="0.01" value={form.quantity} onChange={(e) => setField('quantity', e.target.value)} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                <div><label className="block text-sm text-muted mb-1">Rolls/Bales</label><input type="number" value={form.rolls_bales} onChange={(e) => setField('rolls_bales', e.target.value)} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                <div><label className="block text-sm text-muted mb-1">Container</label><input value={form.container} onChange={(e) => setField('container', e.target.value)} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-sm text-muted mb-1">B/L-HAWB</label><input value={form.bl_hawb} onChange={(e) => setField('bl_hawb', e.target.value)} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                <div><label className="block text-sm text-muted mb-1">Mode</label>
                  <select value={form.mode} onChange={(e) => setField('mode', e.target.value)} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500"><option value="sea">Sea</option><option value="air">Air</option></select>
                </div>
                <div><label className="block text-sm text-muted mb-1">LC/FOC</label>
                  <select value={form.lc_foc} onChange={(e) => setField('lc_foc', e.target.value)} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500"><option value="lc">LC</option><option value="foc">FOC</option></select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Vessel</label>
                <input value={form.vessel} onChange={(e) => setField('vessel', e.target.value)} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                {(['pcd_date', 'etd_date', 'eta_date'] as const).map((key) => (
                  <div key={key}><label className="block text-sm text-muted mb-1 uppercase">{key.replace('_date', '')}</label><input type="date" value={form[key]} onChange={(e) => setField(key, e.target.value)} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-4">
                {(['atb_date', 'unstuffed_date', 'in_house_date'] as const).map((key) => (
                  <div key={key}><label className="block text-sm text-muted mb-1 uppercase">{key.replace(/_?date$/, '').replace('_', ' ')}</label><input type="date" value={form[key]} onChange={(e) => setField(key, e.target.value)} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm text-muted mb-1">Clearing Agent</label><input value={form.agent} onChange={(e) => setField('agent', e.target.value)} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                <div><label className="block text-sm text-muted mb-1">Status</label>
                  <select value={form.status} onChange={(e) => setField('status', e.target.value)} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="planned">Planned</option><option value="in_transit">In Transit</option><option value="arrived">Arrived</option>
                    <option value="unstuffed">Unstuffed</option><option value="in_house">In House</option><option value="closed">Closed</option><option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-heading cursor-pointer">
                  <input type="checkbox" checked={form.docs_received === 'true'} onChange={(e) => setField('docs_received', e.target.checked ? 'true' : 'false')} className="h-4 w-4 rounded border-border text-emerald-600 focus:ring-emerald-500" />
                  Documents received
                </label>
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Remarks</label>
                <textarea value={form.remarks} onChange={(e) => setField('remarks', e.target.value)} rows={2} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" />
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
            <h2 className="text-lg font-bold mb-2">Delete Import Recap?</h2>
            <p className="text-muted text-sm mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-3"><button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-body hover:text-heading">Cancel</button><button onClick={confirmDelete} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg">Delete</button></div>
          </div>
        </div>
      )}
    </Layout>
  );
}