import ReportTable, { ReportCell } from './ReportTable';
import type { BomCategory, BomStatus, DesignBomItem } from '../../mock/types';

const CATEGORY_LABELS: Record<BomCategory, string> = {
  trims: 'Trims',
  labels: 'Labels',
  accessories: 'Accessories',
  other: 'Other',
};

const CATEGORY_STYLES: Record<BomCategory, string> = {
  trims: 'bg-blue-300/15 text-blue-600',
  labels: 'bg-purple-400/15 text-purple-600',
  accessories: 'bg-teal-300/15 text-teal-400',
  other: 'bg-slate-100 text-muted dark:bg-slate-800',
};

const STATUS_STYLES: Record<BomStatus, string> = {
  Ordered: 'bg-blue-300/15 text-blue-600',
  TBC: 'bg-slate-100 text-muted dark:bg-slate-800',
  Partial: 'bg-amber-400/15 text-amber-600',
  Completed: 'bg-emerald-500/15 text-emerald-600',
};

export default function BomTab({ bom }: { bom: DesignBomItem[] }) {
  if (bom.length === 0) {
    return <p className="text-sm text-muted">No BOM items yet.</p>;
  }
  return (
    <ReportTable
      columns={['Category', 'Description', 'Code', 'Supplier', 'Unit', 'Qty', 'Status', 'T&A Date']}
    >
      {bom.map((b) => (
        <tr key={b.id} className="border-t border-border/40">
          <ReportCell>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_STYLES[b.category]}`}>
              {CATEGORY_LABELS[b.category]}
            </span>
          </ReportCell>
          <ReportCell>
            <div className="font-medium text-heading">{b.description}</div>
          </ReportCell>
          <ReportCell className="font-mono text-xs">{b.code}</ReportCell>
          <ReportCell>{b.supplier}</ReportCell>
          <ReportCell>{b.unit}</ReportCell>
          <ReportCell className="text-right">{b.qty}</ReportCell>
          <ReportCell>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[b.status]}`}>
              {b.status}
            </span>
          </ReportCell>
          <ReportCell>{b.ta_date}</ReportCell>
        </tr>
      ))}
    </ReportTable>
  );
}