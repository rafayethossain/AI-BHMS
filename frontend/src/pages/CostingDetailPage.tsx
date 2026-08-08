import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { merchApi } from '../api/client';
import type { Costing, SizeRatioEntry, DesignImage } from '../api/client';
import { useToast } from '../contexts/ToastContext';
import Layout from '../components/Layout';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-surface-alt/20 text-muted',
  pending: 'bg-amber-500/20 text-badge-amber',
  approved: 'bg-emerald-500/20 text-badge-emerald',
  rejected: 'bg-red-500/20 text-badge-red',
};

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'fabric', label: 'Fabric' },
  { value: 'trim', label: 'Trims' },
  { value: 'label', label: 'Labels' },
  { value: 'making', label: 'Making (CM)' },
  { value: 'overhead', label: 'Overheads' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'freight', label: 'Transport / Freight' },
  { value: 'other', label: 'Other' },
];

const PATTERN_OPTIONS: { value: string; label: string }[] = [
  { value: 'striped', label: 'Striped' },
  { value: 'checked', label: 'Checked' },
  { value: 'one_way', label: 'One-way pattern' },
  { value: 'match_point', label: 'Match at specified points' },
];

export default function CostingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [costing, setCosting] = useState<Costing | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLine, setNewLine] = useState({ category: 'other', description: '', unit_price: '', consumption: '1' });
  const [designImage, setDesignImage] = useState<DesignImage | null>(null);
  const [notes, setNotes] = useState('');
  const [isSingleSize, setIsSingleSize] = useState(false);
  const [isPatterned, setIsPatterned] = useState(false);
  const [patternOptions, setPatternOptions] = useState<string[]>([]);
  const [sizeRatio, setSizeRatio] = useState<SizeRatioEntry[]>([]);

  const fetchCosting = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await merchApi.getCosting(id);
      setCosting(res.data);
      setNotes(res.data.notes || '');
      setIsSingleSize(res.data.is_single_size);
      setIsPatterned(res.data.is_patterned);
      setPatternOptions(res.data.patterned_fabric_options || []);
      setSizeRatio(Array.isArray(res.data.size_ratio) ? res.data.size_ratio : []);
    } catch { toast('error', 'Failed to load costing'); } finally { setLoading(false); }
  };

  const fetchDesignImage = async () => {
    if (!costing?.bom_style_number) return;
    try {
      const styles = await merchApi.getStyles({ style_number: costing.bom_style_number });
      const style = styles.data.results[0];
      if (!style) return;
      const images = await merchApi.getStyleDesignImages(style.id);
      const main = images.data.find((img) => img.is_main) || images.data[0];
      if (main) setDesignImage(main);
    } catch { /* design image is optional */ }
  };

  useEffect(() => { fetchCosting(); }, [id]);
  useEffect(() => { fetchDesignImage(); }, [costing?.id, costing?.bom_style_number]);

  const handleSaveDesign = async () => {
    if (!id) return;
    setActing(true);
    try {
      await merchApi.updateCosting(id, {
        notes,
        is_single_size: isSingleSize,
        is_patterned: isPatterned,
        patterned_fabric_options: isPatterned ? patternOptions : [],
        size_ratio: sizeRatio,
      });
      toast('success', 'Design costing saved');
      fetchCosting();
    } catch { toast('error', 'Failed to save design costing'); } finally { setActing(false); }
  };

  const handleConfirm = async () => {
    if (!id) return;
    setActing(true);
    try { await merchApi.confirmCosting(id); toast('success', 'Costing confirmed with customer'); fetchCosting(); } catch { toast('error', 'Failed to confirm costing'); } finally { setActing(false); }
  };

  const handlePatternAmendment = async () => {
    if (!id) return;
    const note = window.prompt('Describe the pattern amendment (a new costing will be requested):');
    if (!note || !note.trim()) return;
    setActing(true);
    try {
      const res = await merchApi.patternAmendmentCosting(id, note.trim());
      toast('success', `Pattern amendment requested — new costing V${res.data.version} created`);
      navigate(`/costings/${res.data.id}`);
    } catch { toast('error', 'Failed to request pattern amendment'); } finally { setActing(false); }
  };

  const togglePatternOption = (value: string) => {
    setPatternOptions((prev) => prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]);
  };

  const updateRatioEntry = (index: number, field: 'size' | 'ratio', value: string) => {
    setSizeRatio((prev) => prev.map((entry, i) => {
      if (i !== index) return entry;
      return field === 'size' ? { ...entry, size: value } : { ...entry, ratio: parseFloat(value) || 0 };
    }));
  };

  const addRatioEntry = () => setSizeRatio((prev) => [...prev, { size: '', ratio: 1 }]);
  const removeRatioEntry = (index: number) => setSizeRatio((prev) => prev.filter((_, i) => i !== index));

  const handleApprove = async () => {
    if (!id) return;
    setActing(true);
    try { await merchApi.approveCosting(id); toast('success', 'Costing approved'); fetchCosting(); } catch { toast('error', 'Failed to approve'); } finally { setActing(false); }
  };

  const handleReject = async () => {
    if (!id) return;
    setActing(true);
    try { await merchApi.rejectCosting(id); toast('success', 'Costing rejected'); fetchCosting(); } catch { toast('error', 'Failed to reject'); } finally { setActing(false); }
  };

  const handleSetLive = async () => {
    if (!id) return;
    setActing(true);
    try { await merchApi.setLiveCosting(id); toast('success', 'Costing set as live sheet'); fetchCosting(); } catch { toast('error', 'Failed to set live'); } finally { setActing(false); }
  };

  const handleExport = async () => {
    if (!id) return;
    try {
      const res = await merchApi.exportCosting(id);
      const blob = new Blob([res.data as BlobPart], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `costing_${costing?.po_number || 'costing'}_v${costing?.version || 1}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast('success', 'Costing exported');
    } catch { toast('error', 'Failed to export'); }
  };

  const handleAddLine = async () => {
    if (!id || !costing) return;
    if (!newLine.description.trim() || newLine.unit_price === '') {
      toast('error', 'Description and unit price are required');
      return;
    }
    setActing(true);
    try {
      const description = `Additional - ${newLine.description.trim()}`;
      await merchApi.createCostingLine({
        costing: costing.id,
        category: newLine.category,
        description,
        unit_price: newLine.unit_price,
        consumption: newLine.consumption || '1',
        is_additional: true,
        original_description: newLine.description.trim(),
      });
      toast('success', 'Additional cost line added — pending approval');
      setShowAddForm(false);
      setNewLine({ category: 'other', description: '', unit_price: '', consumption: '1' });
      fetchCosting();
    } catch { toast('error', 'Failed to add cost line'); } finally { setActing(false); }
  };

  const handleApproveLine = async (lineId: string) => {
    setActing(true);
    try { await merchApi.approveCostingLine(lineId); toast('success', 'Additional cost approved'); fetchCosting(); } catch { toast('error', 'Failed to approve cost'); } finally { setActing(false); }
  };

  if (loading) return <Layout><div className="py-20 flex items-center justify-center"><div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full" /></div></Layout>;

  if (!costing) return <Layout><div className="py-20 flex items-center justify-center">Costing not found</div></Layout>;

  const costBreakdown = [
    { label: 'Fabric', value: parseFloat(String(costing.fabric_cost)), color: 'text-blue-400' },
    { label: 'Trim', value: parseFloat(String(costing.trim_cost)), color: 'text-purple-400' },
    { label: 'CM', value: parseFloat(String(costing.cm_cost)), color: 'text-amber-400' },
    { label: 'Overhead', value: parseFloat(String(costing.overhead_cost)), color: 'text-cyan-400' },
  ];
  const total = parseFloat(String(costing.total_cost));
  const target = costing.target_price ? parseFloat(String(costing.target_price)) : null;
  const landed = costing.landed_cost ? parseFloat(String(costing.landed_cost)) : null;

  return (
    <Layout>
      <main className="max-w-5xl mx-auto px-6 py-8">
        <button onClick={() => navigate('/costings')} className="text-sm text-muted hover:text-heading mb-4 transition-colors">&larr; Back to Costings</button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Costing — {costing.po_number}</h1>
            <p className="text-muted text-sm mt-1">
              Version {costing.version} &middot;
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[costing.status] || ''}`}>{costing.status}</span>
              <span className="ml-2 text-body">{costing.sheet_type_label}</span>
              {costing.is_live && <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold uppercase bg-emerald-500/15 text-emerald-700">Live</span>}
              {costing.is_single_size && <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold uppercase bg-red-500/15 text-badge-red">Single Size</span>}
              {costing.is_patterned && <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold uppercase bg-purple-500/15 text-purple-700">Patterned</span>}
              {costing.confirmed && <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold uppercase bg-blue-500/15 text-blue-700">Confirmed</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleExport}
              className="px-4 py-2 bg-surface-alt hover:bg-surface-alt text-heading rounded-lg text-sm font-medium transition-colors">Export CSV</button>
            {!costing.is_live && (
              <button onClick={handleSetLive} disabled={acting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">Set as Live</button>
            )}
            {(costing.status === 'draft' || costing.status === 'pending') && (
              <>
                <button onClick={handleReject} disabled={acting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">Reject</button>
                <button onClick={handleApprove} disabled={acting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">Approve</button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-surface rounded-xl border border-border p-6">
            <h3 className="text-sm font-medium text-muted mb-4">Cost Breakdown</h3>
            <div className="space-y-4">
              {costBreakdown.map(({ label, value, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-body">{label}</span>
                    <span className={color}>${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="h-2 bg-surface-alt rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color.replace('text-', 'bg-')}`} style={{ width: `${total > 0 ? (value / total) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border flex justify-between">
              <span className="font-medium text-body">Total Cost (USD)</span>
              <span className="text-xl font-bold text-emerald-700">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-border p-6">
            <h3 className="text-sm font-medium text-muted mb-4">Pricing Analysis</h3>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-body">Total Cost</span>
                <span className="text-heading">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              {target && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-body">Target Price</span>
                    <span className="text-heading">${target.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-body">Margin</span>
                    <span className={target - total >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      ${(target - total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-body">Margin %</span>
                    <span className={target - total >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {total > 0 ? ((target - total) / total * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </>
              )}
              {!target && (
                <p className="text-faint text-sm italic">No target price set</p>
              )}
              {costing.exchange_rate && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-body">Exchange Rate (GBP/USD)</span>
                    <span className="text-heading">{costing.exchange_rate}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-body">Landed Cost (GBP)</span>
                    <span className="text-emerald-700 font-medium">{landed !== null ? `£${landed.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}</span>
                  </div>
                </>
              )}
              {!costing.exchange_rate && (
                <p className="text-faint text-sm italic">No exchange rate set (landed cost not calculated)</p>
              )}
            </div>

            {costing.approved_by && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted">Approved by: <span className="text-heading">{costing.approved_by}</span></p>
                <p className="text-xs text-muted">At: <span className="text-heading">{costing.approved_at}</span></p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-surface rounded-xl border border-border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted">Design Costing</h3>
            <div className="flex gap-2">
              {!costing.confirmed && (
                <button onClick={handleConfirm} disabled={acting}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                  Confirm with Customer
                </button>
              )}
              <button onClick={handlePatternAmendment} disabled={acting}
                className="px-3 py-1.5 bg-surface-alt hover:bg-surface-alt text-heading rounded-lg text-sm font-medium transition-colors">
                Pattern Amendment
              </button>
              <button onClick={handleSaveDesign} disabled={acting}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                Save Design
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs text-muted uppercase tracking-wide">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Free-text notes box — pattern description, amendment reasons, etc."
                className="mt-1 w-full bg-surface-alt/40 border border-border rounded-lg px-3 py-2 text-sm text-heading" />
            </div>

            <div>
              <label className="text-xs text-muted uppercase tracking-wide">Design Image</label>
              <div className="relative mt-1 aspect-[4/3] bg-surface-alt/40 border border-border rounded-lg overflow-hidden flex items-center justify-center">
                {designImage ? (
                  <img src={designImage.image} alt={designImage.caption || 'Design image'} className="w-full h-full object-contain" />
                ) : (
                  <span className="text-faint text-sm italic">No design image available</span>
                )}
                {isSingleSize && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-2xl font-black uppercase tracking-widest text-red-500/60 -rotate-12 border-4 border-red-500/60 px-4 py-2 rounded-lg">
                      Single Size — Not for Production
                    </span>
                  </div>
                )}
              </div>
              {isSingleSize && (
                <p className="mt-1 text-xs text-badge-red">Single-size costing — watermark shown over the image; must not be used for production purposes.</p>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm text-body cursor-pointer">
                <input type="checkbox" checked={isSingleSize} onChange={(e) => setIsSingleSize(e.target.checked)}
                  className="h-4 w-4 accent-emerald-600" />
                Single-size costing
              </label>
              <p className="mt-1 text-xs text-faint">If a single size costing is required, this must be stated.</p>

              <div className="mt-5">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-muted uppercase tracking-wide">Sizes &amp; Ratio</label>
                  <button onClick={addRatioEntry} className="text-xs text-blue-700 hover:text-blue-600">+ Add size</button>
                </div>
                <p className="mb-2 text-xs text-faint">State the sizes and ratio each time you request a costing update.</p>
                {sizeRatio.length === 0 && <p className="text-sm text-faint italic">No sizes stated</p>}
                <div className="space-y-2">
                  {sizeRatio.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        value={entry.size}
                        onChange={(e) => updateRatioEntry(i, 'size', e.target.value)}
                        placeholder="Size (e.g. M)"
                        className="flex-1 bg-surface-alt/40 border border-border rounded-lg px-3 py-1.5 text-sm text-heading" />
                      <input
                        value={Number.isFinite(entry.ratio) ? entry.ratio : ''}
                        onChange={(e) => updateRatioEntry(i, 'ratio', e.target.value)}
                        placeholder="Ratio"
                        type="number" min="0" step="0.5"
                        className="w-24 bg-surface-alt/40 border border-border rounded-lg px-3 py-1.5 text-sm text-heading" />
                      <button onClick={() => removeRatioEntry(i)} className="text-xs text-red-500 hover:text-red-400">Remove</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm text-body cursor-pointer">
                <input type="checkbox" checked={isPatterned} onChange={(e) => setIsPatterned(e.target.checked)}
                  className="h-4 w-4 accent-emerald-600" />
                Patterned fabric
              </label>
              <p className="mt-1 text-xs text-faint">Patterned fabric has 4 additional options to cost accurately.</p>
              {isPatterned && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PATTERN_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 text-sm text-body cursor-pointer">
                      <input type="checkbox" checked={patternOptions.includes(opt.value)}
                        onChange={() => togglePatternOption(opt.value)}
                        className="h-4 w-4 accent-emerald-600" />
                      {opt.label}
                    </label>
                  ))}
                </div>
              )}
              <div className="mt-5">
                {costing.confirmed ? (
                  <div className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-sm text-emerald-700">
                    <span className="font-medium">Confirmed with customer</span>
                    {costing.confirmed_at && <span className="block text-xs mt-0.5">At: {costing.confirmed_at}</span>}
                  </div>
                ) : (
                  <p className="text-xs text-faint italic">Only tick the confirmed box once this is confirmed with the customer.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted">Cost Lines</h3>
            <button onClick={() => setShowAddForm((v) => !v)}
              className="px-3 py-1.5 bg-surface-alt hover:bg-surface-alt text-heading rounded-lg text-sm font-medium transition-colors">
              {showAddForm ? 'Cancel' : 'Add Additional Cost'}
            </button>
          </div>

          {showAddForm && (
            <div className="mb-4 p-4 bg-surface-alt/40 rounded-lg border border-border grid grid-cols-1 md:grid-cols-5 gap-3">
              <select
                value={newLine.category}
                onChange={(e) => setNewLine((s) => ({ ...s, category: e.target.value }))}
                className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-heading">
                {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <input
                value={newLine.description}
                onChange={(e) => setNewLine((s) => ({ ...s, description: e.target.value }))}
                placeholder="Original line description"
                className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-heading md:col-span-2" />
              <input
                value={newLine.unit_price}
                onChange={(e) => setNewLine((s) => ({ ...s, unit_price: e.target.value }))}
                placeholder="Unit price"
                type="number" step="0.0001"
                className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-heading" />
              <input
                value={newLine.consumption}
                onChange={(e) => setNewLine((s) => ({ ...s, consumption: e.target.value }))}
                placeholder="Consumption"
                type="number" step="0.0001"
                className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-heading" />
              <button onClick={handleAddLine} disabled={acting}
                className="md:col-span-5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                Add Additional Cost Line
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-border">
                  <th className="py-2 pr-4 font-medium">Category</th>
                  <th className="py-2 pr-4 font-medium">Description</th>
                  <th className="py-2 pr-4 font-medium">Size / Width</th>
                  <th className="py-2 pr-4 font-medium text-right">Unit Price</th>
                  <th className="py-2 pr-4 font-medium text-right">Consumption</th>
                  <th className="py-2 pr-4 font-medium text-right">Line Total</th>
                  <th className="py-2 font-medium text-right">Approval</th>
                </tr>
              </thead>
              <tbody>
                {costing.lines.map((line) => (
                  <tr key={line.id} className="border-b border-border/50 last:border-0">
                    <td className="py-2 pr-4 text-body">{line.category_label}</td>
                    <td className="py-2 pr-4 text-heading">
                      <span className={line.is_additional ? 'text-badge-amber' : ''}>{line.description}</span>
                      {line.is_additional && line.original_description && (
                        <span className="block text-xs text-faint">Matches: {line.original_description}</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-body">{line.size_width || '—'}</td>
                    <td className="py-2 pr-4 text-right text-body">${parseFloat(String(line.unit_price)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                    <td className="py-2 pr-4 text-right text-body">{parseFloat(String(line.consumption)).toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                    <td className="py-2 pr-4 text-right text-emerald-700 font-mono">${parseFloat(String(line.line_total)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-2 text-right">
                      {!line.is_additional && <span className="text-xs text-faint">—</span>}
                      {line.is_additional && line.approved_at && (
                        <span className="text-xs text-emerald-700">Approved{line.approved_by_name ? ` by ${line.approved_by_name}` : ''}</span>
                      )}
                      {line.is_additional && !line.approved_at && (
                        <button onClick={() => handleApproveLine(line.id)} disabled={acting}
                          className="px-3 py-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors">Approve</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {costing.lines.length === 0 && (
              <p className="py-6 text-center text-faint text-sm italic">No cost lines yet</p>
            )}
          </div>
        </div>
      </main>
    </Layout>
  );
}
