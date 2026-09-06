import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('../../api/client', () => ({
  helpApi: {
    getOnboardingItems: vi.fn(),
    createOnboardingItem: vi.fn(),
    completeOnboardingItem: vi.fn(),
    incompleteOnboardingItem: vi.fn(),
  },
}));

import OnboardingChecklist from '../OnboardingChecklist';
import { helpApi } from '../../api/client';

function completedItem(id: string, key: string) {
  return {
    id, item_key: key, completed: true, completed_at: '2026-09-01T10:00:00Z',
    user_email: 'u@t.com', tenant: 't1', created_at: '2026-09-01T10:00:00Z',
    updated_at: '2026-09-01T10:00:00Z',
  };
}

function pendingItem(id: string, key: string) {
  return {
    id, item_key: key, completed: false, completed_at: null,
    user_email: 'u@t.com', tenant: 't1', created_at: '2026-09-01T10:00:00Z',
    updated_at: '2026-09-01T10:00:00Z',
  };
}

function renderPage(items: unknown[]) {
  (helpApi.getOnboardingItems as ReturnType<typeof vi.fn>).mockResolvedValue({
    data: { count: items.length, results: items },
  });
  return render(
    <MemoryRouter initialEntries={['/help']}>
      <OnboardingChecklist />
    </MemoryRouter>,
  );
}

describe('OnboardingChecklist', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders progress summary with completed count', async () => {
    renderPage([completedItem('1', 'created_style')]);
    expect(await screen.findByText('Getting Started Checklist')).toBeInTheDocument();
    expect(screen.getByText('1 of 8 completed')).toBeInTheDocument();
    expect(screen.getByText('13%')).toBeInTheDocument();
  });

  it('renders all checklist items from the static list', async () => {
    renderPage([]);
    await screen.findByText('Getting Started Checklist');
    expect(screen.getByText('Create a Style')).toBeInTheDocument();
    expect(screen.getByText('Open a File')).toBeInTheDocument();
    expect(screen.getByText('Create a Purchase Order')).toBeInTheDocument();
    expect(screen.getByText('Review the Dashboard')).toBeInTheDocument();
  });

  it('shows a completed item as marked done', async () => {
    renderPage([completedItem('1', 'created_style')]);
    await screen.findByText('Create a Style');
    const label = screen.getByText('Create a Style');
    expect(label.className).toContain('line-through');
  });

  it('marks a pending item complete via API toggle', async () => {
    const pending = pendingItem('1', 'created_style');
    (helpApi.getOnboardingItems as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [pending] },
    });
    (helpApi.completeOnboardingItem as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: completedItem('1', 'created_style'),
    });
    render(
      <MemoryRouter initialEntries={['/help']}>
        <OnboardingChecklist />
      </MemoryRouter>,
    );
    const label = await screen.findByText('Create a Style');
    // The checkbox is the button before the label
    const row = label.closest('div[class*="flex items-start"]');
    const checkbox = row?.querySelector('button');
    fireEvent.click(checkbox as HTMLButtonElement);
    await waitFor(() => {
      expect(helpApi.completeOnboardingItem).toHaveBeenCalledWith('1');
    });
  });

  it('creates a new item when none exists and user marks complete', async () => {
    const created = pendingItem('9', 'ran_costing', );
    (helpApi.getOnboardingItems as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 0, results: [] },
    });
    (helpApi.createOnboardingItem as ReturnType<typeof vi.fn>).mockResolvedValue({ data: created });
    (helpApi.completeOnboardingItem as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: completedItem('9', 'ran_costing'),
    });
    renderPage([]);
    const label = await screen.findByText('Run a Costing');
    const row = label.closest('div[class*="flex items-start"]');
    const checkbox = row?.querySelector('button');
    fireEvent.click(checkbox as HTMLButtonElement);
    await waitFor(() => {
      expect(helpApi.createOnboardingItem).toHaveBeenCalledWith('ran_costing');
      expect(helpApi.completeOnboardingItem).toHaveBeenCalledWith('9');
    });
  });

  it('navigates to the linked page when Go is clicked', async () => {
    renderPage([]);
    const goButtons = await screen.findAllByText('Go →');
    fireEvent.click(goButtons[0]);
    expect(navigateMock).toHaveBeenCalledWith('/styles');
  });
});
