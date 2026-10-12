import type {
  CommercialFileDetail,
  Costing,
  DesignCreateInput,
  DesignDetail,
  DesignMaterial,
  DesignPO,
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
} from './types';
import * as db from './db';

const LATENCY = 120;

function delay<T>(fn: () => T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(fn()), LATENCY));
}

export function resetDb(): void {
  db.resetDb();
}

export async function getDesigns(filters?: {
  status?: string;
  search?: string;
}): Promise<DesignRegisterRow[]> {
  return delay(() => db.getDesigns(filters));
}

export async function getDesign(id: string): Promise<DesignRegisterRow | undefined> {
  return delay(() => db.getDesign(id));
}

export async function getDesignDetail(designCode: string): Promise<DesignDetail | undefined> {
  return delay(() => db.getDesignDetail(designCode));
}

export async function createDesign(input: DesignCreateInput): Promise<DesignRegisterRow> {
  return delay(() => db.createDesign(input));
}

export async function updateDesign(
  id: string,
  input: DesignUpdateInput,
): Promise<DesignRegisterRow | undefined> {
  return delay(() => db.updateDesign(id, input));
}

export async function deleteDesign(id: string): Promise<boolean> {
  return delay(() => db.deleteDesign(id));
}

export async function getDesignByCode(designCode: string): Promise<DesignRegisterRow | undefined> {
  return delay(() => db.getDesignByCode(designCode));
}

export async function getDesignMaterials(designCode: string): Promise<DesignMaterial[]> {
  return delay(() => db.getDesignMaterials(designCode));
}

export async function addDesignMaterial(
  designCode: string,
  material: Omit<DesignMaterial, 'id'>,
): Promise<DesignMaterial> {
  return delay(() => db.addMaterial(designCode, material));
}

export async function updateDesignMaterial(
  designCode: string,
  materialId: string,
  input: Partial<Omit<DesignMaterial, 'id'>>,
): Promise<DesignMaterial | undefined> {
  return delay(() => db.updateMaterial(designCode, materialId, input));
}

export async function deleteDesignMaterial(
  designCode: string,
  materialId: string,
): Promise<boolean> {
  return delay(() => db.deleteMaterial(designCode, materialId));
}

export async function getDesignVersions(designCode: string): Promise<DesignVersion[]> {
  return delay(() => db.getDesignVersions(designCode));
}
export async function getDesignFitSpecs(designCode: string): Promise<FitSpec[]> {
  return delay(() => db.getDesignFitSpecs(designCode));
}

export async function addFitSpec(
  designCode: string,
  input: Omit<FitSpec, 'id'>,
): Promise<FitSpec> {
  return delay(() => db.addFitSpec(designCode, input));
}

export async function updateFitSpec(
  designCode: string,
  fitSpecId: string,
  input: Partial<Omit<FitSpec, 'id'>>,
): Promise<FitSpec | undefined> {
  return delay(() => db.updateFitSpec(designCode, fitSpecId, input));
}

export async function deleteFitSpec(designCode: string, fitSpecId: string): Promise<boolean> {
  return delay(() => db.deleteFitSpec(designCode, fitSpecId));
}

export async function setCurrentFitSpec(designCode: string, fitSpecId: string): Promise<boolean> {
  return delay(() => db.setCurrentFitSpec(designCode, fitSpecId));
}

export async function getDesignPOs(designCode: string): Promise<DesignPO[]> {
  return delay(() => db.getDesignPOs(designCode));
}

export async function getPurchaseOrders(filters?: {
  status?: string;
  search?: string;
  designCode?: string;
}): Promise<PurchaseOrderRow[]> {
  return delay(() => db.getPurchaseOrders(filters));
}

export async function getPurchaseOrder(poNumber: string): Promise<PurchaseOrderRow | undefined> {
  return delay(() => db.getPurchaseOrder(poNumber));
}

export async function getPurchaseOrderDetail(
  poNumber: string,
): Promise<PurchaseOrderDetail | undefined> {
  return delay(() => db.getPurchaseOrderDetail(poNumber));
}

export async function addPoItem(
  poNumber: string,
  input: PurchaseOrderItemInput,
): Promise<PurchaseOrderItem | undefined> {
  return delay(() => db.addPoItem(poNumber, input));
}

export async function updatePoItem(
  poNumber: string,
  itemId: string,
  input: Partial<PurchaseOrderItemInput>,
): Promise<PurchaseOrderItem | undefined> {
  return delay(() => db.updatePoItem(poNumber, itemId, input));
}

