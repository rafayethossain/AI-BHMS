import { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import SearchableSelect from '../components/SearchableSelect';
import { fabricApi, setupApi } from '../api/client';
import { FABRIC_ORDER_STATUSES } from '../api/client';
import type { FabricOrder, FabricSupplier, FabricCategory, FabricRiskStatus, FabricScheduleStatus, RiskLevel } from '../api/client';
import type { Column } from '../components/DataTable';
import { useToast } from '../contexts/ToastContext';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-surface-alt text-muted', submitted: 'bg-blue-500/20 text-blue-400',
  lab_dip_pending: 'bg-amber-500/20 text-amber-400', lab_dip_approved: 'bg-emerald-500/20 text-badge-emerald',
  bulk_approved: 'bg-emerald-500/20 text-badge-emerald', in_production: 'bg-violet-500/20 text-violet-400',
  shipped: 'bg-cyan-500/20 text-cyan-400', delivered: 'bg-emerald-500/20 text-badge-emerald',
  cancelled: 'bg-red-500/20 text-badge-red',
};

const RISK_COLORS: Record<string, string> = {
  none: 'bg-surface-alt text-muted', green: 'bg-emerald-500/20 text-badge-emerald',
  amber: 'bg-amber-500/20 text-amber-400', red: 'bg-red-500/20 text-badge-red',
  cyan: 'bg-cyan-500/20 text-cyan-400',
};

const SCHEDULE_DATE_LABELS: Record<string, string> = {
  lab_dip_required_date: 'Lab Dip Required', lab_dip_actual_date: 'Lab Dip Actual',
  lab_dip_approval_date: 'Lab Dip Approval', onboard_date: 'Onboard', eta_date: 'ETA', clearance_date: 'Clearance',
};

const SCHEDULE_DATE_FIELDS = ['lab_dip_required_date', 'lab_dip_actual_date', 'lab_dip_approval_date', 'onboard_date', 'eta_date', 'clearance_date'] as const;

const OWNER_CHAIN: Record<string, string[]> = {
  lab_dip: ['sales', 'merchandising'],
  onboard: ['sales', 'merchandising', 'planning'],
  eta: ['sales', 'merchandising', 'planning'],
  clearance: ['logistics'],
};

const OWNER_LABELS: Record<string, string> = {
  sales: 'Sales', merchandising: 'Merchandising', planning: 'Planning', logistics: 'Logistics', china_office: 'China Office',
};

const INITIAL_FORM = {
  supplier: '', fabric_category: '', quantity_meters: '', unit_price: '', status: 'draft',
  lab_dip_required_date: '', eta_date: '', notes: '',
};

