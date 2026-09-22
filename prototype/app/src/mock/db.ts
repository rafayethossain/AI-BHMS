import type {
  DesignCreateInput,
  DesignDetail,
  DesignDetailCore,
  DesignMaterial,
  DesignPOWithStatus,
  DesignRegisterRow,
  DesignUpdateInput,
} from './types';
import { designSeed } from './seed';
import { DEMO_TODAY, designDetailSeed } from './detailSeed';
import { derivePoStatuses, rollupSalesOrderStatuses } from './derive';

let designs: DesignRegisterRow[] = structuredClone(designSeed);
let nextId = designs.length + 1;
let matCounter = 100;

export function resetDb(): void {
  designs = structuredClone(designSeed);
  nextId = designs.length + 1;
  matCounter = 100;
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

export function getDesignByCode(designCode: string): DesignRegisterRow | undefined {
  return designs.find((d) => d.design_code === designCode);
}

export function getDesignMaterials(designCode: string): DesignMaterial[] {
  return getDesignByCode(designCode)?.materials ?? [];
}

export function addMaterial(
  designCode: string,
  material: Omit<DesignMaterial, 'id'>,
): DesignMaterial {
  const design = getDesignByCode(designCode);
  if (!design) throw new Error(`Design ${designCode} not found`);
  const newMat: DesignMaterial = {
    ...material,
    id: `mat-${String(++matCounter).padStart(3, '0')}`,
  };
  design.materials = [...design.materials, newMat];
  return newMat;
}

export function updateMaterial(
  designCode: string,
  materialId: string,
  input: Partial<Omit<DesignMaterial, 'id'>>,
): DesignMaterial | undefined {
  const design = getDesignByCode(designCode);
  if (!design) return undefined;
  const idx = design.materials.findIndex((m) => m.id === materialId);
  if (idx === -1) return undefined;
  const updated = { ...design.materials[idx], ...input };
  design.materials = [
    ...design.materials.slice(0, idx),
    updated,
    ...design.materials.slice(idx + 1),
  ];
  return updated;
}

export function deleteMaterial(designCode: string, materialId: string): boolean {
  const design = getDesignByCode(designCode);
  if (!design) return false;
  const len = design.materials.length;
  design.materials = design.materials.filter((m) => m.id !== materialId);
  return design.materials.length < len;
}

export function getDesignDetail(designCode: string): DesignDetail | undefined {
  const design = designs.find((d) => d.design_code === designCode || d.id === designCode);
  if (!design) return undefined;
  const core: DesignDetailCore = designDetailSeed[design.design_code] ?? {
    versions: [],
    file_openings: [],
    pos: [],
    items: [],
    bom: [],
    images: [],
    sketches: [],
    tech_packs: [],
  };
  const ctx = { bom: core.bom, today: DEMO_TODAY };
  const pos: DesignPOWithStatus[] = core.pos.map((p) => ({
    ...p,
    statuses: derivePoStatuses(p, ctx),
  }));
  return {
    ...core,
    design,
    pos,
    sales_order: rollupSalesOrderStatuses(core.pos, ctx),
  };
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
    issue_date: input.issue_date ?? '',
    block: input.block ?? '',
    designer: input.designer ?? '',
    size: input.size ?? '',
    issuer: input.issuer ?? '',
    length: input.length ?? '',
    description: input.description ?? '',
    design_notes: input.design_notes ?? '',
    created_at: now,
    updated_at: now,
    materials: input.materials ?? [],
    ...(input.sketch_url !== undefined && { sketch_url: input.sketch_url }),
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
    ...(input.issue_date !== undefined && { issue_date: input.issue_date }),
    ...(input.block !== undefined && { block: input.block }),
    ...(input.designer !== undefined && { designer: input.designer }),
    ...(input.size !== undefined && { size: input.size }),
    ...(input.issuer !== undefined && { issuer: input.issuer }),
    ...(input.length !== undefined && { length: input.length }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.design_notes !== undefined && { design_notes: input.design_notes }),
    ...(input.sketch_url !== undefined && { sketch_url: input.sketch_url }),
    ...(input.materials !== undefined && { materials: input.materials }),
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