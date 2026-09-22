import { Link } from 'react-router-dom';
import ReportTable, { ReportCell } from './ReportTable';
import StatusPill from '../../components/StatusPill';
import type { DesignPOWithStatus } from '../../mock/types';

export default function PosTab({ pos }: { pos: DesignPOWithStatus[] }) {
  if (pos.length === 0) {
    return <p className="text-sm text-muted">No purchase orders yet.</p>;
  }
  return (
    <ReportTable
      columns={['PO Number', 'Version', 'Buyer', 'Factory', 'Qty', 'Unit Price', 'Total', 'Delivery', 'Status', '']}
    >
      {pos.map((po) => (
        <tr key={po.id} className="border-t border-border/40">
          <ReportCell className="font-mono text-xs">{po.po_number}</ReportCell>
          <ReportCell>{po.version_number}</ReportCell>
          <ReportCell>{po.buyer}</ReportCell>
          <ReportCell>{po.factory}</ReportCell>
          <ReportCell className="text-right">{po.quantity}</ReportCell>
          <ReportCell className="text-right">{po.unit_price}</ReportCell>
          <ReportCell className="text-right">
            {po.currency} {po.total_value}
          </ReportCell>
          <ReportCell>{po.delivery_date}</ReportCell>
          <ReportCell>
            <StatusPill value={po.status} />
          </ReportCell>
          <ReportCell>
            <Link
              to={`/purchase-orders/${po.po_number}`}
              className="text-xs font-medium text-emerald-600 hover:text-emerald-500 whitespace-nowrap"
            >
              View PO
            </Link>
          </ReportCell>
        </tr>
      ))}
    </ReportTable>
  );
}