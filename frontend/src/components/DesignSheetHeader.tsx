import { useEffect, useState } from 'react';
import { merchApi, setupApi } from '../api/client';
import type { Buyer, DesignSheet } from '../api/client';
import { useToast } from '../contexts/ToastContext';
import {
  DESIGN_SHEET_STATUSES,
  STATUS_LABELS,
  RELATIONSHIP_OPTIONS,
} from './designSheetFields';

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-blue-500/20 text-badge-blue',
  rejected: 'bg-red-500/20 text-badge-red',
  closed: 'bg-surface-alt/50 text-muted',
  production: 'bg-amber-500/20 text-badge-amber',
  archived: 'bg-surface-alt/20 text-muted',
};

const DATE_FIELDS = new Set(['issue_date', 'risk_date', 'pattern_request_date']);
const TEXT_FIELDS = new Set([
  'block', 'based_on', 'relationship', 'designer',
  'pattern_cutter', 'issuer', 'cloth_code', 'size', 'length', 'design_note',
]);

const DATE_DISPLAY_FIELDS = {
  issue_date: 'Issue Date',
  risk_date: 'Risk Date',
  pattern_request_date: 'Pattern Request Date',
};

interface DesignInfoForm {
  block: string;
  based_on: string;
  relationship: string;
  buyer: string;
  designer: string;
  pattern_cutter: string;
  issuer: string;
  cloth_code: string;
  size: string;
  length: string;
  issue_date: string;
  risk_date: string;
  pattern_request_date: string;
  design_note: string;
}

function formFromSheet(sheet: DesignSheet): DesignInfoForm {
  return {
    block: sheet.block || '',
    based_on: sheet.based_on || '',
    relationship: sheet.relationship || '',
    buyer: sheet.buyer_id || '',
    designer: sheet.designer || '',
    pattern_cutter: sheet.pattern_cutter || '',
    issuer: sheet.issuer || '',
    cloth_code: sheet.cloth_code || '',
    size: sheet.size || '',
    length: sheet.length || '',
    issue_date: sheet.issue_date || '',
    risk_date: sheet.risk_date || '',
    pattern_request_date: sheet.pattern_request_date || '',
    design_note: sheet.note || '',
  };
}

interface DesignSheetHeaderProps {
  sheet: DesignSheet;
  onStatusChange?: (sheet: DesignSheet) => void;
}

