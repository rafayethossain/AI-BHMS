import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { ToastProvider } from '../../components/Toast';
import { resetDb } from '../../mock/api';
import VersionCommercialFilePage from '../VersionCommercialFilePage';

function renderPage(designCode = 'REG-1001', versionId = 'design-01-v1') {
  return render(
    <MemoryRouter initialEntries={[`/designs/${designCode}/versions/${versionId}`]}>
      <ToastProvider>
        <Routes>
          <Route
            path="/designs/:designCode/versions/:versionId"
            element={<VersionCommercialFilePage />}
          />
          <Route path="/designs/:designCode" element={<div data-testid="design-stub">design</div>} />
          <Route path="/purchase-orders/:poNumber" element={<div data-testid="po-stub">po</div>} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('VersionCommercialFilePage', () => {
  beforeEach(() => {
    resetDb();
  });

  it('renders the commercial file header, meta and flags', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: /FO-2025-101/ })).toBeInTheDocument();
    expect(screen.getAllByText(/REG-1001/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Nike Inc.').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Dhaka Apparels').length).toBeGreaterThan(0);
    expect(screen.getByText('Quick lead')).toBeInTheDocument();
    expect(screen.getByText('Repeat')).toBeInTheDocument();
    expect(screen.getByText('Stock fabric')).toBeInTheDocument();
  });

  it('shows the details and quick stats', async () => {
    renderPage('REG-1001', 'design-01-v2');
    await screen.findByRole('heading', { name: /FO-2025-102/ });
    expect(screen.getByText('File Number')).toBeInTheDocument();
    expect(screen.getAllByText('v2').length).toBeGreaterThan(0);
    expect(screen.getByText('Purchase Orders')).toBeInTheDocument();
  });

  it('collects quick-lead department agreement', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { name: /FO-2025-101/ });

    const panel = screen.getByTestId('quick-lead-panel');
    expect(within(panel).getByText('Production')).toBeInTheDocument();
    expect(within(panel).getByText('Quality')).toBeInTheDocument();
    expect(within(panel).getByText('Commercial')).toBeInTheDocument();

    await user.click(within(panel).getAllByRole('button', { name: 'Agree' })[0]);
    await waitFor(() => {
      expect(within(screen.getByTestId('quick-lead-panel')).queryByText('Production')).not.toBeInTheDocument();
    });
  });

  it('unmarks quick lead', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { name: /FO-2025-101/ });
    await user.click(screen.getByRole('button', { name: 'Unmark' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Mark as Quick Lead' })).toBeInTheDocument();
    });
  });

  it('creates a repeat and collects department approvals', async () => {
    const user = userEvent.setup();
    renderPage('REG-1002', 'design-02-v1');
    await screen.findByRole('heading', { name: /FO-2025-103/ });

    await user.click(screen.getByRole('button', { name: 'Create Repeat Order' }));
    const panel = await screen.findByTestId('repeat-panel');
    await waitFor(() => {
      expect(within(screen.getByTestId('repeat-panel')).getByText('Production')).toBeInTheDocument();
    });

    await user.click(within(screen.getByTestId('repeat-panel')).getAllByRole('button', { name: 'Confirm Repeat' })[0]);
    await waitFor(() => {
      expect(within(screen.getByTestId('repeat-panel')).queryByText('Merchandising')).not.toBeInTheDocument();
    });
    expect(panel).toBeInTheDocument();
  });

  it('shows the stock-fabric meters, balance and allocations', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { name: /FO-2025-101/ });

    const panel = screen.getByTestId('stock-panel');
    expect(within(panel).getByText('500')).toBeInTheDocument();
    expect(within(panel).getByText('120')).toBeInTheDocument();
    expect(within(panel).getByText('380')).toBeInTheDocument();

    await user.click(within(panel).getByRole('button', { name: 'Allocate Meters' }));
    const dialog = screen.getByRole('dialog', { name: 'Allocate Stock Meters' });
    await user.type(within(dialog).getByLabelText('Destination File Opening *'), 'FO-2025-999');
    await user.type(within(dialog).getByLabelText('Meters *'), '30');
    await user.click(within(dialog).getByRole('button', { name: 'Allocate' }));

    await waitFor(() => {
      expect(within(screen.getByTestId('stock-panel')).getByText('350')).toBeInTheDocument();
    });
  });

  it('marks a non-stock file as stock fabric with a description and total', async () => {
    const user = userEvent.setup();
    renderPage('REG-1002', 'design-02-v1');
    await screen.findByRole('heading', { name: /FO-2025-103/ });

    await user.click(screen.getByRole('button', { name: 'Mark as Stock Fabric' }));
    const dialog = screen.getByRole('dialog', { name: 'Mark as Stock Fabric' });
    await user.type(within(dialog).getByLabelText('Description'), 'Navy jersey');
    await user.type(within(dialog).getByLabelText('Total Meters *'), '300');
    await user.click(within(dialog).getByRole('button', { name: 'Mark as Stock' }));

    await waitFor(() => {
      expect(screen.getByTestId('stock-panel')).toBeInTheDocument();
      expect(within(screen.getByTestId('stock-panel')).getByText(/Navy jersey/)).toBeInTheDocument();
    });
  });

  it('appends an update note', async () => {
    const user = userEvent.setup();
    renderPage('REG-1002', 'design-02-v1');
    await screen.findByRole('heading', { name: /FO-2025-103/ });

    await user.click(screen.getByRole('button', { name: '+ Add Update' }));
    const dialog = screen.getByRole('dialog', { name: 'Add Update' });
    await user.type(within(dialog).getByLabelText('Note *'), 'Buyer approved the swatch');
    await user.click(within(dialog).getByRole('button', { name: 'Add Update' }));

    expect(await screen.findByText('Buyer approved the swatch')).toBeInTheDocument();
  });

  it('lists the purchase orders under the FN on the Purchase Orders tab', async () => {
    const user = userEvent.setup();
    renderPage('REG-1001', 'design-01-v2');
    await screen.findByRole('heading', { name: /FO-2025-102/ });

    await user.click(screen.getByRole('tab', { name: /Purchase Orders/ }));
    expect(await screen.findByText('PO-2025-0001')).toBeInTheDocument();
    expect(screen.getByText('PO-2025-0002')).toBeInTheDocument();
    expect(screen.getByText('PO-2025-0003')).toBeInTheDocument();
  });

  it('links back to the design', async () => {
    renderPage();
    await screen.findByRole('heading', { name: /FO-2025-101/ });
    const link = screen.getByRole('link', { name: /Back to design/ });
    expect(link).toHaveAttribute('href', '/designs/REG-1001');
  });

  it('shows a not-found state for an unknown version', async () => {
    renderPage('REG-1001', 'nope');
    expect(await screen.findByText(/commercial file not found/i)).toBeInTheDocument();
  });
});
