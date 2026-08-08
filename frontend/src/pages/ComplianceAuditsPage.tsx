import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { merchApi, qualityApi } from '../api/client';
import type { ComplianceAudit, ComplianceAuditChecklistItem, ComplianceAuditOverview } from '../api/client';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import SearchableSelect from '../components/SearchableSelect';
import { useToast } from '../contexts/ToastContext';
import Layout from '../components/Layout';

const STATUS_COLORS: Record<string, string> = {
  pass: 'bg-emerald-500/20 text-badge-emerald',
  fail: 'bg-red-500/20 text-badge-red',
  na: 'bg-surface-alt/20 text-muted',
};

const STATUS_OPTIONS = [
  { value: 'na', label: 'N/A' },
  { value: 'pass', label: 'Pass' },
  { value: 'fail', label: 'Fail' },
];

const FALLBACK_CHECKLIST: ComplianceAuditChecklistItem[] = [
  { key: 'fabric_paperwork', label: 'Fabric paperwork' },
  { key: 'mini_marker_efficiency', label: 'Mini-marker efficiency' },
  { key: 'dockets', label: 'Dockets' },
  { key: 'fabric_utilisation', label: 'Fabric utilisation' },
  { key: 'factory_invoice', label: 'Factory invoice' },
  { key: 'fabric_rating', label: 'Fabric rating' },
  { key: 'recon_costed_vs_actual', label: 'Recon costed vs actual' },
  { key: 'final_hits', label: 'Final hits' },
];

const STORED_ITEM_KEYS = [
  'fabric_paperwork', 'dockets', 'fabric_utilisation', 'factory_invoice',
  'fabric_rating', 'recon_costed_vs_actual', 'final_hits',
];

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function currentMonday(): string {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return fmtDate(monday);
}

function labelFor(checklist: ComplianceAuditChecklistItem[], key: string): string {
  return checklist.find((item) => item.key === key)?.label ?? key;
}

