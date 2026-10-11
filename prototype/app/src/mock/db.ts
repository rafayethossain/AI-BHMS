import type {
  Costing,
  DesignCreateInput,
  DesignDetail,
  DesignDetailCore,
  DesignMaterial,
  DesignPO,
  DesignPOWithStatus,
  DesignRegisterRow,
  DesignUpdateInput,
  DesignVersion,
  FitSpec,
  JobRequest,
} from './types';
import { costingSeed, designSeed, fitSpecSeed, jobRequestSeed } from './seed';
import { DEMO_TODAY, designDetailSeed } from './detailSeed';
import { derivePoStatuses, rollupSalesOrderStatuses } from './derive';

let designs: DesignRegisterRow[] = structuredClone(designSeed);
let fitSpecs: Record<string, FitSpec[]> = structuredClone(fitSpecSeed);
let jobRequests: Record<string, JobRequest[]> = structuredClone(jobRequestSeed);
let costings: Record<string, Costing[]> = structuredClone(costingSeed);
let nextId = designs.length + 1;
let matCounter = 100;
let fitCounter = 100;
let jobCounter = 100;
let costingCounter = 100;

export function resetDb(): void {
  designs = structuredClone(designSeed);
  fitSpecs = structuredClone(fitSpecSeed);
  jobRequests = structuredClone(jobRequestSeed);
  costings = structuredClone(costingSeed);
  nextId = designs.length + 1;
  matCounter = 100;
  fitCounter = 100;
  jobCounter = 100;
  costingCounter = 100;
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

export function getDesignVersions(designCode: string): DesignVersion[] {
  return designDetailSeed[designCode]?.versions ?? [];
}

export function getDesignPOs(designCode: string): DesignPO[] {
  return designDetailSeed[designCode]?.pos ?? [];
}

export function getDesignFitSpecs(designCode: string): FitSpec[] {
  return fitSpecs[designCode] ?? [];
}

function applySelection(list: FitSpec[], selectedId: string): FitSpec[] {
  return list.map((s) => (s.id === selectedId ? { ...s, is_selected: true } : { ...s, is_selected: false }));
}

export function addFitSpec(designCode: string, input: Omit<FitSpec, 'id'>): FitSpec {
  const created: FitSpec = { ...input, id: `fit-${String(++fitCounter).padStart(3, '0')}` };
  let list = [...(fitSpecs[designCode] ?? []), created];
  if (created.is_selected) list = applySelection(list, created.id);
  fitSpecs[designCode] = list;
  return created;
}

export function updateFitSpec(
  designCode: string,
  fitSpecId: string,
  input: Partial<Omit<FitSpec, 'id'>>,
): FitSpec | undefined {
  const list = fitSpecs[designCode] ?? [];
  const idx = list.findIndex((s) => s.id === fitSpecId);
  if (idx === -1) return undefined;
  const updated = { ...list[idx], ...input };
  let next = [...list.slice(0, idx), updated, ...list.slice(idx + 1)];
  if (updated.is_selected) next = applySelection(next, fitSpecId);
  fitSpecs[designCode] = next;
  return updated;
}

export function deleteFitSpec(designCode: string, fitSpecId: string): boolean {
  const list = fitSpecs[designCode] ?? [];
  const next = list.filter((s) => s.id !== fitSpecId);
  if (next.length === list.length) return false;
  fitSpecs[designCode] = next;
  return true;
}

export function setCurrentFitSpec(designCode: string, fitSpecId: string): boolean {
  const list = fitSpecs[designCode] ?? [];
  if (!list.some((s) => s.id === fitSpecId)) return false;
  fitSpecs[designCode] = applySelection(list, fitSpecId);
  return true;
}

export function getDesignJobRequests(designCode: string): JobRequest[] {
  return jobRequests[designCode] ?? [];
}

export function addJobRequest(designCode: string, input: Omit<JobRequest, 'id'>): JobRequest {
  const created: JobRequest = { ...input, id: `job-${String(++jobCounter).padStart(3, '0')}` };
  jobRequests[designCode] = [...(jobRequests[designCode] ?? []), created];
  return created;
}

export function updateJobRequest(
  designCode: string,
  jobId: string,
  input: Partial<Omit<JobRequest, 'id'>>,
): JobRequest | undefined {
  const list = jobRequests[designCode] ?? [];
  const idx = list.findIndex((j) => j.id === jobId);
  if (idx === -1) return undefined;
  const updated = { ...list[idx], ...input };
  jobRequests[designCode] = [...list.slice(0, idx), updated, ...list.slice(idx + 1)];
  return updated;
}

export function deleteJobRequest(designCode: string, jobId: string): boolean {
  const list = jobRequests[designCode] ?? [];
  const next = list.filter((j) => j.id !== jobId);
  if (next.length === list.length) return false;
  jobRequests[designCode] = next;
  return true;
}

export function getDesignCostings(designCode: string): Costing[] {
  return costings[designCode] ?? [];
}

export function addCosting(designCode: string, input: Omit<Costing, 'id'>): Costing {
  const created: Costing = { ...input, id: `costing-${String(++costingCounter).padStart(3, '0')}` };
  costings[designCode] = [...(costings[designCode] ?? []), created];
  return created;
}

export function updateCosting(
  designCode: string,
  costingId: string,
  input: Partial<Omit<Costing, 'id'>>,
): Costing | undefined {
  const list = costings[designCode] ?? [];
  const idx = list.findIndex((c) => c.id === costingId);
  if (idx === -1) return undefined;
  const updated = { ...list[idx], ...input };
  costings[designCode] = [...list.slice(0, idx), updated, ...list.slice(idx + 1)];
  return updated;
}

export function deleteCosting(designCode: string, costingId: string): boolean {
  const list = costings[designCode] ?? [];
  const next = list.filter((c) => c.id !== costingId);
  if (next.length === list.length) return false;
  costings[designCode] = next;
  return true;
}

/** Tick one live costing sheet for its purchase order (mutually exclusive per PO). */
export function setLiveCosting(designCode: string, costingId: string): boolean {
  const list = costings[designCode] ?? [];
  const target = list.find((c) => c.id === costingId);
  if (!target) return false;
  costings[designCode] = list.map((c) =>
    c.po_number === target.po_number ? { ...c, is_live: c.id === costingId } : c,
  );
  return true;
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