import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import StatusPill from '../StatusPill';
import type { RiskPayload } from '../../mock/types';

describe('StatusPill', () => {
  it('renders a friendly label for an underscore status', () => {
    render(<StatusPill value="in_production" />);
    expect(screen.getByText('In production')).toBeInTheDocument();
  });

  it('maps active/confirmed/delivered to the emerald token pill', () => {
    const { container } = render(<StatusPill value="active" />);
    expect(container.firstChild?.textContent).toBe('Active');
    expect((container.firstChild as HTMLElement).className).toContain('bg-emerald-500/15');
    expect((container.firstChild as HTMLElement).className).toContain('text-emerald-600');
    expect((container.firstChild as HTMLElement).className).not.toContain('emerald-700');
  });

  it('maps draft/open to the blue token pill', () => {
    const { container } = render(<StatusPill value="draft" />);
    expect((container.firstChild as HTMLElement).className).toContain('bg-blue-300/15');
    expect((container.firstChild as HTMLElement).className).toContain('text-blue-600');
  });

  it('maps in_production to the amber token pill', () => {
    const { container } = render(<StatusPill value="in_production" />);
    expect((container.firstChild as HTMLElement).className).toContain('bg-amber-400/15');
    expect((container.firstChild as HTMLElement).className).toContain('text-amber-600');
  });

  it('maps shipped to the teal token pill', () => {
    const { container } = render(<StatusPill value="shipped" />);
    expect((container.firstChild as HTMLElement).className).toContain('bg-teal-300/15');
    expect((container.firstChild as HTMLElement).className).toContain('text-teal-400');
  });

  it('maps cancelled to the red token pill', () => {
    const { container } = render(<StatusPill value="cancelled" />);
    expect((container.firstChild as HTMLElement).className).toContain('bg-red-300/15');
    expect((container.firstChild as HTMLElement).className).toContain('text-red-400');
  });

  it('falls back to the neutral pill for unknown values', () => {
    const { container } = render(<StatusPill value="mystery" />);
    const cls = (container.firstChild as HTMLElement).className;
    expect(cls).toContain('bg-slate-100');
    expect(cls).toContain('text-muted');
  });

  it('renders risk payload labels with the risk palette', () => {
    const risk: RiskPayload = {
      code: 'red',
      label: 'Delayed or Overdue',
      color: '#ef4444',
      numeric: 3,
    };
    const { container } = render(<StatusPill value="whatever" risk={risk} />);
    expect(screen.getByText('Delayed or Overdue')).toBeInTheDocument();
    const cls = (container.firstChild as HTMLElement).className;
    expect(cls).toContain('bg-red-300/15');
    expect(cls).toContain('text-red-400');
  });

  it('adds the pulse class when pulse is set', () => {
    const { container } = render(<StatusPill value="active" pulse />);
    expect((container.firstChild as HTMLElement).className).toContain('animate-pulse');
  });

  it('passes a data-testid through', () => {
    render(<StatusPill value="active" data-testid="status-pill" />);
    expect(screen.getByTestId('status-pill')).toBeInTheDocument();
  });
});