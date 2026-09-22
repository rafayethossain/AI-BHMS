import { describe, it, expect } from 'vitest';
import { getDesignDetail } from '../api';
import { getDesigns } from '../db';

describe('getDesignDetail', () => {
  it('returns undefined for an unknown design code', async () => {
    expect(await getDesignDetail('NOPE-9999')).toBeUndefined();
  });

  it('resolves the design header from the register row', async () => {
    const detail = await getDesignDetail('REG-1001');
    expect(detail?.design.design_code).toBe('REG-1001');
    expect(detail?.design.buyer).toBe('Nike Inc.');
  });

  it('every seeded design has a detail payload', async () => {
    for (const row of getDesigns()) {
      const detail = await getDesignDetail(row.design_code);
      expect(detail, `${row.design_code} detail`).toBeDefined();
      expect(detail?.versions.length).toBeGreaterThan(0);
    }
  });

  it('REG-1001 carries rich detail: 2 versions, file openings, POs, items, BOM, images, tech packs', async () => {
    const detail = await getDesignDetail('REG-1001');
    expect(detail?.versions).toHaveLength(2);
    expect(detail?.versions.find((v) => v.is_current)?.version_number).toBe('v2');
    expect(detail?.file_openings.length).toBeGreaterThanOrEqual(1);
    expect(detail?.pos.length).toBeGreaterThanOrEqual(2);
    expect(detail?.items.length).toBeGreaterThanOrEqual(2);
    expect(detail?.bom.length).toBeGreaterThanOrEqual(3);
    expect(detail?.images.length).toBeGreaterThanOrEqual(1);
    expect(detail?.sketches.length).toBeGreaterThanOrEqual(1);
    expect(detail?.tech_packs.length).toBeGreaterThanOrEqual(1);
  });

  it('REG-1004 exposes the guaranteed Sales Order demo: 11 PO rows with red fabric, green delivered and red overdue', async () => {
    const detail = await getDesignDetail('REG-1004');
    expect(detail?.pos).toHaveLength(11);
    expect(detail?.pos.some((p) => p.fabric_status === 'sticky_red')).toBe(true);
    expect(detail?.pos.some((p) => p.status === 'delivered')).toBe(true);
    expect(detail?.pos.some((p) => p.delivery_date < '2026-09-10' && p.status !== 'delivered')).toBe(true);
    expect(detail?.sales_order.fabric.code).toBe('red');
    expect(detail?.sales_order.overall.code).toBe('red');
  });

  it('each detail carries a sales_order rollup and a per-PO status matrix', async () => {
    const detail = await getDesignDetail('REG-1001');
    expect(detail?.sales_order).toHaveProperty('fabric');
    expect(detail?.pos[0].statuses).toHaveProperty('overall');
  });

  it('BOM statuses cover Ordered, TBC, Partial and Completed across the seed', async () => {
    const statuses = new Set<string>();
    for (const row of getDesigns()) {
      const detail = await getDesignDetail(row.design_code);
      detail?.bom.forEach((b) => statuses.add(b.status));
    }
    expect(statuses).toEqual(new Set(['Ordered', 'TBC', 'Partial', 'Completed']));
  });

  it('BOM covers trims, labels, accessories and other categories', async () => {
    const categories = new Set<string>();
    for (const row of getDesigns()) {
      const detail = await getDesignDetail(row.design_code);
      detail?.bom.forEach((b) => categories.add(b.category));
    }
    expect(categories).toEqual(new Set(['trims', 'labels', 'accessories', 'other']));
  });

  it('tech packs expose per-section progress so the progress panel has data', async () => {
    const detail = await getDesignDetail('REG-1001');
    const pack = detail?.tech_packs.find((t) => t.status === 'imported');
    expect(pack).toBeDefined();
    expect(pack?.sections.length).toBeGreaterThan(0);
    expect(pack?.sections.every((s) => s.progress >= 0 && s.progress <= 100)).toBe(true);
  });
});