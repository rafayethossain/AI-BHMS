import type {
  CommercialFileDetail,
  DesignFileOpening,
  DesignPOWithStatus,
  DesignRegisterRow,
  DesignVersion,
  StockAllocation,
} from './types';

/** Departments every quick-lead order must agree / every repeat must confirm. */
export const COMMERCIAL_FILE_PARTIES = [
  'merchandising',
  'production',
  'quality',
  'commercial',
] as const;

/** Split a comma-separated party list into normalised tokens. */
export function splitParties(value: string): string[] {
  return value
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
}

/** Join party tokens into a stable, de-duplicated comma list. */
export function joinParties(parties: string[]): string {
  return Array.from(new Set(parties.map((p) => p.trim().toLowerCase()).filter(Boolean))).join(', ');
}

/** Canonical departments that have not yet agreed/approved. */
export function missingParties(signedBy: string): string[] {
  const signed = new Set(splitParties(signedBy));
  return COMMERCIAL_FILE_PARTIES.filter((party) => !signed.has(party));
}

export function flagLabels(version: Pick<DesignVersion, 'is_quick_lead' | 'is_repeat' | 'stock_fabric'>): string[] {
  const out: string[] = [];
  if (version.is_quick_lead) out.push('Quick lead');
  if (version.is_repeat) out.push('Repeat');
  if (version.stock_fabric) out.push('Stock fabric');
  return out;
}

export function allocationsFor(opening: DesignFileOpening): StockAllocation[] {
  return opening.allocations ?? [];
}

export function allocatedMeters(opening: DesignFileOpening): number {
  return allocationsFor(opening).reduce((sum, a) => sum + a.meters, 0);
}

export function toCommercialFile(
  design: DesignRegisterRow,
  version: DesignVersion,
  opening: DesignFileOpening,
  pos: DesignPOWithStatus[],
): CommercialFileDetail {
  const totalMeters = opening.total_meters ?? 0;
  const allocated = allocatedMeters(opening);
  return {
    id: version.id,
    design_id: design.id,
    design_code: design.design_code,
    style_type: design.style_type,
    category: design.category,
    buyer: opening.buyer,
    factory: opening.factory,
    fn_number: version.fn_number,
    version_number: version.version_number,
    status: version.status,
    is_current: version.is_current,
    open_date: opening.open_date,
    approved_date: opening.approved_date,
    quantity: version.quantity,
    unit_price: version.unit_price,
    revision_notes: version.revision_notes,
    po_count: pos.length,
    pos,
    is_quick_lead: version.is_quick_lead,
    quick_lead_agreed_by: version.quick_lead_agreed_by,
    is_repeat: version.is_repeat,
    original_fn: version.original_fn,
    repeat_approved_by: version.repeat_approved_by,
    is_stock_fabric: version.stock_fabric,
    stock_description: opening.stock_description ?? '',
    total_meters: totalMeters,
    allocated_meters: allocated,
    balance_meters: Math.max(0, totalMeters - allocated),
    allocations: allocationsFor(opening),
    notes: opening.notes,
  };
}
