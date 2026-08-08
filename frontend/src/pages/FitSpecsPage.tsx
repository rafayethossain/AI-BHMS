import { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import SearchableSelect from '../components/SearchableSelect';
import { merchApi } from '../api/client';
import type { FitSpec, PurchaseOrder } from '../api/client';
import type { Column } from '../components/DataTable';
import { useToast } from '../contexts/ToastContext';

const STAGE_COLORS: Record<string, string> = {
  dev: 'bg-surface-alt/20 text-muted', '1st': 'bg-blue-500/20 text-badge-blue',
  '2nd': 'bg-purple-500/20 text-badge-purple', '3rd': 'bg-amber-500/20 text-badge-amber',
  pp: 'bg-emerald-500/20 text-badge-emerald',
};

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
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showCopy, setShowCopy] = useState(false);
  const [copyForm, setCopyForm] = useState({ source_order: '', target_order: '' });
  const pageSize = 10;

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(1); }, [search]);
  useEffect(() => {
    merchApi.getPOs({ page_size: '100' }).then(r => setPOs(r.data.results)).catch(() => {});
  }, []);

  const load = async () => {
    try {
      const res = await merchApi.getFitSpecs({ page_size: '200' });
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

  const handleSetCurrent = async (item: FitSpec) => {
    try { await merchApi.setCurrentFitSpec(item.id); toast('success', 'Marked as current'); load(); }
    catch { toast('error', 'Failed to set current'); }
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

  const filtered = useMemo(() => items.filter(i =>
    i.po_number.toLowerCase().includes(search.toLowerCase()) || i.notes.toLowerCase().includes(search.toLowerCase())
  ), [items, search]);
  const pagedData = useMemo(() => { const s = (page - 1) * pageSize; return filtered.slice(s, s + pageSize); }, [filtered, page]);

  const columns: Column[] = [
    { key: 'po_number', label: 'PO #', sortable: true, render: (v) => <span className="font-mono text-heading">{String(v)}</span> },
    { key: 'fit_stage', label: 'Stage', sortable: true, render: (_v, row) => {
      const s = row.fit_stage as string;
      return <span className={`px-2 py-1 rounded-full text-xs font-medium ${STAGE_COLORS[s] || 'bg-surface-alt text-muted'}`}>v{String(row.version)} · {STAGES.find(st => st.value === s)?.label || s}</span>;
    }},
    { key: 'is_current', label: 'Current', render: (v) => v ? <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-badge-emerald">Current</span> : <span className="text-faint text-sm">—</span> },
    { key: 'notes', label: 'Notes', render: (v) => <span className="text-muted">{v ? String(v) : '-'}</span> },
    { key: 'created_at', label: 'Created', render: (v) => <span className="text-muted">{v ? String(v).slice(0, 10) : '-'}</span> },
    { key: 'actions', label: 'Actions', className: 'text-right', render: (_v, row) => {
      const item = row as unknown as FitSpec;
      return (
        <>
          {!item.is_current && <button onClick={(e) => { e.stopPropagation(); handleSetCurrent(item); }} className="text-emerald-700 hover:text-emerald-500 mr-3 text-sm">Set Current</button>}
          <button onClick={(e) => { e.stopPropagation(); handleOpenModal(item); }} className="text-heading hover:text-emerald-500 mr-3 text-sm">Edit</button>
          <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="text-red-500 hover:text-red-400 text-sm">Delete</button>
        </>
      );
    }},
  ];

  if (loading) return <Layout><div className="p-6 flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" /></div></Layout>;

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
        <DataTable data={pagedData as unknown as Record<string, unknown>[]} columns={columns} totalCount={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search by PO or notes..." loading={loading} onRowClick={(row) => handleOpenModal(row as unknown as FitSpec)} />
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
