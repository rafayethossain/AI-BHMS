import { useEffect, useState } from 'react';
import { merchApi, setupApi } from '../api/client';
import type { DesignSheet, InitDesignSheetData } from '../api/client';
import SearchableSelect from './SearchableSelect';

const DESIGN_INFO_KEYS = [
  'designer', 'pattern_cutter', 'issuer', 'cloth_code',
  'size', 'length', 'issue_date', 'risk_date',
  'pattern_request_date', 'design_note',
] as const;

const DESIGN_INFO_INITIAL: Record<string, string> = {
  designer: '',
  pattern_cutter: '',
  issuer: '',
  cloth_code: '',
  size: '',
  length: '',
  issue_date: '',
  risk_date: '',
  pattern_request_date: '',
  design_note: '',
};

interface NewDesignModalProps {
  items: DesignSheet[];
  onClose: () => void;
  onCreated: (id: string) => void;
}

function styleCodeLabel(o: DesignSheet): string {
  return o.style_code || o.style_number || o.file_number || 'Unnamed design';
}

export default function NewDesignModal({ items, onClose, onCreated }: NewDesignModalProps) {
  const [mode, setMode] = useState<'fresh' | 'copy'>('fresh');
  const [sourceId, setSourceId] = useState('');
  const [productTypeId, setProductTypeId] = useState<string | null>(null);
  const [buyerId, setBuyerId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({
    block_reference: '',
    description: '',
    ...DESIGN_INFO_INITIAL,
  });
  const [includeAnnotation, setIncludeAnnotation] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [productTypes, setProductTypes] = useState<{ id: string; name: string; code: string }[]>([]);
  const [buyers, setBuyers] = useState<{ id: string; name: string; code: string }[]>([]);

  useEffect(() => {
    setupApi.getTypes().then((res) => setProductTypes(res.data.results));
    setupApi.getBuyers().then((res) => setBuyers(res.data.results));
  }, []);

  const source = items.find((o) => o.id === sourceId) ?? null;

  const reset = () => {
    setMode('fresh');
    setSourceId('');
    setProductTypeId(null);
    setBuyerId(null);
    setForm({ block_reference: '', description: '', ...DESIGN_INFO_INITIAL });
    setIncludeAnnotation(false);
    setIncludeNotes(false);
    setSubmitting(false);
  };

  useEffect(() => {
    reset();
  }, []);

  const switchMode = (next: 'fresh' | 'copy') => {
    setMode(next);
    setSourceId('');
    setProductTypeId(next === 'copy' && source ? source.product_type_id ?? null : null);
    setBuyerId(null);
  };

  const pickSource = (id: string) => {
    setSourceId(id);
    const src = items.find((o) => o.id === id);
    setBuyerId(null);
    setForm({
      block_reference: src?.block ?? '',
      description: src?.description ?? '',
      designer: src?.designer ?? '',
      pattern_cutter: src?.pattern_cutter ?? '',
      issuer: src?.issuer ?? '',
      cloth_code: src?.cloth_code ?? '',
      size: src?.size ?? '',
      length: src?.length ?? '',
      issue_date: src?.issue_date ?? '',
      risk_date: src?.risk_date ?? '',
      pattern_request_date: src?.pattern_request_date ?? '',
      design_note: src?.note ?? '',
    });
  };

  const canSubmit =
    mode === 'fresh'
      ? !submitting
      : !!sourceId && !submitting;

  const submit = async () => {
    const payload: InitDesignSheetData = {
      mode,
      block_reference: form.block_reference,
      description: form.description,
      include_annotation: includeAnnotation,
      include_notes: includeNotes,
    };
    if (mode === 'copy') {
      payload.source_design_sheet = sourceId;
    } else if (productTypeId) {
      payload.product_type = productTypeId;
    }
    if (buyerId) {
      payload.buyer = buyerId;
    }
    for (const key of DESIGN_INFO_KEYS) {
      const value = form[key];
      if (value) {
        payload[key] = value;
      }
    }
    setSubmitting(true);
    try {
      const res = await merchApi.initDesignSheet(payload);
      onCreated(res.data.id);
    } finally {
      setSubmitting(false);
    }
  };

  const productTypeOptions = productTypes.map((t) => ({
    value: t.id,
    label: t.name,
    description: t.code ? `Code ${t.code}` : undefined,
  }));
  const buyerOptions = buyers.map((b) => ({
    value: b.id,
    label: b.name,
    description: b.code ? `Code ${b.code}` : undefined,
  }));
  const sourceOptions = items.map((o) => ({
    value: o.id,
    label: styleCodeLabel(o),
    description: o.style_name ? `${o.style_name}` : o.file_number,
  }));

  const readOnlyClass = 'w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading disabled:opacity-70';
  const inputClass = 'w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" data-testid="new-design-modal">
      <div className="bg-surface rounded-xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold">New Design</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted hover:text-heading text-xl leading-none transition-colors"
          >
            ×
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-1 p-1 bg-input rounded-lg">
            <button
              type="button"
              onClick={() => switchMode('fresh')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'fresh'
                  ? 'bg-surface text-heading shadow-sm'
                  : 'text-muted hover:text-body'
              }`}
            >
              Fresh Design
            </button>
            <button
              type="button"
              onClick={() => switchMode('copy')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'copy'
                  ? 'bg-surface text-heading shadow-sm'
                  : 'text-muted hover:text-body'
              }`}
            >
              Copy From Existing
            </button>
          </div>

          {mode === 'copy' && (
            <div>
              <label className="block text-sm text-body">
                <span className="block mb-1">Copy From Existing Design</span>
                <SearchableSelect
                  options={sourceOptions}
                  value={sourceId}
                  onChange={(value) => pickSource(String(value))}
                  placeholder="Search by style code..."
                  required
                />
              </label>
            </div>
          )}

          <div>
            <label className="block text-sm text-body">
              <span className="block mb-1">Garments Type</span>
              {mode === 'copy' ? (
                <input
                  id="nd-garments-type"
                  value={source?.product_type_name || ''}
                  disabled
                  className={readOnlyClass}
                />
              ) : (
                <SearchableSelect
                  options={productTypeOptions}
                  value={productTypeId}
                  onChange={(value) => setProductTypeId(value ? String(value) : null)}
                  placeholder="Select garments type..."
                />
              )}
            </label>
          </div>

          {mode === 'copy' && (
            <div>
              <label htmlFor="nd-style-reference" className="block text-sm text-body mb-1">
                Style Reference
              </label>
              <input
                id="nd-style-reference"
                value={source?.style_number || ''}
                disabled
                className={readOnlyClass}
              />
            </div>
          )}

          {mode === 'copy' && (
            <div>
              <label htmlFor="nd-relationship" className="block text-sm text-body mb-1">
                Relationship
              </label>
              <input
                id="nd-relationship"
                value={source ? 'Based on' : ''}
                disabled
                className={readOnlyClass}
              />
            </div>
          )}

          <div>
            <label htmlFor="nd-style-code" className="block text-sm text-body mb-1">
              Style Code
            </label>
            <input
              id="nd-style-code"
              value="Auto-generated on create"
              disabled
              className={readOnlyClass}
            />
          </div>

          <div>
            <label className="block text-sm text-body">
              <span className="block mb-1">Buyer</span>
              <SearchableSelect
                options={buyerOptions}
                value={buyerId}
                onChange={(value) => setBuyerId(value ? String(value) : null)}
                placeholder="Select buyer..."
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="nd-block-reference" className="block text-sm text-body mb-1">
                Block Reference
              </label>
              <input
                id="nd-block-reference"
                value={form.block_reference}
                onChange={(e) => setForm({ ...form, block_reference: e.target.value })}
                placeholder="e.g. A-Block"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="nd-designer" className="block text-sm text-body mb-1">
                Designer
              </label>
              <input
                id="nd-designer"
                value={form.designer}
                onChange={(e) => setForm({ ...form, designer: e.target.value })}
                placeholder="Designer name"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="nd-pattern-cutter" className="block text-sm text-body mb-1">
                Pattern Cutter
              </label>
              <input
                id="nd-pattern-cutter"
                value={form.pattern_cutter}
                onChange={(e) => setForm({ ...form, pattern_cutter: e.target.value })}
                placeholder="Pattern cutter name"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="nd-issuer" className="block text-sm text-body mb-1">
                Issuer
              </label>
              <input
                id="nd-issuer"
                value={form.issuer}
                onChange={(e) => setForm({ ...form, issuer: e.target.value })}
                placeholder="Issuer name"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="nd-cloth-code" className="block text-sm text-body mb-1">
                Cloth Code
              </label>
              <input
                id="nd-cloth-code"
                value={form.cloth_code}
                onChange={(e) => setForm({ ...form, cloth_code: e.target.value })}
                placeholder="e.g. CC-001"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="nd-size" className="block text-sm text-body mb-1">
                Size
              </label>
              <input
                id="nd-size"
                value={form.size}
                onChange={(e) => setForm({ ...form, size: e.target.value })}
                placeholder="e.g. S/M/L"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="nd-length" className="block text-sm text-body mb-1">
                Length
              </label>
              <input
                id="nd-length"
                value={form.length}
                onChange={(e) => setForm({ ...form, length: e.target.value })}
                placeholder="e.g. 32 inches"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="nd-issue-date" className="block text-sm text-body mb-1">
                Issue Date
              </label>
              <input
                id="nd-issue-date"
                type="date"
                value={form.issue_date}
                onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="nd-risk-date" className="block text-sm text-body mb-1">
                Risk Date
              </label>
              <input
                id="nd-risk-date"
                type="date"
                value={form.risk_date}
                onChange={(e) => setForm({ ...form, risk_date: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="nd-pattern-request-date" className="block text-sm text-body mb-1">
                Pattern Request Date
              </label>
              <input
                id="nd-pattern-request-date"
                type="date"
                value={form.pattern_request_date}
                onChange={(e) => setForm({ ...form, pattern_request_date: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="col-span-2">
              <label htmlFor="nd-design-note" className="block text-sm text-body mb-1">
                Design Note
              </label>
              <textarea
                id="nd-design-note"
                rows={2}
                value={form.design_note}
                onChange={(e) => setForm({ ...form, design_note: e.target.value })}
                placeholder="Additional design notes..."
                className={inputClass}
              />
            </div>
            <div className="col-span-2">
              <label htmlFor="nd-description" className="block text-sm text-body mb-1">
                Description
              </label>
              <textarea
                id="nd-description"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          {mode === 'copy' && (
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm text-body">
                <input
                  type="checkbox"
                  checked={includeAnnotation}
                  onChange={(e) => setIncludeAnnotation(e.currentTarget.checked)}
                />
                Include Annotation
              </label>
              <label className="flex items-center gap-2 text-sm text-body">
                <input
                  type="checkbox"
                  checked={includeNotes}
                  onChange={(e) => setIncludeNotes(e.currentTarget.checked)}
                />
                Include Notes
              </label>
            </div>
          )}
        </div>
        <div className="p-6 border-t border-border flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-body hover:text-heading transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Design'}
          </button>
        </div>
      </div>
    </div>
  );
}