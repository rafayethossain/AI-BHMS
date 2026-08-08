import { useState, useEffect, type FormEvent } from 'react';
import { commercialApi } from '../api/client';
import type { SalesConfirmation, SalesConfirmationDashboard } from '../api/client';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { useToast } from '../contexts/ToastContext';
import Layout from '../components/Layout';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-surface-alt/20 text-muted',
  sent: 'bg-blue-500/20 text-badge-blue',
  disputed: 'bg-amber-500/20 text-badge-amber',
  accepted: 'bg-emerald-500/20 text-badge-emerald',
};

export default function SalesConfirmationsPage() {
  const { toast } = useToast();
  const [confirmations, setConfirmations] = useState<SalesConfirmation[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('confirmation_number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dashboard, setDashboard] = useState<SalesConfirmationDashboard | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingSC, setEditingSC] = useState<SalesConfirmation | null>(null);
  const [form, setForm] = useState({ purchase_order: '', buyer: '', remarks: '' });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [disputeFor, setDisputeFor] = useState<SalesConfirmation | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [acting, setActing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), page_size: '25' };
      if (search) params.search = search;
      params.ordering = sortOrder === 'desc' ? `-${sortField}` : sortField;
      const res = await commercialApi.getSalesConfirmations(params);
      setConfirmations(res.data.results);
      setCount(res.data.count);
    } catch { toast('error', 'Failed to load sales confirmations'); } finally { setLoading(false); }
  };

  const fetchDashboard = async () => {
    try {
      const res = await commercialApi.getSalesConfirmationsDashboard();
      setDashboard(res.data);
    } catch { /* non-critical */ }
  };

  useEffect(() => { fetchData(); }, [search, page, sortField, sortOrder]);
  useEffect(() => { fetchDashboard(); }, []);

  const openCreate = () => {
    setEditingSC(null);
    setForm({ purchase_order: '', buyer: '', remarks: '' });
    setShowModal(true);
  };

  const openEdit = (sc: SalesConfirmation) => {
    setEditingSC(sc);
    setForm({ purchase_order: sc.purchase_order, buyer: sc.buyer, remarks: sc.remarks || '' });
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingSC) {
        await commercialApi.updateSalesConfirmation(editingSC.id, form as unknown as Record<string, unknown>);
        toast('success', 'Confirmation updated');
      } else {
        await commercialApi.createSalesConfirmation(form as unknown as Record<string, unknown>);
        toast('success', 'Confirmation created');
      }
      setShowModal(false);
      fetchData();
    } catch { toast('error', editingSC ? 'Failed to update confirmation' : 'Failed to create confirmation'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await commercialApi.deleteSalesConfirmation(id); setDeleteId(null); toast('success', 'Confirmation deleted'); fetchData(); } catch { toast('error', 'Failed to delete confirmation'); }
  };

  const handleSend = async (sc: SalesConfirmation) => {
    try { await commercialApi.sendSalesConfirmation(sc.id); toast('success', `Sent ${sc.confirmation_number}`); fetchData(); fetchDashboard(); } catch { toast('error', 'Failed to send confirmation'); }
  };

  const handleDispute = async () => {
    if (!disputeFor) return;
    setActing(true);
    try {
      await commercialApi.disputeSalesConfirmation(disputeFor.id, disputeReason);
      toast('success', 'Dispute recorded');
      setDisputeFor(null);
      setDisputeReason('');
      fetchData();
      fetchDashboard();
    } catch { toast('error', 'Failed to record dispute'); } finally { setActing(false); }
  };

  const handleAccept = async (sc: SalesConfirmation) => {
    try { await commercialApi.acceptSalesConfirmation(sc.id); toast('success', `Accepted ${sc.confirmation_number}`); fetchData(); fetchDashboard(); } catch { toast('error', 'Failed to accept confirmation'); }
  };

  const handleAutoAccept = async () => {
    try {
      const res = await commercialApi.autoAcceptSalesConfirmations();
      toast('success', `Auto-accepted ${res.data.auto_accepted} overdue confirmation(s)`);
      fetchData();
      fetchDashboard();
    } catch { toast('error', 'Failed to auto-accept overdue confirmations'); }
  };

  const handleSort = (field: string, order: 'asc' | 'desc') => { setSortField(field); setSortOrder(order); };

  const columns: Column[] = [
    { key: 'confirmation_number', label: 'Confirmation #', sortable: true, render: (v) => <span className="font-mono text-emerald-400">{String(v)}</span> },
    { key: 'po_number', label: 'PO #', sortable: true, render: (v) => <span className="font-mono text-body">{String(v)}</span> },
    { key: 'buyer_name', label: 'Buyer', sortable: true },
    { key: 'status', label: 'Status', sortable: true,
      render: (v) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[String(v)] || ''}`}>{String(v)}</span> },
    { key: 'sent_at', label: 'Sent', sortable: true, render: (v) => (v ? new Date(String(v)).toLocaleString() : '—') },
    { key: 'auto_accepted', label: 'Auto', sortable: false, render: (v) => (v ? <span className="text-xs text-badge-purple font-medium">auto</span> : '—') },
    { key: 'id', label: 'Actions', className: 'text-right', render: (_v, row) => {
      const sc = row as unknown as SalesConfirmation;
      return (
        <div className="flex justify-end gap-1.5">
          {sc.status === 'draft' && (
            <button onClick={(e) => { e.stopPropagation(); handleSend(sc); }} className="text-xs px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-badge-blue rounded transition-colors">Send</button>
          )}
          {sc.status === 'sent' && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setDisputeFor(sc); setDisputeReason(''); }} className="text-xs px-2 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-badge-amber rounded transition-colors">Dispute</button>
              <button onClick={(e) => { e.stopPropagation(); handleAccept(sc); }} className="text-xs px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-badge-emerald rounded transition-colors">Accept</button>
            </>
          )}
          <button onClick={(e) => { e.stopPropagation(); openEdit(sc); }} className="text-xs px-2 py-1 bg-surface-alt hover:bg-surface-alt text-heading rounded transition-colors">Edit</button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteId(String(sc.id)); }} className="text-xs px-2 py-1 bg-red-900/50 hover:bg-red-800 text-red-400 rounded transition-colors">Del</button>
        </div>
      );
    }},
  ];

  const cards = [
    { label: 'Total', value: dashboard?.total ?? 0, color: 'text-heading' },
    { label: 'Draft', value: dashboard?.by_status?.draft ?? 0, color: 'text-muted' },
    { label: 'Sent', value: dashboard?.by_status?.sent ?? 0, color: 'text-badge-blue' },
    { label: 'Disputed', value: dashboard?.by_status?.disputed ?? 0, color: 'text-badge-amber' },
    { label: 'Accepted', value: dashboard?.by_status?.accepted ?? 0, color: 'text-badge-emerald' },
    { label: 'Overdue', value: dashboard?.overdue ?? 0, color: dashboard && dashboard.overdue > 0 ? 'text-red-400' : 'text-heading' },
  ];

  return (
    <Layout>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Sales Confirmations</h1>
            <p className="text-muted text-sm mt-1">{count} total confirmations</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleAutoAccept} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">
              Auto-Accept Overdue
            </button>
            <button onClick={openCreate} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
              + New Confirmation
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

        <DataTable
          data={confirmations as unknown as Record<string, unknown>[]}
          columns={columns}
          totalCount={count}
          page={page}
          pageSize={25}
          onPageChange={setPage}
          searchValue={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          searchPlaceholder="Search confirmations..."
          onSort={handleSort}
          sortField={sortField}
          sortOrder={sortOrder}
          loading={loading}
        />
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">{editingSC ? 'Edit Confirmation' : 'New Confirmation'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-body mb-1">Purchase Order ID *</label>
                <input required value={form.purchase_order} onChange={(e) => setForm({ ...form, purchase_order: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="PO UUID" />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Buyer ID *</label>
                <input required value={form.buyer} onChange={(e) => setForm({ ...form, buyer: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Buyer UUID" />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Remarks</label>
                <textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" rows={2} />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white text-sm rounded-lg transition-colors">
                  {saving ? 'Saving...' : editingSC ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {disputeFor && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-2">Dispute {disputeFor.confirmation_number}</h2>
            <p className="text-muted text-sm mb-4">The customer has disputed this confirmation within the 48-hour window.</p>
            <div>
              <label className="block text-sm text-body mb-1">Dispute Reason *</label>
              <textarea required value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" rows={3} />
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setDisputeFor(null)} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
              <button onClick={handleDispute} disabled={acting || !disputeReason.trim()} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-600/50 text-white text-sm rounded-lg transition-colors">
                {acting ? 'Saving...' : 'Record Dispute'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2">Delete Confirmation?</h2>
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
