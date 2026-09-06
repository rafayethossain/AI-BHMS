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
  logisticsApi: {
    getDockets: vi.fn(),
    getOverLimitDockets: vi.fn(),
    getShipments: vi.fn(),
    createDocket: vi.fn(),
    updateDocket: vi.fn(),
    deleteDocket: vi.fn(),
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
            <span>{String(row.docket_number)}</span>
            <span>{String(row.shipment_number)}</span>
          </div>
        ))}
      </div>
    );
  },
}));

import DocketsPage from '../DocketsPage';
import { logisticsApi } from '../../api/client';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/logistics/dockets']}>
      <DocketsPage />
    </MemoryRouter>,
  );
}

type SpreadsheetColumnLike = { title: string; field: string; headerFilter?: boolean };

describe('DocketsPage (Tabulator grid chrome)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gridCapture.reset();
    (logisticsApi.getDockets as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [], count: 0 },
    });
    (logisticsApi.getOverLimitDockets as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [] },
    });
    (logisticsApi.getShipments as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [] },
    });
  });

  const docket = {
    id: 'dk-1',
    docket_number: 'DKT-2026-0001',
    shipment: 'ship-1',
    shipment_number: 'SHIP-2026-001',
    po_number: 'PO-1001',
    contract_price: '25.50',
    date_raised: '2026-07-01',
    delivery_date: '2026-09-01',
    total_fabric_meters: '500',
    unused_fabric_meters: '120',
    is_final: false,
    sales_notified: false,
    requires_sales_notification: false,
    notes: '',
  };

  it('renders rows through the Tabulator grid', async () => {
    (logisticsApi.getDockets as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [docket], count: 1 },
    });
    renderPage();
    const grid = await screen.findByTestId('spreadsheet-grid');
    expect(grid).toBeInTheDocument();
    expect(await screen.findByText('DKT-2026-0001')).toBeInTheDocument();
  });

  it('configures searchable columns with header filters', async () => {
    (logisticsApi.getDockets as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [docket], count: 1 },
    });
    renderPage();
    await screen.findByText('DKT-2026-0001');
    const columns = gridCapture.lastProps?.columns as SpreadsheetColumnLike[] | undefined;
    expect(columns).toBeDefined();
    const fieldOf = (name: string) => columns?.find((c) => c.field === name);
    expect(fieldOf('docket_number')?.title).toBe('Docket');
    expect(fieldOf('docket_number')?.headerFilter).toBe(true);
    expect(fieldOf('shipment_number')).toBeDefined();
    expect(fieldOf('po_number')).toBeDefined();
    expect(fieldOf('contract_price')).toBeDefined();
    expect(fieldOf('is_final')).toBeDefined();
  });

  it('enables the Excel-like toolbar with export and column chooser', async () => {
    (logisticsApi.getDockets as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [docket], count: 1 },
    });
    renderPage();
    await screen.findByText('DKT-2026-0001');
    expect(gridCapture.lastProps?.toolbar).toBe(true);
    expect(gridCapture.lastProps?.exportable).toBe(true);
    expect(gridCapture.lastProps?.columnChooser).toBe(true);
    expect(gridCapture.lastProps?.title).toBe('Docket Register');
  });

  it('provides row add/view/delete action callbacks', async () => {
    (logisticsApi.getDockets as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [docket], count: 1 },
    });
    renderPage();
    await screen.findByText('DKT-2026-0001');
    expect(gridCapture.lastProps?.actionColumn).toBe(true);
    expect(typeof gridCapture.lastProps?.onAdd).toBe('function');
    expect(typeof gridCapture.lastProps?.onEdit).toBe('function');
    expect(typeof gridCapture.lastProps?.onDelete).toBe('function');
  });

  it('informs the grid of client-side pagination size', async () => {
    (logisticsApi.getDockets as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [docket], count: 25 },
    });
    renderPage();
    await screen.findByText('DKT-2026-0001');
    expect(gridCapture.lastProps?.paginationSize).toBe(10);
  });
});