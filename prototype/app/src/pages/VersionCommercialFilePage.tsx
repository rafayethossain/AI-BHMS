import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import Modal from '../components/Modal';
import StatusPill from '../components/StatusPill';
import { useToast } from '../components/Toast';
import {
  addCommercialFileNote,
  agreeQuickLead,
  allocateStock,
  approveRepeat,
  createRepeat,
  getCommercialFile,
  setQuickLead,
  setStockFabric,
} from '../mock/api';
import { flagLabels, missingParties } from '../mock/commercialFile';
import type { CommercialFileDetail } from '../mock/types';

const inputCls =
  'w-full px-3 py-2 bg-input border border-input-border rounded-lg text-sm text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500';
const labelCls = 'block text-xs font-medium text-muted mb-1';

function partyLabel(party: string): string {
  return party.charAt(0).toUpperCase() + party.slice(1);
}

export default function VersionCommercialFilePage() {
  const { designCode = '', versionId = '' } = useParams<{ designCode: string; versionId: string }>();
  const { addToast } = useToast();
  const [file, setFile] = useState<CommercialFileDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'purchase_orders'>('overview');

  const [showStockForm, setShowStockForm] = useState(false);
  const [stockForm, setStockForm] = useState({ description: '', totalMeters: '' });
  const [showAllocate, setShowAllocate] = useState(false);
  const [allocateForm, setAllocateForm] = useState({ allocatedTo: '', meters: '', notes: '' });
  const [showNote, setShowNote] = useState(false);
  const [noteForm, setNoteForm] = useState({ action: 'Update', note: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const next = await getCommercialFile(designCode, versionId);
    setFile(next ?? null);
    setLoading(false);
  }, [designCode, versionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const fail = () => addToast('Failed to update the commercial file', 'error');

  const handleQuickLead = async (value: boolean) => {
    if (await setQuickLead(designCode, versionId, value)) {
      addToast(value ? 'Marked as quick lead' : 'Quick lead removed');
      await load();
    } else {
      fail();
    }
  };

  const handleAgree = async (party: string) => {
    if (await agreeQuickLead(designCode, versionId, party)) {
      addToast(`${partyLabel(party)} agreed`);
      await load();
    } else {
      fail();
    }
  };

  const handleCreateRepeat = async () => {
    if (await createRepeat(designCode, versionId)) {
      addToast('Repeat order created');
      await load();
    } else {
      fail();
    }
  };

  const handleApproveRepeat = async (party: string) => {
    if (await approveRepeat(designCode, versionId, party)) {
      addToast(`${partyLabel(party)} confirmed`);
      await load();
    } else {
      fail();
    }
  };

  const handleMarkStock = async (e: FormEvent) => {
    e.preventDefault();
    if (
      await setStockFabric(designCode, versionId, {
        description: stockForm.description.trim(),
        total_meters: Number(stockForm.totalMeters || 0),
      })
    ) {
      addToast('Marked as stock fabric');
      setShowStockForm(false);
      setStockForm({ description: '', totalMeters: '' });
      await load();
    } else {
      fail();
    }
  };

  const handleAllocate = async (e: FormEvent) => {
    e.preventDefault();
    if (
      await allocateStock(designCode, versionId, {
        allocated_to: allocateForm.allocatedTo.trim(),
        meters: Number(allocateForm.meters || 0),
        notes: allocateForm.notes.trim(),
      })
    ) {
      addToast('Stock allocated');
      setShowAllocate(false);
      setAllocateForm({ allocatedTo: '', meters: '', notes: '' });
      await load();
    } else {
      fail();
    }
  };

  const handleAddNote = async (e: FormEvent) => {
    e.preventDefault();
    if (
      await addCommercialFileNote(designCode, versionId, {
        author: 'F. Rahman',
        action: noteForm.action.trim() || 'Update',
        note: noteForm.note.trim(),
        milestone_date: '2026-09-18',
      })
    ) {
      addToast('Update added');
      setShowNote(false);
      setNoteForm({ action: 'Update', note: '' });
      await load();
    } else {
      fail();
    }
  };

  if (loading && !file) {
    return (
      <div data-testid="page-container" className="w-full p-4 sm:p-6">
        <p className="text-sm text-muted">Loading commercial file…</p>
      </div>
    );
  }

  if (!file) {
    return (
      <div data-testid="page-container" className="w-full p-4 sm:p-6">
        <p className="text-sm text-muted">Commercial file not found.</p>
        <Link to={`/designs/${designCode}`} className="mt-2 inline-block text-sm text-emerald-600">
          ← Back to design
        </Link>
      </div>
    );
  }

  const flags = flagLabels({
    is_quick_lead: file.is_quick_lead,
    is_repeat: file.is_repeat,
    stock_fabric: file.is_stock_fabric,
  });
  const missingAgreements = missingParties(file.quick_lead_agreed_by);
  const missingApprovals = missingParties(file.repeat_approved_by);

  return (
    <div data-testid="page-container" className="w-full p-4 sm:p-6">
      <Link to={`/designs/${file.design_code}`} className="text-sm text-muted hover:text-heading">
        ← Back to design
      </Link>

      <div className="mt-3 flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold text-heading">Commercial File {file.fn_number}</h1>
            <StatusPill value={file.status} />
            {file.is_current && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-600">
                Current
              </span>
            )}
            {flags.map((flag) => (
              <span
                key={flag}
                className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-300/15 text-blue-600"
              >
                {flag}
              </span>
            ))}
          </div>
          <p className="text-sm text-muted mt-1">
            Design {file.design_code} · {file.buyer} · {file.factory} · {file.version_number}
          </p>
        </div>
        <Link
          to={`/designs/${file.design_code}`}
          className="px-3 py-1.5 text-sm font-medium rounded-lg border border-input-border bg-surface text-heading hover:bg-surface-alt"
        >
          Open design
        </Link>
      </div>

      <div className="mt-5 flex gap-1 border-b border-border" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'overview'}
          onClick={() => setTab('overview')}
          className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'overview' ? 'border-emerald-500 text-heading' : 'border-transparent text-muted hover:text-heading'
          }`}
        >
          Overview
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'purchase_orders'}
          onClick={() => setTab('purchase_orders')}
          className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'purchase_orders'
              ? 'border-emerald-500 text-heading'
              : 'border-transparent text-muted hover:text-heading'
          }`}
        >
          Purchase Orders ({file.po_count})
        </button>
      </div>

      {tab === 'overview' ? (
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <section className="bg-surface rounded-xl border border-border p-4">
            <h3 className="text-sm font-medium text-heading mb-3">Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">File Number</dt>
                <dd className="font-mono text-heading">{file.fn_number}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Design</dt>
                <dd className="text-heading">{file.design_code}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Buyer</dt>
                <dd className="text-heading">{file.buyer}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Factory</dt>
                <dd className="text-heading">{file.factory}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Version</dt>
                <dd className="text-heading">{file.version_number}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">File Date</dt>
                <dd className="text-heading">{file.open_date || '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Approved</dt>
                <dd className="text-heading">{file.approved_date || '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Quantity</dt>
                <dd className="text-heading">{file.quantity}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Unit Price</dt>
                <dd className="text-heading">${file.unit_price}</dd>
              </div>
              {file.revision_notes && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Revision Notes</dt>
                  <dd className="text-heading text-right">{file.revision_notes}</dd>
                </div>
              )}
            </dl>
          </section>

          <section className="bg-surface rounded-xl border border-border p-4">
            <h3 className="text-sm font-medium text-heading mb-3">Quick Stats</h3>
            <div className="bg-input rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{file.po_count}</p>
              <p className="text-xs text-muted mt-1">Purchase Orders</p>
            </div>
          </section>

          <section
            data-testid="quick-lead-panel"
            className={`md:col-span-2 rounded-xl border p-4 ${file.is_quick_lead ? 'bg-amber-400/5 border-amber-400/40' : 'bg-surface border-border'}`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-heading">Quick Lead Time</h3>
              {file.is_quick_lead ? (
                <button
                  type="button"
                  onClick={() => void handleQuickLead(false)}
                  className="px-3 py-1.5 text-sm rounded-lg border border-input-border text-body hover:text-heading"
                >
                  Unmark
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleQuickLead(true)}
                  className="px-3 py-1.5 text-sm rounded-lg border border-amber-400/40 text-amber-600 hover:bg-amber-400/10"
                >
                  Mark as Quick Lead
                </button>
              )}
            </div>
            {file.is_quick_lead ? (
              <>
                <p className="text-sm text-body mb-3">
                  All parties must agree on deadlines and ways of working before a quick lead order goes
                  through.
                </p>
                {missingAgreements.length === 0 ? (
                  <p className="text-sm text-emerald-600">Agreement complete — all parties have agreed.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {missingAgreements.map((party) => (
                      <div
                        key={party}
                        className="flex items-center justify-between px-3 py-2 bg-input rounded-lg"
                      >
                        <span className="text-sm text-heading">{partyLabel(party)}</span>
                        <button
                          type="button"
                          onClick={() => void handleAgree(party)}
                          className="text-xs px-2 py-1 rounded bg-amber-400/20 text-amber-600 hover:bg-amber-400/30"
                        >
                          Agree
                        </button>
                      </div>
                    ))}
                    <p className="sm:col-span-2 text-xs text-muted">
                      Agreed: {4 - missingAgreements.length}/4 parties
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-body">
                Flag this order as quick lead when the buyer needs it inside the standard lead time.
              </p>
            )}
          </section>

          <section
            data-testid="repeat-panel"
            className={`md:col-span-2 rounded-xl border p-4 ${file.is_repeat ? 'bg-purple-400/5 border-purple-400/40' : 'bg-surface border-border'}`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-heading">Repeats</h3>
              {!file.is_repeat && (
                <button
                  type="button"
                  onClick={() => void handleCreateRepeat()}
                  className="px-3 py-1.5 text-sm rounded-lg border border-purple-400/40 text-purple-600 hover:bg-purple-400/10"
                >
                  Create Repeat Order
                </button>
              )}
            </div>
            {file.is_repeat ? (
              <>
                <p className="text-sm text-body mb-3">
                  {file.original_fn ? (
                    <>
                      Repeat of <span className="font-mono">{file.original_fn}</span> — each department must
                      confirm this is a direct repeat.
                    </>
                  ) : (
                    'Each department must confirm this is a direct repeat.'
                  )}
                </p>
                {missingApprovals.length === 0 ? (
                  <p className="text-sm text-emerald-600">Repeat confirmed — all departments have approved.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {missingApprovals.map((party) => (
                      <div
                        key={party}
                        className="flex items-center justify-between px-3 py-2 bg-input rounded-lg"
                      >
                        <span className="text-sm text-heading">{partyLabel(party)}</span>
                        <button
                          type="button"
                          onClick={() => void handleApproveRepeat(party)}
                          className="text-xs px-2 py-1 rounded bg-purple-400/20 text-purple-600 hover:bg-purple-400/30"
                        >
                          Confirm Repeat
                        </button>
                      </div>
                    ))}
                    <p className="sm:col-span-2 text-xs text-muted">
                      Approved: {4 - missingApprovals.length}/4 departments
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-body">
                Raise a repeat when the buyer re-orders the same style. All departments confirm it is a direct
                repeat.
              </p>
            )}
          </section>

          <section
            data-testid="stock-panel"
            className={`md:col-span-2 rounded-xl border p-4 ${file.is_stock_fabric ? 'bg-sky-500/5 border-sky-400/40' : 'bg-surface border-border'}`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-heading">Stock Fabric</h3>
              {!file.is_stock_fabric && (
                <button
                  type="button"
                  onClick={() => setShowStockForm(true)}
                  className="px-3 py-1.5 text-sm rounded-lg border border-sky-400/40 text-sky-600 hover:bg-sky-400/10"
                >
                  Mark as Stock Fabric
                </button>
              )}
            </div>
            {file.is_stock_fabric ? (
              <>
                <p className="text-sm text-body mb-3">
                  {file.stock_description ? file.stock_description : 'Stock fabric'} held against this file.
                </p>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="bg-input rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-heading">{file.total_meters}</p>
                    <p className="text-xs text-muted mt-1">Total meters</p>
                  </div>
                  <div className="bg-input rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-sky-600">{file.allocated_meters}</p>
                    <p className="text-xs text-muted mt-1">Allocated</p>
                  </div>
                  <div className="bg-input rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-emerald-600">{file.balance_meters}</p>
                    <p className="text-xs text-muted mt-1">Balance</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-heading">Allocations</h4>
                  <button
                    type="button"
                    onClick={() => setShowAllocate(true)}
                    className="text-xs px-2 py-1 rounded bg-sky-400/20 text-sky-600 hover:bg-sky-400/30"
                  >
                    Allocate Meters
                  </button>
                </div>
                {file.allocations.length === 0 ? (
                  <p className="text-sm text-muted">No meters allocated yet.</p>
                ) : (
                  <div className="space-y-2">
                    {file.allocations.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between px-3 py-2 bg-input rounded-lg"
                      >
                        <div>
                          <span className="text-sm text-heading">{a.allocated_to || '—'}</span>
                          {a.notes && <span className="ml-2 text-xs text-muted">{a.notes}</span>}
                        </div>
                        <span className="text-sm font-medium text-sky-600">{a.meters}m</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-body">
                Move fabric held in stock to this file with a description and swatch; meters can then be
                allocated, always showing the remaining balance.
              </p>
            )}
          </section>

          <section className="md:col-span-2 bg-surface rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-heading">Notes</h3>
              <button
                type="button"
                onClick={() => setShowNote(true)}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-input-border bg-surface text-heading hover:bg-surface-alt"
              >
                + Add Update
              </button>
            </div>
            {file.notes.length === 0 ? (
              <p className="text-sm text-muted">No updates yet.</p>
            ) : (
              <ul className="space-y-2">
                {file.notes.map((n) => (
                  <li key={n.id} className="text-sm">
                    <span className="text-muted">
                      {n.milestone_date} · {n.author} ·{' '}
                    </span>
                    <span className="font-medium text-heading">{n.action}</span>
                    <span className="text-body"> — {n.note}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : (
        <div className="mt-5">
          {file.pos.length === 0 ? (
            <p className="text-sm text-muted py-8 text-center">No purchase orders under this file yet.</p>
          ) : (
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted border-b border-border/60">
                    <th className="px-3 py-2.5 font-medium">PO Number</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-3 py-2.5 font-medium">Factory</th>
                    <th className="px-3 py-2.5 font-medium">Delivery</th>
                    <th className="px-3 py-2.5 font-medium text-right">Qty</th>
                    <th className="px-3 py-2.5 font-medium text-right">Value</th>
                    <th className="px-3 py-2.5 font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {file.pos.map((po) => (
                    <tr key={po.id} className="border-b border-border/40">
                      <td className="px-3 py-2 font-mono text-xs text-heading">{po.po_number}</td>
                      <td className="px-3 py-2">
                        <StatusPill value={po.status} />
                      </td>
                      <td className="px-3 py-2 text-body">{po.factory}</td>
                      <td className="px-3 py-2 text-body">{po.delivery_date}</td>
                      <td className="px-3 py-2 text-right text-body">{po.quantity}</td>
                      <td className="px-3 py-2 text-right text-body">${po.total_value}</td>
                      <td className="px-3 py-2 text-right">
                        <Link to={`/purchase-orders/${po.po_number}`} className="text-emerald-600 hover:underline">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showStockForm && (
        <Modal
          open
          onClose={() => setShowStockForm(false)}
          title="Mark as Stock Fabric"
          footer={
            <>
              <button
                type="button"
                onClick={() => setShowStockForm(false)}
                className="px-3 py-1.5 text-sm text-body border border-input-border rounded-lg hover:text-heading"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="stock-form"
                disabled={!stockForm.totalMeters}
                className="px-3 py-1.5 text-sm text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-50 rounded-lg"
              >
                Mark as Stock
              </button>
            </>
          }
        >
          <form id="stock-form" onSubmit={(e) => void handleMarkStock(e)} className="space-y-4">
            <div>
              <label htmlFor="stock-description" className={labelCls}>
                Description
              </label>
              <input
                id="stock-description"
                value={stockForm.description}
                onChange={(e) => setStockForm({ ...stockForm, description: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="stock-meters" className={labelCls}>
                Total Meters *
              </label>
              <input
                id="stock-meters"
                type="number"
                step="0.01"
                required
                value={stockForm.totalMeters}
                onChange={(e) => setStockForm({ ...stockForm, totalMeters: e.target.value })}
                className={inputCls}
                placeholder="0.00"
              />
            </div>
          </form>
        </Modal>
      )}

      {showAllocate && (
        <Modal
          open
          onClose={() => setShowAllocate(false)}
          title="Allocate Stock Meters"
          footer={
            <>
              <button
                type="button"
                onClick={() => setShowAllocate(false)}
                className="px-3 py-1.5 text-sm text-body border border-input-border rounded-lg hover:text-heading"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="allocate-form"
                disabled={!allocateForm.allocatedTo || !allocateForm.meters}
                className="px-3 py-1.5 text-sm text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-50 rounded-lg"
              >
                Allocate
              </button>
            </>
          }
        >
          <form id="allocate-form" onSubmit={(e) => void handleAllocate(e)} className="space-y-4">
            <div>
              <label htmlFor="allocate-to" className={labelCls}>
                Destination File Opening *
              </label>
              <input
                id="allocate-to"
                required
                value={allocateForm.allocatedTo}
                onChange={(e) => setAllocateForm({ ...allocateForm, allocatedTo: e.target.value })}
                className={inputCls}
                placeholder="File number or PO"
              />
            </div>
            <div>
              <label htmlFor="allocate-meters" className={labelCls}>
                Meters *
              </label>
              <input
                id="allocate-meters"
                type="number"
                step="0.01"
                required
                value={allocateForm.meters}
                onChange={(e) => setAllocateForm({ ...allocateForm, meters: e.target.value })}
                className={inputCls}
                placeholder="0.00"
              />
            </div>
            <div>
              <label htmlFor="allocate-notes" className={labelCls}>
                Notes
              </label>
              <input
                id="allocate-notes"
                value={allocateForm.notes}
                onChange={(e) => setAllocateForm({ ...allocateForm, notes: e.target.value })}
                className={inputCls}
                placeholder="Optional"
              />
            </div>
          </form>
        </Modal>
      )}

      {showNote && (
        <Modal
          open
          onClose={() => setShowNote(false)}
          title="Add Update"
          footer={
            <>
              <button
                type="button"
                onClick={() => setShowNote(false)}
                className="px-3 py-1.5 text-sm text-body border border-input-border rounded-lg hover:text-heading"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="note-form"
                disabled={!noteForm.note.trim()}
                className="px-3 py-1.5 text-sm text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg"
              >
                Add Update
              </button>
            </>
          }
        >
          <form id="note-form" onSubmit={(e) => void handleAddNote(e)} className="space-y-4">
            <div>
              <label htmlFor="note-action" className={labelCls}>
                Action
              </label>
              <input
                id="note-action"
                value={noteForm.action}
                onChange={(e) => setNoteForm({ ...noteForm, action: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="note-text" className={labelCls}>
                Note *
              </label>
              <textarea
                id="note-text"
                required
                rows={3}
                value={noteForm.note}
                onChange={(e) => setNoteForm({ ...noteForm, note: e.target.value })}
                className={inputCls}
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