export default function ComplianceAuditsPage() {
  const { toast } = useToast();
  const [overview, setOverview] = useState<ComplianceAuditOverview | null>(null);
  const [week, setWeek] = useState(currentMonday());
  const [loading, setLoading] = useState(true);
  const [resultFilter, setResultFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pos, setPos] = useState<{ value: string; label: string }[]>([]);

  const [form, setForm] = useState<Record<string, string>>({
    purchase_order: '', week_start: currentMonday(), efficiency_rate: '',
    fabric_paperwork_status: 'na', dockets_status: 'na', fabric_utilisation_status: 'na',
    factory_invoice_status: 'na', fabric_rating_status: 'na',
    recon_costed_vs_actual_status: 'na', final_hits_status: 'na', notes: '',
  });

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { week };
      if (resultFilter) params.result = resultFilter;
      const res = await qualityApi.getComplianceWeeklyOverview(params);
      setOverview(res.data);
    } catch {
      toast('error', 'Failed to load compliance audit overview');
    } finally { setLoading(false); }
  }, [week, resultFilter, toast]);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);

  useEffect(() => {
    merchApi.getPOs({ page_size: '100' }).then((r) => {
      setPos(r.data.results.map((po) => ({
        value: po.id,
        label: `${po.po_number} (${po.buyer_name || po.buyer})`,
      })));
    }).catch(() => {});
  }, []);

  const checklist = overview?.checklist ?? FALLBACK_CHECKLIST;

  const openCreate = () => {
    setEditingId(null);
    setForm({ purchase_order: '', week_start: week, efficiency_rate: '',
      fabric_paperwork_status: 'na', dockets_status: 'na', fabric_utilisation_status: 'na',
      factory_invoice_status: 'na', fabric_rating_status: 'na',
      recon_costed_vs_actual_status: 'na', final_hits_status: 'na', notes: '' });
    setShowModal(true);
  };

  const openEdit = (audit: ComplianceAudit) => {
    setEditingId(audit.id);
    setForm({
      purchase_order: audit.purchase_order, week_start: audit.week_start,
      efficiency_rate: audit.efficiency_rate || '',
      fabric_paperwork_status: audit.fabric_paperwork_status, dockets_status: audit.dockets_status,
      fabric_utilisation_status: audit.fabric_utilisation_status,
      factory_invoice_status: audit.factory_invoice_status, fabric_rating_status: audit.fabric_rating_status,
      recon_costed_vs_actual_status: audit.recon_costed_vs_actual_status,
      final_hits_status: audit.final_hits_status, notes: audit.notes || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { ...form };
      if (!payload.efficiency_rate) delete payload.efficiency_rate;
      if (editingId) {
        await qualityApi.updateComplianceAudit(editingId, payload);
        toast('success', 'Compliance audit updated');
      } else {
        await qualityApi.createComplianceAudit(payload);
        toast('success', 'Compliance audit created');
      }
      setShowModal(false);
      setEditingId(null);
      fetchOverview();
    } catch {
      toast('error', editingId ? 'Failed to update compliance audit' : 'Failed to create compliance audit');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await qualityApi.deleteComplianceAudit(id);
      setDeleteId(null);
      toast('success', 'Compliance audit deleted');
      fetchOverview();
    } catch { toast('error', 'Failed to delete compliance audit'); }
  };

  const handleExport = async () => {
    try {
      const res = await qualityApi.exportComplianceAudits({ week });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance_audits_${week}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch { toast('error', 'Failed to export compliance audit CSV'); }
  };

  const statusFor = (audit: ComplianceAudit, key: string): string => {
    if (key === 'mini_marker_efficiency') return audit.mini_marker_efficiency_status;
    return String((audit as unknown as Record<string, string>)[`${key}_status`] ?? 'na');
  };

  const checklistColumns: Column[] = checklist.map((item) => ({
    key: `check_${item.key}`,
    label: item.label,
    sortable: false,
    render: (_v, row) => {
      const audit = (overview?.results ?? []).find((a) => String(a.id) === String(row.id));
      if (!audit) return null;
      const value = statusFor(audit, item.key);
      return (
        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[value] || ''}`}>
          {value.toUpperCase()}
        </span>
      );
    },
  }));

  const columns: Column[] = [
    { key: 'po_number', label: 'PO #', sortable: true, render: (v) => <span className="font-mono text-heading">{String(v)}</span> },
    { key: 'buyer_name', label: 'Buyer', sortable: true, render: (v) => <span className="text-body">{String(v)}</span> },
    { key: 'style_number', label: 'Style', sortable: false, render: (v) => <span className="font-mono text-faint">{v ? String(v) : '-'}</span> },
    { key: 'delivery_date', label: 'Delivery', sortable: false, render: (v) => <span>{v ? String(v) : '-'}</span> },
    { key: 'efficiency_rate', label: 'Efficiency %', sortable: false, render: (v, row) => {
      const audit = (overview?.results ?? []).find((a) => String(a.id) === String(row.id));
      const met = audit?.efficiency_met;
      const color = met === false ? 'text-red-500' : met === true ? 'text-emerald-500' : 'text-muted';
      return <span className={color}>{v ? `${String(v)}%` : '-'}</span>;
    } },
    ...checklistColumns,
    { key: 'overall_pass', label: 'Overall', sortable: false, render: (_v, row) => {
      const audit = (overview?.results ?? []).find((a) => String(a.id) === String(row.id));
      if (!audit) return null;
      if (!audit.reviewed) return <span className="px-2 py-1 rounded-full text-xs font-medium bg-surface-alt/20 text-muted">Not reviewed</span>;
      return audit.overall_pass
        ? <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-badge-emerald">PASS</span>
        : <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-badge-red">FAIL</span>;
    } },
    { key: 'warning_label', label: 'Warnings', sortable: false, render: (v) => {
      const value = String(v || '');
      const color = value === 'No warnings' ? 'text-muted' : value === '1st warning' ? 'text-amber-500' : 'text-red-500';
      return <span className={color}>{value}</span>;
    } },
    { key: 'id', label: 'Actions', className: 'text-right', render: (_v, row) => {
      const audit = (overview?.results ?? []).find((a) => String(a.id) === String(row.id));
      return (
        <div className="flex justify-end gap-3">
          <button onClick={(e) => { e.stopPropagation(); if (audit) openEdit(audit); }}
            className="text-sm text-heading hover:text-emerald-500">Edit</button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteId(String(row.id)); }}
            className="text-sm text-red-500 hover:text-red-400">Delete</button>
        </div>
      );
    } },
  ];

  const summary = overview?.summary;
  const summaryCards = [
    { label: 'Total Orders', value: summary?.total_orders ?? 0, color: 'text-heading' },
    { label: 'Audited', value: summary?.audited ?? 0, color: 'text-blue-500' },
    { label: 'Pass', value: summary?.pass ?? 0, color: 'text-emerald-500' },
    { label: 'Fail', value: summary?.fail ?? 0, color: 'text-red-500' },
    { label: 'Not Reviewed', value: summary?.incomplete ?? 0, color: 'text-muted' },
    { label: 'Pending (no audit)', value: summary?.pending ?? 0, color: 'text-amber-500' },
  ];

  return (
    <Layout>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Compliance Audit</h1>
            <p className="text-muted text-sm mt-1">Weekly order review against the 8 compliance items (mini-marker efficiency must be above {overview?.threshold ?? 85}%)</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setWeek(currentMonday())} className="px-3 py-2 text-sm text-body hover:text-heading transition-colors">This Week</button>
            <button onClick={handleExport} className="px-4 py-2 bg-surface-alt/40 hover:bg-surface-alt/70 text-heading rounded-lg text-sm transition-colors">Export CSV</button>
            <button onClick={openCreate} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
              + New Audit
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div>
            <label className="block text-xs text-muted mb-1">Audit Week (Monday)</label>
            <input type="date" value={week} onChange={(e) => setWeek(e.target.value)}
              className="px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Result</label>
            <SearchableSelect
              options={[{ value: '', label: 'All results' }, { value: 'pass', label: 'Pass' }, { value: 'fail', label: 'Fail' }, { value: 'pending', label: 'Not reviewed' }]}
              value={resultFilter}
              onChange={(v) => setResultFilter(String(v || ''))}
              placeholder="All results"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {summaryCards.map((card) => (
            <div key={card.label} className="bg-surface rounded-xl border border-border p-4">
              <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
              <div className="text-xs text-muted mt-1">{card.label}</div>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <DataTable
            data={(overview?.results ?? []) as unknown as Record<string, unknown>[]}
            columns={columns}
            totalCount={overview?.results.length ?? 0}
            page={1}
            pageSize={Math.max(overview?.results.length ?? 0, 1)}
            onPageChange={() => {}}
            loading={loading}
          />
        </div>

        {overview && overview.pending_orders.length > 0 && (
          <div className="mt-6 bg-surface rounded-xl border border-border p-5">
            <h2 className="text-sm font-bold text-heading mb-3">Orders Not Yet Audited This Week ({overview.pending_orders.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {overview.pending_orders.map((po) => (
                <div key={po.po_id} className="flex items-center justify-between rounded-lg bg-surface-alt/20 px-4 py-3">
                  <div>
                    <div className="font-mono text-sm text-heading">{po.po_number}</div>
                    <div className="text-xs text-muted">{po.buyer_name} · Delivery {po.delivery_date}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-bold mb-4">{editingId ? 'Edit Compliance Audit' : 'New Compliance Audit'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-body mb-1">Purchase Order *</label>
                    <SearchableSelect options={pos} value={form.purchase_order}
                      onChange={(v) => setForm({ ...form, purchase_order: String(v || '') })}
                      placeholder="Select purchase order" required />
                  </div>
                  <div>
                    <label className="block text-sm text-body mb-1">Week Start (Monday)</label>
                    <input type="date" value={form.week_start} onChange={(e) => setForm({ ...form, week_start: e.target.value })}
                      className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Mini-Marker Efficiency Rate (%)</label>
                  <input type="number" min="0" max="100" step="0.01" value={form.efficiency_rate}
                    onChange={(e) => setForm({ ...form, efficiency_rate: e.target.value })}
                    placeholder="e.g. 88 (must be above 85%)"
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {STORED_ITEM_KEYS.map((key) => (
                    <div key={key}>
                      <label className="block text-sm text-body mb-1">{labelFor(checklist, key)}</label>
                      <SearchableSelect options={STATUS_OPTIONS} value={form[`${key}_status`] || 'na'}
                        onChange={(v) => setForm({ ...form, [`${key}_status`]: String(v || 'na') })}
                        placeholder="Select status" />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Notes</label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" rows={3} />
                </div>
                <div className="flex justify-end gap-3 mt-4">
                  <button type="button" onClick={() => { setShowModal(false); setEditingId(null); }} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
                  <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white text-sm rounded-lg transition-colors">
                    {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {deleteId && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-sm">
              <h2 className="text-lg font-bold mb-2">Delete Compliance Audit?</h2>
              <p className="text-muted text-sm mb-4">This action cannot be undone.</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-body hover:text-heading">Cancel</button>
                <button onClick={() => handleDelete(deleteId)} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg">Delete</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
}
