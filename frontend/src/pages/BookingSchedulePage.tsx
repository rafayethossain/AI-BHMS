import { useState, useEffect, type FormEvent } from 'react';
import { logisticsApi, setupApi } from '../api/client';
import type { BookingScheduleItem } from '../api/client';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import SearchableSelect from '../components/SearchableSelect';
import { useToast } from '../contexts/ToastContext';
import Layout from '../components/Layout';

const STATUS_COLORS: Record<string, string> = {
  live: 'bg-blue-500/20 text-badge-blue',
  in_work: 'bg-amber-500/20 text-badge-amber',
  delivered: 'bg-emerald-500/20 text-badge-emerald',
};

const STATUSES = [
  { value: 'live', label: 'Live' },
  { value: 'in_work', label: 'In Work' },
  { value: 'delivered', label: 'Delivered' },
];

function nextWeekEnding(base: Date): string {
  const d = new Date(base);
  const day = d.getDay();
  const diff = day === 5 ? 7 : (5 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export default function BookingSchedulePage() {
  const { toast } = useToast();
  const [items, setItems] = useState<BookingScheduleItem[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('week_ending');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [shipments, setShipments] = useState<{ value: string; label: string }[]>([]);
  const [riskLevels, setRiskLevels] = useState<{ value: string; label: string }[]>([]);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    shipment: '',
    hit: '',
    status: 'live',
    cut_qty: '',
    garments_ready_qty: '',
    ex_factory_date: '',
    ex_factory_notes: '',
    risk_level: '',
    week_ending: nextWeekEnding(new Date()),
    notes: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), page_size: '25' };
      if (search) params.search = search;
      params.ordering = sortOrder === 'desc' ? `-${sortField}` : sortField;
      if (filters.status) params.status = filters.status;
      if (filters.risk_level) params.risk_level = filters.risk_level;
      if (filters.week_ending) params.week_ending = filters.week_ending;
      const res = await logisticsApi.getBookingSchedule(params);
      setItems(res.data.results);
      setCount(res.data.count);
    } catch {
      toast('error', 'Failed to load booking schedule');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [search, page, sortField, sortOrder, filters]);

  useEffect(() => {
    logisticsApi.getShipments({ page_size: '100' }).then(r => {
      setShipments(r.data.results.map(s => ({ value: s.id, label: `${s.shipment_number} (${s.po_number})` })));
    }).catch(() => {});
    setupApi.getRiskLevels({ page_size: '100' }).then(r => {
      setRiskLevels(r.data.results.map(rl => ({ value: rl.id, label: `${rl.code} - ${rl.name}` })));
    }).catch(() => {});
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      shipment: '', hit: '', status: 'live', cut_qty: '', garments_ready_qty: '',
      ex_factory_date: '', ex_factory_notes: '', risk_level: '',
      week_ending: nextWeekEnding(new Date()), notes: '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        shipment: form.shipment,
        status: form.status,
        week_ending: form.week_ending,
        cut_qty: Number(form.cut_qty) || 0,
        garments_ready_qty: Number(form.garments_ready_qty) || 0,
      };
      if (form.hit) payload.hit = form.hit;
      if (form.ex_factory_date) payload.ex_factory_date = form.ex_factory_date;
      if (form.ex_factory_notes) payload.ex_factory_notes = form.ex_factory_notes;
      if (form.risk_level) payload.risk_level = form.risk_level;
      if (form.notes) payload.notes = form.notes;
      if (editingId) {
        await logisticsApi.updateBookingScheduleItem(editingId, payload);
        toast('success', 'Schedule item updated');
      } else {
        await logisticsApi.createBookingScheduleItem(payload);
        toast('success', 'Schedule item created');
      }
      setShowModal(false);
      setEditingId(null);
      fetchData();
    } catch { toast('error', editingId ? 'Failed to update schedule item' : 'Failed to create schedule item'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await logisticsApi.deleteBookingScheduleItem(id); setDeleteId(null); toast('success', 'Schedule item deleted'); fetchData(); } catch { toast('error', 'Failed to delete schedule item'); }
  };

  const handleTransition = async (item: BookingScheduleItem, next: string) => {
    try {
      await logisticsApi.transitionBookingScheduleItem(item.id, next);
      toast('success', `Status changed to ${next.replace(/_/g, ' ')}`);
      fetchData();
    } catch { toast('error', 'Failed to transition status'); }
  };

  const handleSort = (field: string, order: 'asc' | 'desc') => { setSortField(field); setSortOrder(order); };

  const columns: Column[] = [
    { key: 'week_ending', label: 'Week Ending', sortable: true, filterable: true, render: (v) => <span className="font-mono text-heading">{String(v)}</span> },
    { key: 'shipment_number', label: 'Shipment #', sortable: true, render: (v) => <span className="font-mono">{String(v)}</span> },
    { key: 'po_number', label: 'PO #', sortable: true, render: (v) => <span className="font-mono">{String(v)}</span> },
    { key: 'hit_colour', label: 'Hit', sortable: true, render: (v) => v ? <span className="text-body">{String(v)}</span> : <span className="text-faint">—</span> },
    { key: 'status', label: 'Status', sortable: true, filterable: true, filterOptions: ['live', 'in_work', 'delivered'],
      render: (v) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[String(v)] || ''}`}>{String(v).replace(/_/g, ' ')}</span> },
    { key: 'cut_qty', label: 'Cut Qty', sortable: true, render: (v) => <span>{v ? String(v) : '-'}</span> },
    { key: 'garments_ready_qty', label: 'Garments Ready', sortable: true, render: (v, row) => (
      <span className={row.is_at_risk ? 'text-badge-amber font-medium' : ''}>{v ? String(v) : '-'}</span>
    )},
    { key: 'ex_factory_date', label: 'Ex-Factory', sortable: true, render: (v) => <span>{v ? String(v) : '-'}</span> },
    { key: 'risk_level_detail', label: 'Risk', sortable: false, filterable: true, render: (v) => {
      if (!v) return <span className="text-faint">—</span>;
      const rl = v as { code: string; name: string; color: string };
      return <span className="px-2 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: rl.color }}>{rl.code}</span>;
    }},
    { key: 'id', label: 'Actions', className: 'text-right', render: (_v, row) => {
      const item = items.find(i => String(i.id) === String(row.id));
      const next: Record<string, string | undefined> = { live: 'in_work', in_work: 'delivered' };
      const nxt = item ? next[item.status] : undefined;
      return (
        <div className="flex justify-end gap-3">
          {nxt && (
            <button onClick={(e) => { e.stopPropagation(); if (item) handleTransition(item, nxt); }}
              className="text-sm text-emerald-500 hover:text-emerald-400">{nxt === 'in_work' ? 'Start Work' : 'Mark Delivered'}</button>
          )}
          <button onClick={(e) => {
            e.stopPropagation();
            if (item) {
              setEditingId(item.id);
              setForm({
                shipment: item.shipment || '',
                hit: item.hit || '',
                status: item.status || 'live',
                cut_qty: String(item.cut_qty ?? ''),
                garments_ready_qty: String(item.garments_ready_qty ?? ''),
                ex_factory_date: item.ex_factory_date || '',
                ex_factory_notes: item.ex_factory_notes || '',
                risk_level: item.risk_level || '',
                week_ending: item.week_ending || '',
                notes: item.notes || '',
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
            <h1 className="text-2xl font-bold">Booking Schedule</h1>
            <p className="text-muted text-sm mt-1">{count} weekly schedule items</p>
          </div>
          <button onClick={openCreate} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
            + New Schedule Item
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
          searchPlaceholder="Search schedule..."
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
            <h2 className="text-lg font-bold mb-4">{editingId ? 'Edit Schedule Item' : 'New Schedule Item'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-body mb-1">Shipment *</label>
                <SearchableSelect options={shipments} value={form.shipment}
                  onChange={(v) => setForm({ ...form, shipment: String(v || '') })}
                  placeholder="Select shipment" required />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Week Ending (Friday) *</label>
                <input required type="date" value={form.week_ending} onChange={(e) => setForm({ ...form, week_ending: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-body mb-1">Status</label>
                  <SearchableSelect options={STATUSES} value={form.status}
                    onChange={(v) => setForm({ ...form, status: String(v || 'live') })}
                    placeholder="Select status" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Risk Level</label>
                  <SearchableSelect options={riskLevels} value={form.risk_level}
                    onChange={(v) => setForm({ ...form, risk_level: String(v || '') })}
                    placeholder="Select risk" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-body mb-1">Cut Qty</label>
                  <input type="number" min="0" value={form.cut_qty} onChange={(e) => setForm({ ...form, cut_qty: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Garments Ready</label>
                  <input type="number" min="0" value={form.garments_ready_qty} onChange={(e) => setForm({ ...form, garments_ready_qty: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Ex-Factory Date</label>
                <input type="date" value={form.ex_factory_date} onChange={(e) => setForm({ ...form, ex_factory_date: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Ex-Factory Notes</label>
                <textarea value={form.ex_factory_notes} onChange={(e) => setForm({ ...form, ex_factory_notes: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" rows={2} />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
            <h2 className="text-lg font-bold mb-2">Delete Schedule Item?</h2>
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
