import { render, screen } from '@testing-library/react';
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

describe('Layout nav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a Design Sheets item in the navigation', async () => {
    const user = userEvent.setup();
    renderLayout();
    await user.click(screen.getByRole('button', { name: /merchandising/i }));
    expect(screen.getAllByText('Design Sheets').length).toBeGreaterThan(0);
  });
});