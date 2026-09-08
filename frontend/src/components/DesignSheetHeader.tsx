import { useState } from 'react';
import { merchApi } from '../api/client';
import type { DesignSheet } from '../api/client';
import { useToast } from '../contexts/ToastContext';
import { DESIGN_SHEET_STATUSES, STATUS_LABELS, DESIGN_INFO_FIELDS } from './designSheetFields';

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-blue-500/20 text-badge-blue',
  rejected: 'bg-red-500/20 text-badge-red',
  closed: 'bg-surface-alt/50 text-muted',
  production: 'bg-amber-500/20 text-badge-amber',
  archived: 'bg-surface-alt/20 text-muted',
};

interface DesignSheetHeaderProps {
  sheet: DesignSheet;
  onStatusChange?: (sheet: DesignSheet) => void;
}

export default function DesignSheetHeader({ sheet, onStatusChange }: DesignSheetHeaderProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === sheet.status || saving) return;
    setSaving(true);
    try {
      const res = await merchApi.transitionDesignSheet(sheet.id, newStatus);
      toast('success', res.data.message);
      onStatusChange?.({ ...sheet, status: newStatus });
    } catch {
      toast('error', 'Failed to update design sheet status');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-surface rounded-xl border border-border p-6">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold">Design Sheet</h1>
          <p className="text-muted text-sm mt-1">
            <span className="font-mono text-emerald-400">{sheet.file_number}</span>
            <span className="mx-2 text-faint">·</span>
            <span>
              Style <span className="font-mono text-heading">{sheet.style_code}</span>
            </span>
            <span className="mx-2 text-faint">·</span>
            <span>{sheet.buyer_name}</span>
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[sheet.status] || 'bg-surface-alt/20 text-muted'}`}>
            {STATUS_LABELS[sheet.status] || sheet.status}
          </span>
          <label className="flex items-center gap-2 text-sm text-muted">
            <span>Status</span>
            <select
              aria-label="Status"
              value={sheet.status}
              disabled={saving}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="px-2 py-1 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
            >
              {DESIGN_SHEET_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s] || s}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <h2 className="text-sm font-semibold text-body mb-3">Design Information</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {DESIGN_INFO_FIELDS.map(({ key, label }) => {
          const value = sheet[key];
          return (
            <div key={key} className="bg-surface-alt/40 rounded-lg px-3 py-2">
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="text-sm text-heading truncate" title={value ? String(value) : ''}>
                {value ? String(value) : '—'}
              </dd>
            </div>
          );
        })}
      </div>
    </div>
  );
}