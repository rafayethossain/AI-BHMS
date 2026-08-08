import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { commercialApi, setupApi } from '../api/client';
import type { LC, Bank, Buyer, Currency, LCDashboard } from '../api/client';
import SearchableSelect from '../components/SearchableSelect';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { useToast } from '../contexts/ToastContext';
import Layout from '../components/Layout';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-surface-alt/20 text-muted',
  sent_to_bank: 'bg-blue-500/20 text-badge-blue',
  received: 'bg-cyan-500/20 text-cyan-400',
  accepted: 'bg-emerald-500/20 text-badge-emerald',
  amended: 'bg-amber-500/20 text-badge-amber',
  utilized: 'bg-green-500/20 text-badge-green',
  expired: 'bg-red-500/20 text-badge-red',
  cancelled: 'bg-surface-alt/20 text-muted',
};

export default function LCsListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [lcs, setLCs] = useState<LC[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    lc_type: 'master' as string,
    buyer: '',
    bank: '',
    amount: '',
    currency: 'USD',
    expiry_date: '',
    remarks: '',
  });
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [dashboard, setDashboard] = useState<LCDashboard | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);

  useEffect(() => {
    commercialApi.getLCDashboard()
      .then(res => setDashboard(res.data))
      .catch(() => { /* non-critical */ });
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), page_size: '25' };
      if (search) params.search = search;
      params.ordering = sortOrder === 'desc' ? `-${sortField}` : sortField;
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await commercialApi.getLCs(params);
      setLCs(res.data.results);
      setCount(res.data.count);
    } catch { toast('error', 'Failed to load letters of credit'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [search, page, sortField, sortOrder, filters]);
  useEffect(() => {
    setupApi.getBuyers({ page_size: '500' }).then((r) => setBuyers(r.data.results)).catch(() => {});
    commercialApi.getBanks({ page_size: '500' }).then((r) => setBanks(r.data.results)).catch(() => {});
    setupApi.getCurrencies({ page_size: '500' }).then((r) => setCurrencies(r.data.results)).catch(() => {});
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await commercialApi.createLC(createForm as unknown as Record<string, unknown>);
      setShowCreate(false);
      setCreateForm({ lc_type: 'master', buyer: '', bank: '', amount: '', currency: 'USD', expiry_date: '', remarks: '' });
      toast('success', 'LC created successfully');
      navigate(`/lcs/${res.data.id}`);
    } catch { toast('error', 'Failed to create LC'); } finally { setCreating(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await commercialApi.deleteLC(id);
      setDeleteId(null);
      toast('success', 'LC deleted');
      fetchData();
    } catch { toast('error', 'Failed to delete LC'); }
  };

  const handleSort = (field: string, order: 'asc' | 'desc') => { setSortField(field); setSortOrder(order); };
  const handleFilterChange = (f: Record<string, string>) => { setFilters(f); setPage(1); };

  const columns: Column[] = [
    { key: 'lc_number', label: 'LC #', sortable: true, render: (v) => <span className="font-mono text-emerald-700">{String(v)}</span> },
    { key: 'lc_type', label: 'Type', sortable: true, filterable: true, filterOptions: ['master', 'b2b'],
      render: (v) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${String(v) === 'master' ? 'bg-blue-500/20 text-badge-blue' : 'bg-purple-500/20 text-badge-purple'}`}>{String(v)}</span> },
    { key: 'buyer_name', label: 'Buyer', sortable: true },
    { key: 'amount', label: 'Amount', sortable: true, className: 'text-right', render: (v, row) => (
      <span className="font-mono text-right">{String(row.currency_code || row.currency)} {Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
    )},
    { key: 'expiry_date', label: 'Expiry Date', sortable: true },
    { key: 'status', label: 'Status', sortable: true, filterable: true,
      filterOptions: ['draft', 'sent_to_bank', 'received', 'accepted', 'amended', 'utilized', 'expired', 'cancelled'],
      render: (v) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[String(v)] || ''}`}>{String(v).replace('_', ' ')}</span> },
    { key: 'id', label: 'Actions', className: 'text-right', render: (_v, row) => (
      <div className="flex justify-end gap-3">
        <button onClick={(e) => { e.stopPropagation(); navigate(`/lcs/${String(row.id)}`); }} className="text-sm text-blue-700 hover:text-blue-600">View</button>
        <button onClick={(e) => { e.stopPropagation(); setDeleteId(String(row.id)); }} className="text-sm text-red-700 hover:text-red-600">Delete</button>
      </div>
    )},
  ];

  return (
    <Layout>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Letters of Credit</h1>
            <p className="text-muted text-sm mt-1">{count} total LCs</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
            + New LC
          </button>
        </div>

        {dashboard && (
          <div className="mb-6">
            <button
              onClick={() => setShowDashboard(v => !v)}
              className="text-sm text-body hover:text-heading transition-colors mb-3"
            >
              {showDashboard ? 'Hide Summary' : 'Show Summary'}
            </button>
            {showDashboard && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-surface border border-border rounded-xl p-4">
                  <div className="text-muted text-sm">Total LCs</div>
                  <div className="text-2xl font-bold text-heading mt-1">{dashboard.total_lcs}</div>
                </div>
                <div className="bg-surface border border-border rounded-xl p-4">
                  <div className="text-muted text-sm">Active LCs</div>
                  <div className="text-2xl font-bold text-badge-emerald mt-1">{dashboard.active_lcs}</div>
                </div>
                <div className="bg-surface border border-border rounded-xl p-4">
                  <div className="text-muted text-sm">Draft</div>
                  <div className="text-2xl font-bold text-badge-amber mt-1">{dashboard.draft_lcs}</div>
                </div>
                <div className="bg-surface border border-border rounded-xl p-4">
                  <div className="text-muted text-sm">Total Value</div>
                  <div className="text-2xl font-bold text-heading mt-1">
                    {Number(dashboard.total_value).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <DataTable
          data={lcs as unknown as Record<string, unknown>[]}
          columns={columns}
          totalCount={count}
          page={page}
          pageSize={25}
          onPageChange={setPage}
          searchValue={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          searchPlaceholder="Search LCs..."
          onSort={handleSort}
          sortField={sortField}
          sortOrder={sortOrder}
          filters={filters}
          onFilterChange={handleFilterChange}
          onRowClick={(row) => navigate(`/lcs/${String(row.id)}`)}
          loading={loading}
        />
      </main>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">New Letter of Credit</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-body mb-1">LC Type *</label>
                <SearchableSelect
                  options={[{value:'master', label:'Master LC'}, {value:'b2b', label:'B2B LC'}]}
                  value={String(createForm.lc_type)}
                  onChange={(v) => setCreateForm({ ...createForm, lc_type: String(v || 'master') })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Buyer *</label>
                <SearchableSelect options={buyers.map(b => ({ value: b.id, label: b.name }))} value={createForm.buyer || null}
                  onChange={(v) => setCreateForm({ ...createForm, buyer: String(v || '') })} placeholder="Select buyer..." required />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Bank</label>
                <SearchableSelect options={banks.map(b => ({ value: b.id, label: b.name }))} value={createForm.bank || null}
                  onChange={(v) => setCreateForm({ ...createForm, bank: String(v || '') })} placeholder="Select bank..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-body mb-1">Amount *</label>
                  <input required type="number" step="0.01" value={createForm.amount} onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Currency *</label>
                  <SearchableSelect
                    options={currencies.map(c => ({ value: c.id, label: c.code, description: c.name }))}
                    value={createForm.currency || null}
                    onChange={(v) => setCreateForm({ ...createForm, currency: String(v || '') })}
                    placeholder="Select currency..."
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Expiry Date *</label>
                <input required type="date" value={createForm.expiry_date} onChange={(e) => setCreateForm({ ...createForm, expiry_date: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Remarks</label>
                <textarea value={createForm.remarks} onChange={(e) => setCreateForm({ ...createForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" rows={3} />
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
            <h2 className="text-lg font-bold mb-2">Delete LC?</h2>
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
