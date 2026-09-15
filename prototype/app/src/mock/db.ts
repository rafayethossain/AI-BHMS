import type { DesignCreateInput, DesignRegisterRow, DesignUpdateInput } from './types';
import { designSeed } from './seed';

let designs: DesignRegisterRow[] = structuredClone(designSeed);
let nextId = designs.length + 1;

export function resetDb(): void {
  designs = structuredClone(designSeed);
  nextId = designs.length + 1;
}

export function getDesigns(filters?: {
  status?: string;
  search?: string;
}): DesignRegisterRow[] {
  let rows = designs;
  if (filters?.status && filters.status !== 'all') {
    rows = rows.filter((d) => d.status === filters.status);
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    rows = rows.filter(
      (d) =>
        d.design_code.toLowerCase().includes(q) ||
        d.buyer.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        d.style_type?.toLowerCase().includes(q),
    );
  }
  return rows;
}

export function getDesign(id: string): DesignRegisterRow | undefined {
  return designs.find((d) => d.id === id);
}

export function createDesign(input: DesignCreateInput): DesignRegisterRow {
  const now = '2026-09-15';
  const row: DesignRegisterRow = {
    id: `design-${String(nextId++).padStart(2, '0')}`,
    design_code: input.design_code,
    style_type: input.style_type ?? null,
    category: input.category,
    buyer: input.buyer,
    current_version: 'v1',
    status: input.status ?? 'draft',
    live_po_count: 0,
    completed_po_count: 0,
    created_at: now,
    updated_at: now,
  };
  designs = [row, ...designs];
  return row;
}

export function updateDesign(id: string, input: DesignUpdateInput): DesignRegisterRow | undefined {
  const idx = designs.findIndex((d) => d.id === id);
  if (idx === -1) return undefined;
  const existing = designs[idx];
  const updated: DesignRegisterRow = {
    ...existing,
    ...(input.category !== undefined && { category: input.category }),
    ...(input.buyer !== undefined && { buyer: input.buyer }),
    ...(input.status !== undefined && { status: input.status }),
    updated_at: '2026-09-15',
  };
  designs = [...designs.slice(0, idx), updated, ...designs.slice(idx + 1)];
  return updated;
}

export function deleteDesign(id: string): boolean {
  const len = designs.length;
  designs = designs.filter((d) => d.id !== id);
  return designs.length < len;
}