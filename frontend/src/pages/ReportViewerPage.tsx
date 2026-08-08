import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { reportingApi } from '../api/client';
import type { ReportResult, SavedReport } from '../api/client';
import Layout from '../components/Layout';
import SearchableSelect from '../components/SearchableSelect';
import { useToast } from '../contexts/ToastContext';

const TYPE_CONFIG: Record<string, {
  title: string;
  filters: { key: string; label: string; options?: string[] }[];
}> = {
  orders: {
    title: 'Order Reports',
    filters: [{ key: 'status', label: 'Status', options: ['draft', 'confirmed', 'in_production', 'shipped', 'completed'] }],
  },
  production: {
    title: 'Production Reports',
    filters: [
      { key: 'start_date', label: 'Start Date' },
      { key: 'end_date', label: 'End Date' },
    ],
  },
  commercial: {
    title: 'Commercial Reports',
    filters: [{ key: 'lc_type', label: 'LC Type', options: ['master', 'b2b'] }],
  },
  quality: {
    title: 'Quality Reports',
    filters: [{ key: 'inspection_type', label: 'Inspection Type', options: ['inline', 'final', 'pre shipment', 'during production'] }],
  },
  inventory: {
    title: 'Inventory Reports',
    filters: [],
  },
  financial: {
    title: 'Financial Reports',
    filters: [],
  },
};

export default function ReportViewerPage() {
  const { type } = useParams<{ type: string }>();
  const { toast } = useToast();
  const config = TYPE_CONFIG[type || ''] || { title: 'Reports', filters: [] };

  const [filters, setFilters] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [savedReport, setSavedReport] = useState<SavedReport | null>(null);
  const [saving, setSaving] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');

  useEffect(() => {
    if (!type) return;
    reportingApi.getReports({ report_type: type, page_size: '1' })
      .then(res => {
        if (res.data.results.length > 0) setSavedReport(res.data.results[0]);
      })
      .catch(() => {});
  }, [type]);

  const handleRun = async () => {
    if (!type) return;
    setLoading(true);
    try {
      if (savedReport) {
        const res = await reportingApi.executeReport(savedReport.id);
        setResult(res.data);
      } else {
        const created = await reportingApi.createReport({
          name: `Quick ${config.title}`,
          report_type: type,
          config: { filters },
        });
        const reportId = (created.data as SavedReport).id;
        const res = await reportingApi.executeReport(reportId);
        setResult(res.data);
        setSavedReport((created.data as SavedReport));
      }
    } catch { toast('error', 'Failed to run report'); } finally { setLoading(false); }
  };

  const handleExport = async () => {
    if (!savedReport) { toast('error', 'Save the report first'); return; }
    try {
      const res = await reportingApi.exportReport(savedReport.id);
      const url = window.URL.createObjectURL(new Blob([res.data as BlobPart]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${savedReport.name || 'report'}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch { toast('error', 'Export failed'); }
  };

  const handleSave = async () => {
    if (!saveName || !type) { toast('error', 'Name required'); return; }
    setSaving(true);
    try {
      const res = await reportingApi.createReport({
        name: saveName,
        description: saveDesc,
        report_type: type,
        config: { filters },
      });
      setSavedReport(res.data as SavedReport);
      toast('success', 'Report saved');
      setShowSaveModal(false);
      setSaveName('');
      setSaveDesc('');
    } catch { toast('error', 'Failed to save'); } finally { setSaving(false); }
  };

  return (
    <Layout>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{config.title}</h1>
          {savedReport && <p className="text-muted text-sm mt-1">Using saved report: {savedReport.name}</p>}
        </div>

        {/* Filter Bar */}
        {config.filters.length > 0 && (
          <div className="bg-surface rounded-xl border border-border p-4 mb-6">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-sm text-muted font-medium">Filters:</span>
              {config.filters.map((f) => (
                <div key={f.key} className="flex items-center gap-2">
                  <label className="text-xs text-faint">{f.label}</label>
                  {f.options ? (
                    <SearchableSelect
                      options={f.options.map(o => ({ value: o, label: o.charAt(0).toUpperCase() + o.slice(1).replace('_', ' ') }))}
                      value={filters[f.key] || null}
                      onChange={(v) => setFilters(p => {
                        const next = { ...p };
                        if (v) next[f.key] = String(v); else delete next[f.key];
                        return next;
                      })}
                      placeholder={`All ${f.label}s`}
                    />
                  ) : f.key === 'start_date' || f.key === 'end_date' ? (
                    <input type="date" value={filters[f.key] || ''}
                      onChange={(e) => setFilters(p => {
                        const next = { ...p };
                        if (e.target.value) next[f.key] = e.target.value; else delete next[f.key];
                        return next;
                      })}
                      className="px-3 py-1.5 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                  ) : (
                    <input type="text" value={filters[f.key] || ''}
                      onChange={(e) => setFilters(p => {
                        const next = { ...p };
                        if (e.target.value) next[f.key] = e.target.value; else delete next[f.key];
                        return next;
                      })}
                      className="px-3 py-1.5 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder={`Filter by ${f.label}...`} />
                  )}
                </div>
              ))}
              <button onClick={handleRun} disabled={loading}
                className="ml-auto px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
                {loading ? 'Running...' : 'Run Report'}
              </button>
            </div>
          </div>
        )}

        {config.filters.length === 0 && (
          <div className="flex items-center gap-3 mb-6">
            <button onClick={handleRun} disabled={loading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
              {loading ? 'Running...' : 'Run Report'}
            </button>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-6 py-3 border-b border-border">
              <span className="text-sm text-muted">{result.count} results</span>
              <div className="flex gap-2">
                <button onClick={handleExport}
                  className="px-3 py-1 bg-surface-alt hover:bg-surface text-heading rounded text-xs transition-colors">
                  Export CSV
                </button>
                <button onClick={() => setShowSaveModal(true)}
                  className="px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded text-xs transition-colors">
                  Save Report
                </button>
              </div>
            </div>
            {result.rows.length === 0 ? (
              <div className="text-center py-12 text-muted">No data found for the selected filters</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left text-sm text-muted">
                      {result.columns.map(col => (
                        <th key={col} className="px-6 py-3">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, idx) => (
                      <tr key={idx} className="border-b border-border hover:bg-surface-alt/30 transition-colors">
                        {result.columns.map(col => (
                          <td key={col} className="px-6 py-3 text-sm text-body">
                            {row[col] != null ? String(row[col]) : '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {!result && !loading && (
          <div className="bg-surface rounded-xl border border-border p-12 text-center text-muted">
            <svg className="w-12 h-12 mx-auto mb-4 text-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg">Click "Run Report" to generate results</p>
            <p className="text-sm mt-1 text-faint">Configure filters above to refine your data</p>
          </div>
        )}

        {/* Save Modal */}
        {showSaveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-md shadow-2xl">
              <h2 className="text-lg font-semibold mb-4">Save Report</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-muted mb-1">Report Name</label>
                  <input type="text" value={saveName} onChange={(e) => setSaveName(e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="e.g. Weekly PO Summary" />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Description (optional)</label>
                  <textarea value={saveDesc} onChange={(e) => setSaveDesc(e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    rows={2} placeholder="Brief description..." />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => { setShowSaveModal(false); setSaveName(''); setSaveDesc(''); }}
                  className="px-4 py-2 text-sm text-muted hover:text-heading transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={saving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
}
