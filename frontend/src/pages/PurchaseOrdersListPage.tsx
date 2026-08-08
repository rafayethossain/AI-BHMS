import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { merchApi, setupApi } from '../api/client';
import type { PurchaseOrder, FileOpening, Factory, Currency, Country } from '../api/client';
import SearchableSelect from '../components/SearchableSelect';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import EntityCard, { CardListToggle } from '../components/EntityCard';
import { useToast } from '../contexts/ToastContext';
import Layout from '../components/Layout';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-surface-alt/20 text-muted',
  open: 'bg-blue-500/20 text-badge-blue',
  confirmed: 'bg-emerald-500/20 text-badge-emerald',
  in_production: 'bg-amber-500/20 text-badge-amber',
  quality_check: 'bg-purple-500/20 text-badge-purple',
  ready: 'bg-cyan-500/20 text-cyan-400',
  shipped: 'bg-indigo-500/20 text-indigo-400',
  delivered: 'bg-green-500/20 text-badge-green',
  cancelled: 'bg-red-500/20 text-badge-red',
};

export default function PurchaseOrdersListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pos, setPOs] = useState<PurchaseOrder[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [view, setView] = useState<'grid' | 'list'>('list');
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [fileOpenings, setFileOpenings] = useState<FileOpening[]>([]);
  const [factories, setFactories] = useState<Factory[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [createForm, setCreateForm] = useState({
    file_opening: '', buyer: '', factory: '', po_date: new Date().toISOString().split('T')[0],
    delivery_date: '', quantity: '', unit_price: '', destination_country: '', currency: '', remarks: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), page_size: '25' };
      if (search) params.search = search;
      params.ordering = sortOrder === 'desc' ? `-${sortField}` : sortField;
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await merchApi.getPOs(params);
      setPOs(res.data.results); setCount(res.data.count);
    } catch { toast('error', 'Failed to load purchase orders'); } finally { setLoading(false); }
  };

  const fetchFormData = async () => {
    try {
      const [fo, f, c, co] = await Promise.all([merchApi.getFileOpenings({ page_size: '500' }), setupApi.getFactories({ page_size: '500' }), setupApi.getCurrencies({ page_size: '500' }), setupApi.getCountries({ page_size: '500' })]);
      setFileOpenings(fo.data.results); setFactories(f.data.results); setCurrencies(c.data.results); setCountries(co.data.results);
    } catch { toast('error', 'Failed to load form data'); }
  };

  useEffect(() => { fetchData(); }, [search, page, sortField, sortOrder, filters]);
  useEffect(() => { fetchFormData(); }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const payload: Record<string, unknown> = {
        file_opening: createForm.file_opening, buyer: createForm.buyer, factory: createForm.factory,
        po_date: createForm.po_date, delivery_date: createForm.delivery_date,
        quantity: createForm.quantity ? parseInt(createForm.quantity) : 0, unit_price: createForm.unit_price || '0',
        destination_country: createForm.destination_country || null, currency: createForm.currency || null,
        remarks: createForm.remarks || '',
      };
      await merchApi.createPO(payload);
      setShowCreate(false);
      setCreateForm({ file_opening: '', buyer: '', factory: '', po_date: new Date().toISOString().split('T')[0], delivery_date: '', quantity: '', unit_price: '', destination_country: '', currency: '', remarks: '' });
      toast('success', 'Purchase order created successfully'); fetchData();
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      const msg = data ? JSON.stringify(data) : 'Failed to create purchase order';
      toast('error', msg);
    } finally { setCreating(false); }
  };

  const handleDelete = async (id: string) => {
    try { await merchApi.deletePO(id); setDeleteId(null); toast('success', 'Purchase order deleted'); fetchData(); } catch { toast('error', 'Failed to delete purchase order'); }
  };

  const handleFileChange = (foId: string | number | null) => {
    const fid = String(foId || ''); const fo = fileOpenings.find(f => f.id === fid);
    setCreateForm({ ...createForm, file_opening: fid, buyer: fo?.buyer || '', factory: fo?.factory || '' });
  };

  const handleSort = (field: string, order: 'asc' | 'desc') => { setSortField(field); setSortOrder(order); };
  const handleFilterChange = (f: Record<string, string>) => { setFilters(f); setPage(1); };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const res = await merchApi.importPOs(file);
      const { success, errors } = res.data;
      if (success > 0) {
        toast('success', `Imported ${success} PO(s) successfully`);
        fetchData();
      }
      if (errors.length > 0) {
        const msgs = errors.slice(0, 5).map((er) => `Row ${er.row}: ${er.error}`).join('\n');
        const suffix = errors.length > 5 ? `\n...and ${errors.length - 5} more` : '';
        toast('warning', `${errors.length} row(s) had errors:\n${msgs}${suffix}`);
      }
      if (success === 0 && errors.length === 0) {
        toast('info', 'No rows found in the CSV file');
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string; errors?: Array<{row: number; error: string}> } } };
      const data = axiosErr?.response?.data;
      if (data?.errors?.length) {
        const msgs = data.errors.slice(0, 5).map((er) => `Row ${er.row}: ${er.error}`).join('\n');
        toast('warning', `Import failed:\n${msgs}`);
      } else if (data?.error) {
        toast('warning', data.error);
      } else {
        toast('error', 'Failed to import CSV file');
      }
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownloadTemplate = () => {
    const header = 'buyer_name,factory_name,po_date,delivery_date,color_name,size,quantity,unit_price,remarks';
    const sample = 'Addidas,Apex Textile Mills Ltd,2025-07-16,2025-10-15,Black,M,500,12.50,Rush order';
    const sample2 = 'Addidas,Apex Textile Mills Ltd,2025-07-16,2025-10-15,Black,L,500,12.50,Same PO different size';
    const blob = new Blob([`${header}\n${sample}\n${sample2}\n`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'po_import_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const columns: Column[] = [
    { key: 'po_number', label: 'PO #', sortable: true, render: (v) => <span className="font-mono text-emerald-400">{String(v)}</span> },
    { key: 'factory_name', label: 'Factory', sortable: true },
    { key: 'buyer_name', label: 'Buyer', sortable: true },
    { key: 'risk_level_detail', label: 'Risk', sortable: false,
      render: (v) => v ? <span className="px-2 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: String((v as { color: string }).color) }}>{String((v as { code: string }).code)}</span> : <span className="text-faint">—</span> },
    { key: 'delivery_date', label: 'Delivery', sortable: true },
    { key: 'quantity', label: 'Qty', sortable: true, className: 'text-right', render: (v) => Number(v).toLocaleString() },
    { key: 'total_value', label: 'Value', sortable: true, className: 'text-right', render: (v) => `$${parseFloat(String(v)).toLocaleString()}` },
    { key: 'status', label: 'Status', sortable: true, filterable: true,
      filterOptions: ['draft', 'confirmed', 'in_production', 'quality_check', 'ready', 'shipped', 'delivered', 'cancelled'],
      render: (v) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[String(v)] || ''}`}>{String(v).replace('_', ' ')}</span> },
    { key: 'id', label: 'Actions', className: 'text-right', render: (_v, row) => (
      <div className="flex justify-end gap-3">
        <button onClick={(e) => { e.stopPropagation(); navigate(`/purchase-orders/${row.id}`); }} className="text-sm text-blue-400 hover:text-blue-300">View</button>
        <button onClick={(e) => { e.stopPropagation(); setDeleteId(String(row.id)); }} className="text-sm text-red-400 hover:text-red-300">Delete</button>
      </div>
    )},
  ];

  return (
    <Layout>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Purchase Orders</h1>
            <p className="text-muted text-sm mt-1">{count} total POs</p>
          </div>
          <div className="flex items-center gap-3">
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
            <button onClick={handleDownloadTemplate}
              className="px-4 py-2 border border-border text-body hover:text-heading hover:border-border/80 rounded-lg text-sm font-medium transition-colors">
              Download Template
            </button>
            <button onClick={() => fileInputRef.current?.click()} disabled={importing}
              className="px-4 py-2 border border-border text-body hover:text-heading hover:border-border/80 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors">
              {importing ? 'Importing...' : 'Import CSV'}
            </button>
            <CardListToggle view={view} onChange={setView} />
            <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
              + New PO
            </button>
          </div>
        </div>

        {view === 'list' ? (
          <DataTable
            data={pos as unknown as Record<string, unknown>[]}
            columns={columns}
            totalCount={count}
            page={page}
            pageSize={25}
            onPageChange={setPage}
            searchValue={search}
            onSearchChange={(v) => { setSearch(v); setPage(1); }}
            searchPlaceholder="Search by PO number..."
            onSort={handleSort}
            sortField={sortField}
            sortOrder={sortOrder}
            filters={filters}
            onFilterChange={handleFilterChange}
            onRowClick={(row) => navigate(`/purchase-orders/${String(row.id)}`)}
            loading={loading}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pos.map(po => (
              <EntityCard key={po.id} id={po.id} code={po.po_number} title={po.buyer_name}
                subtitle={po.factory_name} status={po.status}
                metrics={[
                  { label: 'Qty', value: po.quantity.toLocaleString() },
                  { label: 'Value', value: `$${parseFloat(po.total_value).toLocaleString()}`, color: 'text-emerald-400' },
                ]}
                date={po.delivery_date}
                url={`/purchase-orders/${po.id}`}
                actions={[
                  { label: 'View', onClick: () => navigate(`/purchase-orders/${po.id}`) },
                ]} />
            ))}
            {pos.length === 0 && !loading && (
              <div className="col-span-full bg-surface rounded-xl border border-border p-12 text-center">
                <svg className="w-12 h-12 text-faint mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                <p className="text-lg font-medium text-heading mb-1">No purchase orders yet</p>
                <p className="text-sm text-muted mb-4">Create a Style, open a File, then create a PO to start the order lifecycle.</p>
                <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg font-medium transition-colors">+ New PO</button>
              </div>
            )}
          </div>
        )}
      </main>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 overflow-y-auto" onClick={() => setShowCreate(false)}>
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-lg my-8 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-1">New Purchase Order</h3>
            {createForm.file_opening && (() => {
              const fo = fileOpenings.find(f => String(f.id) === String(createForm.file_opening));
              return fo ? <p className="text-sm text-muted mb-4">Creating PO for <span className="font-mono font-medium">{fo.file_number}</span> &middot; {fo.buyer_name} &middot; {fo.factory_name}</p> : null;
            })()}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-muted mb-1">File Opening *</label>
                <SearchableSelect options={fileOpenings.map(fo => ({ value: fo.id, label: `${fo.file_number} - ${fo.style_number}` }))}
                  value={createForm.file_opening || null} onChange={handleFileChange} placeholder="Select file opening..." required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted mb-1">Buyer</label>
                  <input value={createForm.buyer || ''} readOnly
                    className="w-full px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm text-faint cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Factory *</label>
                  <SearchableSelect options={factories.map(f => ({ value: f.id, label: f.name }))}
                    value={createForm.factory || null} onChange={(v) => setCreateForm({ ...createForm, factory: String(v || '') })} placeholder="Select..." required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted mb-1">PO Date *</label>
                  <input type="date" required value={createForm.po_date} onChange={(e) => setCreateForm({ ...createForm, po_date: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Delivery Date *</label>
                  <input type="date" required value={createForm.delivery_date} onChange={(e) => setCreateForm({ ...createForm, delivery_date: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted mb-1">Quantity</label>
                  <input type="number" value={createForm.quantity} onChange={(e) => setCreateForm({ ...createForm, quantity: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Unit Price ($)</label>
                  <input type="number" step="0.01" value={createForm.unit_price} onChange={(e) => setCreateForm({ ...createForm, unit_price: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="0.00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted mb-1">Destination Country</label>
                  <SearchableSelect options={countries.map(c => ({ value: c.id, label: `${c.name} (${c.code})` }))}
                    value={createForm.destination_country || null}
                    onChange={(v) => setCreateForm({ ...createForm, destination_country: String(v || '') })}
                    placeholder="Select country..." />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Currency</label>
                  <SearchableSelect options={currencies.map(c => ({ value: c.id, label: `${c.name} (${c.code})` }))}
                    value={createForm.currency || null} onChange={(v) => setCreateForm({ ...createForm, currency: String(v || '') })} placeholder="Select..." />
                </div>
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Remarks</label>
                <input type="text" value={createForm.remarks || ''} onChange={(e) => setCreateForm({ ...createForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="Optional notes" />
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-muted hover:text-heading transition-colors">Cancel</button>
                <button type="submit" disabled={creating || !createForm.file_opening || !createForm.delivery_date}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors">
                  {creating ? 'Creating...' : 'Create PO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2">Delete PO?</h2>
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
