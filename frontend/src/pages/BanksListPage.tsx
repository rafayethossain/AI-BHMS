import { useState, useEffect, type FormEvent } from 'react';
import { commercialApi } from '../api/client';
import type { Bank } from '../api/client';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { useToast } from '../contexts/ToastContext';
import SearchableSelect from '../components/SearchableSelect';
import Layout from '../components/Layout';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/20 text-badge-emerald',
  inactive: 'bg-surface-alt/20 text-muted',
};

export default function BanksListPage() {
  const { toast } = useToast();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showModal, setShowModal] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [form, setForm] = useState({ code: '', name: '', swift_code: '', address: '', contact_person: '', phone: '', email: '', status: 'active' });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), page_size: '25' };
      if (search) params.search = search;
      params.ordering = sortOrder === 'desc' ? `-${sortField}` : sortField;
      const res = await commercialApi.getBanks(params);
      setBanks(res.data.results);
      setCount(res.data.count);
    } catch { toast('error', 'Failed to load banks'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [search, page, sortField, sortOrder]);

  const openCreate = () => {
    setEditingBank(null);
    setForm({ code: '', name: '', swift_code: '', address: '', contact_person: '', phone: '', email: '', status: 'active' });
    setShowModal(true);
  };

  const openEdit = (bank: Bank) => {
    setEditingBank(bank);
    setForm({ code: bank.code, name: bank.name, swift_code: bank.swift_code, address: bank.address, contact_person: bank.contact_person, phone: bank.phone, email: bank.email, status: bank.status });
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingBank) {
        await commercialApi.updateBank(editingBank.id, form as unknown as Record<string, unknown>);
        toast('success', 'Bank updated');
      } else {
        await commercialApi.createBank(form as unknown as Record<string, unknown>);
        toast('success', 'Bank created');
      }
      setShowModal(false);
      fetchData();
    } catch { toast('error', editingBank ? 'Failed to update bank' : 'Failed to create bank'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await commercialApi.deleteBank(id); setDeleteId(null); toast('success', 'Bank deleted'); fetchData(); } catch { toast('error', 'Failed to delete bank'); }
  };

  const handleSort = (field: string, order: 'asc' | 'desc') => { setSortField(field); setSortOrder(order); };

  const columns: Column[] = [
    { key: 'code', label: 'Code', sortable: true, render: (v) => <span className="font-mono text-emerald-700">{String(v)}</span> },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'swift_code', label: 'SWIFT Code', sortable: true, render: (v) => <span className="font-mono text-body">{String(v)}</span> },
    { key: 'contact_person', label: 'Contact', sortable: true },
    { key: 'phone', label: 'Phone', sortable: false },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'status', label: 'Status', sortable: true,
      render: (v) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[String(v)] || ''}`}>{String(v)}</span> },
    { key: 'id', label: 'Actions', className: 'text-right', render: (_v, row) => (
      <div className="flex justify-end gap-3">
        <button onClick={(e) => { e.stopPropagation(); openEdit(row as unknown as Bank); }} className="text-sm text-blue-700 hover:text-blue-600">Edit</button>
        <button onClick={(e) => { e.stopPropagation(); setDeleteId(String(row.id)); }} className="text-sm text-red-700 hover:text-red-600">Delete</button>
      </div>
    )},
  ];

  return (
    <Layout>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Banks</h1>
            <p className="text-muted text-sm mt-1">{count} total banks</p>
          </div>
          <button onClick={openCreate} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
            + New Bank
          </button>
        </div>

        <DataTable
          data={banks as unknown as Record<string, unknown>[]}
          columns={columns}
          totalCount={count}
          page={page}
          pageSize={25}
          onPageChange={setPage}
          searchValue={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          searchPlaceholder="Search banks..."
          onSort={handleSort}
          sortField={sortField}
          sortOrder={sortOrder}
          loading={loading}
        />
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">{editingBank ? 'Edit Bank' : 'New Bank'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-body mb-1">Code *</label>
                  <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Bank code" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">SWIFT Code</label>
                  <input value={form.swift_code} onChange={(e) => setForm({ ...form, swift_code: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="SWIFT" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Name *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Bank name" />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Address</label>
                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Address" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-body mb-1">Contact Person</label>
                  <input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Phone</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Status</label>
                <SearchableSelect
                  options={[{value:'active', label:'Active'}, {value:'inactive', label:'Inactive'}]}
                  value={String(form.status)}
                  onChange={(v) => setForm({ ...form, status: String(v || 'active') })}
                />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white text-sm rounded-lg transition-colors">
                  {saving ? 'Saving...' : editingBank ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2">Delete Bank?</h2>
            <p className="text-muted text-sm mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-body hover:text-heading">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg">Delete</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
