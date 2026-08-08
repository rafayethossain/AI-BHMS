import { useState, useEffect, type FormEvent } from 'react';
import { qualityApi, setupApi, merchApi } from '../api/client';
import type { Inspection } from '../api/client';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import SearchableSelect from '../components/SearchableSelect';
import { useToast } from '../contexts/ToastContext';
import Layout from '../components/Layout';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-surface-alt/20 text-muted',
  in_progress: 'bg-amber-500/20 text-badge-amber',
  passed: 'bg-emerald-500/20 text-badge-emerald',
  failed: 'bg-red-500/20 text-badge-red',
  completed: 'bg-emerald-500/20 text-badge-emerald',
};

const TYPE_COLORS: Record<string, string> = {
  inline: 'bg-blue-500/20 text-badge-blue',
  final: 'bg-purple-500/20 text-badge-purple',
  pre_shipment: 'bg-cyan-500/20 text-cyan-400',
};

const INSPECTION_TYPES = [
  { value: 'inline', label: 'Inline' },
  { value: 'final', label: 'Final' },
  { value: 'pre_shipment', label: 'Pre-Shipment' },
];

export default function InspectionsPage() {
  const { toast } = useToast();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('inspection_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showModal, setShowModal] = useState(false);
  const [editingInspection, setEditingInspection] = useState<Inspection | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [factories, setFactories] = useState<{ value: string; label: string }[]>([]);
  const [pos, setPOs] = useState<{ value: string; label: string }[]>([]);

  const [form, setForm] = useState({
    purchase_order: '',
    factory: '',
    inspection_type: '',
    inspection_date: '',
    aql_level: '2.5',
    remarks: '',
  });

  const [filters, setFilters] = useState<Record<string, string>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), page_size: '25' };
      if (search) params.search = search;
      params.ordering = sortOrder === 'desc' ? `-${sortField}` : sortField;
      if (filters.status) params.status = filters.status;
      if (filters.inspection_type) params.inspection_type = filters.inspection_type;
      const res = await qualityApi.getInspections(params);
      setInspections(res.data.results);
      setCount(res.data.count);
    } catch { toast('error', 'Failed to load inspections'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [search, page, sortField, sortOrder, filters]);

  useEffect(() => {
    setupApi.getFactories({ page_size: '500' }).then(r => {
      setFactories(r.data.results.map(f => ({ value: f.id, label: f.name })));
    }).catch(() => {}); // Silently ignore - secondary dropdown data
    merchApi.getPOs({ page_size: '500' }).then(r => {
      setPOs(r.data.results.map(p => ({ value: p.id, label: p.po_number })));
    }).catch(() => {}); // Silently ignore - secondary dropdown data
  }, []);

  const openCreate = () => {
    setEditingInspection(null);
    setForm({ purchase_order: '', factory: '', inspection_type: '', inspection_date: '', aql_level: '2.5', remarks: '' });
    setShowModal(true);
  };

  const openEdit = (insp: Inspection) => {
    setEditingInspection(insp);
    setForm({
      purchase_order: insp.purchase_order,
      factory: insp.factory,
      inspection_type: insp.inspection_type,
      inspection_date: insp.inspection_date,
      aql_level: String(insp.aql_level),
      remarks: insp.remarks,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        purchase_order: form.purchase_order,
        factory: form.factory,
        inspection_type: form.inspection_type,
        inspection_date: form.inspection_date,
        aql_level: Number(form.aql_level),
        remarks: form.remarks,
      };
      if (editingInspection) {
        await qualityApi.updateInspection(editingInspection.id, payload);
        toast('success', 'Inspection updated');
      } else {
        await qualityApi.createInspection(payload);
        toast('success', 'Inspection created');
      }
      setShowModal(false);
      fetchData();
    } catch { toast('error', editingInspection ? 'Failed to update inspection' : 'Failed to create inspection'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await qualityApi.deleteInspection(id); setDeleteId(null); toast('success', 'Inspection deleted'); fetchData(); } catch { toast('error', 'Failed to delete inspection'); }
  };

  const handleSort = (field: string, order: 'asc' | 'desc') => { setSortField(field); setSortOrder(order); };

  const columns: Column[] = [
    { key: 'po_number', label: 'PO #', sortable: true, render: (v) => <span className="font-mono text-emerald-700">{String(v)}</span> },
    { key: 'factory_name', label: 'Factory', sortable: true },
    { key: 'inspection_type', label: 'Type', sortable: true,
      render: (v) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${TYPE_COLORS[String(v)] || ''}`}>{String(v).replace('_', ' ')}</span> },
    { key: 'inspection_date', label: 'Date', sortable: true },
    { key: 'aql_level', label: 'AQL', sortable: true, className: 'text-right', render: (v) => <span className="text-right block">{String(v)}</span> },
    { key: 'sample_size', label: 'Sample', sortable: false, className: 'text-right', render: (v) => (
      <span className="text-right block">{v !== null && v !== undefined ? String(v) : '-'}</span>
    )},
    { key: 'passed_quantity', label: 'Passed / Rejected', sortable: false, className: 'text-right', render: (_v, row) => (
      <span className="text-right block">{String(row.passed_quantity)} / {String(row.rejected_quantity)}</span>
    )},
    { key: 'status', label: 'Status', sortable: true,
      render: (v) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[String(v)] || ''}`}>{String(v).replace('_', ' ')}</span> },
    { key: 'id', label: 'Actions', className: 'text-right', render: (_v, row) => (
      <div className="flex justify-end gap-3">
        <button onClick={(e) => { e.stopPropagation(); openEdit(row as unknown as Inspection); }} className="text-sm text-blue-700 hover:text-blue-600">View</button>
        <button onClick={(e) => { e.stopPropagation(); setDeleteId(String(row.id)); }} className="text-sm text-red-700 hover:text-red-600">Delete</button>
      </div>
    )},
  ];

  return (
    <Layout>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Quality Inspections</h1>
            <p className="text-muted text-sm mt-1">{count} total inspections</p>
          </div>
          <button onClick={openCreate} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
            + New Inspection
          </button>
        </div>

        <DataTable
          data={inspections as unknown as Record<string, unknown>[]}
          columns={columns}
          totalCount={count}
          page={page}
          pageSize={25}
          onPageChange={setPage}
          searchValue={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          searchPlaceholder="Search inspections..."
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
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">{editingInspection ? 'Edit Inspection' : 'New Inspection'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-body mb-1">Purchase Order *</label>
                <SearchableSelect
                  options={pos}
                  value={form.purchase_order}
                  onChange={(v) => setForm({ ...form, purchase_order: String(v || '') })}
                  placeholder="Select PO"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Factory *</label>
                <SearchableSelect
                  options={factories}
                  value={form.factory}
                  onChange={(v) => setForm({ ...form, factory: String(v || '') })}
                  placeholder="Select factory"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Inspection Type *</label>
                <SearchableSelect
                  options={INSPECTION_TYPES}
                  value={form.inspection_type}
                  onChange={(v) => setForm({ ...form, inspection_type: String(v || '') })}
                  placeholder="Select type"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-body mb-1">Inspection Date *</label>
                  <input required type="date" value={form.inspection_date} onChange={(e) => setForm({ ...form, inspection_date: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">AQL Level *</label>
                  <input required type="number" min="0" step="0.1" value={form.aql_level} onChange={(e) => setForm({ ...form, aql_level: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Remarks</label>
                <textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" rows={3} />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white text-sm rounded-lg transition-colors">
                  {saving ? 'Saving...' : editingInspection ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2">Delete Inspection?</h2>
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
