import { useState, useEffect } from 'react';
import { qualityApi } from '../api/client';
import type { Inspection, CorrectiveAction } from '../api/client';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useToast } from '../contexts/ToastContext';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-surface-alt',
  in_progress: 'bg-amber-500',
  passed: 'bg-emerald-500',
  failed: 'bg-red-500',
};

export default function QualityDashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [passed, setPassed] = useState(0);
  const [failed, setFailed] = useState(0);
  const [openCAPs, setOpenCAPs] = useState(0);
  const [aqlAvg, setAqlAvg] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [defectCounts, setDefectCounts] = useState<Record<string, number>>({});
  const [recentInspections, setRecentInspections] = useState<Inspection[]>([]);
  const [overdueCAPs, setOverdueCAPs] = useState<CorrectiveAction[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [allRes, recentRes, capsRes] = await Promise.allSettled([
          qualityApi.getInspections({ page_size: '1', ordering: '-inspection_date' }),
          qualityApi.getInspections({ page_size: '10', ordering: '-inspection_date' }),
          qualityApi.getCorrectiveActions({ status: 'open' }),
        ]);

        let inspections: Inspection[] = [];
        if (allRes.status === 'fulfilled') {
          const all = allRes.value.data;
          setTotal(all.count);
          inspections = all.results;
        }
        if (recentRes.status === 'fulfilled') {
          setRecentInspections(recentRes.value.data.results);
        }
        if (capsRes.status === 'fulfilled') {
          setOpenCAPs(capsRes.value.data.count);
          const today = new Date().toISOString().split('T')[0];
          setOverdueCAPs(capsRes.value.data.results.filter(c => c.due_date < today));
        }

        const pages = Math.min(Math.ceil((total || inspections.length) / 100), 10);
        const allInspecs: Inspection[] = [...inspections];
        for (let p = 2; p <= pages; p++) {
          try {
            const r = await qualityApi.getInspections({ page: String(p), page_size: '100', ordering: '-inspection_date' });
            allInspecs.push(...r.data.results);
          } catch { break; }
        }

        let passCount = 0;
        let failCount = 0;
        let aqlSum = 0;
        let aqlCount = 0;
        const sc: Record<string, number> = {};
        const dc: Record<string, number> = {};

        for (const insp of allInspecs) {
          sc[insp.status] = (sc[insp.status] || 0) + 1;
          if (insp.status === 'passed') passCount++;
          if (insp.status === 'failed') failCount++;
          if (insp.aql_level) { aqlSum += insp.aql_level; aqlCount++; }
          for (const item of insp.items || []) {
            dc[item.defect_type] = (dc[item.defect_type] || 0) + item.defect_count;
          }
        }

        setPassed(passCount);
        setFailed(failCount);
        setAqlAvg(aqlCount > 0 ? aqlSum / aqlCount : 0);
        setStatusCounts(sc);
        setDefectCounts(dc);
      } catch { toast('error', 'Failed to load quality dashboard'); } finally { setLoading(false); }
    };
    load();
  }, []);

  const maxStatusCount = Math.max(1, ...Object.values(statusCounts));
  const topDefects = Object.entries(defectCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const maxDefectCount = topDefects.length > 0 ? topDefects[0][1] : 1;

  return (
    <Layout>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Quality Dashboard</h1>
          <p className="text-muted text-sm mt-1">Overview of quality inspections and corrective actions</p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" />
          </div>
        )}

        {!loading && (
          <>
            <div className="grid grid-cols-5 gap-4 mb-6">
              <div className="bg-surface rounded-xl border border-border p-5">
                <p className="text-muted text-sm">Total Inspections</p>
                <p className="text-3xl font-bold mt-1 text-blue-400">{total}</p>
              </div>
              <div className="bg-surface rounded-xl border border-border p-5">
                <p className="text-muted text-sm">Passed</p>
                <p className="text-3xl font-bold mt-1 text-emerald-400">{passed}</p>
              </div>
              <div className="bg-surface rounded-xl border border-border p-5">
                <p className="text-muted text-sm">Failed</p>
                <p className="text-3xl font-bold mt-1 text-red-400">{failed}</p>
              </div>
              <div className="bg-surface rounded-xl border border-border p-5">
                <p className="text-muted text-sm">Open CAPs</p>
                <p className="text-3xl font-bold mt-1 text-amber-400">{openCAPs}</p>
              </div>
              <div className="bg-surface rounded-xl border border-border p-5">
                <p className="text-muted text-sm">AQL Average</p>
                <p className="text-3xl font-bold mt-1 text-teal-400">{aqlAvg.toFixed(1)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="bg-surface rounded-xl border border-border p-5">
                <h2 className="text-lg font-semibold mb-4">Inspections by Status</h2>
                <div className="space-y-3">
                  {(['pending', 'in_progress', 'passed', 'failed'] as const).map((s) => {
                    const c = statusCounts[s] || 0;
                    return (
                      <div key={s} className="flex items-center gap-3">
                        <span className="text-sm text-body w-28 capitalize">{s.replace('_', ' ')}</span>
                        <div className="flex-1 h-6 bg-input rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${STATUS_COLORS[s]}`}
                            style={{ width: `${(c / maxStatusCount) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted w-10 text-right">{c}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-surface rounded-xl border border-border p-5">
                <h2 className="text-lg font-semibold mb-4">Defect Types</h2>
                {topDefects.length === 0 ? (
                  <p className="text-faint text-sm">No defects recorded</p>
                ) : (
                  <div className="space-y-3">
                    {topDefects.map(([type, count]) => (
                      <div key={type} className="flex items-center gap-3">
                        <span className="text-sm text-body w-28 truncate" title={type}>{type}</span>
                        <div className="flex-1 h-6 bg-input rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-red-500"
                            style={{ width: `${(count / maxDefectCount) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted w-10 text-right">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 bg-surface rounded-xl border border-border p-5">
                <h2 className="text-lg font-semibold mb-4">Recent Inspections</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted border-b border-border">
                        <th className="text-left py-2 pr-4 font-medium">Date</th>
                        <th className="text-left py-2 pr-4 font-medium">PO #</th>
                        <th className="text-left py-2 pr-4 font-medium">Factory</th>
                        <th className="text-left py-2 pr-4 font-medium">Type</th>
                        <th className="text-left py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentInspections.length === 0 && (
                        <tr><td colSpan={5} className="py-4 text-faint text-center">No inspections</td></tr>
                      )}
                      {recentInspections.map((r) => (
                        <tr key={r.id} className="border-b border-border cursor-pointer hover:bg-surface-alt/30"
                          onClick={() => navigate('/quality')}>
                          <td className="py-2 pr-4">{r.inspection_date}</td>
                          <td className="py-2 pr-4 font-mono text-emerald-400">{r.po_number}</td>
                          <td className="py-2 pr-4">{r.factory_name}</td>
                          <td className="py-2 pr-4 capitalize">{r.inspection_type.replace('_', ' ')}</td>
                          <td className="py-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium bg-surface-alt/20 text-muted capitalize`}>
                              {r.status.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-surface rounded-xl border border-border p-5">
                <h2 className="text-lg font-semibold mb-4">CAPs Overdue</h2>
                {overdueCAPs.length === 0 ? (
                  <p className="text-faint text-sm">No overdue CAPs</p>
                ) : (
                  <div className="space-y-3">
                    {overdueCAPs.slice(0, 8).map((cap) => (
                      <div key={cap.id} className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                        <p className="text-sm font-medium text-red-300">{cap.title}</p>
                        <p className="text-xs text-muted mt-1">Due: {cap.due_date} &middot; {cap.assigned_to_name || 'Unassigned'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </Layout>
  );
}
