import type {
  DesignItem,
  POAmendment,
  POHit,
  PurchaseOrderItem,
  PurchaseOrderRow,
  TrailEvent,
} from './types';
import { addDays, poStatusLabel } from './purchaseOrders';

const HIT_KINDS: POHit['kind'][] = ['boxed', 'hanging'];
const HIT_MODES: POHit['mode'][] = ['sea', 'air'];
const AMENDMENT_FIELDS = ['delivery_date', 'quantity', 'unit_price', 'factory'];
const AMENDMENT_REASONS = ['Buyer shift request', 'Buyer changed size ratio', 'Exchange rate adjustment'];

/** Deterministic, stable hash from a PO number so the children survive reloads. */
function seedFor(poNumber: string): number {
  let sum = 0;
  for (let i = 0; i < poNumber.length; i += 1) {
    sum = (sum * 31 + poNumber.charCodeAt(i)) % 100000;
  }
  return sum;
}

function poSuffix(poNumber: string): string {
  return poNumber.replace('PO-', '');
}

function amendmentValues(
  field: string,
  po: PurchaseOrderRow,
  seed: number,
  n: number,
): { from: string; to: string } {
  if (field === 'delivery_date') {
    return {
      from: addDays(po.delivery_date, -(14 + (seed % 7))),
      to: addDays(po.delivery_date, -(7 + n * 3)),
    };
  }
  if (field === 'quantity') {
    return {
      from: String(po.quantity - 500 - (seed % 10) * 10),
      to: String(po.quantity),
    };
  }
  if (field === 'unit_price') {
    const unit = Number(po.unit_price) || 3;
    return { from: (unit - 0.25).toFixed(2), to: po.unit_price };
  }
  return { from: 'Dhaka Apparels', to: 'Gazipur Textiles' };
}

/** Line items split from the design's items so the PO quantity is covered exactly. */
export function poItemsFor(po: PurchaseOrderRow, designItems: DesignItem[]): PurchaseOrderItem[] {
  const src =
    designItems.length > 0
      ? designItems
      : [
          {
            id: `${po.po_number}-item-1`,
            item_code: po.design_code,
            colour: 'BLACK',
            size: 'M',
            colour_ways: 1,
            quantity: po.quantity,
          },
        ];
  const unit = (Number(po.unit_price) || 3).toFixed(2);
  const perRow = Math.round(po.quantity / src.length);
  return src.map((it, n) => ({
    id: `${po.po_number}-item-${n + 1}`,
    item_code: it.item_code,
    colour: it.colour,
    size: it.size,
    quantity: n === src.length - 1 ? po.quantity - perRow * (src.length - 1) : perRow,
    unit_price: unit,
  }));
}

/** Sea/air, boxed/hanging hit plan for the PO (1–3 hits). */
export function poHitsFor(po: PurchaseOrderRow): POHit[] {
  const s = seedFor(po.po_number);
  const count = 1 + (s % 3);
  return Array.from({ length: count }, (_, n) => ({
    id: `${po.po_number}-hit-${n + 1}`,
    hit_number: `HIT-${poSuffix(po.po_number)}-${n + 1}`,
    kind: HIT_KINDS[(s + n) % 2],
    mode: HIT_MODES[(s + n) % 2],
    quantity: Math.round(po.quantity / count),
    hit_date: addDays(po.delivery_date, -(14 + n * 7)),
    notes: n === 0 ? 'FOB via Dhaka' : '',
  }));
}

/**
 * Deterministic amendments, one per lifecycle state by construction: the first is always
 * `requested` (so the Approve/Reject actions are demoable on every PO), the next two are
 * `approved` and `rejected`.
 */
export function poAmendmentsFor(po: PurchaseOrderRow): POAmendment[] {
  const s = seedFor(po.po_number);
  return [0, 1, 2].map((n) => {
    const field = AMENDMENT_FIELDS[(s + n) % AMENDMENT_FIELDS.length];
    const values = amendmentValues(field, po, s, n);
    return {
      id: `${po.po_number}-amd-${n + 1}`,
      amendment_number: `AMD-${poSuffix(po.po_number)}-${n + 1}`,
      field,
      from_value: values.from,
      to_value: values.to,
      reason: AMENDMENT_REASONS[(s + n) % AMENDMENT_REASONS.length],
      status: n === 0 ? 'requested' : n === 1 ? 'approved' : 'rejected',
      requested_by: 'F. Rahman',
      requested_at: addDays(po.delivery_date, -(21 + n * 6)),
    };
  });
}

/** Lifecycle trail: creation, per-amendment events, and a status milestone. */
export function poTrailFor(po: PurchaseOrderRow, amendments: POAmendment[]): TrailEvent[] {
  const events: TrailEvent[] = [
    {
      id: `${po.po_number}-trail-1`,
      at: po.po_date,
      actor: 'Merchandising',
      action: 'Purchase order created',
      detail: `PO ${po.po_number} opened under file ${po.fn_number}`,
    },
  ];
  let seq = 2;
  for (const a of amendments) {
    events.push({
      id: `${po.po_number}-trail-${seq++}`,
      at: a.requested_at,
      actor: a.requested_by,
      action: `Amendment ${a.amendment_number} requested`,
      detail: `${a.field}: ${a.from_value} → ${a.to_value}`,
    });
    if (a.status === 'approved' || a.status === 'rejected') {
      events.push({
        id: `${po.po_number}-trail-${seq++}`,
        at: addDays(a.requested_at, 3),
        actor: 'Buyer',
        action: `Amendment ${a.amendment_number} ${a.status}`,
        detail: '',
      });
    }
  }
  if (po.status !== 'draft' && po.status !== 'open') {
    events.push({
      id: `${po.po_number}-trail-${seq++}`,
      at: addDays(po.po_date, 7),
      actor: 'Merchandising',
      action: `Status → ${poStatusLabel(po.status)}`,
      detail: '',
    });
  }
  return events.sort((a, b) => a.at.localeCompare(b.at));
}