import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportingApi } from '../api/client';
import type { SavedReport } from '../api/client';
import Layout from '../components/Layout';
import SearchableSelect from '../components/SearchableSelect';
import { useToast } from '../contexts/ToastContext';

const REPORT_TYPES = [
  { value: 'orders', label: 'Order Reports' },
  { value: 'production', label: 'Production Reports' },
  { value: 'commercial', label: 'Commercial Reports' },
  { value: 'quality', label: 'Quality Reports' },
  { value: 'inventory', label: 'Inventory Reports' },
  { value: 'financial', label: 'Financial Reports' },
];

const QUICK_CARDS = [
  { type: 'orders', label: 'Order Reports', desc: 'PO status, amendments, summaries', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', color: 'blue', path: '/reports/orders' },
  { type: 'production', label: 'Production Reports', desc: 'Plans, daily output, efficiency', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', color: 'amber', path: '/reports/production' },
  { type: 'commercial', label: 'Commercial Reports', desc: 'LCs, utilization, bank data', icon: 'M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z', color: 'emerald', path: '/reports/commercial' },
  { type: 'quality', label: 'Quality Reports', desc: 'Inspections, DHU, corrective actions', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', color: 'green', path: '/reports/quality' },
  { type: 'inventory', label: 'Inventory Reports', desc: 'Stock levels, movements', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', color: 'purple', path: '/reports/inventory' },
  { type: 'financial', label: 'Financial Reports', desc: 'Costings, revenue, margins', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'red', path: '/reports/financial' },
];

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; hover: string }> = {
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', hover: 'hover:border-blue-500/60' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', hover: 'hover:border-amber-500/60' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', hover: 'hover:border-emerald-500/60' },
  green: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30', hover: 'hover:border-green-500/60' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30', hover: 'hover:border-purple-500/60' },
  red: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', hover: 'hover:border-red-500/60' },
};

const TYPE_LABELS: Record<string, string> = {
  orders: 'Order Reports',
  production: 'Production Reports',
  commercial: 'Commercial Reports',
  quality: 'Quality Reports',
  inventory: 'Inventory Reports',
  financial: 'Financial Reports',
};

export default function ReportsDashboardPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newReport, setNewReport] = useState({ name: '', report_type: '', description: '' });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const reportsRes = await reportingApi.getReports({ page_size: '100' });
      setReports(reportsRes.data.results);
    } catch { toast('error', 'Failed to load reports data'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async () => {
    if (!newReport.name || !newReport.report_type) { toast('error', 'Name and type required'); return; }
    setSaving(true);
    try {
      await reportingApi.createReport(newReport);
      toast('success', 'Report created');
      setShowCreateModal(false);
      setNewReport({ name: '', report_type: '', description: '' });
      fetchData();
    } catch { toast('error', 'Failed to create report'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this report?')) return;
    try {
      await reportingApi.deleteReport(id);
      toast('success', 'Report deleted');
      fetchData();
    } catch { toast('error', 'Failed to delete report'); }
  };

  const handleRun = async (id: string) => {
    try {
      await reportingApi.executeReport(id);
      toast('success', 'Report executed');
      fetchData();
    } catch { toast('error', 'Failed to execute report'); }
  };

  return (
    <Layout>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Reports</h1>
            <p className="text-muted text-sm mt-1">{reports.length} saved reports</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/reports/builder')}
              className="px-4 py-2 bg-surface-alt hover:bg-surface text-heading rounded-lg text-sm transition-colors">
              Report Builder
            </button>
            <button onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
              + Create Report
            </button>
          </div>
        </div>

        {/* Quick Report Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {QUICK_CARDS.map((card) => {
            const colors = COLOR_MAP[card.color];
            return (
              <button key={card.type}
                onClick={() => navigate(card.path)}
                className={`bg-surface rounded-xl border ${colors.border} p-5 text-left transition-all group ${colors.hover} hover:shadow-lg cursor-pointer`}>
                <div className="flex items-start justify-between">
                  <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center`}>
                    <svg className={`w-5 h-5 ${colors.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={card.icon} />
                    </svg>
                  </div>
                </div>
                <h3 className="text-heading font-medium mt-3 group-hover:text-emerald-300 transition-colors">{card.label}</h3>
                <p className="text-muted text-sm mt-1">{card.desc}</p>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Saved Reports */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Saved Reports</h2>
            {loading ? (
              <div className="bg-surface rounded-xl border border-border p-12 flex justify-center">
                <div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" />
              </div>
            ) : reports.length === 0 ? (
              <div className="bg-surface rounded-xl border border-border p-12 text-center text-muted">
                No saved reports yet. Create one or use a quick report.
              </div>
            ) : (
              <div className="bg-surface rounded-xl border border-border overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left text-sm text-muted">
                      <th className="px-6 py-3">Name</th>
                      <th className="px-6 py-3">Type</th>
                      <th className="px-6 py-3">Scheduled</th>
                      <th className="px-6 py-3">Created</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report) => (
                      <tr key={report.id} className="border-b border-border hover:bg-surface-alt/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-sm text-heading font-medium">{report.name}</div>
                          {report.description && <div className="text-xs text-faint mt-0.5">{report.description}</div>}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-surface-alt text-body rounded text-xs">{TYPE_LABELS[report.report_type] || report.report_type}</span>
                        </td>
                        <td className="px-6 py-4">
                          {report.is_scheduled ? (
                            <span className="flex items-center gap-1.5 text-emerald-400 text-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Active
                            </span>
                          ) : (
                            <span className="text-faint text-xs">No</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-muted">{new Date(report.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleRun(report.id)}
                              className="px-2 py-1 bg-emerald-500/10 text-badge-emerald rounded text-xs hover:bg-emerald-500/20 transition-colors">
                              Run
                            </button>
                            <button onClick={() => navigate(`/reports/builder?edit=${report.id}`)}
                              className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-xs hover:bg-blue-500/20 transition-colors">
                              Edit
                            </button>
                            <button onClick={() => handleDelete(report.id)}
                              className="px-2 py-1 bg-red-500/10 text-red-400 rounded text-xs hover:bg-red-500/20 transition-colors">
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-md shadow-2xl">
              <h2 className="text-lg font-semibold mb-4">Create New Report</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-muted mb-1">Report Name</label>
                  <input type="text" value={newReport.name} onChange={(e) => setNewReport(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="e.g. Monthly PO Summary" />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Report Type</label>
                  <SearchableSelect options={REPORT_TYPES} value={newReport.report_type || null}
                    onChange={(v) => setNewReport(p => ({ ...p, report_type: String(v || '') }))} placeholder="Select type..." />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Description (optional)</label>
                  <textarea value={newReport.description} onChange={(e) => setNewReport(p => ({ ...p, description: e.target.value }))}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    rows={2} placeholder="Brief description..." />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => { setShowCreateModal(false); setNewReport({ name: '', report_type: '', description: '' }); }}
                  className="px-4 py-2 text-sm text-muted hover:text-heading transition-colors">Cancel</button>
                <button onClick={handleCreate} disabled={saving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
                  {saving ? 'Creating...' : 'Create Report'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
}
