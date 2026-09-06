import { useState, useEffect, type FormEvent } from 'react';
import { commercialApi } from '../api/client';
import type { ForwardOrder, MonthlyForwardRow } from '../api/client';
import SpreadsheetGrid from '../components/SpreadsheetGrid';
import type { SpreadsheetColumn } from '../components/SpreadsheetGrid';
import { useToast } from '../contexts/ToastContext';
import Layout from '../components/Layout';

const STATUS_OPTIONS = ['draft', 'confirmed', 'in_production', 'shipped'];

export default function ForwardOrderPage() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<ForwardOrder[]>([]);
  const [count, setCount] = useState(0);
  const [monthly, setMonthly] = useState<MonthlyForwardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ForwardOrder | null>(null);
  const [form, setForm] = useState({
    month: '', purchase_order: '', buyer: '', factory: '',
    quantity: '', unit_cost: '', service_pct: '3.00',
    in_hand_units: '0', status: 'draft', remarks: '',
  });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: '1', page_size: '10000' };
      const res = await commercialApi.getForwardOrders(params);
      setOrders(res.data.results);
      setCount(res.data.count);
      const mres = await commercialApi.getMonthlyForward();
      setMonthly(mres.data.results);
    } catch { toast('error', 'Failed to load forward orders'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const totalQty = monthly.reduce((sum, r) => sum + Number(r.quantity), 0);
  const totalCost = monthly.reduce((sum, r) => sum + Number(r.total_cost), 0);
  const totalService = monthly.reduce((sum, r) => sum + Number(r.service_charge), 0);

  const openCreate = () => {
    setEditing(null);
    setForm({ month: '', purchase_order: '', buyer: '', factory: '', quantity: '', unit_cost: '', service_pct: '3.00', in_hand_units: '0', status: 'draft', remarks: '' });
    setShowModal(true);
  };

  const openEdit = (fo: ForwardOrder) => {
    setEditing(fo);
    setForm({
      month: fo.month, purchase_order: fo.purchase_order ?? '', buyer: fo.buyer, factory: fo.factory,
      quantity: fo.quantity, unit_cost: fo.unit_cost, service_pct: fo.service_pct,
      in_hand_units: fo.in_hand_units, status: fo.status, remarks: fo.remarks || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (editing) {
        await commercialApi.updateForwardOrder(editing.id, payload as unknown as Record<string, unknown>);
        toast('success', 'Forward order updated');
      } else {
        await commercialApi.createForwardOrder(payload as unknown as Record<string, unknown>);
        toast('success', 'Forward order created');
      }
      setShowModal(false);
      fetchData();
    } catch { toast('error', editing ? 'Failed to update forward order' : 'Failed to create forward order'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await commercialApi.deleteForwardOrder(id); setDeleteId(null); toast('success', 'Forward order deleted'); fetchData(); } catch { toast('error', 'Failed to delete forward order'); }
  };

  const qty = Number(form.quantity) || 0;
  const unitCost = Number(form.unit_cost) || 0;
  const servicePct = Number(form.service_pct) || 0;
  const computedTotalCost = qty * unitCost;
  const computedServiceCharge = (computedTotalCost * servicePct) / 100;

  const gridData = orders.map(fo => ({
    id: fo.id,
    month: fo.month,
    buyer_name: fo.buyer_name,
    factory_name: fo.factory_name,
    po_number: fo.po_number,
    quantity: Number(fo.quantity).toLocaleString(),
    unit_cost: Number(fo.unit_cost).toLocaleString(),
    total_cost: Number(fo.total_cost).toLocaleString(),
    service_pct: String(fo.service_pct),
    service_charge: Number(fo.service_charge).toLocaleString(),
    in_hand_units: Number(fo.in_hand_units).toLocaleString(),
    status: fo.status,
  }));

  const columns: SpreadsheetColumn[] = [
    { title: 'Month', field: 'month', headerFilter: true },
    { title: 'Buyer', field: 'buyer_name', headerFilter: true },
    { title: 'Factory', field: 'factory_name', headerFilter: true },
    { title: 'PO #', field: 'po_number' },
    { title: 'Qty', field: 'quantity', hozAlign: 'right' },
    { title: 'Unit Cost', field: 'unit_cost', hozAlign: 'right' },
    { title: 'Total Cost', field: 'total_cost', hozAlign: 'right' },
    { title: 'Svc %', field: 'service_pct', hozAlign: 'right' },
    { title: 'Svc Charge', field: 'service_charge', hozAlign: 'right' },
    { title: 'In-hand', field: 'in_hand_units', hozAlign: 'right' },
    { title: 'Status', field: 'status', headerFilter: true },
  ];

  return (
    <Layout>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Forward Order Book</h1>
            <p className="text-muted text-sm mt-1">{count} total forward orders</p>
          </div>
          <button onClick={openCreate} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
            + New Forward Order
          </button>
        </div>

        <div className="bg-surface rounded-xl border border-border p-5 mb-6">
          <h2 className="text-sm font-semibold text-heading mb-3">Monthly Forward Report</h2>
          <p className="text-xs text-muted mb-3">Total ordered quantity, cost and 3% service charge across all forward commitments (Order In-hand book).</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="rounded-lg border border-border px-3 py-2">
              <p className="text-xs text-muted">Quantities</p>
              <p className="text-lg font-semibold text-heading">{totalQty.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-border px-3 py-2">
              <p className="text-xs text-muted">Total Cost</p>
              <p className="text-lg font-semibold text-heading">{totalCost.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-border px-3 py-2">
              <p className="text-xs text-muted">Service Charge</p>
              <p className="text-lg font-semibold text-heading">{totalService.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-border px-3 py-2">
              <p className="text-xs text-muted">Commitments</p>
              <p className="text-lg font-semibold text-heading">{monthly.length}</p>
            </div>
          </div>
        </div>

        <SpreadsheetGrid
          title="Forward Order Book"
          toolbar={true}
          exportable={true}
          columnChooser={true}
          actionColumn={true}
          paginationSize={25}
          height={480}
          loading={loading}
          data={gridData}
          columns={columns}
          onAdd={openCreate}
          onEdit={(row) => {
            const fo = orders.find(o => o.id === row.id);
            if (fo) openEdit(fo);
          }}
          onDelete={(row) => setDeleteId(String(row.id))}
        />
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">{editing ? 'Edit Forward Order' : 'New Forward Order'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-body mb-1">Month *</label>
                <input required type="date" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-body mb-1">Buyer ID *</label>
                  <input required value={form.buyer} onChange={(e) => setForm({ ...form, buyer: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Buyer UUID" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Factory ID *</label>
                  <input required value={form.factory} onChange={(e) => setForm({ ...form, factory: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Factory UUID" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Purchase Order ID</label>
                <input value={form.purchase_order} onChange={(e) => setForm({ ...form, purchase_order: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="PO UUID (optional)" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-body mb-1">Quantity *</label>
                  <input required type="number" step="0.01" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Unit Cost *</label>
                  <input required type="number" step="0.01" value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-body mb-1">Service %</label>
                  <input type="number" step="0.001" value={form.service_pct} onChange={(e) => setForm({ ...form, service_pct: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">In-hand Units</label>
                  <input type="number" step="0.01" value={form.in_hand_units} onChange={(e) => setForm({ ...form, in_hand_units: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="rounded-lg border border-border bg-input/40 px-3 py-2 text-sm">
                <p className="flex justify-between"><span className="text-muted">Total Cost (qty x cost):</span><span className="font-medium text-heading">{computedTotalCost.toLocaleString()}</span></p>
                <p className="flex justify-between mt-1"><span className="text-muted">Service Charge ({servicePct}%):</span><span className="font-medium text-heading">{computedServiceCharge.toLocaleString()}</span></p>
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Remarks</label>
                <textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" rows={2} />
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
            <h2 className="text-lg font-bold mb-2">Delete Forward Order?</h2>
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