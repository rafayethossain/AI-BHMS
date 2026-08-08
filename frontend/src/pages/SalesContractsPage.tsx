import { useState, useEffect, type FormEvent } from 'react';
import { commercialApi } from '../api/client';
import type { SalesContract } from '../api/client';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { useToast } from '../contexts/ToastContext';
import Layout from '../components/Layout';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-surface-alt/20 text-muted',
  active: 'bg-blue-500/20 text-badge-blue',
  completed: 'bg-emerald-500/20 text-badge-emerald',
  cancelled: 'bg-red-500/20 text-badge-red',
};

export default function SalesContractsPage() {
  const { toast } = useToast();
  const [scs, setSCs] = useState<SalesContract[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('contract_number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showModal, setShowModal] = useState(false);
  const [editingSC, setEditingSC] = useState<SalesContract | null>(null);
  const [form, setForm] = useState({ purchase_order: '', buyer: '', total_amount: '', currency: 'USD', delivery_terms: '', remarks: '' });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), page_size: '25' };
      if (search) params.search = search;
      params.ordering = sortOrder === 'desc' ? `-${sortField}` : sortField;
      const res = await commercialApi.getSCs(params);
      setSCs(res.data.results);
      setCount(res.data.count);
    } catch { toast('error', 'Failed to load sales contracts'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [search, page, sortField, sortOrder]);

  const openCreate = () => {
    setEditingSC(null);
    setForm({ purchase_order: '', buyer: '', total_amount: '', currency: 'USD', delivery_terms: '', remarks: '' });
    setShowModal(true);
  };

  const openEdit = (sc: SalesContract) => {
    setEditingSC(sc);
    setForm({ purchase_order: sc.purchase_order, buyer: sc.buyer, total_amount: sc.total_amount, currency: sc.currency, delivery_terms: sc.delivery_terms || '', remarks: sc.remarks || '' });
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingSC) {
        await commercialApi.updateSC(editingSC.id, form as unknown as Record<string, unknown>);
        toast('success', 'Contract updated');
      } else {
        await commercialApi.createSC(form as unknown as Record<string, unknown>);
        toast('success', 'Contract created');
      }
      setShowModal(false);
      fetchData();
    } catch { toast('error', editingSC ? 'Failed to update contract' : 'Failed to create contract'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await commercialApi.deleteSC(id); setDeleteId(null); toast('success', 'Contract deleted'); fetchData(); } catch { toast('error', 'Failed to delete contract'); }
  };

  const handleExportPDF = async (id: string, contractNumber: string) => {
    try {
      const res = await commercialApi.exportSC_pdf(id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${contractNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch { toast('error', 'Failed to export PDF'); }
  };

  const handleSort = (field: string, order: 'asc' | 'desc') => { setSortField(field); setSortOrder(order); };

  const columns: Column[] = [
    { key: 'contract_number', label: 'Contract #', sortable: true, render: (v) => <span className="font-mono text-emerald-400">{String(v)}</span> },
    { key: 'po_number', label: 'PO #', sortable: true, render: (v) => <span className="font-mono text-body">{String(v)}</span> },
    { key: 'buyer_name', label: 'Buyer', sortable: true },
    { key: 'total_amount', label: 'Amount', sortable: true, render: (v) => <span className="text-heading font-medium">{Number(v).toLocaleString()}</span> },
    { key: 'currency', label: 'Currency', sortable: false },
    { key: 'status', label: 'Status', sortable: true,
      render: (v) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[String(v)] || ''}`}>{String(v)}</span> },
    { key: 'contract_date', label: 'Date', sortable: true },
    { key: 'id', label: 'Actions', className: 'text-right', render: (_v, row) => (
      <div className="flex justify-end gap-2">
        <button onClick={(e) => { e.stopPropagation(); handleExportPDF(String(row.id), String(row.contract_number)); }} className="text-xs px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded transition-colors" title="Export PDF">PDF</button>
        <button onClick={(e) => { e.stopPropagation(); openEdit(row as unknown as SalesContract); }} className="text-xs px-2 py-1 bg-surface-alt hover:bg-surface-alt text-heading rounded transition-colors">Edit</button>
        <button onClick={(e) => { e.stopPropagation(); setDeleteId(String(row.id)); }} className="text-xs px-2 py-1 bg-red-900/50 hover:bg-red-800 text-red-400 rounded transition-colors">Del</button>
      </div>
    )},
  ];

  return (
    <Layout>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Sales Contracts</h1>
            <p className="text-muted text-sm mt-1">{count} total contracts</p>
          </div>
          <button onClick={openCreate} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
            + New Contract
          </button>
        </div>

        <DataTable
          data={scs as unknown as Record<string, unknown>[]}
          columns={columns}
          totalCount={count}
          page={page}
          pageSize={25}
          onPageChange={setPage}
          searchValue={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          searchPlaceholder="Search contracts..."
          onSort={handleSort}
          sortField={sortField}
          sortOrder={sortOrder}
          loading={loading}
        />
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">{editingSC ? 'Edit Contract' : 'New Contract'}</h2>
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
                  <label className="block text-sm text-body mb-1">Total Amount *</label>
                  <input required type="number" step="0.01" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Currency</label>
                  <input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Delivery Terms</label>
                <input value={form.delivery_terms} onChange={(e) => setForm({ ...form, delivery_terms: e.target.value })}
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
                  {saving ? 'Saving...' : editingSC ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2">Delete Contract?</h2>
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
