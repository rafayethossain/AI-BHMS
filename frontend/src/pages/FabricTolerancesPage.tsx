import { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import { fabricApi, CUSTOMER_TYPE_LABELS } from '../api/client';
import type { FabricTolerance, ToleranceResolution } from '../api/client';
import type { Column } from '../components/DataTable';
import { useToast } from '../contexts/ToastContext';

const INITIAL_FORM = { customer_type: 'primark', qty_from: '', qty_to: '', tolerance_pct: '', is_active: true };

export default function FabricTolerancesPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<FabricTolerance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [resolverType, setResolverType] = useState('primark');
  const [resolverQty, setResolverQty] = useState('');
  const [resolution, setResolution] = useState<ToleranceResolution | null>(null);
  const [resolving, setResolving] = useState(false);
  const pageSize = 10;

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(1); }, [search]);

  const load = async () => {
    try {
      const res = await fabricApi.getTolerances({ page_size: '100' });
      setItems(res.data.results);
    } catch { toast('error', 'Failed to load fabric tolerances');
    } finally { setLoading(false); }
  };

  const handleOpenModal = (item?: FabricTolerance) => {
    if (item) {
      setEditingId(item.id);
      setForm({ customer_type: item.customer_type, qty_from: item.qty_from, qty_to: item.qty_to || '', tolerance_pct: item.tolerance_pct, is_active: item.is_active });
    } else { setEditingId(null); setForm(INITIAL_FORM); }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.qty_from || !form.tolerance_pct) { toast('warning', 'From Qty and Tolerance % are required'); return; }
    setSaving(true);
    try {
      const data: Record<string, unknown> = { customer_type: form.customer_type, qty_from: form.qty_from, tolerance_pct: form.tolerance_pct, is_active: form.is_active };
      if (form.qty_to) data.qty_to = form.qty_to;
      else data.qty_to = null;
      if (editingId) {
        await fabricApi.updateTolerance(editingId, data);
        toast('success', 'Tolerance band updated');
      } else {
        await fabricApi.createTolerance(data);
        toast('success', 'Tolerance band created');
      }
      setShowModal(false); load();
    } catch { toast('error', 'Failed to save. Band may already exist.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => { setDeleteId(id); };
  const confirmDelete = async () => {
    if (!deleteId) return;
    try { await fabricApi.deleteTolerance(deleteId); toast('success', 'Tolerance band deleted'); setDeleteId(null); load();
    } catch { toast('error', 'Failed to delete'); setDeleteId(null); }
  };

  const handleResolve = async () => {
    if (!resolverQty) { toast('warning', 'Enter a quantity'); return; }
    setResolving(true);
    try {
      const res = await fabricApi.resolveTolerance(resolverType, resolverQty);
      setResolution(res.data);
    } catch { toast('error', 'Failed to resolve tolerance');
    } finally { setResolving(false); }
  };

  const filtered = useMemo(() => items.filter(i =>
    i.customer_type.toLowerCase().includes(search.toLowerCase()) ||
    i.customer_type_display.toLowerCase().includes(search.toLowerCase()) ||
    i.qty_from.includes(search) ||
    (i.qty_to || '').includes(search)
  ), [items, search]);
  const pagedData = useMemo(() => { const s = (page - 1) * pageSize; return filtered.slice(s, s + pageSize); }, [filtered, page]);

  const columns: Column[] = [
    { key: 'customer_type_display', label: 'Customer Type', sortable: true, render: (v) => <span className="font-medium text-heading">{String(v)}</span> },
    { key: 'qty_from', label: 'From (m)', sortable: true, render: (v) => <span className="font-mono text-body">{String(v)}</span> },
    { key: 'qty_to', label: 'To (m)', render: (v) => <span className="font-mono text-body">{v ? String(v) : 'Open ended'}</span> },
    { key: 'tolerance_pct', label: 'Tolerance %', render: (v) => <span className="font-mono text-emerald-600">±{String(v)}%</span> },
    { key: 'is_active', label: 'Status', render: (_v, row) => {
      const active = row.is_active as boolean;
      return <span className={`px-2 py-1 rounded-full text-xs font-medium ${active ? 'bg-emerald-500/20 text-badge-emerald' : 'bg-red-500/20 text-badge-red'}`}>{active ? 'Active' : 'Inactive'}</span>;
    }},
    { key: 'actions', label: 'Actions', className: 'text-right', render: (_v, row) => {
      const item = row as unknown as FabricTolerance;
      return <><button onClick={(e) => { e.stopPropagation(); handleOpenModal(item); }} className="text-heading hover:text-emerald-500 mr-3 text-sm">Edit</button><button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="text-red-500 hover:text-red-400 text-sm">Delete</button></>;
    }},
  ];

  if (loading) return <Layout><div className="p-6 flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" /></div></Layout>;

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Fabric Tolerances</h1>
            <p className="text-muted text-sm mt-1">GC-005 — customer-specific over/under-delivery tolerance bands (GC Manual, Fabric and Lining Tolerances).</p>
          </div>
          <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">+ Add Band</button>
        </div>

        <div className="bg-surface rounded-xl border border-border p-5">
          <h2 className="text-sm font-semibold text-heading mb-3">Tolerance Calculator</h2>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-sm text-muted mb-1">Customer Type</label>
              <select value={resolverType} onChange={(e) => setResolverType(e.target.value)} className="px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500">
                {Object.entries(CUSTOMER_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">Quantity (metres)</label>
              <input type="number" min="0" value={resolverQty} onChange={(e) => setResolverQty(e.target.value)} placeholder="e.g. 2000" className="px-3 py-2 bg-input border border-input-border rounded-lg text-heading font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <button onClick={handleResolve} disabled={resolving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">{resolving ? 'Checking...' : 'Check Tolerance'}</button>
          </div>
          {resolution && (
            <div className="mt-4 p-4 rounded-lg border border-border bg-input/40">
              {resolution.tolerance_pct !== null ? (
                <p className="text-sm text-body">
                  <span className="font-semibold text-heading">{CUSTOMER_TYPE_LABELS[resolution.customer_type] ?? resolution.customer_type}</span> order of{' '}
                  <span className="font-mono">{resolution.quantity}m</span> allows{' '}
                  <span className="font-mono text-emerald-600">±{resolution.tolerance_pct}%</span> ={' '}
                  <span className="font-mono text-emerald-600">±{resolution.tolerance_meters}m</span>
                  {resolution.qty_from && resolution.qty_to ? ` (band {resolution.qty_from}–{resolution.qty_to}m)` : resolution.qty_from ? ` (band from ${resolution.qty_from}m+)` : ''}
                </p>
              ) : (
                <p className="text-sm text-amber-600">No tolerance band configured for {CUSTOMER_TYPE_LABELS[resolution.customer_type] ?? resolution.customer_type} at {resolution.quantity}m.</p>
              )}
            </div>
          )}
        </div>

        <DataTable data={pagedData as unknown as Record<string, unknown>[]} columns={columns} totalCount={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search by customer type or quantity..." loading={loading} onRowClick={(row) => handleOpenModal(row as unknown as FabricTolerance)} />
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border"><h2 className="text-lg font-semibold">{editingId ? 'Edit' : 'Add'} Tolerance Band</h2></div>
            <div className="p-6 space-y-4">
              <div><label className="block text-sm text-muted mb-1">Customer Type *</label>
                <select value={form.customer_type} onChange={(e) => setForm({...form, customer_type: e.target.value})} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  {Object.entries(CUSTOMER_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm text-muted mb-1">From Qty (m) *</label><input type="number" min="0" step="0.01" value={form.qty_from} onChange={(e) => setForm({...form, qty_from: e.target.value})} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                <div><label className="block text-sm text-muted mb-1">To Qty (m)</label><input type="number" min="0" step="0.01" value={form.qty_to} onChange={(e) => setForm({...form, qty_to: e.target.value})} placeholder="Blank = open ended" className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
              </div>
              <div><label className="block text-sm text-muted mb-1">Tolerance % *</label><input type="number" min="0" max="100" step="0.01" value={form.tolerance_pct} onChange={(e) => setForm({...form, tolerance_pct: e.target.value})} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
              <div className="flex items-center gap-2"><input type="checkbox" id="is_active" checked={form.is_active} onChange={(e) => setForm({...form, is_active: e.target.checked})} className="w-4 h-4 rounded bg-input border-input-border text-emerald-500 focus:ring-emerald-500" /><label htmlFor="is_active" className="text-sm text-muted">Active</label></div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">{saving ? 'Saving...' : editingId ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2">Delete Tolerance Band?</h2>
            <p className="text-muted text-sm mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-3"><button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-body hover:text-heading">Cancel</button><button onClick={confirmDelete} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg">Delete</button></div>
          </div>
        </div>
      )}
    </Layout>
  );
}
