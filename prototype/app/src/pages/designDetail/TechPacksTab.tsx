import type { DesignTechPack, TechPackStatus } from '../../mock/types';

const STATUS_LABELS: Record<TechPackStatus, string> = {
  not_started: 'Not started',
  extracting: 'Extracting',
  review: 'In review',
  imported: 'Imported',
};

const STATUS_STYLES: Record<TechPackStatus, string> = {
  not_started: 'bg-slate-100 text-muted dark:bg-slate-800',
  extracting: 'bg-blue-300/15 text-blue-600',
  review: 'bg-amber-400/15 text-amber-600',
  imported: 'bg-emerald-500/15 text-emerald-600',
};

export default function TechPacksTab({ techPacks }: { techPacks: DesignTechPack[] }) {
  if (techPacks.length === 0) {
    return <p className="text-sm text-muted">No tech packs yet.</p>;
  }
  return (
    <div className="space-y-4">
      {techPacks.map((tp) => (
        <section key={tp.id} className="rounded-lg border border-border bg-surface p-4">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-medium text-heading">{tp.name}</h3>
              <p className="text-xs text-muted mt-1">
                Version {tp.version} · uploaded {tp.uploaded_at}
              </p>
            </div>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[tp.status]}`}>
              {STATUS_LABELS[tp.status]}
            </span>
          </div>
          <ul className="mt-4 space-y-2">
            {tp.sections.map((s) => (
              <li key={s.key}>
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>{s.label}</span>
                  <span>{s.progress}%</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-surface-alt overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${s.progress}%` }}
                    role="progressbar"
                    aria-label={s.label}
                    aria-valuenow={s.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}