import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import StatusPill from '../components/StatusPill';
import {
  addFitSpec,
  deleteFitSpec,
  getDesignByCode,
  getDesignFitSpecs,
  getDesignVersions,
  setCurrentFitSpec,
  updateFitSpec,
} from '../mock/api';
import type { DesignRegisterRow, DesignVersion, FitSpec, FitStage } from '../mock/types';

const FIT_STAGE_OPTIONS: { value: FitStage; label: string }[] = [
  { value: 'dev', label: 'Dev Spec' },
  { value: '1st', label: '1st Fit' },
  { value: '2nd', label: '2nd Fit' },
  { value: '3rd', label: '3rd Fit' },
  { value: 'pp', label: 'Pre-Production' },
];

function stageLabel(value: string): string {
  return FIT_STAGE_OPTIONS.find((s) => s.value === value)?.label ?? value;
}

const inputCls =
  'w-full px-3 py-2 bg-input border border-input-border rounded-lg text-sm text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60';

const thCls = 'px-3 py-2.5 text-xs font-medium text-muted whitespace-nowrap text-left border-b border-border/60';

const actionBtnCls = 'px-2 py-1 text-xs hover:bg-surface-alt rounded transition-colors';

export default function DesignFitSpecsPage() {
  const { designCode } = useParams<{ designCode: string }>();
  const { addToast } = useToast();
  const [design, setDesign] = useState<DesignRegisterRow | null>(null);
  const [versions, setVersions] = useState<DesignVersion[]>([]);
  const [specs, setSpecs] = useState<FitSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState<'add' | 'edit' | null>(null);
  const [editing, setEditing] = useState<FitSpec | null>(null);
  const [viewing, setViewing] = useState<FitSpec | null>(null);
  const [deleting, setDeleting] = useState<FitSpec | null>(null);

  useEffect(() => {
    if (!designCode) return;
    let cancelled = false;
    (async () => {
      const [d, vs, fs] = await Promise.all([
        getDesignByCode(designCode),
        getDesignVersions(designCode),
        getDesignFitSpecs(designCode),
      ]);
      if (!cancelled) {
        setDesign(d ?? null);
        setVersions(vs);
        setSpecs(fs);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [designCode]);

  const refresh = async () => {
    if (!designCode) return;
    setSpecs(await getDesignFitSpecs(designCode));
  };

  const handleAdd = async (input: Omit<FitSpec, 'id'>) => {
    if (!designCode) return;
    try {
      await addFitSpec(designCode, input);
      addToast('Fit spec added');
      setShowForm(null);
      await refresh();
    } catch {
      addToast('Failed to add fit spec', 'error');
    }
  };

  const handleEdit = async (input: Omit<FitSpec, 'id'>) => {
    if (!designCode || !editing) return;
    try {
      await updateFitSpec(designCode, editing.id, input);
      addToast('Fit spec updated');
      setShowForm(null);
      setEditing(null);
      await refresh();
    } catch {
      addToast('Failed to update fit spec', 'error');
    }
  };

  const handleDelete = async () => {
    if (!designCode || !deleting) return;
    try {
      await deleteFitSpec(designCode, deleting.id);
      addToast('Fit spec deleted');
      setDeleting(null);
      await refresh();
    } catch {
      addToast('Failed to delete fit spec', 'error');
    }
  };

  const handleSetCurrent = async (spec: FitSpec) => {
    if (!designCode) return;
    try {
      await setCurrentFitSpec(designCode, spec.id);
      addToast('Current fit spec updated');
      await refresh();
    } catch {
      addToast('Failed to set current fit spec', 'error');
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-muted text-sm">
        Loading fit specs…
      </div>
    );
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

  const current = specs.find((s) => s.is_selected);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
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
                {design.design_code} — Fit Specs
              </h1>
              <div className="flex items-center gap-3 text-xs text-muted mt-0.5">
                <span>{design.buyer}</span>
                <span className="text-border-subtle">·</span>
                <span>{design.style_type ?? design.category}</span>
                <span className="text-border-subtle">·</span>
                <span>{specs.length} spec{specs.length !== 1 ? 's' : ''}</span>
                <span className="text-border-subtle">·</span>
                <span>Current: {current?.fit_number ?? '—'}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setEditing(null); setShowForm('add'); }}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shrink-0"
          >
            + Add Fit Spec
          </button>
        </div>
      </div>

      {/* Fit specs table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {specs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted mb-3">No fit specs yet. Add the first fit spec for this design.</p>
            <button
              type="button"
              onClick={() => { setEditing(null); setShowForm('add'); }}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
            >
              + Add Fit Spec
            </button>
          </div>
        ) : (
          <div className="border border-input-border rounded-lg overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-surface-alt border-b border-border/60">
                  <th className={thCls}>Fit #</th>
                  <th className={thCls}>Stage</th>
                  <th className={thCls}>Version</th>
                  <th className={thCls}>Fit Date</th>
                  <th className={thCls}>Current</th>
                  <th className={thCls}>Description</th>
                  <th className={thCls}>Measurements</th>
                  <th className={thCls}>Notes</th>
                  <th className="w-56 px-3 py-2.5 text-xs font-medium text-muted text-right border-b border-border/60">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {specs.map((s) => (
                  <tr key={s.id} className="border-b border-border/40 hover:bg-surface-alt/30 transition-colors">
                    <td className="px-3 py-2 font-medium text-heading whitespace-nowrap">{s.fit_number}</td>
                    <td className="px-3 py-2 text-body whitespace-nowrap">{stageLabel(s.fit_stage)}</td>
                    <td className="px-3 py-2 text-body whitespace-nowrap">{s.version_number}</td>
                    <td className="px-3 py-2 text-body whitespace-nowrap tabular-nums">{s.fit_date || '—'}</td>
                    <td className="px-3 py-2">
                      {s.is_selected ? <StatusPill value="current" /> : <span className="text-muted">—</span>}
                    </td>
                    <td className="px-3 py-2 text-body">{s.description || '—'}</td>
                    <td className="px-3 py-2 text-body">{s.measurements || '—'}</td>
                    <td className="px-3 py-2 text-muted">{s.notes || '—'}</td>
                    <td className="px-3 py-2 text-right" aria-label="Row actions">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setViewing(s)}
                          className={`${actionBtnCls} text-blue-400 hover:text-blue-300`}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => { setEditing(s); setShowForm('edit'); }}
                          className={`${actionBtnCls} text-amber-400 hover:text-amber-300`}
                        >
                          Edit
                        </button>
                        {!s.is_selected && (
                          <button
                            type="button"
                            onClick={() => handleSetCurrent(s)}
                            className={`${actionBtnCls} text-emerald-400 hover:text-emerald-300`}
                          >
                            Set Current
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setDeleting(s)}
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

      {/* Add/Edit modal */}
      {showForm && (
        <FitSpecFormModal
          mode={showForm}
          initial={editing}
          versions={versions}
          defaultVersion={design.current_version}
          onClose={() => { setShowForm(null); setEditing(null); }}
          onSubmit={showForm === 'add' ? handleAdd : handleEdit}
        />
      )}

      {/* View modal */}
      {viewing && (
        <Modal
          open
          onClose={() => setViewing(null)}
          title="View Fit Spec"
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
              <h4 className="text-xs font-medium text-muted mb-3 uppercase tracking-wider">Fit Specification</h4>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted mb-0.5">Fit Number</dt>
                  <dd className="text-heading font-medium">{viewing.fit_number}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted mb-0.5">Stage</dt>
                  <dd className="text-body">{stageLabel(viewing.fit_stage)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted mb-0.5">Version</dt>
                  <dd className="text-body">{viewing.version_number}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted mb-0.5">Fit Date</dt>
                  <dd className="text-body tabular-nums">{viewing.fit_date || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted mb-0.5">Current</dt>
                  <dd>{viewing.is_selected ? <StatusPill value="current" /> : <span className="text-muted">—</span>}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-muted mb-0.5">Description</dt>
                  <dd className="text-body">{viewing.description || '—'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-muted mb-0.5">Measurements</dt>
                  <dd className="text-body">{viewing.measurements || '—'}</dd>
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

      {/* Delete confirmation modal */}
      {deleting && (
        <Modal
          open
          onClose={() => setDeleting(null)}
          title="Delete Fit Spec"
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
            Delete <span className="font-medium text-heading">{deleting.fit_number}</span> from this
            design? This cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
}

/* ---------- Add / Edit modal ---------- */

interface FitSpecFormModalProps {
  mode: 'add' | 'edit';
  initial?: FitSpec | null;
  versions: DesignVersion[];
  defaultVersion: string;
  onClose: () => void;
  onSubmit: (input: Omit<FitSpec, 'id'>) => void;
}

function FitSpecFormModal({
  mode,
  initial,
  versions,
  defaultVersion,
  onClose,
  onSubmit,
}: FitSpecFormModalProps) {
  const [fitNumber, setFitNumber] = useState(initial?.fit_number ?? '');
  const [stage, setStage] = useState<FitStage>(initial?.fit_stage ?? 'dev');
  const [version, setVersion] = useState(initial?.version_number ?? defaultVersion);
  const [fitDate, setFitDate] = useState(initial?.fit_date ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [measurements, setMeasurements] = useState(initial?.measurements ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const versionOptions = versions.length > 0 ? versions.map((v) => v.version_number) : [defaultVersion];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      fit_number: fitNumber.trim(),
      fit_stage: stage,
      version_number: version,
      fit_date: fitDate.trim(),
      description: description.trim(),
      measurements: measurements.trim(),
      notes: notes.trim(),
      is_selected: initial?.is_selected ?? false,
    });
  };

  const canSubmit = fitNumber.trim().length > 0;

  return (
    <Modal
      open
      onClose={onClose}
      title={mode === 'add' ? 'Add Fit Spec' : 'Edit Fit Spec'}
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
            form="fit-spec-form"
            disabled={!canSubmit}
            className="px-4 py-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg transition-colors"
          >
            {mode === 'add' ? 'Add Fit Spec' : 'Save Changes'}
          </button>
        </>
      }
    >
      <form id="fit-spec-form" onSubmit={handleSubmit} className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
        <div>
          <h4 className="text-xs font-medium text-muted mb-3 uppercase tracking-wider">Fit Specification</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="fit-number" className="block text-sm text-body mb-1">Fit Number *</label>
              <input
                id="fit-number"
                value={fitNumber}
                onChange={(e) => setFitNumber(e.target.value)}
                className={inputCls}
                required
              />
            </div>
            <div>
              <label htmlFor="fit-stage" className="block text-sm text-body mb-1">Stage</label>
              <select
                id="fit-stage"
                value={stage}
                onChange={(e) => setStage(e.target.value as FitStage)}
                className={inputCls}
              >
                {FIT_STAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="fit-version" className="block text-sm text-body mb-1">Version</label>
              <select
                id="fit-version"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className={inputCls}
              >
                {versionOptions.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="fit-date" className="block text-sm text-body mb-1">Fit Date</label>
              <input
                id="fit-date"
                type="date"
                value={fitDate}
                onChange={(e) => setFitDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="fit-description" className="block text-sm text-body mb-1">Description</label>
              <input
                id="fit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="fit-measurements" className="block text-sm text-body mb-1">Measurements</label>
              <textarea
                id="fit-measurements"
                value={measurements}
                onChange={(e) => setMeasurements(e.target.value)}
                placeholder="e.g. Chest 52, Waist 44"
                rows={2}
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="fit-notes" className="block text-sm text-body mb-1">Notes</label>
              <textarea
                id="fit-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className={inputCls}
              />
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
