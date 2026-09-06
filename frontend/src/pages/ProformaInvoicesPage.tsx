import { useState, useEffect, type FormEvent } from 'react';
import { commercialApi } from '../api/client';
import type { ProformaInvoice } from '../api/client';
import SpreadsheetGrid from '../components/SpreadsheetGrid';
import type { SpreadsheetColumn } from '../components/SpreadsheetGrid';
import { useToast } from '../contexts/ToastContext';
import Layout from '../components/Layout';

export default function ProformaInvoicesPage() {
  const { toast } = useToast();
  const [pis, setPIs] = useState<ProformaInvoice[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPI, setEditingPI] = useState<ProformaInvoice | null>(null);
  const [form, setForm] = useState({ purchase_order: '', buyer: '', amount: '', currency: 'USD', validity_date: '', remarks: '' });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: '1', page_size: '10000' };
      const res = await commercialApi.getPIs(params);
      setPIs(res.data.results);
      setCount(res.data.count);
    } catch { toast('error', 'Failed to load proforma invoices'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditingPI(null);
    setForm({ purchase_order: '', buyer: '', amount: '', currency: 'USD', validity_date: '', remarks: '' });
    setShowModal(true);
  };

  const openEdit = (pi: ProformaInvoice) => {
    setEditingPI(pi);
    setForm({ purchase_order: pi.purchase_order, buyer: pi.buyer, amount: pi.amount, currency: pi.currency, validity_date: pi.validity_date || '', remarks: pi.remarks || '' });
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingPI) {
        await commercialApi.updatePI(editingPI.id, form as unknown as Record<string, unknown>);
        toast('success', 'PI updated');
      } else {
        await commercialApi.createPI(form as unknown as Record<string, unknown>);
        toast('success', 'PI created');
      }
      setShowModal(false);
      fetchData();
    } catch { toast('error', editingPI ? 'Failed to update PI' : 'Failed to create PI'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await commercialApi.deletePI(id); setDeleteId(null); toast('success', 'PI deleted'); fetchData(); } catch { toast('error', 'Failed to delete PI'); }
  };

  const handleAction = async (id: string, action: 'send' | 'accept' | 'reject') => {
    setBusyId(id);
    try {
      if (action === 'send') await commercialApi.sendPI(id);
      else if (action === 'accept') await commercialApi.acceptPI(id);
      else await commercialApi.rejectPI(id);
      toast('success', `PI ${action}ed`);
      fetchData();
    } catch { toast('error', `Failed to ${action} PI`); } finally { setBusyId(null); }
  };

  const handleExportPDF = async (id: string, piNumber: string) => {
    try {
      const res = await commercialApi.exportPI_pdf(id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${piNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch { toast('error', 'Failed to export PDF'); }
  };

  const actionable = pis.filter(pi => pi.status === 'draft' || pi.status === 'sent');

  const gridData = pis.map(pi => ({
    id: pi.id,
    pi_number: pi.pi_number,
    po_number: pi.po_number,
    buyer_name: pi.buyer_name,
    amount: Number(pi.amount).toLocaleString(),
    currency: pi.currency,
    status: pi.status,
    issued_date: pi.issued_date,
  }));

  const columns: SpreadsheetColumn[] = [
    { title: 'PI #', field: 'pi_number', headerFilter: true },
    { title: 'PO #', field: 'po_number', headerFilter: true },
    { title: 'Buyer', field: 'buyer_name', headerFilter: true },
    { title: 'Amount', field: 'amount', hozAlign: 'right' },
    { title: 'Currency', field: 'currency' },
    { title: 'Status', field: 'status', headerFilter: true },
    { title: 'Issued', field: 'issued_date' },
  ];

  return (
    <Layout>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Proforma Invoices</h1>
            <p className="text-muted text-sm mt-1">{count} total PIs</p>
          </div>
          <button onClick={openCreate} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
            + New PI
          </button>
        </div>

        <div className="bg-surface rounded-xl border border-border p-5 mb-6">
          <h2 className="text-sm font-semibold text-heading mb-3">Register Actions</h2>
          <p className="text-xs text-muted mb-3">Status-specific actions (Send / Accept / Reject / PDF) for in-flight proforma invoices; edit and delete are available via the grid row actions.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {actionable.map(pi => (
              <div key={pi.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-heading truncate">{pi.pi_number} — {pi.buyer_name}</p>
                  <p className="text-xs text-muted font-mono">{pi.status}</p>
                </div>
                <div className="shrink-0 flex gap-2">
                  {pi.status === 'draft' && (
                    <button onClick={() => handleAction(pi.id, 'send')} disabled={busyId === pi.id} className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors disabled:opacity-50">Send</button>
                  )}
                  {pi.status === 'sent' && <>
                    <button onClick={() => handleAction(pi.id, 'accept')} disabled={busyId === pi.id} className="px-2 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors disabled:opacity-50">Accept</button>
                    <button onClick={() => handleAction(pi.id, 'reject')} disabled={busyId === pi.id} className="px-2 py-1 text-xs bg-red-600 hover:bg-red-500 text-white rounded transition-colors disabled:opacity-50">Reject</button>
                  </>}
                  <button onClick={() => handleExportPDF(pi.id, pi.pi_number)} className="px-2 py-1 text-xs bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded transition-colors" title="Export PDF">PDF</button>
                </div>
              </div>
            ))}
            {actionable.length === 0 && (
              <p className="text-sm text-muted">No in-flight PIs.</p>
            )}
          </div>
        </div>

        <SpreadsheetGrid
          title="Proforma Invoices"
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
            const pi = pis.find(p => p.id === row.id);
            if (pi) openEdit(pi);
          }}
          onDelete={(row) => setDeleteId(String(row.id))}
        />
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">{editingPI ? 'Edit PI' : 'New PI'}</h2>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-body mb-1">Amount *</label>
                  <input required type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Currency</label>
                  <input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Validity Date</label>
                <input type="date" value={form.validity_date} onChange={(e) => setForm({ ...form, validity_date: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Remarks</label>
                <textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" rows={2} />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white text-sm rounded-lg transition-colors">
                  {saving ? 'Saving...' : editingPI ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2">Delete PI?</h2>
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