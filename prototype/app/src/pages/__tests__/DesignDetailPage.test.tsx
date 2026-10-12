import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import DesignDetailPage from '../DesignDetailPage';
import { ToastProvider } from '../../components/Toast';
import { resetDb } from '../../mock/api';

function renderPage(code = 'REG-1001') {
  return render(
    <MemoryRouter initialEntries={[`/designs/${code}`]}>
      <ToastProvider>
        <Routes>
          <Route path="/designs/:designCode" element={<DesignDetailPage />} />
          <Route path="/design" element={<div>register screen</div>} />
          <Route
            path="/designs/:designCode/versions/:versionId"
            element={<div>commercial file screen</div>}
          />
          <Route path="/purchase-orders/:poNumber" element={<div>po detail screen</div>} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );
}

const TAB_NAMES = [
  'Overview',
  'Sketches',
  'Versions',
  'Purchase Orders',
  'Items',
  'BOM',
  'Design Images',
  'Tech Packs',
  'Sales Order',
];

describe('DesignDetailPage — shell', () => {
  beforeEach(() => resetDb());

  it('loads the design header from the mock detail', async () => {
    renderPage('REG-1001');
    expect(await screen.findByRole('heading', { name: /REG-1001/ })).toBeInTheDocument();
    expect(screen.getByText('Nike Inc.')).toBeInTheDocument();
  });

  it('links to the design sheet print route from the header', async () => {
    renderPage('REG-1001');
    const link = await screen.findByRole('link', { name: /Print Design Sheet/ });
    expect(link).toHaveAttribute('href', '/designs/REG-1001/print');
  });

  it('renders all nine detail tabs with Overview active by default', async () => {
    renderPage();
    await screen.findByRole('heading', { name: /REG-1001/ });
    for (const name of TAB_NAMES) {
      expect(screen.getByRole('tab', { name })).toBeInTheDocument();
    }
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
  });

  it('links back to the register', async () => {
    renderPage();
    const link = await screen.findByRole('link', { name: /register/i });
    expect(link).toHaveAttribute('href', '/design');
  });

  it('shows a not-found state for an unknown design code', async () => {
    renderPage('NOPE-9999');
    expect(await screen.findByText(/design not found/i)).toBeInTheDocument();
  });
});

describe('DesignDetailPage — Overview tab', () => {
  beforeEach(() => resetDb());

  it('shows the key design fields', async () => {
    renderPage('REG-1001');
    await screen.findByRole('heading', { name: /REG-1001/ });
    for (const value of ['Womenswear', 'F. Rahman', 'S–XL', 'Crew neck oversized top']) {
      expect(screen.getAllByText(value).length).toBeGreaterThan(0);
    }
  });

  it('shows the design-level Sales Order risk row for fabric, trims, production and delivery', async () => {
    renderPage('REG-1001');
    await screen.findByRole('heading', { name: /REG-1001/ });
    const row = screen.getByTestId('design-risk-row');
    for (const label of ['Fabric', 'Trims', 'Production', 'Delivery']) {
      expect(within(row).getByText(label)).toBeInTheDocument();
    }
  });

  it('advances a draft design to active via the status wizard', async () => {
    const user = userEvent.setup();
    renderPage('REG-1003');
    await screen.findByRole('heading', { name: /REG-1003/ });
    await user.click(screen.getByRole('button', { name: 'Make Active' }));
    expect(await screen.findByText('Design activated')).toBeInTheDocument();
  });

  it('reopens an archived design via the status wizard', async () => {
    const user = userEvent.setup();
    renderPage('REG-1006');
    await screen.findByRole('heading', { name: /REG-1006/ });
    await user.click(screen.getByRole('button', { name: 'Reopen' }));
    expect(await screen.findByText('Design reopened')).toBeInTheDocument();
  });

  it('offers archive for an active design', async () => {
    renderPage('REG-1001');
    await screen.findByRole('heading', { name: /REG-1001/ });
    expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument();
  });
});

describe('DesignDetailPage — Sketches tab', () => {
  beforeEach(() => resetDb());

  it('shows the sketches for the design', async () => {
    const user = userEvent.setup();
    renderPage('REG-1001');
    await screen.findByRole('heading', { name: /REG-1001/ });
    await user.click(screen.getByRole('tab', { name: 'Sketches' }));
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByText('Sketch 1')).toBeInTheDocument();
    expect(within(panel).getByText('Sketch 2')).toBeInTheDocument();
  });
});

describe('DesignDetailPage — Versions tab', () => {
  beforeEach(() => resetDb());

  it('lists versions with FN numbers and marks the current version', async () => {
    const user = userEvent.setup();
    renderPage('REG-1001');
    await screen.findByRole('heading', { name: /REG-1001/ });
    await user.click(screen.getByRole('tab', { name: 'Versions' }));
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByText('v1')).toBeInTheDocument();
    expect(within(panel).getByText('v2')).toBeInTheDocument();
    expect(within(panel).getByText('FO-2025-102')).toBeInTheDocument();
    expect(within(panel).getByText('Current')).toBeInTheDocument();
  });

  it('links each version into its commercial file', async () => {
    const user = userEvent.setup();
    renderPage('REG-1001');
    await screen.findByRole('heading', { name: /REG-1001/ });
    await user.click(screen.getByRole('tab', { name: 'Versions' }));
    const panel = screen.getByRole('tabpanel');
    const links = within(panel).getAllByRole('link', { name: 'Open file →' });
    expect(links[0]).toHaveAttribute('href', '/designs/REG-1001/versions/design-01-v1');
    expect(links[1]).toHaveAttribute('href', '/designs/REG-1001/versions/design-01-v2');
  });
});