export async function deletePoItem(poNumber: string, itemId: string): Promise<boolean> {
  return delay(() => db.deletePoItem(poNumber, itemId));
}

export async function addPoHit(
  poNumber: string,
  input: POHitInput,
): Promise<POHit | undefined> {
  return delay(() => db.addPoHit(poNumber, input));
}

export async function updatePoHit(
  poNumber: string,
  hitId: string,
  input: Partial<POHitInput>,
): Promise<POHit | undefined> {
  return delay(() => db.updatePoHit(poNumber, hitId, input));
}

export async function deletePoHit(poNumber: string, hitId: string): Promise<boolean> {
  return delay(() => db.deletePoHit(poNumber, hitId));
}

export async function requestAmendment(
  poNumber: string,
  input: POAmendmentInput,
): Promise<POAmendment | undefined> {
  return delay(() => db.requestAmendment(poNumber, input));
}

export async function approveAmendment(poNumber: string, amendmentId: string): Promise<boolean> {
  return delay(() => db.approveAmendment(poNumber, amendmentId));
}

export async function rejectAmendment(poNumber: string, amendmentId: string): Promise<boolean> {
  return delay(() => db.rejectAmendment(poNumber, amendmentId));
}

export async function getDesignJobRequests(designCode: string): Promise<JobRequest[]> {
  return delay(() => db.getDesignJobRequests(designCode));
}

export async function addJobRequest(
  designCode: string,
  input: Omit<JobRequest, 'id'>,
): Promise<JobRequest> {
  return delay(() => db.addJobRequest(designCode, input));
}

export async function updateJobRequest(
  designCode: string,
  jobId: string,
  input: Partial<Omit<JobRequest, 'id'>>,
): Promise<JobRequest | undefined> {
  return delay(() => db.updateJobRequest(designCode, jobId, input));
}

export async function deleteJobRequest(designCode: string, jobId: string): Promise<boolean> {
  return delay(() => db.deleteJobRequest(designCode, jobId));
}

export async function getDesignCostings(designCode: string): Promise<Costing[]> {
  return delay(() => db.getDesignCostings(designCode));
}

export async function addCosting(
  designCode: string,
  input: Omit<Costing, 'id'>,
): Promise<Costing> {
  return delay(() => db.addCosting(designCode, input));
}

export async function updateCosting(
  designCode: string,
  costingId: string,
  input: Partial<Omit<Costing, 'id'>>,
): Promise<Costing | undefined> {
  return delay(() => db.updateCosting(designCode, costingId, input));
}

export async function deleteCosting(designCode: string, costingId: string): Promise<boolean> {
  return delay(() => db.deleteCosting(designCode, costingId));
}

export async function setLiveCosting(designCode: string, costingId: string): Promise<boolean> {
  return delay(() => db.setLiveCosting(designCode, costingId));
}

export async function getCommercialFile(
  designCode: string,
  versionId: string,
): Promise<CommercialFileDetail | undefined> {
  return delay(() => db.getCommercialFile(designCode, versionId));
}

export async function setQuickLead(
  designCode: string,
  versionId: string,
  value: boolean,
): Promise<boolean> {
  return delay(() => db.setQuickLead(designCode, versionId, value));
}

export async function agreeQuickLead(
  designCode: string,
  versionId: string,
  party: string,
): Promise<boolean> {
  return delay(() => db.agreeQuickLead(designCode, versionId, party));
}

export async function createRepeat(designCode: string, versionId: string): Promise<boolean> {
  return delay(() => db.createRepeat(designCode, versionId));
}

export async function approveRepeat(
  designCode: string,
  versionId: string,
  party: string,
): Promise<boolean> {
  return delay(() => db.approveRepeat(designCode, versionId, party));
}

export async function setStockFabric(
  designCode: string,
  versionId: string,
  input: { description: string; total_meters: number },
): Promise<boolean> {
  return delay(() => db.setStockFabric(designCode, versionId, input));
}

export async function allocateStock(
  designCode: string,
  versionId: string,
  input: StockAllocationInput,
): Promise<boolean> {
  return delay(() => db.allocateStock(designCode, versionId, input));
}

export async function addCommercialFileNote(
  designCode: string,
  versionId: string,
  input: Omit<FileOpeningNote, 'id'>,
): Promise<boolean> {
  return delay(() => db.addCommercialFileNote(designCode, versionId, input));
}