import { useState, useEffect } from 'react';
import { monitoringApi } from '../api/client';
import type { AuditLog } from '../api/client';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { useToast } from '../contexts/ToastContext';
import Layout from '../components/Layout';

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-emerald-500/20 text-badge-emerald',
  update: 'bg-blue-500/20 text-badge-blue',
  delete: 'bg-red-500/20 text-badge-red',
  view: 'bg-surface-alt/50 text-muted',
  export: 'bg-purple-500/20 text-badge-purple',
  transition: 'bg-amber-500/20 text-badge-amber',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const { toast } = useToast();
  const [filters, setFilters] = useState<Record<string, string>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), page_size: '25' };
      if (search) params.search = search;
      params.ordering = sortOrder === 'desc' ? `-${sortField}` : sortField;
      if (filters.action) params.action = filters.action;
      if (filters.entity_type) params.entity_type = filters.entity_type;
      const res = await monitoringApi.getAuditLogs(params);
      setLogs(res.data.results);
      setCount(res.data.count);
    } catch { toast('error', 'Failed to load audit logs'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [search, page, sortField, sortOrder, filters]);

  const handleSort = (field: string, order: 'asc' | 'desc') => { setSortField(field); setSortOrder(order); };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const columns: Column[] = [
    { key: 'created_at', label: 'Time', sortable: true, render: (v) => (
      <div>
        <div className="text-sm text-heading">{formatRelativeTime(String(v))}</div>
        <div className="text-xs text-faint">{new Date(String(v)).toLocaleString()}</div>
      </div>
    )},
    { key: 'user_name', label: 'User', sortable: false, render: (v) => (
      <span className="text-body">{String(v || 'System')}</span>
    )},
    { key: 'action', label: 'Action', sortable: true, render: (v) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${ACTION_COLORS[String(v)] || ''}`}>
        {String(v)}
      </span>
    )},
    { key: 'entity_type', label: 'Entity', sortable: true, render: (_v, row) => (
      <div>
        <span className="text-emerald-700 font-mono text-sm">{String(row.entity_type)}</span>
        {!!row.entity_id && <span className="text-faint text-xs ml-2">#{String(row.entity_id).slice(0, 8)}</span>}
      </div>
    )},
    { key: 'description', label: 'Description', sortable: false, render: (v) => (
      <span className="text-muted text-xs truncate max-w-xs block">{String(v)}</span>
    )},
    { key: 'ip_address', label: 'IP Address', sortable: false, render: (v) => (
      <span className="font-mono text-xs text-faint">{String(v || '-')}</span>
    )},
  ];

  return (
    <Layout>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <p className="text-muted text-sm mt-1">{count} total entries</p>
        </div>

        <DataTable
          data={logs as unknown as Record<string, unknown>[]}
          columns={columns}
          totalCount={count}
          page={page}
          pageSize={25}
          onPageChange={setPage}
          searchValue={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          searchPlaceholder="Search audit logs..."
          onSort={handleSort}
          sortField={sortField}
          sortOrder={sortOrder}
          loading={loading}
          filters={filters}
          onFilterChange={(f) => { setFilters(f); setPage(1); }}
        />
      </main>
    </Layout>
  );
}
