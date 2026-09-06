import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../api/client', () => ({
  helpApi: {
    createTourCompletion: vi.fn(),
  },
}));

import GuidedTour from '../GuidedTour';
import { helpApi } from '../../api/client';

describe('GuidedTour', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the tour on first visit (no stored completion)', () => {
    render(<GuidedTour />);
    act(() => { vi.advanceTimersByTime(800); });
    expect(screen.getByText('Welcome to BHMS')).toBeInTheDocument();
  });

  it('does not show the tour when already completed', () => {
    localStorage.setItem('bhms-tour-completed', 'true');
    render(<GuidedTour />);
    act(() => { vi.advanceTimersByTime(800); });
    expect(screen.queryByText('Welcome to BHMS')).not.toBeInTheDocument();
  });

  it('records a tour completion via the API when the tour finishes', () => {
    (helpApi.createTourCompletion as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} });
    render(<GuidedTour />);
    act(() => { vi.advanceTimersByTime(800); });
    const next = () => screen.getByRole('button', { name: /next/i });
    fireEvent.click(next());
    fireEvent.click(next());
    fireEvent.click(next());
    fireEvent.click(next());
    const getStarted = screen.getByRole('button', { name: /get started/i });
    fireEvent.click(getStarted);
    expect(helpApi.createTourCompletion).toHaveBeenCalledWith('welcome-tour');
  });

  it('does not record completion when the tour is skipped', () => {
    render(<GuidedTour />);
    act(() => { vi.advanceTimersByTime(800); });
    fireEvent.click(screen.getByRole('button', { name: /skip tour/i }));
    expect(helpApi.createTourCompletion).not.toHaveBeenCalled();
  });
});
