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
    getForwardOrders: vi.fn(),
    createForwardOrder: vi.fn(),
    updateForwardOrder: vi.fn(),
    deleteForwardOrder: vi.fn(),
    getMonthlyForward: vi.fn(),
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
            <span>{String(row.month)}</span>
            <span>{String(row.buyer_name)}</span>
            <span>{String(row.factory_name)}</span>
          </div>
        ))}
      </div>
    );
  },
}));

import ForwardOrderPage from '../ForwardOrderPage';
import { commercialApi } from '../../api/client';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/commercial/forward-orders']}>
      <ForwardOrderPage />
    </MemoryRouter>,
  );
}

type SpreadsheetColumnLike = { title: string; field: string; headerFilter?: boolean };

describe('ForwardOrderPage (RQ-048 forward order / order in-hand book)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gridCapture.reset();
    (commercialApi.getForwardOrders as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [], count: 0 },
    });
    (commercialApi.getMonthlyForward as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [] },
    });
  });

  const fo = {
    id: 'fo-1',
    month: '2026-09-01',
    buyer: 'buyer-1',
    buyer_name: 'Zara Kids',
    factory: 'factory-1',
    factory_name: 'Factory One',
    purchase_order: 'po-1',
    po_number: 'PO-FO-100',
    quantity: '1000.00',
    unit_cost: '3.00',
    total_cost: '3000.00',
    service_pct: '3.00',
    service_charge: '90.00',
    in_hand_units: '500.00',
    status: 'confirmed',
    remarks: '',
    created_at: '2026-08-20T10:00:00Z',
  };

  it('renders forward order rows through the Tabulator grid', async () => {
    (commercialApi.getForwardOrders as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [fo], count: 1 },
    });
    renderPage();
    const grid = await screen.findByTestId('spreadsheet-grid');
    expect(grid).toBeInTheDocument();
    expect(await screen.findByText('Zara Kids')).toBeInTheDocument();
    expect(await screen.findByText('Factory One')).toBeInTheDocument();
  });

  it('configures searchable columns with header filters', async () => {
    (commercialApi.getForwardOrders as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [fo], count: 1 },
    });
    renderPage();
    await screen.findByText('Zara Kids');
    const columns = gridCapture.lastProps?.columns as SpreadsheetColumnLike[] | undefined;
    expect(columns).toBeDefined();
    const fieldOf = (name: string) => columns?.find((c) => c.field === name);
    expect(fieldOf('month')).toBeDefined();
    expect(fieldOf('buyer_name')?.headerFilter).toBe(true);
    expect(fieldOf('factory_name')).toBeDefined();
    expect(fieldOf('po_number')).toBeDefined();
    expect(fieldOf('quantity')).toBeDefined();
    expect(fieldOf('unit_cost')).toBeDefined();
    expect(fieldOf('total_cost')).toBeDefined();
    expect(fieldOf('service_charge')).toBeDefined();
    expect(fieldOf('status')).toBeDefined();
  });

  it('enables the Excel-like toolbar and reports the monthly forward totals', async () => {
    (commercialApi.getForwardOrders as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [fo], count: 1 },
    });
    (commercialApi.getMonthlyForward as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        results: [
          {
            month: '2026-09-01',
            buyer: 'Zara Kids',
            count: 2,
            quantity: '3000.00',
            total_cost: '11000.00',
            service_charge: '330.00',
          },
        ],
      },
    });
    renderPage();
    await screen.findByText('Zara Kids');
    expect(gridCapture.lastProps?.toolbar).toBe(true);
    expect(gridCapture.lastProps?.exportable).toBe(true);
    expect(gridCapture.lastProps?.columnChooser).toBe(true);
    expect(gridCapture.lastProps?.title).toBe('Forward Order Book');
    expect(await screen.findByText('3,000')).toBeInTheDocument();
    expect(await screen.findByText('11,000')).toBeInTheDocument();
  });

  it('provides row add/edit/delete action callbacks', async () => {
    (commercialApi.getForwardOrders as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [fo], count: 1 },
    });
    renderPage();
    await screen.findByText('Zara Kids');
    expect(gridCapture.lastProps?.actionColumn).toBe(true);
    expect(typeof gridCapture.lastProps?.onAdd).toBe('function');
    expect(typeof gridCapture.lastProps?.onEdit).toBe('function');
    expect(typeof gridCapture.lastProps?.onDelete).toBe('function');
  });

  it('informs the grid of client-side pagination size', async () => {
    (commercialApi.getForwardOrders as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [fo], count: 25 },
    });
    renderPage();
    await screen.findByText('Zara Kids');
    expect(gridCapture.lastProps?.paginationSize).toBe(25);
  });
});