import { useState, useEffect, type FormEvent } from 'react';
import { productionApi, setupApi, merchApi } from '../api/client';
import type { ProductionPlan } from '../api/client';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import SearchableSelect from '../components/SearchableSelect';
import { useToast } from '../contexts/ToastContext';
import Layout from '../components/Layout';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-surface-alt/20 text-muted',
  planned: 'bg-blue-500/20 text-badge-blue',
  in_progress: 'bg-amber-500/20 text-badge-amber',
  completed: 'bg-emerald-500/20 text-badge-emerald',
};

export default function ProductionPlansPage() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<ProductionPlan[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('plan_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<ProductionPlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [factories, setFactories] = useState<{ value: string; label: string }[]>([]);
  const [pos, setPOs] = useState<{ value: string; label: string }[]>([]);

  const [form, setForm] = useState({
    purchase_order: '',
    factory: '',
    plan_date: '',
    start_date: '',
    quantity: '',
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
      const res = await productionApi.getPlans(params);
      setPlans(res.data.results);
      setCount(res.data.count);
    } catch { toast('error', 'Failed to load production plans'); } finally { setLoading(false); }
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

  const handlePOSelect = (poId: string) => {
    const po = pos.find(p => p.value === poId);
    if (po) {
      // Find the full PO data from the list to get factory and quantity
      merchApi.getPOs({ search: po.label }).then(res => {
        const fullPO = res.data.results.find((p: { id: string }) => p.id === poId);
        if (fullPO) {
          setForm(f => ({
            ...f,
            purchase_order: poId,
            factory: (fullPO as { factory: string }).factory || f.factory,
            quantity: String((fullPO as { quantity: number }).quantity || ''),
          }));
        }
      }).catch(() => {}); // Silently ignore - secondary PO search for auto-fill
    }
  };

  const openCreate = () => {
    setEditingPlan(null);
    setForm({ purchase_order: '', factory: '', plan_date: '', start_date: '', quantity: '', remarks: '' });
    setShowModal(true);
  };

  const openEdit = (plan: ProductionPlan) => {
    setEditingPlan(plan);
    setForm({
      purchase_order: plan.purchase_order,
      factory: plan.factory,
      plan_date: plan.plan_date,
      start_date: plan.start_date || '',
      quantity: String(plan.quantity),
      remarks: plan.remarks,
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
        plan_date: form.plan_date,
        quantity: Number(form.quantity),
        remarks: form.remarks,
      };
      if (form.start_date) payload.start_date = form.start_date;
      if (editingPlan) {
        await productionApi.updatePlan(editingPlan.id, payload);
        toast('success', 'Plan updated');
      } else {
        await productionApi.createPlan(payload);
        toast('success', 'Plan created');
      }
      setShowModal(false);
      fetchData();
    } catch { toast('error', editingPlan ? 'Failed to update plan' : 'Failed to create plan'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await productionApi.deletePlan(id); setDeleteId(null); toast('success', 'Plan deleted'); fetchData(); } catch { toast('error', 'Failed to delete plan'); }
  };

  const handleSort = (field: string, order: 'asc' | 'desc') => { setSortField(field); setSortOrder(order); };

  const columns: Column[] = [
    { key: 'po_number', label: 'PO #', sortable: true, render: (v) => <span className="font-mono text-emerald-400">{String(v)}</span> },
    { key: 'factory_name', label: 'Factory', sortable: true },
    { key: 'plan_date', label: 'Plan Date', sortable: true },
    { key: 'quantity', label: 'Quantity', sortable: true, className: 'text-right', render: (v) => <span className="text-right block">{String(v)}</span> },
    { key: 'status', label: 'Status', sortable: true,
      render: (v) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[String(v)] || ''}`}>{String(v).replace('_', ' ')}</span> },
    { key: 'id', label: 'Actions', className: 'text-right', render: (_v, row) => (
      <div className="flex justify-end gap-3">
        <button onClick={(e) => { e.stopPropagation(); openEdit(row as unknown as ProductionPlan); }} className="text-sm text-blue-400 hover:text-blue-300">View</button>
        <button onClick={(e) => { e.stopPropagation(); setDeleteId(String(row.id)); }} className="text-sm text-red-400 hover:text-red-300">Delete</button>
      </div>
    )},
  ];

  return (
    <Layout>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Production Plans</h1>
            <p className="text-muted text-sm mt-1">{count} total plans</p>
          </div>
          <button onClick={openCreate} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
            + New Plan
          </button>
        </div>

        <DataTable
          data={plans as unknown as Record<string, unknown>[]}
          columns={columns}
          totalCount={count}
          page={page}
          pageSize={25}
          onPageChange={setPage}
          searchValue={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          searchPlaceholder="Search plans..."
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
            <h2 className="text-lg font-bold mb-4">{editingPlan ? 'Edit Plan' : 'New Production Plan'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-body mb-1">Purchase Order *</label>
                <SearchableSelect
                  options={pos}
                  value={form.purchase_order}
                  onChange={(v) => handlePOSelect(String(v || ''))}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-body mb-1">Plan Date *</label>
                  <input required type="date" value={form.plan_date} onChange={(e) => setForm({ ...form, plan_date: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Start Date</label>
                  <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Quantity *</label>
                <input required type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="0" />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Remarks</label>
                <textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" rows={3} />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white text-sm rounded-lg transition-colors">
                  {saving ? 'Saving...' : editingPlan ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2">Delete Plan?</h2>
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
