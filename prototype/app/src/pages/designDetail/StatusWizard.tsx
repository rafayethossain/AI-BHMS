import StatusPill from '../../components/StatusPill';
import type { DesignStatus } from '../../mock/types';

const STEPS: DesignStatus[] = ['draft', 'active', 'archived'];

const STEP_LABELS: Record<DesignStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  archived: 'Archived',
};

const ACTIONS: Record<DesignStatus, { label: string; next: DesignStatus; message: string }> = {
  draft: { label: 'Make Active', next: 'active', message: 'Design activated' },
  active: { label: 'Archive', next: 'archived', message: 'Design archived' },
  archived: { label: 'Reopen', next: 'active', message: 'Design reopened' },
};

interface StatusWizardProps {
  status: DesignStatus;
  busy?: boolean;
  onTransition: (next: DesignStatus, message: string) => void;
}

export default function StatusWizard({ status, busy = false, onTransition }: StatusWizardProps) {
  const action = ACTIONS[status];

  return (
    <div className="rounded-lg border border-border bg-surface-alt/40 p-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-medium text-heading">Status</h3>
          <div className="mt-2">
            <StatusPill value={status} />
          </div>
        </div>
        <ol className="flex items-center gap-2" aria-label="Design status progress">
          {STEPS.map((step) => (
            <li key={step} className="flex items-center gap-2">
              <span
                aria-current={step === status ? 'step' : undefined}
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  step === status
                    ? 'bg-emerald-500/15 text-emerald-600'
                    : 'bg-surface text-muted border border-border'
                }`}
              >
                {STEP_LABELS[step]}
              </span>
              {step !== STEPS[STEPS.length - 1] && <span className="text-faint">→</span>}
            </li>
          ))}
        </ol>
        <button
          type="button"
          disabled={busy}
          onClick={() => onTransition(action.next, action.message)}
          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50"
        >
          {action.label}
        </button>
      </div>
    </div>
  );
}