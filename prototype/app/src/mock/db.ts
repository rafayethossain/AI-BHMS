import type {
  AmendmentStatus,
  CommercialFileDetail,
  Costing,
  DesignCreateInput,
  DesignDetail,
  DesignDetailCore,
  DesignFileOpening,
  DesignMaterial,
  DesignPO,
  DesignPOWithStatus,
  DesignRegisterRow,
  DesignUpdateInput,
  DesignVersion,
  FileOpeningNote,
  FitSpec,
  JobRequest,
  POAmendment,
  POAmendmentInput,
  POHit,
  POHitInput,
  PurchaseOrderDetail,
  PurchaseOrderItem,
  PurchaseOrderItemInput,
  PurchaseOrderRow,
  StockAllocationInput,
  TrailEvent,
} from './types';
import { costingSeed, designSeed, fitSpecSeed, jobRequestSeed } from './seed';
import { DEMO_TODAY, designDetailSeed } from './detailSeed';
import { derivePoStatuses, rollupSalesOrderStatuses } from './derive';
import { joinParties, splitParties, toCommercialFile } from './commercialFile';
import { toPurchaseOrderRow } from './purchaseOrders';
import { poAmendmentsFor, poHitsFor, poItemsFor, poTrailFor } from './poDetail';

let designs: DesignRegisterRow[] = structuredClone(designSeed);
/** Mutable copy of the per-design detail layer (versions, file openings, POs, …). */
let details: Record<string, DesignDetailCore> = structuredClone(designDetailSeed);
let fitSpecs: Record<string, FitSpec[]> = structuredClone(fitSpecSeed);
let jobRequests: Record<string, JobRequest[]> = structuredClone(jobRequestSeed);
let costings: Record<string, Costing[]> = structuredClone(costingSeed);
let nextId = designs.length + 1;
let matCounter = 100;
let fitCounter = 100;
let jobCounter = 100;
let costingCounter = 100;
let allocationCounter = 0;
let noteCounter = 0;
let poItemCounter = 0;
let poHitCounter = 0;
let poAmendmentCounter = 0;
let trailCounter = 0;

interface PoChildren {
  items: PurchaseOrderItem[];
  hits: POHit[];
  amendments: POAmendment[];
  trail: TrailEvent[];
}

/** Mutable per-PO child layer (line items, hits, amendments, trail), seeded once per reset. */
let poChildren: Record<string, PoChildren> = buildPoChildren();

function buildPoChildren(): Record<string, PoChildren> {
  const map: Record<string, PoChildren> = {};
  for (const design of designs) {
    const core = details[design.design_code];
    if (!core) continue;
    core.pos.forEach((po, index) => {
      const row = toPurchaseOrderRow(
        design,
        { ...po, statuses: derivePoStatuses(po, { bom: core.bom, today: DEMO_TODAY }) },
        index,
      );
      const amendments = poAmendmentsFor(row);
      map[po.po_number] = {
        items: poItemsFor(row, core.items),
        hits: poHitsFor(row),
        amendments,
        trail: poTrailFor(row, amendments),
      };
    });
  }
  return map;
}

export function resetDb(): void {
  designs = structuredClone(designSeed);
  details = structuredClone(designDetailSeed);
  fitSpecs = structuredClone(fitSpecSeed);
  jobRequests = structuredClone(jobRequestSeed);
  costings = structuredClone(costingSeed);
  nextId = designs.length + 1;
  matCounter = 100;
  fitCounter = 100;
  jobCounter = 100;
  costingCounter = 100;
  allocationCounter = 0;
  noteCounter = 0;
  poItemCounter = 0;
  poHitCounter = 0;
  poAmendmentCounter = 0;
  trailCounter = 0;
  poChildren = buildPoChildren();
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
  return details[designCode]?.versions ?? [];
}

export function getDesignPOs(designCode: string): DesignPO[] {
  return details[designCode]?.pos ?? [];
}

