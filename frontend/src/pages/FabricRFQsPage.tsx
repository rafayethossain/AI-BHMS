import { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import { fabricApi } from '../api/client';
import type { RFQ, RFQResponse, RFQLineItem, RFQResponseItem } from '../api/client';
import type { Column } from '../components/DataTable';
import { useToast } from '../contexts/ToastContext';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-surface-alt text-muted', sent: 'bg-blue-500/20 text-blue-400',
  responded: 'bg-emerald-500/20 text-badge-emerald', closed: 'bg-amber-500/20 text-amber-400',
  cancelled: 'bg-red-500/20 text-badge-red',
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['sent'],
  sent: ['responded', 'cancelled'],
  responded: ['closed', 'sent'],
  closed: [],
  cancelled: [],
};

const INITIAL_FORM = { rfq_number: '', supplier: '', status: 'draft', notes: '' };

export default function FabricRFQsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const pageSize = 10;

  // Detail modal state
  const [detailRFQ, setDetailRFQ] = useState<RFQ | null>(null);
  const [responses, setResponses] = useState<RFQResponse[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);

  // Add response modal state
  const [showAddResponse, setShowAddResponse] = useState(false);
  const [responseForm, setResponseForm] = useState<Record<string, unknown>>({ supplier: '', valid_until: '', notes: '' });
  const [responseItemPrices, setResponseItemPrices] = useState<Record<string, { quoted_price: string; available_qty_meters: string; lead_days: string }>>({});
  const [savingResponse, setSavingResponse] = useState(false);

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(1); }, [search]);

  const load = async () => {
    try {
      const res = await fabricApi.getRFQs({ page_size: '100' });
      setItems(res.data.results);
    } catch { toast('error', 'Failed to load RFQs');
    } finally { setLoading(false); }
  };

  const loadResponses = async (rfqId: string) => {
    setLoadingResponses(true);
    try {
      const res = await fabricApi.getRFQResponses({ rfq: rfqId, page_size: '100' });
      setResponses(res.data.results);
    } catch { toast('error', 'Failed to load responses'); setResponses([]);
    } finally { setLoadingResponses(false); }
  };

  const handleOpenModal = (item?: RFQ) => {
    if (item) {
      setEditingId(item.id);
      setForm({ rfq_number: item.rfq_number, supplier: item.supplier, status: item.status, notes: item.notes });
    } else { setEditingId(null); setForm({ ...INITIAL_FORM, rfq_number: `RFQ-${new Date().getFullYear()}-${String(items.length + 1).padStart(4, '0')}` }); }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.rfq_number || !form.supplier) { toast('warning', 'RFQ number and supplier are required'); return; }
    setSaving(true);
    try {
      const data: Record<string, unknown> = { rfq_number: form.rfq_number, supplier: form.supplier, status: form.status, notes: form.notes };
      if (editingId) { await fabricApi.updateRFQ(editingId, data); toast('success', 'RFQ updated'); }
      else { await fabricApi.createRFQ(data); toast('success', 'RFQ created'); }
      setShowModal(false); load();
    } catch { toast('error', 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => { setDeleteId(id); };
  const confirmDelete = async () => {
    if (!deleteId) return;
    try { await fabricApi.deleteRFQ(deleteId); toast('success', 'RFQ deleted'); setDeleteId(null); load();
    } catch { toast('error', 'Failed to delete'); setDeleteId(null); }
  };

  const handleStatusTransition = async (rfqId: string, newStatus: string) => {
    try {
      await fabricApi.updateRFQ(rfqId, { status: newStatus });
      toast('success', `RFQ status changed to ${newStatus}`);
      load();
      if (detailRFQ?.id === rfqId) {
        setDetailRFQ(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch { toast('error', 'Failed to update status'); }
  };

  const handleViewDetail = async (rfq: RFQ) => {
    setDetailRFQ(rfq);
    setResponses([]);
    await loadResponses(rfq.id);
  };

  const openAddResponse = () => {
    if (!detailRFQ) return;
    setResponseForm({ supplier: detailRFQ.supplier, valid_until: '', notes: '' });
    const prices: Record<string, { quoted_price: string; available_qty_meters: string; lead_days: string }> = {};
    detailRFQ.line_items?.forEach((li: RFQLineItem) => {
      const target = li.target_price ? String(li.target_price) : '';
      const qty = li.quantity_meters ? String(li.quantity_meters) : '';
      prices[li.id] = { quoted_price: target, available_qty_meters: qty, lead_days: '' };
    });
    setResponseItemPrices(prices);
    setShowAddResponse(true);
  };

  const handleSaveResponse = async () => {
    if (!detailRFQ) return;
    if (!responseForm.supplier) { toast('warning', 'Supplier is required'); return; }
    setSavingResponse(true);
    try {
      const resp = await fabricApi.createRFQResponse({
        rfq: detailRFQ.id,
        supplier: responseForm.supplier,
        ...(responseForm.valid_until ? { valid_until: responseForm.valid_until } : {}),
        ...(responseForm.notes ? { notes: responseForm.notes } : {}),
      });
      const responseId = (resp.data as Record<string, unknown>).id as string;
      for (const li of detailRFQ.line_items || []) {
        const itemPrice = responseItemPrices[li.id];
        if (itemPrice && (itemPrice.quoted_price || itemPrice.available_qty_meters || itemPrice.lead_days)) {
          await fabricApi.createRFQResponseItem({
            response: responseId,
            line_item: li.id,
            ...(itemPrice.quoted_price ? { quoted_price: itemPrice.quoted_price } : {}),
            ...(itemPrice.available_qty_meters ? { available_qty_meters: itemPrice.available_qty_meters } : {}),
            ...(itemPrice.lead_days ? { lead_days: parseInt(itemPrice.lead_days) } : {}),
          });
        }
      }
      toast('success', 'Response created');
      setShowAddResponse(false);
      loadResponses(detailRFQ.id);
    } catch { toast('error', 'Failed to create response');
    } finally { setSavingResponse(false); }
  };

  const filtered = useMemo(() => items.filter(i => i.rfq_number.toLowerCase().includes(search.toLowerCase())), [items, search]);
  const pagedData = useMemo(() => { const s = (page - 1) * pageSize; return filtered.slice(s, s + pageSize); }, [filtered, page]);

  const columns: Column[] = [
    { key: 'rfq_number', label: 'RFQ #', sortable: true, render: (v) => <span className="font-mono text-heading">{String(v)}</span> },
    { key: 'supplier_name', label: 'Supplier', sortable: true },
    { key: 'status', label: 'Status', render: (_v, row) => {
      const s = row.status as string;
      return <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[s] || 'bg-surface-alt text-muted'}`}>{s}</span>;
    }},
    { key: 'line_items', label: 'Items', render: (_v, row) => {
      const lineItems = row.line_items as unknown[] | undefined;
      return <span className="text-muted">{lineItems?.length || 0}</span>;
    }},
    { key: 'notes', label: 'Notes', render: (v) => <span className="text-muted text-sm">{v ? String(v) : '-'}</span> },
    { key: 'actions', label: 'Actions', className: 'text-right', render: (_v, row) => {
      const item = row as unknown as RFQ;
      return <><button onClick={(e) => { e.stopPropagation(); handleOpenModal(item); }} className="text-heading hover:text-emerald-500 mr-3 text-sm">Edit</button><button onClick={(e) => { e.stopPropagation(); handleViewDetail(item); }} className="text-blue-400 hover:text-blue-300 mr-3 text-sm">View</button><button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="text-red-500 hover:text-red-400 text-sm">Delete</button></>;
    }},
  ];

  if (loading) return <Layout><div className="p-6 flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" /></div></Layout>;

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Fabric RFQs</h1>
          <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">+ New RFQ</button>
        </div>
        <DataTable data={pagedData as unknown as Record<string, unknown>[]} columns={columns} totalCount={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search by RFQ number..." loading={loading} onRowClick={(row) => handleViewDetail(row as unknown as RFQ)} />
      </div>

      {/* RFQ CRUD Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border"><h2 className="text-lg font-semibold">{editingId ? 'Edit' : 'New'} RFQ</h2></div>
            <div className="p-6 space-y-4">
              <div><label className="block text-sm text-muted mb-1">RFQ Number *</label><input type="text" value={form.rfq_number} onChange={(e) => setForm({...form, rfq_number: e.target.value})} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
              <div><label className="block text-sm text-muted mb-1">Supplier ID *</label><input type="text" value={form.supplier} onChange={(e) => setForm({...form, supplier: e.target.value})} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Supplier UUID" /></div>
              <div><label className="block text-sm text-muted mb-1">Status</label>
                <select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="draft">Draft</option><option value="sent">Sent</option><option value="responded">Responded</option><option value="closed">Closed</option><option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div><label className="block text-sm text-muted mb-1">Notes</label><textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} rows={2} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">{saving ? 'Saving...' : editingId ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2">Delete RFQ?</h2>
            <p className="text-muted text-sm mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-3"><button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-body hover:text-heading">Cancel</button><button onClick={confirmDelete} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg">Delete</button></div>
          </div>
        </div>
      )}

      {/* RFQ Detail Modal */}
      {detailRFQ && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl border border-border w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-semibold">{detailRFQ.rfq_number}</h2>
              <button onClick={() => setDetailRFQ(null)} className="text-muted hover:text-heading text-xl">&times;</button>
            </div>
            <div className="p-6 space-y-6">
              {/* RFQ Info */}
              <div className="grid grid-cols-3 gap-4">
                <div><span className="text-xs text-muted block">Supplier</span><span className="text-sm font-medium">{detailRFQ.supplier_name}</span></div>
                <div><span className="text-xs text-muted block">Status</span><span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[detailRFQ.status] || 'bg-surface-alt text-muted'}`}>{detailRFQ.status}</span></div>
                <div><span className="text-xs text-muted block">Created</span><span className="text-sm">{detailRFQ.created_at ? new Date(detailRFQ.created_at).toLocaleDateString() : '-'}</span></div>
                <div className="col-span-3"><span className="text-xs text-muted block">Notes</span><span className="text-sm text-body">{detailRFQ.notes || '-'}</span></div>
              </div>

              {/* Status Transitions */}
              {STATUS_TRANSITIONS[detailRFQ.status]?.length > 0 && (
                <div className="flex gap-2">
                  {STATUS_TRANSITIONS[detailRFQ.status].map((nextStatus) => (
                    <button key={nextStatus} onClick={() => handleStatusTransition(detailRFQ.id, nextStatus)} className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg text-sm font-medium transition-colors">
                      Mark as {nextStatus}
                    </button>
                  ))}
                </div>
              )}

              {/* Line Items */}
              <div>
                <h3 className="text-sm font-semibold text-heading mb-2">Line Items</h3>
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-muted border-b border-border">
                    <th className="py-2 pr-3">Category</th><th className="py-2 pr-3">Qty (m)</th><th className="py-2 pr-3">Target Price</th><th className="py-2">Notes</th>
                  </tr></thead>
                  <tbody>
                    {(detailRFQ.line_items || []).length === 0 ? (
                      <tr><td colSpan={4} className="py-4 text-center text-muted">No line items</td></tr>
                    ) : (detailRFQ.line_items || []).map((li: RFQLineItem) => (
                      <tr key={li.id} className="border-b border-border/50">
                        <td className="py-2 pr-3">{li.fabric_category_name || '-'}</td>
                        <td className="py-2 pr-3">{li.quantity_meters || '-'}</td>
                        <td className="py-2 pr-3">{li.target_price ? `$${li.target_price}` : '-'}</td>
                        <td className="py-2 text-muted">{li.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Responses */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-heading">Responses ({responses.length})</h3>
                  {detailRFQ.status !== 'closed' && detailRFQ.status !== 'cancelled' && (
                    <button onClick={openAddResponse} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors">+ Add Response</button>
                  )}
                </div>
                {loadingResponses ? (
                  <div className="flex justify-center py-4"><div className="animate-spin h-5 w-5 border-2 border-emerald-400 border-t-transparent rounded-full" /></div>
                ) : responses.length === 0 ? (
                  <p className="text-center text-muted py-4 text-sm">No responses yet</p>
                ) : (
                  <div className="space-y-3">
                    {responses.map((resp) => (
                      <div key={resp.id} className="border border-border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex gap-4 text-xs text-muted">
                            <span>Supplier: <strong className="text-heading">{resp.supplier_name || resp.supplier}</strong></span>
                            {resp.response_date && <span>Date: {new Date(resp.response_date).toLocaleDateString()}</span>}
                            {resp.valid_until && <span>Valid until: {new Date(resp.valid_until).toLocaleDateString()}</span>}
                          </div>
                          <button onClick={async () => { if (confirm('Delete this response?')) { try { await fabricApi.deleteRFQResponse(resp.id); toast('success', 'Response deleted'); loadResponses(detailRFQ.id); } catch { toast('error', 'Failed to delete'); } } }} className="text-red-500 hover:text-red-400 text-xs">Delete</button>
                        </div>
                        {resp.notes && <p className="text-xs text-muted mb-2">{resp.notes}</p>}
                        {(resp.response_items || []).length > 0 && (
                          <table className="w-full text-xs">
                            <thead><tr className="text-left text-muted border-b border-border">
                              <th className="py-1 pr-3">Item</th><th className="py-1 pr-3">Quoted Price</th><th className="py-1 pr-3">Avail Qty</th><th className="py-1">Lead (days)</th>
                            </tr></thead>
                            <tbody>
                              {resp.response_items.map((item: RFQResponseItem) => (
                                <tr key={item.id} className="border-b border-border/30">
                                  <td className="py-1 pr-3 text-heading">{item.line_item}</td>
                                  <td className="py-1 pr-3">{item.quoted_price ? `$${item.quoted_price}` : '-'}</td>
                                  <td className="py-1 pr-3">{item.available_qty_meters || '-'}</td>
                                  <td className="py-1">{item.lead_days != null ? item.lead_days : '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end">
              <button onClick={() => setDetailRFQ(null)} className="px-4 py-2 text-sm text-body hover:text-heading">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Response Modal */}
      {showAddResponse && detailRFQ && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-surface rounded-xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border"><h2 className="text-lg font-semibold">Add Response for {detailRFQ.rfq_number}</h2></div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm text-muted mb-1">Supplier ID *</label><input type="text" value={responseForm.supplier as string} onChange={(e) => setResponseForm({...responseForm, supplier: e.target.value})} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                <div><label className="block text-sm text-muted mb-1">Valid Until</label><input type="date" value={responseForm.valid_until as string} onChange={(e) => setResponseForm({...responseForm, valid_until: e.target.value})} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
              </div>
              <div><label className="block text-sm text-muted mb-1">Notes</label><textarea value={responseForm.notes as string} onChange={(e) => setResponseForm({...responseForm, notes: e.target.value})} rows={2} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
              <div>
                <h4 className="text-sm font-semibold text-heading mb-2">Line Item Quotes</h4>
                {(detailRFQ.line_items || []).length === 0 ? (
                  <p className="text-sm text-muted">No line items to quote</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-muted border-b border-border">
                      <th className="py-2 pr-2">Category</th><th className="py-2 pr-2">Target</th><th className="py-2 pr-2">Quoted Price</th><th className="py-2 pr-2">Avail Qty</th><th className="py-2">Lead Days</th>
                    </tr></thead>
                    <tbody>
                      {(detailRFQ.line_items || []).map((li: RFQLineItem) => {
                        const ip = responseItemPrices[li.id] || { quoted_price: '', available_qty_meters: '', lead_days: '' };
                        return (
                          <tr key={li.id} className="border-b border-border/50">
                            <td className="py-2 pr-2 text-xs">{li.fabric_category_name || li.id.substring(0, 8)}</td>
                            <td className="py-2 pr-2 text-xs text-muted">{li.target_price ? `$${li.target_price}` : '-'}</td>
                            <td className="py-2 pr-2"><input type="text" value={ip.quoted_price} onChange={(e) => setResponseItemPrices({...responseItemPrices, [li.id]: {...ip, quoted_price: e.target.value}})} className="w-20 px-2 py-1 bg-input border border-input-border rounded text-heading text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500" placeholder="$" /></td>
                            <td className="py-2 pr-2"><input type="text" value={ip.available_qty_meters} onChange={(e) => setResponseItemPrices({...responseItemPrices, [li.id]: {...ip, available_qty_meters: e.target.value}})} className="w-20 px-2 py-1 bg-input border border-input-border rounded text-heading text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500" placeholder="m" /></td>
                            <td className="py-2"><input type="text" value={ip.lead_days} onChange={(e) => setResponseItemPrices({...responseItemPrices, [li.id]: {...ip, lead_days: e.target.value}})} className="w-16 px-2 py-1 bg-input border border-input-border rounded text-heading text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500" placeholder="days" /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button onClick={() => setShowAddResponse(false)} className="px-4 py-2 text-sm text-body hover:text-heading">Cancel</button>
              <button onClick={handleSaveResponse} disabled={savingResponse} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">{savingResponse ? 'Saving...' : 'Create Response'}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
