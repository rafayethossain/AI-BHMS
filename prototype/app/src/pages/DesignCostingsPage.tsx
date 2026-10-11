import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import StatusPill from '../components/StatusPill';
import {
  addCosting,
  deleteCosting,
  getDesignByCode,
  getDesignCostings,
  getDesignPOs,
  setLiveCosting,
  updateCosting,
} from '../mock/api';
import type {
  Costing,
  CostingSheetType,
  CostingStatus,
  DesignPO,
  DesignRegisterRow,
} from '../mock/types';

const SHEET_TYPE_OPTIONS: { value: CostingSheetType; label: string }[] = [
  { value: 'sl', label: 'Sri Lanka' },
  { value: 'vn', label: 'Vietnam' },
  { value: 'bd', label: 'Bangladesh' },
  { value: 'cn', label: 'China' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS: { value: CostingStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

function sheetLabel(value: string): string {
  return SHEET_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function money(value: string | number): string {
  const n = typeof value === 'number' ? value : Number(value || 0);
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function lineTotal(input: Pick<Costing, 'fabric_cost' | 'trim_cost' | 'cm_cost' | 'overhead_cost'>): number {
  const sum =
    Number(input.fabric_cost || 0) +
    Number(input.trim_cost || 0) +
    Number(input.cm_cost || 0) +
    Number(input.overhead_cost || 0);
  return Math.round(sum * 100) / 100;
}

function marginPercent(input: Pick<Costing, 'fabric_cost' | 'trim_cost' | 'cm_cost' | 'overhead_cost' | 'target_price'>): string {
  const target = Number(input.target_price || 0);
  if (!target) return '—';
  return `${(((target - lineTotal(input)) / target) * 100).toFixed(1)}%`;
}

const inputCls =
  'w-full px-3 py-2 bg-input border border-input-border rounded-lg text-sm text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60';

const thCls = 'px-3 py-2.5 text-xs font-medium text-muted whitespace-nowrap text-left border-b border-border/60';

const actionBtnCls = 'px-2 py-1 text-xs hover:bg-surface-alt rounded transition-colors';

export default function DesignCostingsPage() {
  const { designCode } = useParams<{ designCode: string }>();
  const { addToast } = useToast();
  const [design, setDesign] = useState<DesignRegisterRow | null>(null);
  const [pos, setPos] = useState<DesignPO[]>([]);
  const [costings, setCostings] = useState<Costing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState<'add' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Costing | null>(null);
  const [viewing, setViewing] = useState<Costing | null>(null);
  const [deleting, setDeleting] = useState<Costing | null>(null);

  useEffect(() => {
    if (!designCode) return;
    let cancelled = false;
    (async () => {
      const [d, ps, cs] = await Promise.all([
        getDesignByCode(designCode),
        getDesignPOs(designCode),
        getDesignCostings(designCode),
      ]);
      if (!cancelled) {
        setDesign(d ?? null);
        setPos(ps);
        setCostings(cs);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [designCode]);

  const refresh = async () => {
    if (!designCode) return;
    setCostings(await getDesignCostings(designCode));
  };

  const handleAdd = async (input: Omit<Costing, 'id'>) => {
    if (!designCode) return;
    try {
      await addCosting(designCode, input);
      await refresh();
      addToast('Costing added');
      setShowForm(null);
    } catch {
      addToast('Failed to add costing', 'error');
    }
  };

  const handleEdit = async (input: Omit<Costing, 'id'>) => {
    if (!designCode || !editing) return;
    try {
      await updateCosting(designCode, editing.id, input);
      await refresh();
      addToast('Costing updated');
      setShowForm(null);
      setEditing(null);
    } catch {
      addToast('Failed to update costing', 'error');
    }
  };

  const handleSetLive = async (costing: Costing) => {
    if (!designCode) return;
    try {
      await setLiveCosting(designCode, costing.id);
      addToast('Live costing updated');
      await refresh();
    } catch {
      addToast('Failed to set live costing', 'error');
    }
  };

  const handleDelete = async () => {
    if (!designCode || !deleting) return;
    try {
      await deleteCosting(designCode, deleting.id);
      await refresh();
      addToast('Costing deleted');
      setDeleting(null);
    } catch {
      addToast('Failed to delete costing', 'error');
    }
  };

  if (loading) {
    return <div className="p-6 text-muted text-sm">Loading costings…</div>;
  }

  if (!design) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted mb-3">Design {designCode} not found.</p>
        <Link to="/design" className="text-sm text-emerald-400 hover:text-emerald-300 underline">
          Back to register
        </Link>
      </div>
    );
  }

  const liveCount = costings.filter((c) => c.is_live).length;

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border/40 px-6 py-4 bg-surface/50">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              to="/design"
              className="text-sm text-muted hover:text-heading transition-colors shrink-0"
            >
              ← Back
            </Link>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-heading truncate">
                {design.design_code} — Costings
              </h1>
              <div className="flex items-center gap-3 text-xs text-muted mt-0.5">
                <span>{design.buyer}</span>
                <span className="text-border-subtle">·</span>
                <span>{design.style_type ?? design.category}</span>
                <span className="text-border-subtle">·</span>
                <span>{costings.length} costing{costings.length !== 1 ? 's' : ''}</span>
                <span className="text-border-subtle">·</span>
                <span>Live: {liveCount}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setEditing(null); setShowForm('add'); }}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shrink-0"
          >
            + Add Costing
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        {costings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted mb-3">No costings yet. Add the first costing sheet for this design.</p>
            <button
              type="button"
              onClick={() => { setEditing(null); setShowForm('add'); }}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
            >
              + Add Costing
            </button>
          </div>
        ) : (
          <div className="border border-input-border rounded-lg overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-surface-alt border-b border-border/60">
                  <th className={thCls}>PO #</th>
                  <th className={thCls}>V</th>
                  <th className={thCls}>Sheet</th>
                  <th className={`${thCls} text-right`}>Fabric</th>
                  <th className={`${thCls} text-right`}>Trim</th>
                  <th className={`${thCls} text-right`}>CM</th>
                  <th className={`${thCls} text-right`}>Overhead</th>
                  <th className={`${thCls} text-right`}>Total</th>
                  <th className={`${thCls} text-right`}>Margin</th>
                  <th className={thCls}>Status</th>
                  <th className={thCls}>Live</th>
                  <th className="w-48 px-3 py-2.5 text-xs font-medium text-muted text-right border-b border-border/60">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {costings.map((costing) => (
                  <tr
                    key={costing.id}
                    data-costing-id={costing.id}
                    data-live={costing.is_live ? 'true' : 'false'}
                    data-version={String(costing.version)}
                    className="border-b border-border/40 hover:bg-surface-alt/30 transition-colors"
                  >
                    <td className="px-3 py-2 font-medium text-heading whitespace-nowrap">{costing.po_number}</td>
                    <td className="px-3 py-2 text-body whitespace-nowrap tabular-nums">{costing.version}</td>
                    <td className="px-3 py-2 text-body whitespace-nowrap">{sheetLabel(costing.sheet_type)}</td>
                    <td className="px-3 py-2 text-body text-right whitespace-nowrap tabular-nums">{money(costing.fabric_cost)}</td>
                    <td className="px-3 py-2 text-body text-right whitespace-nowrap tabular-nums">{money(costing.trim_cost)}</td>
                    <td className="px-3 py-2 text-body text-right whitespace-nowrap tabular-nums">{money(costing.cm_cost)}</td>
                    <td className="px-3 py-2 text-body text-right whitespace-nowrap tabular-nums">{money(costing.overhead_cost)}</td>
                    <td className="px-3 py-2 text-heading text-right font-medium whitespace-nowrap tabular-nums">{money(lineTotal(costing))}</td>
                    <td className="px-3 py-2 text-body text-right whitespace-nowrap tabular-nums">{marginPercent(costing)}</td>
                    <td className="px-3 py-2 whitespace-nowrap"><StatusPill value={costing.status} /></td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {costing.is_live ? <StatusPill value="live" /> : <span className="text-muted">—</span>}
                    </td>
                    <td className="px-3 py-2 text-right" aria-label="Row actions">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setViewing(costing)}
                          className={`${actionBtnCls} text-blue-400 hover:text-blue-300`}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => { setEditing(costing); setShowForm('edit'); }}
                          className={`${actionBtnCls} text-amber-400 hover:text-amber-300`}
                        >
                          Edit
                        </button>
                        {!costing.is_live && (
                          <button
                            type="button"
                            onClick={() => handleSetLive(costing)}
                            className={`${actionBtnCls} text-emerald-400 hover:text-emerald-300`}
                          >
                            Set Live
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setDeleting(costing)}
                          className={`${actionBtnCls} text-red-400 hover:text-red-300`}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <CostingFormModal
          mode={showForm}
          initial={editing}
          poNumbers={pos.map((p) => p.po_number)}
          onClose={() => { setShowForm(null); setEditing(null); }}
          onSubmit={showForm === 'add' ? handleAdd : handleEdit}
        />
      )}

      {viewing && (
        <Modal
          open
          onClose={() => setViewing(null)}
          title="View Costing"
          maxWidthClass="max-w-3xl"
          contentClassName="max-h-[75vh] overflow-y-auto pr-1"
          footer={
            <button
              type="button"
              onClick={() => setViewing(null)}
              className="px-3 py-1.5 text-sm text-body border border-input-border rounded-lg hover:text-heading transition-colors"
            >
              Close
            </button>
          }
        >
          <div className="space-y-5">
            <div>
              <h4 className="text-xs font-medium text-muted mb-3 uppercase tracking-wider">Costing</h4>
              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted mb-0.5">PO #</dt>
                  <dd className="text-heading font-medium">{viewing.po_number}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted mb-0.5">Version</dt>
                  <dd className="text-body tabular-nums">V{viewing.version}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted mb-0.5">Sheet Type</dt>
                  <dd className="text-body">{sheetLabel(viewing.sheet_type)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted mb-0.5">Status</dt>
                  <dd><StatusPill value={viewing.status} /></dd>
                </div>
                <div>
                  <dt className="text-xs text-muted mb-0.5">Live</dt>
                  <dd>{viewing.is_live ? <StatusPill value="live" /> : <span className="text-muted">—</span>}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted mb-0.5">Exchange Rate</dt>
                  <dd className="text-body tabular-nums">{viewing.exchange_rate || '—'}</dd>
                </div>
              </dl>
            </div>

            <div>
              <h4 className="text-xs font-medium text-muted mb-3 uppercase tracking-wider">Cost Breakdown</h4>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted mb-0.5">Fabric</dt>
                  <dd className="text-body tabular-nums">{money(viewing.fabric_cost)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted mb-0.5">Trims</dt>
                  <dd className="text-body tabular-nums">{money(viewing.trim_cost)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted mb-0.5">CM</dt>
                  <dd className="text-body tabular-nums">{money(viewing.cm_cost)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted mb-0.5">Overheads</dt>
                  <dd className="text-body tabular-nums">{money(viewing.overhead_cost)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted mb-0.5">Total Cost</dt>
                  <dd className="text-heading font-medium tabular-nums">{money(lineTotal(viewing))}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted mb-0.5">Target Price</dt>
                  <dd className="text-body tabular-nums">{viewing.target_price ? money(viewing.target_price) : '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted mb-0.5">Margin</dt>
                  <dd className="text-body tabular-nums">{marginPercent(viewing)}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-muted mb-0.5">Notes</dt>
                  <dd className="text-body">{viewing.notes || '—'}</dd>
                </div>
              </dl>
            </div>
          </div>
        </Modal>
      )}

      {deleting && (
        <Modal
          open
          onClose={() => setDeleting(null)}
          title="Delete Costing"
          maxWidthClass="max-w-sm"
          footer={
            <>
              <button
                type="button"
                onClick={() => setDeleting(null)}
                className="px-3 py-1.5 text-sm text-body border border-input-border rounded-lg hover:text-heading transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-1.5 text-sm text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
              >
                Delete
              </button>
            </>
          }
        >
          <p className="text-sm text-body">
            Delete costing{' '}
            <span className="font-medium text-heading">
              {deleting.po_number} V{deleting.version}
            </span>{' '}
            from this design? This cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
}

/* ---------- Add / Edit modal ---------- */

interface CostingFormModalProps {
  mode: 'add' | 'edit';
  initial?: Costing | null;
  poNumbers: string[];
  onClose: () => void;
  onSubmit: (input: Omit<Costing, 'id'>) => void;
}

function CostingFormModal({ mode, initial, poNumbers, onClose, onSubmit }: CostingFormModalProps) {
  const [poNumber, setPoNumber] = useState(initial?.po_number ?? '');
  const [version, setVersion] = useState(String(initial?.version ?? 1));
  const [sheetType, setSheetType] = useState<CostingSheetType>(initial?.sheet_type ?? 'sl');
  const [status, setStatus] = useState<CostingStatus>(initial?.status ?? 'draft');
  const [exchangeRate, setExchangeRate] = useState(initial?.exchange_rate ?? '');
  const [fabricCost, setFabricCost] = useState(initial?.fabric_cost ?? '');
  const [trimCost, setTrimCost] = useState(initial?.trim_cost ?? '');
  const [cmCost, setCmCost] = useState(initial?.cm_cost ?? '');
  const [overheadCost, setOverheadCost] = useState(initial?.overhead_cost ?? '');
  const [targetPrice, setTargetPrice] = useState(initial?.target_price ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const draft = {
    fabric_cost: fabricCost,
    trim_cost: trimCost,
    cm_cost: cmCost,
    overhead_cost: overheadCost,
    target_price: targetPrice,
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      po_number: poNumber,
      version: Number(version) || 1,
      sheet_type: sheetType,
      status,
      is_live: initial?.is_live ?? false,
      exchange_rate: exchangeRate,
      target_price: targetPrice,
      fabric_cost: fabricCost,
      trim_cost: trimCost,
      cm_cost: cmCost,
      overhead_cost: overheadCost,
      notes: notes.trim(),
    });
  };

  const canSubmit = poNumber !== '';

  return (
    <Modal
      open
      onClose={onClose}
      title={mode === 'add' ? 'Add Costing' : 'Edit Costing'}
      maxWidthClass="max-w-2xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-body border border-input-border rounded-lg hover:text-heading transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="costing-form"
            disabled={!canSubmit}
            className="px-4 py-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg transition-colors"
          >
            {mode === 'add' ? 'Add Costing' : 'Save Changes'}
          </button>
        </>
      }
    >
      <form id="costing-form" onSubmit={handleSubmit} className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
        <div>
          <h4 className="text-xs font-medium text-muted mb-3 uppercase tracking-wider">Costing Information</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="costing-po" className="block text-sm text-body mb-1">Purchase Order *</label>
              <select
                id="costing-po"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                className={inputCls}
                required
              >
                <option value="">Select …</option>
                {poNumbers.map((po) => (
                  <option key={po} value={po}>{po}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="costing-version" className="block text-sm text-body mb-1">Version</label>
              <input
                id="costing-version"
                type="number"
                min={1}
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="costing-sheet" className="block text-sm text-body mb-1">Sheet Type</label>
              <select
                id="costing-sheet"
                value={sheetType}
                onChange={(e) => setSheetType(e.target.value as CostingSheetType)}
                className={inputCls}
              >
                {SHEET_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="costing-status" className="block text-sm text-body mb-1">Status</label>
              <select
                id="costing-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as CostingStatus)}
                className={inputCls}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="costing-rate" className="block text-sm text-body mb-1">Exchange Rate</label>
              <input
                id="costing-rate"
                type="number"
                step="0.000001"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
                className={inputCls}
                placeholder="GBP per USD"
              />
            </div>
            <div>
              <label htmlFor="costing-target" className="block text-sm text-body mb-1">Target Price</label>
              <input
                id="costing-target"
                type="number"
                step="0.01"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-medium text-muted mb-3 uppercase tracking-wider">Cost Breakdown</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="costing-fabric" className="block text-sm text-body mb-1">Fabric Cost</label>
              <input
                id="costing-fabric"
                type="number"
                step="0.01"
                value={fabricCost}
                onChange={(e) => setFabricCost(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="costing-trim" className="block text-sm text-body mb-1">Trims Cost</label>
              <input
                id="costing-trim"
                type="number"
                step="0.01"
                value={trimCost}
                onChange={(e) => setTrimCost(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="costing-cm" className="block text-sm text-body mb-1">CM Cost</label>
              <input
                id="costing-cm"
                type="number"
                step="0.01"
                value={cmCost}
                onChange={(e) => setCmCost(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="costing-overhead" className="block text-sm text-body mb-1">Overhead Cost</label>
              <input
                id="costing-overhead"
                type="number"
                step="0.01"
                value={overheadCost}
                onChange={(e) => setOverheadCost(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-lg border border-border-subtle bg-surface-alt/40 px-4 py-2 text-sm">
            <span className="text-muted">Total cost</span>
            <span className="font-medium text-heading tabular-nums">{money(lineTotal(draft))}</span>
          </div>
          <div className="mt-1 flex items-center justify-between px-4 text-sm">
            <span className="text-muted">Margin</span>
            <span className="font-medium text-heading tabular-nums">{marginPercent(draft)}</span>
          </div>
        </div>

        <div>
          <label htmlFor="costing-notes" className="block text-sm text-body mb-1">Notes</label>
          <textarea
            id="costing-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={inputCls}
          />
        </div>
      </form>
    </Modal>
  );
}