export function getPurchaseOrders(filters?: {
  status?: string;
  search?: string;
  designCode?: string;
}): PurchaseOrderRow[] {
  const rows: PurchaseOrderRow[] = [];
  for (const design of designs) {
    const core = details[design.design_code];
    if (!core) continue;
    core.pos.forEach((po, index) => {
      rows.push(
        toPurchaseOrderRow(
          design,
          { ...po, statuses: derivePoStatuses(po, { bom: core.bom, today: DEMO_TODAY }) },
          index,
        ),
      );
    });
  }
  let out = rows;
  if (filters?.designCode) out = out.filter((r) => r.design_code === filters.designCode);
  if (filters?.status && filters.status !== 'all') out = out.filter((r) => r.status === filters.status);
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    out = out.filter(
      (r) =>
        r.po_number.toLowerCase().includes(q) ||
        r.fn_number.toLowerCase().includes(q) ||
        r.design_code.toLowerCase().includes(q) ||
        r.buyer.toLowerCase().includes(q) ||
        r.factory.toLowerCase().includes(q),
    );
  }
  return [...out].sort((a, b) => a.po_number.localeCompare(b.po_number));
}

export function getPurchaseOrder(poNumber: string): PurchaseOrderRow | undefined {
  return getPurchaseOrders().find((r) => r.po_number === poNumber);
}

function ensureChildren(poNumber: string): PoChildren {
  let c = poChildren[poNumber];
  if (!c) {
    c = { items: [], hits: [], amendments: [], trail: [] };
    poChildren[poNumber] = c;
  }
  return c;
}

function pushTrail(
  poNumber: string,
  at: string,
  actor: string,
  action: string,
  detail: string,
): void {
  const c = ensureChildren(poNumber);
  c.trail = [
    ...c.trail,
    { id: `po-trail-${++trailCounter}`, at, actor, action, detail },
  ];
}

export function getPurchaseOrderDetail(poNumber: string): PurchaseOrderDetail | undefined {
  const row = getPurchaseOrder(poNumber);
  if (!row) return undefined;
  const core = details[row.design_code];
  const version = core?.versions.find((v) => v.fn_number === row.fn_number);
  const c = ensureChildren(poNumber);
  return {
    ...row,
    version_id: version?.id ?? '',
    items: c.items,
    hits: c.hits,
    amendments: c.amendments,
    trail: c.trail,
  };
}

export function addPoItem(
  poNumber: string,
  input: PurchaseOrderItemInput,
): PurchaseOrderItem | undefined {
  if (!getPurchaseOrder(poNumber)) return undefined;
  const c = ensureChildren(poNumber);
  const item: PurchaseOrderItem = { ...input, id: `po-item-${++poItemCounter}` };
  c.items = [...c.items, item];
  pushTrail(poNumber, DEMO_TODAY, 'Merchandising', 'Line item added', `${item.item_code} × ${item.quantity}`);
  return item;
}

export function updatePoItem(
  poNumber: string,
  itemId: string,
  input: Partial<PurchaseOrderItemInput>,
): PurchaseOrderItem | undefined {
  const c = poChildren[poNumber];
  const target = c?.items.find((i) => i.id === itemId);
  if (!target) return undefined;
  const next = { ...target, ...input };
  c.items = c.items.map((i) => (i.id === itemId ? next : i));
  pushTrail(poNumber, DEMO_TODAY, 'Merchandising', 'Line item updated', `${next.item_code} × ${next.quantity}`);
  return next;
}

export function deletePoItem(poNumber: string, itemId: string): boolean {
  const c = poChildren[poNumber];
  const target = c?.items.find((i) => i.id === itemId);
  if (!target) return false;
  c.items = c.items.filter((i) => i.id !== itemId);
  pushTrail(poNumber, DEMO_TODAY, 'Merchandising', 'Line item deleted', target.item_code);
  return true;
}

