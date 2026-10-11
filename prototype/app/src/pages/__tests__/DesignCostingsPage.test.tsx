import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { ToastProvider } from '../../components/Toast';
import { resetDb } from '../../mock/api';
import DesignCostingsPage from '../DesignCostingsPage';

function renderPage(designCode = 'REG-1001') {
  return render(
    <MemoryRouter initialEntries={[`/designs/${designCode}/costings`]}>
      <ToastProvider>
        <Routes>
          <Route path="/designs/:designCode/costings" element={<DesignCostingsPage />} />
          <Route path="/design" element={<div data-testid="register-stub">register</div>} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('DesignCostingsPage', () => {
  beforeEach(() => {
    resetDb();
  });

  it('shows the design header with the costing count and live count', async () => {
    renderPage();
    expect(await screen.findByText(/REG-1001 — Costings/)).toBeInTheDocument();
    expect(screen.getByText('Nike Inc.')).toBeInTheDocument();
    expect(screen.getByText(/4 costings/)).toBeInTheDocument();
    expect(screen.getByText('Live: 1')).toBeInTheDocument();
  });

  it('shows seeded costings with one row per purchase-order version', async () => {
    renderPage();
    await screen.findByText(/4 costings/);
    expect(screen.getAllByText('PO-2025-0001')).toHaveLength(2);
    expect(screen.getByText('PO-2025-0002')).toBeInTheDocument();
    expect(screen.getByText('PO-2025-0003')).toBeInTheDocument();
  });

  it('renders each sheet type and status as a human label', async () => {
    renderPage();
    await screen.findByText(/4 costings/);
    expect(screen.getAllByText('Sri Lanka')).toHaveLength(2);
    expect(screen.getByText('Vietnam')).toBeInTheDocument();
    expect(screen.getByText('Bangladesh')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });

  it('computes the total cost and margin percent for a costing', async () => {
    renderPage();
    await screen.findByText(/4 costings/);
    expect(screen.getByText('$8.50')).toBeInTheDocument();
    expect(screen.getByText('32.0%')).toBeInTheDocument();
  });

  it('marks exactly one live costing', async () => {
    renderPage();
    await screen.findByText(/4 costings/);
    expect(document.querySelectorAll('tbody tr[data-live="true"]')).toHaveLength(1);
  });

  it('shows empty state for a design with no costings', async () => {
    renderPage('REG-1003');
    expect(await screen.findByText(/No costings yet/)).toBeInTheDocument();
  });

  it('shows design-not-found state', async () => {
    renderPage('NONEXIST');
    expect(await screen.findByText(/Design NONEXIST not found/)).toBeInTheDocument();
  });

  it('navigates back to register', async () => {
    renderPage();
    await screen.findByText(/4 costings/);
    await userEvent.click(screen.getByText('← Back'));
    expect(await screen.findByTestId('register-stub')).toBeInTheDocument();
  });

  it('shows View, Edit and Delete on every row but Set Live only on non-live rows', async () => {
    renderPage();
    await screen.findByText(/4 costings/);
    expect(screen.getAllByRole('button', { name: 'View' }).length).toBe(4);
    expect(screen.getAllByRole('button', { name: 'Edit' }).length).toBe(4);
    expect(screen.getAllByRole('button', { name: 'Delete' }).length).toBe(4);
    expect(screen.getAllByRole('button', { name: 'Set Live' }).length).toBe(3);
  });

  it('adds a new costing via the form modal', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/4 costings/);

    await user.click(screen.getByRole('button', { name: '+ Add Costing' }));
    const dialog = screen.getByRole('dialog', { name: 'Add Costing' });

    await user.selectOptions(within(dialog).getByLabelText('Purchase Order *'), 'PO-2025-0003');
    await user.clear(within(dialog).getByLabelText('Fabric Cost'));
    await user.type(within(dialog).getByLabelText('Fabric Cost'), '6.66');
    await user.type(within(dialog).getByLabelText('Trims Cost'), '1.00');
    await user.click(within(dialog).getByRole('button', { name: 'Add Costing' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Add Costing' })).not.toBeInTheDocument();
    });
    expect(await screen.findByText('$7.66')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'View' }).length).toBe(5);
  });

  it('edits an existing costing', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/4 costings/);

    await user.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    const dialog = screen.getByRole('dialog', { name: 'Edit Costing' });

    await user.clear(within(dialog).getByLabelText('Fabric Cost'));
    await user.type(within(dialog).getByLabelText('Fabric Cost'), '5.55');
    await user.click(within(dialog).getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Edit Costing' })).not.toBeInTheDocument();
    });
    expect(await screen.findByText('$9.85')).toBeInTheDocument();
    expect(screen.queryByText('$8.50')).not.toBeInTheDocument();
  });

  it('moves the live marker within a purchase order via Set Live', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/4 costings/);

    await user.click(screen.getAllByRole('button', { name: 'Set Live' })[0]);

    await waitFor(() => {
      const liveRow = document.querySelector('tbody tr[data-live="true"]');
      expect(liveRow?.getAttribute('data-version')).toBe('2');
    });
    expect(document.querySelectorAll('tbody tr[data-live="true"]')).toHaveLength(1);
    expect(screen.getByText('Live: 1')).toBeInTheDocument();
  });

  it('deletes a costing after confirmation', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/4 costings/);

    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    const confirm = screen.getByRole('dialog', { name: 'Delete Costing' });
    expect(within(confirm).getByText(/PO-2025-0001/)).toBeInTheDocument();

    await user.click(within(confirm).getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Delete Costing' })).not.toBeInTheDocument();
    });
    expect(screen.queryByText('$8.50')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'View' }).length).toBe(3);
  });

  it('opens a read-only view modal with the cost breakdown', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/4 costings/);

    await user.click(screen.getAllByRole('button', { name: 'View' })[0]);
    const dialog = screen.getByRole('dialog', { name: 'View Costing' });
    expect(within(dialog).getByText('PO-2025-0001')).toBeInTheDocument();
    expect(within(dialog).getByText('Sri Lanka')).toBeInTheDocument();
    expect(within(dialog).getByText('$8.50')).toBeInTheDocument();
    expect(within(dialog).getByText('32.0%')).toBeInTheDocument();
    expect(dialog.querySelector('.max-w-3xl')).not.toBeNull();
    expect(within(dialog).queryAllByRole('textbox').length).toBe(0);
  });
});

