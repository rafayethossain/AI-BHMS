import { useState, useEffect, type FormEvent } from 'react';
import { qualityApi, logisticsApi } from '../api/client';
import type { GoldSeal } from '../api/client';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import SearchableSelect from '../components/SearchableSelect';
import { useToast } from '../contexts/ToastContext';
import Layout from '../components/Layout';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-surface-alt/20 text-muted',
  sent: 'bg-blue-500/20 text-badge-blue',
  approved: 'bg-emerald-500/20 text-badge-emerald',
  rejected: 'bg-red-500/20 text-badge-red',
};

const STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'sent', label: 'Sent' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

export default function GoldSealsPage() {
  const { toast } = useToast();
  const [seals, setSeals] = useState<GoldSeal[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [shipments, setShipments] = useState<{ value: string; label: string }[]>([]);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    shipment: '',
    status: 'pending',
    sent_date: '',
    approval_date: '',
    notes: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), page_size: '25' };
      if (search) params.search = search;
      params.ordering = sortOrder === 'desc' ? `-${sortField}` : sortField;
      if (filters.status) params.status = filters.status;
      const res = await qualityApi.getGoldSeals(params);
      setSeals(res.data.results);
      setCount(res.data.count);
    } catch {
      toast('error', 'Failed to load gold seals');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [search, page, sortField, sortOrder, filters]);

  useEffect(() => {
    logisticsApi.getShipments({ page_size: '100' }).then(r => {
      setShipments(r.data.results.map(s => ({ value: s.id, label: `${s.shipment_number} (${s.po_number})` })));
    }).catch(() => {});
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ shipment: '', status: 'pending', sent_date: '', approval_date: '', notes: '' });
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        shipment: form.shipment,
        status: form.status,
      };
      if (form.sent_date) payload.sent_date = form.sent_date;
      if (form.approval_date) payload.approval_date = form.approval_date;
      if (form.notes) payload.notes = form.notes;
      if (editingId) {
        await qualityApi.updateGoldSeal(editingId, payload);
        toast('success', 'Gold seal updated');
      } else {
        await qualityApi.createGoldSeal(payload);
        toast('success', 'Gold seal created');
      }
      setShowModal(false);
      setEditingId(null);
      fetchData();
    } catch { toast('error', editingId ? 'Failed to update gold seal' : 'Failed to create gold seal'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await qualityApi.deleteGoldSeal(id); setDeleteId(null); toast('success', 'Gold seal deleted'); fetchData(); } catch { toast('error', 'Failed to delete gold seal'); }
  };

  const handleTransition = async (id: string, action: 'send' | 'approve' | 'reject') => {
    try {
      if (action === 'send') await qualityApi.sendGoldSeal(id);
      else if (action === 'approve') await qualityApi.approveGoldSeal(id);
      else await qualityApi.rejectGoldSeal(id);
      toast('success', `Gold seal ${action === 'send' ? 'sent' : action === 'approve' ? 'approved' : 'rejected'}`);
      fetchData();
    } catch { toast('error', 'Failed to update gold seal status'); }
  };

  const handleSort = (field: string, order: 'asc' | 'desc') => { setSortField(field); setSortOrder(order); };

  const columns: Column[] = [
    { key: 'shipment_number', label: 'Shipment #', sortable: true, render: (v) => <span className="font-mono text-heading">{String(v)}</span> },
    { key: 'po_number', label: 'PO #', sortable: true, render: (v) => <span className="font-mono">{String(v)}</span> },
    { key: 'status', label: 'Status', sortable: true, filterable: true, filterOptions: ['pending', 'sent', 'approved', 'rejected'],
      render: (v) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[String(v)] || ''}`}>{String(v).replace(/_/g, ' ')}</span> },
    { key: 'sent_date', label: 'Sent Date', sortable: true, render: (v) => <span>{v ? String(v) : '-'}</span> },
    { key: 'approval_date', label: 'Approval Date', sortable: true, render: (v) => <span>{v ? String(v) : '-'}</span> },
    { key: 'notes', label: 'Notes', sortable: false, render: (v) => v ? <span className="text-body">{String(v)}</span> : <span className="text-faint">—</span> },
    { key: 'id', label: 'Actions', className: 'text-right', render: (_v, row) => {
      const seal = seals.find(s => String(s.id) === String(row.id));
      const canSend = seal?.status === 'pending';
      const canDecide = seal?.status === 'sent';
      return (
        <div className="flex justify-end gap-3">
          {canSend && (
            <button onClick={(e) => { e.stopPropagation(); if (seal) handleTransition(seal.id, 'send'); }}
              className="text-sm text-blue-500 hover:text-blue-400">Send</button>
          )}
          {canDecide && (
            <>
              <button onClick={(e) => { e.stopPropagation(); if (seal) handleTransition(seal.id, 'approve'); }}
                className="text-sm text-emerald-500 hover:text-emerald-400">Approve</button>
              <button onClick={(e) => { e.stopPropagation(); if (seal) handleTransition(seal.id, 'reject'); }}
                className="text-sm text-red-500 hover:text-red-400">Reject</button>
            </>
          )}
          <button onClick={(e) => {
            e.stopPropagation();
            if (seal) {
              setEditingId(seal.id);
              setForm({
                shipment: seal.shipment || '',
                status: seal.status || 'pending',
                sent_date: seal.sent_date || '',
                approval_date: seal.approval_date || '',
                notes: seal.notes || '',
              });
              setShowModal(true);
            }
          }} className="text-sm text-heading hover:text-emerald-500">Edit</button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteId(String(row.id)); }} className="text-sm text-red-500 hover:text-red-400">Delete</button>
        </div>
      );
    }},
  ];

  return (
    <Layout>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Gold Seal Tracking</h1>
            <p className="text-muted text-sm mt-1">{count} gold seals</p>
          </div>
          <button onClick={openCreate} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
            + New Gold Seal
          </button>
        </div>

        <DataTable
          data={seals as unknown as Record<string, unknown>[]}
          columns={columns}
          totalCount={count}
          page={page}
          pageSize={25}
          onPageChange={setPage}
          searchValue={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          searchPlaceholder="Search shipment, PO or notes..."
          onSort={handleSort}
          sortField={sortField}
          sortOrder={sortOrder}
          loading={loading}
          filters={filters}
          onFilterChange={(f) => { setFilters(f); setPage(1); }}
        />
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">{editingId ? 'Edit Gold Seal' : 'New Gold Seal'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-body mb-1">Shipment *</label>
                <SearchableSelect options={shipments} value={form.shipment}
                  onChange={(v) => setForm({ ...form, shipment: String(v || '') })}
                  placeholder="Select shipment" required />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Status</label>
                <SearchableSelect options={STATUSES} value={form.status}
                  onChange={(v) => setForm({ ...form, status: String(v || 'pending') })}
                  placeholder="Select status" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-body mb-1">Sent Date</label>
                  <input type="date" value={form.sent_date} onChange={(e) => setForm({ ...form, sent_date: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Approval Date</label>
                  <input type="date" value={form.approval_date} onChange={(e) => setForm({ ...form, approval_date: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" rows={3} />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => { setShowModal(false); setEditingId(null); }} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white text-sm rounded-lg transition-colors">
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2">Delete Gold Seal?</h2>
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
