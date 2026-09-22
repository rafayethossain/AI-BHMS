import type { DesignBomItem, DesignPO, RiskPayload, SalesOrderStatuses } from './types';

const RISK: Record<RiskPayload['code'], RiskPayload> = {
  none: { code: 'none', label: 'No Status', color: '#64748b', numeric: 0 },
  green: { code: 'green', label: 'On Track', color: '#22c55e', numeric: 1 },
  amber: { code: 'amber', label: 'At Risk', color: '#f59e0b', numeric: 2 },
  red: { code: 'red', label: 'Delayed or Overdue', color: '#ef4444', numeric: 3 },
};

export function risk(code: RiskPayload['code']): RiskPayload {
  return RISK[code];
}

const TRIM_CATEGORIES: DesignBomItem['category'][] = ['trims', 'labels', 'accessories', 'other'];

const PRODUCTION_GREEN: DesignPO['status'][] = ['delivered', 'ready', 'shipped', 'quality_check'];
const DELIVERY_GREEN: DesignPO['status'][] = ['delivered', 'ready', 'shipped'];
const NO_PIPELINE: DesignPO['status'][] = ['draft', 'open', 'cancelled'];

export interface DeriveContext {
  bom: DesignBomItem[];
  today: string;
}

function worst(codes: RiskPayload['code'][]): RiskPayload['code'] {
  return codes.reduce<RiskPayload['code']>(
    (acc, code) => (RISK[code].numeric > RISK[acc].numeric ? code : acc),
    'none',
  );
}

export function derivePoStatuses(po: DesignPO, ctx: DeriveContext): SalesOrderStatuses {
  const fabric: RiskPayload['code'] =
    po.fabric_status === 'delivered'
      ? 'green'
      : po.fabric_status === 'in_work'
        ? 'amber'
        : po.fabric_status === 'sticky_red'
          ? 'red'
          : 'none';

  const trimItems = ctx.bom.filter(
    (b) => b.version_number === po.version_number && TRIM_CATEGORIES.includes(b.category),
  );
  const trims: RiskPayload['code'] =
    trimItems.length === 0
      ? 'none'
      : trimItems.every((b) => b.status === 'Completed')
        ? 'green'
        : 'amber';

  const production: RiskPayload['code'] = PRODUCTION_GREEN.includes(po.status)
    ? 'green'
    : po.status === 'in_production'
      ? po.daily_production_qty + po.schedule_qty >= po.quantity
        ? 'green'
        : 'amber'
      : 'none';

  const inPipeline = !NO_PIPELINE.includes(po.status);
  const delivery: RiskPayload['code'] = DELIVERY_GREEN.includes(po.status)
    ? 'green'
    : inPipeline && po.delivery_date && po.delivery_date < ctx.today
      ? 'red'
      : inPipeline && po.delivery_date
        ? 'amber'
        : 'none';

  return {
    fabric: risk(fabric),
    trims: risk(trims),
    production: risk(production),
    delivery: risk(delivery),
    overall: risk(worst([fabric, trims, production, delivery])),
  };
}

export function rollupSalesOrderStatuses(
  pos: DesignPO[],
  ctx: DeriveContext,
): SalesOrderStatuses {
  const derived = pos.map((p) => derivePoStatuses(p, ctx));
  const area = (key: 'fabric' | 'trims' | 'production' | 'delivery') =>
    risk(worst(derived.map((d) => d[key].code)));

  const fabric = area('fabric');
  const trims = area('trims');
  const production = area('production');
  const delivery = area('delivery');

  return {
    fabric,
    trims,
    production,
    delivery,
    overall: risk(worst([fabric.code, trims.code, production.code, delivery.code])),
  };
}