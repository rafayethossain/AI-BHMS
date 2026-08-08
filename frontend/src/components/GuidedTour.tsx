import { useState, useEffect, useRef } from 'react';

interface TourStep {
  title: string;
  description: string;
  icon: string;
}

const TOUR_KEY = 'bhms-tour-completed';
const TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to BHMS',
    description: 'Your command center for managing the entire garment buying house workflow. Let\'s take a quick tour.',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  },
  {
    title: 'Dashboard',
    description: 'See your tasks, pipeline status, financials, and alerts at a glance. Click any card to drill down.',
    icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
  },
  {
    title: 'The Order Lifecycle',
    description: 'Style → File Opening → PO → BOM/Costing → Production → Quality → Shipment. Each step feeds the next.',
    icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
  },
  {
    title: 'Getting Started',
    description: 'Start by creating a Style, then open a File for a buyer, create a Purchase Order, and watch the journey unfold.',
    icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6',
  },
  {
    title: 'Need Help?',
    description: 'Click the ? icon in the navigation bar for the Help Center with guides, glossary, and FAQ.',
    icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
];

export default function GuidedTour() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const completed = localStorage.getItem(TOUR_KEY);
    if (!completed) {
      const timer = setTimeout(() => setShow(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const complete = () => {
    localStorage.setItem(TOUR_KEY, 'true');
    setShow(false);
  };

  const skip = () => {
    localStorage.setItem(TOUR_KEY, 'true');
    setShow(false);
  };

  if (!show) return null;

  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) skip(); }}
    >
      <div className="bg-surface rounded-2xl border border-border shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 pt-5">
          {TOUR_STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`w-2 h-2 rounded-full transition-all ${i === step ? 'bg-emerald-500 w-5' : i < step ? 'bg-emerald-500/40' : 'bg-faint/30'}`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={current.icon} />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-heading mb-2">{current.title}</h3>
          <p className="text-sm text-muted leading-relaxed">{current.description}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-6 pb-5">
          <button
            onClick={skip}
            className="text-xs text-faint hover:text-muted transition-colors"
          >
            Skip tour
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 text-xs text-body hover:text-heading border border-border rounded-lg transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={isLast ? complete : () => setStep(step + 1)}
              className="px-5 py-2 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
            >
              {isLast ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function resetTour() {
  localStorage.removeItem(TOUR_KEY);
}
