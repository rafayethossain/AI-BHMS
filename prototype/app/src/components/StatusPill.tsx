import type { RiskPayload } from '../mock/types';

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-600',
  draft: 'bg-blue-300/15 text-blue-600',
  archived: 'bg-slate-100 text-muted dark:bg-slate-800',
  open: 'bg-blue-300/15 text-blue-600',
  approved: 'bg-emerald-500/15 text-emerald-600',
  confirmed: 'bg-emerald-500/15 text-emerald-600',
  in_production: 'bg-amber-400/15 text-amber-600',
  quality_check: 'bg-purple-400/15 text-purple-600',
  ready: 'bg-emerald-500/15 text-emerald-600',
  pending: 'bg-amber-400/15 text-amber-600',
  in_progress: 'bg-blue-300/15 text-blue-600',
  completed: 'bg-emerald-500/15 text-emerald-600',
  rejected: 'bg-red-300/15 text-red-400',
  live: 'bg-emerald-500/15 text-emerald-600',
  shipped: 'bg-teal-300/15 text-teal-400',
  delivered: 'bg-emerald-500/15 text-emerald-600',
  cancelled: 'bg-red-300/15 text-red-400',
  current: 'bg-emerald-500/15 text-emerald-600',
};

const RISK_STYLES: Record<string, string> = {
  green: 'bg-emerald-500/15 text-emerald-600',
  amber: 'bg-amber-400/15 text-amber-600',
  red: 'bg-red-300/15 text-red-400',
  none: 'bg-slate-100 text-muted dark:bg-slate-800',
};

const FALLBACK = 'bg-slate-100 text-muted dark:bg-slate-800';

export interface StatusPillProps {
  value: string;
  risk?: RiskPayload;
  className?: string;
  pulse?: boolean;
  'data-testid'?: string;
}

export default function StatusPill({
  value,
  risk,
  className = '',
  pulse = false,
  'data-testid': testId,
}: StatusPillProps) {
  const label = risk?.label ?? value.replace(/[_-]/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
  const styleKey = risk?.code ?? value?.toLowerCase();
  const styles =
    (risk ? RISK_STYLES[risk.code] : STATUS_STYLES[styleKey ?? '']) ?? FALLBACK;

  return (
    <span
      data-testid={testId}
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles} ${pulse ? 'animate-pulse ' : ''}${className}`}
    >
      {label}
    </span>
  );
}