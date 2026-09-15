import type { RiskPayload } from '../mock/types';

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-700',
  draft: 'bg-blue-300/15 text-blue-600',
  archived: 'bg-slate-100 text-muted',
  open: 'bg-blue-300/15 text-blue-600',
  confirmed: 'bg-emerald-500/15 text-emerald-700',
  in_production: 'bg-amber-400/15 text-amber-600',
  quality_check: 'bg-purple-400/15 text-purple-600',
  ready: 'bg-emerald-500/15 text-emerald-700',
  shipped: 'bg-teal-300/15 text-teal-400',
  delivered: 'bg-emerald-500/15 text-emerald-700',
  cancelled: 'bg-red-300/15 text-red-400',
};

const RISK_STYLES: Record<string, string> = {
  green: 'bg-emerald-500/15 text-emerald-700',
  amber: 'bg-amber-400/15 text-amber-600',
  red: 'bg-red-300/15 text-red-400',
  none: 'bg-slate-100 text-muted',
};

const FALLBACK = 'bg-slate-100 text-muted';

export interface StatusPillProps {
  value: string;
  risk?: RiskPayload;
  className?: string;
}

export default function StatusPill({ value, risk, className = '' }: StatusPillProps) {
  const label = risk?.label ?? value?.replace(/_/g, ' ');
  const styleKey = risk?.code ?? value?.toLowerCase();
  const styles =
    (risk ? RISK_STYLES[risk.code] : STATUS_STYLES[styleKey ?? '']) ?? FALLBACK;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${styles} ${className}`}
    >
      {label}
    </span>
  );
}