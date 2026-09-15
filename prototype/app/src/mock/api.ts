import type { DesignCreateInput, DesignRegisterRow, DesignUpdateInput } from './types';
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