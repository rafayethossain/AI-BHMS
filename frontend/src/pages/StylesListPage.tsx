import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { merchApi, setupApi } from '../api/client';
import type { Style, Buyer } from '../api/client';
import SearchableSelect from '../components/SearchableSelect';
import SpreadsheetGrid from '../components/SpreadsheetGrid';
import type { SpreadsheetColumn } from '../components/SpreadsheetGrid';
import EntityCard, { CardListToggle } from '../components/EntityCard';
import { useToast } from '../contexts/ToastContext';
import Layout from '../components/Layout';

export default function StylesListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [styles, setStyles] = useState<Style[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '', buyer: '' });
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [view, setView] = useState<'grid' | 'list'>('list');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await merchApi.getStyles({ page_size: '10000' });
      setStyles(res.data.results); setCount(res.data.count);
    } catch { toast('error', 'Failed to load styles'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);
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

  const columns: SpreadsheetColumn[] = [
    { title: 'Style #', field: 'style_number', headerFilter: true, frozen: true, hozAlign: 'left' },
    { title: 'Name', field: 'name', headerFilter: true },
    { title: 'Buyer', field: 'buyer_name', headerFilter: true },
    { title: 'Status', field: 'status', headerFilter: true },
    { title: 'FOs', field: 'file_openings_count', hozAlign: 'right' },
    { title: 'POs', field: 'purchase_orders_count', hozAlign: 'right' },
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
          <SpreadsheetGrid
            data={styles as unknown as Record<string, unknown>[]}
            columns={columns}
            height={460}
            toolbar
            title="Styles"
            exportable
            columnChooser
            paginationSize={25}
            actionColumn
            onAdd={() => setShowCreate(true)}
            onView={(row) => navigate(`/styles/${String(row.id)}`)}
            onDelete={(row) => setDeleteId(String(row.id))}
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
