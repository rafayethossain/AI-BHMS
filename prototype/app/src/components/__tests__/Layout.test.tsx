import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { ThemeProvider } from '../../contexts/ThemeContext';
import Layout from '../Layout';

function PathProbe() {
  const { pathname } = useLocation();
  return <div data-testid="path-probe">{pathname}</div>;
}

function renderShell(initialEntry = '/dashboard') {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            path="*"
            element={
              <Layout>
                <PathProbe />
              </Layout>
            }
          />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('Layout shell', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('renders the brand and the module dropdowns', () => {
    renderShell();
    expect(screen.getByText('BHMS')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /design/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /merchandising/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logistics/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reports/i })).toBeInTheDocument();
  });

  it('opens a module dropdown and shows its screens', async () => {
    const user = userEvent.setup();
    renderShell();
    await user.click(screen.getByRole('button', { name: /design/i }));
    expect(screen.getByText('Tech Pack Import')).toBeInTheDocument();
    expect(screen.getByText('Fit Specs')).toBeInTheDocument();
  });

  it('navigates when a dropdown item is selected', async () => {
    const user = userEvent.setup();
    renderShell();
    await user.click(screen.getByRole('button', { name: /design/i }));
    await user.click(screen.getByText('Tech Pack Import'));
    expect(screen.getByTestId('path-probe')).toHaveTextContent('/styles/techpack-import');
  });

  it('defaults to light and toggles/persists dark before back to light', async () => {
    const user = userEvent.setup();
    renderShell();
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(window.localStorage.getItem('bhms-theme')).toBe('light');
    await user.click(screen.getByTitle('Switch to dark mode'));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(window.localStorage.getItem('bhms-theme')).toBe('dark');
    await user.click(screen.getByTitle('Switch to light mode'));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(window.localStorage.getItem('bhms-theme')).toBe('light');
  });
});