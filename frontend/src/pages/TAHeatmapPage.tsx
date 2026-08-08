import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { merchApi } from '../api/client';
import Layout from '../components/Layout';
import { useToast } from '../contexts/ToastContext';

interface HeatmapItem {
  ta_id: string;
  po_number: string;
  delivery_date: string;
  status: string;
  progress: number;
  total_milestones: number;
  completed_milestones: number;
  delayed_milestones: number;
  risk_level: string;
}

const RISK_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  high: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', label: 'High Risk' },
  medium: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', label: 'Medium Risk' },
  low: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', label: 'Low Risk' },
};

export default function TAHeatmapPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<HeatmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'risk' | 'date' | 'progress'>('risk');
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await merchApi.getTAHeatmap();
      setData(res.data);
    } catch { toast('error', 'Failed to load heatmap data'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const sortedData = [...data].sort((a, b) => {
    if (sortBy === 'risk') {
      const order = { high: 0, medium: 1, low: 2 };
      return (order[a.risk_level as keyof typeof order] ?? 3) - (order[b.risk_level as keyof typeof order] ?? 3);
    }
    if (sortBy === 'date') return new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime();
    return a.progress - b.progress;
  });

  const counts = { high: data.filter((d) => d.risk_level === 'high').length, medium: data.filter((d) => d.risk_level === 'medium').length, low: data.filter((d) => d.risk_level === 'low').length };

  return (
    <Layout>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">T&A Heatmap</h1>
            <p className="text-muted text-sm mt-1">Risk-based overview of all T&As</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setSortBy('risk')} className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${sortBy === 'risk' ? 'bg-emerald-600 text-white' : 'bg-surface-alt text-muted hover:text-heading'}`}>By Risk</button>
            <button onClick={() => setSortBy('date')} className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${sortBy === 'date' ? 'bg-emerald-600 text-white' : 'bg-surface-alt text-muted hover:text-heading'}`}>By Date</button>
            <button onClick={() => setSortBy('progress')} className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${sortBy === 'progress' ? 'bg-emerald-600 text-white' : 'bg-surface-alt text-muted hover:text-heading'}`}>By Progress</button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-red-400">{counts.high}</p>
            <p className="text-sm text-muted mt-1">High Risk</p>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-amber-400">{counts.medium}</p>
            <p className="text-sm text-muted mt-1">Medium Risk</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-emerald-400">{counts.low}</p>
            <p className="text-sm text-muted mt-1">Low Risk</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" />
          </div>
        ) : data.length === 0 ? (
          <div className="bg-surface rounded-xl border border-border p-12 text-center text-muted">
            <p className="text-lg">No T&A data available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedData.map((item) => {
              const risk = RISK_COLORS[item.risk_level] || RISK_COLORS.low;
              return (
                <div
                  key={item.ta_id}
                  onClick={() => navigate(`/tas/${item.ta_id}`)}
                  className={`${risk.bg} border ${risk.border} rounded-xl p-4 cursor-pointer hover:scale-[1.02] transition-transform`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-sm text-heading font-medium">{item.po_number || 'N/A'}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${risk.bg} ${risk.text}`}>{risk.label}</span>
                  </div>
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-muted mb-1">
                      <span>Progress</span>
                      <span>{item.progress}%</span>
                    </div>
                    <div className="h-2 bg-surface-alt rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${
                        item.risk_level === 'high' ? 'bg-red-500' :
                        item.risk_level === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                      }`} style={{ width: `${item.progress}%` }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <p className="text-heading font-medium">{item.total_milestones}</p>
                      <p className="text-muted">Total</p>
                    </div>
                    <div>
                      <p className="text-emerald-400 font-medium">{item.completed_milestones}</p>
                      <p className="text-muted">Done</p>
                    </div>
                    <div>
                      <p className={`font-medium ${item.delayed_milestones > 0 ? 'text-red-400' : 'text-muted'}`}>{item.delayed_milestones}</p>
                      <p className="text-muted">Delayed</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                    <span className="text-muted">Delivery: <span className="text-heading">{item.delivery_date}</span></span>
                    <span className={`px-1.5 py-0.5 rounded text-xs ${item.status === 'active' ? 'bg-blue-500/20 text-badge-blue' : 'bg-surface-alt text-muted'}`}>{item.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </Layout>
  );
}
