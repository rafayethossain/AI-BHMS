import { useState, useEffect, type FormEvent } from 'react';
import { commercialApi } from '../api/client';
import type { InvoiceApproval, InvoiceApprovalDashboard } from '../api/client';
import SpreadsheetGrid from '../components/SpreadsheetGrid';
import type { SpreadsheetColumn } from '../components/SpreadsheetGrid';
import { useToast } from '../contexts/ToastContext';
import Layout from '../components/Layout';

const STATUS_LABELS = ['pending', 'approved', 'rejected'];

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
  const [statusFilter, setStatusFilter] = useState('');
  const [matchFilter, setMatchFilter] = useState('');
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
      const params: Record<string, string> = { page: '1', page_size: '10000' };
      if (statusFilter) params.status = statusFilter;
      if (matchFilter) params.match = matchFilter;
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

  useEffect(() => { fetchData(); }, [statusFilter, matchFilter]);
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

  const actionable = invoices.filter(i => i.status === 'pending' || (i.over_tolerance && !i.debit_note));

  const gridData = invoices.map(inv => ({
    id: inv.id,
    invoice_number: inv.invoice_number,
    po_number: inv.po_number ?? '—',
    buyer_name: inv.buyer_name ?? '—',
    invoice_type_display: inv.invoice_type_display,
    amount: `${String(inv.amount)} ${inv.currency_code || ''}`.trim(),
    match_status: inv.match_status,
    status: inv.status,
    invoice_date: inv.invoice_date ? new Date(String(inv.invoice_date)).toLocaleDateString() : '—',
  }));

  const columns: SpreadsheetColumn[] = [
    { title: 'Invoice #', field: 'invoice_number', headerFilter: true },
    { title: 'PO #', field: 'po_number', headerFilter: true },
    { title: 'Buyer', field: 'buyer_name', headerFilter: true },
    { title: 'Type', field: 'invoice_type_display' },
    { title: 'Amount', field: 'amount', hozAlign: 'right' },
    { title: 'Match', field: 'match_status', headerFilter: true },
    { title: 'Status', field: 'status', headerFilter: true },
    { title: 'Invoice Date', field: 'invoice_date' },
  ];

  const cards = [
    { label: 'Total', value: dashboard?.total ?? 0, color: 'text-heading' },
    { label: 'Pending', value: dashboard?.by_status?.pending ?? 0, color: 'text-badge-amber' },
    { label: 'Approved', value: dashboard?.by_status?.approved ?? 0, color: 'text-badge-emerald' },
    { label: 'Rejected', value: dashboard?.by_status?.rejected ?? 0, color: 'text-red-400' },
    { label: 'Over-Tolerance', value: dashboard?.over_tolerance ?? 0, color: 'text-badge-amber' },
    { label: 'Auto-Approve Ready', value: dashboard?.auto_approval_eligible ?? 0, color: 'text-heading' },
  ];

  const actionBadge = (inv: InvoiceApproval) => {
    if (inv.debit_note) return <span className="text-xs px-2 py-1 bg-amber-500/10 text-badge-amber rounded">Debit {String(inv.debit_number)}</span>;
    return null;
  };

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
          {[{ value: '', label: 'All' }, ...STATUS_LABELS.map((s) => ({ value: s, label: s.replace('_', ' ') }))].map((opt) => (
            <button key={opt.value || 'all'} onClick={() => setStatusFilter(opt.value)}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${statusFilter === opt.value ? 'bg-emerald-600/20 text-badge-emerald' : 'bg-surface-alt text-muted hover:text-heading'}`}>
              {opt.label}
            </button>
          ))}
          <span className="text-xs text-muted ml-2">Match:</span>
          {[{ value: '', label: 'All' }, { value: 'match', label: 'Match' }, { value: 'mismatch', label: 'Mismatch' }, { value: 'over_tolerance', label: 'Over Tolerance' }].map((opt) => (
            <button key={opt.value || 'match-all'} onClick={() => setMatchFilter(opt.value)}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${matchFilter === opt.value ? 'bg-emerald-600/20 text-badge-emerald' : 'bg-surface-alt text-muted hover:text-heading'}`}>
              {opt.label}
            </button>
          ))}
        </div>

        {actionable.length > 0 && (
          <div className="bg-surface rounded-xl border border-border p-5 mb-6">
            <h2 className="text-sm font-semibold text-heading mb-3">Register Actions</h2>
            <p className="text-xs text-muted mb-3">Pending invoices can be approved / rejected (with reason); over-tolerance invoices can have a debit raised. Edit and delete are available via the grid row actions.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {actionable.map(inv => (
                <div key={inv.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-heading truncate">{inv.invoice_number} — {inv.buyer_name ?? '—'}</p>
                    <p className="text-xs text-muted font-mono">{inv.status}{inv.over_tolerance && !inv.debit_note ? ' · over tolerance' : ''}</p>
                  </div>
                  <div className="shrink-0 flex gap-2">
                    {inv.status === 'pending' && (
                      <>
                        <button onClick={() => handleApprove(inv)} disabled={acting} className="px-2 py-1 text-xs bg-emerald-600/20 hover:bg-emerald-600/30 text-badge-emerald rounded transition-colors disabled:opacity-50">Approve</button>
                        <button onClick={() => { setRejectInv(inv); }} disabled={acting} className="px-2 py-1 text-xs bg-red-900/50 hover:bg-red-800 text-red-400 rounded transition-colors disabled:opacity-50">Reject</button>
                      </>
                    )}
                    {inv.over_tolerance && !inv.debit_note && (
                      <button onClick={() => handleRaiseDebit(inv)} disabled={acting} className="px-2 py-1 text-xs bg-amber-600/20 hover:bg-amber-600/30 text-badge-amber rounded transition-colors disabled:opacity-50">Raise Debit</button>
                    )}
                    {actionBadge(inv)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <SpreadsheetGrid
          title="Invoice Approvals"
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
            const inv = invoices.find(i => i.id === row.id);
            if (!inv) return;
            if (inv.status !== 'pending') { toast('warning', 'Only pending invoices can be edited'); return; }
            openEdit(inv);
          }}
          onDelete={(row) => setDeleteId(String(row.id))}
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
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="PO UUID" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Invoice Type *</label>
                  <select value={form.invoice_type} onChange={(e) => setForm({ ...form, invoice_type: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    {INVOICE_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Invoice Date</label>
                  <input type="date" value={form.invoice_date} onChange={(e) => setForm({ ...form, invoice_date: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Quantity *</label>
                  <input required type="number" step="0.01" min="0.01" value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Unit Price *</label>
                  <input required type="number" step="0.01" min="0.01" value={form.unit_price}
                    onChange={(e) => setForm({ ...form, unit_price: e.target.value })} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Amount *</label>
                  <input required type="number" step="0.01" min="0.01" value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Currency ID</label>
                  <input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Currency UUID" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" rows={2} />
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
              className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" rows={3} placeholder="e.g. Price does not match the PO" />
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