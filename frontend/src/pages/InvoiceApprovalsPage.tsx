import { useState, useEffect, type FormEvent } from 'react';
import { commercialApi } from '../api/client';
import type { InvoiceApproval, InvoiceApprovalDashboard } from '../api/client';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { useToast } from '../contexts/ToastContext';
import Layout from '../components/Layout';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/20 text-badge-amber',
  approved: 'bg-emerald-500/20 text-badge-emerald',
  rejected: 'bg-red-500/20 text-red-400',
};

const MATCH_COLORS: Record<string, string> = {
  match: 'bg-emerald-500/20 text-badge-emerald',
  mismatch: 'bg-red-500/20 text-red-400',
  over_tolerance: 'bg-amber-500/20 text-badge-amber',
};

const INVOICE_TYPE_OPTIONS = [
  { value: 'fabric', label: 'Fabric' },
  { value: 'trimmings', label: 'Trimmings' },
  { value: 'factory', label: 'Factory' },
];

const emptyForm = {
  purchase_order: '', invoice_type: 'fabric', invoice_date: '',
  quantity: '', unit_price: '', amount: '', currency: '', notes: '',
};

export default function InvoiceApprovalsPage() {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<InvoiceApproval[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [matchFilter, setMatchFilter] = useState('');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dashboard, setDashboard] = useState<InvoiceApprovalDashboard | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingInv, setEditingInv] = useState<InvoiceApproval | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [rejectInv, setRejectInv] = useState<InvoiceApproval | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), page_size: '25' };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (matchFilter) params.match = matchFilter;
      params.ordering = sortOrder === 'desc' ? `-${sortField}` : sortField;
      const res = await commercialApi.getInvoiceApprovals(params);
      setInvoices(res.data.results);
      setCount(res.data.count);
    } catch { toast('error', 'Failed to load invoice approvals'); } finally { setLoading(false); }
  };

  const fetchDashboard = async () => {
    try {
      const res = await commercialApi.getInvoiceApprovalsDashboard();
      setDashboard(res.data);
    } catch { /* non-critical */ }
  };

  useEffect(() => { fetchData(); }, [search, statusFilter, matchFilter, page, sortField, sortOrder]);
  useEffect(() => { fetchDashboard(); }, []);

  const refresh = () => { fetchData(); fetchDashboard(); };

  const openCreate = () => {
    setEditingInv(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (inv: InvoiceApproval) => {
    setEditingInv(inv);
    setForm({
      purchase_order: inv.purchase_order || '',
      invoice_type: inv.invoice_type,
      invoice_date: inv.invoice_date || '',
      quantity: inv.quantity, unit_price: inv.unit_price, amount: inv.amount,
      currency: inv.currency || '', notes: inv.notes || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingInv) {
        await commercialApi.updateInvoiceApproval(editingInv.id, form as unknown as Record<string, unknown>);
        toast('success', 'Invoice approval updated');
      } else {
        await commercialApi.createInvoiceApproval(form as unknown as Record<string, unknown>);
        toast('success', 'Invoice approval created');
      }
      setShowModal(false);
      refresh();
    } catch { toast('error', editingInv ? 'Failed to update invoice approval' : 'Failed to create invoice approval'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await commercialApi.deleteInvoiceApproval(id); setDeleteId(null); toast('success', 'Invoice approval deleted'); refresh(); } catch { toast('error', 'Failed to delete invoice approval'); }
  };

  const handleApprove = async (inv: InvoiceApproval) => {
    setActing(true);
    try { await commercialApi.approveInvoice(inv.id); toast('success', `${inv.invoice_number} approved — handed to accounts`); refresh(); } catch { toast('error', 'Failed to approve invoice'); } finally { setActing(false); }
  };

  const handleReject = async () => {
    if (!rejectInv) return;
    setActing(true);
    try {
      await commercialApi.rejectInvoice(rejectInv.id, rejectReason);
      setRejectInv(null);
      setRejectReason('');
      toast('success', `${rejectInv.invoice_number} rejected`);
      refresh();
    } catch { toast('error', 'Failed to reject invoice'); } finally { setActing(false); }
  };

  const handleRaiseDebit = async (inv: InvoiceApproval) => {
    setActing(true);
    try { await commercialApi.raiseDebitForInvoice(inv.id); toast('success', `Pro forma debit raised for ${inv.invoice_number}`); refresh(); } catch { toast('error', 'Failed to raise debit (only over-tolerance invoices qualify)'); } finally { setActing(false); }
  };

  const handleExport = async () => {
    try {
      const res = await commercialApi.exportInvoiceApprovals();
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'invoice_approvals.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch { toast('error', 'Failed to export invoice approvals CSV'); }
  };

  const handleSort = (field: string, order: 'asc' | 'desc') => { setSortField(field); setSortOrder(order); };

  const columns: Column[] = [
    { key: 'invoice_number', label: 'Invoice #', sortable: true, render: (v) => <span className="font-mono text-emerald-400">{String(v)}</span> },
    { key: 'po_number', label: 'PO #', sortable: true, render: (v) => <span className="font-mono text-body">{v ? String(v) : '—'}</span> },
    { key: 'buyer_name', label: 'Buyer', sortable: true, render: (v) => <span className="text-body">{v ? String(v) : '—'}</span> },
    { key: 'invoice_type_display', label: 'Type', sortable: false, render: (v) => <span className="text-body">{String(v)}</span> },
    { key: 'amount', label: 'Amount', sortable: true, render: (v, row) => {
      const inv = row as unknown as InvoiceApproval;
      return <span className="text-body">{String(v)} {inv.currency_code || ''}</span>;
    } },
    { key: 'match_status', label: 'Match', sortable: false,
      render: (v) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${MATCH_COLORS[String(v)] || ''}`}>{String(v)}</span> },
    { key: 'status', label: 'Status', sortable: true,
      render: (v) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[String(v)] || ''}`}>{String(v)}</span> },
    { key: 'invoice_date', label: 'Invoice Date', sortable: true, render: (v) => (v ? new Date(String(v)).toLocaleDateString() : '—') },
    { key: 'id', label: 'Actions', className: 'text-right', render: (_v, row) => {
      const inv = row as unknown as InvoiceApproval;
      return (
        <div className="flex justify-end gap-1.5">
          {inv.status === 'pending' && (
            <>
              <button onClick={(e) => { e.stopPropagation(); handleApprove(inv); }} disabled={acting} className="text-xs px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-badge-emerald rounded transition-colors">Approve</button>
              <button onClick={(e) => { e.stopPropagation(); setRejectInv(inv); }} disabled={acting} className="text-xs px-2 py-1 bg-red-900/50 hover:bg-red-800 text-red-400 rounded transition-colors">Reject</button>
            </>
          )}
          {inv.over_tolerance && !inv.debit_note && (
            <button onClick={(e) => { e.stopPropagation(); handleRaiseDebit(inv); }} disabled={acting} className="text-xs px-2 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-badge-amber rounded transition-colors">Raise Debit</button>
          )}
          {inv.debit_note && (
            <span className="text-xs px-2 py-1 bg-amber-500/10 text-badge-amber rounded">Debit {String(inv.debit_number)}</span>
          )}
          {inv.status === 'pending' && (
            <button onClick={(e) => { e.stopPropagation(); openEdit(inv); }} className="text-xs px-2 py-1 bg-surface-alt hover:bg-surface-alt text-heading rounded transition-colors">Edit</button>
          )}
          <button onClick={(e) => { e.stopPropagation(); setDeleteId(String(inv.id)); }} className="text-xs px-2 py-1 bg-red-900/50 hover:bg-red-800 text-red-400 rounded transition-colors">Del</button>
        </div>
      );
    }},
  ];

  const cards = [
    { label: 'Total', value: dashboard?.total ?? 0, color: 'text-heading' },
    { label: 'Pending', value: dashboard?.by_status?.pending ?? 0, color: 'text-badge-amber' },
    { label: 'Approved', value: dashboard?.by_status?.approved ?? 0, color: 'text-badge-emerald' },
    { label: 'Rejected', value: dashboard?.by_status?.rejected ?? 0, color: 'text-red-400' },
    { label: 'Over-Tolerance', value: dashboard?.over_tolerance ?? 0, color: 'text-badge-amber' },
    { label: 'Auto-Approve Ready', value: dashboard?.auto_approval_eligible ?? 0, color: 'text-heading' },
  ];

  const inputCls = 'w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500';

  return (
    <Layout>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Invoice Approvals</h1>
            <p className="text-muted text-sm mt-1">{count} total invoices — quantity, date &amp; price must match GC data</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="px-4 py-2 bg-surface-alt hover:bg-surface-alt text-heading rounded-lg text-sm font-medium transition-colors">
              Export CSV
            </button>
            <button onClick={openCreate} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
              + New Invoice
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

        <div className="bg-surface rounded-xl border border-border p-3 mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">Status:</span>
          {[{ value: '', label: 'All' }, ...Object.keys(STATUS_COLORS).map((s) => ({ value: s, label: s.replace('_', ' ') }))].map((opt) => (
            <button key={opt.value || 'all'} onClick={() => { setStatusFilter(opt.value); setPage(1); }}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${statusFilter === opt.value ? 'bg-emerald-600/20 text-badge-emerald' : 'bg-surface-alt text-muted hover:text-heading'}`}>
              {opt.label}
            </button>
          ))}
          <span className="text-xs text-muted ml-2">Match:</span>
          {[{ value: '', label: 'All' }, { value: 'match', label: 'Match' }, { value: 'mismatch', label: 'Mismatch' }, { value: 'over_tolerance', label: 'Over Tolerance' }].map((opt) => (
            <button key={opt.value || 'match-all'} onClick={() => { setMatchFilter(opt.value); setPage(1); }}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${matchFilter === opt.value ? 'bg-emerald-600/20 text-badge-emerald' : 'bg-surface-alt text-muted hover:text-heading'}`}>
              {opt.label}
            </button>
          ))}
        </div>

        <DataTable
          data={invoices as unknown as Record<string, unknown>[]}
          columns={columns}
          totalCount={count}
          page={page}
          pageSize={25}
          onPageChange={setPage}
          searchValue={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          searchPlaceholder="Search invoice approvals..."
          onSort={handleSort}
          sortField={sortField}
          sortOrder={sortOrder}
          loading={loading}
        />
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">{editingInv ? `Edit ${editingInv.invoice_number}` : 'New Invoice Approval'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-body mb-1">Purchase Order ID *</label>
                  <input required value={form.purchase_order} onChange={(e) => setForm({ ...form, purchase_order: e.target.value })}
                    className={inputCls} placeholder="PO UUID" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Invoice Type *</label>
                  <select value={form.invoice_type} onChange={(e) => setForm({ ...form, invoice_type: e.target.value })} className={inputCls}>
                    {INVOICE_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Invoice Date</label>
                  <input type="date" value={form.invoice_date} onChange={(e) => setForm({ ...form, invoice_date: e.target.value })}
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Quantity *</label>
                  <input required type="number" step="0.01" min="0.01" value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Unit Price *</label>
                  <input required type="number" step="0.01" min="0.01" value={form.unit_price}
                    onChange={(e) => setForm({ ...form, unit_price: e.target.value })} className={inputCls} />
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
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className={inputCls} rows={2} />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white text-sm rounded-lg transition-colors">
                  {saving ? 'Saving...' : editingInv ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {rejectInv && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-2">Reject {rejectInv.invoice_number}?</h2>
            <p className="text-muted text-sm mb-4">A rejection reason is required.</p>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
              className={inputCls} rows={3} placeholder="e.g. Price does not match the PO" />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => { setRejectInv(null); setRejectReason(''); }} className="px-4 py-2 text-sm text-body hover:text-heading">Cancel</button>
              <button onClick={handleReject} disabled={acting || !rejectReason.trim()} className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-red-600/50 text-white text-sm rounded-lg">
                {acting ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2">Delete Invoice Approval?</h2>
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
