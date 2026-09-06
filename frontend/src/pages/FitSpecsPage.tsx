import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import SpreadsheetGrid from '../components/SpreadsheetGrid';
import type { SpreadsheetColumn } from '../components/SpreadsheetGrid';
import SearchableSelect from '../components/SearchableSelect';
import { merchApi } from '../api/client';
import type { FitSpec, PurchaseOrder } from '../api/client';
import { useToast } from '../contexts/ToastContext';

const STAGES = [
  { value: 'dev', label: 'Dev Spec' },
  { value: '1st', label: '1st Fit' },
  { value: '2nd', label: '2nd Fit' },
  { value: '3rd', label: '3rd Fit' },
  { value: 'pp', label: 'Pre-Production' },
];

const INITIAL_FORM = { purchase_order: '', fit_stage: 'dev', measurements: '', notes: '' };

export default function FitSpecsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<FitSpec[]>([]);
  const [pos, setPOs] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showCopy, setShowCopy] = useState(false);
  const [copyForm, setCopyForm] = useState({ source_order: '', target_order: '' });

  useEffect(() => { load(); }, []);
  useEffect(() => {
    merchApi.getPOs({ page_size: '100' }).then(r => setPOs(r.data.results)).catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await merchApi.getFitSpecs({ page_size: '10000' });
      setItems(res.data.results);
    } catch { toast('error', 'Failed to load fit specs');
    } finally { setLoading(false); }
  };

  const handleOpenModal = (item?: FitSpec) => {
    if (item) {
      setEditingId(item.id);
      setForm({
        purchase_order: item.purchase_order, fit_stage: item.fit_stage,
        measurements: Object.keys(item.measurements).length ? JSON.stringify(item.measurements, null, 2) : '',
        notes: item.notes,
      });
    } else { setEditingId(null); setForm({ ...INITIAL_FORM }); }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.purchase_order) { toast('warning', 'Purchase order is required'); return; }
    setSaving(true);
    try {
      const measurements = form.measurements.trim() ? JSON.parse(form.measurements) : {};
      const data: Record<string, unknown> = {
        purchase_order: form.purchase_order, fit_stage: form.fit_stage,
        measurements, notes: form.notes,
      };
      if (editingId) { await merchApi.updateFitSpec(editingId, data); toast('success', 'Fit spec updated'); }
      else { await merchApi.createFitSpec(data); toast('success', 'Fit spec created'); }
      setShowModal(false); load();
    } catch (e) {
      if (e instanceof SyntaxError) toast('error', 'Measurements must be valid JSON');
      else toast('error', 'Failed to save fit spec');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => { setDeleteId(id); };
  const confirmDelete = async () => {
    if (!deleteId) return;
    try { await merchApi.deleteFitSpec(deleteId); toast('success', 'Fit spec deleted'); setDeleteId(null); load(); }
    catch { toast('error', 'Failed to delete'); setDeleteId(null); }
  };

  const handleCopyFromOrder = async () => {
    if (!copyForm.source_order || !copyForm.target_order) { toast('warning', 'Select both source and target orders'); return; }
    if (copyForm.source_order === copyForm.target_order) { toast('warning', 'Source and target must differ'); return; }
    setSaving(true);
    try {
      await merchApi.copyFitSpecFromOrder(copyForm);
      toast('success', 'Fit spec copied');
      setShowCopy(false); setCopyForm({ source_order: '', target_order: '' }); load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast('error', err.response?.data?.error || 'Failed to copy fit spec');
    } finally { setSaving(false); }
  };

  const poOptions = pos.map(p => ({ value: p.id, label: `${p.po_number}`, description: p.buyer_name }));

  const columns: SpreadsheetColumn[] = [
    { title: 'PO #', field: 'po_number', headerFilter: true },
    { title: 'Stage', field: 'fit_stage_label', headerFilter: true },
    { title: 'Current', field: 'is_current' },
    { title: 'Notes', field: 'notes' },
    { title: 'Created', field: 'created_at' },
  ];

  const gridData = items.map((item) => ({
    ...item,
    fit_stage_label: `v${item.version} · ${STAGES.find(st => st.value === item.fit_stage)?.label || item.fit_stage}`,
    is_current: item.is_current ? 'Current' : '—',
    created_at: item.created_at ? String(item.created_at).slice(0, 10) : '—',
  }));

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Fit Specs</h1>
            <p className="text-sm text-muted mt-1">Versioned fit specifications per purchase order (GC-011 / GC-012)</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowCopy(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">Copy From Order</button>
            <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">+ New Fit Spec</button>
          </div>
        </div>

        <SpreadsheetGrid
          data={gridData as unknown as Record<string, unknown>[]}
          columns={columns}
          height={480}
          toolbar
          title="Fit Specs"
          exportable
          columnChooser
          paginationSize={10}
          actionColumn
          onAdd={() => handleOpenModal()}
          onEdit={(row) => handleOpenModal(row as unknown as FitSpec)}
          onDelete={(row) => handleDelete(String(row.id))}
          onRowClick={(row) => handleOpenModal(row as unknown as FitSpec)}
          loading={loading}
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border"><h2 className="text-lg font-semibold">{editingId ? 'Edit' : 'New'} Fit Spec</h2></div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-muted mb-1">Purchase Order *</label>
                <SearchableSelect options={poOptions} value={form.purchase_order || null} onChange={(v) => setForm({ ...form, purchase_order: String(v || '') })} placeholder="Select a PO..." disabled={!!editingId} />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Fit Stage</label>
                <select value={form.fit_stage} onChange={(e) => setForm({ ...form, fit_stage: e.target.value })} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Measurements (JSON)</label>
                <textarea value={form.measurements} onChange={(e) => setForm({ ...form, measurements: e.target.value })} rows={6} placeholder='{"chest": 52, "waist": 44}' className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">{saving ? 'Saving...' : editingId ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {showCopy && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-lg">
            <h2 className="text-lg font-bold mb-1">Copy Fit Spec From Order</h2>
            <p className="text-sm text-muted mb-4">Copy the current fit spec from a source order to a target order.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-body mb-1">Source Order *</label>
                <SearchableSelect options={poOptions} value={copyForm.source_order || null} onChange={(v) => setCopyForm({ ...copyForm, source_order: String(v || '') })} placeholder="Copy from..." />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Target Order *</label>
                <SearchableSelect options={poOptions} value={copyForm.target_order || null} onChange={(v) => setCopyForm({ ...copyForm, target_order: String(v || '') })} placeholder="Copy to..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => { setShowCopy(false); setCopyForm({ source_order: '', target_order: '' }); }} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
              <button onClick={handleCopyFromOrder} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-sm rounded-lg transition-colors">{saving ? 'Copying...' : 'Copy'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2">Delete Fit Spec?</h2>
            <p className="text-muted text-sm mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-3"><button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-body hover:text-heading">Cancel</button><button onClick={confirmDelete} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg">Delete</button></div>
          </div>
        </div>
      )}
    </Layout>
  );
}
