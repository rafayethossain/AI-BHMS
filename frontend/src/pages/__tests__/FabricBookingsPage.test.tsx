import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('../../api/client', () => ({
  fabricApi: { getBookings: vi.fn() },
}));

const gridCapture = vi.hoisted(() => ({
  lastProps: null as Record<string, unknown> | null,
  reset() {
    this.lastProps = null;
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
            <span>{String(row.booking_number)}</span>
            <span>{String(row.supplier_name)}</span>
          </div>
        ))}
      </div>
    );
  },
}));

import FabricBookingsPage from '../FabricBookingsPage';
import { fabricApi } from '../../api/client';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/fabric/bookings']}>
      <FabricBookingsPage />
    </MemoryRouter>,
  );
}

type SpreadsheetColumnLike = { title: string; field: string; headerFilter?: boolean };

describe('FabricBookingsPage (Tabulator grid chrome)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gridCapture.reset();
  });

  const booking = {
    id: 'fb-1',
    booking_number: 'BK-2026-0001',
    supplier_name: 'Dhaka Textiles',
    fabric_category_name: 'Cotton',
    quantity_meters: '2500',
    status: 'confirmed',
    expected_delivery: '2026-10-15',
  };

  it('renders rows through the Tabulator grid', async () => {
    (fabricApi.getBookings as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [booking] },
    });
    renderPage();
    const grid = await screen.findByTestId('spreadsheet-grid');
    expect(grid).toBeInTheDocument();
    expect(await screen.findByText('BK-2026-0001')).toBeInTheDocument();
  });

  it('configures searchable columns with header filters', async () => {
    (fabricApi.getBookings as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [booking] },
    });
    renderPage();
    await screen.findByText('BK-2026-0001');
    const columns = gridCapture.lastProps?.columns as SpreadsheetColumnLike[] | undefined;
    expect(columns).toBeDefined();
    const fieldOf = (name: string) => columns?.find((c) => c.field === name);
    expect(fieldOf('booking_number')?.title).toBe('Booking #');
    expect(fieldOf('booking_number')?.headerFilter).toBe(true);
    expect(fieldOf('supplier_name')?.headerFilter).toBe(true);
    expect(fieldOf('status')?.headerFilter).toBe(true);
    expect(fieldOf('quantity_meters')).toBeDefined();
    expect(fieldOf('fabric_category_name')).toBeDefined();
  });

  it('enables the Excel-like toolbar with export and column chooser', async () => {
    (fabricApi.getBookings as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [booking] },
    });
    renderPage();
    await screen.findByText('BK-2026-0001');
    expect(gridCapture.lastProps?.toolbar).toBe(true);
    expect(gridCapture.lastProps?.exportable).toBe(true);
    expect(gridCapture.lastProps?.columnChooser).toBe(true);
    expect(gridCapture.lastProps?.title).toBe('Fabric Bookings');
  });

  it('provides add/edit/delete row action callbacks', async () => {
    (fabricApi.getBookings as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [booking] },
    });
    renderPage();
    await screen.findByText('BK-2026-0001');
    expect(gridCapture.lastProps?.actionColumn).toBe(true);
    expect(typeof gridCapture.lastProps?.onAdd).toBe('function');
    expect(typeof gridCapture.lastProps?.onEdit).toBe('function');
    expect(typeof gridCapture.lastProps?.onDelete).toBe('function');
  });

  it('informs the grid of client-side pagination size', async () => {
    (fabricApi.getBookings as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 25, results: [booking] },
    });
    renderPage();
    await screen.findByText('BK-2026-0001');
    expect(gridCapture.lastProps?.paginationSize).toBe(25);
  });
});
