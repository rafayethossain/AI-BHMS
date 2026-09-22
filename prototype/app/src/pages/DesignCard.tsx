import type { FormEvent } from 'react';
import StatusPill from '../components/StatusPill';
import type { DesignRegisterRow } from '../mock/types';

interface DesignCardProps {
  design: DesignRegisterRow;
  onView: () => void;
}

export default function DesignCard({ design, onView }: DesignCardProps) {
  return (
    <article
      data-testid="design-card"
      onClick={onView}
      className="bg-surface rounded-xl border border-border overflow-hidden hover:border-emerald-500/40 transition-all cursor-pointer group"
    >
      {design.sketch_url ? (
        <div className="h-40 bg-surface-alt overflow-hidden">
          <img
            src={design.sketch_url}
            alt={`${design.design_code} sketch`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      ) : (
        <div
          data-testid="sketch-placeholder"
          className="h-40 flex items-center justify-center bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-surface-alt select-none"
        >
          <span className="font-mono text-lg text-heading/60">{design.design_code}</span>
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-emerald-600">{design.design_code}</span>
              <StatusPill value={design.status} />
            </div>
            <p className="text-sm font-medium text-heading mt-1 truncate">{design.buyer}</p>
            <p className="text-xs text-muted mt-0.5 truncate">
              {design.category}
              {design.style_type ? ` · ${design.style_type}` : ''}
            </p>
          </div>
          <span className="text-xs text-faint flex-shrink-0">{design.created_at}</span>
        </div>
        <div className="mt-3 pt-3 flex items-center justify-between gap-4 border-t border-border/60">
          <div className="flex gap-4">
            <div>
              <p className="text-xs text-faint">Live</p>
              <p className="text-sm font-medium text-heading">{design.live_po_count}</p>
            </div>
            <div>
              <p className="text-xs text-faint">Completed</p>
              <p className="text-sm font-medium text-heading">{design.completed_po_count}</p>
            </div>
            <div>
              <p className="text-xs text-faint">Materials</p>
              <p className="text-sm font-medium text-heading">{design.materials.length}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={(e: FormEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              onView();
            }}
            className="px-3 py-1 text-xs font-medium rounded-lg bg-surface-alt text-body hover:bg-surface-hover transition-colors"
          >
            View
          </button>
        </div>
      </div>
    </article>
  );
}