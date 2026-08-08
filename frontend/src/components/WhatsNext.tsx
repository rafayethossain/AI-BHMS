import { useMemo } from 'react';

interface JourneyStep {
  key: string;
  label: string;
  status: string;
  id: string | null;
  code: string | null;
}

interface WhatsNextProps {
  steps: JourneyStep[];
  currentStep?: string;
}

interface Suggestion {
  action: string;
  target: string;
  route: string;
  type: 'primary' | 'secondary' | 'warning';
}

function buildSuggestions(steps: JourneyStep[]): Suggestion[] {
  const stepMap = Object.fromEntries(steps.map(s => [s.key, s]));
  const suggestions: Suggestion[] = [];

  const styleStatus = stepMap.style?.status || 'not_started';
  const foStatus = stepMap.file_opening?.status || 'not_started';
  const poStatus = stepMap.purchase_order?.status || 'not_started';
  const bomStatus = stepMap.bom?.status || 'not_started';
  const costingStatus = stepMap.costing?.status || 'not_started';
  const taStatus = stepMap.ta?.status || 'not_started';
  const prodStatus = stepMap.production?.status || 'not_started';
  const qualityStatus = stepMap.quality?.status || 'not_started';
  const logisticsStatus = stepMap.logistics?.status || 'not_started';
  const commStatus = stepMap.commercial?.status || 'not_started';

  // Style suggestions
  if (styleStatus === 'not_started') {
    suggestions.push({ action: 'Create a new Style', target: 'Styles', route: '/styles', type: 'primary' });
  } else if (foStatus === 'not_started' && styleStatus !== 'draft') {
    suggestions.push({ action: 'Open a File for this Style', target: 'File Openings', route: '/file-openings', type: 'primary' });
  }

  // PO suggestions
  if (foStatus !== 'not_started' && poStatus === 'not_started') {
    suggestions.push({ action: 'Create a Purchase Order', target: 'Purchase Orders', route: '/purchase-orders', type: 'primary' });
  } else if (poStatus === 'draft') {
    suggestions.push({ action: 'Confirm the PO to unlock T&A and production', target: '', route: '', type: 'warning' });
  }

  // BOM / Costing suggestions
  if (poStatus === 'confirmed' || poStatus === 'open') {
    if (bomStatus === 'not_started') {
      suggestions.push({ action: 'Create a BOM for this style', target: 'BOMs', route: '/boms', type: 'primary' });
    } else if (costingStatus === 'not_started') {
      suggestions.push({ action: 'Generate Costing from BOM', target: 'Costings', route: '/costings', type: 'primary' });
    } else if (costingStatus === 'draft' || costingStatus === 'pending') {
      suggestions.push({ action: 'Approve the Costing', target: '', route: '', type: 'warning' });
    }
  }

  // T&A suggestions
  if (taStatus === 'not_started' && (poStatus === 'confirmed' || poStatus === 'open')) {
    suggestions.push({ action: 'Set up T&A milestones', target: 'T&A', route: '/tas', type: 'primary' });
  } else if (taStatus === 'active') {
    const taStep = stepMap.ta;
    if (taStep && 'milestones_completed' in taStep && 'milestones_total' in taStep) {
      const completed = (taStep as Record<string, unknown>).milestones_completed as number;
      const total = (taStep as Record<string, unknown>).milestones_total as number;
      if (total > 0 && completed < total) {
        suggestions.push({ action: `Update T&A progress (${completed}/${total} done)`, target: 'T&A', route: '/tas', type: 'secondary' });
      }
    }
  }

  // Production suggestions
  if (poStatus === 'confirmed' && prodStatus === 'not_started') {
    suggestions.push({ action: 'Create a Production Plan', target: 'Production', route: '/production', type: 'primary' });
  } else if (prodStatus === 'in_progress') {
    suggestions.push({ action: 'Log daily production output', target: 'Factory Portal', route: '/production/portal', type: 'secondary' });
  }

  // Quality suggestions
  if (prodStatus === 'in_progress' && qualityStatus === 'not_started') {
    suggestions.push({ action: 'Schedule a quality inspection', target: 'Inspections', route: '/quality', type: 'primary' });
  }

  // Commercial suggestions
  if (commStatus === 'not_started' && (poStatus === 'confirmed' || poStatus === 'open')) {
    suggestions.push({ action: 'Create Proforma Invoice', target: 'PIs', route: '/pis', type: 'primary' });
  }

  // Logistics suggestions
  if ((poStatus === 'ready' || qualityStatus === 'passed') && logisticsStatus === 'not_started') {
    suggestions.push({ action: 'Book a shipment', target: 'Shipments', route: '/logistics', type: 'primary' });
  } else if (logisticsStatus === 'booked') {
    suggestions.push({ action: 'Upload shipping documents', target: 'Shipments', route: '/logistics', type: 'secondary' });
  }

  // Warnings
  const warnings: string[] = [];
  if (taStatus === 'active') {
    const taStep = stepMap.ta;
    if (taStep && 'milestones_total' in taStep) {
      const total = (taStep as Record<string, unknown>).milestones_total as number;
      const completed = (taStep as Record<string, unknown>).milestones_completed as number;
      if (total > 0 && completed < total * 0.5) {
        warnings.push('T&A is less than 50% complete — review milestone progress');
      }
    }
  }
  if (qualityStatus === 'failed') {
    warnings.push('Quality inspection failed — review corrective actions');
  }

  // Add warnings as suggestions
  warnings.forEach(w => {
    suggestions.push({ action: w, target: '', route: '', type: 'warning' });
  });

  return suggestions.slice(0, 5); // Max 5 suggestions
}

export default function WhatsNext({ steps }: WhatsNextProps) {
  const suggestions = useMemo(() => buildSuggestions(steps), [steps]);

  if (suggestions.length === 0) {
    return (
      <div className="bg-surface rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-badge-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <h3 className="text-sm font-medium text-heading">All Caught Up</h3>
        </div>
        <p className="text-xs text-muted">All steps for this order are on track.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-xl border border-border p-5">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        <h3 className="text-sm font-medium text-heading">What&apos;s Next</h3>
      </div>
      <div className="space-y-2">
        {suggestions.map((s, idx) => (
          <div key={idx} className={`flex items-start gap-2 p-2.5 rounded-lg ${
            s.type === 'primary' ? 'bg-emerald-500/5 border border-emerald-500/20' :
            s.type === 'warning' ? 'bg-amber-500/5 border border-amber-500/20' :
            'bg-surface-alt border border-border'
          }`}>
            <span className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              s.type === 'primary' ? 'bg-emerald-500' :
              s.type === 'warning' ? 'bg-amber-500' :
              'bg-blue-500'
            }`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-heading leading-relaxed">{s.action}</p>
              {s.target && <p className="text-[10px] text-muted mt-0.5">{s.target}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
