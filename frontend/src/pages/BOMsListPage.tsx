import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { merchApi } from '../api/client';
import type { BOM } from '../api/client';
import SearchableSelect from '../components/SearchableSelect';
import SpreadsheetGrid from '../components/SpreadsheetGrid';
import type { SpreadsheetColumn } from '../components/SpreadsheetGrid';
import { useToast } from '../contexts/ToastContext';
import Layout from '../components/Layout';

export default function BOMsListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [boms, setBoms] = useState<BOM[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [versions, setVersions] = useState<{ id: string; style_number: string; version_number: number }[]>([]);
  const [createForm, setCreateForm] = useState({ style_version: '', name: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await merchApi.getBOMs({ page_size: '10000' });
      setBoms(res.data.results);
    } catch { toast('error', 'Failed to load BOMs'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    merchApi.getAllStyleVersions({ page_size: '500' }).then(r => {
      const results = Array.isArray(r.data) ? r.data : r.data.results;
      setVersions(results.map((sv: { id: string; style?: { style_number?: string }; style_number?: string; version_number: number }) => ({
        id: sv.id,
        style_number: String(sv.style?.style_number || (sv as Record<string, unknown>).style_number || '—'),
        version_number: sv.version_number,
      })));
    }).catch(() => {}); // Silently ignore - secondary dropdown data
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await merchApi.createBOM(createForm);
      setShowCreate(false); setCreateForm({ style_version: '', name: '' });
      toast('success', 'BOM created successfully'); navigate(`/boms/${res.data.id}`);
    } catch (err: unknown) {
      const axiosData = (err as { response?: { data?: { error?: string } } })?.response?.data;
      toast('error', axiosData?.error || 'Failed to create BOM'); } finally { setCreating(false); }
  };

  const handleDelete = async (id: string) => {
    try { await merchApi.deleteBOM(id); setDeleteId(null); toast('success', 'BOM deleted'); fetchData(); } catch { toast('error', 'Failed to delete BOM'); }
  };

  const columns: SpreadsheetColumn[] = [
    { title: 'Style', field: 'style_number', headerFilter: true },
    { title: 'Name', field: 'name', headerFilter: true },
    { title: 'Version', field: 'version', hozAlign: 'center' },
    { title: 'Status', field: 'status', headerFilter: true },
    { title: 'Total Cost', field: 'total_cost', hozAlign: 'right' },
  ];

  const gridData = boms.map((bom) => ({
    ...bom,
    version: `v${bom.version}`,
    status: String(bom.status),
    total_cost: `$${Number(bom.total_cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
  }));

  return (
    <Layout>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Bill of Materials</h1>
            <p className="text-muted text-sm mt-1">{boms.length} total BOMs</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
            + New BOM
          </button>
        </div>

        <SpreadsheetGrid
          data={gridData as unknown as Record<string, unknown>[]}
          columns={columns}
          height={480}
          toolbar
          title="Bill of Materials"
          exportable
          columnChooser
          paginationSize={25}
          actionColumn
          onAdd={() => setShowCreate(true)}
          onEdit={(row) => navigate(`/boms/${String(row.id)}`)}
          onDelete={(row) => setDeleteId(String(row.id))}
          onRowClick={(row) => navigate(`/boms/${String(row.id)}`)}
          loading={loading}
        />
      </main>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">New BOM</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-body mb-1">Style Version *</label>
                <SearchableSelect options={versions.map(v => ({ value: v.id, label: `${v.style_number} v${v.version_number}` }))}
                  value={createForm.style_version || null} onChange={(v) => setCreateForm({ ...createForm, style_version: String(v || '') })}
                  placeholder="Select style version..." required />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Name *</label>
                <input required value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. Summer Collection BOM" />
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
            <h2 className="text-lg font-bold mb-2">Delete BOM?</h2>
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