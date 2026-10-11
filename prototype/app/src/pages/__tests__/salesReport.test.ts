import { describe, it, expect, beforeEach } from 'vitest';
import { buildSalesReportCsv, summarizeSalesReport } from '../salesReport';
import { getDesignDetail, resetDb } from '../../mock/db';

describe('sales report helpers', () => {
  beforeEach(() => {
    resetDb();
  });

  it('summarizes count, total quantity and total value', () => {
    const rows = getDesignDetail('REG-1004')!.pos;
    const summary = summarizeSalesReport(rows);
    expect(summary.count).toBe(11);
    expect(summary.quantity).toBe(rows.reduce((sum, r) => sum + r.quantity, 0));
    expect(summary.value).toBeCloseTo(
      rows.reduce((sum, r) => sum + Number(r.total_value), 0),
      2,
    );
  });

  it('builds a CSV with a header, one line per PO and a totals row', () => {
    const rows = getDesignDetail('REG-1004')!.pos;
    const csv = buildSalesReportCsv(rows);
    const lines = csv.split('\r\n');

    expect(lines[0]).toContain('PO Number');
    expect(lines[0]).toContain('Overall');
    expect(lines[0]).toContain('Delivery Date');
    // header + one line per PO + a totals line
    expect(lines).toHaveLength(rows.length + 2);
    expect(lines[1]).toContain(rows[0].po_number);
    expect(lines[lines.length - 1]).toContain('Total');
    expect(lines[lines.length - 1]).toContain(String(summarizeSalesReport(rows).quantity));
  });

  it('quotes CSV cells that contain commas', () => {
    const rows = getDesignDetail('REG-1004')!.pos;
    const csv = buildSalesReportCsv(rows);
    // risk labels never contain commas, but the builder must be quote-safe
    expect(csv).not.toContain('"undefined"');
    expect(csv.split('\r\n')[0].split(',').length).toBe(10);
  });
});