describe('Costing add/edit modal — standard Modal contract', () => {
  async function openAddModal() {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/4 costings/);
    await user.click(screen.getByRole('button', { name: '+ Add Costing' }));
    return screen.getByRole('dialog', { name: 'Add Costing' });
  }

  it('renders as an aria-modal dialog centered with the standard data-entry width', async () => {
    const dialog = await openAddModal();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog.className).toContain('items-center');
    expect(dialog.className).toContain('justify-center');
    expect(dialog.querySelector('.max-w-2xl')).not.toBeNull();
  });

  it('shows a close button that dismisses the modal', async () => {
    const user = userEvent.setup();
    const dialog = await openAddModal();
    await user.click(within(dialog).getByRole('button', { name: 'Close dialog' }));
    expect(screen.queryByRole('dialog', { name: 'Add Costing' })).not.toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    await openAddModal();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Add Costing' })).not.toBeInTheDocument();
  });

  it('closes on backdrop click', async () => {
    const dialog = await openAddModal();
    fireEvent.click(dialog);
    expect(screen.queryByRole('dialog', { name: 'Add Costing' })).not.toBeInTheDocument();
  });

  it('keeps all fields visible via a scrollable body under the pinned header/footer', async () => {
    const dialog = await openAddModal();
    const scrollForm = dialog.querySelector('form');
    expect(scrollForm).not.toBeNull();
    expect(scrollForm?.className).toContain('max-h-[75vh]');
    expect(scrollForm?.className).toContain('overflow-y-auto');
    [
      'Purchase Order *',
      'Version',
      'Sheet Type',
      'Status',
      'Exchange Rate',
      'Fabric Cost',
      'Trims Cost',
      'CM Cost',
      'Overhead Cost',
      'Target Price',
      'Notes',
    ].forEach((label) => {
      expect(within(dialog).getByLabelText(label)).toBeInTheDocument();
    });
    expect(within(dialog).getByText('Costing Information')).toBeInTheDocument();
    expect(within(dialog).getByText('Cost Breakdown')).toBeInTheDocument();
  });

  it('renders Sheet Type, Status and Purchase Order as master-data selects', async () => {
    const dialog = await openAddModal();

    const sheetField = within(dialog).getByLabelText('Sheet Type');
    expect(sheetField.tagName).toBe('SELECT');
    for (const opt of ['Sri Lanka', 'Vietnam', 'Bangladesh', 'China', 'Other']) {
      expect(within(dialog).getByRole('option', { name: opt })).toBeInTheDocument();
    }

    const statusField = within(dialog).getByLabelText('Status');
    expect(statusField.tagName).toBe('SELECT');
    expect(statusField).toHaveValue('draft');
    for (const opt of ['Draft', 'Pending', 'Approved', 'Rejected']) {
      expect(within(dialog).getByRole('option', { name: opt })).toBeInTheDocument();
    }

    const poField = within(dialog).getByLabelText('Purchase Order *');
    expect(poField.tagName).toBe('SELECT');
    const poOptionTexts = within(poField)
      .getAllByRole('option')
      .map((o) => o.textContent);
    for (const opt of ['PO-2025-0001', 'PO-2025-0002', 'PO-2025-0003']) {
      expect(poOptionTexts).toContain(opt);
    }

    const versionField = within(dialog).getByLabelText('Version');
    expect(versionField).toHaveValue(1);
  });

  it('delete confirmation also follows the standard modal contract', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/4 costings/);
    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    const confirm = screen.getByRole('dialog', { name: 'Delete Costing' });
    expect(confirm).toHaveAttribute('aria-modal', 'true');
    expect(within(confirm).getByRole('button', { name: 'Close dialog' })).toBeInTheDocument();
    await user.click(within(confirm).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog', { name: 'Delete Costing' })).not.toBeInTheDocument();
  });
});
