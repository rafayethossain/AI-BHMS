import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import SpreadsheetGrid from '../components/SpreadsheetGrid';
import type { SpreadsheetColumn } from '../components/SpreadsheetGrid';
import { fabricApi } from '../api/client';
import type { FabricBooking } from '../api/client';
import { useToast } from '../contexts/ToastContext';

const INITIAL_FORM = { booking_number: '', supplier: '', fabric_category: '', quantity_meters: '', status: 'pending', expected_delivery: '', notes: '' };

export default function FabricBookingsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<FabricBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await fabricApi.getBookings({ page_size: '10000' });
      setItems(res.data.results);
    } catch { toast('error', 'Failed to load fabric bookings');
    } finally { setLoading(false); }
  };

  const handleOpenModal = (item?: FabricBooking) => {
    if (item) {
      setEditingId(item.id);
      setForm({
        booking_number: item.booking_number, supplier: item.supplier,
        fabric_category: item.fabric_category || '', quantity_meters: item.quantity_meters,
        status: item.status, expected_delivery: item.expected_delivery || '', notes: item.notes,
      });
    } else { setEditingId(null); setForm({ ...INITIAL_FORM, booking_number: `BK-${new Date().getFullYear()}-${String(items.length + 1).padStart(4, '0')}` }); }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.booking_number || !form.supplier || !form.quantity_meters) {
      toast('warning', 'Booking number, supplier, and quantity are required'); return;
    }
    setSaving(true);
    try {
      const data: Record<string, unknown> = {
        booking_number: form.booking_number, supplier: form.supplier,
        fabric_category: form.fabric_category || null, quantity_meters: parseFloat(form.quantity_meters),
        status: form.status, expected_delivery: form.expected_delivery || null, notes: form.notes,
      };
      if (editingId) { await fabricApi.updateBooking(editingId, data); toast('success', 'Booking updated'); }
      else { await fabricApi.createBooking(data); toast('success', 'Booking created'); }
      setShowModal(false); load();
    } catch { toast('error', 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => { setDeleteId(id); };
  const confirmDelete = async () => {
    if (!deleteId) return;
    try { await fabricApi.deleteBooking(deleteId); toast('success', 'Booking deleted'); setDeleteId(null); load();
    } catch { toast('error', 'Failed to delete'); setDeleteId(null); }
  };

  const columns: SpreadsheetColumn[] = [
    { title: 'Booking #', field: 'booking_number', headerFilter: true },
    { title: 'Supplier', field: 'supplier_name', headerFilter: true },
    { title: 'Category', field: 'fabric_category_name' },
    { title: 'Qty (m)', field: 'quantity_meters', hozAlign: 'right' },
    { title: 'Status', field: 'status', headerFilter: true },
    { title: 'Expected', field: 'expected_delivery' },
  ];

  const gridData = items.map((i) => ({
    ...i,
    quantity_meters: Number(i.quantity_meters).toLocaleString(),
    expected_delivery: i.expected_delivery || '—',
    fabric_category_name: i.fabric_category_name || '—',
  }));

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Fabric Bookings</h1>
          <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">+ New Booking</button>
        </div>
        <SpreadsheetGrid
          data={gridData as unknown as Record<string, unknown>[]}
          columns={columns}
          height={480}
          toolbar
          title="Fabric Bookings"
          exportable
          columnChooser
          paginationSize={25}
          actionColumn
          onAdd={() => handleOpenModal()}
          onEdit={(row) => handleOpenModal(row as unknown as FabricBooking)}
          onDelete={(row) => handleDelete(String(row.id))}
          loading={loading}
        />
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border"><h2 className="text-lg font-semibold">{editingId ? 'Edit' : 'New'} Booking</h2></div>
            <div className="p-6 space-y-4">
              <div><label className="block text-sm text-muted mb-1">Booking Number *</label><input type="text" value={form.booking_number} onChange={(e) => setForm({...form, booking_number: e.target.value})} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
              <div><label className="block text-sm text-muted mb-1">Supplier ID *</label><input type="text" value={form.supplier} onChange={(e) => setForm({...form, supplier: e.target.value})} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Supplier UUID" /></div>
              <div><label className="block text-sm text-muted mb-1">Fabric Category ID</label><input type="text" value={form.fabric_category} onChange={(e) => setForm({...form, fabric_category: e.target.value})} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Category UUID (optional)" /></div>
              <div><label className="block text-sm text-muted mb-1">Quantity (meters) *</label><input type="number" step="0.01" value={form.quantity_meters} onChange={(e) => setForm({...form, quantity_meters: e.target.value})} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
              <div><label className="block text-sm text-muted mb-1">Status</label>
                <select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="pending">Pending</option><option value="booked">Booked</option><option value="confirmed">Confirmed</option><option value="in_transit">In Transit</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div><label className="block text-sm text-muted mb-1">Expected Delivery</label><input type="date" value={form.expected_delivery} onChange={(e) => setForm({...form, expected_delivery: e.target.value})} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
              <div><label className="block text-sm text-muted mb-1">Notes</label><textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} rows={2} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg font-medium transition-colors disabled:opacity-50">{saving ? 'Saving...' : editingId ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2">Delete Booking?</h2>
            <p className="text-muted text-sm mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-3"><button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-body hover:text-heading">Cancel</button><button onClick={confirmDelete} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg">Delete</button></div>
          </div>
        </div>
      )}
    </Layout>
  );
}
