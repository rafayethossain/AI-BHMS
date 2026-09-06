import { useEffect, useState } from 'react';
import { merchApi, setupApi } from '../api/client';
import type { DesignSheet } from '../api/client';
import SearchableSelect from './SearchableSelect';

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
  const [form, setForm] = useState({
    block_reference: '',
    description: '',
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
    setForm({ block_reference: '', description: '' });
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
    });
  };

  const canSubmit =
    mode === 'fresh'
      ? !submitting
      : !!sourceId && !submitting;

  const submit = async () => {
    const payload: {
      mode: 'fresh' | 'copy';
      source_design_sheet?: string;
      product_type?: string;
      buyer?: string;
      block_reference: string;
      description: string;
      include_annotation: boolean;
      include_notes: boolean;
    } = {
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

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" data-testid="new-design-modal">
      <div className="bg-surface rounded-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
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
                  value={source?.style_type || source?.product_type_name || ''}
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

          <div>
            <label htmlFor="nd-block-reference" className="block text-sm text-body mb-1">
              Block Reference
            </label>
            <input
              id="nd-block-reference"
              value={form.block_reference}
              onChange={(e) => setForm({ ...form, block_reference: e.target.value })}
              className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label htmlFor="nd-description" className="block text-sm text-body mb-1">
              Description
            </label>
            <textarea
              id="nd-description"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
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