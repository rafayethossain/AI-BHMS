import type { DesignPOWithStatus } from '../mock/types';

export const SALES_REPORT_HEADERS = [
  'PO Number',
  'Qty',
  'Unit Price',
  'Value (USD)',
  'Fabric',
  'Trims',
  'Production',
  'Delivery',
  'Overall',
  'Delivery Date',
] as const;

export interface SalesReportSummary {
  count: number;
  quantity: number;
  value: number;
}

/** Roll up a version's sales-order rows: row count, total quantity and total value. */
export function summarizeSalesReport(rows: DesignPOWithStatus[]): SalesReportSummary {
  const quantity = rows.reduce((sum, r) => sum + Number(r.quantity || 0), 0);
  const value = rows.reduce((sum, r) => sum + Number(r.total_value || 0), 0);
  return { count: rows.length, quantity, value: Math.round(value * 100) / 100 };
}

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Build a CSV of the sales-order report (header + one line per PO + a totals line). */
export function buildSalesReportCsv(rows: DesignPOWithStatus[]): string {
  const header = SALES_REPORT_HEADERS.map(csvCell).join(',');
  const lines = rows.map((r) =>
    [
      r.po_number,
      String(r.quantity),
      r.unit_price,
      r.total_value,
      r.statuses.fabric.label,
      r.statuses.trims.label,
      r.statuses.production.label,
      r.statuses.delivery.label,
      r.statuses.overall.label,
      r.delivery_date,
    ]
      .map(csvCell)
      .join(','),
  );
  const totals = summarizeSalesReport(rows);
  const totalLine = ['Total', String(totals.quantity), '', totals.value.toFixed(2), '', '', '', '', '', '']
    .map(csvCell)
    .join(',');
  return [header, ...lines, totalLine].join('\r\n');
}

/** Trigger a client-side text download (no external library). */
export function downloadTextFile(fileName: string, text: string, mime = 'text/csv;charset=utf-8'): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
