import { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import SearchableSelect from '../components/SearchableSelect';
import { merchApi, usersApi } from '../api/client';
import type { JobRequest, JobDashboard, UnsoldAnalysisResponse, Style, PurchaseOrder, User } from '../api/client';
import type { Column } from '../components/DataTable';
import { useToast } from '../contexts/ToastContext';

const TYPE_LABELS: Record<string, string> = { pattern: 'Pattern', sample: 'Sample', '3d': '3D', mini_marker: 'Mini-Marker' };
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/20 text-badge-amber', in_progress: 'bg-blue-500/20 text-badge-blue',
  completed: 'bg-emerald-500/20 text-badge-emerald', cancelled: 'bg-red-500/20 text-badge-red',
};
const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-surface-alt/20 text-muted', normal: 'bg-blue-500/20 text-badge-blue',
  high: 'bg-amber-500/20 text-badge-amber', urgent: 'bg-red-500/20 text-badge-red',
};

const dateAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};
const INITIAL_ANALYSIS_FILTERS = { start_date: dateAgo(90), end_date: dateAgo(0), status: '' };

const INITIAL_FORM = {
  job_type: 'pattern', style: '', purchase_order: '', description: '', work_location: '',
  assigned_to: '', required_by_date: '', priority: '2', status: 'pending', notes: '',
};

