import { useState, useEffect, type FormEvent } from 'react';
import { logisticsApi, setupApi } from '../api/client';
import type { BookingScheduleItem } from '../api/client';
import SpreadsheetGrid from '../components/SpreadsheetGrid';
import type { SpreadsheetColumn } from '../components/SpreadsheetGrid';
import SearchableSelect from '../components/SearchableSelect';
import { useToast } from '../contexts/ToastContext';
import Layout from '../components/Layout';

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

function formatSnapshotDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  const isoDate = raw.slice(0, 10);
  const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${isoDate} ${time}`;
}

function toPatch(field: string, value: unknown): Record<string, unknown> | null {
  const patch: Record<string, unknown> = {};
  if (field === 'cut_qty' || field === 'garments_ready_qty') {
    patch[field] = Number(value) || 0;
  } else if (field === 'ex_factory_date') {
    patch[field] = value ? String(value) : null;
  } else if (field === 'ex_factory_notes') {
    patch[field] = String(value ?? '');
  } else {
    return null;
  }
  return patch;
}

export default function BookingSchedulePage() {
  const { toast } = useToast();
  const [items, setItems] = useState<BookingScheduleItem[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [shipments, setShipments] = useState<{ value: string; label: string }[]>([]);
  const [riskLevels, setRiskLevels] = useState<{ value: string; label: string }[]>([]);

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
      const res = await logisticsApi.getBookingSchedule({ page: '1', page_size: '10000' });
      setItems(res.data.results);
      setCount(res.data.count);
    } catch {
      toast('error', 'Failed to load booking schedule');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

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

  const openEdit = (item: BookingScheduleItem) => {
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

  const handleCellEdited = async (field: string, value: unknown, row: Record<string, unknown>) => {
    const rowId = typeof row.id === 'string' ? row.id : null;
    const patch = toPatch(field, value);
    if (!patch || !rowId) return;
    try {
      await logisticsApi.updateBookingScheduleItem(rowId, patch);
      toast('success', 'Schedule field updated');
      fetchData();
    } catch { toast('error', 'Failed to save schedule field'); }
  };

  const transitionable = items.filter(i => i.status === 'live' || i.status === 'in_work');
  const lastHits = items.filter(i => i.is_last_hit);
  const snapshotted = items.filter(i => i.snapshot_date);

  const gridData = items.map(i => ({
    id: i.id,
    week_ending: i.week_ending,
    shipment_number: i.shipment_number,
    po_number: i.po_number,
    hit_colour: i.hit_colour || null,
    hit_number: i.hit_number || null,
    status: i.status,
    cut_qty: i.cut_qty,
    garments_ready_qty: i.garments_ready_qty,
    ex_factory_date: i.ex_factory_date || null,
    ex_factory_notes: i.ex_factory_notes || '',
    risk_level_code: i.risk_level_detail?.code ?? (i.risk_level ? i.risk_level : ''),
    is_at_risk: i.is_at_risk,
    is_last_hit: i.is_last_hit,
  }));

  const columns: SpreadsheetColumn[] = [
    { title: 'Week Ending', field: 'week_ending', headerFilter: true, editor: 'date' },
    { title: 'Shipment #', field: 'shipment_number', headerFilter: true },
    { title: 'PO #', field: 'po_number', headerFilter: true },
    { title: 'Hit', field: 'hit_colour', headerFilter: true },
    { title: 'Status', field: 'status', headerFilter: true },
    { title: 'Cut Qty *', field: 'cut_qty', hozAlign: 'right', editor: 'input' },
    { title: 'Garments Ready *', field: 'garments_ready_qty', hozAlign: 'right', editor: 'input' },
    { title: 'Ex-Factory *', field: 'ex_factory_date', editor: 'date' },
    { title: 'Ex-Factory Notes *', field: 'ex_factory_notes', editor: 'input' },
    { title: 'Risk', field: 'risk_level_code', headerFilter: true },
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

        {lastHits.length > 0 && (
          <div className="bg-surface rounded-xl border border-border p-5 mb-4">
            <h2 className="text-sm font-semibold text-heading mb-3">Last Hit Markers</h2>
            <div className="flex flex-wrap gap-2">
              {lastHits.map(item => (
                <span key={item.id} data-testid={`last-hit-marker-${item.id}`}
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500 text-white">
                  {item.shipment_number} · Last Hit ({item.hit_colour || '—'})
                </span>
              ))}
            </div>
          </div>
        )}

        {snapshotted.length > 0 && (
          <div className="bg-surface rounded-xl border border-border p-5 mb-4">
            <h2 className="text-sm font-semibold text-heading mb-3">Last Snapshot</h2>
            <div className="flex flex-wrap gap-2">
              {snapshotted.map(item => (
                <span key={item.id} data-testid={`snapshot-marker-${item.id}`}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                  {item.shipment_number} · snapshot {formatSnapshotDate(item.snapshot_date)}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="bg-surface rounded-xl border border-border p-5 mb-4">
          <h2 className="text-sm font-semibold text-heading mb-3">Schedule Transitions</h2>
          <p className="text-xs text-muted mb-3">Advance weekly schedule items Live → In Work → Delivered; edit/delete are available via the grid row actions.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {transitionable.map(item => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-heading truncate">{item.shipment_number} — {item.hit_colour || item.week_ending}</p>
                  <p className="text-xs text-muted font-mono">{item.status.replace(/_/g, ' ')}</p>
                </div>
                <div className="shrink-0 flex gap-2">
                  {item.status === 'live' && (
                    <button onClick={() => handleTransition(item, 'in_work')} className="px-2 py-1 text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded transition-colors">Start Work</button>
                  )}
                  {item.status === 'in_work' && (
                    <button onClick={() => handleTransition(item, 'delivered')} className="px-2 py-1 text-xs bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded transition-colors">Mark Delivered</button>
                  )}
                </div>
              </div>
            ))}
            {transitionable.length === 0 && (
              <p className="text-sm text-muted">No in-flight schedule items.</p>
            )}
          </div>
        </div>

        <SpreadsheetGrid
          title="Booking Schedule"
          toolbar={true}
          exportable={true}
          columnChooser={true}
          actionColumn={true}
          paginationSize={25}
          height={480}
          loading={loading}
          data={gridData}
          columns={columns}
          onCellEdited={handleCellEdited}
          onAdd={openCreate}
          onEdit={(row) => {
            const item = items.find(i => i.id === row.id);
            if (item) openEdit(item);
          }}
          onDelete={(row) => setDeleteId(String(row.id))}
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
