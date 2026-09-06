import { useState, useEffect, type FormEvent } from 'react';
import { productionApi, setupApi, merchApi } from '../api/client';
import type { ProductionPlan } from '../api/client';
import SpreadsheetGrid from '../components/SpreadsheetGrid';
import type { SpreadsheetColumn } from '../components/SpreadsheetGrid';
import SearchableSelect from '../components/SearchableSelect';
import { useToast } from '../contexts/ToastContext';
import Layout from '../components/Layout';

export default function ProductionPlansPage() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<ProductionPlan[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
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

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await productionApi.getPlans({ page_size: '10000' });
      setPlans(res.data.results);
      setCount(res.data.count);
    } catch { toast('error', 'Failed to load production plans'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

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

  const columns: SpreadsheetColumn[] = [
    { title: 'PO #', field: 'po_number', headerFilter: true },
    { title: 'Factory', field: 'factory_name', headerFilter: true },
    { title: 'Plan Date', field: 'plan_date', headerFilter: true },
    { title: 'Quantity', field: 'quantity', hozAlign: 'right' },
    { title: 'Status', field: 'status', headerFilter: true },
  ];

  const gridData = plans.map(p => ({
    id: p.id,
    po_number: p.po_number,
    factory_name: p.factory_name,
    plan_date: p.plan_date ?? '—',
    quantity: p.quantity.toLocaleString(),
    status: p.status.replace('_', ' '),
  }));

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

        <SpreadsheetGrid
          data={gridData}
          columns={columns}
          height={480}
          toolbar
          title="Production Plans"
          exportable
          printable
          printTitle="Production Plans"
          columnChooser
          paginationSize={25}
          actionColumn
          loading={loading}
          onAdd={openCreate}
          onEdit={(row) => {
            const p = plans.find(x => x.id === row.id);
            if (p) openEdit(p);
          }}
          onDelete={(row) => setDeleteId(String(row.id))}
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
