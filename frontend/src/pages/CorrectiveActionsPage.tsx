import { useState, useEffect, type FormEvent } from 'react';
import { qualityApi, merchApi } from '../api/client';
import type { CorrectiveAction } from '../api/client';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import SearchableSelect from '../components/SearchableSelect';
import { useToast } from '../contexts/ToastContext';
import Layout from '../components/Layout';

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-surface-alt/20 text-muted',
  medium: 'bg-blue-500/20 text-badge-blue',
  high: 'bg-amber-500/20 text-badge-amber',
  critical: 'bg-red-500/20 text-badge-red',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-surface-alt/20 text-muted',
  in_progress: 'bg-blue-500/20 text-badge-blue',
  completed: 'bg-emerald-500/20 text-badge-emerald',
  verified: 'bg-teal-500/20 text-teal-400',
  closed: 'bg-surface-alt/20 text-muted',
};

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export default function CorrectiveActionsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<CorrectiveAction[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('due_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CorrectiveAction | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pos, setPOs] = useState<{ value: string; label: string }[]>([]);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    title: '',
    description: '',
    inspection: '',
    root_cause: '',
    corrective_measure: '',
    preventive_measure: '',
    assigned_to: '',
    due_date: '',
    priority: 'medium',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), page_size: '25' };
      if (search) params.search = search;
      params.ordering = sortOrder === 'desc' ? `-${sortField}` : sortField;
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      const res = await qualityApi.getCorrectiveActions(params);
      setItems(res.data.results);
      setCount(res.data.count);
    } catch { toast('error', 'Failed to load corrective actions'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [search, page, sortField, sortOrder, filters]);

  useEffect(() => {
    merchApi.getPOs({ page_size: '500' }).then(r => {
      setPOs(r.data.results.map(p => ({ value: p.id, label: p.po_number })));
    }).catch(() => {}); // Silently ignore - secondary dropdown data
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', description: '', inspection: '', root_cause: '', corrective_measure: '', preventive_measure: '', assigned_to: '', due_date: '', priority: 'medium' });
    setShowModal(true);
  };

  const openEdit = (item: CorrectiveAction) => {
    setEditing(item);
    setForm({
      title: item.title,
      description: item.description,
      inspection: item.inspection,
      root_cause: item.root_cause || '',
      corrective_measure: item.corrective_measure,
      preventive_measure: item.preventive_measure || '',
      assigned_to: item.assigned_to || '',
      due_date: item.due_date,
      priority: item.priority,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title,
        description: form.description,
        inspection: form.inspection,
        corrective_measure: form.corrective_measure,
        due_date: form.due_date,
        priority: form.priority,
      };
      if (form.root_cause) payload.root_cause = form.root_cause;
      if (form.preventive_measure) payload.preventive_measure = form.preventive_measure;
      if (form.assigned_to) payload.assigned_to = form.assigned_to;
      if (editing) {
        await qualityApi.updateCorrectiveAction(editing.id, payload);
        toast('success', 'Corrective action updated');
      } else {
        await qualityApi.createCorrectiveAction(payload);
        toast('success', 'Corrective action created');
      }
      setShowModal(false);
      fetchData();
    } catch { toast('error', editing ? 'Failed to update' : 'Failed to create'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await qualityApi.deleteCorrectiveAction(id); setDeleteId(null); toast('success', 'Deleted'); fetchData(); } catch { toast('error', 'Failed to delete'); }
  };

  const handleAction = async (id: string, action: 'complete' | 'verify' | 'close') => {
    try {
      if (action === 'complete') await qualityApi.completeCorrectiveAction(id);
      else if (action === 'verify') await qualityApi.verifyCorrectiveAction(id);
      else await qualityApi.closeCorrectiveAction(id);
      toast('success', `Action ${action}d`);
      fetchData();
    } catch { toast('error', `Failed to ${action}`); }
  };

  const handleSort = (field: string, order: 'asc' | 'desc') => { setSortField(field); setSortOrder(order); };

  const today = new Date().toISOString().split('T')[0];

  const columns: Column[] = [
    { key: 'title', label: 'Title', sortable: true },
    { key: 'inspection', label: 'Inspection', sortable: true },
    { key: 'priority', label: 'Priority', sortable: true,
      render: (v) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${PRIORITY_COLORS[String(v)] || ''}`}>{String(v)}</span> },
    { key: 'status', label: 'Status', sortable: true,
      render: (v) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[String(v)] || ''}`}>{String(v).replace('_', ' ')}</span> },
    { key: 'assigned_to_name', label: 'Assigned To', sortable: true, render: (v) => <span>{v ? String(v) : <span className="text-faint">Unassigned</span>}</span> },
    { key: 'due_date', label: 'Due Date', sortable: true, render: (v) => {
      const d = String(v);
      const isPast = d < today;
      return <span className={isPast ? 'text-red-400 font-medium' : ''}>{d}</span>;
    }},
    { key: 'completed_date', label: 'Completed', sortable: true, render: (v) => <span>{v ? String(v) : '-'}</span> },
    { key: 'id', label: 'Actions', className: 'text-right', render: (_v, row) => {
      const item = row as unknown as CorrectiveAction;
      return (
        <div className="flex justify-end gap-2">
          <button onClick={(e) => { e.stopPropagation(); openEdit(item); }} className="text-sm text-blue-700 hover:text-blue-600">Edit</button>
          {item.status === 'open' && (
            <button onClick={(e) => { e.stopPropagation(); handleAction(item.id, 'complete'); }} className="text-sm text-emerald-700 hover:text-emerald-800">Complete</button>
          )}
          {item.status === 'completed' && (
            <button onClick={(e) => { e.stopPropagation(); handleAction(item.id, 'verify'); }} className="text-sm text-teal-400 hover:text-teal-300">Verify</button>
          )}
          {item.status === 'verified' && (
            <button onClick={(e) => { e.stopPropagation(); handleAction(item.id, 'close'); }} className="text-sm text-muted hover:text-body">Close</button>
          )}
          <button onClick={(e) => { e.stopPropagation(); setDeleteId(item.id); }} className="text-sm text-red-700 hover:text-red-600">Delete</button>
        </div>
      );
    }},
  ];

  return (
    <Layout>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Corrective Actions</h1>
            <p className="text-muted text-sm mt-1">{count} total corrective actions</p>
          </div>
          <button onClick={openCreate} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
            + New CAP
          </button>
        </div>

        <DataTable
          data={items as unknown as Record<string, unknown>[]}
          columns={columns}
          totalCount={count}
          page={page}
          pageSize={25}
          onPageChange={setPage}
          searchValue={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          searchPlaceholder="Search corrective actions..."
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
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">{editing ? 'Edit Corrective Action' : 'New Corrective Action'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-body mb-1">Title *</label>
                <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" rows={3} />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Inspection (PO#) *</label>
                <SearchableSelect
                  options={pos}
                  value={form.inspection}
                  onChange={(v) => setForm({ ...form, inspection: String(v || '') })}
                  placeholder="Select inspection"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Root Cause</label>
                <input value={form.root_cause} onChange={(e) => setForm({ ...form, root_cause: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Corrective Measure *</label>
                <textarea value={form.corrective_measure} onChange={(e) => setForm({ ...form, corrective_measure: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" rows={2} required />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Preventive Measure</label>
                <textarea value={form.preventive_measure} onChange={(e) => setForm({ ...form, preventive_measure: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-body mb-1">Assigned To</label>
                  <input value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="User ID" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Priority *</label>
                  <SearchableSelect
                    options={PRIORITIES}
                    value={form.priority}
                    onChange={(v) => setForm({ ...form, priority: String(v || 'medium') })}
                    placeholder="Select priority"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Due Date *</label>
                <input required type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white text-sm rounded-lg transition-colors">
                  {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2">Delete Corrective Action?</h2>
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
