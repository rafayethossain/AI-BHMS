import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { merchApi } from '../api/client';
import type { TA } from '../api/client';
import SpreadsheetGrid from '../components/SpreadsheetGrid';
import type { SpreadsheetColumn } from '../components/SpreadsheetGrid';
import Layout from '../components/Layout';
import { useToast } from '../contexts/ToastContext';

export default function TAsListPage() {
  const navigate = useNavigate();
  const [tas, setTAs] = useState<TA[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await merchApi.getTAs({ page_size: '10000' });
      setTAs(res.data.results); setCount(res.data.count);
    } catch { toast('error', 'Failed to load T&As'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const columns: SpreadsheetColumn[] = [
    { title: 'PO #', field: 'po_number', headerFilter: true, frozen: true, hozAlign: 'left' },
    { title: 'Delivery Date', field: 'delivery_date', headerFilter: true },
    { title: 'Status', field: 'status', headerFilter: true },
    { title: 'Milestones', field: 'milestones_display', hozAlign: 'center' },
  ];

  const gridData = tas.map((ta) => ({
    ...ta,
    milestones_display: Array.isArray(ta.milestones)
      ? `${ta.milestones.filter((m) => m.status === 'completed').length}/${ta.milestones.length}`
      : '0',
  })) as unknown as Record<string, unknown>[];

  return (
    <Layout>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Time & Action</h1>
            <p className="text-muted text-sm mt-1">{count} total T&As</p>
          </div>
        </div>

        <SpreadsheetGrid
          data={gridData}
          columns={columns}
          height={480}
          toolbar
          title="Time & Action"
          exportable
          columnChooser
          paginationSize={25}
          actionColumn
          onView={(row) => navigate(`/tas/${String(row.id)}`)}
          onRowClick={(row) => navigate(`/tas/${String(row.id)}`)}
          loading={loading}
        />
      </main>
    </Layout>
  );
}
