import type {
  DesignPO,
  DesignPOWithStatus,
  DesignRegisterRow,
  POStatus,
  PurchaseOrderRow,
  RiskPayload,
} from './types';

/** Buyer → destination country (register-list display only). */
const BUYER_COUNTRY: Record<string, string> = {
  'Nike Inc.': 'USA',
  Zara: 'Spain',
  Primark: 'UK',
  Aldi: 'Germany',
  Addidas: 'Germany',
  Walmart: 'USA',
  Costco: 'USA',
};

/** Factory → origin country. */
const FACTORY_COUNTRY: Record<string, string> = {
  'Dhaka Apparels': 'Bangladesh',
  'Chittagong Knit': 'Bangladesh',
  'Gazipur Textiles': 'Bangladesh',
  'Narayanganj Fashions': 'Bangladesh',
};

const NO_STATUS: RiskPayload = { code: 'none', label: 'No Status', color: '#64748b', numeric: 0 };

const STATUS_LABELS: Record<POStatus, string> = {
  draft: 'Draft',
  open: 'Open',
  confirmed: 'Confirmed',
  in_production: 'In Production',
  quality_check: 'Quality Check',
  ready: 'Ready',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

/** Orders that have physically left the factory get an actual delivery date. */
const SHIPPED_STATUSES: DesignPO['status'][] = ['delivered', 'shipped'];

export function destinationFor(buyer: string): string {
  return BUYER_COUNTRY[buyer] ?? 'UK';
}

export function originFor(factory: string): string {
  return FACTORY_COUNTRY[factory] ?? 'Bangladesh';
}

/** Add whole days to an ISO date (negative goes backwards), returning `YYYY-MM-DD`. */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** Deterministic lead-in date before the delivery date (5 repeating offsets). */
export function poDateFor(deliveryDate: string, index: number): string {
  return addDays(deliveryDate, -(45 + (index % 5) * 7));
}

export function actualDeliveryFor(po: DesignPO): string | null {
  return SHIPPED_STATUSES.includes(po.status) ? po.delivery_date : null;
}

export function riskLabel(r: RiskPayload | undefined): string {
  return (r ?? NO_STATUS).label;
}

export function poStatusLabel(status: POStatus): string {
  return STATUS_LABELS[status] ?? status;
}

/** Lift a per-design PO onto the register-wide list with its design linkage + display fields. */
export function toPurchaseOrderRow(
  design: DesignRegisterRow,
  po: DesignPOWithStatus,
  index: number,
): PurchaseOrderRow {
  return {
    ...po,
    design_id: design.id,
    design_code: design.design_code,
    style_type: design.style_type,
    category: design.category,
    po_date: poDateFor(po.delivery_date, index),
    destination: destinationFor(po.buyer),
    origin: originFor(po.factory),
    actual_delivery_date: actualDeliveryFor(po),
  };
}