import { useRef, useState, useEffect, type DragEvent, type ChangeEvent, type MouseEvent } from 'react';
import { merchApi } from '../api/client';
import type { SketchAnnotation } from '../api/client';
import { useToast } from '../contexts/ToastContext';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const createId = () => Math.random().toString(36).slice(2, 10);

interface DesignSheetSketchProps {
  techpackId: string;
  designSheetId?: string;
  sketchUrl: string | null;
  annotations?: SketchAnnotation[];
  onAnnotationsChange?: (annotations: SketchAnnotation[]) => void;
  onSketchChange?: (sketchUrl: string) => void;
}

export default function DesignSheetSketch({
  techpackId,
  designSheetId,
  sketchUrl,
  annotations = [],
  onAnnotationsChange,
  onSketchChange,
}: DesignSheetSketchProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [annotate, setAnnotate] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewOpen(false);
    };
    if (previewOpen) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [previewOpen]);

  const upload = async (file: File) => {
    if (!file || uploading) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast('error', 'Only JPG, PNG, or WebP images are allowed');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast('error', 'Image must be under 10 MB');
      return;
    }
    setUploading(true);
    try {
      const res = await merchApi.uploadTechPackSketch(techpackId, file);
      toast('success', res.data.message);
      onSketchChange?.(res.data.sketch_image_url);
      setAnnotate(false);
    } catch {
      toast('error', 'Failed to upload sketch');
    } finally {
      setUploading(false);
    }
  };

  const saveAnnotations = async () => {
    if (!designSheetId || saving) return;
    setSaving(true);
    try {
      await merchApi.saveDesignSheetAnnotations(designSheetId, annotations);
      toast('success', 'Annotations saved');
      setAnnotate(false);
    } catch {
      toast('error', 'Failed to save annotations');
    } finally {
      setSaving(false);
    }
  };

  const addAnnotation = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('input,button')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.width ? Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10 : 0;
    const y = rect.height ? Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10 : 0;
    onAnnotationsChange?.([...annotations, { id: createId(), x, y, text: '' }]);
  };

  const updateAnnotation = (id: string, patch: Partial<SketchAnnotation>) => {
    onAnnotationsChange?.(annotations.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const deleteAnnotation = (id: string) => {
    onAnnotationsChange?.(annotations.filter((a) => a.id !== id));
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void upload(file);
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void upload(file);
    e.target.value = '';
  };

  return (
    <section
      data-testid="sketch-drop-zone"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`bg-surface rounded-xl border p-6 transition-colors ${
        dragging ? 'border-emerald-400 border-2' : 'border-border'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold">Sketch</h2>
        {sketchUrl && (
          <div className="flex items-center gap-2">
            <button
              data-testid="annotate-toggle"
              onClick={() => setAnnotate((a) => !a)}
              className="px-3 py-1.5 bg-surface-alt hover:bg-surface-alt/70 text-heading text-xs rounded-lg font-medium border border-input-border transition-colors"
            >
              {annotate ? 'Done' : 'Annotate'}
            </button>
            <button
              onClick={saveAnnotations}
              disabled={saving}
              className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-600/50 text-white text-xs rounded-lg font-medium transition-colors"
            >
              {saving ? 'Saving...' : 'Save Annotations'}
            </button>
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white text-xs rounded-lg font-medium transition-colors"
            >
              {uploading ? 'Uploading...' : 'Replace Sketch'}
            </button>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        data-testid="sketch-input"
        className="hidden"
        onChange={onFileChange}
      />

      {sketchUrl ? (
        <div data-testid="sketch-annotate-area" onClick={annotate ? addAnnotation : undefined} className="relative w-fit mx-auto">
          <button type="button" data-testid="sketch-preview-button" onClick={annotate ? undefined : () => setPreviewOpen(true)} className="block max-h-72">
            <img src={sketchUrl} alt="Design sheet sketch" className="max-h-72 mx-auto object-contain rounded-lg" />
          </button>
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
              Click on the sketch to place a note
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center h-40 bg-surface-alt/40 rounded-lg border border-dashed border-input-border text-muted text-sm">
          {uploading ? 'Uploading sketch...' : 'No sketch uploaded yet'}
        </div>
      )}

      <div className="mt-4 flex flex-col items-center gap-2">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white text-sm rounded-lg font-medium transition-colors"
        >
          {sketchUrl ? 'Change Sketch' : 'Upload Sketch'}
        </button>
        <p className="text-xs text-faint">or drag &amp; drop a JPG / PNG / WebP here (max 10 MB)</p>
      </div>

      {previewOpen && sketchUrl && (
        <div
          role="dialog"
          aria-label="Sketch preview"
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
          onClick={() => setPreviewOpen(false)}
        >
          <img src={sketchUrl} alt="Sketch preview" className="max-w-[90vw] max-h-[90vh] object-contain" />
          <button
            aria-label="Close preview"
            onClick={() => setPreviewOpen(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-surface text-heading text-xl flex items-center justify-center hover:bg-surface-alt"
          >
            ✕
          </button>
        </div>
      )}
    </section>
  );
}