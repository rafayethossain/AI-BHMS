import { useState, useEffect, useCallback } from 'react';
import { helpApi } from '../api/client';
import type { ReleaseNote } from '../api/client';

export default function ReleaseNotesTab() {
  const [notes, setNotes] = useState<ReleaseNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    try {
      const resp = await helpApi.getReleaseNotes();
      setNotes(resp.data.results);
      if (resp.data.results.length > 0) {
        setExpandedId(resp.data.results[0].id);
      }
    } catch {
      // Non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-surface rounded-xl border border-border p-4 animate-pulse">
            <div className="h-3 bg-surface-alt rounded w-1/4 mb-2" />
            <div className="h-4 bg-surface-alt rounded w-1/2 mb-2" />
            <div className="h-3 bg-surface-alt rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="bg-surface rounded-xl border border-border p-8 text-center">
        <p className="text-sm text-muted">No release notes available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {notes.map((note) => {
        const expanded = expandedId === note.id;
        const released = new Date(note.released_at);
        return (
          <div key={note.id} className="bg-surface rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => setExpandedId(expanded ? null : note.id)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
                  v{note.version}
                </span>
                <span className="text-sm font-medium text-heading">{note.title}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-faint">
                  {released.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <svg
                  className={`w-4 h-4 text-faint transition-transform ${expanded ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
            {expanded && (
              <div className="px-4 pb-4">
                <div className="border-t border-border pt-3">
                  <p className="text-xs text-muted leading-relaxed whitespace-pre-wrap">{note.body}</p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
