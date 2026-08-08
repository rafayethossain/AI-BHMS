import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { merchApi, setupApi } from '../api/client';
import type { FileOpening, PurchaseOrder, Currency, Country } from '../api/client';
import { useToast } from '../contexts/ToastContext';
import SearchableSelect from '../components/SearchableSelect';
import Layout from '../components/Layout';

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-500/20 text-badge-blue',
  closed: 'bg-surface-alt/20 text-muted',
  cancelled: 'bg-red-500/20 text-badge-red',
};

type Tab = 'overview' | 'purchase_orders';

export default function FileOpeningDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [fo, setFo] = useState<FileOpening | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [pos, setPOs] = useState<PurchaseOrder[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [createForm, setCreateForm] = useState({
    po_date: new Date().toISOString().split('T')[0],
    delivery_date: '', quantity: '', unit_price: '', destination_country: '', currency: '', remarks: '',
  });
  const [showStockForm, setShowStockForm] = useState(false);
  const [stockForm, setStockForm] = useState({ description: 'stock fabric', totalMeters: '' });
  const [showAllocate, setShowAllocate] = useState(false);
  const [allocateForm, setAllocateForm] = useState({ allocatedTo: '', meters: '', notes: '' });

  const fetchFO = async () => {
    if (!id) return;
    setLoading(true);
    try { const res = await merchApi.getFileOpening(id); setFo(res.data); } catch { toast('error', 'Failed to load file opening'); } finally { setLoading(false); }
  };

  const fetchPOs = async () => {
    if (!id) return;
    try { const res = await merchApi.getFileOpeningPOs(id); setPOs(res.data as unknown as PurchaseOrder[]); } catch { toast('error', 'Failed to load purchase orders'); }
  };

  useEffect(() => { fetchFO(); fetchPOs(); }, [id]);
  useEffect(() => { if (tab === 'purchase_orders') fetchPOs(); }, [tab]);
  useEffect(() => {
    setupApi.getCurrencies({ page_size: '500' }).then(r => setCurrencies(r.data.results)).catch(() => {});
    setupApi.getCountries({ page_size: '500' }).then(r => setCountries(r.data.results)).catch(() => {});
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!fo) return;
    setCreating(true);
    try {
      const qty = parseInt(createForm.quantity || '0');
      const payload = {
        file_opening: fo.id, buyer: fo.buyer, factory: fo.factory,
        po_date: createForm.po_date, delivery_date: createForm.delivery_date,
        quantity: qty || 0, unit_price: createForm.unit_price || '0',
        destination_country: createForm.destination_country || null, currency: createForm.currency || null,
        remarks: createForm.remarks || '',
      };
      await merchApi.createPO(payload);
      toast('success', 'Purchase order created');
      setShowCreate(false);
      setCreateForm({ po_date: new Date().toISOString().split('T')[0], delivery_date: '', quantity: '', unit_price: '', destination_country: '', currency: '', remarks: '' });
      fetchPOs();
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      const msg = data ? JSON.stringify(data) : 'Failed to create purchase order';
      toast('error', msg);
    } finally { setCreating(false); }
  };

  const handleMark = async () => {
    if (!fo) return;
    try { const res = await merchApi.markQuickLead(fo.id); setFo(res.data); toast('success', 'Marked as quick lead'); }
    catch { toast('error', 'Failed to mark quick lead'); }
  };

  const handleUnmark = async () => {
    if (!fo) return;
    try { const res = await merchApi.unmarkQuickLead(fo.id); setFo(res.data); toast('success', 'Quick lead marking removed'); }
    catch { toast('error', 'Failed to unmark quick lead'); }
  };

  const handleAgree = async (party: string) => {
    if (!fo) return;
    try { const res = await merchApi.agreeQuickLead(fo.id, party); setFo(res.data); toast('success', `${party} agreement recorded`); }
    catch { toast('error', 'Failed to record agreement'); }
  };

  const handleCreateRepeat = async () => {
    if (!fo) return;
    try { const res = await merchApi.createRepeat(fo.id); setFo(res.data); toast('success', 'Repeat order created'); }
    catch { toast('error', 'Failed to create repeat order'); }
  };

  const handleApproveRepeat = async (party: string) => {
    if (!fo) return;
    try { const res = await merchApi.approveRepeat(fo.id, party); setFo(res.data); toast('success', `${party} repeat confirmation recorded`); }
    catch { toast('error', 'Failed to record repeat confirmation'); }
  };

  const handleMarkStock = async (e: FormEvent) => {
    e.preventDefault();
    if (!fo) return;
    try {
      const res = await merchApi.markAsStockFabric(fo.id, { stock_fabric_description: stockForm.description || 'stock fabric', total_meters: stockForm.totalMeters });
      setFo(res.data); setShowStockForm(false); toast('success', 'Marked as stock fabric');
    } catch { toast('error', 'Failed to mark as stock fabric'); }
  };

  const handleAllocateStock = async (e: FormEvent) => {
    e.preventDefault();
    if (!fo) return;
    try {
      const res = await merchApi.allocateStock(fo.id, { allocated_to: allocateForm.allocatedTo, meters: allocateForm.meters, notes: allocateForm.notes });
      setFo(res.data); setShowAllocate(false); setAllocateForm({ allocatedTo: '', meters: '', notes: '' }); toast('success', 'Stock allocated');
    } catch { toast('error', 'Failed to allocate stock'); }
  };

  if (loading) return <Layout><div className="py-20 flex items-center justify-center"><div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" /></div></Layout>;

  if (!fo) return <Layout><div className="py-20 flex items-center justify-center"><p className="text-muted">File not found</p></div></Layout>;

  return (
    <Layout>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold">{fo.file_number}</h1>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[fo.status] || ''}`}>{fo.status}</span>
              {fo.is_repeat && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-violet-500/20 text-violet-400 border border-violet-400/30">REPEAT</span>
              )}
              {fo.is_stock_fabric && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-sky-500/20 text-sky-400 border border-sky-400/30">STOCK FABRIC</span>
              )}
            </div>
            <p className="text-muted">Style: {fo.style_number} &middot; Buyer: {fo.buyer_name}</p>
          </div>
          <button onClick={() => navigate(`/styles/${fo.style}`)} className="px-3 py-1.5 bg-surface-alt hover:bg-surface-alt text-sm rounded-lg transition-colors">View Style</button>
        </div>

        <div className="flex gap-1 border-b border-border mb-6">
          {(['overview', 'purchase_orders'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${tab === t ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-muted hover:text-heading'}`}>
              {t === 'purchase_orders' ? `Purchase Orders (${pos.length})` : 'Overview'}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface rounded-xl border border-border p-6">
              <h3 className="text-sm font-medium text-muted mb-4">Details</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-muted">File Number</dt><dd className="font-mono">{fo.file_number}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Style</dt><dd>{fo.style_number}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Buyer</dt><dd>{fo.buyer_name}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Factory</dt><dd>{fo.factory_name}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">File Date</dt><dd>{fo.file_date}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Status</dt><dd className="capitalize">{fo.status}</dd></div>
                {fo.remarks && <div className="flex justify-between"><dt className="text-muted">Remarks</dt><dd className="text-right max-w-xs">{fo.remarks}</dd></div>}
              </dl>
            </div>
            <div className="bg-surface rounded-xl border border-border p-6">
              <h3 className="text-sm font-medium text-muted mb-4">Quick Stats</h3>
              <div className="bg-input rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-400">{pos.length}</p>
                <p className="text-xs text-muted mt-1">Purchase Orders</p>
              </div>
            </div>
            <div className={`md:col-span-2 rounded-xl border p-6 ${fo.is_quick_lead ? 'bg-yellow-400/5 border-yellow-400/30' : 'bg-surface border-border'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-medium text-heading">Quick Lead Time</h3>
                  {fo.is_quick_lead && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-400/20 text-yellow-400 border border-yellow-400/30">QUICK LEAD</span>
                  )}
                </div>
                {fo.is_quick_lead ? (
                  <button onClick={handleUnmark} className="px-3 py-1.5 bg-surface-alt hover:bg-surface-alt text-sm rounded-lg transition-colors text-muted hover:text-heading">Unmark</button>
                ) : (
                  <button onClick={handleMark} className="px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-400/30 text-sm rounded-lg transition-colors">Mark as Quick Lead</button>
                )}
              </div>
              {fo.is_quick_lead && (
                <>
                  <p className="text-sm text-body mb-4">
                    All parties must agree on deadlines and ways of working before a quick lead order is put through.
                  </p>
                  {fo.quick_lead_agreement_complete ? (
                    <div className="flex items-center gap-2 text-sm text-emerald-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      Agreement complete — all parties have agreed.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {fo.missing_agreements.map(party => (
                        <div key={party} className="flex items-center justify-between px-3 py-2 bg-input rounded-lg">
                          <span className="text-sm capitalize text-heading">{party}</span>
                          <button onClick={() => handleAgree(party)} className="text-xs px-2 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded transition-colors">Agree</button>
                        </div>
                      ))}
                      <div className="col-span-full text-xs text-muted mt-1">
                        Agreed: {fo.quick_lead_agreed_by.length}/{fo.quick_lead_agreed_by.length + fo.missing_agreements.length} parties
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className={`md:col-span-2 rounded-xl border p-6 ${fo.is_repeat ? 'bg-violet-500/5 border-violet-400/30' : 'bg-surface border-border'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-medium text-heading">Repeats</h3>
                  {fo.is_repeat && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-violet-500/20 text-violet-400 border border-violet-400/30">REPEAT</span>
                  )}
                </div>
                {!fo.is_repeat && fo.status === 'open' && (
                  <button onClick={handleCreateRepeat} className="px-3 py-1.5 bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 border border-violet-400/30 text-sm rounded-lg transition-colors">Create Repeat Order</button>
                )}
              </div>
              {fo.is_repeat ? (
                <>
                  <p className="text-sm text-body mb-4">
                    {fo.original_fn_number
                      ? <>Repeat of <span className="font-mono text-violet-400">{fo.original_fn_number}</span> — treated as a new order following the same process.</>
                      : 'Repeat order raised from an earlier file opening.'} Each department must confirm this is a direct repeat.
                  </p>
                  {fo.repeat_approval_complete ? (
                    <div className="flex items-center gap-2 text-sm text-emerald-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      Repeat confirmed — all departments have approved.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {fo.missing_repeat_approvals.map(party => (
                        <div key={party} className="flex items-center justify-between px-3 py-2 bg-input rounded-lg">
                          <span className="text-sm capitalize text-heading">{party}</span>
                          <button onClick={() => handleApproveRepeat(party)} className="text-xs px-2 py-1 bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 rounded transition-colors">Confirm Repeat</button>
                        </div>
                      ))}
                      <div className="col-span-full text-xs text-muted mt-1">
                        Approved: {fo.repeat_approved_by.length}/{fo.repeat_approved_by.length + fo.missing_repeat_approvals.length} departments
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-body">
                  Raise a repeat of this order when the buyer re-orders the same style. The repeat gets its own file number and all departments confirm it is a direct repeat.
                </p>
              )}
            </div>
            <div className={`md:col-span-2 rounded-xl border p-6 ${fo.is_stock_fabric ? 'bg-sky-500/5 border-sky-400/30' : 'bg-surface border-border'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-medium text-heading">Stock Fabric</h3>
                  {fo.is_stock_fabric && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-sky-500/20 text-sky-400 border border-sky-400/30">STOCK FABRIC</span>
                  )}
                </div>
                {!fo.is_stock_fabric && fo.status === 'open' && (
                  <button onClick={() => setShowStockForm(true)} className="px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 border border-sky-400/30 text-sm rounded-lg transition-colors">Mark as Stock Fabric</button>
                )}
              </div>
              {fo.is_stock_fabric ? (
                <>
                  <p className="text-sm text-body mb-4">
                    {fo.stock_fabric_description ? <span className="capitalize">{fo.stock_fabric_description}</span> : 'Stock fabric'} moved to its own file number. A fabric swatch photo replaces the sketch.
                  </p>
                  {fo.stock_photo && (
                    <img src={fo.stock_photo} alt="Fabric swatch" className="mb-4 h-28 w-28 object-cover rounded-lg border border-border" />
                  )}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-input rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-heading">{fo.total_meters ?? '0'}</p>
                      <p className="text-xs text-muted mt-1">Total meters</p>
                    </div>
                    <div className="bg-input rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-sky-400">{fo.allocated_meters}</p>
                      <p className="text-xs text-muted mt-1">Allocated</p>
                    </div>
                    <div className="bg-input rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-emerald-400">{fo.stock_balance_meters}</p>
                      <p className="text-xs text-muted mt-1">Balance</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-heading">Allocations</h4>
                    <button onClick={() => setShowAllocate(true)} className="text-xs px-2 py-1 bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 rounded transition-colors">Allocate Meters</button>
                  </div>
                  {fo.stock_allocations.length === 0 ? (
                    <p className="text-sm text-muted">No meters allocated yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {fo.stock_allocations.map(a => (
                        <div key={a.id} className="flex items-center justify-between px-3 py-2 bg-input rounded-lg">
                          <div>
                            <span className="text-sm text-heading">{a.allocated_to_number || '—'}</span>
                            {a.notes && <span className="ml-2 text-xs text-muted">{a.notes}</span>}
                          </div>
                          <span className="text-sm font-medium text-sky-400">{a.meters}m</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-body">
                  Move fabric held in stock to its own file number with a "stock fabric" description and swatch photo. Meters can then be allocated to orders, always showing the remaining balance.
                </p>
              )}
            </div>
          </div>
        )}

        {tab === 'purchase_orders' && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button onClick={() => setShowCreate(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
                + New PO
              </button>
            </div>
            {pos.length === 0 ? (
              <p className="text-muted text-sm py-8 text-center">No purchase orders yet</p>
            ) : pos.map(po => (
              <div key={po.id} className="bg-surface rounded-xl border border-border p-4 flex items-center justify-between">
                <div>
                  <span className="font-mono text-sm text-emerald-400">{po.po_number}</span>
                  <span className={`ml-3 px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[po.status] || 'bg-surface-alt/20 text-muted'}`}>{po.status}</span>
                  <p className="text-muted text-sm mt-1">{po.factory_name} &middot; Del: {po.delivery_date} &middot; Qty: {po.quantity} &middot; ${po.total_value}</p>
                </div>
                <button onClick={() => navigate(`/purchase-orders/${po.id}`)} className="text-sm text-blue-400 hover:text-blue-300">View</button>
              </div>
            ))}
          </div>
        )}
      </main>

      {showStockForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowStockForm(false)}>
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-1">Mark as Stock Fabric</h3>
            <p className="text-sm text-muted mb-4">Move <span className="font-mono font-medium">{fo.file_number}</span> to its own stock fabric FN.</p>
            <form onSubmit={handleMarkStock} className="space-y-4">
              <div>
                <label className="block text-sm text-muted mb-1">Description</label>
                <input value={stockForm.description} onChange={(e) => setStockForm({ ...stockForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Total Meters *</label>
                <input type="number" step="0.01" required value={stockForm.totalMeters} onChange={(e) => setStockForm({ ...stockForm, totalMeters: e.target.value })}
                  placeholder="0.00" className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setShowStockForm(false)} className="px-4 py-2 text-sm text-muted hover:text-heading transition-colors">Cancel</button>
                <button type="submit" disabled={!stockForm.totalMeters}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors">
                  Mark as Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAllocate && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowAllocate(false)}>
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-1">Allocate Stock Meters</h3>
            <p className="text-sm text-muted mb-4">From <span className="font-mono font-medium">{fo.file_number}</span> &middot; Balance {fo.stock_balance_meters}m</p>
            <form onSubmit={handleAllocateStock} className="space-y-4">
              <div>
                <label className="block text-sm text-muted mb-1">Destination File Opening *</label>
                <input type="text" required value={allocateForm.allocatedTo} onChange={(e) => setAllocateForm({ ...allocateForm, allocatedTo: e.target.value })}
                  placeholder="File opening ID" className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Meters *</label>
                <input type="number" step="0.01" required value={allocateForm.meters} onChange={(e) => setAllocateForm({ ...allocateForm, meters: e.target.value })}
                  placeholder="0.00" className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Notes</label>
                <input value={allocateForm.notes} onChange={(e) => setAllocateForm({ ...allocateForm, notes: e.target.value })}
                  placeholder="Optional" className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setShowAllocate(false)} className="px-4 py-2 text-sm text-muted hover:text-heading transition-colors">Cancel</button>
                <button type="submit" disabled={!allocateForm.allocatedTo || !allocateForm.meters}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors">
                  Allocate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-1">New Purchase Order</h3>
            <p className="text-sm text-muted mb-4">Creating PO for <span className="font-mono font-medium">{fo.file_number}</span> &middot; {fo.buyer_name} &middot; {fo.factory_name}</p>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted mb-1">Buyer</label>
                  <input value={fo.buyer_name} readOnly
                    className="w-full px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm text-faint cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Factory</label>
                  <input value={fo.factory_name} readOnly
                    className="w-full px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm text-faint cursor-not-allowed" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted mb-1">PO Date *</label>
                  <input type="date" required value={createForm.po_date} onChange={(e) => setCreateForm({ ...createForm, po_date: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Delivery Date *</label>
                  <input type="date" required value={createForm.delivery_date} onChange={(e) => setCreateForm({ ...createForm, delivery_date: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted mb-1">Quantity</label>
                  <input type="number" value={createForm.quantity} onChange={(e) => setCreateForm({ ...createForm, quantity: e.target.value })}
                    placeholder="0" className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Unit Price ($)</label>
                  <input type="number" step="0.01" value={createForm.unit_price} onChange={(e) => setCreateForm({ ...createForm, unit_price: e.target.value })}
                    placeholder="0.00" className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted mb-1">Destination Country</label>
                  <SearchableSelect
                    options={countries.map(c => ({ value: c.id, label: `${c.name} (${c.code})` }))}
                    value={createForm.destination_country || null}
                    onChange={(v) => setCreateForm({ ...createForm, destination_country: String(v || '') })}
                    placeholder="Select country..."
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Currency</label>
                  <SearchableSelect
                    options={currencies.map(c => ({ value: c.id, label: `${c.name} (${c.code})` }))}
                    value={createForm.currency || null}
                    onChange={(v) => setCreateForm({ ...createForm, currency: String(v || '') })}
                    placeholder="Select currency..."
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Remarks</label>
                <input value={createForm.remarks} onChange={(e) => setCreateForm({ ...createForm, remarks: e.target.value })}
                  placeholder="Optional notes" className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-muted hover:text-heading transition-colors">Cancel</button>
                <button type="submit" disabled={creating || !createForm.delivery_date}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors">
                  {creating ? 'Creating...' : 'Create PO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
