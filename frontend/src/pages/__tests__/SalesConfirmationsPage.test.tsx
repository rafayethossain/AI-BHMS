import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const gridCapture = vi.hoisted(() => ({
  lastProps: null as Record<string, unknown> | null,
  reset() {
    this.lastProps = null;
  },
}));

vi.mock('../../api/client', () => ({
  commercialApi: {
    getSalesConfirmations: vi.fn(),
    getSalesConfirmationsDashboard: vi.fn(),
    createSalesConfirmation: vi.fn(),
    updateSalesConfirmation: vi.fn(),
    deleteSalesConfirmation: vi.fn(),
    sendSalesConfirmation: vi.fn(),
    disputeSalesConfirmation: vi.fn(),
    acceptSalesConfirmation: vi.fn(),
    autoAcceptSalesConfirmations: vi.fn(),
  },
}));

vi.mock('../../components/SpreadsheetGrid', () => ({
  default: (props: Record<string, unknown>) => {
    gridCapture.lastProps = props;
    const { data } = props as { data: Record<string, unknown>[] };
    return (
      <div data-testid="spreadsheet-grid">
        {(data as Record<string, unknown>[]).map((row) => (
          <div key={String(row.id)} data-testid={`grid-row-${String(row.id)}`}>
            <span>{String(row.confirmation_number)}</span>
            <span>{String(row.po_number)}</span>
          </div>
        ))}
      </div>
    );
  },
}));

import SalesConfirmationsPage from '../SalesConfirmationsPage';
import { commercialApi } from '../../api/client';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/commercial/sales-confirmations']}>
      <SalesConfirmationsPage />
    </MemoryRouter>,
  );
}

type SpreadsheetColumnLike = { title: string; field: string; headerFilter?: boolean };

describe('SalesConfirmationsPage (Tabulator grid chrome)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gridCapture.reset();
    (commercialApi.getSalesConfirmations as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [], count: 0 },
    });
    (commercialApi.getSalesConfirmationsDashboard as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} });
  });

  const sc = {
    id: 'sc-1',
    confirmation_number: 'SC-2026-0001',
    po_number: 'PO-1001',
    purchase_order: 'po-1',
    buyer: 'buyer-1',
    buyer_name: 'Buyer One',
    status: 'draft',
    sent_at: null,
    auto_accepted: false,
    remarks: '',
  };

  it('renders rows through the Tabulator grid', async () => {
    (commercialApi.getSalesConfirmations as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [sc], count: 1 },
    });
    renderPage();
    const grid = await screen.findByTestId('spreadsheet-grid');
    expect(grid).toBeInTheDocument();
    expect(await screen.findByText('SC-2026-0001')).toBeInTheDocument();
  });

  it('configures searchable columns with header filters', async () => {
    (commercialApi.getSalesConfirmations as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [sc], count: 1 },
    });
    renderPage();
    await screen.findByText('SC-2026-0001');
    const columns = gridCapture.lastProps?.columns as SpreadsheetColumnLike[] | undefined;
    expect(columns).toBeDefined();
    const fieldOf = (name: string) => columns?.find((c) => c.field === name);
    expect(fieldOf('confirmation_number')?.title).toBe('Confirmation #');
    expect(fieldOf('confirmation_number')?.headerFilter).toBe(true);
    expect(fieldOf('po_number')?.headerFilter).toBe(true);
    expect(fieldOf('buyer_name')).toBeDefined();
    expect(fieldOf('status')).toBeDefined();
    expect(fieldOf('auto_accepted')).toBeDefined();
  });

  it('enables the Excel-like toolbar with export and column chooser', async () => {
    (commercialApi.getSalesConfirmations as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [sc], count: 1 },
    });
    renderPage();
    await screen.findByText('SC-2026-0001');
    expect(gridCapture.lastProps?.toolbar).toBe(true);
    expect(gridCapture.lastProps?.exportable).toBe(true);
    expect(gridCapture.lastProps?.columnChooser).toBe(true);
    expect(gridCapture.lastProps?.title).toBe('Sales Confirmations');
  });

  it('provides row add/edit/delete action callbacks', async () => {
    (commercialApi.getSalesConfirmations as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [sc], count: 1 },
    });
    renderPage();
    await screen.findByText('SC-2026-0001');
    expect(gridCapture.lastProps?.actionColumn).toBe(true);
    expect(typeof gridCapture.lastProps?.onAdd).toBe('function');
    expect(typeof gridCapture.lastProps?.onEdit).toBe('function');
    expect(typeof gridCapture.lastProps?.onDelete).toBe('function');
  });

  it('informs the grid of client-side pagination size', async () => {
    (commercialApi.getSalesConfirmations as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [sc], count: 25 },
    });
    renderPage();
    await screen.findByText('SC-2026-0001');
    expect(gridCapture.lastProps?.paginationSize).toBe(25);
  });
});