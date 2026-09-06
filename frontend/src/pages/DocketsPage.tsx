import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import SpreadsheetGrid from '../components/SpreadsheetGrid';
import type { SpreadsheetColumn } from '../components/SpreadsheetGrid';
import { logisticsApi } from '../api/client';
import type { Docket, Shipment } from '../api/client';
import { useToast } from '../contexts/ToastContext';

const EMPTY_FORM = {
  shipment: '', contract_price: '', date_raised: '', delivery_date: '',
  total_fabric_meters: '', unused_fabric_meters: '', is_final: false, notes: '',
};

export default function DocketsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<Docket[]>([]);
  const [overLimit, setOverLimit] = useState<Docket[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState<Docket | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [notifying, setNotifying] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [res, over] = await Promise.all([
        logisticsApi.getDockets({ page_size: '10000' }),
        logisticsApi.getOverLimitDockets(),
      ]);
      setItems(res.data.results);
      setOverLimit(over.data.results);
    } catch { toast('error', 'Failed to load dockets'); }
  };

  useEffect(() => {
    Promise.all([
      logisticsApi.getDockets({ page_size: '10000' }),
      logisticsApi.getOverLimitDockets(),
      logisticsApi.getShipments({ page_size: '100', status: 'booked' }),
    ]).then(([res, over, ships]) => {
      setItems(res.data.results);
      setOverLimit(over.data.results);
      setShipments(ships.data.results);
    }).catch(() => toast('error', 'Failed to load docket data')).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!form.shipment) { toast('warning', 'Shipment is required'); return; }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        shipment: form.shipment,
        contract_price: form.contract_price || null,
        date_raised: form.date_raised || null,
        delivery_date: form.delivery_date || null,
        total_fabric_meters: form.total_fabric_meters || null,
        unused_fabric_meters: form.unused_fabric_meters || null,
        is_final: form.is_final,
        notes: form.notes,
      };
      if (editing) {
        await logisticsApi.updateDocket(editing.id, payload);
        toast('success', 'Docket updated');
      } else {
        await logisticsApi.createDocket(payload);
        toast('success', 'Docket created');
      }
      setShowModal(false); setForm(EMPTY_FORM); setEditing(null); loadData();
    } catch { toast('error', 'Failed to save docket');
    } finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await logisticsApi.deleteDocket(deleteId);
      toast('success', 'Docket deleted');
      setDeleteId(null); loadData();
    } catch { toast('error', 'Failed to delete'); setDeleteId(null); }
  };

  const sendToSales = async (docket: Docket) => {
    setNotifying(docket.id);
    try {
      await logisticsApi.sendDocketToSales(docket.id);
      toast('success', `${docket.docket_number} sent to sales`);
      loadData();
    } catch { toast('error', 'Failed to notify sales');
    } finally { setNotifying(null); }
  };

  const overLimitCard = (docket: Docket) => (
    <div key={docket.id} className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">{docket.docket_number} — {docket.shipment_number}</p>
          <p className="text-xs text-red-600 dark:text-red-500 mt-1 font-mono">{docket.unused_fabric_meters} m unused after final docket (over 200 m limit)</p>
          <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">GC Manual: fabric over 200 m unusable after final docket must be sent to sales (Debbie &amp; Palones).</p>
        </div>
        {!docket.sales_notified && (
          <button onClick={() => sendToSales(docket)} disabled={notifying === docket.id} className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50">
            {notifying === docket.id ? 'Sending...' : 'Notify Sales'}
          </button>
        )}
      </div>
    </div>
  );

  const gridData = items.map(d => ({
    id: d.id,
    docket_number: d.docket_number,
    shipment_number: d.shipment_number,
    po_number: d.po_number,
    contract_price: d.contract_price ? `$${d.contract_price}` : '—',
    date_raised: d.date_raised ?? '—',
    delivery_date: d.delivery_date ?? '—',
    total_fabric_meters: d.total_fabric_meters ?? '—',
    unused_fabric_meters: d.unused_fabric_meters ?? '—',
    is_final: d.is_final ? 'Yes' : 'No',
    sales_notified: d.sales_notified ? 'Notified' : '—',
  }));

  const columns: SpreadsheetColumn[] = [
    { title: 'Docket', field: 'docket_number', headerFilter: true },
    { title: 'Shipment', field: 'shipment_number', headerFilter: true },
    { title: 'PO', field: 'po_number', headerFilter: true },
    { title: 'Contract Price', field: 'contract_price' },
    { title: 'Date Raised', field: 'date_raised' },
    { title: 'Delivery', field: 'delivery_date' },
    { title: 'Total (m)', field: 'total_fabric_meters', hozAlign: 'right' },
    { title: 'Unused (m)', field: 'unused_fabric_meters', hozAlign: 'right' },
    { title: 'Final', field: 'is_final' },
    { title: 'Sales', field: 'sales_notified' },
  ];

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dockets</h1>
            <p className="text-muted text-sm mt-1">GC-020 — production dockets with contract price, date raised, delivery date and fabric meters. Fabric over 200 m unusable after the final docket is sent to sales for direction.</p>
          </div>
          <button onClick={() => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); }} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">+ New Docket</button>
        </div>

        {overLimit.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">Over-200m Unusable Fabric — Action Required</h2>
            {overLimit.map(overLimitCard)}
          </div>
        )}

        <div className="bg-surface rounded-xl border border-border p-5">
          <h2 className="text-sm font-semibold text-heading mb-4">Docket Register</h2>
          <SpreadsheetGrid
            title="Docket Register"
            toolbar={true}
            exportable={true}
            columnChooser={true}
            actionColumn={true}
            paginationSize={10}
            height={480}
            loading={loading}
            data={gridData}
            columns={columns}
            onAdd={() => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); }}
            onEdit={(row) => {
              const d = items.find(x => x.id === row.id);
              if (!d) return;
              setEditing(d); setForm({
                shipment: d.shipment, contract_price: d.contract_price ?? '', date_raised: d.date_raised ?? '',
                delivery_date: d.delivery_date ?? '', total_fabric_meters: d.total_fabric_meters ?? '',
                unused_fabric_meters: d.unused_fabric_meters ?? '', is_final: d.is_final, notes: d.notes,
              }); setShowModal(true);
            }}
            onDelete={(row) => setDeleteId(String(row.id))}
          />
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border"><h2 className="text-lg font-semibold">{editing ? 'Edit Docket' : 'New Docket'}</h2></div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-muted mb-1">Shipment *</label>
                <select value={form.shipment} onChange={(e) => setForm({ ...form, shipment: e.target.value })} disabled={!!editing} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50">
                  <option value="">Select shipment...</option>
                  {shipments.map(s => <option key={s.id} value={s.id}>{s.shipment_number} — {s.po_number}</option>)}
                </select>
                {editing && <p className="text-xs text-muted mt-1">Shipment cannot be changed after creation.</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm text-muted mb-1">Contract Price</label><input type="number" min="0" step="0.01" value={form.contract_price} onChange={(e) => setForm({ ...form, contract_price: e.target.value })} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                <div><label className="block text-sm text-muted mb-1">Total Fabric (m)</label><input type="number" min="0" step="0.01" value={form.total_fabric_meters} onChange={(e) => setForm({ ...form, total_fabric_meters: e.target.value })} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                <div><label className="block text-sm text-muted mb-1">Unused Fabric (m)</label><input type="number" min="0" step="0.01" value={form.unused_fabric_meters} onChange={(e) => setForm({ ...form, unused_fabric_meters: e.target.value })} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                <div>
                  <label className="block text-sm text-muted mb-1">Date Raised</label>
                  <input type="date" value={form.date_raised} onChange={(e) => setForm({ ...form, date_raised: e.target.value })} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Delivery Date</label>
                  <input type="date" value={form.delivery_date} onChange={(e) => setForm({ ...form, delivery_date: e.target.value })} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-sm text-heading cursor-pointer">
                    <input type="checkbox" checked={form.is_final} onChange={(e) => setForm({ ...form, is_final: e.target.checked })} className="h-4 w-4 rounded border-border text-emerald-600 focus:ring-emerald-500" />
                    Final docket (based on shipped quantity)
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="e.g. excess fabric sent to sales for direction..." className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">{saving ? 'Saving...' : editing ? 'Save Changes' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2">Delete Docket?</h2>
            <p className="text-muted text-sm mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-3"><button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-body hover:text-heading">Cancel</button><button onClick={confirmDelete} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg">Delete</button></div>
          </div>
        </div>
      )}
    </Layout>
  );
}