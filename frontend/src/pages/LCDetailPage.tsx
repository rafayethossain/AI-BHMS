import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { commercialApi } from '../api/client';
import type { LC, LCAmendment } from '../api/client';
import { useToast } from '../contexts/ToastContext';
import Layout from '../components/Layout';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-surface-alt/20 text-muted',
  sent_to_bank: 'bg-blue-500/20 text-badge-blue',
  received: 'bg-cyan-500/20 text-badge-cyan',
  accepted: 'bg-emerald-500/20 text-badge-emerald',
  amended: 'bg-amber-500/20 text-badge-amber',
  utilized: 'bg-green-500/20 text-badge-green',
  expired: 'bg-red-500/20 text-badge-red',
  cancelled: 'bg-surface-alt/20 text-muted',
};

const AMENDMENT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/20 text-badge-amber',
  approved: 'bg-emerald-500/20 text-badge-emerald',
  rejected: 'bg-red-500/20 text-badge-red',
};

type Tab = 'overview' | 'amendments' | 'utilization';

export default function LCDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [lc, setLC] = useState<LC | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showAmendmentModal, setShowAmendmentModal] = useState(false);
  const [amendmentForm, setAmendmentForm] = useState({ amount_change: '', expiry_date_change: '', reason: '' });
  const [submittingAmendment, setSubmittingAmendment] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!id) return;
    setExporting(true);
    try {
      const res = await commercialApi.exportLC(id);
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lc-${lc?.lc_number || id}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast('success', 'LC exported successfully');
    } catch { toast('error', 'Failed to export LC'); } finally { setExporting(false); }
  };

  const fetchLC = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await commercialApi.getLC(id);
      setLC(res.data);
    } catch { toast('error', 'Failed to load LC'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchLC(); }, [id]);

  const handleAction = async (action: () => Promise<unknown>, label: string) => {
    setActing(true);
    try { await action(); toast('success', label); fetchLC(); } catch { toast('error', `Failed to ${label.toLowerCase()}`); } finally { setActing(false); }
  };

  const handleAmendment = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSubmittingAmendment(true);
    try {
      await commercialApi.createAmendment({
        lc: id,
        amount_change: amendmentForm.amount_change || null,
        expiry_date_change: amendmentForm.expiry_date_change || null,
        reason: amendmentForm.reason,
      });
      setShowAmendmentModal(false);
      setAmendmentForm({ amount_change: '', expiry_date_change: '', reason: '' });
      toast('success', 'Amendment requested');
      fetchLC();
    } catch { toast('error', 'Failed to request amendment'); } finally { setSubmittingAmendment(false); }
  };

  if (loading) return <Layout><div className="py-20 flex items-center justify-center"><div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" /></div></Layout>;
  if (!lc) return <Layout><div className="py-20 flex items-center justify-center text-heading">LC not found</div></Layout>;

  const utilizedPct = lc.utilization_percent || 0;
  const utilizedAmt = parseFloat(String(lc.utilized_amount)) || 0;
  const balanceAmt = parseFloat(String(lc.balance_amount)) || 0;
  const totalAmt = parseFloat(String(lc.amount)) || 0;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'amendments', label: 'Amendments' },
    { key: 'utilization', label: 'Utilization' },
  ];

  return (
    <Layout>
      <main className="max-w-5xl mx-auto px-6 py-8">
        <button onClick={() => navigate('/lcs')} className="text-sm text-muted hover:text-heading mb-4 transition-colors">&larr; Back to LCs</button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">LC — {lc.lc_number}</h1>
            <p className="text-muted text-sm mt-1">
              <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[lc.status] || ''}`}>{lc.status.replace('_', ' ')}</span>
              <span className="ml-2 text-faint">·</span>
              <span className="ml-2">{lc.lc_type === 'master' ? 'Master LC' : 'B2B LC'}</span>
            </p>
          </div>
          <div className="flex gap-2">
            {lc.status === 'draft' && (
              <button onClick={() => handleAction(() => commercialApi.approveLC(lc.id), 'LC approved')} disabled={acting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">Approve</button>
            )}
            {lc.status === 'received' && (
              <button onClick={() => handleAction(() => commercialApi.acceptLC(lc.id), 'LC accepted')} disabled={acting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">Accept</button>
            )}
            {lc.status !== 'cancelled' && lc.status !== 'utilized' && lc.status !== 'expired' && (
              <button onClick={() => handleAction(() => commercialApi.cancelLC(lc.id), 'LC cancelled')} disabled={acting}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">Cancel</button>
            )}
            <button onClick={handleExport} disabled={exporting}
              className="px-4 py-2 bg-surface-alt hover:bg-surface-alt/80 disabled:opacity-50 text-heading border border-border rounded-lg text-sm font-medium transition-colors">
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>
        </div>

        <div className="flex gap-1 mb-6 bg-surface rounded-lg p-1 border border-border">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-4 py-2 text-sm rounded-md transition-colors ${activeTab === tab.key ? 'bg-surface-alt text-heading font-medium' : 'text-muted hover:text-heading'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface rounded-xl border border-border p-6">
              <h3 className="text-sm font-medium text-muted mb-4">LC Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm"><span className="text-muted">LC Number</span><span className="font-mono text-badge-emerald">{lc.lc_number}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted">Type</span><span className="text-heading">{lc.lc_type === 'master' ? 'Master' : 'B2B'}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted">Buyer</span><span className="text-heading">{lc.buyer_name}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted">Bank</span><span className="text-heading">{lc.bank_name || '—'}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted">Amount</span><span className="text-heading font-mono">{lc.currency} {Number(lc.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted">Expiry Date</span><span className="text-heading">{lc.expiry_date}</span></div>
                {lc.issued_date && <div className="flex justify-between text-sm"><span className="text-muted">Issued Date</span><span className="text-heading">{lc.issued_date}</span></div>}
                {lc.po_number && <div className="flex justify-between text-sm"><span className="text-muted">PO Number</span><span className="text-heading">{lc.po_number}</span></div>}
              </div>
            </div>
            <div className="bg-surface rounded-xl border border-border p-6">
              <h3 className="text-sm font-medium text-muted mb-4">Financial Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm"><span className="text-muted">Total Amount</span><span className="text-heading font-mono">{lc.currency} {totalAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted">Utilized</span><span className="text-badge-emerald font-mono">{lc.currency} {utilizedAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted">Balance</span><span className="text-badge-amber font-mono">{lc.currency} {balanceAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1"><span className="text-faint">Utilization</span><span className="text-muted">{utilizedPct.toFixed(1)}%</span></div>
                  <div className="h-2 bg-surface-alt rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.min(utilizedPct, 100)}%` }} />
                  </div>
                </div>
              </div>
              {lc.remarks && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs text-faint mb-1">Remarks</p>
                  <p className="text-sm text-body">{lc.remarks}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'amendments' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Amendments</h3>
              {(lc.status === 'accepted' || lc.status === 'amended') && (
                <button onClick={() => setShowAmendmentModal(true)} disabled={acting || submittingAmendment}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                  + Request Amendment
                </button>
              )}
            </div>
            {lc.amendments && lc.amendments.length > 0 ? (
              <div className="space-y-3">
                {lc.amendments.map((amend: LCAmendment) => (
                  <div key={amend.id} className="bg-surface rounded-xl border border-border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-heading">Amendment #{amend.amendment_number}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${AMENDMENT_STATUS_COLORS[amend.status] || ''}`}>{amend.status}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {amend.amount_change && <div><span className="text-muted">Amount Change: </span><span className="text-heading">{amend.amount_change}</span></div>}
                      {amend.expiry_date_change && <div><span className="text-muted">New Expiry: </span><span className="text-heading">{amend.expiry_date_change}</span></div>}
                    </div>
                    <p className="text-sm text-body mt-2">Reason: {amend.reason}</p>
                    {amend.status === 'pending' && (
                      <div className="flex gap-2 mt-3">
                        <button onClick={async () => { try { await commercialApi.approveAmendment(amend.id); toast('success', 'Amendment approved'); fetchLC(); } catch { toast('error', 'Failed to approve'); } }}
                          disabled={acting} className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs rounded-lg transition-colors">Approve</button>
                        <button onClick={async () => { try { await commercialApi.rejectAmendment(amend.id); toast('success', 'Amendment rejected'); fetchLC(); } catch { toast('error', 'Failed to reject'); } }}
                          disabled={acting} className="px-3 py-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs rounded-lg transition-colors">Reject</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-surface rounded-xl border border-border p-8 text-center text-muted">No amendments yet</div>
            )}
          </div>
        )}

        {activeTab === 'utilization' && (
          <div className="bg-surface rounded-xl border border-border p-6">
            <h3 className="text-sm font-medium text-muted mb-6">Utilization Overview</h3>
            <div className="mb-8">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-body">Used</span>
                <span className="text-body">Remaining</span>
              </div>
              <div className="h-8 bg-surface-alt rounded-full overflow-hidden flex">
                <div className="h-full bg-emerald-500 transition-all flex items-center justify-center text-xs font-medium text-white"
                  style={{ width: `${Math.min(utilizedPct, 100)}%` }}>
                  {utilizedPct > 10 && `${utilizedPct.toFixed(1)}%`}
                </div>
                {utilizedPct < 100 && (
                  <div className="h-full bg-surface-alt flex-1 flex items-center justify-center text-xs text-body">
                    {(100 - utilizedPct).toFixed(1)}%
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-2xl font-bold text-heading">{lc.currency} {totalAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                <p className="text-xs text-muted mt-1">Total Amount</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-badge-emerald">{lc.currency} {utilizedAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                <p className="text-xs text-muted mt-1">Utilized</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-badge-amber">{lc.currency} {balanceAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                <p className="text-xs text-muted mt-1">Balance</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {showAmendmentModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Request Amendment</h2>
            <form onSubmit={handleAmendment} className="space-y-4">
              <div>
                <label className="block text-sm text-body mb-1">Amount Change</label>
                <input type="number" step="0.01" value={amendmentForm.amount_change} onChange={(e) => setAmendmentForm({ ...amendmentForm, amount_change: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="New amount (optional)" />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">New Expiry Date</label>
                <input type="date" value={amendmentForm.expiry_date_change} onChange={(e) => setAmendmentForm({ ...amendmentForm, expiry_date_change: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Reason *</label>
                <textarea required value={amendmentForm.reason} onChange={(e) => setAmendmentForm({ ...amendmentForm, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" rows={3} placeholder="Reason for amendment..." />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowAmendmentModal(false)} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
                <button type="submit" disabled={submittingAmendment} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white text-sm rounded-lg transition-colors">
                  {submittingAmendment ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
