import { useNavigate } from 'react-router-dom';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-surface-alt/50 text-muted',
  open: 'bg-blue-500/20 text-badge-blue',
  active: 'bg-emerald-500/20 text-badge-emerald',
  confirmed: 'bg-emerald-500/20 text-badge-emerald',
  approved: 'bg-emerald-500/20 text-badge-emerald',
  in_production: 'bg-cyan-500/20 text-badge-blue',
  planned: 'bg-blue-500/20 text-badge-blue',
  in_progress: 'bg-cyan-500/20 text-badge-blue',
  quality_check: 'bg-amber-500/20 text-badge-amber',
  ready: 'bg-cyan-500/20 text-badge-blue',
  shipped: 'bg-indigo-500/20 text-indigo-400',
  delivered: 'bg-green-500/20 text-badge-green',
  completed: 'bg-green-500/20 text-badge-green',
  passed: 'bg-emerald-500/20 text-badge-emerald',
  cancelled: 'bg-red-500/20 text-badge-red',
  failed: 'bg-red-500/20 text-badge-red',
  rejected: 'bg-red-500/20 text-badge-red',
  delayed: 'bg-amber-500/20 text-badge-amber',
  pending: 'bg-amber-500/20 text-badge-amber',
  in_transit: 'bg-blue-500/20 text-badge-blue',
  on_water: 'bg-blue-500/20 text-badge-blue',
  at_port: 'bg-purple-500/20 text-purple-400',
  archived: 'bg-surface-alt/50 text-faint',
  sent: 'bg-blue-500/20 text-badge-blue',
  accepted: 'bg-emerald-500/20 text-badge-emerald',
  booked: 'bg-purple-500/20 text-purple-400',
};

export interface EntityCardProps {
  id: string;
  code: string;
  title: string;
  subtitle?: string;
  status: string;
  image?: string | null;
  metrics?: { label: string; value: string | number; color?: string }[];
  date?: string;
  url: string;
  actions?: { label: string; onClick: () => void; color?: string }[];
  compact?: boolean;
}

export default function EntityCard({ code, title, subtitle, status, image, metrics, date, url, actions, compact }: EntityCardProps) {
  const navigate = useNavigate();

  return (
    <div onClick={() => navigate(url)}
      className="bg-surface rounded-xl border border-border overflow-hidden hover:border-emerald-500/30 transition-all cursor-pointer group">
      {image && (
        <div className={`${compact ? 'h-24' : 'h-44'} bg-surface-alt overflow-hidden`}>
          <img src={image} alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>
      )}
      <div className={`${compact ? 'p-3' : 'p-4'}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-emerald-400 group-hover:text-emerald-300 transition-colors">{code}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status] || 'bg-surface-alt/50 text-muted'}`}>
                {status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-sm text-heading font-medium mt-1 truncate">{title}</p>
            {subtitle && <p className="text-xs text-muted mt-0.5 truncate">{subtitle}</p>}
          </div>
          {date && <span className="text-xs text-faint flex-shrink-0">{date}</span>}
        </div>

        {metrics && metrics.length > 0 && (
          <div className={`${compact ? 'mt-2 pt-2 gap-3' : 'mt-3 pt-3 gap-4'} flex border-t border-border/50`}>
            {metrics.map((m, idx) => (
              <div key={idx} className="min-w-0">
                <p className="text-xs text-faint">{m.label}</p>
                <p className={`${compact ? 'text-xs' : 'text-sm'} font-medium ${m.color || 'text-heading'} truncate`}>{m.value}</p>
              </div>
            ))}
          </div>
        )}

        {actions && actions.length > 0 && (
          <div className={`${compact ? 'mt-2 pt-2' : 'mt-3 pt-3'} flex gap-2 border-t border-border/50 opacity-0 group-hover:opacity-100 transition-opacity`}>
            {actions.map((a, idx) => (
              <button key={idx} onClick={(e) => { e.stopPropagation(); a.onClick(); }}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${a.color || 'bg-surface-alt hover:bg-surface-alt text-body'}`}>
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function CardListToggle({ view, onChange }: { view: 'grid' | 'list'; onChange: (v: 'grid' | 'list') => void }) {
  return (
    <div className="flex bg-surface-alt rounded-lg p-0.5">
      <button aria-label="Grid view" aria-pressed={view === 'grid'} onClick={() => onChange('grid')}
        className={`p-1.5 rounded-md transition-colors ${view === 'grid' ? 'bg-surface text-heading shadow-sm' : 'text-muted hover:text-body'}`}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      </button>
      <button aria-label="List view" aria-pressed={view === 'list'} onClick={() => onChange('list')}
        className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-surface text-heading shadow-sm' : 'text-muted hover:text-body'}`}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
        </svg>
      </button>
    </div>
  );
}
