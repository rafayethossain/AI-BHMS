import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { merchApi, setupApi } from '../api/client';
import type { FileOpening, Style, Buyer, Factory } from '../api/client';
import SearchableSelect from '../components/SearchableSelect';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import EntityCard, { CardListToggle } from '../components/EntityCard';
import { useToast } from '../contexts/ToastContext';
import Layout from '../components/Layout';

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-500/20 text-badge-blue',
  closed: 'bg-surface-alt/20 text-muted',
  cancelled: 'bg-red-500/20 text-badge-red',
};

export default function FileOpeningsListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [files, setFiles] = useState<FileOpening[]>([]);
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
  const [styles, setStyles] = useState<Style[]>([]);
  const [_buyers, setBuyers] = useState<Buyer[]>([]);
  const [factories, setFactories] = useState<Factory[]>([]);
  const [createForm, setCreateForm] = useState({ style: '', style_version: '', buyer: '', factory: '', file_date: '', remarks: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), page_size: '25' };
      if (search) params.search = search;
      params.ordering = sortOrder === 'desc' ? `-${sortField}` : sortField;
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await merchApi.getFileOpenings(params);
      setFiles(res.data.results); setCount(res.data.count);
    } catch { toast('error', 'Failed to load file openings'); } finally { setLoading(false); }
  };

  const fetchFormData = async () => {
    try {
      const [s, b, f] = await Promise.all([merchApi.getStyles({ page_size: '500' }), setupApi.getBuyers({ page_size: '500' }), setupApi.getFactories({ page_size: '500' })]);
      setStyles(s.data.results); setBuyers(b.data.results); setFactories(f.data.results);
    } catch { toast('error', 'Failed to load form data'); }
  };

  useEffect(() => { fetchData(); }, [search, page, sortField, sortOrder, filters]);
  useEffect(() => { fetchFormData(); }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const payload: Record<string, unknown> = { style: createForm.style, buyer: createForm.buyer, factory: createForm.factory,
        file_date: createForm.file_date || new Date().toISOString().split('T')[0], remarks: createForm.remarks };
      if (createForm.style_version) payload.style_version = createForm.style_version;
      await merchApi.createFileOpening(payload);
      setShowCreate(false); setCreateForm({ style: '', style_version: '', buyer: '', factory: '', file_date: '', remarks: '' });
      toast('success', 'File opening created successfully'); fetchData();
    } catch { toast('error', 'Failed to create file opening'); } finally { setCreating(false); }
  };

  const handleDelete = async (id: string) => {
    try { await merchApi.deleteFileOpening(id); setDeleteId(null); toast('success', 'File opening deleted'); fetchData(); } catch { toast('error', 'Failed to delete file opening'); }
  };

  const handleStyleChange = (styleId: string | number | null) => {
    const sid = String(styleId || ''); const style = styles.find(s => s.id === sid);
    setCreateForm({ ...createForm, style: sid, buyer: style?.buyer || '', style_version: '' });
  };

  const handleSort = (field: string, order: 'asc' | 'desc') => { setSortField(field); setSortOrder(order); };
  const handleFilterChange = (f: Record<string, string>) => { setFilters(f); setPage(1); };

  const columns: Column[] = [
    { key: 'file_number', label: 'File #', sortable: true, render: (v, row) => (
      <div className="flex items-center gap-2">
        <span className="font-mono text-emerald-400">{String(v)}</span>
        {(row as unknown as FileOpening).is_quick_lead && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-400/20 text-yellow-400 border border-yellow-400/30" title="Quick lead time order">QL</span>
        )}
        {(row as unknown as FileOpening).is_repeat && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-500/20 text-violet-400 border border-violet-400/30" title="Repeat order">RPT</span>
        )}
        {(row as unknown as FileOpening).is_stock_fabric && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-400/30" title="Stock fabric">STK</span>
        )}
      </div>
    ) },
    { key: 'style_number', label: 'Style', sortable: true },
    { key: 'buyer_name', label: 'Buyer', sortable: true },
    { key: 'factory_name', label: 'Factory', sortable: true },
    { key: 'file_date', label: 'Date', sortable: true },
    { key: 'purchase_orders_count', label: 'POs', sortable: true,
      render: (v) => <span className="text-blue-400 font-medium">{String(v ?? 0)}</span> },
    { key: 'status', label: 'Status', sortable: true, filterable: true, filterOptions: ['open', 'closed', 'cancelled'],
      render: (v) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[String(v)] || ''}`}>{String(v)}</span> },
    { key: 'id', label: 'Actions', className: 'text-right', render: (_v, row) => (
      <div className="flex justify-end gap-3">
        <button onClick={(e) => { e.stopPropagation(); navigate(`/file-openings/${row.id}`); }} className="text-sm text-blue-400 hover:text-blue-300">View</button>
        <button onClick={(e) => { e.stopPropagation(); setDeleteId(String(row.id)); }} className="text-sm text-red-400 hover:text-red-300">Delete</button>
      </div>
    )},
  ];

  return (
    <Layout>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">File Openings</h1>
            <p className="text-muted text-sm mt-1">{count} total files</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => {
              const next = filters.is_quick_lead ? { ...filters, is_quick_lead: '' } : { ...filters, is_quick_lead: 'true' };
              setFilters(next); setPage(1);
            }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${filters.is_quick_lead === 'true' ? 'bg-yellow-400/20 text-yellow-400 border-yellow-400/40' : 'bg-surface-alt hover:bg-surface-alt border-border text-muted'}`}>
              Quick Lead
            </button>
            <button onClick={() => {
              const next = filters.is_repeat ? { ...filters, is_repeat: '' } : { ...filters, is_repeat: 'true' };
              setFilters(next); setPage(1);
            }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${filters.is_repeat === 'true' ? 'bg-violet-500/20 text-violet-400 border-violet-400/40' : 'bg-surface-alt hover:bg-surface-alt border-border text-muted'}`}>
              Repeats
            </button>
            <button onClick={() => {
              const next = filters.is_stock_fabric ? { ...filters, is_stock_fabric: '' } : { ...filters, is_stock_fabric: 'true' };
              setFilters(next); setPage(1);
            }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${filters.is_stock_fabric === 'true' ? 'bg-sky-500/20 text-sky-400 border-sky-400/40' : 'bg-surface-alt hover:bg-surface-alt border-border text-muted'}`}>
              Stock Fabric
            </button>
            <CardListToggle view={view} onChange={setView} />
            <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
              + New File Opening
            </button>
          </div>
        </div>

        {view === 'list' ? (
          <DataTable
            data={files as unknown as Record<string, unknown>[]}
            columns={columns}
            totalCount={count}
            page={page}
            pageSize={25}
            onPageChange={setPage}
            searchValue={search}
            onSearchChange={(v) => { setSearch(v); setPage(1); }}
            searchPlaceholder="Search by file number..."
            onSort={handleSort}
            sortField={sortField}
            sortOrder={sortOrder}
            filters={filters}
            onFilterChange={handleFilterChange}
            onRowClick={(row) => navigate(`/file-openings/${String(row.id)}`)}
            loading={loading}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {files.map(fo => (
              <EntityCard key={fo.id} id={fo.id} code={fo.file_number} title={fo.style_number}
                subtitle={`Buyer: ${fo.buyer_name}`} status={fo.status}
                date={fo.file_date}
                url={`/file-openings/${fo.id}`}
                actions={[
                  { label: 'View', onClick: () => navigate(`/file-openings/${fo.id}`) },
                ]} />
            ))}
            {files.length === 0 && !loading && (
              <div className="col-span-full bg-surface rounded-xl border border-border p-12 text-center">
                <svg className="w-12 h-12 text-faint mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                <p className="text-lg font-medium text-heading mb-1">No file openings yet</p>
                <p className="text-sm text-muted mb-4">Open a file for a style to start the merchandising process.</p>
                <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg font-medium transition-colors">+ New File Opening</button>
              </div>
            )}
          </div>
        )}
      </main>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">New File Opening</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-body mb-1">Style *</label>
                <SearchableSelect options={styles.map(s => ({ value: s.id, label: `${s.style_number} - ${s.name}` }))}
                  value={createForm.style || null} onChange={handleStyleChange} placeholder="Select style..." required />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Factory *</label>
                <SearchableSelect options={factories.map(f => ({ value: f.id, label: f.name }))}
                  value={createForm.factory || null} onChange={(v) => setCreateForm({ ...createForm, factory: String(v || '') })}
                  placeholder="Select factory..." required />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">File Date</label>
                <input type="date" value={createForm.file_date} onChange={(e) => setCreateForm({ ...createForm, file_date: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Remarks</label>
                <textarea value={createForm.remarks} onChange={(e) => setCreateForm({ ...createForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" rows={2} />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
                <button type="submit" disabled={creating} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white text-sm rounded-lg transition-colors">
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2">Delete File Opening?</h2>
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
