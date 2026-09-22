import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import App from '../../App';

describe('App shell routes', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('redirects the root path to the dashboard', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('renders the dashboard placeholder with module cards', async () => {
    window.history.pushState({}, '', '/dashboard');
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /design/i })).toBeInTheDocument();
  });

  it('renders the design detail page for a seeded design code', async () => {
    window.history.pushState({}, '', '/designs/REG-1001');
    render(<App />);
    expect(await screen.findByRole('heading', { name: /Design REG-1001/ })).toBeInTheDocument();
  });

  it('falls back to a placeholder screen for unbuilt routes', async () => {
    window.history.pushState({}, '', '/purchase-orders');
    render(<App />);
    expect(await screen.findByText(/not built yet/i)).toBeInTheDocument();
  });
});