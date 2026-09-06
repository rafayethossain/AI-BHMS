import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { merchApi, setupApi } from '../api/client';
import type { PurchaseOrder, FileOpening, Factory, Currency, Country, OrderRisk } from '../api/client';
import SearchableSelect from '../components/SearchableSelect';
import SpreadsheetGrid from '../components/SpreadsheetGrid';
import type { SpreadsheetColumn } from '../components/SpreadsheetGrid';
import EntityCard, { CardListToggle } from '../components/EntityCard';
import { useToast } from '../contexts/ToastContext';
import Layout from '../components/Layout';

export default function PurchaseOrdersListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pos, setPOs] = useState<PurchaseOrder[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
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
      const res = await merchApi.getPOs({ page_size: '10000' });
      setPOs(res.data.results); setCount(res.data.count);
    } catch { toast('error', 'Failed to load purchase orders'); } finally { setLoading(false); }
  };

  const fetchFormData = async () => {
    try {
      const [fo, f, c, co] = await Promise.all([merchApi.getFileOpenings({ page_size: '500' }), setupApi.getFactories({ page_size: '500' }), setupApi.getCurrencies({ page_size: '500' }), setupApi.getCountries({ page_size: '500' })]);
      setFileOpenings(fo.data.results); setFactories(f.data.results); setCurrencies(c.data.results); setCountries(co.data.results);
    } catch { toast('error', 'Failed to load form data'); }
  };

  useEffect(() => { fetchData(); }, []);
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

  const columns: SpreadsheetColumn[] = [
    { title: 'PO #', field: 'po_number', headerFilter: true },
    { title: 'FN', field: 'file_number', headerFilter: true },
    { title: 'Style', field: 'style_number', headerFilter: true },
    { title: 'Factory', field: 'factory_name', headerFilter: true },
    { title: 'Buyer', field: 'buyer_name', headerFilter: true },
    { title: 'Fab', field: 'risk_fabric', width: 70 },
    { title: 'Trims', field: 'risk_trims', width: 80 },
    { title: 'Labels', field: 'risk_labels', width: 80 },
    { title: 'Tech', field: 'risk_technical', width: 70 },
    { title: 'Overall', field: 'risk_overall', width: 80 },
    { title: 'Delivery', field: 'delivery_date', headerFilter: true },
    { title: 'Actual', field: 'actual_completion_date' },
    { title: 'Qty', field: 'quantity', hozAlign: 'right' },
    { title: 'Value', field: 'total_value', hozAlign: 'right' },
    { title: 'Origin', field: 'destination_country_name', headerFilter: true },
    { title: 'Status', field: 'status', headerFilter: true },
  ];

  const riskLabel = (area: OrderRisk[keyof OrderRisk] | undefined) =>
    area && area.code !== 'none' ? area.label : '—';
  const riskNumber = (area: OrderRisk[keyof OrderRisk] | undefined) =>
    area && area.code !== 'none' ? Number(area.numeric) : 0;

  const gridData = pos.map((po) => {
    return {
      ...po,
      risk_fabric: riskLabel(po.risk?.fabric),
      risk_trims: riskLabel(po.risk?.trims),
      risk_labels: riskLabel(po.risk?.labels),
      risk_technical: riskLabel(po.risk?.technical),
      risk_overall: riskLabel(po.risk?.overall),
      total_value: Number(po.total_value).toLocaleString(),
      quantity: Number(po.quantity).toLocaleString(),
      status: String(po.status).replace('_', ' '),
      file_number: po.file_number ?? '—',
      style_number: po.style_number ?? '—',
      actual_completion_date: po.actual_completion_date ?? '—',
      destination_country_name: po.destination_country_name ?? '—',
    };
  });

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
          <SpreadsheetGrid
            data={gridData as unknown as Record<string, unknown>[]}
            columns={columns}
            height={480}
            toolbar
            title="Purchase Orders"
            exportable
            numericExport={(row) => {
              const po = pos.find((p) => String(p.id) === String(row.id));
              const r = po?.risk;
              return {
                ...row,
                risk_fabric: riskNumber(r?.fabric),
                risk_trims: riskNumber(r?.trims),
                risk_labels: riskNumber(r?.labels),
                risk_technical: riskNumber(r?.technical),
                risk_overall: riskNumber(r?.overall),
              };
            }}
            printable
            printTitle="Purchase Orders"
            columnChooser
            paginationSize={25}
            actionColumn
            onAdd={() => setShowCreate(true)}
            onView={(row) => navigate(`/purchase-orders/${String(row.id)}`)}
            onDelete={(row) => setDeleteId(String(row.id))}
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