export function addPoHit(poNumber: string, input: POHitInput): POHit | undefined {
  const row = getPurchaseOrder(poNumber);
  if (!row) return undefined;
  const c = ensureChildren(poNumber);
  const seq = c.hits.filter((h) => h.hit_number.startsWith(`HIT-${poNumber.replace('PO-', '')}`)).length + 1;
  const hit: POHit = {
    ...input,
    id: `po-hit-${++poHitCounter}`,
    hit_number: `HIT-${poNumber.replace('PO-', '')}-${seq}`,
  };
  c.hits = [...c.hits, hit];
  pushTrail(poNumber, DEMO_TODAY, 'Merchandising', 'Hit added', `${hit.hit_number} (${hit.kind}/${hit.mode})`);
  return hit;
}

export function updatePoHit(
  poNumber: string,
  hitId: string,
  input: Partial<POHitInput>,
): POHit | undefined {
  const c = poChildren[poNumber];
  const target = c?.hits.find((h) => h.id === hitId);
  if (!target) return undefined;
  const next = { ...target, ...input };
  c.hits = c.hits.map((h) => (h.id === hitId ? next : h));
  pushTrail(poNumber, DEMO_TODAY, 'Merchandising', 'Hit updated', next.hit_number);
  return next;
}

export function deletePoHit(poNumber: string, hitId: string): boolean {
  const c = poChildren[poNumber];
  const target = c?.hits.find((h) => h.id === hitId);
  if (!target) return false;
  c.hits = c.hits.filter((h) => h.id !== hitId);
  pushTrail(poNumber, DEMO_TODAY, 'Merchandising', 'Hit deleted', target.hit_number);
  return true;
}

export function requestAmendment(
  poNumber: string,
  input: POAmendmentInput,
): POAmendment | undefined {
  const row = getPurchaseOrder(poNumber);
  if (!row) return undefined;
  const c = ensureChildren(poNumber);
  const seq =
    c.amendments.filter((a) => a.amendment_number.startsWith(`AMD-${poNumber.replace('PO-', '')}`))
      .length + 1;
  const amendment: POAmendment = {
    ...input,
    id: `po-amd-${++poAmendmentCounter}`,
    amendment_number: `AMD-${poNumber.replace('PO-', '')}-${seq}`,
    status: 'requested',
    requested_at: DEMO_TODAY,
  };
  c.amendments = [...c.amendments, amendment];
  pushTrail(
    poNumber,
    DEMO_TODAY,
    amendment.requested_by,
    `Amendment ${amendment.amendment_number} requested`,
    `${amendment.field}: ${amendment.from_value} → ${amendment.to_value}`,
  );
  return amendment;
}

function setAmendmentStatus(
  poNumber: string,
  amendmentId: string,
  status: AmendmentStatus,
): boolean {
  const c = poChildren[poNumber];
  const target = c?.amendments.find((a) => a.id === amendmentId);
  if (!target || target.status !== 'requested') return false;
  c.amendments = c.amendments.map((a) => (a.id === amendmentId ? { ...a, status } : a));
  pushTrail(
    poNumber,
    DEMO_TODAY,
    'Buyer',
    `Amendment ${target.amendment_number} ${status}`,
    '',
  );
  return true;
}

export function approveAmendment(poNumber: string, amendmentId: string): boolean {
  return setAmendmentStatus(poNumber, amendmentId, 'approved');
}

