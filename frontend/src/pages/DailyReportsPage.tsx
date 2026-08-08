import { useState, useEffect, type FormEvent } from 'react';
import { productionApi, setupApi, merchApi } from '../api/client';
import type { DailyProduction } from '../api/client';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import SearchableSelect from '../components/SearchableSelect';
import { useToast } from '../contexts/ToastContext';
import Layout from '../components/Layout';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-blue-500/20 text-badge-blue',
  approved: 'bg-emerald-500/20 text-badge-emerald',
  draft: 'bg-surface-alt/20 text-muted',
};

function efficiencyColor(val: number | null): string {
  if (val === null) return 'text-muted';
  if (val > 80) return 'text-emerald-400';
  if (val > 60) return 'text-amber-400';
  return 'text-red-400';
}

export default function DailyReportsPage() {
  const { toast } = useToast();
  const [reports, setReports] = useState<DailyProduction[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('production_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showModal, setShowModal] = useState(false);
  const [editingReport, setEditingReport] = useState<DailyProduction | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [factories, setFactories] = useState<{ value: string; label: string }[]>([]);
  const [pos, setPOs] = useState<{ value: string; label: string }[]>([]);

  const [form, setForm] = useState({
    factory: '',
    purchase_order: '',
    production_date: '',
    line_number: '',
    target_quantity: '',
    actual_quantity: '',
    passed_quantity: '',
    rejected_quantity: '',
    manpower: '',
    working_hours: '',
    remarks: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), page_size: '25' };
      if (search) params.search = search;
      params.ordering = sortOrder === 'desc' ? `-${sortField}` : sortField;
      const res = await productionApi.getDailyReports(params);
      setReports(res.data.results);
      setCount(res.data.count);
    } catch { toast('error', 'Failed to load daily reports'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [search, page, sortField, sortOrder]);

  useEffect(() => {
    setupApi.getFactories({ page_size: '500' }).then(r => {
      setFactories(r.data.results.map(f => ({ value: f.id, label: f.name })));
    }).catch(() => {}); // Silently ignore - secondary dropdown data
    merchApi.getPOs({ page_size: '500' }).then(r => {
      setPOs(r.data.results.map(p => ({ value: p.id, label: p.po_number })));
    }).catch(() => {}); // Silently ignore - secondary dropdown data
  }, []);

  const openCreate = () => {
    setEditingReport(null);
    setForm({ factory: '', purchase_order: '', production_date: '', line_number: '', target_quantity: '', actual_quantity: '', passed_quantity: '', rejected_quantity: '', manpower: '', working_hours: '', remarks: '' });
    setShowModal(true);
  };

  const openEdit = (report: DailyProduction) => {
    setEditingReport(report);
    setForm({
      factory: report.factory,
      purchase_order: report.purchase_order,
      production_date: report.production_date,
      line_number: String(report.line_number ?? ''),
      target_quantity: String(report.target_quantity ?? ''),
      actual_quantity: String(report.actual_quantity),
      passed_quantity: String(report.passed_quantity),
      rejected_quantity: String(report.rejected_quantity),
      manpower: String(report.manpower ?? ''),
      working_hours: String(report.working_hours ?? ''),
      remarks: '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        factory: form.factory,
        purchase_order: form.purchase_order,
        production_date: form.production_date,
        actual_quantity: Number(form.actual_quantity),
        passed_quantity: Number(form.passed_quantity),
        rejected_quantity: Number(form.rejected_quantity),
      };
      if (form.line_number) payload.line_number = Number(form.line_number);
      if (form.target_quantity) payload.target_quantity = Number(form.target_quantity);
      if (form.manpower) payload.manpower = Number(form.manpower);
      if (form.working_hours) payload.working_hours = Number(form.working_hours);

      if (editingReport) {
        await productionApi.updateDailyReport(editingReport.id, payload);
        toast('success', 'Report updated');
      } else {
        await productionApi.createDailyReport(payload);
        toast('success', 'Report created');
      }
      setShowModal(false);
      fetchData();
    } catch { toast('error', editingReport ? 'Failed to update report' : 'Failed to create report'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await productionApi.deleteDailyReport(id); setDeleteId(null); toast('success', 'Report deleted'); fetchData(); } catch { toast('error', 'Failed to delete report'); }
  };

  const handleSort = (field: string, order: 'asc' | 'desc') => { setSortField(field); setSortOrder(order); };

  const columns: Column[] = [
    { key: 'production_date', label: 'Date', sortable: true },
    { key: 'po_number', label: 'PO #', sortable: true, render: (v) => <span className="font-mono text-emerald-700">{String(v)}</span> },
    { key: 'factory_name', label: 'Factory', sortable: true },
    { key: 'line_number', label: 'Line', sortable: true, render: (v) => v !== null && v !== undefined ? String(v) : <span className="text-faint">-</span> },
    { key: 'target_quantity', label: 'Target / Actual', sortable: false, className: 'text-right', render: (_v, row) => (
      <span className="text-right block">{String(row.target_quantity ?? '-')} / {String(row.actual_quantity)}</span>
    )},
    { key: 'passed_quantity', label: 'Passed / Rejected', sortable: false, className: 'text-right', render: (_v, row) => (
      <span className="text-right block">{String(row.passed_quantity)} / {String(row.rejected_quantity)}</span>
    )},
    { key: 'efficiency', label: 'Efficiency %', sortable: true, className: 'text-right', render: (v) => (
      <span className={`text-right block ${efficiencyColor(v as number | null)}`}>{v !== null ? `${Number(v).toFixed(1)}%` : '-'}</span>
    )},
    { key: 'dhu', label: 'DHU %', sortable: true, className: 'text-right', render: (v) => (
      <span className="text-right block">{v !== null ? `${Number(v).toFixed(2)}%` : '-'}</span>
    )},
    { key: 'status', label: 'Status', sortable: true,
      render: (v) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[String(v)] || ''}`}>{String(v)}</span> },
    { key: 'id', label: 'Actions', className: 'text-right', render: (_v, row) => (
      <div className="flex justify-end gap-3">
        <button onClick={(e) => { e.stopPropagation(); openEdit(row as unknown as DailyProduction); }} className="text-sm text-blue-700 hover:text-blue-600">Edit</button>
        <button onClick={(e) => { e.stopPropagation(); setDeleteId(String(row.id)); }} className="text-sm text-red-700 hover:text-red-600">Delete</button>
      </div>
    )},
  ];

  return (
    <Layout>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Daily Production Reports</h1>
            <p className="text-muted text-sm mt-1">{count} total reports</p>
          </div>
          <button onClick={openCreate} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-heading rounded-lg text-sm font-medium transition-colors">
            + New Report
          </button>
        </div>

        <DataTable
          data={reports as unknown as Record<string, unknown>[]}
          columns={columns}
          totalCount={count}
          page={page}
          pageSize={25}
          onPageChange={setPage}
          searchValue={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          searchPlaceholder="Search reports..."
          onSort={handleSort}
          sortField={sortField}
          sortOrder={sortOrder}
          loading={loading}
        />
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">{editingReport ? 'Edit Report' : 'New Daily Report'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-body mb-1">Factory *</label>
                  <SearchableSelect
                    options={factories}
                    value={form.factory}
                    onChange={(v) => setForm({ ...form, factory: String(v || '') })}
                    placeholder="Select factory"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Purchase Order *</label>
                  <SearchableSelect
                    options={pos}
                    value={form.purchase_order}
                    onChange={(v) => setForm({ ...form, purchase_order: String(v || '') })}
                    placeholder="Select PO"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-body mb-1">Date *</label>
                  <input required type="date" value={form.production_date} onChange={(e) => setForm({ ...form, production_date: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Line #</label>
                  <input type="number" min="0" value={form.line_number} onChange={(e) => setForm({ ...form, line_number: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="1" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Target</label>
                  <input type="number" min="0" value={form.target_quantity} onChange={(e) => setForm({ ...form, target_quantity: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-body mb-1">Actual Qty *</label>
                  <input required type="number" min="0" value={form.actual_quantity} onChange={(e) => setForm({ ...form, actual_quantity: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Passed *</label>
                  <input required type="number" min="0" value={form.passed_quantity} onChange={(e) => setForm({ ...form, passed_quantity: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Rejected *</label>
                  <input required type="number" min="0" value={form.rejected_quantity} onChange={(e) => setForm({ ...form, rejected_quantity: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-body mb-1">Manpower</label>
                  <input type="number" min="0" value={form.manpower} onChange={(e) => setForm({ ...form, manpower: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Working Hours</label>
                  <input type="number" min="0" step="0.5" value={form.working_hours} onChange={(e) => setForm({ ...form, working_hours: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Remarks</label>
                <textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" rows={2} />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-heading text-sm rounded-lg transition-colors">
                  {saving ? 'Saving...' : editingReport ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2">Delete Report?</h2>
            <p className="text-muted text-sm mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-body hover:text-heading">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-heading text-sm rounded-lg">Delete</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
