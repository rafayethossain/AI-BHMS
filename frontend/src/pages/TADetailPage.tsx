import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { merchApi } from '../api/client';
import type { TA, TAMilestone } from '../api/client';
import { useToast } from '../contexts/ToastContext';
import Layout from '../components/Layout';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-blue-500/20 text-badge-blue',
  completed: 'bg-emerald-500/20 text-badge-emerald',
  delayed: 'bg-red-500/20 text-badge-red',
  pending: 'bg-surface-alt/20 text-muted',
  in_progress: 'bg-amber-500/20 text-badge-amber',
};

export default function TADetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [ta, setTA] = useState<TA | null>(null);
  const [milestones, setMilestones] = useState<TAMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [editMilestone, setEditMilestone] = useState<TAMilestone | null>(null);
  const [milestoneForm, setMilestoneForm] = useState({ name: '', description: '', planned_date: '', is_critical: false });
  const [saving, setSaving] = useState(false);
  const [deleteMilestoneId, setDeleteMilestoneId] = useState<string | null>(null);
  const [tab, setTab] = useState<'milestones' | 'calendar'>('milestones');

  const tabs = [
    { key: 'milestones' as const, label: 'Milestones' },
    { key: 'calendar' as const, label: 'Calendar' },
  ];

  const fetchTA = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await merchApi.getTA(id);
      setTA(res.data);
      setMilestones(res.data.milestones || []);
    } catch { toast('error', 'Failed to load T&A'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchTA(); }, [id]);

  const handleAddMilestone = async () => {
    setSaving(true);
    try {
      await merchApi.createTAMilestone({ ta: id, ...milestoneForm, sort_order: milestones.length });
      toast('success', 'Milestone added'); setShowAddMilestone(false);
      setMilestoneForm({ name: '', description: '', planned_date: '', is_critical: false });
      fetchTA();
    } catch { toast('error', 'Failed to add milestone'); } finally { setSaving(false); }
  };

  const handleUpdateMilestone = async () => {
    if (!editMilestone) return;
    setSaving(true);
    try {
      await merchApi.updateTAMilestone(editMilestone.id, milestoneForm);
      toast('success', 'Milestone updated'); setEditMilestone(null);
      fetchTA();
    } catch { toast('error', 'Failed to update milestone'); } finally { setSaving(false); }
  };

  const handleCompleteMilestone = async (ms: TAMilestone) => {
    try {
      await merchApi.updateTAMilestone(ms.id, { status: 'completed', actual_date: new Date().toISOString().split('T')[0] });
      toast('success', 'Milestone completed'); fetchTA();
    } catch { toast('error', 'Failed to complete milestone'); }
  };

  const handleDeleteMilestone = async (msId: string) => {
    try {
      await merchApi.updateTAMilestone(msId, { status: 'delayed' });
      setDeleteMilestoneId(null); toast('success', 'Milestone marked delayed'); fetchTA();
    } catch { toast('error', 'Failed to update milestone'); }
  };

  const openEdit = (ms: TAMilestone) => {
    setEditMilestone(ms);
    setMilestoneForm({ name: ms.name, description: ms.description, planned_date: ms.planned_date, is_critical: ms.is_critical });
  };
  if (loading) return <Layout><div className="py-20 flex items-center justify-center"><div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" /></div></Layout>;

  if (!ta) return <Layout><div className="py-20 flex items-center justify-center">T&A not found</div></Layout>;

  const completedCount = milestones.filter(m => m.status === 'completed').length;
  const totalCount = milestones.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const overdueCount = milestones.filter(m => m.status === 'delayed' || (m.status !== 'completed' && new Date(m.planned_date) < new Date())).length;

  return (
    <Layout>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <button onClick={() => navigate('/tas')} className="text-sm text-muted hover:text-heading mb-4 transition-colors">&larr; Back to T&A</button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">T&A — {ta.po_number}</h1>
            <p className="text-muted text-sm mt-1">
              Delivery: {ta.delivery_date} &middot;
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[ta.status] || ''}`}>{ta.status}</span>
            </p>
          </div>
          <button onClick={() => setShowAddMilestone(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">
            + Add Milestone
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-surface rounded-xl border border-border p-4">
            <p className="text-sm text-muted">Progress</p>
            <p className="text-2xl font-bold text-heading">{progress}%</p>
            <div className="mt-2 h-2 bg-surface-alt rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="bg-surface rounded-xl border border-border p-4">
            <p className="text-sm text-muted">Completed</p>
            <p className="text-2xl font-bold text-emerald-400">{completedCount}/{totalCount}</p>
          </div>
          <div className="bg-surface rounded-xl border border-border p-4">
            <p className="text-sm text-muted">Overdue</p>
            <p className={`text-2xl font-bold ${overdueCount > 0 ? 'text-red-400' : 'text-heading'}`}>{overdueCount}</p>
          </div>
          <div className="bg-surface rounded-xl border border-border p-4">
            <p className="text-sm text-muted">Critical Path</p>
            <p className="text-2xl font-bold text-heading">{milestones.filter(m => m.is_critical).length}</p>
          </div>
        </div>

        <div className="flex gap-1 mb-6 border-b border-border">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-emerald-500 text-heading' : 'border-transparent text-muted hover:text-heading'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'milestones' && (
          <>
            {milestones.length === 0 ? (
              <div className="bg-surface rounded-xl border border-border p-12 text-center text-muted">
                <p className="text-lg">No milestones yet</p>
                <p className="text-sm mt-1">Add milestones to track T&A progress</p>
              </div>
            ) : (
              <div className="space-y-2">
                {milestones.map((ms, idx) => (
                  <div key={ms.id} className={`bg-surface rounded-xl border p-4 flex items-center gap-4 ${ms.is_critical ? 'border-amber-500/50' : 'border-border'}`}>
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-mono
                      ${ms.status === 'completed' ? 'bg-emerald-500/20 text-badge-emerald' : ms.status === 'delayed' ? 'bg-red-500/20 text-badge-red' : ms.status === 'in_progress' ? 'bg-amber-500/20 text-badge-amber' : 'bg-surface-alt text-muted'}">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{ms.name}</span>
                        {ms.is_critical && <span className="px-1.5 py-0.5 bg-amber-500/20 text-badge-amber rounded text-xs">Critical</span>}
                        <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[ms.status] || ''}`}>{ms.status.replace('_', ' ')}</span>
                      </div>
                      {ms.description && <p className="text-muted text-xs mt-1">{ms.description}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-muted">Planned</p>
                      <p className={`text-sm ${new Date(ms.planned_date) < new Date() && ms.status !== 'completed' ? 'text-red-400' : 'text-heading'}`}>{ms.planned_date}</p>
                      {ms.actual_date && <p className="text-xs text-emerald-400">Done: {ms.actual_date}</p>}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {ms.status !== 'completed' && (
                        <button onClick={() => handleCompleteMilestone(ms)} className="px-2 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors">Complete</button>
                      )}
                      <button onClick={() => openEdit(ms)} className="px-2 py-1 text-xs bg-surface-alt hover:bg-surface-alt text-heading rounded transition-colors">Edit</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'calendar' && (
          <div className="bg-surface rounded-xl border border-border p-6">
            <div className="relative">
              {/* Today marker */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-emerald-500/30 z-0" />
              
              <div className="space-y-1">
                {milestones
                  .slice()
                  .sort((a, b) => new Date(a.planned_date).getTime() - new Date(b.planned_date).getTime())
                  .map((ms, idx) => {
                    const isLeft = idx % 2 === 0;
                    const isPast = new Date(ms.planned_date) < new Date() && ms.status !== 'completed';
                    return (
                      <div key={ms.id} className={`flex items-center gap-4 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}>
                        <div className={`flex-1 ${isLeft ? 'text-right' : 'text-left'}`}>
                          <div className={`inline-block bg-input rounded-lg p-3 border max-w-xs ${
                            ms.status === 'completed' ? 'border-emerald-500/30' :
                            ms.status === 'delayed' || isPast ? 'border-red-500/30' :
                            ms.status === 'in_progress' ? 'border-amber-500/30' :
                            'border-input-border'
                          }`}>
                            <p className="text-sm font-medium">{ms.name}</p>
                            <p className={`text-xs mt-1 ${
                              isPast ? 'text-red-400' : 'text-muted'
                            }`}>{ms.planned_date}</p>
                            {ms.actual_date && <p className="text-xs text-emerald-400">Done: {ms.actual_date}</p>}
                          </div>
                        </div>
                        <div className={`flex-shrink-0 w-4 h-4 rounded-full border-2 z-10 ${
                          ms.status === 'completed' ? 'bg-emerald-500 border-emerald-400' :
                          ms.status === 'delayed' || isPast ? 'bg-red-500 border-red-400' :
                          ms.status === 'in_progress' ? 'bg-amber-500 border-amber-400' :
                          'bg-surface-alt border-border'
                        }`} />
                        <div className="flex-1" />
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </main>

      {(showAddMilestone || editMilestone) && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">{editMilestone ? 'Edit Milestone' : 'Add Milestone'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-body mb-1">Name *</label>
                <input value={milestoneForm.name} onChange={(e) => setMilestoneForm({ ...milestoneForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Description</label>
                <textarea value={milestoneForm.description} onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-body mb-1">Planned Date *</label>
                  <input type="date" value={milestoneForm.planned_date} onChange={(e) => setMilestoneForm({ ...milestoneForm, planned_date: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={milestoneForm.is_critical} onChange={(e) => setMilestoneForm({ ...milestoneForm, is_critical: e.target.checked })}
                      className="w-4 h-4 rounded border-input-border bg-surface-alt text-emerald-500 focus:ring-emerald-500" />
                    <span className="text-sm text-body">Critical path</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => { setShowAddMilestone(false); setEditMilestone(null); }} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
                <button onClick={editMilestone ? handleUpdateMilestone : handleAddMilestone} disabled={saving || !milestoneForm.name || !milestoneForm.planned_date}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white text-sm rounded-lg transition-colors">
                  {saving ? 'Saving...' : editMilestone ? 'Update' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteMilestoneId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2">Mark as Delayed?</h2>
            <p className="text-muted text-sm mb-4">This milestone will be marked as delayed.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteMilestoneId(null)} className="px-4 py-2 text-sm text-body hover:text-heading">Cancel</button>
              <button onClick={() => handleDeleteMilestone(deleteMilestoneId)} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm rounded-lg">Mark Delayed</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
