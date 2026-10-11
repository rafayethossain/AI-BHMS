import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { ToastProvider } from '../../components/Toast';
import { resetDb } from '../../mock/api';
import DesignFitSpecsPage from '../DesignFitSpecsPage';

function renderPage(designCode = 'REG-1001') {
  return render(
    <MemoryRouter initialEntries={[`/designs/${designCode}/fits`]}>
      <ToastProvider>
        <Routes>
          <Route path="/designs/:designCode/fits" element={<DesignFitSpecsPage />} />
          <Route path="/design" element={<div data-testid="register-stub">register</div>} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('DesignFitSpecsPage', () => {
  beforeEach(() => {
    resetDb();
  });

  it('shows the design header with spec count and the current spec', async () => {
    renderPage();
    expect(await screen.findByText(/REG-1001 — Fit Specs/)).toBeInTheDocument();
    expect(screen.getByText('Nike Inc.')).toBeInTheDocument();
    expect(screen.getByText(/4 specs/)).toBeInTheDocument();
    expect(screen.getByText('Current: FIT-1001-03')).toBeInTheDocument();
  });

  it('shows seeded fit specs in the table', async () => {
    renderPage();
    await screen.findByText('FIT-1001-01');
    expect(screen.getByText('FIT-1001-02')).toBeInTheDocument();
    expect(screen.getByText('FIT-1001-04')).toBeInTheDocument();
    expect(screen.getByText('Initial dev spec')).toBeInTheDocument();
    expect(screen.getByText('Approved by buyer')).toBeInTheDocument();
  });

  it('renders the stage as a human label, not the raw value', async () => {
    renderPage();
    await screen.findByText('FIT-1001-01');
    expect(screen.getByText('Dev Spec')).toBeInTheDocument();
    expect(screen.getByText('1st Fit')).toBeInTheDocument();
    expect(screen.getByText('2nd Fit')).toBeInTheDocument();
    expect(screen.getByText('3rd Fit')).toBeInTheDocument();
  });

  it('shows empty state for a design with no fit specs', async () => {
    renderPage('REG-1003');
    expect(await screen.findByText(/No fit specs yet/)).toBeInTheDocument();
  });

  it('shows design-not-found state', async () => {
    renderPage('NONEXIST');
    expect(await screen.findByText(/Design NONEXIST not found/)).toBeInTheDocument();
  });

  it('navigates back to register', async () => {
    renderPage();
    await screen.findByText('FIT-1001-01');
    await userEvent.click(screen.getByText('← Back'));
    expect(await screen.findByTestId('register-stub')).toBeInTheDocument();
  });

  it('shows View, Edit, Delete on every row and Set Current only on non-current rows', async () => {
    renderPage();
    await screen.findByText('FIT-1001-01');
    expect(screen.getAllByRole('button', { name: 'View' }).length).toBe(4);
    expect(screen.getAllByRole('button', { name: 'Edit' }).length).toBe(4);
    expect(screen.getAllByRole('button', { name: 'Delete' }).length).toBe(4);
    expect(screen.getAllByRole('button', { name: 'Set Current' }).length).toBe(3);
  });

  it('adds a new fit spec via the form modal', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('FIT-1001-01');

    await user.click(screen.getByRole('button', { name: '+ Add Fit Spec' }));
    const dialog = screen.getByRole('dialog', { name: 'Add Fit Spec' });

    await user.type(within(dialog).getByLabelText('Fit Number *'), 'FIT-1001-99');
    await user.selectOptions(within(dialog).getByLabelText('Stage'), 'pp');
    await user.type(within(dialog).getByLabelText('Description'), 'Pre-production spec');
    await user.type(within(dialog).getByLabelText('Measurements'), 'Chest 52, Waist 44');

    await user.click(within(dialog).getByRole('button', { name: 'Add Fit Spec' }));

    expect(await screen.findByText('FIT-1001-99')).toBeInTheDocument();
    expect(screen.getByText('Pre-production spec')).toBeInTheDocument();
  });

  it('edits an existing fit spec', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('FIT-1001-01');

    await user.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    const dialog = screen.getByRole('dialog', { name: 'Edit Fit Spec' });
    expect(within(dialog).getByDisplayValue('FIT-1001-01')).toBeInTheDocument();

    await user.clear(within(dialog).getByLabelText('Description'));
    await user.type(within(dialog).getByLabelText('Description'), 'UPDATED DEV SPEC');
    await user.click(within(dialog).getByRole('button', { name: 'Save Changes' }));

    expect(await screen.findByText('UPDATED DEV SPEC')).toBeInTheDocument();
    expect(screen.queryByText('Initial dev spec')).not.toBeInTheDocument();
  });

  it('deletes a fit spec after confirmation', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('FIT-1001-01');

    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    const confirm = screen.getByRole('dialog', { name: 'Delete Fit Spec' });
    expect(within(confirm).getByText(/FIT-1001-01/)).toBeInTheDocument();

    await user.click(within(confirm).getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(screen.queryByText('FIT-1001-01')).not.toBeInTheDocument();
    });
  });

  it('sets the current spec via the Set Current row action', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('FIT-1001-01');

    expect(screen.getByText('Current: FIT-1001-03')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Set Current' })[0]);

    expect(await screen.findByText('Current: FIT-1001-01')).toBeInTheDocument();
    expect(screen.queryByText('Current: FIT-1001-03')).not.toBeInTheDocument();
  });

  it('opens a read-only view modal', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('FIT-1001-01');

    await user.click(screen.getAllByRole('button', { name: 'View' })[0]);
    const dialog = screen.getByRole('dialog', { name: 'View Fit Spec' });
    expect(within(dialog).getByText('FIT-1001-01')).toBeInTheDocument();
    expect(within(dialog).getByText('Initial dev spec')).toBeInTheDocument();
    expect(dialog.querySelector('.max-w-3xl')).not.toBeNull();
    expect(within(dialog).queryAllByRole('textbox').length).toBe(0);
  });
});

