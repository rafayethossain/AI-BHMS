import { describe, it, expect, beforeEach } from 'vitest';
import {
  addCosting,
  deleteCosting,
  getDesignCostings,
  resetDb,
  setLiveCosting,
  updateCosting,
} from '../db';

describe('mock costing store', () => {
  beforeEach(() => {
    resetDb();
  });

  it('seeds costings per design with a live sheet', () => {
    expect(getDesignCostings('REG-1001')).toHaveLength(4);
    expect(getDesignCostings('REG-1003')).toHaveLength(0);
    expect(getDesignCostings('REG-1001').filter((c) => c.is_live)).toHaveLength(1);
  });

  it('adds a costing and assigns an id', () => {
    const created = addCosting('REG-1001', {
      po_number: 'PO-2025-0003',
      version: 2,
      sheet_type: 'cn',
      status: 'draft',
      is_live: false,
      exchange_rate: '',
      target_price: '10.00',
      fabric_cost: '6.66',
      trim_cost: '1.00',
      cm_cost: '2.00',
      overhead_cost: '0.80',
      notes: '',
    });
    expect(created.id).toBeTruthy();
    expect(getDesignCostings('REG-1001')).toHaveLength(5);
  });

  it('updates a costing field', () => {
    const first = getDesignCostings('REG-1001')[0];
    const updated = updateCosting('REG-1001', first.id, { status: 'rejected' });
    expect(updated?.status).toBe('rejected');
    expect(getDesignCostings('REG-1001')[0].status).toBe('rejected');
  });

  it('deletes a costing', () => {
    const first = getDesignCostings('REG-1001')[0];
    expect(deleteCosting('REG-1001', first.id)).toBe(true);
    expect(getDesignCostings('REG-1001')).toHaveLength(3);
  });

  it('setLiveCosting is mutually exclusive within a purchase order only', () => {
    const list = getDesignCostings('REG-1001');
    const second = list[1];
    expect(second.po_number).toBe('PO-2025-0001');
    expect(second.is_live).toBe(false);

    expect(setLiveCosting('REG-1001', second.id)).toBe(true);

    const after = getDesignCostings('REG-1001');
    const liveForPo = after.filter((c) => c.po_number === 'PO-2025-0001' && c.is_live);
    expect(liveForPo).toHaveLength(1);
    expect(liveForPo[0].id).toBe(second.id);
    expect(after.filter((c) => c.is_live)).toHaveLength(1);
  });
});