export function rejectAmendment(poNumber: string, amendmentId: string): boolean {
  return setAmendmentStatus(poNumber, amendmentId, 'rejected');
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
  const core: DesignDetailCore = details[design.design_code] ?? {
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

function findVersion(
  designCode: string,
  versionId: string,
): { design: DesignRegisterRow; core: DesignDetailCore; version: DesignVersion } | undefined {
  const design = designs.find((d) => d.design_code === designCode);
  if (!design) return undefined;
  const core = details[design.design_code];
  if (!core) return undefined;
  const version = core.versions.find((v) => v.id === versionId || v.version_number === versionId);
  if (!version) return undefined;
  return { design, core, version };
}

function openingFor(core: DesignDetailCore, version: DesignVersion): DesignFileOpening | undefined {
  return core.file_openings.find((f) => f.fn_number === version.fn_number);
}

function withVersion(
  designCode: string,
  versionId: string,
  patch: (version: DesignVersion) => DesignVersion,
): boolean {
  const found = findVersion(designCode, versionId);
  if (!found) return false;
  const { core, version } = found;
  core.versions = core.versions.map((v) => (v.id === version.id ? patch(v) : v));
  return true;
}

function withOpening(
  designCode: string,
  versionId: string,
  patch: (opening: DesignFileOpening) => DesignFileOpening,
): boolean {
  const found = findVersion(designCode, versionId);
  if (!found) return false;
  const { core, version } = found;
  const opening = openingFor(core, version);
  if (!opening) return false;
  core.file_openings = core.file_openings.map((f) => (f.id === opening.id ? patch(f) : f));
  return true;
}

/** The commercial file (FN) of a design version, with the POs tracked under its FN. */
export function getCommercialFile(designCode: string, versionId: string): CommercialFileDetail | undefined {
  const found = findVersion(designCode, versionId);
  if (!found) return undefined;
  const { design, core, version } = found;
  const opening = openingFor(core, version);
  if (!opening) return undefined;
  const pos: DesignPOWithStatus[] = core.pos
    .filter((p) => p.fn_number === version.fn_number)
    .map((p) => ({ ...p, statuses: derivePoStatuses(p, { bom: core.bom, today: DEMO_TODAY }) }));
  return toCommercialFile(design, version, opening, pos);
}

/** Mark / unmark a version as quick lead. Unmarking clears the agreements. */
export function setQuickLead(designCode: string, versionId: string, value: boolean): boolean {
  return withVersion(designCode, versionId, (v) => ({
    ...v,
    is_quick_lead: value,
    quick_lead_agreed_by: value ? v.quick_lead_agreed_by : '',
  }));
}

export function agreeQuickLead(designCode: string, versionId: string, party: string): boolean {
  const found = findVersion(designCode, versionId);
  if (!found || !found.version.is_quick_lead) return false;
  const agreed = joinParties([...splitParties(found.version.quick_lead_agreed_by), party]);
  return withVersion(designCode, versionId, (v) => ({ ...v, quick_lead_agreed_by: agreed }));
}

/** Raise a repeat of this order against the same FN (all departments must confirm). */
export function createRepeat(designCode: string, versionId: string): boolean {
  return withVersion(designCode, versionId, (v) => ({
    ...v,
    is_repeat: true,
    original_fn: v.original_fn || v.fn_number,
    repeat_approved_by: '',
  }));
}

export function approveRepeat(designCode: string, versionId: string, party: string): boolean {
  const found = findVersion(designCode, versionId);
  if (!found || !found.version.is_repeat) return false;
  const approved = joinParties([...splitParties(found.version.repeat_approved_by), party]);
  return withVersion(designCode, versionId, (v) => ({ ...v, repeat_approved_by: approved }));
}

export function setStockFabric(
  designCode: string,
  versionId: string,
  input: { description: string; total_meters: number },
): boolean {
  const marked = withVersion(designCode, versionId, (v) => ({ ...v, stock_fabric: true }));
  if (!marked) return false;
  return withOpening(designCode, versionId, (f) => ({
    ...f,
    stock_description: input.description,
    total_meters: input.total_meters,
    allocations: f.allocations ?? [],
  }));
}

export function allocateStock(
  designCode: string,
  versionId: string,
  input: StockAllocationInput,
): boolean {
  return withOpening(designCode, versionId, (f) => ({
    ...f,
    allocations: [
      ...(f.allocations ?? []),
      {
        id: `alloc-${String(++allocationCounter).padStart(3, '0')}`,
        allocated_to: input.allocated_to,
        meters: input.meters,
        notes: input.notes ?? '',
      },
    ],
  }));
}

export function addCommercialFileNote(
  designCode: string,
  versionId: string,
  input: Omit<FileOpeningNote, 'id'>,
): boolean {
  return withOpening(designCode, versionId, (f) => ({
    ...f,
    notes: [...f.notes, { id: `${f.id}-note-${++noteCounter}`, ...input }],
  }));
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