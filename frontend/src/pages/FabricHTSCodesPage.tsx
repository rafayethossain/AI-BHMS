import { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import { fabricApi } from '../api/client';
import type { HTSCode } from '../api/client';
import type { Column } from '../components/DataTable';
import { useToast } from '../contexts/ToastContext';

const INITIAL_FORM = { code: '', description: '', fabric_category: '', duty_rate: '' };

export default function FabricHTSCodesPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<HTSCode[]>([]);
  const [categories, setCategories] = useState<{ id: string; label: string }[]>([]);
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
      const [res, catRes] = await Promise.all([
        fabricApi.getHTSCodes({ page_size: '100' }),
        fabricApi.getCategories({ page_size: '100' }),
      ]);
      setItems(res.data.results);
      setCategories(catRes.data.results.map(c => ({ id: c.id, label: `${c.code} - ${c.name}` })));
    } catch { toast('error', 'Failed to load HTS codes');
    } finally { setLoading(false); }
  };

  const handleOpenModal = (item?: HTSCode) => {
    if (item) {
      setEditingId(item.id);
      setForm({ code: item.code, description: item.description, fabric_category: item.fabric_category || '', duty_rate: item.duty_rate || '' });
    } else { setEditingId(null); setForm(INITIAL_FORM); }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.code || !form.description) { toast('warning', 'Code and Description are required'); return; }
    setSaving(true);
    try {
      const data: Record<string, unknown> = { code: form.code, description: form.description, fabric_category: form.fabric_category || null, duty_rate: form.duty_rate || null };
      if (editingId) {
        await fabricApi.updateHTSCode(editingId, data);
        toast('success', 'HTS Code updated');
      } else {
        await fabricApi.createHTSCode(data);
        toast('success', 'HTS Code created');
      }
      setShowModal(false); load();
    } catch { toast('error', 'Failed to save. Code may already exist.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => { setDeleteId(id); };
  const confirmDelete = async () => {
    if (!deleteId) return;
    try { await fabricApi.deleteHTSCode(deleteId); toast('success', 'HTS Code deleted'); setDeleteId(null); load();
    } catch { toast('error', 'Failed to delete'); setDeleteId(null); }
  };

  const filtered = useMemo(() => items.filter(i => i.code.toLowerCase().includes(search.toLowerCase()) || i.description.toLowerCase().includes(search.toLowerCase())), [items, search]);
  const pagedData = useMemo(() => { const s = (page - 1) * pageSize; return filtered.slice(s, s + pageSize); }, [filtered, page]);

  const columns: Column[] = [
    { key: 'code', label: 'HTS Code', sortable: true, render: (v) => <span className="font-mono text-heading">{String(v)}</span> },
    { key: 'description', label: 'Description', sortable: true },
    { key: 'fabric_category_name', label: 'Category', render: (v) => <span className="text-muted">{v ? String(v) : '-'}</span> },
    { key: 'duty_rate', label: 'Duty Rate', render: (v) => v ? <span className="font-mono">{String(v)}</span> : '-' },
    { key: 'actions', label: 'Actions', className: 'text-right', render: (_v, row) => {
      const item = row as unknown as HTSCode;
      return <><button onClick={(e) => { e.stopPropagation(); handleOpenModal(item); }} className="text-heading hover:text-emerald-500 mr-3 text-sm">Edit</button><button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="text-red-500 hover:text-red-400 text-sm">Delete</button></>;
    }},
  ];

  if (loading) return <Layout><div className="p-6 flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" /></div></Layout>;

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">HTS Codes</h1>
          <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">+ Add HTS Code</button>
        </div>
        <DataTable data={pagedData as unknown as Record<string, unknown>[]} columns={columns} totalCount={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search by code or description..." loading={loading} onRowClick={(row) => handleOpenModal(row as unknown as HTSCode)} />
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border"><h2 className="text-lg font-semibold">{editingId ? 'Edit' : 'Add'} HTS Code</h2></div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm text-muted mb-1">HTS Code *</label><input type="text" value={form.code} onChange={(e) => setForm({...form, code: e.target.value})} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                <div><label className="block text-sm text-muted mb-1">Duty Rate</label><input type="text" value={form.duty_rate} onChange={(e) => setForm({...form, duty_rate: e.target.value})} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g. 12.5%" /></div>
              </div>
              <div><label className="block text-sm text-muted mb-1">Description *</label><textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows={2} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
              <div><label className="block text-sm text-muted mb-1">Fabric Category</label>
                <select value={form.fabric_category} onChange={(e) => setForm({...form, fabric_category: e.target.value})} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="">None</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
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
            <h2 className="text-lg font-bold mb-2">Delete HTS Code?</h2>
            <p className="text-muted text-sm mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-3"><button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-body hover:text-heading">Cancel</button><button onClick={confirmDelete} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg">Delete</button></div>
          </div>
        </div>
      )}
    </Layout>
  );
}
