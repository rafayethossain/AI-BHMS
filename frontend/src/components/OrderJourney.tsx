import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { merchApi } from '../api/client';

interface JourneyStep {
  key: string;
  label: string;
  status: string;
  id: string | null;
  code: string | null;
  name?: string;
  quantity?: number;
  total_value?: string;
  file_openings_count?: number;
  purchase_orders_count?: number;
  items_count?: number;
  total_cost?: string;
  margin?: string;
  milestones_total?: number;
  milestones_completed?: number;
  plans_count?: number;
  inspections_count?: number;
  shipments_count?: number;
  pi_status?: string | null;
  sc_status?: string | null;
  lc_status?: string | null;
}

interface JourneyData {
  steps: JourneyStep[];
  current_step: string;
  completion_percentage: number;
}

const ROUTE_MAP: Record<string, (step: JourneyStep) => string | null> = {
  style: (s) => s.id ? `/styles/${s.id}` : null,
  file_opening: (s) => s.id ? `/file-openings/${s.id}` : null,
  purchase_order: (s) => s.id ? `/purchase-orders/${s.id}` : null,
  bom: (s) => s.id ? `/boms/${s.id}` : null,
  costing: (s) => s.id ? `/costings/${s.id}` : null,
  ta: () => '/tas',
  production: () => '/production',
  quality: () => '/quality',
  logistics: () => '/logistics',
  commercial: () => '/pis',
};

function getStepIcon(stepKey: string): string {
  const icons: Record<string, string> = {
    style: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    file_opening: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    purchase_order: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',
    bom: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
    costing: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    ta: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    production: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
    quality: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    logistics: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
    commercial: 'M9 14l6-6m-5.5.h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z',
  };
  return icons[stepKey] || 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
}

function getStepColor(_key: string, status: string, isCurrent: boolean): string {
  if (status === 'not_started') return 'text-faint';
  if (status === 'draft' || status === 'pending' || status === 'open') return 'text-muted';
  if (status === 'completed' || status === 'approved' || status === 'passed' || status === 'delivered' || status === 'active') return 'text-badge-emerald';
  if (status === 'failed' || status === 'cancelled') return 'text-badge-red';
  if (isCurrent) return 'text-blue-500';
  return 'text-heading';
}

function getConnectorColor(stepStatus: string): string {
  const completed = ['completed', 'approved', 'passed', 'delivered', 'active'];
  return completed.includes(stepStatus) ? 'bg-emerald-500' : 'bg-border';
}

function getBadge(step: JourneyStep): string | null {
  if (step.key === 'ta' && step.milestones_total && step.milestones_total > 0) {
    return `${step.milestones_completed || 0}/${step.milestones_total}`;
  }
  if (step.key === 'bom' && step.items_count !== undefined && step.items_count > 0) {
    return `${step.items_count} items`;
  }
  if (step.key === 'production' && step.plans_count !== undefined && step.plans_count > 0) {
    return `${step.plans_count} plans`;
  }
  if (step.key === 'quality' && step.inspections_count !== undefined && step.inspections_count > 0) {
    return `${step.inspections_count} insp`;
  }
  if (step.key === 'logistics' && step.shipments_count !== undefined && step.shipments_count > 0) {
    return `${step.shipments_count} ships`;
  }
  if (step.key === 'file_opening' && step.purchase_orders_count !== undefined && step.purchase_orders_count > 0) {
    return `${step.purchase_orders_count} POs`;
  }
  return null;
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    not_started: 'Not Started',
    draft: 'Draft',
    pending: 'Pending',
    open: 'Open',
    confirmed: 'Confirmed',
    active: 'Active',
    completed: 'Completed',
    approved: 'Approved',
    passed: 'Passed',
    delivered: 'Delivered',
    in_progress: 'In Progress',
    in_transit: 'In Transit',
    booked: 'Booked',
    planned: 'Planned',
    failed: 'Failed',
    cancelled: 'Cancelled',
    archived: 'Archived',
    sent: 'Sent',
  };
  return labels[status] || status;
}

interface OrderJourneyProps {
  poId: string;
  compact?: boolean;
}

