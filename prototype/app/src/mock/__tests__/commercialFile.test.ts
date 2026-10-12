import { describe, it, expect, beforeEach } from 'vitest';
import {
  addCommercialFileNote,
  agreeQuickLead,
  allocateStock,
  approveRepeat,
  createRepeat,
  getCommercialFile,
  getDesignVersions,
  resetDb,
  setQuickLead,
  setStockFabric,
} from '../db';
import { COMMERCIAL_FILE_PARTIES, missingParties } from '../commercialFile';

describe('commercial file — FN rides the design version', () => {
  beforeEach(() => {
    resetDb();
  });

  it('returns the commercial file of a version with the POs tracked under its FN', () => {
    const file = getCommercialFile('REG-1001', 'design-01-v2');
    expect(file?.fn_number).toBe('FO-2025-102');
    expect(file?.version_number).toBe('v2');
    expect(file?.is_current).toBe(true);
    expect(file?.po_count).toBe(3);
    expect(file?.pos.map((p) => p.po_number)).toEqual([
      'PO-2025-0001',
      'PO-2025-0002',
      'PO-2025-0003',
    ]);
  });

  it('exposes the version flags, stock meters and notes', () => {
    const file = getCommercialFile('REG-1001', 'design-01-v1');
    expect(file?.is_quick_lead).toBe(true);
    expect(file?.is_repeat).toBe(true);
    expect(file?.is_stock_fabric).toBe(true);
    expect(file?.total_meters).toBe(500);
    expect(file?.allocated_meters).toBe(120);
    expect(file?.balance_meters).toBe(380);
    expect(file?.po_count).toBe(0);
    expect(file?.notes).toHaveLength(1);
  });

  it('returns undefined for an unknown design or version', () => {
    expect(getCommercialFile('NOPE', 'design-01-v1')).toBeUndefined();
    expect(getCommercialFile('REG-1001', 'nope')).toBeUndefined();
  });
});

describe('commercial file actions', () => {
  beforeEach(() => {
    resetDb();
  });

  it('lists the four departments that must sign off', () => {
    expect(COMMERCIAL_FILE_PARTIES).toEqual(['merchandising', 'production', 'quality', 'commercial']);
  });

  it('marks and unmarks quick lead, clearing agreements on unmark', () => {
    expect(setQuickLead('REG-1002', 'design-02-v1', true)).toBe(true);
    expect(getCommercialFile('REG-1002', 'design-02-v1')?.is_quick_lead).toBe(true);
    expect(agreeQuickLead('REG-1002', 'design-02-v1', 'buyer')).toBe(true);
    expect(getCommercialFile('REG-1002', 'design-02-v1')?.quick_lead_agreed_by).toContain('buyer');
    expect(setQuickLead('REG-1002', 'design-02-v1', false)).toBe(true);
    expect(getCommercialFile('REG-1002', 'design-02-v1')?.quick_lead_agreed_by).toBe('');
  });

  it('collects quick-lead agreement one department at a time', () => {
    expect(missingParties(getCommercialFile('REG-1001', 'design-01-v1')?.quick_lead_agreed_by ?? '')).toEqual([
      'production',
      'quality',
      'commercial',
    ]);
    for (const party of COMMERCIAL_FILE_PARTIES) {
      agreeQuickLead('REG-1001', 'design-01-v1', party);
    }
    expect(missingParties(getCommercialFile('REG-1001', 'design-01-v1')?.quick_lead_agreed_by ?? '')).toEqual([]);
  });

  it('creates a repeat and collects department approvals', () => {
    expect(createRepeat('REG-1002', 'design-02-v1')).toBe(true);
    const created = getCommercialFile('REG-1002', 'design-02-v1');
    expect(created?.is_repeat).toBe(true);
    expect(created?.original_fn).toBe(created?.fn_number);
    expect(created?.repeat_approved_by).toBe('');
    expect(approveRepeat('REG-1002', 'design-02-v1', 'production')).toBe(true);
    expect(getCommercialFile('REG-1002', 'design-02-v1')?.repeat_approved_by).toBe('production');
  });

  it('marks stock fabric with meters and allocates stock', () => {
    expect(setStockFabric('REG-1002', 'design-02-v1', { description: 'Navy jersey', total_meters: 300 })).toBe(
      true,
    );
    expect(
      allocateStock('REG-1002', 'design-02-v1', { allocated_to: 'PO-2025-0011', meters: 80, notes: 'PO-1' }),
    ).toBe(true);
    const file = getCommercialFile('REG-1002', 'design-02-v1');
    expect(file?.is_stock_fabric).toBe(true);
    expect(file?.stock_description).toBe('Navy jersey');
    expect(file?.allocated_meters).toBe(80);
    expect(file?.balance_meters).toBe(220);
    expect(file?.allocations).toHaveLength(1);
  });

  it('appends an update note to the file', () => {
    const before = getCommercialFile('REG-1002', 'design-02-v1')?.notes.length ?? 0;
    expect(
      addCommercialFileNote('REG-1002', 'design-02-v1', {
        author: 'F. Rahman',
        action: 'Update',
        note: 'Buyer approved the swatch',
        milestone_date: '2026-09-18',
      }),
    ).toBe(true);
    const notes = getCommercialFile('REG-1002', 'design-02-v1')?.notes ?? [];
    expect(notes).toHaveLength(before + 1);
    expect(notes[notes.length - 1].note).toBe('Buyer approved the swatch');
  });

  it('reflects the change on the design detail version list', () => {
    setQuickLead('REG-1002', 'design-02-v1', true);
    expect(getDesignVersions('REG-1002').find((v) => v.version_number === 'v1')?.is_quick_lead).toBe(true);
  });
});
