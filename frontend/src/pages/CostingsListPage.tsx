import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { merchApi } from '../api/client';
import type { Costing } from '../api/client';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import Layout from '../components/Layout';
import { useToast } from '../contexts/ToastContext';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-surface-alt/20 text-muted',
  pending: 'bg-amber-500/20 text-badge-amber',
  approved: 'bg-emerald-500/20 text-badge-emerald',
  rejected: 'bg-red-500/20 text-badge-red',
};

export default function CostingsListPage() {
  const navigate = useNavigate();
  const [costings, setCostings] = useState<Costing[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), page_size: '25' };
      params.ordering = sortOrder === 'desc' ? `-${sortField}` : sortField;
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await merchApi.getCostings(params);
      setCostings(res.data.results); setCount(res.data.count);
    } catch { toast('error', 'Failed to load costings'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [page, sortField, sortOrder, filters]);

  const handleSort = (field: string, order: 'asc' | 'desc') => { setSortField(field); setSortOrder(order); };
  const handleFilterChange = (f: Record<string, string>) => { setFilters(f); setPage(1); };

  const columns: Column[] = [
    { key: 'po_number', label: 'PO #', sortable: true, render: (v) => <span className="font-mono text-emerald-700">{String(v)}</span> },
    { key: 'sheet_type', label: 'Sheet', sortable: true, filterable: true, filterOptions: ['sl', 'vn', 'bd', 'cn', 'other'],
      render: (v, row) => (
        <div className="flex items-center gap-2">
          <span className="text-body">{String((row as unknown as Costing).sheet_type_label || v)}</span>
          {(row as unknown as Costing).is_live && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-700">Live</span>}
        </div>
      ) },
    { key: 'fabric_cost', label: 'Fabric', sortable: true, className: 'text-right', render: (v) => <span className="text-body">${parseFloat(String(v)).toLocaleString()}</span> },
    { key: 'trim_cost', label: 'Trim', sortable: true, className: 'text-right', render: (v) => <span className="text-body">${parseFloat(String(v)).toLocaleString()}</span> },
    { key: 'cm_cost', label: 'CM', sortable: true, className: 'text-right', render: (v) => <span className="text-body">${parseFloat(String(v)).toLocaleString()}</span> },
    { key: 'overhead_cost', label: 'Overhead', sortable: true, className: 'text-right', render: (v) => <span className="text-body">${parseFloat(String(v)).toLocaleString()}</span> },
    { key: 'total_cost', label: 'Total', sortable: true, className: 'text-right', render: (v) => <span className="text-emerald-700 font-mono font-bold">${parseFloat(String(v)).toLocaleString()}</span> },
    { key: 'status', label: 'Status', sortable: true, filterable: true, filterOptions: ['draft', 'pending', 'approved', 'rejected'],
      render: (v) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[String(v)] || ''}`}>{String(v)}</span> },
    { key: 'design', label: 'Design', render: (_v, row) => {
      const c = row as unknown as Costing;
      return (
        <div className="flex flex-wrap gap-1">
          {c.is_single_size && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-500/15 text-badge-red">Single Size</span>}
          {c.is_patterned && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-500/15 text-purple-700">Patterned</span>}
          {c.confirmed && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-500/15 text-blue-700">Confirmed</span>}
          {!c.is_single_size && !c.is_patterned && !c.confirmed && <span className="text-xs text-faint">—</span>}
        </div>
      );
    } },
    { key: 'id', label: 'Actions', className: 'text-right', render: (_v, row) => (
      <button onClick={(e) => { e.stopPropagation(); navigate(`/costings/${String(row.id)}`); }} className="text-sm text-blue-700 hover:text-blue-600">View</button>
    )},
  ];

  return (
    <Layout>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Costings</h1>
            <p className="text-muted text-sm mt-1">{count} total costings</p>
          </div>
        </div>

        <DataTable
          data={costings as unknown as Record<string, unknown>[]}
          columns={columns}
          totalCount={count}
          page={page}
          pageSize={25}
          onPageChange={setPage}
          onSort={handleSort}
          sortField={sortField}
          sortOrder={sortOrder}
          filters={filters}
          onFilterChange={handleFilterChange}
          onRowClick={(row) => navigate(`/costings/${String(row.id)}`)}
          loading={loading}
        />
      </main>
    </Layout>
  );
}
