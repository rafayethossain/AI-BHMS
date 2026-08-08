import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { merchApi, setupApi } from '../api/client';
import type { PurchaseOrder, PurchaseOrderItem, POAmendment, TAMilestone, Costing, Hit } from '../api/client';
import SearchableSelect from '../components/SearchableSelect';
import { useToast } from '../contexts/ToastContext';
import Layout from '../components/Layout';
import OrderJourney from '../components/OrderJourney';
import WhatsNext from '../components/WhatsNext';
import StatusTransitionWizard from '../components/StatusTransitionWizard';

type MilestoneTemplate = { name: string; description: string; offset_days: number; is_critical: boolean };
type TATemplate = { id: string; name: string; description: string; milestones: MilestoneTemplate[] };
type JourneyStep = { key: string; label: string; status: string; id: string | null; code: string | null; [k: string]: unknown };

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-surface-alt/20 text-muted',
  open: 'bg-blue-500/20 text-badge-blue',
  confirmed: 'bg-emerald-500/20 text-badge-emerald',
  in_production: 'bg-amber-500/20 text-badge-amber',
  quality_check: 'bg-purple-500/20 text-badge-purple',
  ready: 'bg-cyan-500/20 text-cyan-400',
  shipped: 'bg-indigo-500/20 text-indigo-400',
  delivered: 'bg-green-500/20 text-badge-green',
  cancelled: 'bg-red-500/20 text-badge-red',
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['confirmed', 'cancelled'],
  open: ['confirmed', 'cancelled'],
  confirmed: ['in_production', 'cancelled'],
  in_production: ['quality_check', 'cancelled'],
  quality_check: ['ready'],
  ready: ['shipped'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

type Tab = 'overview' | 'items' | 'hits' | 'amendments' | 'ta' | 'bom_costing' | 'financials';

const HIT_MODE_OPTIONS = [
  { value: 'boxed', label: 'Boxed' },
  { value: 'hanging', label: 'Hanging' },
];
const HIT_TYPE_OPTIONS = [
  { value: 'sea', label: 'Sea' },
  { value: 'air', label: 'Air' },
];

const INITIAL_HIT_FORM = {
  colour: '', delivery_mode: 'boxed', delivery_type: 'sea',
  factory_override: '', original_delivery_date: '', actual_delivery_date: '',
};

function LinkedRow({ label, code, name, status, statusColor, url }: { label: string; code: string; name?: string; status: string; statusColor: string; url: string }) {
  return (
    <a href={url} className="flex items-center justify-between py-1.5 hover:bg-surface-alt rounded px-2 -mx-2 transition-colors group">
      <div className="flex items-center gap-2">
        <span className="text-xs text-faint w-20">{label}</span>
        <span className="text-xs font-mono text-heading group-hover:text-emerald-400 transition-colors">{code}</span>
        {name && <span className="text-xs text-muted hidden sm:inline">&middot; {name}</span>}
      </div>
      <span className={`text-xs ${statusColor}`}>{status}</span>
    </a>
  );
}

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [po, setPO] = useState<PurchaseOrder | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PurchaseOrderItem[]>([]);
  const [hits, setHits] = useState<Hit[]>([]);
  const [factories, setFactories] = useState<{ id: string; name: string }[]>([]);
  const [showAddHit, setShowAddHit] = useState(false);
  const [editHit, setEditHit] = useState<Hit | null>(null);
  const [hitForm, setHitForm] = useState(INITIAL_HIT_FORM);
  const [savingHit, setSavingHit] = useState(false);
  const [deleteHitId, setDeleteHitId] = useState<string | null>(null);
  const [amendments, setAmendments] = useState<POAmendment[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [editItem, setEditItem] = useState<PurchaseOrderItem | null>(null);
  const [itemForm, setItemForm] = useState({ color: '', size: '', quantity: '', unit_price: '' });
  const [saving, setSaving] = useState(false);
  const [colors, setColors] = useState<{ id: string; name: string }[]>([]);
  const [showAmend, setShowAmend] = useState(false);
  const [amendForm, setAmendForm] = useState({ field_name: 'delivery_date', new_value: '', reason: '' });
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [taData, setTaData] = useState<{ id: string; status: string | null; delivery_date: string | null; milestones: TAMilestone[] } | null>(null);
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState({ name: '', description: '', planned_date: '', is_critical: false });
  const [taTemplates, setTaTemplates] = useState<TATemplate[]>([]);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TATemplate | null>(null);
  const [bulkDeliveryDate, setBulkDeliveryDate] = useState('');
  const [bulkMilestones, setBulkMilestones] = useState<(MilestoneTemplate & { planned_date: string })[]>([]);
  const [showBulkEditor, setShowBulkEditor] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showTransitionWizard, setShowTransitionWizard] = useState(false);
  const [bomCostingData, setBomCostingData] = useState<{ bom: { id: string; name: string; version: number; status: string; style_number: string | null; item_count: number; categories: { fabric: number; trim: number; accessories: number; overhead: number; total: number } } | null; costings: Costing[] } | null>(null);
  const [generatingCosting, setGeneratingCosting] = useState(false);
  const [showCreateBOM, setShowCreateBOM] = useState(false);
  const [bomName, setBomName] = useState('');
  const [bomItems, setBomItems] = useState<{ category: string; item_name: string; description: string; consumption: string; waste_percent: string; unit_price: string }[]>([]);
  const [creatingBOM, setCreatingBOM] = useState(false);
  const [linkedData, setLinkedData] = useState<{
    style: { id: string; style_number: string; name: string; status: string; url: string } | null;
    file_opening: { id: string; file_number: string; status: string; url: string } | null;
    ta: { id: string; status: string; completed_milestones: number; total_milestones: number; url: string } | null;
    bom: { id: string; name: string; version: number; status: string; item_count: number; url: string } | null;
    costing: { id: string; version: number; status: string; total_cost: number; url: string } | null;
    production_plan: { id: string; status: string; quantity: number; start_date: string | null; end_date: string | null; url: string } | null;
    quality_inspections: { id: string; inspection_type: string; status: string; inspection_date: string; url: string }[];
    proforma_invoice: { id: string; pi_number: string; status: string; amount: number; url: string } | null;
    sales_contract: { id: string; contract_number: string; status: string; total_amount: number; url: string } | null;
  } | null>(null);
  const [generatingPI, setGeneratingPI] = useState(false);
  const [generatingSC, setGeneratingSC] = useState(false);
  const [profitData, setProfitData] = useState<{
    revenue: number; revenue_per_unit: number; revenue_source: string;
    cost_breakdown: { fabric: number; trim: number; cm: number; overhead: number; total: number; version: number; status: string } | null;
    total_cost: number; cost_per_unit: number; profit: number; margin_percent: number;
  } | null>(null);
  const [journeySteps, setJourneySteps] = useState<JourneyStep[]>([]);
  const [journeyCurrentStep, setJourneyCurrentStep] = useState('');

  const fetchPO = async () => {
    if (!id) return;
    setLoading(true);
    try { const res = await merchApi.getPO(id); setPO(res.data); } catch { toast('error', 'Failed to load purchase order'); } finally { setLoading(false); }
  };

  const fetchItems = async () => {
    if (!id) return;
    try { const res = await merchApi.getPOItems(id); setItems(res.data as unknown as PurchaseOrderItem[]); } catch { toast('error', 'Failed to load items'); }
  };

  const fetchHits = async () => {
    if (!id) return;
    try { const res = await merchApi.getPOHits(id, { page_size: '200' }); setHits(res.data.results); } catch { toast('error', 'Failed to load hits'); }
  };

  const fetchFactories = async () => {
    try { const res = await setupApi.getFactories({ page_size: '200' }); setFactories(res.data.results.map(f => ({ id: f.id, name: f.name }))); } catch { toast('error', 'Failed to load factories'); }
  };

  const fetchAmendments = async () => {
    if (!id) return;
    try { const res = await merchApi.getPOAmendments(id); setAmendments(res.data as unknown as POAmendment[]); } catch { toast('error', 'Failed to load amendments'); }
  };

  const fetchColors = async () => {
    try { const res = await fetch('/api/v1/setup/color-codes/', { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } }); const data = await res.json(); setColors(data.results || data); } catch { toast('error', 'Failed to load colors'); }
  };

  const fetchTA = async () => {
    if (!id) return;
    try { const res = await merchApi.getPO_TA(id); setTaData(res.data); } catch { toast('error', 'Failed to load T&A data'); }
  };

  const fetchTemplates = async () => {
    try { const res = await merchApi.getTATemplates(); setTaTemplates(res.data); } catch { toast('error', 'Failed to load T&A templates'); }
  };

  const fetchBOMCosting = async () => {
    if (!id) return;
    try { const res = await merchApi.getPO_BOMCosting(id); setBomCostingData(res.data); } catch { toast('error', 'Failed to load BOM & costing'); }
  };

  const fetchJourney = async () => {
    if (!id) return;
    try {
      const res = await merchApi.getPOJourney(id);
      setJourneySteps(res.data.steps);
      setJourneyCurrentStep(res.data.current_step);
    } catch { toast('error', 'Failed to load journey'); }
  };

  const fetchLinked = async () => {
    if (!id) return;
    try { const res = await merchApi.getPOLinked(id); setLinkedData(res.data); } catch { toast('error', 'Failed to load linked data'); }
  };

  const fetchProfit = async () => {
    if (!id) return;
    try { const res = await merchApi.getPOProfit(id); setProfitData(res.data); } catch { toast('error', 'Failed to load profit data'); }
  };

  const handleGeneratePI = async () => {
    if (!id) return;
    setGeneratingPI(true);
    try {
      const res = await merchApi.generatePI(id);
      toast('success', res.data.status === 'created' ? `PI ${res.data.pi_number} created` : `PI already exists: ${res.data.pi_number}`);
      fetchLinked();
    } catch { toast('error', 'Failed to generate PI'); } finally { setGeneratingPI(false); }
  };

  const handleGenerateSC = async () => {
    if (!id) return;
    setGeneratingSC(true);
    try {
      const res = await merchApi.generateSC(id);
      toast('success', res.data.status === 'created' ? `SC ${res.data.contract_number} created` : `SC already exists: ${res.data.contract_number}`);
      fetchLinked();
    } catch { toast('error', 'Failed to generate SC'); } finally { setGeneratingSC(false); }
  };

  useEffect(() => { fetchPO(); fetchTemplates(); fetchItems(); }, [id]);
  useEffect(() => { if (tab === 'items') fetchItems(); if (tab === 'hits') fetchHits(); if (tab === 'amendments') fetchAmendments(); if (tab === 'ta') fetchTA(); if (tab === 'bom_costing') fetchBOMCosting(); }, [tab, id]);
  useEffect(() => { if (po) { fetchJourney(); fetchLinked(); fetchProfit(); } }, [po]);
  useEffect(() => { fetchColors(); fetchFactories(); }, []);

  const handleExport = async () => {
    if (!id) return;
    try {
      const res = await merchApi.exportPO(id);
      const blob = new Blob([res.data as BlobPart], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${po?.po_number || 'po'}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast('success', 'PO exported successfully');
    } catch { toast('error', 'Failed to export PO'); }
  };

  const handleAddItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      await merchApi.createPOItem({ purchase_order: id, color: itemForm.color, size: itemForm.size, quantity: parseInt(itemForm.quantity), unit_price: itemForm.unit_price });
      setShowAddItem(false);
      setItemForm({ color: '', size: '', quantity: '', unit_price: '' });
      toast('success', 'Line item added');
      fetchItems();
    } catch { toast('error', 'Failed to add line item'); } finally { setSaving(false); }
  };

  const handleEditItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    setSaving(true);
    try {
      await merchApi.updatePOItem(editItem.id, { color: itemForm.color, size: itemForm.size, quantity: parseInt(itemForm.quantity), unit_price: itemForm.unit_price });
      setEditItem(null);
      setItemForm({ color: '', size: '', quantity: '', unit_price: '' });
      toast('success', 'Line item updated');
      fetchItems();
    } catch { toast('error', 'Failed to update line item'); } finally { setSaving(false); }
  };

  const handleDeleteItem = async () => {
    if (!deleteItemId) return;
    try {
      await merchApi.deletePOItem(deleteItemId);
      setDeleteItemId(null);
      toast('success', 'Line item deleted');
      fetchItems();
    } catch { toast('error', 'Failed to delete line item'); }
  };

  const openAddHit = () => {
    setEditHit(null);
    setHitForm(INITIAL_HIT_FORM);
    setShowAddHit(true);
  };

  const openEditHit = (hit: Hit) => {
    setEditHit(hit);
    setHitForm({
      colour: hit.colour,
      delivery_mode: hit.delivery_mode,
      delivery_type: hit.delivery_type,
      factory_override: hit.factory_override || '',
      original_delivery_date: hit.original_delivery_date || '',
      actual_delivery_date: hit.actual_delivery_date || '',
    });
    setShowAddHit(true);
  };

  const handleSaveHit = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!hitForm.colour.trim()) { toast('warning', 'Colour is required'); return; }
    setSavingHit(true);
    try {
      const data: Record<string, unknown> = {
        colour: hitForm.colour,
        delivery_mode: hitForm.delivery_mode,
        delivery_type: hitForm.delivery_type,
        factory_override: hitForm.factory_override || null,
        original_delivery_date: hitForm.original_delivery_date || null,
        actual_delivery_date: hitForm.actual_delivery_date || null,
      };
      if (editHit) {
        await merchApi.updatePOHit(id, editHit.id, data);
        toast('success', 'Hit updated');
      } else {
        await merchApi.createPOHit(id, data);
        toast('success', `Hit created (auto-numbered)`);
      }
      setShowAddHit(false);
      setEditHit(null);
      fetchHits();
    } catch {
      toast('error', 'Failed to save hit');
    } finally { setSavingHit(false); }
  };

  const handleDeleteHit = async () => {
    if (!id || !deleteHitId) return;
    try {
      await merchApi.deletePOHit(id, deleteHitId);
      setDeleteHitId(null);
      toast('success', 'Hit deleted');
      fetchHits();
    } catch { toast('error', 'Failed to delete hit'); }
  };

  const handleAmend = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      await merchApi.createAmendment({ purchase_order: id, field_name: amendForm.field_name, new_value: amendForm.new_value, reason: amendForm.reason });
      setShowAmend(false);
      setAmendForm({ field_name: 'delivery_date', new_value: '', reason: '' });
      toast('success', 'Amendment submitted for approval');
      fetchAmendments();
    } catch { toast('error', 'Failed to submit amendment'); } finally { setSaving(false); }
  };

  const handleApproveAmendment = async (amendmentId: string) => {
    try { await merchApi.approveAmendment(amendmentId); toast('success', 'Amendment approved'); fetchAmendments(); fetchPO(); } catch { toast('error', 'Failed to approve amendment'); }
  };

  const handleRejectAmendment = async (amendmentId: string) => {
    try { await merchApi.rejectAmendment(amendmentId); toast('success', 'Amendment rejected'); fetchAmendments(); } catch { toast('error', 'Failed to reject amendment'); }
  };

  const handleAddMilestone = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      await merchApi.createPO_TAMilestone(id, milestoneForm);
      setShowAddMilestone(false);
      setMilestoneForm({ name: '', description: '', planned_date: '', is_critical: false });
      toast('success', 'Milestone added');
      fetchTA();
    } catch { toast('error', 'Failed to add milestone'); } finally { setSaving(false); }
  };

  const handleApplyTemplate = (template: TATemplate) => {
    const baseDate = po?.delivery_date || bulkDeliveryDate;
    const planned = (offset: number) => {
      if (!baseDate) return '';
      const d = new Date(baseDate);
      d.setDate(d.getDate() - (63 - offset));
      return d.toISOString().split('T')[0];
    };
    const items = template.milestones.map(m => ({ ...m, planned_date: planned(m.offset_days) }));
    setBulkMilestones(items);
    setSelectedTemplate(template);
    setShowTemplatePicker(false);
    setShowBulkEditor(true);
  };

  const handleBulkSave = async () => {
    if (!id) return;
    setBulkSaving(true);
    try {
      const payload = bulkMilestones.map((m, i) => ({
        name: m.name,
        description: m.description,
        planned_date: m.planned_date,
        is_critical: m.is_critical,
        sort_order: i,
      }));
      await merchApi.bulkCreatePO_TAMilestones(id, payload);
      setShowBulkEditor(false);
      setSelectedTemplate(null);
      setBulkMilestones([]);
      toast('success', `${payload.length} milestones added`);
      fetchTA();
    } catch { toast('error', 'Failed to create milestones'); } finally { setBulkSaving(false); }
  };

  const handleQuickAdd = async (m: MilestoneTemplate) => {
    if (!id || !taData) return;
    const lastMs = taData.milestones.sort((a, b) => a.sort_order - b.sort_order);
    const maxSort = lastMs.length > 0 ? Math.max(...lastMs.map(x => x.sort_order)) + 1 : 0;
    try {
      await merchApi.createPO_TAMilestone(id, {
        name: m.name,
        description: m.description,
        planned_date: new Date().toISOString().split('T')[0],
        is_critical: m.is_critical,
        sort_order: maxSort,
      });
      setShowQuickAdd(false);
      toast('success', `${m.name} added`);
      fetchTA();
    } catch { toast('error', 'Failed to add milestone'); }
  };

  const updateBulkMilestone = (idx: number, field: string, value: string | boolean) => {
    setBulkMilestones(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };

  const handleGenerateCosting = async () => {
    if (!id || !bomCostingData?.bom) return;
    setGeneratingCosting(true);
    try {
      await merchApi.generateCostingFromBOM({ bom_id: bomCostingData.bom.id, purchase_order_id: id });
      toast('success', 'Costing generated from BOM');
      fetchBOMCosting();
    } catch { toast('error', 'Failed to generate costing'); } finally { setGeneratingCosting(false); }
  };

  const handleApproveCosting = async (costingId: string) => {
    try { await merchApi.approveCosting(costingId); toast('success', 'Costing approved'); fetchBOMCosting(); } catch { toast('error', 'Failed to approve costing'); }
  };

  const handleRejectCosting = async (costingId: string) => {
    try { await merchApi.rejectCosting(costingId); toast('success', 'Costing rejected'); fetchBOMCosting(); } catch { toast('error', 'Failed to reject costing'); }
  };

  const handleCreateBOM = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setCreatingBOM(true);
    try {
      const items = bomItems.filter(i => i.item_name.trim()).map(i => ({
        category: i.category || 'other',
        item_name: i.item_name,
        description: i.description,
        consumption: i.consumption ? parseFloat(i.consumption) : null,
        waste_percent: i.waste_percent ? parseFloat(i.waste_percent) : null,
        unit_price: i.unit_price ? parseFloat(i.unit_price) : null,
      }));
      await merchApi.createPO_BOM(id, { name: bomName || `BOM - ${po?.po_number || ''}`, items });
      toast('success', 'BOM created successfully');
      setShowCreateBOM(false);
      setBomName('');
      setBomItems([]);
      fetchBOMCosting();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const axiosData = (err as { response?: { data?: { error?: string } } })?.response?.data;
      toast('error', axiosData?.error || `Failed to create BOM: ${msg}`);
    } finally {
      setCreatingBOM(false);
    }
  };

  const addBOMItem = () => {
    setBomItems([...bomItems, { category: 'fabric', item_name: '', description: '', consumption: '', waste_percent: '3', unit_price: '' }]);
  };

  const updateBOMItem = (idx: number, field: string, value: string) => {
    const updated = [...bomItems];
    updated[idx] = { ...updated[idx], [field]: value };
    setBomItems(updated);
  };

  const removeBOMItem = (idx: number) => {
    setBomItems(bomItems.filter((_, i) => i !== idx));
  };

  const openAddItem = () => {
    setItemForm({ color: '', size: '', quantity: '', unit_price: po?.unit_price || '' });
    setEditItem(null);
    setShowAddItem(true);
  };

  const openEditItem = (item: PurchaseOrderItem) => {
    setEditItem(item);
    setItemForm({ color: item.color, size: item.size, quantity: String(item.quantity), unit_price: item.unit_price });
  };

  const colorOptions = colors.map(c => ({ value: c.id, label: c.name }));

  const amendFieldOptions = [
    { value: 'delivery_date', label: 'Delivery Date' },
    { value: 'destination_country', label: 'Destination Country' },
    { value: 'destination_port', label: 'Destination Port' },
    { value: 'quantity', label: 'Quantity' },
    { value: 'unit_price', label: 'Unit Price' },
    { value: 'remarks', label: 'Remarks' },
  ];
  if (loading) return <Layout><div className="py-20 flex items-center justify-center"><div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" /></div></Layout>;

  if (!po) return <Layout><div className="py-20 flex items-center justify-center"><p className="text-muted">PO not found</p></div></Layout>;

  const transitions = VALID_TRANSITIONS[po.status] || [];

  return (
    <Layout>
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Order Journey Stepper */}
        <div className="mb-6">
          <OrderJourney poId={id!} />
        </div>

        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold">{po.po_number}</h1>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[po.status] || ''}`}>{po.status.replace('_', ' ')}</span>
              {po.risk_level_detail && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: po.risk_level_detail.color }}>{po.risk_level_detail.code}</span>
              )}
            </div>
            <p className="text-muted">{po.factory_name} &middot; Buyer: {po.buyer_name}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={handleExport} className="px-3 py-1.5 bg-surface-alt hover:bg-surface text-sm rounded-lg transition-colors">Export CSV</button>
            <button onClick={() => navigate(`/purchase-orders/${id}/trail`)}
              className="px-3 py-1.5 bg-surface-alt hover:bg-surface text-sm rounded-lg transition-colors">View Trail</button>
            {transitions.length > 0 && (
              <button onClick={() => setShowTransitionWizard(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-colors font-medium">
                Update Status
              </button>
            )}
            {po.status !== 'draft' && (
              <>
                <button onClick={handleGeneratePI} disabled={generatingPI}
                  className="px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 text-sm rounded-lg transition-colors disabled:opacity-50">
                  {generatingPI ? 'Generating...' : 'Generate PI'}
                </button>
                <button onClick={handleGenerateSC} disabled={generatingSC}
                  className="px-3 py-1.5 bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 text-sm rounded-lg transition-colors disabled:opacity-50">
                  {generatingSC ? 'Generating...' : 'Create SC'}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-1 border-b border-border mb-6">
          {(['overview', 'items', 'hits', 'amendments', 'ta', 'bom_costing', 'financials'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${tab === t ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-muted hover:text-heading'}`}>
              {t === 'items' ? `Line Items (${items.length})` : t === 'hits' ? `Hits (${hits.length})` : t === 'amendments' ? `Amendments (${amendments.length})` : t === 'ta' ? `T&A (${taData?.milestones?.length || 0})` : t === 'bom_costing' ? 'BOM & Costing' : t === 'financials' ? 'Financials' : 'Overview'}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-surface rounded-xl border border-border p-6">
                <h3 className="text-sm font-medium text-muted mb-4">Order Details</h3>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between"><dt className="text-muted">PO Number</dt><dd className="font-mono">{po.po_number}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Buyer</dt><dd>{po.buyer_name}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Factory</dt><dd>{po.factory_name}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">PO Date</dt><dd>{po.po_date}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Delivery Date</dt><dd>{po.delivery_date}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Destination</dt><dd>{po.destination_country_name || '-'}</dd></div>
                  {po.destination_port && <div className="flex justify-between"><dt className="text-muted">Port</dt><dd>{po.destination_port}</dd></div>}
                  {po.payment_terms_name && <div className="flex justify-between"><dt className="text-muted">Payment Terms</dt><dd>{po.payment_terms_name}</dd></div>}
                  {po.delivery_mode_name && <div className="flex justify-between"><dt className="text-muted">Delivery Mode</dt><dd>{po.delivery_mode_name}</dd></div>}
                  {po.remarks && <div className="flex justify-between"><dt className="text-muted">Remarks</dt><dd className="text-right max-w-xs">{po.remarks}</dd></div>}
                </dl>
              </div>
              <div className="bg-surface rounded-xl border border-border p-6">
                <h3 className="text-sm font-medium text-muted mb-4">Financials</h3>
                <div className="space-y-4">
                  <div className="bg-input rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-400">${parseFloat(po.total_value).toLocaleString()}</p>
                    <p className="text-xs text-muted mt-1">Total Value</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-input rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-blue-400">{po.quantity.toLocaleString()}</p>
                      <p className="text-xs text-muted">Quantity</p>
                    </div>
                    <div className="bg-input rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-amber-400">${po.unit_price}</p>
                      <p className="text-xs text-muted">Unit Price</p>
                    </div>
                  </div>
                </div>
              </div>
              {linkedData && (
                <div className="bg-surface rounded-xl border border-border p-6">
                  <h3 className="text-sm font-medium text-muted mb-4">Linked Entities</h3>
                  <div className="space-y-2">
                    {linkedData.style && (
                      <LinkedRow label="Style" code={linkedData.style.style_number} name={linkedData.style.name}
                        status={linkedData.style.status} statusColor="text-badge-emerald" url={linkedData.style.url} />
                    )}
                    {linkedData.file_opening && (
                      <LinkedRow label="File Opening" code={linkedData.file_opening.file_number} status={linkedData.file_opening.status}
                        statusColor="text-blue-400" url={linkedData.file_opening.url} />
                    )}
                    {linkedData.ta && (
                      <LinkedRow label="T&A" code={`${linkedData.ta.completed_milestones}/${linkedData.ta.total_milestones} milestones`}
                        status={linkedData.ta.status} statusColor="text-badge-amber" url={linkedData.ta.url} />
                    )}
                    {linkedData.bom && (
                      <LinkedRow label="BOM" code={`${linkedData.bom.name} v${linkedData.bom.version}`}
                        status={`${linkedData.bom.status} (${linkedData.bom.item_count} items)`} statusColor="text-badge-blue"
                        url={linkedData.bom.url} />
                    )}
                    {linkedData.costing && (
                      <LinkedRow label="Costing" code={`v${linkedData.costing.version}`}
                        status={`${linkedData.costing.status} ($${linkedData.costing.total_cost.toLocaleString()})`}
                        statusColor="text-badge-purple" url={linkedData.costing.url} />
                    )}
                    {linkedData.production_plan && (
                      <LinkedRow label="Production" code={`Qty: ${linkedData.production_plan.quantity}`}
                        status={linkedData.production_plan.status} statusColor="text-badge-green"
                        url={linkedData.production_plan.url} />
                    )}
                    {linkedData.quality_inspections.length > 0 && (
                      <div className="flex items-center justify-between py-1.5">
                        <span className="text-xs text-muted">Inspections</span>
                        <span className="text-xs text-body">{linkedData.quality_inspections.length} total</span>
                      </div>
                    )}
                    {linkedData.proforma_invoice && (
                      <LinkedRow label="PI" code={linkedData.proforma_invoice.pi_number}
                        status={linkedData.proforma_invoice.status} statusColor="text-badge-emerald"
                        url={linkedData.proforma_invoice.url} />
                    )}
                    {linkedData.sales_contract && (
                      <LinkedRow label="SC" code={linkedData.sales_contract.contract_number}
                        status={linkedData.sales_contract.status} statusColor="text-badge-emerald"
                        url={linkedData.sales_contract.url} />
                    )}
                    {!linkedData.proforma_invoice && !linkedData.sales_contract && po.status !== 'draft' && (
                      <p className="text-xs text-faint italic mt-2">No PI or SC yet. Use "Generate PI" or "Create SC" buttons above.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div>
              <WhatsNext steps={journeySteps} currentStep={journeyCurrentStep} />
            </div>
          </div>
        )}

        {tab === 'items' && (
          <div>
            <div className="bg-surface rounded-xl border border-border p-4 mb-4">
              {(() => {
                const itemsTotalQty = items.reduce((sum, i) => sum + i.quantity, 0);
                const itemsTotalValue = items.reduce((sum, i) => sum + i.quantity * parseFloat(i.unit_price || '0'), 0);
                const remaining = po.quantity - itemsTotalQty;
                const pct = po.quantity > 0 ? Math.min((itemsTotalQty / po.quantity) * 100, 100) : 0;
                const isOver = itemsTotalQty > po.quantity;
                const isExact = itemsTotalQty === po.quantity;
                return (
                  <div className="flex items-center gap-6">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm text-muted">Quantity Breakdown</span>
                        <span className={`text-sm font-medium ${isOver ? 'text-red-500' : isExact ? 'text-badge-emerald' : 'text-heading'}`}>{itemsTotalQty.toLocaleString()} / {po.quantity.toLocaleString()}</span>
                      </div>
                      <div className="w-full h-2 bg-input rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${isOver ? 'bg-red-500' : isExact ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-faint mt-1">{isOver ? `${(itemsTotalQty - po.quantity).toLocaleString()} over target` : isExact ? 'Matches PO quantity exactly' : `${remaining.toLocaleString()} remaining`}</p>
                    </div>
                    <div className="text-right border-l border-border pl-6">
                      <p className="text-lg font-bold text-emerald-400">${itemsTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      <p className="text-xs text-muted">Line Items Total</p>
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="flex justify-end mb-4">
              <button onClick={openAddItem} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">+ Add Item</button>
            </div>
            {items.length === 0 ? (
              <p className="text-muted text-sm py-8 text-center">No line items yet</p>
            ) : (
              <div className="bg-surface rounded-xl border border-border overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left text-sm text-muted">
                      <th className="px-6 py-3">Color</th>
                      <th className="px-6 py-3">Size</th>
                      <th className="px-6 py-3 text-right">Qty</th>
                      <th className="px-6 py-3 text-right">Unit Price</th>
                      <th className="px-6 py-3 text-right">Total</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id} className="border-b border-border hover:bg-surface-alt/30 transition-colors">
                        <td className="px-6 py-4 text-sm">{item.color_name}</td>
                        <td className="px-6 py-4 text-sm text-body">{item.size}</td>
                        <td className="px-6 py-4 text-sm text-right text-body">{item.quantity.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-right text-body">${item.unit_price}</td>
                        <td className="px-6 py-4 text-sm text-right text-heading font-medium">${(item.quantity * parseFloat(item.unit_price)).toFixed(2)}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => openEditItem(item)} className="text-sm text-blue-400 hover:text-blue-300 mr-3">Edit</button>
                          <button onClick={() => setDeleteItemId(item.id)} className="text-sm text-red-400 hover:text-red-300">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'hits' && (
          <div>
            <div className="flex justify-end mb-4">
              <button onClick={openAddHit} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">+ Add Hit</button>
            </div>
            {hits.length === 0 ? (
              <div className="bg-surface rounded-xl border border-border p-12 text-center">
                <p className="text-heading text-sm font-medium mb-1">No hits for this PO</p>
                <p className="text-faint text-xs mb-4">Create production breakdown hits per colour. Each hit is auto-numbered (HIT-1001+).</p>
                <button onClick={openAddHit} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">+ Add Hit</button>
              </div>
            ) : (
              <div className="bg-surface rounded-xl border border-border overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left text-sm text-muted">
                      <th className="px-6 py-3">Hit #</th>
                      <th className="px-6 py-3">Colour</th>
                      <th className="px-6 py-3">Mode</th>
                      <th className="px-6 py-3">Type</th>
                      <th className="px-6 py-3">Factory</th>
                      <th className="px-6 py-3">Orig. Delivery</th>
                      <th className="px-6 py-3">Actual Delivery</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hits.map(hit => (
                      <tr key={hit.id} className="border-b border-border hover:bg-surface-alt/30 transition-colors">
                        <td className="px-6 py-4 text-sm font-mono text-heading">{hit.hit_number}</td>
                        <td className="px-6 py-4 text-sm">{hit.colour_name || hit.colour}</td>
                        <td className="px-6 py-4 text-sm capitalize text-body">{hit.delivery_mode}</td>
                        <td className="px-6 py-4 text-sm uppercase text-body">{hit.delivery_type}</td>
                        <td className="px-6 py-4 text-sm text-body">{hit.factory_name || '-'}</td>
                        <td className="px-6 py-4 text-sm text-body">{hit.original_delivery_date || '-'}</td>
                        <td className="px-6 py-4 text-sm text-body">{hit.actual_delivery_date || '-'}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => openEditHit(hit)} className="text-sm text-blue-400 hover:text-blue-300 mr-3">Edit</button>
                          <button onClick={() => setDeleteHitId(hit.id)} className="text-sm text-red-400 hover:text-red-300">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'amendments' && (
          <div>
            <div className="flex justify-end mb-4">
              <button onClick={() => setShowAmend(true)} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors">+ Request Amendment</button>
            </div>
            {amendments.length === 0 ? (
              <p className="text-muted text-sm py-8 text-center">No amendments</p>
            ) : (
              <div className="space-y-3">
                {amendments.map(a => (
                  <div key={a.id} className="bg-surface rounded-xl border border-border p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-emerald-400">{a.amendment_number}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${a.status === 'pending' ? 'bg-amber-500/20 text-badge-amber' : a.status === 'approved' ? 'bg-emerald-500/20 text-badge-emerald' : 'bg-red-500/20 text-badge-red'}`}>{a.status}</span>
                      </div>
                      <p className="text-muted text-sm mt-1">{a.field_name}: {a.old_value || '(empty)'} → {a.new_value}</p>
                      <p className="text-faint text-xs mt-1">Reason: {a.reason}</p>
                    </div>
                    {a.status === 'pending' && (
                      <div className="flex gap-2">
                        <button onClick={() => handleApproveAmendment(a.id)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg">Approve</button>
                        <button onClick={() => handleRejectAmendment(a.id)} className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg">Reject</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'ta' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                {taData?.delivery_date && (
                  <p className="text-sm text-muted">Delivery Target: <span className="text-heading font-medium">{taData.delivery_date}</span></p>
                )}
              </div>
              <div className="flex gap-2 relative">
                {taData && taData.milestones.length > 0 && (
                  <>
                    <button onClick={() => { setShowQuickAdd(!showQuickAdd); }} className="px-3 py-2 bg-surface-alt hover:bg-input border border-border text-heading rounded-lg text-sm font-medium transition-colors">
                      + Quick Add
                    </button>
                    <button onClick={() => { setBulkDeliveryDate(taData.delivery_date || po.delivery_date || ''); setShowTemplatePicker(true); }} className="px-3 py-2 bg-surface-alt hover:bg-input border border-border text-heading rounded-lg text-sm font-medium transition-colors">
                      + From Template
                    </button>
                  </>
                )}
                <button onClick={() => setShowAddMilestone(true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">+ Add Milestone</button>
                {showQuickAdd && (
                  <div className="absolute right-0 top-full mt-1 bg-surface border border-border rounded-xl shadow-xl z-20 w-72 p-2 max-h-64 overflow-y-auto">
                    <p className="text-xs text-muted px-2 py-1 mb-1">Quick add a common milestone</p>
                    {([
                      { name: 'Fabric Booking', description: 'Book fabric with supplier', offset_days: 0, is_critical: true },
                      { name: 'Fabric Sourcing', description: 'Source and procure fabric', offset_days: 7, is_critical: false },
                      { name: 'Fabric Testing', description: 'Test fabric quality', offset_days: 14, is_critical: false },
                      { name: 'Pattern Making', description: 'Create patterns for the style', offset_days: 18, is_critical: false },
                      { name: 'Initial Sampling', description: 'Create initial samples', offset_days: 21, is_critical: true },
                      { name: 'Lab Dip Submission', description: 'Submit lab dips for approval', offset_days: 25, is_critical: false },
                      { name: 'Lab Dip Approval', description: 'Get lab dip approval from buyer', offset_days: 30, is_critical: true },
                      { name: 'Bulk Production Start', description: 'Start bulk production', offset_days: 35, is_critical: true },
                      { name: 'Inline Inspection', description: 'In-line quality inspection', offset_days: 49, is_critical: false },
                      { name: 'Final Inspection', description: 'End-line quality inspection', offset_days: 56, is_critical: false },
                      { name: 'Shipment', description: 'Ship goods to destination', offset_days: 63, is_critical: true },
                      { name: 'Custom Milestone', description: 'Add your own milestone', offset_days: 0, is_critical: false },
                    ]).map(m => {
                      const alreadyExists = taData?.milestones.some(t => t.name === m.name);
                      return (
                        <button key={m.name} disabled={alreadyExists} onClick={() => handleQuickAdd(m)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${alreadyExists ? 'opacity-40 cursor-not-allowed text-muted' : 'hover:bg-surface-alt text-heading'}`}>
                          <span className="text-xs">{m.is_critical ? '⚡' : '○'}</span>
                          <span className="flex-1">{m.name}</span>
                          {alreadyExists && <span className="text-xs text-badge-emerald">added</span>}
                        </button>
                      );
                    })}
                    <button onClick={() => setShowQuickAdd(false)} className="w-full text-center text-xs text-muted hover:text-heading py-1 mt-1">Close</button>
                  </div>
                )}
              </div>
            </div>

            {!taData || taData.milestones.length === 0 ? (
              <div className="bg-surface rounded-xl border border-border p-12 text-center">
                {po.status === 'draft' || po.status === 'open' ? (
                  <>
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-500/10 mb-4">
                      <svg className="w-7 h-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <p className="text-heading text-sm font-medium mb-1">PO not confirmed yet</p>
                    <p className="text-faint text-xs mb-2">T&A milestones are auto-generated when the PO status moves to <span className="text-emerald-400 font-medium">Confirmed</span>.</p>
                    <p className="text-faint text-xs">Update the PO status to create the T&A schedule with 9 default milestones.</p>
                  </>
                ) : (
                  <>
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-input mb-4">
                      <svg className="w-7 h-7 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <p className="text-heading text-sm font-medium mb-1">No milestones yet</p>
                    <p className="text-faint text-xs mb-6">Start from a template or add milestones individually</p>
                    <div className="flex justify-center gap-3">
                      <button onClick={() => { setBulkDeliveryDate(po.delivery_date || ''); setShowTemplatePicker(true); }}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors">
                        Start from Template
                      </button>
                      <button onClick={() => setShowAddMilestone(true)}
                        className="px-5 py-2.5 bg-surface-alt hover:bg-input border border-border text-heading text-sm font-medium rounded-lg transition-colors">
                        Add Manually
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
                <div className="space-y-0">
                  {taData.milestones.sort((a, b) => a.sort_order - b.sort_order).map((m, idx) => {
                    const isCompleted = m.status === 'completed';
                    const isDelayed = m.status === 'delayed';
                    const isInProgress = m.status === 'in_progress';
                    const isPastDue = new Date(m.planned_date) < new Date() && !isCompleted;
                    return (
                      <div key={m.id} className="relative flex items-start gap-4 pl-3 py-3">
                        <div className={`relative z-10 mt-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isCompleted ? 'bg-emerald-500 text-white' : isDelayed || isPastDue ? 'bg-red-500 text-white' : isInProgress ? 'bg-blue-500 text-white' : 'bg-surface-alt border-2 border-border text-muted'}`}>
                          {isCompleted ? '✓' : idx + 1}
                        </div>
                        <div className={`flex-1 bg-surface rounded-xl border p-4 ${m.is_critical ? 'border-amber-500/40' : 'border-border'} ${isCompleted ? 'opacity-60' : ''}`}>
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className={`text-sm font-medium ${isCompleted ? 'text-muted line-through' : 'text-heading'}`}>{m.name}</h4>
                                {m.is_critical && <span className="px-1.5 py-0.5 bg-amber-500/20 text-badge-amber text-xs rounded font-medium">Critical</span>}
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isCompleted ? 'bg-emerald-500/20 text-badge-emerald' : isDelayed || isPastDue ? 'bg-red-500/20 text-badge-red' : isInProgress ? 'bg-blue-500/20 text-badge-blue' : 'bg-surface-alt text-muted'}`}>{m.status.replace('_', ' ')}</span>
                              </div>
                              {m.description && <p className="text-xs text-muted mt-1">{m.description}</p>}
                            </div>
                            <div className="text-right text-xs">
                              <p className={`font-mono ${isPastDue && !isCompleted ? 'text-red-500' : 'text-body'}`}>{m.planned_date}</p>
                              {m.actual_date && <p className="text-badge-emerald mt-0.5">Done: {m.actual_date}</p>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'bom_costing' && (
          <div className="space-y-6">
            <div className="bg-surface rounded-xl border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-muted">Bill of Materials</h3>
                {bomCostingData?.bom && (
                  <a href={`/boms/${bomCostingData.bom.id}`} className="text-sm text-blue-700 hover:text-blue-600 transition-colors">View Full BOM →</a>
                )}
              </div>
              {!bomCostingData?.bom ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-input mb-3">
                    <svg className="w-6 h-6 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <p className="text-heading text-sm font-medium mb-1">No BOM created yet</p>
                  <p className="text-faint text-xs mb-4">Create a Bill of Materials to define fabric, trim & accessories for this style</p>
                   <button onClick={() => { setBomName(`BOM - ${po.po_number}`); setBomItems([{ category: 'fabric', item_name: '', description: '', consumption: '', waste_percent: '3', unit_price: '' }]); setShowCreateBOM(true); }}
                    disabled={!po.file_opening}
                    className={`px-5 py-2.5 text-white text-sm font-medium rounded-lg transition-colors ${po.file_opening ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-gray-400 cursor-not-allowed'}`}>
                    Create BOM for This Style
                  </button>
                  {!po.file_opening && <p className="text-xs text-amber-400 mt-2">This PO has no linked file opening</p>}
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="font-mono text-heading text-sm">{bomCostingData.bom.name}</span>
                    <span className="text-muted text-xs">v{bomCostingData.bom.version}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${bomCostingData.bom.status === 'active' ? 'bg-emerald-500/20 text-badge-emerald' : 'bg-surface-alt text-muted'}`}>{bomCostingData.bom.status}</span>
                    <span className="text-faint text-xs">{bomCostingData.bom.item_count} items · {bomCostingData.bom.style_number}</span>
                  </div>
                  <div className="grid grid-cols-5 gap-3">
                    {[
                      { label: 'Fabric', value: bomCostingData.bom.categories.fabric, color: 'bg-blue-500' },
                      { label: 'Trim', value: bomCostingData.bom.categories.trim, color: 'bg-emerald-500' },
                      { label: 'Accessories', value: bomCostingData.bom.categories.accessories, color: 'bg-amber-500' },
                      { label: 'Overhead', value: bomCostingData.bom.categories.overhead, color: 'bg-purple-500' },
                      { label: 'Total', value: bomCostingData.bom.categories.total, color: 'bg-heading' },
                    ].map(c => (
                      <div key={c.label} className="bg-input rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-heading">${c.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <p className="text-xs text-muted mt-1">{c.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end mt-4">
                    <button onClick={handleGenerateCosting} disabled={generatingCosting} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white text-sm rounded-lg transition-colors">
                      {generatingCosting ? 'Generating...' : 'Generate Costing from BOM'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-surface rounded-xl border border-border p-6">
              <h3 className="text-sm font-medium text-muted mb-4">Costing History</h3>
              {!bomCostingData?.costings || bomCostingData.costings.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-muted text-sm mb-1">No costings yet</p>
                  <p className="text-faint text-xs">{bomCostingData?.bom ? 'Click "Generate Costing from BOM" above to create one' : 'Create a BOM first, then generate costing'}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bomCostingData.costings.map(c => {
                    const total = parseFloat(c.total_cost);
                    const fabric = parseFloat(c.fabric_cost);
                    const trim = parseFloat(c.trim_cost);
                    const cm = parseFloat(c.cm_cost);
                    const overhead = parseFloat(c.overhead_cost);
                    const maxVal = Math.max(fabric, trim, cm, overhead, 1);
                    return (
                      <div key={c.id} className="bg-input rounded-xl p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-heading font-medium text-sm">Costing v{c.version}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.status === 'approved' ? 'bg-emerald-500/20 text-badge-emerald' : c.status === 'rejected' ? 'bg-red-500/20 text-badge-red' : c.status === 'pending' ? 'bg-amber-500/20 text-badge-amber' : 'bg-surface-alt text-muted'}`}>{c.status}</span>
                            {c.bom_name && <span className="text-faint text-xs">from {c.bom_name}</span>}
                          </div>
                          <div className="flex items-center gap-3">
                            {c.target_price && (
                              <div className="text-right">
                                <span className="text-xs text-muted">Target: ${parseFloat(c.target_price).toLocaleString()}</span>
                                {c.margin_percent != null && (
                                  <span className={`ml-2 text-xs font-medium ${c.margin_percent >= 0 ? 'text-badge-emerald' : 'text-badge-red'}`}>
                                    {c.margin_percent >= 0 ? '+' : ''}{c.margin_percent.toFixed(1)}%
                                  </span>
                                )}
                              </div>
                            )}
                            {(c.status === 'draft' || c.status === 'pending') && (
                              <div className="flex gap-2">
                                <button onClick={() => handleApproveCosting(c.id)} className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-lg">Approve</button>
                                <button onClick={() => handleRejectCosting(c.id)} className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded-lg">Reject</button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          {[
                            { label: 'Fabric', value: fabric, color: 'bg-blue-500' },
                            { label: 'Trim & Accessories', value: trim, color: 'bg-emerald-500' },
                            { label: 'CM (Cut & Make)', value: cm, color: 'bg-amber-500' },
                            { label: 'Overhead', value: overhead, color: 'bg-purple-500' },
                          ].map(item => (
                            <div key={item.label} className="flex items-center gap-3">
                              <span className="text-xs text-muted w-32">{item.label}</span>
                              <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${item.color}`} style={{ width: `${maxVal > 0 ? (item.value / maxVal) * 100 : 0}%` }} />
                              </div>
                              <span className="text-xs text-heading font-mono w-20 text-right">${item.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-border">
                          <span className="text-xs text-muted">Total Cost per Unit</span>
                          <span className="text-lg font-bold text-emerald-400">${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'financials' && (
          <div className="space-y-6">
            {profitData ? (
              <>
                {/* Revenue vs Cost Hero */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-6 text-center">
                    <p className="text-xs text-muted mb-1">Revenue ({profitData.revenue_source})</p>
                    <p className="text-3xl font-bold text-emerald-400">${profitData.revenue.toLocaleString()}</p>
                    <p className="text-xs text-faint mt-1">${profitData.revenue_per_unit}/unit</p>
                  </div>
                  <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6 text-center">
                    <p className="text-xs text-muted mb-1">Total Cost {profitData.cost_breakdown ? `(v${profitData.cost_breakdown.version})` : ''}</p>
                    <p className="text-3xl font-bold text-red-400">${profitData.total_cost.toLocaleString()}</p>
                    <p className="text-xs text-faint mt-1">${profitData.cost_per_unit}/unit</p>
                  </div>
                  <div className={`rounded-xl p-6 text-center ${profitData.profit >= 0 ? 'bg-cyan-500/5 border border-cyan-500/20' : 'bg-red-500/5 border border-red-500/20'}`}>
                    <p className="text-xs text-muted mb-1">Profit</p>
                    <p className={`text-3xl font-bold ${profitData.profit >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                      ${profitData.profit.toLocaleString()}
                    </p>
                    <p className={`text-sm font-medium mt-1 ${profitData.profit >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                      {profitData.margin_percent}% margin
                    </p>
                  </div>
                </div>

                {/* Cost Breakdown */}
                {profitData.cost_breakdown && (
                  <div className="bg-surface rounded-xl border border-border p-6">
                    <h3 className="text-sm font-medium text-muted mb-4">Cost Breakdown</h3>
                    <div className="space-y-3">
                      {[
                        { label: 'Fabric', value: profitData.cost_breakdown.fabric, color: 'bg-blue-500' },
                        { label: 'Trims', value: profitData.cost_breakdown.trim, color: 'bg-purple-500' },
                        { label: 'CM (Cut & Make)', value: profitData.cost_breakdown.cm, color: 'bg-amber-500' },
                        { label: 'Overhead', value: profitData.cost_breakdown.overhead, color: 'bg-surface-alt' },
                      ].map(item => {
                        const pct = profitData.cost_breakdown!.total > 0 ? (item.value / profitData.cost_breakdown!.total * 100) : 0;
                        return (
                          <div key={item.label} className="flex items-center gap-3">
                            <span className="w-32 text-xs text-muted">{item.label}</span>
                            <div className="flex-1 h-6 bg-surface-alt rounded-full overflow-hidden">
                              <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs font-mono text-body w-20 text-right">${item.value.toLocaleString()}</span>
                            <span className="text-xs text-faint w-12 text-right">{pct.toFixed(1)}%</span>
                          </div>
                        );
                      })}
                      <div className="border-t border-border pt-2 flex items-center justify-between">
                        <span className="text-xs font-medium text-heading">Total Cost</span>
                        <span className="text-sm font-bold text-heading">${profitData.cost_breakdown.total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Per Unit Economics */}
                <div className="bg-surface rounded-xl border border-border p-6">
                  <h3 className="text-sm font-medium text-muted mb-4">Per Unit Economics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-input rounded-lg p-3 text-center">
                      <p className="text-xs text-muted">Quantity</p>
                      <p className="text-lg font-bold text-heading">{po.quantity.toLocaleString()}</p>
                    </div>
                    <div className="bg-input rounded-lg p-3 text-center">
                      <p className="text-xs text-muted">PO Unit Price</p>
                      <p className="text-lg font-bold text-heading">${po.unit_price}</p>
                    </div>
                    <div className="bg-input rounded-lg p-3 text-center">
                      <p className="text-xs text-muted">Cost/Unit</p>
                      <p className="text-lg font-bold text-red-400">${profitData.cost_per_unit}</p>
                    </div>
                    <div className="bg-input rounded-lg p-3 text-center">
                      <p className="text-xs text-muted">Profit/Unit</p>
                      <p className={`text-lg font-bold ${profitData.revenue_per_unit - profitData.cost_per_unit >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                        ${(profitData.revenue_per_unit - profitData.cost_per_unit).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {!profitData.cost_breakdown && (
                  <div className="bg-surface rounded-xl border border-border p-8 text-center">
                    <svg className="w-10 h-10 text-faint mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <p className="text-sm text-muted mb-1">No costing data yet</p>
                    <p className="text-xs text-faint">Create a costing in the BOM & Costing tab to see profit breakdown.</p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin h-6 w-6 border-2 border-emerald-400 border-t-transparent rounded-full" />
              </div>
            )}
          </div>
        )}
      </main>

      {showAddItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Add Line Item</h2>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-sm text-body mb-1">Color *</label>
                <SearchableSelect options={colorOptions} value={itemForm.color || null} onChange={(v) => setItemForm({ ...itemForm, color: String(v || '') })} placeholder="Select color..." required />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Size</label>
                <input value={itemForm.size} onChange={(e) => setItemForm({ ...itemForm, size: e.target.value })} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g. S, M, L, XL" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-body mb-1">Quantity *</label>
                  <input type="number" required value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Unit Price *</label>
                  <input type="number" step="0.01" required value={itemForm.unit_price} onChange={(e) => setItemForm({ ...itemForm, unit_price: e.target.value })} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="0.00" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowAddItem(false)} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white text-sm rounded-lg transition-colors">{saving ? 'Adding...' : 'Add Item'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Edit Line Item</h2>
            <form onSubmit={handleEditItem} className="space-y-4">
              <div>
                <label className="block text-sm text-body mb-1">Color *</label>
                <SearchableSelect options={colorOptions} value={itemForm.color || null} onChange={(v) => setItemForm({ ...itemForm, color: String(v || '') })} placeholder="Select color..." required />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Size</label>
                <input value={itemForm.size} onChange={(e) => setItemForm({ ...itemForm, size: e.target.value })} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-body mb-1">Quantity *</label>
                  <input type="number" required value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Unit Price *</label>
                  <input type="number" step="0.01" required value={itemForm.unit_price} onChange={(e) => setItemForm({ ...itemForm, unit_price: e.target.value })} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setEditItem(null)} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white text-sm rounded-lg transition-colors">{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAmend && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Request Amendment</h2>
            <form onSubmit={handleAmend} className="space-y-4">
              <div>
                <label className="block text-sm text-body mb-1">Field to Amend *</label>
                <SearchableSelect options={amendFieldOptions} value={amendForm.field_name || null} onChange={(v) => setAmendForm({ ...amendForm, field_name: String(v || '') })} placeholder="Select field..." required />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">New Value *</label>
                <input required value={amendForm.new_value} onChange={(e) => setAmendForm({ ...amendForm, new_value: e.target.value })} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Enter new value" />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Reason *</label>
                <textarea required value={amendForm.reason} onChange={(e) => setAmendForm({ ...amendForm, reason: e.target.value })} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" rows={2} placeholder="Why is this amendment needed?" />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowAmend(false)} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-600/50 text-white text-sm rounded-lg transition-colors">{saving ? 'Submitting...' : 'Submit'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreateBOM && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold">Create BOM</h2>
                <p className="text-xs text-muted mt-1">Define materials for style linked to {po.po_number}</p>
              </div>
              <button onClick={() => setShowCreateBOM(false)} className="text-muted hover:text-heading text-lg">&times;</button>
            </div>
            <form onSubmit={handleCreateBOM} className="space-y-5">
              <div>
                <label className="block text-sm text-body mb-1">BOM Name</label>
                <input value={bomName} onChange={(e) => setBomName(e.target.value)} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g. Main Fabric BOM" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-body font-medium">BOM Items</label>
                  <button type="button" onClick={addBOMItem} className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">+ Add Item</button>
                </div>
                {bomItems.length === 0 ? (
                  <p className="text-center text-faint text-xs py-4">No items yet. Click "+ Add Item" to start.</p>
                ) : (
                  <div className="space-y-2">
                    {bomItems.map((item, idx) => (
                      <div key={idx} className="bg-input rounded-lg p-3 grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-2">
                          <label className="block text-xs text-muted mb-1">Category</label>
                          <SearchableSelect
                            options={[
                              {value:'fabric', label:'Fabric'},
                              {value:'trim', label:'Trim'},
                              {value:'accessories', label:'Accessory'},
                              {value:'label', label:'Label'},
                              {value:'packaging', label:'Packaging'},
                            ]}
                            value={String(item.category)}
                            onChange={(v) => updateBOMItem(idx, 'category', String(v || 'fabric'))}
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-xs text-muted mb-1">Item Name *</label>
                          <input required value={item.item_name} onChange={(e) => updateBOMItem(idx, 'item_name', e.target.value)}
                            className="w-full px-2 py-1.5 bg-surface border border-input-border rounded text-heading text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500" placeholder="e.g. Cotton Twill" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-muted mb-1">Consumption</label>
                          <input type="number" step="0.0001" value={item.consumption} onChange={(e) => updateBOMItem(idx, 'consumption', e.target.value)}
                            className="w-full px-2 py-1.5 bg-surface border border-input-border rounded text-heading text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500" placeholder="m/pc" />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-xs text-muted mb-1">Waste%</label>
                          <input type="number" step="0.1" value={item.waste_percent} onChange={(e) => updateBOMItem(idx, 'waste_percent', e.target.value)}
                            className="w-full px-2 py-1.5 bg-surface border border-input-border rounded text-heading text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-muted mb-1">Unit Price *</label>
                          <input type="number" step="0.01" required value={item.unit_price} onChange={(e) => updateBOMItem(idx, 'unit_price', e.target.value)}
                            className="w-full px-2 py-1.5 bg-surface border border-input-border rounded text-heading text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500" placeholder="0.00" />
                        </div>
                        <div className="col-span-2 flex items-end gap-1">
                          <button type="button" onClick={() => removeBOMItem(idx)} className="px-2 py-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded text-xs transition-colors">Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {bomItems.length > 0 && (
                <div className="bg-input rounded-lg p-3 flex justify-between items-center">
                  <span className="text-xs text-muted">Estimated Total (before overhead)</span>
                  <span className="text-sm font-bold text-heading font-mono">
                    ${bomItems.reduce((sum, i) => {
                      const consumption = parseFloat(i.consumption) || 0;
                      const price = parseFloat(i.unit_price) || 0;
                      const waste = (parseFloat(i.waste_percent) || 0) / 100;
                      return sum + consumption * price * (1 + waste);
                    }, 0).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2 border-t border-border">
                <button type="button" onClick={() => setShowCreateBOM(false)} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
                <button type="submit" disabled={creatingBOM || bomItems.filter(i => i.item_name.trim()).length === 0}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors">
                  {creatingBOM ? 'Creating...' : 'Create BOM'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddMilestone && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Add T&A Milestone</h2>
            <form onSubmit={handleAddMilestone} className="space-y-4">
              <div>
                <label className="block text-sm text-body mb-1">Milestone Name *</label>
                <input required value={milestoneForm.name} onChange={(e) => setMilestoneForm({ ...milestoneForm, name: e.target.value })} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g. Fabric Booking" />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Description</label>
                <textarea value={milestoneForm.description} onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" rows={2} placeholder="Optional description" />
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Planned Date *</label>
                <input type="date" required value={milestoneForm.planned_date} onChange={(e) => setMilestoneForm({ ...milestoneForm, planned_date: e.target.value })} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_critical" checked={milestoneForm.is_critical} onChange={(e) => setMilestoneForm({ ...milestoneForm, is_critical: e.target.checked })} className="rounded border-input-border" />
                <label htmlFor="is_critical" className="text-sm text-body">Critical milestone</label>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowAddMilestone(false)} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white text-sm rounded-lg transition-colors">{saving ? 'Adding...' : 'Add Milestone'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTemplatePicker && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-lg">
            <h2 className="text-lg font-bold mb-4">Choose a Template</h2>
            <div className="space-y-2 mb-4">
              {taTemplates.map(t => (
                <button key={t.id} onClick={() => handleApplyTemplate(t)}
                  className="w-full text-left p-4 rounded-xl border border-border hover:border-emerald-500/40 bg-surface-alt hover:bg-input transition-colors group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-heading text-sm group-hover:text-emerald-400 transition-colors">{t.name}</span>
                    <span className="text-xs text-muted">{t.milestones.length} milestones</span>
                  </div>
                  <p className="text-xs text-muted">{t.description}</p>
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <button onClick={() => setShowTemplatePicker(false)} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showBulkEditor && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold">Review Milestones</h2>
                <p className="text-xs text-muted mt-1">{selectedTemplate?.name} · {bulkMilestones.length} milestones · Adjust planned dates before saving</p>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 border border-border rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-surface-alt sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted">#</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted">Milestone</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted">Planned Date</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted">Critical</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {bulkMilestones.map((m, idx) => (
                    <tr key={idx} className="hover:bg-surface-alt/50">
                      <td className="px-4 py-2.5 text-xs text-muted font-mono">{idx + 1}</td>
                      <td className="px-4 py-2.5">
                        <div className="text-heading text-sm font-medium">{m.name}</div>
                        {m.description && <div className="text-xs text-muted mt-0.5">{m.description}</div>}
                      </td>
                      <td className="px-4 py-2.5">
                        <input type="date" value={m.planned_date} onChange={(e) => updateBulkMilestone(idx, 'planned_date', e.target.value)}
                          className="px-2 py-1 bg-input border border-input-border rounded-lg text-heading text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full" />
                      </td>
                      <td className="px-4 py-2.5">
                        <button onClick={() => updateBulkMilestone(idx, 'is_critical', !m.is_critical)}
                          className={`w-8 h-5 rounded-full transition-colors relative ${m.is_critical ? 'bg-amber-500' : 'bg-surface-alt border border-border'}`}>
                          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${m.is_critical ? 'left-3.5' : 'left-0.5'}`} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => { setShowBulkEditor(false); setSelectedTemplate(null); setBulkMilestones([]); }} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
              <button onClick={handleBulkSave} disabled={bulkSaving || bulkMilestones.length === 0}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white text-sm font-medium rounded-lg transition-colors">
                {bulkSaving ? 'Saving...' : `Save ${bulkMilestones.length} Milestones`}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddHit && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold">{editHit ? `Edit Hit ${editHit.hit_number}` : 'Add Hit'}</h2>
                <p className="text-xs text-muted mt-1">{editHit ? '' : 'Auto-numbered (HIT-1001+). One hit per colour per PO.'}</p>
              </div>
              <button onClick={() => setShowAddHit(false)} className="text-muted hover:text-heading text-lg">&times;</button>
            </div>
            <form onSubmit={handleSaveHit} className="space-y-4">
              <div>
                <label className="block text-sm text-body mb-1">Colour *</label>
                <select required value={hitForm.colour} onChange={(e) => setHitForm({ ...hitForm, colour: e.target.value })} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="">Select colour</option>
                  {[...new Map(items.map(i => [i.color, i.color_name])).entries()]
                    .filter(([, name]) => name)
                    .map(([id, name]) => (
                      <option key={id} value={id}>{name}</option>
                    ))}
                </select>
                <p className="text-xs text-muted mt-1">Colour must match a line-item colour on this PO.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-body mb-1">Delivery Mode</label>
                  <select value={hitForm.delivery_mode} onChange={(e) => setHitForm({ ...hitForm, delivery_mode: e.target.value })} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    {HIT_MODE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Delivery Type</label>
                  <select value={hitForm.delivery_type} onChange={(e) => setHitForm({ ...hitForm, delivery_type: e.target.value })} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    {HIT_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Factory Override</label>
                <SearchableSelect
                  options={factories.map(f => ({ value: f.id, label: f.name }))}
                  value={hitForm.factory_override || null}
                  onChange={(v) => setHitForm({ ...hitForm, factory_override: String(v || '') })}
                  placeholder="Use PO factory..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-body mb-1">Original Delivery</label>
                  <input type="date" value={hitForm.original_delivery_date} onChange={(e) => setHitForm({ ...hitForm, original_delivery_date: e.target.value })} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm text-body mb-1">Actual Delivery</label>
                  <input type="date" value={hitForm.actual_delivery_date} onChange={(e) => setHitForm({ ...hitForm, actual_delivery_date: e.target.value })} className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowAddHit(false)} className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
                <button type="submit" disabled={savingHit} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white text-sm rounded-lg transition-colors">{savingHit ? 'Saving...' : editHit ? 'Update Hit' : 'Add Hit'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteHitId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2">Delete Hit?</h2>
            <p className="text-muted text-sm mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteHitId(null)} className="px-4 py-2 text-sm text-body hover:text-heading">Cancel</button>
              <button onClick={handleDeleteHit} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg">Delete</button>
            </div>
          </div>
        </div>
      )}

      {deleteItemId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2">Delete Line Item?</h2>
            <p className="text-muted text-sm mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteItemId(null)} className="px-4 py-2 text-sm text-body hover:text-heading">Cancel</button>
              <button onClick={handleDeleteItem} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg">Delete</button>
            </div>
          </div>
        </div>
      )}

      {showTransitionWizard && (
        <StatusTransitionWizard
          poId={id!}
          currentStatus={po.status}
          onTransition={() => { setShowTransitionWizard(false); fetchPO(); fetchJourney(); toast('success', 'Status updated'); }}
          onClose={() => setShowTransitionWizard(false)}
        />
      )}
    </Layout>
  );
}