export default function JobRequestsPage() {
  const { toast } = useToast();
  const [view, setView] = useState<'queue' | 'all' | 'analysis'>('queue');
  const [items, setItems] = useState<JobRequest[]>([]);
  const [dash, setDash] = useState<JobDashboard | null>(null);
  const [analysis, setAnalysis] = useState<UnsoldAnalysisResponse | null>(null);
  const [analysisFilters, setAnalysisFilters] = useState(INITIAL_ANALYSIS_FILTERS);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [styles, setStyles] = useState<Style[]>([]);
  const [pos, setPOs] = useState<PurchaseOrder[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const pageSize = 10;

  useEffect(() => { load(); }, [view]);
  useEffect(() => { setPage(1); }, [search]);
  useEffect(() => {
    merchApi.getJobDashboard().then(r => setDash(r.data)).catch(() => {});
    merchApi.getStyles({ page_size: '200' }).then(r => setStyles(r.data.results)).catch(() => {});
    merchApi.getPOs({ page_size: '100' }).then(r => setPOs(r.data.results)).catch(() => {});
    usersApi.getUsers({ page_size: '200' }).then(r => setUsers(r.data.results)).catch(() => {});
  }, []);

  const load = async () => {
    if (view === 'analysis') { loadAnalysis(); return; }
    setLoading(true);
    try {
      const res = view === 'queue' ? await merchApi.getJobQueue({ page_size: '200' }) : await merchApi.getJobRequests({ page_size: '200' });
      setItems(res.data.results);
    } catch { toast('error', 'Failed to load jobs');
    } finally { setLoading(false); }
  };

  const loadAnalysis = async () => {
    setAnalysisLoading(true);
    try {
      const params: Record<string, string> = { start_date: analysisFilters.start_date, end_date: analysisFilters.end_date };
      if (analysisFilters.status) params.status = analysisFilters.status;
      const res = await merchApi.getUnsoldAnalysis(params);
      setAnalysis(res.data);
    } catch { toast('error', 'Failed to load unsold analysis');
    } finally { setAnalysisLoading(false); }
  };

  const handleOpenModal = (item?: JobRequest) => {
    if (item) {
      setEditingId(item.id);
      setForm({
        job_type: item.job_type, style: item.style, purchase_order: item.purchase_order || '',
        description: item.description, work_location: item.work_location, assigned_to: item.assigned_to || '',
        required_by_date: item.required_by_date || '', priority: String(item.priority), status: item.status, notes: item.notes,
      });
    } else { setEditingId(null); setForm({ ...INITIAL_FORM }); }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.style || !form.job_type) { toast('warning', 'Style and job type are required'); return; }
    setSaving(true);
    try {
      const data: Record<string, unknown> = {
        job_type: form.job_type, style: form.style, purchase_order: form.purchase_order || null,
        description: form.description, work_location: form.work_location, assigned_to: form.assigned_to || null,
        required_by_date: form.required_by_date || null, priority: parseInt(form.priority, 10),
        status: form.status, notes: form.notes,
      };
      if (editingId) { await merchApi.updateJobRequest(editingId, data); toast('success', 'Job updated'); }
      else { await merchApi.createJobRequest(data); toast('success', 'Job created'); }
      setShowModal(false); load();
      merchApi.getJobDashboard().then(r => setDash(r.data)).catch(() => {});
    } catch { toast('error', 'Failed to save job');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => { setDeleteId(id); };
  const confirmDelete = async () => {
    if (!deleteId) return;
    try { await merchApi.deleteJobRequest(deleteId); toast('success', 'Job deleted'); setDeleteId(null); load(); }
    catch { toast('error', 'Failed to delete'); setDeleteId(null); }
  };

  const filtered = useMemo(() => items.filter(i =>
    i.job_number.toLowerCase().includes(search.toLowerCase()) ||
    i.style_number.toLowerCase().includes(search.toLowerCase()) ||
    i.description.toLowerCase().includes(search.toLowerCase())
  ), [items, search]);
  const pagedData = useMemo(() => { const s = (page - 1) * pageSize; return filtered.slice(s, s + pageSize); }, [filtered, page]);

  const columns: Column[] = [
    { key: 'job_number', label: 'Job #', sortable: true, render: (v) => <span className="font-mono text-heading">{String(v)}</span> },
    { key: 'job_type', label: 'Type', render: (_v, row) => <span className="text-body">{TYPE_LABELS[String(row.job_type)] || String(row.job_type)}</span> },
    { key: 'style_number', label: 'Style', sortable: true, render: (v) => <span className="font-mono text-body">{String(v)}</span> },
    { key: 'description', label: 'Description', render: (v) => <span className="text-muted">{v ? String(v).slice(0, 40) : '-'}</span> },
    { key: 'assigned_to_name', label: 'Assigned', render: (v) => v ? <span className="text-muted">{String(v)}</span> : <span className="text-red-400">Unassigned</span> },
    { key: 'required_by_date', label: 'Due', render: (v) => <span className="text-muted">{v ? String(v) : '-'}</span> },
    { key: 'priority', label: 'Priority', render: (_v, row) => {
      const label = String(row.priority_display).toLowerCase();
      return <span className={`px-2 py-1 rounded-full text-xs font-medium ${PRIORITY_COLORS[label] || 'bg-surface-alt text-muted'}`}>{String(row.priority_display)}</span>;
    }},
    { key: 'status', label: 'Status', render: (_v, row) => {
      const s = String(row.status);
      return <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[s] || 'bg-surface-alt text-muted'}`}>{String(row.status_display)}</span>;
    }},
    { key: 'actions', label: 'Actions', className: 'text-right', render: (_v, row) => {
      const item = row as unknown as JobRequest;
      return <><button onClick={(e) => { e.stopPropagation(); handleOpenModal(item); }} className="text-heading hover:text-emerald-500 mr-3 text-sm">Edit</button><button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="text-red-500 hover:text-red-400 text-sm">Delete</button></>;
    }},
  ];

  const stats = dash ? [
    { label: 'Total Jobs', value: dash.total, color: 'text-heading' },
    { label: 'Overdue', value: dash.overdue, color: 'text-red-400' },
    { label: 'Due This Week', value: dash.due_this_week, color: 'text-amber-400' },
    { label: 'Unassigned', value: dash.unassigned, color: 'text-orange-400' },
  ] : [];

  if (view !== 'analysis' && loading && items.length === 0) return <Layout><div className="p-6 flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" /></div></Layout>;

  const styleOptions = styles.map(s => ({ value: s.id, label: s.style_number, description: s.name }));
  const poOptions = pos.map(p => ({ value: p.id, label: p.po_number, description: p.buyer_name }));
  const userOptions = users.map(u => ({ value: u.id, label: u.full_name || u.username, description: u.email }));

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Job Requests</h1>
            <p className="text-sm text-muted mt-1">Cross-department job queue with priorities (GC-013 / GC-014)</p>
          </div>
          <div className="flex gap-2">
            <div className="flex bg-surface-alt/50 rounded-lg p-1">
              <button onClick={() => setView('queue')} className={`px-3 py-1.5 rounded-md text-sm transition-colors ${view === 'queue' ? 'bg-surface shadow text-heading' : 'text-muted hover:text-heading'}`}>Queue</button>
              <button onClick={() => setView('all')} className={`px-3 py-1.5 rounded-md text-sm transition-colors ${view === 'all' ? 'bg-surface shadow text-heading' : 'text-muted hover:text-heading'}`}>All Jobs</button>
              <button onClick={() => setView('analysis')} className={`px-3 py-1.5 rounded-md text-sm transition-colors ${view === 'analysis' ? 'bg-surface shadow text-heading' : 'text-muted hover:text-heading'}`}>Not Sold</button>
            </div>
            {view !== 'analysis' && (
            <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">+ New Job</button>
            )}
          </div>
        </div>

        {dash && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map(s => (
                <div key={s.label} className="bg-surface rounded-xl border border-border p-4">
                  <p className="text-sm text-muted">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-surface rounded-xl border border-border p-4">
                <p className="text-sm text-muted mb-2">By Status</p>
                <div className="space-y-1.5">
                  {Object.entries(dash.by_status).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm"><span className="text-body capitalize">{k.replace(/_/g, ' ')}</span><span className="font-mono text-heading">{v}</span></div>
                  ))}
                </div>
              </div>
              <div className="bg-surface rounded-xl border border-border p-4">
                <p className="text-sm text-muted mb-2">By Type</p>
                <div className="space-y-1.5">
                  {Object.entries(dash.by_type).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm"><span className="text-body capitalize">{TYPE_LABELS[k] || k}</span><span className="font-mono text-heading">{v}</span></div>
                  ))}
                </div>
              </div>
              <div className="bg-surface rounded-xl border border-border p-4">
                <p className="text-sm text-muted mb-2">By Priority</p>
                <div className="space-y-1.5">
                  {Object.entries(dash.by_priority).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm"><span className="text-body capitalize">{k}</span><span className="font-mono text-heading">{v}</span></div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {view === 'analysis' ? (
          <>
            <div className="bg-surface rounded-xl border border-border p-4 flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-sm text-muted mb-1">From</label>
                <input type="date" value={analysisFilters.start_date} onChange={(e) => setAnalysisFilters({ ...analysisFilters, start_date: e.target.value })} className="px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">To</label>
                <input type="date" value={analysisFilters.end_date} onChange={(e) => setAnalysisFilters({ ...analysisFilters, end_date: e.target.value })} className="px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Status</label>
                <select value={analysisFilters.status} onChange={(e) => setAnalysisFilters({ ...analysisFilters, status: e.target.value })} className="px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="">All</option>
                  <option value="not_sold">Not Sold</option>
                  <option value="sold">Sold</option>
                </select>
              </div>
              <button onClick={loadAnalysis} disabled={analysisLoading} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">{analysisLoading ? 'Loading...' : 'Apply'}</button>
            </div>

            {analysis && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-surface rounded-xl border border-border p-4">
                    <p className="text-sm text-muted">Completed Samples</p>
                    <p className="text-2xl font-bold text-heading">{analysis.summary.total_samples}</p>
                  </div>
                  <div className="bg-surface rounded-xl border border-border p-4">
                    <p className="text-sm text-muted">Styles Sampled</p>
                    <p className="text-2xl font-bold text-heading">{analysis.summary.styles_sampled}</p>
                  </div>
                  <div className="bg-surface rounded-xl border border-border p-4">
                    <p className="text-sm text-muted">Sold (File Opened)</p>
                    <p className="text-2xl font-bold text-emerald-500">{analysis.summary.sold}</p>
                  </div>
                  <div className="bg-surface rounded-xl border border-border p-4">
                    <p className="text-sm text-muted">Not Sold</p>
                    <p className="text-2xl font-bold text-red-400">{analysis.summary.not_sold}</p>
                  </div>
                </div>

                <div className="bg-surface rounded-xl border border-border overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <h2 className="text-sm font-medium text-heading">Styles by Completed Samples — {analysis.period.start} to {analysis.period.end}</h2>
                    <span className="text-xs text-muted">Styles without a file opening are "not sold"</span>
                  </div>
                  {analysis.results.length === 0 ? (
                    <div className="p-8 text-center text-muted text-sm">No completed sample jobs in this period.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-muted border-b border-border">
                            <th className="px-4 py-2 font-medium">Image</th>
                            <th className="px-4 py-2 font-medium">Style</th>
                            <th className="px-4 py-2 font-medium">Name</th>
                            <th className="px-4 py-2 font-medium">Buyer</th>
                            <th className="px-4 py-2 font-medium text-right">Samples</th>
                            <th className="px-4 py-2 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analysis.results.map(r => (
                            <tr key={r.style_id} className="border-b border-border/50 hover:bg-surface-alt/40">
                              <td className="px-4 py-2">
                                {r.main_image
                                  ? <img src={r.main_image} alt={r.style_number} className="w-10 h-10 object-cover rounded-lg border border-input-border" />
                                  : <div className="w-10 h-10 rounded-lg bg-surface-alt border border-input-border flex items-center justify-center text-xs text-muted">—</div>}
                              </td>
                              <td className="px-4 py-2 font-mono text-heading">{r.style_number}</td>
                              <td className="px-4 py-2 text-body">{r.style_name}</td>
                              <td className="px-4 py-2 text-muted">{r.buyer_name || '-'}</td>
                              <td className="px-4 py-2 text-right font-mono text-heading">{r.sample_count}</td>
                              <td className="px-4 py-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.not_sold ? 'bg-red-500/20 text-badge-red' : 'bg-emerald-500/20 text-badge-emerald'}`}>
                                  {r.not_sold ? 'Not Sold' : 'Sold'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        ) : (
        <DataTable data={pagedData as unknown as Record<string, unknown>[]} columns={columns} totalCount={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search by job #, style, or description..." loading={loading} onRowClick={(row) => handleOpenModal(row as unknown as JobRequest)} />
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border"><h2 className="text-lg font-semibold">{editingId ? 'Edit' : 'New'} Job Request</h2></div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted mb-1">Job Type *</label>
                  <select value={form.job_type} onChange={(e) => setForm({ ...form, job_type: e.target.value })} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="pattern">Pattern</option>
                    <option value="sample">Sample</option>
                    <option value="3d">3D</option>
                    <option value="mini_marker">Mini-Marker</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Priority</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="1">Low</option>
                    <option value="2">Normal</option>
                    <option value="3">High</option>
                    <option value="4">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Style *</label>
                <SearchableSelect options={styleOptions} value={form.style || null} onChange={(v) => setForm({ ...form, style: String(v || '') })} placeholder="Select style..." disabled={!!editingId} />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Purchase Order</label>
                <SearchableSelect options={poOptions} value={form.purchase_order || null} onChange={(v) => setForm({ ...form, purchase_order: String(v || '') })} placeholder="Optional..." />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm text-muted mb-1">Work Location</label><input type="text" value={form.work_location} onChange={(e) => setForm({ ...form, work_location: e.target.value })} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                <div><label className="block text-sm text-muted mb-1">Required By</label><input type="date" value={form.required_by_date} onChange={(e) => setForm({ ...form, required_by_date: e.target.value })} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted mb-1">Assigned To</label>
                  <SearchableSelect options={userOptions} value={form.assigned_to || null} onChange={(v) => setForm({ ...form, assigned_to: String(v || '') })} placeholder="Unassigned" />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div><label className="block text-sm text-muted mb-1">Notes</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">{saving ? 'Saving...' : editingId ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2">Delete Job?</h2>
            <p className="text-muted text-sm mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-3"><button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-body hover:text-heading">Cancel</button><button onClick={confirmDelete} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg">Delete</button></div>
          </div>
        </div>
      )}
    </Layout>
  );
}
