import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { ToastProvider } from '../../components/Toast';
import { resetDb } from '../../mock/api';
import DesignJobsPage from '../DesignJobsPage';

function renderPage(designCode = 'REG-1001') {
  return render(
    <MemoryRouter initialEntries={[`/designs/${designCode}/jobs`]}>
      <ToastProvider>
        <Routes>
          <Route path="/designs/:designCode/jobs" element={<DesignJobsPage />} />
          <Route path="/design" element={<div data-testid="register-stub">register</div>} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('DesignJobsPage', () => {
  beforeEach(() => {
    resetDb();
  });

  it('shows the design header with the job count and open jobs', async () => {
    renderPage();
    expect(await screen.findByText(/REG-1001 — Job Requests/)).toBeInTheDocument();
    expect(screen.getByText('Nike Inc.')).toBeInTheDocument();
    expect(screen.getByText(/4 jobs/)).toBeInTheDocument();
    expect(screen.getByText('Open: 2')).toBeInTheDocument();
  });

  it('shows seeded job requests in the table', async () => {
    renderPage();
    await screen.findByText('JOB-1001-01');
    expect(screen.getByText('JOB-1001-02')).toBeInTheDocument();
    expect(screen.getByText('JOB-1001-04')).toBeInTheDocument();
    expect(screen.getByText('Fit sample size M')).toBeInTheDocument();
    expect(screen.getByText('3D render for buyer review')).toBeInTheDocument();
  });

  it('renders each job type as a human label, not the raw value', async () => {
    renderPage();
    await screen.findByText('JOB-1001-01');
    expect(screen.getByText('Pattern')).toBeInTheDocument();
    expect(screen.getByText('Sample')).toBeInTheDocument();
    expect(screen.getByText('3D')).toBeInTheDocument();
    expect(screen.getByText('Mini-Marker')).toBeInTheDocument();
  });

  it('renders the status as a friendly pill label', async () => {
    renderPage();
    await screen.findByText('JOB-1001-01');
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });

  it('marks an overdue open job but not a completed or cancelled one', async () => {
    renderPage();
    await screen.findByText('JOB-1001-01');
    const flags = Array.from(document.querySelectorAll('[data-overdue="true"]')).map((el) => el.textContent);
    expect(flags).toEqual(['2026-06-20']);
  });

  it('shows empty state for a design with no job requests', async () => {
    renderPage('REG-1003');
    expect(await screen.findByText(/No job requests yet/)).toBeInTheDocument();
  });

  it('shows design-not-found state', async () => {
    renderPage('NONEXIST');
    expect(await screen.findByText(/Design NONEXIST not found/)).toBeInTheDocument();
  });

  it('navigates back to register', async () => {
    renderPage();
    await screen.findByText('JOB-1001-01');
    await userEvent.click(screen.getByText('← Back'));
    expect(await screen.findByTestId('register-stub')).toBeInTheDocument();
  });

  it('shows View, Edit and Delete on every row', async () => {
    renderPage();
    await screen.findByText('JOB-1001-01');
    expect(screen.getAllByRole('button', { name: 'View' }).length).toBe(4);
    expect(screen.getAllByRole('button', { name: 'Edit' }).length).toBe(4);
    expect(screen.getAllByRole('button', { name: 'Delete' }).length).toBe(4);
  });

  it('adds a new job request via the form modal', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('JOB-1001-01');

    await user.click(screen.getByRole('button', { name: '+ Add Job Request' }));
    const dialog = screen.getByRole('dialog', { name: 'Add Job Request' });

    await user.type(within(dialog).getByLabelText('Job Number *'), 'JOB-1001-99');
    await user.selectOptions(within(dialog).getByLabelText('Type'), 'sample');
    await user.selectOptions(within(dialog).getByLabelText('Priority'), '4');
    await user.type(within(dialog).getByLabelText('Description'), 'Urgent buyer sample');

    await user.click(within(dialog).getByRole('button', { name: 'Add Job Request' }));

    expect(await screen.findByText('JOB-1001-99')).toBeInTheDocument();
    expect(screen.getByText('Urgent buyer sample')).toBeInTheDocument();
  });

  it('edits an existing job request', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('JOB-1001-01');

    await user.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    const dialog = screen.getByRole('dialog', { name: 'Edit Job Request' });
    expect(within(dialog).getByDisplayValue('JOB-1001-01')).toBeInTheDocument();

    await user.clear(within(dialog).getByLabelText('Description'));
    await user.type(within(dialog).getByLabelText('Description'), 'UPDATED JOB SCOPE');
    await user.click(within(dialog).getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Edit Job Request' })).not.toBeInTheDocument();
    });
    expect(await screen.findByText('UPDATED JOB SCOPE')).toBeInTheDocument();
    expect(screen.queryByText('Draft pattern for crew neck top')).not.toBeInTheDocument();
  });

  it('deletes a job request after confirmation', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('JOB-1001-01');

    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    const confirm = screen.getByRole('dialog', { name: 'Delete Job Request' });
    expect(within(confirm).getByText(/JOB-1001-01/)).toBeInTheDocument();

    await user.click(within(confirm).getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(screen.queryByText('JOB-1001-01')).not.toBeInTheDocument();
    });
  });

  it('opens a read-only view modal', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('JOB-1001-01');

    await user.click(screen.getAllByRole('button', { name: 'View' })[0]);
    const dialog = screen.getByRole('dialog', { name: 'View Job Request' });
    expect(within(dialog).getByText('JOB-1001-01')).toBeInTheDocument();
    expect(within(dialog).getByText('Draft pattern for crew neck top')).toBeInTheDocument();
    expect(dialog.querySelector('.max-w-3xl')).not.toBeNull();
    expect(within(dialog).queryAllByRole('textbox').length).toBe(0);
  });
});