export default function OrderJourney({ poId }: OrderJourneyProps) {
  const [journey, setJourney] = useState<JourneyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredStep, setHoveredStep] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchJourney = async () => {
      try {
        const res = await merchApi.getPOJourney(poId);
        setJourney(res.data);
      } catch { /* ignore */ } finally { setLoading(false); }
    };
    fetchJourney();
  }, [poId]);

  if (loading || !journey) {
    return (
      <div className="bg-surface rounded-xl border border-border p-4">
        <div className="animate-pulse flex items-center gap-2">
          <div className="h-3 bg-surface-alt rounded w-32" />
          <div className="h-3 bg-surface-alt rounded w-20" />
        </div>
      </div>
    );
  }

  const { steps, completion_percentage } = journey;

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      {/* Progress bar */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <span className="text-xs text-muted font-medium">Order Journey</span>
        <span className="text-xs text-heading font-mono">{completion_percentage}%</span>
      </div>
      <div className="px-4 pb-1">
        <div className="h-1 bg-surface-alt rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${completion_percentage}%` }} />
        </div>
      </div>

      {/* Stepper */}
      <div className="px-3 pb-4 pt-3 overflow-x-auto">
        <div className="flex items-start min-w-max">
          {steps.map((step, idx) => {
            const isLast = idx === steps.length - 1;
            const isCurrent = step.key === journey.current_step;
            const navigateTo = ROUTE_MAP[step.key]?.(step);
            const colorClass = getStepColor(step.key, step.status, isCurrent);
            const badge = getBadge(step);

            return (
              <div key={step.key} className="flex items-start">
                {/* Step node */}
                <button
                  onClick={() => navigateTo && navigate(navigateTo)}
                  onMouseEnter={() => setHoveredStep(step.key)}
                  onMouseLeave={() => setHoveredStep(null)}
                  disabled={!navigateTo}
                  className={`flex flex-col items-center gap-1 min-w-[64px] group ${navigateTo ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  {/* Icon circle */}
                  <div className={`relative w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                    isCurrent ? 'border-blue-500 bg-blue-500/10 scale-110' :
                    step.status === 'completed' || step.status === 'approved' || step.status === 'passed' || step.status === 'delivered' || step.status === 'active'
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : step.status === 'failed' || step.status === 'cancelled'
                        ? 'border-red-500 bg-red-500/10'
                        : 'border-border bg-surface-alt'
                  } ${navigateTo ? 'group-hover:shadow-md' : ''}`}>
                    <svg className={`w-4 h-4 ${colorClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={getStepIcon(step.key)} />
                    </svg>
                    {isCurrent && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-surface animate-pulse" />
                    )}
                  </div>

                  {/* Label */}
                  <span className={`text-[10px] font-medium text-center leading-tight ${isCurrent ? 'text-blue-400' : colorClass}`}>
                    {step.label}
                  </span>

                  {/* Status */}
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                    step.status === 'completed' || step.status === 'approved' || step.status === 'passed' || step.status === 'delivered' || step.status === 'active'
                      ? 'bg-emerald-500/20 text-badge-emerald'
                      : step.status === 'failed' || step.status === 'cancelled'
                        ? 'bg-red-500/20 text-badge-red'
                        : step.status === 'not_started'
                          ? 'bg-surface-alt text-faint'
                          : 'bg-surface-alt text-muted'
                  }`}>
                    {getStatusLabel(step.status)}
                  </span>

                  {/* Badge */}
                  {badge && (
                    <span className="text-[9px] text-muted font-mono">{badge}</span>
                  )}
                </button>

                {/* Connector line */}
                {!isLast && (
                  <div className="flex items-center pt-4 px-0">
                    <div className={`w-8 h-0.5 ${getConnectorColor(steps[idx].status)}`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Hover tooltip */}
      {hoveredStep && (
        <div className="px-4 pb-3">
          {(() => {
            const step = steps.find(s => s.key === hoveredStep);
            if (!step) return null;
            const details: string[] = [];
            if (step.code) details.push(step.code);
            if (step.name) details.push(step.name);
            if (step.total_value) details.push(`$${parseFloat(step.total_value).toLocaleString()}`);
            if (step.milestones_total) details.push(`${step.milestones_completed}/${step.milestones_total} milestones`);
            if (step.pi_status) details.push(`PI: ${step.pi_status}`);
            if (step.sc_status) details.push(`SC: ${step.sc_status}`);
            return (
              <div className="bg-surface-alt rounded-lg px-3 py-2 text-xs text-muted">
                {details.join(' · ')}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
