import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { merchApi, setupApi } from '../api/client';
import type { Style, StyleVersion, StyleItem, FileOpening, PurchaseOrder, BOM, Vendor, UOM, DesignImage } from '../api/client';
import api from '../api/client';
import SearchableSelect from '../components/SearchableSelect';
import { useToast } from '../contexts/ToastContext';
import Layout from '../components/Layout';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-surface-alt/20 text-muted',
  active: 'bg-blue-500/20 text-badge-blue',
  approved: 'bg-emerald-500/20 text-badge-emerald',
  archived: 'bg-amber-500/20 text-badge-amber',
  open: 'bg-blue-500/20 text-badge-blue',
  confirmed: 'bg-emerald-500/20 text-badge-emerald',
  cancelled: 'bg-red-500/20 text-badge-red',
  closed: 'bg-surface-alt/20 text-muted',
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['active'],
  active: ['approved', 'archived'],
  approved: ['archived'],
  archived: [],
};

type Tab = 'overview' | 'sketches' | 'versions' | 'file_openings' | 'purchase_orders' | 'items' | 'bom' | 'design_images';

export default function StyleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [style, setStyle] = useState<Style | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [versions, setVersions] = useState<StyleVersion[]>([]);
  const [fileOpenings, setFileOpenings] = useState<FileOpening[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [boms, setBoms] = useState<BOM[]>([]);
  const [styleItems, setStyleItems] = useState<StyleItem[]>([]);
  const [designImages, setDesignImages] = useState<DesignImage[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewDesignImage, setPreviewDesignImage] = useState<{ url: string; label: string } | null>(null);
  const [deleteImageId, setDeleteImageId] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [previewSketch, setPreviewSketch] = useState<{ url: string; label: string } | null>(null);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [versionNotes, setVersionNotes] = useState('');
  const [versionStatus, setVersionStatus] = useState('draft');
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<StyleItem | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState({ category: 'fabric', item_name: '', description: '', uom: '', consumption: '', waste_percent: '', unit_price: '', vendor: '' });
  const [savingItem, setSavingItem] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [uoms, setUoms] = useState<UOM[]>([]);

  useEffect(() => {
    if (!previewSketch) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPreviewSketch(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previewSketch]);

  const fetchStyle = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await merchApi.getStyle(id);
      setStyle(res.data);
    } catch { toast('error', 'Failed to load style'); } finally { setLoading(false); }
  };

  const fetchTabData = async () => {
    if (!id) return;
    try {
      if (tab === 'versions') {
        const res = await merchApi.getStyleVersions(id);
        setVersions(res.data as unknown as StyleVersion[]);
      } else if (tab === 'file_openings') {
        const res = await merchApi.getStyleFileOpenings(id);
        setFileOpenings(res.data as unknown as FileOpening[]);
      } else if (tab === 'purchase_orders') {
        const res = await merchApi.getStylePOs(id);
        setPurchaseOrders(res.data);
      } else if (tab === 'items') {
        const res = await merchApi.getStyleItems(id);
        setStyleItems(res.data);
      } else if (tab === 'bom') {
        const res = await merchApi.getStyleBOMs(id);
        setBoms(res.data);
      } else if (tab === 'design_images') {
        const res = await merchApi.getStyleDesignImages(id);
        setDesignImages(res.data);
      }
    } catch { toast('error', 'Failed to load tab data'); }
  };

  useEffect(() => { fetchStyle(); if (id) { merchApi.getStyleItems(id).then(r => setStyleItems(r.data)).catch(() => {}); } }, [id]);
  useEffect(() => { fetchTabData(); }, [tab, id]);
  useEffect(() => {
    setupApi.getVendors({ page_size: '500' }).then(r => setVendors(r.data.results)).catch(() => {});
    setupApi.getUOMs({ page_size: '500' }).then(r => setUoms(r.data.results)).catch(() => {});
  }, []);

  const handleTransition = async (newStatus: string) => {
    if (!id) return;
    setTransitioning(true);
    try {
      await merchApi.transitionStyle(id, newStatus);
      await fetchStyle();
      toast('success', `Style ${newStatus} successfully`);
    } catch { toast('error', 'Failed to transition style'); } finally { setTransitioning(false); }
  };

  const handleSketchUpload = async (field: string, file: File) => {
    if (!id) return;
    setUploadingField(field);
    try {
      const formData = new FormData();
      formData.append(field, file);
      await api.patch(`/merchandising/styles/${id}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast('success', 'Sketch uploaded successfully');
      await fetchStyle();
    } catch { toast('error', 'Failed to upload sketch'); } finally { setUploadingField(null); }
  };

  const handleSketchDelete = async (field: string) => {
    if (!id) return;
    try {
      await api.patch(`/merchandising/styles/${id}/`, { [field]: null });
      toast('success', 'Sketch removed');
      await fetchStyle();
    } catch { toast('error', 'Failed to remove sketch'); }
  };

  const handleCreateVersion = async () => {
    if (!id || !versionNotes.trim()) return;
    setCreatingVersion(true);
    try {
      await merchApi.createStyleVersion(id, { revision_notes: versionNotes.trim(), status: versionStatus });
      toast('success', 'New version created');
      setShowVersionModal(false);
      setVersionNotes('');
      setVersionStatus('draft');
      await fetchTabData();
      await fetchStyle();
    } catch { toast('error', 'Failed to create version'); } finally { setCreatingVersion(false); }
  };

  const ITEM_CATEGORIES = ['fabric', 'trim', 'packaging', 'accessories', 'label', 'other'];

  const openAddItem = () => {
    setEditingItem(null);
    setItemForm({ category: 'fabric', item_name: '', description: '', uom: '', consumption: '', waste_percent: '', unit_price: '', vendor: '' });
    setShowItemModal(true);
  };

  const openEditItem = (item: StyleItem) => {
    setEditingItem(item);
    setItemForm({
      category: item.category, item_name: item.item_name, description: item.description,
      uom: item.uom || '', consumption: String(item.consumption ?? ''), waste_percent: String(item.waste_percent ?? ''),
      unit_price: String(item.unit_price ?? ''), vendor: item.vendor || '',
    });
    setShowItemModal(true);
  };

  const buildItemPayload = () => {
    if (!id || !itemForm.item_name.trim()) return null;
    const payload: Record<string, unknown> = {
      style: id, category: itemForm.category, item_name: itemForm.item_name.trim(),
      description: itemForm.description.trim(), sort_order: editingItem?.sort_order ?? styleItems.length,
    };
    if (itemForm.uom) payload.uom = itemForm.uom;
    if (itemForm.consumption) payload.consumption = parseFloat(itemForm.consumption);
    if (itemForm.waste_percent) payload.waste_percent = parseFloat(itemForm.waste_percent);
    if (itemForm.unit_price) payload.unit_price = parseFloat(itemForm.unit_price);
    if (itemForm.vendor) payload.vendor = itemForm.vendor;
    return payload;
  };

  const handleSaveItem = async (andContinue = false) => {
    const payload = buildItemPayload();
    if (!payload) return;
    setSavingItem(true);
    try {
      if (editingItem) {
        await merchApi.updateStyleItem(editingItem.id, payload);
        toast('success', 'Item updated');
      } else {
        await merchApi.createStyleItem(payload);
        toast('success', 'Item added');
      }
      if (andContinue && !editingItem) {
        setItemForm({ category: itemForm.category, item_name: '', description: '', uom: '', consumption: '', waste_percent: '', unit_price: '', vendor: '' });
      } else {
        setShowItemModal(false);
        setEditingItem(null);
      }
      await fetchTabData();
    } catch { toast('error', editingItem ? 'Failed to update item' : 'Failed to add item'); } finally { setSavingItem(false); }
  };

  const handleDeleteItem = async () => {
    if (!deleteItemId) return;
    try { await merchApi.deleteStyleItem(deleteItemId); setDeleteItemId(null); toast('success', 'Item deleted'); await fetchTabData(); } catch { toast('error', 'Failed to delete item'); }
  };

  const handleDesignImageUpload = async (file: File) => {
    if (!id) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('style', id);
      formData.append('image', file);
      formData.append('role', 'detail');
      await merchApi.createDesignImage(formData);
      toast('success', 'Design image uploaded');
      await fetchTabData();
      await fetchStyle();
    } catch { toast('error', 'Failed to upload design image'); } finally { setUploadingImage(false); }
  };

  const handleSetMainImage = async (imageId: string) => {
    try {
      await merchApi.setMainDesignImage(imageId);
      toast('success', 'Main design image updated');
      await fetchTabData();
      await fetchStyle();
    } catch { toast('error', 'Failed to set main image'); }
  };

  const handleDeleteDesignImage = async () => {
    if (!deleteImageId) return;
    try {
      await merchApi.deleteDesignImage(deleteImageId);
      setDeleteImageId(null);
      toast('success', 'Design image deleted');
      await fetchTabData();
      await fetchStyle();
    } catch { toast('error', 'Failed to delete design image'); }
  };

  if (loading) return <Layout><div className="py-20 flex items-center justify-center"><div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" /></div></Layout>;

  if (!style) return <Layout><div className="py-20 flex items-center justify-center"><p className="text-muted">Style not found</p></div></Layout>;

  const sketchFields = [
    { key: 'sketch_front', label: 'Front View', icon: '👔' },
    { key: 'sketch_back', label: 'Back View', icon: '🔙' },
    { key: 'sketch_side', label: 'Side View', icon: '↔️' },
    { key: 'sketch_detail', label: 'Detail View', icon: '🔍' },
  ];

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'sketches', label: 'Sketches' },
    { key: 'versions', label: 'Versions' },
    { key: 'file_openings', label: 'File Openings', count: style.file_openings_count },
    { key: 'purchase_orders', label: 'Purchase Orders', count: style.purchase_orders_count },
    { key: 'items', label: 'Line Items', count: styleItems.length },
    { key: 'bom', label: 'BOM' },
    { key: 'design_images', label: 'Design Images', count: designImages.length },
  ];

  return (
    <Layout>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold">{style.style_number}</h1>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[style.status] || ''}`}>{style.status}</span>
            </div>
            <p className="text-muted">{style.name}</p>
          </div>
          <div className="flex gap-2">
            {(VALID_TRANSITIONS[style.status] || []).map((s) => (
              <button key={s} disabled={transitioning} onClick={() => handleTransition(s)}
                className="px-3 py-1.5 bg-surface-alt hover:bg-surface-alt disabled:opacity-50 text-sm rounded-lg transition-colors capitalize">
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-1 border-b border-border mb-6">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${tab === t.key ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-muted hover:text-heading'}`}>
              {t.label}
              {t.count !== undefined && <span className="ml-1.5 px-1.5 py-0.5 bg-surface-alt rounded-full text-xs">{t.count}</span>}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface rounded-xl border border-border p-6">
              <h3 className="text-sm font-medium text-muted mb-4">Details</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-muted">Buyer</dt><dd>{style.buyer_name}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Season</dt><dd>{style.season_name || '-'}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Version</dt><dd>v{style.current_version}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Description</dt><dd className="text-right max-w-xs">{style.description || '-'}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Tech Pack</dt><dd>{style.tech_pack ? 'Uploaded' : 'None'}</dd></div>
              </dl>
            </div>
            <div className="bg-surface rounded-xl border border-border p-6">
              <h3 className="text-sm font-medium text-muted mb-4">Quick Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-input rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-400">{style.file_openings_count}</p>
                  <p className="text-xs text-muted mt-1">File Openings</p>
                </div>
                <div className="bg-input rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-400">{style.purchase_orders_count}</p>
                  <p className="text-xs text-muted mt-1">Purchase Orders</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'sketches' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {sketchFields.map(({ key, label, icon }) => {
              const url = style[key as keyof Style] as string | null;
              return (
                <div key={key} className="bg-surface rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-body">{icon} {label}</h4>
                    {url && (
                      <button onClick={() => handleSketchDelete(key)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                    )}
                  </div>
                  {url ? (
                    <div className="relative group cursor-pointer" onClick={() => setPreviewSketch({ url, label })}>
                      <img src={url} alt={label} className="w-full h-48 object-cover rounded-lg border border-input-border" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 rounded-lg transition-opacity">
                        <span className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-colors">Preview</span>
                        <label onClick={(e) => e.stopPropagation()} className="cursor-pointer px-3 py-1.5 bg-surface-alt hover:bg-surface-alt text-heading text-sm rounded-lg transition-colors">
                          Replace
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleSketchUpload(key, e.target.files[0])} />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-input-border rounded-lg cursor-pointer hover:border-emerald-500/50 hover:bg-surface-alt/30 transition-colors">
                      <svg className="w-8 h-8 text-faint mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm text-muted">
                        {uploadingField === key ? 'Uploading...' : 'Click to upload'}
                      </span>
                      <input type="file" accept="image/*" className="hidden" disabled={uploadingField === key}
                        onChange={(e) => e.target.files?.[0] && handleSketchUpload(key, e.target.files[0])} />
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === 'versions' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted">{versions.length} version{versions.length !== 1 ? 's' : ''}</p>
              <button onClick={() => setShowVersionModal(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-colors">
                + New Version
              </button>
            </div>
            <div className="space-y-3">
              {versions.length === 0 ? (
                <p className="text-muted text-sm py-8 text-center">No versions yet</p>
              ) : versions.map((v) => (
                <div key={v.id} className="bg-surface rounded-xl border border-border p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-emerald-400">V{v.version_number}</span>
                      {v.version_number === style?.current_version && (
                        <span className="px-1.5 py-0.5 bg-emerald-500/20 text-badge-emerald text-[10px] font-medium rounded">CURRENT</span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[v.status] || ''}`}>{v.status}</span>
                    </div>
                    {v.revision_notes && <p className="text-muted text-sm mt-1">{v.revision_notes}</p>}
                  </div>
                  <span className="text-xs text-faint">{new Date(v.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'file_openings' && (
          <div className="space-y-3">
            {fileOpenings.length === 0 ? (
              <p className="text-muted text-sm py-8 text-center">No file openings</p>
            ) : fileOpenings.map((fo) => (
              <div key={fo.id}
                onClick={() => navigate(`/file-openings/${fo.id}`)}
                className="bg-surface rounded-xl border border-border p-4 flex items-center justify-between cursor-pointer hover:border-emerald-500/40 hover:bg-surface-alt/30 transition-all group">
                <div>
                  <span className="font-mono text-sm text-blue-400 group-hover:text-blue-300">{fo.file_number}</span>
                  <span className={`ml-3 px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[fo.status] || ''}`}>{fo.status}</span>
                  <p className="text-muted text-sm mt-1">{fo.factory_name} &middot; {fo.file_date}</p>
                </div>
                <svg className="w-4 h-4 text-faint group-hover:text-muted transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            ))}
          </div>
        )}

        {tab === 'purchase_orders' && (
          <div className="space-y-3">
            {purchaseOrders.length === 0 ? (
              <p className="text-muted text-sm py-8 text-center">No purchase orders for this style</p>
            ) : purchaseOrders.map((po) => (
              <div key={po.id}
                onClick={() => navigate(`/purchase-orders/${po.id}`)}
                className="bg-surface rounded-xl border border-border p-4 flex items-center justify-between cursor-pointer hover:border-emerald-500/40 hover:bg-surface-alt/30 transition-all group">
                <div>
                  <span className="font-mono text-sm text-emerald-400 group-hover:text-emerald-300">{po.po_number}</span>
                  <span className={`ml-3 px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[po.status] || ''}`}>{po.status}</span>
                  <p className="text-muted text-sm mt-1">{po.factory_name} &middot; Del: {po.delivery_date} &middot; ${po.total_value}</p>
                </div>
                <svg className="w-4 h-4 text-faint group-hover:text-muted transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            ))}
          </div>
        )}

        {tab === 'items' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted">{styleItems.length} item{styleItems.length !== 1 ? 's' : ''} &middot; Prices are confirmed during BOM &amp; Costing</p>
              <button onClick={openAddItem}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-colors">
                + Add Item
              </button>
            </div>
            {styleItems.length === 0 ? (
              <div className="bg-surface rounded-xl border border-border p-12 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-input mb-4">
                  <svg className="w-7 h-7 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                </div>
                <p className="text-heading text-sm font-medium mb-1">No line items yet</p>
                <p className="text-faint text-xs mb-6">Define the material breakdown for this style. Prices and units will be confirmed during BOM &amp; Costing.</p>
                <button onClick={openAddItem}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors">
                  + Add First Item
                </button>
              </div>
            ) : (
              <div className="bg-surface rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase tracking-wider">Category</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase tracking-wider">Item Name</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase tracking-wider">Description</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase tracking-wider">UOM</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase tracking-wider">Vendor</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-muted uppercase tracking-wider">Consumption</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-muted uppercase tracking-wider">Unit Price</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-muted uppercase tracking-wider">Line Total</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-muted uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {styleItems.map((item) => (
                      <tr key={item.id} className="border-b border-border/50 last:border-0 hover:bg-surface-alt/30 transition-colors">
                        <td className="px-4 py-3"><span className="px-2 py-0.5 bg-surface-alt rounded text-xs font-medium capitalize">{item.category}</span></td>
                        <td className="px-4 py-3 font-medium text-heading">{item.item_name}</td>
                        <td className="px-4 py-3 text-muted max-w-[200px] truncate">{item.description || '-'}</td>
                        <td className="px-4 py-3 text-sm">{item.uom_name || <span className="text-faint">—</span>}</td>
                        <td className="px-4 py-3 text-sm">{item.vendor_name || <span className="text-faint">—</span>}</td>
                        <td className="px-4 py-3 text-right font-mono">{item.consumption != null ? Number(item.consumption) : '-'}</td>
                        <td className="px-4 py-3 text-right font-mono">{item.unit_price != null ? `$${Number(item.unit_price).toFixed(2)}` : '-'}</td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-400 font-medium">{item.line_total != null ? `$${Number(item.line_total).toFixed(2)}` : '-'}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => openEditItem(item)} className="text-xs text-blue-400 hover:text-blue-300 mr-3">Edit</button>
                          <button onClick={() => setDeleteItemId(item.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border bg-surface-alt/30">
                      <td colSpan={7} className="px-4 py-3 text-right text-xs font-medium text-muted uppercase">Total</td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-400 font-bold">
                        ${styleItems.reduce((sum, i) => sum + Number(i.line_total ?? 0), 0).toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'bom' && (
          <div className="space-y-3">
            {boms.length === 0 ? (
              <p className="text-muted text-sm py-8 text-center">No BOMs yet</p>
            ) : boms.map((bom) => (
              <div key={bom.id}
                onClick={() => navigate(`/boms/${bom.id}`)}
                className="bg-surface rounded-xl border border-border p-4 flex items-center justify-between cursor-pointer hover:border-emerald-500/40 hover:bg-surface-alt/30 transition-all group">
                <div>
                  <span className="font-medium group-hover:text-emerald-400 transition-colors">{bom.name}</span>
                  <span className="ml-2 text-muted text-sm">v{bom.version}</span>
                  <span className={`ml-3 px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[bom.status] || ''}`}>{bom.status}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 font-medium">${bom.total_cost.toFixed(2)}</span>
                  <svg className="w-4 h-4 text-faint group-hover:text-muted transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'design_images' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted">{designImages.length} image{designImages.length !== 1 ? 's' : ''} &middot; main image drives the style list</p>
              <label className="cursor-pointer px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-colors">
                {uploadingImage ? 'Uploading...' : '+ Add Image'}
                <input type="file" accept="image/*" className="hidden" disabled={uploadingImage}
                  onChange={(e) => e.target.files?.[0] && handleDesignImageUpload(e.target.files[0])} />
              </label>
            </div>
            {designImages.length === 0 ? (
              <div className="bg-surface rounded-xl border border-border p-12 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-input mb-4">
                  <svg className="w-7 h-7 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <p className="text-heading text-sm font-medium mb-1">No design images yet</p>
                <p className="text-faint text-xs">Upload front flats, range plan photos and colourway shots for this style.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {designImages.map((img) => (
                  <div key={img.id} className={`bg-surface rounded-xl border p-4 ${img.is_main ? 'border-emerald-500/60' : 'border-border'}`}>
                    <div className="relative group cursor-pointer" onClick={() => setPreviewDesignImage({ url: img.image, label: img.caption || `${img.style_number} ${img.role}` })}>
                      <img src={img.image} alt={img.caption || img.role} className="w-full h-40 object-cover rounded-lg border border-input-border" />
                      {img.is_main && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-medium rounded-full">MAIN</span>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 rounded-lg transition-opacity">
                        <span className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-lg transition-colors">Preview</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="px-2 py-0.5 bg-surface-alt rounded text-xs font-medium capitalize">{img.role}</span>
                      {!img.is_main ? (
                        <button onClick={() => handleSetMainImage(img.id)} className="text-xs text-blue-400 hover:text-blue-300">Set Main</button>
                      ) : (
                        <span className="text-xs text-emerald-400 font-medium">Main Image</span>
                      )}
                    </div>
                    {img.caption && <p className="text-muted text-xs mt-2 truncate">{img.caption}</p>}
                    {img.colourway && <p className="text-faint text-xs mt-0.5 truncate">Colourway: {img.colourway}</p>}
                    <div className="mt-3 flex justify-end">
                      <button onClick={() => setDeleteImageId(img.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {showItemModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowItemModal(false)}>
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">{editingItem ? 'Edit Item' : 'Add Line Item'}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted mb-1">Category *</label>
                  <select value={itemForm.category} onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
                    {ITEM_CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Item Name *</label>
                  <input value={itemForm.item_name} onChange={(e) => setItemForm({ ...itemForm, item_name: e.target.value })}
                    placeholder="e.g. Cotton Jersey 180gsm"
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Description</label>
                <textarea value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} rows={2}
                  placeholder="Material specifications..."
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted mb-1">UOM</label>
                  <SearchableSelect
                    options={uoms.map(u => ({ value: u.id, label: u.name, description: u.code }))}
                    value={itemForm.uom || null}
                    onChange={(v) => setItemForm({ ...itemForm, uom: String(v || '') })}
                    placeholder="Select unit of measure..."
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Consumption</label>
                  <input type="number" step="0.0001" value={itemForm.consumption} onChange={(e) => setItemForm({ ...itemForm, consumption: e.target.value })}
                    placeholder="0.0000"
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Waste %</label>
                  <input type="number" step="0.01" value={itemForm.waste_percent} onChange={(e) => setItemForm({ ...itemForm, waste_percent: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Unit Price ($)</label>
                  <input type="number" step="0.01" value={itemForm.unit_price} onChange={(e) => setItemForm({ ...itemForm, unit_price: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Vendor</label>
                <SearchableSelect
                  options={vendors.map(v => ({ value: v.id, label: `${v.name} (${v.code})` }))}
                  value={itemForm.vendor || null}
                  onChange={(v) => setItemForm({ ...itemForm, vendor: String(v || '') })}
                  placeholder="Select a vendor..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowItemModal(false)} className="px-4 py-2 text-sm text-muted hover:text-heading transition-colors">Cancel</button>
              {!editingItem && (
                <button onClick={() => handleSaveItem(true)} disabled={!itemForm.item_name.trim() || savingItem}
                  className="px-4 py-2 bg-surface-alt hover:bg-input border border-border text-heading text-sm rounded-lg transition-colors disabled:opacity-50">
                  {savingItem ? 'Saving...' : 'Add & Continue'}
                </button>
              )}
              <button onClick={() => handleSaveItem(false)} disabled={!itemForm.item_name.trim() || savingItem}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors">
                {savingItem ? 'Saving...' : editingItem ? 'Save Changes' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteItemId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setDeleteItemId(null)}>
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Delete Item?</h3>
            <p className="text-muted text-sm mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteItemId(null)} className="px-4 py-2 text-sm text-muted hover:text-heading">Cancel</button>
              <button onClick={handleDeleteItem} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg">Delete</button>
            </div>
          </div>
        </div>
      )}

      {deleteImageId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setDeleteImageId(null)}>
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Delete Design Image?</h3>
            <p className="text-muted text-sm mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteImageId(null)} className="px-4 py-2 text-sm text-muted hover:text-heading">Cancel</button>
              <button onClick={handleDeleteDesignImage} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg">Delete</button>
            </div>
          </div>
        </div>
      )}

      {showVersionModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowVersionModal(false)}>
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Create New Version</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-muted mb-1">Revision Notes *</label>
                <textarea value={versionNotes} onChange={(e) => setVersionNotes(e.target.value)} rows={3}
                  placeholder="What changed in this version..."
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Status</label>
                <select value={versionStatus} onChange={(e) => setVersionStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="approved">Approved</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowVersionModal(false)}
                className="px-4 py-2 text-sm text-muted hover:text-heading transition-colors">Cancel</button>
              <button onClick={handleCreateVersion} disabled={!versionNotes.trim() || creatingVersion}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors">
                {creatingVersion ? 'Creating...' : 'Create Version'}
              </button>
            </div>
          </div>
        </div>
      )}

      {previewSketch && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-8" onClick={() => setPreviewSketch(null)}>
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-heading font-medium">{previewSketch.label}</h3>
              <button onClick={() => setPreviewSketch(null)} className="text-muted hover:text-heading transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <img src={previewSketch.url} alt={previewSketch.label}
              className="w-full max-h-[80vh] object-contain rounded-xl border border-input-border" />
          </div>
        </div>
      )}

      {previewDesignImage && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-8" onClick={() => setPreviewDesignImage(null)}>
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-heading font-medium">{previewDesignImage.label}</h3>
              <button onClick={() => setPreviewDesignImage(null)} className="text-muted hover:text-heading transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <img src={previewDesignImage.url} alt={previewDesignImage.label}
              className="w-full max-h-[80vh] object-contain rounded-xl border border-input-border" />
          </div>
        </div>
      )}
    </Layout>
  );
}
