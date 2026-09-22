import ReportTable, { ReportCell } from './ReportTable';
import type { DesignItem } from '../../mock/types';

export default function ItemsTab({ items }: { items: DesignItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted">No items yet.</p>;
  }
  return (
    <ReportTable columns={['Item Code', 'Colour', 'Size', 'Colour Ways', 'Quantity']}>
      {items.map((it) => (
        <tr key={it.id} className="border-t border-border/40">
          <ReportCell className="font-mono text-xs">{it.item_code}</ReportCell>
          <ReportCell>{it.colour}</ReportCell>
          <ReportCell>{it.size}</ReportCell>
          <ReportCell className="text-right">{it.colour_ways}</ReportCell>
          <ReportCell className="text-right">{it.quantity}</ReportCell>
        </tr>
      ))}
    </ReportTable>
  );
}