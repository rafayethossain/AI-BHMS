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

vi.mock('../../components/SearchableSelect', () => ({
  default: () => <div data-testid="searchable-select" />,
}));

vi.mock('../../api/client', () => ({
  logisticsApi: {
    getReconciliations: vi.fn(),
    getOverLimitReconciliations: vi.fn(),
    getShipments: vi.fn(),
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
            <span>{String(row.shipment_number)}</span>
            <span>{String(row.po_number)}</span>
          </div>
        ))}
      </div>
    );
  },
}));

import FinalHitReconciliationsPage from '../FinalHitReconciliationsPage';
import { logisticsApi } from '../../api/client';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/logistics/reconciliations']}>
      <FinalHitReconciliationsPage />
    </MemoryRouter>,
  );
}

type SpreadsheetColumnLike = { title: string; field: string; headerFilter?: boolean };

describe('FinalHitReconciliationsPage (Tabulator grid chrome)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gridCapture.reset();
    (logisticsApi.getOverLimitReconciliations as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 0, results: [] },
    });
    (logisticsApi.getShipments as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 0, results: [] },
    });
  });

  const rec = {
    id: 'rec-1',
    shipment: 'ship-1',
    shipment_number: 'SHP-1001',
    po_number: 'PO-2001',
    docket_quantity: '120',
    shipped_quantity: '95',
    shortage_units: '25',
    reasons_evident: false,
    notes: '',
    status: 'pending',
    status_label: 'Pending',
    reconciled_by_name: 'Alice',
    requires_debit: true,
    created_at: '2026-08-01T00:00:00Z',
  };

  it('renders rows through the Tabulator grid', async () => {
    (logisticsApi.getReconciliations as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [rec] },
    });
    renderPage();
    const grid = await screen.findByTestId('spreadsheet-grid');
    expect(grid).toBeInTheDocument();
    expect(await screen.findByText('SHP-1001')).toBeInTheDocument();
  });

  it('configures searchable columns with header filters', async () => {
    (logisticsApi.getReconciliations as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [rec] },
    });
    renderPage();
    await screen.findByText('SHP-1001');
    const columns = gridCapture.lastProps?.columns as SpreadsheetColumnLike[] | undefined;
    expect(columns).toBeDefined();
    const fieldOf = (name: string) => columns?.find((c) => c.field === name);
    expect(fieldOf('shipment_number')?.title).toBe('Shipment');
    expect(fieldOf('shipment_number')?.headerFilter).toBe(true);
    expect(fieldOf('po_number')?.headerFilter).toBe(true);
    expect(fieldOf('docket_quantity')).toBeDefined();
    expect(fieldOf('shipped_quantity')).toBeDefined();
    expect(fieldOf('status_label')).toBeDefined();
  });

  it('enables the Excel-like toolbar with export and column chooser', async () => {
    (logisticsApi.getReconciliations as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [rec] },
    });
    renderPage();
    await screen.findByText('SHP-1001');
    expect(gridCapture.lastProps?.toolbar).toBe(true);
    expect(gridCapture.lastProps?.exportable).toBe(true);
    expect(gridCapture.lastProps?.columnChooser).toBe(true);
    expect(gridCapture.lastProps?.title).toBe('Final Hit Reconciliation');
  });

  it('provides row add/edit/delete action callbacks', async () => {
    (logisticsApi.getReconciliations as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [rec] },
    });
    renderPage();
    await screen.findByText('SHP-1001');
    expect(gridCapture.lastProps?.actionColumn).toBe(true);
    expect(typeof gridCapture.lastProps?.onAdd).toBe('function');
    expect(typeof gridCapture.lastProps?.onEdit).toBe('function');
    expect(typeof gridCapture.lastProps?.onDelete).toBe('function');
  });

  it('informs the grid of client-side pagination size', async () => {
    (logisticsApi.getReconciliations as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 10, results: [rec] },
    });
    renderPage();
    await screen.findByText('SHP-1001');
    expect(gridCapture.lastProps?.paginationSize).toBe(10);
  });
});
