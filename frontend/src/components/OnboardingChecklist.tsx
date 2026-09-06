import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { helpApi } from '../api/client';
import type { OnboardingChecklistItem } from '../api/client';

const CHECKLIST_ITEMS = [
  { key: 'created_style', label: 'Create a Style', description: 'Define your first garment style with number, name, and buyer', path: '/styles' },
  { key: 'opened_file', label: 'Open a File', description: 'Start a production workflow with a file opening', path: '/file-openings' },
  { key: 'created_po', label: 'Create a Purchase Order', description: 'Raise a PO from an open file to kick off the order', path: '/purchase-orders' },
  { key: 'added_fabric_booking', label: 'Add a Fabric Booking', description: 'Book fabric for a PO through the sourcing workflow', path: '/fabric/bookings' },
  { key: 'created_ta', label: 'View Time & Action', description: 'Check the T&A plan auto-generated for your PO', path: '/tas' },
  { key: 'ran_costing', label: 'Run a Costing', description: 'Build a costing from the BOM to estimate margin', path: '/costings' },
  { key: 'added_shipment_docs', label: 'Add Shipment Documents', description: 'Prepare packing list, invoice, and shipping documents', path: '/logistics' },
  { key: 'reviewed_dashboard', label: 'Review the Dashboard', description: 'Check your tasks, pipeline, and alerts at a glance', path: '/dashboard' },
] as const;

export default function OnboardingChecklist() {
  const navigate = useNavigate();
  const [items, setItems] = useState<OnboardingChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    try {
      const resp = await helpApi.getOnboardingItems();
      setItems(resp.data.results);
    } catch {
      // Silently handle — checklist is non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const completedKeys = new Set(items.filter(i => i.completed).map(i => i.item_key));
  const completedCount = CHECKLIST_ITEMS.filter(item => completedKeys.has(item.key)).length;
  const totalCount = CHECKLIST_ITEMS.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleToggle = async (itemKey: string, isCompleted: boolean) => {
    const existing = items.find(i => i.item_key === itemKey);
    try {
      if (existing) {
        if (isCompleted) {
          const resp = await helpApi.incompleteOnboardingItem(existing.id);
          setItems(prev => prev.map(i => (i.id === resp.data.id ? resp.data : i)));
        } else {
          const resp = await helpApi.completeOnboardingItem(existing.id);
          setItems(prev => prev.map(i => (i.id === resp.data.id ? resp.data : i)));
        }
      } else {
        const resp = await helpApi.createOnboardingItem(itemKey);
        if (!isCompleted) {
          const completeResp = await helpApi.completeOnboardingItem(resp.data.id);
          setItems(prev => [...prev, completeResp.data]);
        } else {
          setItems(prev => [...prev, resp.data]);
        }
      }
    } catch {
      // Non-critical
    }
  };

  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-border p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-surface-alt rounded w-1/3" />
          <div className="h-3 bg-surface-alt rounded w-2/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-heading">Getting Started Checklist</h3>
          <p className="text-xs text-muted mt-0.5">{completedCount} of {totalCount} completed</p>
        </div>
        <span className="text-xs font-bold text-emerald-400">{pct}%</span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-surface-alt rounded-full mb-5 overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="space-y-2">
        {CHECKLIST_ITEMS.map((item) => {
          const done = completedKeys.has(item.key);
          return (
            <div
              key={item.key}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                done
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-border hover:border-emerald-500/20'
              }`}
            >
              <button
                onClick={() => handleToggle(item.key, done)}
                className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                  done
                    ? 'bg-emerald-500 border-emerald-500'
                    : 'border-faint hover:border-emerald-400'
                }`}
              >
                {done && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium ${done ? 'text-emerald-400 line-through' : 'text-heading'}`}>
                  {item.label}
                </p>
                <p className="text-[11px] text-faint mt-0.5">{item.description}</p>
              </div>
              <button
                onClick={() => navigate(item.path)}
                className="flex-shrink-0 text-[11px] text-emerald-400 hover:text-emerald-300 font-medium"
              >
                Go →
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
