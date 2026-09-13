import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const gridCapture = vi.hoisted(() => ({
  current: null as null | {
    data: Record<string, unknown>[];
    columns: {
      title: string;
      field: string;
      editor?: unknown;
      editorParams?: Record<string, unknown>;
      bottomCalc?: unknown;
      headerFilter?: boolean;
      headerFilterType?: string;
    }[];
    gridRef?: { current: null | { undo: () => void; redo: () => void; downloadXlsx: (fileName?: string) => void } };
    onCellEdited?: (field: string, value: unknown, row: Record<string, unknown>) => void;
    rowContextMenu?: (row: Record<string, unknown>) => { label: string; action?: () => void }[];
    toolbar?: boolean;
    title?: string;
    exportable?: boolean;
    onExport?: () => void;
    printable?: boolean;
    printTitle?: string;
    columnChooser?: boolean;
    paginationSize?: number;
    actionColumn?: boolean;
    onDelete?: (row: Record<string, unknown>) => void;
    loading?: boolean;
  },
}));

vi.mock('../SpreadsheetGrid', () => {
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => {
      gridCapture.current = props as typeof gridCapture.current;
      return <div data-testid="grid-mock" />;
    },
  };
});

import DesignSheetJobRequests from '../DesignSheetJobRequests';
import type { DesignJobRequest } from '../../api/client';

function job(overrides: Partial<DesignJobRequest>): DesignJobRequest {
  return {
    id: 'j1',
    design_sheet: 'ds-1',
    design_sheet_number: 'TP-1002',
    job_type: 'new_pattern',
    required_by: '2026-09-01',
    work_location: 'Cutting Section',
    no_of_garments: 120,
    allocated_to: null,
    allocated_to_name: null,
    notes: '',
    status: 'pending',
    created_at: '2026-08-10T10:00:00Z',
    ...overrides,
  };
}

const users = [
  { id: 'u1', name: 'Alice Rahman' },
  { id: 'u2', name: 'Bob Chowdhury' },
];

const jobs: DesignJobRequest[] = [
  job({ id: 'j1' }),
  job({
    id: 'j2',
    job_type: 'tech_sample',
    status: 'in_progress',
    allocated_to: 'u1',
    allocated_to_name: 'Alice Rahman',
    no_of_garments: 8,
    required_by: '2026-09-15',
    work_location: 'Quality Section',
  }),
];

