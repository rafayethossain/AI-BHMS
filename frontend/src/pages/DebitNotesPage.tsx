import { useState, useEffect, type FormEvent } from 'react';
import { commercialApi } from '../api/client';
import type { DebitNote, DebitNoteDashboard, OverToleranceCandidate } from '../api/client';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { useToast } from '../contexts/ToastContext';
import Layout from '../components/Layout';

const STATUS_COLORS: Record<string, string> = {
  pro_forma: 'bg-amber-500/20 text-badge-amber',
  issued: 'bg-blue-500/20 text-badge-blue',
  paid: 'bg-emerald-500/20 text-badge-emerald',
};

const DEBIT_TYPE_OPTIONS = [
  { value: 'fabric_over_tolerance', label: 'Fabric Over-Tolerance' },
  { value: 'fabric_shortage', label: 'Fabric Shortage (Trimmings)' },
  { value: 'trims_shortage', label: 'Trims Shortage' },
  { value: 'final_hit_shortage', label: 'Final Hit Shortage' },
  { value: 'other', label: 'Other' },
];

const PARTY_TYPE_OPTIONS = [
  { value: 'factory', label: 'Factory' },
  { value: 'fabric_supplier', label: 'Fabric Supplier' },
  { value: 'trim_supplier', label: 'Trim Supplier' },
  { value: 'other', label: 'Other' },
];

const emptyForm = {
  purchase_order: '', debit_type: 'other', party_type: 'factory',
  debited_party: '', amount: '', currency: '', shortage_units: '0.00',
  tolerance_pct: '5.00', reason: '', notes: '',
};

