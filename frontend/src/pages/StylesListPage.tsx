import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { merchApi, setupApi } from '../api/client';
import type { Style, Buyer, ProductType } from '../api/client';
import SearchableSelect from '../components/SearchableSelect';
import SpreadsheetGrid from '../components/SpreadsheetGrid';
import type { SpreadsheetColumn } from '../components/SpreadsheetGrid';
import EntityCard, { CardListToggle } from '../components/EntityCard';
import { useToast } from '../contexts/ToastContext';
import Layout from '../components/Layout';

type CreateMode = 'fresh' | 'copy';

interface FreshForm {
  name: string;
  description: string;
  buyer: string;
  product_type: string;
  block: string;
  based_on: string;
  relationship: string;
  customer: string;
  designer: string;
  pattern_cutter: string;
  issuer: string;
  cloth_code: string;
  size: string;
  length: string;
  issue_date: string;
  risk_date: string;
  pattern_request_date: string;
  design_note: string;
}

const EMPTY_FRESH: FreshForm = {
  name: '', description: '', buyer: '', product_type: '',
  block: '', based_on: '', relationship: 'new', customer: '',
  designer: '', pattern_cutter: '', issuer: '', cloth_code: '',
  size: '', length: '', issue_date: '', risk_date: '',
  pattern_request_date: '', design_note: '',
};

const RELATIONSHIP_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'based_on', label: 'Based On' },
  { value: 'recut', label: 'Recut' },
  { value: 'na', label: 'NA' },
];

