import { render, screen, waitFor, act } from '@testing-library/react';
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

const clientMock = vi.hoisted(() => ({
  fabricApi: {
    getOrders: vi.fn(),
    getSuppliers: vi.fn(),
    getCategories: vi.fn(),
    getRiskStatus: vi.fn(),
    getScheduleStatus: vi.fn(),
    setRisk: vi.fn(),
    recomputeRisk: vi.fn(),
    updateScheduleDates: vi.fn(),
    handoffSchedule: vi.fn(),
    createOrder: vi.fn(),
    updateOrder: vi.fn(),
    deleteOrder: vi.fn(),
  },
  setupApi: { getRiskLevels: vi.fn() },
  FABRIC_ORDER_STATUSES: [
    'draft', 'submitted', 'lab_dip_pending', 'lab_dip_approved', 'bulk_approved',
    'in_production', 'shipped', 'delivered', 'cancelled',
  ],
}));

vi.mock('../../api/client', () => clientMock);

vi.mock('../../components/SpreadsheetGrid', () => ({
  default: (props: Record<string, unknown>) => {
    gridCapture.lastProps = props;
    const { data } = props as { data: Record<string, unknown>[] };
    return (
      <div data-testid="spreadsheet-grid">
        {(data as Record<string, unknown>[]).map((row) => (
          <div key={String(row.id)} data-testid={`grid-row-${String(row.id)}`}>
            <span>{String(row.order_number)}</span>
            <span>{String(row.status)}</span>
            <span>{String(row.risk_level)}</span>
          </div>
        ))}
      </div>
    );
  },
}));

import FabricOrdersPage from '../FabricOrdersPage';
import { fabricApi, setupApi } from '../../api/client';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/fabric/orders']}>
      <FabricOrdersPage />
    </MemoryRouter>,
  );
}

type SpreadsheetColumnLike = { title: string; field: string; headerFilter?: boolean };
type SpreadsheetMenuItemLike = { label: string; action?: (...args: unknown[]) => void };

const order = {
  id: 'fo-1',
  order_number: 'FO-2026-0001',
  supplier: 'sup-1',
  supplier_name: 'Dhaka Textiles',
  fabric_category: null,
  fabric_category_name: null,
  quantity_meters: '2500',
  unit_price: '3.5000',
  total_price: '8750.00',
  status: 'lab_dip_approved',
  lab_dip_required_date: '2026-04-01',
  lab_dip_actual_date: null,
  lab_dip_approval_date: '2026-05-01',
  lab_dip_notes: '',
  bulk_approved_date: null,
  bulk_approved_by: null,
  bulk_approved_by_name: null,
  bulk_approved_notes: '',
  strike_off_required_date: null,
  strike_off_actual_date: null,
  strike_off_approval_date: null,
  onboard_date: null,
  eta_date: null,
  actual_arrival_date: null,
  paperwork_date: null,
  clearance_date: null,
  risk_level: null,
  risk_level_code: 'amber',
  risk_level_name: 'Amber',
  risk_notes: '',
  date_owners: {},
  effective_owners: {
    lab_dip: 'merchandising',
    strike_off: 'sales',
    onboard: 'merchandising',
    eta: 'merchandising',
    actual_arrival: 'logistics',
    paperwork: 'logistics',
    clearance: 'logistics',
  },
  notes: '',
  is_active: true,
  created_at: '2026-09-04T13:00:00+06:00',
  updated_at: '2026-09-04T13:00:00+06:00',
};