describe('Job request add/edit modal — standard Modal contract', () => {
  async function openAddModal() {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('JOB-1001-01');
    await user.click(screen.getByRole('button', { name: '+ Add Job Request' }));
    return screen.getByRole('dialog', { name: 'Add Job Request' });
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
    expect(screen.queryByRole('dialog', { name: 'Add Job Request' })).not.toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    await openAddModal();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Add Job Request' })).not.toBeInTheDocument();
  });

  it('closes on backdrop click', async () => {
    const dialog = await openAddModal();
    fireEvent.click(dialog);
    expect(screen.queryByRole('dialog', { name: 'Add Job Request' })).not.toBeInTheDocument();
  });

  it('keeps all fields visible via a scrollable body under the pinned header/footer', async () => {
    const dialog = await openAddModal();
    const scrollForm = dialog.querySelector('form');
    expect(scrollForm).not.toBeNull();
    expect(scrollForm?.className).toContain('max-h-[75vh]');
    expect(scrollForm?.className).toContain('overflow-y-auto');
    [
      'Job Number *',
      'Type',
      'Priority',
      'Purchase Order',
      'Assigned To',
      'Work Location',
      'Required By',
      'Status',
      'Description',
      'Notes',
    ].forEach((label) => {
      expect(within(dialog).getByLabelText(label)).toBeInTheDocument();
    });
    expect(within(dialog).getByText('Job Information')).toBeInTheDocument();
  });

  it('renders Type, Priority, Status, Purchase Order and Assigned To as master-data selects', async () => {
    const dialog = await openAddModal();

    const typeField = within(dialog).getByLabelText('Type');
    expect(typeField.tagName).toBe('SELECT');
    expect(typeField).toHaveValue('pattern');
    for (const opt of ['Pattern', 'Sample', '3D', 'Mini-Marker']) {
      expect(within(dialog).getByRole('option', { name: opt })).toBeInTheDocument();
    }

    const priorityField = within(dialog).getByLabelText('Priority');
    expect(priorityField.tagName).toBe('SELECT');
    expect(priorityField).toHaveValue('2');
    for (const opt of ['Low', 'Normal', 'High', 'Urgent']) {
      expect(within(dialog).getByRole('option', { name: opt })).toBeInTheDocument();
    }

    const statusField = within(dialog).getByLabelText('Status');
    expect(statusField.tagName).toBe('SELECT');
    for (const opt of ['Pending', 'In Progress', 'Completed', 'Cancelled']) {
      expect(within(dialog).getByRole('option', { name: opt })).toBeInTheDocument();
    }

    const poField = within(dialog).getByLabelText('Purchase Order');
    expect(poField.tagName).toBe('SELECT');
    for (const opt of ['None', 'PO-2025-0001', 'PO-2025-0002', 'PO-2025-0003']) {
      expect(within(dialog).getByRole('option', { name: opt })).toBeInTheDocument();
    }

    const assigneeField = within(dialog).getByLabelText('Assigned To');
    expect(assigneeField.tagName).toBe('SELECT');
    expect(within(dialog).getByRole('option', { name: 'F. Rahman' })).toBeInTheDocument();
  });

  it('delete confirmation also follows the standard modal contract', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('JOB-1001-01');
    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    const confirm = screen.getByRole('dialog', { name: 'Delete Job Request' });
    expect(confirm).toHaveAttribute('aria-modal', 'true');
    expect(within(confirm).getByRole('button', { name: 'Close dialog' })).toBeInTheDocument();
    await user.click(within(confirm).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog', { name: 'Delete Job Request' })).not.toBeInTheDocument();
  });
});
