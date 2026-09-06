import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const navigateMock = vi.fn();

vi.mock('../../components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('../../api/client', () => ({
  logisticsApi: {
    getShipments: vi.fn(),
    getBookingRefAlerts: vi.fn(),
    getFreightForwarders: vi.fn(),
  },
  setupApi: { getFactories: vi.fn() },
  merchApi: { getPOs: vi.fn() },
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

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
            <span>{String(row.shipment_number)}</span>
            <span>{String(row.po_number)}</span>
          </div>
        ))}
      </div>
    );
  },
}));

import ShipmentsPage from '../ShipmentsPage';
import { logisticsApi, setupApi, merchApi } from '../../api/client';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/logistics']}>
      <ShipmentsPage />
    </MemoryRouter>,
  );
}

type SpreadsheetColumnLike = { title: string; field: string; headerFilter?: boolean };

describe('ShipmentsPage (Tabulator grid chrome)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gridCapture.reset();
    (setupApi.getFactories as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { results: [] } });
    (merchApi.getPOs as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { results: [] } });
    (logisticsApi.getFreightForwarders as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [] },
    });
  });

  const shipment = {
    id: 'ship-1',
    shipment_number: 'SHIP-1001',
    po_number: 'PO-3001',
    factory_name: 'Apex Textiles',
    mode: 'sea',
    status: 'in_transit',
    etd: '2026-09-10',
    eta: '2026-09-24',
    booking_reference: 'BRF-2025-1184',
    booking_ref_status: 'ok',
    container_number: 'MSKU1234567',
  };

  it('renders rows through the Tabulator grid', async () => {
    (logisticsApi.getShipments as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [shipment] },
    });
    (logisticsApi.getBookingRefAlerts as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [] },
    });
    renderPage();
    const grid = await screen.findByTestId('spreadsheet-grid');
    expect(grid).toBeInTheDocument();
    expect(await screen.findByText('SHIP-1001')).toBeInTheDocument();
  });

  it('configures searchable columns with header filters', async () => {
    (logisticsApi.getShipments as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [shipment] },
    });
    (logisticsApi.getBookingRefAlerts as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [] },
    });
    renderPage();
    await screen.findByText('SHIP-1001');
    const columns = gridCapture.lastProps?.columns as SpreadsheetColumnLike[] | undefined;
    expect(columns).toBeDefined();
    const fieldOf = (name: string) => columns?.find((c) => c.field === name);
    expect(fieldOf('shipment_number')?.title).toBe('Shipment #');
    expect(fieldOf('shipment_number')?.headerFilter).toBe(true);
    expect(fieldOf('po_number')?.headerFilter).toBe(true);
    expect(fieldOf('factory_name')?.headerFilter).toBe(true);
    expect(fieldOf('mode')?.headerFilter).toBe(true);
    expect(fieldOf('status')?.headerFilter).toBe(true);
    expect(fieldOf('etd')).toBeDefined();
    expect(fieldOf('eta')).toBeDefined();
  });

  it('enables the Excel-like toolbar with export and column chooser', async () => {
    (logisticsApi.getShipments as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [shipment] },
    });
    (logisticsApi.getBookingRefAlerts as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [] },
    });
    renderPage();
    await screen.findByText('SHIP-1001');
    expect(gridCapture.lastProps?.toolbar).toBe(true);
    expect(gridCapture.lastProps?.exportable).toBe(true);
    expect(gridCapture.lastProps?.columnChooser).toBe(true);
    expect(gridCapture.lastProps?.title).toBe('Shipments');
  });

  it('provides a row view action callback', async () => {
    (logisticsApi.getShipments as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 1, results: [shipment] },
    });
    (logisticsApi.getBookingRefAlerts as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [] },
    });
    renderPage();
    await screen.findByText('SHIP-1001');
    expect(gridCapture.lastProps?.actionColumn).toBe(true);
    expect(typeof gridCapture.lastProps?.onView).toBe('function');
  });

  it('informs the grid of client-side pagination size', async () => {
    (logisticsApi.getShipments as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { count: 25, results: [shipment] },
    });
    (logisticsApi.getBookingRefAlerts as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { results: [] },
    });
    renderPage();
    await screen.findByText('SHIP-1001');
    expect(gridCapture.lastProps?.paginationSize).toBe(25);
  });
});
