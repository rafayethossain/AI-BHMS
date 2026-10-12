import { describe, it, expect, beforeEach } from 'vitest';
import { getPurchaseOrder, getPurchaseOrders, resetDb } from '../db';
import { destinationFor, originFor, poDateFor, riskLabel } from '../purchaseOrders';

describe('purchase orders — register-wide list', () => {
  beforeEach(() => {
    resetDb();
  });

  it("aggregates every design's POs, sorted by PO number", () => {
    const rows = getPurchaseOrders();
    expect(rows).toHaveLength(33);
    const numbers = rows.map((r) => r.po_number);
    expect(rows[0].po_number).toBe('PO-2025-0001');
    for (let i = 1; i < numbers.length; i += 1) {
      expect(numbers[i - 1] <= numbers[i]).toBe(true);
    }
  });

  it('carries the design linkage and the five risk payloads', () => {
    const row = getPurchaseOrder('PO-2025-0001');
    expect(row?.design_code).toBe('REG-1001');
    expect(row?.fn_number).toBe('FO-2025-102');
    expect(row?.buyer).toBe('Nike Inc.');
    expect(row?.status).toBe('open');
    for (const key of ['fabric', 'trims', 'production', 'delivery', 'overall'] as const) {
      expect(['none', 'green', 'amber', 'red']).toContain(row?.statuses[key].code);
      expect(row?.statuses[key].label.length).toBeGreaterThan(0);
    }
  });

  it('derives the PO date before the delivery date and a buyer/factory origin', () => {
    const row = getPurchaseOrder('PO-2025-0001');
    if (!row) throw new Error('PO-2025-0001 not found');
    expect(row.po_date < row.delivery_date).toBe(true);
    expect(row.destination).toBe('USA');
    expect(row.origin).toBe('Bangladesh');
  });

  it('sets an actual delivery date only once the order has shipped/delivered', () => {
    expect(getPurchaseOrder('PO-2025-0001')?.actual_delivery_date).toBeNull();
    expect(getPurchaseOrder('PO-2025-0032')?.actual_delivery_date).toBeNull();
    const delivered = getPurchaseOrder('PO-2025-0034');
    expect(delivered?.status).toBe('delivered');
    expect(delivered?.actual_delivery_date).toBe(delivered?.delivery_date);
  });

  it('filters by status, design and free-text search', () => {
    expect(getPurchaseOrders({ designCode: 'REG-1004' })).toHaveLength(11);
    expect(getPurchaseOrders({ status: 'delivered' }).every((r) => r.status === 'delivered')).toBe(true);
    expect(getPurchaseOrders({ search: 'PO-2025-0001' })).toHaveLength(1);
    expect(getPurchaseOrders({ search: 'zara' }).every((r) => r.buyer === 'Zara')).toBe(true);
  });

  it('returns undefined for an unknown PO number', () => {
    expect(getPurchaseOrder('PO-NOPE')).toBeUndefined();
  });
});

describe('purchase order derive helpers', () => {
  it('maps buyers and factories to a country', () => {
    expect(destinationFor('Zara')).toBe('Spain');
    expect(destinationFor('Unknown Buyer')).toBe('UK');
    expect(originFor('Dhaka Apparels')).toBe('Bangladesh');
    expect(originFor('Unknown Factory')).toBe('Bangladesh');
  });

  it('builds a deterministic PO date before the delivery date', () => {
    expect(poDateFor('2026-08-20', 0)).toBe('2026-07-06');
    expect(poDateFor('2026-08-20', 0)).toBe(poDateFor('2026-08-20', 0));
    expect(poDateFor('2026-08-20', 6)).toBe(poDateFor('2026-08-20', 1));
  });

  it('falls back to a neutral risk label when a payload is missing', () => {
    expect(riskLabel(undefined)).toBe('No Status');
    expect(
      riskLabel({ code: 'red', label: 'Delayed or Overdue', color: '#ef4444', numeric: 3 }),
    ).toBe('Delayed or Overdue');
  });
});
