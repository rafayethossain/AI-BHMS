import ReportTable, { ReportCell } from './ReportTable';
import StatusPill from '../../components/StatusPill';
import type { DesignFileOpening } from '../../mock/types';

export default function FileOpeningsTab({ openings }: { openings: DesignFileOpening[] }) {
  if (openings.length === 0) {
    return <p className="text-sm text-muted">No file openings yet.</p>;
  }
  return (
    <ReportTable columns={['FN Number', 'Version', 'Buyer', 'Factory', 'Status', 'Opened', 'Approved', 'Latest Note']}>
      {openings.map((fo) => (
        <tr key={fo.id} className="border-t border-border/40">
          <ReportCell className="font-mono text-xs">{fo.fn_number}</ReportCell>
          <ReportCell>{fo.version_number}</ReportCell>
          <ReportCell>{fo.buyer}</ReportCell>
          <ReportCell>{fo.factory}</ReportCell>
          <ReportCell>
            <StatusPill value={fo.status} />
          </ReportCell>
          <ReportCell>{fo.open_date}</ReportCell>
          <ReportCell>{fo.approved_date || '—'}</ReportCell>
          <ReportCell className="text-muted">
            {fo.notes.length > 0 ? `${fo.notes[0].action} · ${fo.notes[0].note}` : '—'}
          </ReportCell>
        </tr>
      ))}
    </ReportTable>
  );
}