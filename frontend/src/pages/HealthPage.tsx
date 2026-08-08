import { useState, useEffect } from 'react';
import { monitoringApi } from '../api/client';
import type { SystemHealth } from '../api/client';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { useToast } from '../contexts/ToastContext';
import Layout from '../components/Layout';

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
  healthy: { bg: 'bg-emerald-500/10', text: 'text-badge-emerald', dot: 'bg-emerald-400' },
  degraded: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
  down: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' },
};

export default function HealthPage() {
  const { toast } = useToast();
  const [health, setHealth] = useState<SystemHealth[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('checked_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), page_size: '25' };
      params.ordering = sortOrder === 'desc' ? `-${sortField}` : sortField;
      const res = await monitoringApi.getHealth(params);
      setHealth(res.data.results);
      setCount(res.data.count);
    } catch { toast('error', 'Failed to load health data'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchHealth(); }, [page, sortField, sortOrder]);

  const runChecks = async () => {
    setChecking(true);
    try {
      const res = await monitoringApi.runHealthChecks();
      const overall = res.data.overall;
      toast(overall === 'healthy' ? 'success' : 'info', `System status: ${overall}`);
      fetchHealth();
    } catch { toast('error', 'Failed to run health checks'); } finally { setChecking(false); }
  };

  const latestByService = health.reduce<Record<string, SystemHealth>>((acc, h) => {
    if (!acc[h.service]) acc[h.service] = h;
    return acc;
  }, {});

  const handleSort = (field: string, order: 'asc' | 'desc') => { setSortField(field); setSortOrder(order); };

  const columns: Column[] = [
    { key: 'service', label: 'Service', sortable: true, render: (v) => (
      <span className="font-mono text-emerald-400 capitalize">{String(v)}</span>
    )},
    { key: 'status', label: 'Status', sortable: true, render: (v) => {
      const cfg = STATUS_CONFIG[String(v)] || STATUS_CONFIG.healthy;
      return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {String(v)}
        </span>
      );
    }},
    { key: 'response_time_ms', label: 'Response', sortable: true, render: (v) => (
      <span className="text-body">{v !== null && v !== undefined ? `${String(v)}ms` : '-'}</span>
    )},
    { key: 'message', label: 'Message', sortable: false, render: (v) => (
      <span className="text-muted text-xs truncate max-w-sm block">{String(v || '-')}</span>
    )},
    { key: 'checked_at', label: 'Checked At', sortable: true, render: (v) => (
      <span className="text-muted text-sm">{new Date(String(v)).toLocaleString()}</span>
    )},
  ];

  const serviceNames: Record<string, string> = { database: 'Database', cache: 'Cache', storage: 'Storage' };

  return (
    <Layout>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">System Health</h1>
            <p className="text-muted text-sm mt-1">Monitor service health status</p>
          </div>
          <button
            onClick={runChecks}
            disabled={checking}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {checking ? 'Running checks...' : 'Run Health Checks'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {Object.entries(serviceNames).map(([key, label]) => {
            const latest = latestByService[key];
            const cfg = latest ? STATUS_CONFIG[latest.status] : STATUS_CONFIG.healthy;
            return (
              <div key={key} className={`p-4 rounded-xl border border-border ${cfg.bg}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-body">{label}</span>
                  <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                </div>
                <div className={`text-lg font-bold ${cfg.text}`}>
                  {latest ? latest.status : 'No data'}
                </div>
                {latest?.response_time_ms !== null && latest?.response_time_ms !== undefined && (
                  <div className="text-xs text-faint mt-1">{latest.response_time_ms}ms</div>
                )}
                {latest?.message && (
                  <div className="text-xs text-faint mt-1 truncate">{latest.message}</div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mb-4">
          <h2 className="text-lg font-semibold text-heading">Check History</h2>
        </div>

        <DataTable
          data={health as unknown as Record<string, unknown>[]}
          columns={columns}
          totalCount={count}
          page={page}
          pageSize={25}
          onPageChange={setPage}
          searchPlaceholder=""
          onSort={handleSort}
          sortField={sortField}
          sortOrder={sortOrder}
          loading={loading}
        />
      </main>
    </Layout>
  );
}
