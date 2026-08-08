import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportingApi } from '../api/client';
import type { ReportResult } from '../api/client';
import Layout from '../components/Layout';
import SearchableSelect from '../components/SearchableSelect';
import { useToast } from '../contexts/ToastContext';

const DATA_SOURCES = [
  { value: 'orders', label: 'Orders' },
  { value: 'production', label: 'Production' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'quality', label: 'Quality' },
  { value: 'costings', label: 'Costings' },
];

const SOURCE_COLUMNS: Record<string, string[]> = {
  orders: ['po_number', 'buyer', 'factory', 'delivery_date', 'quantity', 'unit_price', 'total_value', 'status'],
  production: ['po_number', 'factory', 'production_date', 'target_quantity', 'actual_quantity', 'passed_quantity', 'rejected_quantity', 'efficiency', 'dhu', 'status'],
  commercial: ['lc_number', 'lc_type', 'buyer', 'bank', 'amount', 'currency', 'issued_date', 'expiry_date', 'status', 'utilized_amount', 'balance_amount'],
  quality: ['po_number', 'factory', 'inspection_type', 'inspection_date', 'aql_level', 'sample_size', 'passed_quantity', 'rejected_quantity', 'status'],
  costings: ['po_number', 'fabric_cost', 'trim_cost', 'cm_cost', 'overhead_cost', 'total_cost', 'status'],
};

const STEPS = ['Data Source', 'Columns', 'Filters', 'Preview', 'Save'];

