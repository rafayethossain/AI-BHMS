import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import SpreadsheetGrid from '../components/SpreadsheetGrid';
import type { SpreadsheetColumn } from '../components/SpreadsheetGrid';
import EntityCard, { CardListToggle } from '../components/EntityCard';
import NewDesignModal from '../components/NewDesignModal';
import { merchApi, setupApi } from '../api/client';
import type { DesignSheet } from '../api/client';
import { useToast } from '../contexts/ToastContext';

type MasterOption = { id: string; name: string; code: string };

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  rejected: 'Rejected',
  closed: 'Closed',
  production: 'Production',
  archived: 'Archived',
};

const RELATIONSHIP_LABELS: Record<string, string> = {
  based_on: 'Based on',
  na: 'NA',
  recut: 'Recut',
  new: 'New',
};

export default function DesignsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState<DesignSheet[]>([]);
  const [productTypes, setProductTypes] = useState<MasterOption[]>([]);
  const [productCategories, setProductCategories] = useState<MasterOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'list'>('list');
  const [showNewDesign, setShowNewDesign] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await merchApi.getDesignSheets({ page_size: '10000' });
        setItems(res.data.results);
      } catch (err) {
        toast('error', 'Failed to load design register');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    setupApi.getTypes().then((res) => setProductTypes(res.data.results)).catch(() => undefined);
    setupApi.getCategories().then((res) => setProductCategories(res.data.results)).catch(() => undefined);
  }, []);

  const masterValues = (list: MasterOption[]) =>
    Object.fromEntries(list.map((o) => [o.name, o.name]));

  const columns: SpreadsheetColumn[] = [
    { title: 'Design', field: 'design', headerFilter: true, headerFilterType: 'input', editor: true },
    { title: 'Style Code', field: 'style_code', headerFilter: true, headerFilterType: 'input' },
    { title: 'Buyer', field: 'buyer', headerFilter: true, headerFilterType: 'list' },
    { title: 'Style Type', field: 'product_type', headerFilter: true, headerFilterType: 'list', editor: 'select', editorParams: { values: masterValues(productTypes) } },
    { title: 'Category', field: 'product_category', headerFilter: true, headerFilterType: 'list', editor: 'select', editorParams: { values: masterValues(productCategories) } },
    { title: 'Based on', field: 'based_on', headerFilter: true, headerFilterType: 'input' },
    { title: 'Relationship', field: 'relationship', headerFilter: true, headerFilterType: 'list' },
    { title: 'Status', field: 'status', headerFilter: true, headerFilterType: 'list' },
    { title: 'Department', field: 'department', headerFilter: true, headerFilterType: 'list' },
    { title: 'Designer', field: 'designer', headerFilter: true, headerFilterType: 'input' },
    { title: 'Risk Date', field: 'risk_date', headerFilter: true, headerFilterType: 'date' },
    { title: 'Live Orders', field: 'live_orders', hozAlign: 'right' },
    { title: 'Completed Orders', field: 'completed_orders', hozAlign: 'right' },
    { title: 'Pattern Request Date', field: 'pattern_request_date', headerFilter: true, headerFilterType: 'date' },
    { title: 'Annotation', field: 'annotation' },
    { title: 'Notes', field: 'notes' },
    { title: 'Sketch', field: 'sketch' },
  ];

  const gridData = items.map(o => ({
    id: o.id,
    style_id: o.style_id ?? '',
    design: o.style_name || o.style_code || '—',
    style_code: o.style_code || '—',
    buyer: o.buyer_name || '—',
    product_type: o.product_type_name || '—',
    product_category: o.product_category_name || '—',
    based_on: o.based_on || '—',
    relationship: (RELATIONSHIP_LABELS[o.relationship ?? ''] ?? '') || o.relationship || '—',
    status: STATUS_LABELS[o.status] ?? o.status.replace(/_/g, ' '),
    department: o.department || '—',
    designer: o.designer || '—',
    risk_date: o.risk_date || '—',
    live_orders: o.live_orders_count ?? 0,
    completed_orders: o.completed_orders_count ?? 0,
    pattern_request_date: o.pattern_request_date || '—',
    annotation: o.sketch_annotations.length ? `${o.sketch_annotations.length} marks` : '—',
    notes: o.note || '—',
    sketch: o.sketch || '—',
  }));

  const handleCellEdited = async (field: string, value: unknown, row: Record<string, unknown>) => {
    const styleId = row.style_id as string | undefined;
    if (!styleId || typeof value !== 'string') return;
    if (field === 'design') {
      const nextName = value;
      try {
        await merchApi.updateStyle(styleId, { name: nextName });
        setItems((prev) =>
          prev.map((o) => (o.style_id === styleId ? { ...o, style_name: nextName } : o)),
        );
      } catch {
        toast('error', 'Failed to update design name');
      }
      return;
    }
    if (field === 'product_type') {
      const match = productTypes.find((t) => t.name === value);
      if (!match) return;
      try {
        await merchApi.updateStyle(styleId, { product_type: match.id });
        setItems((prev) =>
          prev.map((o) =>
            o.style_id === styleId ? { ...o, product_type_name: match.name } : o,
          ),
        );
      } catch {
        toast('error', 'Failed to update style type');
      }
      return;
    }
    if (field === 'product_category') {
      const match = productCategories.find((c) => c.name === value);
      if (!match) return;
      try {
        await merchApi.updateStyle(styleId, { category: match.id });
        setItems((prev) =>
          prev.map((o) =>
            o.style_id === styleId ? { ...o, product_category_name: match.name } : o,
          ),
        );
      } catch {
        toast('error', 'Failed to update category');
      }
    }
  };

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await merchApi.exportDesignSheets();
      const url = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'design_register.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast('success', 'Design register exported');
    } catch {
      toast('error', 'Failed to export design register');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Layout>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Design Register</h1>
              <p className="text-sm text-muted mt-1">Design sheets across the buying house</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNewDesign(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                + New Design
              </button>
              <CardListToggle view={view} onChange={setView} />
            </div>
          </div>

          {view === 'list' ? (
            <SpreadsheetGrid
              data={gridData}
              columns={columns}
              height={480}
              toolbar
              title="Design Register"
              exportable
              onExport={handleExport}
              printable
              printTitle="Design Register"
              columnChooser
              paginationSize={20}
              loading={loading}
              onRowClick={(row) => navigate(`/design-sheets/${row.id}`)}
              onCellEdited={handleCellEdited}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {items.map((o) => (
                <EntityCard
                  key={o.id}
                  id={o.id}
                  compact
                  code={o.style_code}
                  title={o.style_name || o.style_code || '—'}
                  subtitle={[o.designer, o.department].filter(Boolean).join(' · ')}
                  status={o.status}
                  image={o.sketch_url}
                  date={o.pattern_request_date ?? undefined}
                  metrics={[
                    { label: 'Live', value: o.live_orders_count ?? 0 },
                    { label: 'Completed', value: o.completed_orders_count ?? 0 },
                  ]}
                  url={`/design-sheets/${o.id}`}
                  actions={[
                    { label: 'View', onClick: () => navigate(`/design-sheets/${o.id}`) },
                  ]}
                />
              ))}
              {items.length === 0 && !loading && (
                <div className="col-span-full bg-surface rounded-xl border border-border p-12 text-center">
                  <p className="text-lg font-medium text-heading mb-1">No designs yet</p>
                  <p className="text-sm text-muted mb-4">
                    Create a new design or run a tech pack import to start the register.
                  </p>
                  <button
                    onClick={() => setShowNewDesign(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    + New Design
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {showNewDesign && (
        <NewDesignModal
          items={items}
          onClose={() => setShowNewDesign(false)}
          onCreated={(id) => {
            setShowNewDesign(false);
            toast('success', 'Design created');
            navigate(`/design-sheets/${id}`);
          }}
        />
      )}
    </Layout>
  );
}