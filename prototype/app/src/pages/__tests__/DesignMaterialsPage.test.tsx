import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { ToastProvider } from '../../components/Toast';
import { resetDb } from '../../mock/api';
import DesignMaterialsPage from '../DesignMaterialsPage';

function renderPage(designCode = 'REG-1001') {
  return render(
    <MemoryRouter initialEntries={[`/designs/${designCode}/materials`]}>
      <ToastProvider>
        <Routes>
          <Route path="/designs/:designCode/materials" element={<DesignMaterialsPage />} />
          <Route path="/design" element={<div data-testid="register-stub">register</div>} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('DesignMaterialsPage', () => {
  beforeEach(() => {
    resetDb();
  });

  it('shows the design header with material count and total', async () => {
    renderPage();
    expect(await screen.findByText(/REG-1001 — Materials/)).toBeInTheDocument();
    expect(screen.getByText('Nike Inc.')).toBeInTheDocument();
    expect(screen.getByText(/6 items/)).toBeInTheDocument();
    expect(screen.getByText(/Total:/)).toBeInTheDocument();
  });

  it('shows seeded materials in the table', async () => {
    renderPage();
    await screen.findByText('SANDWASH LINEN');
    expect(screen.getByText('BUTTON 4 HOLES')).toBeInTheDocument();
    expect(screen.getByText('NYLON ZIPPER FRONT FLY')).toBeInTheDocument();
    expect(screen.getByText('ELASTIC BAND')).toBeInTheDocument();
    expect(screen.getByText('FUSING')).toBeInTheDocument();
    expect(screen.getByText('POLY COTTON POCKET BAG')).toBeInTheDocument();
  });

  it('shows empty state for a design with no materials', async () => {
    renderPage('REG-1003');
    expect(await screen.findByText(/No materials yet/)).toBeInTheDocument();
  });

  it('shows design-not-found state', async () => {
    renderPage('NONEXIST');
    expect(await screen.findByText(/Design NONEXIST not found/)).toBeInTheDocument();
  });

  it('navigates back to register', async () => {
    renderPage();
    await screen.findByText('SANDWASH LINEN');
    await userEvent.click(screen.getByText('← Back'));
    expect(await screen.findByTestId('register-stub')).toBeInTheDocument();
  });

  it('adds a new material via the form modal', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('SANDWASH LINEN');

    await user.click(screen.getByRole('button', { name: '+ Add Material' }));
    const dialog = screen.getByRole('dialog', { name: 'Add Material' });

    await user.type(within(dialog).getByLabelText('Description *'), 'TEST FABRIC');
    await user.type(within(dialog).getByLabelText('Code'), 'TF-001');
    await user.type(within(dialog).getByLabelText('Supplier'), 'TEST SUPPLIER');

    await user.click(within(dialog).getByRole('button', { name: 'Add Material' }));

    expect(await screen.findByText('TEST FABRIC')).toBeInTheDocument();
    expect(screen.getByText('TF-001')).toBeInTheDocument();
    expect(screen.getByText('TEST SUPPLIER')).toBeInTheDocument();
  });

  it('edits an existing material', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('SANDWASH LINEN');

    const editBtn = screen.getAllByRole('button', { name: 'Edit' })[0];
    await user.click(editBtn);

    const dialog = screen.getByRole('dialog', { name: 'Edit Material' });
    expect(within(dialog).getByDisplayValue('SANDWASH LINEN')).toBeInTheDocument();

    await user.clear(within(dialog).getByLabelText('Description *'));
    await user.type(within(dialog).getByLabelText('Description *'), 'UPDATED LINEN');

    await user.click(within(dialog).getByRole('button', { name: 'Save Changes' }));

    expect(await screen.findByText('UPDATED LINEN')).toBeInTheDocument();
    expect(screen.queryByText('SANDWASH LINEN')).not.toBeInTheDocument();
  });

  it('deletes a material after confirmation', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('SANDWASH LINEN');

    const deleteBtn = screen.getAllByRole('button', { name: 'Delete' })[0];
    await user.click(deleteBtn);

    const confirm = screen.getByRole('dialog', { name: 'Delete Material' });
    expect(within(confirm).getByText(/SANDWASH LINEN/)).toBeInTheDocument();

    await user.click(within(confirm).getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(screen.queryByText('SANDWASH LINEN')).not.toBeInTheDocument();
    });
  });

  it('shows edit button and delete button for each row', async () => {
    renderPage();
    await screen.findByText('SANDWASH LINEN');
    expect(screen.getAllByRole('button', { name: 'Edit' }).length).toBe(6);
    expect(screen.getAllByRole('button', { name: 'Delete' }).length).toBe(6);
  });
});

