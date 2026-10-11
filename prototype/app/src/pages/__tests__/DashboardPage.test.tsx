import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import DashboardPage from '../DashboardPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
}

describe('DashboardPage — responsive page shell', () => {
  it('centres its reading-width cap so leftover space is symmetric', () => {
    renderPage();

    const root = screen.getByTestId('page-container');
    expect(root.className).toContain('mx-auto');
    expect(root.className).toContain('max-w-6xl');
  });

  it('scales the page gutters responsively instead of one fixed padding', () => {
    renderPage();

    const root = screen.getByTestId('page-container');
    expect(root.className).toContain('p-4');
    expect(root.className).toContain('sm:p-6');
  });
});
