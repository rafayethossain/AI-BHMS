import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import Modal from '../components/Modal';
import StatusPill from '../components/StatusPill';
import { useToast } from '../components/Toast';
import {
  addPoHit,
  addPoItem,
  approveAmendment,
  deletePoHit,
  deletePoItem,
  getPurchaseOrderDetail,
  rejectAmendment,
  requestAmendment,
  updatePoHit,
  updatePoItem,
} from '../mock/api';
import type {
  HitKind,
  HitMode,
  POHit,
  POAmendment,
  PurchaseOrderDetail,
  PurchaseOrderItem,
} from '../mock/types';
import ReportTable, { ReportCell } from './designDetail/ReportTable';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'items', label: 'Items' },
  { id: 'hits', label: 'Hits' },
  { id: 'amendments', label: 'Amendments' },
  { id: 'history', label: 'History' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const RISK_ROWS: { label: string; key: keyof PurchaseOrderDetail['statuses'] }[] = [
  { label: 'Fabric', key: 'fabric' },
  { label: 'Trims', key: 'trims' },
  { label: 'Production', key: 'production' },
  { label: 'Delivery', key: 'delivery' },
  { label: 'Overall', key: 'overall' },
];

const HIT_KINDS: HitKind[] = ['boxed', 'hanging'];
const HIT_MODES: HitMode[] = ['sea', 'air'];
const AMENDMENT_FIELDS = ['delivery_date', 'quantity', 'unit_price', 'factory'];

const inputCls =
  'w-full rounded-lg border border-input-border bg-surface px-3 py-2 text-sm text-body focus:outline-none focus:ring-2 focus:ring-emerald-500/30';

function money(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function qty(n: number): string {
  return n.toLocaleString('en-US');
}

function lineValue(item: PurchaseOrderItem): number {
  return item.quantity * (Number(item.unit_price) || 0);
}

export default function PurchaseOrderDetailPage() {
  const { poNumber = '' } = useParams();
  const { addToast } = useToast();

  const [detail, setDetail] = useState<PurchaseOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>('overview');

  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<PurchaseOrderItem | null>(null);
  const [showHitForm, setShowHitForm] = useState(false);
  const [editingHit, setEditingHit] = useState<POHit | null>(null);
  const [showAmdForm, setShowAmdForm] = useState(false);
  const [deleting, setDeleting] = useState<{ kind: 'item' | 'hit'; id: string; label: string } | null>(null);

  const refresh = useCallback(async () => {
    const data = await getPurchaseOrderDetail(poNumber);
    setDetail(data ?? null);
  }, [poNumber]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await getPurchaseOrderDetail(poNumber);
      if (!cancelled) {
        setDetail(data ?? null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [poNumber]);

  const handleAddItem = async (input: Omit<PurchaseOrderItem, 'id'>) => {
    try {
      await addPoItem(poNumber, input);
      await refresh();
      addToast('Item added');
      setShowItemForm(false);
    } catch {
      addToast('Failed to add item', 'error');
    }
  };

  const handleEditItem = async (input: Omit<PurchaseOrderItem, 'id'>) => {
    if (!editingItem) return;
    try {
      await updatePoItem(poNumber, editingItem.id, input);
      await refresh();
      addToast('Item updated');
      setShowItemForm(false);
      setEditingItem(null);
    } catch {
      addToast('Failed to update item', 'error');
    }
  };

  const handleDeleteItem = async () => {
    if (!deleting || deleting.kind !== 'item') return;
    try {
      await deletePoItem(poNumber, deleting.id);
      await refresh();
      addToast('Item deleted');
      setDeleting(null);
    } catch {
      addToast('Failed to delete item', 'error');
    }
  };

  const handleAddHit = async (input: Omit<POHit, 'id' | 'hit_number'>) => {
    try {
      await addPoHit(poNumber, input);
      await refresh();
      addToast('Hit added');
      setShowHitForm(false);
    } catch {
      addToast('Failed to add hit', 'error');
    }
  };

  const handleEditHit = async (input: Omit<POHit, 'id' | 'hit_number'>) => {
    if (!editingHit) return;
    try {
      await updatePoHit(poNumber, editingHit.id, input);
      await refresh();
      addToast('Hit updated');
      setShowHitForm(false);
      setEditingHit(null);
    } catch {
      addToast('Failed to update hit', 'error');
    }
  };

  const handleDeleteHit = async () => {
    if (!deleting || deleting.kind !== 'hit') return;
    try {
      await deletePoHit(poNumber, deleting.id);
      await refresh();
      addToast('Hit deleted');
      setDeleting(null);
    } catch {
      addToast('Failed to delete hit', 'error');
    }
  };

  const handleApprove = async (amendment: POAmendment) => {
    try {
      await approveAmendment(poNumber, amendment.id);
      await refresh();
      addToast('Amendment approved');
    } catch {
      addToast('Failed to approve amendment', 'error');
    }
  };

  const handleReject = async (amendment: POAmendment) => {
    try {
      await rejectAmendment(poNumber, amendment.id);
      await refresh();
      addToast('Amendment rejected');
    } catch {
      addToast('Failed to reject amendment', 'error');
    }
  };

  const handleRequestAmd = async (input: Omit<POAmendment, 'id' | 'amendment_number' | 'status' | 'requested_at'>) => {
    try {
      await requestAmendment(poNumber, input);
      await refresh();
      addToast('Amendment requested');
      setShowAmdForm(false);
    } catch {
      addToast('Failed to request amendment', 'error');
    }
  };

  if (loading) {
    return <div className="p-6 text-muted text-sm">Loading purchase order…</div>;
  }

  if (!detail) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted mb-3">Purchase order {poNumber || ''} not found.</p>
        <Link to="/purchase-orders" className="text-sm text-emerald-400 hover:text-emerald-300 underline">
          ← Back to Purchase Orders
        </Link>
      </div>
    );
  }

  const headerAction =
    tab === 'items' ? (
      <button
        type="button"
        onClick={() => {
          setEditingItem(null);
          setShowItemForm(true);
        }}
        className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shrink-0"
      >
        + Add Item
      </button>
    ) : tab === 'hits' ? (
      <button
        type="button"
        onClick={() => {
          setEditingHit(null);
          setShowHitForm(true);
        }}
        className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shrink-0"
      >
        + Add Hit
      </button>
    ) : tab === 'amendments' ? (
      <button
        type="button"
        onClick={() => setShowAmdForm(true)}
        className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shrink-0"
      >
        + Request Amendment
      </button>
    ) : null;

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border/40 bg-surface/50">
        <div className="px-6 pt-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4 min-w-0">
              <Link
                to="/purchase-orders"
                className="text-sm text-muted hover:text-heading transition-colors shrink-0"
              >
                ← Back to Purchase Orders
              </Link>
              <div className="min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-lg font-semibold text-heading">{detail.po_number}</h1>
                  <StatusPill value={detail.status} />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted mt-0.5 flex-wrap">
                  <span>{detail.fn_number}</span>
                  <span className="text-border-subtle">·</span>
                  <span>{detail.design_code}</span>
                  <span className="text-border-subtle">·</span>
                  <span>{detail.style_type ?? detail.category}</span>
                  <span className="text-border-subtle">·</span>
                  <span>{detail.buyer}</span>
                  <span className="text-border-subtle">·</span>
                  <span>{detail.factory}</span>
                </div>
              </div>
            </div>
            {headerAction}
          </div>
        </div>

        <div role="tablist" aria-label="Purchase order detail tabs" className="flex gap-1 border-t border-border mt-3 px-2 overflow-x-auto">
          {TABS.map((t) => {
            const selected = t.id === tab;
            return (
              <button
                key={t.id}
                role="tab"
                type="button"
                id={`po-tab-${t.id}`}
                aria-selected={selected}
                aria-controls={`po-panel-${t.id}`}
                onClick={() => setTab(t.id)}
                className={`px-3 py-2 text-sm whitespace-nowrap -mb-px border-b-2 transition-colors ${
                  selected
                    ? 'border-emerald-500 text-heading font-medium'
                    : 'border-transparent text-muted hover:text-heading'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div id={`po-panel-${tab}`} role="tabpanel" aria-labelledby={`po-tab-${tab}`} className="flex-1 p-6 overflow-auto">
        {tab === 'overview' && <OverviewTab detail={detail} />}
        {tab === 'items' && (
          <div className="space-y-4">
            <ReportTable columns={['Item Code', 'Colour', 'Size', 'Quantity', 'Unit Price', 'Line Value', 'Actions']} testId="items-table">
              {detail.items.map((item) => (
                <tr key={item.id} className="border-b border-border/40 last:border-0">
                  <ReportCell className="font-medium text-heading">{item.item_code}</ReportCell>
                  <ReportCell>{item.colour}</ReportCell>
                  <ReportCell>{item.size}</ReportCell>
                  <ReportCell className="text-right tabular-nums">{qty(item.quantity)}</ReportCell>
                  <ReportCell className="text-right tabular-nums">{money(Number(item.unit_price) || 0)}</ReportCell>
                  <ReportCell className="text-right tabular-nums">{money(lineValue(item))}</ReportCell>
                  <ReportCell>
                    <span className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItem(item);
                          setShowItemForm(true);
                        }}
                        className="text-sm text-emerald-400 hover:text-emerald-300"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting({ kind: 'item', id: item.id, label: item.item_code })}
                        className="text-sm text-red-400 hover:text-red-300"
                      >
                        Delete
                      </button>
                    </span>
                  </ReportCell>
                </tr>
              ))}
              {detail.items.length === 0 && (
                <tr>
                  <ReportCell className="text-muted">No line items yet.</ReportCell>
                  <ReportCell>{''}</ReportCell>
                  <ReportCell>{''}</ReportCell>
                  <ReportCell>{''}</ReportCell>
                  <ReportCell>{''}</ReportCell>
                  <ReportCell>{''}</ReportCell>
                  <ReportCell>{''}</ReportCell>
                </tr>
              )}
            </ReportTable>
            {detail.items.length > 0 && (
              <p className="text-xs text-muted">
                {qty(detail.items.reduce((s, i) => s + i.quantity, 0))} of {qty(detail.quantity)} units covered
              </p>
            )}
          </div>
        )}
        {tab === 'hits' && (
          <div className="space-y-4">
            <ReportTable columns={['Hit #', 'Type', 'Mode', 'Quantity', 'Hit Date', 'Notes', 'Actions']} testId="hits-table">
              {detail.hits.map((hit) => (
                <tr key={hit.id} className="border-b border-border/40 last:border-0">
                  <ReportCell className="font-medium text-heading">{hit.hit_number}</ReportCell>
                  <ReportCell>{hit.kind}</ReportCell>
                  <ReportCell>{hit.mode}</ReportCell>
                  <ReportCell className="text-right tabular-nums">{qty(hit.quantity)}</ReportCell>
                  <ReportCell className="tabular-nums">{hit.hit_date}</ReportCell>
                  <ReportCell>{hit.notes || '—'}</ReportCell>
                  <ReportCell>
                    <span className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingHit(hit);
                          setShowHitForm(true);
                        }}
                        className="text-sm text-emerald-400 hover:text-emerald-300"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting({ kind: 'hit', id: hit.id, label: hit.hit_number })}
                        className="text-sm text-red-400 hover:text-red-300"
                      >
                        Delete
                      </button>
                    </span>
                  </ReportCell>
                </tr>
              ))}
            </ReportTable>
          </div>
        )}
        {tab === 'amendments' && (
          <div className="space-y-4">
            <ReportTable
              columns={['Amendment', 'Field', 'From', 'To', 'Reason', 'Status', 'Actions']}
              testId="amendments-table"
            >
              {detail.amendments.map((a) => (
                <tr key={a.id} className="border-b border-border/40 last:border-0">
                  <ReportCell className="font-medium text-heading tabular-nums">{a.amendment_number}</ReportCell>
                  <ReportCell>{a.field}</ReportCell>
                  <ReportCell className="tabular-nums">{a.from_value}</ReportCell>
                  <ReportCell className="tabular-nums">{a.to_value}</ReportCell>
                  <ReportCell>{a.reason}</ReportCell>
                  <ReportCell>
                    <StatusPill value={a.status} />
                  </ReportCell>
                  <ReportCell>
                    {a.status === 'requested' ? (
                      <span className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleApprove(a)}
                          className="text-sm text-emerald-400 hover:text-emerald-300"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleReject(a)}
                          className="text-sm text-red-400 hover:text-red-300"
                        >
                          Reject
                        </button>
                      </span>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </ReportCell>
                </tr>
              ))}
            </ReportTable>
          </div>
        )}
        {tab === 'history' && (
          <div className="max-w-2xl">
            <h4 className="text-xs font-medium text-muted mb-4 uppercase tracking-wider">Order Trail</h4>
            <ol className="space-y-0">
              {detail.trail.map((event, index) => (
                <li key={event.id} className="relative pl-6 pb-5 border-l border-border/60 last:border-0">
                  <span
                    className={`absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full ${
                      index === 0 ? 'bg-emerald-500' : 'bg-muted/50'
                    }`}
                  />
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-medium text-heading">{event.action}</p>
                    <span className="text-xs text-muted tabular-nums shrink-0">{event.at}</span>
                  </div>
                  {event.detail && <p className="text-xs text-muted mt-0.5">{event.detail}</p>}
                  <p className="text-xs text-muted mt-0.5">by {event.actor}</p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {showItemForm && (
        <ItemFormModal
          initial={editingItem}
          onClose={() => {
            setShowItemForm(false);
            setEditingItem(null);
          }}
          onSubmit={editingItem ? handleEditItem : handleAddItem}
        />
      )}

      {showHitForm && (
        <HitFormModal
          initial={editingHit}
          onClose={() => {
            setShowHitForm(false);
            setEditingHit(null);
          }}
          onSubmit={editingHit ? handleEditHit : handleAddHit}
        />
      )}

      {showAmdForm && (
        <AmendmentFormModal
          onClose={() => setShowAmdForm(false)}
          onSubmit={handleRequestAmd}
        />
      )}

      {deleting && (
        <Modal
          open
          onClose={() => setDeleting(null)}
          title={deleting.kind === 'item' ? 'Delete Item' : 'Delete Hit'}
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
                onClick={deleting.kind === 'item' ? handleDeleteItem : handleDeleteHit}
                className="px-3 py-1.5 text-sm text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
              >
                {deleting.kind === 'item' ? 'Delete Item' : 'Delete Hit'}
              </button>
            </>
          }
        >
          <p className="text-sm text-body">
            Delete <span className="font-medium text-heading">{deleting.label}</span> from this purchase
            order? This cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
}

/* ---------- Overview tab ---------- */

function OverviewTab({ detail }: { detail: PurchaseOrderDetail }) {
  const fields: { label: string; value: string }[] = [
    { label: 'PO #', value: detail.po_number },
    { label: 'FN', value: detail.fn_number },
    { label: 'Design', value: detail.design_code },
    { label: 'Buyer', value: detail.buyer },
    { label: 'Factory', value: detail.factory },
    { label: 'Origin', value: detail.origin },
    { label: 'Destination', value: detail.destination },
    { label: 'Currency', value: detail.currency },
    { label: 'Quantity', value: qty(detail.quantity) },
    { label: 'Unit Price', value: money(Number(detail.unit_price) || 0) },
    { label: 'Total Value', value: money(Number(detail.total_value) || 0) },
    { label: 'PO Date', value: detail.po_date },
    { label: 'Delivery', value: detail.delivery_date },
    { label: 'Actual', value: detail.actual_delivery_date ?? '—' },
    { label: 'Status', value: detail.status },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h4 className="text-xs font-medium text-muted mb-3 uppercase tracking-wider">Order Details</h4>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
          {fields.map((f) => (
            <div key={f.label}>
              <dt className="text-xs text-muted mb-0.5">{f.label}</dt>
              <dd className="text-heading font-medium tabular-nums">{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div>
        <h4 className="text-xs font-medium text-muted mb-3 uppercase tracking-wider">Risk Matrix</h4>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {RISK_ROWS.map((row) => (
            <div key={row.key} className="rounded-lg border border-border/40 p-3 bg-surface/50">
              <p className="text-xs text-muted mb-1.5">{row.label}</p>
              <StatusPill value={detail.statuses[row.key].code} risk={detail.statuses[row.key]} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-medium text-muted mb-3 uppercase tracking-wider">Drill-down</h4>
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            to={`/designs/${detail.design_code}`}
            className="px-3 py-1.5 text-sm font-medium rounded-lg border border-input-border bg-surface text-heading hover:bg-surface-alt transition-colors"
          >
            Open Design
          </Link>
          {detail.version_id && (
            <Link
              to={`/designs/${detail.design_code}/versions/${detail.version_id}`}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-input-border bg-surface text-heading hover:bg-surface-alt transition-colors"
            >
              Open File
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Item form ---------- */

interface ItemFormModalProps {
  initial: PurchaseOrderItem | null;
  onClose: () => void;
  onSubmit: (input: Omit<PurchaseOrderItem, 'id'>) => void;
}

function ItemFormModal({ initial, onClose, onSubmit }: ItemFormModalProps) {
  const [itemCode, setItemCode] = useState(initial?.item_code ?? '');
  const [colour, setColour] = useState(initial?.colour ?? '');
  const [size, setSize] = useState(initial?.size ?? '');
  const [quantity, setQuantity] = useState(initial ? String(initial.quantity) : '');
  const [unitPrice, setUnitPrice] = useState(initial?.unit_price ?? '');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      item_code: itemCode.trim(),
      colour: colour.trim(),
      size: size.trim(),
      quantity: Number(quantity) || 0,
      unit_price: unitPrice.trim() || '0.00',
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={initial ? 'Edit Item' : 'Add Item'}
      maxWidthClass="max-w-lg"
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
            form="po-item-form"
            disabled={itemCode.trim() === ''}
            className="px-4 py-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg transition-colors"
          >
            {initial ? 'Save Changes' : 'Add Item'}
          </button>
        </>
      }
    >
      <form id="po-item-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label htmlFor="po-item-code" className="block text-sm text-body mb-1">Item Code *</label>
            <input id="po-item-code" value={itemCode} onChange={(e) => setItemCode(e.target.value)} className={inputCls} placeholder="e.g. REG-1001-S" required />
          </div>
          <div>
            <label htmlFor="po-item-colour" className="block text-sm text-body mb-1">Colour</label>
            <input id="po-item-colour" value={colour} onChange={(e) => setColour(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label htmlFor="po-item-size" className="block text-sm text-body mb-1">Size</label>
            <input id="po-item-size" value={size} onChange={(e) => setSize(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label htmlFor="po-item-quantity" className="block text-sm text-body mb-1">Quantity</label>
            <input id="po-item-quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={inputCls} inputMode="decimal" />
          </div>
          <div>
            <label htmlFor="po-item-price" className="block text-sm text-body mb-1">Unit Price</label>
            <input id="po-item-price" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className={inputCls} inputMode="decimal" />
          </div>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- Hit form ---------- */

interface HitFormModalProps {
  initial: POHit | null;
  onClose: () => void;
  onSubmit: (input: Omit<POHit, 'id' | 'hit_number'>) => void;
}

function HitFormModal({ initial, onClose, onSubmit }: HitFormModalProps) {
  const [kind, setKind] = useState<HitKind>(initial?.kind ?? 'boxed');
  const [mode, setMode] = useState<HitMode>(initial?.mode ?? 'sea');
  const [quantity, setQuantity] = useState(initial ? String(initial.quantity) : '');
  const [hitDate, setHitDate] = useState(initial?.hit_date ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      kind,
      mode,
      quantity: Number(quantity) || 0,
      hit_date: hitDate,
      notes: notes.trim(),
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={initial ? 'Edit Hit' : 'Add Hit'}
      maxWidthClass="max-w-lg"
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
            form="po-hit-form"
            disabled={hitDate === ''}
            className="px-4 py-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg transition-colors"
          >
            {initial ? 'Save Changes' : 'Add Hit'}
          </button>
        </>
      }
    >
      <form id="po-hit-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="po-hit-kind" className="block text-sm text-body mb-1">Hit Type</label>
            <select id="po-hit-kind" value={kind} onChange={(e) => setKind(e.target.value as HitKind)} className={inputCls}>
              {HIT_KINDS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="po-hit-mode" className="block text-sm text-body mb-1">Mode</label>
            <select id="po-hit-mode" value={mode} onChange={(e) => setMode(e.target.value as HitMode)} className={inputCls}>
              {HIT_MODES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="po-hit-quantity" className="block text-sm text-body mb-1">Quantity</label>
            <input id="po-hit-quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={inputCls} inputMode="decimal" />
          </div>
          <div>
            <label htmlFor="po-hit-date" className="block text-sm text-body mb-1">Hit Date</label>
            <input id="po-hit-date" type="date" value={hitDate} onChange={(e) => setHitDate(e.target.value)} className={inputCls} required />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="po-hit-notes" className="block text-sm text-body mb-1">Notes</label>
            <input id="po-hit-notes" value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
          </div>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- Amendment form ---------- */

interface AmendmentFormModalProps {
  onClose: () => void;
  onSubmit: (input: Omit<POAmendment, 'id' | 'amendment_number' | 'status' | 'requested_at'>) => void;
}

function AmendmentFormModal({ onClose, onSubmit }: AmendmentFormModalProps) {
  const [field, setField] = useState('delivery_date');
  const [fromValue, setFromValue] = useState('');
  const [toValue, setToValue] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      field,
      from_value: fromValue.trim(),
      to_value: toValue.trim(),
      reason: reason.trim(),
      requested_by: 'F. Rahman',
    });
  };

  const canSubmit = fromValue.trim() !== '' && toValue.trim() !== '';

  return (
    <Modal
      open
      onClose={onClose}
      title="Request Amendment"
      maxWidthClass="max-w-lg"
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
            form="po-amd-form"
            disabled={!canSubmit}
            className="px-4 py-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg transition-colors"
          >
            Request Amendment
          </button>
        </>
      }
    >
      <form id="po-amd-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="po-amd-field" className="block text-sm text-body mb-1">Field</label>
          <select id="po-amd-field" value={field} onChange={(e) => setField(e.target.value)} className={inputCls}>
            {AMENDMENT_FIELDS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="po-amd-from" className="block text-sm text-body mb-1">From</label>
            <input id="po-amd-from" value={fromValue} onChange={(e) => setFromValue(e.target.value)} className={inputCls} placeholder="Old value" required />
          </div>
          <div>
            <label htmlFor="po-amd-to" className="block text-sm text-body mb-1">To</label>
            <input id="po-amd-to" value={toValue} onChange={(e) => setToValue(e.target.value)} className={inputCls} placeholder="New value" required />
          </div>
        </div>
        <div>
          <label htmlFor="po-amd-reason" className="block text-sm text-body mb-1">Reason</label>
          <input id="po-amd-reason" value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} placeholder="Why is this amendment needed?" />
        </div>
      </form>
    </Modal>
  );
}