import type { DesignSketch } from '../../mock/types';

export default function SketchesTab({ sketches }: { sketches: DesignSketch[] }) {
  if (sketches.length === 0) {
    return <p className="text-sm text-muted">No sketches yet.</p>;
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {sketches.map((s) => (
        <figure key={s.id} className="rounded-lg border border-border bg-surface overflow-hidden">
          <img src={s.url} alt={`${s.label} (${s.version_number})`} className="w-full h-56 object-cover" />
          <figcaption className="p-3 text-sm">
            <span className="text-heading font-medium">{s.label}</span>
            <span className="text-muted"> · {s.version_number}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}