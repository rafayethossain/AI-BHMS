import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { merchApi, setupApi } from '../api/client';
import type { BOM, BOMItem, Vendor, UOM } from '../api/client';
import { useToast } from '../contexts/ToastContext';
import SearchableSelect from '../components/SearchableSelect';
import Layout from '../components/Layout';

const CATEGORY_COLORS: Record<string, string> = {
  fabric: 'bg-blue-500/20 text-badge-blue',
  trim: 'bg-purple-500/20 text-badge-purple',
  accessories: 'bg-amber-500/20 text-badge-amber',
  packaging: 'bg-green-500/20 text-badge-green',
  label: 'bg-cyan-500/20 text-cyan-400',
  other: 'bg-surface-alt/20 text-muted',
};

export default function BOMDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bom, setBOM] = useState<BOM | null>(null);
  const [items, setItems] = useState<BOMItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddItem, setShowAddItem] = useState(false);
  const [editItem, setEditItem] = useState<BOMItem | null>(null);
  const [itemForm, setItemForm] = useState({ category: 'fabric', item_name: '', description: '', uom: '', consumption: '', waste_percent: '', unit_price: '', vendor: '', supplier: '', ordered_qty: '', delivered_qty: '', eta_date: '', confirmed_date: '', actual_date: '', status: 'TBC' });
  const [saving, setSaving] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [showGenerateCosting, setShowGenerateCosting] = useState(false);
  const [showCopyTrims, setShowCopyTrims] = useState(false);
  const [boms, setBOMs] = useState<BOM[]>([]);
  const [sourceBomId, setSourceBomId] = useState('');
  const [overwrite, setOverwrite] = useState(false);
  const [selective, setSelective] = useState<'all' | 'detail' | 'washcare'>('all');
  const [selectedPO, setSelectedPO] = useState('');
  const [pos, setPOs] = useState<{ id: string; po_number: string; buyer_name: string; factory_name: string; delivery_date: string; status: string }[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [uoms, setUoms] = useState<UOM[]>([]);

  const fetchBOM = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [bomRes, itemsRes] = await Promise.all([merchApi.getBOM(id), merchApi.getBOMItems(id)]);
      setBOM(bomRes.data); setItems(itemsRes.data as unknown as BOMItem[]);
    } catch { toast('error', 'Failed to load BOM'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchBOM(); }, [id]);
  useEffect(() => {
    setupApi.getVendors({ page_size: '500' }).then(r => setVendors(r.data.results)).catch(() => {});
    setupApi.getUOMs({ page_size: '500' }).then(r => setUoms(r.data.results)).catch(() => {});
  }, []);

  const handleAddItem = async () => {
    setSaving(true);
    try {
      await merchApi.createBOMItem({ bom: id, ...itemForm });
      toast('success', 'Item added'); setShowAddItem(false);
      setItemForm({ category: 'fabric', item_name: '', description: '', uom: '', consumption: '', waste_percent: '', unit_price: '', vendor: '', supplier: '', ordered_qty: '', delivered_qty: '', eta_date: '', confirmed_date: '', actual_date: '', status: 'TBC' });
      fetchBOM();
    } catch { toast('error', 'Failed to add item'); } finally { setSaving(false); }
  };

  const handleUpdateItem = async () => {
    if (!editItem) return;
    setSaving(true);
    try {
      await merchApi.updateBOMItem(editItem.id, itemForm);
      toast('success', 'Item updated'); setEditItem(null);
      fetchBOM();
    } catch { toast('error', 'Failed to update item'); } finally { setSaving(false); }
  };

  const handleDeleteItem = async (itemId: string) => {
    try { await merchApi.deleteBOMItem(itemId); setDeleteItemId(null); toast('success', 'Item deleted'); fetchBOM(); } catch { toast('error', 'Failed to delete item'); }
  };

  const handleActivate = async () => {
    try { await merchApi.activateBOM(id!); toast('success', 'BOM activated'); fetchBOM(); } catch { toast('error', 'Failed to activate BOM'); }
  };

  const openEdit = (item: BOMItem) => {
    setEditItem(item);
    setItemForm({ category: item.category, item_name: item.item_name, description: item.description, uom: item.uom || '', consumption: item.consumption || '', waste_percent: item.waste_percent || '', unit_price: item.unit_price || '', vendor: item.vendor || '', supplier: item.supplier || '', ordered_qty: item.ordered_qty || '', delivered_qty: item.delivered_qty || '', eta_date: item.eta_date || '', confirmed_date: item.confirmed_date || '', actual_date: item.actual_date || '', status: item.status || 'TBC' });
  };

  const openCopyTrims = async () => {
    setShowCopyTrims(true);
    if (boms.length) return;
    try {
      const r = await merchApi.getBOMs({ page_size: '100' });
      setBOMs(r.data.results);
    } catch {} // Silently ignore - secondary dropdown data
  };

  const handleCopyTrims = async () => {
    if (!sourceBomId) return;
    setSaving(true);
    try {
      await merchApi.copyTrims(id!, { source_bom: sourceBomId, overwrite, selective });
      toast('success', 'Trims copied from source BOM');
      setShowCopyTrims(false); setSourceBomId(''); fetchBOM();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast('error', err.response?.data?.error || 'Failed to copy trims');
    } finally { setSaving(false); }
  };

  const fetchPOs = async () => {
    if (!bom?.style_id) return;
    try {
      const r = await merchApi.getPOs({ file_opening__style: bom.style_id, page_size: '100' });
      setPOs(r.data.results);
    } catch {} // Silently ignore - secondary dropdown data
  };

  const handleGenerateCosting = async () => {
    if (!bom || !selectedPO) return;
    try {
      const res = await merchApi.generateCostingFromBOM({ bom_id: bom.id, purchase_order_id: selectedPO });
      toast('success', 'Costing generated');
      setShowGenerateCosting(false);
      navigate(`/costings/${res.data.id}`);
    } catch { toast('error', 'Failed to generate costing'); }
  };

  const totalCost = items.reduce((sum, item) => sum + (item.line_total || 0), 0);
  const categories = [...new Set(items.map(i => i.category))];
  if (loading) return <Layout><div className="py-20 flex items-center justify-center"><div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" /></div></Layout>;

  if (!bom) return <Layout><div className="py-20 flex items-center justify-center">BOM not found</div></Layout>;

  return (
    <Layout>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <button onClick={() => navigate('/boms')} className="text-sm text-muted hover:text-heading mb-4 transition-colors">&larr; Back to BOMs</button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{bom.name}</h1>
            <p className="text-muted text-sm mt-1">{bom.style_number} &middot; v{bom.version} &middot; <span className={`px-2 py-0.5 rounded-full text-xs ${bom.status === 'active' ? 'bg-emerald-500/20 text-badge-emerald' : 'bg-surface-alt/20 text-muted'}`}>{bom.status}</span></p>
          </div>
          <div className="flex gap-2">
            {bom.status === 'draft' && (
              <button onClick={handleActivate} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">Activate</button>
            )}
            {bom.status === 'active' && (
              <button onClick={() => { setShowGenerateCosting(true); fetchPOs(); }} className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors">Generate Costing</button>
            )}
            <button onClick={openCopyTrims} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">Copy Trims</button>
            <button onClick={() => setShowAddItem(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">+ Add Item</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-surface rounded-xl border border-border p-4">
            <p className="text-sm text-muted">Total Items</p>
            <p className="text-2xl font-bold text-heading">{items.length}</p>
          </div>
          <div className="bg-surface rounded-xl border border-border p-4">
            <p className="text-sm text-muted">Categories</p>
            <p className="text-2xl font-bold text-heading">{categories.length}</p>
          </div>
          <div className="bg-surface rounded-xl border border-border p-4">
            <p className="text-sm text-muted">Total Cost</p>
            <p className="text-2xl font-bold text-emerald-700">${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="bg-surface rounded-xl border border-border p-12 text-center text-muted">
            <p className="text-lg">No items in this BOM</p>
            <p className="text-sm mt-1">Add items to build the bill of materials</p>
          </div>
        ) : (
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-sm text-muted">
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Item Name</th>
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3">Vendor</th>
                  <th className="px-6 py-3 text-right">UOM</th>
                  <th className="px-6 py-3 text-right">Consumption</th>
                  <th className="px-6 py-3 text-right">Unit Price</th>
                  <th className="px-6 py-3 text-right">Line Total</th>
                  <th className="px-6 py-3 text-right">Ordered</th>
                  <th className="px-6 py-3 text-right">Delivered</th>
                  <th className="px-6 py-3">ETA</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="border-b border-border hover:bg-surface-alt/30 transition-colors">
                    <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-medium ${CATEGORY_COLORS[item.category] || CATEGORY_COLORS.other}`}>{item.category}</span></td>
                    <td className="px-6 py-4 text-sm font-medium">{item.item_name}</td>
                    <td className="px-6 py-4 text-sm text-body">{item.description || '-'}</td>
                    <td className="px-6 py-4 text-sm">{item.vendor_name || <span className="text-faint">—</span>}</td>
                    <td className="px-6 py-4 text-sm text-right text-body">{item.uom_name || '-'}</td>
                    <td className="px-6 py-4 text-sm text-right text-body">{item.consumption || '-'}</td>
                    <td className="px-6 py-4 text-sm text-right text-body">{item.unit_price ? `$${parseFloat(item.unit_price).toFixed(2)}` : '-'}</td>
                    <td className="px-6 py-4 text-sm text-right text-emerald-700 font-mono">{item.line_total != null ? `$${Number(item.line_total).toFixed(2)}` : '-'}</td>
                    <td className="px-6 py-4 text-sm text-right text-body">{item.ordered_qty || '-'}</td>
                    <td className="px-6 py-4 text-sm text-right text-body">{item.delivered_qty || '-'}</td>
                    <td className="px-6 py-4 text-sm text-body">{item.eta_date || '-'}</td>
                    <td className="px-6 py-4 text-sm">
                      {item.status && item.status !== 'TBC' ? (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.status === 'DELIVERED' ? 'bg-emerald-500/20 text-badge-emerald' : item.status === 'CONFIRMED' ? 'bg-blue-500/20 text-badge-blue' : 'bg-amber-500/20 text-badge-amber'}`}>{item.status}</span>
                      ) : <span className="text-faint">—</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => openEdit(item)} className="text-sm text-blue-700 hover:text-blue-600 mr-3">Edit</button>
                      <button onClick={() => setDeleteItemId(item.id)} className="text-sm text-red-700 hover:text-red-600">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {(showAddItem || editItem) && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">{editItem ? 'Edit Item' : 'Add Item'}</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-body mb-1">Category *</label>
                  <SearchableSelect
                    options={[
                      {value:'fabric', label:'Fabric'},
                      {value:'trim', label:'Trim'},
                      {value:'accessory', label:'Accessory'},
                      {value:'label', label:'Label'},
                      {value:'packaging', label:'Packaging'},
                    ]}
                    value={String(itemForm.category)}
                    onChange={(v) => setItemForm({ ...itemForm, category: String(v || 'fabric') })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Item Name *</label>
                  <input value={itemForm.item_name} onChange={(e) => setItemForm({ ...itemForm, item_name: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Description</label>
                <input value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-body mb-1">UOM</label>
                  <SearchableSelect
                    options={uoms.map(u => ({ value: u.id, label: `${u.name}`, description: u.code }))}
                    value={itemForm.uom || null}
                    onChange={(v) => setItemForm({ ...itemForm, uom: String(v || '') })}
                    placeholder="Select unit of measure..."
                  />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Consumption</label>
                  <input value={itemForm.consumption} onChange={(e) => setItemForm({ ...itemForm, consumption: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Waste %</label>
                  <input value={itemForm.waste_percent} onChange={(e) => setItemForm({ ...itemForm, waste_percent: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="5" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-body mb-1">Unit Price</label>
                  <input type="number" step="0.01" value={itemForm.unit_price} onChange={(e) => setItemForm({ ...itemForm, unit_price: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Vendor</label>
                  <SearchableSelect
                    options={vendors.map(v => ({ value: v.id, label: `${v.name} (${v.code})` }))}
                    value={itemForm.vendor || null}
                    onChange={(v) => setItemForm({ ...itemForm, vendor: String(v || '') })}
                    placeholder="Select a vendor..."
                  />
                </div>
              </div>
              <div className="border-t border-border pt-4">
                <p className="text-xs font-medium text-muted uppercase tracking-wide mb-3">Trim Schedule</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-body mb-1">Ordered Qty</label>
                    <input type="number" step="0.01" value={itemForm.ordered_qty} onChange={(e) => setItemForm({ ...itemForm, ordered_qty: e.target.value })}
                      className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-sm text-body mb-1">Delivered Qty</label>
                    <input type="number" step="0.01" value={itemForm.delivered_qty} onChange={(e) => setItemForm({ ...itemForm, delivered_qty: e.target.value })}
                      className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-sm text-body mb-1">Status</label>
                    <select value={itemForm.status} onChange={(e) => setItemForm({ ...itemForm, status: e.target.value })}
                      className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                      <option value="TBC">TBC</option>
                      <option value="CONFIRMED">CONFIRMED</option>
                      <option value="DELIVERED">DELIVERED</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-sm text-body mb-1">ETA</label>
                    <input type="date" value={itemForm.eta_date} onChange={(e) => setItemForm({ ...itemForm, eta_date: e.target.value })}
                      className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-body mb-1">Confirmed Date</label>
                    <input type="date" value={itemForm.confirmed_date} onChange={(e) => setItemForm({ ...itemForm, confirmed_date: e.target.value })}
                      className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-body mb-1">Actual Date</label>
                    <input type="date" value={itemForm.actual_date} onChange={(e) => setItemForm({ ...itemForm, actual_date: e.target.value })}
                      className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => { setShowAddItem(false); setEditItem(null); }} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
                <button onClick={editItem ? handleUpdateItem : handleAddItem} disabled={saving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white text-sm rounded-lg transition-colors">
                  {saving ? 'Saving...' : editItem ? 'Update' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showGenerateCosting && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-lg">
            <h2 className="text-lg font-bold mb-1">Generate Costing</h2>
            <p className="text-sm text-muted mb-4">Select a Purchase Order linked to style <span className="font-mono font-medium">{bom?.style_number}</span></p>
            {pos.length === 0 ? (
              <div className="bg-surface-alt rounded-lg p-6 text-center mb-4">
                <p className="text-muted text-sm">No Purchase Orders found for this style.</p>
                <p className="text-faint text-xs mt-1">Create a PO linked to this style first, then come back.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-body mb-1">Purchase Order *</label>
                  <SearchableSelect
                    options={pos.map(po => ({
                      value: po.id,
                      label: `${po.po_number}`,
                      description: `${po.buyer_name} · ${po.factory_name} · Due ${po.delivery_date || 'TBD'}`,
                    }))}
                    value={selectedPO || null}
                    onChange={(v) => setSelectedPO(String(v || ''))}
                    placeholder="Select a PO..."
                  />
                </div>
                {selectedPO && (() => {
                  const po = pos.find(p => p.id === selectedPO);
                  if (!po) return null;
                  return (
                    <div className="bg-surface-alt rounded-lg p-3 text-sm space-y-1">
                      <div className="flex justify-between"><span className="text-muted">Buyer</span><span className="text-heading font-medium">{po.buyer_name}</span></div>
                      <div className="flex justify-between"><span className="text-muted">Factory</span><span className="text-heading font-medium">{po.factory_name}</span></div>
                      <div className="flex justify-between"><span className="text-muted">Delivery</span><span className="text-heading font-medium">{po.delivery_date || 'TBD'}</span></div>
                    </div>
                  );
                })()}
              </div>
            )}
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => { setShowGenerateCosting(false); setSelectedPO(''); }} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
              <button onClick={handleGenerateCosting} disabled={!selectedPO || pos.length === 0}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-600/50 text-white text-sm rounded-lg transition-colors">Generate</button>
            </div>
          </div>
        </div>
      )}

      {showCopyTrims && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-lg">
            <h2 className="text-lg font-bold mb-1">Copy Trims From Another BOM</h2>
            <p className="text-sm text-muted mb-4">Copy trim/label line items from a source BOM into <span className="font-mono font-medium">{bom?.name}</span></p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-body mb-1">Source BOM *</label>
                <SearchableSelect
                  options={boms.filter(b => b.id !== id).map(b => ({
                    value: b.id,
                    label: b.name,
                    description: `${b.style_number} · v${b.version} · ${b.status}`,
                  }))}
                  value={sourceBomId || null}
                  onChange={(v) => setSourceBomId(String(v || ''))}
                  placeholder="Select source BOM..."
                />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Selective</label>
                <select value={selective} onChange={(e) => setSelective(e.target.value as 'all' | 'detail' | 'washcare')}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="all">All trims & labels</option>
                  <option value="detail">Detail trims only</option>
                  <option value="washcare">Wash care labels only</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-body">
                <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} className="rounded border-input-border" />
                Overwrite existing trim items
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowCopyTrims(false)} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
              <button onClick={handleCopyTrims} disabled={!sourceBomId || saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-sm rounded-lg transition-colors">{saving ? 'Copying...' : 'Copy Trims'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteItemId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2">Delete Item?</h2>
            <p className="text-muted text-sm mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteItemId(null)} className="px-4 py-2 text-sm text-body hover:text-heading">Cancel</button>
              <button onClick={() => handleDeleteItem(deleteItemId)} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg">Delete</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
