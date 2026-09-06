import { describe, it, expect } from 'vitest';
import { matchDateFilter } from '../gridFilters';

describe('matchDateFilter (systematic per-column date header filter)', () => {
  it('keeps all rows when the filter is empty or whitespace-only', () => {
    expect(matchDateFilter('', '2026-09-06')).toBe(true);
    expect(matchDateFilter(' ,  , ', '2026-09-06')).toBe(true);
  });

  it('matches a single exact date', () => {
    expect(matchDateFilter('2026-09-06', '2026-09-06')).toBe(true);
    expect(matchDateFilter('2026-09-06', '2026-09-05')).toBe(false);
  });

  it('OR-matches any of multiple comma-separated dates', () => {
    expect(matchDateFilter('2026-09-06, 2026-09-20', '2026-09-20')).toBe(true);
    expect(matchDateFilter('2026-09-06,2026-09-20', '2026-09-07')).toBe(false);
  });

  it('supports YYYY-MM month and YYYY year tokens', () => {
    expect(matchDateFilter('2026-09', '2026-09-06')).toBe(true);
    expect(matchDateFilter('2026', '2026-09-06')).toBe(true);
    expect(matchDateFilter('2025-09', '2026-09-06')).toBe(false);
  });

  it('normalizes ISO datetime row values to their date part', () => {
    expect(matchDateFilter('2026-09-06', '2026-09-06T09:30:00+06:00')).toBe(true);
  });

  it('never matches non-date placeholders like the missing-value dash', () => {
    expect(matchDateFilter('2026', '—')).toBe(false);
  });
});