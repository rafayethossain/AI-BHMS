import { useState } from 'react';
import type { DesignImage, SketchAnnotation } from '../api/client';
import ImageAnnotationOverlay from './ImageAnnotationOverlay';

export const DESIGN_IMAGE_ROLES = ['main', 'range', 'colourway', 'detail'] as const;

const ROLE_LABELS: Record<string, string> = {
  main: 'Main',
  range: 'Range',
  colourway: 'Colourway',
  detail: 'Detail',
};

export interface DesignImagesUploadData {
  styleId: string;
  role: string;
  caption: string;
  file: File;
}

interface DesignSheetImagesProps {
  images: DesignImage[];
  styleId?: string;
  onUpload?: (data: DesignImagesUploadData) => void;
  onSetMain?: (id: string) => void;
  onSetRole?: (id: string, role: string) => void;
  onDelete?: (id: string) => void;
  onSaveAnnotations?: (id: string, annotations: SketchAnnotation[]) => void | Promise<unknown>;
}

export default function DesignSheetImages({
  images,
  styleId,
  onUpload,
  onSetMain,
  onSetRole,
  onDelete,
  onSaveAnnotations,
}: DesignSheetImagesProps) {
  const [view, setView] = useState<'image' | 'list'>('image');
  const [rangeOnly, setRangeOnly] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [role, setRole] = useState<string>('main');
  const [caption, setCaption] = useState('');
  const [annotationDraft, setAnnotationDraft] = useState<{
    id: string;
    annotations: SketchAnnotation[];
  } | null>(null);
  const [savingAnnotations, setSavingAnnotations] = useState(false);

  const annotationImage = annotationDraft
    ? images.find((i) => i.id === annotationDraft.id)
    : undefined;

  const visible = rangeOnly
    ? images.filter((i) => i.role === 'range')
    : images;

  const submitUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && styleId) {
      onUpload?.({ styleId, role, caption, file });
      setCaption('');
      setRole('main');
      setShowUpload(false);
    }
    e.target.value = '';
  };

  const saveDraftAnnotations = async () => {
    if (!annotationDraft) return;
    setSavingAnnotations(true);
    try {
      await onSaveAnnotations?.(annotationDraft.id, annotationDraft.annotations);
      setAnnotationDraft(null);
    } catch {
      // keep the dialog open so the user can retry
    } finally {
      setSavingAnnotations(false);
    }
  };

  return (
    <section className="bg-surface rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold">Design Images</h2>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-sm text-muted cursor-pointer">
            <input
              type="checkbox"
              data-testid="design-images-range-filter"
              checked={rangeOnly}
              onChange={(e) => setRangeOnly(e.target.checked)}
            />
            Range only
          </label>
          <button
            type="button"
            data-testid="design-images-view-image"
            aria-pressed={view === 'image'}
            onClick={() => setView('image')}
            className="px-2 py-1 rounded text-sm font-medium bg-surface-alt text-heading border border-border hover:border-emerald-500/40"
          >
            Image
          </button>
          <button
            type="button"
            data-testid="design-images-view-list"
            aria-pressed={view === 'list'}
            onClick={() => setView('list')}
            className="px-2 py-1 rounded text-sm font-medium bg-surface-alt text-heading border border-border hover:border-emerald-500/40"
          >
            List
          </button>
          <button
            type="button"
            data-testid="design-images-add"
            onClick={() => setShowUpload((v) => !v)}
            className="px-3 py-1.5 rounded-lg bg-btn-primary text-white text-sm font-medium hover:opacity-90"
          >
            {showUpload ? 'Cancel' : '+ Add Image'}
          </button>
        </div>
      </div>

      {styleId && showUpload && (
        <div className="mb-4 space-y-3 rounded-lg border border-border p-4">
          <label className="block text-sm">
            Role
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-input px-3 py-1.5 text-sm text-heading focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {DESIGN_IMAGE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Caption
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-input px-3 py-1.5 text-sm text-heading focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </label>
          <label className="block text-sm">
            Image file
            <input
              type="file"
              accept="image/*"
              data-testid="design-images-file"
              onChange={submitUpload}
              className="mt-1 block w-full text-sm"
            />
          </label>
        </div>
      )}

      {visible.length === 0 ? (
        <p className="text-muted text-sm">No design images yet.</p>
      ) : view === 'image' ? (
        <div data-testid="design-images-grid" className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {visible.map((img) => (
            <figure
              key={img.id}
              data-testid={`design-images-tile-${img.id}`}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenuFor(img.id);
              }}
              className="group relative"
            >
              <img
                src={img.image}
                alt={img.caption || 'design image'}
                className="h-24 w-full object-cover rounded-lg border border-border"
              />
              <figcaption className="mt-1 text-xs text-muted truncate">{img.caption}</figcaption>
              <span className="absolute top-1 left-1 rounded bg-black/60 px-1 text-[10px] text-white">
                {ROLE_LABELS[img.role] ?? img.role}
              </span>
              {img.is_main && (
                <span className="absolute bottom-1 left-1 rounded bg-emerald-600 px-1 text-[10px] text-white">
                  MAIN
                </span>
              )}
              <button
                type="button"
                data-testid={`design-images-annotate-${img.id}`}
                onClick={() =>
                  setAnnotationDraft({ id: img.id, annotations: img.annotations ?? [] })
                }
                className="absolute bottom-1 right-1 rounded bg-black/60 hover:bg-black/80 px-1.5 py-0.5 text-[10px] text-white"
              >
                Annotate
              </button>
            </figure>
          ))}
        </div>
      ) : (
        <div data-testid="design-images-list" className="divide-y divide-border">
          {visible.map((img) => (
            <div key={img.id} className="flex items-center gap-3 py-2 text-sm">
              <img src={img.image} alt={img.caption} className="h-12 w-12 rounded object-cover border border-border" />
              <div className="flex-1">
                <div className="font-medium text-heading">{img.caption || '(no caption)'}</div>
                <div className="text-xs text-muted">
                  {ROLE_LABELS[img.role] ?? img.role} {img.is_main ? '· Main' : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {menuFor && (
        <div data-testid="design-images-menu" className="absolute z-20 mt-2 w-52 rounded-lg border border-border bg-surface p-1 shadow-lg">
          <button
            type="button"
            onClick={() => {
              onSetMain?.(menuFor);
              setMenuFor(null);
            }}
            className="block w-full rounded px-3 py-1.5 text-left text-sm text-heading hover:bg-surface-alt"
          >
            Set as Main Image
          </button>
          {DESIGN_IMAGE_ROLES.filter((r) => r !== 'main').map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                onSetRole?.(menuFor, r);
                setMenuFor(null);
              }}
              className="block w-full rounded px-3 py-1.5 text-left text-sm text-heading hover:bg-surface-alt"
            >
              Set as {ROLE_LABELS[r]}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              onDelete?.(menuFor);
              setMenuFor(null);
            }}
            className="block w-full rounded px-3 py-1.5 text-left text-sm text-red-600 hover:bg-surface-alt"
          >
            Delete image
          </button>
        </div>
      )}

      {annotationDraft && annotationImage && (
        <div
          role="dialog"
          aria-label="Annotate image"
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
          onClick={() => {
            if (!savingAnnotations) setAnnotationDraft(null);
          }}
        >
          <div
            className="relative w-full max-w-3xl rounded-xl border border-border bg-surface p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-heading">Annotate image</h3>
              <button
                type="button"
                data-testid="design-images-annotate-close"
                aria-label="Close annotation dialog"
                onClick={() => setAnnotationDraft(null)}
                className="w-8 h-8 rounded-full bg-surface-alt text-heading text-lg flex items-center justify-center hover:bg-surface-alt/70"
              >
                ✕
              </button>
            </div>
            <ImageAnnotationOverlay
              src={annotationImage.image}
              alt={annotationImage.caption || undefined}
              annotations={annotationDraft.annotations}
              onAnnotationsChange={(next) =>
                setAnnotationDraft((prev) => (prev ? { ...prev, annotations: next } : prev))
              }
              onSaveAnnotations={saveDraftAnnotations}
              saving={savingAnnotations}
            />
          </div>
        </div>
      )}
    </section>
  );
}