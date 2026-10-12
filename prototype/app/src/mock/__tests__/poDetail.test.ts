import { describe, it, expect, beforeEach } from 'vitest';
import {
  addPoHit,
  addPoItem,
  approveAmendment,
  deletePoHit,
  deletePoItem,
  getPurchaseOrderDetail,
  getPurchaseOrders,
  rejectAmendment,
  requestAmendment,
  resetDb,
  updatePoHit,
  updatePoItem,
} from '../db';

describe('purchase order detail — mock layer', () => {
  beforeEach(() => {
    resetDb();
  });

  it('returns a PO detail with items, hits, amendments and a trail', () => {
    const detail = getPurchaseOrderDetail('PO-2025-0001');
    expect(detail?.design_code).toBe('REG-1001');
    expect(detail?.fn_number).toBe('FO-2025-102');
    expect(detail?.items.length).toBeGreaterThan(0);
    expect(detail?.hits.length).toBeGreaterThan(0);
    expect(detail?.amendments.length).toBeGreaterThan(0);
    expect(detail?.trail.length).toBeGreaterThan(0);
  });

  it('builds line items from the design items, splitting the PO quantity', () => {
    const detail = getPurchaseOrderDetail('PO-2025-0001');
    const codes = new Set(detail?.items.map((i) => i.item_code) ?? []);
    expect(codes.size).toBe(detail?.items.length);
    const total = detail?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0;
    expect(total).toBe(detail?.quantity);
  });

  it('keeps hit kinds and modes within the enum', () => {
    for (const row of getPurchaseOrders()) {
      const detail = getPurchaseOrderDetail(row.po_number);
      for (const hit of detail?.hits ?? []) {
        expect(['boxed', 'hanging']).toContain(hit.kind);
        expect(['sea', 'air']).toContain(hit.mode);
        expect(hit.hit_number).toMatch(/^HIT-/);
      }
    }
  });

  it('reaches every amendment status across the register', () => {
    const statuses = new Set<string>();
    for (const row of getPurchaseOrders()) {
      for (const a of getPurchaseOrderDetail(row.po_number)?.amendments ?? []) {
        statuses.add(a.status);
      }
    }
    expect(statuses).toEqual(new Set(['requested', 'approved', 'rejected']));
  });

  it('trail starts with the creation event and grows with amendments', () => {
    const detail = getPurchaseOrderDetail('PO-2025-0001');
    expect(detail?.trail[0].action).toBe('Purchase order created');
    expect(detail?.trail[0].at).toBe(detail?.po_date);
    for (const a of detail?.amendments ?? []) {
      expect(detail?.trail.some((t) => t.action.includes(a.amendment_number))).toBe(true);
    }
  });

  it('returns undefined for an unknown PO', () => {
    expect(getPurchaseOrderDetail('PO-NOPE')).toBeUndefined();
  });

  it('keeps every child id unique when rows and events are appended', () => {
    const firstAmendment = getPurchaseOrderDetail('PO-2025-0001')?.amendments[0].id ?? '';
    addPoItem('PO-2025-0001', {
      item_code: 'REG-1001-XXL',
      colour: 'RED',
      size: 'XXL',
      quantity: 100,
      unit_price: '3.00',
    });
    addPoHit('PO-2025-0001', {
      kind: 'boxed',
      mode: 'air',
      quantity: 10,
      hit_date: '2026-09-01',
      notes: '',
    });
    requestAmendment('PO-2025-0001', {
      field: 'quantity',
      from_value: '1',
      to_value: '2',
      reason: 'Buyer changed size ratio',
      requested_by: 'S. Akter',
    });
    approveAmendment('PO-2025-0001', firstAmendment);
    const detail = getPurchaseOrderDetail('PO-2025-0001');
    for (const key of ['items', 'hits', 'amendments', 'trail'] as const) {
      const ids = (detail?.[key] ?? []).map((r) => r.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe('purchase order item/hit CRUD', () => {
  beforeEach(() => {
    resetDb();
  });

  it('adds, edits and deletes a line item, recording trail events', () => {
    const before = getPurchaseOrderDetail('PO-2025-0001')?.items.length ?? 0;
    const added = addPoItem('PO-2025-0001', {
      item_code: 'REG-1001-XXL',
      colour: 'RED',
      size: 'XXL',
      quantity: 100,
      unit_price: '3.00',
    });
    expect(added?.id).toBeTruthy();
    const afterAdd = getPurchaseOrderDetail('PO-2025-0001');
    expect(afterAdd?.items).toHaveLength(before + 1);
    expect(afterAdd?.trail.some((t) => t.action === 'Line item added')).toBe(true);

    const updated = updatePoItem('PO-2025-0001', added?.id ?? '', { quantity: 250 });
    expect(updated?.quantity).toBe(250);
    expect(getPurchaseOrderDetail('PO-2025-0001')?.items.find((i) => i.id === added?.id)?.quantity).toBe(250);

    expect(deletePoItem('PO-2025-0001', added?.id ?? '')).toBe(true);
    expect(getPurchaseOrderDetail('PO-2025-0001')?.items).toHaveLength(before);
  });

  it('adds, edits and deletes a hit', () => {
    const before = getPurchaseOrderDetail('PO-2025-0001')?.hits.length ?? 0;
    const added = addPoHit('PO-2025-0001', {
      kind: 'boxed',
      mode: 'air',
      quantity: 200,
      hit_date: '2026-09-01',
      notes: 'Air freight option',
    });
    expect(added?.hit_number).toMatch(/^HIT-\d+-\d+-\d+$/);
    const afterAdd = getPurchaseOrderDetail('PO-2025-0001');
    expect(afterAdd?.hits).toHaveLength(before + 1);
    expect(afterAdd?.trail.some((t) => t.action.includes('Hit added'))).toBe(true);

    expect(updatePoHit('PO-2025-0001', added?.id ?? '', { mode: 'sea' })?.mode).toBe('sea');
    expect(deletePoHit('PO-2025-0001', added?.id ?? '')).toBe(true);
    expect(getPurchaseOrderDetail('PO-2025-0001')?.hits).toHaveLength(before);
  });
});

describe('purchase order amendments', () => {
  beforeEach(() => {
    resetDb();
  });

  it('requests an amendment as pending, then approves it', () => {
    const requested = requestAmendment('PO-2025-0011', {
      field: 'delivery_date',
      from_value: '2026-08-01',
      to_value: '2026-08-10',
      reason: 'Buyer shift request',
      requested_by: 'S. Akter',
    });
    expect(requested?.status).toBe('requested');
    expect(requested?.amendment_number).toMatch(/^AMD-\d+-\d+-\d+$/);
    expect(getPurchaseOrderDetail('PO-2025-0011')?.trail.some((t) => t.action.includes('requested'))).toBe(true);

    expect(approveAmendment('PO-2025-0011', requested?.id ?? '')).toBe(true);
    const approved = getPurchaseOrderDetail('PO-2025-0011')?.amendments.find((a) => a.id === requested?.id);
    expect(approved?.status).toBe('approved');
    expect(getPurchaseOrderDetail('PO-2025-0011')?.trail.some((t) => t.action.includes('approved'))).toBe(true);
  });

  it('rejects an amendment and refuses to approve it twice', () => {
    const requested = requestAmendment('PO-2025-0012', {
      field: 'quantity',
      from_value: '2200',
      to_value: '2000',
      reason: 'Buyer changed size ratio',
      requested_by: 'S. Akter',
    });
    expect(rejectAmendment('PO-2025-0012', requested?.id ?? '')).toBe(true);
    expect(
      getPurchaseOrderDetail('PO-2025-0012')?.amendments.find((a) => a.id === requested?.id)?.status,
    ).toBe('rejected');
    expect(approveAmendment('PO-2025-0012', requested?.id ?? '')).toBe(false);
  });
});