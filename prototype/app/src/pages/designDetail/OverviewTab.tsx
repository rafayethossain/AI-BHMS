import StatusPill from '../../components/StatusPill';
import type { DesignRegisterRow, SalesOrderStatuses } from '../../mock/types';

const RISK_AREAS: (keyof SalesOrderStatuses)[] = [
  'fabric',
  'trims',
  'production',
  'delivery',
  'overall',
];

const AREA_LABELS: Record<keyof SalesOrderStatuses, string> = {
  fabric: 'Fabric',
  trims: 'Trims',
  production: 'Production',
  delivery: 'Delivery',
  overall: 'Overall',
};

const FIELDS: { label: string; key: keyof DesignRegisterRow }[] = [
  { label: 'Design Code', key: 'design_code' },
  { label: 'Style Type', key: 'style_type' },
  { label: 'Category', key: 'category' },
  { label: 'Buyer', key: 'buyer' },
  { label: 'Current Version', key: 'current_version' },
  { label: 'Issue Date', key: 'issue_date' },
  { label: 'Block', key: 'block' },
  { label: 'Designer', key: 'designer' },
  { label: 'Size', key: 'size' },
  { label: 'Issuer', key: 'issuer' },
  { label: 'Length', key: 'length' },
  { label: 'Description', key: 'description' },
];

interface OverviewTabProps {
  design: DesignRegisterRow;
  salesOrder: SalesOrderStatuses;
}

export default function OverviewTab({ design, salesOrder }: OverviewTabProps) {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-sm font-medium text-heading mb-3">Design information</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <dt className="text-muted">{f.label}</dt>
              <dd className="text-heading font-medium mt-0.5">
                {String(design[f.key] ?? '') || '—'}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h2 className="text-sm font-medium text-heading mb-3">Sales order risk</h2>
        <div data-testid="design-risk-row" className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {RISK_AREAS.map((area) => (
            <div key={area} className="rounded-lg border border-border bg-surface p-3">
              <p className="text-xs text-muted">{AREA_LABELS[area]}</p>
              <div className="mt-1.5">
                <StatusPill value={salesOrder[area].code} risk={salesOrder[area]} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-heading mb-3">Design notes</h2>
        <p className="text-sm text-body">{String(design.design_notes ?? '') || '—'}</p>
      </section>
    </div>
  );
}