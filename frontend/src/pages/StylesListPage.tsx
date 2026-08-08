import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { merchApi, setupApi } from '../api/client';
import type { Style, Buyer } from '../api/client';
import SearchableSelect from '../components/SearchableSelect';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import EntityCard, { CardListToggle } from '../components/EntityCard';
import { useToast } from '../contexts/ToastContext';
import Layout from '../components/Layout';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-surface-alt/20 text-muted',
  active: 'bg-blue-500/20 text-badge-blue',
  approved: 'bg-emerald-500/20 text-badge-emerald',
  archived: 'bg-amber-500/20 text-badge-amber',
};

export default function StylesListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [styles, setStyles] = useState<Style[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '', buyer: '' });
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [view, setView] = useState<'grid' | 'list'>('list');

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), page_size: '25' };
      if (search) params.search = search;
      params.ordering = sortOrder === 'desc' ? `-${sortField}` : sortField;
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await merchApi.getStyles(params);
      setStyles(res.data.results); setCount(res.data.count);
    } catch { toast('error', 'Failed to load styles'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [search, page, sortField, sortOrder, filters]);
  useEffect(() => {
    setupApi.getBuyers({ page_size: '500' }).then((r) => setBuyers(r.data.results)).catch(() => {}); // Silently ignore - secondary dropdown data
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await merchApi.createStyle(createForm);
      setShowCreate(false); setCreateForm({ name: '', description: '', buyer: '' });
      toast('success', 'Style created successfully'); navigate(`/styles/${res.data.id}`);
    } catch { toast('error', 'Failed to create style'); } finally { setCreating(false); }
  };

  const handleDelete = async (id: string) => {
    try { await merchApi.deleteStyle(id); setDeleteId(null); toast('success', 'Style deleted'); fetchData(); } catch { toast('error', 'Failed to delete style'); }
  };

  const handleSort = (field: string, order: 'asc' | 'desc') => { setSortField(field); setSortOrder(order); };

  const handleFilterChange = (f: Record<string, string>) => { setFilters(f); setPage(1); };

  const columns: Column[] = [
    { key: 'image', label: '', className: 'w-14', render: (_v, row) => {
      const url = (row.main_image as string | null) || (row.sketch_front as string | null) || null;
      return url ? (
        <img src={url} alt={String(row.name)} className="w-10 h-10 object-cover rounded-lg border border-input-border" />
      ) : (
        <div className="w-10 h-10 bg-surface-alt rounded-lg border border-input-border flex items-center justify-center text-xs text-faint">—</div>
      );
    }},
    { key: 'style_number', label: 'Style #', sortable: true, render: (v) => <span className="font-mono text-emerald-400">{String(v)}</span> },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'buyer_name', label: 'Buyer', sortable: true },
    { key: 'status', label: 'Status', sortable: true, filterable: true, filterOptions: ['draft', 'active', 'approved', 'archived'],
      render: (v) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[String(v)] || ''}`}>{String(v)}</span> },
    { key: 'file_openings_count', label: 'FOs', sortable: true, className: 'text-right' },
    { key: 'purchase_orders_count', label: 'POs', sortable: true, className: 'text-right' },
    { key: 'id', label: 'Actions', className: 'text-right', render: (_v, row) => (
      <div className="flex justify-end gap-3">
        <button onClick={(e) => { e.stopPropagation(); navigate(`/styles/${row.id}`); }} className="text-sm text-blue-400 hover:text-blue-300">View</button>
        <button onClick={(e) => { e.stopPropagation(); setDeleteId(String(row.id)); }} className="text-sm text-red-400 hover:text-red-300">Delete</button>
      </div>
    )},
  ];

  return (
    <Layout>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Styles</h1>
            <p className="text-muted text-sm mt-1">{count} total styles</p>
          </div>
          <div className="flex items-center gap-3">
            <CardListToggle view={view} onChange={setView} />
            <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
              + New Style
            </button>
          </div>
        </div>

        {view === 'list' ? (
          <DataTable
            data={styles as unknown as Record<string, unknown>[]}
            columns={columns}
            totalCount={count}
            page={page}
            pageSize={25}
            onPageChange={setPage}
            searchValue={search}
            onSearchChange={(v) => { setSearch(v); setPage(1); }}
            searchPlaceholder="Search styles..."
            onSort={handleSort}
            sortField={sortField}
            sortOrder={sortOrder}
            filters={filters}
            onFilterChange={handleFilterChange}
            onRowClick={(row) => navigate(`/styles/${String(row.id)}`)}
            loading={loading}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {styles.map(style => (
              <EntityCard key={style.id} id={style.id} code={style.style_number} title={style.name}
                subtitle={style.buyer_name} status={style.status} image={style.main_image || style.sketch_front}
                metrics={[
                  { label: 'FOs', value: style.file_openings_count },
                  { label: 'POs', value: style.purchase_orders_count },
                ]}
                url={`/styles/${style.id}`}
                actions={[
                  { label: 'View', onClick: () => navigate(`/styles/${style.id}`) },
                  { label: 'Delete', onClick: () => setDeleteId(style.id), color: 'bg-red-500/10 text-red-400 hover:bg-red-500/20' },
                ]} />
            ))}
            {styles.length === 0 && !loading && (
              <div className="col-span-full bg-surface rounded-xl border border-border p-12 text-center">
                <svg className="w-12 h-12 text-faint mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" /></svg>
                <p className="text-lg font-medium text-heading mb-1">No styles yet</p>
                <p className="text-sm text-muted mb-4">Create your first style to get started with the design-to-delivery workflow.</p>
                <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg font-medium transition-colors">+ New Style</button>
              </div>
            )}
          </div>
        )}
      </main>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">New Style</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-body mb-1">Name *</label>
                <input required value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Style name" />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Description</label>
                <textarea value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" rows={3} />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Buyer</label>
                <SearchableSelect options={buyers.map(b => ({ value: b.id, label: b.name }))} value={createForm.buyer || null}
                  onChange={(v) => setCreateForm({ ...createForm, buyer: String(v || '') })} placeholder="Select buyer..." />
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
            <h2 className="text-lg font-bold mb-2">Delete Style?</h2>
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
