import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import { merchApi } from '../api/client';
import type { DesignSheet } from '../api/client';
import type { Column } from '../components/DataTable';

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-blue-500/20 text-badge-blue',
  rejected: 'bg-red-500/20 text-badge-red',
  closed: 'bg-surface-alt/50 text-muted',
  archived: 'bg-surface-alt/20 text-muted',
};

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  rejected: 'Rejected',
  closed: 'Closed',
  archived: 'Archived',
};

export default function DesignSheetsListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<DesignSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    merchApi
      .getDesignSheets({ page_size: '200' })
      .then((res) => setItems(res.data.results))
      .catch(() => setError('Failed to load design sheets'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      items.filter((i) =>
        `${i.file_number} ${i.style_code} ${i.buyer_name}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [items, search],
  );
  const pagedData = useMemo(() => {
    const s = (page - 1) * pageSize;
    return filtered.slice(s, s + pageSize);
  }, [filtered, page]);

  const columns: Column[] = [
    { key: 'file_number', label: 'File #', sortable: true, render: (v) => <span className="font-mono text-heading">{String(v)}</span> },
    { key: 'style_code', label: 'Style', sortable: true, render: (v) => <span className="font-mono text-heading">{String(v)}</span> },
    { key: 'buyer_name', label: 'Buyer', render: (v) => <span className="text-muted">{String(v)}</span> },
    { key: 'status', label: 'Status', sortable: true, render: (v) => {
      const s = String(v);
      return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[s] || 'bg-surface-alt/20 text-muted'}`}>{STATUS_LABELS[s] || s}</span>;
    }},
    { key: 'updated_at', label: 'Updated', render: (v) => <span className="text-muted">{v ? String(v).slice(0, 10) : '-'}</span> },
  ];

  if (loading) {
    return (
      <Layout>
        <div data-testid="design-sheets-loading" className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Design Sheets</h1>
            <p className="text-sm text-muted mt-1">Design sheets created from extracted tech packs</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {!error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
            <h2 className="text-lg font-bold">No design sheets yet</h2>
            <p className="text-muted text-sm mt-1">
              Run a tech pack import to create one.
            </p>
          </div>
        )}

        {!error && filtered.length > 0 && (
          <DataTable
            data={pagedData as unknown as Record<string, unknown>[]}
            columns={columns}
            totalCount={filtered.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by file, style or buyer..."
            loading={loading}
            onRowClick={(row) => navigate(`/design-sheets/${row.id}`)}
          />
        )}
      </div>
    </Layout>
  );
}