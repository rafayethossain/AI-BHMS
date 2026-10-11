import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import StatusPill from '../components/StatusPill';
import {
  addJobRequest,
  deleteJobRequest,
  getDesignByCode,
  getDesignJobRequests,
  getDesignPOs,
  updateJobRequest,
} from '../mock/api';
import { DEMO_TODAY } from '../mock/detailSeed';
import { assigneeSeed } from '../mock/seed';
import type {
  DesignPO,
  DesignRegisterRow,
  JobPriority,
  JobRequest,
  JobStatus,
  JobType,
} from '../mock/types';

const JOB_TYPE_OPTIONS: { value: JobType; label: string }[] = [
  { value: 'pattern', label: 'Pattern' },
  { value: 'sample', label: 'Sample' },
  { value: '3d', label: '3D' },
  { value: 'mini_marker', label: 'Mini-Marker' },
];

const PRIORITY_OPTIONS: { value: JobPriority; label: string }[] = [
  { value: 1, label: 'Low' },
  { value: 2, label: 'Normal' },
  { value: 3, label: 'High' },
  { value: 4, label: 'Urgent' },
];

const STATUS_OPTIONS: { value: JobStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PRIORITY_TEXT: Record<JobPriority, string> = {
  1: 'text-muted',
  2: 'text-body',
  3: 'text-amber-400',
  4: 'text-red-400',
};

function typeLabel(value: string): string {
  return JOB_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function priorityLabel(value: number): string {
  return PRIORITY_OPTIONS.find((o) => o.value === value)?.label ?? String(value);
}

function isOverdue(job: JobRequest, today: string): boolean {
  return (
    (job.status === 'pending' || job.status === 'in_progress') &&
    job.required_by_date !== '' &&
    job.required_by_date < today
  );
}

const inputCls =
  'w-full px-3 py-2 bg-input border border-input-border rounded-lg text-sm text-heading focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60';

const thCls = 'px-3 py-2.5 text-xs font-medium text-muted whitespace-nowrap text-left border-b border-border/60';

const actionBtnCls = 'px-2 py-1 text-xs hover:bg-surface-alt rounded transition-colors';

export default function DesignJobsPage() {
  const { designCode } = useParams<{ designCode: string }>();
  const { addToast } = useToast();
  const [design, setDesign] = useState<DesignRegisterRow | null>(null);
  const [pos, setPos] = useState<DesignPO[]>([]);
  const [jobs, setJobs] = useState<JobRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState<'add' | 'edit' | null>(null);
  const [editing, setEditing] = useState<JobRequest | null>(null);
  const [viewing, setViewing] = useState<JobRequest | null>(null);
  const [deleting, setDeleting] = useState<JobRequest | null>(null);

  useEffect(() => {
    if (!designCode) return;
    let cancelled = false;
    (async () => {
      const [d, ps, js] = await Promise.all([
        getDesignByCode(designCode),
        getDesignPOs(designCode),
        getDesignJobRequests(designCode),
      ]);
      if (!cancelled) {
        setDesign(d ?? null);
        setPos(ps);
        setJobs(js);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [designCode]);

  const refresh = async () => {
    if (!designCode) return;
    setJobs(await getDesignJobRequests(designCode));
  };

  const handleAdd = async (input: Omit<JobRequest, 'id'>) => {
    if (!designCode) return;
    try {
      await addJobRequest(designCode, input);
      addToast('Job request added');
      setShowForm(null);
      await refresh();
    } catch {
      addToast('Failed to add job request', 'error');
    }
  };

  const handleEdit = async (input: Omit<JobRequest, 'id'>) => {
    if (!designCode || !editing) return;
    try {
      await updateJobRequest(designCode, editing.id, input);
      addToast('Job request updated');
      setShowForm(null);
      setEditing(null);
      await refresh();
    } catch {
      addToast('Failed to update job request', 'error');
    }
  };

  const handleDelete = async () => {
    if (!designCode || !deleting) return;
    try {
      await deleteJobRequest(designCode, deleting.id);
      addToast('Job request deleted');
      setDeleting(null);
      await refresh();
    } catch {
      addToast('Failed to delete job request', 'error');
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-muted text-sm">
        Loading job requests…
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

  const openCount = jobs.filter((j) => j.status === 'pending' || j.status === 'in_progress').length;

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
                {design.design_code} — Job Requests
              </h1>
              <div className="flex items-center gap-3 text-xs text-muted mt-0.5">
                <span>{design.buyer}</span>
                <span className="text-border-subtle">·</span>
                <span>{design.style_type ?? design.category}</span>
                <span className="text-border-subtle">·</span>
                <span>{jobs.length} job{jobs.length !== 1 ? 's' : ''}</span>
                <span className="text-border-subtle">·</span>
                <span>Open: {openCount}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setEditing(null); setShowForm('add'); }}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shrink-0"
          >
            + Add Job Request
          </button>
        </div>
      </div>

      {/* Job requests table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {jobs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted mb-3">No job requests yet. Add the first job request for this design.</p>
            <button
              type="button"
              onClick={() => { setEditing(null); setShowForm('add'); }}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
            >
              + Add Job Request
            </button>
          </div>
        ) : (
          <div className="border border-input-border rounded-lg overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-surface-alt border-b border-border/60">
                  <th className={thCls}>Job #</th>
                  <th className={thCls}>Type</th>
                  <th className={thCls}>PO #</th>
                  <th className={thCls}>Assigned</th>
                  <th className={thCls}>Due</th>
                  <th className={thCls}>Priority</th>
                  <th className={thCls}>Status</th>
                  <th className={thCls}>Description</th>
                  <th className="w-40 px-3 py-2.5 text-xs font-medium text-muted text-right border-b border-border/60">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => {
                  const overdue = isOverdue(job, DEMO_TODAY);
                  return (
                    <tr key={job.id} className="border-b border-border/40 hover:bg-surface-alt/30 transition-colors">
                      <td className="px-3 py-2 font-medium text-heading whitespace-nowrap">{job.job_number}</td>
                      <td className="px-3 py-2 text-body whitespace-nowrap">{typeLabel(job.job_type)}</td>
                      <td className="px-3 py-2 text-body whitespace-nowrap">{job.purchase_order || '—'}</td>
                      <td className="px-3 py-2 text-body whitespace-nowrap">
                        {job.assigned_to || <span className="text-muted">Unassigned</span>}
                      </td>
                      <td className="px-3 py-2 text-body whitespace-nowrap tabular-nums">
                        {job.required_by_date ? (
                          overdue ? (
                            <span className="text-red-400" data-overdue="true">{job.required_by_date}</span>
                          ) : (
                            <span>{job.required_by_date}</span>
                          )
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className={`px-3 py-2 whitespace-nowrap font-medium ${PRIORITY_TEXT[job.priority]}`}>
                        {priorityLabel(job.priority)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <StatusPill value={job.status} />
                      </td>
                      <td className="px-3 py-2 text-body">{job.description || '—'}</td>
                      <td className="px-3 py-2 text-right" aria-label="Row actions">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setViewing(job)}
                            className={`${actionBtnCls} text-blue-400 hover:text-blue-300`}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => { setEditing(job); setShowForm('edit'); }}
                            className={`${actionBtnCls} text-amber-400 hover:text-amber-300`}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleting(job)}
                            className={`${actionBtnCls} text-red-400 hover:text-red-300`}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit modal */}
      {showForm && (
        <JobRequestFormModal
          mode={showForm}
          initial={editing}
          poNumbers={pos.map((p) => p.po_number)}
          onClose={() => { setShowForm(null); setEditing(null); }}
          onSubmit={showForm === 'add' ? handleAdd : handleEdit}
        />
      )}

      {/* View modal */}
      {viewing && (
        <Modal
          open
          onClose={() => setViewing(null)}
          title="View Job Request"
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
              <h4 className="text-xs font-medium text-muted mb-3 uppercase tracking-wider">Job Request</h4>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted mb-0.5">Job Number</dt>
                  <dd className="text-heading font-medium">{viewing.job_number}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted mb-0.5">Type</dt>
                  <dd className="text-body">{typeLabel(viewing.job_type)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted mb-0.5">Priority</dt>
                  <dd className={`font-medium ${PRIORITY_TEXT[viewing.priority]}`}>{priorityLabel(viewing.priority)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted mb-0.5">Status</dt>
                  <dd><StatusPill value={viewing.status} /></dd>
                </div>
                <div>
                  <dt className="text-xs text-muted mb-0.5">Purchase Order</dt>
                  <dd className="text-body">{viewing.purchase_order || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted mb-0.5">Assigned To</dt>
                  <dd className="text-body">{viewing.assigned_to || 'Unassigned'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted mb-0.5">Work Location</dt>
                  <dd className="text-body">{viewing.work_location || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted mb-0.5">Required By</dt>
                  <dd className="text-body tabular-nums">{viewing.required_by_date || '—'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-muted mb-0.5">Description</dt>
                  <dd className="text-body">{viewing.description || '—'}</dd>
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
          title="Delete Job Request"
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
            Delete <span className="font-medium text-heading">{deleting.job_number}</span> from this
            design? This cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
}

/* ---------- Add / Edit modal ---------- */

interface JobRequestFormModalProps {
  mode: 'add' | 'edit';
  initial?: JobRequest | null;
  poNumbers: string[];
  onClose: () => void;
  onSubmit: (input: Omit<JobRequest, 'id'>) => void;
}

function JobRequestFormModal({ mode, initial, poNumbers, onClose, onSubmit }: JobRequestFormModalProps) {
  const [jobNumber, setJobNumber] = useState(initial?.job_number ?? '');
  const [type, setType] = useState<JobType>(initial?.job_type ?? 'pattern');
  const [priority, setPriority] = useState<JobPriority>(initial?.priority ?? 2);
  const [purchaseOrder, setPurchaseOrder] = useState(initial?.purchase_order ?? '');
  const [assignedTo, setAssignedTo] = useState(initial?.assigned_to ?? '');
  const [workLocation, setWorkLocation] = useState(initial?.work_location ?? '');
  const [requiredBy, setRequiredBy] = useState(initial?.required_by_date ?? '');
  const [status, setStatus] = useState<JobStatus>(initial?.status ?? 'pending');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      job_number: jobNumber.trim(),
      job_type: type,
      purchase_order: purchaseOrder,
      description: description.trim(),
      work_location: workLocation.trim(),
      assigned_to: assignedTo,
      required_by_date: requiredBy,
      priority,
      status,
      notes: notes.trim(),
    });
  };

  const canSubmit = jobNumber.trim().length > 0;

  return (
    <Modal
      open
      onClose={onClose}
      title={mode === 'add' ? 'Add Job Request' : 'Edit Job Request'}
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
            form="job-request-form"
            disabled={!canSubmit}
            className="px-4 py-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg transition-colors"
          >
            {mode === 'add' ? 'Add Job Request' : 'Save Changes'}
          </button>
        </>
      }
    >
      <form id="job-request-form" onSubmit={handleSubmit} className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
        <div>
          <h4 className="text-xs font-medium text-muted mb-3 uppercase tracking-wider">Job Information</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="job-number" className="block text-sm text-body mb-1">Job Number *</label>
              <input
                id="job-number"
                value={jobNumber}
                onChange={(e) => setJobNumber(e.target.value)}
                className={inputCls}
                required
              />
            </div>
            <div>
              <label htmlFor="job-type" className="block text-sm text-body mb-1">Type</label>
              <select
                id="job-type"
                value={type}
                onChange={(e) => setType(e.target.value as JobType)}
                className={inputCls}
              >
                {JOB_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="job-priority" className="block text-sm text-body mb-1">Priority</label>
              <select
                id="job-priority"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value) as JobPriority)}
                className={inputCls}
              >
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="job-po" className="block text-sm text-body mb-1">Purchase Order</label>
              <select
                id="job-po"
                value={purchaseOrder}
                onChange={(e) => setPurchaseOrder(e.target.value)}
                className={inputCls}
              >
                <option value="">None</option>
                {poNumbers.map((po) => (
                  <option key={po} value={po}>{po}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="job-assignee" className="block text-sm text-body mb-1">Assigned To</label>
              <select
                id="job-assignee"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className={inputCls}
              >
                <option value="">Unassigned</option>
                {assigneeSeed.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="job-location" className="block text-sm text-body mb-1">Work Location</label>
              <input
                id="job-location"
                value={workLocation}
                onChange={(e) => setWorkLocation(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="job-required-by" className="block text-sm text-body mb-1">Required By</label>
              <input
                id="job-required-by"
                type="date"
                value={requiredBy}
                onChange={(e) => setRequiredBy(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="job-status" className="block text-sm text-body mb-1">Status</label>
              <select
                id="job-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as JobStatus)}
                className={inputCls}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-medium text-muted mb-3 uppercase tracking-wider">Details</h4>
          <div className="space-y-4">
            <div>
              <label htmlFor="job-description" className="block text-sm text-body mb-1">Description</label>
              <textarea
                id="job-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="job-notes" className="block text-sm text-body mb-1">Notes</label>
              <textarea
                id="job-notes"
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
