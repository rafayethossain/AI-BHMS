import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import StatusPill from '../components/StatusPill';
import { useToast } from '../components/Toast';
import { getDesignDetail, updateDesign } from '../mock/api';
import type { DesignDetail, DesignStatus } from '../mock/types';
import StatusWizard from './designDetail/StatusWizard';
import OverviewTab from './designDetail/OverviewTab';
import SketchesTab from './designDetail/SketchesTab';
import VersionsTab from './designDetail/VersionsTab';
import PosTab from './designDetail/PosTab';
import ItemsTab from './designDetail/ItemsTab';
import BomTab from './designDetail/BomTab';
import ImagesTab from './designDetail/ImagesTab';
import TechPacksTab from './designDetail/TechPacksTab';
import SalesOrderTab from './designDetail/SalesOrderTab';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'sketches', label: 'Sketches' },
  { id: 'versions', label: 'Versions' },
  { id: 'pos', label: 'Purchase Orders' },
  { id: 'items', label: 'Items' },
  { id: 'bom', label: 'BOM' },
  { id: 'images', label: 'Design Images' },
  { id: 'tech-packs', label: 'Tech Packs' },
  { id: 'sales-order', label: 'Sales Order' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function DesignDetailPage() {
  const { designCode = '' } = useParams();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<DesignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>('overview');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getDesignDetail(designCode);
    setDetail(data ?? null);
    setLoading(false);
  }, [designCode]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleTransition = useCallback(
    async (next: DesignStatus, message: string) => {
      if (!detail) return;
      setBusy(true);
      try {
        const updated = await updateDesign(detail.design.id, { status: next });
        if (!updated) throw new Error('update failed');
        setDetail((prev) => (prev ? { ...prev, design: updated } : prev));
        addToast(message);
      } catch {
        addToast('Could not update design status', 'error');
      } finally {
        setBusy(false);
      }
    },
    [detail, addToast],
  );

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted">Loading design…</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-sm text-heading">Design not found</p>
        <Link to="/design" className="text-sm text-emerald-600 hover:text-emerald-500">
          Back to register
        </Link>
      </div>
    );
  }

  const { design } = detail;
  const currentVersion = detail.versions.find((v) => v.version_number === design.current_version);

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="p-6 pb-0 space-y-4">
        <Link to="/design" className="inline-flex text-sm text-muted hover:text-heading">
          ← Back to register
        </Link>

        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-heading">Design {design.design_code}</h1>
              <StatusPill value={design.status} />
            </div>
            <p className="text-sm text-muted mt-1">
              {design.buyer} · {design.category} · {design.style_type} · current{' '}
              {design.current_version}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => addToast('Create purchase order is wired in the Purchase Orders slice')}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-input-border bg-surface text-heading hover:bg-surface-alt"
            >
              + Create PO
            </button>
            <button
              type="button"
              disabled={!currentVersion}
              onClick={() =>
                currentVersion &&
                navigate(`/designs/${design.design_code}/versions/${currentVersion.id}`)
              }
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-input-border bg-surface text-heading hover:bg-surface-alt disabled:opacity-50"
            >
              + Add Update
            </button>
            <Link
              to={`/designs/${design.design_code}/print`}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-input-border bg-surface text-heading hover:bg-surface-alt"
            >
              Print Design Sheet
            </Link>
          </div>
        </div>

        <div role="tablist" aria-label="Design detail tabs" className="flex gap-1 border-b border-border overflow-x-auto">
          {TABS.map((t) => {
            const selected = t.id === tab;
            return (
              <button
                key={t.id}
                role="tab"
                type="button"
                id={`tab-${t.id}`}
                aria-selected={selected}
                aria-controls={`panel-${t.id}`}
                onClick={() => setTab(t.id)}
                className={`px-3 py-2 text-sm whitespace-nowrap -mb-px border-b-2 transition-colors ${
                  selected
                    ? 'border-emerald-500 text-heading font-medium'
                    : 'border-transparent text-muted hover:text-heading'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        id={`panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
        className="flex-1 p-6"
      >
        {tab === 'overview' && (
          <div className="space-y-6">
            <StatusWizard status={design.status} busy={busy} onTransition={handleTransition} />
            <OverviewTab design={design} salesOrder={detail.sales_order} />
          </div>
        )}
        {tab === 'sketches' && <SketchesTab sketches={detail.sketches} />}
        {tab === 'versions' && (
          <VersionsTab versions={detail.versions} designCode={design.design_code} />
        )}
        {tab === 'pos' && <PosTab pos={detail.pos} />}
        {tab === 'items' && <ItemsTab items={detail.items} />}
        {tab === 'bom' && <BomTab bom={detail.bom} />}
        {tab === 'images' && <ImagesTab images={detail.images} />}
        {tab === 'tech-packs' && <TechPacksTab techPacks={detail.tech_packs} />}
        {tab === 'sales-order' && <SalesOrderTab pos={detail.pos} versions={detail.versions} />}
      </div>
    </div>
  );
}