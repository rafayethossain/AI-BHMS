import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { full_name: 'Test User' }, logout: vi.fn(), isAuthenticated: true }),
}));

vi.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
}));

vi.mock('../../api/client', () => ({
  merchApi: { getTAAlerts: vi.fn().mockResolvedValue({ data: { overdue_count: 0, upcoming_count: 0 } }) },
}));

import Layout from '../Layout';

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/design-sheets/ds-1']}>
      <Layout><div>page content</div></Layout>
    </MemoryRouter>,
  );
}

const DESIGN_MODULE_ITEMS = ['Design', 'Tech Pack Import', 'Fit Specs', 'Job Requests', 'Design Costings', 'Costings'];

const REMOVED_DESIGN_LIST_ITEMS = ['Styles', 'Design Sheets'];

const MERCHANDISING_ITEMS = ['File Openings', 'Purchase Orders', 'BOMs'];

describe('Layout nav — Design module IA (A7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the Design module as a top-level dropdown', async () => {
    const user = userEvent.setup();
    renderLayout();
    const designButton = screen.getByRole('button', { name: /^design$/i });
    await user.click(designButton);
    expect(designButton).toBeInTheDocument();
  });

  it('groups the Design-facing screens under the Design module', async () => {
    const user = userEvent.setup();
    renderLayout();
    await user.click(screen.getByRole('button', { name: /^design$/i }));
    for (const label of DESIGN_MODULE_ITEMS) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it('merges the Style and Design Sheet lists into a single Design entry', async () => {
    const user = userEvent.setup();
    renderLayout();
    await user.click(screen.getByRole('button', { name: /^design$/i }));
    expect(screen.getAllByRole('button', { name: /^design$/i }).length).toBeGreaterThanOrEqual(2);
    for (const removed of REMOVED_DESIGN_LIST_ITEMS) {
      expect(screen.queryAllByText(removed)).toHaveLength(0);
    }
  });

  it('no longer lists design screens under Merchandising', async () => {
    const user = userEvent.setup();
    renderLayout();
    const merchButton = screen.getByRole('button', { name: /^merchandising$/i });
    await user.click(merchButton);
    const merchPanel = merchButton.parentElement;
    expect(merchPanel).not.toBeNull();
    for (const label of DESIGN_MODULE_ITEMS) {
      expect(within(merchPanel as HTMLElement).queryAllByText(label)).toHaveLength(0);
    }
  });

  it('keeps the order workflow under Merchandising', async () => {
    const user = userEvent.setup();
    renderLayout();
    await user.click(screen.getByRole('button', { name: /^merchandising$/i }));
    for (const label of MERCHANDISING_ITEMS) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });
});