describe('Fit spec add/edit modal — standard Modal contract', () => {
  async function openAddModal() {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('FIT-1001-01');
    await user.click(screen.getByRole('button', { name: '+ Add Fit Spec' }));
    return screen.getByRole('dialog', { name: 'Add Fit Spec' });
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
    expect(screen.queryByRole('dialog', { name: 'Add Fit Spec' })).not.toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    await openAddModal();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Add Fit Spec' })).not.toBeInTheDocument();
  });

  it('closes on backdrop click', async () => {
    const dialog = await openAddModal();
    fireEvent.click(dialog);
    expect(screen.queryByRole('dialog', { name: 'Add Fit Spec' })).not.toBeInTheDocument();
  });

  it('keeps all fields visible via a scrollable body under the pinned header/footer', async () => {
    const dialog = await openAddModal();
    const scrollForm = dialog.querySelector('form');
    expect(scrollForm).not.toBeNull();
    expect(scrollForm?.className).toContain('max-h-[75vh]');
    expect(scrollForm?.className).toContain('overflow-y-auto');
    ['Fit Number *', 'Stage', 'Version', 'Fit Date', 'Description', 'Measurements', 'Notes'].forEach((label) => {
      expect(within(dialog).getByLabelText(label)).toBeInTheDocument();
    });
    expect(within(dialog).getByText('Fit Specification')).toBeInTheDocument();
  });

  it('renders Stage and Version as master-data selects', async () => {
    const dialog = await openAddModal();
    const stageField = within(dialog).getByLabelText('Stage');
    expect(stageField.tagName).toBe('SELECT');
    expect(stageField).toHaveValue('dev');
    for (const opt of ['Dev Spec', '1st Fit', '2nd Fit', '3rd Fit', 'Pre-Production']) {
      expect(within(dialog).getByRole('option', { name: opt })).toBeInTheDocument();
    }
    const versionField = within(dialog).getByLabelText('Version');
    expect(versionField.tagName).toBe('SELECT');
    for (const opt of ['v1', 'v2']) {
      expect(within(dialog).getByRole('option', { name: opt })).toBeInTheDocument();
    }
  });

  it('delete confirmation also follows the standard modal contract', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('FIT-1001-01');
    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    const confirm = screen.getByRole('dialog', { name: 'Delete Fit Spec' });
    expect(confirm).toHaveAttribute('aria-modal', 'true');
    expect(within(confirm).getByRole('button', { name: 'Close dialog' })).toBeInTheDocument();
    await user.click(within(confirm).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog', { name: 'Delete Fit Spec' })).not.toBeInTheDocument();
  });
});
