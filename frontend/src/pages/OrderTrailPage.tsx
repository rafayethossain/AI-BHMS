import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { merchApi } from '../api/client';
import Layout from '../components/Layout';
import StatusTimeline from '../components/StatusTimeline';
import type { TimelineEvent } from '../components/StatusTimeline';

export default function OrderTrailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [trail, setTrail] = useState<{
    po_number: string;
    total_events: number;
    events: { date: string; title: string; description: string; color: string; icon: string; sort_key: string }[];
  } | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (!id) return;
    merchApi.getPOTrail(id).then(res => setTrail(res.data)).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <Layout>
        <div className="p-6 flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  if (!trail) {
    return (
      <Layout>
        <div className="p-6 text-center">
          <p className="text-muted">Trail not found.</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-emerald-400 hover:text-emerald-300 text-sm">Go Back</button>
        </div>
      </Layout>
    );
  }

  const categories = [
    { key: 'all', label: 'All Events' },
    { key: 'create', label: 'Created' },
    { key: 'approve', label: 'Approved' },
    { key: 'transition', label: 'Transitions' },
    { key: 'update', label: 'Updates' },
  ];

  const filteredEvents = filter === 'all'
    ? trail.events
    : trail.events.filter(e => e.color === filter);

  const timelineEvents: TimelineEvent[] = filteredEvents.map(e => ({
    date: e.date,
    title: e.title,
    description: e.description,
    icon: e.icon,
    color: e.color,
  }));

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="p-1 hover:bg-surface-alt rounded-lg transition-colors">
                <svg className="w-5 h-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <h1 className="text-2xl font-bold">Order Trail</h1>
            </div>
            <p className="text-muted text-sm mt-1">
              {trail.po_number} &middot; {trail.total_events} events
            </p>
          </div>
          {id && (
            <button onClick={() => navigate(`/purchase-orders/${id}`)}
              className="px-4 py-2 bg-surface-alt hover:bg-surface-alt text-sm rounded-lg text-body transition-colors">
              View PO Details
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
          {categories.map(cat => (
            <button key={cat.key} onClick={() => setFilter(cat.key)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                filter === cat.key ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-muted hover:text-body'
              }`}>
              {cat.label}
              {cat.key !== 'all' && (
                <span className="ml-1.5 text-xs text-faint">
                  ({trail.events.filter(e => cat.key === 'all' || e.color === cat.key).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Timeline */}
        <div className="bg-surface rounded-xl border border-border p-6">
          {filteredEvents.length > 0 ? (
            <StatusTimeline events={timelineEvents} />
          ) : (
            <div className="text-center py-12">
              <svg className="w-10 h-10 text-faint mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-sm text-muted">No events in this category.</p>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Events', value: trail.total_events, color: 'text-heading' },
            { label: 'Created', value: trail.events.filter(e => e.color === 'create').length, color: 'text-badge-emerald' },
            { label: 'Approved', value: trail.events.filter(e => e.color === 'approve').length, color: 'text-badge-blue' },
            { label: 'Transitions', value: trail.events.filter(e => e.color === 'transition').length, color: 'text-badge-amber' },
          ].map(s => (
            <div key={s.label} className="bg-surface rounded-xl border border-border p-3 text-center">
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