describe('DesignSheetJobRequests grid', () => {
  beforeEach(() => {
    gridCapture.current = null;
    vi.clearAllMocks();
  });

  it('renders the section header with a New Job Request button and undo/redo', () => {
    render(<DesignSheetJobRequests jobRequests={jobs} users={users} />);
    expect(screen.getByText('Job Requests')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New Job Request/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeInTheDocument();
  });

  it('maps job requests to grid rows with friendly labels and allocate names', () => {
    render(<DesignSheetJobRequests jobRequests={jobs} users={users} />);
    expect(gridCapture.current?.data).toEqual([
      expect.objectContaining({
        id: 'j1',
        job_type_label: 'New Pattern',
        status_label: 'Pending',
        allocated_to_name: '',
        required_by: '2026-09-01',
        work_location: 'Cutting Section',
        no_of_garments: 120,
      }),
      expect.objectContaining({
        id: 'j2',
        job_type_label: 'Technical Sample',
        status_label: 'In Progress',
        allocated_to_name: 'Alice Rahman',
        no_of_garments: 8,
      }),
    ]);
  });

  it('builds columns with friendly select editors, a summed garments column and filters everywhere', () => {
    render(<DesignSheetJobRequests jobRequests={jobs} users={users} />);
    const titles = gridCapture.current?.columns.map((c) => c.title);
    expect(titles).toEqual([
      'Job Type',
      'Required By',
      'Work Location',
      'No. of Garments',
      'Allocated To',
      'Status',
      'Notes',
    ]);
    const allocate = gridCapture.current?.columns.find((c) => c.field === 'allocated_to_name');
    expect(allocate?.editor).toBe('select');
    expect(allocate?.editorParams).toEqual({
      values: {
        '': 'Unassigned',
        'Alice Rahman': 'Alice Rahman',
        'Bob Chowdhury': 'Bob Chowdhury',
      },
    });
    const status = gridCapture.current?.columns.find((c) => c.field === 'status_label');
    expect(status?.editor).toBe('select');
    expect(status?.editorParams).toEqual({
      values: { Pending: 'Pending', 'In Progress': 'In Progress', Completed: 'Completed' },
    });
    const jobType = gridCapture.current?.columns.find((c) => c.field === 'job_type_label');
    expect(jobType?.editor).toBe('select');
    expect(jobType?.editorParams).toEqual({
      values: {
        'New Pattern': 'New Pattern',
        'Technical Sample': 'Technical Sample',
        'Fit Sample': 'Fit Sample',
        'Mini Marker': 'Mini Marker',
        '3D Sample': '3D Sample',
      },
    });
    const garments = gridCapture.current?.columns.find((c) => c.field === 'no_of_garments');
    expect(garments?.editor).toBe('number');
    expect(garments?.bottomCalc).toBe('sum');
    for (const c of gridCapture.current?.columns ?? []) {
      expect(c.headerFilter).toBe(true);
      expect(c.headerFilterType).toBeTruthy();
    }
  });

  it('maps an Allocated To edit from name to user id', () => {
    const onUpdateJobRequest = vi.fn();
    render(<DesignSheetJobRequests jobRequests={jobs} users={users} onUpdateJobRequest={onUpdateJobRequest} />);
    const rows = gridCapture.current?.data ?? [];
    gridCapture.current?.onCellEdited?.('allocated_to_name', 'Bob Chowdhury', rows[0]);
    expect(onUpdateJobRequest).toHaveBeenCalledWith('j1', { allocated_to: 'u2' });
  });

  it('clears the allocation when Unassigned is chosen', () => {
    const onUpdateJobRequest = vi.fn();
    render(<DesignSheetJobRequests jobRequests={jobs} users={users} onUpdateJobRequest={onUpdateJobRequest} />);
    const rows = gridCapture.current?.data ?? [];
    gridCapture.current?.onCellEdited?.('allocated_to_name', '', rows[1]);
    expect(onUpdateJobRequest).toHaveBeenCalledWith('j2', { allocated_to: null });
  });

  it('maps a Status edit from friendly label back to the status key', () => {
    const onUpdateJobRequest = vi.fn();
    render(<DesignSheetJobRequests jobRequests={jobs} users={users} onUpdateJobRequest={onUpdateJobRequest} />);
    const rows = gridCapture.current?.data ?? [];
    gridCapture.current?.onCellEdited?.('status_label', 'Completed', rows[0]);
    expect(onUpdateJobRequest).toHaveBeenCalledWith('j1', { status: 'completed' });
  });

  it('maps a Job Type edit from friendly label back to the job type key', () => {
    const onUpdateJobRequest = vi.fn();
    render(<DesignSheetJobRequests jobRequests={jobs} users={users} onUpdateJobRequest={onUpdateJobRequest} />);
    const rows = gridCapture.current?.data ?? [];
    gridCapture.current?.onCellEdited?.('job_type_label', 'Mini Marker', rows[0]);
    expect(onUpdateJobRequest).toHaveBeenCalledWith('j1', { job_type: 'mini_marker' });
  });

  it('forwards plain field edits unchanged', () => {
    const onUpdateJobRequest = vi.fn();
    render(<DesignSheetJobRequests jobRequests={jobs} users={users} onUpdateJobRequest={onUpdateJobRequest} />);
    const rows = gridCapture.current?.data ?? [];
    gridCapture.current?.onCellEdited?.('work_location', 'Sample Room', rows[0]);
    expect(onUpdateJobRequest).toHaveBeenCalledWith('j1', { work_location: 'Sample Room' });
  });

  it('wires the action-column delete button to onDeleteJobRequest', () => {
    const onDeleteJobRequest = vi.fn();
    render(<DesignSheetJobRequests jobRequests={jobs} users={users} onDeleteJobRequest={onDeleteJobRequest} />);
    const props = gridCapture.current;
    expect(props?.actionColumn).toBe(true);
    const rows = props?.data ?? [];
    props?.onDelete?.(rows[0]);
    expect(onDeleteJobRequest).toHaveBeenCalledWith('j1');
  });

  it('builds a context menu with a delete action', () => {
    const onDeleteJobRequest = vi.fn();
    render(<DesignSheetJobRequests jobRequests={jobs} users={users} onDeleteJobRequest={onDeleteJobRequest} />);
    const rows = gridCapture.current?.data ?? [];
    const menu = gridCapture.current?.rowContextMenu?.(rows[1]);
    expect(menu?.map((m) => m.label)).toEqual(['Add New Job Request', 'Delete Job Request']);
    menu?.[1].action?.();
    expect(onDeleteJobRequest).toHaveBeenCalledWith('j2');
  });

  it('forwards the standard grid chrome: toolbar, export, print, columns and pagination', () => {
    render(<DesignSheetJobRequests jobRequests={jobs} users={users} loading />);
    const props = gridCapture.current;
    expect(props?.toolbar).toBe(true);
    expect(props?.title).toBe('Job Requests');
    expect(props?.exportable).toBe(true);
    expect(props?.printable).toBe(true);
    expect(props?.printTitle).toBe('Job Requests');
    expect(props?.columnChooser).toBe(true);
    expect(props?.paginationSize).toBe(20);
    expect(props?.loading).toBe(true);
  });

  it('wires the Undo and Redo buttons and toolbar export handler to downloadXlsx', () => {
    const undo = vi.fn();
    const redo = vi.fn();
    const downloadXlsx = vi.fn();
    render(<DesignSheetJobRequests jobRequests={jobs} users={users} />);
    const ref = gridCapture.current?.gridRef;
    expect(ref).toBeTruthy();
    ref!.current = { undo, redo, downloadXlsx };
    fireEvent.click(screen.getByText('Undo'));
    expect(undo).toHaveBeenCalled();
    fireEvent.click(screen.getByText('Redo'));
    expect(redo).toHaveBeenCalled();
    gridCapture.current?.onExport?.();
    expect(downloadXlsx).toHaveBeenCalledWith('job-requests.xlsx');
  });
});

describe('DesignSheetJobRequests create form', () => {
  beforeEach(() => {
    gridCapture.current = null;
    vi.clearAllMocks();
  });

  it('submits a new job request with the mapped payload', () => {
    const onCreateJobRequest = vi.fn();
    render(
      <DesignSheetJobRequests
        jobRequests={jobs}
        users={users}
        onCreateJobRequest={onCreateJobRequest}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /New Job Request/i }));
    fireEvent.change(screen.getByLabelText('Job Type'), { target: { value: 'tech_sample' } });
    fireEvent.change(screen.getByLabelText('Required By'), { target: { value: '2026-09-10' } });
    fireEvent.change(screen.getByLabelText('Work Location'), { target: { value: 'Sample Room' } });
    fireEvent.change(screen.getByLabelText('No. of Garments'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Assign To'), { target: { value: 'u2' } });
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'urgent' } });
    fireEvent.click(screen.getByRole('button', { name: /Create Job/i }));
    expect(onCreateJobRequest).toHaveBeenCalledWith({
      job_type: 'tech_sample',
      required_by: '2026-09-10',
      work_location: 'Sample Room',
      no_of_garments: 5,
      allocated_to: 'u2',
      notes: 'urgent',
    });
  });
});

describe('DesignSheetJobRequests button contrast tokens', () => {
  beforeEach(() => {
    gridCapture.current = null;
    vi.clearAllMocks();
  });

  it('uses the site primary button token with white text on action buttons', () => {
    render(<DesignSheetJobRequests jobRequests={jobs} users={users} />);

    fireEvent.click(screen.getByRole('button', { name: /New Job Request/i }));
    const cancel = screen.getByRole('button', { name: /Cancel/i });
    expect(cancel.className).toMatch(/bg-btn-primary text-white/);
    expect(cancel.className).not.toContain('bg-heading');
    expect(cancel.className).not.toContain('text-background');

    const create = screen.getByRole('button', { name: /Create Job/i });
    expect(create.className).toMatch(/bg-btn-primary text-white/);
  });

  it('uses the readable heading text token on secondary buttons', () => {
    render(<DesignSheetJobRequests jobRequests={jobs} users={users} />);
    for (const name of ['Undo', 'Redo']) {
      const btn = screen.getByRole('button', { name });
      expect(btn.className).toContain('text-heading');
      expect(btn.className).not.toContain('text-muted');
    }
  });
});