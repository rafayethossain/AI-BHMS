import { describe, it, expect, beforeEach } from 'vitest';
import {
  addJobRequest,
  deleteJobRequest,
  getDesignJobRequests,
  getDesignPOs,
  resetDb,
  updateJobRequest,
} from '../db';

describe('mock job-request store', () => {
  beforeEach(() => {
    resetDb();
  });

  it('seeds job requests per design and resolves the design POs', () => {
    expect(getDesignJobRequests('REG-1001')).toHaveLength(4);
    expect(getDesignJobRequests('REG-1003')).toHaveLength(0);
    expect(getDesignPOs('REG-1001').map((p) => p.po_number)).toEqual([
      'PO-2025-0001',
      'PO-2025-0002',
      'PO-2025-0003',
    ]);
  });

  it('adds a job request and assigns an id', () => {
    const created = addJobRequest('REG-1001', {
      job_number: 'JOB-1001-99',
      job_type: 'sample',
      purchase_order: '',
      description: 'Extra sample',
      work_location: 'Sample Room',
      assigned_to: 'F. Rahman',
      required_by_date: '2026-10-05',
      priority: 3,
      status: 'pending',
      notes: '',
    });
    expect(created.id).toBeTruthy();
    expect(getDesignJobRequests('REG-1001')).toHaveLength(5);
  });

  it('updates a job request field', () => {
    const first = getDesignJobRequests('REG-1001')[0];
    const updated = updateJobRequest('REG-1001', first.id, { status: 'cancelled' });
    expect(updated?.status).toBe('cancelled');
    expect(getDesignJobRequests('REG-1001')[0].status).toBe('cancelled');
  });

  it('deletes a job request', () => {
    const first = getDesignJobRequests('REG-1001')[0];
    expect(deleteJobRequest('REG-1001', first.id)).toBe(true);
    expect(getDesignJobRequests('REG-1001').map((j) => j.job_number)).not.toContain('JOB-1001-01');
  });
});