describe('DesignDetailPage — commercial file entry', () => {
  beforeEach(() => resetDb());

  it('opens the current version commercial file from + Add Update', async () => {
    const user = userEvent.setup();
    renderPage('REG-1001');
    await screen.findByRole('heading', { name: /REG-1001/ });
    await user.click(screen.getByRole('button', { name: '+ Add Update' }));
    expect(await screen.findByText('commercial file screen')).toBeInTheDocument();
  });
});

describe('DesignDetailPage — Purchase Orders tab', () => {
  beforeEach(() => resetDb());

  it('lists the POs with a drill-down link', async () => {
    const user = userEvent.setup();
    renderPage('REG-1001');
    await screen.findByRole('heading', { name: /REG-1001/ });
    await user.click(screen.getByRole('tab', { name: 'Purchase Orders' }));
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByText('PO-2025-0001')).toBeInTheDocument();
    const links = within(panel).getAllByRole('link', { name: /view po/i });
    expect(links[0]).toHaveAttribute('href', '/purchase-orders/PO-2025-0001');
  });
});

describe('DesignDetailPage — Items tab', () => {
  beforeEach(() => resetDb());

  it('lists the design items with colour and size', async () => {
    const user = userEvent.setup();
    renderPage('REG-1001');
    await screen.findByRole('heading', { name: /REG-1001/ });
    await user.click(screen.getByRole('tab', { name: 'Items' }));
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByText('REG-1001-S')).toBeInTheDocument();
  });
});

describe('DesignDetailPage — BOM tab', () => {
  beforeEach(() => resetDb());

  it('lists BOM items grouped with their category and status', async () => {
    const user = userEvent.setup();
    renderPage('REG-1001');
    await screen.findByRole('heading', { name: /REG-1001/ });
    await user.click(screen.getByRole('tab', { name: 'BOM' }));
    const panel = screen.getByRole('tabpanel');
    for (const category of ['Trims', 'Labels', 'Accessories', 'Other']) {
      expect(within(panel).getAllByText(category).length).toBeGreaterThan(0);
    }
    expect(within(panel).getAllByText('Completed').length).toBeGreaterThan(0);
  });
});

describe('DesignDetailPage — Design Images tab', () => {
  beforeEach(() => resetDb());

  it('shows the design images with labels and annotations', async () => {
    const user = userEvent.setup();
    renderPage('REG-1001');
    await screen.findByRole('heading', { name: /REG-1001/ });
    await user.click(screen.getByRole('tab', { name: 'Design Images' }));
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByText('Front view')).toBeInTheDocument();
    expect(within(panel).getByText('Approved by buyer')).toBeInTheDocument();
  });
});

describe('DesignDetailPage — Tech Packs tab', () => {
  beforeEach(() => resetDb());

  it('shows the tech pack with per-section import progress', async () => {
    const user = userEvent.setup();
    renderPage('REG-1001');
    await screen.findByRole('heading', { name: /REG-1001/ });
    await user.click(screen.getByRole('tab', { name: 'Tech Packs' }));
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByText('REG-1001 tech pack.pdf')).toBeInTheDocument();
    expect(within(panel).getByText('Imported')).toBeInTheDocument();
    expect(within(panel).getByText('Sketches')).toBeInTheDocument();
    expect(within(panel).getAllByText('100%').length).toBeGreaterThan(0);
  });
});

describe('DesignDetailPage — Sales Order tab', () => {
  beforeEach(() => resetDb());

  it('renders the 11-row Sales Order report for REG-1004 with per-area risk pills', async () => {
    const user = userEvent.setup();
    renderPage('REG-1004');
    await screen.findByRole('heading', { name: /REG-1004/ });
    await user.click(screen.getByRole('tab', { name: 'Sales Order' }));
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getAllByTestId('so-po-row')).toHaveLength(11);
    expect(within(panel).getAllByText('Delayed or Overdue').length).toBeGreaterThan(0);
    expect(within(panel).getAllByText('On Track').length).toBeGreaterThan(0);
  });

  it('shows the per-cell Fabric/Trims/Production/Delivery header matrix', async () => {
    const user = userEvent.setup();
    renderPage('REG-1004');
    await screen.findByRole('heading', { name: /REG-1004/ });
    await user.click(screen.getByRole('tab', { name: 'Sales Order' }));
    const panel = screen.getByRole('tabpanel');
    for (const label of ['Fabric', 'Trims', 'Production', 'Delivery', 'Overall']) {
      expect(within(panel).getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it('drills down from a Sales Order row to the PO', async () => {
    const user = userEvent.setup();
    renderPage('REG-1004');
    await screen.findByRole('heading', { name: /REG-1004/ });
    await user.click(screen.getByRole('tab', { name: 'Sales Order' }));
    const panel = screen.getByRole('tabpanel');
    const rows = within(panel).getAllByTestId('so-po-row');
    const link = within(rows[0]).getByRole('link', { name: /open/i });
    expect(link.getAttribute('href')).toMatch(/^\/purchase-orders\//);
  });
});

describe('DesignDetailPage — tab switching', () => {
  beforeEach(() => resetDb());

  it('switches the visible panel when a tab is clicked', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { name: /REG-1001/ });
    await user.click(screen.getByRole('tab', { name: 'BOM' }));
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: 'BOM' })).toHaveAttribute('aria-selected', 'true'),
    );
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'false');
  });
});