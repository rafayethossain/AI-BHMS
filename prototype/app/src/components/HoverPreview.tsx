import { useState } from 'react';
import type { ReactNode } from 'react';

export interface HoverPreviewField {
  label: string;
  value: string;
}

export interface HoverPreviewProps {
  children: ReactNode;
  fields: HoverPreviewField[];
  title?: string;
  className?: string;
}

export default function HoverPreview({
  children,
  fields,
  title,
  className = '',
}: HoverPreviewProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <div
          data-testid="hover-preview"
          role="tooltip"
          className="absolute left-0 top-full z-30 mt-1.5 w-64 p-3 rounded-lg border border-input-border bg-surface shadow-xl text-left"
        >
          {title && (
            <div className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">
              {title}
            </div>
          )}
          {fields.map((f) => (
            <div key={f.label} className="flex items-baseline justify-between gap-3 py-0.5">
              <span className="text-xs text-muted">{f.label}</span>
              <span className="text-sm font-medium text-heading text-right">{f.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}