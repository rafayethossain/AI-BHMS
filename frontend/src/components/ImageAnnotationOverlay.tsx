import { useState } from 'react';
import type { SketchAnnotation } from '../api/client';

const createId = () => Math.random().toString(36).slice(2, 10);

interface ImageAnnotationOverlayProps {
  src: string;
  alt?: string;
  annotations: SketchAnnotation[];
  onAnnotationsChange: (annotations: SketchAnnotation[]) => void;
  onSaveAnnotations: (annotations: SketchAnnotation[]) => void;
  saving?: boolean;
}

export default function ImageAnnotationOverlay({
  src,
  alt,
  annotations,
  onAnnotationsChange,
  onSaveAnnotations,
  saving,
}: ImageAnnotationOverlayProps) {
  const [annotate, setAnnotate] = useState(false);

  const addAnnotation = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('input,button')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.width ? Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10 : 0;
    const y = rect.height ? Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10 : 0;
    onAnnotationsChange([...annotations, { id: createId(), x, y, text: '' }]);
  };

  const updateAnnotation = (id: string, patch: Partial<SketchAnnotation>) => {
    onAnnotationsChange(annotations.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const deleteAnnotation = (id: string) => {
    onAnnotationsChange(annotations.filter((a) => a.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <button
          type="button"
          data-testid="image-annotate-toggle"
          onClick={() => setAnnotate((a) => !a)}
          className="px-3 py-1.5 bg-surface-alt hover:bg-surface-alt/70 text-heading text-xs rounded-lg font-medium border border-input-border transition-colors"
        >
          {annotate ? 'Done' : 'Annotate'}
        </button>
        <button
          type="button"
          data-testid="image-annotate-save"
          onClick={() => onSaveAnnotations(annotations)}
          disabled={saving}
          className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-600/50 text-white text-xs rounded-lg font-medium transition-colors"
        >
          {saving ? 'Saving...' : 'Save Annotations'}
        </button>
      </div>

      <div
        data-testid="image-annotate-area"
        onClick={annotate ? addAnnotation : undefined}
        className="relative w-fit mx-auto"
      >
        <img src={src} alt={alt ?? 'design image'} className="max-h-[70vh] mx-auto object-contain rounded-lg" />
        {annotations.map((a) => (
          <div
            key={a.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${a.x}%`, top: `${a.y}%` }}
          >
            <div className="flex items-center gap-1 bg-black/75 rounded-lg px-2 py-1">
              <input
                aria-label={`Annotation ${a.id}`}
                value={a.text}
                onChange={(e) => updateAnnotation(a.id, { text: e.target.value })}
                placeholder="Note..."
                className="w-24 bg-transparent text-white text-xs placeholder-white/40 outline-none"
              />
              <button
                type="button"
                aria-label={`Delete annotation ${a.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  deleteAnnotation(a.id);
                }}
                className="text-white/60 hover:text-red-400 text-xs"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
        {annotate && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg border-2 border-dashed border-emerald-400 text-emerald-300 text-xs">
            Click on the image to place a note
          </div>
        )}
      </div>
    </div>
  );
}