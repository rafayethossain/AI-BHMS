import type {
  DesignCreateInput,
  DesignDetail,
  DesignMaterial,
  DesignRegisterRow,
  DesignUpdateInput,
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