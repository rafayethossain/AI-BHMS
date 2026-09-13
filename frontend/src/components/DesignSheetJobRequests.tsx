import { useRef, useState } from 'react';
import SpreadsheetGrid from './SpreadsheetGrid';
import type { SpreadsheetColumn, SpreadsheetGridHandle, SpreadsheetMenuItem } from './SpreadsheetGrid';
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

type JobRequestRow = {
  id: string;
  job_type_label: string;
  required_by: string;
  work_location: string;
  no_of_garments: number | null;
  allocated_to_name: string;
  status_label: string;
  notes: string;
};

function buildJobRequestColumns(users: UserOption[]): SpreadsheetColumn[] {
  const allocateValues = Object.fromEntries([
    ['', 'Unassigned'],
    ...users.map((u) => [u.name, u.name]),
  ]);
  const jobTypeValues = Object.fromEntries(Object.entries(JOB_TYPE_LABELS).map(([, label]) => [label, label]));
  const statusValues = Object.fromEntries(Object.entries(STATUS_LABELS).map(([, label]) => [label, label]));
  return [
    {
      title: 'Job Type', field: 'job_type_label', width: 170, editor: 'select',
      editorParams: { values: jobTypeValues },
      headerFilter: true, headerFilterType: 'list',
    },
    {
      title: 'Required By', field: 'required_by', width: 130, editor: 'input',
      headerFilter: true, headerFilterType: 'input',
    },
    {
      title: 'Work Location', field: 'work_location', width: 170, editor: 'input',
      headerFilter: true, headerFilterType: 'input',
    },
    {
      title: 'No. of Garments', field: 'no_of_garments', width: 110, hozAlign: 'right',
      editor: 'number', bottomCalc: 'sum', headerFilter: true, headerFilterType: 'input',
    },
    {
      title: 'Allocated To', field: 'allocated_to_name', width: 170, editor: 'select',
      editorParams: { values: allocateValues },
      headerFilter: true, headerFilterType: 'list',
    },
    {
      title: 'Status', field: 'status_label', width: 130, editor: 'select',
      editorParams: { values: statusValues },
      headerFilter: true, headerFilterType: 'list',
    },
    {
      title: 'Notes', field: 'notes', width: 220, editor: 'input',
      headerFilter: true, headerFilterType: 'input',
    },
  ];
}

function toJobRequestRow(jr: DesignJobRequest): JobRequestRow {
  return {
    id: jr.id,
    job_type_label: JOB_TYPE_LABELS[jr.job_type] ?? jr.job_type,
    required_by: jr.required_by ?? '',
    work_location: jr.work_location,
    no_of_garments: jr.no_of_garments,
    allocated_to_name: jr.allocated_to_name ?? '',
    status_label: STATUS_LABELS[jr.status] ?? jr.status,
    notes: jr.notes,
  };
}

interface DesignSheetJobRequestsProps {
  jobRequests: DesignJobRequest[];
  users: UserOption[];
  onCreateJobRequest?: (data: JobRequestFormData) => void;
  onUpdateJobRequest?: (id: string, data: Record<string, unknown>) => void;
  onDeleteJobRequest?: (id: string) => void;
  loading?: boolean;
}

function buildJobRequestRowContextMenu(row: JobRequestRow, onDelete: (id: string) => void): SpreadsheetMenuItem[] {
  return [
    { label: 'Add New Job Request', action: undefined },
    { label: 'Delete Job Request', action: () => onDelete(row.id) },
  ];
}

function buildJobRequestHeaderMenu(column: unknown): SpreadsheetMenuItem[] {
  const col = column as
    | {
        hide?: () => void;
        getTable?: () => {
          getColumns?: () => { getTitle?: () => string; toggle?: () => void; show?: () => void }[];
        };
      }
    | undefined;
  const columns = col?.getTable?.().getColumns?.() ?? [];
  return [
    { label: 'Hide Column', action: () => col?.hide?.() },
    ...columns.map(
      (c): SpreadsheetMenuItem => ({
        label: `Toggle ${c.getTitle?.() ?? 'Column'}`,
        action: () => c.toggle?.(),
      }),
    ),
    {
      label: 'Show All Columns',
      action: () => columns.forEach((c) => c.show?.()),
    },
  ];
}

export default function DesignSheetJobRequests({
  jobRequests,
  users,
  onCreateJobRequest,
  onUpdateJobRequest,
  onDeleteJobRequest,
  loading = false,
}: DesignSheetJobRequestsProps) {
  const gridRef = useRef<SpreadsheetGridHandle>(null);
  const [showForm, setShowForm] = useState(false);
  const [jobType, setJobType] = useState('new_pattern');
  const [requiredBy, setRequiredBy] = useState('');
  const [workLocation, setWorkLocation] = useState('');
  const [garments, setGarments] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [notes, setNotes] = useState('');

  const rows = jobRequests.map(toJobRequestRow);

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

  const handleCellEdited = (field: string, value: unknown, row: Record<string, unknown>) => {
    const id = typeof row.id === 'string' ? row.id : null;
    if (!id) return;
    if (field === 'allocated_to_name') {
      const userId = users.find((u) => u.name === value)?.id ?? null;
      onUpdateJobRequest?.(id, { allocated_to: userId });
      return;
    }
    if (field === 'job_type_label') {
      const jobKey =
        Object.keys(JOB_TYPE_LABELS).find((k) => JOB_TYPE_LABELS[k] === value) ?? String(value ?? '');
      onUpdateJobRequest?.(id, { job_type: jobKey });
      return;
    }
    if (field === 'status_label') {
      const statusKey =
        Object.keys(STATUS_LABELS).find((k) => STATUS_LABELS[k] === value) ?? String(value ?? '');
      onUpdateJobRequest?.(id, { status: statusKey });
      return;
    }
    onUpdateJobRequest?.(id, { [field]: value });
  };

  return (
    <section data-testid="job-requests-section" className="bg-surface rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold">Job Requests</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => gridRef.current?.undo()}
            className="px-3 py-1.5 rounded-lg bg-surface-alt text-heading text-sm font-medium border border-border hover:border-emerald-500/40"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => gridRef.current?.redo()}
            className="px-3 py-1.5 rounded-lg bg-surface-alt text-heading text-sm font-medium border border-border hover:border-emerald-500/40"
          >
            Redo
          </button>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="px-3 py-1.5 rounded-lg bg-btn-primary text-white text-sm font-medium hover:opacity-90"
          >
            {showForm ? 'Cancel' : '+ New Job Request'}
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted text-sm">No job requests yet.</p>
      ) : (
        <SpreadsheetGrid
          data={rows}
          columns={buildJobRequestColumns(users)}
          gridRef={gridRef}
          toolbar
          title="Job Requests"
          exportable
          onExport={() => gridRef.current?.downloadXlsx('job-requests.xlsx')}
          printable
          printTitle="Job Requests"
          columnChooser
          paginationSize={20}
          history
          loading={loading}
          actionColumn
          onDelete={(row) => {
            const id = typeof row.id === 'string' ? row.id : null;
            if (id) onDeleteJobRequest?.(id);
          }}
          onCellEdited={handleCellEdited}
          rowContextMenu={(row) => buildJobRequestRowContextMenu(row as JobRequestRow, (id) => onDeleteJobRequest?.(id))}
          headerMenu={(column) => buildJobRequestHeaderMenu(column)}
        />
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
              className="px-3 py-1.5 rounded-lg bg-btn-primary text-white text-sm font-medium hover:opacity-90"
            >
              Create Job
            </button>
          </div>
        </div>
      )}
    </section>
  );
}