export default function ReportBuilderPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [dataSource, setDataSource] = useState('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<{ key: string; value: string }[]>([]);
  const [preview, setPreview] = useState<ReportResult | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [reportName, setReportName] = useState('');
  const [reportDesc, setReportDesc] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [saving, setSaving] = useState(false);

  const columns = SOURCE_COLUMNS[dataSource] || [];

  const handlePreview = async () => {
    if (!dataSource) return;
    setLoadingPreview(true);
    try {
      const filterObj: Record<string, string> = {};
      filters.forEach(f => { if (f.key && f.value) filterObj[f.key] = f.value; });
      const created = await reportingApi.createReport({
        name: `Preview ${dataSource}`,
        report_type: dataSource,
        config: { columns: selectedColumns.length > 0 ? selectedColumns : undefined, filters: filterObj },
      });
      const res = await reportingApi.executeReport((created.data as { id: string }).id);
      setPreview(res.data);
      setStep(3);
    } catch { toast('error', 'Failed to generate preview'); } finally { setLoadingPreview(false); }
  };

  const handleSave = async () => {
    if (!reportName || !dataSource) { toast('error', 'Name and data source required'); return; }
    setSaving(true);
    try {
      const filterObj: Record<string, string> = {};
      filters.forEach(f => { if (f.key && f.value) filterObj[f.key] = f.value; });
      await reportingApi.createReport({
        name: reportName,
        description: reportDesc,
        report_type: dataSource,
        config: { columns: selectedColumns.length > 0 ? selectedColumns : undefined, filters: filterObj },
        is_scheduled: isScheduled,
      });
      toast('success', 'Report saved successfully');
      navigate('/reports');
    } catch { toast('error', 'Failed to save report'); } finally { setSaving(false); }
  };

  const addFilter = () => setFilters(p => [...p, { key: '', value: '' }]);
  const updateFilter = (i: number, field: 'key' | 'value', val: string) => {
    setFilters(p => p.map((f, idx) => idx === i ? { ...f, [field]: val } : f));
  };
  const removeFilter = (i: number) => setFilters(p => p.filter((_, idx) => idx !== i));

  const toggleColumn = (col: string) => {
    setSelectedColumns(p => p.includes(col) ? p.filter(c => c !== col) : [...p, col]);
  };

  return (
    <Layout>
      <main className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-6">Report Builder</h1>

        {/* Progress Steps */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <button onClick={() => i <= step ? setStep(i) : undefined}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors
                  ${i === step ? 'bg-emerald-600 text-white' : i < step ? 'bg-surface-alt text-emerald-400' : 'bg-surface text-faint'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
                  ${i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-white text-emerald-600' : 'bg-surface-alt text-muted'}`}>
                  {i < step ? '✓' : i + 1}
                </span>
                {s}
              </button>
              {i < STEPS.length - 1 && <div className={`w-8 h-px ${i < step ? 'bg-emerald-500' : 'bg-surface-alt'}`} />}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-surface rounded-xl border border-border p-6">
          {step === 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Select Data Source</h2>
              <div className="max-w-sm">
                <SearchableSelect options={DATA_SOURCES} value={dataSource || null}
                  onChange={(v) => { setDataSource(String(v || '')); setSelectedColumns([]); setFilters([]); }}
                  placeholder="Choose a data source..." />
              </div>
              {dataSource && (
                <button onClick={() => setStep(1)}
                  className="mt-6 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
                  Next: Select Columns →
                </button>
              )}
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Select Columns</h2>
              <p className="text-sm text-muted mb-4">Choose which columns to include in the report. Leave all unchecked for all columns.</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {columns.map(col => (
                  <button key={col} onClick={() => toggleColumn(col)}
                    className={`px-4 py-3 rounded-lg border text-sm text-left transition-all
                      ${selectedColumns.includes(col)
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                        : 'border-input-border bg-input text-body hover:border-input-border'}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center
                        ${selectedColumns.includes(col) ? 'bg-emerald-500 border-emerald-500' : 'border-border'}`}>
                        {selectedColumns.includes(col) && <span className="text-white text-xs">✓</span>}
                      </div>
                      {col}
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(0)}
                  className="px-4 py-2 text-sm text-muted hover:text-heading transition-colors">← Back</button>
                <button onClick={() => setStep(2)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
                  Next: Filters →
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Filters</h2>
              <p className="text-sm text-muted mb-4">Add filters to narrow down results. Leave empty for all data.</p>
              <div className="space-y-3">
                {filters.map((f, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <SearchableSelect
                      options={columns.map(c => ({ value: c, label: c }))}
                      value={f.key || null}
                      onChange={(v) => updateFilter(i, 'key', String(v || ''))}
                      placeholder="Column..." />
                    <input type="text" value={f.value} onChange={(e) => updateFilter(i, 'value', e.target.value)}
                      className="flex-1 px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="Value..." />
                    <button onClick={() => removeFilter(i)}
                      className="px-2 py-2 text-red-400 hover:text-red-300 transition-colors">✕</button>
                  </div>
                ))}
              </div>
              <button onClick={addFilter}
                className="mt-4 px-3 py-1.5 bg-surface-alt hover:bg-surface text-heading rounded-lg text-sm transition-colors">
                + Add Filter
              </button>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(1)}
                  className="px-4 py-2 text-sm text-muted hover:text-heading transition-colors">← Back</button>
                <button onClick={handlePreview} disabled={loadingPreview}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
                  {loadingPreview ? 'Generating...' : 'Preview Report →'}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Preview</h2>
              {preview && preview.rows.length > 0 ? (
                <div className="overflow-x-auto mb-4">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border text-left text-sm text-muted">
                        {preview.columns.map(col => (
                          <th key={col} className="px-4 py-2">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.map((row, idx) => (
                        <tr key={idx} className="border-b border-border hover:bg-surface-alt/30">
                          {preview.columns.map(col => (
                            <td key={col} className="px-4 py-2 text-sm text-body">
                              {row[col] != null ? String(row[col]) : '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted text-sm mb-4">No results found</p>
              )}
              <p className="text-sm text-faint mb-4">{preview?.count || 0} total rows</p>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)}
                  className="px-4 py-2 text-sm text-muted hover:text-heading transition-colors">← Back</button>
                <button onClick={() => setStep(4)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
                  Next: Save →
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Save Report</h2>
              <div className="max-w-md space-y-4">
                <div>
                  <label className="block text-sm text-muted mb-1">Report Name *</label>
                  <input type="text" value={reportName} onChange={(e) => setReportName(e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="e.g. Monthly Production Summary" />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Description</label>
                  <textarea value={reportDesc} onChange={(e) => setReportDesc(e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    rows={2} placeholder="Optional description..." />
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="scheduled" checked={isScheduled} onChange={(e) => setIsScheduled(e.target.checked)}
                    className="w-4 h-4 rounded bg-input border-input-border text-emerald-500 focus:ring-emerald-500" />
                  <label htmlFor="scheduled" className="text-sm text-body">Enable scheduling</label>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(3)}
                  className="px-4 py-2 text-sm text-muted hover:text-heading transition-colors">← Back</button>
                <button onClick={handleSave} disabled={saving || !reportName}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
                  {saving ? 'Saving...' : 'Save Report'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </Layout>
  );
}