describe('FabricOrdersPage (Tabulator grid chrome + 16.2 schedule editor)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gridCapture.reset();
    (fabricApi.getSuppliers as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { count: 0, results: [] } });
    (fabricApi.getCategories as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { count: 0, results: [] } });
    (setupApi.getRiskLevels as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { count: 0, results: [] } });
    (fabricApi.getOrders as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { count: 1, results: [order] } });
    (fabricApi.getRiskStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        order_number: 'FO-2026-0001',
        status: 'lab_dip_approved',
        policy_code: 'amber',
        risk_level: null,
        risk_level_code: 'amber',
        risk_level_name: 'Amber',
        risk_notes: '',
        effective_owners: order.effective_owners,
        bulk_approved_date: null,
        onboard_date: null,
        clearance_date: null,
      },
    });
    (fabricApi.getScheduleStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        order_number: 'FO-2026-0001',
        date_owners: {},
        effective_owners: order.effective_owners,
        handoffs: [],
      },
    });
  });

  it('renders rows through the Tabulator grid', async () => {
    renderPage();
    const grid = await screen.findByTestId('spreadsheet-grid');
    expect(grid).toBeInTheDocument();
    expect(await screen.findByText('FO-2026-0001')).toBeInTheDocument();
  });

  it('configures searchable grid columns with header filters and display labels', async () => {
    renderPage();
    await screen.findByText('FO-2026-0001');
    const columns = gridCapture.lastProps?.columns as SpreadsheetColumnLike[] | undefined;
    expect(columns).toBeDefined();
    const fieldOf = (name: string) => columns?.find((c) => c.field === name);
    expect(fieldOf('order_number')?.title).toBe('Order #');
    expect(fieldOf('order_number')?.headerFilter).toBe(true);
    expect(fieldOf('supplier_name')).toBeDefined();
    expect(fieldOf('fabric_category_name')).toBeDefined();
    expect(fieldOf('quantity_meters')).toBeDefined();
    expect(fieldOf('total_price')).toBeDefined();
    expect(fieldOf('risk_level')).toBeDefined();
    expect(screen.getByText('lab dip approved')).toBeInTheDocument();
    expect(screen.getByText('Amber')).toBeInTheDocument();
  });

  it('enables the Excel-like toolbar with export, column chooser and pagination', async () => {
    renderPage();
    await screen.findByText('FO-2026-0001');
    expect(gridCapture.lastProps?.toolbar).toBe(true);
    expect(gridCapture.lastProps?.exportable).toBe(true);
    expect(gridCapture.lastProps?.printable).toBe(true);
    expect(gridCapture.lastProps?.columnChooser).toBe(true);
    expect(gridCapture.lastProps?.title).toBe('Fabric Orders');
    expect(gridCapture.lastProps?.paginationSize).toBe(10);
  });

  it('provides row add/edit/delete action callbacks and opens the Edit modal', async () => {
    renderPage();
    await screen.findByText('FO-2026-0001');
    expect(gridCapture.lastProps?.actionColumn).toBe(true);
    expect(typeof gridCapture.lastProps?.onAdd).toBe('function');
    expect(typeof gridCapture.lastProps?.onEdit).toBe('function');
    expect(typeof gridCapture.lastProps?.onDelete).toBe('function');
    type RowCallback = (row: Record<string, unknown>) => void;

    act(() => {
      (gridCapture.lastProps?.onEdit as RowCallback | undefined)?.({ id: 'fo-1' });
    });
    await waitFor(() => expect(screen.getByText('Edit Fabric Order')).toBeInTheDocument());
  });

  it('exposes the Risk & Schedule row action that opens the 16.2 schedule editor', async () => {
    renderPage();
    await screen.findByText('FO-2026-0001');
    const items = (gridCapture.lastProps?.rowActions as ((row: Record<string, unknown>) => SpreadsheetMenuItemLike[]) | undefined)?.({ id: 'fo-1' });
    const risk = items?.find((i) => i.label === 'Risk & Schedule');
    expect(risk).toBeDefined();
    act(() => {
      risk?.action?.();
    });
    await waitFor(() => expect(screen.getByText('Risk & Schedule')).toBeInTheDocument());
    expect(screen.getAllByText('Strike-Off Required').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Strike-Off Approval').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Actual Arrival').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Paperwork').length).toBeGreaterThan(0);
  });
});