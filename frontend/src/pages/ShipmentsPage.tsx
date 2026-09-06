import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { logisticsApi, setupApi, merchApi } from '../api/client';
import type { Shipment } from '../api/client';
import SpreadsheetGrid from '../components/SpreadsheetGrid';
import type { SpreadsheetColumn } from '../components/SpreadsheetGrid';
import SearchableSelect from '../components/SearchableSelect';
import { useToast } from '../contexts/ToastContext';
import Layout from '../components/Layout';

const MODES = [
  { value: 'sea', label: 'Sea' },
  { value: 'air', label: 'Air' },
  { value: 'road', label: 'Road' },
  { value: 'rail', label: 'Rail' },
  { value: 'multi', label: 'Multi-Modal' },
];

export default function ShipmentsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [factories, setFactories] = useState<{ value: string; label: string }[]>([]);
  const [pos, setPOs] = useState<{ value: string; label: string }[]>([]);
  const [freightForwarders, setFreightForwarders] = useState<{ value: string; label: string }[]>([]);
  const [bookingRefAlerts, setBookingRefAlerts] = useState<Shipment[]>([]);
  const [alertReferences, setAlertReferences] = useState<Record<string, string>>({});
  const [savingRef, setSavingRef] = useState<string | null>(null);

  const [form, setForm] = useState({
    purchase_order: '',
    factory: '',
    freight_forwarder: '',
    mode: 'sea',
    booking_date: '',
    booking_reference: '',
    booking_ref_required_date: '',
    etd: '',
    eta: '',
    port_of_loading: '',
    port_of_discharge: '',
    container_number: '',
    seal_number: '',
    container_size: '',
    quantity: '',
    weight_kg: '',
    cbm: '',
    vessel_name: '',
    voyage_number: '',
    remarks: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await logisticsApi.getShipments({ page_size: '10000' });
      setShipments(res.data.results);
      setCount(res.data.count);
    } catch {
      toast('error', 'Failed to load shipments');
    } finally { setLoading(false); }
  };

  const fetchAlerts = async () => {
    try {
      const alerts = await logisticsApi.getBookingRefAlerts();
      setBookingRefAlerts(alerts.data.results);
    } catch {
      /* non-blocking */
    }
  };

  useEffect(() => { fetchData(); fetchAlerts(); }, []);

  useEffect(() => {
    setupApi.getFactories({ page_size: '100' }).then(r => {
      setFactories(r.data.results.map(f => ({ value: f.id, label: f.name })));
    }).catch(() => {});
    merchApi.getPOs({ page_size: '100' }).then(r => {
      setPOs(r.data.results.map(p => ({ value: p.id, label: p.po_number })));
    }).catch(() => {});
    logisticsApi.getFreightForwarders({ page_size: '100' }).then(r => {
      setFreightForwarders(r.data.results.map(f => ({ value: f.id, label: `${f.name} (${f.code})` })));
    }).catch(() => {});
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      purchase_order: '', factory: '', freight_forwarder: '', mode: 'sea',
      booking_date: '', booking_reference: '', booking_ref_required_date: '',
      etd: '', eta: '', port_of_loading: '', port_of_discharge: '',
      container_number: '', seal_number: '', container_size: '', quantity: '', weight_kg: '',
      cbm: '', vessel_name: '', voyage_number: '', remarks: '',
    });
    setShowModal(true);
  };

  const openEdit = (s: Shipment) => {
    setEditingId(s.id);
    setForm({
      purchase_order: s.purchase_order || '',
      factory: s.factory || '',
      freight_forwarder: s.freight_forwarder || '',
      mode: s.mode || 'sea',
      booking_date: s.booking_date || '',
      booking_reference: s.booking_reference || '',
      booking_ref_required_date: s.booking_ref_required_date || '',
      etd: s.etd || '',
      eta: s.eta || '',
      port_of_loading: s.port_of_loading || '',
      port_of_discharge: s.port_of_discharge || '',
      container_number: s.container_number || '',
      seal_number: s.seal_number || '',
      container_size: s.container_size || '',
      quantity: String(s.quantity ?? ''),
      weight_kg: String(s.weight_kg ?? ''),
      cbm: String(s.cbm ?? ''),
      vessel_name: s.vessel_name || '',
      voyage_number: s.voyage_number || '',
      remarks: s.remarks || '',
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
        mode: form.mode,
        quantity: Number(form.quantity) || 0,
      };
      if (form.freight_forwarder) payload.freight_forwarder = form.freight_forwarder;
      if (form.booking_date) payload.booking_date = form.booking_date;
      if (form.booking_reference) payload.booking_reference = form.booking_reference;
      if (form.booking_ref_required_date) payload.booking_ref_required_date = form.booking_ref_required_date;
      if (form.etd) payload.etd = form.etd;
      if (form.eta) payload.eta = form.eta;
      if (form.port_of_loading) payload.port_of_loading = form.port_of_loading;
      if (form.port_of_discharge) payload.port_of_discharge = form.port_of_discharge;
      if (form.container_number) payload.container_number = form.container_number;
      if (form.seal_number) payload.seal_number = form.seal_number;
      if (form.container_size) payload.container_size = form.container_size;
      if (form.weight_kg) payload.weight_kg = Number(form.weight_kg);
      if (form.cbm) payload.cbm = Number(form.cbm);
      if (form.vessel_name) payload.vessel_name = form.vessel_name;
      if (form.voyage_number) payload.voyage_number = form.voyage_number;
      if (form.remarks) payload.remarks = form.remarks;
      if (editingId) {
        await logisticsApi.updateShipment(editingId, payload);
        toast('success', 'Shipment updated');
      } else {
        await logisticsApi.createShipment(payload);
        toast('success', 'Shipment created');
      }
      setShowModal(false);
      setEditingId(null);
      fetchData();
      fetchAlerts();
    } catch { toast('error', editingId ? 'Failed to update shipment' : 'Failed to create shipment'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await logisticsApi.deleteShipment(id); setDeleteId(null); toast('success', 'Shipment deleted'); fetchData(); fetchAlerts(); } catch { toast('error', 'Failed to delete shipment'); }
  };

  const saveBookingRef = async (id: string) => {
    const reference = (alertReferences[id] ?? '').trim();
    if (!reference) { toast('error', 'Enter a booking reference'); return; }
    setSavingRef(id);
    try {
      await logisticsApi.updateShipment(id, { booking_reference: reference });
      toast('success', 'Booking reference saved');
      setAlertReferences(prev => { const next = { ...prev }; delete next[id]; return next; });
      fetchData();
      fetchAlerts();
    } catch { toast('error', 'Failed to save booking reference'); } finally { setSavingRef(null); }
  };

  const columns: SpreadsheetColumn[] = [
    { title: 'Shipment #', field: 'shipment_number', headerFilter: true },
    { title: 'PO #', field: 'po_number', headerFilter: true },
    { title: 'Factory', field: 'factory_name', headerFilter: true },
    { title: 'Mode', field: 'mode', headerFilter: true },
    { title: 'Status', field: 'status', headerFilter: true },
    { title: 'ETD', field: 'etd' },
    { title: 'ETA', field: 'eta' },
    { title: 'Booking Ref', field: 'booking_reference' },
    { title: 'Container #', field: 'container_number' },
  ];

  const gridData = shipments.map((s) => ({
    ...s,
    status: String(s.status).replace(/_/g, ' '),
    booking_reference: s.booking_reference || '—',
    container_number: s.container_number || '—',
    etd: s.etd || '—',
    eta: s.eta || '—',
  }));

  return (
    <Layout>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Shipments</h1>
            <p className="text-muted text-sm mt-1">{count} total shipments</p>
          </div>
          <button onClick={openCreate} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
            + New Shipment
          </button>
        </div>

        {bookingRefAlerts.length > 0 && (
          <div className="mb-6 space-y-3">
            <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">Booking References Due — Action Required</h2>
            {bookingRefAlerts.map((s) => (
              <div key={s.id} className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-red-700 dark:text-red-400">{s.shipment_number} — {s.po_number}</p>
                    <p className="text-xs text-red-600 dark:text-red-500 mt-1 font-mono">Booking ref required by {s.booking_ref_required_date}</p>
                    <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">GC Manual: booking ref managed by logistics, filled 14 days minimum before the delivery date.</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      value={alertReferences[s.id] ?? ''}
                      onChange={(e) => setAlertReferences(prev => ({ ...prev, [s.id]: e.target.value }))}
                      placeholder="Booking ref"
                      className="px-3 py-1.5 bg-input border border-input-border rounded-lg text-heading text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button onClick={() => saveBookingRef(s.id)} disabled={savingRef === s.id} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50">
                      {savingRef === s.id ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <SpreadsheetGrid
          data={gridData as unknown as Record<string, unknown>[]}
          columns={columns}
          height={480}
          toolbar
          title="Shipments"
          exportable
          columnChooser
          paginationSize={25}
          actionColumn
          onAdd={openCreate}
          onView={(row) => navigate(`/logistics/${String(row.id)}`)}
          onEdit={(row) => openEdit(row as unknown as Shipment)}
          onDelete={(row) => setDeleteId(String(row.id))}
          loading={loading}
        />
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">{editingId ? 'Edit Shipment' : 'New Shipment'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-body mb-1">Purchase Order *</label>
                <SearchableSelect options={pos} value={form.purchase_order}
                  onChange={(v) => setForm({ ...form, purchase_order: String(v || '') })}
                  placeholder="Select PO" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-body mb-1">Factory</label>
                  <SearchableSelect options={factories} value={form.factory}
                    onChange={(v) => setForm({ ...form, factory: String(v || '') })}
                    placeholder="Select factory" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Freight Forwarder</label>
                  <SearchableSelect options={freightForwarders} value={form.freight_forwarder}
                    onChange={(v) => setForm({ ...form, freight_forwarder: String(v || '') })}
                    placeholder="Select forwarder" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-body mb-1">Mode *</label>
                  <SearchableSelect options={MODES} value={form.mode}
                    onChange={(v) => setForm({ ...form, mode: String(v || 'sea') })}
                    placeholder="Select mode" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Quantity *</label>
                  <input required type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-body mb-1">Booking Date</label>
                  <input type="date" value={form.booking_date} onChange={(e) => setForm({ ...form, booking_date: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Booking Reference</label>
                  <input value={form.booking_reference} onChange={(e) => setForm({ ...form, booking_reference: e.target.value })}
                    placeholder="e.g. BRF-2025-1184"
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-body mb-1">Booking Ref Required Date</label>
                  <input type="date" value={form.booking_ref_required_date} onChange={(e) => setForm({ ...form, booking_ref_required_date: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">ETD</label>
                  <input type="date" value={form.etd} onChange={(e) => setForm({ ...form, etd: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-body mb-1">ETA</label>
                  <input type="date" value={form.eta} onChange={(e) => setForm({ ...form, eta: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Port of Loading</label>
                  <input value={form.port_of_loading} onChange={(e) => setForm({ ...form, port_of_loading: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-body mb-1">Port of Discharge</label>
                  <input value={form.port_of_discharge} onChange={(e) => setForm({ ...form, port_of_discharge: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Vessel</label>
                  <input value={form.vessel_name} onChange={(e) => setForm({ ...form, vessel_name: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-body mb-1">Container #</label>
                  <input value={form.container_number} onChange={(e) => setForm({ ...form, container_number: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Seal #</label>
                  <input value={form.seal_number} onChange={(e) => setForm({ ...form, seal_number: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Container Size</label>
                  <input value={form.container_size} onChange={(e) => setForm({ ...form, container_size: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="20GP, 40GP, 40HC" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-body mb-1">Weight (kg)</label>
                  <input type="number" step="0.01" min="0" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">CBM</label>
                  <input type="number" step="0.01" min="0" value={form.cbm} onChange={(e) => setForm({ ...form, cbm: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Remarks</label>
                <textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" rows={2} />
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
            <h2 className="text-lg font-bold mb-2">Delete Shipment?</h2>
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
