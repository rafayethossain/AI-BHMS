import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import DesignSalesReportPage from '../DesignSalesReportPage';
import { resetDb } from '../../mock/api';
import { getDesignDetail } from '../../mock/db';
import { summarizeSalesReport } from '../salesReport';

function renderPage(designCode = 'REG-1004') {
  return render(
    <MemoryRouter initialEntries={[`/designs/${designCode}/sales-report`]}>
      <Routes>
        <Route path="/designs/:designCode/sales-report" element={<DesignSalesReportPage />} />
        <Route path="/designs/:designCode" element={<div data-testid="detail-stub">detail</div>} />
        <Route path="/design" element={<div data-testid="register-stub">register</div>} />
        <Route path="/purchase-orders/:poNumber" element={<div data-testid="po-stub">po</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const money = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

describe('DesignSalesReportPage', () => {
  beforeEach(() => {
    resetDb();
  });

  it('renders the printable report header with the design identity and version', async () => {
    renderPage('REG-1004');
    expect(await screen.findByText('Sales Order Report')).toBeInTheDocument();
    expect(screen.getByTestId('report-design-code')).toHaveTextContent('REG-1004');
    expect(screen.getByTestId('report-buyer')).toHaveTextContent('Aldi');
    expect(screen.getByTestId('report-version')).toHaveTextContent('v2');
  });

  it('lists one row per purchase order on the current version', async () => {
    renderPage('REG-1004');
    await screen.findByText('Sales Order Report');
    const rows = screen.getAllByTestId('so-report-row');
    expect(rows).toHaveLength(11);
    expect(within(rows[0]).getByText(/PO-2025-/)).toBeInTheDocument();
  });

  it('renders the five per-area risk pills on each row', async () => {
    renderPage('REG-1004');
    await screen.findByText('Sales Order Report');
    const heads = ['Fabric', 'Trims', 'Production', 'Delivery', 'Overall'];
    for (const h of heads) {
      expect(screen.getByRole('columnheader', { name: h })).toBeInTheDocument();
    }
    // REG-1004's guaranteed demo has red/overdue rows and green rows
    expect(screen.getAllByText('Delayed or Overdue').length).toBeGreaterThan(0);
    expect(
      screen.getAllByText('On Track').length +
        screen.getAllByText('At Risk').length +
        screen.getAllByText('No Status').length,
    ).toBeGreaterThan(0);
  });

  it('shows the rolled-up total quantity and value', async () => {
    renderPage('REG-1004');
    await screen.findByText('Sales Order Report');
    const expected = summarizeSalesReport(getDesignDetail('REG-1004')!.pos);
    expect(screen.getByTestId('report-total-qty')).toHaveTextContent(expected.quantity.toLocaleString('en-US'));
    expect(screen.getByTestId('report-total-value')).toHaveTextContent(money(expected.value));
  });

  it('filters rows by version and shows an empty message for a version with no POs', async () => {
    const user = userEvent.setup();
    renderPage('REG-1001');
    await screen.findByText('Sales Order Report');

    const versionSelect = screen.getByLabelText('Version');
    expect(versionSelect).toHaveValue('v2');
    expect(screen.getAllByTestId('so-report-row')).toHaveLength(3);
    expect(screen.getByTestId('report-version')).toHaveTextContent('v2');

    await user.selectOptions(versionSelect, 'v1');
    expect(screen.getByText(/No purchase orders on this version/)).toBeInTheDocument();
    expect(screen.queryAllByTestId('so-report-row')).toHaveLength(0);
    expect(screen.getByTestId('report-version')).toHaveTextContent('v1');
  });

  it('drills down from a report row to the purchase order', async () => {
    const user = userEvent.setup();
    renderPage('REG-1004');
    await screen.findByText('Sales Order Report');
    await user.click(screen.getAllByRole('link', { name: 'Open' })[0]);
    expect(await screen.findByTestId('po-stub')).toBeInTheDocument();
  });

  it('navigates back to the design', async () => {
    const user = userEvent.setup();
    renderPage('REG-1004');
    await screen.findByText('Sales Order Report');
    await user.click(screen.getByRole('link', { name: /Back to design/ }));
    expect(await screen.findByTestId('detail-stub')).toBeInTheDocument();
  });

  it('prints when the Print button is clicked', async () => {
    const user = userEvent.setup();
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    renderPage('REG-1004');
    await screen.findByText('Sales Order Report');
    await user.click(screen.getByTestId('print-trigger'));
    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();
  });

  it('toggles Preview to hide the print and export actions', async () => {
    const user = userEvent.setup();
    renderPage('REG-1004');
    await screen.findByText('Sales Order Report');
    expect(screen.getByTestId('print-trigger')).toBeInTheDocument();
    expect(screen.getByTestId('export-trigger')).toBeInTheDocument();
    await user.click(screen.getByTestId('preview-toggle'));
    expect(screen.queryByTestId('print-trigger')).not.toBeInTheDocument();
    expect(screen.queryByTestId('export-trigger')).not.toBeInTheDocument();
  });

  it('shows a not-found state for an unknown design', async () => {
    renderPage('NONEXIST');
    expect(await screen.findByText(/Design NONEXIST not found/)).toBeInTheDocument();
    expect(
      screen.getAllByRole('link', { name: /Back to register/ }).length,
    ).toBeGreaterThan(0);
  });
});

describe('DesignSalesReportPage — export', () => {
  const createObjectURL = vi.fn<(blob: Blob) => string>((_blob) => 'blob:sales-report');
  const revokeObjectURL = vi.fn<(url: string) => void>();

  beforeEach(() => {
    resetDb();
    (URL as unknown as { createObjectURL: typeof createObjectURL }).createObjectURL = createObjectURL;
    (URL as unknown as { revokeObjectURL: typeof revokeObjectURL }).revokeObjectURL = revokeObjectURL;
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
  });

  it('exports the current version as a downloadable CSV file', async () => {
    const user = userEvent.setup();
    renderPage('REG-1004');
    await screen.findByText('Sales Order Report');
    await user.click(screen.getByTestId('export-trigger'));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0];
    expect(blob.type).toContain('text/csv');
    const text = await blob.text();
    expect(text).toContain('PO Number');
    expect(text).toContain('Overall');
    expect(text).toContain('Total');
    expect(revokeObjectURL).toHaveBeenCalled();
  });
});
