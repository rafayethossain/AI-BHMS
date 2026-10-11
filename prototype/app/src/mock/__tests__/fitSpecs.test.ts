import { describe, it, expect, beforeEach } from 'vitest';
import {
  addFitSpec,
  deleteFitSpec,
  getDesignFitSpecs,
  getDesignVersions,
  resetDb,
  setCurrentFitSpec,
  updateFitSpec,
} from '../db';

describe('mock fit-spec store', () => {
  beforeEach(() => {
    resetDb();
  });

  it('seeds fit specs per design and resolves versions', () => {
    expect(getDesignFitSpecs('REG-1001')).toHaveLength(4);
    expect(getDesignFitSpecs('REG-1003')).toHaveLength(0);
    expect(getDesignVersions('REG-1001').map((v) => v.version_number)).toEqual(['v1', 'v2']);
  });

  it('adds a spec and assigns an id', () => {
    const created = addFitSpec('REG-1001', {
      fit_number: 'FIT-1001-99',
      fit_stage: 'pp',
      version_number: 'v2',
      fit_date: '2026-09-01',
      description: 'Pre-production spec',
      measurements: 'Chest 52',
      notes: '',
      is_selected: false,
    });
    expect(created.id).toBeTruthy();
    expect(getDesignFitSpecs('REG-1001')).toHaveLength(5);
  });

  it('adding a selected spec clears the previous selection', () => {
    addFitSpec('REG-1001', {
      fit_number: 'FIT-1001-99',
      fit_stage: 'pp',
      version_number: 'v2',
      fit_date: '2026-09-01',
      description: 'Pre-production spec',
      measurements: '',
      notes: '',
      is_selected: true,
    });
    const selected = getDesignFitSpecs('REG-1001').filter((s) => s.is_selected);
    expect(selected.map((s) => s.fit_number)).toEqual(['FIT-1001-99']);
  });

  it('updates a spec field', () => {
    const first = getDesignFitSpecs('REG-1001')[0];
    const updated = updateFitSpec('REG-1001', first.id, { notes: 'Reviewed' });
    expect(updated?.notes).toBe('Reviewed');
  });

  it('setCurrent selects one spec and clears the rest', () => {
    const target = getDesignFitSpecs('REG-1001')[0];
    expect(setCurrentFitSpec('REG-1001', target.id)).toBe(true);
    const selected = getDesignFitSpecs('REG-1001').filter((s) => s.is_selected);
    expect(selected.map((s) => s.fit_number)).toEqual(['FIT-1001-01']);
  });

  it('deletes a spec', () => {
    const first = getDesignFitSpecs('REG-1001')[0];
    expect(deleteFitSpec('REG-1001', first.id)).toBe(true);
    expect(getDesignFitSpecs('REG-1001').map((s) => s.fit_number)).not.toContain('FIT-1001-01');
  });
});