export default function StylesListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [styles, setStyles] = useState<Style[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [mode, setMode] = useState<CreateMode>('fresh');
  const [freshForm, setFreshForm] = useState<FreshForm>({ ...EMPTY_FRESH });
  const [copySourceId, setCopySourceId] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [allStyles, setAllStyles] = useState<Style[]>([]);
  const [view, setView] = useState<'grid' | 'list'>('list');
  const [showDesignDetails, setShowDesignDetails] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await merchApi.getStyles({ page_size: '10000' });
      setStyles(res.data.results); setCount(res.data.count);
    } catch { toast('error', 'Failed to load styles'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    setupApi.getBuyers({ page_size: '500' }).then((r) => setBuyers(r.data.results)).catch(() => {});
    setupApi.getTypes({ page_size: '500' }).then((r) => setProductTypes(r.data.results)).catch(() => {});
  }, []);

  const copySource = allStyles.find((s) => s.id === copySourceId) ?? null;

  const switchMode = (next: CreateMode) => {
    setMode(next);
    setCopySourceId('');
    setFreshForm({ ...EMPTY_FRESH });
    setShowDesignDetails(false);
  };

  const openCreateModal = async () => {
    setShowCreate(true);
    setMode('fresh');
    setFreshForm({ ...EMPTY_FRESH });
    setCopySourceId('');
    setShowDesignDetails(false);
    if (allStyles.length === 0) {
      try {
        const res = await merchApi.getStyles({ page_size: '10000' });
        setAllStyles(res.data.results);
      } catch { /* ignore */ }
    }
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      let res;
      if (mode === 'copy') {
        res = await merchApi.copyStyle(copySourceId);
      } else {
        const payload: Record<string, unknown> = { ...freshForm };
        if (!payload.buyer) delete payload.buyer;
        if (!payload.product_type) delete payload.product_type;
        Object.keys(payload).forEach((k) => {
          if (payload[k] === '' || payload[k] === null || payload[k] === undefined) delete payload[k];
        });
        res = await merchApi.createStyle(payload);
      }
      setShowCreate(false);
      toast('success', 'Style created successfully');
      navigate(`/styles/${res.data.id}`);
    } catch { toast('error', 'Failed to create style'); } finally { setCreating(false); }
  };

  const handleDelete = async (id: string) => {
    try { await merchApi.deleteStyle(id); setDeleteId(null); toast('success', 'Style deleted'); fetchData(); } catch { toast('error', 'Failed to delete style'); }
  };

  const updateFresh = (field: keyof FreshForm, value: string) =>
    setFreshForm((prev) => ({ ...prev, [field]: value }));

  const columns: SpreadsheetColumn[] = [
    { title: 'Style #', field: 'style_number', headerFilter: true, frozen: true, hozAlign: 'left' },
    { title: 'Name', field: 'name', headerFilter: true },
    { title: 'Buyer', field: 'buyer_name', headerFilter: true },
    { title: 'Status', field: 'status', headerFilter: true },
    { title: 'FOs', field: 'file_openings_count', hozAlign: 'right' },
    { title: 'POs', field: 'purchase_orders_count', hozAlign: 'right' },
  ];

  const inputClass = 'w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500';
  const disabledClass = 'w-full px-3 py-2 bg-input border border-input-border rounded-lg text-heading text-sm opacity-70';

  return (
    <Layout>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Styles</h1>
            <p className="text-muted text-sm mt-1">{count} total styles</p>
          </div>
          <div className="flex items-center gap-3">
            <CardListToggle view={view} onChange={setView} />
            <button onClick={openCreateModal} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
              + New Style
            </button>
          </div>
        </div>

        {view === 'list' ? (
          <SpreadsheetGrid
            data={styles as unknown as Record<string, unknown>[]}
            columns={columns}
            height={460}
            toolbar
            title="Styles"
            exportable
            columnChooser
            paginationSize={25}
            actionColumn
            onAdd={openCreateModal}
            onView={(row) => navigate(`/styles/${String(row.id)}`)}
            onDelete={(row) => setDeleteId(String(row.id))}
            onRowClick={(row) => navigate(`/styles/${String(row.id)}`)}
            loading={loading}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {styles.map(style => (
              <EntityCard key={style.id} id={style.id} code={style.style_number} title={style.name}
                subtitle={style.buyer_name} status={style.status} image={style.main_image || style.sketch_front}
                metrics={[
                  { label: 'FOs', value: style.file_openings_count },
                  { label: 'POs', value: style.purchase_orders_count },
                ]}
                url={`/styles/${style.id}`}
                actions={[
                  { label: 'View', onClick: () => navigate(`/styles/${style.id}`) },
                  { label: 'Delete', onClick: () => setDeleteId(style.id), color: 'bg-red-500/10 text-red-400 hover:bg-red-500/20' },
                ]} />
            ))}
            {styles.length === 0 && !loading && (
              <div className="col-span-full bg-surface rounded-xl border border-border p-12 text-center">
                <svg className="w-12 h-12 text-faint mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" /></svg>
                <p className="text-lg font-medium text-heading mb-1">No styles yet</p>
                <p className="text-sm text-muted mb-4">Create your first style to get started with the design-to-delivery workflow.</p>
                <button onClick={openCreateModal} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg font-medium transition-colors">+ New Style</button>
              </div>
            )}
          </div>
        )}
      </main>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-semibold">New Style</h2>
              <button type="button" onClick={() => setShowCreate(false)} aria-label="Close"
                className="text-muted hover:text-heading text-xl leading-none transition-colors">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              {/* Mode toggle */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-input rounded-lg">
                <button type="button" onClick={() => switchMode('fresh')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'fresh' ? 'bg-surface text-heading shadow-sm' : 'text-muted hover:text-body'}`}>
                  Fresh Style
                </button>
                <button type="button" onClick={() => switchMode('copy')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'copy' ? 'bg-surface text-heading shadow-sm' : 'text-muted hover:text-body'}`}>
                  Copy From Existing
                </button>
              </div>

              {/* Copy mode: source selector */}
              {mode === 'copy' && (
                <div>
                  <label className="block text-sm text-body mb-1">Source Style *</label>
                  <SearchableSelect
                    options={allStyles.map((s) => ({ value: s.id, label: `${s.style_number} - ${s.name}`, description: s.buyer_name }))}
                    value={copySourceId}
                    onChange={(v) => setCopySourceId(String(v || ''))}
                    placeholder="Search by style number or name..."
                  />
                </div>
              )}

              {/* Copy mode: read-only derived fields */}
              {mode === 'copy' && copySource && (
                <>
                  <div>
                    <label className="block text-sm text-body mb-1">Product Type</label>
                    <input value={productTypes.find((t) => t.id === copySource.product_type)?.name || ''} disabled className={disabledClass} />
                  </div>
                  <div>
                    <label className="block text-sm text-body mb-1">Relationship</label>
                    <input value="Based On" disabled className={disabledClass} />
                  </div>
                </>
              )}

              {/* Common: Name */}
              {mode === 'fresh' && (
                <div>
                  <label className="block text-sm text-body mb-1">Style Name *</label>
                  <input required value={freshForm.name} onChange={(e) => updateFresh('name', e.target.value)}
                    className={inputClass} placeholder="e.g. Summer Polo Shirt" />
                </div>
              )}

              {/* Common: Buyer */}
              <div>
                <label className="block text-sm text-body mb-1">Buyer {mode === 'fresh' ? '*' : ''}</label>
                <SearchableSelect
                  options={buyers.map((b) => ({ value: b.id, label: b.name }))}
                  value={mode === 'copy' ? (copySource?.buyer || '') : (freshForm.buyer || null)}
                  onChange={(v) => { if (mode === 'fresh') updateFresh('buyer', String(v || '')); }}
                  placeholder="Select buyer..."
                  {...(mode === 'copy' && copySource ? { disabled: true } : {})}
                />
              </div>

              {/* Fresh mode: Product Type */}
              {mode === 'fresh' && (
                <div>
                  <label className="block text-sm text-body mb-1">Product Type</label>
                  <SearchableSelect
                    options={productTypes.map((t) => ({ value: t.id, label: t.name }))}
                    value={freshForm.product_type || null}
                    onChange={(v) => updateFresh('product_type', String(v || ''))}
                    placeholder="Select product type..."
                  />
                </div>
              )}

              {/* Fresh mode: Collapsible Design Details */}
              {mode === 'fresh' && (
                <div className="border border-border rounded-lg">
                  <button type="button" onClick={() => setShowDesignDetails(!showDesignDetails)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-body hover:text-heading transition-colors">
                    <span>Design Details (Optional)</span>
                    <svg className={`w-4 h-4 transition-transform ${showDesignDetails ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showDesignDetails && (
                    <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-muted mb-1">Block</label>
                          <input value={freshForm.block} onChange={(e) => updateFresh('block', e.target.value)} className={inputClass} placeholder="e.g. Block A" />
                        </div>
                        <div>
                          <label className="block text-xs text-muted mb-1">Based On</label>
                          <input value={freshForm.based_on} onChange={(e) => updateFresh('based_on', e.target.value)} className={inputClass} placeholder="e.g. 59073T" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-muted mb-1">Relationship</label>
                          <select value={freshForm.relationship} onChange={(e) => updateFresh('relationship', e.target.value)}
                            className={inputClass}>
                            {RELATIONSHIP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-muted mb-1">Customer</label>
                          <input value={freshForm.customer} onChange={(e) => updateFresh('customer', e.target.value)} className={inputClass} placeholder="e.g. Zara" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-muted mb-1">Designer</label>
                          <input value={freshForm.designer} onChange={(e) => updateFresh('designer', e.target.value)} className={inputClass} placeholder="e.g. John Doe" />
                        </div>
                        <div>
                          <label className="block text-xs text-muted mb-1">Pattern Cutter</label>
                          <input value={freshForm.pattern_cutter} onChange={(e) => updateFresh('pattern_cutter', e.target.value)} className={inputClass} placeholder="e.g. Jane Smith" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-muted mb-1">Issuer</label>
                          <input value={freshForm.issuer} onChange={(e) => updateFresh('issuer', e.target.value)} className={inputClass} placeholder="e.g. Buying House" />
                        </div>
                        <div>
                          <label className="block text-xs text-muted mb-1">Cloth Code</label>
                          <input value={freshForm.cloth_code} onChange={(e) => updateFresh('cloth_code', e.target.value)} className={inputClass} placeholder="e.g. CC-12345" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-muted mb-1">Size</label>
                          <input value={freshForm.size} onChange={(e) => updateFresh('size', e.target.value)} className={inputClass} placeholder="e.g. S, M, L, XL" />
                        </div>
                        <div>
                          <label className="block text-xs text-muted mb-1">Length</label>
                          <input value={freshForm.length} onChange={(e) => updateFresh('length', e.target.value)} className={inputClass} placeholder="e.g. 72cm" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-muted mb-1">Issue Date</label>
                          <input type="date" value={freshForm.issue_date} onChange={(e) => updateFresh('issue_date', e.target.value)} className={inputClass} />
                        </div>
                        <div>
                          <label className="block text-xs text-muted mb-1">Risk Date</label>
                          <input type="date" value={freshForm.risk_date} onChange={(e) => updateFresh('risk_date', e.target.value)} className={inputClass} />
                        </div>
                        <div>
                          <label className="block text-xs text-muted mb-1">Pattern Request Date</label>
                          <input type="date" value={freshForm.pattern_request_date} onChange={(e) => updateFresh('pattern_request_date', e.target.value)} className={inputClass} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-muted mb-1">Design Note</label>
                        <textarea value={freshForm.design_note} onChange={(e) => updateFresh('design_note', e.target.value)}
                          className={inputClass} rows={2} placeholder="Additional design notes..." />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Description (both modes) */}
              <div>
                <label className="block text-sm text-body mb-1">Description</label>
                <textarea
                  value={mode === 'fresh' ? freshForm.description : ''}
                  onChange={(e) => { if (mode === 'fresh') updateFresh('description', e.target.value); }}
                  className={inputClass} rows={2}
                  placeholder={mode === 'copy' ? 'Copied from source style' : 'Style description...'}
                  disabled={mode === 'copy'}
                />
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button type="button" onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm text-body hover:text-heading transition-colors">Cancel</button>
              <button type="button" onClick={handleCreate} disabled={creating || (mode === 'fresh' && !freshForm.name) || (mode === 'copy' && !copySourceId)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                {creating ? 'Creating...' : mode === 'copy' ? 'Copy Style' : 'Create Style'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2">Delete Style?</h2>
            <p className="text-muted text-sm mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-body hover:text-heading">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg">Delete</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
