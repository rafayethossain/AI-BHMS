import { useState } from 'react';
import type { DesignJobRequest } from '../api/client';

export type JobRequestFormData = {
  job_type: string;
  required_by: string;
  work_location: string;
  no_of_garments: number | null;
  allocated_to: string | null;
  notes: string;
} & Record<string, unknown>;

export interface UserOption {
  id: string;
  name: string;
}

const JOB_TYPE_LABELS: Record<string, string> = {
  new_pattern: 'New Pattern',
  tech_sample: 'Technical Sample',
  fit_sample: 'Fit Sample',
  mini_marker: 'Mini Marker',
  '3d': '3D Sample',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
};

interface DesignSheetJobRequestsProps {
  jobRequests: DesignJobRequest[];
  users: UserOption[];
  onCreateJobRequest?: (data: JobRequestFormData) => void;
  onAllocateUser?: (jobId: string, userId: string) => void;
}

export default function DesignSheetJobRequests({
  jobRequests,
  users,
  onCreateJobRequest,
  onAllocateUser,
}: DesignSheetJobRequestsProps) {
  const [showForm, setShowForm] = useState(false);
  const [jobType, setJobType] = useState('new_pattern');
  const [requiredBy, setRequiredBy] = useState('');
  const [workLocation, setWorkLocation] = useState('');
  const [garments, setGarments] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [notes, setNotes] = useState('');

  const submit = () => {
    onCreateJobRequest?.({
      job_type: jobType,
      required_by: requiredBy,
      work_location: workLocation,
      no_of_garments: garments === '' ? null : Number(garments),
      allocated_to: assignedTo === '' ? null : assignedTo,
      notes,
    });
    setJobType('new_pattern');
    setRequiredBy('');
    setWorkLocation('');
    setGarments('');
    setAssignedTo('');
    setNotes('');
    setShowForm(false);
  };

  return (
    <section className="bg-surface rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold">Job Requests</h2>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="px-3 py-1.5 rounded-lg bg-heading text-background text-sm font-medium hover:opacity-90"
        >
          {showForm ? 'Cancel' : '+ New Job Request'}
        </button>
      </div>

      {jobRequests.length === 0 ? (
        <p className="text-muted text-sm">No job requests yet.</p>
      ) : (
        <div className="space-y-2">
          {jobRequests.map((jr) => (
            <div key={jr.id} className="flex flex-wrap items-center gap-3 text-sm border border-border rounded-lg p-3">
              <span className="text-heading font-medium">{JOB_TYPE_LABELS[jr.job_type] ?? jr.job_type}</span>
              <span className="text-muted">{jr.required_by}</span>
              <span className="text-muted">{jr.work_location}</span>
              <span className="text-muted">{jr.no_of_garments}</span>
              {jr.allocated_to_name && <span className="text-badge-emerald">{jr.allocated_to_name}</span>}
              <span
                className={`px-2 py-0.5 rounded-full text-xs badge badge--${jr.status} ${
                  jr.status === 'in_progress'
                    ? 'bg-blue-500/20 text-blue-400'
                    : jr.status === 'completed'
                      ? 'bg-emerald-500/20 text-badge-emerald'
                      : 'bg-surface-alt text-muted'
                }`}
              >
                {STATUS_LABELS[jr.status] ?? jr.status}
              </span>
              <select
                aria-label={`Allocate user for ${JOB_TYPE_LABELS[jr.job_type] ?? jr.job_type}`}
                value={jr.allocated_to ?? ''}
                onChange={(e) => {
                  if (e.target.value !== '') onAllocateUser?.(jr.id, e.target.value);
                }}
                className="ml-auto rounded-md border border-border bg-input px-2 py-1 text-xs text-heading focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">Allocate to...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="mt-4 space-y-3 rounded-lg border border-border p-4">
          <label className="block text-sm">
            Job Type
            <select
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-input px-3 py-1.5 text-sm text-heading focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {Object.entries(JOB_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Required By
            <input
              type="date"
              value={requiredBy}
              onChange={(e) => setRequiredBy(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-input px-3 py-1.5 text-sm text-heading focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              Work Location
              <input
                type="text"
                value={workLocation}
                onChange={(e) => setWorkLocation(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-input px-3 py-1.5 text-sm text-heading focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </label>
            <label className="block text-sm">
              No. of Garments
              <input
                type="number"
                min="1"
                value={garments}
                onChange={(e) => setGarments(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-input px-3 py-1.5 text-sm text-heading focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </label>
          </div>
          <label className="block text-sm">
            Assign To
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-input px-3 py-1.5 text-sm text-heading focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Notes
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-border bg-input px-3 py-1.5 text-sm text-heading focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </label>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={submit}
              className="px-3 py-1.5 rounded-lg bg-heading text-background text-sm font-medium hover:opacity-90"
            >
              Create Job
            </button>
          </div>
        </div>
      )}
    </section>
  );
}