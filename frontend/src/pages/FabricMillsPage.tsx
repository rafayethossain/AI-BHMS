import { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import { fabricApi } from '../api/client';
import type { FabricMill } from '../api/client';
import type { Column } from '../components/DataTable';
import { useToast } from '../contexts/ToastContext';

const INITIAL_FORM = { code: '', name: '', country: '', city: '', capacity_meters_month: '', rating: '', certification: '', is_active: true, notes: '' };

export default function FabricMillsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<FabricMill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const pageSize = 10;

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(1); }, [search]);

  const load = async () => {
    try {
      const res = await fabricApi.getMills({ page_size: '100' });
      setItems(res.data.results);
    } catch { toast('error', 'Failed to load fabric mills');
    } finally { setLoading(false); }
  };

  const handleOpenModal = (item?: FabricMill) => {
    if (item) {
      setEditingId(item.id);
      setForm({
        code: item.code, name: item.name, country: item.country || '', city: item.city || '',
        capacity_meters_month: item.capacity_meters_month?.toString() || '', rating: item.rating || '',
        certification: item.certification || '', is_active: item.is_active, notes: item.notes || '',
      });
    } else { setEditingId(null); setForm(INITIAL_FORM); }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.code || !form.name) { toast('warning', 'Code and Name are required'); return; }
    setSaving(true);
    try {
      const data: Record<string, unknown> = {
        code: form.code, name: form.name, country: form.country || null, city: form.city,
        capacity_meters_month: form.capacity_meters_month ? parseInt(form.capacity_meters_month) : null,
        rating: form.rating || null, certification: form.certification,
        is_active: form.is_active, notes: form.notes,
      };
      if (editingId) { await fabricApi.updateMill(editingId, data); toast('success', 'Mill updated'); }
      else { await fabricApi.createMill(data); toast('success', 'Mill created'); }
      setShowModal(false); load();
    } catch { toast('error', 'Failed to save. Code may already exist.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => { setDeleteId(id); };
  const confirmDelete = async () => {
    if (!deleteId) return;
    try { await fabricApi.deleteMill(deleteId); toast('success', 'Mill deleted'); setDeleteId(null); load();
    } catch { toast('error', 'Failed to delete'); setDeleteId(null); }
  };

  const filtered = useMemo(() => items.filter(i => i.code.toLowerCase().includes(search.toLowerCase()) || i.name.toLowerCase().includes(search.toLowerCase()) || i.city.toLowerCase().includes(search.toLowerCase())), [items, search]);
  const pagedData = useMemo(() => { const s = (page - 1) * pageSize; return filtered.slice(s, s + pageSize); }, [filtered, page]);

  const columns: Column[] = [
    { key: 'code', label: 'Code', sortable: true, render: (v) => <span className="font-mono text-heading">{String(v)}</span> },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'country_name', label: 'Country', render: (v) => <span className="text-muted">{v ? String(v) : '-'}</span> },
    { key: 'city', label: 'City', render: (v) => String(v || '-') },
    { key: 'capacity_meters_month', label: 'Capacity (m/mo)', render: (v) => v != null ? <span className="font-mono">{String(v)}</span> : '-' },
    { key: 'rating', label: 'Rating', render: (v) => v ? <span className="text-badge-emerald">{String(v)}</span> : '-' },
    { key: 'certification', label: 'Certification', render: (v) => <span className="text-muted">{v ? String(v) : '-'}</span> },
    { key: 'is_active', label: 'Status', render: (_v, row) => {
      const active = row.is_active as boolean;
      return <span className={`px-2 py-1 rounded-full text-xs font-medium ${active ? 'bg-emerald-500/20 text-badge-emerald' : 'bg-red-500/20 text-badge-red'}`}>{active ? 'Active' : 'Inactive'}</span>;
    }},
    { key: 'actions', label: 'Actions', className: 'text-right', render: (_v, row) => {
      const item = row as unknown as FabricMill;
      return <><button onClick={(e) => { e.stopPropagation(); handleOpenModal(item); }} className="text-heading hover:text-emerald-500 mr-3 text-sm">Edit</button><button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="text-red-500 hover:text-red-400 text-sm">Delete</button></>;
    }},
  ];

  if (loading) return <Layout><div className="p-6 flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" /></div></Layout>;

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Fabric Mills</h1>
          <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">+ Add Mill</button>
        </div>
        <DataTable data={pagedData as unknown as Record<string, unknown>[]} columns={columns} totalCount={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search by code, name, or city..." loading={loading} onRowClick={(row) => handleOpenModal(row as unknown as FabricMill)} />
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border"><h2 className="text-lg font-semibold">{editingId ? 'Edit' : 'Add'} Fabric Mill</h2></div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm text-muted mb-1">Code *</label><input type="text" value={form.code} onChange={(e) => setForm({...form, code: e.target.value})} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                <div><label className="block text-sm text-muted mb-1">Name *</label><input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm text-muted mb-1">Country</label><input type="text" value={form.country} onChange={(e) => setForm({...form, country: e.target.value})} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                <div><label className="block text-sm text-muted mb-1">City</label><input type="text" value={form.city} onChange={(e) => setForm({...form, city: e.target.value})} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm text-muted mb-1">Capacity (meters/month)</label><input type="number" value={form.capacity_meters_month} onChange={(e) => setForm({...form, capacity_meters_month: e.target.value})} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                <div><label className="block text-sm text-muted mb-1">Rating</label><input type="text" value={form.rating} onChange={(e) => setForm({...form, rating: e.target.value})} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g. 4.5" /></div>
              </div>
              <div><label className="block text-sm text-muted mb-1">Certification</label><input type="text" value={form.certification} onChange={(e) => setForm({...form, certification: e.target.value})} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g. OEKO-TEX, GOTS" /></div>
              <div className="flex items-center gap-2"><input type="checkbox" id="is_active_edit" checked={form.is_active} onChange={(e) => setForm({...form, is_active: e.target.checked})} className="w-4 h-4 rounded bg-input border-input-border text-emerald-500 focus:ring-emerald-500" /><label htmlFor="is_active_edit" className="text-sm text-muted">Active</label></div>
              <div><label className="block text-sm text-muted mb-1">Notes</label><textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} rows={2} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
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
            <h2 className="text-lg font-bold mb-2">Delete Mill?</h2>
            <p className="text-muted text-sm mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-3"><button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-body hover:text-heading">Cancel</button><button onClick={confirmDelete} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg">Delete</button></div>
          </div>
        </div>
      )}
    </Layout>
  );
}
