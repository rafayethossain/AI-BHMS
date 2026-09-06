import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { merchApi } from '../api/client';
import type { Costing } from '../api/client';
import SpreadsheetGrid from '../components/SpreadsheetGrid';
import type { SpreadsheetColumn } from '../components/SpreadsheetGrid';
import Layout from '../components/Layout';
import { useToast } from '../contexts/ToastContext';

export default function CostingsListPage() {
  const navigate = useNavigate();
  const [costings, setCostings] = useState<Costing[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await merchApi.getCostings({ page_size: '10000' });
      setCostings(res.data.results);
      setCount(res.data.count);
    } catch { toast('error', 'Failed to load costings'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const columns: SpreadsheetColumn[] = [
    { title: 'PO #', field: 'po_number', headerFilter: true },
    { title: 'Sheet', field: 'sheet_type', headerFilter: true },
    { title: 'Fabric', field: 'fabric_cost', hozAlign: 'right' },
    { title: 'Trim', field: 'trim_cost', hozAlign: 'right' },
    { title: 'CM', field: 'cm_cost', hozAlign: 'right' },
    { title: 'Overhead', field: 'overhead_cost', hozAlign: 'right' },
    { title: 'Total', field: 'total_cost', hozAlign: 'right' },
    { title: 'Status', field: 'status', headerFilter: true },
    { title: 'Design', field: 'design' },
  ];

  const gridData = costings.map((c) => ({
    ...c,
    sheet_type_label: c.sheet_type_label || c.sheet_type,
    fabric_cost: `$${parseFloat(c.fabric_cost).toLocaleString()}`,
    trim_cost: `$${parseFloat(c.trim_cost).toLocaleString()}`,
    cm_cost: `$${parseFloat(c.cm_cost).toLocaleString()}`,
    overhead_cost: `$${parseFloat(c.overhead_cost).toLocaleString()}`,
    total_cost: `$${parseFloat(c.total_cost).toLocaleString()}`,
    design: [
      c.is_single_size ? 'Single Size' : null,
      c.is_patterned ? 'Patterned' : null,
      c.confirmed ? 'Confirmed' : null,
    ].filter(Boolean).join(', ') || '—',
  }));

  return (
    <Layout>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Costings</h1>
            <p className="text-muted text-sm mt-1">{count} total costings</p>
          </div>
        </div>

        <SpreadsheetGrid
          data={gridData as unknown as Record<string, unknown>[]}
          columns={columns}
          height={480}
          toolbar
          title="Costings"
          exportable
          columnChooser
          paginationSize={25}
          actionColumn
          onView={(row) => navigate(`/costings/${String(row.id)}`)}
          onRowClick={(row) => navigate(`/costings/${String(row.id)}`)}
          loading={loading}
        />
      </main>
    </Layout>
  );
}
