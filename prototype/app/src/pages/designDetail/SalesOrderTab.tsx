import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import StatusPill from '../../components/StatusPill';
import type { DesignPOWithStatus, DesignVersion, SalesOrderStatuses } from '../../mock/types';

const AREAS: (keyof SalesOrderStatuses)[] = [
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

interface SalesOrderTabProps {
  pos: DesignPOWithStatus[];
  versions: DesignVersion[];
}

export default function SalesOrderTab({ pos, versions }: SalesOrderTabProps) {
  const current = versions.find((v) => v.is_current) ?? versions[0];
  const [versionNumber, setVersionNumber] = useState(current?.version_number ?? '');

  const rows = useMemo(
    () => pos.filter((p) => p.version_number === versionNumber),
    [pos, versionNumber],
  );

  if (!current) {
    return <p className="text-sm text-muted">No sales orders yet.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-medium text-heading">Sales Order report</h2>
          <p className="text-xs text-muted mt-1">
            Per-PO status matrix rolled up by area. Red = delayed or overdue against today.
          </p>
        </div>
        <label className="text-xs text-muted">
          Version
          <select
            aria-label="Version"
            value={versionNumber}
            onChange={(e) => setVersionNumber(e.target.value)}
            className="ml-2 px-2 py-1 text-sm rounded-lg border border-input-border bg-surface text-heading"
          >
            {versions.map((v) => (
              <option key={v.id} value={v.version_number}>
                {v.version_number}
                {v.is_current ? ' (current)' : ''}
              </option>
            ))}
          </select>
        </label>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted">No purchase orders on this version.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-input-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-alt text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-3 py-2 font-medium whitespace-nowrap">PO Number</th>
                {AREAS.map((area) => (
                  <th key={area} className="px-3 py-2 font-medium whitespace-nowrap">
                    {AREA_LABELS[area]}
                  </th>
                ))}
                <th className="px-3 py-2 font-medium whitespace-nowrap">Delivery Date</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {rows.map((po) => (
                <tr key={po.id} data-testid="so-po-row" className="border-t border-border/40">
                  <td className="px-3 py-2 font-mono text-xs text-heading">{po.po_number}</td>
                  {AREAS.map((area) => (
                    <td key={area} className="px-3 py-2">
                      <StatusPill value={po.statuses[area].code} risk={po.statuses[area]} />
                    </td>
                  ))}
                  <td className="px-3 py-2 text-body">{po.delivery_date}</td>
                  <td className="px-3 py-2">
                    <Link
                      to={`/purchase-orders/${po.po_number}`}
                      className="text-xs font-medium text-emerald-600 hover:text-emerald-500 whitespace-nowrap"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}