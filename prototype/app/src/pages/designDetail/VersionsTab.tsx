import { Link } from 'react-router-dom';
import ReportTable, { ReportCell } from './ReportTable';
import StatusPill from '../../components/StatusPill';
import type { DesignVersion } from '../../mock/types';

/**
 * A design version opened as a commercial file carries the FN; the FN is the commercial tracking key
 * and every PO of that version tracks under it. There is no separate file-opening layer, so each row
 * links straight into the version's commercial file.
 */
export default function VersionsTab({
  versions,
  designCode,
}: {
  versions: DesignVersion[];
  designCode: string;
}) {
  if (versions.length === 0) {
    return <p className="text-sm text-muted">No versions yet.</p>;
  }
  return (
    <ReportTable
      columns={[
        'Version',
        'FN Number',
        'Status',
        'Flags',
        'Qty',
        'Unit Price',
        'Issue Date',
        'Revision Notes',
        'File',
      ]}
    >
      {versions.map((v) => (
        <tr key={v.id} className="border-t border-border/40">
          <ReportCell>
            <span className="font-medium text-heading">{v.version_number}</span>
            {v.is_current && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-600">
                Current
              </span>
            )}
          </ReportCell>
          <ReportCell className="font-mono text-xs">
            <Link
              to={`/designs/${designCode}/versions/${v.id}`}
              className="text-emerald-600 hover:underline"
            >
              {v.fn_number}
            </Link>
          </ReportCell>
          <ReportCell>
            <StatusPill value={v.status} />
          </ReportCell>
          <ReportCell>
            <div className="flex flex-wrap gap-1">
              {v.is_quick_lead && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-300/15 text-blue-600">Quick lead</span>
              )}
              {v.is_repeat && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-purple-400/15 text-purple-600">Repeat</span>
              )}
              {v.stock_fabric && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-400/15 text-amber-600">Stock fabric</span>
              )}
            </div>
          </ReportCell>
          <ReportCell className="text-right">{v.quantity}</ReportCell>
          <ReportCell className="text-right">{v.unit_price}</ReportCell>
          <ReportCell>{v.issue_date}</ReportCell>
          <ReportCell className="text-muted">{v.revision_notes}</ReportCell>
          <ReportCell className="text-right">
            <Link
              to={`/designs/${designCode}/versions/${v.id}`}
              className="text-emerald-600 hover:text-emerald-500"
            >
              Open file →
            </Link>
          </ReportCell>
        </tr>
      ))}
    </ReportTable>
  );
}
