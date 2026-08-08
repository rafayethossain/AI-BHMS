import { useState, useEffect } from 'react';
import { merchApi } from '../api/client';

interface TransitionEffect {
  type: string;
  text: string;
}

interface TransitionOption {
  label: string;
  description?: string;
  effects?: TransitionEffect[];
  warnings?: string[];
}

interface TransitionInfo {
  current_status: string;
  transitions: Record<string, TransitionOption>;
}

const STATUS_LABELS: Record<string, string> = {
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

const EFFECT_ICON: Record<string, string> = {
  create: 'M12 6v6m0 0v6m0-6h6m-6 0H6',
  unlock: 'M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z',
  status: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  warn: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z',
};

const EFFECT_COLOR: Record<string, string> = {
  create: 'text-badge-emerald bg-emerald-500/10',
  unlock: 'text-blue-500 bg-blue-500/10',
  status: 'text-heading bg-surface-alt',
  info: 'text-muted bg-surface-alt',
  warn: 'text-badge-red bg-red-500/10',
};

interface StatusTransitionWizardProps {
  poId: string;
  currentStatus: string;
  onTransition: () => void;
  onClose: () => void;
}

export default function StatusTransitionWizard({ poId, currentStatus, onTransition, onClose }: StatusTransitionWizardProps) {
  const [info, setInfo] = useState<TransitionInfo | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [step, setStep] = useState<'select' | 'review' | 'confirm'>('select');

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const res = await merchApi.getPOTransitionInfo(poId);
        setInfo(res.data);
      } catch { /* ignore */ } finally { setLoading(false); }
    };
    fetchInfo();
  }, [poId]);

  const handleTransition = async () => {
    if (!selectedTarget) return;
    setTransitioning(true);
    try {
      await merchApi.transitionPO(poId, selectedTarget);
      onTransition();
    } catch { /* ignore */ } finally { setTransitioning(false); }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-md">
          <div className="animate-pulse space-y-3">
            <div className="h-5 bg-surface-alt rounded w-48" />
            <div className="h-4 bg-surface-alt rounded w-full" />
            <div className="h-4 bg-surface-alt rounded w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!info || Object.keys(info.transitions).length === 0) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-md text-center">
          <p className="text-muted text-sm">No transitions available for current status.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 text-sm text-body hover:text-heading">Close</button>
        </div>
      </div>
    );
  }

  const selected = selectedTarget ? info.transitions[selectedTarget] : null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-heading">Transition Status</h2>
            <p className="text-xs text-muted mt-0.5">Current: <span className="text-heading font-medium">{STATUS_LABELS[currentStatus]}</span></p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-surface-alt rounded-lg transition-colors">
            <svg className="w-5 h-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Step: Select Target */}
        {step === 'select' && (
          <div className="space-y-2">
            <p className="text-xs text-muted mb-3">Select next status:</p>
            {Object.entries(info.transitions).map(([key, t]) => (
              <button key={key} onClick={() => { setSelectedTarget(key); setStep('review'); }}
                className="w-full text-left p-3 rounded-xl border border-border hover:border-emerald-500/40 bg-surface-alt hover:bg-input transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                    <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-heading group-hover:text-emerald-400 transition-colors">{t.label}</span>
                    {t.description && <p className="text-xs text-muted mt-0.5">{t.description}</p>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step: Review Effects */}
        {step === 'review' && selected && (
          <div>
            {/* Status transition visual */}
            <div className="flex items-center justify-center gap-4 mb-5 py-4 bg-surface-alt rounded-xl">
              <div className="text-center">
                <span className="inline-block px-3 py-1.5 bg-surface rounded-lg border border-border text-sm font-medium text-heading">
                  {STATUS_LABELS[currentStatus]}
                </span>
              </div>
              <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <div className="text-center">
                <span className="inline-block px-3 py-1.5 bg-emerald-600/20 rounded-lg border border-emerald-500/30 text-sm font-medium text-badge-emerald">
                  {selected.label}
                </span>
              </div>
            </div>

            {/* Effects checklist */}
            {selected.effects && selected.effects.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-muted font-medium mb-2">What will happen:</p>
                <div className="space-y-1.5">
                  {selected.effects.map((effect, idx) => (
                    <div key={idx} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg ${EFFECT_COLOR[effect.type] || 'text-muted bg-surface-alt'}`}>
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={EFFECT_ICON[effect.type] || EFFECT_ICON.info} />
                      </svg>
                      <span className="text-xs">{effect.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {selected.warnings && selected.warnings.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-muted font-medium mb-2">Please note:</p>
                <div className="space-y-1.5">
                  {selected.warnings.map((w, idx) => (
                    <div key={idx} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
                      <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="text-xs text-amber-600 dark:text-amber-400">{w}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between mt-5">
              <button onClick={() => { setStep('select'); setSelectedTarget(null); }}
                className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">
                &larr; Back
              </button>
              <div className="flex gap-2">
                <button onClick={onClose}
                  className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">
                  Cancel
                </button>
                <button onClick={() => setStep('confirm')}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors">
                  Proceed &rarr;
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step: Final Confirm */}
        {step === 'confirm' && selected && (
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-500/10 mb-4">
              <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-heading font-bold mb-1">Confirm Transition</h3>
            <p className="text-sm text-muted mb-1">
              Change status from <span className="font-medium text-heading">{STATUS_LABELS[currentStatus]}</span> to{' '}
              <span className="font-medium text-badge-emerald">{selected.label}</span>?
            </p>
            {selected.effects && (
              <p className="text-xs text-faint mb-5">{selected.effects.length} effect{selected.effects.length !== 1 ? 's' : ''} will be applied</p>
            )}
            <div className="flex justify-center gap-3">
              <button onClick={() => setStep('review')}
                className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">
                &larr; Go Back
              </button>
              <button onClick={handleTransition} disabled={transitioning}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
                {transitioning ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Processing...
                  </>
                ) : `Confirm ${selected.label}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
