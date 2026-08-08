import { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import { fabricApi } from '../api/client';
import type { FabricBooking } from '../api/client';
import type { Column } from '../components/DataTable';
import { useToast } from '../contexts/ToastContext';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-surface-alt text-muted', booked: 'bg-blue-500/20 text-blue-400',
  confirmed: 'bg-emerald-500/20 text-badge-emerald', in_transit: 'bg-amber-500/20 text-amber-400',
  delivered: 'bg-emerald-500/20 text-badge-emerald', cancelled: 'bg-red-500/20 text-badge-red',
};

const INITIAL_FORM = { booking_number: '', supplier: '', fabric_category: '', quantity_meters: '', status: 'pending', expected_delivery: '', notes: '' };

export default function FabricBookingsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<FabricBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const pageSize = 10;

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(1); }, [search]);

  const load = async () => {
    try {
      const res = await fabricApi.getBookings({ page_size: '100' });
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

  const filtered = useMemo(() => items.filter(i => i.booking_number.toLowerCase().includes(search.toLowerCase())), [items, search]);
  const pagedData = useMemo(() => { const s = (page - 1) * pageSize; return filtered.slice(s, s + pageSize); }, [filtered, page]);

  const columns: Column[] = [
    { key: 'booking_number', label: 'Booking #', sortable: true, render: (v) => <span className="font-mono text-heading">{String(v)}</span> },
    { key: 'supplier_name', label: 'Supplier', sortable: true },
    { key: 'fabric_category_name', label: 'Category', render: (v) => <span className="text-muted">{v ? String(v) : '-'}</span> },
    { key: 'quantity_meters', label: 'Qty (m)', render: (v) => <span className="font-mono">{String(v)}</span> },
    { key: 'status', label: 'Status', render: (_v, row) => {
      const s = row.status as string;
      return <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[s] || 'bg-surface-alt text-muted'}`}>{s}</span>;
    }},
    { key: 'expected_delivery', label: 'Expected', render: (v) => <span className="text-muted">{v ? String(v) : '-'}</span> },
    { key: 'actions', label: 'Actions', className: 'text-right', render: (_v, row) => {
      const item = row as unknown as FabricBooking;
      return <><button onClick={(e) => { e.stopPropagation(); handleOpenModal(item); }} className="text-heading hover:text-emerald-500 mr-3 text-sm">Edit</button><button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="text-red-500 hover:text-red-400 text-sm">Delete</button></>;
    }},
  ];

  if (loading) return <Layout><div className="p-6 flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" /></div></Layout>;

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Fabric Bookings</h1>
          <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">+ New Booking</button>
        </div>
        <DataTable data={pagedData as unknown as Record<string, unknown>[]} columns={columns} totalCount={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search by booking number..." loading={loading} onRowClick={(row) => handleOpenModal(row as unknown as FabricBooking)} />
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
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">{saving ? 'Saving...' : editingId ? 'Update' : 'Create'}</button>
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
