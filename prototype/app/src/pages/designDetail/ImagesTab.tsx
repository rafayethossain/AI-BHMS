import type { DesignImage } from '../../mock/types';

export default function ImagesTab({ images }: { images: DesignImage[] }) {
  if (images.length === 0) {
    return <p className="text-sm text-muted">No design images yet.</p>;
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {images.map((img) => (
        <figure key={img.id} className="rounded-lg border border-border bg-surface overflow-hidden">
          <img src={img.url} alt={img.label} className="w-full h-56 object-cover" />
          <figcaption className="p-3 text-sm space-y-1">
            <div className="text-heading font-medium">{img.label}</div>
            <div className="text-muted">{img.annotation}</div>
            <div className="text-xs text-faint">Uploaded {img.uploaded_at}</div>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}