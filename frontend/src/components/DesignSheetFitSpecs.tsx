import { useState } from 'react';
import type { FitSpecification } from '../api/client';

export type FitSpecFormData = {
  fit_number: string;
  fit_date: string;
  description: string;
  notes: string;
} & Record<string, unknown>;

const FIT_LABELS = ['DEV SPEC', '1ST FIT', '2ND FIT', '3RD FIT', '4TH FIT'];
const CHECK = '\u2713';

export interface FitCopySourceOption {
  id: string;
  file_number: string;
  style_code: string;
}

interface DesignSheetFitSpecsProps {
  fitSpecs: FitSpecification[];
  onCreateFitSpec?: (data: FitSpecFormData) => void;
  onSelectFitSpec?: (id: string) => void;
  onAddFitImage?: (fitSpecId: string, file: File) => void;
  onDeleteFitImage?: (imageId: string) => void;
  onReorderFitImage?: (imageId: string, newOrder: number) => void;
  onCopyFromBase?: (opts?: { include_annotations: boolean }) => void;
  onCopyFromOtherStyle?: (sourceSheetId: string) => void;
  onUpdateFitSpec?: (id: string, data: Record<string, unknown>) => void;
  otherSheets?: FitCopySourceOption[];
}

export default function DesignSheetFitSpecs({
  fitSpecs,
  onCreateFitSpec,
  onSelectFitSpec,
  onAddFitImage,
  onDeleteFitImage,
  onReorderFitImage,
  onCopyFromBase,
  onCopyFromOtherStyle,
  onUpdateFitSpec,
  otherSheets = [],
}: DesignSheetFitSpecsProps) {
  const [showForm, setShowForm] = useState(false);
  const [showCopyPicker, setShowCopyPicker] = useState(false);
  const [showBaseCopyConfirm, setShowBaseCopyConfirm] = useState(false);
  const [includeAnnotations, setIncludeAnnotations] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState<string | null>(null);
  const [fitDate, setFitDate] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  const nextLabel = FIT_LABELS[fitSpecs.length] ?? `FIT ${fitSpecs.length + 1}`;
  const selectedSpec = fitSpecs.find((fs) => fs.is_selected);
  const selectedImages = selectedSpec
    ? [...selectedSpec.images].sort((a, b) => a.order - b.order)
    : [];

  const submit = () => {
    onCreateFitSpec?.({ fit_number: nextLabel, fit_date: fitDate, description, notes });
    setFitDate('');
    setDescription('');
    setNotes('');
    setShowForm(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedSpec) {
      onAddFitImage?.(selectedSpec.id, file);
      e.target.value = '';
    }
  };

  const moveImage = (imageId: string, currentOrder: number, delta: number) => {
    onReorderFitImage?.(imageId, Math.max(0, Math.min(selectedImages.length - 1, currentOrder + delta)));
  };

  return (
    <section className="bg-surface rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold">Fit Specs</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCopyPicker((v) => !v)}
            className="px-3 py-1.5 rounded-lg bg-surface-alt text-muted text-sm font-medium border border-border hover:border-emerald-500/40"
          >
            Copy from Another Style
          </button>
          <button
            type="button"
            onClick={() => setShowBaseCopyConfirm((v) => !v)}
            className="px-3 py-1.5 rounded-lg bg-surface-alt text-muted text-sm font-medium border border-border hover:border-emerald-500/40"
          >
            Copy from Base
          </button>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="px-3 py-1.5 rounded-lg bg-heading text-background text-sm font-medium hover:opacity-90"
          >
            {showForm ? 'Cancel' : '+ New Fit Spec'}
          </button>
        </div>
      </div>

      {showCopyPicker && (
        <div className="mb-4 rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold text-heading mb-2">Copy from another design sheet</h3>
          {otherSheets.length === 0 ? (
            <p className="text-muted text-sm">No other design sheets available.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {otherSheets.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    onCopyFromOtherStyle?.(s.id);
                    setShowCopyPicker(false);
                  }}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-surface-alt text-heading border border-border hover:border-emerald-500/40"
                >
                  {s.file_number} - {s.style_code}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {showBaseCopyConfirm && (
        <div className="mb-4 rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold text-heading mb-2">Copy fit specs from base</h3>
          <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
            <input
              type="checkbox"
              data-testid="copy-include-annotations"
              checked={includeAnnotations}
              onChange={(e) => setIncludeAnnotations(e.target.checked)}
            />
            Include sketch annotations
          </label>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => {
                onCopyFromBase?.({ include_annotations: includeAnnotations });
                setShowBaseCopyConfirm(false);
                setIncludeAnnotations(false);
              }}
              className="px-3 py-1.5 rounded-lg bg-heading text-background text-sm font-medium hover:opacity-90"
            >
              Confirm Base Copy
            </button>
          </div>
        </div>
      )}

      {fitSpecs.length === 0 ? (
        <p className="text-muted text-sm">No fit specs yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2 mb-4">
          {fitSpecs.map((fs) => {
            const selected = Boolean(fs.is_selected);
            return (
              <button
                key={fs.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onSelectFitSpec?.(fs.id)}
                className={
                  selected
                    ? 'px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-500/20 text-badge-emerald border border-emerald-500/40'
                    : 'px-4 py-2 rounded-lg text-sm font-medium bg-surface-alt text-muted border border-border hover:border-emerald-500/40'
                }
              >
                {fs.fit_number}
                {selected && (
                  <span className="ml-1.5" aria-label="selected">
                    {CHECK}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {selectedSpec && (
        <div className="mb-4 rounded-lg border border-border p-4">
          <div className="mb-3 flex items-end gap-2">
            <label className="block flex-1 text-sm">
              Fit Description
              <input
                type="text"
                key={selectedSpec.id}
                value={descriptionDraft === null ? selectedSpec.description : descriptionDraft}
                onChange={(e) => setDescriptionDraft(e.target.value)}
                aria-label="Fit Description"
                className="mt-1 w-full rounded-md border border-border bg-input px-3 py-1.5 text-sm text-heading focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                if (descriptionDraft === null || descriptionDraft === '') return;
                onUpdateFitSpec?.(selectedSpec.id, { description: descriptionDraft });
                setDescriptionDraft(null);
              }}
              className="px-3 py-1.5 rounded-lg bg-heading text-background text-sm font-medium hover:opacity-90"
            >
              Save Description
            </button>
          </div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-heading">Photos</h3>
            <label className="px-3 py-1.5 rounded-lg bg-surface-alt text-muted text-sm font-medium border border-border hover:border-emerald-500/40 cursor-pointer">
              + Add Photo
              <input
                type="file"
                accept="image/*"
                data-testid="fit-image-upload"
                className="hidden"
                onChange={handleImageUpload}
              />
            </label>
          </div>
          {selectedImages.length === 0 ? (
            <p className="text-muted text-sm">No photos yet.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {selectedImages.map((img) => {
                const name = img.caption || 'photo';
                return (
                  <figure key={img.id} className="group relative">
                    <img
                      src={img.image}
                      alt={name}
                      className="h-24 w-full object-cover rounded-lg border border-border"
                    />
                    {img.caption && (
                      <figcaption className="mt-1 text-xs text-muted truncate">{img.caption}</figcaption>
                    )}
                    <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        aria-label={`Move ${name} up`}
                        onClick={() => moveImage(img.id, img.order, +1)}
                        className="h-6 w-6 rounded bg-black/60 text-white text-xs"
                      >
                        &#9650;
                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${name} down`}
                        onClick={() => moveImage(img.id, img.order, -1)}
                        className="h-6 w-6 rounded bg-black/60 text-white text-xs"
                      >
                        &#9660;
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${name}`}
                        onClick={() => onDeleteFitImage?.(img.id)}
                        className="h-6 w-6 rounded bg-red-500/80 text-white text-xs"
                      >
                        x
                      </button>
                    </div>
                  </figure>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="space-y-3 rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="px-2 py-0.5 rounded bg-surface-alt font-mono text-heading">{nextLabel}</span>
            <span className="text-muted">auto-numbered</span>
          </div>
          <label className="block text-sm">
            Fit Date
            <input
              type="date"
              value={fitDate}
              onChange={(e) => setFitDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-input px-3 py-1.5 text-sm text-heading focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </label>
          <label className="block text-sm">
            Description
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-input px-3 py-1.5 text-sm text-heading focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </label>
          <label className="block text-sm">
            Notes
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-border bg-input px-3 py-1.5 text-sm text-heading focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </label>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={submit}
              className="px-3 py-1.5 rounded-lg bg-heading text-background text-sm font-medium hover:opacity-90"
            >
              Add Fit Spec
            </button>
          </div>
        </div>
      )}
    </section>
  );
}