import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

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

describe('DesignSheetJobRequests', () => {
  it('renders each job request row with type, date, location, garments and badge', () => {
    render(
      <DesignSheetJobRequests
        jobRequests={jobs}
        users={users}
      />,
    );
    expect(screen.getByText('New Pattern')).toBeInTheDocument();
    expect(screen.getByText('Technical Sample')).toBeInTheDocument();
    expect(screen.getAllByText('2026-09-01', { exact: true }).length).toBe(1);
    expect(screen.getAllByText('2026-09-15', { exact: true }).length).toBe(1);
    expect(screen.getByText('Cutting Section')).toBeInTheDocument();
    expect(screen.getByText('Quality Section')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('2026-09-01')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('maps status to a badge class', () => {
    const { container } = render(
      <DesignSheetJobRequests jobRequests={jobs} users={users} />,
    );
    const pending = container.querySelector('.badge--pending');
    const progress = container.querySelector('.badge--in_progress');
    expect(pending).not.toBeNull();
    expect(progress).not.toBeNull();
    expect(pending!.textContent).toContain('Pending');
    expect(progress!.textContent).toContain('In Progress');
  });

  it('provides an allocate dropdown per row, pre-filled with the current assignee', () => {
    render(<DesignSheetJobRequests jobRequests={jobs} users={users} />);
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBe(2);
    expect((selects[1] as HTMLSelectElement).value).toBe('u1');
  });

  it('calls onAllocateUser when the dropdown changes', () => {
    const onAllocateUser = vi.fn();
    render(
      <DesignSheetJobRequests
        jobRequests={jobs}
        users={users}
        onAllocateUser={onAllocateUser}
      />,
    );
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[1], { target: { value: 'u2' } });
    expect(onAllocateUser).toHaveBeenCalledWith('j2', 'u2');
  });

  it('submits a new job request with mapped payload', () => {
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