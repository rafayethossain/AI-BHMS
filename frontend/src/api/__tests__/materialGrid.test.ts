import { describe, it, expect } from 'vitest';

import { toMaterialRows, toBomItemPatch } from '../materialGrid';

const items = [
  {
    id: 'bi-1',
    bom_id: 'bom-1',
    type: 'Cloth',
    description_code: 'SANDWASH LINEN XK-529',
    location: 'CUT ANGLE',
    supplier: 'FOURSEASONS',
    colour: 'WHITE',
    width_size: '60in',
    qty: 2.25,
    match: 'Left',
  },
  {
    id: 'bi-2',
    bom_id: 'bom-1',
    type: 'Trims',
    description_code: 'BUTTON 4 HOLES FV9757',
    location: '',
    supplier: '',
    colour: 'BLACK',
    width_size: '25mm',
    qty: null,
    match: '',
  },
];

describe('materialGrid adapter', () => {
  it('maps BOM items into grid rows preserving the grid shape', () => {
    const rows = toMaterialRows(items);
    expect(rows[0]).toEqual(items[0]);
  });

  it('normalizes missing strings and null quantities', () => {
    const rows = toMaterialRows(items);
    const trim = rows[1];
    expect(trim.location).toBe('');
    expect(trim.supplier).toBe('');
    expect(trim.match).toBe('');
  });

  it('maps grid edits to BOM item API patch fields', () => {
    expect(toBomItemPatch('type', 'Fabric')).toEqual({ category: 'Fabric' });
    expect(toBomItemPatch('description_code', 'NEW FABRIC')).toEqual({
      item_name: 'NEW FABRIC',
    });
    expect(toBomItemPatch('qty', 2.5)).toEqual({ ordered_qty: 2.5 });
    expect(toBomItemPatch('location', 'BACK')).toEqual({ location: 'BACK' });
    expect(toBomItemPatch('colour', 'BLACK')).toEqual({ colour: 'BLACK' });
    expect(toBomItemPatch('width_size', '50in')).toEqual({ width_size: '50in' });
    expect(toBomItemPatch('match', 'Right')).toEqual({ match: 'Right' });
  });

  it('does not send patches for supplier or unknown fields', () => {
    expect(toBomItemPatch('supplier', 'NEW SUP')).toBeNull();
    expect(toBomItemPatch('bogus', 'x')).toBeNull();
  });
});