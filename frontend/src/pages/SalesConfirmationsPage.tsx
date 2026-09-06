import { useState, useEffect, type FormEvent } from 'react';
import { commercialApi } from '../api/client';
import type { SalesConfirmation, SalesConfirmationDashboard } from '../api/client';
import SpreadsheetGrid from '../components/SpreadsheetGrid';
import type { SpreadsheetColumn } from '../components/SpreadsheetGrid';
import { useToast } from '../contexts/ToastContext';
import Layout from '../components/Layout';

export default function SalesConfirmationsPage() {
  const { toast } = useToast();
  const [confirmations, setConfirmations] = useState<SalesConfirmation[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
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
      const params: Record<string, string> = { page: '1', page_size: '10000' };
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

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { fetchDashboard(); }, []);

  const refresh = () => { fetchData(); fetchDashboard(); };

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
    setActing(true);
    try { await commercialApi.sendSalesConfirmation(sc.id); toast('success', `Sent ${sc.confirmation_number}`); refresh(); } catch { toast('error', 'Failed to send confirmation'); } finally { setActing(false); }
  };

  const handleDispute = async () => {
    if (!disputeFor) return;
    setActing(true);
    try {
      await commercialApi.disputeSalesConfirmation(disputeFor.id, disputeReason);
      toast('success', 'Dispute recorded');
      setDisputeFor(null);
      setDisputeReason('');
      refresh();
    } catch { toast('error', 'Failed to record dispute'); } finally { setActing(false); }
  };

  const handleAccept = async (sc: SalesConfirmation) => {
    setActing(true);
    try { await commercialApi.acceptSalesConfirmation(sc.id); toast('success', `Accepted ${sc.confirmation_number}`); refresh(); } catch { toast('error', 'Failed to accept confirmation'); } finally { setActing(false); }
  };

  const handleAutoAccept = async () => {
    try {
      const res = await commercialApi.autoAcceptSalesConfirmations();
      toast('success', `Auto-accepted ${res.data.auto_accepted} overdue confirmation(s)`);
      refresh();
    } catch { toast('error', 'Failed to auto-accept overdue confirmations'); }
  };

  const actionable = confirmations.filter(sc => sc.status === 'draft' || sc.status === 'sent');

  const gridData = confirmations.map(sc => ({
    id: sc.id,
    confirmation_number: sc.confirmation_number,
    po_number: sc.po_number,
    buyer_name: sc.buyer_name,
    status: sc.status,
    sent_at: sc.sent_at ? new Date(String(sc.sent_at)).toLocaleString() : '—',
    auto_accepted: sc.auto_accepted ? 'auto' : '—',
  }));

  const columns: SpreadsheetColumn[] = [
    { title: 'Confirmation #', field: 'confirmation_number', headerFilter: true },
    { title: 'PO #', field: 'po_number', headerFilter: true },
    { title: 'Buyer', field: 'buyer_name', headerFilter: true },
    { title: 'Status', field: 'status', headerFilter: true },
    { title: 'Sent', field: 'sent_at' },
    { title: 'Auto', field: 'auto_accepted' },
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

        {actionable.length > 0 && (
          <div className="bg-surface rounded-xl border border-border p-5 mb-6">
            <h2 className="text-sm font-semibold text-heading mb-3">Register Actions</h2>
            <p className="text-xs text-muted mb-3">Draft confirmations can be sent; sent confirmations can be disputed (with reason) or accepted. Edit and delete are available via the grid row actions.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {actionable.map(sc => (
                <div key={sc.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-heading truncate">{sc.confirmation_number} — {sc.buyer_name}</p>
                    <p className="text-xs text-muted font-mono">{sc.status}</p>
                  </div>
                  <div className="shrink-0 flex gap-2">
                    {sc.status === 'draft' && (
                      <button onClick={() => handleSend(sc)} disabled={acting} className="px-2 py-1 text-xs bg-blue-600/20 hover:bg-blue-600/30 text-badge-blue rounded transition-colors disabled:opacity-50">Send</button>
                    )}
                    {sc.status === 'sent' && (
                      <>
                        <button onClick={() => { setDisputeFor(sc); setDisputeReason(''); }} disabled={acting} className="px-2 py-1 text-xs bg-amber-600/20 hover:bg-amber-600/30 text-badge-amber rounded transition-colors disabled:opacity-50">Dispute</button>
                        <button onClick={() => handleAccept(sc)} disabled={acting} className="px-2 py-1 text-xs bg-emerald-600/20 hover:bg-emerald-600/30 text-badge-emerald rounded transition-colors disabled:opacity-50">Accept</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <SpreadsheetGrid
          title="Sales Confirmations"
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
            const sc = confirmations.find(c => c.id === row.id);
            if (sc) openEdit(sc);
          }}
          onDelete={(row) => setDeleteId(String(row.id))}
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