export default function DebitNotesPage() {
  const { toast } = useToast();
  const [notes, setNotes] = useState<DebitNote[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dashboard, setDashboard] = useState<DebitNoteDashboard | null>(null);
  const [overTolerance, setOverTolerance] = useState<OverToleranceCandidate[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingDN, setEditingDN] = useState<DebitNote | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), page_size: '25' };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      params.ordering = sortOrder === 'desc' ? `-${sortField}` : sortField;
      const res = await commercialApi.getDebitNotes(params);
      setNotes(res.data.results);
      setCount(res.data.count);
    } catch { toast('error', 'Failed to load debit notes'); } finally { setLoading(false); }
  };

  const fetchDashboard = async () => {
    try {
      const res = await commercialApi.getDebitNotesDashboard();
      setDashboard(res.data);
    } catch { /* non-critical */ }
  };

  const fetchOverTolerance = async () => {
    try {
      const res = await commercialApi.getPendingOverTolerance();
      setOverTolerance(res.data.results);
    } catch { /* non-critical */ }
  };

  useEffect(() => { fetchData(); }, [search, statusFilter, page, sortField, sortOrder]);
  useEffect(() => { fetchDashboard(); fetchOverTolerance(); }, []);

  const refresh = () => { fetchData(); fetchDashboard(); fetchOverTolerance(); };

  const openCreate = (candidate?: OverToleranceCandidate) => {
    setEditingDN(null);
    setForm({
      ...emptyForm,
      purchase_order: candidate ? String(candidate.po_id) : '',
      tolerance_pct: candidate ? candidate.tolerance_pct : '5.00',
      reason: candidate ? `Shipped ${candidate.quantity_variance_pct}% over the ${candidate.tolerance_pct}% tolerance` : '',
    });
    setShowModal(true);
  };

  const openEdit = (dn: DebitNote) => {
    setEditingDN(dn);
    setForm({
      purchase_order: dn.purchase_order || '',
      debit_type: dn.debit_type, party_type: dn.party_type,
      debited_party: dn.debited_party || '', amount: dn.amount,
      currency: dn.currency || '', shortage_units: dn.shortage_units,
      tolerance_pct: dn.tolerance_pct, reason: dn.reason, notes: dn.notes || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingDN) {
        await commercialApi.updateDebitNote(editingDN.id, form as unknown as Record<string, unknown>);
        toast('success', 'Debit note updated');
      } else {
        await commercialApi.createDebitNote(form as unknown as Record<string, unknown>);
        toast('success', 'Debit note created (pro forma)');
      }
      setShowModal(false);
      refresh();
    } catch { toast('error', editingDN ? 'Failed to update debit note' : 'Failed to create debit note'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await commercialApi.deleteDebitNote(id); setDeleteId(null); toast('success', 'Debit note deleted'); refresh(); } catch { toast('error', 'Failed to delete debit note'); }
  };

  const handleIssue = async (dn: DebitNote) => {
    setActing(true);
    try { await commercialApi.issueDebitNote(dn.id); toast('success', `Issued ${dn.debit_number} via compliance email`); refresh(); } catch { toast('error', 'Failed to issue debit note'); } finally { setActing(false); }
  };

  const handleMarkPaid = async (dn: DebitNote) => {
    setActing(true);
    try { await commercialApi.markDebitNotePaid(dn.id); toast('success', `${dn.debit_number} marked paid`); refresh(); } catch { toast('error', 'Failed to mark debit note paid'); } finally { setActing(false); }
  };

  const handleExport = async () => {
    try {
      const res = await commercialApi.exportDebitNotes();
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'debit_notes.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch { toast('error', 'Failed to export debit notes CSV'); }
  };

  const handleSort = (field: string, order: 'asc' | 'desc') => { setSortField(field); setSortOrder(order); };

  const columns: Column[] = [
    { key: 'debit_number', label: 'Debit #', sortable: true, render: (v) => <span className="font-mono text-emerald-400">{String(v)}</span> },
    { key: 'po_number', label: 'PO #', sortable: true, render: (v) => <span className="font-mono text-body">{v ? String(v) : '—'}</span> },
    { key: 'buyer_name', label: 'Buyer', sortable: true, render: (v) => <span className="text-body">{v ? String(v) : '—'}</span> },
    { key: 'debit_type_display', label: 'Type', sortable: false },
    { key: 'amount', label: 'Amount', sortable: true, render: (v, row) => {
      const dn = row as unknown as DebitNote;
      return <span className="text-body">{String(v)} {dn.currency_code || ''}</span>;
    } },
    { key: 'status', label: 'Status', sortable: true,
      render: (v) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[String(v)] || ''}`}>{String(v)}</span> },
    { key: 'compliance_email_sent', label: 'Compliance', sortable: false, render: (v) => (v ? <span className="text-xs text-badge-blue font-medium">sent</span> : <span className="text-xs text-muted">pending</span>) },
    { key: 'raised_at', label: 'Raised', sortable: true, render: (v) => (v ? new Date(String(v)).toLocaleDateString() : '—') },
    { key: 'id', label: 'Actions', className: 'text-right', render: (_v, row) => {
      const dn = row as unknown as DebitNote;
      return (
        <div className="flex justify-end gap-1.5">
          {dn.status === 'pro_forma' && (
            <button onClick={(e) => { e.stopPropagation(); handleIssue(dn); }} disabled={acting} className="text-xs px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-badge-blue rounded transition-colors">Issue</button>
          )}
          {dn.status === 'issued' && (
            <button onClick={(e) => { e.stopPropagation(); handleMarkPaid(dn); }} disabled={acting} className="text-xs px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-badge-emerald rounded transition-colors">Mark Paid</button>
          )}
          <button onClick={(e) => { e.stopPropagation(); openEdit(dn); }} className="text-xs px-2 py-1 bg-surface-alt hover:bg-surface-alt text-heading rounded transition-colors">Edit</button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteId(String(dn.id)); }} className="text-xs px-2 py-1 bg-red-900/50 hover:bg-red-800 text-red-400 rounded transition-colors">Del</button>
        </div>
      );
    }},
  ];

  const cards = [
    { label: 'Total', value: dashboard?.total ?? 0, color: 'text-heading' },
    { label: 'Pro Forma', value: dashboard?.by_status?.pro_forma ?? 0, color: 'text-badge-amber' },
    { label: 'Issued', value: dashboard?.by_status?.issued ?? 0, color: 'text-badge-blue' },
    { label: 'Paid', value: dashboard?.by_status?.paid ?? 0, color: 'text-badge-emerald' },
    { label: 'Compliance Emails', value: dashboard?.compliance_emails_sent ?? 0, color: 'text-heading' },
    { label: 'Open Value', value: dashboard?.pending_value ? `$${dashboard.pending_value}` : '$0.00', color: 'text-heading' },
  ];

  const inputCls = 'w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500';

  return (
    <Layout>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Debit Notes</h1>
            <p className="text-muted text-sm mt-1">{count} total debit notes</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="px-4 py-2 bg-surface-alt hover:bg-surface-alt text-heading rounded-lg text-sm font-medium transition-colors">
              Export CSV
            </button>
            <button onClick={() => openCreate()} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
              + New Debit Note
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {cards.map((c) => (
            <div key={c.label} className="bg-surface rounded-xl border border-border p-4">
              <div className="text-xs text-muted">{c.label}</div>
              <div className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</div>
            </div>
          ))}
        </div>

        {overTolerance.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-sm font-bold text-badge-amber">Over-Tolerance Debits Due ({overTolerance.length})</h2>
                <p className="text-xs text-muted">Shipped over the GC tolerance — debits must be raised as soon as the issue is confirmed.</p>
              </div>
            </div>
            <div className="space-y-2">
              {overTolerance.map((c) => (
                <div key={c.po_number} className="flex items-center justify-between bg-surface/60 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-mono text-heading">{c.po_number}</span>
                    <span className="text-muted">{c.buyer_name}</span>
                    <span className="text-body">{String(c.ordered_quantity)} ordered / {c.shipped_quantity} shipped</span>
                    <span className="text-badge-amber font-medium">{c.quantity_variance_pct}% over</span>
                    <span className="text-xs text-muted">tolerance {c.tolerance_pct}%</span>
                  </div>
                  <button onClick={() => openCreate(c)} className="text-xs px-2 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-badge-amber rounded transition-colors">Create Debit</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-surface rounded-xl border border-border p-3 mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">Filter:</span>
          {[{ value: '', label: 'All' }, ...Object.keys(STATUS_COLORS).map((s) => ({ value: s, label: s.replace('_', ' ') }))].map((opt) => (
            <button key={opt.value || 'all'} onClick={() => { setStatusFilter(opt.value); setPage(1); }}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${statusFilter === opt.value ? 'bg-emerald-600/20 text-badge-emerald' : 'bg-surface-alt text-muted hover:text-heading'}`}>
              {opt.label}
            </button>
          ))}
        </div>

        <DataTable
          data={notes as unknown as Record<string, unknown>[]}
          columns={columns}
          totalCount={count}
          page={page}
          pageSize={25}
          onPageChange={setPage}
          searchValue={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          searchPlaceholder="Search debit notes..."
          onSort={handleSort}
          sortField={sortField}
          sortOrder={sortOrder}
          loading={loading}
        />
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">{editingDN ? `Edit ${editingDN.debit_number}` : 'New Debit Note (Pro Forma)'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-body mb-1">Purchase Order ID *</label>
                  <input required value={form.purchase_order} onChange={(e) => setForm({ ...form, purchase_order: e.target.value })}
                    className={inputCls} placeholder="PO UUID" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Debit Type *</label>
                  <select value={form.debit_type} onChange={(e) => setForm({ ...form, debit_type: e.target.value })} className={inputCls}>
                    {DEBIT_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Party Type *</label>
                  <select value={form.party_type} onChange={(e) => setForm({ ...form, party_type: e.target.value })} className={inputCls}>
                    {PARTY_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Debited Party</label>
                  <input value={form.debited_party} onChange={(e) => setForm({ ...form, debited_party: e.target.value })}
                    className={inputCls} placeholder="Factory / supplier name" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Amount *</label>
                  <input required type="number" step="0.01" min="0.01" value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Currency ID</label>
                  <input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    className={inputCls} placeholder="Currency UUID" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Shortage Units</label>
                  <input type="number" step="0.01" min="0" value={form.shortage_units}
                    onChange={(e) => setForm({ ...form, shortage_units: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Tolerance %</label>
                  <input type="number" step="0.01" min="0" value={form.tolerance_pct}
                    onChange={(e) => setForm({ ...form, tolerance_pct: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Reason *</label>
                <textarea required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className={inputCls} rows={3} placeholder="Why this debit is being raised" />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className={inputCls} rows={2} />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white text-sm rounded-lg transition-colors">
                  {saving ? 'Saving...' : editingDN ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2">Delete Debit Note?</h2>
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
