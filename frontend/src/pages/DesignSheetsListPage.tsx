import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import SpreadsheetGrid from '../components/SpreadsheetGrid';
import type { SpreadsheetColumn } from '../components/SpreadsheetGrid';
import { merchApi } from '../api/client';
import type { DesignSheet } from '../api/client';

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  rejected: 'Rejected',
  closed: 'Closed',
  archived: 'Archived',
};

const COLUMNS: SpreadsheetColumn[] = [
  { title: 'File #', field: 'file_number', width: 130, headerFilter: true },
  { title: 'Style', field: 'style_code', width: 120, headerFilter: true },
  { title: 'Buyer', field: 'buyer_name', headerFilter: true },
  { title: 'Status', field: 'status', width: 110 },
  { title: 'Updated', field: 'updated_at', width: 120 },
];

export default function DesignSheetsListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<DesignSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    merchApi
      .getDesignSheets({ page_size: '200' })
      .then((res) => setItems(res.data.results))
      .catch(() => setError('Failed to load design sheets'))
      .finally(() => setLoading(false));
  }, []);

  const rows = items.map((i) => ({
    __id: i.id,
    id: i.id,
    file_number: i.file_number,
    style_code: i.style_code,
    buyer_name: i.buyer_name,
    status: STATUS_LABELS[i.status] || i.status,
    updated_at: i.updated_at ? String(i.updated_at).slice(0, 10) : '-',
  }));

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

        {!error && items.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
            <h2 className="text-lg font-bold">No design sheets yet</h2>
            <p className="text-muted text-sm mt-1">
              Run a tech pack import to create one.
            </p>
          </div>
        )}

        {!error && items.length > 0 && (
          <div className="bg-surface rounded-xl border border-border">
            <SpreadsheetGrid
              data={rows}
              columns={COLUMNS}
              height={460}
              layout="fitColumns"
              onRowClick={(row) => navigate(`/design-sheets/${String(row.id)}`)}
            />
          </div>
        )}
      </div>
    </Layout>
  );
}