export default function DesignSheetHeader({ sheet, onStatusChange }: DesignSheetHeaderProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<DesignInfoForm>(() => formFromSheet(sheet));
  const [buyers, setBuyers] = useState<Buyer[]>([]);

  useEffect(() => {
    let active = true;
    setupApi.getBuyers()
      .then((res) => {
        if (!active) return;
        setBuyers(res.data.results);
      })
      .catch(() => {
        /* buyers are optional cosmetics; the form stays usable without the list */
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setForm(formFromSheet(sheet));
  }, [sheet]);

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

  const handleUpdate = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(form)) {
        if (DATE_FIELDS.has(key)) {
          payload[key] = val || null;
        } else if (TEXT_FIELDS.has(key)) {
          payload[key] = val || '';
        }
      }
      if (form.buyer) {
        payload.buyer = form.buyer;
      }
      await merchApi.updateDesignSheetDesignInfo(sheet.id, payload);
      toast('success', 'Design information updated');
      const res = await merchApi.getDesignSheet(sheet.id);
      onStatusChange?.(res.data);
    } catch {
      toast('error', 'Failed to update design information');
    } finally {
      setSaving(false);
    }
  };

  const setField = (key: keyof DesignInfoForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const inputClass =
    'w-full px-3 py-2 bg-input border border-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50';

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

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-body">Design Information</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div>
          <label htmlFor="di-block" className="block text-xs text-muted mb-1">Block</label>
          <input id="di-block" value={form.block} onChange={(e) => setField('block', e.target.value)}
            placeholder="e.g. A-Block" className={inputClass} />
        </div>
        <div>
          <label htmlFor="di-based-on" className="block text-xs text-muted mb-1">Based On</label>
          <input id="di-based-on" value={form.based_on} disabled
            placeholder="Set via copy from source"
            className="w-full px-3 py-2 bg-surface-alt border border-input-border rounded-lg text-sm text-faint cursor-not-allowed" />
        </div>
        <div>
          <label htmlFor="di-relationship" className="block text-xs text-muted mb-1">Relationship</label>
          <select id="di-relationship" value={form.relationship} onChange={(e) => setField('relationship', e.target.value)}
            className={inputClass}>
            <option value="">—</option>
            {RELATIONSHIP_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="di-buyer" className="block text-xs text-muted mb-1">Buyer</label>
          <select id="di-buyer" value={form.buyer} onChange={(e) => setField('buyer', e.target.value)}
            className={inputClass}>
            <option value="">—</option>
            {[...new Map([...buyers, ...(form.buyer ? [{ id: form.buyer, name: form.buyer } as Buyer] : [])].map((b) => [b.id, b])).values()]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
          </select>
        </div>
        <div>
          <label htmlFor="di-designer" className="block text-xs text-muted mb-1">Designer</label>
          <input id="di-designer" value={form.designer} onChange={(e) => setField('designer', e.target.value)}
            placeholder="Designer name" className={inputClass} />
        </div>
        <div>
          <label htmlFor="di-pattern-cutter" className="block text-xs text-muted mb-1">Pattern Cutter</label>
          <input id="di-pattern-cutter" value={form.pattern_cutter} onChange={(e) => setField('pattern_cutter', e.target.value)}
            placeholder="Pattern cutter name" className={inputClass} />
        </div>
        <div>
          <label htmlFor="di-issuer" className="block text-xs text-muted mb-1">Issuer</label>
          <input id="di-issuer" value={form.issuer} onChange={(e) => setField('issuer', e.target.value)}
            placeholder="Issuer name" className={inputClass} />
        </div>
        <div>
          <label htmlFor="di-cloth-code" className="block text-xs text-muted mb-1">Cloth Code</label>
          <input id="di-cloth-code" value={form.cloth_code} onChange={(e) => setField('cloth_code', e.target.value)}
            placeholder="e.g. CC-001" className={inputClass} />
        </div>
        <div>
          <label htmlFor="di-size" className="block text-xs text-muted mb-1">Size</label>
          <input id="di-size" value={form.size} onChange={(e) => setField('size', e.target.value)}
            placeholder="e.g. S/M/L" className={inputClass} />
        </div>
        <div>
          <label htmlFor="di-length" className="block text-xs text-muted mb-1">Length</label>
          <input id="di-length" value={form.length} onChange={(e) => setField('length', e.target.value)}
            placeholder="e.g. 32 inches" className={inputClass} />
        </div>
        {(Object.keys(DATE_DISPLAY_FIELDS) as (keyof typeof DATE_DISPLAY_FIELDS)[]).map((key) => (
          <div key={key}>
            <label htmlFor={`di-${key}`} className="block text-xs text-muted mb-1">{DATE_DISPLAY_FIELDS[key]}</label>
            <input id={`di-${key}`} type="date" value={form[key]}
              onChange={(e) => setField(key, e.target.value)} className={inputClass} />
          </div>
        ))}
        <div className="md:col-span-2">
          <label htmlFor="di-design-note" className="block text-xs text-muted mb-1">Design Note</label>
          <textarea id="di-design-note" value={form.design_note} onChange={(e) => setField('design_note', e.target.value)} rows={3}
            placeholder="Additional design notes..." className={inputClass} />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 mt-5 border-t border-border pt-4">
        <button
          type="button"
          onClick={() => setForm(formFromSheet(sheet))}
          disabled={saving}
          className="px-4 py-2 text-sm text-muted hover:text-heading transition-colors disabled:opacity-50"
        >
          Discard
        </button>
        <button
          type="button"
          onClick={handleUpdate}
          disabled={saving}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {saving ? 'Updating...' : 'Update Design Information'}
        </button>
      </div>
    </div>
  );
}