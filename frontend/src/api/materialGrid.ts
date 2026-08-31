import type { DesignSheetMaterialItem } from './client';

export type MaterialRow = DesignSheetMaterialItem;

export function toMaterialRows(items: DesignSheetMaterialItem[]): MaterialRow[] {
  return items.map((item) => ({
    ...item,
    type: item.type ?? '',
    description_code: item.description_code ?? '',
    location: item.location ?? '',
    supplier: item.supplier ?? '',
    colour: item.colour ?? '',
    width_size: item.width_size ?? '',
    qty: typeof item.qty === 'number' ? item.qty : null,
    match: item.match ?? '',
  }));
}

export const GRID_FIELD_TO_API: Record<string, string> = {
  type: 'category',
  description_code: 'item_name',
  location: 'location',
  colour: 'colour',
  width_size: 'width_size',
  qty: 'ordered_qty',
  match: 'match',
};

export function toBomItemPatch(field: string, value: unknown): Record<string, unknown> | null {
  const apiField = GRID_FIELD_TO_API[field];
  if (!apiField) return null;
  return { [apiField]: value };
}