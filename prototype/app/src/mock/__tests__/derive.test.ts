import { describe, it, expect } from 'vitest';
import { derivePoStatuses, rollupSalesOrderStatuses } from '../derive';
import type { DesignBomItem, DesignPO } from '../types';

const TODAY = '2026-09-10';

function po(over: Partial<DesignPO> = {}): DesignPO {
  return {
    id: 'po-1',
    po_number: 'PO-2025-0001',
    version_number: 'v1',
    fn_number: 'FO-2025-101',
    buyer: 'Nike Inc.',
    factory: 'Dhaka Apparels',
    currency: 'USD',
    quantity: 1000,
    unit_price: '4.25',
    total_value: '4250.00',
    delivery_date: '2026-10-01',
    status: 'open',
    fabric_status: 'none',
    daily_production_qty: 0,
    schedule_qty: 0,
    ...over,
  };
}

function bom(over: Partial<DesignBomItem> = {}): DesignBomItem {
  return {
    id: 'bom-1',
    version_number: 'v1',
    category: 'trims',
    description: 'NYLON ZIPPER',
    code: 'YKK',
    supplier: 'YKK',
    unit: 'pcs',
    qty: 1,
    status: 'Ordered',
    ta_date: 'TBD',
    ...over,
  };
}

describe('derivePoStatuses — fabric branch', () => {
  it('green when fabric is delivered', () => {
    expect(derivePoStatuses(po({ fabric_status: 'delivered' }), { bom: [], today: TODAY }).fabric.code).toBe('green');
  });
  it('amber when fabric is in work', () => {
    expect(derivePoStatuses(po({ fabric_status: 'in_work' }), { bom: [], today: TODAY }).fabric.code).toBe('amber');
  });
  it('red when fabric is sticky red', () => {
    expect(derivePoStatuses(po({ fabric_status: 'sticky_red' }), { bom: [], today: TODAY }).fabric.code).toBe('red');
  });
  it('none when fabric has no items', () => {
    expect(derivePoStatuses(po({ fabric_status: 'none' }), { bom: [], today: TODAY }).fabric.code).toBe('none');
  });
});

describe('derivePoStatuses — trims branch', () => {
  it('none when the version has no trim/label/accessory BOM items', () => {
    expect(derivePoStatuses(po(), { bom: [], today: TODAY }).trims.code).toBe('none');
  });
  it('green when all trim items are completed', () => {
    const rows = [bom({ status: 'Completed' }), bom({ id: 'bom-2', status: 'Completed' })];
    expect(derivePoStatuses(po(), { bom: rows, today: TODAY }).trims.code).toBe('green');
  });
  it.each(['Ordered', 'TBC', 'Partial'] as const)('amber when any trim item is %s', (status) => {
    const rows = [bom({ status: 'Completed' }), bom({ id: 'bom-2', status })];
    expect(derivePoStatuses(po(), { bom: rows, today: TODAY }).trims.code).toBe('amber');
  });
  it('ignores BOM items belonging to another version', () => {
    const rows = [bom({ version_number: 'v2', status: 'Ordered' })];
    expect(derivePoStatuses(po({ version_number: 'v1' }), { bom: rows, today: TODAY }).trims.code).toBe('none');
  });
});

describe('derivePoStatuses — production branch', () => {
  it.each(['delivered', 'ready', 'shipped', 'quality_check'] as const)('green for %s', (status) => {
    expect(derivePoStatuses(po({ status }), { bom: [], today: TODAY }).production.code).toBe('green');
  });
  it('green when in production and output + schedule meets the quantity', () => {
    const p = po({ status: 'in_production', quantity: 1000, daily_production_qty: 700, schedule_qty: 300 });
    expect(derivePoStatuses(p, { bom: [], today: TODAY }).production.code).toBe('green');
  });
  it('amber when in production and output + schedule is short', () => {
    const p = po({ status: 'in_production', quantity: 1000, daily_production_qty: 200, schedule_qty: 100 });
    expect(derivePoStatuses(p, { bom: [], today: TODAY }).production.code).toBe('amber');
  });
  it('none for draft/open/cancelled', () => {
    for (const status of ['draft', 'open', 'cancelled'] as const) {
      expect(derivePoStatuses(po({ status }), { bom: [], today: TODAY }).production.code).toBe('none');
    }
  });
});

describe('derivePoStatuses — delivery branch', () => {
  it.each(['delivered', 'ready', 'shipped'] as const)('green for %s', (status) => {
    expect(derivePoStatuses(po({ status }), { bom: [], today: TODAY }).delivery.code).toBe('green');
  });
  it('red when the delivery date is in the past and not delivered', () => {
    const p = po({ status: 'in_production', delivery_date: '2026-08-01' });
    expect(derivePoStatuses(p, { bom: [], today: TODAY }).delivery.code).toBe('red');
  });
  it('amber when a future delivery date exists', () => {
    const p = po({ status: 'in_production', delivery_date: '2026-10-01' });
    expect(derivePoStatuses(p, { bom: [], today: TODAY }).delivery.code).toBe('amber');
  });
  it('none for draft/open/cancelled', () => {
    for (const status of ['draft', 'open', 'cancelled'] as const) {
      expect(derivePoStatuses(po({ status }), { bom: [], today: TODAY }).delivery.code).toBe('none');
    }
  });
});

describe('derivePoStatuses — overall is the max of the four areas', () => {
  it('takes red when any area is red', () => {
    const p = po({ status: 'in_production', delivery_date: '2026-08-01', fabric_status: 'delivered' });
    expect(derivePoStatuses(p, { bom: [], today: TODAY }).overall.code).toBe('red');
  });
});

describe('rollupSalesOrderStatuses', () => {
  it('returns all-none when there are no POs', () => {
    const rollup = rollupSalesOrderStatuses([], { bom: [], today: TODAY });
    expect(rollup.overall.code).toBe('none');
    expect(rollup.fabric.code).toBe('none');
  });

  it('takes the worst code per area across the given POs', () => {
    const rows = [
      po({ id: 'p1', fabric_status: 'delivered', status: 'delivered' }),
      po({ id: 'p2', fabric_status: 'sticky_red', status: 'in_production', delivery_date: '2026-08-01' }),
    ];
    const rollup = rollupSalesOrderStatuses(rows, { bom: [], today: TODAY });
    expect(rollup.fabric.code).toBe('red');
    expect(rollup.overall.code).toBe('red');
  });
});