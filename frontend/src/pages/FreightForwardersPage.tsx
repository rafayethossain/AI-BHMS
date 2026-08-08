import { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import { logisticsApi } from '../api/client';
import type { FreightForwarder } from '../api/client';
import type { Column } from '../components/DataTable';
import { useToast } from '../contexts/ToastContext';

const INITIAL_FORM = {
  name: '',
  code: '',
  contact_person: '',
  email: '',
  phone: '',
  address: '',
  country: '',
  notes: '',
  is_active: true,
};

export default function FreightForwardersPage() {
  const { toast } = useToast();
  const [forwarders, setForwarders] = useState<FreightForwarder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const pageSize = 10;

  useEffect(() => { loadForwarders(); }, []);
  useEffect(() => { setPage(1); }, [search]);

  const loadForwarders = async () => {
    try {
      const res = await logisticsApi.getFreightForwarders({ page_size: '100' });
      setForwarders(res.data.results);
    } catch {
      toast('error', 'Failed to load freight forwarders');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (forwarder?: FreightForwarder) => {
    if (forwarder) {
      setEditingId(forwarder.id);
      setForm({
        name: forwarder.name,
        code: forwarder.code,
        contact_person: forwarder.contact_person || '',
        email: forwarder.email || '',
        phone: forwarder.phone || '',
        address: forwarder.address || '',
        country: forwarder.country || '',
        notes: forwarder.notes || '',
        is_active: forwarder.is_active,
      });
    } else {
      setEditingId(null);
      setForm(INITIAL_FORM);
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.code) {
      toast('warning', 'Name and Code are required');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await logisticsApi.updateFreightForwarder(editingId, form);
        toast('success', 'Freight forwarder updated');
      } else {
        await logisticsApi.createFreightForwarder(form);
        toast('success', 'Freight forwarder created');
      }
      setShowModal(false);
      loadForwarders();
    } catch {
      toast('error', 'Failed to save. Code may already exist.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await logisticsApi.deleteFreightForwarder(deleteId);
      toast('success', 'Freight forwarder deleted');
      setDeleteId(null);
      loadForwarders();
    } catch {
      toast('error', 'Failed to delete freight forwarder');
      setDeleteId(null);
    }
  };

  const filtered = useMemo(() =>
    forwarders.filter(f =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.code.toLowerCase().includes(search.toLowerCase())
    ),
    [forwarders, search]
  );

  const pagedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  const columns: Column[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'code', label: 'Code', sortable: true, render: (v) => <span className="font-mono text-heading">{String(v)}</span> },
    { key: 'contact_person', label: 'Contact', render: (v) => String(v ?? '-') },
    { key: 'email', label: 'Email', render: (v) => String(v ?? '-') },
    { key: 'phone', label: 'Phone', render: (v) => String(v ?? '-') },
    { key: 'country', label: 'Country', render: (v) => String(v ?? '-') },
    {
      key: 'is_active',
      label: 'Status',
      render: (_v, row) => {
        const active = row.is_active as boolean;
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${active ? 'bg-emerald-500/20 text-badge-emerald' : 'bg-red-500/20 text-badge-red'}`}>
            {active ? 'Active' : 'Inactive'}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'text-right',
      render: (_v, row) => {
        const forwarder = row as unknown as FreightForwarder;
        return (
          <>
            <button onClick={(e) => { e.stopPropagation(); handleOpenModal(forwarder); }}
              className="text-heading hover:text-emerald-500 mr-3 text-sm">
              Edit
            </button>
            <button onClick={(e) => { e.stopPropagation(); handleDelete(forwarder.id); }}
              className="text-red-500 hover:text-red-400 text-sm">
              Delete
            </button>
          </>
        );
      },
    },
  ];

  if (loading) {
    return (
      <Layout>
        <div className="p-6 flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Freight Forwarders</h1>
          <button onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
            + Add Forwarder
          </button>
        </div>

        <DataTable
          data={pagedData as unknown as Record<string, unknown>[]}
          columns={columns}
          totalCount={filtered.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by name or code..."
          loading={loading}
          onRowClick={(row) => handleOpenModal(row as unknown as FreightForwarder)}
        />
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-semibold">{editingId ? 'Edit' : 'Add'} Freight Forwarder</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted mb-1">Name *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Code *</label>
                  <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted mb-1">Contact Person</label>
                  <input type="text" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted mb-1">Phone</label>
                  <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Country</label>
                  <input type="text" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Address</label>
                <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_active" checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 rounded bg-input border-input-border text-emerald-500 focus:ring-emerald-500" />
                <label htmlFor="is_active" className="text-sm text-muted">Active</label>
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2">Delete Freight Forwarder?</h2>
            <p className="text-muted text-sm mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-body hover:text-heading">Cancel</button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg">Delete</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
