import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { ToastProvider } from '../../components/Toast';
import { resetDb } from '../../mock/api';
import PurchaseOrderDetailPage from '../PurchaseOrderDetailPage';

function renderPage(poNumber = 'PO-2025-0001') {
  return render(
    <MemoryRouter initialEntries={[`/purchase-orders/${poNumber}`]}>
      <ToastProvider>
        <Routes>
          <Route path="/purchase-orders/:poNumber" element={<PurchaseOrderDetailPage />} />
          <Route path="/purchase-orders" element={<div data-testid="po-list-stub">po list</div>} />
          <Route path="/designs/:designCode" element={<div data-testid="design-stub">design</div>} />
          <Route
            path="/designs/:designCode/versions/:versionId"
            element={<div data-testid="file-stub">file</div>}
          />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );
}

async function clickTab(user: ReturnType<typeof userEvent.setup>, name: string) {
  await screen.findByRole('heading', { name: /^PO-/ });
  await user.click(screen.getByRole('tab', { name }));
}

function tableRows(testId: string): string[] {
  const table = document.querySelector(`[data-testid="${testId}"]`);
  if (!table) return [];
  return Array.from(table.querySelectorAll('tbody tr')).map((r) => r.textContent ?? '');
}

describe('PurchaseOrderDetailPage', () => {
  beforeEach(() => {
    resetDb();
  });

  it('shows the PO header with status, FN and design', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'PO-2025-0001' })).toBeInTheDocument();
    expect(screen.getAllByText('FO-2025-102').length).toBeGreaterThan(0);
    expect(screen.getAllByText('REG-1001').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Nike Inc.').length).toBeGreaterThan(0);
  });

  it('renders the not-found state for an unknown PO', async () => {
    renderPage('PO-NOPE');
    expect(await screen.findByText(/not found/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to purchase orders/i })).toBeInTheDocument();
  });

  it('shows the overview with order details and the risk matrix', async () => {
    renderPage();
    expect(await screen.findByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('1,000')).toBeInTheDocument();
    expect(screen.getByText('$3,000.00')).toBeInTheDocument();
    expect(screen.getByText('2026-07-20')).toBeInTheDocument();
    // risk pills from the derived statuses (trims + overall are both amber for this PO)
    expect(screen.getByText('On Track')).toBeInTheDocument();
    expect(screen.getAllByText('At Risk').length).toBeGreaterThan(0);
  });

  it('links to the design detail and the version commercial file', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('link', { name: /open design/i }));
    expect(await screen.findByTestId('design-stub')).toBeInTheDocument();
  });

  it('lists the line items and adds a new one', async () => {
    const user = userEvent.setup();
    renderPage();
    await clickTab(user, 'Items');
    await waitFor(() => {
      expect(tableRows('items-table').length).toBeGreaterThan(0);
    });
    expect(tableRows('items-table')[0]).toContain('REG-1001-S');

    await user.click(screen.getByRole('button', { name: /\+ Add Item/i }));
    await user.type(await screen.findByLabelText(/item code/i), 'REG-1001-XXL');
    await user.type(screen.getByLabelText(/colour/i), 'RED');
    await user.type(screen.getByLabelText(/size/i), 'XXL');
    await user.type(screen.getByLabelText(/^quantity$/i), '100');
    await user.type(screen.getByLabelText(/unit price/i), '3.00');
    await user.click(screen.getByRole('button', { name: 'Add Item' }));

    expect(await screen.findByText('REG-1001-XXL')).toBeInTheDocument();
    expect(await screen.findByText('Item added')).toBeInTheDocument();
  });

  it('edits and deletes a line item', async () => {
    const user = userEvent.setup();
    renderPage();
    await clickTab(user, 'Items');
    await waitFor(() => {
      expect(tableRows('items-table').length).toBeGreaterThan(0);
    });
    const firstRow = document.querySelector(
      '[data-testid="items-table"] tbody tr',
    ) as HTMLElement;
    await user.click(within(firstRow).getByRole('button', { name: 'Edit' }));
    const qty = await screen.findByLabelText(/^quantity$/i);
    await user.clear(qty);
    await user.type(qty, '500');
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    expect(await screen.findByText('Item updated')).toBeInTheDocument();

    const updatedRow = document.querySelector(
      '[data-testid="items-table"] tbody tr',
    ) as HTMLElement;
    await user.click(within(updatedRow).getByRole('button', { name: 'Delete' }));
    await user.click(await screen.findByRole('button', { name: /^delete item$/i }));
    expect(await screen.findByText('Item deleted')).toBeInTheDocument();
    expect(screen.queryByText('REG-1001-S')).not.toBeInTheDocument();
  });

  it('lists hits with kind/mode and adds a new hit', async () => {
    const user = userEvent.setup();
    renderPage();
    await clickTab(user, 'Hits');
    await waitFor(() => {
      expect(tableRows('hits-table').length).toBeGreaterThan(0);
    });
    const rows = tableRows('hits-table');
    expect(rows[0]).toMatch(/HIT-/);
    expect(rows.join(' ')).toMatch(/(boxed|hanging)/i);
    expect(rows.join(' ')).toMatch(/(sea|air)/i);

    await user.click(screen.getByRole('button', { name: /\+ Add Hit/i }));
    await fireEvent.change(await screen.findByLabelText(/hit type/i), { target: { value: 'hanging' } });
    await fireEvent.change(screen.getByLabelText(/mode/i), { target: { value: 'air' } });
    await user.type(screen.getByLabelText(/^quantity$/i), '150');
    await user.type(screen.getByLabelText(/hit date/i), '2026-09-15');
    await user.click(screen.getByRole('button', { name: 'Add Hit' }));
    expect(await screen.findByText('Hit added')).toBeInTheDocument();
  });

  it('lists amendments and requests a new one', async () => {
    const user = userEvent.setup();
    renderPage();
    await clickTab(user, 'Amendments');
    await waitFor(() => {
      expect(tableRows('amendments-table').length).toBeGreaterThan(0);
    });
    expect(tableRows('amendments-table')[0]).toMatch(/AMD-/);

    await user.click(screen.getByRole('button', { name: /\+ Request Amendment/i }));
    await fireEvent.change(await screen.findByLabelText(/field/i), { target: { value: 'delivery_date' } });
    await user.type(screen.getByLabelText(/^from$/i), '2026-08-01');
    await user.type(screen.getByLabelText(/^to$/i), '2026-08-10');
    await user.type(screen.getByLabelText(/reason/i), 'Buyer shift request');
    await user.click(screen.getByRole('button', { name: 'Request Amendment' }));
    expect(await screen.findByText('Amendment requested')).toBeInTheDocument();
  });

  it('approves a pending amendment', async () => {
    const user = userEvent.setup();
    renderPage();
    await clickTab(user, 'Amendments');
    await waitFor(() => {
      expect(tableRows('amendments-table').length).toBeGreaterThan(0);
    });
    const approveButtons = screen.getAllByRole('button', { name: /approve/i });
    expect(approveButtons.length).toBeGreaterThan(0);
    await user.click(approveButtons[0]);
    expect(await screen.findByText('Amendment approved')).toBeInTheDocument();
  });

  it('shows the lifecycle trail on the History tab', async () => {
    const user = userEvent.setup();
    renderPage();
    await clickTab(user, 'History');
    expect(await screen.findByText('Purchase order created')).toBeInTheDocument();
    expect(screen.getByText(/opened under file/i)).toBeInTheDocument();
  });

  it('navigates back to the PO list', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('link', { name: /back to purchase orders/i }));
    expect(await screen.findByTestId('po-list-stub')).toBeInTheDocument();
  });
});