describe('Material add/edit modal — standard Modal contract', () => {
  async function openAddModal() {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('SANDWASH LINEN');
    await user.click(screen.getByRole('button', { name: '+ Add Material' }));
    return screen.getByRole('dialog', { name: 'Add Material' });
  }

  it('renders as an aria-modal dialog centered with the standard data-entry width', async () => {
    const dialog = await openAddModal();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog.className).toContain('items-center');
    expect(dialog.className).toContain('justify-center');
    const panel = dialog.querySelector('.max-w-2xl');
    expect(panel).not.toBeNull();
  });

  it('shows a close button that dismisses the modal', async () => {
    const user = userEvent.setup();
    const dialog = await openAddModal();
    await user.click(within(dialog).getByRole('button', { name: 'Close dialog' }));
    expect(screen.queryByRole('dialog', { name: 'Add Material' })).not.toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    await openAddModal();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Add Material' })).not.toBeInTheDocument();
  });

  it('closes on backdrop click', async () => {
    const dialog = await openAddModal();
    fireEvent.click(dialog);
    expect(screen.queryByRole('dialog', { name: 'Add Material' })).not.toBeInTheDocument();
  });

  it('keeps all fields visible via a scrollable body under the pinned header/footer', async () => {
    const dialog = await openAddModal();
    const scrollForm = dialog.querySelector('form');
    expect(scrollForm).not.toBeNull();
    expect(scrollForm?.className).toContain('max-h-[75vh]');
    expect(scrollForm?.className).toContain('overflow-y-auto');
    ['Type', 'Description *', 'Code', 'Location', 'Supplier', 'Colour', 'Width/Size', 'Qty', 'Unit', 'Notes'].forEach(
      (label) => {
        expect(within(dialog).getByLabelText(label)).toBeInTheDocument();
      },
    );
    expect(within(dialog).getByText('Material Information')).toBeInTheDocument();
  });

  it('renders Type and Unit as master-data selects', async () => {
    const dialog = await openAddModal();
    const typeField = within(dialog).getByLabelText('Type');
    expect(typeField.tagName).toBe('SELECT');
    expect(typeField).toHaveValue('Cloth');
    for (const opt of ['Cloth', 'Trims', 'Interfacing', 'Lining', 'Thread', 'Others']) {
      expect(within(dialog).getByRole('option', { name: opt })).toBeInTheDocument();
    }
    const unitField = within(dialog).getByLabelText('Unit');
    expect(unitField.tagName).toBe('SELECT');
    for (const opt of ['m', 'pcs', 'pc', 'yd', 'roll']) {
      expect(within(dialog).getByRole('option', { name: opt })).toBeInTheDocument();
    }
  });

  it('delete confirmation also follows the standard modal contract', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('SANDWASH LINEN');
    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    const confirm = screen.getByRole('dialog', { name: 'Delete Material' });
    expect(confirm).toHaveAttribute('aria-modal', 'true');
    expect(within(confirm).getByRole('button', { name: 'Close dialog' })).toBeInTheDocument();
    await user.click(within(confirm).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog', { name: 'Delete Material' })).not.toBeInTheDocument();
  });
});