export default function FabricOrdersPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<FabricOrder[]>([]);
  const [suppliers, setSuppliers] = useState<FabricSupplier[]>([]);
  const [categories, setCategories] = useState<FabricCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [riskOrderId, setRiskOrderId] = useState<string | null>(null);
  const [riskStatus, setRiskStatus] = useState<FabricRiskStatus | null>(null);
  const [riskLevels, setRiskLevels] = useState<RiskLevel[]>([]);
  const [selectedRiskLevel, setSelectedRiskLevel] = useState('');
  const [riskNotes, setRiskNotes] = useState('');
  const [riskSaving, setRiskSaving] = useState(false);
  const [scheduleDates, setScheduleDates] = useState<Record<string, string>>({});
  const [scheduleStatus, setScheduleStatus] = useState<FabricScheduleStatus | null>(null);
  const [handoffNotes, setHandoffNotes] = useState('');
  const pageSize = 10;

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(1); }, [search]);
  useEffect(() => {
    fabricApi.getSuppliers({ page_size: '200' }).then(r => setSuppliers(r.data.results)).catch(() => {});
    fabricApi.getCategories({ page_size: '200' }).then(r => setCategories(r.data.results)).catch(() => {});
    setupApi.getRiskLevels({ page_size: '200' }).then(r => setRiskLevels(r.data.results)).catch(() => {});
  }, []);

  const load = async () => {
    try {
      const res = await fabricApi.getOrders({ page_size: '200' });
      setItems(res.data.results);
    } catch { toast('error', 'Failed to load fabric orders');
    } finally { setLoading(false); }
  };

  const handleOpenModal = (item?: FabricOrder) => {
    if (item) {
      setEditingId(item.id);
      setForm({
        supplier: item.supplier, fabric_category: item.fabric_category || '',
        quantity_meters: item.quantity_meters, unit_price: item.unit_price, status: item.status,
        lab_dip_required_date: item.lab_dip_required_date || '', eta_date: item.eta_date || '', notes: item.notes,
      });
    } else { setEditingId(null); setForm({ ...INITIAL_FORM }); }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.supplier || !form.quantity_meters || !form.unit_price) {
      toast('warning', 'Supplier, quantity, and unit price are required'); return;
    }
    setSaving(true);
    try {
      const data: Record<string, unknown> = {
        supplier: form.supplier, fabric_category: form.fabric_category || null,
        quantity_meters: parseFloat(form.quantity_meters), unit_price: parseFloat(form.unit_price),
        status: form.status, lab_dip_required_date: form.lab_dip_required_date || null,
        eta_date: form.eta_date || null, notes: form.notes,
      };
      if (editingId) { await fabricApi.updateOrder(editingId, data); toast('success', 'Order updated'); }
      else { await fabricApi.createOrder(data); toast('success', 'Order created'); }
      setShowModal(false); load();
    } catch { toast('error', 'Failed to save order');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => { setDeleteId(id); };
  const confirmDelete = async () => {
    if (!deleteId) return;
    try { await fabricApi.deleteOrder(deleteId); toast('success', 'Order deleted'); setDeleteId(null); load(); }
    catch { toast('error', 'Failed to delete'); setDeleteId(null); }
  };

  const openRisk = async (id: string) => {
    setRiskOrderId(id);
    setRiskStatus(null);
    setScheduleStatus(null);
    setSelectedRiskLevel('');
    setRiskNotes('');
    setHandoffNotes('');
    setScheduleDates({});
    setShowModal(false);
    try {
      const res = await fabricApi.getRiskStatus(id);
      setRiskStatus(res.data);
      const dates: Record<string, string> = {};
      SCHEDULE_DATE_FIELDS.forEach(k => { dates[k] = ''; });
      if (res.data.effective_owners) Object.keys(res.data.effective_owners).forEach(k => { dates[k] = dates[k] ?? ''; });
      setScheduleDates(dates);
      fabricApi.getScheduleStatus(id).then(s => setScheduleStatus(s.data)).catch(() => {});
    } catch { toast('error', 'Failed to load risk status'); }
  };

  const saveRisk = async () => {
    if (!riskOrderId || !selectedRiskLevel) { toast('warning', 'Select a risk level'); return; }
    setRiskSaving(true);
    try {
      await fabricApi.setRisk(riskOrderId, { risk_level: selectedRiskLevel, risk_notes: riskNotes });
      toast('success', 'Risk updated'); setRiskOrderId(null); load();
    } catch { toast('error', 'Failed to update risk');
    } finally { setRiskSaving(false); }
  };

  const recomputeRisk = async () => {
    if (!riskOrderId) return;
    setRiskSaving(true);
    try {
      await fabricApi.recomputeRisk(riskOrderId);
      toast('success', 'Risk recomputed'); setRiskOrderId(null); load();
    } catch { toast('error', 'Failed to recompute risk');
    } finally { setRiskSaving(false); }
  };

  const saveScheduleDates = async () => {
    if (!riskOrderId) return;
    setRiskSaving(true);
    try {
      const payload: Record<string, string | null> = {};
      SCHEDULE_DATE_FIELDS.forEach(k => { payload[k] = scheduleDates[k] || null; });
      await fabricApi.updateScheduleDates(riskOrderId, payload);
      toast('success', 'Schedule dates updated'); setRiskOrderId(null); load();
    } catch { toast('error', 'Failed to update schedule dates');
    } finally { setRiskSaving(false); }
  };

  const performHandoff = async (dateKey: string) => {
    if (!riskOrderId) return;
    setRiskSaving(true);
    try {
      await fabricApi.handoffSchedule(riskOrderId, dateKey, handoffNotes);
      toast('success', 'Date handed off to next role');
      const s = await fabricApi.getScheduleStatus(riskOrderId);
      setScheduleStatus(s.data);
      const dates: Record<string, string> = {};
      SCHEDULE_DATE_FIELDS.forEach(k => { dates[k] = ''; });
      if (s.data.effective_owners) Object.keys(s.data.effective_owners).forEach(k => { dates[k] = dates[k] ?? ''; });
      setScheduleDates(dates);
      load();
    } catch { toast('error', 'Failed to hand off date');
    } finally { setRiskSaving(false); }
  };

  const filtered = useMemo(() => items.filter(i => i.order_number.toLowerCase().includes(search.toLowerCase())), [items, search]);
  const pagedData = useMemo(() => { const s = (page - 1) * pageSize; return filtered.slice(s, s + pageSize); }, [filtered, page]);

  const columns: Column[] = [
    { key: 'order_number', label: 'Order #', sortable: true, render: (v) => <span className="font-mono text-heading">{String(v)}</span> },
    { key: 'supplier_name', label: 'Supplier', sortable: true },
    { key: 'fabric_category_name', label: 'Category', render: (v) => <span className="text-muted">{v ? String(v) : '-'}</span> },
    { key: 'quantity_meters', label: 'Qty (m)', render: (v) => <span className="font-mono">{String(v)}</span> },
    { key: 'total_price', label: 'Total', render: (v) => <span className="font-mono text-emerald-700">{v ? `$${Number(v).toFixed(2)}` : '-'}</span> },
    { key: 'status', label: 'Status', render: (_v, row) => {
      const s = row.status as string;
      return <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[s] || 'bg-surface-alt text-muted'}`}>{s.replace(/_/g, ' ')}</span>;
    }},
    { key: 'risk_level_code', label: 'Risk', render: (v, row) => {
      const code = v ? String(v) : 'none';
      const item = row as unknown as FabricOrder;
      return <span className={`px-2 py-1 rounded-full text-xs font-medium ${RISK_COLORS[code] || 'bg-surface-alt text-muted'}`} title={item.risk_notes || ''}>{item.risk_level_name || code}</span>;
    }},
    { key: 'eta_date', label: 'ETA', render: (v) => <span className="text-muted">{v ? String(v) : '-'}</span> },
    { key: 'actions', label: 'Actions', className: 'text-right', render: (_v, row) => {
      const item = row as unknown as FabricOrder;
      return <><button onClick={(e) => { e.stopPropagation(); openRisk(item.id); }} className="text-heading hover:text-amber-500 mr-3 text-sm">Risk</button><button onClick={(e) => { e.stopPropagation(); handleOpenModal(item); }} className="text-heading hover:text-emerald-500 mr-3 text-sm">Edit</button><button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="text-red-500 hover:text-red-400 text-sm">Delete</button></>;
    }},
  ];

  if (loading) return <Layout><div className="p-6 flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" /></div></Layout>;

  const supplierOptions = suppliers.map(s => ({ value: s.id, label: `${s.name} (${s.code})`, description: s.country_name || '' }));
  const categoryOptions = categories.map(c => ({ value: c.id, label: c.name, description: c.code }));

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Fabric Orders</h1>
            <p className="text-sm text-muted mt-1">Procurement orders with lab dip tracking (GC-006)</p>
          </div>
          <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">+ New Order</button>
        </div>
        <DataTable data={pagedData as unknown as Record<string, unknown>[]} columns={columns} totalCount={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search by order number..." loading={loading} onRowClick={(row) => handleOpenModal(row as unknown as FabricOrder)} />
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border"><h2 className="text-lg font-semibold">{editingId ? 'Edit' : 'New'} Fabric Order</h2></div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-muted mb-1">Supplier *</label>
                <SearchableSelect options={supplierOptions} value={form.supplier || null} onChange={(v) => setForm({ ...form, supplier: String(v || '') })} placeholder="Select supplier..." disabled={!!editingId} />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Fabric Category</label>
                <SearchableSelect options={categoryOptions} value={form.fabric_category || null} onChange={(v) => setForm({ ...form, fabric_category: String(v || '') })} placeholder="Select category..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm text-muted mb-1">Quantity (m) *</label><input type="number" step="0.01" value={form.quantity_meters} onChange={(e) => setForm({ ...form, quantity_meters: e.target.value })} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                <div><label className="block text-sm text-muted mb-1">Unit Price *</label><input type="number" step="0.0001" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  {FABRIC_ORDER_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm text-muted mb-1">Lab Dip Required</label><input type="date" value={form.lab_dip_required_date} onChange={(e) => setForm({ ...form, lab_dip_required_date: e.target.value })} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                <div><label className="block text-sm text-muted mb-1">ETA</label><input type="date" value={form.eta_date} onChange={(e) => setForm({ ...form, eta_date: e.target.value })} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
              </div>
              <div><label className="block text-sm text-muted mb-1">Notes</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">{saving ? 'Saving...' : editingId ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
      {riskOrderId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Risk & Schedule</h2>
                <p className="text-sm text-muted mt-1">{riskStatus?.order_number ? `Order ${riskStatus.order_number}` : 'Loading...'}</p>
              </div>
              <button onClick={() => setRiskOrderId(null)} className="text-muted hover:text-heading text-xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-5">
              {riskStatus && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface-alt rounded-lg p-4">
                      <p className="text-xs text-muted mb-1">Policy</p>
                      <p className="font-mono text-heading">{riskStatus.policy_code || '-'}</p>
                    </div>
                    <div className="bg-surface-alt rounded-lg p-4">
                      <p className="text-xs text-muted mb-1">Current Risk</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium inline-block ${RISK_COLORS[riskStatus.risk_level_code || 'none'] || 'bg-surface-alt text-muted'}`}>{riskStatus.risk_level_name || 'none'}</span>
                    </div>
                  </div>
                  {riskStatus.effective_owners && Object.keys(riskStatus.effective_owners).length > 0 && (
                    <div className="bg-surface-alt rounded-lg p-4 space-y-1">
                      <p className="text-xs text-muted mb-1">Date Owners</p>
                      {Object.entries(riskStatus.effective_owners).map(([key, owner]) => (
                        <div key={key} className="flex justify-between text-sm"><span className="text-muted">{SCHEDULE_DATE_LABELS[key] || key}</span><span className="text-heading capitalize">{owner.replace(/_/g, ' ')}</span></div>
                      ))}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm text-muted mb-1">Risk Level</label>
                    <select value={selectedRiskLevel} onChange={(e) => setSelectedRiskLevel(e.target.value)} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500">
                      <option value="">Select risk level...</option>
                      {riskLevels.map(l => <option key={l.id} value={l.id}>{l.name} ({l.code})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-muted mb-1">Risk Notes</label>
                    <textarea value={riskNotes} onChange={(e) => setRiskNotes(e.target.value)} rows={2} placeholder="e.g. over-tolerance, late lab dip..." className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={saveRisk} disabled={riskSaving} className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">{riskSaving ? 'Saving...' : 'Save Risk'}</button>
                    <button onClick={recomputeRisk} disabled={riskSaving} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">Recompute</button>
                  </div>
                  <div className="border-t border-border pt-4">
                    <p className="text-sm font-medium text-heading mb-3">Schedule Dates</p>
                    <div className="grid grid-cols-2 gap-4">
                      {SCHEDULE_DATE_FIELDS.map(k => (
                        <div key={k}>
                          <label className="block text-sm text-muted mb-1">{SCHEDULE_DATE_LABELS[k]}</label>
                          <input type="date" value={scheduleDates[k] || ''} onChange={(e) => setScheduleDates({ ...scheduleDates, [k]: e.target.value })} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                        </div>
                      ))}
                    </div>
                    <button onClick={saveScheduleDates} disabled={riskSaving} className="mt-3 w-full px-4 py-2 bg-surface-alt hover:bg-surface text-heading border border-border rounded-lg text-sm font-medium transition-colors disabled:opacity-50">Update Schedule Dates</button>
                  </div>
                  <div className="border-t border-border pt-4">
                    <p className="text-sm font-medium text-heading mb-1">Role Handoff (GC-017)</p>
                    <p className="text-xs text-muted mb-3">sales → merchandising → planning; clearance = logistics; China office assists</p>
                    {scheduleStatus && (
                      <>
                        <div className="space-y-2">
                          {Object.keys(OWNER_CHAIN).map(key => {
                            const chain = OWNER_CHAIN[key];
                            const owner = scheduleStatus.effective_owners[key] || '';
                            const idx = chain.indexOf(owner);
                            const next = idx >= 0 && idx + 1 < chain.length ? chain[idx + 1] : null;
                            return (
                              <div key={key} className="flex items-center justify-between bg-surface-alt rounded-lg px-3 py-2">
                                <div>
                                  <p className="text-xs text-muted">{SCHEDULE_DATE_LABELS[key]}</p>
                                  <p className="text-sm text-heading capitalize">{OWNER_LABELS[owner] || owner.replace(/_/g, ' ')}</p>
                                </div>
                                {next ? (
                                  <button onClick={() => performHandoff(key)} disabled={riskSaving} className="px-3 py-1 text-xs rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors disabled:opacity-50">Hand off to {OWNER_LABELS[next] || next}</button>
                                ) : <span className="text-xs text-muted">Final owner</span>}
                              </div>
                            );
                          })}
                        </div>
                        <input value={handoffNotes} onChange={(e) => setHandoffNotes(e.target.value)} placeholder="Handoff note (optional)..." className="mt-3 w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                        {scheduleStatus.handoffs.length > 0 && (
                          <div className="mt-4">
                            <p className="text-xs text-muted mb-2">Handoff History</p>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {scheduleStatus.handoffs.slice().reverse().map((h, i) => (
                                <div key={i} className="flex justify-between text-xs bg-surface-alt rounded px-3 py-1.5">
                                  <span className="text-muted capitalize">{h.date_key.replace(/_/g, ' ')}</span>
                                  <span className="text-heading">{OWNER_LABELS[h.from_role] || h.from_role} → {OWNER_LABELS[h.to_role] || h.to_role}</span>
                                  <span className="text-muted font-mono">{h.handed_off_by || '-'}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2">Delete Order?</h2>
            <p className="text-muted text-sm mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-3"><button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-body hover:text-heading">Cancel</button><button onClick={confirmDelete} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg">Delete</button></div>
          </div>
        </div>
      )}
    </Layout>
  );
}
